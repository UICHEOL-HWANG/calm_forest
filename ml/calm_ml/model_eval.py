from __future__ import annotations

import logging
from typing import Callable

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import RepeatedStratifiedKFold

from calm_ml.retention_features import _derive_features

RAW_COLUMNS = [
    "early_tracked_events", "early_actions", "early_action_kinds", "early_area_count",
    "early_event_name_count", "early_ga_auto_events", "early_entry_auth_events",
    "early_connect_ok_events", "early_connect_fail_events", "early_other_tracking_events",
    "early_nature_events", "early_fishing_sea_events", "early_quest_social_events",
    "early_craft_home_events", "early_advanced_events", "early_chop_tree_events",
    "early_mine_ore_events", "early_npc_talk_events", "early_tutorial_step_events",
    "early_quest_offered_events", "early_churn_score_events", "early_session_summary_events",
    "early_session_time_events", "early_econ_tx_events", "early_zone_enter_events",
]
TOP_FRAC = 0.3
STD_PENALTY = 0.5
HOLDOUT_FRAC = 0.25
MIN_DEV_POSITIVES = 2

log = logging.getLogger("model_eval")

Builder = Callable[[], BaseEstimator]


def time_split(df: pd.DataFrame, *, holdout_frac: float = HOLDOUT_FRAC,
               date_col: str = "first_day") -> tuple[pd.DataFrame, pd.DataFrame]:
    if not 0 < holdout_frac < 1:
        raise ValueError(f"holdout_frac must be in (0, 1), got {holdout_frac}")
    stamps = pd.to_datetime(df[date_col])
    if stamps.isna().any():
        raise ValueError(f"{int(stamps.isna().sum())} rows have no {date_col}")
    days = stamps.dt.date
    counts = days.value_counts().sort_index(ascending=False).cumsum()
    need = max(1, int(np.ceil(len(df) * holdout_frac)))
    cutoff = counts.index[min(int((counts < need).sum()), len(counts) - 1)]
    is_test = days >= cutoff
    dev, test = df.loc[~is_test].reset_index(drop=True), df.loc[is_test].reset_index(drop=True)
    if len(dev) == 0 or int(dev["later_active"].astype(int).sum()) < MIN_DEV_POSITIVES:
        raise ValueError(f"dev window too small: {len(dev)} rows, "
                         f"{int(dev['later_active'].astype(int).sum()) if len(dev) else 0} positives")
    achieved = len(test) / len(df)
    if achieved > 2 * holdout_frac:
        log.warning("holdout is %.0f%% of rows (asked %.0f%%) — one day dominates", achieved * 100, holdout_frac * 100)
    return dev, test


def _dependencies() -> dict[str, set[str]]:
    shares = {
        "deliberate_share": "early_actions",
        "ga_auto_share": "early_ga_auto_events",
        "entry_auth_share": "early_entry_auth_events",
        "other_tracking_share": "early_other_tracking_events",
    }
    deps = {f"log_{c}": {c} for c in RAW_COLUMNS}
    deps.update({name: {num, "early_tracked_events"} for name, num in shares.items()})
    return deps


FEATURE_DEPENDENCIES = _dependencies()


def _raw_row(row: pd.Series) -> dict:
    return {c: (row.get(c, 0) if pd.notna(row.get(c, 0)) else None) for c in RAW_COLUMNS}


def _derive_or_nan(raw: dict) -> dict:
    missing = {k for k, v in raw.items() if v is None}
    feats = _derive_features({k: (0 if v is None else v) for k, v in raw.items()})
    if not missing:
        return feats
    return {k: (np.nan if FEATURE_DEPENDENCIES.get(k, set()) & missing else v) for k, v in feats.items()}


def build_matrix(df: pd.DataFrame, features: list[str]) -> tuple[pd.DataFrame, np.ndarray]:
    rows = [_derive_or_nan(_raw_row(r)) for _, r in df.iterrows()]
    X = pd.DataFrame(rows)[features].astype(float).reset_index(drop=True)
    y = df["later_active"].astype(int).to_numpy()
    return X, y


def top_frac_recall(y: np.ndarray, p: np.ndarray, frac: float = TOP_FRAC) -> float:
    y = np.asarray(y)
    positives = int(y.sum())
    if positives == 0:
        return float("nan")
    k = max(1, int(np.ceil(len(y) * frac)))
    top = np.argsort(-np.asarray(p), kind="stable")[:k]
    return float(y[top].sum() / positives)


