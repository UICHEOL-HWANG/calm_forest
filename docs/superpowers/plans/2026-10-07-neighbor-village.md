# 🏡 이웃 마을 구경하기 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마을의 🏡 팻말에서 "오늘의 이웃" 3명을 골라 그 사람의 앞마당(집 외관·야외 장식·집주인 캐릭터와 펫)을 구경하고, 정해진 반응 4종을 남기면 하루 3회까지 🪙5를 받는다. 접속 때 나를 다녀간 이웃을 알려 주고, 첫 방문으로 📖 8장 「이웃의 숲」을 연다.

**Architecture:** 서버는 Supabase 테이블 2개(`village_profiles`·`village_visits`, RLS on·정책 없음) + SECURITY DEFINER RPC 5종이 판정을 전부 맡는다. 남의 세이브는 `neighbor_showcase` 가 허용 목록 키만 골라 만든 jsonb 로만 밖에 나가고, Worker `/api/neighbor` 가 엣지 캐시 10분으로 프록시한다. 클라이언트는 `js/neighbors/`(순수 규칙·검증·트래킹 빌더 + DOM UI + 3D 장면)와 `js/spaces/neighbor.js`(입장·퇴장·반응 배선)로 나누고, `game.js` 에는 공간 플래그·배선 몇 줄만 더한다. 이웃 공간은 `NEIGHBOR=(0,0,700)` 인스턴스이고 넘겨받은 뷰로만 그린다(내 세이브는 읽기만).

**Tech Stack:** Vanilla JS ES modules + Three.js r160(`vendor/three`), Supabase(Postgres RPC·supabase-js), Cloudflare Worker(`worker/index.js` → `functions/api/*.js`), 로컬 미러 `scripts/serve.py`, `node --test`, i18n 한국어-키 사전(`js/i18n-en.js`).

**Spec:** docs/superpowers/specs/2026-10-07-neighbor-village-design.md

## Global Constraints

- 공간 좌표: `NEIGHBOR = (0, 0, 700)`, 이동 반경 `NEIGHBOR_R = 16`, 바닥 반경 34(= NEIGHBOR_R + 18), 입구 팻말 `NEIGHBOR_GATE = (-4, 0, 25)`.
- 오늘의 이웃: 공개(`is_public`, 행이 없으면 공개) + 비익명(`auth.users.is_anonymous = false`) + `game_saves.updated_at` 7일 이내 + `houseStage ≥ 1` + 본인 제외, 정렬 `md5(caller ‖ kst_day ‖ host)`, 3명. 새로고침 리롤 불가.
- KST 날짜: SQL `(now() at time zone 'Asia/Seoul')::date`, JS `kstDate()`(`js/kst-date.js`).
- 반응: `wave|heart|flower|star`(👋 ❤️ 🌸 ⭐), 같은 이웃엔 하루 1회(`unique (visitor, host, day)`).
- 보상: 이웃당 🪙5, 하루 3회(🪙15) — 서버가 `rewarded` 판정, 지급은 `giveReward({ coins: 5 }, 'neighbor_visit', public_id)`.
- 공개 허용 목록(showcase): `nickname` · `character` · `cosmetics.equipped`(head·neck·back·trail·skin) · `pet.kind`+`pet.works` · `houseStage` · `houseStyle`(roof·wall·door) · `house.style` · `house.addons` · `outdoor[{id,x,z,rot}]` 중 집 터 `(-8,-8)` 반경 14 이내 최대 40개 · `coop.built`. **SQL 안에서 키를 하나씩 골라 만든다**(`state - '...'` 금지). user_id·inventory·cashOwned·cosmetics.owned·펫/일꾼 이름 등 나머지 전부 금지.
- Worker: `GET /api/neighbor?id=<public_id>`, `UUID_RE` 검증, 엣지 캐시 600초(null = 404, 캐시 안 함). `worker/index.js` 라우트 + `scripts/serve.py` 미러 필수(memory: api-route-wiring).
- 세이브 새 필드: `neighbors: { visited: n, seenAt: ms }`. 첫 공개 안내는 기존 `hintsSeen.neighborPublic` 로 1회.
- 8장: `soon` 제거, `STORY_RULES.neighbors = { done: visited ≥ 1, progress: '방문 n/1' }`, 훅 `syncStory('neighbor_visit')`, 보상 🪙150(기존 값).
- 8장 done 문구 후보(**병합 전 사용자 문구 검수 필수**): `이웃의 마을에 다녀왔어요. 숲은 생각보다 넓고, 생각보다 따뜻해요.`
- 검수 완료 문구(스펙 §8)는 글자 그대로: `오늘의 이웃` · `같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요` · `놀러 가기` · `또 보기` · `❤️ 다녀옴` · `🪙 오늘 받은 방문 보상 n/3` · `🏡 {닉네임} 의 마을` · `🚪 내 마을로` · `"와 줘서 고마워요! 어땠어요?"` · `❤️ 마음을 남겼어요 · 🪙+5` · `이웃 3명이 다녀갔어요` · `어제부터 지금까지` · `고마워요 🌱`.
- **미검수 문구(병합 전 사용자 검수 게이트)**: `🏡 이웃 마을 가는 길` · `"또 와 줘서 기뻐요!"` · `🔐 로그인하면 마음을 남길 수 있어요` · `아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요` · `이웃에게 내 마을 보여 주기` · `🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요` · 8장 done 문구 · 개인정보처리방침 추가 문단 · 이 계획이 새로 만든 `🏠 코티지` · `{집} · 🪴 장식 N` · `외 N명` · 영어 전부.
- 실패는 조용히 삼키지 않는다: 사용자 조작 실패는 기존 문구 `연결이 불안정해요. 잠시 후 다시 시도해 주세요.` 토스트 + `neighbor_load_fail`.
- 새 코드는 `js/neighbors/*` 와 `js/spaces/neighbor.js`. `game.js` 는 배선 줄만(memory: split-files-not-gamejs).
- `js/neighbors/scene.js` 는 `gameState` 라는 이름을 아예 쓰지 않는다. `js/spaces/neighbor.js` 가 쓰는 게임 상태는 `gameState.neighbors` · `gameState.hintsSeen.neighborPublic` 뿐(테스트로 잠금).
- DDL(마이그레이션·셀프테스트)은 **사용자가 SQL Editor 에서 실행**한다(Supabase MCP 는 읽기 전용).
- 배포는 4곳 동시(웹·토스·itch·📱Play) — 새 세이브 필드라 옛 클라이언트가 `neighbors` 를 버리는 창을 줄인다.
- 작업은 워크트리에서(`git switch -c feat/neighbor-village main` 처럼 기준 명시, memory: worktree-pitfalls). 워크트리엔 `.env` 가 없으니 실측 때 루트 `.env` 를 심링크.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## Spec deviations (코드를 읽고 바꾼 것 — 근거)

1. **`PART_COLORS` 를 쓸 수 없다** — `js/game.js:1387` 의 `PART_COLORS()` 는 export 되지 않았고, 0번 색을 **내 `houseGroup`** 에서 읽는 클로저다. `scene.js` 에 같은 규칙(0번 = 그 모델 기본색, 1~4 = `ROOF/WALL/DOOR_COLORS` 공용 팔레트)의 `paintHouse(root, style)` 를 둔다. 기본색 기록·밤 창문 등록은 기존 `prepHouseMeshes`(`js/spaces/house.js:250`)를 그대로 쓴다.
2. **집 1~2단계 모델이 없다** — `buildHouseModel` 은 3~7단계만 돌려주고(`js/house/index.js:34`), 데크·통나무 벽은 `buildHouseStage`(`js/spaces/house.js:153`)가 전역 `houseGroup` 에 직접 붙인다. `scene.js` 의 `earlyHouse(stage)` 가 같은 치수로 따로 짓는다.
3. **캐릭터·펫 재질은 내 캐릭터와 공유** — `makeCharacterPreview`(`js/game.js:3633`) 주석: disposeTree 하면 내 캐릭터가 검게 된다. 퇴장 시 집주인은 `disposeSkin` 만, 펫은 떼어 내기만 하고 나머지(집·구성품·장식·고정 세트)만 `disposeTree`.
4. **구성품 애니메이션은 정지** — `registerAddonAnims`(`js/spaces/house.js`)는 전역 목록을 갈아 끼워 내 집 연기가 멈춘다. 이웃 구성품은 움직이지 않는다.
5. **`sanitize.js` 는 OUTDOOR·ANIMALS·HOUSE_POS 를 import 할 수 없다** — `js/data/*.js` 는 places.js 를 거쳐 three 를, ANIMALS 는 game.js 를 끌어와 Node 테스트가 깨진다. 이 셋은 `ctx` 로 주입받고, 순수 모듈(`house/addons.js`·`cosmetics/catalog.js`·`pet/rules.js`·`house-stage7.js`)만 import 한다.
6. **API 는 광장 패턴** — supabase 클라이언트가 `supabase-client.js` 안에 갇혀 있어 `neighborRpc(fn, args)` 래퍼를 거기 두고, `js/neighbors/api.js` 는 주입형 순수 팩토리, `js/neighbors/net.js` 가 실제 의존성을 묶는다(`js/plaza/progress.js`·`net.js` 와 같은 구조).
7. **RPC 응답 모양** — `neighbors_today` 는 `{ ok, list, rewarded_today }` 로 감싼다. 토글 초기값을 읽을 RPC 가 스펙에 없어 `my_visitors` 가 `is_public` 도 돌려준다. `total` 은 서로 다른 방문자 수(`count(distinct visitor)`), 목록도 방문자당 최신 1건.
8. **프로필 행** — 아직 `village_profiles` 행이 없는 계정은 "공개"로 본다(`coalesce(is_public, true)`, 기본값과 같음). `neighbors_today` 가 뽑힌 3명의 행을 그 자리에서 만들어 `public_id` 를 붙인다.
9. **이유 코드 추가** — `neighbor_react` 는 스펙의 `dup·login·private·self·not_found` 에 더해 `auth`(토큰 없음)·`emoji`(목록 밖)를 낸다. `neighbor_load_fail.stage` 에 `visitors`·`toggle` 을 더한다.
10. **`via=map` 은 아직 없다** — 전체 지도에는 장소를 눌러 실행하는 경로가 없다(`index.html` worldmap 은 보기 전용). `neighbors_open.via` 는 지금 `sign` 만 나간다.
11. **`coop.built` 는 내보내지만 그리지 않는다** — 닭장은 `COOP(-4.5, 11.5)` 로 집 터에서 20 떨어져 앞마당(반경 14) 밖이다. 2단계 대비로 값만 둔다.
12. **알림 기간** — 승인 문구 `어제부터 지금까지` 가 거짓이 되지 않게 조회 시작 = `max(seenAt, KST 어제 00:00)`.
13. **이웃 장식엔 충돌체가 없다** — 집·집주인만 막는다(구경 공간이라 걸려 넘어질 이유가 없다).
14. **집 단계 이름** — 4~7단계는 `EXPANSIONS`(house-cost.js) 이름, 1~2단계는 `STAGE_NAMES`, 3단계는 새 문구 `🏠 코티지`(검수 대상).
15. **새로고침 위치** — 이웃 공간에서 저장되면 `playerPos` 를 z=700 이 아니라 팻말 앞으로 적는다(`getGameState`). 안 그러면 마을 반경 42 클램프에 끌려 (0,42) 로 튄다.
16. **UI 는 `ui.js` 가 DOM·CSS 를 직접 만든다**(광장 `js/plaza/ui.js` 패턴). `index.html` 에는 ⚙️ 설정 버튼 한 줄과 미니맵 라벨·바닥색만 더한다.
17. **실패 토스트는 기존 문구 재사용** — `연결이 불안정해요. 잠시 후 다시 시도해 주세요.`(`js/i18n-en.js:472`). 비공개로 바뀐 이웃·없는 이웃도 같은 토스트(목록은 다음에 열 때 다시 받는다).
18. **비공개 전환 지연** — showcase 는 엣지 캐시 10분이라 끈 뒤 최대 10분은 이미 받은 사람에게 보일 수 있다(후보 목록에선 즉시 빠진다). 개인정보처리방침 문단에 "끄면 곧바로 목록에서 빠지고 임시 사본은 10분 안에 사라진다"로 적는다.

**열린 질문(사용자 확인)**: ① 8장 done 문구 확정 ② 미검수 문구·영어 ③ 이웃 팻말 좌표 (-4, 25)(남쪽 🍄숲과 🌟계곡 사이) 승인 ④ 토스 UGC 조항 확인 결과.

---

## File Structure

| 경로 | 종류 | 역할 |
|---|---|---|
| `sql/migrations/migrate_neighbors.sql` | Create | 테이블 2·RLS·헬퍼 6·RPC 5·grant |
| `sql/tests/neighbors_selftest.sql` | Create | 가짜 계정으로 규칙 검증 후 rollback |
| `functions/api/neighbor.js` | Create | showcase 프록시 + 엣지 캐시 600초 |
| `worker/index.js` | Modify | import + `/api/neighbor` 라우트 |
| `scripts/serve.py` | Modify | `serve_neighbor` 미러 |
| `js/supabase-client.js` | Modify | `neighborRpc(fn, args)` |
| `js/neighbors/sanitize.js` | Create | showcase 응답 검증(순수) |
| `js/neighbors/rules.js` | Create | 상수·라벨·보상·알림·세이브 규칙(순수) |
| `js/neighbors/track.js` | Create | GA4 이벤트 7종 빌더(순수) |
| `js/neighbors/api.js` | Create | RPC·fetch 주입형 팩토리(순수) |
| `js/neighbors/net.js` | Create | 실제 의존성 바인딩 |
| `js/neighbors/ui.js` | Create | 오늘의 이웃(A) · 말풍선(C) · 알림(A) · 상단 줄·나가기 · 설정 토글 |
| `js/neighbors/scene.js` | Create | 이웃 공간 짓기·치우기 |
| `js/spaces/neighbor.js` | Create | 입장·퇴장·반응·팻말·부팅 알림·토글 |
| `js/data/places.js` | Modify | `NEIGHBOR`·`NEIGHBOR_R`·`NEIGHBOR_GATE` |
| `js/data/tools.js` | Modify | `ZONE_PAGE.neighbor = 'none'` |
| `js/shadow-scope.js` | Modify | `OUT_OF_REACH_FLAGS` + `atNeighbor` |
| `js/game.js` | Modify | 공간 플래그·배선·세이브·부팅 |
| `js/spaces/doors.js` | Modify | 팻말 프롬프트·공간 안 나가기·`inVillage2` |
| `js/spaces/outdoor-decor.js` | Modify | `outdoorZone` 에서 제외 |
| `js/story/chapters.js` · `js/story/rules.js` | Modify | 8장 해제 |
| `js/i18n-en.js` | Modify | 영어 |
| `index.html` | Modify | 설정 버튼·미니맵 라벨/바닥색 |
| `pages/privacy.html` | Modify | 공개 항목 문단 |
| `guide/guide.html` · `guide/guide-en.html` | Modify | "4장" → 8장 |
| `tests/neighbor-route.test.mjs` 외 10개 | Create | 아래 각 Task |
| `tests/shadow-scope.test.mjs` · `tests/story-chapters.test.mjs` | Modify | 새 공간·8장 |

---

### Task 0: 워크트리 + dev docs

**Files:**
- Create: `dev/active/neighbor-village/neighbor-village-plan.md`, `neighbor-village-context.md`, `neighbor-village-tasks.md` (CLAUDE.md Dev Docs 규칙 — 디렉터리는 시안 때문에 이미 있다)

- [ ] **Step 1:** 다른 세션이 루트를 쓰는지 `ListAgents` 로 보고, `git worktree add ../calm_forest-neighbor -b feat/neighbor-village main` → `git -C ../calm_forest-neighbor log --oneline main..HEAD` 가 비어 있는지 확인.
- [ ] **Step 2:** 워크트리에 `ln -s ../calm_forest/.env .env`(serve.py Supabase 프록시용 — `.gitignore` 에 `.env` 가 있는지 먼저 확인, 커밋 금지).
- [ ] **Step 3:** dev docs 3종 작성 — plan 은 이 문서 링크 + 요약, context 는 "Last Updated: <시각>" + 핵심 파일 표(File Structure 그대로) + Spec deviations 18개 + 열린 질문, tasks 는 Task 0~11 체크리스트.
- [ ] **Step 4:** 기준선 `npm test` → FAIL 0 확인(실패가 있으면 이 작업 전 상태로 기록하고 원인 메모).
- [ ] **Step 5:** 커밋

```bash
git add dev/active/neighbor-village/neighbor-village-*.md
git commit -m "docs: 🏡 이웃 마을 dev docs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: SQL — 테이블·RLS·RPC 5종 + 셀프테스트

**Files:**
- Create: `sql/tests/neighbors_selftest.sql`
- Create: `sql/migrations/migrate_neighbors.sql`

**Interfaces:**
- Produces(SQL, 전부 `security definer`, `set search_path = public`):
  - `neighbors_today() → jsonb` `{ ok, list:[{public_id, nick, character, house_stage, decor_n, visited_today, reacted_emoji}] ×≤3, rewarded_today }` — authenticated(익명 포함)
  - `neighbor_showcase(p_public_id uuid) → jsonb | null` — anon·authenticated
  - `neighbor_react(p_public_id uuid, p_emoji text) → jsonb` `{ ok, reason, rewarded, rewarded_today }` — authenticated, 익명이면 `reason:'login'`
  - `my_visitors(p_since timestamptz) → jsonb` `{ ok, total, list:[{nick, character, emoji, at}] ×≤10, is_public }` — authenticated(비익명)
  - `set_village_public(p_on boolean) → jsonb` `{ ok, is_public }` — authenticated(비익명)
  - 내부 헬퍼(전 역할 revoke): `_nb_kst_today()`, `_nb_str(jsonb, int)`, `_nb_num(jsonb)`, `_nb_yard(jsonb)`, `_nb_candidates(uuid, date, int) → table(uid uuid, k text)`, `_nb_public_id(uuid) → uuid`

- [ ] **Step 1: 실패하는 셀프테스트 작성** — `sql/tests/neighbors_selftest.sql`

```sql
-- =============================================================
--  🏡 이웃 마을 RPC 자가 테스트 — 트랜잭션 안에서 가짜 계정을 만들고 마지막에 ROLLBACK
--  사용법: migrate_neighbors.sql 적용 뒤 SQL Editor 에 통째로 붙여 실행.
--          마지막에 NOTICE 'NEIGHBORS SELFTEST ALL PASS' 가 보이면 통과, 실패는 EXCEPTION 으로 멈춘다.
--  ⚠️ auth.users·game_saves 에 가짜 행(nb-selftest-*@example.invalid)을 넣는다 — 맨 끝 rollback 이 지운다.
--     중간에 EXCEPTION 으로 멈춰도 커밋된 문장이 없다. 끝나고 아래로 남은 게 없는지 확인할 것:
--     select count(*) from auth.users where email like 'nb-selftest-%';   -- 0
-- =============================================================
begin;

-- a 방문자 · b,f,g,h 공개 이웃 · c 비공개 · d 익명 · e 7일 넘게 안 들어옴 · i 집 0단계
create temp table nb_t (k text primary key, id uuid not null default gen_random_uuid()) on commit drop;
insert into nb_t (k) values ('a'), ('b'), ('c'), ('d'), ('e'), ('f'), ('g'), ('h'), ('i');

insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
select id, 'authenticated', 'authenticated', 'nb-selftest-' || k || '@example.invalid', k = 'd', now(), now() from nb_t;

insert into public.game_saves (user_id, state, updated_at)
select id,
  jsonb_build_object(
    'nickname', 'selftest-' || k, 'character', 'rabbit', 'houseStage', case when k = 'i' then 0 else 3 end,
    'inventory', jsonb_build_object('coins', 999), 'cashOwned', jsonb_build_array('secret_pack'),
    'cosmetics', jsonb_build_object('owned', jsonb_build_array('beanie'),
                                    'equipped', jsonb_build_object('head', 'beanie', 'neck', null, 'back', null, 'trail', null, 'skin', null)),
    'pet', jsonb_build_object('kind', 'leaf', 'name', 'SECRET_PET_NAME', 'works', 50, 'restUntil', 0),
    'houseStyle', jsonb_build_object('roof', 1, 'wall', 2, 'door', 0),
    'house', jsonb_build_object('style', null, 'addons', jsonb_build_array('chimney_smoke'),
                                'decor', jsonb_build_array(jsonb_build_object('id', 'bed', 'x', 0, 'z', 0))),
    'outdoor', jsonb_build_array(jsonb_build_object('id', 'flowerbed', 'x', -5, 'z', -5, 'rot', 1),
                                 jsonb_build_object('id', 'fence', 'x', 20, 'z', 20, 'rot', 0)),
    'workers', jsonb_build_array(jsonb_build_object('id', 'w1', 'name', 'SECRET_WORKER_NAME')),
    'coop', jsonb_build_object('built', true, 'fed', '2026-10-07')),
  case when k = 'e' then now() - interval '10 days' else now() end
from nb_t;

insert into public.village_profiles (user_id, is_public) select id, false from nb_t where k = 'c';

-- ① 후보 규칙 · 날짜 고정 정렬 · today 응답에 user_id 없음
do $$
declare
  a uuid; b uuid; c uuid; d uuid; e uuid; f uuid; g uuid; h uuid; i uuid; x uuid;
  v_day date := (now() at time zone 'Asia/Seoul')::date;
  full_list uuid[]; sorted uuid[]; top3 uuid[]; t1 jsonb; t2 jsonb;
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  select id into c from nb_t where k = 'c'; select id into d from nb_t where k = 'd';
  select id into e from nb_t where k = 'e'; select id into f from nb_t where k = 'f';
  select id into g from nb_t where k = 'g'; select id into h from nb_t where k = 'h';
  select id into i from nb_t where k = 'i';

  select array_agg(uid order by k) into full_list from public._nb_candidates(a, v_day, 100000);
  if not (b = any(full_list) and f = any(full_list) and g = any(full_list) and h = any(full_list)) then
    raise exception 'FAIL: 공개 이웃(b,f,g,h)이 후보에 없다'; end if;
  if a = any(full_list) then raise exception 'FAIL: 본인이 후보에 있다'; end if;
  if c = any(full_list) then raise exception 'FAIL: 비공개(c)가 후보에 있다'; end if;
  if d = any(full_list) then raise exception 'FAIL: 익명(d)이 후보에 있다'; end if;
  if e = any(full_list) then raise exception 'FAIL: 7일 넘게 안 들어온(e)이 후보에 있다'; end if;
  if i = any(full_list) then raise exception 'FAIL: 집 0단계(i)가 후보에 있다'; end if;

  select array_agg(u order by md5(a::text || v_day::text || u::text)) into sorted from unnest(full_list) u;
  if sorted <> full_list then raise exception 'FAIL: md5(caller‖day‖host) 정렬이 아니다'; end if;
  select array_agg(uid order by k) into top3 from public._nb_candidates(a, v_day, 3);
  if top3 <> full_list[1:3] then raise exception 'FAIL: 상위 3명이 아니다'; end if;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  t1 := public.neighbors_today();
  t2 := public.neighbors_today();
  if not (t1->>'ok')::boolean or jsonb_array_length(t1->'list') <> least(3, array_length(full_list, 1)) then
    raise exception 'FAIL today: %', t1; end if;
  if t1->'list' <> t2->'list' then raise exception 'FAIL: 같은 날 두 번 부르면 같은 3명이어야 한다'; end if;
  foreach x in array full_list || a loop
    if strpos(t1::text, x::text) > 0 then raise exception 'FAIL: today 응답에 user_id(%)가 있다', x; end if;
  end loop;
  raise notice 'candidate checks pass';
end $$;

