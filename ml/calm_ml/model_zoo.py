from __future__ import annotations

from typing import Callable

from sklearn.base import BaseEstimator
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import ComplementNB
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from calm_ml.retention_features import FEATURE_ORDER

SEED = 0
MAX_TREE_DEPTH = 4

SESSION_PROXY = (
    "log_early_churn_score_events",
    "log_early_session_summary_events",
    "log_early_session_time_events",
)
BEHAVIOR = (
    "log_early_actions",
    "deliberate_share",
    "log_early_action_kinds",
    "log_early_area_count",
    "log_early_nature_events",
    "log_early_fishing_sea_events",
    "log_early_quest_social_events",
    "log_early_craft_home_events",
    "log_early_advanced_events",
    "log_early_chop_tree_events",
    "log_early_mine_ore_events",
    "log_early_npc_talk_events",
)
FEATURE_SETS: dict[str, list[str]] = {
    "all": list(FEATURE_ORDER),
    "no_session_proxy": [f for f in FEATURE_ORDER if f not in SESSION_PROXY],
    "behavior": [f for f in FEATURE_ORDER if f in BEHAVIOR],
}

Builder = Callable[[], BaseEstimator]


def features_for(cfg: dict) -> list[str]:
    name = cfg.get("feature_set", "all")
    if name not in FEATURE_SETS:
        raise ValueError(f"unknown feature_set: {name}")
    return list(FEATURE_SETS[name])


def _weights(cfg: dict) -> dict[int, float]:
    return {0: 1.0, 1: float(cfg.get("pos_weight", 4.0))}


def _depth(cfg: dict, default: int = 3) -> int:
    return min(MAX_TREE_DEPTH, int(cfg.get("max_depth", default)))


def _impute() -> SimpleImputer:
    return SimpleImputer(strategy="median")


def _logreg(cfg: dict) -> Pipeline:
    penalty = cfg.get("penalty", "l2")
    solver = "liblinear" if penalty in ("l1", "l2") else "saga"
    clf = LogisticRegression(
        C=float(cfg.get("C", 0.2)),
        penalty=penalty,
        l1_ratio=float(cfg.get("l1_ratio", 0.5)) if penalty == "elasticnet" else None,
        class_weight=_weights(cfg),
        solver=solver,
        max_iter=5000,
        random_state=SEED,
    )
    return Pipeline([("impute", _impute()), ("scale", StandardScaler()), ("clf", clf)])


def _complement_nb(cfg: dict) -> Pipeline:
    return Pipeline([("impute", _impute()), ("clf", ComplementNB(alpha=float(cfg.get("alpha", 1.0))))])


def _extra_trees(cfg: dict) -> Pipeline:
    clf = ExtraTreesClassifier(
        n_estimators=int(cfg.get("n_estimators", 400)),
        max_depth=_depth(cfg),
        min_samples_leaf=int(cfg.get("min_samples_leaf", 20)),
        max_features=cfg.get("max_features", "sqrt"),
        class_weight=_weights(cfg),
        n_jobs=1,
        random_state=SEED,
    )
    return Pipeline([("impute", _impute()), ("clf", clf)])


def _hist_gbm(cfg: dict) -> Pipeline:
    clf = HistGradientBoostingClassifier(
        max_depth=_depth(cfg),
        learning_rate=float(cfg.get("learning_rate", 0.05)),
        max_iter=int(cfg.get("n_estimators", 200)),
        l2_regularization=float(cfg.get("reg_lambda", 1.0)),
        min_samples_leaf=int(cfg.get("min_samples_leaf", 20)),
        class_weight=_weights(cfg),
        early_stopping=False,
        random_state=SEED,
    )
    return Pipeline([("clf", clf)])


def _lightgbm(cfg: dict) -> Pipeline:
    from lightgbm import LGBMClassifier

    depth = _depth(cfg)
    subsample = float(cfg.get("subsample", 1.0))
    clf = LGBMClassifier(
        num_leaves=min(int(cfg.get("num_leaves", 7)), 2 ** depth),
        max_depth=depth,
        learning_rate=float(cfg.get("learning_rate", 0.05)),
        n_estimators=int(cfg.get("n_estimators", 200)),
        min_child_samples=int(cfg.get("min_samples_leaf", 20)),
        reg_lambda=float(cfg.get("reg_lambda", 1.0)),
        subsample=subsample,
        subsample_freq=1 if subsample < 1.0 else 0,
        colsample_bytree=float(cfg.get("colsample", 1.0)),
        scale_pos_weight=float(cfg.get("pos_weight", 4.0)),
        n_jobs=1,
        random_state=SEED,
        verbose=-1,
    )
    return Pipeline([("clf", clf)])


def _xgboost(cfg: dict) -> Pipeline:
    from xgboost import XGBClassifier

    clf = XGBClassifier(
        max_depth=_depth(cfg),
        learning_rate=float(cfg.get("learning_rate", 0.05)),
        n_estimators=int(cfg.get("n_estimators", 200)),
        min_child_weight=float(cfg.get("min_child_weight", 5.0)),
        reg_lambda=float(cfg.get("reg_lambda", 1.0)),
        subsample=float(cfg.get("subsample", 1.0)),
        colsample_bytree=float(cfg.get("colsample", 1.0)),
        scale_pos_weight=float(cfg.get("pos_weight", 4.0)),
        tree_method="hist",
        eval_metric="logloss",
        n_jobs=1,
        random_state=SEED,
    )
    return Pipeline([("clf", clf)])


FAMILIES: dict[str, Callable[[dict], Pipeline]] = {
    "logreg": _logreg,
    "complement_nb": _complement_nb,
    "extra_trees": _extra_trees,
    "hist_gbm": _hist_gbm,
    "lightgbm": _lightgbm,
    "xgboost": _xgboost,
}


def builder(cfg: dict) -> Builder:
    family = cfg.get("family")
    if family not in FAMILIES:
        raise ValueError(f"unknown family: {family}")
    frozen = dict(cfg)
    return lambda: FAMILIES[family](frozen)


def current_config() -> dict:
    return {"family": "logreg", "feature_set": "all", "C": 0.2, "penalty": "l2", "pos_weight": 4.0}
