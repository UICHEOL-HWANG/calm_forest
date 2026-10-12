# 🏠 이웃 마을 구경하기 (2단계: 집 안) — 설계

- 날짜: 2026-10-11
- 상태: 사용자 결정 완료(전 층 B · 공개 범위 = 마을 공개 A · 구경 + 가구 이름표 B · 구현 = 방 짓기 순수 모듈 분리 A) → 스펙 검토 대기
- 선행: 1단계 앞마당 `docs/superpowers/specs/2026-10-07-neighbor-village-design.md` (§11 2단계 메모)
- 브랜치: `feat/neighbor-indoor` (워크트리 `.claude/worktrees/neighbor-indoor`, main 7e62fb3 기준)

## 1. 목적

1단계는 집 **외관**까지만 보여 준다. 플레이어가 가장 오래 꾸미는 곳은 실내(층별 해금 가구·상판 올려놓기)인데 남에게 보일 곳이 없다.
- 꾸미기·프리미엄 가구의 **보여줄 곳**을 실내까지 넓힌다.
- 가구 이름표로 "저거 뭐지 → 나도 사고 싶다"를 잇는다(상점 유입).

성공 기준(배포 2주 뒤, 이웃 방문 기준): 방문 중 실내 진입률 40% · 진입자 평균 체류 30초 이상 · 방문당 이름표를 본 가구 수 중앙값 3 이상. 상점 유입은 관찰만 한다(인과 아님).

## 2. 범위

**이 스펙**: 이웃 집 실내 **전 층**(1층·다락·2층·루프탑·정원 — 집 단계가 허락하는 만큼) 구경 · 계단 층 이동 · 가구 이름표 · 트래킹.
**범위 밖**: 실내에서의 반응·신고 버튼(앞마당에서 한다) · 집주인 캐릭터 실내 배치 · 실내 공개 별도 토글 · 가구 구매 바로가기 · `village_views` 원장 컬럼 추가.

## 3. 사용자 흐름

1. 이웃 앞마당에서 집 문 앞으로 가면 프롬프트 `🚪 들어가 보기`.
   - 집 단계 1·2(초가집, 실내 없음)이거나 응답에 `room` 이 없으면 프롬프트를 **띄우지 않는다**(빈 방 금지).
2. 액션 → 페이드 → 이웃 실내 1층 출구 앞에 선다. 상단 라벨은 `🏡 {닉네임} 의 집`.
3. 걸어 다니며 구경. 현재 층에서 가장 가까운 가구가 **1.6 이내**면 프롬프트 줄에 `{ico} {이름}`(예: `🪑 흔들의자`). 이름표 전용이라 액션 키 표시는 없다.
4. 계단 앞에서 내 집과 같은 계단 안내 → 층 이동. 7단계 정원 문도 같다.
5. 1층 출구 문 `🚪 마당으로` → 페이드 → 이웃 집 문 앞 마당. 상단 HUD `🚪 내 마을로` 버튼은 실내에서도 눌린다(실내를 먼저 정리하고 마을로).
6. 집주인은 문 앞 자리(`hostSpot`)에서 **x+1.5 비켜 선다** — 그대로 두면 문 프롬프트와 말풍선이 같은 자리에서 겹친다(펫도 같이 옮겨진다).

## 4. 데이터·서버

### 4.1 SQL — `_nb_room(save jsonb)` (새 마이그레이션 `sql/migrations/migrate_neighbors_room.sql`)

