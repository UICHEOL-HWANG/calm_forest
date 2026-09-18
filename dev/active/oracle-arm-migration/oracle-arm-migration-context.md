# 컨텍스트 — 오라클 ARM 이전

**Last Updated:** 2026-09-12

## 핵심 파일

| 경로 | 역할 |
|---|---|
| `infra/airflow/README.md` | **사실상 프로비저닝 런북** — 구성표·보안 모델·배포 절차 |
| `infra/airflow/docker-compose.yml` | Airflow 스택(LocalExecutor + Postgres 16) |
| `infra/airflow/Dockerfile` | 순정 airflow + bigquery/gspread/sklearn/pandas/wandb |
| `infra/airflow/nginx/airflow.conf` | 80/443 → 8080·8100 프록시 |
| `infra/airflow/update-cf-ips.sh` | iptables CF-ALLOW 체인(주 1회 cron) |
| `infra/api/Dockerfile` | churn 추론 API(python:3.12-slim + fastapi) |
| `infra/airflow/dags/*.py` | calm_smoke · tableau_sheets · churn_train |

## 구 VM 실측 (2026-09-12)

- `oracle-calmforest` SSH 별칭으로 접속 (`~/.ssh/config`)
- shape `VM.Standard.E5.Flex` 1 OCPU/12GB, Ubuntu 20.04 x86_64, us-ashburn-1 AD-2
- 오리진 공인 IP **129.213.112.160** / 사설 10.0.0.253
- 컨테이너 4: airflow-webserver, airflow-scheduler, airflow-postgres, calm-api-api
- 리스닝: nginx 80/443(0.0.0.0), docker-proxy 127.0.0.1:8080(Airflow)·127.0.0.1:8100(API)
- DAG 3: `calm_smoke`(정지됨) · `churn_train` · `churn_upload_events`
  - README 는 `tableau_sheets` 를 문서화하는데 실제 스케줄러에는 `churn_*` 가 떠 있다
    → 7단계에서 README 표 갱신 필요
- 모델은 `/opt/calm-api/model/coef.json`(1.7KB, 로지스틱 계수) — 대용량 아티팩트 없음

## 의사결정

| 결정 | 값 | 비고 |
|---|---|---|
| 컷오버 | 병행 후 DNS 전환 | 사용자 선택 |
| Shape | A1.Flex 2 OCPU/12GB | 2026-09-12 축소된 Always Free A1 한도와 동일(4/24 → 2/12) |
| OS | Ubuntu 24.04 LTS | 20.04 EOL |
| 구 VM 처리 | 전환 후 며칠 유지 후 종료 | 롤백 카드 |

## 의존성 · 외부 계정

- **OCI 콘솔** — 인스턴스 생성·계정 상태 확인은 사용자만 가능(로컬에 OCI CLI 없음)
- **Cloudflare** — `lab.calmforest.cloud` A 레코드(프록시 ON). 전환 시 오리진 IP 교체
- **TLS** — Cloudflare 종단, 오리진 443 은 자체서명(Full 모드). strict 아님.
  인증서는 `/etc/nginx/certs/lab.{crt,key}` (CN=lab.calmforest.cloud, 2036 만료).
  letsencrypt 는 쓰지 않는다 — 백업에 없는 게 정상.
- **GCP 서비스계정** — `/opt/airflow/secrets/gcp_sa.json` (BigQuery + Sheets)
- **W&B** — `WANDB_API_KEY` (compose 에서 선택적)

## 함정

1. **`--build` 누락** — 순정 이미지가 떠서 `ModuleNotFoundError: gspread`. ARM 에선
   반드시 신 호스트에서 재빌드해야 한다(x86 이미지 이식 불가).
2. **`AIRFLOW_UID`** — compose 가 `${AIRFLOW_UID}:0` 을 쓴다. `.env` 에 있어야 함.
3. **방화벽** — `update-cf-ips.sh` 가 `iptables -I INPUT 5` 로 **위치 5** 에 끼운다.
   Oracle 기본 룰셋 형태를 전제한 값이라 24.04 에서 그대로인지 확인 필요.
4. **`netfilter-persistent`** — iptables-persistent 패키지가 있어야 저장된다.
5. **백업에 시크릿 포함** — `~/oracle-vm-backup-20260912/` 는 리포 밖. 커밋 금지.
6. **SQL 원본** — `sql/tableau_export.sql` 이 원본이고 DAG 에 복사본을 두지 않는다.

## 진행 상황

- ✅ 백업 완료 + 무결성 검증 (`~/oracle-vm-backup-20260912/`, 권한 600)
  - 아카이브 3종 tar 정상, pgdump gzip 정상
  - `.env` 6키(AIRFLOW_UID·POSTGRES_PASSWORD·FERNET_KEY·WEBSERVER_SECRET·AIRFLOW_ADMIN_PASSWORD·WANDB_API_KEY) 확인
  - `secrets/gcp_sa.json`·오리진 인증서 포함
- ✅ ARM 호환성 검증 완료
- ✅ 설계 승인 (2026-09-12)
- ✅ 구 VM 아직 `실행 중` 확인(콘솔 인스턴스 목록, 2026-09-12) → 병행 전환 가능
- ✅ A1 무료 한도 축소 확인(4 OCPU/24GB → **2 OCPU/12GB**) — 선택 사양과 일치
- ⏸️ **1단계 잔여** — 계정 상태(체험 만료/Always Free 전환 여부) 확인 + A1 용량 확보
