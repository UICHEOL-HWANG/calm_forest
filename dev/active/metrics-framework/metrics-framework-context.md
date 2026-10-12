# 지표 체계 설계 — Context

**Last Updated** 2026-10-12 밤 (M7 분석 12건 G2 · 이상 탐지 DAG 가동 · 정의서 §5-5·발표 2-10~2-12 반영)

## 작업 공간

| 누구 | 경로 | 브랜치 |
|---|---|---|
| Claude | `calm_forest` (메인 폴더) | `analytics/metrics-framework` (공유·최종 병합 단위) |
| Codex | `calm_forest-codex-metrics` | `analytics/codex` → 공유 브랜치로 merge |

폴더 소유: `docs/analysis/METRICS_FRAMEWORK.md` = Claude · `sql/analytics/metrics/` = Codex · `dev/active/metrics-framework/` = 공동

## 데이터 원천 (BigQuery 프로젝트 `calm-forest`, 리전 asia-northeast3)

| 데이터셋 | 테이블 | 메모 |
|---|---|---|
| `analytics_547127440` | `events_*` | GA4 행동 이벤트, 키 `user_pseudo_id` |
| `calm_forest_raw` | `game_logs` | 좌표·행동 샘플 (배치 INSERT 시각만) |
| | `econ_logs` | 코인 원장 (코인 전용) |
| | `session_logs` | upsert → `ROW_NUMBER() … updated_at DESC = 1` |
| | `game_saves` | 매일 덮어쓰는 스냅샷 (이력 없음) |
| | `session_platform`, `user_platform` | platform 백필 보조 |
| | `churn_events`, `retention_guidance_scores` | 이탈 파이프라인 산출 |

Supabase 쪽 별도 테이블(리더보드·star_runs·boat_runs·purchases·notices 등)은 BQ 에 없을 수 있음 → M4 에서 확인.

## 기존 자산 (재사용)

- `docs/analysis/ANALYSIS_PROTOCOL.md` — 게이트 규칙·함정 목록 (반드시 준수)
- `docs/analysis/ANALYSIS_GATES.md` — 과거 분석 원장 (리텐션·이벤트 밀도·토스 행동)
- `docs/analysis/GA4_GUIDE.md` — 이벤트 명세
- `sql/analytics/*.sql` — 기존 쿼리 (admin_analytics, bigquery_queries, quality_checks …)
- 과거 발견: 첫 10분 이벤트 밀도가 리텐션 예측력 있음 · 입구 이탈 59.4% (Tableau)

## 의사결정 로그

- 2026-10-08 공유 브랜치 1개 + Codex 하위 브랜치, 폴더 단위 소유로 충돌 회피
- 2026-10-08 기존 7게이트 프로토콜 위에 M0~M7 단계를 얹음 (M4 = G1, M7 → G0 로 이어짐)
- 2026-10-08 **NSM 정의 확정(사용자 판단)**: 하루 평균 가꾼 주민 수(7일 평균) · 결과물 16종 · 혼합 키 · KST · 공식(필터)+원본 병기 · 원천 SL 공식 + GA4 그림자
- 2026-10-08 검증은 선발전이 아니라 측정 가능성 확인용으로 한정. V1(AUC 비교)은 동어반복 설계라 판단 근거에서 제외. V2·계측 일치(98.4%)·V3·노이즈만 정의서 근거/한계로 사용
- 2026-10-08 **집계 플랫폼 = 웹·토스.** 안드로이드(SL 행 없음)·itch(결과물 0) 제외, 계측 수정 후 재편입
- 2026-10-08 **AARRR 유입 = 방문(GA4 first_visit) + 게임 진입(SL 첫 세션) 두 칸** — 입구 이탈을 퍼널에서 보이게
- 2026-10-08 **추천(Referral) 범위 제외** — 이후 메타 광고·지인 추천 이벤트 진행 때 함께 설계·측정. 현재 공유 링크 유입 0, 사진 공유 3명, 수확제 초대 0

