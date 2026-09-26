# =============================================================
#  calm forest · 리텐션 안내 피처 — raw counter → 모델 피처
#  ------------------------------------------------------------
#  서빙(api/retention_guidance.py)과 학습(train_retention_guidance.py)이 같이 쓴다.
#  FastAPI 에 의존하지 않는다 — Airflow 이미지(FastAPI 없음)에서도 import 된다.
# =============================================================
from __future__ import annotations

import math

FEATURE_ORDER = [
    "log_early_tracked_events",
    "log_early_actions",
    "deliberate_share",
    "log_early_action_kinds",
    "log_early_area_count",
    "log_early_event_name_count",
    "log_early_ga_auto_events",
    "log_early_entry_auth_events",
    "log_early_connect_ok_events",
    "log_early_connect_fail_events",
    "log_early_other_tracking_events",
    "ga_auto_share",
    "entry_auth_share",
    "other_tracking_share",
    "log_early_nature_events",
    "log_early_fishing_sea_events",
    "log_early_quest_social_events",
    "log_early_craft_home_events",
    "log_early_advanced_events",
    "log_early_chop_tree_events",
    "log_early_mine_ore_events",
    "log_early_npc_talk_events",
    "log_early_tutorial_step_events",
    "log_early_quest_offered_events",
    "log_early_churn_score_events",
    "log_early_session_summary_events",
    "log_early_session_time_events",
    "log_early_econ_tx_events",
    "log_early_zone_enter_events",
]


def _safe_ratio(num: float, den: float) -> float:
    den = float(den or 0)
    if den <= 0:
        return 0.0
    return max(0.0, float(num or 0) / den)


def _derive_features(raw: dict) -> dict:
    total = float(raw.get("early_tracked_events") or 0)
    return {
        "log_early_tracked_events": math.log1p(max(0.0, total)),
        "log_early_actions": math.log1p(max(0.0, float(raw.get("early_actions") or 0))),
        "deliberate_share": _safe_ratio(raw.get("early_actions", 0), total),
        "log_early_action_kinds": math.log1p(max(0.0, float(raw.get("early_action_kinds") or 0))),
        "log_early_area_count": math.log1p(max(0.0, float(raw.get("early_area_count") or 0))),
        "log_early_event_name_count": math.log1p(max(0.0, float(raw.get("early_event_name_count") or 0))),
        "log_early_ga_auto_events": math.log1p(max(0.0, float(raw.get("early_ga_auto_events") or 0))),
        "log_early_entry_auth_events": math.log1p(max(0.0, float(raw.get("early_entry_auth_events") or 0))),
        "log_early_connect_ok_events": math.log1p(max(0.0, float(raw.get("early_connect_ok_events") or 0))),
        "log_early_connect_fail_events": math.log1p(max(0.0, float(raw.get("early_connect_fail_events") or 0))),
        "log_early_other_tracking_events": math.log1p(max(0.0, float(raw.get("early_other_tracking_events") or 0))),
        "ga_auto_share": _safe_ratio(raw.get("early_ga_auto_events", 0), total),
        "entry_auth_share": _safe_ratio(raw.get("early_entry_auth_events", 0), total),
        "other_tracking_share": _safe_ratio(raw.get("early_other_tracking_events", 0), total),
        "log_early_nature_events": math.log1p(max(0.0, float(raw.get("early_nature_events") or 0))),
        "log_early_fishing_sea_events": math.log1p(max(0.0, float(raw.get("early_fishing_sea_events") or 0))),
        "log_early_quest_social_events": math.log1p(max(0.0, float(raw.get("early_quest_social_events") or 0))),
        "log_early_craft_home_events": math.log1p(max(0.0, float(raw.get("early_craft_home_events") or 0))),
        "log_early_advanced_events": math.log1p(max(0.0, float(raw.get("early_advanced_events") or 0))),
        "log_early_chop_tree_events": math.log1p(max(0.0, float(raw.get("early_chop_tree_events") or 0))),
        "log_early_mine_ore_events": math.log1p(max(0.0, float(raw.get("early_mine_ore_events") or 0))),
        "log_early_npc_talk_events": math.log1p(max(0.0, float(raw.get("early_npc_talk_events") or 0))),
        "log_early_tutorial_step_events": math.log1p(max(0.0, float(raw.get("early_tutorial_step_events") or 0))),
        "log_early_quest_offered_events": math.log1p(max(0.0, float(raw.get("early_quest_offered_events") or 0))),
        "log_early_churn_score_events": math.log1p(max(0.0, float(raw.get("early_churn_score_events") or 0))),
        "log_early_session_summary_events": math.log1p(max(0.0, float(raw.get("early_session_summary_events") or 0))),
        "log_early_session_time_events": math.log1p(max(0.0, float(raw.get("early_session_time_events") or 0))),
        "log_early_econ_tx_events": math.log1p(max(0.0, float(raw.get("early_econ_tx_events") or 0))),
        "log_early_zone_enter_events": math.log1p(max(0.0, float(raw.get("early_zone_enter_events") or 0))),
    }
