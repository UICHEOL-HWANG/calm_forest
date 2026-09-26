# =============================================================
#  calm forest · 리텐션 안내 예측 — /retention-guidance/predict
#  ------------------------------------------------------------
#  초반 3분/10분 이벤트 카운터를 받아 24h 재활동 가능성을 점수화한다.
#
#  ▶ 클라이언트는 raw counter 만 보낸다. log/share 변환은 서버가 한다.
#    그래야 학습/서빙 피처 정의가 한 곳에 남고, 다음 모델에서 고치기 쉽다.
#  ▶ 모델이 없거나 깨졌으면 200 + score=null 로 답한다. 배너는 기존 룰로
#    계속 동작하거나 조용히 멈추면 된다.
#  ▶ 받은 raw 피처와 판정 결과는 JSONL 로 적립한다. 이후 "실제 서빙 당시
#    어떤 값으로 판단했는지"를 재현하기 위한 감사 로그다.
# =============================================================
from __future__ import annotations

import json
import logging
import math
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field

from calm_ml.retention_features import FEATURE_ORDER, _derive_features  # noqa: F401 — 테스트·학습이 이 경로로도 집는다

log = logging.getLogger("retention_guidance")
router = APIRouter(prefix="/retention-guidance")

MODEL_PATH = Path(os.environ.get("RETENTION_GUIDANCE_MODEL_PATH", "/opt/calm-api/model/retention_guidance.json"))
LOG_DIR = Path(os.environ.get("RETENTION_GUIDANCE_LOG_DIR", "/opt/calm-api/data"))

_cache: dict | None = None
_cache_mtime: float | None = None


def _reset_cache() -> None:
    global _cache, _cache_mtime
    _cache = None
    _cache_mtime = None


def _load_model() -> dict | None:
    global _cache, _cache_mtime
    try:
        mtime = MODEL_PATH.stat().st_mtime
    except OSError:
        _cache, _cache_mtime = None, None
        return None
    if _cache is not None and _cache_mtime == mtime:
        return _cache
    try:
        model = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
        if model.get("feature_order") != FEATURE_ORDER:
            log.error("retention_guidance.json feature_order mismatch — ignored: %s", model.get("feature_order"))
            _cache, _cache_mtime = None, mtime
            return None
        if len(model.get("coef", [])) != len(FEATURE_ORDER):
            log.error("retention_guidance.json coef length mismatch — ignored")
            _cache, _cache_mtime = None, mtime
            return None
        _cache, _cache_mtime = model, mtime
        log.info("리텐션 안내 모델 로드 %s", model.get("model_version"))
        return model
    except (json.JSONDecodeError, OSError) as e:
        log.error("retention_guidance.json 을 읽지 못했다: %s", e)
        _cache, _cache_mtime = None, mtime
        return None


class RawFeatures(BaseModel):
    model_config = ConfigDict(extra="forbid")
    early_tracked_events: float = 0
    early_actions: float = 0
    early_action_kinds: float = 0
    early_area_count: float = 0
    early_event_name_count: float = 0
    early_ga_auto_events: float = 0
    early_entry_auth_events: float = 0
    early_connect_ok_events: float = 0
    early_connect_fail_events: float = 0
    early_other_tracking_events: float = 0
    early_nature_events: float = 0
    early_fishing_sea_events: float = 0
    early_quest_social_events: float = 0
    early_craft_home_events: float = 0
    early_advanced_events: float = 0
    early_chop_tree_events: float = 0
    early_mine_ore_events: float = 0
    early_npc_talk_events: float = 0
    early_tutorial_step_events: float = 0
    early_quest_offered_events: float = 0
    early_churn_score_events: float = 0
    early_session_summary_events: float = 0
    early_session_time_events: float = 0
    early_econ_tx_events: float = 0
    early_zone_enter_events: float = 0


class PredictIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: RawFeatures
    trigger: str = Field(max_length=32, pattern=r"^[a-zA-Z0-9_-]+$")
    session_id: str = Field(max_length=128)
    client_id: str = Field(max_length=128)
    variant: str = Field(default="control", max_length=32)
    platform: str | None = Field(default=None, max_length=32)
    policy_version: str | None = Field(default=None, max_length=80)


class PredictOut(BaseModel):
    score: float | None
    eligible: bool
    model_version: str
    threshold: float | None
    score_band: str


def _threshold(model: dict) -> float | None:
    value = model.get("threshold", 0.285)
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value):
        return None
    return value


def _score(model: dict, features: dict) -> float:
    impute = model.get("impute", {})
    mean = model["scaler"]["mean"]
    scale = model["scaler"]["scale"]
    z = float(model["intercept"])
    for i, name in enumerate(FEATURE_ORDER):
        v = features.get(name)
        if v is None:
            v = impute.get(name, 0.0)
        denom = scale[i] if scale[i] else 1.0
        z += float(model["coef"][i]) * ((float(v) - mean[i]) / denom)
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-min(z, 700.0)))
    e = math.exp(max(z, -700.0))
    return e / (1.0 + e)


def _band(score: float | None, threshold: float | None) -> str:
    if score is None or threshold is None:
        return "none"
    if score >= threshold:
        return "high"
    if score >= threshold * 0.5:
        return "mid"
    return "low"


def _append_row(row: dict) -> None:
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with (LOG_DIR / f"retention-guidance-{day}.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError as e:
        log.error("리텐션 안내 적립 실패: %s", e)


@router.post("/predict", response_model=PredictOut)
def predict(body: PredictIn, request: Request) -> PredictOut:
    raw = body.features.model_dump()
    features = _derive_features(raw)
    model = _load_model()

    score: float | None = None
    version = "none"
    threshold: float | None = None
    eligible = False

    if model is not None:
        version = model.get("model_version", "unknown")
        score = _score(model, features)
        threshold = _threshold(model)
        eligible = bool(model.get("enabled", True)) and threshold is not None and score >= threshold

    score_band = _band(score, threshold)
    _append_row({
        "at": datetime.now(timezone.utc).isoformat(),
        "session_id": body.session_id,
        "client_id": body.client_id,
        "variant": body.variant,
        "platform": body.platform,
        "trigger": body.trigger,
        "policy_version": body.policy_version,
        "raw_features": raw,
        "features": features,
        "score": score,
        "threshold": threshold,
        "eligible": eligible,
        "score_band": score_band,
        "model_version": version,
        "origin": (request.headers.get("origin") or "")[:200],
        "ua": (request.headers.get("user-agent") or "")[:120],
    })

    return PredictOut(
        score=score,
        eligible=eligible,
        model_version=version,
        threshold=threshold,
        score_band=score_band,
    )
