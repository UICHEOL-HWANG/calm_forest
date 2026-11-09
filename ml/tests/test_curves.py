"""학습 곡선 — 부스팅 반복별 검증 지표와 폴드 콜백을 합성 데이터로 검증한다."""
import math

import pytest

from calm_ml.curves import average_curves, iteration_curve
from calm_ml.model_eval import build_matrix, cv_scores
from calm_ml.model_zoo import builder, features_for
from tests.test_train_retention_guidance import synthetic


@pytest.fixture(scope="module")
def xy():
    df = synthetic(n=300, pos_rate=0.15)
    return build_matrix(df, features_for({"feature_set": "all"}))


@pytest.mark.parametrize("family", ["hist_gbm", "lightgbm", "xgboost"])
def test_iteration_curve_for_boosting(xy, family):
    X, y = xy
    model = builder({"family": family, "n_estimators": 60})().fit(X, y)
    curve = iteration_curve(model, X, y, n_points=10)
    its = [p["iteration"] for p in curve]
    assert its == sorted(set(its))
    assert its[0] >= 1 and its[-1] == 60
    assert len(curve) <= 10
    assert all(math.isfinite(p["val_logloss"]) and 0 <= p["val_pr_auc"] <= 1 for p in curve)
    assert curve[-1]["val_logloss"] < curve[0]["val_logloss"]


@pytest.mark.parametrize("family", ["logreg", "complement_nb", "extra_trees"])
def test_iteration_curve_none_for_non_boosting(xy, family):
    X, y = xy
    model = builder({"family": family})().fit(X, y)
    assert iteration_curve(model, X, y) is None


def test_average_curves_aligns_on_iteration():
    a = [{"iteration": 1, "val_logloss": 0.6, "val_pr_auc": 0.2},
         {"iteration": 5, "val_logloss": 0.4, "val_pr_auc": 0.4}]
    b = [{"iteration": 1, "val_logloss": 0.8, "val_pr_auc": 0.4},
         {"iteration": 5, "val_logloss": 0.2, "val_pr_auc": 0.6}]
    out = average_curves([a, b])
    assert [p["iteration"] for p in out] == [1, 5]
    assert out[0]["val_logloss"] == pytest.approx(0.7)
    assert out[1]["val_pr_auc"] == pytest.approx(0.5)


def test_average_curves_empty():
    assert average_curves([]) == []


def test_cv_scores_calls_on_fold_per_fold(xy):
    X, y = xy
    seen = []
    s = cv_scores(X, y, builder({"family": "logreg"}), n_splits=3, n_repeats=2,
                  on_fold=lambda i, model, Xte, yte, m: seen.append((i, len(yte), sorted(m))))
    assert [i for i, _, _ in seen] == list(range(s["folds"]))
    assert all(keys == ["auc", "brier", "pr_auc", "top30_recall"] for _, _, keys in seen)
