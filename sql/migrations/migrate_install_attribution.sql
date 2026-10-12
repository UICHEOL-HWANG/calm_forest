-- =============================================================
--  calm forest · 📲 안드로이드 설치 채널 귀속 (install_attribution)
--  ------------------------------------------------------------
--  실행: pg8000 풀러로 직접(파일 전체 한 번에). 멱등.
--  ⚠️ 클라이언트(insertInstallAttribution)보다 먼저 적용 — 테이블이 없으면 행이 버려진다(재시도는 된다).
--
--  ▶ Play Install Referrer(js/install-referrer.js) — 설치 후 첫 실행에 한 번 읽어 기기(localStorage)에 확정하고,
--    그 기기에서 온라인이 된 **계정마다 1행**. 게스트(익명) → Play Games 계정으로 바뀌면 새 계정 행이 하나 더 생긴다.
--    → 채널별 리텐션: user_id 로 session_logs 등과 조인, 또는 client_id 로 기기 단위 조인.
--  ▶ source/medium/campaign 은 클라이언트가 정리한 값(소문자·[a-z0-9_.-]·36자), raw_referrer 는 원문(500자).
--  ▶ GA4 쪽은 사용자 속성 install_source·install_campaign + install_attribution 이벤트.
-- =============================================================

create table if not exists public.install_attribution (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  client_id     text not null,
  platform      text not null default 'android',
  source        text not null,            -- instagram | threads | littly | kakao | community | organic | unknown | …
  medium        text not null,
  campaign      text not null,
  raw_referrer  text not null default '',
  click_ts      bigint,                   -- Play 스토어 링크 클릭 시각(epoch 초, 0 이면 null)
  install_ts    bigint,                   -- 설치 시작 시각(epoch 초)
  status        text not null default 'ok',
  created_at    timestamptz not null default now(),
  constraint install_attribution_user_client_key unique (user_id, client_id),
  constraint install_attribution_platform_chk check (platform in ('web','toss','itch','android','ios')),
  constraint install_attribution_status_chk check (status in ('ok','unsupported')),
  constraint install_attribution_len_chk check (
    length(client_id) <= 100 and length(source) <= 40 and length(medium) <= 40
    and length(campaign) <= 40 and length(raw_referrer) <= 500)
);

create index if not exists idx_install_attr_source  on public.install_attribution (source, campaign);
create index if not exists idx_install_attr_client  on public.install_attribution (client_id);
create index if not exists idx_install_attr_created on public.install_attribution (created_at);

alter table public.install_attribution enable row level security;

drop policy if exists install_attribution_select_own on public.install_attribution;
create policy install_attribution_select_own on public.install_attribution
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists install_attribution_insert_own on public.install_attribution;
create policy install_attribution_insert_own on public.install_attribution
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- update·delete 정책 없음 — 첫 귀속은 덮어쓰지 않는다(클라는 on conflict do nothing).
