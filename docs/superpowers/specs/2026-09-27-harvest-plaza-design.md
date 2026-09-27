# 🌾 수확제 광장 — 전 유저 공동 프로젝트

- 날짜: 2026-09-27 · 브랜치 `feat/harvest-plaza`(main 49bc40c 에서 분기)
- 출발점: cozy 게임 조사(Palia 공동 프로젝트·Cozy Grove 비동기 참여·동물의숲 계절 행사)와 우리 게임 비교에서
  "모두가 같이 채우는 목표"와 "계절 흐름"이 비어 있다는 결론. 로드맵의 👑 광장/분수 후보를 이 형태로 소화한다.
- 규모 근거(2026-09-26 측정): 최근 7일 코인 거래 유저 38명 · 재료 보유 플레이어 39명
  (목재 중앙값 30 / p90 332, 돌 중앙값 12 / p90 180, 달걀 합계 8, 사과 0)

## 1. 합의된 결정

| 항목 | 결정 | 이유 |
|---|---|---|
| 광장 성격 | **영구 건물**, 시즌마다 한 단계씩 확장 | "내가 보탠 게 남는다"가 소규모 유저층의 가장 강한 동기 |
| 실패 처리 | 단계형 목표 + 기간 끝나면 **무조건 완공**(주민이 마무리) | 부드러운 실패 원칙(나룻배·안개숲)과 같은 결 |
| 분수 | 이번엔 **수확 나무만**, 분수 자리는 비워 두고 겨울 시즌에 | 다음 시즌에 같이 지을 것이 남아 있어야 확장 구조가 산다 |
| 위치 | **A. 동쪽 과수원 길 (23, 0, −4)** 반경 5 | 가장 넓어 분수·무대 확장 여유, 과수원 가는 길목 |
| 발견성 | ① 나무 위로 솟은 깃대 ② 돌길+깃발 줄 ④ 🦉 첫날 초대 | 시작 카메라(북향) 시야 밖이라 보완 필요 |
| 기부 품목 | **단계별 재료 목록** | "내가 캔 돌이 저 바닥이 됐다"는 연결 |
| 보상·상한 | **하루 상한 + 즉시 토큰 + 완공 시 기여 등급** | 매일 조금씩 → D1 복귀와 직결, 한 명이 혼자 채우는 것 방지 |
| 서버 | **Supabase RPC 원장 + Worker 캐시 프록시** | 규칙 검사가 DB 안에서 원자적, 새 시크릿 불필요, 리더보드 패턴 |
| 장식 모델 | **4종**(좌판 2 + 등급 2) | 조형 작업량 절감 |

고려했다가 버린 것: 코인만 기부(돈 내기라 같이 짓는 감각 약함) · 기여 순위 보상(경쟁 압력, 리더보드와 중복) ·
Worker service_role 쓰기(RLS 우회 키 운영 부담) · `econ_logs` 재사용(상한 강제 불가) ·
Airflow 집계(배치라 즉시 반영·사전 차단 불가, VM 단일 장애점) · 시작점 옆 기부 안내판(시작점 과밀, 베타 "NPC 가림" 지적).

## 2. 시즌·단계 데이터

- 시즌 `harvest-2026` · **14일**(초안 10/9 ~ 10/22 KST, 구현 ~1주 + 토스 검수 1~3일 감안, 확정 전 재확인)
- 1인 하루 상한: **품목 합계 30개**(KST 자정 리셋)
- 각 품목은 진행 바가 따로 있고, 단계의 모든 품목이 차면 다음 단계로 넘어간다

| 단계 | 연출 | 필요 재료 | 합계 |
|---|---|---|---|
| 1 | 터 다지기(흙·말뚝·자재 더미) | 🪵목재 300 · 🪨돌 200 | 500 |
| 2 | 돌바닥·벤치·가로등 | 🪨돌 400 · 🪵목재 200 · ⚫석탄 100 | 700 |
| 3 | 수확제 장식(깃발·볏단·호박·허수아비) | 🥕작물 500 · 🍄채집물 80 · 🪵목재 120 | 700 |
| 완공 | 중앙 수확 나무 + 등불 + 기부 명판 | — | — |

