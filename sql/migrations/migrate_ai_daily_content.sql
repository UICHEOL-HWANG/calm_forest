-- =============================================================
--  🦉☕ AI 콘텐츠 사전 생성 — 의뢰·카페 손님 저장소 · 크론 실행 기록
--  ------------------------------------------------------------
--  ▶ 크론(functions/ai-pregen-cron.js)이 전날 밤 (날짜·언어·집 단계·시간대) × 변형으로
--     만들어 두고, /api/daily-quests · /api/cafe-guests 는 읽기만 한다.
--     즉석 생성이 날짜 바뀌는 순간 몰려 Gemini 무료 분당 한도(15)에 걸리던 것을 없앤다.
--  ▶ ⚠️ 쓰기·읽기 모두 service_role(워커)만. 게임 화면에 그대로 뜨는 콘텐츠라
--     anon 쓰기가 열리면 누구나 아무 문장이나 띄울 수 있다(npc_dialogues 와 같은 규칙).
--     정책을 만들지 않아 RLS 가 전부 막는다.
--  적용: Supabase SQL Editor 에서 1회 실행.
-- =============================================================

create table if not exists public.ai_daily_content (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('quests','cafe')),
  date       date not null,                      -- 게임 날짜(기기 로컬 날짜 문자열 그대로)
  lang       text not null check (lang in ('ko','en')),
  phase      text not null check (phase in ('settling','settled','thriving')),
  slot       text not null check (slot in ('day','morning','noon','evening')),   -- 의뢰는 'day'
  variant    smallint not null check (variant between 0 and 7),               -- 기기 버킷 0~7 → 사람마다 다른 변형
  weather    text not null check (weather in ('clear','rain','snow','fog')),  -- 날짜 해시로 계산한 값(기록용)
  payload    jsonb not null check (jsonb_typeof(payload) = 'array'),
  model      text,
  created_at timestamptz not null default now(),
  unique (kind, date, lang, phase, slot, variant)
);
-- API 읽기(조합 하나의 변형 전부)는 위 unique 인덱스가 앞 열부터 받친다. 크론 조회·정리는 날짜로.
create index if not exists idx_ai_daily_content_date on public.ai_daily_content (date);

-- ── 크론 실행 기록 ───────────────────────────────────────────
--  ⚠️ 성공도 기록한다 — 트리거 미등록·배포 누락은 실패 로그조차 남기지 않는다.
--  gemini_calls 합계가 곧 "오늘(태평양 자정 이후) 크론이 쓴 한도"다. 크론은 이걸 읽고 예산을 지킨다.
create table if not exists public.ai_pregen_runs (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  requested    int not null,
  inserted     int not null default 0,
  failed       int not null default 0,
  gemini_calls int not null default 0,
  rate_limited boolean not null default false,
  variants     int,
  error        text,
  duration_ms  int
);
create index if not exists idx_ai_pregen_runs_at on public.ai_pregen_runs (created_at desc);

alter table public.ai_daily_content enable row level security;
alter table public.ai_pregen_runs   enable row level security;
-- 정책 없음 = anon·authenticated 는 읽기도 쓰기도 불가. service_role 만.
