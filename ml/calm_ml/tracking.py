# =============================================================
#  calm forest · WandB 실험 트래킹 헬퍼
#  ------------------------------------------------------------
#  ▶ 로그인: 터미널에서 한 번 `uv run wandb login` (또는 루트 .env 에
#    WANDB_API_KEY=... 를 넣으면 자동 인식).
#  ▶ 프로젝트명은 한 곳(PROJECT)에서만 관리 — 노트북/서빙 코드가 같이 쓴다.
# =============================================================
from __future__ import annotations

import os
from pathlib import Path

import wandb
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")   # WANDB_API_KEY 인식용

PROJECT = "calm-forest"


def start_run(name: str, *, config: dict | None = None, tags: list[str] | None = None):
    """실험 런 시작. `with start_run("d1-baseline") as run:` 으로 쓰면 자동 종료.

    키가 없는 환경에서도 노트북이 죽지 않게 오프라인 모드로 자동 전환한다.
    """
    mode = "online" if os.environ.get("WANDB_API_KEY") else "offline"
    return wandb.init(project=PROJECT, name=name, config=config or {}, tags=tags or [], mode=mode)
