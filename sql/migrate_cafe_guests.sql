-- =============================================================
--  calm forest · ☕ 카페 손님(Gemini 생성 콘텐츠) 보관 테이블
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ 왜 유저별이 아니라 (날짜, 날씨, 인원)당 1행인가
--    손님은 날짜 시드 + 엣지 캐시라, 그날 접속한 전원이 "똑같은" 4명을 봅니다.
--    유저마다 저장하면 같은 문장을 수천 번 중복 저장하는 셈이라 하루 1행만 남깁니다.
--    먼저 들어온 한 명이 기록하고, 나머지는 unique 제약에 걸려 조용히 무시됩니다.
--
--  ▶ 이 테이블에 행이 있는 날 = Gemini 생성 성공한 날
--    없는 날 = 로컬 기본 손님(폴백) → 그 자체가 자연 대조군이 됩니다.
--    "동적 대사가 완주율을 올리나?" 를 날짜 단위로 비교할 수 있습니다.
--
--  ▶ user_id 가 없습니다. 유저 데이터가 아니라 "그날의 생성 콘텐츠" 이기 때문입니다.
--    그래서 econ_logs/session_logs 의 auth.uid() = user_id 정책을 쓸 수 없고,
--    아래처럼 별도 정책을 둡니다.
-- =============================================================

create table if not exists public.cafe_guests (
  id          bigint generated always as identity primary key,
  gen_date    date     not null,                  -- 게임 기준 날짜(YYYY-MM-DD)
  weather     text     not null default 'clear',  -- clear/rain/snow/fog — 프롬프트에 들어감
  guest_count smallint not null,
  model       text,                               -- 예: gemini-flash-lite-latest
  guests      jsonb    not null,                  -- [{id, recipeId, line, thanks}, ...]
  created_at  timestamptz not null default now(),
  unique (gen_date, weather, guest_count)         -- 중복 기록 흡수(먼저 들어온 1건만 남음)
);

create index if not exists idx_cafe_guests_date on public.cafe_guests (gen_date desc);

alter table public.cafe_guests enable row level security;

-- ── 정책 ─────────────────────────────────────────────────────
-- 게임 클라이언트가 기록합니다. 게스트도 익명 로그인 상태라 authenticated 에 포함됩니다.
-- anon(비로그인)까지 열지 않는 이유: 공개 anon 키만으로 아무나 쓰레기 행을 넣을 수 있어서.
--
-- with check 로 "오늘 날짜만" 허용 — 과거·미래 날짜를 채워 넣는 장난을 막습니다.
-- (그래도 그날 첫 기록을 선점하는 건 막지 못합니다. 분석용 데이터라 그 수준에서 타협.
--  더 엄격히 가려면 워커에서 service_role 로 쓰는 방식으로 바꾸면 됩니다.)
drop policy if exists "cafe guests insert today" on public.cafe_guests;
create policy "cafe guests insert today" on public.cafe_guests
  for insert to authenticated
  with check (gen_date = current_date);

-- 읽기는 서버·SQL Editor(service_role)에서만. 클라이언트는 쓰기만 하면 됩니다.
-- (select 정책을 만들지 않으면 authenticated 는 조회 불가)

comment on table public.cafe_guests is
  'Gemini 가 생성한 그날의 카페 손님·주문·대사. (gen_date, weather, guest_count)당 1행. 행이 없는 날 = 로컬 폴백.';

-- ── 분석 예시 ────────────────────────────────────────────────
-- 1) 날짜별 생성 성공 여부(= 자연 A/B 그룹)
--   select gen_date, count(*) > 0 as had_gemini
--   from public.cafe_guests group by gen_date order by gen_date desc;
--
-- 2) 어떤 요리가 자주 주문됐나
--   select g->>'recipeId' as recipe, count(*) as n
--   from public.cafe_guests, jsonb_array_elements(guests) g
--   group by 1 order by 2 desc;
--
-- 3) 날씨가 대사에 반영되는지(길이·표현 변화 확인용)
--   select gen_date, weather, round(avg(length(g->>'line'))) as avg_len
--   from public.cafe_guests, jsonb_array_elements(guests) g
--   group by 1,2 order by 1 desc;
