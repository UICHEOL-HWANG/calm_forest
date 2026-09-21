-- =============================================================
--  calm forest · 🐗🦝 밤손님 승부 판별 로그
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists)이라 여러 번 실행해도 안전합니다.
--
--  ▶ 왜 따로 쌓나 — GA4 → BigQuery 로도 같은 값이 가지만 **하루 뒤**에 온다.
--    난이도(섞기 속도)를 만지려면 오늘 쌓인 걸 오늘 보고 싶다. session_logs.counts
--    는 이벤트 **횟수**만 세므로 off·ms 같은 파라미터가 남지 않는다.
--
--  ▶ 한 행 = 한 **판**(승부 하나가 1~3행). 승부 단위 집계는 session_id + created_at 으로 묶는다.
--
--  ▶ ⚠️ 컬럼 이름 miss 는 GA4 의 off 와 같은 값이다. off 는 예약어라 테이블에선 쓸 수 없다.
--    정답 자리와 고른 자리의 거리 — 0=정답, 1=옆 그릇, 2=반대쪽.
--    **이게 난이도 조정의 핵심 신호다**: 1 이 많으면 눈으로 좇다 놓친 것(속도 문제),
--    2 가 많으면 아예 못 좇은 것(횟수·속도 둘 다 과함).
-- =============================================================

create table if not exists public.duel_logs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),

  -- 세그먼트 — econ_logs 와 같은 축을 그대로 붙인다(A/B·플랫폼 비교가 같은 방식이 되도록)
  user_id     uuid,
  session_id  text,
  client_id   text,
  is_guest    boolean,
  variant     text,
  platform    text,

  -- 어느 승부의 몇 번째 판인가
  animal      text not null check (animal in ('boar', 'raccoon')),
  game        text not null check (game in ('rps', 'shells')),
  round       smallint not null,
  result      text not null check (result in ('win', 'lose', 'draw')),
  rt_ms       integer,          -- 고민한 시간. 아주 짧으면 찍은 것이다

  -- 🦝 그릇 맞추기 — 그 판의 난이도와 얼마나 빗나갔는지
  swaps       smallint,         -- 섞은 횟수
  ms          smallint,         -- 한 번 섞는 데 걸린 시간
  picked      smallint,         -- 고른 자리(0~2)
  answer      smallint,         -- 정답 자리(0~2)
  miss        smallint,         -- |picked - answer| — GA4 의 off 와 같은 값(위 주석 참고)

  -- 🐗 가위바위보 — 낸 손(사람이 바위를 편중해 내는지 등)
  mine        text,
  theirs      text
);

-- 조회 패턴: "최근 N일 · 게임별" 이 기본이고, 난이도 분석은 shells 만 본다
create index if not exists duel_logs_created_idx on public.duel_logs (created_at desc);
create index if not exists duel_logs_game_idx    on public.duel_logs (game, created_at desc);

alter table public.duel_logs enable row level security;

-- 본인 행만 쓴다. ⚠️ (select auth.uid()) 로 감싸는 것이 이 저장소 규칙 —
--    맨 auth.uid() 는 행마다 재평가돼 큰 테이블에서 느려진다.
drop policy if exists duel_logs_insert_own on public.duel_logs;
create policy duel_logs_insert_own on public.duel_logs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists duel_logs_select_own on public.duel_logs;
create policy duel_logs_select_own on public.duel_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

comment on table  public.duel_logs is '🐗🦝 밤손님 승부 — 판 단위 로그. 한 행 = 한 판(승부 하나가 1~3행)';
comment on column public.duel_logs.miss is 'GA4 의 off. |고른 자리 - 정답 자리| — 0=정답 1=옆 2=반대쪽. 난이도 조정의 핵심 신호';
comment on column public.duel_logs.rt_ms is '고민한 시간(ms). 🦝 는 섞기 연출 시간을 뺀 값';
