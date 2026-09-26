# context — Last Updated: 2026-09-26

- 서빙: VM `/opt/calm-api/model/retention_guidance.json`, API 가 mtime 으로 핫리로드. 현 버전 2026-09-19T08:47:42Z (n=95, pos=12, train AUC 0.99 = 과적합 신호).
- Airflow: `/opt/airflow/dags/` 에 scp 배포, `dags/ml/` 가 ml 사본(calm_ml·sql·train_*.py). 이미지에 sklearn·bq·wandb 있음, fastapi 없음.
- 기존 패턴: `infra/airflow/dags/churn_train.py`(표본 <100 이면 raise, W&B 아티팩트 churn-coef).
- GA4: retention_guidance_show 9/19~ 7기기 확인(2026-09-26 BQ).
- ⚠️ 알려진 기존 문제(범위 밖): 클라이언트 카운터(정규식 버킷)와 학습 SQL(고정 목록 버킷) 정의가 다름 → training/serving skew.
