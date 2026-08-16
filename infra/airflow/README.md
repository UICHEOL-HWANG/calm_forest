# calm forest · 실험실 인프라 (Oracle VM)

`https://lab.calmforest.cloud` — Airflow 2.10 (LocalExecutor) + Postgres 16 + nginx.
Oracle Cloud VM(x86_64, Ubuntu 20.04)의 실제 구성을 코드로 보관한 것.

## 구성

| 파일 | VM 경로 | 역할 |
|---|---|---|
| `docker-compose.yml` | `/opt/airflow/docker-compose.yml` | Airflow 스택(웹 127.0.0.1:8080 바인딩) |
| `dags/` | `/opt/airflow/dags/` | DAG 소스 |
| `nginx/airflow.conf` | `/etc/nginx/sites-available/airflow` | 80/443 → 8080 프록시(Cloudflare 뒤) |
| `update-cf-ips.sh` | `/usr/local/sbin/update-cf-ips.sh` | 방화벽: Cloudflare IPv4 대역만 80/443 허용(주 1회 cron) |

시크릿(`POSTGRES_PASSWORD`·`FERNET_KEY`·`WEBSERVER_SECRET`·`AIRFLOW_ADMIN_PASSWORD`)은
VM의 `/opt/airflow/.env`(600)에만 있고 리포엔 없다.

## 보안 모델

Cloudflare 프록시(주황) → OCI 80/443 전체 개방이지만 VM iptables `CF-ALLOW` 체인이
Cloudflare 대역 외 트래픽을 차단 → 오리진 IP 직접 접근 불가. TLS는 Cloudflare 종단,
오리진 443은 자체서명(Full 모드 대응 — strict 필요 시 Origin CA 인증서로 교체).

## DAG 배포

```bash
scp infra/airflow/dags/*.py oracle-calmforest:/opt/airflow/dags/
```

스케줄러가 자동 리로드한다(재시작 불필요). compose/nginx 변경 시:

```bash
scp infra/airflow/docker-compose.yml oracle-calmforest:/opt/airflow/ && \
  ssh oracle-calmforest 'cd /opt/airflow && sudo docker compose up -d'
scp infra/airflow/nginx/airflow.conf oracle-calmforest:/tmp/ && \
  ssh oracle-calmforest 'sudo mv /tmp/airflow.conf /etc/nginx/sites-available/airflow && sudo nginx -t && sudo systemctl reload nginx'
```