-- ② showcase 허용 목록
do $$
declare a uuid; c uuid; d uuid; f uuid; pid uuid; sc jsonb; keys text[];
begin
  select id into a from nb_t where k = 'a'; select id into c from nb_t where k = 'c';
  select id into d from nb_t where k = 'd'; select id into f from nb_t where k = 'f';
  pid := public._nb_public_id(f);
  sc := public.neighbor_showcase(pid);
  if sc is null then raise exception 'FAIL: 공개 이웃 showcase 가 null'; end if;
  select array_agg(t.key order by t.key collate "C") into keys from jsonb_object_keys(sc) as t(key);
  if keys <> array['addons','character','coop','equipped','houseStage','houseStyle','nickname','outdoor','pet','style'] then
    raise exception 'FAIL keys: %', keys; end if;
  if strpos(sc::text, f::text) > 0 then raise exception 'FAIL: showcase 에 user_id 가 있다'; end if;
  if strpos(sc::text, 'inventory') > 0 or strpos(sc::text, 'cashOwned') > 0 or strpos(sc::text, 'owned') > 0
     or strpos(sc::text, 'SECRET_PET_NAME') > 0 or strpos(sc::text, 'SECRET_WORKER_NAME') > 0
     or strpos(sc::text, '"decor"') > 0 or strpos(sc::text, '"fed"') > 0 then
    raise exception 'FAIL: 허용 목록 밖 값이 나갔다: %', sc; end if;
  if jsonb_array_length(sc->'outdoor') <> 1 or sc->'outdoor'->0->>'id' <> 'flowerbed' then
    raise exception 'FAIL: 앞마당 반경 14 필터: %', sc->'outdoor'; end if;
  if sc->'pet'->>'kind' <> 'leaf' or (sc->'pet'->>'works')::int <> 50 or (sc->'pet') ? 'name' then
    raise exception 'FAIL pet: %', sc->'pet'; end if;
  if public.neighbor_showcase(public._nb_public_id(c)) is not null then raise exception 'FAIL: 비공개 showcase'; end if;
  if public.neighbor_showcase(public._nb_public_id(d)) is not null then raise exception 'FAIL: 익명 showcase'; end if;
  if public.neighbor_showcase(gen_random_uuid()) is not null then raise exception 'FAIL: 없는 id 가 null 이 아니다'; end if;
  -- 비로그인(anon 역할)도 볼 수 있다 — Worker 가 anon 키로 부른다
  execute 'set local role anon';
  sc := public.neighbor_showcase(pid);
  execute 'reset role';
  if sc is null then raise exception 'FAIL: anon 이 showcase 를 못 본다'; end if;
  raise notice 'showcase checks pass';
end $$;

-- ③ 반응: 하루 1회 · 보상 3회 상한 · 비공개/본인/없음/이모지 · KST 날짜 · 익명 거절 · anon 실행 불가
do $$
declare a uuid; b uuid; c uuid; d uuid; f uuid; g uuid; h uuid; r jsonb; t jsonb; n int; vday date;
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  select id into c from nb_t where k = 'c'; select id into d from nb_t where k = 'd';
  select id into f from nb_t where k = 'f'; select id into g from nb_t where k = 'g';
  select id into h from nb_t where k = 'h';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);

  r := public.neighbor_react(public._nb_public_id(b), 'heart');
  if not (r->>'ok')::boolean or not (r->>'rewarded')::boolean or (r->>'rewarded_today')::int <> 1 then raise exception 'FAIL react b: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(b), 'star');
  if r->>'reason' <> 'dup' then raise exception 'FAIL dup: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(f), 'wave');
  r := public.neighbor_react(public._nb_public_id(g), 'flower');
  if not (r->>'rewarded')::boolean or (r->>'rewarded_today')::int <> 3 then raise exception 'FAIL 3rd: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(h), 'star');
  if not (r->>'ok')::boolean or (r->>'rewarded')::boolean or (r->>'rewarded_today')::int <> 3 then raise exception 'FAIL cap: %', r; end if;
  t := public.neighbors_today();
  if (t->>'rewarded_today')::int <> 3 then raise exception 'FAIL today rewarded_today: %', t; end if;

  r := public.neighbor_react(public._nb_public_id(c), 'heart');
  if r->>'reason' <> 'private' then raise exception 'FAIL private: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(a), 'heart');
  if r->>'reason' <> 'self' then raise exception 'FAIL self: %', r; end if;
  r := public.neighbor_react(gen_random_uuid(), 'heart');
  if r->>'reason' <> 'not_found' then raise exception 'FAIL not_found: %', r; end if;
  r := public.neighbor_react(public._nb_public_id(b), 'poop');
  if r->>'reason' <> 'emoji' then raise exception 'FAIL emoji: %', r; end if;

  select day into vday from public.village_visits where visitor = a and host = b;
  if vday <> (now() at time zone 'Asia/Seoul')::date then raise exception 'FAIL: KST 날짜가 아니다: %', vday; end if;

  -- 🔐 익명(게스트)은 거절되고 행도 안 생긴다
  perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  r := public.neighbor_react(public._nb_public_id(b), 'heart');
  if r->>'reason' <> 'login' then raise exception 'FAIL anon react: %', r; end if;
  select count(*) into n from public.village_visits where visitor = d;
  if n <> 0 then raise exception 'FAIL: 익명 반응이 행을 만들었다'; end if;
  r := public.set_village_public(false);
  if r->>'reason' <> 'login' then raise exception 'FAIL anon toggle: %', r; end if;
  r := public.my_visitors(now() - interval '1 day');
  if r->>'reason' <> 'login' then raise exception 'FAIL anon visitors: %', r; end if;

  -- 비로그인(anon 역할)은 반응 RPC 실행 권한 자체가 없다
  execute 'set local role anon';
  begin
    r := public.neighbor_react(gen_random_uuid(), 'heart');
    raise exception 'FAIL: anon 이 neighbor_react 를 실행했다';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  raise notice 'react checks pass';
end $$;

-- ④ 다녀간 이웃 · 공개 끄기
do $$
declare a uuid; b uuid; r jsonb; full_list uuid[];
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  r := public.my_visitors(now() - interval '1 hour');
  if (r->>'total')::int <> 1 or r->'list'->0->>'emoji' <> 'heart' or r->'list'->0->>'nick' <> 'selftest-a'
     or not (r->>'is_public')::boolean then raise exception 'FAIL visitors: %', r; end if;
  if strpos(r::text, a::text) > 0 then raise exception 'FAIL: visitors 에 방문자 user_id 가 있다'; end if;
  r := public.my_visitors(now() + interval '1 hour');
  if (r->>'total')::int <> 0 then raise exception 'FAIL visitors since: %', r; end if;

  r := public.set_village_public(false);
  if not (r->>'ok')::boolean or (r->>'is_public')::boolean then raise exception 'FAIL toggle: %', r; end if;
  select array_agg(uid) into full_list from public._nb_candidates(a, (now() at time zone 'Asia/Seoul')::date, 100000);
  if b = any(full_list) then raise exception 'FAIL: 끈 뒤에도 후보에 있다'; end if;
  if public.neighbor_showcase(public._nb_public_id(b)) is not null then raise exception 'FAIL: 끈 뒤에도 showcase'; end if;
  r := public.my_visitors(now() - interval '1 hour');
  if (r->>'is_public')::boolean then raise exception 'FAIL: is_public 이 안 바뀌었다: %', r; end if;
  raise notice 'visitors/toggle checks pass';
end $$;

-- ⑤ 직접 쓰기 차단(authenticated 역할)
do $$
declare a uuid; b uuid; blocked boolean := false;
begin
  select id into a from nb_t where k = 'a'; select id into b from nb_t where k = 'b';
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.village_visits (visitor, host, day, emoji) values (a, b, current_date - 1, 'heart');
  exception when others then blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'FAIL: village_visits 직접 insert 가 통과했다'; end if;
  raise notice 'NEIGHBORS SELFTEST ALL PASS';
end $$;

rollback;
```

- [ ] **Step 2: 사용자에게 실패 확인 요청**

사용자가 SQL Editor 에 `sql/tests/neighbors_selftest.sql` 을 붙여 실행.
Expected: FAIL — `relation "public.village_profiles" does not exist`(테이블이 아직 없다). 에이전트는 실행하지 않는다(MCP 읽기 전용).

- [ ] **Step 3: 마이그레이션 작성** — `sql/migrations/migrate_neighbors.sql`

```sql
-- =============================================================
--  🏡 이웃 마을 구경하기 1단계 — 공개 프로필·방문 원장·RPC 5종
--  ------------------------------------------------------------
--  ▶ 두 테이블 모두 RLS on · 정책 없음 = 직접 접근 금지. 읽기·쓰기는 전부 아래 SECURITY DEFINER RPC 로만.
--  ▶ 밖으로 나가는 식별자는 village_profiles.public_id(무작위 uuid) 하나뿐. user_id 는 어떤 응답에도 없다.
--  ▶ 남의 세이브는 neighbor_showcase 가 **허용 목록 키를 하나씩 골라** 만든 jsonb 로만 나간다
--    (`state - '...'` 식 제외 목록 금지 — 새 세이브 필드가 자동 노출되는 사고 방지).
--  ▶ 숫자 단일 출처: 보상 상한 3 · 앞마당 반경 14(집 터 -8,-8) · 장식 40 · 알림 10.
--    js/neighbors/rules.js·sanitize.js 와의 일치는 tests/neighbors-sync.test.mjs 가 검사한다.
--  스펙: docs/superpowers/specs/2026-10-07-neighbor-village-design.md
--  적용: Supabase SQL Editor 에서 1회 실행(멱등) → sql/tests/neighbors_selftest.sql 로 검증
-- =============================================================
begin;

create table if not exists public.village_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  public_id  uuid not null unique default gen_random_uuid(),   -- 밖으로 나가는 유일한 식별자
  is_public  boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.village_visits (
  id         bigserial primary key,
  visitor    uuid not null references auth.users(id) on delete cascade,
  host       uuid not null references auth.users(id) on delete cascade,
  day        date not null,                                     -- KST 날짜
  emoji      text not null check (emoji in ('wave','heart','flower','star')),
  rewarded   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (visitor, host, day),
  check (visitor <> host)
);
create index if not exists village_visits_host_created on public.village_visits (host, created_at desc);
create index if not exists village_visits_visitor_day on public.village_visits (visitor, day);

alter table public.village_profiles enable row level security;
alter table public.village_visits   enable row level security;
revoke all on table public.village_profiles from public, anon, authenticated;
revoke all on table public.village_visits   from public, anon, authenticated;
-- 정책 없음 = 직접 select/insert/update/delete 차단

-- ── 헬퍼(내부 전용) ──
create or replace function public._nb_kst_today()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Seoul')::date;
$$;

-- 짧은 문자열만 통과(아니면 json null) — 장착 id·캐릭터·스타일처럼 짧은 식별자 자리
create or replace function public._nb_str(p jsonb, p_max int default 40)
returns jsonb language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p) = 'string' and length(p #>> '{}') <= p_max then p else 'null'::jsonb end;
$$;

create or replace function public._nb_num(p jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select case when jsonb_typeof(p) = 'number' then p else 'null'::jsonb end;
$$;

-- 앞마당 장식만 — 집 터(-8,-8) 반경 14, 최대 40. js/data/places.js HOUSE_POS · js/neighbors/sanitize.js YARD_R·DECOR_MAX 와 같아야 한다
create or replace function public._nb_yard(p_state jsonb)
returns jsonb language sql immutable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', y.o->'id', 'x', y.o->'x', 'z', y.o->'z',
           'rot', case when jsonb_typeof(y.o->'rot') = 'number' then y.o->'rot' else '0'::jsonb end) order by y.ord), '[]'::jsonb)
  from (
    select e.o, e.ord
    from jsonb_array_elements(case when jsonb_typeof(p_state->'outdoor') = 'array' then p_state->'outdoor' else '[]'::jsonb end)
         with ordinality as e(o, ord)
    where jsonb_typeof(e.o) = 'object' and jsonb_typeof(e.o->'id') = 'string' and length(e.o->>'id') <= 40
      and jsonb_typeof(e.o->'x') = 'number' and jsonb_typeof(e.o->'z') = 'number'
      and ((e.o->>'x')::float8 + 8) ^ 2 + ((e.o->>'z')::float8 + 8) ^ 2 <= 14 * 14
    order by e.ord
    limit 40
  ) y;
$$;

-- 후보 = 공개(행 없으면 공개) + 비익명 + 7일 안에 저장 + 집 1단계 이상 + 본인 제외. 하루 고정 정렬(리롤 불가)
create or replace function public._nb_candidates(p_caller uuid, p_day date, p_limit int default 3)
returns table (uid uuid, k text)
language sql stable security definer set search_path = public as $$
  select gs.user_id, md5(p_caller::text || p_day::text || gs.user_id::text)
  from game_saves gs
  join auth.users u on u.id = gs.user_id
  left join village_profiles vp on vp.user_id = gs.user_id
  where gs.user_id <> p_caller
    and coalesce(u.is_anonymous, false) = false
    and coalesce(vp.is_public, true)
    and gs.updated_at >= now() - interval '7 days'
    and case when jsonb_typeof(gs.state->'houseStage') = 'number' then (gs.state->>'houseStage')::numeric >= 1 else false end
  order by 2
  limit greatest(0, least(coalesce(p_limit, 3), 100000));
$$;

create or replace function public._nb_public_id(p_user uuid)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare v uuid;
begin
  insert into village_profiles (user_id) values (p_user) on conflict (user_id) do nothing;
  select public_id into v from village_profiles where user_id = p_user;
  return v;
end $$;

-- ── RPC ──
create or replace function public.neighbors_today()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_list jsonb;
  v_rew  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  -- 뽑힌 이웃의 프로필 행을 먼저 만든다 — public_id 가 있어야 밖으로 내보낼 수 있다
  insert into village_profiles (user_id) select c.uid from _nb_candidates(v_uid, v_day, 3) c
  on conflict (user_id) do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', vp.public_id,
           'nick', left(coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자'), 16),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'house_stage', (gs.state->>'houseStage')::numeric::int,
           'decor_n', jsonb_array_length(_nb_yard(gs.state)),
           'visited_today', vv.emoji is not null,
           'reacted_emoji', vv.emoji
         ) order by c.k), '[]'::jsonb)
    into v_list
  from _nb_candidates(v_uid, v_day, 3) c
  join game_saves gs on gs.user_id = c.uid
  join village_profiles vp on vp.user_id = c.uid
  left join village_visits vv on vv.visitor = v_uid and vv.host = c.uid and vv.day = v_day;
  select count(*) into v_rew from village_visits where visitor = v_uid and day = v_day and rewarded;
  return jsonb_build_object('ok', true, 'list', v_list, 'rewarded_today', v_rew);
end $$;

