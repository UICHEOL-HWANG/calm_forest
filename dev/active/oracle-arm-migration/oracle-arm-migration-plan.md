# 계획 — 오라클 실험실 VM을 Always Free ARM으로 이전

**승인일:** 2026-09-12

## 왜 지금인가

오라클 30일 무료 체험이 **2026-09-12 만료**. 현재 실험실 VM은 Always Free가
아니라 **체험 크레딧으로 돌던 유료 shape** 였다(아래 실측). 유료 전환하지 않으면
Always Free 대상이 아닌 리소스는 중지 후 회수된다.

### 실측 근거 (OCI 인스턴스 메타데이터)

| 항목 | 값 |
|---|---|
| Shape | **VM.Standard.E5.Flex** (1 OCPU / 12GB) — Always Free 대상 아님 |
| 리전/AD | us-ashburn-1 / AD-2, FAULT-DOMAIN-1 |
| 생성 | 2026-08-13 → 만 30일이 2026-09-12 |
| 오리진 IP | 129.213.112.160 (Cloudflare 프록시 뒤) |
| OS | Ubuntu 20.04 (x86_64), 부트 50GB |

Always Free 대상 x86 shape 는 `VM.Standard.E2.1.Micro`(1/8 OCPU, 1GB) 뿐이고,
ARM 은 `VM.Standard.A1.Flex`(최대 4 OCPU / 24GB) 다. 우리 건 둘 다 아니었다.

## 목표

**월 비용 0 유지 + 게임의 런타임 의존성 제거.**

2026-09-12 방향 수정: A1 용량이 3개 AD 모두 부족해 즉시 이전이 불가능해지면서,
"무엇을 어디에 둘 것인가" 를 다시 봤다. 결론은 **워크로드 분리**다.

| 워크로드 | 행선지 | 근거 |
|---|---|---|
| `/predict` (churn 추론) | **Cloudflare Worker** | 게임이 런타임에 의존. `treatRate 0.5` 로 프로덕션 실험 진행 중이라 끊기면 개입이 멈춘다. 회수 가능한 무료 VM 에 둘 물건이 아니다. 덤으로 지연 개선(us-ashburn 왕복 → 서울 PoP, 현재 타임아웃 800ms) |
| Airflow + 분석/모델링 | **Oracle A1 (무료)** | 랩의 목적이 **데이터 엔지니어링 실습**이고, 토스·A/B 유입 데이터로 분석·모델링을 확대할 예정. 오버스펙이 곧 목적이다. 하루/주 1회 배치라 며칠 끊겨도 무방 |

분리하면 A1 용량 대기가 더 이상 압박이 아니게 된다.

### 검토했다가 버린 선택지

| 안 | 버린 이유 |
|---|---|
| AWS Lightsail ($12~24/월) | **돈을 내면서도 VM 재구축 노동이 그대로 남는다.** 돈 쓸 거면 PAYG 가 작업량 0, 일할 거면 A1 이 $0 |
| Vercel | `/predict` 는 가능하나 게임이 이미 Cloudflare 에 있어 플랫폼만 늘어남. **Airflow 는 아예 못 돌림** |
| Oracle PAYG 유지 ($39/월) | 작업량 0 이라 급할 때 카드로 유효. 다만 상시 해법은 아님 (E5 $0.030/OCPU-hr + $0.002/GB-hr × 730h) |
| VM 완전 폐기 (DAG → GH Actions) | 비용·안정성은 최선이나 **실습 목적과 충돌**. Airflow 경험 자체가 자산 |

### 목표 상태

```
게임(Cloudflare Pages/Workers) ──> /predict (Worker) ──> Supabase(점수 적립)
                                        ^
                                        └── coef.json (KV) ← 주 1회 학습
Airflow (Oracle A1, 무료) ──> BigQuery/Sheets/학습 ─────────┘
```

## 확정 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 컷오버 | **병행 후 전환** | 신 VM 검증 완료 후 DNS만 전환. 실패 시 구 VM 롤백 |
| Shape | **A1.Flex 2 OCPU / 12GB** | **새 Always Free A1 한도와 동일**(2026-09-12 콘솔 공지로 4/24 → 2/12 축소) |
| OS | **Ubuntu 24.04 LTS** (aarch64) | 20.04 는 표준 지원 종료. 새로 만드는 김에 올림 |
| 리전 | us-ashburn-1 고정 | Always Free 는 홈 리전에만 생성 가능 |
| 부트 볼륨 | 50GB | 병행 중 합계 100GB — Always Free 200GB 한도 내 |