- 계산 근거: 하루 기부자 ~12명 × 1인 ~15개 ≈ 180개/일 → 단계당 3~4일, 완공 ~11일차(여유 3일)
- 달걀·과일은 보유량이 거의 없어 필수 재료에서 제외
- **숫자의 단일 출처는 DB**(`plaza_needs`·`plaza_seasons`). 클라이언트 `js/data/plaza.js` 에는 아이콘·이름·연출 같은 표시 정보만 둔다
- 기간이 지나면 남은 필요량과 상관없이 완공으로 판정한다(서버)
- 다음 시즌은 같은 표에 `winter-2026`(분수) 행을 추가하는 것만으로 확장

### 기여 등급(시즌 누적 기부 개수)

| 등급 | 조건 | 의미 |
|---|---|---|
| 🥉 | 10 이상 | 참여 한 번 |
| 🥈 | 60 이상 | 사흘 정도 꾸준히 |
| 🥇 | 150 이상 | 상한 기준 5일 이상 |

## 3. 서버

### 전제(한계)
세이브는 클라이언트가 `game_saves` 에 JSON 으로 올리므로 서버는 **보유량을 검증할 수 없다**.
어뷰징 피해는 **하루 상한**으로 제한한다(조작해도 하루 30개). 서버가 유저 인벤토리를 읽는 일은 없다 —
유저가 "돌 10개 낼게"를 보내고, 서버가 규칙을 확인해 받은 양을 알려 주면, 클라이언트가 그만큼만 차감한다.

### 마이그레이션 `sql/migrations/migrate_plaza.sql`

| 테이블 | 컬럼 | 권한 |
|---|---|---|
| `plaza_seasons` | season(pk), starts_at, ends_at, daily_cap | anon·authenticated 읽기 |
| `plaza_needs` | (season, stage, item) pk, need | anon·authenticated 읽기 |
| `plaza_donations` | id, user_id, season, stage, item, qty(1..30 check), kst_day, created_at | RLS on · **insert/update/delete 정책 없음**(직접 쓰기 차단) · select 는 본인 행만 `(select auth.uid())` |

인덱스: `plaza_donations (season, item)` · `(season, user_id, kst_day)`

### RPC(전부 `security definer` · `set search_path = public` · 실행 권한은 표에 적은 역할만)

1. **`plaza_donate(p_season text, p_item text, p_qty int) → json`** — authenticated. 기부의 유일한 통로. 게스트도 익명 로그인 uid 로 참여 가능.
   1. `auth.uid()` 없음 → `{ok:false, reason:'auth'}`
   2. 시즌 기간 밖 → `reason:'season'`
   3. `pg_advisory_xact_lock(hashtext(p_season))` — 동시 기부 경쟁에서 필요량 초과 방지
   4. 현재 단계 = 필요량이 남은 첫 단계(없으면 `reason:'full'`)
   5. 품목이 현재 단계에 없거나 남은 필요량 0 → `reason:'need'`
   6. 오늘 사용량(본인·시즌·KST 오늘 합계) → 남은 상한 0 이면 `reason:'cap'`
   7. `accepted = least(p_qty, 남은 상한, 품목 남은 필요량)` 기록
   8. 반환 `{ok:true, accepted, today_left, my_total, tier, stage, item_have, item_need}`
2. **`plaza_progress(p_season text) → json`** — anon·authenticated. 모두가 보는 진행률.
   `{season, stage, completed, forced, ends_at, items:[{stage,item,have,need}], donors, names:[...]}`
   - `completed` = 모든 필요량 충족 **또는** 기간 경과(`forced:true`)
   - `names` = 1개 이상 기부자 닉네임 — `coalesce(nullif(gs.state->>'nickname',''),'이름 없는 여행자')`(리더보드와 같은 규칙), 식별자는 내보내지 않는다
3. **`plaza_mine(p_season text) → json`** — authenticated. `{my_total, today_left, tier}`

### API
- `GET /api/plaza?season=` → `plaza_progress` 프록시 + 엣지 캐시 **60초**. `functions/api/plaza.js` 신설,
  **`worker/index.js` 라우트 수동 등록**, 로컬 미러 `scripts/serve.py` 에 같은 규칙(한쪽만 고치지 않기)
- `plaza_donate`·`plaza_mine` 은 유저별 결과라 캐시 없이 클라이언트가 Supabase RPC 를 직접 호출
- 기부 직후 내 화면은 60초 캐시를 기다리지 않고 **`plaza_donate` 응답으로 즉시 갱신**
- 운영: Supabase MCP 는 읽기 전용 → 마이그레이션·자가 테스트는 사용자가 SQL Editor 에서 실행

## 4. 클라이언트·렌더

### 파일(새 코드는 `game.js` 에 쌓지 않는다 — 연결 훅만)

