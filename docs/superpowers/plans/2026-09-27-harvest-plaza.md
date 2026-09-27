# 🌾 수확제 광장 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 전 유저가 재료를 기부해 마을 동쪽 (23, −4)에 영구 광장을 짓는 시즌 공동 프로젝트(`harvest-2026`, 2026-10-09 ~ 10-22 KST)를 구현한다.

**Architecture:** 서버는 Supabase 테이블 3개 + RPC 3개(`plaza_donate`·`plaza_progress`·`plaza_mine`)가 규칙과 원장을 맡고, Worker `/api/plaza` 가 진행률을 60초 캐시한다. 클라이언트 로직은 전부 `js/plaza/` 모듈에 두고 `js/game.js` 에는 import·호출 연결 줄만 넣는다(줄 수 상한 테스트로 강제).

**Tech Stack:** Vanilla JS ES 모듈 · Three.js · Supabase(Postgres·RLS·supabase-js RPC) · Cloudflare Worker · `node:test` · Python `scripts/serve.py`(로컬 미러)

**Spec:** `docs/superpowers/specs/2026-09-27-harvest-plaza-design.md`

## Global Constraints

- 🚫 **새 로직을 `js/game.js` 에 쓰지 않는다.** game.js 변경은 import·연결 호출만, `plaza` 를 포함한 줄 **14줄 이하**(Task 0 테스트가 강제). `js/spaces/npc.js` 는 올빼미 착지 훅 일반화만.
- 🎨 **디자인 검수 게이트**: 3D 모델·UI·문구는 시안 3개 이상을 PC(1280×800)+모바일 세로(390×844) 캡처로 **나란히** 보여 주고 **사용자가 고를 때까지 다음 스텝으로 가지 않는다.** 문구는 한국어 후보를 먼저 검수받는다. 🚨 도구 휘두르는 모션은 건드리지 않는다.
- ⚡ 드로우콜: 광장 전체 ≤ 12콜, 돌길·깃발·깃대 ≤ 3콜. **색을 먼저 묶고** 재질 키별 `mergeGeos()`. `shared()` 금지.
- 시즌 `harvest-2026` · 시작 `2026-10-09 00:00 KST` · 종료 `2026-10-23 00:00 KST`(22일 끝) · 하루 상한 `30` · 등급 `bronze≥10 / silver≥60 / gold≥150`
- 단계 필요량: 1) wood 300 · stone 200 2) stone 400 · wood 200 · coal 100 3) crop 500 · forage 80 · wood 120
- 숫자의 단일 출처는 SQL 시드. 클라이언트에 같은 숫자가 있으면 **SQL 과 대조하는 테스트**가 있어야 한다.
- 기부로 코인을 주지 않는다. 🍂 `leaf` 1장/기부 1개, 판매 불가(SELL_PRICE 에 넣지 않음), 시즌 후 🍂1 → 🪙2 환전.
- 좌판 2종 `haybale`(🍂40)·`pumpkins`(🍂60), 등급 보상 2종 `pumpkinlamp`(silver)·`harvestscarecrow`(gold), 배지 `harvest_helper`(bronze). 장식은 전부 🧺 보관함(`gameState.outdoorStored`)으로 지급.
- 새 GA4 이벤트는 전부 `plaza_` 접두사 + `docs/analysis/GA4_GUIDE.md` 기재. dev 세션(`?plaza=` 포함)은 기록하지 않는다.
- 새 한국어 문구는 `js/i18n-en.js` 에 영어 추가 + `node scripts/i18n_check.mjs` 통과.
- `worker/index.js` 라우트 등록 + `scripts/serve.py` 미러를 같은 커밋에(404 사고 재발 방지).
- 기존 패턴 우선: 인벤토리는 기존 코드처럼 필드 대입(`gameState.inventory[k] -= n`)을 쓰는지 먼저 확인하고 따른다.
- 커밋 메시지: `<type>: <이모지> <한국어 설명>` + 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. 브랜치 `feat/harvest-plaza`, 푸시·병합·배포는 사용자 승인 후.
- 테스트 실행: `npm test`(= `node --test tests/*.test.mjs`). game.js 를 텍스트로 읽는 테스트는 `tests/helpers/game-source.mjs` 의 `gameSource()` 또는 `readFileSync`.

## Deviation from spec (계획 단계에서 정한 구현 선택)

- 🦉 초대는 퀘스트 목록(`def.quests`)에 끼우지 않고 올빼미 **착지 훅 + 별도 칸**으로 구현한다. 퀘스트 목록에 끼우면 `validDailyQuests` 의 개수 검증에 걸려 다음 접속에 일일 의뢰가 재추첨되는 사고 이력이 있다. 그래서 트래킹은 `quest_accept/complete` 대신 `plaza_invite_deliver`·`plaza_invite_arrive`(둘 다 `quest_id = courier:plaza:harvest-2026` 포함).
- 좌판 구매·등급 보상 장식은 기존 🧺 보관함에 넣어 작업대에서 값 없이 꺼내 놓는다(새 배치 흐름 없음). 작업대 목록에서는 `hidden:true` 로 숨기고 보관분이 있을 때만 보인다.
- 기부 RPC 는 `js/supabase-client.js` 안에 둔다(클라이언트 객체를 밖으로 내보내지 않는 기존 구조).

## File Structure

| 파일 | 상태 | 책임 |
|---|---|---|
| `sql/migrations/migrate_plaza.sql` | 신규 | 테이블 3·RLS·RPC 3·시드 |
| `sql/tests/plaza_selftest.sql` | 신규 | 트랜잭션 자가 테스트(ROLLBACK) |
| `functions/api/plaza.js` | 신규 | `GET /api/plaza` 진행률 프록시 + 60초 캐시 |
| `worker/index.js` | 수정 | 라우트 등록 |
| `scripts/serve.py` | 수정 | 로컬 미러 |
| `js/data/plaza.js` | 신규 | 표시 정보·시즌 id·등급 임계값·좌판 |
| `js/data/places.js` | 수정 | `PLAZA`·`PLAZA_R`·소품 좌표·돌길 점 |
| `js/plaza/rules.js` | 신규 | 순수 계산(등급·기간·기부 가능량·단계·환전·세이브 복원·산포 제외) |
| `js/plaza/net.js` | 신규 | `/api/plaza` 조회(60초 스로틀) + RPC 래퍼 재수출 |
| `js/plaza/index.js` | 신규 | 광장 상태·틱·근접·액션·게임 연결 진입점 |
| `js/plaza/build.js` | 신규 | 광장 3D(단계별 재질 병합) |
| `js/plaza/path.js` | 신규 | 돌길·깃발 줄·깃대 |
| `js/plaza/ui.js` | 신규 | 기부·좌판·명판 모달(DOM 주입) |
| `js/plaza/donate.js` | 신규 | 기부 응답 해석(순수) |
| `js/plaza/rewards.js` | 신규 | 좌판·등급 보상·환전 계획(순수) |
| `js/plaza/decor.js` | 신규 | 장식 4종 메시 |
| `js/plaza/invite.js` | 신규 | 🦉 광장 초대 |
| `js/supabase-client.js` | 수정 | `plazaDonate`·`plazaMine` |
| `js/first-loop.js` | 수정 | `DEV_PARAMS` 에 `'plaza'` |
| `js/data/catalog.js` | 수정 | OUTDOOR 4종(`hidden:true`) |
| `js/data/dex.js` | 수정 | 배지 `harvest_helper` |
| `js/spaces/npc.js` | 수정 | 착지 훅 일반화 + `sendOwlToPlayer` |
| `js/spaces/doors.js` | 수정 | 광장 근접 프롬프트 |
| `js/game.js` | 수정 | 연결 줄만(≤14) |
| `index.html` | 수정 | 작업대 장식 목록 `hidden` 필터 1줄 |
| `js/i18n-en.js` | 수정 | 새 문구 영어 |
| `docs/analysis/GA4_GUIDE.md` | 수정 | 이벤트 10종 |
| `tests/plaza-*.test.mjs` | 신규 | 규칙·네트·동기화·라우트·연결 예산·기부·보상·초대·트래킹 |

---

### Task 0: dev docs + game.js 연결 예산 테스트

**Files:**
- Create: `dev/active/harvest-plaza/harvest-plaza-plan.md`, `harvest-plaza-context.md`, `harvest-plaza-tasks.md`
- Create: `tests/plaza-wiring.test.mjs`

**Interfaces:**
- Produces: `tests/plaza-wiring.test.mjs` — 이후 모든 태스크가 통과해야 하는 가드

- [ ] **Step 1: dev docs 생성**

`harvest-plaza-plan.md` 는 이 계획 파일 경로와 스펙 경로를 링크하는 한 단락. `harvest-plaza-context.md`:

```markdown
# harvest-plaza context
Last Updated: 2026-09-27

- 스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
- 계획: docs/superpowers/plans/2026-09-27-harvest-plaza.md
- 브랜치: feat/harvest-plaza (main 49bc40c 분기)
- 핵심 결정: 영구 광장 · 위치 (23,-4) · 단계형 무조건 완공 · 하루 상한 30 · RPC 원장 · 좌판2+등급2 · 장식은 🧺 보관함 지급
- 연결 규칙: game.js 에는 연결 줄만(≤14, tests/plaza-wiring.test.mjs)
- 디자인 게이트: 3D·UI·문구는 시안 3개+ 캡처 비교 후 사용자 선택
- 사용자 실행 필요: sql/migrations/migrate_plaza.sql → sql/tests/plaza_selftest.sql (SQL Editor)
```

`harvest-plaza-tasks.md` 는 이 계획의 Task 0~12 제목을 `- [ ]` 체크리스트로.

- [ ] **Step 2: 가드 테스트 작성**

```js
// tests/plaza-wiring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js 에는 광장 연결 줄만 — 로직은 js/plaza/ 에', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /plaza/i.test(l));
  assert.ok(lines.length <= 14, `game.js 에 plaza 줄이 ${lines.length}개 — 14 이하여야 한다:\n${lines.join('\n')}`);
  assert.ok(!/function\s+\w*plaza/i.test(game), 'game.js 에 plaza 함수 정의가 생겼다 — js/plaza/ 로 옮길 것');
  assert.ok(!/(const|let)\s+\w*plaza\w*\s*=\s*(\(|function|\{)/i.test(game), 'game.js 에 plaza 로직 선언이 생겼다');
});
```

- [ ] **Step 3: 실행 — 통과 확인(아직 연결 0줄)**

Run: `node --test tests/plaza-wiring.test.mjs`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add dev/active/harvest-plaza tests/plaza-wiring.test.mjs
git commit -m "test: 🌾 광장 연결 예산 가드 — game.js 에 로직을 쌓지 않는다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: SQL 마이그레이션 + 자가 테스트

**Files:**
- Create: `sql/migrations/migrate_plaza.sql`
- Create: `sql/tests/plaza_selftest.sql`

**Interfaces:**
- Produces (RPC, supabase-js `rpc()` 로 호출):
  - `plaza_donate(p_season text, p_item text, p_qty int) → jsonb` `{ok:true, accepted, today_left, my_total, tier, stage, item_have, item_need}` | `{ok:false, reason:'auth'|'qty'|'season'|'full'|'need'|'cap', stage?, today_left?}`
  - `plaza_progress(p_season text) → jsonb` `{season, starts_at, ends_at, started, active, completed, forced, stage, max_stage, items:[{stage,item,have,need}], donors, names:[text]}` — `stage` 는 현재 단계 1..max, 완공이면 `max_stage + 1`
  - `plaza_mine(p_season text) → jsonb` `{ok:true, my_total, today_left, tier}` | `{ok:false, reason:'auth'|'season'}`
  - tier 값: `'gold'|'silver'|'bronze'|null`

- [ ] **Step 1: 마이그레이션 작성**

```sql
-- =============================================================
--  🌾 수확제 광장 — 전 유저 공동 프로젝트 원장·규칙
--  ------------------------------------------------------------
--  ▶ 기부는 plaza_donate RPC 로만 들어온다(테이블 직접 쓰기 정책 없음)
--  ▶ 하루 상한·현재 단계 품목·남은 필요량 컷을 DB 안에서 원자적으로 판정
--    (시즌 단위 advisory lock — 동시 기부로 필요량을 넘지 않는다)
--  ▶ 서버는 유저 보유량을 모른다(세이브는 클라 JSON) — 어뷰징 피해는 하루 상한으로 제한
--  ▶ 숫자(기간·상한·필요량·등급 임계값)의 단일 출처. js/data/plaza.js 와의 일치는
--    tests/plaza-sync.test.mjs 가 검사한다
--  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
--  적용: Supabase SQL Editor 에서 1회 실행 → sql/tests/plaza_selftest.sql 로 검증
-- =============================================================
begin;

create table if not exists public.plaza_seasons (
  season    text primary key check (season ~ '^[a-z0-9-]{3,32}$'),
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  daily_cap int not null default 30 check (daily_cap between 1 and 30),
  check (ends_at > starts_at)
);

create table if not exists public.plaza_needs (
  season text not null references public.plaza_seasons(season) on delete cascade,
  stage  smallint not null check (stage between 1 and 9),
  item   text not null check (item ~ '^[a-z_]{1,24}$'),
  need   int not null check (need > 0),
  primary key (season, stage, item)
);

create table if not exists public.plaza_donations (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  season     text not null references public.plaza_seasons(season),
  stage      smallint not null,
  item       text not null,
  qty        int not null check (qty between 1 and 30),
  kst_day    date not null,
  created_at timestamptz not null default now()
);
create index if not exists plaza_donations_season_item on public.plaza_donations (season, stage, item);
create index if not exists plaza_donations_season_user_day on public.plaza_donations (season, user_id, kst_day);

alter table public.plaza_seasons   enable row level security;
alter table public.plaza_needs     enable row level security;
alter table public.plaza_donations enable row level security;

drop policy if exists plaza_seasons_select_all on public.plaza_seasons;
create policy plaza_seasons_select_all on public.plaza_seasons for select to anon, authenticated using (true);
drop policy if exists plaza_needs_select_all on public.plaza_needs;
create policy plaza_needs_select_all on public.plaza_needs for select to anon, authenticated using (true);
drop policy if exists plaza_donations_select_own on public.plaza_donations;
create policy plaza_donations_select_own on public.plaza_donations
  for select to authenticated using ((select auth.uid()) = user_id);
-- insert/update/delete 정책 없음 = 직접 쓰기 차단(RPC 만 security definer 로 쓴다)

-- 등급 — 임계값은 js/data/plaza.js PLAZA_TIERS 와 같아야 한다(tests/plaza-sync.test.mjs)
create or replace function public._plaza_tier(p_total int)
returns text language sql immutable set search_path = public as $$
  select case when p_total >= 150 then 'gold'
              when p_total >= 60 then 'silver'
              when p_total >= 10 then 'bronze'
              else null end;
$$;

-- 현재 단계 = 필요량이 남은 첫 단계(없으면 null = 전부 충족)
create or replace function public._plaza_current_stage(p_season text)
returns smallint language sql stable security definer set search_path = public as $$
  select min(n.stage)::smallint
  from plaza_needs n
  left join lateral (
    select coalesce(sum(d.qty), 0) as have from plaza_donations d
    where d.season = n.season and d.stage = n.stage and d.item = n.item
  ) h on true
  where n.season = p_season and h.have < n.need;
$$;

create or replace function public.plaza_donate(p_season text, p_item text, p_qty int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_s     plaza_seasons;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_stage smallint;
  v_need  int;
  v_have  int;
  v_used  int;
  v_left  int;
  v_acc   int;
  v_total int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if p_qty is null or p_qty < 1 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found or now() < v_s.starts_at or now() >= v_s.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'season');
  end if;

  perform pg_advisory_xact_lock(hashtext('plaza:' || p_season));

  v_stage := _plaza_current_stage(p_season);
  if v_stage is null then return jsonb_build_object('ok', false, 'reason', 'full'); end if;

  select need into v_need from plaza_needs where season = p_season and stage = v_stage and item = p_item;
  if not found then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', v_stage); end if;
  select coalesce(sum(qty), 0) into v_have from plaza_donations
    where season = p_season and stage = v_stage and item = p_item;
  if v_have >= v_need then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', v_stage); end if;

  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  v_left := v_s.daily_cap - v_used;
  if v_left <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap', 'today_left', 0); end if;

  v_acc := least(p_qty, v_left, v_need - v_have);
  insert into plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (v_uid, p_season, v_stage, p_item, v_acc, v_today);

  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  return jsonb_build_object('ok', true, 'accepted', v_acc, 'today_left', v_left - v_acc,
    'my_total', v_total, 'tier', _plaza_tier(v_total), 'stage', v_stage,
    'item_have', v_have + v_acc, 'item_need', v_need);
end $$;

create or replace function public.plaza_progress(p_season text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_s      plaza_seasons;
  v_cur    smallint;
  v_max    smallint;
  v_done   boolean;
  v_forced boolean;
  v_items  jsonb;
  v_names  jsonb;
  v_donors int;
begin
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('error', 'unknown season'); end if;
  v_cur := _plaza_current_stage(p_season);
  select max(stage) into v_max from plaza_needs where season = p_season;
  v_forced := v_cur is not null and now() >= v_s.ends_at;
  v_done := v_cur is null or v_forced;

  select coalesce(jsonb_agg(jsonb_build_object('stage', n.stage, 'item', n.item, 'have', h.have, 'need', n.need)
                            order by n.stage, n.item), '[]'::jsonb)
    into v_items
  from plaza_needs n
  left join lateral (
    select coalesce(sum(d.qty), 0) as have from plaza_donations d
    where d.season = n.season and d.stage = n.stage and d.item = n.item
  ) h on true
  where n.season = p_season;

  select count(distinct user_id) into v_donors from plaza_donations where season = p_season;

  -- 명판 이름 — 식별자는 내보내지 않는다(리더보드와 같은 닉네임 규칙), 첫 기부 순
  select coalesce(jsonb_agg(x.nick order by x.first_at), '[]'::jsonb) into v_names
  from (
    select coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자') as nick, min(d.created_at) as first_at
    from plaza_donations d
    left join game_saves gs on gs.user_id = d.user_id
    where d.season = p_season
    group by d.user_id, gs.state->>'nickname'
    limit 500
  ) x;

  return jsonb_build_object('season', p_season, 'starts_at', v_s.starts_at, 'ends_at', v_s.ends_at,
    'started', now() >= v_s.starts_at,
    'active', now() >= v_s.starts_at and now() < v_s.ends_at,
    'completed', v_done, 'forced', v_forced,
    'stage', case when v_done then v_max + 1 else v_cur end, 'max_stage', v_max,
    'items', v_items, 'donors', v_donors, 'names', v_names);
end $$;

create or replace function public.plaza_mine(p_season text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_s     plaza_seasons;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_total int;
  v_used  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('ok', false, 'reason', 'season'); end if;
  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  return jsonb_build_object('ok', true, 'my_total', v_total,
    'today_left', greatest(0, v_s.daily_cap - v_used), 'tier', _plaza_tier(v_total));
end $$;

revoke all on function public._plaza_tier(int) from public, anon, authenticated;
revoke all on function public._plaza_current_stage(text) from public, anon, authenticated;
revoke all on function public.plaza_donate(text, text, int) from public, anon;
revoke all on function public.plaza_progress(text) from public;
revoke all on function public.plaza_mine(text) from public, anon;
grant execute on function public.plaza_donate(text, text, int) to authenticated;
grant execute on function public.plaza_progress(text) to anon, authenticated;
grant execute on function public.plaza_mine(text) to authenticated;

-- ── 시드: harvest-2026 (2026-10-09 00:00 ~ 10-23 00:00 KST) ──
insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('harvest-2026', '2026-10-09 00:00:00+09', '2026-10-23 00:00:00+09', 30)
on conflict (season) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at, daily_cap = excluded.daily_cap;

insert into public.plaza_needs (season, stage, item, need) values
  ('harvest-2026', 1, 'wood', 300), ('harvest-2026', 1, 'stone', 200),
  ('harvest-2026', 2, 'stone', 400), ('harvest-2026', 2, 'wood', 200), ('harvest-2026', 2, 'coal', 100),
  ('harvest-2026', 3, 'crop', 500), ('harvest-2026', 3, 'forage', 80), ('harvest-2026', 3, 'wood', 120)
on conflict (season, stage, item) do update set need = excluded.need;

commit;

-- ── 검증 ──
-- select public.plaza_progress('harvest-2026');
```

