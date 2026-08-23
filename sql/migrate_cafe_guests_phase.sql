-- =============================================================
--  calm forest · ☕ 카페 손님 보관 테이블에 phase(플레이어 상태 버킷) 추가
--  ------------------------------------------------------------
--  사용법: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run (1회).
--  멱등(if not exists / if exists)이라 여러 번 실행해도 안전합니다.
--  선행: sql/migrate_cafe_guests.sql
--
--  ▶ 왜 필요한가
--    손님 대사가 집 단계 버킷(settling/settled/thriving)에 따라 달라지도록 바뀌었습니다.
--    같은 날·같은 날씨라도 세 벌이 생성되는데, 기존 unique 가
--    (gen_date, weather, guest_count) 라서 먼저 들어온 한 벌만 남고
--    나머지 두 벌은 23505 로 조용히 버려집니다.
--    분석에서 "버킷이 실제로 대사를 바꿨나" 를 볼 수 없으므로 키에 phase 를 넣습니다.
--
--  ▶ 기존 행 처리
--    버킷 도입 전 데이터는 전원 공통 대사였습니다. 'legacy' 로 표시해
--    버킷별 비교에서 섞이지 않게 합니다(default 는 신규 행용 'settled').
-- =============================================================

-- ① 컬럼 추가 — default 를 'legacy' 로 두어 '기존 행 = 버킷 도입 전' 이 한 번에 표시된다.
--    (update 로 뒤늦게 구분하려 들면 "어디까지가 옛 행인가" 를 판별해야 해서 취약해진다)
alter table public.cafe_guests
  add column if not exists phase text not null default 'legacy';

-- ② 이후 들어올 행의 기본값은 'settled' — 클라이언트가 값을 안 보낸 경우의 안전값
alter table public.cafe_guests
  alter column phase set default 'settled';

-- ③ unique 키에 phase 를 포함 — 버킷마다 한 벌씩 남는다
--    기존 제약은 Postgres 가 자동으로 이름 붙인 것이라 이름을 추측하면 위험하다.
--    이름이 다르면 drop 이 조용히 넘어가고 옛 unique 가 남아, 버킷 두 벌이 계속 버려진다.
--    → 이 테이블의 unique 제약을 이름과 무관하게 모두 걷어내고 새로 만든다.
do $$
declare c record;
begin
  for c in
    select con.conname
      from pg_constraint con
      join pg_class      rel on rel.oid = con.conrelid
      join pg_namespace  ns  on ns.oid  = rel.relnamespace
     where ns.nspname = 'public'
       and rel.relname = 'cafe_guests'
       and con.contype = 'u'
  loop
    execute format('alter table public.cafe_guests drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.cafe_guests
  add constraint cafe_guests_gen_date_weather_guest_count_phase_key
  unique (gen_date, weather, guest_count, phase);

-- ④ 값 제한 — 클라이언트가 보낸 문자열이 그대로 들어오므로 여기서도 막는다
--    (js/game.js 의 playerPhase() · functions/api/cafe-guests.js 의 PHASES 와 짝)
alter table public.cafe_guests
  drop constraint if exists cafe_guests_phase_chk;

alter table public.cafe_guests
  add constraint cafe_guests_phase_chk
  check (phase in ('settling', 'settled', 'thriving', 'legacy'));

comment on column public.cafe_guests.phase is
  '플레이어 상태 버킷 — settling(집 짓는 중) / settled(집 완성) / thriving(증축 완료) / legacy(버킷 도입 전)';

comment on table public.cafe_guests is
  'Gemini 가 생성한 그날의 카페 손님·주문·대사. (gen_date, weather, guest_count, phase)당 1행. 행이 없는 날 = 로컬 폴백.';

-- ── 분석 예시 ────────────────────────────────────────────────
-- 1) 버킷이 실제로 대사를 바꿨나 — 같은 날·날씨에서 버킷별 대사 비교
--   select gen_date, weather, phase, g->>'id' as npc, g->>'line' as line
--   from public.cafe_guests, jsonb_array_elements(guests) g
--   where gen_date = current_date
--   order by g->>'id', phase;
--
-- 2) 버킷별 수집 현황(세 벌이 고르게 쌓이는지 — 한쪽만 쌓이면 그 구간 유저가 없다는 뜻)
--   select phase, count(*) as rows, min(gen_date) as since
--   from public.cafe_guests group by phase order by 2 desc;
--
-- 3) 버킷별 대사 길이 — 후반 버킷이 장황해지지 않는지 점검
--   select phase, round(avg(length(g->>'line'))) as avg_len, max(length(g->>'line')) as max_len
--   from public.cafe_guests, jsonb_array_elements(guests) g
--   group by 1 order by 1;
