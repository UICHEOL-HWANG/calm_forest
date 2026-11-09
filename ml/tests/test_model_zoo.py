"""모델 패밀리 — 6종이 같은 인터페이스로 만들어지고 합성 표본에서 학습되는지 확인한다."""
import numpy as np
import pytest

from calm_ml.model_eval import build_matrix
from calm_ml.model_zoo import (
    FAMILIES,
    FEATURE_SETS,
    builder,
    current_config,
    features_for,
)
from calm_ml.retention_features import FEATURE_ORDER
from tests.test_train_retention_guidance import synthetic


@pytest.fixture(scope="module")
def data():
    return synthetic(n=240, pos_rate=0.12)


def test_families_listed():
    assert set(FAMILIES) == {"logreg", "complement_nb", "extra_trees", "hist_gbm", "lightgbm", "xgboost"}


def test_feature_sets_are_subsets_of_feature_order():
    assert FEATURE_SETS["all"] == FEATURE_ORDER
    for name, cols in FEATURE_SETS.items():
        assert cols, name
        assert set(cols) <= set(FEATURE_ORDER), name
        assert len(cols) == len(set(cols)), name
    proxy = {"log_early_churn_score_events", "log_early_session_summary_events", "log_early_session_time_events"}
    assert not proxy & set(FEATURE_SETS["no_session_proxy"])


@pytest.mark.parametrize("family", ["logreg", "complement_nb", "extra_trees", "hist_gbm", "lightgbm", "xgboost"])
def test_each_family_fits_and_predicts(data, family):
    cfg = {"family": family, "feature_set": "all"}
    X, y = build_matrix(data, features_for(cfg))
    X.iloc[0, 0] = np.nan
    model = builder(cfg)().fit(X, y)
    p = model.predict_proba(X)[:, 1]
    assert p.shape == (len(y),)
    assert np.all((p >= 0) & (p <= 1))


def test_builder_returns_fresh_estimators():
    make = builder({"family": "logreg"})
    assert make() is not make()


def test_logreg_params_flow_through():
    est = builder({"family": "logreg", "C": 0.5, "penalty": "elasticnet", "l1_ratio": 0.3, "pos_weight": 6})()
    clf = est.steps[-1][1]
    assert clf.C == 0.5
    assert clf.penalty == "elasticnet"
    assert clf.l1_ratio == 0.3
    assert clf.class_weight == {0: 1.0, 1: 6.0}


def test_tree_depth_is_capped():
    est = builder({"family": "lightgbm", "max_depth": 9})()
    assert est.steps[-1][1].get_params()["max_depth"] <= 4


def test_unknown_family_raises():
    with pytest.raises(ValueError):
        builder({"family": "svm"})


def test_unknown_feature_set_raises():
    with pytest.raises(ValueError):
        features_for({"family": "logreg", "feature_set": "nope"})


def test_current_config_matches_serving_logreg():
    cfg = current_config()
    clf = builder(cfg)().steps[-1][1]
    assert cfg["family"] == "logreg"
    assert clf.C == pytest.approx(0.2)
    assert clf.penalty == "l2"
    assert clf.class_weight == {0: 1.0, 1: 4.0}
    assert features_for(cfg) == FEATURE_ORDER
