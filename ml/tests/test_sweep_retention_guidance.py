"""Sweep 러너 — 탐색 공간·평가·캐시·W&B 연결을 BQ·네트워크 없이 검증한다."""
import io
from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest

from calm_ml.model_eval import time_split
from calm_ml.model_zoo import FAMILIES, builder
from sweep_retention_guidance import evaluate, load_sample, make_train_fn, sweep_config
from tests.test_train_retention_guidance import synthetic


def _sample(n=300, seed=0):
    df = synthetic(n=n, pos_rate=0.12, seed=seed)
    rng = np.random.default_rng(seed)
    df["first_day"] = [date(2026, 9, 4) + timedelta(days=int(d)) for d in rng.integers(0, 60, n)]
    return df


@pytest.mark.parametrize("family", sorted(FAMILIES))
def test_sweep_config_is_valid_for_every_family(family):
    cfg = sweep_config(family)
    assert cfg["method"] == "bayes"
    assert cfg["metric"] == {"name": "objective", "goal": "maximize"}
    params = cfg["parameters"]
    assert params["family"] == {"value": family}
    assert "feature_set" in params
    assert ("pos_weight" in params) == (family != "complement_nb")
    sample = {k: (v["value"] if "value" in v else v.get("values", [v.get("min")])[0]) for k, v in params.items()}
    builder(sample)()


def test_sweep_config_rejects_unknown_family():
    with pytest.raises(ValueError):
        sweep_config("svm")


def test_evaluate_uses_dev_window_only():
    df = _sample()
    s = evaluate(df, {"family": "logreg", "feature_set": "all"}, holdout_frac=0.25, n_repeats=1)
    dev, _ = time_split(df, holdout_frac=0.25)
    assert s["n_dev"] == len(dev)
    assert "objective" in s and "auc_mean" in s


class MemBucket:
    def __init__(self):
        self.objects = {}

    def get(self, key):
        return self.objects.get(key)

    def put(self, key, body, **_):
        self.objects[key] = body


DAY = date(2026, 11, 9)
KEY = "ml/samples/retention_guidance/2026-11-09.parquet"


def test_load_sample_uses_bucket_snapshot_of_the_day():
    bucket = MemBucket()
    buf = io.BytesIO()
    _sample(n=40).to_parquet(buf, index=False)
    bucket.objects[KEY] = buf.getvalue()
    calls = []
    df = load_sample(bucket=bucket, day=DAY, reader=lambda: calls.append(1))
    assert len(df) == 40 and not calls


def test_load_sample_queries_and_uploads_when_missing():
    bucket = MemBucket()
    df = load_sample(bucket=bucket, day=DAY, reader=lambda: _sample(n=55))
    assert len(df) == 55
    assert len(pd.read_parquet(io.BytesIO(bucket.objects[KEY]))) == 55


def test_load_sample_refresh_overwrites_snapshot():
    bucket = MemBucket()
    load_sample(bucket=bucket, day=DAY, reader=lambda: _sample(n=40))
    df = load_sample(bucket=bucket, day=DAY, reader=lambda: _sample(n=60), refresh=True)
    assert len(df) == 60
    assert len(pd.read_parquet(io.BytesIO(bucket.objects[KEY]))) == 60


def test_load_sample_without_bucket_writes_nothing_locally(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    df = load_sample(bucket=None, day=DAY, reader=lambda: _sample(n=30))
    assert len(df) == 30
    assert not list(tmp_path.iterdir())


class FakeRun:
    def __init__(self, config):
        self.config = config
        self.logs = []
        self.metrics = {}
        self.summary = {}

    def log(self, d):
        self.logs.append(dict(d))

    def define_metric(self, name, step_metric=None, **_):
        self.metrics[name] = step_metric

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def _run_train(config, **kw):
    run = FakeRun(config)
    seen = {}

    def init(**kwargs):
        seen.update(kwargs)
        return run

    make_train_fn(_sample(), init=init, holdout_frac=0.25, n_repeats=1, **kw)()
    return run, seen


def test_train_fn_puts_scores_in_summary():
    run, _ = _run_train({"family": "complement_nb", "feature_set": "behavior", "alpha": 0.5})
    assert "objective" in run.summary
    assert run.summary["n_dev"] > 0


def test_train_fn_logs_each_fold_on_its_own_axis():
    run, _ = _run_train({"family": "logreg", "feature_set": "all"})
    fold_logs = [l for l in run.logs if "fold/index" in l]
    assert [l["fold/index"] for l in fold_logs] == list(range(run.summary["folds"]))
    assert {"fold/pr_auc", "fold/auc"} <= set(fold_logs[0])
    assert run.metrics["fold/*"] == "fold/index"
    assert not [l for l in run.logs if "curve/iteration" in l]


def test_train_fn_logs_boosting_curve():
    run, _ = _run_train({"family": "lightgbm", "feature_set": "all", "n_estimators": 40})
    curve = [l for l in run.logs if "curve/iteration" in l]
    assert curve and curve[-1]["curve/iteration"] == 40
    assert {"curve/val_logloss", "curve/val_pr_auc"} <= set(curve[0])
    assert run.metrics["curve/*"] == "curve/iteration"


def test_train_fn_tags_batch():
    _, seen = _run_train({"family": "logreg"}, batch="20261209-0300")
    assert "batch-20261209-0300" in seen["tags"]
