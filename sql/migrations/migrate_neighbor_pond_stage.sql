create or replace function public._nb_pond(p_state jsonb)
returns jsonb language sql immutable set search_path = public as $$
  with fish as (
    select k.key as id, (k.value #>> '{}')::numeric as t
    from jsonb_each(case when jsonb_typeof(p_state #> '{dex,fish}') = 'object' then p_state #> '{dex,fish}' else '{}'::jsonb end) k
    where k.key in ('sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common')
      and jsonb_typeof(k.value) = 'number'
    order by 2, array_position(array['sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common'], k.key)
    limit 7
  ), sea as (
    select k.key as sp, (k.value #>> '{}')::numeric as w
    from jsonb_each(case when jsonb_typeof(p_state #> '{sea,best}') = 'object' then p_state #> '{sea,best}' else '{}'::jsonb end) k
    where k.key in ('aji','buri','mola','tuna')
      and case when jsonb_typeof(k.value) = 'number' then (k.value #>> '{}')::numeric > 0 else false end
    order by 2 desc, array_position(array['aji','buri','mola','tuna'], k.key)
    limit 4
  )
  select jsonb_build_object(
    'fish', coalesce((select jsonb_agg(id order by t, array_position(array['sakura_trout','puffer','maple_carp','ice_smelt','rare','uncommon','common'], id)) from fish), '[]'::jsonb),
    'sea', (select jsonb_build_object('sp', sp, 'w', w) from sea order by w desc, array_position(array['aji','buri','mola','tuna'], sp) limit 1),
    'seas', coalesce((select jsonb_agg(jsonb_build_object('sp', sp, 'w', w) order by w desc, array_position(array['aji','buri','mola','tuna'], sp)) from sea), '[]'::jsonb),
    'rim', case when p_state->'hintsSeen'->>'pondRim' in ('pebble','brick','shell') then p_state->'hintsSeen'->>'pondRim' else 'rock' end,
    'stage', case when p_state #>> '{hintsSeen,pondStage}' ~ '^[0-9]{1,9}$' then least(3, greatest(1, (p_state #>> '{hintsSeen,pondStage}')::int)) else 1 end);
$$;

revoke all on function public._nb_pond(jsonb) from public, anon, authenticated;
