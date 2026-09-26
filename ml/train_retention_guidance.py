# =============================================================
#  calm forest · 리텐션 안내 모델 export — BQ → retention_guidance.json
#  ------------------------------------------------------------
#  ▶ 손으로:
#      cd ml
#      uv run python train_retention_guidance.py --out /tmp/retention_guidance.json
#  ▶ VM: Airflow DAG retention_guidance_train 이 매주 월 04:30 에 돌려
#      /opt/calm-api/model/retention_guidance.json 을 원자적으로 교체한다
#      → /retention-guidance/predict 가 재시작 없이 hot reload 한다.
#      이력·롤백은 W&B 아티팩트 retention-guidance-model 이 맡는다.
#
#  ⚠️ 이 모델은 2026-09-15 G5 분석에서 고른 1차 운영 후보를 그대로 export 한다.
#     positive 가 충분히 쌓이면 피처/임계값/비교 기준을 재검토해야 한다.
# =============================================================
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler

from calm_ml.retention_features import FEATURE_ORDER, _derive_features
from train_churn import version_alias

SQL = Path(__file__).parent / "sql" / "retention_guidance_train_sample.sql"
SELECTED = Path(__file__).parent / "reports" / "g5_refined_hyperparam_search_2026-09-15" / "selected_hyperparams.json"


def _raw_feature_row(row: pd.Series) -> dict:
    return {
        "early_tracked_events": row.get("early_tracked_events", 0),
        "early_actions": row.get("early_actions", 0),
        "early_action_kinds": row.get("early_action_kinds", 0),
        "early_area_count": row.get("early_area_count", 0),
        "early_event_name_count": row.get("early_event_name_count", 0),
        "early_ga_auto_events": row.get("early_ga_auto_events", 0),
        "early_entry_auth_events": row.get("early_entry_auth_events", 0),
        "early_connect_ok_events": row.get("early_connect_ok_events", 0),
        "early_connect_fail_events": row.get("early_connect_fail_events", 0),
        "early_other_tracking_events": row.get("early_other_tracking_events", 0),
        "early_nature_events": row.get("early_nature_events", 0),
        "early_fishing_sea_events": row.get("early_fishing_sea_events", 0),
        "early_quest_social_events": row.get("early_quest_social_events", 0),
        "early_craft_home_events": row.get("early_craft_home_events", 0),
        "early_advanced_events": row.get("early_advanced_events", 0),
        "early_chop_tree_events": row.get("early_chop_tree_events", 0),
        "early_mine_ore_events": row.get("early_mine_ore_events", 0),
        "early_npc_talk_events": row.get("early_npc_talk_events", 0),
        "early_tutorial_step_events": row.get("early_tutorial_step_events", 0),
        "early_quest_offered_events": row.get("early_quest_offered_events", 0),
        "early_churn_score_events": row.get("early_churn_score_events", 0),
        "early_session_summary_events": row.get("early_session_summary_events", 0),
        "early_session_time_events": row.get("early_session_time_events", 0),
        "early_econ_tx_events": row.get("early_econ_tx_events", 0),
        "early_zone_enter_events": row.get("early_zone_enter_events", 0),
    }


# 표본 하한 — 9/19 첫 운영 모델(n=95, 양성 12)보다 작은 표본으로는 덮어쓰지 않는다.
MIN_ROWS = 95
MIN_POSITIVES = 12


def check_sample(df: pd.DataFrame) -> None:
    """표본이 무너지면(쿼리 사고·export 지연) 멀쩡히 돌던 모델을 지키려고 예외를 던진다."""
    n = len(df)
    positives = int(df["later_active"].astype(int).sum()) if n else 0
    if n < MIN_ROWS:
        raise ValueError(f"표본이 너무 작다({n}행 < {MIN_ROWS}) — 기존 모델을 지킨다")
    if positives < MIN_POSITIVES:
        raise ValueError(f"양성이 너무 적다({positives} < {MIN_POSITIVES}) — 기존 모델을 지킨다")


def _new_clf(selected: dict) -> LogisticRegression:
    return LogisticRegression(
        penalty="l2",
        C=float(selected.get("selected_config", {}).get("C", 0.2)),
        class_weight={0: 1.0, 1: 4.0},
        max_iter=1000,
        solver=selected.get("selected_config", {}).get("solver", "liblinear"),
    )