## M1 후보 (2026-10-08) — 전체 기간 표는 m1-candidates.md 가 정본. 아래는 첫 3후보 메모(9월 한정, 폐기)

| | 후보 | 원천·키 | 주간 값 | 강점 | 약점 |
|---|---|---|---|---|---|
| ① | 주간 정착 주민 (2일+ & 핵심 루프) | GA4 · user_pseudo_id | 14→8→4→4 | 습관+행동 | 숫자 작음·토스 누락 의심 |
| ② | 주간 가꾼 날 수 (사람×날, 핵심 루프) | GA4 · user_pseudo_id | 53→31→15→13 | 폭×빈도 한 숫자 | 열성 소수가 부풀림·토스 누락 의심 |
| ③ | 주간 재방문 주민 (이번 주 & 지난주) | session_logs · client_id | 6→14→7→6 | 전 플랫폼·가장 직접적 | 숫자 작음·격주 유저 누락 |

- 9/28 주 session_logs WAU 418 (평소 27~45) → 페르소나 시뮬 혼입 확정적. GA4 는 같은 주 45 — 페르소나가 GA4 엔 덜 찍힘
- `session_logs.counts` = 문자열 JSON, 세션별 행동 횟수 → 핵심 루프 조건을 GA4 없이 전 플랫폼에 적용 가능
- 토스 재방문은 매주 4명 고정

## 미해결

- 수익 지표 범위: Paddle(웹 현금)·토스 IAP·IAA 를 Revenue 에 넣을지 — M3 에서
- 플랫폼별 NSM 분리 여부 — M1 에서

## 2026-10-12 세션 — 결정·발견·다음

### 결정 (사용자)
- 난이도 probe 는 실제 유저 부족 → **페르소나 플레이로 게임별 모델**(유저별 분해 안 함)
- 웹 진입: W2 계측 불가 기기는 **하한(0초)·상한(제외) 둘 다** 계산, 둘 다 같을 때만 판정 · localhost/해외 제외 규칙 변경 질문은 건너뜀(Q6 보류)
- **E2 = A안**(웹 첫 방문 로그인 화면 없이 게스트 시작) · 주 지표 **첫 세션 플레이 행동** · 구현은 별도 세션(task_458f2ea3)
- M5: Codex 를 쓸 수 없어 `analytics/codex` 를 공유 브랜치에 병합하고 여기서 마무리 · **공식은 퍼널·경제까지 베타 제외, 베타는 `beta` 출력으로 따로** · Q3 NULL · Q4 첫 비어 있지 않은 플랫폼 · Q5 게임 전체 이력 · Q6 보류
- M6 베이스라인 Artifact 보류 — "분석에만 집중"
- 코인 경제: 자동 지급만 받고 session_logs 없는 기기 제외 · C4·C5 는 잔고 열(주) + 금액 합계(민감도)
- 발표 = 5막(문제 → 어디서 새나 → 무엇을 바꾸나 → 숫자를 믿을 수 있나 → 마무리), metrics-story.md 갱신
- PR 만들지 않음 — 분석 브랜치만 원격 푸시(`origin/analytics/metrics-framework`)

### 발견·이슈
- **숫자 정정**: 활성화 43→39% · 웹 진입 37→36% · 9/7 주 코인 순증가 384→25 ('인플레 384→96 감소'는 베타 착시)
- **개발자 제외 구멍**: GA4 개발자 제외가 user_id 로만 걸려 진입 안 한 localhost 기기가 남음 (웹 첫 방문 112대 중 63% 가 localhost·해외)
- **8/31 자동 접속 95대** — 자동 지급만 받고 사라짐. 이상 탐지 G2 의 M2 '오경보'가 실제 오염이었음(판정은 사전 기준대로 유지)
- **Play Games 자동 로그인 250건 중 성공 1건**(9/25~) → 별도 세션 task_df8a9b12 (메모리 pgs-login-unpublished: PGS 프로젝트 미게시)
- 경제 기록: 5초 배치 → 같은 시각 행 다수(복사본 아님) · balance 연결 86%
- 튜토리얼: 수확이 8단계, 코치 17단계 완료 12%, 1단계에서 20명 그만둠 · 9/1 재정렬로 단계 번호 버전 간 비교 불가
- 용어: '졸업' → '튜토리얼 완료' (새 말 만들지 말 것)
- 훅: 새 파일 Write 마다 Fact-Forcing Gate — 사실 4개를 먼저 적고 재시도해야 함 · 셸 heredoc 한글이 깨질 때가 있어 원장 수정은 스크래치 .py 파일로

