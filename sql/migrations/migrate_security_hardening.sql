-- =============================================================
--  🛡️ 보안 보강 (2026-10-07) — 보안 감사 후속
--  ------------------------------------------------------------
--  ① leaderboard · plaza_progress 닉네임 → _nb_nick(state, user)
--       세이브를 직접 PATCH 한 욕설 닉네임이 리더보드·수확제 명판으로 전체 유저에게 나가던 우회로를 막는다.
--       이웃 마을과 같은 단일 출처(금칙어·관리자 nick_hidden). _nb_nick 은 left(…,16) 까지 한다.
--  ② 💎 프리미엄(현금 전용) 꾸미기는 purchases 원장에 살아 있는 행이 있을 때만 세이브에 남는다
--       game_saves BEFORE INSERT/UPDATE 트리거가 원장에 없는 프리미엄 id 를 owned·equipped·cashOwned 에서 뺀다.
--       클라(js/shop/entitlements.js)는 "흔적 없는 항목은 회수하지 않는다" — 세션 흔들림에 산 걸 잃지 않으려는 설계라
--       클라만으로는 막을 수 없고, 원장을 직접 볼 수 있는 서버가 판정한다(서버는 RLS 빈 배열 오판이 없다).
--       코인으로도 살 수 있는 품목·펫은 대상이 아니다(코인 구매는 원장이 없다).
--  ⚠️ _premium_cosmetic_ids() = js/cosmetics/catalog.js 의 won 품목 — tests/security-hardening.test.mjs 가 대조한다.
--     새 프리미엄을 카탈로그에 넣으면 여기도 넣을 것(빠뜨리면 그 품목만 보호가 없다 — 회수 오판은 없다).
--  적용: 1회(멱등) → sql/tests/security_hardening_selftest.py 로 검증
-- =============================================================
begin;