`_nb_yard` 와 같은 모양의 허용 목록 헬퍼:
- 입력 `save->'house'->'decor'` 배열. 원소마다 `id`(문자열 ≤40자), `x`·`z`(숫자, |값| ≤ `ROOM_MAX_XY`=7.5), `rot`(0~3 정수, 아니면 0), `f`(0~3 정수, 없으면 0)만 꺼낸다.
- 조건을 어긴 원소는 버린다. 최대 `ROOM_MAX`=120개(배열 앞부터).
- `neighbor_showcase` 응답 객체에 `'room', _nb_room(save)` 를 추가한다. 비공개·관리자 숨김·익명·세이브 없음 → 지금처럼 null(실내도 함께 막힘).
- `neighbor_showcase` 최신 본문은 `migrate_neighbors_moderation.sql` 의 것 → 그 본문을 옮기고 `room` 한 줄만 더한다. ⚠️ 이 파일 적용 뒤 `migrate_neighbors_moderation.sql` 을 다시 돌리면 `room` 이 빠진다 → 파일 머리 주석에 적용 순서 명시.
- 셀프테스트 `sql/tests/neighbors_selftest.sql` 에 `room` 케이스(정상·범위 밖·이상한 rot/f·상한) 추가. DO 블록 변수명은 RPC 열 이름과 겹치지 않게(42702 함정).
- 운영 적용은 pg8000 풀러로 직접 실행.

### 4.2 Worker
변경 없음. `functions/api/neighbor.js` 는 RPC 결과를 그대로 넘기고 엣지 캐시 600초를 유지한다.

### 4.3 클라이언트 정제 — `js/neighbors/sanitize.js`
- `view.room = [{id, x, z, rot, f}]` 추가. 남기는 조건: `ctx.decorIds`(현재 클라이언트 `DECOR` id 집합)에 있는 id · 숫자 좌표 범위 안 · 상한 120.
- `f` 는 `normalizeFloor(f, view.houseStage)` 로 보정(그 단계에 없는 층이면 1층).
- 응답에 `room` 키가 없거나 배열이 아니면 `view.room = null` → 문 프롬프트 숨김(§3.1).
- 상수 `ROOM_MAX`·`ROOM_MAX_XY` 는 `js/neighbors/rules.js` 에 두고 `tests/neighbors-sync.test.mjs` 가 SQL 값과 같은지 고정한다.

### 4.4 배포 호환
옛 클라이언트는 `room` 을 무시한다 → **4곳 동시 배포 불필요**. 순서: SQL → 웹 → 토스·Play·itch. 새 클라이언트가 옛 응답(엣지 캐시 최대 10분)을 받으면 `room=null` → 문이 안 보일 뿐.

## 5. 장면

### 5.1 방 짓기 — `buildRoomWith(def, ctx)` (`js/spaces/indoor.js` 안에서 인자화)
- (계획 단계 조정: 새 파일로 옮기면 계단·마감 상수·재질 헬퍼까지 순환 import 가 늘어 변경이 커진다 → 같은 파일에서 인자만 바꾼다.)
- `ctx = { stage, style, origin, windows, solidCircle }` — 단계·스타일·원점·창 재질 목록·충돌체 등록 함수를 받는다. 돌려주는 그룹은 씬에 붙이지 않는다. **함수 본문은 `gameState`·`scene`·`houseWindows` 를 직접 읽지 않는다.**
- `buildRoom(def)` 은 내 집 ctx 로 `buildRoomWith` 를 부르고 `scene.add` 하는 얇은 어댑터가 된다(내 집 동작 불변).
- 동치 확인(Node 엔 three 가 없어 브라우저에서): 리팩터링 전후 각 층 메시 수·정점 수·충돌체 좌표·창문 수 스냅숏이 같다. 실측: 내 집 각 층 리팩터링 전후 픽셀 비교.

### 5.2 이웃 실내 — `js/neighbors/indoor.js` (신규, 300줄 이하 목표)
- 위치 `NEIGHBOR_INT = (0, 0, 780)` (`js/data/places.js`). 모든 인스턴스 공간 좌표가 서로 충분히 떨어져 있는지 확인하는 테스트를 추가(나룻배 코스 겹침 사고 재발 방지).
- `buildNeighborIndoor(view)` — 첫 진입 때 지어서 그 방문 동안 유지:
  - `floorsFor(view.houseStage)` 의 층마다 `buildRoomWith`.
  - 가구: `decorMesh(id)` + 상판 높이는 `planSeats`(`js/house/surface.js`)로 계산 · 충돌체는 카탈로그 `foot` 대로(러그처럼 `foot` 없는 것은 없음).
  - 전용 PointLight 1개(내 집 공식: `1.8 + 밤정도×2.6`) · `setFogExempt`.
  - `dispose()` — 메시 정리(공유 재질 제외), 충돌체·창문 해제, 조명 제거. 1단계 `scene.js` 의 dispose 경로(내 마을로 / 다른 이웃으로)에서 같이 부른다.