| 파일 | 역할 |
|---|---|
| `js/data/places.js` | `PLAZA = (23, 0, −4)`, `PLAZA_R = 5` |
| `js/data/plaza.js` | 표시 정보: 품목 아이콘·이름, 단계 이름, 등급 아이콘, 좌판 품목·가격 |
| `js/plaza/rules.js` | 순수 계산: 등급 판정, 시즌 기간(KST), 기부 가능량, 단계→연출 매핑, 🍂 환전 |
| `js/plaza/net.js` | `/api/plaza` 조회(60초 간격 제한), `plaza_donate`·`plaza_mine` 호출 |
| `js/plaza/build.js` | 광장 3D — 단계별 파츠를 재질별 병합 |
| `js/plaza/path.js` | 돌길 + 깃발 줄 + 깃대 |
| `js/plaza/ui.js` | 기부 모달 `#plaza-modal`, 명판·좌판 모달 |

### 렌더·드로우콜
- 카페 방식: **색을 먼저 정한다** — 돌 · 밝은 나무 · 어두운 나무 · 볏짚 · 호박 주황 · 단풍잎 · 등불(발광) 7재질 + 깃발 정점색 1.
  단계마다 파츠를 재질 키 Map 에 모아 `mergeGeos()` 한 번(`mesh.position` 대신 지오메트리 `.translate()`)
- 예산: **광장 ≤ 12콜**, 돌길·깃발 줄·깃대 ≤ 3콜. `?dbg=1&weather=clear&time=0.32` + `__perf()` 로 추가 전후 실측
- 단계 전환은 병합 메시 통째 교체. `shared()` 자원 미사용(해제 함정 회피)
- 랜덤 나무·꽃 산포 제외 목록에 광장 반경 추가(나무 링 r8~30 안). 충돌체는 벤치·깃대·수확 나무·기부함·좌판만
- 좌표 확정 전 `NPCS[].pos`·기존 시설과의 간격 재확인

### 진행률 표시
1. 부팅 시 `/api/plaza` 로 단계를 받아 그린다
2. 광장 반경 20 안에 들어오면 재조회(최대 60초 1회)
3. 마지막으로 본 단계를 세이브 `plaza.lastStage` 에 저장 → 오프라인이어도 마지막 모습 유지

### 시즌 상태별 모습

| 상태 | 광장 |
|---|---|
| 시작 전 | 없음(기존 마을 그대로) |
| 진행 중 | 현재 단계 + 깃대·돌길·깃발 줄, 기부함·좌판 열림 |
| 완공 | 수확 나무 광장 영구. 돌길 유지, 깃대는 수확 나무로 대체. 기부함 → **명판**(참여자 목록 + 보상 받기) |

### 기부 UI
- 기부함 근접 프롬프트 → `#plaza-modal`(`-modal` 접미사라 `anyModalOpen()` 자동 적용, 열 때 `Input.setAnalog(0,0)`)
- 현재 단계 품목별 진행 바 · 내 보유량 · 품목별 `+1 / +5 / 최대` · "오늘 남은 기부 n/30" · 내 등급
- 성공: **받은 만큼만** 차감 → 바 즉시 이동 → 🍂 토스트. 실패(offline·season·auth): 인벤토리 무변경 + 이유 토스트
- 모바일 레이아웃 규칙(mobile-hud-layout) 준수, 새 문구는 한국어 후보 선검수 후 확정 + `js/i18n-en.js`

### 발견성 장치
- 깃대: 높이 ~8(나무 링 위로), 진행 중에만
- 돌길: 시작점 → 랭킹 게시판(13.5, 1.5) → 광장, 가로등 사이 깃발 줄
- 미니맵: `VILLAGE_PLACES` 에 `pri:1` 추가(+ i18n)
- 🦉 **광장 초대**(시즌당 1회): 시즌 중 마을 첫 진입 ~20초 뒤(튜토리얼·모달 중엔 대기) 올빼미가 기존 비행·착지 코드로 날아와
  "광장 공사장에 가 보기" 의뢰 전달. **`st.special` 과 별도 칸 `plazaInvite`** — 같은 날 ✨특별 의뢰를 막지 않는다.
  목표는 상태형(광장 반경 도착), `quest_id = courier:plaza:harvest-2026`, 보상 🍂5 + 🪙10
- 검증: 헤드리스 캡처로 PC·모바일 세로 시작 화면에서 깃대가 보이는지 확인. 잘리면 깃대 높이 또는 돌길 첫 구간 방향 조정

