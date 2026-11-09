"""모델 평가 프로토콜 — 시간 분할·폴드 내 대체·지표를 합성 데이터로 검증한다."""
from datetime import date, timedelta

import numpy as np
import pandas as pd
import pytest
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.pipeline import make_pipeline

from calm_ml.model_eval import (
    bootstrap_ci,
    build_matrix,
    cv_scores,
    holdout_scores,
    time_split,
    top_frac_recall,
)
from calm_ml.retention_features import FEATURE_ORDER
from tests.test_train_retention_guidance import synthetic


def _with_days(df, start=date(2026, 9, 4), span=60, seed=0):
    rng = np.random.default_rng(seed)
    out = df.copy()
    out["first_day"] = [start + timedelta(days=int(d)) for d in rng.integers(0, span, len(df))]
    return out


def _lr():
    return make_pipeline(SimpleImputer(strategy="median"), LogisticRegression(max_iter=1000))


def test_time_split_holds_out_latest_fraction_on_day_boundary():
    df = _with_days(synthetic(n=300))
    dev, test = time_split(df, holdout_frac=0.25)
    assert len(dev) + len(test) == len(df)
    assert max(dev["first_day"]) < min(test["first_day"])
    assert 0.25 <= len(test) / len(df) < 0.25 + 0.05


def test_time_split_handles_skewed_recent_volume():
    early = _with_days(synthetic(n=100, seed=1), start=date(2026, 9, 4), span=30)
    late = _with_days(synthetic(n=900, seed=2), start=date(2026, 10, 10), span=30)
    df = pd.concat([early, late], ignore_index=True)
    dev, test = time_split(df, holdout_frac=0.25)
    assert len(dev) >= 700
    assert max(dev["first_day"]) < min(test["first_day"])


def test_time_split_accepts_string_dates():
    df = _with_days(synthetic(n=100))
    df["first_day"] = df["first_day"].astype(str)
    dev, test = time_split(df, holdout_frac=0.2)
    assert len(test) > 0 and len(dev) > 0


def test_build_matrix_keeps_nan_for_fold_imputation():
    df = synthetic(n=50).astype({"early_actions": float})
    df.loc[0, "early_actions"] = np.nan
    X, y = build_matrix(df, FEATURE_ORDER)
    assert list(X.columns) == FEATURE_ORDER
    assert len(y) == 50
    assert set(np.unique(y)) <= {0, 1}


def test_build_matrix_subsets_features():
    X, _ = build_matrix(synthetic(n=30), ["log_early_actions", "deliberate_share"])
    assert list(X.columns) == ["log_early_actions", "deliberate_share"]


def test_top_frac_recall():
    y = np.array([1, 1, 0, 0, 0, 0, 0, 0, 0, 0])
    p = np.array([0.9, 0.1, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.05])
    assert top_frac_recall(y, p, 0.3) == pytest.approx(0.5)
    assert top_frac_recall(y, p, 1.0) == pytest.approx(1.0)


def test_cv_scores_reports_mean_std_and_objective():
    X, y = build_matrix(synthetic(n=300, pos_rate=0.1), FEATURE_ORDER)
    s = cv_scores(X, y, _lr, n_splits=3, n_repeats=2, seed=0)
    for k in ("auc_mean", "auc_std", "pr_auc_mean", "pr_auc_std", "top30_recall_mean", "brier_mean", "objective", "folds"):
        assert k in s
    assert s["folds"] == 6
    assert s["auc_mean"] > 0.7
    assert s["objective"] == pytest.approx(s["pr_auc_mean"] - 0.5 * s["pr_auc_std"])


def test_cv_scores_is_deterministic():
    X, y = build_matrix(synthetic(n=200), FEATURE_ORDER)
    a = cv_scores(X, y, _lr, n_splits=3, n_repeats=1, seed=1)
    b = cv_scores(X, y, _lr, n_splits=3, n_repeats=1, seed=1)
    assert a["auc_mean"] == b["auc_mean"]


def test_cv_scores_reduces_splits_when_few_positives():
    X, y = build_matrix(synthetic(n=60, pos_rate=0.05), FEATURE_ORDER)
    s = cv_scores(X, y, _lr, n_splits=5, n_repeats=1)
    assert s["folds"] == min(5, int(y.sum()))


def test_bootstrap_ci_brackets_point():
    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 200)
    p = np.clip(y * 0.6 + rng.normal(0.2, 0.2, 200), 0, 1)
    lo, hi = bootstrap_ci(y, p, roc_auc_score, n_boot=200, seed=0)
    assert lo <= roc_auc_score(y, p) <= hi


