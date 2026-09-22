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
