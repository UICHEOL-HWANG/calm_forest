from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, log_loss
from sklearn.pipeline import Pipeline

CURVE_POINTS = 20


def _checkpoints(total: int, n_points: int) -> list[int]:
    return sorted({int(round(v)) for v in np.linspace(1, total, num=min(n_points, total))})


def _transform(model: Pipeline, X: pd.DataFrame):
    return model[:-1].transform(X) if len(model.steps) > 1 else X


def _staged(clf, Xt, points: list[int]) -> dict[int, np.ndarray]:
    kind = type(clf).__name__
    if kind == "HistGradientBoostingClassifier":
        wanted = set(points)
        return {i: p[:, 1] for i, p in enumerate(clf.staged_predict_proba(Xt), start=1) if i in wanted}
    if kind == "LGBMClassifier":
        return {i: clf.predict_proba(Xt, num_iteration=i)[:, 1] for i in points}
    return {i: clf.predict_proba(Xt, iteration_range=(0, i))[:, 1] for i in points}


def _total_iterations(clf) -> int | None:
    kind = type(clf).__name__
    if kind == "HistGradientBoostingClassifier":
        return int(clf.n_iter_)
    if kind == "LGBMClassifier":
        return int(clf.booster_.current_iteration())
    if kind == "XGBClassifier":
        return int(clf.get_booster().num_boosted_rounds())
    return None


def iteration_curve(model: Pipeline, X: pd.DataFrame, y: np.ndarray, *,
                    n_points: int = CURVE_POINTS) -> list[dict] | None:
    clf = model.steps[-1][1]
    total = _total_iterations(clf)
    if not total:
        return None
    points = _checkpoints(total, n_points)
    preds = _staged(clf, _transform(model, X), points)
    return [{"iteration": i,
             "val_logloss": float(log_loss(y, preds[i], labels=[0, 1])),
             "val_pr_auc": float(average_precision_score(y, preds[i]))}
            for i in points]


def average_curves(curves: list[list[dict]]) -> list[dict]:
    if not curves:
        return []
    frame = pd.DataFrame([p for c in curves for p in c])
    means = frame.groupby("iteration", sort=True).mean().reset_index()
    return [{"iteration": int(r.iteration), "val_logloss": float(r.val_logloss), "val_pr_auc": float(r.val_pr_auc)}
            for r in means.itertuples()]
