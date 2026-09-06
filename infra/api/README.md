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

계수(`model/coef.json`)는 Airflow DAG 가 쓴다. 단, **최초 1회**는 학습 산출물을
손으로 `model/` 에 두고(VM 에 GCP 자격증명이 없는 동안), 그 뒤 갱신은 DAG 가
한다 — 평소에는 손으로 두지 않는다.
