# 추론 API 배포 (오라클 VM)

Airflow 와 **별도 VM**(`calmforest-ml`, 129.213.27.178 / 사설 10.0.0.193)이다. 공개 입구 nginx(`nginx/lab.conf`, lab·ml 도메인)와 Cloudflare 전용 방화벽(`update-cf-ips.sh`)도 이 VM 에 있다.

- 모델: OCI 버킷 `ml/models/*.json` → cron `*/15` `docker compose exec -T api python -m calm_ml.model_sync` → `model/` 원자 교체 → 핫리로드
- 적립 로그: cron 매일 00:20 UTC `python -m calm_ml.ship_logs` → 버킷 `ml/serving-logs/` (Airflow `churn_upload_events` 가 BQ 로)
- 시크릿: `secrets/oci_s3.json`(600)

## 최초 1회
    ssh calmforest-ml 'sudo mkdir -p /opt/calm-api/{app,model,data} && sudo chown -R ubuntu:ubuntu /opt/calm-api'
    scp infra/api/Dockerfile infra/api/docker-compose.yml calmforest-ml:/opt/calm-api/

## 코드 배포 (매번)
    ssh calmforest-ml 'find /opt/calm-api/app -mindepth 1 -delete'
    scp -r ml/api ml/calm_ml calmforest-ml:/opt/calm-api/app/
    ssh calmforest-ml 'cd /opt/calm-api && sudo docker compose up -d --build'

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
