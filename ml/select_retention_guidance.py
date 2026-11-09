from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import math

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score

from calm_ml.model_eval import (
    build_matrix,
    cv_scores,
    fit_predict,
    paired_delta_ci,
    score_holdout,
    time_split,
)
from calm_ml.model_zoo import builder, current_config, features_for
from calm_ml.storage import default_bucket, sweep_key
from sweep_retention_guidance import HOLDOUT_FRAC, SWEEP_PROJECT, load_sample

TREE_FAMILIES = {"extra_trees", "hist_gbm", "lightgbm", "xgboost"}
MAX_STD_RATIO = 1.5
WANDB_ENTITY = "icucheol"

log = logging.getLogger("select_retention_guidance")


def top_configs(runs: list[dict], *, k: int = 3) -> dict[str, list[dict]]:
    by_family: dict[str, list[dict]] = {}
    for r in runs:
        obj = r.get("objective")
        if obj is None or not math.isfinite(obj):
            continue
        by_family.setdefault(r["config"]["family"], []).append(r)
    return {f: sorted(rs, key=lambda r: r["objective"], reverse=True)[:k] for f, rs in by_family.items()}


def gate(cand: dict, base: dict, *, previous_winner_family: str | None = None) -> tuple[bool, list[str]]:
    reasons = []
    delta_low = cand["delta_pr_auc_ci_low"]
    if not (math.isfinite(delta_low) and delta_low > 0):
        reasons.append(f"paired pr_auc delta ci low {delta_low:.3f} is not above 0")
    if cand["top30_recall"] < base["top30_recall"]:
        reasons.append(f"top30 recall {cand['top30_recall']:.3f} < baseline {base['top30_recall']:.3f}")
    if cand["cv_pr_auc_std"] > MAX_STD_RATIO * base["cv_pr_auc_std"]:
        reasons.append(f"cv pr_auc std {cand['cv_pr_auc_std']:.3f} > {MAX_STD_RATIO}x baseline")
    if cand.get("family") in TREE_FAMILIES and previous_winner_family != cand.get("family"):
        reasons.append("tree family needs a repeat win in the next sweep")
    return not reasons, reasons


def _assess(cfg: dict, dev: pd.DataFrame, test: pd.DataFrame, *,
            n_boot: int, n_repeats: int) -> tuple[dict, np.ndarray, np.ndarray]:
    feats = features_for(cfg)
    Xd, yd = build_matrix(dev, feats)
    Xt, yt = build_matrix(test, feats)
    make = builder(cfg)
    p = fit_predict(Xd, yd, Xt, make)
    assessed = {"cv": cv_scores(Xd, yd, make, n_repeats=n_repeats),
                "holdout": score_holdout(yt, p, n_boot=n_boot)}
    return assessed, yt, p


def run_selection(df: pd.DataFrame, runs: list[dict], *, k: int = 3, n_boot: int = 1000,
                  n_repeats: int = 3, previous_winner_family: str | None = None,
                  holdout_frac: float = HOLDOUT_FRAC) -> dict:
    dev, test = time_split(df, holdout_frac=holdout_frac)
    base_cfg = current_config()
    base, y_test, p_base = _assess(base_cfg, dev, test, n_boot=n_boot, n_repeats=n_repeats)
    base_view = {"top30_recall": base["holdout"]["top30_recall"], "cv_pr_auc_std": base["cv"]["pr_auc_std"]}
    candidates = []
    for family, rs in top_configs(runs, k=k).items():
        for r in rs:
            assessed, _, p = _assess(r["config"], dev, test, n_boot=n_boot, n_repeats=n_repeats)
            delta = paired_delta_ci(y_test, p, p_base, average_precision_score, n_boot=n_boot)
            view = {"delta_pr_auc_ci_low": delta[0], "top30_recall": assessed["holdout"]["top30_recall"],
                    "cv_pr_auc_std": assessed["cv"]["pr_auc_std"], "family": family}
            ok, reasons = gate(view, base_view, previous_winner_family=previous_winner_family)
            candidates.append({"run_id": r["run_id"], "config": r["config"], **assessed,
                               "delta_pr_auc_ci": list(delta), "passed": ok, "reasons": reasons})
    passed = [c for c in candidates if c["passed"]]
    best = max(passed, key=lambda c: c["cv"]["objective"]) if passed else None
    ranked = sorted(candidates, key=lambda c: c["cv"]["objective"], reverse=True)
    return {
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sample": {"n_dev": int(len(dev)), "pos_dev": int(dev["later_active"].astype(int).sum()),
                   "n_test": int(len(test)), "pos_test": int(test["later_active"].astype(int).sum()),
                   "test_from": str(min(test["first_day"])), "test_to": str(max(test["first_day"]))},
        "baseline": {"config": base_cfg, **base},
        "candidates": ranked,
        "recommendation": best,
        "note": "holdout is evaluated once per candidate; final pick among gate passers uses cv objective",
    }


def fetch_runs(sweep_ids: list[str]) -> list[dict]:
    import wandb

    api = wandb.Api()
    out = []
    for sid in sweep_ids:
        for r in api.sweep(f"{WANDB_ENTITY}/{SWEEP_PROJECT}/{sid}").runs:
            if r.state != "finished":
                continue
            out.append({"run_id": r.id, "objective": r.summary.get("objective"), "config": dict(r.config)})
    return out


def _summary_table(report: dict) -> str:
    b, bc = report["baseline"]["holdout"], report["baseline"]["cv"]
    lines = [f"sample {report['sample']}",
             f"BASE logreg         cv_obj {bc['objective']:.3f}  pr_auc {b['pr_auc']:.3f}  auc {b['auc']:.3f} "
             f"[{b['auc_ci_low']:.3f},{b['auc_ci_high']:.3f}]  top30 {b['top30_recall']:.2f}"]
    for c in report["candidates"]:
        h, cv = c["holdout"], c["cv"]
        lo, hi = c["delta_pr_auc_ci"]
        mark = "PASS" if c["passed"] else "    "
        lines.append(f"{mark} {c['config']['family']:<13} {c['config'].get('feature_set', 'all'):<16} "
                     f"cv_obj {cv['objective']:.3f}  pr_auc {h['pr_auc']:.3f} d[{lo:+.3f},{hi:+.3f}]  "
                     f"auc {h['auc']:.3f}  top30 {h['top30_recall']:.2f}  cv_std {cv['pr_auc_std']:.3f}  {c['run_id']}")
    return "\n".join(lines)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--sweep-ids", required=True)
    ap.add_argument("--k", type=int, default=3)
    ap.add_argument("--previous-winner")
    ap.add_argument("--day", type=dt.date.fromisoformat, help="sample snapshot day used by the sweep")
    a = ap.parse_args()

    bucket = default_bucket()
    if bucket is None:
        log.warning("OCI bucket not configured — selection.json will not be stored")
    day = a.day or dt.date.today()
    df = load_sample(bucket=bucket, day=day)
    report = run_selection(df, fetch_runs(a.sweep_ids.split(",")), k=a.k,
                           previous_winner_family=a.previous_winner)
    report["sample"]["snapshot_day"] = day.isoformat()
    body = json.dumps(report, ensure_ascii=False, indent=2, default=str).encode()
    if bucket is not None:
        bucket.put(sweep_key(day, "selection.json"), body, content_type="application/json")
    print(_summary_table(report))


if __name__ == "__main__":
    main()
