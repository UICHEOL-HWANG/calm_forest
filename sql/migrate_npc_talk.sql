-- =============================================================
--  💬 NPC 대화 — 대사 풀 · 날씨 첫인사 · 생성 실행 기록
--  ------------------------------------------------------------
--  ▶ 대사는 한 번 만들면 버리지 않고 쌓아 돌려 쓴다. 게임은 날짜를 시드로
--     풀에서 2세트를 결정적으로 뽑는다 → 매일 바뀌되 Gemini 를 안 부른다.
--  ▶ ⚠️ 쓰기는 service_role 만. cafe_guests 는 authenticated 쓰기를 열어 뒀지만
--     그건 분석용 기록이라 오염돼도 분석만 더러워진다. 이 테이블은 **게임 화면에
--     그대로 뜨는 콘텐츠**라, 공개 anon 키로 쓰기가 열리면 누구나 아무 문장이나
--     띄울 수 있다(전연령 등급 심사 리스크). 정책을 만들지 않아 RLS 가 전부 막고,
--     RLS 를 우회하는 service_role(워커 크론·시딩 스크립트)만 쓴다.
--  ▶ 읽기는 security definer rpc 로만 연다. 테이블 직접 select 는 아무에게도 안 연다.
--  적용: Supabase SQL Editor 에서 1회 실행.
-- =============================================================

-- ── 대화 본문 풀 ─────────────────────────────────────────────
--  turns: [{choices:[3], replies:[3]} × 3] — 3턴 수렴형.
--  턴마다 선택지 3개, 고른 것에 따라 응답이 갈리되 다음 턴은 공통으로 수렴한다
--  (분기를 살리면 3→9→27 로 터진다).
create table if not exists public.npc_dialogues (
  id           bigint generated always as identity primary key,
  npc_id       text not null,
  lang         text not null check (lang in ('ko','en')),
  turns        jsonb not null,
  created_date date not null default (now() at time zone 'Asia/Seoul')::date
);
create index if not exists idx_npc_dialogues_pool on public.npc_dialogues (npc_id, lang);

-- ── 날씨 첫인사 풀 ───────────────────────────────────────────
--  날짜가 들어가지 않는다 — "비 오는 날 농부의 첫마디"는 매일 새로 만들 이유가 없다.
--  1회 생성하고 영구 재사용. 본문 캐시 키에 weather 를 넣지 않아도 되는 이유가 이것.
create table if not exists public.npc_openers (
  id      bigint generated always as identity primary key,
  npc_id  text not null,
  lang    text not null check (lang in ('ko','en')),
  weather text not null check (weather in ('clear','rain','snow','fog')),
  line    text not null
);
create index if not exists idx_npc_openers_pick on public.npc_openers (npc_id, lang, weather);

-- ── 생성 실행 기록 ───────────────────────────────────────────
--  ⚠️ 성공도 기록한다. 실패만 남기면 "크론이 아예 안 떴다"를 못 잡는다
--     (트리거 미등록·배포 누락은 실패 로그조차 남기지 않는다).
--     마지막 성공 시각이 보여야 몇 주씩 조용히 죽어 있는 걸 알아챈다.
create table if not exists public.npc_gen_runs (
  id          bigint generated always as identity primary key,
  ran_at      timestamptz not null default now(),
  source      text not null check (source in ('cron','seed')),
  requested   int  not null,
  inserted    int  not null default 0,
  failed      int  not null default 0,
  error       text,
  duration_ms int
);
create index if not exists idx_npc_gen_runs_at on public.npc_gen_runs (ran_at desc);

alter table public.npc_dialogues enable row level security;
alter table public.npc_openers   enable row level security;
alter table public.npc_gen_runs  enable row level security;
-- 정책을 만들지 않는다 = anon·authenticated 는 읽기도 쓰기도 불가.
-- 읽기는 아래 rpc 로만, 쓰기는 service_role 로만.

-- ── 읽기 rpc ─────────────────────────────────────────────────
--  결정적 뽑기: md5(seed || id) 정렬. 같은 날짜 → 같은 세트라
--  엣지 캐시와 자동으로 일치하고, 날이 바뀌면 다른 세트가 나온다.
create or replace function public.npc_dialogue_pick(
  p_npc text, p_lang text, p_seed text, p_n int default 2)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'turns', turns)), '[]'::jsonb)
  from (
    select id, turns
    from public.npc_dialogues
    where npc_id = p_npc and lang = p_lang
    order by md5(p_seed || '/' || id::text)
    limit greatest(p_n, 0)
  ) x;
$$;

create or replace function public.npc_opener_pick(
  p_npc text, p_lang text, p_weather text, p_seed text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select line
  from public.npc_openers
  where npc_id = p_npc and lang = p_lang and weather = p_weather
  order by md5(p_seed || '/' || id::text)
  limit 1;
$$;

-- 풀 잔량 — 크론의 100세트 상한 판정과 운영 관제 페이지가 함께 쓴다.
create or replace function public.npc_pool_counts()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object('npc_id', npc_id, 'lang', lang, 'n', n)), '[]'::jsonb)
  from (select npc_id, lang, count(*)::int as n
        from public.npc_dialogues group by npc_id, lang) x;
$$;

revoke all on function public.npc_dialogue_pick(text, text, text, int) from public;
revoke all on function public.npc_opener_pick(text, text, text, text)  from public;
revoke all on function public.npc_pool_counts()                        from public;
grant execute on function public.npc_dialogue_pick(text, text, text, int) to anon, authenticated;
grant execute on function public.npc_opener_pick(text, text, text, text)  to anon, authenticated;
grant execute on function public.npc_pool_counts()                        to anon, authenticated;

comment on table public.npc_dialogues is
  'NPC 대화 본문 풀(evergreen). 날짜 시드로 매일 2세트를 뽑아 쓴다. 쓰기는 service_role 만.';
comment on table public.npc_openers is
  'NPC 날씨별 첫인사. 날짜 무관 — 1회 생성 후 영구 재사용.';
comment on table public.npc_gen_runs is
  '대사 생성 실행 기록(성공·실패 모두). 마지막 성공 시각으로 크론 생존을 판단한다.';

-- ── 운영 조회 예시 ───────────────────────────────────────────
-- 1) 크론이 살아 있나 — 마지막 성공이 언제였나
--   select ran_at, source, inserted, failed, error
--   from public.npc_gen_runs order by ran_at desc limit 10;
--
-- 2) 풀 잔량 (100세트 상한 대비)
--   select npc_id, lang, count(*) from public.npc_dialogues group by 1,2 order by 3;