def test_holdout_scores_has_cis():
    df = _with_days(synthetic(n=400, pos_rate=0.15))
    dev, test = time_split(df, holdout_frac=0.3)
    Xd, yd = build_matrix(dev, FEATURE_ORDER)
    Xt, yt = build_matrix(test, FEATURE_ORDER)
    s = holdout_scores(Xd, yd, Xt, yt, _lr, n_boot=100)
    for k in ("auc", "auc_ci_low", "auc_ci_high", "pr_auc", "pr_auc_ci_low", "pr_auc_ci_high", "top30_recall", "n_test", "pos_test"):
        assert k in s
    assert s["auc_ci_low"] <= s["auc"] <= s["auc_ci_high"]


def test_build_matrix_marks_dependent_shares_missing():
    df = synthetic(n=20).astype({"early_actions": float, "early_ga_auto_events": float})
    df.loc[0, "early_actions"] = np.nan
    df.loc[1, "early_ga_auto_events"] = np.nan
    X, _ = build_matrix(df, FEATURE_ORDER)
    assert np.isnan(X.loc[0, "log_early_actions"])
    assert np.isnan(X.loc[0, "deliberate_share"])
    assert not np.isnan(X.loc[0, "ga_auto_share"])
    assert np.isnan(X.loc[1, "ga_auto_share"])
    assert np.isnan(X.loc[1, "log_early_ga_auto_events"])
    assert not np.isnan(X.loc[1, "deliberate_share"])


def test_build_matrix_tracked_events_missing_blanks_every_share():
    df = synthetic(n=5).astype({"early_tracked_events": float})
    df.loc[0, "early_tracked_events"] = np.nan
    X, _ = build_matrix(df, FEATURE_ORDER)
    for col in ("deliberate_share", "ga_auto_share", "entry_auth_share", "other_tracking_share",
                "log_early_tracked_events"):
        assert np.isnan(X.loc[0, col]), col
    assert not np.isnan(X.loc[0, "log_early_actions"])


@pytest.mark.parametrize("frac", [0, 1, -0.1, 1.5])
def test_time_split_rejects_bad_fraction(frac):
    with pytest.raises(ValueError):
        time_split(_with_days(synthetic(n=50)), holdout_frac=frac)


def test_time_split_rejects_single_day_sample():
    df = synthetic(n=30)
    df["first_day"] = date(2026, 11, 1)
    with pytest.raises(ValueError):
        time_split(df, holdout_frac=0.25)


def test_time_split_rejects_missing_dates():
    df = _with_days(synthetic(n=30))
    df.loc[0, "first_day"] = None
    with pytest.raises(ValueError):
        time_split(df, holdout_frac=0.25)


def test_time_split_rejects_dev_without_positives():
    df = _with_days(synthetic(n=200, pos_rate=0.1))
    last = max(df["first_day"])
    df["later_active"] = df["first_day"] >= last - timedelta(days=2)
    with pytest.raises(ValueError, match="dev window too small"):
        time_split(df, holdout_frac=0.25)


def test_bootstrap_ci_single_class_is_nan():
    lo, hi = bootstrap_ci(np.zeros(20), np.linspace(0, 1, 20), roc_auc_score, n_boot=20)
    assert np.isnan(lo) and np.isnan(hi)


def test_holdout_scores_single_class_test_raises_clearly():
    df = _with_days(synthetic(n=300, pos_rate=0.15))
    dev, test = time_split(df, holdout_frac=0.3)
    test = test.assign(later_active=False)
    Xd, yd = build_matrix(dev, FEATURE_ORDER)
    Xt, yt = build_matrix(test, FEATURE_ORDER)
    with pytest.raises(ValueError, match="single class"):
        holdout_scores(Xd, yd, Xt, yt, _lr, n_boot=10)


def test_paired_delta_ci_detects_better_and_equal():
    from sklearn.metrics import average_precision_score

    from calm_ml.model_eval import paired_delta_ci

    rng = np.random.default_rng(0)
    y = rng.integers(0, 2, 300)
    good = np.clip(y * 0.7 + rng.normal(0.15, 0.15, 300), 0, 1)
    weak = np.clip(y * 0.2 + rng.normal(0.4, 0.25, 300), 0, 1)
    lo, hi = paired_delta_ci(y, good, weak, average_precision_score, n_boot=200)
    assert lo > 0
    lo2, hi2 = paired_delta_ci(y, good, good, average_precision_score, n_boot=50)
    assert lo2 == pytest.approx(0) and hi2 == pytest.approx(0)