### 다음 (구체적으로)
1. 10/14 이후 **힌트 배너 A/B 판정** — `hint-banner-ab-prereg.md` 기준 그대로
2. E1·E2 배포되면 다음 날 BQ 에서 배정 속성(`exp_arm`·`exp_entry`) 50:50 확인 → 매주 배정 비율·가드레일만 (결과 엿보기 금지)
3. 사용자 결정 대기 3건: M5 Q6(GA4 localhost 제외) · 코인 가드레일 중앙값+상위 3대 비율 · 하루 기기 수 관리도 경보를 파이프라인(Airflow)에 연결
4. B4 결과 → '수확 단계를 앞당긴 튜토리얼' 실험 후보 (E1 결과 후)
5. C6 결과를 E2 구현 세션에 전달할지 결정 — '나중 계정 연결 안내'를 처치에 넣을지
6. 9/28 이후 신규 쌓이면 B3-b·S1·T1 판정

## 2026-10-12 밤 — 추가 분석·배포

### 결정 (사용자)
- 모델링 후보: ③ 시세 예측 → **판매가 → 판매량 반응**으로 형태 변경 · ⑤ 이상 탐지 DAG · ④ 과금 LTV → **참여 LTV 조기 예측**(결제 0) · 순서 ③ → ⑤ → ④
- 힌트 배너 G2 를 10/14 대신 오늘 — G1 에서 127/127 세션이 이미 7일 관찰을 채움
- DAG: KPI 채널(#cf-data `C0C7FNDACJF`), 05:00 KST, VM 배포까지

### 결과
- 판매가 반응: P1 지지 탄력성 +4.37 (CI +1.59~+6.61), P2 불가 → 비싼 날을 골라 판다 · 시세 = 코드 식 100% 일치 · ⚠️ GA4 `shop_sell` 에 베타 태그 없음 → 경제 원장 베타 계정으로 제외(판매의 1/3)
- 힌트 배너: 56% vs 56%, p 1.00, CI −15~+17%p → 판정 불가 · 기저율 가정(20~40%) 틀림(실제 56%)
- 참여 LTV 조기 예측: 스피어만 +0.44, 단일 신호(첫날 획득 행동 수) +0.47 과 차이 없음 → 방향만
- **anomaly_watch DAG 가동**: `infra/airflow/dags/anomaly_watch.py` + 테스트 6개 · VM `/opt/airflow/secrets/slack_kpi_bot`(600, 키체인에서 파이프) · 시험 실행 10/11 정상 · 코드 리뷰 반영(어제 데이터 없으면 실패·재시도, data_interval 기준 날짜, 공식 값=웹·토스 표기, 테스트 monkeypatch)
- 범위 밖 발견: public main 에 유저 단위 CSV(`ml/reports/beta_h3_banner_eda_2026-09-16/*_rows.csv`, user_id·client_id 포함) → 별도 세션 task_3551a90b

### 다음
1. 10/13 05:00 anomaly_watch 첫 실행 로그 확인 (`airflow tasks states-for-dag-run` 또는 웹 UI)
2. 기본 판매가 → 총 소득 반응(기간 합계) — P1 후속
3. 결정 대기: M5 Q6 · 코인 가드레일 · C6 결과를 E2 구현 세션에 전달할지
4. E1·E2 배포 후 배정 속성 확인 → 매주 배정 비율·가드레일
