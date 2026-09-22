-- =============================================================
--  카드뉴스 소재 인박스 — 1단계 스키마
--  스펙: docs/superpowers/specs/2026-09-22-cardnews-inbox-design.md
--  ⚠️ bundles 를 먼저 만든다 — topics.bundle_id 가 참조한다.
-- =============================================================
create schema if not exists cardnews;

create table if not exists cardnews.bundles (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users default auth.uid(),
  title       text not null,
  memo        text not null default '',
  status      text not null default 'draft'
              check (status in ('draft','ready')),
  created_at  timestamptz not null default now()
);

create table if not exists cardnews.topics (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users default auth.uid(),
  collected_on  date not null,
  source        text not null
                check (source in ('jobplanet','blind','dc','mlb','news')),
  category      text,
  title         text not null,
  excerpt       text not null default '',
  url           text,
  bundle_id     uuid references cardnews.bundles on delete set null,
  dismissed     boolean not null default false,
  created_at    timestamptz not null default now(),
  -- ⚠️ 크론이 부팅·로그인마다 깨어난다. 이 제약이 upsert 의 충돌 대상이다.
  unique (owner, collected_on, source, title)
);

create index if not exists topics_owner_day on cardnews.topics (owner, collected_on);
create index if not exists topics_bundle    on cardnews.topics (bundle_id);

alter table cardnews.topics  enable row level security;
alter table cardnews.bundles enable row level security;

-- (select auth.uid()) — 서브쿼리로 감싸야 행마다 함수를 부르지 않는다
drop policy if exists topics_own on cardnews.topics;
create policy topics_own on cardnews.topics
  for all using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

drop policy if exists bundles_own on cardnews.bundles;
create policy bundles_own on cardnews.bundles
  for all using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- ⚠️ 새 스키마는 아래 두 가지를 **따로** 해 줘야 REST 로 닿는다. public 은 Supabase 가
--    미리 해 두기 때문에 잊기 쉽다 — 2026-09-22 배포 때 둘 다 걸렸다.
--    ① 대시보드 Integrations → Data API → Settings → Exposed schemas 에 cardnews 추가
--       (빠지면 PGRST106 "Invalid schema: cardnews")
--    ② 아래 grant (빠지면 42501 "permission denied for schema cardnews")
--    권한을 열어도 데이터는 RLS 가 막는다 — grant 는 "문을 연다", RLS 가 "누구 행인지" 를 본다.
grant usage on schema cardnews to anon, authenticated, service_role;
grant all on all tables in schema cardnews to anon, authenticated, service_role;
grant all on all sequences in schema cardnews to anon, authenticated, service_role;
-- 2단계에서 테이블이 늘어도 다시 grant 하지 않게 기본 권한을 걸어 둔다
alter default privileges in schema cardnews grant all on tables to anon, authenticated, service_role;
alter default privileges in schema cardnews grant all on sequences to anon, authenticated, service_role;