-- ① 닉네임 단일 출처 ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leaderboard(p_board text, p_uid uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  kst_now   timestamp := (now() at time zone 'Asia/Seoul');
  kst_today date      := (now() at time zone 'Asia/Seoul')::date;
  wk_start  timestamptz;
  day_start timestamptz := (now() at time zone 'Asia/Seoul')::date::timestamp at time zone 'Asia/Seoul';   -- 오늘 00:00 KST
  day_end   timestamptz := ((now() at time zone 'Asia/Seoul')::date + 1)::timestamp at time zone 'Asia/Seoul';
  sc        jsonb;   -- [{u:uuid, s:score}] 보드별 원시 점수
  rows_     jsonb;
  me_       jsonb;
begin
  wk_start := date_trunc('week', kst_now) at time zone 'Asia/Seoul';

  if p_board = 'boat' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(max(score), 5000)::bigint as s from boat_runs
          where created_at >= day_start and created_at < day_end   -- 🕛 서버 시각(KST) 기준 — 기기가 보낸 run_date 는 UTC 라 새벽 기록이 어제로 샌다
            and user_id is not null and score is not null
          group by user_id) x;
  elsif p_board = 'sea' then
    -- 🌊 오늘의 대어 — 어종 무관, 오늘 낚은 최고 무게(kg)×10 정수. 상한 300kg
    --    🆕 그 무게를 낸 어종(sp)도 함께 — distinct on 으로 유저마다 가장 무거운 한 마리만 남긴다
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s, 'sp', species)) into sc
    from (select distinct on (user_id) user_id, species, least(round(weight * 10), 3000)::bigint as s
          from sea_records
          where created_at >= day_start and created_at < day_end   -- 🕛 서버 시각(KST) 기준
            and user_id is not null and weight is not null and weight > 0
          order by user_id, weight desc) x;
  elsif p_board = 'rich' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(amount, 100000)), 10000000)::bigint as s from econ_logs
          where created_at >= wk_start and amount > 0 and user_id is not null
          group by user_id) x;
  elsif p_board = 'quest' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(count(*), 1000)::bigint as s from econ_logs
          where created_at >= wk_start and source = 'quest_reward' and user_id is not null
          group by user_id) x;
  elsif p_board = 'mine' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(cf_num(counts, 'mine_ore'), 10000)), 100000)::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(cf_num(counts, 'mine_ore')) > 0) x;
  elsif p_board = 'cook' then
    select jsonb_agg(jsonb_build_object('u', user_id, 's', s)) into sc
    from (select user_id, least(sum(least(cf_num(counts, 'cooking_result'), 10000)), 100000)::bigint as s
          from session_logs
          where updated_at >= wk_start and user_id is not null
          group by user_id
          having sum(cf_num(counts, 'cooking_result')) > 0) x;
  else
    return jsonb_build_object('error', 'unknown board');
  end if;

  sc := coalesce(sc, '[]'::jsonb);

  -- 랭킹 + 닉네임 조인(공동 순위는 rank()) — 상위 50명만 노출
  with s as (
    select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score, e->>'sp' as sp
    from jsonb_array_elements(sc) e
  ), ranked as (
    select s.user_id, s.score, s.sp,
           rank() over (order by s.score desc) as rnk
    from s
  ), top_ as (
    -- 🛡️ 닉네임은 _nb_nick(금칙어·관리자 가림, 이웃 마을과 같은 단일 출처) — 정규식 비용이 있어
    --    50위 안(rnk<=50)만 계산한다. 동점 정렬(rnk, nick)은 이전과 같다.
    select r.user_id, r.score, r.sp, r.rnk, _nb_nick(gs.state, r.user_id) as nick
    from ranked r left join game_saves gs on gs.user_id = r.user_id
    where r.rnk <= 50
  )
  -- sp 는 바다 보드에서만 붙는다(다른 보드 응답은 이전과 글자 하나 다르지 않게)
  select jsonb_agg(jsonb_build_object('rank', rnk, 'nick', nick, 'score', score)
                   || case when sp is not null then jsonb_build_object('sp', sp) else '{}'::jsonb end
                   order by rnk, nick)
    into rows_
  from (select * from top_ order by rnk, nick limit 50) t;

  -- 내 순위(전체 기준 — 50위 밖이어도 계산)
  if p_uid is not null then
    with s as (
      select (e->>'u')::uuid as user_id, (e->>'s')::bigint as score, e->>'sp' as sp
      from jsonb_array_elements(sc) e
    ), ranked as (
      select s.user_id, s.score, s.sp, rank() over (order by s.score desc) as rnk
      from s
    )
    select jsonb_build_object('rank', rnk, 'score', score)
           || case when sp is not null then jsonb_build_object('sp', sp) else '{}'::jsonb end into me_
    from ranked where user_id = p_uid;
  end if;

  return jsonb_build_object(
    'board', p_board,
    'week',  to_char(kst_now, 'IYYY-"W"IW'),
    'date',  to_char(kst_today, 'YYYY-MM-DD'),
    'top',   coalesce(rows_, '[]'::jsonb),
    'me',    me_,
    'total', (select count(*) from jsonb_array_elements(sc))
  );
end $function$;

