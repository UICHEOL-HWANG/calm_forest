-- =============================================================
--  🛡️ 구조화 ④  CHECK 제약 — "닫힌 집합"에만
--  ------------------------------------------------------------
--  현재 CHECK 는 5개뿐(beta_testers 2 · beta_diary 2 · cafe_guests 1).
--  나머지는 전부 free text 라 오타가 조용히 통과한다.
--  특히 econ_logs.source 는 leaderboard() RPC 가 'quest_reward' 문자열을
--  직접 매칭하므로, 오타 한 번이 주간 퀘스트 랭킹을 소리없이 깎는다.
--
--  📌 그런데 전부에 CHECK 를 걸지는 않는다. 관측된 실제 값 기준:
--
--   [닫힌 집합 — CHECK 건다]
--     platform : web(9,652+464+53) / toss(46,023+311+48)  ... 2종 고정
--     currency : coins(775)                                ... 1종
--     boat.result : clear(8) / quit(6) / wreck(4)          ... 게임 규칙상 3종
--
--   [열린 집합 — CHECK 걸지 않는다]
--     econ.source  : 14종이고 기능 추가마다 늘어남
--                    (badge, daily_bonus, story, shop_sell, quest_reward,
--                     cafe_serve, carve_reward, sea_catch, lucky_box,
--                     house_expand, cafe_bonus, shop_buy, boat_upgrade, coop_build)
--                    → 화이트리스트를 걸면 새 코인 소스를 넣을 때마다
--                      마이그레이션이 필요해진다. 족쇄가 이득보다 크다.
--     sea.species  : 어종은 계속 추가됨 (현재 aji, buri)
--     variant      : control/A/B 에 beta_A 가 이미 섞여 있음 (실험마다 신설)
--     weather      : 날씨 종류가 게임 코드 쪽에서 확장 중
--
--  → source 오타 방어는 CHECK 대신 sql/quality_checks.sql 의 정기 점검으로
--    잡는 편이 현실적이다. (아래 검증 쿼리 참고)
--
--  ⚠️ NOT VALID 로 걸지 않는다. 데이터가 작고(최대 5.6만 행) 위반 행이
--     0건임을 위에서 확인했으므로 즉시 검증해도 잠금 시간이 짧다.
--
--  적용: Supabase SQL Editor 에서 1회 실행.
-- =============================================================

begin;

-- ── platform: web | toss ──────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['game_logs','session_logs','econ_logs','boat_runs','sea_records'] loop
    if not exists (select 1 from pg_constraint
                   where conname = t || '_platform_chk'
                     and conrelid = ('public.' || t)::regclass) then
      execute format(
        'alter table public.%I add constraint %I check (platform is null or platform in (''web'',''toss''))',
        t, t || '_platform_chk');
    end if;
  end loop;
end $$;

-- ── econ_logs.currency: coins ─────────────────────────────────
--  통화가 늘어나면 이 제약을 고친다 — 그때는 정말 고쳐야 하는 변경이다.
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'econ_logs_currency_chk'
                   and conrelid = 'public.econ_logs'::regclass) then
    alter table public.econ_logs
      add constraint econ_logs_currency_chk check (currency in ('coins'));
  end if;
end $$;

-- ── boat_runs.result: clear | quit | wreck ────────────────────
do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'boat_runs_result_chk'
                   and conrelid = 'public.boat_runs'::regclass) then
    alter table public.boat_runs
      add constraint boat_runs_result_chk
      check (result is null or result in ('clear','quit','wreck'));
  end if;
end $$;

commit;

-- ── 검증 / 정기 점검 ──────────────────────────────────────────
--  CHECK 를 안 건 source 는 이 쿼리로 주기적으로 본다.
--  "한 번만 등장한 source" = 오타 후보:
--
--  select source, count(*) n, min(created_at) first_seen
--  from public.econ_logs group by 1 having count(*) <= 2 order by 3 desc;