create or replace function public.neighbor_showcase(p_public_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid; v_pub boolean; s jsonb;
begin
  if p_public_id is null then return null; end if;
  select user_id, is_public into v_user, v_pub from village_profiles where public_id = p_public_id;
  if not found or not v_pub then return null; end if;
  if exists (select 1 from auth.users u where u.id = v_user and coalesce(u.is_anonymous, false)) then return null; end if;
  select state into s from game_saves where user_id = v_user;
  if s is null or jsonb_typeof(s) <> 'object' then return null; end if;
  -- ⚠️ 허용 목록 — 키를 하나씩 고른다. 여기 없는 세이브 필드는 절대 나가지 않는다
  return jsonb_build_object(
    'nickname',   to_jsonb(left(coalesce(nullif(s->>'nickname', ''), '이름 없는 여행자'), 16)),
    'character',  _nb_str(s->'character', 16),
    'equipped',   jsonb_build_object(
                    'head',  _nb_str(s #> '{cosmetics,equipped,head}'),
                    'neck',  _nb_str(s #> '{cosmetics,equipped,neck}'),
                    'back',  _nb_str(s #> '{cosmetics,equipped,back}'),
                    'trail', _nb_str(s #> '{cosmetics,equipped,trail}'),
                    'skin',  _nb_str(s #> '{cosmetics,equipped,skin}')),
    'pet',        case when jsonb_typeof(s->'pet') = 'object'
                    then jsonb_build_object('kind', _nb_str(s #> '{pet,kind}', 16), 'works', _nb_num(s #> '{pet,works}'))
                    else 'null'::jsonb end,
    'houseStage', _nb_num(s->'houseStage'),
    'houseStyle', jsonb_build_object('roof', _nb_num(s #> '{houseStyle,roof}'),
                                     'wall', _nb_num(s #> '{houseStyle,wall}'),
                                     'door', _nb_num(s #> '{houseStyle,door}')),
    'style',      _nb_str(s #> '{house,style}', 16),
    'addons',     (select coalesce(jsonb_agg(q.v), '[]'::jsonb) from (
                     select e.v from jsonb_array_elements(case when jsonb_typeof(s #> '{house,addons}') = 'array'
                                                               then s #> '{house,addons}' else '[]'::jsonb end) as e(v)
                     where jsonb_typeof(e.v) = 'string' and length(e.v #>> '{}') <= 40 limit 40) q),
    'outdoor',    _nb_yard(s),
    'coop',       jsonb_build_object('built', coalesce(s #> '{coop,built}' = 'true'::jsonb, false))
  );
end $$;

create or replace function public.neighbor_react(p_public_id uuid, p_emoji text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_host uuid;
  v_pub  boolean;
  v_cnt  int;
  v_rew  boolean;
  v_id   bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_emoji is null or p_emoji not in ('wave', 'heart', 'flower', 'star') then return jsonb_build_object('ok', false, 'reason', 'emoji'); end if;
  select user_id, is_public into v_host, v_pub from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_host = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if not v_pub then return jsonb_build_object('ok', false, 'reason', 'private'); end if;
  perform pg_advisory_xact_lock(hashtext('nb:' || v_uid::text));   -- 동시 반응으로 상한 3을 넘지 않게
  select count(*) into v_cnt from village_visits where visitor = v_uid and day = v_day and rewarded;
  v_rew := v_cnt < 3;
  insert into village_visits (visitor, host, day, emoji, rewarded) values (v_uid, v_host, v_day, p_emoji, v_rew)
  on conflict (visitor, host, day) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'dup', 'rewarded', false, 'rewarded_today', v_cnt);
  end if;
  return jsonb_build_object('ok', true, 'reason', 'ok', 'rewarded', v_rew,
                            'rewarded_today', v_cnt + case when v_rew then 1 else 0 end);
end $$;

create or replace function public.my_visitors(p_since timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_since timestamptz := coalesce(p_since, now() - interval '2 days');
  v_total int;
  v_list  jsonb;
  v_pub   boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  insert into village_profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  select is_public into v_pub from village_profiles where user_id = v_uid;
  select count(distinct visitor) into v_total from village_visits where host = v_uid and created_at > v_since;
  select coalesce(jsonb_agg(jsonb_build_object(
           'nick', left(coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자'), 16),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'emoji', x.emoji, 'at', x.created_at) order by x.created_at desc), '[]'::jsonb)
    into v_list
  from (
    select dd.visitor, dd.emoji, dd.created_at from (
      select distinct on (v.visitor) v.visitor, v.emoji, v.created_at
      from village_visits v where v.host = v_uid and v.created_at > v_since
      order by v.visitor, v.created_at desc
    ) dd order by dd.created_at desc limit 10
  ) x
  left join game_saves gs on gs.user_id = x.visitor;
  return jsonb_build_object('ok', true, 'total', v_total, 'list', v_list, 'is_public', v_pub);
end $$;

create or replace function public.set_village_public(p_on boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_on is null then return jsonb_build_object('ok', false, 'reason', 'value'); end if;
  insert into village_profiles (user_id, is_public) values (v_uid, p_on)
  on conflict (user_id) do update set is_public = excluded.is_public, updated_at = now();
  return jsonb_build_object('ok', true, 'is_public', p_on);
end $$;

-- ── 권한 ──
revoke all on function public._nb_kst_today() from public, anon, authenticated;
revoke all on function public._nb_str(jsonb, int) from public, anon, authenticated;
revoke all on function public._nb_num(jsonb) from public, anon, authenticated;
revoke all on function public._nb_yard(jsonb) from public, anon, authenticated;
revoke all on function public._nb_candidates(uuid, date, int) from public, anon, authenticated;
revoke all on function public._nb_public_id(uuid) from public, anon, authenticated;
revoke all on function public.neighbors_today() from public, anon;
revoke all on function public.neighbor_showcase(uuid) from public;
revoke all on function public.neighbor_react(uuid, text) from public, anon;
revoke all on function public.my_visitors(timestamptz) from public, anon;
revoke all on function public.set_village_public(boolean) from public, anon;
grant execute on function public.neighbors_today() to authenticated;
grant execute on function public.neighbor_showcase(uuid) to anon, authenticated;
grant execute on function public.neighbor_react(uuid, text) to authenticated;
grant execute on function public.my_visitors(timestamptz) to authenticated;
grant execute on function public.set_village_public(boolean) to authenticated;

commit;

-- ── 검증 ── sql/tests/neighbors_selftest.sql
```

- [ ] **Step 4: 사용자 실행 요청 → 통과 확인**

사용자: SQL Editor 에서 `migrate_neighbors.sql` 실행 → 이어서 `neighbors_selftest.sql` 실행.
Expected: NOTICE `candidate checks pass` · `showcase checks pass` · `react checks pass` · `visitors/toggle checks pass` · `NEIGHBORS SELFTEST ALL PASS`. 이어서 `select count(*) from auth.users where email like 'nb-selftest-%';` → 0.
에이전트는 Supabase MCP(읽기 전용)로 `select proname from pg_proc where proname in ('neighbors_today','neighbor_showcase','neighbor_react','my_visitors','set_village_public');` → 5행 확인.

- [ ] **Step 5: 커밋**

```bash
git add sql/migrations/migrate_neighbors.sql sql/tests/neighbors_selftest.sql
git commit -m "feat: 🏡 이웃 마을 SQL — 공개 프로필·방문 원장·RPC 5종 + 셀프테스트

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Worker `/api/neighbor` + serve.py 미러

**Files:**
- Create: `functions/api/neighbor.js`
- Modify: `worker/index.js:21`(import 추가 — `plaza` import 아래), `worker/index.js:~168`(`/api/plaza` 블록 아래 라우트)
- Modify: `scripts/serve.py:683`(do_GET 분기), `scripts/serve.py:~800`(serve_plaza 아래 serve_neighbor)
- Test: `tests/neighbor-route.test.mjs`

**Interfaces:**
- Consumes: `neighbor_showcase(p_public_id)` (Task 1)
- Produces: `onRequestGet({ request, env, waitUntil }) → Response` — 400 `{error:'bad id'}` · 200 showcase(cache 600) · 404 `{error:'not_found'}`(캐시 없음) · 502 `{error:'upstream'}`

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbor-route.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('이웃 API 경로 3벌이 같다 (worker 라우트 · serve.py 미러)', () => {
  // 이 저장소는 worker 라우트 미등록으로 404 낸 이력이 있다(dex-notes · daily-quests).
  const w = src('worker/index.js');
  assert.match(w, /import \{ onRequestGet as neighbor \} from '\.\.\/functions\/api\/neighbor\.js';/);
  assert.match(w, /if \(pathname === '\/api\/neighbor'\) \{[\s\S]{0,200}return await neighbor\(\{ request, env, waitUntil: ctx\.waitUntil\.bind\(ctx\) \}\);/);
  const py = src('scripts/serve.py');
  assert.ok(py.includes("== '/api/neighbor'"), 'scripts/serve.py do_GET 분기가 없다');
  assert.ok(py.includes("'/rest/v1/rpc/neighbor_showcase'"), 'serve.py 미러가 neighbor_showcase 를 안 부른다');
});

test('Worker 핸들러: id 형식 검사', async () => {
  const { onRequestGet } = await import('../functions/api/neighbor.js');
  for (const bad of ['', 'abc', '../x', `${ID}x`]) {
    const r = await onRequestGet({ request: new Request(`https://x/api/neighbor?id=${encodeURIComponent(bad)}`), env: {} });
    assert.equal(r.status, 400, bad);
  }
});

test('Worker 핸들러: 200 은 10분 캐시 + RPC 인자, null 은 404·캐시 안 함, 업스트림 실패는 502', async () => {
  const { onRequestGet } = await import('../functions/api/neighbor.js');
  const calls = [], puts = [];
  globalThis.caches = { default: { match: async () => null, put: async (k) => { puts.push(k.url); } } };
  const realFetch = globalThis.fetch;
  let body = '{"nickname":"n","houseStage":3}', status = 200;
  globalThis.fetch = async (url, init) => { calls.push({ url, body: init.body, headers: init.headers }); return new Response(body, { status }); };
  const env = { SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'k' };
  const run = () => onRequestGet({ request: new Request(`https://x/api/neighbor?id=${ID.toUpperCase()}`), env, waitUntil: (p) => p });
  try {
    const ok = await run();
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'public, max-age=600');
    assert.equal(calls[0].url, 'https://sb/rest/v1/rpc/neighbor_showcase');
    assert.deepEqual(JSON.parse(calls[0].body), { p_public_id: ID });   // 소문자로 정규화
    assert.equal(calls[0].headers.authorization, 'Bearer k');
    assert.equal(puts.length, 1);
    body = 'null';
    const nf = await run();
    assert.equal(nf.status, 404);
    assert.equal(nf.headers.get('cache-control'), null);
    assert.equal(puts.length, 1, '404 를 캐시하면 다시 켠 마을이 10분간 안 보인다');
    body = 'oops'; status = 500;
    const up = await run();
    assert.equal(up.status, 502);
  } finally { globalThis.fetch = realFetch; delete globalThis.caches; }
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `node --test tests/neighbor-route.test.mjs`
Expected: FAIL — worker 정규식 불일치 + `Cannot find module '../functions/api/neighbor.js'`

- [ ] **Step 3: `functions/api/neighbor.js` 작성**

```js
// =============================================================
//  🏡 GET /api/neighbor?id=<public_id>
//  ------------------------------------------------------------
//  Supabase RPC(public.neighbor_showcase) 프록시 + 엣지 캐시 10분.
//  - 응답은 SQL 이 허용 목록 키만 골라 만든 jsonb — 여기서 더 붙이거나 빼지 않는다
//  - null(비공개·익명·없음)은 404 이고 캐시하지 않는다(다시 켠 마을이 10분 동안 안 보이면 안 된다)
//  - 시크릿 불필요: RPC 가 anon 실행 허용(security definer, user_id 미반환)
//  로컬 미러: scripts/serve.py serve_neighbor — 한쪽만 고치지 말 것
// =============================================================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TTL = 600;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const id = (url.searchParams.get('id') || '').toLowerCase();
  if (!UUID_RE.test(id)) return json({ error: 'bad id' }, 400);

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/neighbor?id=${id}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/neighbor_showcase`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_public_id: id }),
  });
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'neighbor_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return json({ error: 'upstream' }, 502);
  }
  const data = await r.json();
  if (!data) return json({ error: 'not_found' }, 404);
  const out = json(data, 200, { 'cache-control': `public, max-age=${TTL}` });
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
```

- [ ] **Step 4: `worker/index.js` 배선**

21행 `import { onRequestGet as plaza } from '../functions/api/plaza.js';` 아래:
```js
import { onRequestGet as neighbor } from '../functions/api/neighbor.js';
```
`/api/plaza` 블록(`return await plaza({ … });` + `}`) 바로 아래:
```js
  // 🏡 이웃 마을 구경 — Supabase RPC 프록시(엣지 캐시 10분, 비공개·없음은 404·캐시 안 함)
  if (pathname === '/api/neighbor') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await neighbor({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }
```

- [ ] **Step 5: `scripts/serve.py` 미러**

`do_GET` 의 `/api/plaza` 분기(683~685행) 아래:
```python
        if self.path.split('?')[0] == '/api/neighbor':
            self.serve_neighbor()
            return
```
`serve_plaza` 메서드 끝(`self.wfile.write(payload)`) 아래, `def do_POST` 위:
```python
    # ── 🏡 이웃 마을 구경 (functions/api/neighbor.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
    #    Supabase RPC(public.neighbor_showcase) 프록시. 로컬은 캐시 없이 매번 조회(개발 편의).
    def serve_neighbor(self):
        import urllib.parse as _up
        q = _up.parse_qs(_up.urlparse(self.path).query)
        pid = (q.get('id') or [''])[0].lower()
        if not re.match(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', pid):
            payload = json.dumps({'error': 'bad id'}).encode(); code = 400
        else:
            url = os.environ.get('SUPABASE_URL'); anon = os.environ.get('SUPABASE_ANON_KEY')
            body = json.dumps({'p_public_id': pid}).encode()
            req = urllib.request.Request(url + '/rest/v1/rpc/neighbor_showcase', data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'apikey': anon,
                                                  'Authorization': 'Bearer ' + anon})
            try:
                with urllib.request.urlopen(req, timeout=15, context=ssl_context()) as res:
                    data = json.loads(res.read() or b'null')
                if data is None:
                    payload = json.dumps({'error': 'not_found'}).encode(); code = 404
                else:
                    payload = json.dumps(data, ensure_ascii=False).encode(); code = 200
            except Exception as e:
                print(f'[neighbor] RPC 실패: {type(e).__name__}: {e}')
                payload = json.dumps({'error': 'upstream'}).encode(); code = 502
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
```

- [ ] **Step 6: 통과** — Run: `node --test tests/neighbor-route.test.mjs && python3 -c "import ast; ast.parse(open('scripts/serve.py').read())"` → PASS, 문법 OK

- [ ] **Step 7: 커밋**

```bash
git add functions/api/neighbor.js worker/index.js scripts/serve.py tests/neighbor-route.test.mjs
git commit -m "feat: 🏡 /api/neighbor — showcase 프록시(엣지 캐시 10분) + serve.py 미러

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 순수 모듈 — `sanitize.js` · `rules.js` + SQL 동기화 테스트

**Files:**
- Create: `js/neighbors/sanitize.js`, `js/neighbors/rules.js`
- Test: `tests/neighbors-sanitize.test.mjs`, `tests/neighbors-rules.test.mjs`, `tests/neighbors-sync.test.mjs`

**Interfaces:**
- Produces (sanitize.js):
  - `YARD_R = 14`, `DECOR_MAX = 40`, `COSMETIC_SLOTS = ['head','neck','back','trail','skin']`
  - `sanitizeShowcase(raw, ctx) → View | null` — `ctx = { outdoorIds:Set, animalIds:Set, fallbackAnimal:string, yard:{x,z} }`
  - `View = { nickname, character, equipped:{head,neck,back,trail,skin}, pet:{kind,stage}|null, houseStage:1..7, houseStyle:{roof,wall,door}, style:'modern'|'hanok'|null, addons:string[], outdoor:[{id,dx,dz,rot}] }`
- Produces (rules.js):
  - 상수 `REWARD_CAP=3`, `REWARD_COINS=5`, `NOTICE_MAX=10`, `HOST_TALK_R=2.6`, `EMOJI`, `EMOJI_IDS`, `FAIL_TOAST`
  - `houseLabel(stage) → string`, `pickerMeta(row) → string`, `rewardLine(n) → string`
  - `pickerRows(list, faceOf) → [{publicId, slot, face, nick, meta, done, go}]`
  - `hostSpot(stage, style, origin) → {x,z}`, `houseSolidR(stage) → number`
  - `reactOutcome(res) → { reason, reward, toast, bubble, rewardedToday }`
  - `visitorsSince(seenAt, now) → ms`, `noticeView(res, faceOf) → { title, rows:[{face,nick,emoji}], more, total }`
  - `neighborsDefault()`, `restoreNeighbors(v)`, `recordVisit(nb)`, `markSeen(nb, at)` — 전부 새 객체 반환(불변)

- [ ] **Step 1: 실패하는 테스트 3개**

`tests/neighbors-sanitize.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeShowcase, YARD_R, DECOR_MAX } from '../js/neighbors/sanitize.js';

const CTX = { outdoorIds: new Set(['fence', 'flowerbed', 'postlamp']), animalIds: new Set(['fox', 'rabbit']),
  fallbackAnimal: 'fox', yard: { x: -8, z: -8 } };
const raw = (o = {}) => ({
  nickname: '느긋한 토끼 #1093', character: 'rabbit',
  equipped: { head: 'beanie', neck: null, back: 'cape', trail: 'firefly', skin: null },
  pet: { kind: 'leaf', works: 50 }, houseStage: 6, houseStyle: { roof: 1, wall: 2, door: 0 }, style: null,
  addons: ['chimney_smoke'], outdoor: [{ id: 'flowerbed', x: -5, z: -5, rot: 1 }], coop: { built: true }, ...o,
});

test('정상 응답 → 그릴 뷰(앞마당 상대좌표·펫 단계)', () => {
  const v = sanitizeShowcase(raw(), CTX);
  assert.deepEqual(Object.keys(v).sort(), ['addons', 'character', 'equipped', 'houseStage', 'houseStyle', 'nickname', 'outdoor', 'pet', 'style']);
  assert.equal(v.nickname, '느긋한 토끼 #1093');
  assert.equal(v.character, 'rabbit');
  assert.deepEqual(v.equipped, { head: 'beanie', neck: null, back: 'cape', trail: 'firefly', skin: null });
  assert.deepEqual(v.pet, { kind: 'leaf', stage: 1 });   // GROW_NEED [0,40,140]
  assert.equal(v.houseStage, 6);
  assert.deepEqual(v.houseStyle, { roof: 1, wall: 2, door: 0 });
  assert.equal(v.style, null);
  assert.deepEqual(v.addons, ['chimney_smoke']);
  assert.deepEqual(v.outdoor, [{ id: 'flowerbed', dx: 3, dz: 3, rot: 1 }]);
});

test('모르는 id·NaN·문자열 좌표는 버린다', () => {
  const v = sanitizeShowcase(raw({ outdoor: [
    { id: 'rocket', x: -8, z: -8 }, { id: 'fence', x: 'a', z: -8 }, { id: 'fence', x: NaN, z: -8 },
    { id: 'fence', x: -8, z: Infinity }, null, 'fence', { id: 'fence', x: -8, z: -8, rot: 5 }, { id: 'fence', x: -8, z: -8, rot: 1.5 },
  ], addons: ['chimney_smoke', 'nope', 3, 'chimney_smoke'] }), CTX);
  assert.deepEqual(v.outdoor, [{ id: 'fence', dx: 0, dz: 0, rot: 1 }, { id: 'fence', dx: 0, dz: 0, rot: 0 }]);
  assert.deepEqual(v.addons, ['chimney_smoke']);
});

test(`반경 ${YARD_R} 경계 · 최대 ${DECOR_MAX}개`, () => {
  const edge = sanitizeShowcase(raw({ outdoor: [{ id: 'fence', x: -8 + YARD_R, z: -8 }, { id: 'fence', x: -8 + YARD_R + 0.01, z: -8 }] }), CTX);
  assert.equal(edge.outdoor.length, 1);
  const many = sanitizeShowcase(raw({ outdoor: Array.from({ length: 60 }, () => ({ id: 'fence', x: -8, z: -8 })) }), CTX);
  assert.equal(many.outdoor.length, DECOR_MAX);
});

test('장착: 슬롯이 다르거나 모르는 id 는 null', () => {
  const v = sanitizeShowcase(raw({ equipped: { head: 'cape', neck: 'nope', back: 'pack', trail: 7, skin: 'plush_doll' } }), CTX);
  assert.deepEqual(v.equipped, { head: null, neck: null, back: 'pack', trail: null, skin: 'plush_doll' });
});

test('펫·캐릭터·닉네임·색 인덱스 방어', () => {
  assert.equal(sanitizeShowcase(raw({ pet: { kind: 'dragon', works: 9 } }), CTX).pet, null);
  assert.deepEqual(sanitizeShowcase(raw({ pet: { kind: 'golem', works: 'x' } }), CTX).pet, { kind: 'golem', stage: 0 });
  assert.equal(sanitizeShowcase(raw({ character: 'dragon' }), CTX).character, 'fox');
  assert.equal(sanitizeShowcase(raw({ nickname: '   ' }), CTX).nickname, '이름 없는 여행자');
  assert.equal(sanitizeShowcase(raw({ nickname: '가'.repeat(30) }), CTX).nickname.length, 16);
  assert.deepEqual(sanitizeShowcase(raw({ houseStyle: { roof: 9, wall: -1, door: 'x' } }), CTX).houseStyle, { roof: 0, wall: 0, door: 0 });
});

test('7단계 스타일 정규화 · 6단계 이하는 null', () => {
  assert.equal(sanitizeShowcase(raw({ houseStage: 7, style: 'hanok' }), CTX).style, 'hanok');
  assert.equal(sanitizeShowcase(raw({ houseStage: 7, style: 'castle' }), CTX).style, 'modern');
  assert.equal(sanitizeShowcase(raw({ houseStage: 6, style: 'hanok' }), CTX).style, null);
});

test('그릴 수 없는 응답은 null', () => {
  for (const bad of [null, 'x', [], { ...raw(), houseStage: 0 }, { ...raw(), houseStage: 8 }, { ...raw(), houseStage: 2.5 }, { ...raw(), houseStage: '3' }]) {
    assert.equal(sanitizeShowcase(bad, CTX), null, String(JSON.stringify(bad)).slice(0, 40));
  }
});
```

`tests/neighbors-rules.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REWARD_CAP, REWARD_COINS, EMOJI, EMOJI_IDS, FAIL_TOAST, houseLabel, pickerMeta, rewardLine, pickerRows, hostSpot,
  houseSolidR, reactOutcome, visitorsSince, noticeView, neighborsDefault, restoreNeighbors, recordVisit, markSeen,
} from '../js/neighbors/rules.js';
import { stage7ExitPoint } from '../js/house-stage7.js';

const face = (id) => ({ rabbit: '🐰', bear: '🐻' }[id] || '🦊');

test('상수', () => {
  assert.equal(REWARD_CAP, 3); assert.equal(REWARD_COINS, 5);
  assert.deepEqual(EMOJI_IDS, ['wave', 'heart', 'flower', 'star']);
  assert.deepEqual(Object.values(EMOJI), ['👋', '❤️', '🌸', '⭐']);
  assert.equal(FAIL_TOAST, '연결이 불안정해요. 잠시 후 다시 시도해 주세요.');
});

test('집 단계 이름 · 카드 메타 · 보상 줄', () => {
  assert.equal(houseLabel(1), '🪵 나무 바닥(데크)');
  assert.equal(houseLabel(2), '🪵 통나무 벽');
  assert.equal(houseLabel(3), '🏠 코티지');
  assert.equal(houseLabel(6), '🏝️ 루프탑 빌라');
  assert.equal(houseLabel(7), '🏡 정원 저택');
  assert.equal(pickerMeta({ house_stage: 6, decor_n: 23 }), '🏝️ 루프탑 빌라 · 🪴 장식 23');
  assert.equal(rewardLine(1), '🪙 오늘 받은 방문 보상 1/3');
  assert.equal(rewardLine(9), '🪙 오늘 받은 방문 보상 3/3');
});

test('pickerRows: 3명까지 · 다녀온 이웃은 또 보기', () => {
  const rows = pickerRows([
    { public_id: 'p1', nick: '반짝이는 곰 #4821', character: 'bear', house_stage: 6, decor_n: 23, visited_today: false },
    { public_id: 'p2', nick: '별 헤는 판다 #7302', character: 'panda', house_stage: 7, decor_n: 17, visited_today: true, reacted_emoji: 'heart' },
    { public_id: 'p3', nick: 'c', character: 'rabbit', house_stage: 3, decor_n: 0, visited_today: false },
    { public_id: 'p4', nick: 'd', character: 'rabbit', house_stage: 3, decor_n: 0, visited_today: false },
  ], face);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { publicId: 'p1', slot: 0, face: '🐻', nick: '반짝이는 곰 #4821', meta: '🏝️ 루프탑 빌라 · 🪴 장식 23', done: false, go: '놀러 가기' });
  assert.equal(rows[1].done, true); assert.equal(rows[1].go, '또 보기'); assert.equal(rows[1].face, '🦊');
  assert.deepEqual(pickerRows(null, face), []);
});

test('집주인 자리 · 집 충돌 반경(js/spaces/house.js 와 같은 표)', () => {
  const o = { x: 0, z: 700 };
  assert.deepEqual(hostSpot(6, null, o), { x: 0, z: 703 });
  assert.deepEqual(hostSpot(1, null, o), { x: 0, z: 703 });
  assert.deepEqual(hostSpot(7, 'hanok', o), stage7ExitPoint('hanok', o));
  assert.deepEqual([3, 4, 5, 6, 7].map(houseSolidR), [2.2, 2.4, 2.55, 2.7, 3.9]);
});

test('반응 결과 해석', () => {
  assert.deepEqual(reactOutcome({ ok: true, reason: 'ok', rewarded: true, rewarded_today: 1 }),
    { reason: 'ok', reward: true, toast: '❤️ 마음을 남겼어요 · 🪙+5', bubble: 'thanks', rewardedToday: 1 });
  assert.deepEqual(reactOutcome({ ok: true, reason: 'ok', rewarded: false, rewarded_today: 3 }),
    { reason: 'ok', reward: false, toast: '❤️ 마음을 남겼어요', bubble: 'thanks', rewardedToday: 3 });
  assert.deepEqual(reactOutcome({ ok: false, reason: 'dup', rewarded_today: 2 }),
    { reason: 'dup', reward: false, toast: null, bubble: 'thanks', rewardedToday: 2 });
  assert.deepEqual(reactOutcome({ ok: false, reason: 'login' }),
    { reason: 'login', reward: false, toast: '🔐 로그인하면 마음을 남길 수 있어요', bubble: null, rewardedToday: 0 });
  for (const reason of ['private', 'self', 'not_found', 'emoji', 'offline', 'upstream', 'auth']) {
    assert.deepEqual(reactOutcome({ ok: false, reason }), { reason, reward: false, toast: FAIL_TOAST, bubble: null, rewardedToday: 0 });
  }
  assert.equal(reactOutcome(null).reason, 'offline');
});

test('알림 시작 시각 = max(seenAt, KST 어제 00:00)', () => {
  const now = Date.parse('2026-10-07T12:00:00+09:00');
  const yday = Date.parse('2026-10-06T00:00:00+09:00');
  assert.equal(visitorsSince(0, now), yday);
  assert.equal(visitorsSince(yday + 5, now), yday + 5);
  assert.equal(visitorsSince(0, Date.parse('2026-10-07T00:30:00+09:00')), yday);   // KST 자정 직후(UTC 로는 전날)
});

test('알림 뷰: 최대 10줄 + 외 N명', () => {
  const list = Array.from({ length: 10 }, (_, i) => ({ nick: `n${i}`, character: 'rabbit', emoji: 'heart' }));
  const v = noticeView({ total: 12, list }, face);
  assert.equal(v.title, '이웃 12명이 다녀갔어요');
  assert.equal(v.rows.length, 10); assert.equal(v.more, 2); assert.equal(v.total, 12);
  assert.deepEqual(v.rows[0], { face: '🐰', nick: 'n0', emoji: '❤️' });
  const one = noticeView({ total: 1, list: [{ nick: 'a', character: 'bear', emoji: 'star' }] }, face);
  assert.equal(one.title, '이웃 1명이 다녀갔어요'); assert.equal(one.more, 0);
});

test('세이브 필드 — 기본값·복원·기록은 새 객체', () => {
  assert.deepEqual(neighborsDefault(), { visited: 0, seenAt: 0 });
  assert.deepEqual(restoreNeighbors(undefined), { visited: 0, seenAt: 0 });
  assert.deepEqual(restoreNeighbors({ visited: 2.7, seenAt: -5, extra: 1 }), { visited: 2, seenAt: 0 });
  const nb = { visited: 1, seenAt: 100 };
  const v2 = recordVisit(nb);
  assert.deepEqual(v2, { visited: 2, seenAt: 100 }); assert.deepEqual(nb, { visited: 1, seenAt: 100 });
  assert.deepEqual(markSeen(nb, 50), { visited: 1, seenAt: 100 });   // 뒤로 가지 않는다
  assert.deepEqual(markSeen(nb, 200), { visited: 1, seenAt: 200 });
});
```

`tests/neighbors-sync.test.mjs`
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_CAP, NOTICE_MAX, EMOJI_IDS, houseSolidR } from '../js/neighbors/rules.js';
import { YARD_R, DECOR_MAX } from '../js/neighbors/sanitize.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SQL = read('sql/migrations/migrate_neighbors.sql');

test('보상 상한 — SQL 과 JS 가 같은 값', () => {
  assert.match(SQL, new RegExp(`v_rew := v_cnt < ${REWARD_CAP};`));
});

test('앞마당 반경·장식 상한·집 터 좌표 — SQL·sanitize·places.js 가 같다', () => {
  assert.match(SQL, new RegExp(`\\(\\((?:e\\.)?o->>'x'\\)::float8 \\+ 8\\) \\^ 2 \\+ \\(\\((?:e\\.)?o->>'z'\\)::float8 \\+ 8\\) \\^ 2 <= ${YARD_R} \\* ${YARD_R}`));
  assert.match(SQL, new RegExp(`limit ${DECOR_MAX}\\n`));
  assert.match(read('js/data/places.js'), /export const HOUSE_POS = new THREE\.Vector3\(-8, 0, -8\)/);
});

test('알림 10건 · 반응 4종', () => {
  assert.match(SQL, new RegExp(`order by dd\\.created_at desc limit ${NOTICE_MAX}`));
  assert.ok(SQL.includes(`check (emoji in (${EMOJI_IDS.map(e => `'${e}'`).join(',')}))`));
});

test('집 충돌 반경 표가 js/spaces/house.js houseSolidR 와 같다', () => {
  assert.ok(read('js/spaces/house.js').includes('return s >= 7 ? 3.9 : s >= 6 ? 2.7 : s >= 5 ? 2.55 : s >= 4 ? 2.4 : 2.2;'));
  assert.deepEqual([3, 4, 5, 6, 7].map(houseSolidR), [2.2, 2.4, 2.55, 2.7, 3.9]);
});
```

- [ ] **Step 2: 실행 → 실패 확인**

Run: `node --test tests/neighbors-sanitize.test.mjs tests/neighbors-rules.test.mjs tests/neighbors-sync.test.mjs`
Expected: FAIL — `Cannot find module '../js/neighbors/sanitize.js'`

- [ ] **Step 3: `js/neighbors/sanitize.js` 작성**

```js
// =============================================================
//  🏡 이웃 showcase 응답 검증 — 순수(three·game.js 없음, Node 테스트)
//  서버(neighbor_showcase)가 허용 목록만 보내지만 클라도 믿지 않는다: 모르는 id·깨진 좌표는 버리고,
//  그릴 수 없는 응답(집 단계 밖)은 null. 결과(View)만 js/neighbors/scene.js 가 받는다.
//  ⚠️ OUTDOOR·ANIMALS·HOUSE_POS 는 three/game.js 를 끌어와 여기서 import 할 수 없다 → ctx 로 주입
//     ctx = { outdoorIds:Set, animalIds:Set, fallbackAnimal:string, yard:{x,z} }
//  숫자 YARD_R·DECOR_MAX 는 sql/migrations/migrate_neighbors.sql _nb_yard 와 같아야 한다(tests/neighbors-sync)
// =============================================================
import { HOUSE_ADDONS } from '../house/addons.js';
import { findItem } from '../cosmetics/catalog.js';
import { petKindOf, stageOf } from '../pet/rules.js';
import { normalizeHouseStyle } from '../house-stage7.js';

export const YARD_R = 14;
export const DECOR_MAX = 40;
export const COSMETIC_SLOTS = Object.freeze(['head', 'neck', 'back', 'trail', 'skin']);
const MAX_STAGE = 7;
const PALETTE_N = 5;                      // ROOF/WALL/DOOR_COLORS 길이(js/data/places.js)
const NICK_FALLBACK = '이름 없는 여행자';   // SQL 의 coalesce 와 같은 문구

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const swatch = (v) => { const n = num(v); return n != null && Number.isInteger(n) && n >= 0 && n < PALETTE_N ? n : 0; };

export function sanitizeShowcase(raw, ctx) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const stage = num(raw.houseStage);
  if (stage == null || !Number.isInteger(stage) || stage < 1 || stage > MAX_STAGE) return null;

  const nick = typeof raw.nickname === 'string' ? raw.nickname.trim() : '';
  const character = typeof raw.character === 'string' && ctx.animalIds.has(raw.character) ? raw.character : ctx.fallbackAnimal;

  const eq = raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {};
  const equipped = {};
  for (const s of COSMETIC_SLOTS) {
    const it = typeof eq[s] === 'string' ? findItem(eq[s]) : null;
    equipped[s] = it && it.slot === s ? it.id : null;
  }

  const petKind = raw.pet && typeof raw.pet === 'object' && typeof raw.pet.kind === 'string' && petKindOf(raw.pet.kind) ? raw.pet.kind : null;
  const pet = petKind ? { kind: petKind, stage: stageOf(Math.max(0, Math.floor(num(raw.pet.works) || 0))) } : null;

  const hs = raw.houseStyle && typeof raw.houseStyle === 'object' ? raw.houseStyle : {};
  const addons = Array.isArray(raw.addons)
    ? [...new Set(raw.addons.filter(id => typeof id === 'string' && HOUSE_ADDONS.some(a => a.id === id)))]
    : [];

  const outdoor = [];
  for (const o of Array.isArray(raw.outdoor) ? raw.outdoor : []) {
    if (outdoor.length >= DECOR_MAX) break;
    if (!o || typeof o !== 'object' || !ctx.outdoorIds.has(o.id)) continue;
    const x = num(o.x), z = num(o.z);
    if (x == null || z == null) continue;
    const dx = x - ctx.yard.x, dz = z - ctx.yard.z;
    if (Math.hypot(dx, dz) > YARD_R) continue;
    const r = num(o.rot);
    outdoor.push({ id: o.id, dx, dz, rot: r != null && Number.isInteger(r) ? ((r % 4) + 4) % 4 : 0 });
  }

  return {
    nickname: nick ? nick.slice(0, 16) : NICK_FALLBACK,
    character, equipped, pet,
    houseStage: stage,
    houseStyle: { roof: swatch(hs.roof), wall: swatch(hs.wall), door: swatch(hs.door) },
    style: normalizeHouseStyle(typeof raw.style === 'string' ? raw.style : null, stage),
    addons, outdoor,
  };
}
```

- [ ] **Step 4: `js/neighbors/rules.js` 작성**

```js
// =============================================================
//  🏡 이웃 마을 규칙 — 순수 함수(three·game.js 없음, Node 테스트)
//  서버 판정은 sql/migrations/migrate_neighbors.sql. 여기 숫자는 그 파일과 같아야 한다(tests/neighbors-sync).
//  문구는 스펙 §8 검수본 그대로 — 바꾸지 말 것(미검수 문구는 계획서 Global Constraints 참조).
// =============================================================
import { kstDate } from '../kst-date.js';
import { EXPANSIONS, STAGE_NAMES } from '../house-cost.js';
import { stage7ExitPoint } from '../house-stage7.js';

export const REWARD_CAP = 3;          // neighbor_react 의 `v_rew := v_cnt < 3;`
export const REWARD_COINS = 5;        // 토스트 '🪙+5' 와 같은 값
export const NOTICE_MAX = 10;         // my_visitors 의 limit 10
export const HOST_TALK_R = 2.6;       // 집주인 말풍선이 뜨는 거리
export const EMOJI = Object.freeze({ wave: '👋', heart: '❤️', flower: '🌸', star: '⭐' });
export const EMOJI_IDS = Object.freeze(Object.keys(EMOJI));
export const FAIL_TOAST = '연결이 불안정해요. 잠시 후 다시 시도해 주세요.';   // 기존 문구 재사용(js/i18n-en.js)

/** 카드·알림에 쓰는 집 이름 — 4~7단계는 증축표, 1~2단계는 짓는 단계 이름, 3단계는 코티지 */
export function houseLabel(stage) {
  const e = EXPANSIONS.find(x => x.stage === stage);
  if (e) return `${e.ico} ${e.name}`;
  if (stage === 3) return '🏠 코티지';
  return `🪵 ${STAGE_NAMES[stage] || STAGE_NAMES[1]}`;
}

export const pickerMeta = (row) => `${houseLabel(row.house_stage)} · 🪴 장식 ${Math.max(0, row.decor_n | 0)}`;
export const rewardLine = (n) => `🪙 오늘 받은 방문 보상 ${Math.min(REWARD_CAP, Math.max(0, n | 0))}/${REWARD_CAP}`;

/** neighbors_today 목록 → 엽서 카드 행. faceOf(characterId) → 이모지 */
export function pickerRows(list, faceOf) {
  return (Array.isArray(list) ? list : []).slice(0, 3).map((r, slot) => ({
    publicId: r.public_id, slot, face: faceOf(r.character), nick: String(r.nick || ''),
    meta: pickerMeta(r), done: !!r.visited_today, go: r.visited_today ? '또 보기' : '놀러 가기',
  }));
}

/** 집주인이 서는 자리 — js/spaces/house.js houseExitPoint 와 같은 규칙(7단계는 현관 앞 마루, 그 밖은 집 앞 3) */
export function hostSpot(stage, style, origin) {
  return stage >= 7 ? stage7ExitPoint(style, origin) : { x: origin.x, z: origin.z + 3 };
}

/** js/spaces/house.js houseSolidR 와 같은 표(그쪽은 내 세이브를 읽어서 여기서 쓸 수 없다) */
export function houseSolidR(stage) {
  return stage >= 7 ? 3.9 : stage >= 6 ? 2.7 : stage >= 5 ? 2.55 : stage >= 4 ? 2.4 : 2.2;
}

/** neighbor_react 응답 → 화면에서 할 일. bubble 'thanks' = 재방문 말풍선(버튼 없음), null = 그대로 */
export function reactOutcome(res) {
  const r = res && typeof res === 'object' ? res : { ok: false, reason: 'offline' };
  const rewardedToday = Math.max(0, r.rewarded_today | 0);
  if (r.ok) return { reason: 'ok', reward: !!r.rewarded, toast: r.rewarded ? '❤️ 마음을 남겼어요 · 🪙+5' : '❤️ 마음을 남겼어요', bubble: 'thanks', rewardedToday };
  const reason = r.reason || 'offline';
  if (reason === 'dup') return { reason, reward: false, toast: null, bubble: 'thanks', rewardedToday };
  if (reason === 'login') return { reason, reward: false, toast: '🔐 로그인하면 마음을 남길 수 있어요', bubble: null, rewardedToday };
  return { reason, reward: false, toast: FAIL_TOAST, bubble: null, rewardedToday };
}

/** 다녀간 이웃 조회 시작(ms) — 승인 문구 '어제부터 지금까지' 가 거짓이 되지 않게 KST 어제 00:00 보다 앞으로 가지 않는다 */
export function visitorsSince(seenAt, now) {
  const ydayStart = Date.parse(`${kstDate(now - 864e5)}T00:00:00+09:00`);
  return Math.max(Number(seenAt) || 0, ydayStart);
}

/** my_visitors 응답 → 알림 모달 뷰 */
export function noticeView(res, faceOf) {
  const rows = (Array.isArray(res?.list) ? res.list : []).slice(0, NOTICE_MAX)
    .map(v => ({ face: faceOf(v.character), nick: String(v.nick || ''), emoji: EMOJI[v.emoji] || '' }));
  const total = Math.max(rows.length, res?.total | 0);
  return { title: `이웃 ${total}명이 다녀갔어요`, rows, more: Math.max(0, total - rows.length), total };
}

// ── 세이브 필드 neighbors: { visited, seenAt } — 전부 새 객체를 돌려준다 ──
const whole = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
export const neighborsDefault = () => ({ visited: 0, seenAt: 0 });
export function restoreNeighbors(v) {
  const o = v && typeof v === 'object' ? v : {};
  return { visited: whole(o.visited), seenAt: whole(o.seenAt) };
}
export function recordVisit(nb) { const o = restoreNeighbors(nb); return { ...o, visited: o.visited + 1 }; }
export function markSeen(nb, at) { const o = restoreNeighbors(nb); return { ...o, seenAt: Math.max(o.seenAt, whole(at)) }; }
```

- [ ] **Step 5: 통과 + 회귀**

Run: `node --test tests/neighbors-sanitize.test.mjs tests/neighbors-rules.test.mjs tests/neighbors-sync.test.mjs && npm test`
Expected: 새 테스트 전부 PASS, 전체 FAIL 0.

- [ ] **Step 6: 커밋**

```bash
git add js/neighbors/sanitize.js js/neighbors/rules.js tests/neighbors-sanitize.test.mjs tests/neighbors-rules.test.mjs tests/neighbors-sync.test.mjs
git commit -m "feat: 🏡 이웃 마을 순수 규칙 — showcase 검증·카드/알림 뷰·보상 해석·세이브 필드

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: API — `neighborRpc` + `api.js`(주입형) + `net.js`

**Files:**
- Modify: `js/supabase-client.js:597`(광장 RPC `plazaMine` 바로 아래)
- Create: `js/neighbors/api.js`, `js/neighbors/net.js`
- Test: `tests/neighbors-api.test.mjs`

**Interfaces:**
- Produces:
  - `neighborRpc(fn, args) → Promise<object>` — 허용 fn 4개, 오프라인·에러는 `{ ok:false, reason:'offline'|'upstream'|'bad_fn' }`
  - `createNeighborApi({ rpc, fetchFn, base, now }) → { today(), react(id, emoji), visitors(sinceMs), setPublic(on), showcase(id) }`
    - `today() → { ok:true, list, rewardedToday } | { ok:false, reason }`
    - `react() → neighbor_react 원응답 | { ok:false, reason }`
    - `visitors() → { ok:true, total, list, isPublic } | { ok:false, reason }`
    - `setPublic() → { ok:true, is_public } | { ok:false, reason }`
    - `showcase() → { ok:true, data, loadMs } | { ok:false, reason, code }`
  - `neighborApi`(net.js) — 실제 바인딩

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbors-api.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNeighborApi } from '../js/neighbors/api.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const mk = ({ rpc = async () => ({ ok: true }), fetchFn = async () => new Response('{}') } = {}) => {
  const calls = [];
  let t = 1000;
  const api = createNeighborApi({ rpc: async (fn, args) => { calls.push([fn, args]); return rpc(fn, args); }, fetchFn, base: 'https://w', now: () => (t += 37) });
  return { api, calls };
};

test('today: 3명까지 · 실패는 { ok:false, reason }', async () => {
  const { api, calls } = mk({ rpc: async () => ({ ok: true, list: [1, 2, 3, 4], rewarded_today: 2 }) });
  assert.deepEqual(await api.today(), { ok: true, list: [1, 2, 3], rewardedToday: 2 });
  assert.deepEqual(calls[0], ['neighbors_today', {}]);
  assert.deepEqual(await mk({ rpc: async () => ({ ok: false, reason: 'auth' }) }).api.today(), { ok: false, reason: 'auth' });
  assert.deepEqual(await mk({ rpc: async () => null }).api.today(), { ok: false, reason: 'upstream' });
  assert.deepEqual(await mk({ rpc: async () => { throw new Error('net'); } }).api.today(), { ok: false, reason: 'offline' });
});

test('react · setPublic · visitors 인자와 정규화', async () => {
  const { api, calls } = mk({ rpc: async (fn) => fn === 'my_visitors'
    ? { ok: true, total: 2, list: [{ nick: 'a' }], is_public: false }
    : fn === 'set_village_public' ? { ok: true, is_public: true } : { ok: true, reason: 'ok', rewarded: true } });
  assert.deepEqual(await api.react(ID, 'heart'), { ok: true, reason: 'ok', rewarded: true });
  assert.deepEqual(calls[0], ['neighbor_react', { p_public_id: ID, p_emoji: 'heart' }]);
  assert.deepEqual(await api.setPublic(1), { ok: true, is_public: true });
  assert.deepEqual(calls[1], ['set_village_public', { p_on: true }]);
  const since = Date.parse('2026-10-06T00:00:00+09:00');
  assert.deepEqual(await api.visitors(since), { ok: true, total: 2, list: [{ nick: 'a' }], isPublic: false });
  assert.deepEqual(calls[2], ['my_visitors', { p_since: '2026-10-05T15:00:00.000Z' }]);
});

test('showcase: 잘못된 id 는 fetch 하지 않는다 · 404/502/예외/정상', async () => {
  let n = 0;
  const bad = mk({ fetchFn: async () => { n++; return new Response('{}'); } });
  assert.deepEqual(await bad.api.showcase('nope'), { ok: false, reason: 'bad_id', code: 400 });
  assert.equal(n, 0);
  const at = (status, body) => mk({ fetchFn: async (u) => { assert.equal(u, `https://w/api/neighbor?id=${ID}`); return new Response(body, { status }); } }).api.showcase(ID);
  assert.deepEqual(await at(404, '{"error":"not_found"}'), { ok: false, reason: 'not_found', code: 404 });
  assert.deepEqual(await at(502, '{"error":"upstream"}'), { ok: false, reason: 'upstream', code: 502 });
  const ok = await at(200, '{"nickname":"n","houseStage":3}');
  assert.deepEqual(ok, { ok: true, data: { nickname: 'n', houseStage: 3 }, loadMs: 37 });
  assert.deepEqual(await mk({ fetchFn: async () => { throw new Error('x'); } }).api.showcase(ID), { ok: false, reason: 'offline', code: 0 });
});

test('supabase-client 에 neighborRpc 가 있고 허용 RPC 4개만 부른다', () => {
  const s = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.match(s, /const NEIGHBOR_RPCS = new Set\(\['neighbors_today', 'neighbor_react', 'my_visitors', 'set_village_public'\]\);/);
  assert.match(s, /export async function neighborRpc\(fn, args = \{\}\)/);
  const net = readFileSync(new URL('../js/neighbors/net.js', import.meta.url), 'utf8');
  assert.match(net, /createNeighborApi\(\{ rpc: neighborRpc, fetchFn: \(u\) => fetch\(u\), base: CONFIG\.API_BASE \}\)/);
  assert.ok(readFileSync(new URL('../js/neighbors/api.js', import.meta.url), 'utf8').includes('/api/neighbor?id='));
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbors-api.test.mjs` → FAIL (`Cannot find module '../js/neighbors/api.js'`)

- [ ] **Step 3: `js/supabase-client.js` 에 추가** — 597행 `export function plazaMine(season) {…}` 아래:

```js

// ── 🏡 이웃 마을 RPC — 판정은 전부 서버(migrate_neighbors.sql). 여기선 호출만 ──
//    오프라인·에러는 { ok:false, reason } 로 통일 → 호출부(js/neighbors/api.js)가 토스트·트래킹을 맡는다(조용히 삼키지 않는다)
const NEIGHBOR_RPCS = new Set(['neighbors_today', 'neighbor_react', 'my_visitors', 'set_village_public']);
export async function neighborRpc(fn, args = {}) {
  if (!NEIGHBOR_RPCS.has(fn)) return { ok: false, reason: 'bad_fn' };
  if (!state.online || !supabase) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) { console.warn(`[neighbor] ${fn} 실패:`, error.message); return { ok: false, reason: 'upstream' }; }
    return data || { ok: false, reason: 'upstream' };
  } catch (e) {
    console.warn(`[neighbor] ${fn} 예외:`, e?.message || e);
    return { ok: false, reason: 'offline' };
  }
}
```

- [ ] **Step 4: `js/neighbors/api.js` 작성**

```js
// =============================================================
//  🏡 이웃 마을 네트워크 — 주입형 순수 팩토리(Node 테스트). 실제 바인딩은 ./net.js
//  RPC 4종(유저별, 캐시 없음) + /api/neighbor(엣지 10분 캐시). 실패는 전부 { ok:false, reason } — 삼키지 않는다.
// =============================================================
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createNeighborApi({ rpc, fetchFn, base = '', now = () => performance.now() }) {
  async function call(fn, args) {
    try {
      const r = await rpc(fn, args);
      return r && typeof r === 'object' ? r : { ok: false, reason: 'upstream' };
    } catch { return { ok: false, reason: 'offline' }; }
  }
  return {
    async today() {
      const r = await call('neighbors_today', {});
      if (!r.ok || !Array.isArray(r.list)) return { ok: false, reason: r.reason || 'upstream' };
      return { ok: true, list: r.list.slice(0, 3), rewardedToday: Math.max(0, r.rewarded_today | 0) };
    },
    react: (publicId, emoji) => call('neighbor_react', { p_public_id: publicId, p_emoji: emoji }),
    async visitors(sinceMs) {
      const r = await call('my_visitors', { p_since: new Date(sinceMs).toISOString() });
      if (!r.ok) return { ok: false, reason: r.reason || 'upstream' };
      return { ok: true, total: Math.max(0, r.total | 0), list: Array.isArray(r.list) ? r.list : [], isPublic: r.is_public !== false };
    },
    async setPublic(on) {
      const r = await call('set_village_public', { p_on: !!on });
      return r.ok ? { ok: true, is_public: r.is_public !== false } : { ok: false, reason: r.reason || 'upstream' };
    },
    async showcase(publicId) {
      if (!UUID_RE.test(publicId || '')) return { ok: false, reason: 'bad_id', code: 400 };
      const t0 = now();
      try {
        const r = await fetchFn(`${base}/api/neighbor?id=${encodeURIComponent(publicId)}`);
        if (r.status === 404) return { ok: false, reason: 'not_found', code: 404 };
        if (!r.ok) return { ok: false, reason: 'upstream', code: r.status };
        const data = await r.json();
        if (!data || data.error) return { ok: false, reason: 'not_found', code: 404 };
        return { ok: true, data, loadMs: Math.round(now() - t0) };
      } catch { return { ok: false, reason: 'offline', code: 0 }; }
    },
  };
}
```

- [ ] **Step 5: `js/neighbors/net.js` 작성**

```js
// 🏡 이웃 마을 네트워크 바인딩 — 규칙은 ./api.js(테스트), 여기는 실제 supabase·fetch 를 묶기만 한다(js/plaza/net.js 와 같은 구조)
import { CONFIG } from '../config.js';
import { neighborRpc } from '../supabase-client.js';
import { createNeighborApi } from './api.js';

export const neighborApi = createNeighborApi({ rpc: neighborRpc, fetchFn: (u) => fetch(u), base: CONFIG.API_BASE });
```

- [ ] **Step 6: 통과 + 회귀** — Run: `node --test tests/neighbors-api.test.mjs && npm test` → PASS, FAIL 0

- [ ] **Step 7: 커밋**

```bash
git add js/supabase-client.js js/neighbors/api.js js/neighbors/net.js tests/neighbors-api.test.mjs
git commit -m "feat: 🏡 이웃 마을 API — neighborRpc 래퍼 + 주입형 api.js + net.js 바인딩

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: GA4 트래킹 빌더 7종(스펙 §7)

**Files:**
- Create: `js/neighbors/track.js`
- Test: `tests/neighbors-track.test.mjs`

**Interfaces:**
- Consumes: `reactOutcome()` 결과(Task 3), `api.today()` 결과(Task 4)
- Produces: 각각 `[eventName, params]` — 호출부는 `trackEvent(...evX(...))`
  - `evOpen(today, via)` → `neighbors_open {shown, rewarded_today, via}`
  - `evVisitStart({publicId, slot, revisit, loadMs})` → `neighbor_visit_start {host, slot, revisit, load_ms}`
  - `evReact(publicId, emoji, outcome)` → `neighbor_react {host, emoji, rewarded, reason}`
  - `evVisitEnd(publicId, sec, reacted)` → `neighbor_visit_end {host, sec, reacted}`
  - `evNotice(n, total)` → `neighbor_visitors_notice {n, total}`
  - `evToggle(on)` → `village_public_toggle {on}`
  - `evFail(stage, code)` → `neighbor_load_fail {stage, code}`

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbors-track.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evOpen, evVisitStart, evReact, evVisitEnd, evNotice, evToggle, evFail } from '../js/neighbors/track.js';
import { RESERVED_TRAFFIC_KEYS } from '../js/ga-params.js';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('7종 이벤트 이름·파라미터(스펙 §7)', () => {
  assert.deepEqual(evOpen({ list: [1, 2], rewardedToday: 1 }, 'sign'), ['neighbors_open', { shown: 2, rewarded_today: 1, via: 'sign' }]);
  assert.deepEqual(evVisitStart({ publicId: ID, slot: 2, revisit: true, loadMs: 412.6 }), ['neighbor_visit_start', { host: ID, slot: 2, revisit: 1, load_ms: 413 }]);
  assert.deepEqual(evReact(ID, 'heart', { reward: true, reason: 'ok' }), ['neighbor_react', { host: ID, emoji: 'heart', rewarded: 1, reason: 'ok' }]);
  assert.deepEqual(evReact(ID, 'star', { reward: false, reason: 'login' }), ['neighbor_react', { host: ID, emoji: 'star', rewarded: 0, reason: 'login' }]);
  assert.deepEqual(evVisitEnd(ID, 41.4, false), ['neighbor_visit_end', { host: ID, sec: 41, reacted: 0 }]);
  assert.deepEqual(evVisitEnd(ID, -3, true), ['neighbor_visit_end', { host: ID, sec: 0, reacted: 1 }]);
  assert.deepEqual(evNotice(3, 12), ['neighbor_visitors_notice', { n: 3, total: 12 }]);
  assert.deepEqual(evToggle(false), ['village_public_toggle', { on: 0 }]);
  assert.deepEqual(evFail('showcase', 404), ['neighbor_load_fail', { stage: 'showcase', code: '404' }]);
  assert.deepEqual(evFail('today', undefined), ['neighbor_load_fail', { stage: 'today', code: 'unknown' }]);
});

test('GA4 예약어(source·medium·campaign…)를 쓰지 않는다', () => {
  const all = [evOpen({ list: [], rewardedToday: 0 }, 'sign'), evVisitStart({ publicId: ID, slot: 0, revisit: false, loadMs: 1 }),
    evReact(ID, 'wave', { reward: false, reason: 'ok' }), evVisitEnd(ID, 1, true), evNotice(1, 1), evToggle(true), evFail('react', 'x')];
  for (const [, p] of all) for (const k of Object.keys(p)) assert.ok(!(k in RESERVED_TRAFFIC_KEYS), k);
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbors-track.test.mjs` → FAIL (모듈 없음)

- [ ] **Step 3: `js/neighbors/track.js` 작성**

```js
// =============================================================
//  🏡 이웃 마을 GA4 이벤트 — 순수 빌더(스펙 §7). 호출부: trackEvent(...evX(...))
//  식별자: 이웃 = public_id(무작위, PII 아님) · 반응 = wave|heart|flower|star. 예약어 금지(js/ga-params.js).
//  다음날 BQ 재검증: 7종 적재 · host 가 uuid 형식 · dev 세션 제외(trackEvent 가 IS_DEV_SESSION 이면 안 보낸다)
// =============================================================
export const evOpen = (today, via) =>
  ['neighbors_open', { shown: (today.list || []).length, rewarded_today: today.rewardedToday | 0, via }];
export const evVisitStart = ({ publicId, slot, revisit, loadMs }) =>
  ['neighbor_visit_start', { host: publicId, slot, revisit: revisit ? 1 : 0, load_ms: Math.round(loadMs || 0) }];
export const evReact = (publicId, emoji, outcome) =>
  ['neighbor_react', { host: publicId, emoji, rewarded: outcome.reward ? 1 : 0, reason: outcome.reason }];
export const evVisitEnd = (publicId, sec, reacted) =>
  ['neighbor_visit_end', { host: publicId, sec: Math.max(0, Math.round(sec)), reacted: reacted ? 1 : 0 }];
export const evNotice = (n, total) => ['neighbor_visitors_notice', { n, total }];
export const evToggle = (on) => ['village_public_toggle', { on: on ? 1 : 0 }];
export const evFail = (stage, code) => ['neighbor_load_fail', { stage, code: String(code ?? 'unknown') }];
```

- [ ] **Step 4: 통과** — Run: `node --test tests/neighbors-track.test.mjs` → PASS

- [ ] **Step 5: 커밋**

```bash
git add js/neighbors/track.js tests/neighbors-track.test.mjs
git commit -m "feat: 🏡 이웃 마을 GA4 이벤트 빌더 7종

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: UI — `js/neighbors/ui.js`(시안 A+C+A) + ⚙️ 설정 버튼

**Files:**
- Create: `js/neighbors/ui.js`
- Modify: `index.html:165`(CSS 한 줄), `index.html:2475`(설정 목록에 버튼 — `lang-btn` 아래)
- Test: `tests/neighbor-ui.test.mjs`

**Interfaces:**
- Consumes: `rewardLine`, `EMOJI`, `EMOJI_IDS`(rules.js), `Input`(game.js)
- Produces:
  - `openPickerModal(rows, rewardedToday, onGo(row))`, `setPickerBusy(on)`, `closePickerModal()`
  - `showNeighborHud(nickname, onExit)`, `hideNeighborHud()`
  - `setHostBubble(null | { face, state:'ask'|'thanks', onReact(emojiId) })`
  - `openVisitorsModal(view, onDone)` — view = `noticeView()` 결과
  - `bindVillagePublicToggle(onToggle)`, `setVillagePublicUi(on, visible)`
  - DOM id: `#nb-pick-modal`, `#nb-visitors-modal`(둘 다 `-modal` 로 끝나야 `anyModalOpen()` 이 잡는다), `#nb-hud-top`, `#nb-exit`, `#nb-bubble`, `#village-public-btn`, body class `neighbor-visit`

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbor-ui.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const UI = readFileSync(new URL('../js/neighbors/ui.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('남이 지은 문자열(닉네임)이 innerHTML 로 들어가지 않는다', () => {
  assert.doesNotMatch(UI, /innerHTML/);
  assert.match(UI, /e\.textContent = text/);
});

test('모달 id 가 -modal 로 끝난다(anyModalOpen 이 잡아 뒤에서 게임이 멈춘다)', () => {
  assert.match(UI, /modal\('nb-pick-modal'\)/);
  assert.match(UI, /modal\('nb-visitors-modal'\)/);
});

test('구경 중엔 도구 바·퀘스트 패널·스토리 칩을 숨긴다', () => {
  assert.match(UI, /body\.neighbor-visit #hotbar, body\.neighbor-visit #quest-panel, body\.neighbor-visit #story-chip \{ display: none !important; \}/);
  assert.match(UI, /document\.body\.classList\.add\('neighbor-visit'\)/);
  assert.match(UI, /document\.body\.classList\.remove\('neighbor-visit'\)/);
});

test('검수된 문구를 글자 그대로 쓴다(스펙 §8)', () => {
  for (const s of ["'오늘의 이웃'", "'같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요'", "'❤️ 다녀옴'",
    '`🏡 ${nickname} 의 마을`', "'🚪 내 마을로'", `'"와 줘서 고마워요! 어땠어요?"'`, `'"또 와 줘서 기뻐요!"'`,
    "'어제부터 지금까지'", "'고마워요 🌱'", "'아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요'", '`외 ${view.more}명`']) {
    assert.ok(UI.includes(s), `문구 없음: ${s}`);
  }
});

test('⚙️ 설정에 이웃 공개 토글 — 게스트는 숨김(처음엔 display:none)', () => {
  assert.match(HTML, /<button id="village-public-btn" style="display:none;"><span class="uico">🏡<\/span><span class="ulbl">이웃에게 내 마을 보여 주기<\/span><\/button>/);
  assert.match(HTML, /#village-public-btn\.off \{ opacity: \.5; \}/);
  assert.match(UI, /b\.style\.display = visible \? '' : 'none'/);
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbor-ui.test.mjs` → FAIL (ENOENT ui.js)

- [ ] **Step 3: `js/neighbors/ui.js` 작성** (시안 `dev/active/neighbor-village/mockup.html` 의 A 카드 · C 말풍선 · A 알림 CSS 를 옮김)

```js
// =============================================================
//  🏡 이웃 마을 화면 — 오늘의 이웃(A 엽서 카드) · 집주인 말풍선(C) · 다녀간 이웃 알림(A) · 상단 줄·나가기 · ⚙️ 토글
//  시안: dev/active/neighbor-village/mockup.html (확정 A+C+A, 2026-10-07)
//  DOM 은 전부 textContent — 닉네임은 남이 지은 문자열이다(innerHTML 금지). 영어는 i18n 옵저버가 번역한다.
//  모달 루트 id 가 '-modal' 로 끝나야 index.html anyModalOpen() 이 잡는다(js/plaza/ui.js 와 같은 규칙).
// =============================================================
import { Input } from '../game.js';
import { EMOJI, EMOJI_IDS, rewardLine } from './rules.js';

const CSS = `
#nb-pick-modal, #nb-visitors-modal { position: fixed; inset: 0; z-index: 33; display: none; place-items: center; background: rgba(20,40,30,0.55); }
#nb-pick-modal.show, #nb-visitors-modal.show { display: grid; }
.nb-card { width: min(440px, calc(100vw - 28px)); box-sizing: border-box; background: #fff; border-radius: 22px;
  box-shadow: 0 20px 60px rgba(30,50,40,.4); padding: 18px 14px 14px; text-align: center;
  max-height: calc(100dvh - 24px - var(--top-inset, 0px)); overflow-y: auto; }
.nb-card h2 { margin: 2px 0 4px; font-size: 17px; }
.nb-ico { font-size: 30px; }
.nb-sub { font-size: 12px; opacity: .7; margin: 0 0 12px; }
.nb-list { display: flex; flex-direction: column; gap: 8px; }
.nb-row { display: flex; gap: 10px; align-items: center; background: #f4faf5; border-radius: 16px; padding: 10px; text-align: left; box-shadow: var(--shadow); }
.nb-row.done { opacity: .55; }
.nb-ava { width: 52px; height: 52px; border-radius: 50%; background: #fff3dd; display: grid; place-items: center; font-size: 30px; flex: 0 0 52px; }
.nb-name { font-weight: 800; font-size: 13px; word-break: keep-all; }
.nb-meta { font-size: 11.5px; opacity: .75; margin-top: 2px; }
.nb-badge { display: inline-block; font-size: 10.5px; background: #ffe9b8; border-radius: 8px; padding: 1px 6px; margin-left: 4px; }
.nb-btn { white-space: nowrap; border: none; border-radius: 12px; padding: 9px 14px; font-weight: 700; font-size: 13px;
  background: var(--mint); color: var(--ink); box-shadow: var(--shadow); cursor: pointer; font-family: inherit; }
.nb-btn[disabled] { opacity: .5; cursor: default; }
.nb-go { margin-left: auto; padding: 8px 10px; font-size: 12px; }
.nb-foot { margin-top: 12px; font-size: 11.5px; opacity: .7; }
.nb-empty { padding: 18px 8px; font-size: 13px; opacity: .8; }
.nb-close { margin-top: 10px; background: #eef2ee; box-shadow: none; }
@media (min-width: 720px) {
  #nb-pick-modal .nb-card { width: 560px; }
  #nb-pick-modal .nb-list { flex-direction: row; }
  #nb-pick-modal .nb-row { flex-direction: column; text-align: center; flex: 1; }
  #nb-pick-modal .nb-go { margin: 6px 0 0; }
}
#nb-hud-top { position: fixed; top: calc(10px + var(--top-inset, 0px)); left: 50%; transform: translateX(-50%); z-index: 20; display: none;
  background: rgba(255,255,255,.86); border-radius: 12px; padding: 6px 12px; font-weight: 700; font-size: 13px; box-shadow: var(--shadow);
  max-width: calc(100vw - 140px); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#nb-exit { position: fixed; left: 12px; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 20; display: none; background: #eef2ee; }
body.neighbor-visit #nb-hud-top, body.neighbor-visit #nb-exit { display: block; }
body.neighbor-visit #hotbar, body.neighbor-visit #quest-panel, body.neighbor-visit #story-chip { display: none !important; }
#nb-bubble { position: fixed; left: 50%; top: 28%; transform: translateX(-50%); z-index: 21; display: none; background: #fff; border-radius: 16px;
  padding: 9px 12px; font-size: 13px; font-weight: 700; box-shadow: var(--shadow); text-align: center; width: min(260px, calc(100vw - 32px)); }
#nb-bubble.show { display: block; }
#nb-bubble::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); border: 8px solid transparent; border-top-color: #fff; border-bottom: 0; }
.nb-react { display: flex; gap: 6px; justify-content: center; margin-top: 7px; }
.nb-react button { border: none; background: #f4faf5; border-radius: 10px; width: 44px; height: 44px; font-size: 20px; cursor: pointer; }
.nb-visits { text-align: left; font-size: 12.5px; margin: 6px 0 12px; }
.nb-visits div { display: flex; justify-content: space-between; padding: 6px 2px; border-bottom: 1px solid #f0f4f0; }
`;

let styled = false;
const onClose = {};

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function ensureStyle() {
  if (styled) return;
  styled = true;
  const s = el('style'); s.id = 'nb-style'; s.textContent = CSS; document.head.appendChild(s);
}

function modal(id) {
  ensureStyle();
  let root = document.getElementById(id);
  if (!root) {
    root = el('div'); root.id = id;
    root.addEventListener('click', (e) => { if (e.target === root) closeModal(id); });
    document.body.appendChild(root);
  }
  root.replaceChildren();
  const card = el('div', 'nb-card');
  root.appendChild(card);
  return { root, card };
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('show');
  const f = onClose[id]; onClose[id] = null;
  f?.();
}

// ── 오늘의 이웃(A 엽서 카드) ──
export function openPickerModal(rows, rewardedToday, onGo) {
  const { root, card } = modal('nb-pick-modal');
  card.append(el('div', 'nb-ico', '🏡'), el('h2', null, '오늘의 이웃'), el('p', 'nb-sub', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요'));
  const list = el('div', 'nb-list');
  if (!rows.length) list.appendChild(el('div', 'nb-empty', '아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요'));
  for (const r of rows) {
    const row = el('div', 'nb-row' + (r.done ? ' done' : ''));
    const name = el('div', 'nb-name', r.nick);
    if (r.done) name.appendChild(el('span', 'nb-badge', '❤️ 다녀옴'));
    const info = el('div');
    info.append(name, el('div', 'nb-meta', r.meta));
    const go = el('button', 'nb-btn nb-go', r.go);
    go.onclick = () => { setPickerBusy(true); onGo(r); };
    row.append(el('div', 'nb-ava', r.face), info, go);
    list.appendChild(row);
  }
  const close = el('button', 'nb-btn nb-close', '닫기');
  close.onclick = () => closeModal('nb-pick-modal');
  card.append(list, el('div', 'nb-foot', rewardLine(rewardedToday)), close);
  Input.setAnalog(0, 0);
  root.classList.add('show');
}

export function setPickerBusy(on) {
  document.querySelectorAll('#nb-pick-modal .nb-go').forEach(b => { b.disabled = !!on; });
}

export function closePickerModal() { closeModal('nb-pick-modal'); }

// ── 구경 중 상단 줄 · 🚪 내 마을로 ──
export function showNeighborHud(nickname, onExit) {
  ensureStyle();
  let top = document.getElementById('nb-hud-top');
  if (!top) { top = el('div'); top.id = 'nb-hud-top'; document.body.appendChild(top); }
  top.textContent = `🏡 ${nickname} 의 마을`;
  let exit = document.getElementById('nb-exit');
  if (!exit) { exit = el('button', 'nb-btn', '🚪 내 마을로'); exit.id = 'nb-exit'; document.body.appendChild(exit); }
  exit.onclick = () => onExit();
  document.body.classList.add('neighbor-visit');
}

export function hideNeighborHud() {
  document.body.classList.remove('neighbor-visit');
  setHostBubble(null);
}

// ── 집주인 말풍선(C) — ask: 반응 4종 버튼 · thanks: 재방문 인사(버튼 없음) ──
export function setHostBubble(b) {
  ensureStyle();
  let box = document.getElementById('nb-bubble');
  if (!box) { box = el('div'); box.id = 'nb-bubble'; document.body.appendChild(box); }
  if (!b) { box.classList.remove('show'); return; }
  box.replaceChildren();
  const line = el('div');
  line.append(el('span', null, `${b.face} `), el('span', null, b.state === 'ask' ? '"와 줘서 고마워요! 어땠어요?"' : '"또 와 줘서 기뻐요!"'));
  box.appendChild(line);
  if (b.state === 'ask') {
    const row = el('div', 'nb-react');
    for (const id of EMOJI_IDS) {
      const btn = el('button', null, EMOJI[id]);
      btn.setAttribute('aria-label', id);
      btn.onclick = () => b.onReact(id);
      row.appendChild(btn);
    }
    box.appendChild(row);
  }
  box.classList.add('show');
}

// ── 다녀간 이웃 알림(A) ──
export function openVisitorsModal(view, onDone) {
  const { root, card } = modal('nb-visitors-modal');
  card.append(el('div', 'nb-ico', '🏡'), el('h2', null, view.title), el('p', 'nb-sub', '어제부터 지금까지'));
  const list = el('div', 'nb-visits');
  for (const r of view.rows) {
    const line = el('div');
    line.append(el('span', null, `${r.face} ${r.nick}`), el('span', null, r.emoji));
    list.appendChild(line);
  }
  if (view.more > 0) list.appendChild(el('div', null, `외 ${view.more}명`));
  const ok = el('button', 'nb-btn', '고마워요 🌱');
  ok.onclick = () => closeModal('nb-visitors-modal');
  onClose['nb-visitors-modal'] = onDone;
  card.append(list, ok);
  Input.setAnalog(0, 0);
  root.classList.add('show');
}

// ── ⚙️ 설정 토글(index.html #village-public-btn) — 게스트는 숨긴다(후보에 안 들어가므로) ──
export function bindVillagePublicToggle(onToggle) {
  const b = document.getElementById('village-public-btn');
  if (!b || b.dataset.bound) return;
  b.dataset.bound = '1';
  b.addEventListener('click', () => onToggle());
}

export function setVillagePublicUi(on, visible) {
  const b = document.getElementById('village-public-btn');
  if (!b) return;
  // ⚠️ #settings-list button { display:flex } 가 [hidden] 을 이긴다 — style.display 로 직접 끈다(logout-btn 과 같은 방식)
  b.style.display = visible ? '' : 'none';
  b.classList.toggle('off', !on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
}
```

- [ ] **Step 4: `index.html` 수정**

165행 `#music-btn.off { opacity: .5; }` 아래:
```css
  #village-public-btn.off { opacity: .5; }   /* 🏡 이웃 공개 꺼짐 — 🎵 배경음악 끔과 같은 표시 */
```
2475행 `<button id="lang-btn">…</button>` 아래:
```html
        <button id="village-public-btn" style="display:none;"><span class="uico">🏡</span><span class="ulbl">이웃에게 내 마을 보여 주기</span></button>
```

- [ ] **Step 5: 통과 + 회귀** — Run: `node --test tests/neighbor-ui.test.mjs && npm test` → PASS, FAIL 0

- [ ] **Step 6: 커밋**

```bash
git add js/neighbors/ui.js index.html tests/neighbor-ui.test.mjs
git commit -m "feat: 🏡 이웃 마을 화면 — 엽서 카드·말풍선 반응·다녀간 이웃 알림·설정 토글

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 이웃 공간 — `scene.js` + `js/spaces/neighbor.js` + game.js 공간 배선

**Files:**
- Modify: `js/data/places.js`(끝 `HOUSE_POS` 아래)
- Create: `js/neighbors/scene.js`, `js/spaces/neighbor.js`
- Modify: `js/game.js` — places import(126행) · neighbor import(170행 observatory import 아래) · `$w`(253행 `atMuseum` 접근자 아래) · `let`(455행) · `toolZoneKey`(1452행) · place 문자열 2곳(2343·5533행) · `getGameState`(2580행) · `_spaceFlags`/`spaceFlags`(2686~2691행) · `minimapMarks`(5456행) · 루프(5519행) · 미니맵 C/half(5549·5551행) · 클램프(5743행) · `handleAction`(6518행) · export 목록(7401행). `setSpaceVisible` 은 손대지 않는다(이웃 공간은 입장 때 짓고 퇴장 때 치워서 토글할 그룹이 없다 · 야외라 빗소리 조건도 그대로).
- Modify: `js/data/tools.js:73`, `js/shadow-scope.js:42`, `js/spaces/doors.js:9,~20,162,408`, `js/spaces/outdoor-decor.js:9,23`, `index.html:3612,3628`
- Modify: `tests/shadow-scope.test.mjs:83,92,177` + 끝에 테스트 1개
- Test: `tests/neighbor-space.test.mjs`

**Interfaces:**
- Consumes: `sanitizeShowcase`(T3), rules(T3), `neighborApi`(T4), track(T5), ui(T6), game.js export(`$w, ANIMALS, buildCharacterMesh, disposeTree, gameState, giveReward, makeSignpost, outdoorMesh, player, removeSolid, requestSave, scene, setSpaceVisible, snapCamera, solidBox, solidCircle, syncStory, ui`), `prepHouseMeshes`·`unregisterWindows`(spaces/house.js), `spawnPet`(pet/render.js), `disposeSkin`(cosmetics/skin.js)
- Produces:
  - places.js: `NEIGHBOR = Vector3(0,0,700)`, `NEIGHBOR_R = 16`, `NEIGHBOR_GATE = Vector3(-4,0,25)`
  - scene.js: `GROUND_R`, `paintHouse(root, style)`, `buildNeighborScene(view) → { group, hostSpot, update(dt), dispose() }`
  - spaces/neighbor.js: `openNeighborPicker(via)`, `enterNeighbor(entry)`, `exitNeighbor()`, `updateNeighbor(dt)`, `neighborDoor(p) → 'neighborexit'|null`, `neighborAction(nearDoor)`, `clampToNeighbor(p)`, `neighborMinimapMarks(marks)`, `neighborReturnPos() → {x,z}`
  - game.js: `let atNeighbor` + `$w.atNeighbor`

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbor-space.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = gameSource();
const SCENE = read('js/neighbors/scene.js');
const SPACE = read('js/spaces/neighbor.js');
const DOORS = read('js/spaces/doors.js');

function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 함수가 없다`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('🔒 scene.js 는 내 세이브를 아예 모른다(읽지도 쓰지도 않는다)', () => {
  assert.doesNotMatch(SCENE, /gameState/);
});

test('🔒 spaces/neighbor.js 가 쓰는 게임 상태는 neighbors · hintsSeen.neighborPublic 뿐', () => {
  const writes = [...SPACE.matchAll(/gameState(?:\.[\w$]+|\[[^\]]+\])+\s*(?:=(?!=)|\+=|-=|\+\+|--)/g)].map(m => m[0].replace(/\s+/g, ''));
  assert.ok(writes.length > 0);
  for (const w of writes) assert.ok(/^gameState\.(neighbors|hintsSeen\.neighborPublic)=$/.test(w), `허용 밖 쓰기: ${w}`);
});

test('places.js: 공간 좌표', () => {
  const p = read('js/data/places.js');
  assert.match(p, /export const NEIGHBOR = new THREE\.Vector3\(0, 0, 700\);/);
  assert.match(p, /export const NEIGHBOR_R = 16;/);
  assert.match(p, /export const NEIGHBOR_GATE = new THREE\.Vector3\(-4, 0, 25\);/);
});

test('game.js 공간 플래그 배선(천문대와 같은 자리)', () => {
  assert.match(SRC, /let atNeighbor = false;/);
  assert.match(SRC, /get atNeighbor\(\) \{ return atNeighbor; \}, set atNeighbor\(v\) \{ atNeighbor = v; \}/);
  assert.match(SRC, /_spaceFlags = \{[^}]*atNeighbor: false/);
  assert.match(bodyOf('spaceFlags'), /_spaceFlags\.atNeighbor = atNeighbor/);
  assert.match(bodyOf('toolZoneKey'), /if \(atNeighbor\) return 'neighbor'/);
  assert.equal((SRC.match(/atNeighbor \? 'neighbor' : atRiver/g) || []).length, 2, 'place 문자열 2곳(세션 요약·미니맵)');
  assert.match(SRC, /place === 'neighbor' \? NEIGHBOR :/);
  assert.match(SRC, /place === 'neighbor' \? NEIGHBOR_R :/);
  assert.match(bodyOf('minimapMarks'), /place === 'neighbor'\) \{ neighborMinimapMarks\(marks\);/);
  assert.match(SRC, /\} else if \(atNeighbor\) \{ clampToNeighbor\(player\.position\);/);
  assert.match(bodyOf('handleAction'), /if \(atNeighbor \|\| nearDoor === 'neighbor'\) return neighborAction\(nearDoor\);/);
  assert.match(SRC, /updateObservatory\(dt, t\); updateNeighbor\(dt\);/);
  assert.match(bodyOf('getGameState'), /gameState\.playerPos = atNeighbor \? neighborReturnPos\(\) : \{ x: player\.position\.x, z: player\.position\.z \};/);
  assert.match(SRC, /atObservatory, atOrchard, atNeighbor, atRiver/);
});

test('공간 가드: 문·야외 장식·마을 판정·그림자·도구 페이지', () => {
  assert.match(DOORS, /if \(atNeighbor\) \{/);
  assert.match(DOORS, /nd = neighborDoor\(player\.position\);/);
  assert.match(DOORS, /prompt = nd \? '🚪 내 마을로' : null;/);
  assert.match(DOORS, /inVillage2\(\) \{ return [^}]*!atNeighbor/);
  assert.match(read('js/spaces/outdoor-decor.js'), /outdoorZone\(\) \{ return [^}]*!atNeighbor/);
  assert.match(read('js/shadow-scope.js'), /'atOrchard', 'atNeighbor'\]/);
  assert.match(read('js/data/tools.js'), /neighbor: 'none'/);
});

test('입장·퇴장: 퇴장 때 치우고 8장 훅 · 반응 보상은 원장 출처 neighbor_visit', () => {
  assert.match(bodyOf('enterNeighbor'), /atNeighbor = true/);   // gameSource 가 `$w.` 를 벗긴다
  assert.match(bodyOf('enterNeighbor'), /setSpaceVisible\(\)/);
  const exit = bodyOf('exitNeighbor');
  assert.match(exit, /v\.built\.dispose\(\)/);
  assert.match(exit, /gameState\.neighbors = recordVisit\(gameState\.neighbors\)/);
  assert.match(exit, /syncStory\('neighbor_visit'\)/);
  assert.match(exit, /trackEvent\(\.\.\.evVisitEnd\(/);
  assert.match(SPACE, /giveReward\(\{ coins: REWARD_COINS \}, 'neighbor_visit', v\.publicId\)/);
  assert.match(SPACE, /authState\.isGuest \? \{ ok: false, reason: 'login' \}/);
});

test('치우기: 캐릭터는 disposeSkin 만(재질 공유) · 창문 점등 해제 · 충돌체 제거', () => {
  assert.match(SCENE, /group\.remove\(host\); disposeSkin\(host\);/);
  assert.match(SCENE, /if \(pet\) group\.remove\(pet\);/);
  assert.match(SCENE, /unregisterWindows\(group\);/);
  assert.match(SCENE, /for \(const c of solids\) removeSolid\(c\);/);
  assert.match(SCENE, /sign\.userData\.dead = true;/);
  assert.doesNotMatch(SCENE, /registerAddonAnims/);   // 내 집 구성품 애니메이션 목록을 덮어쓴다
});

test('미니맵: 이웃 공간 라벨·바닥색', () => {
  const html = read('index.html');
  assert.match(html, /d\.place === 'neighbor' \? 'rgba\(150,200,120,0\.75\)'/);
  assert.match(html, /d\.place === 'neighbor' \? '🏡 이웃의 숲'/);
});
```

`tests/shadow-scope.test.mjs` 수정(같은 Step 에서):
- 83행 `const OUT_OF_REACH = { … atOrchard: 'ORCHARD' };` → 끝에 `, atNeighbor: 'NEIGHBOR'` 추가
- 92~93행 `NEAREST_RECEIVER_M` 객체 끝 `atOrchard: 106 };` → `atOrchard: 106, atNeighbor: 648 };   // 🏡 z=700 − 바닥 반경 34 − 클램프 18`
- 177~185행 `GATES` 배열 끝에 `['enterNeighbor', 'exitNeighbor'],` 추가(`bodyOf` 는 줄머리 `function` 을 찾는다 — gameSource 가 spaces/neighbor.js 의 `export ` 를 벗기므로 잡힌다)
- 파일 끝에 계산 잠금 테스트 추가:
```js
test('🏡 이웃 공간의 최근접 수신면 648m 는 places.js·scene.js 의 값에서 나온다', () => {
  const center = /const NEIGHBOR = new THREE\.Vector3\(\s*0,\s*0,\s*(\d+)\s*\)/.exec(src);
  const r = /const NEIGHBOR_R = (\d+)/.exec(src);
  const scene = readFileSync(new URL('../js/neighbors/scene.js', import.meta.url), 'utf8');
  const g = /export const GROUND_R = NEIGHBOR_R \+ (\d+);/.exec(scene);
  assert.ok(center && r && g, '이웃 공간 중심·반경·바닥 반경을 못 읽었다');
  assert.equal(NEAREST_RECEIVER_M.atNeighbor, Number(center[1]) - (Number(r[1]) + Number(g[1])) - VILLAGE_CLAMP);
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbor-space.test.mjs tests/shadow-scope.test.mjs` → FAIL (ENOENT scene.js, `NEIGHBOR 좌표를 찾지 못했다`)

- [ ] **Step 3: `js/data/places.js` 끝에 추가** (`export const HOUSE_POS …` 아래)

```js

// 🏡 이웃 마을 — 다른 플레이어의 앞마당을 구경하는 인스턴스(가장 먼 천문대 540 너머, 비어 있음)
//   스펙: docs/superpowers/specs/2026-10-07-neighbor-village-design.md
export const NEIGHBOR = new THREE.Vector3(0, 0, 700);
export const NEIGHBOR_R = 16;                                // 이동 반경 — 앞마당(14) + 걸어 다닐 여유
//   입구 팻말 — 남쪽 🍄채집 숲(-18,23)과 🌟반딧불이 계곡(7,26) 사이 빈터. 겹침 검사는 tests/neighbor-village.test.mjs
//   (계곡 중심 11.05 = 링 끝까지 1.45 · 숲 중심 14.14 = 링 끝까지 2.5 · 닭장 13.5 · 카페 13.6 · 가장 가까운 주민 ⭐별 보는 아이 11.0 · 화덕 후보 11.5)
export const NEIGHBOR_GATE = new THREE.Vector3(-4, 0, 25);
```

- [ ] **Step 4: `js/neighbors/scene.js` 작성**

```js
// =============================================================
//  🏡 이웃 공간 짓기·치우기 — NEIGHBOR(0,0,700)
//  ⚠️ 넘겨받은 뷰(js/neighbors/sanitize.js 결과)로만 그린다. 내 세이브는 읽지도 쓰지도 않는다 —
//     tests/neighbor-space.test.mjs 가 이 파일에 그 이름이 아예 없음을 잠근다.
//  ⚠️ 치울 때: 캐릭터 재질은 내 캐릭터와 공유(game.js makeCharacterPreview 주석) → disposeSkin 만.
//     펫도 같은 이유로 떼어 내기만 한다. 집·구성품·장식·고정 세트는 여기서 새로 만든 것이라 disposeTree.
//  ⚠️ 구성품 애니메이션(registerAddonAnims)은 부르지 않는다 — 내 집의 전역 목록을 갈아 끼운다.
// =============================================================
import * as THREE from 'three';
import { buildCharacterMesh, disposeTree, makeSignpost, outdoorMesh, removeSolid, scene, solidBox, solidCircle } from '../game.js';
import { buildHouseModel, mountHouseAddons } from '../house/index.js';
import { prepHouseMeshes, unregisterWindows } from '../spaces/house.js';
import { spawnPet } from '../pet/render.js';
import { disposeSkin } from '../cosmetics/skin.js';
import { DOOR_COLORS, NEIGHBOR, NEIGHBOR_R, ROOF_COLORS, WALL_COLORS } from '../data/places.js';
import { stage7Boxes } from '../house-stage7.js';
import { hostSpot, houseSolidR } from './rules.js';

export const GROUND_R = NEIGHBOR_R + 18;   // 34 — 언덕 끝 허공이 안 보이게(과수원 ORCHARD_HALF+16 과 같은 교훈). shadow-scope: 700−34−18 = 648m
const TREE_SPOTS = [[-15, -8], [-17, 3], [-13, 11], [15, -8], [17, 3], [13, 11], [-7, -16], [7, -16]];
const PAL = { roof: ROOF_COLORS, wall: WALL_COLORS, door: DOOR_COLORS };

/** 🎨 game.js applyHouseStyle 와 같은 규칙 — 0번 = 그 모델 기본색(prepHouseMeshes 가 baseColor 로 기억), 1~4 = 공용 팔레트.
 *  역할마다 기본색을 먼저 다 읽고 나서 칠한다(같은 재질을 두 메시가 쓰면 칠한 색을 기본색으로 읽는다). */
export function paintHouse(root, style) {
  const base = {};
  root.traverse(o => {
    const r = o.userData.role;
    if (o.isMesh && PAL[r] && base[r] == null) base[r] = o.userData.baseColor ?? o.material.color.getHex();
  });
  root.traverse(o => {
    const r = o.userData.role;
    if (!o.isMesh || !o.material || !PAL[r]) return;
    const list = [base[r], ...PAL[r].slice(1)];
    o.material.color.setHex(list[(style[r] | 0) % list.length]);
  });
}

// 1~2단계 — js/spaces/house.js buildHouseStage 와 같은 치수(그쪽은 전역 houseGroup 에 붙여서 못 쓴다). 정면 +z
function earlyHouse(stage) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3, 0.24, 3), new THREE.MeshStandardMaterial({ color: 0xcaa06a, roughness: 0.85 }));
  deck.position.y = 0.22; g.add(deck);
  if (stage >= 2) {
    const logMat = new THREE.MeshStandardMaterial({ color: WALL_COLORS[0], roughness: 0.85 });
    for (const [x, z, ry] of [[0, 1.45, 0], [0, -1.45, 0], [1.45, 0, Math.PI / 2], [-1.45, 0, Math.PI / 2]]) {
      for (const y of [0.62, 1.0, 1.38]) {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.9, 8), logMat);
        log.rotation.set(0, ry, Math.PI / 2); log.position.set(x, y, z); log.userData.role = 'wall'; g.add(log);
      }
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.14), new THREE.MeshStandardMaterial({ color: DOOR_COLORS[0], roughness: 0.85 }));
    door.position.set(0, 0.85, 1.55); door.userData.role = 'door'; g.add(door);
  }
  return g;
}

// 고정 세트 — 바닥 · 울타리(남쪽 출구만 비움) · 나무 8그루
function fixedSet() {
  const g = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND_R, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xa9d68f, roughness: 1 }));
  ground.position.set(NEIGHBOR.x, 0.005, NEIGHBOR.z); ground.receiveShadow = true; g.add(ground);
  const wood = new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.9, flatShading: true });
  const postGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);
  const R = NEIGHBOR_R + 1.2;
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.22) continue;   // +z(남쪽, 카메라 쪽) = 나가는 길
    const post = new THREE.Mesh(postGeo, wood);
    post.position.set(NEIGHBOR.x + Math.cos(a) * R, 0.35, NEIGHBOR.z + Math.sin(a) * R); g.add(post);
  }
  const trunk = new THREE.MeshStandardMaterial({ color: 0x8a6440, roughness: 0.95, flatShading: true });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x6fb46a, roughness: 0.9, flatShading: true });
  for (const [x, z] of TREE_SPOTS) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.2, 6), trunk);
    t.position.set(NEIGHBOR.x + x, 0.6, NEIGHBOR.z + z); t.castShadow = true; g.add(t);
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 7), leaf);
    c.position.set(NEIGHBOR.x + x, 2.2, NEIGHBOR.z + z); c.castShadow = true; g.add(c);
  }
  return g;
}

/** view → 씬에 올린 이웃 공간. dispose() 가 메시·충돌체·밤 점등 등록을 전부 되돌린다 */
export function buildNeighborScene(view) {
  const group = new THREE.Group(); group.name = 'neighbor';
  const solids = [];
  group.add(fixedSet());

  const house = view.houseStage >= 3 ? buildHouseModel(THREE, view.houseStage, view.style || undefined) : earlyHouse(view.houseStage);
  if (view.houseStage >= 3) house.add(mountHouseAddons(THREE, view.houseStage, view.addons, view.style || undefined));
  house.position.copy(NEIGHBOR);   // 모델 정면이 +z — 마을은 houseGroup(π)·래퍼(π)로 상쇄하지만 여기선 돌리지 않는다
  prepHouseMeshes(house);          // 그림자 · 기본색 기억 · 밤 창문 등록(houseWindows) — 치울 때 unregisterWindows
  paintHouse(house, view.houseStyle);
  group.add(house);
  if (view.houseStage >= 7) for (const b of stage7Boxes(view.style, NEIGHBOR)) solids.push(solidBox(b.x0, b.z0, b.x1, b.z1));
  else if (view.houseStage >= 3) solids.push(solidCircle(NEIGHBOR.x, NEIGHBOR.z, houseSolidR(view.houseStage)));

  for (const o of view.outdoor) {   // 앞마당 장식 — 집 터 기준 상대좌표. 충돌체는 두지 않는다(구경 공간)
    const m = outdoorMesh(o.id);
    m.position.set(NEIGHBOR.x + o.dx, 0, NEIGHBOR.z + o.dz);
    m.rotation.y = o.rot * Math.PI / 2;
    group.add(m);
  }

  const spot = hostSpot(view.houseStage, view.style, NEIGHBOR);
  const host = buildCharacterMesh(view.character, { owned: [], equipped: view.equipped });
  host.position.set(spot.x, 0, spot.z);   // rotation 0 = +z(카메라) 를 본다
  group.add(host);
  solids.push(solidCircle(spot.x, spot.z, 0.45));
  let pet = null;
  if (view.pet) {
    pet = spawnPet(THREE, view.pet.kind, view.pet.stage);
    if (pet) { pet.position.set(spot.x + 1.1, 0, spot.z + 0.3); group.add(pet); }
  }

  const sign = makeSignpost('🚪 내 마을로', NEIGHBOR.x + 2.4, NEIGHBOR.z + NEIGHBOR_R - 0.6);
  group.add(sign);
  scene.add(group);

  let t = 0;
  return {
    group,
    hostSpot: spot,
    update(dt) { t += dt; host.position.y = Math.abs(Math.sin(t * 2.2)) * 0.04; },   // 반가워서 통통
    dispose() {
      for (const c of solids) removeSolid(c);
      sign.userData.dead = true;                                     // makeSignpost 의 rAF 등록이 철거 뒤에 돌지 않게
      if (sign.userData.solid) removeSolid(sign.userData.solid);
      unregisterWindows(group);                                      // 집 창문·정원등·화로 — 밤 점등 목록에서 뺀다
      scene.remove(group);
      group.remove(host); disposeSkin(host);
      if (pet) group.remove(pet);
      disposeTree(group);
    },
  };
}
```

- [ ] **Step 5: `js/spaces/neighbor.js` 작성**

```js
// =============================================================
//  🏡 이웃 마을 — 오늘의 이웃 열기 · 입장/퇴장 · 집주인 반응 (공간 머리말)
//  스펙: docs/superpowers/specs/2026-10-07-neighbor-village-design.md
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 의 let 에 쓸 때는 `$w.x = …`.
//  🔒 게임 상태는 gameState.neighbors · gameState.hintsSeen.neighborPublic 만 쓴다(tests/neighbor-space 가 잠근다).
//     이웃 데이터는 visit 객체에만 둔다. 3D 는 js/neighbors/scene.js, 화면은 js/neighbors/ui.js.
// =============================================================
import { $w, ANIMALS, gameState, giveReward, player, requestSave, setSpaceVisible, snapCamera, syncStory, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { OUTDOOR } from '../data/catalog.js';
import { HOUSE_POS, NEIGHBOR, NEIGHBOR_GATE, NEIGHBOR_R } from '../data/places.js';
import { Sound } from '../sound.js';
import { sanitizeShowcase } from '../neighbors/sanitize.js';
import { FAIL_TOAST, HOST_TALK_R, REWARD_COINS, pickerRows, reactOutcome, recordVisit } from '../neighbors/rules.js';
import { evFail, evOpen, evReact, evVisitEnd, evVisitStart } from '../neighbors/track.js';
import { neighborApi } from '../neighbors/net.js';
import { buildNeighborScene } from '../neighbors/scene.js';
import { closePickerModal, hideNeighborHud, openPickerModal, setHostBubble, setPickerBusy, showNeighborHud } from '../neighbors/ui.js';

let visit = null;          // { publicId, slot, revisit, view, built, t0, reacted, bubble:'ask'|'thanks', near, busy }
let pickerBusy = false;

const faceOf = (id) => (ANIMALS.find(a => a.id === id) || ANIMALS[0]).emoji;
const showcaseCtx = () => ({
  outdoorIds: new Set(OUTDOOR.map(d => d.id)), animalIds: new Set(ANIMALS.map(a => a.id)),
  fallbackAnimal: ANIMALS[0].id, yard: { x: HOUSE_POS.x, z: HOUSE_POS.z },
});

// ── 🏡 팻말 → 오늘의 이웃 ──
export async function openNeighborPicker(via) {
  if (pickerBusy || visit) return;
  pickerBusy = true;
  try {
    const today = await neighborApi.today();
    if (!today.ok) { trackEvent(...evFail('today', today.reason)); ui.toast?.(FAIL_TOAST, 2600); return; }
    trackEvent(...evOpen(today, via));                       // [GA4] 후보 수·오늘 받은 보상·진입 경로
    openPickerModal(pickerRows(today.list, faceOf), today.rewardedToday, goVisit);
  } finally { pickerBusy = false; }
}

async function goVisit(row) {
  const r = await neighborApi.showcase(row.publicId);
  const view = r.ok ? sanitizeShowcase(r.data, showcaseCtx()) : null;
  if (!view) {
    trackEvent(...evFail('showcase', r.ok ? 'invalid' : (r.code || r.reason)));
    ui.toast?.(FAIL_TOAST, 2600);
    setPickerBusy(false);
    return;
  }
  closePickerModal();
  enterNeighbor({ publicId: row.publicId, slot: row.slot, revisit: row.done, view, loadMs: r.loadMs });
}

// ── 입장 · 퇴장 ──
export function enterNeighbor(entry) {
  if (visit) return;
  const built = buildNeighborScene(entry.view);
  visit = { ...entry, built, t0: performance.now(), reacted: entry.revisit, bubble: entry.revisit ? 'thanks' : 'ask', near: false, busy: false };
  $w.atNeighbor = true;
  player.position.set(NEIGHBOR.x, 0, NEIGHBOR.z + NEIGHBOR_R - 2.5);
  player.rotation.y = Math.PI;   // 집 쪽(−z)을 보고 선다
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  showNeighborHud(entry.view.nickname, exitNeighbor);
  Sound.blip();
  trackEvent(...evVisitStart(entry));                        // [GA4] host·slot·revisit·load_ms
}

export function exitNeighbor() {
  if (!visit) return;
  const v = visit; visit = null;
  hideNeighborHud();
  v.built.dispose();
  $w.atNeighbor = false;
  player.position.set(NEIGHBOR_GATE.x, 0, NEIGHBOR_GATE.z + 2.2);
  player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  Sound.blip();
  trackEvent(...evVisitEnd(v.publicId, (performance.now() - v.t0) / 1000, v.reacted));   // [GA4] 머문 시간·반응 여부
  gameState.neighbors = recordVisit(gameState.neighbors);   // 📖 8장 판정(visited ≥ 1)
  requestSave();
  setTimeout(() => syncStory('neighbor_visit'), 600);       // 📖 8장 — 마을로 돌아온 화면이 먼저 보이고 나서
}

// ── 집주인 말풍선 · 반응 ──
const bubbleNow = () => ({ face: faceOf(visit.view.character), state: visit.bubble, onReact });

async function onReact(emoji) {
  const v = visit;
  if (!v || v.busy || v.bubble !== 'ask') return;
  v.busy = true;
  //  🔐 게스트는 서버가 어차피 login 을 준다 — 호출 자체를 생략(광장과 같은 규칙)
  const res = authState.isGuest ? { ok: false, reason: 'login' } : await neighborApi.react(v.publicId, emoji);
  v.busy = false;
  const out = reactOutcome(res);
  trackEvent(...evReact(v.publicId, emoji, out));            // [GA4] host·emoji·rewarded·reason
  if (out.reward) { giveReward({ coins: REWARD_COINS }, 'neighbor_visit', v.publicId); requestSave(); }   // [원장] econ_logs source=neighbor_visit · item=public_id
  if (out.reason === 'ok' || out.reason === 'dup') v.reacted = true;
  else if (out.reason !== 'login') trackEvent(...evFail('react', out.reason));
  if (out.toast) ui.toast?.(out.toast, 2400);
  if (out.bubble && visit === v) { v.bubble = out.bubble; if (v.near) setHostBubble(bubbleNow()); }
}

export function updateNeighbor(dt) {
  if (!visit) return;
  visit.built.update(dt);
  const h = visit.built.hostSpot;
  const near = Math.hypot(player.position.x - h.x, player.position.z - h.z) < HOST_TALK_R;
  if (near === visit.near) return;
  visit.near = near;
  setHostBubble(near ? bubbleNow() : null);
}

// ── game.js·doors.js 배선용(천문대 observatory.js 와 같은 자리) ──
/** 남쪽 출구 앞이면 'neighborexit' */
export function neighborDoor(p) {
  return Math.hypot(p.x - NEIGHBOR.x, p.z - (NEIGHBOR.z + NEIGHBOR_R)) < 2.2 ? 'neighborexit' : null;
}

/** 🏡 액션 — 팻말·나가기. 이웃 공간 안에선 그 밖의 액션을 전부 삼킨다(남의 마당에서 밭이 갈리지 않게) */
export function neighborAction(nearDoor) {
  if (nearDoor === 'neighbor') return openNeighborPicker('sign');
  if (nearDoor === 'neighborexit') return exitNeighbor();
}

/** 원형 마당 안쪽으로 제한 — 없으면 마을 반경 42 클램프가 입장하자마자 (0,42) 로 끌어당긴다 */
export function clampToNeighbor(p) {
  const R = NEIGHBOR_R - 0.6, dx = p.x - NEIGHBOR.x, dz = p.z - NEIGHBOR.z, dd = Math.hypot(dx, dz);
  if (dd > R) { p.x = NEIGHBOR.x + dx / dd * R; p.z = NEIGHBOR.z + dz / dd * R; }
}

/** 🏡 미니맵 — 나가는 길(남쪽) · 이웃의 집 · 집주인 */
export function neighborMinimapMarks(marks) {
  marks.push({ x: NEIGHBOR.x, z: NEIGHBOR.z + NEIGHBOR_R, c: '#c8905a', kind: 'exit' });
  marks.push({ x: NEIGHBOR.x, z: NEIGHBOR.z, c: '#e0b483', r: 4 });
  if (visit) marks.push({ x: visit.built.hostSpot.x, z: visit.built.hostSpot.z, c: '#ffd36e', r: 2.6 });
}

/** 이웃 공간에서 저장되면 팻말 앞으로 적는다 — 새로고침하면 마을에서 시작한다 */
export function neighborReturnPos() { return { x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z + 2.2 }; }
```

- [ ] **Step 6: game.js 배선**

126행 places import 목록 끝 `WALL_COLORS, DOOR_COLORS, PART_NAME, HOUSE_POS,` → `WALL_COLORS, DOOR_COLORS, PART_NAME, HOUSE_POS, NEIGHBOR, NEIGHBOR_R, NEIGHBOR_GATE,`

170행 observatory import 아래:
```js
import { clampToNeighbor, neighborAction, neighborMinimapMarks, neighborReturnPos, updateNeighbor } from './spaces/neighbor.js';   // 📦 🏡 이웃 마을 — 남의 앞마당 구경(js/neighbors/*)
```
253행 `$w` 의 `get atMuseum() …` 줄 아래:
```js
  get atNeighbor() { return atNeighbor; }, set atNeighbor(v) { atNeighbor = v; },
```
455행 `let atObservatory = false, observatoryGroup = null;` 아래:
```js
let atNeighbor = false;                               // 🏡 이웃 마을(남의 앞마당) 안에 있는지 — 공간은 js/neighbors/scene.js 가 입장 때 짓고 퇴장 때 치운다
```
1452행 `if (atObservatory) return 'observatory';` 아래:
```js
  if (atNeighbor) return 'neighbor';       // 🏡 남의 마당 — 맨손(ZONE_PAGE)
```
2343행·5533행 place 식의 `atObservatory ? 'observatory' : atRiver ?` → `atObservatory ? 'observatory' : atNeighbor ? 'neighbor' : atRiver ?` (두 곳 모두)

2580행 `getGameState` 첫 줄 `gameState.playerPos = { x: player.position.x, z: player.position.z };` →
```js
  gameState.playerPos = atNeighbor ? neighborReturnPos() : { x: player.position.x, z: player.position.z };   // 🏡 z=700 을 적으면 새로고침 때 (0,42) 로 튄다
```
2686행 `_spaceFlags` 객체 끝 `atOrchard: false };` → `atOrchard: false, atNeighbor: false };`, 2690행 끝 `_spaceFlags.atOrchard = atOrchard;` 뒤에 ` _spaceFlags.atNeighbor = atNeighbor;`

5456행 `} else if (place === 'observatory') { observatoryMinimapMarks(marks);   // …` 아래:
```js
  } else if (place === 'neighbor') { neighborMinimapMarks(marks);   // 🏡 나가는 길 · 이웃의 집 · 집주인
```
5519행 `updateObservatory(dt, t);` → `updateObservatory(dt, t); updateNeighbor(dt);`

5549행 C 식의 `place === 'observatory' ? OBSERVATORY :` 뒤에 `place === 'neighbor' ? NEIGHBOR :`, 5551행 half 식의 `place === 'observatory' ? OBSERVATORY_R :` 뒤에 `place === 'neighbor' ? NEIGHBOR_R :`

5743행 `} else if (atObservatory) { clampToObservatory(player.position);   // …` 아래:
```js
  } else if (atNeighbor) { clampToNeighbor(player.position);   // 🏡 원형 마당 안쪽으로 제한
```
6518행 `if (atObservatory || nearDoor === 'observatory') return observatoryAction(nearDoor);` 아래:
```js
  if (atNeighbor || nearDoor === 'neighbor') return neighborAction(nearDoor);   // 🏡 팻말·나가기 — 이웃 공간 안에선 그 밖의 액션 없음
```
7401행 export 목록 `atMuseum, atObservatory, atOrchard, atRiver, atSea,` → `atMuseum, atObservatory, atOrchard, atNeighbor, atRiver, atSea,`

- [ ] **Step 7: 주변 모듈 가드**

`js/data/tools.js:73` `ZONE_PAGE` 첫 줄 끝 `observatory: 'none',` 뒤에 ` neighbor: 'none',`

`js/shadow-scope.js:42` → `export const OUT_OF_REACH_FLAGS = ['atMine', 'atCafe', 'atRiver', 'atMist', 'atSea', 'atMuseum', 'atObservatory', 'atOrchard', 'atNeighbor'];` 그리고 바로 위 주석 블록 끝에:
```js
//   🏡 이웃 마을 — 지오메트리 계산(2026-10-07): 바닥 CircleGeometry(NEIGHBOR_R + 18 = 34) @ (0,700) →
//   z 최소 666, 상자 클램프 18 을 빼서 648m. MAX_REACH(60) 밖. 바닥 반경을 바꾸면 tests/shadow-scope 가 다시 계산한다.
```

`js/spaces/doors.js`
- 9행 import 목록 `atObservatory, atOrchard,` → `atObservatory, atOrchard, atNeighbor,`
- 다른 `../spaces/*` import 들 아래에 `import { neighborDoor } from '../spaces/neighbor.js';`
- 162행 `if (atRiver) { … return; }` 블록 바로 아래:
```js
  if (atNeighbor) {    // 🏡 이웃 마을: 남쪽으로 나가기 — 집주인 반응은 말풍선이 맡는다(js/spaces/neighbor.js)
    nd = neighborDoor(player.position);
    prompt = nd ? '🚪 내 마을로' : null;
    $w.nearDoor = nd;
    if (prompt !== lastDoorPrompt) { $w.lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
    if (lastZoneHint !== null) { $w.lastZoneHint = null; ui.setZoneHint?.(null); }
    return;
  }
```
- 408행 `inVillage2` 끝 `&& !atOrchard; }` → `&& !atOrchard && !atNeighbor; }`

`js/spaces/outdoor-decor.js` 9행 import 에 `atNeighbor,` 추가(`atMuseum, atObservatory,` 뒤), 23행 →
```js
export function outdoorZone() { return !indoor && !atMine && !atCafe && !atRiver && !atMist && !atSea && !atMuseum && !atObservatory && !atNeighbor; }
```

`index.html` 3612행 바닥색 식의 `d.place === 'observatory' ? 'rgba(90,84,130,0.8)' :` 뒤에 `d.place === 'neighbor' ? 'rgba(150,200,120,0.75)' :`, 3628행 라벨 식의 `d.place === 'orchard' ? '🍎 과수원' :` 뒤에 `d.place === 'neighbor' ? '🏡 이웃의 숲' :`

- [ ] **Step 8: 통과 + 회귀**

Run: `node --test tests/neighbor-space.test.mjs tests/shadow-scope.test.mjs tests/observatory-wiring.test.mjs && npm test`
Expected: PASS, 전체 FAIL 0. (gameSource 가 spaces/neighbor.js 를 이어 붙이므로 `setShadowActive(` 등장 횟수 같은 카운트 테스트가 깨지면 neighbor.js 에 그 이름이 들어갔는지 확인 — 이 파일은 쓰지 않는다.)

- [ ] **Step 9: 커밋**

```bash
git add js/data/places.js js/neighbors/scene.js js/spaces/neighbor.js js/game.js js/data/tools.js js/shadow-scope.js js/spaces/doors.js js/spaces/outdoor-decor.js index.html tests/neighbor-space.test.mjs tests/shadow-scope.test.mjs
git commit -m "feat: 🏡 이웃 공간(0,0,700) — 앞마당 짓기·치우기·입퇴장·집주인 반응·공간 플래그 배선

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 마을 배선 — 팻말·지도·세이브·부팅 알림·설정 토글·8장 해제

**Files:**
- Modify: `js/spaces/neighbor.js`(import 교체 + 팻말·부팅·토글 함수 추가)
- Modify: `js/game.js` — neighbor import 줄(Task 7) 교체 + rules import · `buildEnvironment`(4413행 아래) · 나무 산포 제외(2812행) · 꽃 제외(4404행) · `VILLAGE_PLACES`(천문대 줄 아래) · `gameState`(1013행 아래) · `applySave`(2538행 아래) · `enterGame`(2354행) · `syncStory` 토스트(1125행)
- Modify: `js/spaces/doors.js:20`(places import), `js/spaces/doors.js:280`(천문대 게이트 분기 아래)
- Modify: `js/story/chapters.js:53-57`, `js/story/rules.js:20`, `js/i18n-en.js`(8장 2줄)
- Modify: `tests/story-chapters.test.mjs:14-17,45-49,51-57,59-71`
- Test: `tests/neighbor-village.test.mjs`

**Interfaces:**
- Consumes: Task 3~7 전부
- Produces:
  - spaces/neighbor.js: `spawnNeighborGate()`, `initNeighbors()`
  - `gameState.neighbors = { visited, seenAt }`(기본값 `neighborsDefault()`, 복원 `restoreNeighbors`)
  - `STORY_RULES.neighbors = { done: s => visited ≥ 1, progress: s => '방문 n/1' }`

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbor-village.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const SRC = gameSource();
const SPACE = read('js/spaces/neighbor.js');
const DOORS = read('js/spaces/doors.js');

function vec3(name) {
  const m = new RegExp(`const ${name} = new THREE\\.Vector3\\(\\s*(-?[\\d.]+)\\s*,\\s*-?[\\d.]+\\s*,\\s*(-?[\\d.]+)\\s*\\)`).exec(SRC);
  assert.ok(m, `${name} 좌표를 못 찾았다`);
  return { x: +m[1], z: +m[2] };
}
const num = (name) => { const m = new RegExp(`const ${name} = (-?[\\d.]+)`).exec(SRC); assert.ok(m, name); return +m[1]; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function bodyOf(name) {
  const i = SRC.indexOf(`function ${name}(`);
  assert.ok(i >= 0, `${name} 없음`);
  const rest = SRC.slice(i + 1);
  const j = rest.search(/\n(?:async )?function |\nconst [A-Za-z_$]+ = /);
  return SRC.slice(i, i + 1 + (j < 0 ? rest.length : j));
}

test('🏡 팻말 자리가 다른 장소·주민·나무 링과 겹치지 않는다', () => {
  const G = vec3('NEIGHBOR_GATE');
  const RING = 2.6;   // buildGlade/buildForest 링 = R + 1.2~1.4 + 1.2~1.4 (tests/village-places 와 같은 근사)
  assert.ok(dist(G, vec3('GLADE')) > num('GLADE_R') + RING + 1, '🌟계곡 나무 링과 겹친다');
  assert.ok(dist(G, vec3('FOREST')) > num('FOREST_R') + RING + 1, '🍄숲 나무 링과 겹친다');
  for (const n of ['COOP', 'CAFE_GATE', 'FARM_GATE', 'OBSERVATORY_GATE', 'MUSEUM_GATE', 'HOUSE_POS']) assert.ok(dist(G, vec3(n)) > 6, n);
  const npcs = [...read('js/data/npcs.js').matchAll(/pos: \[(-?[\d.]+), 0, (-?[\d.]+)\]/g)].map(m => ({ x: +m[1], z: +m[2] }));
  assert.ok(npcs.length >= 11);
  for (const p of npcs) assert.ok(dist(G, p) > 3, `주민 자리 ${p.x},${p.z} 와 가깝다`);
  const kiln = JSON.parse(/export const KILN_SPOTS = (\[\[.*?\]\]);/.exec(read('js/data/catalog.js'))[1]);
  for (const [x, z] of kiln) assert.ok(dist(G, { x, z }) > 3, `화덕 후보 ${x},${z}`);
  assert.ok(Math.hypot(G.x, G.z) < 40, '마을 이동 반경(42) 안');
});

test('팻말 세우기 · 나무/꽃 산포 제외 · 지도 지명 · 문 프롬프트', () => {
  assert.match(bodyOf('buildEnvironment'), /spawnNeighborGate\(\);/);
  assert.match(SRC, /\|\| dist2D\(\{ x, z \}, NEIGHBOR_GATE\) < 3/);
  assert.match(SRC, /if \(dist2D\(\{ x, z \}, NEIGHBOR_GATE\) < 1\.5\) continue;/);
  assert.match(SRC, /\{ ico: '🏡', name: '이웃 마을 가는 길', x: NEIGHBOR_GATE\.x, z: NEIGHBOR_GATE\.z, pri: 1 \}/);
  assert.match(DOORS, /nd = 'neighbor'; prompt = '🏡 이웃 마을 가는 길';/);
  assert.match(DOORS, /firstHintBanner\('neighborGate', '🏡', '이웃 마을 가는 길', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요'\)/);
  assert.match(SPACE, /makeSignpost\('🏡 이웃 마을 가는 길', 0, 0\)/);
});

test('세이브 필드 neighbors — 기본값·복원·부팅 알림', () => {
  assert.match(SRC, /neighbors: neighborsDefault\(\),/);
  assert.match(bodyOf('applySave'), /gameState\.neighbors = restoreNeighbors\(saved\.neighbors\);/);
  assert.match(SRC, /syncStory\(\); storyBooted = true;[^\n]*\n\s*initNeighbors\(\);/);
  assert.match(SPACE, /openVisitorsModal\(view, \(\) => \{ gameState\.neighbors = markSeen\(gameState\.neighbors, asked\); requestSave\(\); firstPublicNotice\(\); \}\)/);
  assert.match(SPACE, /trackEvent\(\.\.\.evNotice\(view\.rows\.length, view\.total\)\)/);
  assert.match(SPACE, /gameState\.hintsSeen\.neighborPublic = true;/);
  assert.match(SPACE, /ui\.toast\?\.\('🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요', 4200\)/);
});

test('설정 토글 — 성공하면 상태·GA4, 실패하면 토스트+실패 이벤트, 게스트는 숨김', () => {
  assert.match(SPACE, /trackEvent\(\.\.\.evToggle\(villagePublic\)\)/);
  assert.match(SPACE, /trackEvent\(\.\.\.evFail\('toggle', r\.reason\)\); ui\.toast\?\.\(FAIL_TOAST, 2400\)/);
  assert.match(SPACE, /setVillagePublicUi\(villagePublic, member\)/);
});

test('8장 해제 — 기존 4장 완료자처럼 7장 완료자에게도 새 장 토스트', () => {
  assert.match(bodyOf('syncStory'), /if \(!storyBooted && !retro && \(st\.ch === 4 \|\| st\.ch === 7\)\)/);
});
```

`tests/story-chapters.test.mjs` 수정 — 14~17행 테스트를:
```js
test('STORY: 8장, id 고유, 순서, 잠긴 장 없음(🏡 이웃 마을 출시)', () => {
  assert.deepEqual(STORY.map(c => c.id), ['home', 'friends', 'taste', 'secret', 'living', 'memory', 'stars', 'neighbors']);
  assert.deepEqual(STORY.map(c => !!c.soon), [false, false, false, false, false, false, false, false]);
  assert.deepEqual(STORY.slice(4).map(c => c.reward.coins), [100, 120, 120, 150]);
  for (const c of STORY) assert.ok(STORY_RULES[c.id], `규칙 없음: ${c.id}`);
  assert.equal(STORY[7].done, '이웃의 마을에 다녀왔어요. 숲은 생각보다 넓고, 생각보다 따뜻해요.');
});
```
45~49행 테스트를:
```js
test('8장 neighbors: 이웃 마을 방문 1회 · 범위 밖은 false', () => {
  assert.equal(isSoon(STORY, 7), false);
  assert.equal(chapterDone(STORY, 7, ch4Done()), false);
  assert.equal(chapterDone(STORY, 7, ch4Done({ neighbors: { visited: 1, seenAt: 0 } })), true);
  assert.equal(chapterProgress(STORY, 7, ch4Done()), '방문 0/1');
  assert.equal(chapterProgress(STORY, 7, ch4Done({ neighbors: { visited: 3 } })), '방문 1/1');
  assert.equal(chapterDone(STORY, 99, ch4Done()), false);
});
```
51~57행 테스트를:
```js
test('pendingChapters: 4장 완료자 소급 — 5~8장 다 충족이면 [4,5,6,7](보상 합 490), 방문 전이면 7장에서 멈춘다', () => {
  const s = ch4Done({ farm: { stage: 2 }, orchard: { trees: [{}] }, museum: { special: { a: {} } }, star: { cleared: { b: 1 } } });
  assert.deepEqual(pendingChapters(STORY, s), [4, 5, 6]);
  const all = pendingChapters(STORY, { ...s, neighbors: { visited: 1 } });
  assert.deepEqual(all, [4, 5, 6, 7]);
  assert.equal(all.reduce((n, i) => n + STORY[i].reward.coins, 0), 490);
  assert.deepEqual(pendingChapters(STORY, ch4Done({ museum: { special: { a: {} } } })), []);   // 5장이 막히면 6장도 안 넘어간다
});
```
59~71행 테스트를:
```js
test('buildStoryView: 8장이 현재면 칩이 보이고(allDone false) 진행은 방문 n/1', () => {
  const v = buildStoryView(STORY, ch4Done({ story: { ch: 7, q: 3, started: {} } }));
  assert.equal(v.allDone, false);
  assert.equal(v.chapters[7].state, 'now');
  assert.equal(v.chapters[7].progress, '방문 0/1');
  assert.equal(v.chapters[6].state, 'done');
  const v5 = buildStoryView(STORY, ch4Done());
  assert.equal(v5.allDone, false);
  assert.equal(v5.chapters[4].state, 'now');
  assert.equal(v5.chapters[4].progress, '밭 1/2 · 나무 0/1');
  assert.equal(v5.chapters[5].state, 'lock');
  assert.equal(v5.chapters[7].state, 'lock');
  assert.equal(buildStoryView(STORY, base({ story: { ch: 8, q: 3 } })).allDone, true);
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbor-village.test.mjs tests/story-chapters.test.mjs` → FAIL

- [ ] **Step 3: `js/spaces/neighbor.js` 에 팻말·부팅·토글 추가**

game.js import 줄을 교체하고 three import 를 더한다:
```js
import { $w, ANIMALS, gameState, giveReward, makeSignpost, obstacles, player, requestSave, scene, setSpaceVisible, snapCamera, syncStory, ui } from '../game.js';
import * as THREE from 'three';
```
rules import 를 `import { FAIL_TOAST, HOST_TALK_R, REWARD_COINS, markSeen, noticeView, pickerRows, reactOutcome, recordVisit, visitorsSince } from '../neighbors/rules.js';` 로, track import 를 `import { evFail, evNotice, evOpen, evReact, evToggle, evVisitEnd, evVisitStart } from '../neighbors/track.js';` 로, ui import 를 `import { bindVillagePublicToggle, closePickerModal, hideNeighborHud, openPickerModal, openVisitorsModal, setHostBubble, setPickerBusy, setVillagePublicUi, showNeighborHud } from '../neighbors/ui.js';` 로 교체.

파일 끝에:
```js

// ── 🏡 마을 입구 팻말 — buildEnvironment 가 한 번 부른다 ──
let gateGroup = null;
export function spawnNeighborGate() {
  if (gateGroup) return gateGroup;   // 두 번 불려도 팻말·충돌체가 겹치지 않게
  gateGroup = new THREE.Group();
  gateGroup.position.copy(NEIGHBOR_GATE);
  gateGroup.add(makeSignpost('🏡 이웃 마을 가는 길', 0, 0));   // 기둥 충돌체는 makeSignpost 가 다음 프레임에 등록
  scene.add(gateGroup);
  obstacles.push({ x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z, r: 1.2 });   // 팻말 위엔 밭·야외 장식 금지
  return gateGroup;
}

// ── 접속(부팅) — ⚙️ 토글 묶기 + 다녀간 이웃 알림 + 첫 공개 안내 ──
let villagePublic = true;   // 서버 기본값과 같다. my_visitors 가 실제 값을 준다
export function initNeighbors() {
  bindVillagePublicToggle(toggleVillagePublic);
  const member = !!authState.online && !authState.isGuest;
  setVillagePublicUi(villagePublic, member);   // 게스트는 후보에 안 들어가므로 토글을 숨긴다
  if (!member || !gameState.character || !gameState.tutorialSeen) return;   // 신규 온보딩(캐릭터 선택·튜토리얼)과 겹치지 않게
  setTimeout(bootVisitors, 6000);   // 출석·📮 소식 모달이 먼저 — 그 뒤 빈 화면을 기다려 띄운다
}

async function bootVisitors() {
  const asked = Date.now();
  const r = await neighborApi.visitors(visitorsSince(gameState.neighbors.seenAt, asked));
  if (!r.ok) { trackEvent(...evFail('visitors', r.reason)); return; }   // 접속 직후라 토스트로 방해하지 않는다(GA4 로만)
  villagePublic = r.isPublic;
  setVillagePublicUi(villagePublic, true);
  whenNoModal(() => {
    if (r.total > 0) {
      const view = noticeView(r, faceOf);
      trackEvent(...evNotice(view.rows.length, view.total));   // [GA4] 보여 준 줄 수·전체 방문자 수
      openVisitorsModal(view, () => { gameState.neighbors = markSeen(gameState.neighbors, asked); requestSave(); firstPublicNotice(); });
    } else firstPublicNotice();
  });
}

function firstPublicNotice() {
  if (gameState.hintsSeen.neighborPublic || !villagePublic) return;
  gameState.hintsSeen.neighborPublic = true;
  requestSave();
  ui.toast?.('🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요', 4200);
}

// 출석·소식·안내 모달이 떠 있으면 닫힐 때까지 기다린다(최대 30초 — 그래도 안 닫히면 그냥 띄운다)
function whenNoModal(fn, tries = 0) {
  if (!ui.anyModalOpen?.() || tries >= 20) return fn();
  setTimeout(() => whenNoModal(fn, tries + 1), 1500);
}

async function toggleVillagePublic() {
  const next = !villagePublic;
  const r = await neighborApi.setPublic(next);
  if (!r.ok) { trackEvent(...evFail('toggle', r.reason)); ui.toast?.(FAIL_TOAST, 2400); return; }
  villagePublic = r.is_public;
  setVillagePublicUi(villagePublic, true);
  trackEvent(...evToggle(villagePublic));   // [GA4] 공개 끄기·켜기
}
```

- [ ] **Step 4: game.js 배선**

Task 7 에서 넣은 neighbor import 줄을 교체하고 rules import 를 더한다:
```js
import { clampToNeighbor, initNeighbors, neighborAction, neighborMinimapMarks, neighborReturnPos, spawnNeighborGate, updateNeighbor } from './spaces/neighbor.js';   // 📦 🏡 이웃 마을 — 남의 앞마당 구경(js/neighbors/*)
import { neighborsDefault, restoreNeighbors } from './neighbors/rules.js';   // 🏡 세이브 필드 neighbors { visited, seenAt }
```
1013행 `plaza: plazaDefault(),` 아래:
```js
  neighbors: neighborsDefault(),       // 🏡 이웃 마을 { visited: 다녀온 횟수(📖 8장), seenAt: 다녀간 이웃 알림을 마지막으로 확인한 시각(ms) }
```
2538행 `gameState.plaza = restorePlaza(saved.plaza);` 아래:
```js
  gameState.neighbors = restoreNeighbors(saved.neighbors);   // 🏡 이웃 마을(옛 세이브=기본값)
```
2354행 `syncStory(); storyBooted = true;      // …` 아래:
```js
  initNeighbors();                      // 🏡 ⚙️ 공개 토글 + 다녀간 이웃 알림(6초 뒤, 모달이 비면) — 게스트는 토글만 숨긴다
```
1125행 `if (!storyBooted && !retro && st.ch === 4)` → `if (!storyBooted && !retro && (st.ch === 4 || st.ch === 7))` (윗줄 주석 끝에 `· 7 = 🏡 이웃 마을 출시로 8장이 열린 기존 완료자` 덧붙임)

4413행 `spawnObservatoryGate(); // 🔭 …` 아래:
```js
  spawnNeighborGate();    // 🏡 이웃 마을 가는 길(마을 남쪽, 🍄숲·🌟계곡 사이) — 처음부터 있음
```
2812행 `|| dist2D({ x, z }, { x: OBSERVATORY_GATE.x, z: OBSERVATORY_GATE.z + 5 }) < 3.8` 아래:
```js
      || dist2D({ x, z }, NEIGHBOR_GATE) < 3   // 🏡 이웃 마을 팻말이 나무에 가리지 않게
```
4404행 `if (dist2D({ x, z }, OBSERVATORY_GATE) < 6.2) continue;` 아래:
```js
    if (dist2D({ x, z }, NEIGHBOR_GATE) < 1.5) continue;             // 🏡 이웃 마을 팻말 밑
```
`VILLAGE_PLACES` 의 `{ ico: '🔭', name: '천문대', … },` 아래:
```js
  { ico: '🏡', name: '이웃 마을 가는 길', x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z, pri: 1 },
```

- [ ] **Step 5: doors.js 팻말 프롬프트** — 20행 places import 에 `NEIGHBOR_GATE,` 추가(`MUSEUM_GATE,` 뒤), 280~282행 천문대 게이트 분기(`firstHintBanner('observatoryGate', …);`) 아래:

```js
  } else if (dist2D({ x: NEIGHBOR_GATE.x, z: NEIGHBOR_GATE.z + 1.2 }, player.position) < 2.2) {
    nd = 'neighbor'; prompt = '🏡 이웃 마을 가는 길';
    firstHintBanner('neighborGate', '🏡', '이웃 마을 가는 길', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요');
```

- [ ] **Step 6: 8장 해제**

`js/story/chapters.js:53-57`:
```js
  {
    id: 'neighbors', ico: '🏡', title: '이웃의 숲', goal: '이웃 마을에 놀러 가기',
    start: '같은 잎사귀를 받고 숲에 온 이웃들이 있대요. 그들의 마을에 놀러 가보자.',
    done: '이웃의 마을에 다녀왔어요. 숲은 생각보다 넓고, 생각보다 따뜻해요.',   // ⚠️ 문구 검수 대기(2026-10-07 후보) — 병합 전 사용자 확인
    reward: { coins: 150 },
  },
```
`js/story/rules.js:20`:
```js
  neighbors: { done: s => num(s.neighbors?.visited) >= 1,         progress: s => `방문 ${frac(num(s.neighbors?.visited), 1)}` },   // 🏡 이웃 마을 첫 방문(js/spaces/neighbor.js exitNeighbor)
```
`js/i18n-en.js` — `'\n\n🏡 다음 이야기는 곧 열려요.': …`(1394행) 아래:
```js
  '이웃의 마을에 다녀왔어요. 숲은 생각보다 넓고, 생각보다 따뜻해요.':
    "You visited a neighbor's village. The forest is bigger than you thought — and warmer, too.",
  '방문 {0#}/1': 'Visits {0}/1',
```

- [ ] **Step 7: 통과 + 회귀** — Run: `node --test tests/neighbor-village.test.mjs tests/story-chapters.test.mjs tests/story-i18n.test.mjs && npm test` → PASS, FAIL 0

- [ ] **Step 8: 커밋**

```bash
git add js/spaces/neighbor.js js/game.js js/spaces/doors.js js/story/chapters.js js/story/rules.js js/i18n-en.js tests/neighbor-village.test.mjs tests/story-chapters.test.mjs
git commit -m "feat: 🏡 이웃 마을 배선 — 팻말·지도·세이브 neighbors·부팅 알림·공개 토글·📖 8장 해제

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: i18n — 새 문자열 영어 전부

**Files:**
- Modify: `js/i18n-en.js`(Task 8 에서 넣은 8장 2줄 아래에 이어서)
- Test: `tests/neighbors-i18n.test.mjs`

**Interfaces:**
- Consumes: Task 3·6·7·8 의 한국어 문자열(그대로 키)

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbors-i18n.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t } = await import('../js/i18n.js');
const { houseLabel, pickerMeta, rewardLine, noticeView, reactOutcome, FAIL_TOAST } = await import('../js/neighbors/rules.js');
const HAS_KO = /[가-힣]/;
const en = (s) => { const out = t(s); assert.ok(!HAS_KO.test(out), `번역 없음: ${JSON.stringify(s)} → ${out}`); return out; };

test('검수 완료 문구(스펙 §8)', () => {
  for (const s of ['오늘의 이웃', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요', '놀러 가기', '또 보기', '❤️ 다녀옴',
    '🚪 내 마을로', '"와 줘서 고마워요! 어땠어요?"', '❤️ 마음을 남겼어요 · 🪙+5', '❤️ 마음을 남겼어요',
    '어제부터 지금까지', '고마워요 🌱']) en(s);
  assert.equal(en('🏡 Sparkly Bear #4821 의 마을'), "🏡 Sparkly Bear #4821's village");
});

test('미검수 문구 + 이 계획이 만든 문구', () => {
  for (const s of ['🏡 이웃 마을 가는 길', '이웃 마을 가는 길', '"또 와 줘서 기뻐요!"', '🔐 로그인하면 마음을 남길 수 있어요',
    '아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요', '이웃에게 내 마을 보여 주기',
    '🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요', '외 2명', '🏡 이웃의 숲']) en(s);
});

test('조합 문구 — 숫자·집 이름이 들어간 자리', () => {
  for (const st of [1, 2, 3, 4, 5, 6, 7]) en(houseLabel(st));
  en(pickerMeta({ house_stage: 6, decor_n: 23 }));
  en(pickerMeta({ house_stage: 3, decor_n: 0 }));
  assert.equal(en(rewardLine(2)), '🪙 Visit rewards today 2/3');
  assert.equal(en(noticeView({ total: 3, list: [] }, () => '🐻').title), '3 neighbors stopped by');
  assert.equal(en(noticeView({ total: 1, list: [] }, () => '🐻').title), 'A neighbor stopped by');
  en(reactOutcome({ ok: false, reason: 'login' }).toast);
  en(FAIL_TOAST);
  en('방문 0/1');
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbors-i18n.test.mjs` → FAIL (번역 없음)

- [ ] **Step 3: `js/i18n-en.js` 에 추가** — Task 8 의 `'방문 {0#}/1': 'Visits {0}/1',` 아래:

```js
  // 🏡 이웃 마을 구경하기(2026-10-07) — 스펙 §8. 미검수 문구는 계획서 Global Constraints 참조
  '오늘의 이웃': "Today's Neighbors",
  '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요': 'They came here with the same leaf as you · New neighbors tomorrow',
  '놀러 가기': 'Visit',
  '또 보기': 'Visit again',
  '❤️ 다녀옴': '❤️ Visited',
  '🪙 오늘 받은 방문 보상 {0#}/3': '🪙 Visit rewards today {0}/3',
  '🏡 {0} 의 마을': "🏡 {0}'s village",
  '🚪 내 마을로': '🚪 Back to my village',
  '"와 줘서 고마워요! 어땠어요?"': '"Thanks for coming! How was it?"',
  '"또 와 줘서 기뻐요!"': '"So happy you came again!"',
  '❤️ 마음을 남겼어요 · 🪙+5': '❤️ You left a reaction · 🪙+5',
  '❤️ 마음을 남겼어요': '❤️ You left a reaction',
  '🔐 로그인하면 마음을 남길 수 있어요': '🔐 Log in to leave a reaction',
  '이웃 1명이 다녀갔어요': 'A neighbor stopped by',
  '이웃 {0#}명이 다녀갔어요': '{0} neighbors stopped by',
  '어제부터 지금까지': 'Since yesterday',
  '고마워요 🌱': 'Thank you 🌱',
  '외 {0#}명': 'and {0} more',
  '🏡 이웃 마을 가는 길': '🏡 Road to the Neighbors',
  '이웃 마을 가는 길': 'Road to the Neighbors',
  '아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요': 'No neighbors to visit yet · Check back tomorrow',
  '이웃에게 내 마을 보여 주기': 'Show my village to neighbors',
  '🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요': '🏡 Neighbors can visit your village now · Turn it off in ⚙️ Settings',
  '코티지': 'Cottage',
  '{0} · 🪴 장식 {1#}': '{0} · 🪴 Decor {1}',
```

⚠️ `{0} · 🪴 장식 {1#}` · `🏡 내 마을이 … · …` 은 통문장 키다 — 사전 앞쪽의 `" · "` 글루 항등 패턴이 먼저 삼켜 한국어가 남으면 Step 4 가 실패한다. 그때는 `js/i18n.js` 114행 주석(글루 패턴 순서) 규칙대로 해당 키를 기존 `'요리 {0}/1 · 서빙 {1}/1'` 옆으로 옮긴다(memory: beta-feedback-r3 " · " 글루 함정).

- [ ] **Step 4: 통과 + 회귀** — Run: `node --test tests/neighbors-i18n.test.mjs && npm test` → PASS, FAIL 0

- [ ] **Step 5: 커밋**

```bash
git add js/i18n-en.js tests/neighbors-i18n.test.mjs
git commit -m "feat: 🏡 이웃 마을 영어 문구

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 개인정보처리방침 · 안내서 "4장" → 8장

**Files:**
- Modify: `pages/privacy.html:32`(최종 수정일), `pages/privacy.html:90`(4절 끝 문단 추가), `pages/privacy.html:~98`(5절 목록 항목 추가)
- Modify: `guide/guide.html:376`, `guide/guide-en.html:378`
- Test: `tests/neighbor-docs.test.mjs`

- [ ] **Step 1: 실패하는 테스트** — `tests/neighbor-docs.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('개인정보처리방침: 이웃 마을 공개 항목·끄는 법·보관', () => {
  const p = read('pages/privacy.html');
  assert.match(p, /<strong>이웃 마을 구경하기<\/strong>/);
  assert.match(p, /⚙️ 설정 › 이웃에게 내 마을 보여 주기/);
  assert.match(p, /이웃 방문 기록/);
  assert.doesNotMatch(p, /최종 수정일: 2026년 9월 11일/);
});

test('안내서: 8장까지', () => {
  const ko = read('guide/guide.html'), en = read('guide/guide-en.html');
  assert.match(ko, /<h3>📖 나의 이야기 - 8장<\/h3>/);
  assert.match(ko, /8장 이웃의 숲\(이웃 마을에 놀러 가기, \+150🪙\)/);
  assert.match(en, /<h3>📖 My Story: 8 chapters<\/h3>/);
  assert.match(en, /Ch\. 8 Neighboring Forests \(visit a neighbor's village, \+150🪙\)/);
});
```

- [ ] **Step 2: 실행 → 실패** — Run: `node --test tests/neighbor-docs.test.mjs` → FAIL

- [ ] **Step 3: `pages/privacy.html` 수정** (⚠️ 문단 전체가 **사용자 검수 대상** — 배포와 동시에 라이브)

32행 `최종 수정일: 2026년 9월 11일` → 배포 당일 날짜(예: `최종 수정일: 2026년 10월 9일`)로 바꾼다. 날짜는 배포 승인 때 확정.

4절 `…다른 이용자에게 공개되지 않습니다.</p>`(90행) 아래:
```html
  <p><strong>이웃 마을 구경하기</strong> — 로그인 계정의 닉네임, 고른 캐릭터와 착용한 꾸미기, 함께 다니는 펫의 종류,
     집 외관(단계·색·구성품)과 집 앞마당의 야외 장식이 다른 이용자에게 공개됩니다. 보유 자원·구매 내역·이메일·
     펫과 일꾼에게 지어 준 이름은 공개되지 않습니다. 이웃이 남긴 반응은 정해진 이모지 4종뿐이며 자유롭게 글을 쓸 수
     없습니다. 게임 안 <strong>⚙️ 설정 › 이웃에게 내 마을 보여 주기</strong>에서 언제든 끌 수 있고, 끄면 곧바로
     이웃 목록에서 빠지며 이미 열려 있던 화면의 임시 사본도 10분 안에 사라집니다. 게스트 계정은 공개되지 않습니다.</p>
```
5절 목록의 `<li><strong>게임 진행 상황·계정 정보</strong> — …</li>` 아래:
```html
    <li><strong>이웃 방문 기록</strong>(누가 누구의 마을에 언제 어떤 반응을 남겼는지) — 계정을 삭제하면 함께 삭제합니다.</li>
```

- [ ] **Step 4: 안내서 수정**

`guide/guide.html:376` 카드 전체를:
```html
      <div class="card" style="margin-top:10px"><h3>📖 나의 이야기 - 8장</h3><p>왼쪽 위 이야기 칩을 누르면 보여요.<br>1장 나의 첫 집(집 완성, +40🪙) → 2장 숲의 이웃들(의뢰 3번, 씨앗 5 + 30🪙) → 3장 첫 요리(요리 1번 + 서빙 1번, +50🪙) → 4장 잎사귀의 주인(안개 낀 숲 정화, +80🪙) → 5장 마을의 살림(밭 넓히고 과일나무 심기, +100🪙) → 6장 숲의 기억(박물관 특별 진열대 채우기, +120🪙) → 7장 별을 잇는 밤(천문대에서 별자리 잇기, +120🪙) → 8장 이웃의 숲(이웃 마을에 놀러 가기, +150🪙).<br>억지로 따라갈 필요는 없어요. 놀다 보면 저절로 넘어가요.</p></div>
```
`guide/guide-en.html:378` 카드 전체를:
```html
      <div class="card" style="margin-top:10px"><h3>📖 My Story: 8 chapters</h3><p>Tap the story chip at the top left to see it.<br>Ch. 1 My First Home (finish the house, +40🪙) → Ch. 2 Neighbors of the Forest (3 requests, 5 seeds + 30🪙) → Ch. 3 The First Dish (cook once + serve once, +50🪙) → Ch. 4 The Leaf's Keeper (purify the Misty Forest, +80🪙) → Ch. 5 Village Life (expand the field and plant a fruit tree, +100🪙) → Ch. 6 Memories of the Forest (fill the museum's special display, +120🪙) → Ch. 7 A Night of Stars (connect a constellation at the observatory, +120🪙) → Ch. 8 Neighboring Forests (visit a neighbor's village, +150🪙).<br>No need to force it. It moves along on its own as you play.</p></div>
```

- [ ] **Step 5: 통과 + 회귀** — Run: `node --test tests/neighbor-docs.test.mjs tests/guide.test.mjs tests/root-pages.test.mjs && npm test` → PASS, FAIL 0

- [ ] **Step 6: 커밋**

```bash
git add pages/privacy.html guide/guide.html guide/guide-en.html tests/neighbor-docs.test.mjs
git commit -m "docs: 🏡 개인정보처리방침 이웃 마을 공개 항목 · 안내서 8장

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 실측 검증(브라우저) · 리뷰 · 배포 체크리스트

**Files:** 없음(검증만). 캡처는 스크래치패드.

- [ ] **Step 1: 문구 검수 게이트** — 미검수 문구 목록(Global Constraints) + 8장 done 문구 + 개인정보처리방침 문단 + 영어를 사용자에게 한 화면에 모아 보여 주고 확정받는다. 바뀐 문구는 `rules.js`·`ui.js`·`chapters.js`·`i18n-en.js`·테스트를 같이 고치고 `npm test`.
- [ ] **Step 2: DDL 확인** — 사용자가 Task 1 마이그레이션·셀프테스트를 프로덕션에 적용했는지 MCP 읽기로 확인(`pg_proc` 5행 · `select count(*) from auth.users where email like 'nb-selftest-%'` = 0).
- [ ] **Step 3: 로컬 서버** — 워크트리에서 `python3 scripts/serve.py`(preview_start 는 원본 루트를 띄우므로 쓰지 않는다, memory: worktree-pitfalls). 모든 실측 URL 에 `?weather=clear` 를 붙인다 — 맨 localhost 는 dev 세션이 아니라 프로덕션 원장에 기록된다(memory: leaderboard-reachability). 단 이웃 RPC(반응·방문 원장)는 dev 세션과 무관하게 실제 DB 에 쓰이므로 **테스트 계정으로만** 한다.
- [ ] **Step 4: 두 계정 왕복** — 사용자가 직접 두 계정(A·B: 예) 구글 계정 2개 또는 ✉️ 이메일 코드 로그인)으로 로그인한다. 에이전트는 계정을 만들거나 비밀번호·코드를 입력하지 않는다. B 는 집 1단계 이상·7일 안 저장. 확인:
  - A: 🏡 팻말 → 오늘의 이웃 카드(엽서 A), B 가 후보에 있는지(후보가 많으면 B 가 3명 안에 없을 수 있다 — 그때는 B 쪽에서 A 를 찾는 방향으로 바꿔 본다). 새로고침해도 같은 3명.
  - [놀러 가기] → 상단 `🏡 {닉네임} 의 마을`, 좌하단 `🚪 내 마을로`, 도구 바·퀘스트 패널·스토리 칩 숨김, 집 단계·색·구성품·앞마당 장식·옷·펫이 B 의 마을과 같은지(B 화면과 나란히 캡처).
  - 집주인 앞 → 말풍선 C, ❤️ → 토스트 `❤️ 마음을 남겼어요 · 🪙+5`, 코인 +5, 말풍선이 재방문 인사로 바뀜. 다시 열면 카드 흐림 + `❤️ 다녀옴` + [또 보기] + `🪙 … 1/3`.
  - 나가기 → 팻말 앞 복귀, 📖 8장 완료 모달 + 🪙150(8장 진행 중인 계정이면).
  - B 로 재접속 → 6초 뒤 알림 모달 A(`이웃 1명이 다녀갔어요` / A 닉네임 ❤️) → [고마워요 🌱] → 첫 공개 안내 토스트. 다시 새로고침하면 안 뜬다.
  - B ⚙️ 설정 토글 끄기 → A 가 오늘의 이웃을 다시 열면 B 가 빠짐(같은 날 다른 3명).
  - 게스트(새 시크릿 창): 팻말·구경은 되고, 반응을 누르면 `🔐 로그인하면 마음을 남길 수 있어요`, 설정에 토글이 안 보임. 게스트 리로드를 반복하지 않는다(익명 계정 증식).
- [ ] **Step 5: 내 세이브 보호** — 구경 전후로 콘솔 `__gs()` 의 `outdoor`·`house`·`cosmetics`·`inventory`(코인 +5 제외)가 같은지 비교. 이웃 방문 뒤 내 마을의 울타리 나무결·내 캐릭터 재질·내 집 굴뚝 연기가 그대로인지(dispose 공유 재질 사고 확인), 밤(`?time=0.8&weather=clear`)에 이웃 집 창문이 켜지고 나온 뒤 목록에서 빠졌는지.
- [ ] **Step 6: 실패 경로** — 개발자 도구 네트워크 오프라인으로 팻말 열기 → `연결이 불안정해요…` 토스트(조용한 실패 없음). 콘솔 에러 0.
- [ ] **Step 7: 레이아웃** — PC(1440×900)·폰 세로(375×812)·토스 소형(320×568) 캡처: 엽서 카드·말풍선·알림·`🚪 내 마을로` 버튼이 조이스틱·액션 버튼·`#door-prompt` 와 겹치지 않는지(memory: mobile-hud-layout). `?lang=en` 같은 화면 1장씩. 문제 있으면 시안 3개 비교 후 수정(memory: design-compare-before-ship).
- [ ] **Step 8: 테스트 계정 정리** — Step 4 에서 쓴 계정의 village_visits·village_profiles 는 계정을 지우면 cascade 로 사라진다. 계정 삭제는 사용자 승인 후 사용자가 직접(또는 게임 ⚙️ 계정 삭제).
- [ ] **Step 9: 리뷰** — code-reviewer 에이전트(스펙·이 계획 대비) + security-reviewer(RLS·허용 목록·user_id 비노출·XSS: `ui.js` innerHTML 없음) → CRITICAL/HIGH 수정 → `npm test`.

## 배포 (별도 승인 후 — memory: deploy-checklist)

- [ ] 사용자: 프로덕션 SQL Editor 에서 `migrate_neighbors.sql` → `neighbors_selftest.sql`(ALL PASS) — **코드 배포 전에**.
- [ ] 앱인토스 정책: 유저 간 상호작용(UGC) 조항 확인(자유 입력 없음·정해진 반응만) — 결과를 사용자에게 보고.
- [ ] main 병합 → 키 스캔 `git grep -nE "AIza|GOCSPX-|sk_(live|test)|AKIA|-----BEGIN .*PRIVATE|ghp_|xox[bap]-" main -- . ':!vendor'` 0건(memory: push-secret-scan). 루트 `js/config.js` 로컬 수정이 있으면 `git checkout -- js/config.js` 후 배포(memory: premium-cosmetics).
- [ ] **4곳 동시**(새 세이브 필드 — 옛 클라가 `neighbors` 를 버리는 창 최소화):
  1. 웹 `npx wrangler deploy`(개인정보처리방침·안내서 포함, 즉시 라이브) — `/api/neighbor?id=<아무 uuid>` 가 404 JSON 인지 확인
  2. 토스 `npm run build` → **`bundle_upload(memo)`**(memo: "🏡 이웃 마을 1단계 + 📖8장 · main <해시> · DDL 적용됨") → PUT 업로드 → `bundle_upload_complete` → 테스트푸시 → 검수 제출. `ait deploy` 금지.
  3. itch `npm run build:itch` → `dist-itch.zip` 사용자 업로드
  4. 📱 Play: `../calm_forest-capacitor` 에서 `git merge main` → `npm test` → versionCode+1 → `npm run build:cap` → `./gradlew bundleRelease` → `unzip -l` 로 `js/neighbors/` 포함 확인 → `npm run upload:play -- --track internal --notes "…"` **및** `--track alpha`(노트는 이모지+해요체, memory: play-release-notes-user-facing)
- [ ] 푸시: main + `feat/capacitor-app` 둘 다(스캔 후).
- [ ] 📮 공지는 토스 출시 뒤 `notices_admin.html` 로(문구 사용자 검수).
- [ ] 다음날 BQ 재검증: 7종 이벤트 적재 · `host` 가 uuid 형식 · dev 세션 제외 · econ_logs `source='neighbor_visit'` 하루 계정당 ≤15. 4주 뒤: 주간 활동자 중 방문 경험 30% · 방문자 반응률 60% · 반응 받은 사람 다음날 복귀율 비교(관찰).

---

## Self-Review

| 스펙 절 | 내용 | Task |
|---|---|---|
| §1 목적·성공 기준 | 재방문 동기·지표 | 5(이벤트) · 배포(4주 뒤 지표) |
| §2 범위 | 앞마당·반응 4종·알림·보상·공개 설정·8장 / 실내·밭·방명록 제외 | 1(허용 목록에 decor 없음) · 7 · 8 |
| §3-1 팻말 → 오늘의 이웃 A | 3명·얼굴·닉네임·단계·장식 수·다녀옴·보상 n/3 | 1(neighbors_today) · 3(pickerRows) · 6 · 8(팻말) |
| §3-2 이웃 공간 | 공간 전환(snapCamera·setSpaceVisible), 상단 줄·나가기, HUD 숨김 | 6 · 7 |
| §3-3 말풍선 C·반응 | 토스트·보상 3회·하루 1회·재방문·게스트 | 1 · 3(reactOutcome) · 6 · 7(onReact) |
| §3-4 알림 모달 A | 최대 10·외 N명·고마워요 | 1(my_visitors) · 3(noticeView·visitorsSince) · 6 · 8(bootVisitors) |
| §3-5 8장 완료 | 첫 방문 → 🪙150 | 7(exitNeighbor 훅) · 8(rules·chapters) |
| §4.1 테이블 | 두 테이블·RLS·revoke·프로필 on-demand | 1 |
| §4.2 RPC 5종 | 권한·익명 거절·md5 정렬·KST·상한 3 | 1(셀프테스트 ①~⑤) |
| §4.3 허용 목록 | 키 하나씩·반경 14·40개·금지 목록 | 1 · 3(sanitize) · 3(sync 테스트) |
| §4.4 Worker | /api/neighbor·10분 캐시·UUID_RE·serve.py·라우트 | 2 |
| §5 클라 파일 | api·sanitize·scene·ui·spaces/neighbor | 3 · 4 · 6 · 7 |
| §5 공간 | NEIGHBOR(0,0,700)·고정 세트·집 중앙·장식 상대좌표·집주인 문 앞 | 7 |
| §5 내 세이브 보호 | 읽기만·별도 객체·dispose·소스 잠금 테스트 | 7(neighbor-space 테스트) · 11(Step 5) |
| §5 입구 팻말 | 좌표 겹침 검사·미니맵·전체 지도 | 7(places) · 8(테스트·VILLAGE_PLACES) |
| §5 세이브 새 필드 | neighbors {visited, seenAt}·4곳 동시 | 3 · 8 · 배포 |
| §5 8장 해제 | soon 제거·STORY_RULES·syncStory('neighbor_visit') | 7 · 8 |
| §5 설정 | 토글·첫 안내·게스트 숨김 | 6 · 8 |
| §6 경제 | 🪙5×3·giveReward 출처·4주 재평가 | 3 · 7 · 배포(BQ) |
| §7 트래킹 | 7종·파라미터·예약어·BQ 재검증 | 5 · 7 · 8 · 배포 |
| §8 문구 | 검수본 그대로·미검수 게이트 | Global Constraints · 9 · 11(Step 1) |
| §9 테스트 | Node(sanitize·8장·보상·scene 소스·i18n·배선) · SQL 셀프테스트 · 브라우저 두 계정 | 1~10 · 11 |
| §10 배포 전 확인 | 개인정보처리방침 동시·토스 UGC·DDL 사용자·4곳 동시 | 10 · 배포 |
| §11 2단계 메모 | 실내 구경 | 범위 밖(허용 목록에 `house.decor` 없음을 셀프테스트 ②가 잠근다) |

- 자리표시 없음: 모든 코드 단계에 실제 코드. 참조한 기존 함수는 현재 코드에서 시그니처를 확인했다 — `buildHouseModel(THREE, stage, style)`·`mountHouseAddons(THREE, stage, ids, style)`(js/house/index.js:34,47), `prepHouseMeshes`·`unregisterWindows`(js/spaces/house.js:250,275), `outdoorMesh(id)`·`makeSignpost(text, x, z)`·`disposeTree`(game.js export 목록 7398행), `buildCharacterMesh(id, cos)`(game.js:3574), `spawnPet(THREE, kind, stage)`(js/pet/render.js:21), `stageOf(works)`·`petKindOf`(js/pet/rules.js), `disposeSkin`(js/cosmetics/skin.js:206), `findItem`(js/cosmetics/catalog.js:80), `stage7ExitPoint`·`stage7Boxes`·`normalizeHouseStyle`(js/house-stage7.js), `EXPANSIONS`·`STAGE_NAMES`(js/house-cost.js), `giveReward(r, source, item)`(game.js:7360), `trackEvent`(js/analytics.js:82), `syncStory(trigger)`(game.js:1100), `kstDate`(js/kst-date.js).
- 타입 일관성: `View`(sanitize) → `buildNeighborScene(view)`; `pickerRows` 행의 `publicId/slot/done` → `goVisit` → `enterNeighbor({publicId, slot, revisit, view, loadMs})` → `evVisitStart`; `reactOutcome` 의 `reason/reward` → `evReact`; `noticeView` 의 `rows/total` → `evNotice`.