- [ ] **Step 2: 자가 테스트 작성**

실제 `auth.users` 두 명의 id 를 빌려 쓰되(외래키), **전부 ROLLBACK** 하므로 흔적이 남지 않는다.

```sql
-- =============================================================
--  🌾 수확제 광장 RPC 자가 테스트 — 트랜잭션 안에서 돌리고 ROLLBACK
--  사용법: migrate_plaza.sql 적용 뒤 SQL Editor 에 통째로 붙여 실행.
--          마지막에 NOTICE 'PLAZA SELFTEST ALL PASS' 가 보이면 통과, 실패는 EXCEPTION 으로 멈춘다.
-- =============================================================
begin;

insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('selftest', now() - interval '1 hour', now() + interval '1 hour', 4);
insert into public.plaza_needs (season, stage, item, need) values
  ('selftest', 1, 'wood', 5), ('selftest', 2, 'stone', 3);

do $$
declare
  u1 uuid; u2 uuid; r jsonb; p jsonb;
begin
  select id into u1 from auth.users order by created_at limit 1;
  select id into u2 from auth.users order by created_at offset 1 limit 1;
  if u1 is null or u2 is null then raise exception 'FAIL: auth.users 에 2명 이상 필요'; end if;

  -- 비로그인
  perform set_config('request.jwt.claims', '', true);
  r := public.plaza_donate('selftest', 'wood', 1);
  if r->>'reason' <> 'auth' then raise exception 'FAIL auth: %', r; end if;

  -- u1: 상한 4 로 컷
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  r := public.plaza_donate('selftest', 'wood', 10);
  if (r->>'accepted')::int <> 4 or (r->>'today_left')::int <> 0 then raise exception 'FAIL cap cut: %', r; end if;
  r := public.plaza_donate('selftest', 'wood', 1);
  if r->>'reason' <> 'cap' then raise exception 'FAIL cap block: %', r; end if;
  -- 현재 단계에 없는 품목
  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  r := public.plaza_donate('selftest', 'stone', 1);
  if r->>'reason' <> 'need' then raise exception 'FAIL wrong item: %', r; end if;
  -- u2: 남은 필요량 1 로 컷 → 단계 2 로 넘어감
  r := public.plaza_donate('selftest', 'wood', 3);
  if (r->>'accepted')::int <> 1 or (r->>'item_have')::int <> 5 then raise exception 'FAIL need cut: %', r; end if;
  p := public.plaza_progress('selftest');
  if (p->>'stage')::int <> 2 or (p->>'completed')::boolean then raise exception 'FAIL stage advance: %', p; end if;
  r := public.plaza_donate('selftest', 'stone', 3);
  if (r->>'accepted')::int <> 3 or (r->>'stage')::int <> 2 then raise exception 'FAIL stage2: %', r; end if;
  p := public.plaza_progress('selftest');
  if not (p->>'completed')::boolean or (p->>'forced')::boolean or (p->>'stage')::int <> 3 then raise exception 'FAIL complete: %', p; end if;
  if jsonb_array_length(p->'names') <> 2 then raise exception 'FAIL names: %', p->'names'; end if;
  r := public.plaza_donate('selftest', 'stone', 1);
  if r->>'reason' <> 'full' then raise exception 'FAIL full: %', r; end if;
  -- 내 기록(u2 는 wood 1 + stone 3 = 4)
  r := public.plaza_mine('selftest');
  if (r->>'my_total')::int <> 4 or (r->>'today_left')::int <> 0 then raise exception 'FAIL mine: %', r; end if;
  if public._plaza_tier(9) is not null or public._plaza_tier(10) <> 'bronze' or public._plaza_tier(60) <> 'silver' or public._plaza_tier(150) <> 'gold' then
    raise exception 'FAIL tier bounds';
  end if;
  raise notice 'plaza rpc checks pass';
end $$;

-- 기간 밖 · 강제 완공
insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('selftest-over', now() - interval '2 day', now() - interval '1 day', 30);
insert into public.plaza_needs (season, stage, item, need) values ('selftest-over', 1, 'wood', 999);
do $$
declare r jsonb; p jsonb; u1 uuid;
begin
  select id into u1 from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  r := public.plaza_donate('selftest-over', 'wood', 1);
  if r->>'reason' <> 'season' then raise exception 'FAIL season: %', r; end if;
  p := public.plaza_progress('selftest-over');
  if not (p->>'forced')::boolean or not (p->>'completed')::boolean or (p->>'stage')::int <> 2 then raise exception 'FAIL forced: %', p; end if;
  raise notice 'season checks pass';
end $$;

-- 직접 insert 차단(authenticated 역할로)
do $$
declare u1 uuid; blocked boolean := false;
begin
  select id into u1 from auth.users order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  begin
    insert into public.plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (u1, 'selftest', 2, 'stone', 1, current_date);
  exception when others then blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'FAIL: 직접 insert 가 통과했다'; end if;
  raise notice 'PLAZA SELFTEST ALL PASS';
end $$;

rollback;
```

- [ ] **Step 3: 🧑 사용자 체크포인트 — SQL 실행**

사용자에게 요청: SQL Editor 에서 `migrate_plaza.sql` 실행 → `plaza_selftest.sql` 실행 → `PLAZA SELFTEST ALL PASS` 확인. Supabase MCP 는 읽기 전용이다. 실행 후 MCP 로 읽기 확인:

```sql
select public.plaza_progress('harvest-2026');
```
Expected: `started:false`, `stage:1`, `items` 8행, `donors:0`

실패하면 에러를 받아 SQL 을 고치고 다시 요청한다(다음 태스크의 로컬 개발은 진행 가능 — 서버 호출은 실패 경로로 동작).

- [ ] **Step 4: Commit**

```bash
git add sql/migrations/migrate_plaza.sql sql/tests/plaza_selftest.sql
git commit -m "feat: 🌾 광장 원장·RPC — 하루 상한·단계 품목·필요량 컷을 DB 에서 판정

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 시즌 데이터·순수 규칙 + SQL 동기화 테스트

**Files:**
- Create: `js/data/plaza.js`, `js/plaza/rules.js`
- Modify: `js/data/places.js`(끝에 추가), `js/first-loop.js:18`
- Test: `tests/plaza-rules.test.mjs`, `tests/plaza-sync.test.mjs`

**Interfaces:**
- Produces:
  - `js/data/plaza.js`: `PLAZA_SEASON='harvest-2026'`, `PLAZA_OPENS_KST='2026-10-09'`, `PLAZA_DAILY_CAP=30`, `PLAZA_TIERS=[{id:'gold',min:150,ico:'🥇'},{id:'silver',min:60,ico:'🥈'},{id:'bronze',min:10,ico:'🥉'}]`, `PLAZA_ITEMS`, `PLAZA_STAGE_NAMES`, `PLAZA_STALL`, `PLAZA_TIER_REWARD`, `PLAZA_LEAF_COINS=2`, `PLAZA_INVITE_REWARD`, `PLAZA_VIEW_R=20`, `PLAZA_DONATE_STEPS`
  - `js/data/places.js`: `PLAZA`(Vector3 23,0,−4), `PLAZA_R=5`, `PLAZA_BOX`(21.4,0,−0.9), `PLAZA_STALL_POS`(25.4,0,−1.0), `PLAZA_POLE`(23,0,−8.2), `PLAZA_PATH`(점 배열)
  - `js/plaza/rules.js`: `tierOf(total)→'gold'|'silver'|'bronze'|null`, `nextTier(total)→{id,left}|null`, `seasonPhase(p, nowMs)→'before'|'active'|'after'`, `donateMax(have, todayLeft, itemLeft)→int`, `currentItems(p)→[{item,have,need}]`, `visualStage(p, cachedStage)→0..4`, `leafToCoins(n)→int`, `restorePlaza(saved)→state`, `plazaDefault()→state`, `siteOpen(nowMs)→bool`, `plazaBlocks(x, z, pad=2)→bool`
  - 세이브 모양: `gameState.plaza = { lastStage: 0..4, claimed: { [season]: tier }, invited: season|'', converted: { [season]: true }, seen: { [stage|'arrived']: true } }`

- [ ] **Step 1: 실패하는 규칙 테스트 작성**

```js
// tests/plaza-rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierOf, nextTier, seasonPhase, donateMax, currentItems, visualStage, leafToCoins,
         restorePlaza, plazaDefault, siteOpen, plazaBlocks } from '../js/plaza/rules.js';

const P = (o = {}) => ({ starts_at: '2026-10-09T00:00:00+09:00', ends_at: '2026-10-23T00:00:00+09:00',
  started: true, stage: 1, max_stage: 3, completed: false, items: [
    { stage: 1, item: 'stone', have: 50, need: 200 }, { stage: 1, item: 'wood', have: 300, need: 300 },
    { stage: 2, item: 'coal', have: 0, need: 100 }], ...o });

test('tierOf: 경계 9/10 · 59/60 · 149/150', () => {
  assert.equal(tierOf(0), null); assert.equal(tierOf(9), null); assert.equal(tierOf(10), 'bronze');
  assert.equal(tierOf(59), 'bronze'); assert.equal(tierOf(60), 'silver');
  assert.equal(tierOf(149), 'silver'); assert.equal(tierOf(150), 'gold');
});

test('nextTier: 다음 등급까지 남은 개수, 최고 등급이면 null', () => {
  assert.deepEqual(nextTier(0), { id: 'bronze', left: 10 });
  assert.deepEqual(nextTier(59), { id: 'silver', left: 1 });
  assert.equal(nextTier(150), null);
});

test('seasonPhase: KST 경계', () => {
  const p = P();
  assert.equal(seasonPhase(p, Date.parse('2026-10-08T23:59:59+09:00')), 'before');
  assert.equal(seasonPhase(p, Date.parse('2026-10-09T00:00:00+09:00')), 'active');
  assert.equal(seasonPhase(p, Date.parse('2026-10-22T23:59:59+09:00')), 'active');
  assert.equal(seasonPhase(p, Date.parse('2026-10-23T00:00:00+09:00')), 'after');
  assert.equal(seasonPhase(null, Date.now()), 'before');
});

test('donateMax: 보유·오늘 남은 상한·품목 남은 필요량 중 최소, 음수 없음', () => {
  assert.equal(donateMax(12, 30, 150), 12);
  assert.equal(donateMax(99, 7, 150), 7);
  assert.equal(donateMax(99, 30, 3), 3);
  assert.equal(donateMax(0, 30, 3), 0);
  assert.equal(donateMax(5, -2, 3), 0);
});

test('currentItems: 현재 단계 품목만, 이름순', () => {
  assert.deepEqual(currentItems(P()).map(i => i.item), ['stone', 'wood']);
  assert.deepEqual(currentItems(P({ stage: 4, completed: true })), []);
});

test('visualStage: 서버 값 우선, 없으면 캐시, 범위 0..4', () => {
  assert.equal(visualStage(P(), 0), 1);
  assert.equal(visualStage(P({ stage: 4, completed: true }), 1), 4);
  assert.equal(visualStage(null, 2), 2);
  assert.equal(visualStage(null, 9), 4);
  assert.equal(visualStage(P({ started: false }), 0), 0);
});

test('leafToCoins: 🍂1 = 🪙2, 비정상 입력은 0', () => {
  assert.equal(leafToCoins(7), 14); assert.equal(leafToCoins(0), 0);
  assert.equal(leafToCoins(-3), 0); assert.equal(leafToCoins('x'), 0);
});

test('restorePlaza: 옛 세이브·깨진 값은 기본값, 새 객체 반환', () => {
  assert.deepEqual(restorePlaza(undefined), plazaDefault());
  const saved = { lastStage: 3, claimed: { 'harvest-2026': 'gold' }, invited: 'harvest-2026', converted: {}, seen: { 2: true, arrived: true } };
  const r = restorePlaza(saved);
  assert.deepEqual(r, saved); assert.notEqual(r, saved);
  assert.equal(restorePlaza({ lastStage: 'x' }).lastStage, 0);
  assert.equal(restorePlaza({ lastStage: 99 }).lastStage, 4);
  assert.deepEqual(restorePlaza({ claimed: { a: 'hack' } }).claimed, {});
});

test('siteOpen: 시작일(KST) 이전엔 광장 터를 비운다', () => {
  assert.equal(siteOpen(Date.parse('2026-10-08T23:00:00+09:00')), false);
  assert.equal(siteOpen(Date.parse('2026-10-09T00:00:00+09:00')), true);
});

