# =============================================================
#  calm forest · 세션 이탈 예측 추론 — /predict
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §6·§9
#
#  ▶ 계수는 coef.json 에서 온다(Airflow DAG 가 주 1회 갈아끼운다).
#    요청마다 mtime 만 확인하고, 바뀌었을 때만 다시 읽는다 — 재시작 불필요.
#  ▶ 받은 피처는 JSONL 로 적립한다. 이게 다음 주 학습 표본이 되고,
#    "판정에 실제로 쓴 값"이 그대로 쌓이므로 학습/서빙 스큐가 생기지 않는다.
#  ▶ 모델이 없거나 깨졌거나 꺼져 있으면 200 + p=null 로 답한다.
#    5xx 를 내면 브라우저 콘솔만 더러워지고 클라이언트가 할 일은 똑같다(개입 안 함).
#  ▶ threshold 는 트리거별이다(ml/train_churn.py 의 _thresholds()) — time15 와 quest 는
#    기저율이 크게 달라(52.8% vs 18.5%) 스칼라 하나로는 한쪽이 항상/거의 안 뜬다.
#    옛 모델 파일(스칼라 threshold) 과의 호환은 유지하되, 이 요청의 트리거에 대한
#    값이 없거나 유한하지 않으면 이 모델을 이번 요청엔 못 쓰는 것으로 본다
#    (p 는 그대로 반환하고, intervene=false · threshold=null — 5xx 는 내지 않는다).
#
#  ⚠️ 이 엔드포인트는 인증이 없다. 방어는 여기가 아니라 학습 조인에서 한다 —
#     적립 행 중 session_id 가 game_logs 에 실재하는 것만 학습에 쓴다(계획 결정 #2).
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

log = logging.getLogger("churn")
router = APIRouter()

# js/features.js 의 FEATURE_ORDER · ml/train_churn.py 의 FEATURE_ORDER 와 동일 순서
FEATURE_ORDER = [
    "path_len", "net_disp", "wander_ratio", "yaw_total",
    "mouse_travel", "idle_ratio", "is_first_session", "trigger_kind",
]

MODEL_PATH = Path(os.environ.get("CHURN_MODEL_PATH", "/opt/calm-api/model/coef.json"))
LOG_DIR = Path(os.environ.get("CHURN_LOG_DIR", "/opt/calm-api/data"))

_cache: dict | None = None
_cache_mtime: float | None = None


def _reset_cache() -> None:
    """테스트에서 모델 캐시를 비운다."""
    global _cache, _cache_mtime
    _cache = None
    _cache_mtime = None


def _load_model() -> dict | None:
    """mtime 이 바뀌었을 때만 다시 읽는다. 깨져 있으면 None."""
    global _cache, _cache_mtime
    try:
        mtime = MODEL_PATH.stat().st_mtime
    except OSError:
        _cache, _cache_mtime = None, None
        return None
    if _cache is not None and _cache_mtime == mtime:
        return _cache
    try:
        m = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
        if m.get("feature_order") != FEATURE_ORDER:
            log.error("coef.json 의 feature_order 가 API 와 다르다 — 무시한다: %s", m.get("feature_order"))
            _cache, _cache_mtime = None, mtime
            return None
        _cache, _cache_mtime = m, mtime
        log.info("모델 로드 %s", m.get("model_version"))
        return m
    except (json.JSONDecodeError, OSError) as e:
        log.error("coef.json 을 읽지 못했다: %s", e)
        _cache, _cache_mtime = None, mtime
        return None


def _resolve_threshold(model: dict, trigger: str) -> float | None:
    """이 트리거에 쓸 임계값을 고른다.

    coef.json 의 threshold 는 트리거별 딕셔너리 {"time15": .., "quest": ..} 다.
    스칼라(구버전) 라면 모든 트리거에 그대로 쓴다. 이 트리거의 값이 없거나
    유한한 숫자가 아니면 이번 요청엔 모델을 못 쓰는 것으로 본다(None 반환) —
    호출부는 이를 intervene=False · threshold=null 로 취급하고, 5xx 는 내지 않는다.
    """
    raw = model.get("threshold")
    if isinstance(raw, dict):
        value = raw.get(trigger)
    elif isinstance(raw, (int, float)):
        value = raw
    else:
        value = None
    if value is None:
        return None
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value):
        return None
    return value


class Features(BaseModel):
    # extra='forbid' — 모르는 키가 오면 422. 적립 파일이 오염되지 않게 한다.
    model_config = ConfigDict(extra="forbid")
    path_len: float
    net_disp: float
    wander_ratio: float | None       # net_disp == 0 이면 클라이언트가 null 을 보낸다
    yaw_total: float
    mouse_travel: float
    idle_ratio: float
    is_first_session: int
    trigger_kind: int


class PredictIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    features: Features
    trigger: str = Field(pattern="^(time15|quest)$")
    session_id: str = Field(max_length=128)
    client_id: str = Field(max_length=128)
    variant: str = Field(max_length=32)
    # A/B 개입군 — 클라이언트가 세션 시작 시 랜덤 배정한다(설계서 §9)
    arm: str = Field(default="control", pattern="^(treat|control)$")


class PredictOut(BaseModel):
    p: float | None
    intervene: bool
    model_version: str
    threshold: float | None


def _score(model: dict, feats: dict) -> float:
    """표준화 → 내적 → 시그모이드. train_churn.py 의 LogisticRegression 과 같은 계산."""
    impute = model.get("impute", {})
    mean = model["scaler"]["mean"]
    scale = model["scaler"]["scale"]
    z = float(model["intercept"])
    for i, name in enumerate(FEATURE_ORDER):
        v = feats.get(name)
        if v is None:
            v = impute.get(name, 0.0)
        z += model["coef"][i] * ((float(v) - mean[i]) / scale[i])
    # overflow 방어 — 극단값이 와도 죽지 않는다
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-min(z, 700.0)))
    e = math.exp(max(z, -700.0))
    return e / (1.0 + e)


def _append_row(row: dict) -> None:
    """일자별 JSONL 에 한 줄 붙인다. 적립 실패가 응답을 막지 않는다."""
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        with (LOG_DIR / f"churn-{day}.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError as e:
        log.error("적립 실패: %s", e)


@router.post("/predict", response_model=PredictOut)
def predict(body: PredictIn, request: Request) -> PredictOut:
    model = _load_model()
    feats = body.features.model_dump()

    p: float | None = None
    version = "none"
    threshold: float | None = None
    intervene = False

    if model is not None:
        version = model.get("model_version", "unknown")
        p = _score(model, feats)
        threshold = _resolve_threshold(model, body.trigger)
        if threshold is not None:
            intervene = bool(model.get("enabled", True)) and p >= threshold

    _append_row({
        "at": datetime.now(timezone.utc).isoformat(),
        "session_id": body.session_id,
        "client_id": body.client_id,
        "variant": body.variant,
        "arm": body.arm,
        "trigger": body.trigger,
        "features": feats,
        "p": p,
        "intervene": intervene,
        "model_version": version,
        # CORS 는 보안 경계가 아니다 — 오리진을 가리지 않고 어떤 오리진이 오는지 남긴다
        # (선례: toss-auth/src/index.js). 토스 웹뷰의 실제 오리진도 이걸로 알게 된다.
        "origin": request.headers.get("origin", ""),
        "ua": (request.headers.get("user-agent") or "")[:120],
    })

    return PredictOut(p=p, intervene=intervene, model_version=version, threshold=threshold)
