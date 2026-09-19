# =============================================================
#  calm forest · 리텐션 안내 모델 export — BQ → retention_guidance.json
#  ------------------------------------------------------------
#  ▶ 손으로:
#      cd ml
#      uv run python train_retention_guidance.py --out /tmp/retention_guidance.json
#  ▶ VM:
#      /opt/calm-api/model/retention_guidance.json 로 배치하면
#      /retention-guidance/predict 가 재시작 없이 hot reload 한다.
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
from sklearn.preprocessing import StandardScaler

from api.retention_guidance import FEATURE_ORDER, _derive_features

SQL = Path(__file__).parent / "sql" / "g5_refined_retention_feature_table.sql"
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


def fit_and_export(df: pd.DataFrame, out: Path | str, *, selected_path: Path = SELECTED) -> dict:
    selected = json.loads(selected_path.read_text(encoding="utf-8"))
    X, y, impute = _prepare(df)

    scaler = StandardScaler().fit(X)
    clf = LogisticRegression(
        penalty="l2",
        C=float(selected.get("selected_config", {}).get("C", 0.2)),
        class_weight={0: 1.0, 1: 4.0},
        max_iter=1000,
        solver=selected.get("selected_config", {}).get("solver", "liblinear"),
    ).fit(scaler.transform(X), y)

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
            "threshold": threshold,
        },
        "caveats": [
            "G5 small-sample operational candidate; compare against rule baseline after positives grow.",
            "Feature set intentionally matches the 2026-09-15 selected report, including session-survival proxy fields.",
        ],
    }

    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(model, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(out)
    return model


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/opt/calm-api/model/retention_guidance.json")
    a = ap.parse_args()

    from calm_ml import bq
    df = bq.read_sql_file(str(SQL))
    model = fit_and_export(df, a.out)
    print(json.dumps(model["metrics"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