def _cv_auc(X: np.ndarray, y: np.ndarray, selected: dict, n_splits: int = 5) -> float | None:
    """층화 K겹 out-of-fold AUC. train AUC 는 작은 표본에서 과적합으로 부풀어(9/19: 0.99) 주간 추적용으론 이걸 본다."""
    k = min(n_splits, int(y.sum()), int(len(y) - y.sum()))
    if k < 2:
        return None
    oof = np.zeros(len(y))
    for tr, te in StratifiedKFold(n_splits=k, shuffle=True, random_state=0).split(X, y):
        sc = StandardScaler().fit(X[tr])
        oof[te] = _new_clf(selected).fit(sc.transform(X[tr]), y[tr]).predict_proba(sc.transform(X[te]))[:, 1]
    return float(roc_auc_score(y, oof))


def _prepare(df: pd.DataFrame):
    rows = [_derive_features(_raw_feature_row(r)) for _, r in df.iterrows()]
    Xdf = pd.DataFrame(rows)
    impute: dict[str, float] = {}
    for name in FEATURE_ORDER:
        col = pd.to_numeric(Xdf[name], errors="coerce").astype(float)
        med = col.median()
        impute[name] = float(med) if np.isfinite(med) else 0.0
        Xdf[name] = col.fillna(impute[name])
    y = df["later_active"].astype(int).to_numpy()
    return Xdf[FEATURE_ORDER].to_numpy(dtype=float), y, impute


def fit_and_export(df: pd.DataFrame, out: Path | str, *, selected_path: Path = SELECTED,
                   log_wandb: bool = True) -> dict:
    selected = json.loads(selected_path.read_text(encoding="utf-8"))
    X, y, impute = _prepare(df)

    scaler = StandardScaler().fit(X)
    clf = _new_clf(selected).fit(scaler.transform(X), y)

    p = clf.predict_proba(scaler.transform(X))[:, 1]
    threshold = float(selected.get("nested_top3_scores", {}).get("top30_cutoff", 0.28533367358257644))

    model = {
        "model_version": datetime.now(timezone.utc).strftime("retention-guidance-%Y-%m-%dT%H:%M:%SZ"),
        "source_report": str(selected_path),
        "feature_order": FEATURE_ORDER,
        "coef": [float(v) for v in clf.coef_[0]],
        "intercept": float(clf.intercept_[0]),
        "scaler": {
            "mean": [float(v) for v in scaler.mean_],
            "scale": [float(v) if v > 1e-12 else 1.0 for v in scaler.scale_],
        },
        "impute": impute,
        "threshold": threshold,
        "enabled": True,
        "metrics": {
            "n": int(len(y)),
            "positives": int(y.sum()),
            "base_rate": float(y.mean()) if len(y) else 0.0,
            "train_auc": float(roc_auc_score(y, p)) if len(np.unique(y)) == 2 else None,
            "train_pr_auc": float(average_precision_score(y, p)) if len(np.unique(y)) == 2 else None,
            "cv_auc": _cv_auc(X, y, selected),
            "threshold": threshold,
        },
        "caveats": [
            "G5 small-sample operational candidate; compare against rule baseline after positives grow.",
            "Feature set intentionally matches the 2026-09-15 selected report, including session-survival proxy fields.",
            "cv_auc imputes medians on the full sample before folding — slightly optimistic.",
        ],
    }

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(out)
    if log_wandb:
        log_to_wandb(model, out)
    return model


def log_to_wandb(model: dict, out: Path | str, *, start_run=None, artifact_cls=None) -> None:
    """지표를 런에 남기고 모델 파일을 아티팩트 `retention-guidance-model` 로 올린다(churn-coef 와 같은 방식).

    롤백: 아티팩트에서 원하는 버전을 받아 /opt/calm-api/model/retention_guidance.json 에 두면 핫리로드된다.
    start_run / artifact_cls 는 테스트에서 가짜를 꽂기 위한 주입점이다.
    """
    if start_run is None:
        from calm_ml.tracking import start_run as _start_run
        start_run = _start_run
    if artifact_cls is None:
        import wandb
        artifact_cls = wandb.Artifact

    run = start_run("retention-guidance", config={"features": FEATURE_ORDER},
                    tags=["retention-guidance", "weekly"])
    run.log({k: v for k, v in model["metrics"].items() if v is not None})
    art = artifact_cls("retention-guidance-model", type="model",
                       metadata={"model_version": model["model_version"], **model["metrics"]})
    art.add_file(str(out), name="retention_guidance.json")
    run.log_artifact(art, aliases=["latest", version_alias(model["model_version"])])
    run.finish()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/opt/calm-api/model/retention_guidance.json")
    ap.add_argument("--no-wandb", action="store_true")
    a = ap.parse_args()

    from calm_ml import bq
    df = bq.read_sql_file(str(SQL))
    check_sample(df)
    model = fit_and_export(df, a.out, log_wandb=not a.no_wandb)
    print(json.dumps(model["metrics"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
