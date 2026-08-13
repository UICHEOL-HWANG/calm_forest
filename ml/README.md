# calm forest · ml — EDA / 실험 / 모델 서빙

게임 지표(리텐션·경제) EDA와 모델 실험·서빙을 위한 파이썬 작업 공간입니다.
게임(웹) 코드와 완전히 분리되어 있고, **가상환경은 uv 로만** 관리합니다(conda 사용 안 함).

```
ml/
├─ calm_ml/          # 공용 모듈: db(Supabase 조회) · tracking(WandB)
├─ notebooks/        # EDA/실험 노트북 (01_retention_eda.ipynb 부터)
├─ api/              # FastAPI 모델 서빙 (오라클 클라우드 배포 예정)
└─ pyproject.toml    # 의존성 정의 (uv sync 로 .venv 생성)
```

## 처음 한 번

```bash
cd ml
uv sync            # .venv 생성 + 전체 의존성 설치 (파이썬 3.12 자동 준비)
```

접속정보는 **레포 루트 `.env`를 그대로 재사용**합니다 — 별도 설정 불필요.
WandB만 처음 한 번 로그인하세요:

```bash
uv run wandb login     # 또는 루트 .env 에 WANDB_API_KEY=... 추가
```

## 노트북 (EDA)

```bash
uv run jupyter lab
```

- `notebooks/01_retention_eda.ipynb` — DAU·D1 코호트·세그먼트·경제 원장 + WandB 베이스라인 기록
- DB 조회는 `from calm_ml import db` → `db.read_sql("select …")` 또는 준비된 `load_*` 헬퍼 사용
- Supabase 직결 호스트는 IPv6 전용이라 로컬에서 안 붙습니다 — `calm_ml/db.py`가
  세션 풀러(`aws-1-ap-northeast-2`)로 우회 접속합니다. 새 쿼리도 이 모듈을 거치세요.

## 실험 트래킹 (WandB)

```python
from calm_ml.tracking import start_run

with start_run("실험이름", config={"lr": 0.01}, tags=["baseline"]) as run:
    run.log({"d1_rate": 0.091})
```

- 프로젝트: `calm-forest` (calm_ml/tracking.py 의 `PROJECT` 한 곳에서 관리)
- 키가 없으면 자동으로 오프라인 모드 — 노트북이 죽지 않습니다

## 모델 서빙 API (FastAPI)

```bash
uv run uvicorn api.main:app --reload --port 8100
```

- `GET /health` — 헬스체크 · `POST /predict` — 예측 스텁(모델 나오면 교체)
- 문서: http://localhost:8100/docs

### 오라클 클라우드 배포(예정 절차)

1. VM(Ampere A1 무료 티어면 충분)에 uv 설치, 레포 clone
2. `cd ml && uv sync --no-dev`
3. `uv run uvicorn api.main:app --host 0.0.0.0 --port 8100` 을 systemd 유닛으로
4. 앞단 Caddy/Nginx 로 TLS — 게임이 브라우저에서 직접 호출하므로 HTTPS 필수
5. CORS 허용 오리진은 `api/main.py`에서 관리(게임 운영 도메인만)