CREATE OR REPLACE FUNCTION public.plaza_progress(p_season text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_s      plaza_seasons;
  v_cur    smallint;
  v_max    smallint;
  v_done   boolean;
  v_forced boolean;
  v_items  jsonb;
  v_names  jsonb;
  v_donors int;
begin
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('error', 'unknown season'); end if;
  v_cur := _plaza_current_stage(p_season);
  select max(stage) into v_max from plaza_needs where season = p_season;
  v_forced := v_cur is not null and now() >= v_s.ends_at;
  v_done := v_cur is null or v_forced;

  select coalesce(jsonb_agg(jsonb_build_object('stage', n.stage, 'item', n.item, 'have', h.have, 'need', n.need)
                            order by n.stage, n.item), '[]'::jsonb)
    into v_items
  from plaza_needs n
  left join lateral (
    select coalesce(sum(d.qty), 0) as have from plaza_donations d
    where d.season = n.season and d.stage = n.stage and d.item = n.item
  ) h on true
  where n.season = p_season;

  select count(distinct user_id) into v_donors from plaza_donations where season = p_season;

  -- 명판 이름 — 식별자는 내보내지 않는다(리더보드와 같은 닉네임 규칙), 첫 기부 순
  select coalesce(jsonb_agg(x.nick order by x.first_at), '[]'::jsonb) into v_names
  from (
    select _nb_nick(gs.state, f.user_id) as nick, f.first_at   -- 🛡️ 금칙어·관리자 가림 반영
    from (select d.user_id, min(d.created_at) as first_at
          from plaza_donations d
          where d.season = p_season
          group by d.user_id
          order by min(d.created_at)
          limit 500) f
    left join game_saves gs on gs.user_id = f.user_id
  ) x;

  return jsonb_build_object('season', p_season, 'starts_at', v_s.starts_at, 'ends_at', v_s.ends_at,
    'started', now() >= v_s.starts_at,
    'active', now() >= v_s.starts_at and now() < v_s.ends_at,
    'completed', v_done, 'forced', v_forced,
    'stage', case when v_done then v_max + 1 else v_cur end, 'max_stage', v_max,
    'items', v_items, 'donors', v_donors, 'names', v_names);
end $function$;

-- ② 프리미엄 소유 검증 ─────────────────────────────────────────
create or replace function public._premium_cosmetic_ids()
returns text[] language sql immutable set search_path = public as $$
  select array[
    'firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl',
    'forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry',
    'tools_shroom', 'tools_moon', 'tools_bloom', 'tools_batnight', 'tools_harvest',
    'bat_wing', 'bat_cape',
    -- 🤝 친구 초대 보상(migrate_referrals.sql 과 같은 목록 — 둘 중 어느 파일을 다시 돌려도 가드가 안 풀리게)
    'tools_star', 'friend_wing', 'friend_pin'
  ]::text[]
$$;

create or replace function public._game_saves_guard_premium()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prem  text[] := _premium_cosmetic_ids();
  v_cos   jsonb  := new.state->'cosmetics';
  v_seen  text[];
  v_bad   text[];
begin
  if v_cos is null or jsonb_typeof(v_cos) <> 'object' then return new; end if;

  -- 세이브에 등장한 프리미엄 id (owned · equipped 값 · cashOwned)
  select array_agg(distinct x) into v_seen from (
    select jsonb_array_elements_text(v_cos->'owned') as x where jsonb_typeof(v_cos->'owned') = 'array'
    union all
    select e.value #>> '{}' from jsonb_each(case when jsonb_typeof(v_cos->'equipped') = 'object' then v_cos->'equipped' else '{}'::jsonb end) e
    union all
    select jsonb_array_elements_text(new.state->'cashOwned') where jsonb_typeof(new.state->'cashOwned') = 'array'
  ) t where x = any (v_prem);
  if v_seen is null then return new; end if;

  -- 원장에 살아 있는 행이 없는 것
  --   ⚠️ 별칭을 u(item) 으로 — 맨 id 는 하위 쿼리에서 purchases.id(bigint) 로 잡힌다
  select array_agg(u.item) into v_bad from unnest(v_seen) as u(item)
  where not exists (select 1 from purchases p where p.user_id = new.user_id and p.item_id = u.item and p.revoked_at is null);
  if v_bad is null then return new; end if;

  if jsonb_typeof(v_cos->'owned') = 'array' then
    v_cos := jsonb_set(v_cos, '{owned}', coalesce(
      (select jsonb_agg(o) from jsonb_array_elements(v_cos->'owned') o where not coalesce(o #>> '{}' = any (v_bad), false)), '[]'::jsonb));
  end if;
  if jsonb_typeof(v_cos->'equipped') = 'object' then
    v_cos := jsonb_set(v_cos, '{equipped}', coalesce(
      (select jsonb_object_agg(e.key, case when e.value #>> '{}' = any (v_bad) then 'null'::jsonb else e.value end)
         from jsonb_each(v_cos->'equipped') e), '{}'::jsonb));
  end if;
  new.state := jsonb_set(new.state, '{cosmetics}', v_cos);
  if jsonb_typeof(new.state->'cashOwned') = 'array' then
    new.state := jsonb_set(new.state, '{cashOwned}', coalesce(
      (select jsonb_agg(c) from jsonb_array_elements(new.state->'cashOwned') c where not coalesce(c #>> '{}' = any (v_bad), false)), '[]'::jsonb));
  end if;
  return new;
end $$;

revoke all on function public._game_saves_guard_premium() from public, anon, authenticated;

drop trigger if exists trg_game_saves_guard_premium on public.game_saves;
create trigger trg_game_saves_guard_premium
  before insert or update of state on public.game_saves
  for each row execute function public._game_saves_guard_premium();

commit;
