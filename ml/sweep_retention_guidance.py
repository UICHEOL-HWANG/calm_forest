from __future__ import annotations

import argparse
import datetime as dt
import io
import logging
from pathlib import Path
from typing import Callable

import pandas as pd
import yaml

from calm_ml.curves import average_curves, iteration_curve
from calm_ml.model_eval import build_matrix, cv_scores, time_split
from calm_ml.model_zoo import FAMILIES, builder, features_for
from calm_ml.storage import Bucket, default_bucket, sample_key

log = logging.getLogger("sweep_retention_guidance")

ROOT = Path(__file__).parent
SQL = ROOT / "sql" / "retention_guidance_train_sample.sql"
SPACES = ROOT / "sweeps" / "retention_guidance.yaml"
SAMPLE_NAME = "retention_guidance"
HOLDOUT_FRAC = 0.25
SWEEP_PROJECT = "calm-forest"


def sweep_config(family: str, path: Path = SPACES) -> dict:
    if family not in FAMILIES:
        raise ValueError(f"unknown family: {family}")
    spaces = yaml.safe_load(path.read_text(encoding="utf-8"))
    shared = dict(spaces["shared"])
    method, metric = shared.pop("method"), shared.pop("metric")
    params = {"family": {"value": family}, **shared, **spaces["families"][family]}
    return {
        "name": f"retention-guidance-{family}",
        "method": method,
        "metric": metric,
        "parameters": params,
    }


def _bq_reader() -> pd.DataFrame:
    from calm_ml import bq

    return bq.read_sql_file(str(SQL))


def load_sample(*, bucket: Bucket | None, reader: Callable[[], pd.DataFrame] | None = None,
                day: dt.date | None = None, refresh: bool = False) -> pd.DataFrame:
    key = sample_key(SAMPLE_NAME, day or dt.date.today())
    if bucket is not None and not refresh:
        cached = bucket.get(key)
        if cached is not None:
            return pd.read_parquet(io.BytesIO(cached))
    df = (reader or _bq_reader)()
    if bucket is not None:
        buf = io.BytesIO()
        df.to_parquet(buf, index=False)
        bucket.put(key, buf.getvalue())
    else:
        log.warning("OCI bucket not configured — sample not persisted")
    return df


def evaluate(df: pd.DataFrame, cfg: dict, *, holdout_frac: float = HOLDOUT_FRAC,
             n_repeats: int = 3, on_fold: Callable | None = None) -> dict:
    dev, _ = time_split(df, holdout_frac=holdout_frac)
    X, y = build_matrix(dev, features_for(cfg))
    scores = cv_scores(X, y, builder(cfg), n_repeats=n_repeats, on_fold=on_fold)
    return {"n_dev": int(len(y)), "pos_dev": int(y.sum()), **scores}


def batch_tag(batch: str) -> str:
    return f"batch-{batch}"


def _define_axes(run) -> None:
    run.define_metric("fold/index")
    run.define_metric("fold/*", step_metric="fold/index")
    run.define_metric("curve/iteration")
    run.define_metric("curve/*", step_metric="curve/iteration")


def _fold_logger(run, curves: list) -> Callable:
    def on_fold(i, model, X_te, y_te, metrics) -> None:
        run.log({"fold/index": i, **{f"fold/{k}": v for k, v in metrics.items()}})
        curve = iteration_curve(model, X_te, y_te)
        if curve:
            curves.append(curve)

    return on_fold


def make_train_fn(df: pd.DataFrame, *, init: Callable | None = None, batch: str | None = None,
                  holdout_frac: float = HOLDOUT_FRAC, n_repeats: int = 3) -> Callable[[], None]:
    tags = ["retention-guidance", "sweep"] + ([batch_tag(batch)] if batch else [])

    def train() -> None:
        start = init
        if start is None:
            import wandb

            start = wandb.init
        with start(tags=tags) as run:
            _define_axes(run)
            curves: list = []
            scores = evaluate(df, dict(run.config), holdout_frac=holdout_frac,
                              n_repeats=n_repeats, on_fold=_fold_logger(run, curves))
            for point in average_curves(curves):
                run.log({"curve/iteration": point["iteration"],
                         "curve/val_logloss": point["val_logloss"],
                         "curve/val_pr_auc": point["val_pr_auc"]})
            run.summary.update(scores)

    return train


def main() -> None:
    import wandb

    from calm_ml import tracking  # noqa: F401

    ap = argparse.ArgumentParser()
    ap.add_argument("--family", required=True, help="comma list or 'all'")
    ap.add_argument("--count", type=int, default=30)
    ap.add_argument("--sweep-id")
    ap.add_argument("--refresh", action="store_true")
    ap.add_argument("--no-report", action="store_true")
    a = ap.parse_args()

    families = sorted(FAMILIES) if a.family == "all" else a.family.split(",")
    for f in families:
        if f not in FAMILIES:
            raise SystemExit(f"unknown family: {f}")
    if a.sweep_id and len(families) != 1:
        raise SystemExit("--sweep-id needs exactly one family")
    df = load_sample(bucket=default_bucket(), refresh=a.refresh)
    batch = dt.datetime.now().strftime("%Y%m%d-%H%M")
    sweep_ids = []
    for f in families:
        sweep_id = a.sweep_id or wandb.sweep(sweep_config(f), project=SWEEP_PROJECT)
        sweep_ids.append(sweep_id)
        log.warning("sweep %s family=%s batch=%s", sweep_id, f, batch)
        wandb.agent(sweep_id, function=make_train_fn(df, batch=batch), count=a.count, project=SWEEP_PROJECT)
    if not a.no_report:
        from sweep_report import build_report

        report = build_report(batch, sweep_ids)
        report.save()
        print(f"report: {report.url}")


if __name__ == "__main__":
    main()