## 5. 보상

- 원칙: **기부로 코인을 주지 않는다**(재료→코인 통로 = 인플레이션, 나룻배 ⭐와 같은 판단)
- **🍂 수확제 잎사귀**: 기부 1개당 1장(하루 최대 30), 판매 불가, `inventory.leaf`
- **🌾 수확제 좌판**(광장 옆, 시즌 중에만): 볏단 🍂40 · 호박 더미 🍂60 — 야외 장식(`js/data/catalog.js` 체계)
- 시즌 종료 후 남은 🍂 는 🪙2 씩 자동 환전(1회, `econ_logs` source `plaza_leaf`). 다음 시즌 토큰은 계절에 맞게 새로
- **완공 등급 보상**: 명판 "보상 받기" → `plaza_mine` 등급 기준 1회 지급, 세이브 `plaza.claimed[season]`

| 등급 | 보상 |
|---|---|
| 🥉 | 🌾 '수확제 일꾼' 배지 |
| 🥈 | + 호박 등불(한정 장식) |
| 🥇 | + 수확제 허수아비(한정 장식) |

- 명판: 1개 이상 기부자 전원 닉네임
- 새 장식 모델 4종(볏단·호박 더미·호박 등불·수확제 허수아비)은 재질 병합 + **시안 3개 이상 비교** 후 확정

## 6. 트래킹

식별자 통일: 모든 이벤트에 `season`·`stage`. 서버 원장 `plaza_donations` 가 정답, GA4 는 퍼널. dev 세션 미기록.

| 구간 | 이벤트 | 파라미터 |
|---|---|---|
| 발견 | `plaza_view`(세션·단계당 1회) | stage, pct, from(path·map·quest·other) |
| 초대 | `owl_plaza_deliver` → `quest_accept` → `quest_complete` | quest_id |
| 기부 | `plaza_modal_open` | stage, today_left |
| | `plaza_donate` | item, requested, accepted, reason(ok·cap·need·full), today_left, my_total |
| | `plaza_donate_fail` | reason(offline·season·auth) |
| 진행 | `plaza_stage_seen`(새 단계 첫 목격) | stage, day_n |
| 소비 | `plaza_stall_buy` | item, price, leaf_left |
| 마무리 | `plaza_reward_claim` | tier, my_total |
| | `plaza_leaf_convert` | leaves, coins |

GA4 예약어와 겹치지 않는지 구현 때 확인, 배포 다음 날 BigQuery 로 이벤트 적재 재검증.

### 성공 기준(시즌 종료 후)
- 시즌 중 활동 유저 대비 기부 참여율 ≥ 40%
- 기부자 1인당 기부한 날 수 중앙값 ≥ 3
- 완공 9~12일차(벗어나면 다음 시즌 목표량 조정)
- 기부자 vs 비기부자 D1 복귀율(참고용, 인과 아님)
- `requested > accepted`(상한 막힘) 비율 → 다음 시즌 상한 튜닝

## 7. 테스트

- `tests/plaza-rules.test.mjs`(node:test): 등급 경계 9/10·59/60·149/150, 기부 가능량, KST 자정·시즌 경계, 🍂 환전, 단계→연출 매핑
- `sql/tests/plaza_selftest.sql`: 트랜잭션 안에서 실행 후 `ROLLBACK` — 상한 컷, 필요량 초과 컷, 단계 넘김, 기간 외 거부, 기간 경과 강제 완공, 직접 insert 차단
- 라우트: `worker/index.js` 에 `/api/plaza` 등록 검사
- 화면: `?plaza=0|1|2|3|done` 단계별 헤드리스 캡처(PC + 모바일 세로), 시작 화면 깃대 가시성, `__perf()` 드로우콜 전후, `tools/refactor/smoke-diff` 로 다른 공간 불변
- game.js 를 텍스트로 읽는 테스트는 `gameSource()` 사용

## 8. 범위 밖
Airflow·BigQuery 별도 적재 · 유저 간 선물 · 겨울 시즌(분수) 내용 · 실시간 협동 · 좌판 3번째 품목(단풍 화환)

## 9. 배포 메모
웹·토스·itch·안드로이드 4곳 전부 · 토스는 `bundle_upload(memo)` · 공지는 토스 출시 후 `notices_admin.html` ·
main 병합·푸시 전 키 스캔 · 시즌 시작일 전에 4곳 모두 라이브여야 한다(토스 검수 기간 역산).
