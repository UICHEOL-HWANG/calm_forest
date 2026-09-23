-- =============================================================
--  calm forest · 리텐션 안내 예측/룰 스냅샷 테이블
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ retention_guidance_scores
--    - VM /retention-guidance/predict 호출에 실제로 들어간 raw early feature
--    - 모델 score/threshold/model_version
--    - 최종 룰 세그먼트/선택 배너
--    를 세션 트리거 단위로 남긴다.
--
--  이 테이블은 "나중에 모델 학습/검증에 쓸 실제 서빙 피처"의 원천이다.
--  game_logs 는 좌표 샘플 고정 스키마라 JSON 피처를 억지로 넣지 않는다.
-- =============================================================

create table if not exists public.retention_guidance_scores (
  id               bigint generated always as identity primary key,
  user_id          uuid references auth.users(id) on delete cascade,
  session_id       text not null,
  client_id        text,
  is_guest         boolean,
  variant          text,
  platform         text not null default 'web',

  policy_version   text not null default '',
  trigger          text not null,
  rule_segment     text,
  reason           text,
  final_eligible   boolean,
  suppressed_reason text,
  selected_kind    text,
  target_family    text,

  model_score      double precision,
  model_threshold  double precision,
  model_version    text,
  model_band       text,
  model_eligible   boolean,

  raw_features     jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists uq_retention_guidance_scores_session_trigger
  on public.retention_guidance_scores (session_id, trigger, policy_version);

create index if not exists idx_retention_guidance_scores_user
  on public.retention_guidance_scores (user_id);

create index if not exists idx_retention_guidance_scores_client_created
  on public.retention_guidance_scores (client_id, created_at);

create index if not exists idx_retention_guidance_scores_model
  on public.retention_guidance_scores (model_version, model_band);

create index if not exists idx_retention_guidance_scores_segment
  on public.retention_guidance_scores (rule_segment, selected_kind);

alter table public.retention_guidance_scores enable row level security;

grant select, insert, update on public.retention_guidance_scores to authenticated;
grant usage, select on sequence public.retention_guidance_scores_id_seq to authenticated;

drop policy if exists "own retention guidance score insert" on public.retention_guidance_scores;
create policy "own retention guidance score insert" on public.retention_guidance_scores
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "own retention guidance score update" on public.retention_guidance_scores;
create policy "own retention guidance score update" on public.retention_guidance_scores
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "own retention guidance score select" on public.retention_guidance_scores;
create policy "own retention guidance score select" on public.retention_guidance_scores
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'retention_guidance_scores_platform_chk'
                   and conrelid = 'public.retention_guidance_scores'::regclass) then
    alter table public.retention_guidance_scores
      add constraint retention_guidance_scores_platform_chk
      check (platform is null or platform in ('web','toss','itch','android'));
  end if;
end $$;
