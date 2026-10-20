begin;

create or replace function public._premium_pet_ids()
returns text[] language sql immutable set search_path = public as $$
  select array['cloud_dragon', 'hedgehog', 'axolotl', 'unicorn']::text[]
$$;

create or replace function public._game_saves_guard_pets()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_prem text[] := _premium_pet_ids();
  v_pets jsonb  := new.state->'pets';
  v_bad  text[];
begin
  select array_agg(u.item) into v_bad from unnest(v_prem) as u(item)
  where (
      (jsonb_typeof(v_pets) = 'object' and (v_pets ? u.item or exists (select 1 from jsonb_each(v_pets) e where e.value->>'kind' = u.item)))
      or (new.state->'pet'->>'kind') = u.item
      or (jsonb_typeof(new.state->'cashOwned') = 'array' and new.state->'cashOwned' ? u.item)
    )
    and not exists (select 1 from purchases p where p.user_id = new.user_id and p.item_id = u.item and p.revoked_at is null);
  if v_bad is null then return new; end if;

  if jsonb_typeof(v_pets) = 'object' then
    new.state := jsonb_set(new.state, '{pets}', coalesce(
      (select jsonb_object_agg(e.key, e.value) from jsonb_each(v_pets) e
        where e.key <> all (v_bad) and coalesce(e.value->>'kind', '') <> all (v_bad)), '{}'::jsonb));
  end if;
  if (new.state->'pet'->>'kind') = any (v_bad) then
    new.state := jsonb_set(new.state, '{pet}', 'null'::jsonb);
  end if;
  if jsonb_typeof(new.state->'cashOwned') = 'array' then
    new.state := jsonb_set(new.state, '{cashOwned}', coalesce(
      (select jsonb_agg(c) from jsonb_array_elements(new.state->'cashOwned') c where not coalesce(c #>> '{}' = any (v_bad), false)), '[]'::jsonb));
  end if;
  return new;
end $$;

revoke all on function public._premium_pet_ids() from public, anon, authenticated;
revoke all on function public._game_saves_guard_pets() from public, anon, authenticated;

drop trigger if exists trg_game_saves_guard_pets on public.game_saves;
create trigger trg_game_saves_guard_pets
  before insert or update of state on public.game_saves
  for each row execute function public._game_saves_guard_pets();

commit;
