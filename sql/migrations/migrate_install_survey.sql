-- =============================================================
--  calm forest · 🧭 첫 실행 "어디서 알게 되셨어요?" 설문 (install_survey)
--  ------------------------------------------------------------
--  실행: pg8000 풀러로 직접(파일 전체 한 번에). 멱등.
--  ⚠️ 클라이언트(insertInstallSurvey)보다 먼저 적용 — 테이블이 없으면 행이 버려진다(재시도는 된다).
--
--  ▶ js/install-survey.js — iOS 첫 실행 전원 · 안드로이드는 Play 링크 없이 온 사람(organic·unknown)만.
--    답은 기기(localStorage cf_survey)에 확정하고, 그 기기에서 온라인이 된 **계정마다 1행**(install_attribution 과 같은 규칙).
--  ▶ install_attribution(Play 자동 귀속)과 테이블을 나눈 이유: 방식이 다르고, 그쪽은 unique+ignoreDuplicates 라
--    안드로이드에서 같은 계정·기기로 넣으면 설문 답이 조용히 버려진다.
--  ▶ answer 값은 UTM Source 시트 소스 이름과 같다 → source 와 같은 축으로 합쳐 본다.
--  ▶ GA4 쪽은 사용자 속성 heard_from + install_survey{action, answer, has_code} 이벤트.
-- =============================================================

create table if not exists public.install_survey (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  client_id   text not null,
  platform    text not null,
  answer      text not null,
  has_code    boolean not null default false,   -- 🤝 친구 초대를 고르고 초대 코드를 넣었나(연결 결과는 referrals 테이블)
  created_at  timestamptz not null default now(),
  constraint install_survey_user_client_key unique (user_id, client_id),
  constraint install_survey_platform_chk check (platform in ('android','ios')),
  constraint install_survey_answer_chk check (answer in (
    'search','store','instagram','threads','youtube','x','1km','hithere','community','word_of_mouth','friend','other')),
  constraint install_survey_len_chk check (length(client_id) <= 100)
);

create index if not exists idx_install_survey_answer  on public.install_survey (answer);
create index if not exists idx_install_survey_created on public.install_survey (created_at);

alter table public.install_survey enable row level security;

drop policy if exists install_survey_select_own on public.install_survey;
create policy install_survey_select_own on public.install_survey
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists install_survey_insert_own on public.install_survey;
create policy install_survey_insert_own on public.install_survey
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- update·delete 정책 없음 — 첫 답은 덮어쓰지 않는다(클라는 on conflict do nothing).

-- anon 은 쓸 일이 없다(게스트도 익명 로그인 = authenticated) — 정책이 없어 안 보이지만 권한까지 걷어 둔다
revoke all on public.install_survey from anon;
