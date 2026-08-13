# =============================================================
#  calm forest · 모델 서빙 API (FastAPI)
#  ------------------------------------------------------------
#  ▶ 로컬 실행:  uv run uvicorn api.main:app --reload --port 8100
#  ▶ 오라클 클라우드 배포(예정):
#     - VM 에 uv 설치 → 레포 clone → ml/ 에서 uv sync --no-dev
#     - uv run uvicorn api.main:app --host 0.0.0.0 --port 8100
#       (systemd 유닛으로 감싸고, 앞단은 Caddy/Nginx TLS 권장)
#     - 게임(Cloudflare)에서 호출할 것이므로 CORS 는 게임 오리진만 허용
#  ▶ /predict 는 아직 자리표시자 — 모델이 나오면 joblib 로드로 교체.
# =============================================================
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="calm-forest ml api", version="0.1.0")

# 게임이 브라우저에서 직접 호출할 수 있게 — 운영 오리진만 열어둔다
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://calmforest.icuchoel.workers.dev",
        "http://localhost:8000",   # 로컬 개발 서버(scripts/serve.py)
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict:
    """배포/로드밸런서 헬스체크용."""
    return {"ok": True}


# ── 예측 스텁 — 첫 후보: 세션 특징 → D1 복귀 확률 ────────────────
class SessionFeatures(BaseModel):
    """예측 입력(스텁). EDA 후 실제 특징으로 교체한다."""
    playtime_sec: float = Field(ge=0, description="첫 세션 플레이 시간(초)")
    harvest_count: int = Field(ge=0, description="첫 세션 수확 횟수")
    is_guest: bool = Field(description="게스트 여부")


class Prediction(BaseModel):
    d1_return_prob: float = Field(ge=0, le=1)
    model_version: str


@app.post("/predict", response_model=Prediction)
def predict(feats: SessionFeatures) -> Prediction:
    # TODO: 학습된 모델(joblib) 로드로 교체. 지금은 API 계약만 고정하는 스텁.
    base = 0.09 if feats.is_guest else 0.25   # 측정된 D1(9.1%)·로그인 유저 재방문율 근사
    bump = min(0.3, feats.playtime_sec / 3600 * 0.1 + feats.harvest_count * 0.02)
    return Prediction(d1_return_prob=round(min(1.0, base + bump), 4), model_version="stub-0")