test('plazaBlocks: 광장 반경·돌길 위는 산포 금지', () => {
  assert.equal(plazaBlocks(23, -4), true);
  assert.equal(plazaBlocks(23 + 6.5, -4), true);   // PLAZA_R 5 + pad 2 안
  assert.equal(plazaBlocks(23 + 7.5, -4), false);
  assert.equal(plazaBlocks(17.3, 2.2), true);      // 돌길 위
  assert.equal(plazaBlocks(0, -20), false);
});
```

- [ ] **Step 2: 실행 — 실패 확인**

Run: `node --test tests/plaza-rules.test.mjs`
Expected: FAIL `Cannot find module '../js/plaza/rules.js'`

- [ ] **Step 3: 데이터 파일 작성**

`js/data/places.js` 끝에 추가:

```js
// 🌾 수확제 광장 — 마을 동쪽 과수원 길(2026-09-27 사용자 확정, 스펙 docs/superpowers/specs/2026-09-27-harvest-plaza-design.md).
//    나무 링(r8~30) 안이라 산포 제외는 js/plaza/rules.js plazaBlocks 가 맡는다. 정면은 +Z(카메라 시선 −Z).
export const PLAZA = new THREE.Vector3(23, 0, -4);
export const PLAZA_R = 5;
export const PLAZA_BOX = new THREE.Vector3(21.4, 0, -0.9);        // 기부함(완공 후 명판 자리)
export const PLAZA_STALL_POS = new THREE.Vector3(25.4, 0, -1.0);  // 🌾 수확제 좌판(시즌 중)
export const PLAZA_POLE = new THREE.Vector3(23, 0, -8.2);         // 깃대 — 광장 뒤(북)에 세워 시작점에서 나무 위로 보이게
// 돌길: 시작점 동쪽 → 🏆랭킹 게시판 앞 → 광장 정면. 1.6 간격(산포 제외 판정도 이 점들로)
export const PLAZA_PATH = [
  [3.0, 1.4], [4.6, 1.8], [6.2, 2.2], [7.8, 2.6], [9.4, 3.0], [11.0, 3.3], [12.6, 3.4],
  [14.2, 3.3], [15.8, 2.8], [17.3, 2.2], [18.7, 1.5], [20.0, 0.8], [21.2, 0.3],
];
```

⚠️ 돌길 점이 기존 시설과 겹치는지 확인: 농부 NPC (5, 4), 공원 벤치 (6.5, 6.5), 상점 (9, 0), 시세판 (10, 5.5), 랭킹 게시판 (13.5, 1.5) 콜라이더 1.15, 호수 (16, 9) r6. `[14.2, 3.3]` 은 랭킹 게시판에서 1.9 — 콜라이더(1.15) 밖이지만 돌 반경 0.62 와 합치면 딱 붙는다. Task 7 캡처에서 겹쳐 보이면 해당 점을 z+0.4 로 옮긴다(점을 옮기면 `plazaBlocks` 테스트의 `[17.3, 2.2]` 도 같이 확인).

`js/data/plaza.js`:

```js
// =============================================================
//  🌾 수확제 광장 — 표시 정보(아이콘·이름·연출). 목표 숫자·기간은 SQL 시드가 단일 출처.
//  여기 있는 숫자(시작일·상한·등급 임계값)는 표시·오프라인 추정용이며
//  tests/plaza-sync.test.mjs 가 sql/migrations/migrate_plaza.sql 과 대조한다.
//  ⚠️ 값만 둔다 — 게임 상태를 읽는 코드는 js/plaza/ 로.
// =============================================================
export const PLAZA_SEASON = 'harvest-2026';
export const PLAZA_OPENS_KST = '2026-10-09';
export const PLAZA_DAILY_CAP = 30;
export const PLAZA_TIERS = [
  { id: 'gold', min: 150, ico: '🥇' },
  { id: 'silver', min: 60, ico: '🥈' },
  { id: 'bronze', min: 10, ico: '🥉' },
];
export const PLAZA_ITEMS = {
  wood: { ico: '🪵', name: '목재' }, stone: { ico: '🪨', name: '돌' }, coal: { ico: '⚫', name: '석탄' },
  crop: { ico: '🥕', name: '작물' }, forage: { ico: '🍄', name: '채집물' },
};
export const PLAZA_STAGE_NAMES = ['', '터 다지기', '돌바닥 깔기', '수확제 장식', '완공'];
export const PLAZA_STALL = [
  { id: 'haybale', price: 40 },
  { id: 'pumpkins', price: 60 },
];
export const PLAZA_TIER_REWARD = { bronze: { badge: 'harvest_helper' }, silver: { decor: 'pumpkinlamp' }, gold: { decor: 'harvestscarecrow' } };
export const PLAZA_LEAF_COINS = 2;                  // 시즌 후 남은 🍂 1장 → 🪙2
export const PLAZA_INVITE_REWARD = { leaf: 5, coins: 10 };
export const PLAZA_VIEW_R = 20;                     // 이 반경 안에 오면 진행률 재조회(60초 1회)
export const PLAZA_DONATE_STEPS = [1, 5];            // +1 · +5 · 최대
```

`js/first-loop.js:18` 의 `DEV_PARAMS` 배열 끝에 `'plaza'` 추가:

```js
export const DEV_PARAMS = ['house', 'coop', 'weather', 'spawn', 'sea', 'river', 'mist', 'time', 'severe', 'severe2', 'rain', 'dbg', 'seadebug', 'give', 'betaDay', 'forceMapOrder', 'owl', 'repeat', 'farmstage', 'farmmax', 'plaza'];
```

- [ ] **Step 4: 규칙 모듈 작성**

```js
// js/plaza/rules.js
// =============================================================
//  🌾 수확제 광장 — 순수 계산(게임 상태·DOM·네트워크 없음). tests/plaza-rules.test.mjs
// =============================================================
import { PLAZA_TIERS, PLAZA_OPENS_KST, PLAZA_LEAF_COINS } from '../data/plaza.js';
import { PLAZA, PLAZA_R, PLAZA_PATH } from '../data/places.js';

const MAX_VISUAL = 4;   // 0 = 없음, 1~3 = 공사 단계, 4 = 완공
const TIER_IDS = new Set(PLAZA_TIERS.map(t => t.id));

export function tierOf(total) {
  const t = PLAZA_TIERS.find(x => total >= x.min);
  return t ? t.id : null;
}

export function nextTier(total) {
  const up = [...PLAZA_TIERS].reverse().find(x => total < x.min);
  return up ? { id: up.id, left: up.min - total } : null;
}

export function seasonPhase(p, nowMs) {
  if (!p || !p.starts_at || !p.ends_at) return 'before';
  if (nowMs < Date.parse(p.starts_at)) return 'before';
  if (nowMs >= Date.parse(p.ends_at)) return 'after';
  return 'active';
}

export function donateMax(have, todayLeft, itemLeft) {
  return Math.max(0, Math.min(have | 0, todayLeft | 0, itemLeft | 0));
}

export function currentItems(p) {
  if (!p || p.completed) return [];
  return p.items.filter(i => i.stage === p.stage)
    .map(({ item, have, need }) => ({ item, have, need }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

const clampStage = (n) => Math.max(0, Math.min(MAX_VISUAL, Number.isInteger(n) ? n : 0));

export function visualStage(p, cachedStage) {
  if (!p) return clampStage(cachedStage);
  if (p.started === false) return 0;
  if (p.completed) return MAX_VISUAL;
  return clampStage(p.stage);
}

export function leafToCoins(n) {
  return Number.isInteger(n) && n > 0 ? n * PLAZA_LEAF_COINS : 0;
}

export function plazaDefault() {
  return { lastStage: 0, claimed: {}, invited: '', converted: {}, seen: {} };
}

const plainObj = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});
const onlyTrue = (o) => Object.fromEntries(Object.entries(plainObj(o)).filter(([, v]) => v === true));

export function restorePlaza(saved) {
  if (!saved || typeof saved !== 'object') return plazaDefault();
  return {
    lastStage: clampStage(saved.lastStage),
    claimed: Object.fromEntries(Object.entries(plainObj(saved.claimed)).filter(([, v]) => TIER_IDS.has(v))),
    invited: typeof saved.invited === 'string' ? saved.invited : '',
    converted: onlyTrue(saved.converted),
    seen: onlyTrue(saved.seen),
  };
}

export function siteOpen(nowMs) {
  return nowMs >= Date.parse(`${PLAZA_OPENS_KST}T00:00:00+09:00`);
}

export function plazaBlocks(x, z, pad = 2) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA_R + pad) return true;
  return PLAZA_PATH.some(([px, pz]) => Math.hypot(x - px, z - pz) < 1.4);
}
```

주의: `js/data/places.js` 는 `import * as THREE from 'three'` 를 한다. node 테스트에서 `three` 가 해석되지 않으면(`node_modules/three` 없음) `package.json` 에 `three` 가 devDependency 로 있는지 확인하고, 없으면 `tests/plaza-rules.test.mjs` 첫 줄에 기존 테스트가 쓰는 import 맵 방식(`grep -rn "from 'three'" tests | head` 로 확인)을 따른다. 기존 테스트가 places.js 를 import 한 선례가 없으면 `PLAZA`·`PLAZA_R`·`PLAZA_PATH` 를 **`js/data/plaza.js` 로 옮기고**(THREE 없는 평범한 숫자·배열: `PLAZA = { x: 23, z: -4 }`) places.js 는 `new THREE.Vector3(PLAZA.x, 0, PLAZA.z)` 로 거기서 만든다.

- [ ] **Step 5: 실행 — 통과 확인**

Run: `node --test tests/plaza-rules.test.mjs`
Expected: PASS 10개

- [ ] **Step 6: SQL ↔ 클라 동기화 테스트 작성**

```js
// tests/plaza-sync.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA_SEASON, PLAZA_OPENS_KST, PLAZA_DAILY_CAP, PLAZA_TIERS, PLAZA_ITEMS } from '../js/data/plaza.js';

const sql = readFileSync(new URL('../sql/migrations/migrate_plaza.sql', import.meta.url), 'utf8');

test('시즌 시작일·상한이 SQL 시드와 같다', () => {
  const m = sql.match(new RegExp(`\\('${PLAZA_SEASON}', '(\\d{4}-\\d{2}-\\d{2}) 00:00:00\\+09', '[^']+', (\\d+)\\)`));
  assert.ok(m, 'SQL 에서 시즌 시드를 못 찾았다');
  assert.equal(m[1], PLAZA_OPENS_KST);
  assert.equal(Number(m[2]), PLAZA_DAILY_CAP);
});

test('등급 임계값이 SQL _plaza_tier 와 같다', () => {
  for (const t of PLAZA_TIERS) {
    assert.ok(sql.includes(`when p_total >= ${t.min} then '${t.id}'`), `SQL 에 ${t.id}≥${t.min} 이 없다`);
  }
});

test('SQL 시드 품목은 전부 표시 정보가 있다', () => {
  const items = [...sql.matchAll(new RegExp(`\\('${PLAZA_SEASON}', \\d, '([a-z_]+)', \\d+\\)`, 'g'))].map(m => m[1]);
  assert.ok(items.length >= 8);
  for (const k of items) assert.ok(PLAZA_ITEMS[k], `js/data/plaza.js PLAZA_ITEMS 에 ${k} 가 없다`);
});
```

- [ ] **Step 7: 실행 — 통과 확인**

Run: `node --test tests/plaza-rules.test.mjs tests/plaza-sync.test.mjs && npm test`
Expected: 전부 PASS(기존 테스트가 `DEV_PARAMS` 목록을 고정하고 있으면 그 기대값에 `'plaza'` 추가)

- [ ] **Step 8: Commit**

```bash
git add js/data/plaza.js js/data/places.js js/plaza/rules.js js/first-loop.js tests/plaza-rules.test.mjs tests/plaza-sync.test.mjs
git commit -m "feat: 🌾 광장 시즌 데이터·순수 규칙 — 등급·기간·기부 가능량·세이브 복원

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: `/api/plaza` Worker 라우트 + 로컬 미러 + 라우트 테스트

**Files:**
- Create: `functions/api/plaza.js`, `js/plaza/net.js`(뼈대)
- Modify: `worker/index.js`(import :15-31 구역, 라우트 :153-157 리더보드 블록 뒤), `scripts/serve.py`(`do_GET` :662-681, `serve_leaderboard` :737-764 뒤)
- Test: `tests/plaza-route.test.mjs`

**Interfaces:**
- Produces: `GET /api/plaza?season=<id>` → `plaza_progress` JSON 그대로 · 400 `{error:'bad season'}` · 502 `{error:'upstream'}` · `cache-control: public, max-age=60`; `js/plaza/net.js` `PLAZA_API(season) → string`

- [ ] **Step 1: 실패하는 라우트 테스트**

```js
// tests/plaza-route.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

test('광장 API 경로 3벌이 같다 (net.js fetch · worker 라우트 · serve.py 미러)', () => {
  // 이 저장소는 worker 라우트 미등록으로 404 낸 이력이 있다(dex-notes · daily-quests).
  const route = src('worker/index.js').match(/pathname === '(\/api\/plaza)'/);
  assert.ok(route, "worker/index.js 에 '/api/plaza' 라우트가 없다");
  assert.ok(src('js/plaza/net.js').includes(`${route[1]}?season=`), 'js/plaza/net.js 의 fetch 경로가 어긋났다');
  assert.ok(src('scripts/serve.py').includes(`== '${route[1]}'`), 'scripts/serve.py 미러가 없다');
});

test('Worker 핸들러: season 형식 검사 + 60초 캐시 + RPC 인자', async () => {
  const { onRequestGet } = await import('../functions/api/plaza.js');
  const bad = await onRequestGet({ request: new Request('https://x/api/plaza?season=../x'), env: {} });
  assert.equal(bad.status, 400);
  const calls = [];
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url, body: init.body }); return new Response('{"stage":1}', { status: 200 }); };
  try {
    const ok = await onRequestGet({ request: new Request('https://x/api/plaza?season=harvest-2026'),
      env: { SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'k' }, waitUntil: () => {} });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('cache-control'), 'public, max-age=60');
    assert.equal(calls[0].url, 'https://sb/rest/v1/rpc/plaza_progress');
    assert.deepEqual(JSON.parse(calls[0].body), { p_season: 'harvest-2026' });
  } finally { globalThis.fetch = realFetch; delete globalThis.caches; }
});
```

- [ ] **Step 2: 실행 — 실패 확인**

Run: `node --test tests/plaza-route.test.mjs`
Expected: FAIL `worker/index.js 에 '/api/plaza' 라우트가 없다`

- [ ] **Step 3: Worker 핸들러 작성**

