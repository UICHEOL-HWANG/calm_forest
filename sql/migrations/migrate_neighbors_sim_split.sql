-- =============================================================
--  🏡 이웃 마을 — 페르소나/실사용자 후보 분리 (migrate_neighbors.sql 적용 뒤 1회, 다시 돌려도 안전)
--  페르소나 계정(tools/persona-sim PERSONA_DOMAIN = sim.calmforest.local)이 실사용자 이웃으로 뜨지 않게 한다.
-- =============================================================
-- 후보 = 공개(행 없으면 공개) + 비익명 + 7일 안에 저장 + 집 1단계 이상 + 본인 제외. 하루 고정 정렬(리롤 불가)
create or replace function public._nb_candidates(p_caller uuid, p_day date, p_limit int default 3)
returns table (uid uuid, k text)
language sql stable security definer set search_path = public as $$
  select gs.user_id, md5(p_caller::text || p_day::text || gs.user_id::text)
  from game_saves gs
  join auth.users u on u.id = gs.user_id
  left join village_profiles vp on vp.user_id = gs.user_id
  where gs.user_id <> p_caller
    and coalesce(u.is_anonymous, false) = false
    and coalesce(vp.is_public, true)
    and gs.updated_at >= now() - interval '7 days'
    and case when jsonb_typeof(gs.state->'houseStage') = 'number' then (gs.state->>'houseStage')::numeric >= 1 else false end
    -- 🧑‍🤝‍🧑 페르소나(@sim.calmforest.local)는 페르소나끼리, 실사용자는 실사용자끼리만 만난다
    and (lower(coalesce(u.email, '')) like '%@sim.calmforest.local') = exists (select 1 from auth.users c where c.id = p_caller and lower(coalesce(c.email, '')) like '%@sim.calmforest.local')
  order by 2
  limit greatest(0, least(coalesce(p_limit, 3), 100000));
$$;

revoke all on function public._nb_candidates(uuid, date, int) from public, anon, authenticated;