def _fold_metrics(y: np.ndarray, p: np.ndarray) -> dict:
    return {
        "auc": float(roc_auc_score(y, p)),
        "pr_auc": float(average_precision_score(y, p)),
        "top30_recall": top_frac_recall(y, p),
        "brier": float(brier_score_loss(y, p)),
    }


def cv_scores(X: pd.DataFrame, y: np.ndarray, build: Builder, *, n_splits: int = 5,
              n_repeats: int = 3, seed: int = 0, on_fold: Callable | None = None) -> dict:
    k = max(2, min(n_splits, int(y.sum()), int(len(y) - y.sum())))
    cv = RepeatedStratifiedKFold(n_splits=k, n_repeats=n_repeats, random_state=seed)
    folds = []
    for i, (tr, te) in enumerate(cv.split(X, y)):
        model = build().fit(X.iloc[tr], y[tr])
        metrics = _fold_metrics(y[te], model.predict_proba(X.iloc[te])[:, 1])
        folds.append(metrics)
        if on_fold is not None:
            on_fold(i, model, X.iloc[te], y[te], metrics)
    frame = pd.DataFrame(folds)
    out: dict = {"folds": len(folds)}
    for name in ("auc", "pr_auc", "top30_recall", "brier"):
        out[f"{name}_mean"] = float(frame[name].mean())
        out[f"{name}_std"] = float(frame[name].std(ddof=0))
    out["objective"] = out["pr_auc_mean"] - STD_PENALTY * out["pr_auc_std"]
    return out


def _resamples(y: np.ndarray, n_boot: int, seed: int):
    rng = np.random.default_rng(seed)
    for _ in range(n_boot):
        idx = rng.integers(0, len(y), len(y))
        if y[idx].min() != y[idx].max():
            yield idx


def _interval(vals: list[float], alpha: float) -> tuple[float, float]:
    if not vals:
        return float("nan"), float("nan")
    lo, hi = np.quantile(vals, [alpha / 2, 1 - alpha / 2])
    return float(lo), float(hi)


def bootstrap_ci(y: np.ndarray, p: np.ndarray, metric: Callable, *, n_boot: int = 1000,
                 seed: int = 0, alpha: float = 0.05) -> tuple[float, float]:
    y, p = np.asarray(y), np.asarray(p)
    return _interval([metric(y[i], p[i]) for i in _resamples(y, n_boot, seed)], alpha)


def paired_delta_ci(y: np.ndarray, p_a: np.ndarray, p_b: np.ndarray, metric: Callable, *,
                    n_boot: int = 1000, seed: int = 0, alpha: float = 0.05) -> tuple[float, float]:
    y, p_a, p_b = np.asarray(y), np.asarray(p_a), np.asarray(p_b)
    vals = [metric(y[i], p_a[i]) - metric(y[i], p_b[i]) for i in _resamples(y, n_boot, seed)]
    return _interval(vals, alpha)


def fit_predict(X_dev: pd.DataFrame, y_dev: np.ndarray, X_test: pd.DataFrame, build: Builder) -> np.ndarray:
    return build().fit(X_dev, y_dev).predict_proba(X_test)[:, 1]


def score_holdout(y_test: np.ndarray, p: np.ndarray, *, n_boot: int = 1000, seed: int = 0) -> dict:
    y_test = np.asarray(y_test)
    if y_test.min() == y_test.max():
        raise ValueError(f"holdout has a single class ({int(y_test.sum())} positives of {len(y_test)})")
    out = {"n_test": int(len(y_test)), "pos_test": int(y_test.sum()), **_fold_metrics(y_test, p)}
    out["auc_ci_low"], out["auc_ci_high"] = bootstrap_ci(
        y_test, p, roc_auc_score, n_boot=n_boot, seed=seed)
    out["pr_auc_ci_low"], out["pr_auc_ci_high"] = bootstrap_ci(
        y_test, p, average_precision_score, n_boot=n_boot, seed=seed)
    return out


def holdout_scores(X_dev: pd.DataFrame, y_dev: np.ndarray, X_test: pd.DataFrame,
                   y_test: np.ndarray, build: Builder, *, n_boot: int = 1000,
                   seed: int = 0) -> dict:
    return score_holdout(y_test, fit_predict(X_dev, y_dev, X_test, build), n_boot=n_boot, seed=seed)
