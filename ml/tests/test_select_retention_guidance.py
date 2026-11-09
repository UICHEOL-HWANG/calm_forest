"""Sweep 결과 선택 — 상위 후보·홀드아웃·승격 게이트를 W&B·BQ 없이 검증한다."""
from datetime import date, timedelta

import numpy as np

from select_retention_guidance import gate, run_selection, top_configs
from tests.test_train_retention_guidance import synthetic


def _sample(n=500, seed=0):
    df = synthetic(n=n, pos_rate=0.12, seed=seed)
    rng = np.random.default_rng(seed)
    df["first_day"] = [date(2026, 9, 4) + timedelta(days=int(d)) for d in rng.integers(0, 60, n)]
    return df


def _run(rid, family, objective, **cfg):
    return {"run_id": rid, "objective": objective, "config": {"family": family, "feature_set": "all", **cfg}}


RUNS = [
    _run("a", "logreg", 0.40, C=1.0),
    _run("b", "logreg", 0.55, C=0.1),
    _run("c", "logreg", 0.50, C=0.3),
    _run("d", "logreg", 0.30, C=5.0),
    _run("e", "lightgbm", 0.52, max_depth=2),
    _run("f", "lightgbm", None, max_depth=3),
]


def test_top_configs_per_family_sorted_and_skips_missing():
    top = top_configs(RUNS, k=2)
    assert [r["run_id"] for r in top["logreg"]] == ["b", "c"]
    assert [r["run_id"] for r in top["lightgbm"]] == ["e"]


BASE = {"top30_recall": 0.70, "cv_pr_auc_std": 0.10}
WIN = {"delta_pr_auc_ci_low": 0.01, "top30_recall": 0.75, "cv_pr_auc_std": 0.12}


def test_gate_passes_clear_winner():
    ok, reasons = gate({**WIN, "family": "logreg"}, BASE)
    assert ok and reasons == []


def test_gate_lists_every_failed_rule():
    cand = {"delta_pr_auc_ci_low": -0.02, "top30_recall": 0.60, "cv_pr_auc_std": 0.20, "family": "logreg"}
    ok, reasons = gate(cand, BASE)
    assert not ok
    assert len(reasons) == 3


def test_gate_fails_on_nan_delta():
    ok, reasons = gate({**WIN, "delta_pr_auc_ci_low": float("nan"), "family": "logreg"}, BASE)
    assert not ok and any("delta" in r for r in reasons)


def test_gate_requires_repeat_win_for_trees():
    ok, reasons = gate({**WIN, "family": "xgboost"}, BASE)
    assert not ok and any("repeat" in r for r in reasons)
    ok2, _ = gate({**WIN, "family": "xgboost"}, BASE, previous_winner_family="xgboost")
    assert ok2


def test_top_configs_skips_nan_objective():
    runs = RUNS + [_run("g", "logreg", float("nan"), C=2.0)]
    assert "g" not in [r["run_id"] for r in top_configs(runs, k=10)["logreg"]]


def test_run_selection_reports_baseline_and_candidates():
    report = run_selection(_sample(), RUNS, k=1, n_boot=50, n_repeats=1)
    assert report["baseline"]["config"]["family"] == "logreg"
    families = {c["config"]["family"] for c in report["candidates"]}
    assert families == {"logreg", "lightgbm"}
    for c in report["candidates"]:
        assert "holdout" in c and "passed" in c and "reasons" in c
        assert c["holdout"]["auc_ci_low"] <= c["holdout"]["auc"] <= c["holdout"]["auc_ci_high"]
        lo, hi = c["delta_pr_auc_ci"]
        assert lo <= hi
    assert report["sample"]["n_test"] + report["sample"]["n_dev"] == 500
    rec = report["recommendation"]
    if rec is not None:
        passed = [c for c in report["candidates"] if c["passed"]]
        assert rec["passed"]
        assert rec["cv"]["objective"] == max(c["cv"]["objective"] for c in passed)
