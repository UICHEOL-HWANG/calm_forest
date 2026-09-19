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

기존 이탈 예측 계수는 Airflow DAG 가 쓴다. 리텐션 안내 모델은 먼저
`cd ml && uv run python train_retention_guidance.py --out /tmp/retention_guidance.json`
로 export 한 뒤 VM 의 `/opt/calm-api/model/retention_guidance.json` 에 둔다.