```js
// functions/api/plaza.js
// =============================================================
//  🌾 GET /api/plaza?season=harvest-2026
//  ------------------------------------------------------------
//  Supabase RPC(public.plaza_progress) 프록시 + 엣지 캐시 60초.
//  - 전 유저 동일 데이터 → 캐시 적중률이 높아 DB 부하 ~0
//  - 기부 직후 내 화면은 plaza_donate 응답으로 즉시 갱신하므로 60초 지연은 남의 화면에만
//  - 시크릿 불필요: RPC 가 anon 실행 허용(security definer, 식별자 미반환)
//  로컬 미러: scripts/serve.py serve_plaza — 한쪽만 고치지 말 것
// =============================================================
const SEASON_RE = /^[a-z0-9-]{3,32}$/;
const TTL = 60;

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra },
  });
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const season = url.searchParams.get('season') || '';
  if (!SEASON_RE.test(season)) return json({ error: 'bad season' }, 400);

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/plaza?season=${season}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/plaza_progress`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ p_season: season }),
  });
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'plaza_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return json({ error: 'upstream' }, 502);
  }
  const out = json(await r.json(), 200, { 'cache-control': `public, max-age=${TTL}` });
  if (waitUntil) waitUntil(cache.put(cacheKey, out.clone()));
  return out;
}
```

- [ ] **Step 4: Worker 라우트 등록**

`worker/index.js` import 구역(리더보드 import 줄 :20 아래)에:

```js
import { onRequestGet as plaza } from '../functions/api/plaza.js';
```

`routeApi` 의 리더보드 블록(:153-157) 바로 뒤에:

```js
  // 🌾 수확제 광장 진행률 — Supabase RPC 프록시(엣지 캐시 60초)
  if (pathname === '/api/plaza') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await plaza({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }
```

- [ ] **Step 5: 로컬 미러 추가**

`scripts/serve.py` `do_GET` 의 리더보드 분기(:675-677) 뒤에:

```python
        if self.path.split('?')[0] == '/api/plaza':
            self.serve_plaza()
            return
```

`serve_leaderboard` 메서드 뒤에:

```python
    # ── 🌾 수확제 광장 (functions/api/plaza.js 와 같은 규칙 — 한쪽만 고치지 마세요) ──
    #    Supabase RPC(public.plaza_progress) 프록시. 로컬은 캐시 없이 매번 조회(개발 편의).
    def serve_plaza(self):
        import urllib.parse as _up
        q = _up.parse_qs(_up.urlparse(self.path).query)
        season = (q.get('season') or [''])[0]
        if not re.match(r'^[a-z0-9-]{3,32}$', season):
            payload = json.dumps({'error': 'bad season'}).encode(); code = 400
        else:
            url = os.environ.get('SUPABASE_URL'); anon = os.environ.get('SUPABASE_ANON_KEY')
            body = json.dumps({'p_season': season}).encode()
            req = urllib.request.Request(url + '/rest/v1/rpc/plaza_progress', data=body, method='POST',
                                         headers={'Content-Type': 'application/json', 'apikey': anon,
                                                  'Authorization': 'Bearer ' + anon})
            try:
                with urllib.request.urlopen(req, timeout=15, context=ssl_context()) as res:
                    payload = res.read(); code = 200
            except Exception as e:
                print(f'[plaza] RPC 실패: {type(e).__name__}: {e}')
                payload = json.dumps({'error': 'upstream'}).encode(); code = 502
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
```

- [ ] **Step 6: 네트워크 모듈 뼈대(경로 테스트용 — Task 4 에서 완성)**

```js
// js/plaza/net.js
import { CONFIG } from '../config.js';
export const PLAZA_API = (season) => `${CONFIG.API_BASE}/api/plaza?season=${encodeURIComponent(season)}`;
```

(테스트는 `/api/plaza?season=` 문자열을 찾는다 — 템플릿 리터럴 안에 그대로 들어 있다)

- [ ] **Step 7: 실행 — 통과 확인**

Run: `node --test tests/plaza-route.test.mjs && python3 -c "import ast; ast.parse(open('scripts/serve.py').read())" && node --check worker/index.js`
Expected: PASS · 구문 오류 없음

- [ ] **Step 8: Commit**

```bash
git add functions/api/plaza.js worker/index.js scripts/serve.py js/plaza/net.js tests/plaza-route.test.mjs
git commit -m "feat: 🌾 /api/plaza 진행률 프록시(60초 캐시) + 로컬 미러 + 3벌 경로 테스트

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: RPC 래퍼 + 진행률 조회 스로틀

**Files:**
- Modify: `js/supabase-client.js`(`sendEconBatch` :539 함수 뒤)
- Modify: `js/plaza/net.js`
- Test: `tests/plaza-net.test.mjs`

**Interfaces:**
- Consumes: `PLAZA_API(season)`(Task 3)
- Produces:
  - `supabase-client.js`: `plazaDonate(season, item, qty) → Promise<obj>`, `plazaMine(season) → Promise<obj>` — 오프라인·에러는 `{ok:false, reason:'offline'|'upstream'}`
  - `net.js`: `createProgressFetcher({ fetchFn, now, gapMs=60000 }) → { get(season, {force}) → Promise<progress|null>, last() → progress|null }`, 기본 인스턴스 `progress`, 재수출 `donate`, `mine`

- [ ] **Step 1: 실패하는 테스트**

```js
// tests/plaza-net.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createProgressFetcher } from '../js/plaza/progress.js';

const res = (body, ok = true) => ({ ok, json: async () => body });

test('진행률: 60초 안 재호출은 캐시, force 는 즉시', async () => {
  let t = 0, n = 0;
  const f = createProgressFetcher({ fetchFn: async () => { n++; return res({ stage: n }); }, now: () => t });
  assert.equal((await f.get('harvest-2026')).stage, 1);
  t = 30_000; assert.equal((await f.get('harvest-2026')).stage, 1); assert.equal(n, 1);
  t = 61_000; assert.equal((await f.get('harvest-2026')).stage, 2);
  assert.equal((await f.get('harvest-2026', { force: true })).stage, 3);
});

test('진행률: 실패하면 마지막 값을 유지한다', async () => {
  let t = 0, fail = false;
  const f = createProgressFetcher({ fetchFn: async () => (fail ? res({}, false) : res({ stage: 2 })), now: () => t });
  await f.get('s'); fail = true; t = 70_000;
  assert.equal((await f.get('s')).stage, 2);
  assert.equal(f.last().stage, 2);
});

test('진행률: 에러 응답 본문({error})은 값으로 받지 않는다', async () => {
  const f = createProgressFetcher({ fetchFn: async () => res({ error: 'unknown season' }), now: () => 0 });
  assert.equal(await f.get('s'), null);
});

test('진행률: 동시 호출은 한 번만 나간다', async () => {
  let n = 0;
  const f = createProgressFetcher({ fetchFn: async () => { n++; return res({ stage: 1 }); }, now: () => 0 });
  await Promise.all([f.get('s'), f.get('s'), f.get('s')]);
  assert.equal(n, 1);
});

test('RPC 는 supabase-client.js 안에서만 — 클라이언트 객체를 밖으로 내보내지 않는다', () => {
  const sc = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.ok(/plazaCall\('plaza_donate'/.test(sc));
  assert.ok(/plazaCall\('plaza_mine'/.test(sc));
  assert.ok(/supabase\.rpc\(fn, args\)/.test(sc));
  assert.ok(!/export\s+(const|let)\s+supabase\b/.test(sc));
});
```

(스로틀은 `js/plaza/progress.js` 로 분리한다 — `net.js` 는 `supabase-client.js` 를 import 하고, 그 파일은 브라우저 전역(`location`·`localStorage`)을 모듈 최상위에서 읽을 수 있어 node 테스트에서 import 하면 깨질 수 있다.)

- [ ] **Step 2: 실행 — 실패 확인**

Run: `node --test tests/plaza-net.test.mjs`
Expected: FAIL `Cannot find module '../js/plaza/progress.js'`

- [ ] **Step 3: RPC 래퍼 추가**

`js/supabase-client.js` 의 `sendEconBatch` 함수 뒤에:

```js
// ── 🌾 수확제 광장 RPC — 규칙 판정은 전부 서버(migrate_plaza.sql). 여기선 호출만 ──
//    오프라인·에러는 { ok:false, reason } 로 통일 → 클라는 인벤토리를 건드리지 않는다
async function plazaCall(fn, args) {
  if (!state.online || !supabase) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) { console.warn(`[plaza] ${fn} 실패:`, error.message); return { ok: false, reason: 'upstream' }; }
    return data || { ok: false, reason: 'upstream' };
  } catch (e) {
    console.warn(`[plaza] ${fn} 예외:`, e?.message || e);
    return { ok: false, reason: 'offline' };
  }
}
export function plazaDonate(season, item, qty) { return plazaCall('plaza_donate', { p_season: season, p_item: item, p_qty: qty }); }
export function plazaMine(season) { return plazaCall('plaza_mine', { p_season: season }); }
```

- [ ] **Step 4: 스로틀·net 완성**

```js
// js/plaza/progress.js
// 🌾 진행률 조회 스로틀 — 60초 안 재호출은 캐시, 동시 호출은 한 번, 실패 시 마지막 값 유지(순수·주입형)
export function createProgressFetcher({ fetchFn, url, now = () => Date.now(), gapMs = 60_000 }) {
  let lastVal = null, lastAt = -Infinity, inflight = null;
  async function load(season) {
    try {
      const r = await fetchFn(url ? url(season) : season);
      if (!r.ok) return lastVal;
      const v = await r.json();
      if (!v || v.error) return lastVal;
      lastVal = v; lastAt = now();
      return v;
    } catch { return lastVal; }
  }
  return {
    get(season, { force = false } = {}) {
      if (!force && lastVal && now() - lastAt < gapMs) return Promise.resolve(lastVal);
      if (inflight) return inflight;
      inflight = load(season).finally(() => { inflight = null; });
      return inflight;
    },
    last: () => lastVal,
  };
}
```

```js
// js/plaza/net.js
// =============================================================
//  🌾 광장 네트워크 — 진행률은 /api/plaza(엣지 60초 캐시)를 60초 간격으로만 조회,
//  기부·내 기록은 supabase-client.js 의 RPC 래퍼(로그인 토큰 필요)
// =============================================================
import { CONFIG } from '../config.js';
import { plazaDonate, plazaMine } from '../supabase-client.js';
import { createProgressFetcher } from './progress.js';

export const PLAZA_API = (season) => `${CONFIG.API_BASE}/api/plaza?season=${encodeURIComponent(season)}`;
export const donate = plazaDonate;
export const mine = plazaMine;
export const progress = createProgressFetcher({ fetchFn: (u) => fetch(u), url: PLAZA_API });
```

- [ ] **Step 5: 실행 — 통과 확인**

Run: `node --test tests/plaza-net.test.mjs tests/plaza-route.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add js/supabase-client.js js/plaza/net.js js/plaza/progress.js tests/plaza-net.test.mjs
git commit -m "feat: 🌾 광장 RPC 래퍼·진행률 60초 스로틀 — 실패 시 마지막 값 유지

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 게임 연결(game.js 연결 줄) + 광장 진입점 뼈대

**Files:**
- Create: `js/plaza/index.js`
- Modify: `js/game.js` — import(:52 근처), gameState 기본값(:913-975), `applySave`(:2308, `gifts` 복원 ~:2462 뒤), 나무 산포(:2715-2736), 풀(:2755-2760), 꽃(:4043-4054), 스폰(:2741 뒤), 메인 루프(:5209 뒤), `handleAction`(:6109 뒤), `farmActionFirst`(:6258), `VILLAGE_PLACES`(:5018-5037), `RES_LABEL`(:6640)
- Modify: `js/spaces/doors.js`(:265-283)
- Modify: `js/i18n-en.js`
- Test: `tests/plaza-wiring.test.mjs`(추가 검사)

**Interfaces:**
- Consumes: `restorePlaza`, `plazaDefault`, `plazaBlocks`, `siteOpen`, `seasonPhase`, `visualStage`(Task 2), `progress`(Task 4)
- Produces (`js/plaza/index.js`):
  - `initPlaza()` — 스폰 시 1회
  - `updatePlaza(dt, inVillage)` — 매 프레임(내부 1초 스로틀)
  - `plazaSpot(pos) → 'box'|'stall'|'plaque'|null` — doors.js 가 호출
  - `plazaSpotNow()` — 마지막 판정 결과(handleAction·farmActionFirst)
  - `openPlaza()` — 액션 버튼
  - `plazaScatterBlocks(x, z, pad)` — 시즌 터가 열렸을 때만 `plazaBlocks`
  - 내부 공유: `phaseNow()`, `refresh(force)`, `applyStage(stage)`, `shownStage`, `lastProg`

- [ ] **Step 1: 가드 테스트에 연결 검사 추가**

`tests/plaza-wiring.test.mjs` 에 추가:

```js
test('game.js 연결 지점이 전부 있다', () => {
  const game = read('js/game.js');
  for (const needle of ["from './plaza/index.js'", 'initPlaza()', 'updatePlaza(dt', 'plazaSpotNow()', 'plazaScatterBlocks(',
                        'plaza: plazaDefault()', 'restorePlaza(saved.plaza)']) {
    assert.ok(game.includes(needle), `game.js 에 ${needle} 연결이 없다`);
  }
  assert.ok(read('js/spaces/doors.js').includes('plazaSpot('), 'doors.js 근접 프롬프트 연결이 없다');
});

test('지도 지명 좌표가 PLAZA 와 같다', () => {
  const place = read('js/game.js').match(/name: '수확제 광장', x: (-?[\d.]+), z: (-?[\d.]+)/);
  const def = read('js/data/places.js').match(/PLAZA = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/);
  assert.ok(place && def);
  assert.deepEqual([Number(place[1]), Number(place[2])], [Number(def[1]), Number(def[2])]);
});
```

(Task 2 주의대로 `PLAZA` 를 `js/data/plaza.js` 로 옮겼다면 두 번째 정규식을 그 파일의 `PLAZA = { x: (..), z: (..) }` 로 바꾼다)

- [ ] **Step 2: 실행 — 실패 확인**

Run: `node --test tests/plaza-wiring.test.mjs`
Expected: FAIL `game.js 에 from './plaza/index.js' 연결이 없다`

- [ ] **Step 3: 진입점 뼈대 작성**

```js
// js/plaza/index.js
// =============================================================
//  🌾 수확제 광장 — 게임 연결 진입점. game.js 는 여기 함수만 부른다(연결 줄 ≤14).
//  스펙: docs/superpowers/specs/2026-09-27-harvest-plaza-design.md
// =============================================================
import { gameState, player, dist2D, ui } from '../game.js';
import { PLAZA, PLAZA_BOX, PLAZA_STALL_POS } from '../data/places.js';
import { PLAZA_SEASON, PLAZA_VIEW_R } from '../data/plaza.js';
import { plazaBlocks, siteOpen, seasonPhase, visualStage } from './rules.js';
import { progress } from './net.js';

export { plazaDefault, restorePlaza } from './rules.js';

const DEBUG_STAGE = (() => {                       // ?plaza=0|1|2|3|4 — 검수용 단계 고정(DEV_PARAMS: 기록 안 됨)
  const v = new URLSearchParams(location.search).get('plaza');
  return v !== null && /^[0-4]$/.test(v) ? Number(v) : null;
})();
const BOX_R = 2.0;
const STALL_R = 2.0;
// 시즌 id — localhost 에서만 ?plazaSeason= 으로 바꿀 수 있다(Task 8 의 dev-plaza 시즌 검증용). 모든 서버 호출·트래킹은 SEASON 을 쓴다
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const SEASON = (IS_LOCAL && new URLSearchParams(location.search).get('plazaSeason')) || PLAZA_SEASON;

let spotNow = null;
let shownStage = -1;
let lastProg = null;

export function plazaScatterBlocks(x, z, pad = 2) {
  return (DEBUG_STAGE !== null || siteOpen(Date.now())) && plazaBlocks(x, z, pad);
}

export function phaseNow() {
  if (DEBUG_STAGE !== null) return DEBUG_STAGE === 4 ? 'after' : DEBUG_STAGE === 0 ? 'before' : 'active';
  return seasonPhase(lastProg, Date.now());
}

function applyStage(stage) {
  if (stage === shownStage) return;
  shownStage = stage;
  gameState.plaza = { ...gameState.plaza, lastStage: stage };
  // Task 6·7: 광장·돌길 메시 교체
}

export async function refresh(force = false) {
  const p = await progress.get(SEASON, { force });
  if (p) lastProg = p;
  if (DEBUG_STAGE === null) applyStage(visualStage(lastProg, gameState.plaza.lastStage));
}

export function initPlaza() {
  applyStage(DEBUG_STAGE ?? visualStage(null, gameState.plaza.lastStage));
  refresh();
}

let viewCheck = 0;
export function updatePlaza(dt, inVillage) {
  viewCheck -= dt;
  if (viewCheck > 0 || !inVillage) return;
  viewCheck = 1;
  if (dist2D(PLAZA, player.position) < PLAZA_VIEW_R) refresh();
}

export function plazaSpot(pos) {
  const phase = phaseNow();
  if (shownStage <= 0 || phase === 'before') { spotNow = null; return null; }
  if (dist2D(PLAZA_BOX, pos) < BOX_R) spotNow = phase === 'after' || shownStage === 4 ? 'plaque' : 'box';
  else if (phase === 'active' && dist2D(PLAZA_STALL_POS, pos) < STALL_R) spotNow = 'stall';
  else spotNow = null;
  return spotNow;
}

export function plazaSpotNow() { return spotNow; }

export function openPlaza() {
  // Task 8·9: 모달
  ui.toast?.('🌾 준비 중이에요');
}

export const plazaView = { stage: () => shownStage, progress: () => lastProg };
```

- [ ] **Step 4: game.js 연결(이 줄들만)**

1. import 구역(`import { t, LANG, aiBucket } from './i18n.js';` :52 아래):
```js
import { initPlaza, updatePlaza, plazaSpotNow, openPlaza, plazaScatterBlocks, plazaDefault, restorePlaza } from './plaza/index.js';
```
2. gameState 기본값 `nickname: null`(:974) 앞 줄에:
```js
  plaza: plazaDefault(),                   // 🌾 수확제 광장 { lastStage, claimed, invited, converted, seen }
```
3. `applySave` 안 `if (saved.gifts) ...`(~:2462) 뒤:
```js
  gameState.plaza = restorePlaza(saved.plaza);   // 🌾 광장(옛 세이브=기본값)
```
4. 나무 산포 조건(:2735 `|| NPCS.some(...)` 앞 줄):
```js
  || plazaScatterBlocks(x, z)
```
5. 풀 산포(:2755-2760 `if (dist2D({ x, z }, SHOP_POS) < 3.2) continue;` 뒤):
```js
      if (plazaScatterBlocks(x, z, 0.5)) continue;
```
6. 꽃 산포(:4052 `SHOP_POS < 3.2` 줄 뒤):
```js
    if (plazaScatterBlocks(x, z, 1)) continue;
```
7. `spawnRankBoard();`(:2741) 뒤:
```js
  initPlaza();                // 🌾 수확제 광장(시즌 터·돌길)
```
8. `updateOwlVisit(dt);`(:5209) 뒤:
```js
  updatePlaza(dt, inVillage2());   // 🌾 광장 근처면 진행률 재조회 · 🦉 초대
```
9. `handleAction` 의 `if (nearRank) return ui.openLeaderboard?.();`(:6109) 뒤:
```js
  if (plazaSpotNow()) return openPlaza();
```
10. `farmActionFirst`(:6258) 조건 `|| nearCosShop` 뒤에 `|| !!plazaSpotNow()` 추가(같은 줄)
11. `VILLAGE_PLACES` 의 과수원 줄 앞:
```js
  { ico: '🌾', name: '수확제 광장', x: 23, z: -4, pri: 1 },
```
12. `RES_LABEL`(:6640) 객체에 `leaf: '🍂수확제 잎사귀'` 항목 추가(같은 줄 안)

⚠️ `initPlaza()` 가 스폰 전에 `gameState.plaza` 를 읽는다 — `applySave` 가 스폰보다 먼저 실행되는지 확인(`grep -n "applySave(\|spawnRankBoard()" js/game.js`). 스폰이 먼저면 `applySave` 끝에 `refreshPlaza()` 호출 1줄을 추가하고(`index.js` 에서 `refresh` 를 `refreshPlaza` 로 export) 연결 줄 수를 다시 센다.

⚠️ 산포 루프(나무 60회 재시도)는 **부팅 시 1회**라 `plazaScatterBlocks` 가 `Date.now()` 를 부르는 비용은 무시할 수준이지만, 시즌 전(10/9 이전)에 배포되면 광장 자리에 나무가 자랄 수 있다 → 10/9 에 접속한 유저는 새로고침 시 나무가 비켜난다(나무는 매 부팅 랜덤이라 세이브 영향 없음).

- [ ] **Step 5: doors.js 근접 프롬프트**

`js/spaces/doors.js` import 구역에:
```js
import { plazaSpot } from '../plaza/index.js';
```
`stationZone` 계산(:274) 앞에:
```js
  // 🌾 수확제 광장 — 기부함·좌판·명판(마을 동쪽 멀리라 다른 시설과 겹치지 않는다)
  const plazaHere = inVillage && !nearRank ? plazaSpot(player.position) : null;
```
`stationZone` 식 첫 괄호 `(inVillage && !nearKitchen && ... && !nearCoop)` 에 `&& !plazaHere` 추가. 프롬프트 체인의 `else if (nearRank) {...}`(:283) 뒤에:
```js
  else if (plazaHere === 'box') prompt = '🌾 광장에 기부하기';
  else if (plazaHere === 'stall') prompt = '🍂 수확제 좌판';
  else if (plazaHere === 'plaque') prompt = '🌾 광장 명판 보기';
```
(프롬프트 문구는 Task 8 문구 게이트에서 확정 — 바뀌면 여기와 i18n 을 함께 고친다)

- [ ] **Step 6: i18n 추가**

`js/i18n-en.js` `EN` 에:
```js
  '수확제 광장': 'Harvest Plaza',
  '🍂수확제 잎사귀': '🍂Harvest Leaf',
  '🌾 광장에 기부하기': '🌾 Donate to the Plaza',
  '🍂 수확제 좌판': '🍂 Harvest Stall',
  '🌾 광장 명판 보기': '🌾 View the Plaza Plaque',
  '🌾 준비 중이에요': '🌾 Coming soon',
```

- [ ] **Step 7: 실행 — 테스트 + 로컬 부팅 확인**

Run: `node --test tests/plaza-*.test.mjs && npm test && for f in js/*.js js/plaza/*.js js/spaces/*.js; do node --check "$f" || exit 1; done && node scripts/i18n_check.mjs`
Expected: 전부 PASS, wiring 테스트 plaza 줄 ≤14

로컬 확인: `preview_start` 로 dev 서버 → `/?plaza=1&spawn=21,1` → 콘솔 에러 0, 기부함 자리(21.4, −0.9)에서 "🌾 광장에 기부하기" 프롬프트, 액션 시 "🌾 준비 중이에요". `/?spawn=21,1`(디버그 없음, 시즌 전)에서는 프롬프트가 없어야 한다. 미니맵에 🌾 아이콘, 전체 지도에 "수확제 광장".

- [ ] **Step 8: Commit**

```bash
git add js/plaza/index.js js/game.js js/spaces/doors.js js/i18n-en.js tests/plaza-wiring.test.mjs
git commit -m "feat: 🌾 광장 연결 — 세이브·산포 제외·근접 프롬프트·지도 지명(game.js 는 연결 줄만)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 🎨 광장 3D 단계별 모델 — 디자인 게이트 A

**Files:**
- Create: `js/plaza/build.js`
- Modify: `js/plaza/index.js`(`applyStage` 에서 교체)
- 임시(커밋 안 함): `.scratch/plaza/` 캡처

**Interfaces:**
- Consumes: `clayMat`, `mergeGeos`, `houseWindows`, `scene`, `solidCircle`, `removeSolid`, `obstacles`(game.js export)
- Produces: `buildPlaza(stage, phase, variant='a') → { group: THREE.Group, dispose() }`

- [ ] **Step 1: `houseWindows` 항목 모양 확인**

Run: `grep -n "houseWindows" js/spaces/cafe.js js/game.js | head`
`houseWindows.push(mat)`(머티리얼)인지 `push({ mat, ... })`(객체)인지 확인하고 아래 코드의 push·해제를 같은 모양으로 맞춘다.

- [ ] **Step 2: 광장 빌더 작성(3개 시안 팔레트)**

시안은 **팔레트만** 다르고 파츠 구성은 같다: a = 따뜻한 흙·주황 단풍(브레인스토밍 스케치), b = 채도 낮춘 베이지·갈색(차분), c = 붉은 단풍·짙은 나무(가을 강조).

```js
// js/plaza/build.js
// =============================================================
//  🌾 광장 3D — 단계별 파츠를 재질 키에 모아 mergeGeos() 한 번(카페 방식).
//  예산: 광장 ≤ 12콜. 색을 먼저 정하고(PALETTES) 파츠는 그 키에만 담는다.
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { clayMat, mergeGeos, houseWindows } from '../game.js';
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS } from '../data/places.js';

const PALETTES = {
  a: { dirt: 0xc9a26b, stone: 0xdad4c6, stoneDark: 0xb8b09f, wood: 0xb07d50, woodDark: 0x7a5230, straw: 0xe6c35c, pumpkin: 0xe88a2e, leaf: 0xe0873a, lamp: 0xffe39a },
  b: { dirt: 0xbfa27c, stone: 0xd8d2c4, stoneDark: 0xaaa293, wood: 0xa37c5a, woodDark: 0x6e5440, straw: 0xd9c07a, pumpkin: 0xd98a4a, leaf: 0xc98a52, lamp: 0xfbe3a8 },
  c: { dirt: 0xc49a60, stone: 0xdcd5c3, stoneDark: 0xb3a994, wood: 0xa8683c, woodDark: 0x5e3b22, straw: 0xe8bf4a, pumpkin: 0xe8742a, leaf: 0xc8452e, lamp: 0xffd98a },
};

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
const ringFlat = (r1, r2, y) => new THREE.RingGeometry(r1, r2, 32).rotateX(-Math.PI / 2).translate(0, y, 0);

// 로컬 좌표(광장 중심 기준)
const BX = PLAZA_BOX.x - PLAZA.x, BZ = PLAZA_BOX.z - PLAZA.z;
const SX = PLAZA_STALL_POS.x - PLAZA.x, SZ = PLAZA_STALL_POS.z - PLAZA.z;

function stage1(add) {
  add('dirt', cyl(PLAZA_R, PLAZA_R, 0.06, 0, 0.03, 0, 28));
  for (let i = 0; i < 8; i++) {                                   // 구획 말뚝
    const a = (i / 8) * Math.PI * 2;
    add('woodDark', box(0.14, 0.7, 0.14, Math.cos(a) * (PLAZA_R - 0.3), 0.35, Math.sin(a) * (PLAZA_R - 0.3)));
  }
  for (let i = 0; i < 3; i++) add('wood', box(1.8, 0.18, 0.3, -2.2, 0.12 + i * 0.19, 1.6 + (i % 2) * 0.1));   // 목재 더미
  add('stoneDark', ball(0.35, 2.1, 0.25, 1.8)); add('stone', ball(0.28, 2.6, 0.2, 2.1)); add('stoneDark', ball(0.25, 2.3, 0.45, 1.95));
}

function stage2(add) {
  add('stone', cyl(PLAZA_R, PLAZA_R, 0.08, 0, 0.04, 0, 32));
  add('stoneDark', ringFlat(3.2, 3.35, 0.085)); add('stoneDark', ringFlat(1.6, 1.75, 0.085));
  for (const s of [-1, 1]) {                                      // 벤치 2개(동·서) + 가로등
    add('wood', box(0.5, 0.08, 1.6, s * 3.6, 0.45, 0));
    add('woodDark', box(0.08, 0.45, 0.08, s * 3.6, 0.22, -0.65)); add('woodDark', box(0.08, 0.45, 0.08, s * 3.6, 0.22, 0.65));
    add('woodDark', box(0.1, 2.4, 0.1, s * 3.0, 1.2, -2.6));
    add('lamp', ball(0.2, s * 3.0, 2.5, -2.6));
  }
}

function stage3(add) {
  stage2(add);
  add('straw', cyl(0.45, 0.45, 0.6, -3.3, 0.3, 2.4));            // 볏단
  add('straw', cyl(0.4, 0.4, 0.55, -2.6, 0.28, 2.9));
  add('pumpkin', ball(0.38, 3.0, 0.3, 2.6, 0.75)); add('pumpkin', ball(0.28, 3.6, 0.22, 2.2, 0.75)); add('pumpkin', ball(0.24, 2.6, 0.2, 3.1, 0.75));
  add('woodDark', box(0.1, 1.9, 0.1, 0, 0.95, -3.4)); add('woodDark', box(1.1, 0.08, 0.08, 0, 1.4, -3.4));   // 허수아비 틀
  add('straw', ball(0.25, 0, 2.05, -3.4));
}

function stage4(add) {
  stage3(add);
  add('woodDark', cyl(0.25, 0.35, 2.6, 0, 1.3, 0));                // 수확 나무 줄기
  add('leaf', ball(1.5, 0, 3.4, 0)); add('leaf', ball(1.0, -1.0, 2.9, 0.3)); add('leaf', ball(1.0, 1.0, 3.0, -0.2)); add('leaf', ball(0.9, 0.1, 4.3, 0));
  for (const [x, y, z] of [[-0.9, 2.5, 0.9], [1.0, 2.6, 0.8], [0.2, 2.3, -1.1], [-1.2, 3.1, -0.6]]) add('lamp', ball(0.14, x, y, z));
  add('stoneDark', cyl(0.9, 1.0, 0.25, 0, 0.12, 0, 16));           // 나무 둘레석
}

function props(add, stage, phase) {
  if (stage === 4 || phase === 'after') {                         // 명판(기부함 자리)
    add('woodDark', box(0.12, 1.1, 0.12, BX - 0.5, 0.55, BZ)); add('woodDark', box(0.12, 1.1, 0.12, BX + 0.5, 0.55, BZ));
    add('wood', box(1.3, 0.8, 0.1, BX, 1.2, BZ));
  } else {                                                        // 기부함
    add('wood', box(0.9, 0.7, 0.7, BX, 0.35, BZ)); add('woodDark', box(0.95, 0.08, 0.75, BX, 0.74, BZ));
    add('straw', box(0.5, 0.05, 0.1, BX, 0.79, BZ));
  }
  if (phase === 'active') {                                       // 좌판
    add('wood', box(1.6, 0.8, 0.7, SX, 0.4, SZ));
    add('woodDark', box(0.08, 1.6, 0.08, SX - 0.75, 0.8, SZ - 0.3)); add('woodDark', box(0.08, 1.6, 0.08, SX + 0.75, 0.8, SZ - 0.3));
    add('straw', box(1.8, 0.08, 0.9, SX, 1.62, SZ - 0.1));
  }
}

const STAGES = [null, stage1, stage2, stage3, stage4];

export function buildPlaza(stage, phase, variant = 'a') {
  const pal = PALETTES[variant] || PALETTES.a;
  const parts = new Map();
  const add = (k, geo) => { const a = parts.get(k); a ? a.push(geo) : parts.set(k, [geo]); };
  if (stage >= 1) { STAGES[stage](add); props(add, stage, phase); }

  const group = new THREE.Group();
  group.position.set(PLAZA.x, 0, PLAZA.z);
  const mats = [];
  for (const [k, geos] of parts) {
    const mat = k === 'lamp'
      ? new THREE.MeshStandardMaterial({ color: pal.lamp, emissive: pal.lamp, emissiveIntensity: 0, roughness: 0.6 })
      : clayMat(pal[k]);
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], mat);
    m.castShadow = k !== 'dirt' && k !== 'stone'; m.receiveShadow = true;
    group.add(m); mats.push(mat);
    if (k === 'lamp') houseWindows.push(mat);                     // 밤에 켜지는 등불(Step 1 에서 확인한 모양으로)
  }
  return {
    group,
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const mat of mats) {
        const i = houseWindows.indexOf(mat); if (i >= 0) houseWindows.splice(i, 1);
        mat.dispose();
      }
    },
  };
}
```

`RingGeometry` 가 `mergeGeos` 에서 깨지면(uv·normal 불일치) `ringFlat` 을 얇은 `cyl` 한 쌍으로 대체한다.

- [ ] **Step 3: 진입점에서 교체·충돌체 연결**

`js/plaza/index.js` 상단 import 에 `scene, solidCircle, removeSolid, obstacles` 를 `'../game.js'` 에서 추가하고, `PLAZA_R` 을 places import 에 추가, `import { buildPlaza } from './build.js';`. 그리고:

```js
const VARIANT = new URLSearchParams(location.search).get('plazaVar') || 'a';   // 디자인 게이트 A 용(확정 후 삭제)
let built = null, solids = [], obstacle = null;

function clearBuilt() {
  if (built) { scene.remove(built.group); built.dispose(); built = null; }
  for (const c of solids) removeSolid(c);
  solids = [];
  if (obstacle) { const i = obstacles.indexOf(obstacle); if (i >= 0) obstacles.splice(i, 1); obstacle = null; }
}

function rebuild(stage) {
  clearBuilt();
  if (stage === 0) return;
  const phase = phaseNow();
  built = buildPlaza(stage, phase, VARIANT);
  scene.add(built.group);
  obstacle = { x: PLAZA.x, z: PLAZA.z, r: PLAZA_R }; obstacles.push(obstacle);   // 야외 장식을 광장 위에 못 놓게
  solids.push(solidCircle(PLAZA_BOX.x, PLAZA_BOX.z, 0.6));
  if (phase === 'active') solids.push(solidCircle(PLAZA_STALL_POS.x, PLAZA_STALL_POS.z, 0.9));
  if (stage >= 2) solids.push(solidCircle(PLAZA.x - 3.6, PLAZA.z, 0.5), solidCircle(PLAZA.x + 3.6, PLAZA.z, 0.5));
  if (stage === 4) solids.push(solidCircle(PLAZA.x, PLAZA.z, 1.0));
}
```

`applyStage` 의 `// Task 6·7` 주석을 `rebuild(stage);` 로 바꾼다.

- [ ] **Step 4: 로컬 렌더 확인**

`preview_start` → `/?plaza=1&spawn=23,3&weather=clear&time=0.32`, 이어서 `plaza=2,3,4`. 콘솔 에러 0, 바닥이 땅에 박히거나 뜨지 않는지 확인. 밤(`time=0.9`)에 등불이 켜지는지.

- [ ] **Step 5: 드로우콜 측정**

`/?dbg=1&weather=clear&time=0.32&plaza=N` 에서 `__tp(23,1)` 후 `__perf().calls` 를 `plaza=0` 기준과 1~4 단계에서 각 3회 기록(메모리 draw-call-optimization: 시간 고정 필수, 원본 N회 내내 고정인 값만 비교). 단계 4 증가분 ≤ 12. 넘으면 같은 계열 키를 합친다(예: `stoneDark` → `stone`).

- [ ] **Step 6: 🎨 디자인 게이트 A — 사용자 검수(필수, 여기서 멈춤)**

헤드리스 캡처(메모리 store-screenshot-capture·game-capture-pitfall: `body.playing` 수동 부여, 한글 폰트 폭 주의)로 시안 a·b·c × 단계 4 를 PC(1280×800)·모바일 세로(390×844) 낮으로 찍어 **한 장 보드로 나란히** 보여 준다. 사용자가 시안을 고르면 그 시안의 단계 1~3 + 단계 4 밤 컷을 이어서 보여 준다. **사용자가 고르고 수정 요청이 끝날 때까지 Step 7 로 가지 않는다.** 수정 요청은 이 태스크 안에서 반영하고 다시 캡처한다.

- [ ] **Step 7: 고른 시안 확정 + 검수 코드 제거**

`PALETTES` 를 고른 한 벌(`const PAL = {...}`)만 남기고 `variant` 인자·`?plazaVar`·`VARIANT` 를 삭제. 드로우콜을 다시 측정.

- [ ] **Step 8: Commit**

```bash
git add js/plaza/build.js js/plaza/index.js
git commit -m "feat: 🌾 광장 3D 단계 1~4 — 재질 병합, 단계 4 +<실측>콜

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 🎨 돌길·깃발 줄·깃대 — 디자인 게이트 B(가시성)

**Files:**
- Create: `js/plaza/path.js`
- Modify: `js/plaza/index.js`(`rebuild`·`clearBuilt` 에 연결)

**Interfaces:**
- Consumes: `PLAZA_PATH`, `PLAZA_POLE`(Task 2), `clayMat`, `mergeGeos`, `paintGeo`, `vtxMat`(game.js)
- Produces: `buildPath(stage, phase, poleH=9) → { group, dispose() }` — 돌길은 stage ≥ 1 이면 항상, 깃대·깃발 줄은 `phase === 'active' && stage < 4` 에서만

- [ ] **Step 1: 경로 빌더 작성**

```js
// js/plaza/path.js
// =============================================================
//  🌾 광장으로 이끄는 돌길·깃발 줄·깃대 — 말 없이 동선을 만든다(스펙 §4 발견성 ①②).
//  예산 ≤ 3콜: 돌(1) · 어두운 나무(기둥+깃대, 1) · 깃발 정점색(1)
// =============================================================
import * as THREE from 'three';
import { clayMat, mergeGeos, paintGeo, vtxMat } from '../game.js';
import { PLAZA_PATH, PLAZA_POLE } from '../data/places.js';

const FLAG_COLORS = [0xe26d5a, 0xf2c14e, 0x6bb5a6];

function tri(points, uv) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
const smallFlag = () => tri([-0.14, 0, 0, 0.14, 0, 0, 0, -0.32, 0], [0, 1, 1, 1, 0.5, 0]);

export function buildPath(stage, phase, poleH = 9) {
  const group = new THREE.Group();
  const mats = [];
  const dispose = () => { for (const m of group.children) m.geometry.dispose(); for (const m of mats) m.dispose(); };
  if (stage < 1) return { group, dispose };

  const stones = [], wood = [], flags = [];
  PLAZA_PATH.forEach(([x, z], i) => {
    stones.push(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 7).rotateY(i * 1.7).translate(x, 0.025, z));   // 결정적 회전(부팅마다 같은 모양)
  });

  if (phase === 'active' && stage < 4) {
    const posts = PLAZA_PATH.filter((_, i) => i >= 3 && i % 3 === 0);   // 스폰 쪽 첫 구간은 비움(시작점 과밀 방지)
    for (const [x, z] of posts) wood.push(new THREE.BoxGeometry(0.1, 2.2, 0.1).translate(x, 1.1, z + 0.9));
    for (let i = 0; i + 1 < posts.length; i++) {
      const [x1, z1] = posts[i], [x2, z2] = posts[i + 1];
      const rot = -Math.atan2(z2 - z1, x2 - x1);
      for (let k = 1; k < 6; k++) {
        const t = k / 6, sag = Math.sin(t * Math.PI) * 0.35;
        flags.push(paintGeo(smallFlag().rotateY(rot).translate(x1 + (x2 - x1) * t, 2.1 - sag, z1 + (z2 - z1) * t + 0.9), FLAG_COLORS[(i + k) % 3]));
      }
    }
    wood.push(new THREE.CylinderGeometry(0.1, 0.14, poleH, 8).translate(PLAZA_POLE.x, poleH / 2, PLAZA_POLE.z));   // 깃대
    flags.push(paintGeo(tri([0, 0, 0, 1.6, -0.45, 0, 0, -0.9, 0], [0, 1, 1, 0.5, 0, 0]).translate(PLAZA_POLE.x + 0.1, poleH - 0.1, PLAZA_POLE.z), 0xe0873a));
  }

  const put = (geos, mat, shadow) => {
    if (!geos.length) { mat.dispose(); return; }
    const m = new THREE.Mesh(mergeGeos(geos), mat);
    m.castShadow = shadow; m.receiveShadow = true;
    group.add(m); mats.push(mat);
  };
  put(stones, clayMat(0xe4dcc8), false);
  put(wood, clayMat(0x7a5230), true);
  const flagMat = vtxMat(); flagMat.side = THREE.DoubleSide;
  put(flags, flagMat, false);
  return { group, dispose };
}
```

- [ ] **Step 2: rebuild 에 연결**

`js/plaza/index.js`: `import { buildPath } from './path.js';`, `PLAZA_POLE` import 추가. `let pathBuilt = null, poleSolid = null;` 를 두고 `clearBuilt()` 에서 `pathBuilt` 제거·해제 + `poleSolid` 가 있으면 `removeSolid(poleSolid)`. `rebuild(stage)` 에서 `stage === 0` 반환 뒤:

```js
  pathBuilt = buildPath(stage, phase, POLE_H);
  scene.add(pathBuilt.group);
  if (phase === 'active' && stage < 4) { poleSolid = solidCircle(PLAZA_POLE.x, PLAZA_POLE.z, 0.3); }
```
`const POLE_H = Number(new URLSearchParams(location.search).get('plazaPole')) || 9;   // 디자인 게이트 B 용(확정 후 상수로)`

- [ ] **Step 3: 드로우콜 측정** — Task 6 Step 5 와 같은 방법, 돌길·깃발·깃대 증가분 ≤ 3.

- [ ] **Step 4: 🎨 디자인 게이트 B — 시작 화면 가시성 검수(필수, 여기서 멈춤)**

깃대 3안(높이 9 / 11 / 13, `?plazaPole=`)을 `?plaza=1` 시작 화면(스폰 0,0 · 기본 카메라)에서 PC·모바일 세로로 캡처해 나란히 보여 준다. 돌길은 스폰→랭킹 게시판→광장 앞 3컷. **모바일 세로에서 깃대가 화면 밖이면** 돌길 첫 구간을 스폰 정면(−Z 쪽)으로 한 번 꺾는 안(`PLAZA_PATH` 앞에 `[1.5,-1.0],[2.4,0.2]` 추가)을 추가 시안으로 만든다. 돌길이 랭킹 게시판·상점과 겹쳐 보이는지도 같이 본다. 사용자가 고를 때까지 멈춘다.

- [ ] **Step 5: 확정 + Commit**

`?plazaPole` 제거, `POLE_H` 상수 확정.

```bash
git add js/plaza/path.js js/plaza/index.js js/data/places.js
git commit -m "feat: 🌾 광장 돌길·깃발 줄·깃대 — 시작 화면에서 보이게(+<실측>콜)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 📝🎨 기부 모달 + 기부 흐름 — 문구 게이트·디자인 게이트 C

**Files:**
- Create: `js/plaza/ui.js`, `js/plaza/donate.js`, `js/plaza/copy.js`
- Modify: `js/plaza/index.js`(`openPlaza`), `js/spaces/doors.js`(프롬프트 확정 문구), `js/i18n-en.js`
- Test: `tests/plaza-donate.test.mjs`

**Interfaces:**
- Consumes: `donate`, `mine`(Task 4), `currentItems`, `donateMax`, `nextTier`(Task 2), `gameState`, `giveReward`, `refreshInventoryUI`, `requestSave`, `ui`, `Input`(game.js), `trackEvent`(`js/analytics.js`)
- Produces:
  - `donate.js`: `interpretDonate(requested, r) → { event:'plaza_donate'|'plaza_donate_fail', params, spend, leaf, toastKey }`
  - `copy.js`: `PLAZA_COPY` 확정 문구 표, `toastText(key, item, n) → string`
  - `ui.js`: `openPlazaModal(kind, ctx)`, `renderPlazaModal(ctx)`, `closePlazaModal()`; `ctx = { kind:'box'|'stall'|'plaque', prog, mine, inv, busy, onDonate(item, qty), onBuy(id), onClaim() }`

- [ ] **Step 1: 📝 문구 게이트(필수, 여기서 멈춤)**

아래 항목마다 한국어 후보 2~3개를 표로 보여 주고 사용자가 고른다(메모리 ui-copy-review-first).
- 근접 프롬프트 3종(기부함·좌판·명판)
- 모달 제목·단계 표시(예: "2단계 · 돌바닥 깔기")
- 오늘 남은 기부 표기(예: "오늘 18/30 더 낼 수 있어요")
- 버튼 3종(+1 · +5 · 최대)
- 토스트: ok("🪨 돌 5개를 보탰어요! 🍂+5"), cap, need, full, season, offline, upstream, auth
- 등급 안내(예: "🥈까지 12개")

확정 문구로 `js/plaza/copy.js` 를 만든다:

```js
// js/plaza/copy.js — 🌾 광장 문구(2026-09-27 사용자 확정). 한국어 원문 = i18n 키
import { PLAZA_ITEMS } from '../data/plaza.js';
export const PLAZA_COPY = {
  prompt: { box: '<확정>', stall: '<확정>', plaque: '<확정>' },
  todayLeft: '<확정, {0}=남은 수 {1}=상한>',
  buttons: ['+1', '+5', '<확정: 최대>'],
  toast: { ok: '<확정, {0}=아이콘+이름 {1}=개수>', cap: '<확정>', need: '<확정>', full: '<확정>',
           season: '<확정>', offline: '<확정>', upstream: '<확정>', auth: '<확정>' },
  nextTier: '<확정, {0}=등급 아이콘 {1}=남은 수>',
};
const fill = (s, ...a) => a.reduce((acc, v, i) => acc.replaceAll(`{${i}}`, String(v)), s);
export function toastText(key, item, n) {
  const it = PLAZA_ITEMS[item];
  return fill(PLAZA_COPY.toast[key] || PLAZA_COPY.toast.offline, it ? `${it.ico} ${it.name}` : '', n);
}
```

`<확정…>` 자리는 이 스텝에서 **전부** 실제 문구로 채운다(커밋 전 `grep -n "<확정" js/plaza/copy.js` 결과 0줄). doors.js 프롬프트 3개도 확정 문구로 바꾸고, i18n-en.js 의 Task 5 임시 키를 교체한다. 문구에 `{0}` 조합이 있으면 i18n 은 `'{0}' 패턴 키`로 등록한다(메모리 i18n-architecture: 글루·`{0#}` 함정).

- [ ] **Step 2: 실패하는 결과 해석 테스트**

```js
// tests/plaza-donate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretDonate } from '../js/plaza/donate.js';

test('성공: 받은 만큼만 차감하고 🍂 도 받은 만큼, 상한 컷은 reason cap', () => {
  const r = interpretDonate(10, { ok: true, accepted: 4, today_left: 0, my_total: 34, tier: 'bronze', stage: 1, item_have: 120, item_need: 200 });
  assert.equal(r.event, 'plaza_donate'); assert.equal(r.spend, 4); assert.equal(r.leaf, 4);
  assert.equal(r.params.requested, 10); assert.equal(r.params.accepted, 4); assert.equal(r.params.reason, 'cap');
});

test('필요량 컷은 reason need', () => {
  const r = interpretDonate(10, { ok: true, accepted: 3, today_left: 20, my_total: 3, tier: null, stage: 2, item_have: 400, item_need: 400 });
  assert.equal(r.params.reason, 'need'); assert.equal(r.spend, 3);
});

test('전량 수락은 ok', () => {
  assert.equal(interpretDonate(5, { ok: true, accepted: 5, today_left: 25, my_total: 5, stage: 1, item_have: 5, item_need: 300 }).params.reason, 'ok');
});

test('규칙 거절(cap·need·full)은 plaza_donate 로, 차감 0', () => {
  for (const reason of ['cap', 'need', 'full']) {
    const r = interpretDonate(5, { ok: false, reason });
    assert.equal(r.event, 'plaza_donate'); assert.equal(r.spend, 0); assert.equal(r.leaf, 0);
    assert.equal(r.params.accepted, 0); assert.equal(r.params.reason, reason);
  }
});

test('통신·권한·기간 실패는 plaza_donate_fail, 차감 0', () => {
  for (const reason of ['offline', 'upstream', 'auth', 'season', 'qty']) {
    const r = interpretDonate(5, { ok: false, reason });
    assert.equal(r.event, 'plaza_donate_fail'); assert.equal(r.spend, 0); assert.equal(r.params.reason, reason);
  }
  assert.equal(interpretDonate(5, null).params.reason, 'offline');
});
```

- [ ] **Step 3: 실행 — 실패 확인**

Run: `node --test tests/plaza-donate.test.mjs`
Expected: FAIL `Cannot find module '../js/plaza/donate.js'`

- [ ] **Step 4: 결과 해석 구현**

```js
// js/plaza/donate.js
// 🌾 plaza_donate 응답 → 차감량·🍂·트래킹 이벤트. 순수 함수(tests/plaza-donate.test.mjs)
const RULE_REJECT = new Set(['cap', 'need', 'full']);

export function interpretDonate(requested, r) {
  if (!r || typeof r !== 'object') r = { ok: false, reason: 'offline' };
  if (r.ok) {
    const accepted = Math.max(0, r.accepted | 0);
    const reason = accepted >= requested ? 'ok' : (r.today_left | 0) === 0 ? 'cap' : 'need';
    return { event: 'plaza_donate', spend: accepted, leaf: accepted, toastKey: 'ok',
      params: { stage: r.stage, requested, accepted, reason, today_left: r.today_left, my_total: r.my_total } };
  }
  const reason = String(r.reason || 'offline');
  if (RULE_REJECT.has(reason)) {
    return { event: 'plaza_donate', spend: 0, leaf: 0, toastKey: reason,
      params: { stage: r.stage ?? null, requested, accepted: 0, reason, today_left: r.today_left ?? null, my_total: null } };
  }
  return { event: 'plaza_donate_fail', spend: 0, leaf: 0, toastKey: reason, params: { reason } };
}
```

- [ ] **Step 5: 실행 — 통과 확인**

Run: `node --test tests/plaza-donate.test.mjs`
Expected: PASS 5개

- [ ] **Step 6: 🎨 모달 시안 3개 — 디자인 게이트 C(필수, 여기서 멈춤)**

`js/plaza/ui.js` 를 `?plazaUi=a|b|c` 로 레이아웃 3안 전환 가능하게 만든다:
- a: 세로 목록(한 줄 = 아이콘·이름·진행 바·보유·버튼 3개), 기존 `#lb-modal .tut-card` 스타일
- b: 품목 카드 그리드(2열), 카드 안에 큰 진행 바 + 버튼
- c: 위에 단계 전체 진행 바 + 아래 간소화 목록(버튼 "+5"·"최대" 2개)

공통 규칙:
- 모달 루트 `<div id="plaza-modal">` → `index.html` `anyModalOpen()` 의 `[id$="-modal"].show` 에 자동 포함. 표시 `classList.add('show')`, 닫기 버튼 + 배경 클릭(`e.target === root`) 닫기.
- 열 때 `Input.setAnalog(0, 0)`(game.js export `Input`).
- CSS 는 `ui.js` 가 `<style id="plaza-style">` 로 1회 주입. 레이아웃은 `#lb-modal` 규칙(`position: fixed; inset: 0; z-index: 33; display: none; place-items: center; background: rgba(20,40,30,0.55)`, `.show{display:grid}`)을 따르고 카드 안쪽은 기존 `.tut-card` 클래스를 재사용.
- 모바일(메모리 mobile-hud-layout): 390px 폭에서 가로 스크롤 없음, 모달은 바닥 기준 높이 규칙(메모리 farm-expansion 모달 높이 규칙).
- 텍스트는 전부 `copy.js` 의 확정 문구(DOM 이라 i18n 옵저버가 번역).

localhost 에서만 `window.__plazaFake = (prog, mine) => {...}` 훅으로 가짜 진행률을 주입해 `?plaza=2&plazaUi=X` 3안을 PC·모바일로 캡처, 나란히 보여 준다. 사용자가 고를 때까지 멈춘다.

- [ ] **Step 7: 확정 시안으로 ui.js 완성**

선택된 레이아웃만 남기고 `?plazaUi` 삭제. `renderPlazaModal(ctx)` 의 `box` 화면: `currentItems(ctx.prog)` 를 그리고, 각 버튼 활성 = `donateMax(ctx.inv[item] || 0, ctx.mine?.today_left ?? 0, need - have) >= 필요 수량`('최대'는 ≥1), `ctx.busy` 면 전부 비활성(중복 요청 방지). 등급 안내는 `nextTier(ctx.mine?.my_total || 0)`. `stall`·`plaque` 화면은 Task 9 에서 채우고 여기선 `kind` 분기만 둔다.

- [ ] **Step 8: 기부 흐름 연결(index.js)**

먼저 인벤토리 수정 패턴 확인: `grep -rn "= gameState.inventory;" js | head` — 다른 모듈이 `inventory` 객체를 캐시한다면 새 객체로 갈아끼우지 않고 기존 코드처럼 필드 대입을 쓴다. 아래는 필드 대입 버전(기존 `placeOutdoor` 의 `gameState.inventory[k] -= def.cost[k]` 와 같은 패턴):

```js
import { donate, mine as fetchMine } from './net.js';
import { interpretDonate } from './donate.js';
import { toastText } from './copy.js';
import { openPlazaModal, renderPlazaModal } from './ui.js';
import { giveReward, refreshInventoryUI, requestSave } from '../game.js';
import { trackEvent } from '../analytics.js';

let mineNow = null, busy = false, modalKind = null;

const ctx = () => ({ kind: modalKind, prog: lastProg, mine: mineNow, inv: gameState.inventory, busy,
                     onDonate, onBuy, onClaim });

async function onDonate(item, qty) {
  if (busy || qty <= 0) return;
  busy = true; renderPlazaModal(ctx());
  try {
    const r = interpretDonate(qty, await donate(SEASON, item, qty));
    trackEvent(r.event, { season: SEASON, item, ...r.params });
    if (r.spend > 0) {
      gameState.inventory[item] = Math.max(0, (gameState.inventory[item] || 0) - r.spend);
      giveReward({ leaf: r.leaf }, 'plaza_donate', item);   // 🍂 — 코인이 아니라 econ 원장엔 안 남는다
      mineNow = { ...mineNow, my_total: r.params.my_total, today_left: r.params.today_left };
      refreshInventoryUI(); requestSave();
      await refresh(true);                                  // 단계 넘김 반영(캐시 우회)
    } else if (r.params.today_left === 0) {
      mineNow = { ...mineNow, today_left: 0 };
    }
    ui.toast?.(toastText(r.toastKey, item, r.spend));
  } finally {
    busy = false;
    renderPlazaModal(ctx());
  }
}

export async function openPlaza() {
  modalKind = plazaSpotNow();
  if (!modalKind) return;
  if (modalKind === 'box' || modalKind === 'plaque') {
    const m = await fetchMine(SEASON);
    mineNow = m && m.ok ? m : null;
  }
  openPlazaModal(modalKind, ctx());
  if (modalKind === 'box') trackEvent('plaza_modal_open', { season: SEASON, stage: shownStage, today_left: mineNow?.today_left ?? null });
}
```

`onBuy`·`onClaim` 은 Task 9 에서 정의 — 이 태스크에서는 `const onBuy = () => {}; const onClaim = () => {};` 로 두고 Task 9 에서 교체한다. 기존 `openPlaza` 뼈대(토스트)를 이것으로 바꾼다. `mineNow` 가 null(비로그인·오프라인)이면 모달은 버튼 비활성 + `auth`/`offline` 안내를 보여 준다.

- [ ] **Step 9: 실제 흐름 확인(사용자 SQL 적용 후)**

시즌 전이라 서버는 `season` 으로 거절한다. 로컬 검증용으로 **사용자에게** 다음 SQL 실행을 요청한다:

```sql
insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap)
values ('dev-plaza', now() - interval '1 hour', now() + interval '2 day', 30);
insert into public.plaza_needs (season, stage, item, need)
select 'dev-plaza', stage, item, need from public.plaza_needs where season = 'harvest-2026';
```

로컬에서 `?plazaSeason=dev-plaza`(Task 5 의 `SEASON`, localhost 한정)로 접속한다. 흐름 확인: 기부 → 인벤토리 차감 = accepted → 🍂 증가 → 바 이동 → 새로고침 후 유지. 네트워크 끊고 기부 → 인벤토리 무변경 + offline 토스트. 30개 넘기면 cap 토스트. 확인 뒤 정리 SQL 을 사용자에게 전달:

```sql
delete from public.plaza_donations where season = 'dev-plaza';
delete from public.plaza_seasons where season = 'dev-plaza';
```

- [ ] **Step 10: i18n + 테스트 + Commit**

확정 문구 전부 `js/i18n-en.js` 에 추가 → `node scripts/i18n_check.mjs` → `npm test`.

```bash
git add js/plaza js/spaces/doors.js js/i18n-en.js tests/plaza-donate.test.mjs
git commit -m "feat: 🌾 광장 기부 모달 — 받은 만큼만 차감·🍂 지급·실패 시 인벤토리 무변경

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 🎨 좌판·장식 4종·명판·등급 보상·🍂 환전 — 디자인 게이트 D

**Files:**
- Create: `js/plaza/decor.js`, `js/plaza/rewards.js`
- Modify: `js/data/catalog.js`(OUTDOOR), `js/data/dex.js`(BADGES), `js/game.js`(`outdoorMesh` 분기 1줄 + import 에 이름 추가), `index.html`(`renderOutdoor` 필터 1줄), `js/plaza/ui.js`, `js/plaza/index.js`, `js/plaza/copy.js`, `js/i18n-en.js`
- Test: `tests/plaza-rewards.test.mjs`

**Interfaces:**
- Consumes: `leafToCoins`(Task 2), `awardBadge`, `giveReward`, `gameState`, `requestSave`, `refreshInventoryUI`(game.js)
- Produces:
  - `decor.js`: `plazaDecorMesh(id) → THREE.Group|null` — `haybale|pumpkins|pumpkinlamp|harvestscarecrow`, 그 외 null
  - `rewards.js`: `claimPlan(st, season, tier) → { badge, decor:[id], already, none }`, `convertPlan(st, season, leaf, phase) → { coins, already }`, `buyPlan(inv, id) → { ok, price, reason? }`

- [ ] **Step 1: 실패하는 보상 규칙 테스트**

```js
// tests/plaza-rewards.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claimPlan, convertPlan, buyPlan } from '../js/plaza/rewards.js';
import { plazaDefault } from '../js/plaza/rules.js';

const S = 'harvest-2026';

test('claimPlan: 등급별 누적 보상, 한 번만', () => {
  assert.deepEqual(claimPlan(plazaDefault(), S, null), { badge: null, decor: [], already: false, none: true });
  assert.deepEqual(claimPlan(plazaDefault(), S, 'bronze'), { badge: 'harvest_helper', decor: [], already: false, none: false });
  assert.deepEqual(claimPlan(plazaDefault(), S, 'silver').decor, ['pumpkinlamp']);
  assert.deepEqual(claimPlan(plazaDefault(), S, 'gold').decor, ['pumpkinlamp', 'harvestscarecrow']);
  assert.equal(claimPlan(plazaDefault(), S, 'gold').badge, 'harvest_helper');
  assert.equal(claimPlan({ ...plazaDefault(), claimed: { [S]: 'gold' } }, S, 'gold').already, true);
});

test('convertPlan: 시즌 끝난 뒤 1회, 🍂1 = 🪙2', () => {
  assert.deepEqual(convertPlan(plazaDefault(), S, 12, 'active'), { coins: 0, already: false });
  assert.deepEqual(convertPlan(plazaDefault(), S, 12, 'after'), { coins: 24, already: false });
  assert.deepEqual(convertPlan({ ...plazaDefault(), converted: { [S]: true } }, S, 12, 'after'), { coins: 0, already: true });
  assert.deepEqual(convertPlan(plazaDefault(), S, 0, 'after'), { coins: 0, already: false });
});

test('buyPlan: 좌판 품목만, 🍂 부족 거절', () => {
  assert.deepEqual(buyPlan({ leaf: 50 }, 'haybale'), { ok: true, price: 40 });
  assert.deepEqual(buyPlan({ leaf: 50 }, 'pumpkins'), { ok: false, price: 60, reason: 'leaf' });
  assert.deepEqual(buyPlan({ leaf: 999 }, 'pumpkinlamp'), { ok: false, price: 0, reason: 'item' });
});
```

- [ ] **Step 2: 실행 — 실패 확인**

Run: `node --test tests/plaza-rewards.test.mjs`
Expected: FAIL `Cannot find module '../js/plaza/rewards.js'`

- [ ] **Step 3: 보상 규칙 구현**

```js
// js/plaza/rewards.js
// 🌾 좌판 구매·완공 등급 보상·🍂 환전 — 순수 계산(tests/plaza-rewards.test.mjs)
import { PLAZA_STALL, PLAZA_TIER_REWARD } from '../data/plaza.js';
import { leafToCoins } from './rules.js';

const LADDER = ['bronze', 'silver', 'gold'];

export function claimPlan(st, season, tier) {
  const already = !!st.claimed?.[season];
  if (!tier) return { badge: null, decor: [], already, none: true };
  const upto = LADDER.slice(0, LADDER.indexOf(tier) + 1);
  const badge = upto.map(t => PLAZA_TIER_REWARD[t].badge).find(Boolean) || null;
  const decor = upto.map(t => PLAZA_TIER_REWARD[t].decor).filter(Boolean);
  return { badge, decor, already, none: false };
}

export function convertPlan(st, season, leaf, phase) {
  const already = !!st.converted?.[season];
  if (already || phase !== 'after') return { coins: 0, already };
  return { coins: leafToCoins(leaf), already: false };
}

export function buyPlan(inv, id) {
  const item = PLAZA_STALL.find(s => s.id === id);
  if (!item) return { ok: false, price: 0, reason: 'item' };
  if ((inv.leaf || 0) < item.price) return { ok: false, price: item.price, reason: 'leaf' };
  return { ok: true, price: item.price };
}
```

- [ ] **Step 4: 실행 — 통과 확인**

Run: `node --test tests/plaza-rewards.test.mjs`
Expected: PASS 3개

- [ ] **Step 5: 카탈로그·배지·필터 등록**

`js/data/catalog.js` `OUTDOOR` 배열의 `...FARM_BUILDINGS` 앞에:

```js
  // 🌾 수확제 광장(2026 가을) — 작업대 목록에선 숨기고 🧺 보관함으로만 꺼낸다. 좌판 구매·완공 보상이 보관함에 넣어 준다
  //    cost 는 표시용이 아니라 "직접 구매 불가" 표시 — hidden 이라 작업대에서 살 수 없다(보관분만 꺼냄)
  { id: 'haybale',          name: '볏단',          ico: '🌾', cost: { leaf: 40 }, desc: '수확제 좌판에서 산 볏단', hidden: true },
  { id: 'pumpkins',         name: '호박 더미',      ico: '🎃', cost: { leaf: 60 }, desc: '수확제 좌판에서 산 호박 더미', hidden: true },
  { id: 'pumpkinlamp',      name: '호박 등불',      ico: '🏮', cost: { leaf: 9999 }, desc: '수확제 광장 🥈 보상 — 밤에 은은히', hidden: true },
  { id: 'harvestscarecrow', name: '수확제 허수아비', ico: '🧑‍🌾', cost: { leaf: 9999 }, desc: '수확제 광장 🥇 보상', hidden: true },
```

(장식 이름·설명은 Task 8 문구 게이트 방식으로 사용자 확인 — 여기 적힌 건 후보)

`js/data/dex.js` `BADGES` 에:
```js
  { id: 'harvest_helper', name: '수확제 일꾼', ico: '🌾', desc: '수확제 광장에 10개 이상 보태기', reward: { coins: 20 } },
```

`index.html` `renderOutdoor()` 의 `if (o.farm && !atFarm) return;` 뒤 1줄:
```js
        if (o.hidden && !((Input.getOutdoorStored?.() || {})[o.id] > 0)) return;   // 🌾 좌판·보상 장식은 보관분이 있을 때만
```

`js/game.js`:
- import 줄(Task 5 의 plaza import)에 `plazaDecorMesh` 추가, `js/plaza/index.js` 에 `export { plazaDecorMesh } from './decor.js';`
- `function outdoorMesh(id) {`(:4600) 다음 줄:
```js
  { const m = plazaDecorMesh(id); if (m) return m; }   // 🌾 광장 장식 4종(js/plaza/decor.js)
```

`restorePlaza` 가 아닌 기존 `applySave` 의 `outdoorStored` 복원(:2458-2460)은 `OUTDOOR.some(d => d.id === k)` 로 거르므로 4종이 OUTDOOR 에 있으면 자동 복원된다 — 확인만.

- [ ] **Step 6: 🎨 장식 4종 시안 — 디자인 게이트 D(필수, 여기서 멈춤)**

`decor.js` 에 모델마다 **3시안**을 `?plazaDecor=a|b|c` 로 전환 가능하게 만든다. 규칙:
- 재질 병합(모델당 ≤ 3콜), `clayMat` + `mergeGeos` 로 재질 키별 병합(Task 6 방식), 등불은 `houseWindows` 로 밤 발광(Task 6 Step 1 에서 확인한 모양)
- 메모리 visitor-art-lessons: 부속을 꽂지 말고 형태로 승격, 통과한 수치 재사용, 촘촘한 반복 금지
- 메모리 lowpoly-surface-pitfalls: 면 겹침 줄무늬·작은 소품 그림자 지글거림(작은 부품 `castShadow=false`)
- 크기 기준: 기존 `scarecrow`·`postlamp`(`outdoorMesh` 안 같은 id 분기)의 높이·폭을 재서 비슷하게

localhost `window.__select(id)`(game.js:2236)로 배치 모드에 들어가 광장 앞에 4종 × 3시안을 놓고 낮·밤 × PC·모바일로 캡처해 나란히 보여 준다. 사용자가 모델마다 고를 때까지 멈춘다. 확정 후 `?plazaDecor` 삭제.

- [ ] **Step 7: 좌판·명판·환전 연결**

`js/plaza/copy.js` 에 좌판·명판·환전 문구를 Task 8 Step 1 방식(후보 → 사용자 선택)으로 추가한 뒤, `js/plaza/index.js`:

```js
import { buyPlan, claimPlan, convertPlan } from './rewards.js';
import { awardBadge } from '../game.js';

function addStored(id) {
  const stored = gameState.outdoorStored || {};
  gameState.outdoorStored = { ...stored, [id]: (stored[id] || 0) + 1 };
}

function onBuy(id) {
  const plan = buyPlan(gameState.inventory, id);
  if (!plan.ok) { ui.toast?.(PLAZA_COPY.stall[plan.reason]); return; }
  gameState.inventory.leaf -= plan.price;
  addStored(id);
  refreshInventoryUI(); requestSave();
  trackEvent('plaza_stall_buy', { season: SEASON, item: id, price: plan.price, leaf_left: gameState.inventory.leaf });
  ui.toast?.(PLAZA_COPY.stall.bought);
  renderPlazaModal(ctx());
}

function onClaim() {
  const tier = mineNow?.tier || null;
  const plan = claimPlan(gameState.plaza, SEASON, tier);
  if (plan.already || plan.none) return;
  if (plan.badge) awardBadge(plan.badge);
  for (const id of plan.decor) addStored(id);
  gameState.plaza = { ...gameState.plaza, claimed: { ...gameState.plaza.claimed, [SEASON]: tier } };
  requestSave();
  trackEvent('plaza_reward_claim', { season: SEASON, tier, my_total: mineNow?.my_total ?? null });
  ui.toast?.(PLAZA_COPY.plaque.claimed);
  renderPlazaModal(ctx());
}

function maybeConvert() {
  const leaves = gameState.inventory.leaf || 0;
  const plan = convertPlan(gameState.plaza, SEASON, leaves, phaseNow());
  if (plan.already || phaseNow() !== 'after') return;
  gameState.plaza = { ...gameState.plaza, converted: { ...gameState.plaza.converted, [SEASON]: true } };
  if (plan.coins > 0) {
    gameState.inventory.leaf = 0;
    giveReward({ coins: plan.coins }, 'plaza_leaf', 'leaf');   // 코인 → econ_logs source plaza_leaf 자동 기록
    trackEvent('plaza_leaf_convert', { season: SEASON, leaves, coins: plan.coins });
    ui.toast?.(PLAZA_COPY.convert.done.replace('{0}', leaves).replace('{1}', plan.coins));
  }
  requestSave();
}
```

Task 8 의 임시 `onBuy`·`onClaim` 을 지우고, `refresh()` 끝(단계 적용 뒤)과 `initPlaza()` 끝에 `maybeConvert();` 를 부른다(`DEBUG_STAGE !== null` 이면 부르지 않는다 — 검수 중 🍂 증발 방지). `ui.js` 의 `stall` 화면: `PLAZA_STALL` 2품목(아이콘·이름은 `OUTDOOR` 에서 id 로 조회), 가격·보유 🍂, 구매 버튼(`buyPlan` 으로 활성 판정). `plaque` 화면: `ctx.prog?.names` 목록(스크롤 가능, 최대 500), 내 등급, "보상 받기"(`claimPlan` 으로 활성 판정 — `already` 면 "받았어요", `none` 이면 "10개 이상 보탠 분께 드려요" 같은 확정 문구).

- [ ] **Step 8: 확인 + Commit**

로컬: `?plaza=3` 좌판 구매 → 보관함 → 작업대 장식 탭에서 꺼내 놓기. `?plaza=4` 명판 → 보상 받기(`__plazaFake` 로 gold) → 재시도 비활성 → 새로고침 후 유지. 작업대 장식 목록에 보관분 없는 4종이 **안 보이는지**. `npm test && node scripts/i18n_check.mjs && node --test tests/plaza-wiring.test.mjs`(plaza 줄 ≤ 14).

```bash
git add js/plaza js/data/catalog.js js/data/dex.js js/game.js index.html js/i18n-en.js tests/plaza-rewards.test.mjs
git commit -m "feat: 🌾 수확제 좌판·장식 4종·명판 등급 보상·🍂 환전 — 🧺 보관함으로 지급

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 🦉 광장 초대 — 올빼미 착지 훅 일반화

**Files:**
- Modify: `js/spaces/npc.js`(착지 블록 :443-448, `deliverOwlSpecial` :474-492 뒤)
- Create: `js/plaza/invite.js`
- Modify: `js/plaza/index.js`(`updatePlaza` 에서 호출), `js/plaza/copy.js`, `js/i18n-en.js`
- Test: `tests/plaza-invite.test.mjs`

**Interfaces:**
- Consumes: `owlLandingSpot`, `startOwlFlight`, `deliverOwlSpecial`(npc.js 같은 파일), `onTrack`(`js/analytics.js:79`), `mode`, `ui`, `player`, `dist2D`, `giveReward`, `requestSave`(game.js)
- Produces:
  - `npc.js`: `onOwlLand(kind, fn)`, `sendOwlToPlayer(kind) → bool` — 기존 특별 의뢰 경로(`startOwlFlight(..., true)`)는 `'special'` 로 그대로 동작
  - `invite.js`: `inviteDue({ phase, invited, season, tutorialBusy, villageSec, modal }) → bool`(순수), `updateInvite(dt, inVillage, phase)`

- [ ] **Step 1: 📝 문구 게이트(필수, 여기서 멈춤)** — 올빼미 대사(착지 토스트)·도착 토스트 한국어 후보 2~3개씩 → 사용자 선택 → `PLAZA_COPY.invite = { land, arrive }` 로 `copy.js` 에 추가.

- [ ] **Step 2: 실패하는 테스트**

```js
// tests/plaza-invite.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const base = { phase: 'active', invited: '', season: 'harvest-2026', tutorialBusy: false, villageSec: 25, modal: false };
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('inviteDue: 시즌 중·아직 안 받음·마을 20초·튜토리얼/모달 아님', async () => {
  const { inviteDue } = await import('../js/plaza/invite-rule.js');
  assert.equal(inviteDue(base), true);
  assert.equal(inviteDue({ ...base, phase: 'before' }), false);
  assert.equal(inviteDue({ ...base, phase: 'after' }), false);
  assert.equal(inviteDue({ ...base, invited: 'harvest-2026' }), false);
  assert.equal(inviteDue({ ...base, villageSec: 19 }), false);
  assert.equal(inviteDue({ ...base, tutorialBusy: true }), false);
  assert.equal(inviteDue({ ...base, modal: true }), false);
});

test('올빼미 착지 훅: 특별 의뢰 경로는 그대로, 광장은 별도 칸', () => {
  const npc = src('js/spaces/npc.js');
  assert.ok(/export function onOwlLand\(/.test(npc));
  assert.ok(/export function sendOwlToPlayer\(/.test(npc));
  assert.ok(/special:\s*\(o\)\s*=>\s*deliverOwlSpecial\(o\)/.test(npc), '특별 의뢰 착지가 훅 표에 없다');
  assert.ok(/f\.deliver === true \? 'special'/.test(npc), '예전 호출(true)이 특별 의뢰로 매핑돼야 한다');
  assert.ok(!/plaza/i.test(npc), 'npc.js 는 광장을 몰라야 한다 — 훅 등록은 js/plaza/invite.js');
});

test('초대 문구가 확정됐다', () => {
  assert.ok(!src('js/plaza/copy.js').includes('<확정'), 'copy.js 에 미확정 문구가 남았다');
});
```

(`inviteDue` 는 `js/plaza/invite-rule.js` 에 둔다 — `invite.js` 는 game.js·npc.js 를 import 해 node 에서 못 불러온다)

- [ ] **Step 3: 실행 — 실패 확인**

Run: `node --test tests/plaza-invite.test.mjs`
Expected: FAIL

- [ ] **Step 4: npc.js 착지 훅 일반화(최소 변경)**

`updateOwlFly` 착지 블록(:443-448)을:

```js
      if (f.deliver) {
        const kind = f.deliver === true ? 'special' : f.deliver;   // true = 예전 호출(특별 의뢰)
        f.deliver = false;
        o.home.set(g.position.x, 0, g.position.z);   // 내려앉은 곳이 새 홈 — 맵 반대편에서 0.5u/s 로 걸어 돌아오지 않게
        owlLandHooks[kind]?.(o);
      }
```

`deliverOwlSpecial` 함수 정의 뒤에:

```js
// 🦉 착지 훅 — 무엇을 물고 왔는지(kind)별 처리. 특별 의뢰가 기본이고, 다른 기능은 onOwlLand 로 등록한다.
//    등록하는 쪽이 자기 상태 칸을 쓴다(st.special 은 특별 의뢰 전용 — 같은 날 서로 막지 않게)
const owlLandHooks = { special: (o) => deliverOwlSpecial(o) };
export function onOwlLand(kind, fn) { owlLandHooks[kind] = fn; }

// 올빼미를 플레이어 앞으로 날려 보낸다. 이미 날고 있거나 착지 자리가 없으면 false(다음 틱에 다시)
export function sendOwlToPlayer(kind) {
  const o = npcObjs.find(n => n.def.daily); if (!o || !o.fly) return false;
  if (o.fly.st !== 'perch' || o.fly.deliver) return false;
  if (dist2D(o.group.position, player.position) < 2.2) { owlLandHooks[kind]?.(o); return true; }
  const spot = owlLandingSpot(o, player.position.x, player.position.z, 1.6, 2.4);
  if (!spot) return false;
  startOwlFlight(o, spot.x, spot.z, kind);
  return true;
}
```

`owlLandHooks` 가 착지 블록보다 뒤에 선언돼도 함수 실행 시점(부팅 후)에는 초기화돼 있다 — 단 `const` TDZ 가 걱정되면 선언을 파일 상단(`owlVisitCooldown` 선언 근처)으로 올린다. `npcObjs`·`dist2D`·`player` 는 `updateOwlVisit` 이 이미 쓰는 이름이라 같은 스코프에 있다.

- [ ] **Step 5: 초대 구현**

```js
// js/plaza/invite-rule.js
// 🦉 광장 초대 판정 — 순수(tests/plaza-invite.test.mjs)
export function inviteDue({ phase, invited, season, tutorialBusy, villageSec, modal }) {
  return phase === 'active' && invited !== season && !tutorialBusy && !modal && villageSec >= 20;
}
```

```js
// js/plaza/invite.js
// =============================================================
//  🦉 광장 초대 — 시즌마다 1번, 마을에 20초 머무르면 올빼미가 날아와 알려 준다.
//  광장 반경에 도착하면 🍂5 + 🪙10. 퀘스트 목록에 끼우지 않는다(일일 의뢰 개수 검증·재추첨 사고 회피).
// =============================================================
import { gameState, player, dist2D, ui, mode, giveReward, requestSave } from '../game.js';
import { onOwlLand, sendOwlToPlayer } from '../spaces/npc.js';
import { onTrack, trackEvent } from '../analytics.js';
import { PLAZA, PLAZA_R } from '../data/places.js';
import { PLAZA_INVITE_REWARD } from '../data/plaza.js';
import { PLAZA_COPY } from './copy.js';
import { inviteDue } from './invite-rule.js';

let season = '', tutorialBusy = false, villageSec = 0, cooldown = 0;
const questId = () => `courier:plaza:${season}`;

onTrack((name) => {                                   // 이번 세션에 튜토리얼이 시작됐으면 끝날 때까지 기다린다
  if (name === 'tutorial_start') tutorialBusy = true;
  if (name === 'tutorial_complete' || name === 'tutorial_skip') tutorialBusy = false;
});

onOwlLand('plaza', () => {
  gameState.plaza = { ...gameState.plaza, invited: season };
  ui.toast?.(PLAZA_COPY.invite.land, 4200);
  trackEvent('plaza_invite_deliver', { season, quest_id: questId() });
  requestSave();
});

function checkArrive() {
  const p = gameState.plaza;
  if (p.invited !== season || p.seen.arrived) return;
  if (dist2D(PLAZA, player.position) > PLAZA_R + 1) return;
  gameState.plaza = { ...p, seen: { ...p.seen, arrived: true } };
  giveReward(PLAZA_INVITE_REWARD, 'quest_reward', questId());
  ui.toast?.(PLAZA_COPY.invite.arrive, 3600);
  trackEvent('plaza_invite_arrive', { season, quest_id: questId() });
  requestSave();
}

export function updateInvite(dt, inVillage, phase, seasonId) {
  season = seasonId;
  villageSec = inVillage && mode === 'play' ? villageSec + dt : 0;
  cooldown -= dt; if (cooldown > 0) return;
  cooldown = 0.5;
  if (inviteDue({ phase, invited: gameState.plaza.invited, season, tutorialBusy, villageSec, modal: !!ui.anyModalOpen?.() })) {
    sendOwlToPlayer('plaza');
  }
  if (inVillage) checkArrive();
}
```

`seen.arrived` 는 시즌마다 초기화가 필요하다 — 다음 시즌 대비로 `arrived` 대신 `seen['arrived:' + season]` 키를 쓰고, 위 코드의 `p.seen.arrived` 두 곳을 `p.seen[`arrived:${season}`]` 로 바꾼다(`restorePlaza` 는 `true` 값 키를 그대로 보존한다).

`js/plaza/index.js` `updatePlaza` 첫 줄(스로틀 전)에:
```js
  updateInvite(dt, inVillage, phaseNow(), SEASON);
```
(`import { updateInvite } from './invite.js';`, `DEBUG_STAGE !== null` 이어도 초대는 돈다 — `?plaza=1` 로 검수 가능)

- [ ] **Step 6: 실행 + 로컬 확인**

Run: `node --test tests/plaza-invite.test.mjs && npm test`
로컬: `?plaza=1` 로 마을에 20초 → 올빼미 날아와 착지 → 토스트 → 돌길 따라 광장 도착 → 🍂5 🪙10. 새로고침 후 다시 안 옴. `?owl=1`(특별 의뢰 강제)과 `?plaza=1` 을 같이 켜서 **특별 의뢰도 그대로 오는지**(두 칸 독립). 새 캐릭터(세이브 초기화)로 튜토리얼 중에는 안 오는지.

- [ ] **Step 7: Commit**

```bash
git add js/spaces/npc.js js/plaza tests/plaza-invite.test.mjs js/i18n-en.js
git commit -m "feat: 🦉 광장 초대 — 올빼미 착지 훅 일반화, 특별 의뢰 칸과 분리

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 트래킹 문서화 + 이벤트 가드

**Files:**
- Modify: `docs/analysis/GA4_GUIDE.md`(이벤트 표 ~:60-80, 변경 이력 §6 :190)
- Modify: `js/plaza/index.js`(`plaza_view`·`plaza_stage_seen`)
- Test: `tests/plaza-tracking.test.mjs`

**Interfaces:**
- Produces: 이벤트 10종 `plaza_view`, `plaza_modal_open`, `plaza_donate`, `plaza_donate_fail`, `plaza_stage_seen`, `plaza_stall_buy`, `plaza_reward_claim`, `plaza_leaf_convert`, `plaza_invite_deliver`, `plaza_invite_arrive`

- [ ] **Step 1: 발견·진행 이벤트 추가(index.js)**

```js
const viewedStages = new Set();          // 세션·단계당 1회
let lastPathAt = -1e9;                    // 돌길 위를 마지막으로 밟은 시각
const OPENS_MS = Date.parse(`${PLAZA_OPENS_KST}T00:00:00+09:00`);

function trackView() {
  if (shownStage <= 0 || viewedStages.has(shownStage)) return;
  if (dist2D(PLAZA, player.position) > 12) return;
  viewedStages.add(shownStage);
  const items = currentItems(lastProg);
  const have = items.reduce((s, i) => s + i.have, 0), need = items.reduce((s, i) => s + i.need, 0);
  const invitedNow = gameState.plaza.invited === SEASON && !gameState.plaza.seen[`arrived:${SEASON}`];
  const from = invitedNow ? 'quest' : performance.now() - lastPathAt < 30_000 ? 'path' : 'other';
  trackEvent('plaza_view', { season: SEASON, stage: shownStage, pct: need ? Math.round(have / need * 100) : 100, from });
}
```

`updatePlaza` 에서 1초 스로틀 안쪽에 `if (plazaBlocks(player.position.x, player.position.z, -PLAZA_R) ) lastPathAt = performance.now();`(돌길 판정만 쓰려고 광장 반경을 0 으로 만드는 pad) 와 `trackView();` 를 부른다. `applyStage(stage)` 에서 새 단계면:

```js
  if (stage > 0 && !gameState.plaza.seen[`stage${stage}:${SEASON}`] && DEBUG_STAGE === null) {
    gameState.plaza = { ...gameState.plaza, seen: { ...gameState.plaza.seen, [`stage${stage}:${SEASON}`]: true } };
    trackEvent('plaza_stage_seen', { season: SEASON, stage, day_n: Math.floor((Date.now() - OPENS_MS) / 86_400_000) + 1 });
  }
```

지도 경유(`from:'map'`)는 index.html 의 전체 지도 열기에 이벤트가 있을 때만 붙인다 — 없으면 `'other'` 로 둔다(스펙 §6 의 `map` 값은 이 계획에서 구현하지 않음, GA4_GUIDE 에 명시).

- [ ] **Step 2: 가드 테스트**

```js
// tests/plaza-tracking.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const EVENTS = ['plaza_view', 'plaza_modal_open', 'plaza_donate', 'plaza_donate_fail', 'plaza_stage_seen',
  'plaza_stall_buy', 'plaza_reward_claim', 'plaza_leaf_convert', 'plaza_invite_deliver', 'plaza_invite_arrive'];
const dir = new URL('../js/plaza/', import.meta.url);
const plazaSrc = readdirSync(dir).filter(f => f.endsWith('.js')).map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
const doc = readFileSync(new URL('../docs/analysis/GA4_GUIDE.md', import.meta.url), 'utf8');

test('광장 이벤트 10종이 코드에서 나가고 GA4_GUIDE 에 적혀 있다', () => {
  for (const e of EVENTS) {
    assert.ok(plazaSrc.includes(`'${e}'`), `js/plaza/ 에서 ${e} 를 안 보낸다`);
    assert.ok(doc.includes(`\`${e}\``), `GA4_GUIDE.md 에 ${e} 가 없다`);
  }
});

test('광장 이벤트는 전부 plaza_ 접두사 — 기존 owl_·quest_ 시계열과 섞이지 않게', () => {
  const sent = [...plazaSrc.matchAll(/trackEvent\('([a-z_]+)'/g)].map(m => m[1]);
  assert.ok(sent.length >= 8);
  assert.deepEqual(sent.filter(n => !n.startsWith('plaza_')), []);
});

test('예약 트래픽 키(source 등)를 파라미터 이름으로 쓰지 않는다', () => {
  assert.ok(!/trackEvent\('plaza_[a-z_]+',\s*\{[^}]*\b(source|medium|campaign|term|content)\s*:/.test(plazaSrc));
});
```

(`trackEvent(r.event, ...)` 는 동적 이름이라 두 번째 테스트 정규식에 안 잡히지만, `donate.js` 가 `'plaza_donate'`·`'plaza_donate_fail'` 문자열을 가지고 있어 첫 테스트는 통과한다)

- [ ] **Step 3: GA4_GUIDE 표 추가**

이벤트 표 마지막 행 뒤에 10행:

```markdown
| `plaza_view` | 🌾 광장을 봄(세션·단계당 1회, 반경 12) | `season`, `stage`(1~4), `pct`(현재 단계 %), `from`(quest/path/other) |
| `plaza_modal_open` | 기부 모달 열기 | `season`, `stage`, `today_left` |
| `plaza_donate` | 기부 시도 결과(규칙 거절 포함) | `season`, `item`, `stage`, `requested`, `accepted`, `reason`(ok/cap/need/full), `today_left`, `my_total` |
| `plaza_donate_fail` | 기부 통신·권한·기간 실패(인벤토리 무변경) | `season`, `item`, `reason`(offline/upstream/auth/season/qty) |
| `plaza_stage_seen` | 새 단계를 처음 봄 | `season`, `stage`, `day_n`(시즌 N일차) |
| `plaza_stall_buy` | 수확제 좌판 구매(🍂) | `season`, `item`, `price`, `leaf_left` |
| `plaza_reward_claim` | 완공 등급 보상 수령 | `season`, `tier`(bronze/silver/gold), `my_total` |
| `plaza_leaf_convert` | 시즌 후 남은 🍂 → 🪙 환전 | `season`, `leaves`, `coins` |
| `plaza_invite_deliver` | 🦉 올빼미가 광장 초대를 전함(시즌당 1회) | `season`, `quest_id`(courier:plaza:<season>) |
| `plaza_invite_arrive` | 초대 받고 광장 도착 | `season`, `quest_id` |
```

변경 이력 §6 에:
`- 2026-09-27 🌾 수확제 광장 이벤트 10종. 정답은 서버 원장 plaza_donations(GA4 는 퍼널). 초대는 퀘스트 목록이 아닌 별도 칸이라 quest_accept/complete 대신 plaza_invite_*. plaza_view.from 의 map 값은 미구현(other 로 집계).`

- [ ] **Step 4: 실행 + Commit**

Run: `node --test tests/plaza-tracking.test.mjs && npm test`

```bash
git add js/plaza/index.js docs/analysis/GA4_GUIDE.md tests/plaza-tracking.test.mjs
git commit -m "feat: 📊 광장 트래킹 10종 — 발견·초대·기부·진행·소비·보상 전 구간

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 통합 검증 + 리뷰

**Files:** 없음(검증·리뷰 결과에 따른 수정만)

- [ ] **Step 1: 전체 테스트·구문·i18n·연결 예산**

Run: `npm test && for f in js/*.js js/plaza/*.js js/spaces/*.js js/data/*.js functions/api/*.js; do node --check "$f" || exit 1; done && node scripts/i18n_check.mjs && node --test tests/plaza-wiring.test.mjs && grep -c -i plaza js/game.js`
Expected: 전부 PASS, 마지막 숫자 ≤ 14

- [ ] **Step 2: 다른 공간 불변 확인**

main 을 다른 포트로(메모리 worktree-pitfalls: preview 는 루트를 띄운다 — 스모크 도구는 `python3 scripts/serve.py <포트>` 를 각 체크아웃 루트에서 직접 띄운다):
`node tools/refactor/smoke.mjs base-main 8791 9341` 두 번(`base-main`, `base-main2`), 이 브랜치로 `node tools/refactor/smoke.mjs plaza 8792 9342` → `node tools/refactor/smoke-diff.mjs base-main base-main2 plaza`. 시즌 전 날짜라 마을 지문 차이는 0 이어야 하고(광장 없음·산포 동일 규칙), 나머지 11공간 차이 0.

- [ ] **Step 3: 드로우콜 최종 표**

`?dbg=1&weather=clear&time=0.32&plaza=0..4` × 3회 `__perf().calls`(`__tp(23,1)`, 그리고 스폰 `__tp(0,0)`) 표를 `dev/active/harvest-plaza/harvest-plaza-context.md` 에 기록. 광장+돌길 증가분 ≤ 15.

- [ ] **Step 4: 최종 캡처 보드(사용자 검수)**

모바일 세로 390×844 + PC 1280×800: 시작 화면(깃대), 돌길 중간, 광장 단계 1~4(낮)·4(밤), 기부 모달, 좌판 모달, 명판 모달, 올빼미 착지. 한 장 보드로 보여 준다.

- [ ] **Step 5: 코드 리뷰(병렬)**

`everything-claude-code:code-reviewer`(전체 `git diff main...HEAD`), `database-reviewer`(`migrate_plaza.sql` — RLS·security definer·search_path·advisory lock·인덱스·jsonb_agg 비용), `security-reviewer`(RPC 권한·직접 insert 차단·명판 닉네임 노출 범위·`?plazaSeason` 가 localhost 한정인지) 를 병렬로. CRITICAL·HIGH 는 고치고 해당 리뷰어로 재확인.

- [ ] **Step 6: dev docs 갱신 + Commit**

`dev/active/harvest-plaza/*-tasks.md` 체크, context 의 Last Updated·드로우콜 표·남은 운영 작업(SQL 적용 여부, 배포 4곳, 공지)을 갱신.

```bash
git add dev/active/harvest-plaza
git commit -m "docs: 🌾 광장 구현 검증 기록 — 드로우콜·스모크·리뷰

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: 🧑 사용자 체크포인트 — 병합·배포 승인 요청**

배포는 이 계획 범위 밖이다. 승인되면 메모리 deploy-checklist 절차(푸시 전 키 스캔 → main 병합 → 웹 → 토스 `bundle_upload(memo)` → itch → 안드로이드 versionCode+1)를 따르고, **10/9 이전에 4곳 라이브**가 되도록 토스 검수 기간을 역산한다. 공지는 토스 출시 후 `notices_admin.html`.
