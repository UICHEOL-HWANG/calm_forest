# =============================================================
#  calm forest · 모델 서빙 API (FastAPI)
#  ------------------------------------------------------------
#  설계서: docs/superpowers/specs/2026-09-04-churn-intervention-design.md §6
#
#  ▶ 로컬:  cd ml && uv run uvicorn api.main:app --reload --port 8100
#  ▶ 운영:  오라클 VM 의 docker compose 서비스 'api' (infra/api/docker-compose.yml)
#           앞단은 nginx(lab.calmforest.cloud) — /predict, /health 만 넘어온다
# =============================================================
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.churn import router as churn_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="calm-forest ml api", version="1.0.0")

# CORS 는 보안 경계가 아니다 — 앱인토스 웹뷰의 오리진을 미리 알 수 없고,
# 오리진을 가려봐야 브라우저 밖 호출은 어차피 막지 못한다.
# 대신 어떤 오리진이 오는지 churn.py 가 적립 행에 남긴다.
# (선례: toss-auth/src/index.js 의 corsHeaders — 같은 판단으로 운영 중)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

app.include_router(churn_router)


@app.get("/health")
def health() -> dict:
    """nginx·컨테이너 헬스체크용. 모델 유무와 무관하게 200 이어야 한다."""
    return {"ok": True}
