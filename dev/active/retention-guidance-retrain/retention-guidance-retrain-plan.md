# 리텐션 안내 모델 주간 재학습 DAG — 계획 (승인 2026-09-26)

## 결정
- 표본: 9/4 이후 첫 관측 기기 **누적**, 라벨 창(+24h) 안에 `retention_guidance_show` 가 찍힌 기기는 **제외**(배너 효과로 라벨 오염). 대조군이 없어서다.
- 피처 셀 때 `retention_guidance_*` 이벤트 제외(클라이언트 record() 와 동일, 9/19 이후 기기만 부풀려지는 것 방지).
- 라벨 완결 여유: first_ts < now − 72h (GA4 일일 export 지연 + 24h 라벨 창).

## 단계
1. `ml/calm_ml/retention_features.py` — FEATURE_ORDER·derive_features 순수 모듈화(Airflow 이미지에 FastAPI 없음). api 는 여기서 import.
2. `ml/sql/retention_guidance_train_sample.sql` — g5 표본 SQL 의 굴러가는 버전(g5 원본은 분석 기록이라 그대로 둔다).
3. `ml/train_retention_guidance.py` — 표본 게이트(n≥95·양성≥12, 현 모델보다 작으면 덮어쓰지 않음)·CV AUC·W&B 아티팩트 `retention-guidance-model`.
4. `infra/airflow/dags/retention_guidance_train.py` — 매주 월 04:30 KST.
5. 테스트(DAG 파싱·게이트·export·W&B 가짜) → VM 배포(scp) → 수동 trigger 1회 → 핫리로드 확인.
