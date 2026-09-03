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
| `Dockerfile` | `/opt/airflow/Dockerfile` | 순정 이미지 + `google-cloud-bigquery`·`gspread` |

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

## DAG 목록

| DAG | 스케줄(KST) | 하는 일 |
|---|---|---|
| `calm_smoke` | 09:00 | 세팅 검증(날짜 출력) |
| `tableau_sheets` | 04:00 | BigQuery 집계 → 구글 시트 7탭(태블로 퍼블릭 공개 대시보드) |

### tableau_sheets 파이프라인

```
Supabase --(GH Actions supabase-to-bq.yml, 03:00)--> BigQuery
         --(이 DAG, 04:00)--> 구글 시트 --(24h 자동)--> 태블로 퍼블릭
```

태블로 퍼블릭은 **구글 시트 연결만** 자동 갱신한다(CSV/엑셀 업로드는 대상 아님).
갱신 시각은 지정할 수 없고, 급하면 작성자가 Request Update 를 누른다.

SQL 은 `sql/tableau_export.sql` 한 파일이 원본이고, DAG 는 그 안의
`-- @tab: <이름>` 마커로 쿼리를 쪼갠다. **DAG 에 SQL 복사본을 두지 않는다.**

#### 최초 1회 설정

1. 구글 시트를 만들고 서비스계정 `client_email` 에 **편집자**로 공유
2. GCP 프로젝트에서 **Google Sheets API** 사용 설정
3. 서비스계정 JSON 키를 VM 에 배치(리포엔 절대 두지 않는다 — `.gitignore` 처리됨)

```bash
ssh oracle-calmforest 'mkdir -p /opt/airflow/secrets && chmod 700 /opt/airflow/secrets'
scp <키파일>.json oracle-calmforest:/opt/airflow/secrets/gcp_sa.json
ssh oracle-calmforest 'chmod 600 /opt/airflow/secrets/gcp_sa.json'
```

4. Airflow UI → Admin → Variables 에 `tableau_sheet_id` = 시트 URL 의 `/d/<ID>/edit` 부분

#### 배포

```bash
ssh oracle-calmforest 'mkdir -p /opt/airflow/dags/sql'
scp sql/tableau_export.sql oracle-calmforest:/opt/airflow/dags/sql/
scp infra/airflow/dags/tableau_sheets.py oracle-calmforest:/opt/airflow/dags/
scp infra/airflow/Dockerfile infra/airflow/docker-compose.yml oracle-calmforest:/opt/airflow/
ssh oracle-calmforest 'cd /opt/airflow && sudo docker compose up -d --build'
```

`--build` 를 빼먹으면 순정 이미지가 그대로 떠서 DAG 가 `ModuleNotFoundError: gspread` 로
Import Errors 에 뜬다. 쿼리만 고쳤을 땐 `scp sql/...` 만 하면 된다(스케줄러가 다시 읽음).
