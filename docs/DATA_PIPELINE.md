# 🔄 데이터 파이프라인 — Supabase → BigQuery (일일 적재 + 경량화)

Supabase는 **최근 7일**만 유지(핫 스토리지), BigQuery에 **전체 이력**을 쌓습니다(콜드 스토리지).
GitHub Actions가 매일 자동으로: ①`game_logs` 증분 적재 → ②`game_saves` 스냅샷 → ③7일 지난 로그 prune.

```
GA4  ──(자동 export)──▶ BigQuery(analytics_547127440)   # 행동 이벤트
Supabase ─(이 파이프라인)▶ BigQuery(calm_forest_raw)      # 좌표·진행도
                          └ 7일 지난 game_logs는 Supabase에서 삭제
```

## 파일
- `.github/workflows/supabase-to-bq.yml` — 매일 03:00 KST 실행(수동 실행도 가능)
- `scripts/export_to_bq.py` — 증분 적재 + prune 로직

## 필요한 설정 (GitHub → Settings → Secrets and variables → Actions)

**Variables** (공개 값)
| 이름 | 예시 |
|------|------|
| `SUPABASE_URL` | `https://<프로젝트-ref>.supabase.co` |
| `BQ_PROJECT` | `calm-forest` |
| `BQ_DATASET` | `calm_forest_raw` |
| `BQ_LOCATION` | GA4 export 데이터셋과 **같은 지역** (예: `US` 또는 `asia-northeast3`) |

**Secrets** (비밀 값)
| 이름 | 설명 |
|------|------|
| `SUPABASE_SERVICE_ROLE` | Supabase → Settings → API → **service_role** 키 (⚠️ 절대 프론트/커밋 금지, 여기 Secrets에만) |
| `GCP_SA_KEY` | GCP 서비스계정 JSON 키 **전체 내용** |

### GCP 서비스계정 만들기
1. GCP 콘솔 → IAM 및 관리자 → 서비스 계정 → 만들기
2. 역할: **BigQuery 데이터 편집자** + **BigQuery 작업 사용자**
3. 키 → JSON 생성 → 그 파일 내용을 `GCP_SA_KEY` 시크릿에 붙여넣기

## 안전 설계 (중요)
- **순서 고정**: BQ 적재가 성공한 뒤에만 prune 실행 → 적재 안 된 데이터가 삭제될 일 없음.
- **보존 7일**: 잡이 매일 도는데 7일 이전 데이터는 이미 적재 완료 상태 → 안전 마진 충분.
- **`game_saves`는 삭제하지 않음** — 유저의 현재 저장 상태라 지우면 진행이 사라짐. Supabase엔 계속 최신 스냅샷 유지, BQ엔 매일 덮어쓰기.
- **증분 기준**: BQ `game_logs`의 `MAX(id)` 이후 행만 가져옴(중복/누락 방지).

## 실행 & 확인
- 최초엔 Actions 탭에서 **workflow_dispatch(수동 실행)** 로 한 번 돌려 동작 확인.
- 성공 후 BigQuery `calm-forest.calm_forest_raw.game_logs / game_saves` 에 데이터가 보이면 OK.
- 이후 매일 03:00 KST 자동 실행.

## 나중에: GA4 + Supabase 조인 분석
같은 BigQuery 안에 GA4 이벤트(`analytics_547127440.events_*`)와 좌표(`calm_forest_raw.game_logs`)가 모이므로,
`user_id` / 시간 기준으로 조인해 "무엇을(이벤트) 어디서(좌표) 했는지"를 한 쿼리로 분석할 수 있습니다.
(GA4의 user_pseudo_id ↔ 우리 user_id 매핑이 필요하면 login 이벤트에 user_id 파라미터를 실어 보내도록 확장 가능)