- 층 상태는 모듈 안 `visit.indoorFloor` 에만 둔다. 전역 `houseFloor`·`$w.indoor` 는 건드리지 않는다(내 집 저장·조명 분기 오염 방지). 공간 플래그는 `$w.atNeighborIndoor` 를 새로 두고 `setSpaceVisible()` 에 분기 추가.
- 출입·계단은 `js/spaces/doors.js` 이웃 분기에 추가: 마당 집 문 → 들어가기, 1층 출구 → 마당, 계단 → `stairLayout(H)` 재사용. 분기마다 `updateToolPageAuto` 호출(1단계 함정).

### 5.3 가구 이름표
- 매 프레임 현재 층 가구 중 플레이어와 가장 가까운 것(거리 ≤ 1.6) → 프롬프트 줄에 `{ico} {name}`. 이름은 i18n 사전을 거친다(영어판 대응).
- 모바일 HUD 규칙: 컨텍스트 슬롯 또는 프롬프트 줄만 사용. 새 오버레이 금지.
- 본 가구 id 를 방문 동안 집합으로 모아 트래킹에 쓴다.

## 6. 트래킹 (`js/neighbors/track.js`, 순수 빌더)

| 이벤트 | 파라미터 |
|---|---|
| `neighbor_indoor_enter` | `host`, `house_stage`, `decor_n` |
| `neighbor_indoor_exit` | `host`, `sec`, `floors_seen`, `tags_seen` |
| `neighbor_load_fail` (기존) | `stage:'indoor'`, `code` |

- 기존 키(`host`·`sec`·`stage`·`code`) 재사용, 새 키는 `house_stage`·`decor_n`·`floors_seen`·`tags_seen` 4개(GA4 파라미터 한도·커스텀 키 과다 규칙).
- exit 은 마당 복귀 때 1회. 실내에 있는 채로 방문이 끝나면(`neighbor_visit_end` 경로) `neighbor_indoor_exit` 을 먼저 보낸다.
- 배포 다음 날 BigQuery 에서 두 이벤트 적재·파라미터 채움 확인까지 작업 범위.

## 7. 오류 처리
- `room=null` → 문 프롬프트 숨김(조용히).
- 실내 짓기 예외 → 지은 것 dispose · 마당으로 돌려보냄 · 토스트 `🏠 집 안을 불러오지 못했어요` · `neighbor_load_fail{stage:'indoor'}`.
- 모르는 가구 id 는 정제 단계에서 이미 빠진다(빈 그룹 렌더 없음).

## 8. 테스트
- 단위: sanitize(`room` 없음·모르는 id·범위 밖·rot/f 이상·층 보정·상한) · 이름표 최근접 선택 · track 빌더 · 좌표 비겹침 · SQL/JS 상수 동기화.
- 동치: `buildRoomWith` 대 리팩터링 전 결과(단계별).
- SQL 셀프테스트 DO 블록.
- 실측(브라우저 pane 앞으로): 이웃 실내 각 층 PC·모바일 캡처 · 드로우콜(실내 진입 전후) · 내 집 픽셀 비교 · 영어판 이름표.
- 리뷰: code-reviewer · security-reviewer(SQL 허용 목록).

## 9. 배포
SQL 운영 적용 → 키 스캔 → main 병합 → 웹 · 토스(`bundle_upload` 메모 포함) · Play · itch zip → main + feat/capacitor-app 푸시 → 토스 출시 후 📮 공지("마을을 공개해 두면 집 안도 이웃에게 보여요 · ⚙️ 에서 끌 수 있어요").
