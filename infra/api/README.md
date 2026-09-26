# 추론 API 배포 (오라클 VM)

Airflow 와 **별도 스택**이다. 서로의 재시작에 영향받지 않는다.

## 최초 1회
    ssh oracle-calmforest 'sudo mkdir -p /opt/calm-api/{app,model,data} && sudo chown -R ubuntu:ubuntu /opt/calm-api'
    scp infra/api/Dockerfile infra/api/docker-compose.yml oracle-calmforest:/opt/calm-api/

## 코드 배포 (매번)
    ssh oracle-calmforest 'find /opt/calm-api/app -mindepth 1 -delete'
    scp -r ml/api ml/calm_ml oracle-calmforest:/opt/calm-api/app/
    ssh oracle-calmforest 'cd /opt/calm-api && sudo docker compose up -d --build'

## 확인
    curl -s https://lab.calmforest.cloud/health   # {"ok":true}
    curl -s -X POST https://lab.calmforest.cloud/retention-guidance/predict \
      -H 'Content-Type: application/json' \
      -d '{"features":{"early_tracked_events":1,"early_actions":0},"trigger":"smoke","session_id":"smoke","client_id":"smoke","variant":"control"}'

계수:
- `model/coef.json` — 기존 이탈 예측 `/predict`
- `model/retention_guidance.json` — 리텐션 안내 `/retention-guidance/predict`

둘 다 Airflow DAG 가 쓴다 — 이탈 예측은 `churn_train`(월 04:00), 리텐션 안내는
`retention_guidance_train`(월 04:30, W&B 아티팩트 `retention-guidance-model`).
표본이 게이트(95행·양성 12)를 못 넘으면 DAG 가 실패하고 기존 파일을 그대로 둔다.
손으로 돌릴 땐 `cd ml && uv run python train_retention_guidance.py --out /tmp/retention_guidance.json`.
API 코드는 `calm_ml.retention_features` 를 import 하므로 배포 때 `ml/calm_ml` 도 같이 올린다.