### A1 무료 한도 축소 (2026-09-12 확인)

콘솔 배너: *"상시 무료 Ampere A1 컴퓨트 제한이 OCPU 2개 및 12GB 메모리로
변경되었습니다."* 기존 4 OCPU / 24GB 에서 축소됐다.

원래는 "한도의 절반만 써서 예비 인스턴스 여지를 남긴다"는 이유로 2/12 를 골랐는데,
결과적으로 **2/12 가 곧 한도 전부**가 됐다. 선택한 사양은 그대로 유효하지만
근거가 달라졌다:

- 예비 A1 인스턴스를 띄울 여유는 **없다**. 이전 실패 시 A1 두 대 병행 불가.
- 유휴 회수 리스크는 남는다. 이 실험실은 DAG 가 하루 2~3개 도는 게 전부라
  (구 VM load average 0.14, 12GB 중 1GB 사용) 이미 유휴하다.
- 현재 메모리(12GB)는 동일하게 유지되고 CPU 만 1 → 2 OCPU 로 늘어난다.

## ARM 호환성 (검증 완료 2026-09-12)

| 대상 | aarch64 |
|---|---|
| `apache/airflow:2.10.5` | ✅ 공식 멀티아치 |
| `postgres:16-alpine` | ✅ |
| `python:3.12-slim` | ✅ |
| scikit-learn · pandas · wandb · gspread · google-cloud-bigquery · db-dtypes | ✅ |
| fastapi · uvicorn[standard] · pydantic | ✅ |
| (향후) xgboost 3.4.1 | ✅ `manylinux_2_28_aarch64` |
| (향후) lightgbm 4.7.0 | ✅ `manylinux2014_aarch64` |

ARM 에서 까다로운 의존성은 하나도 없다. 코드는 바인드 마운트라 이미지 재빌드만
하면 된다.

## 단계

1. **사전 확인(사용자)** — 콘솔에서 계정 상태 + A1 용량 확보 가능 여부
2. **A1 생성(사용자)** — Ubuntu 24.04 aarch64, 2 OCPU/12GB, 기존 SSH 키·동일 VCN
3. **호스트 준비** — docker/compose, nginx, iptables-persistent
   - ⚠️ **CF-ALLOW 체인이 24.04 nft 백엔드에서 실제 차단하는지 반드시 증명**
4. **스택 복원** — 백업 전개 → `compose up -d --build`(arm64) → pgdump 복원
5. **검증(전환 전)** — 오리진 직결 `curl --resolve` 로 실동작 증명
6. **DNS 전환** — Cloudflare A 레코드 교체(사용자 승인 후). 구 VM 유지
7. **정리** — 안정화 후 구 VM 종료, README·dev docs 갱신

## 리스크

| 리스크 | 대응 |
|---|---|
| **A1 용량 부족**(us-ashburn 흔함) | AD 3개 순회 시도 → 재시도 스크립트 → 최후엔 Pay As You Go 재논의. 한도 축소로 예비 A1 확보는 불가 |
| 구 VM 이 이미 중지됨 → 병행 불가 | 백업 완료돼 있으므로 "정지 후 이전"으로 자동 강등. 다운타임만 발생 |
| 24.04 nft 에서 방화벽 미적용 | 5단계 전에 오리진 직접 접근이 **차단되는지** 반드시 확인. 실패 시 전환 보류 |
| pgdump 복원 실패 | Airflow 메타DB는 실행 이력일 뿐 — 최악의 경우 빈 DB로 초기화하고 Variables/Connections 만 수동 재입력 |

## 백업 (2026-09-12 완료, 리포 밖)

`~/oracle-vm-backup-20260912/`

| 파일 | 내용 |
|---|---|
| `airflow-pgdump-20260912.sql.gz` | Airflow 메타DB 전체(테이블 96, dag_run 11) |
| `vm-opt-20260912.tar.gz` | `/opt/airflow`(로그 제외) + `/opt/calm-api` — **`.env`·`secrets/gcp_sa.json` 포함** |
| `vm-etc-20260912.tar.gz` | nginx 설정(`sites-available`, `nginx.conf`) |
| `vm-certs-20260912.tar.gz` | 오리진 자체서명 인증서 `/etc/nginx/certs` (2036 만료) |
| `STATE.md` | 컨테이너·이미지·포트·DAG 목록 스냅샷 |

⚠️ 시크릿이 들어 있다. **리포에 커밋 금지.**
