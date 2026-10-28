begin;

create or replace function public.neighbor_block(p_public_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_target uuid;
  v_today  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  select user_id into v_target from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_target = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  select count(*) into v_today from village_blocks where blocker = v_uid and created_at > now() - interval '1 day';
  if v_today >= 50 then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  insert into village_blocks (blocker, blocked) values (v_uid, v_target) on conflict do nothing;
  if found then
    update village_profiles set public_id = gen_random_uuid(), updated_at = now() where user_id = v_uid;
  end if;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.neighbor_block(uuid) from public, anon;
grant execute on function public.neighbor_block(uuid) to authenticated;

create or replace function public.admin_village_reports(p_limit int default 50, p_open_only boolean default true)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  return jsonb_build_object('ok', true, 'list', coalesce((
    select jsonb_agg(row_to_json(r)::jsonb order by r.created_at desc) from (
      select vr.id, vr.reason, vr.created_at, vr.handled_at, coalesce(vp.public_id, vr.target_public_id) as public_id,
             coalesce(_nb_nick(gs.state, vr.target), vr.target_nick) as nick,
             vp.hidden_by_admin, vp.nick_hidden,
             (select count(distinct x.reporter) from village_reports x where x.target = vr.target) as reports_on_target
        from village_reports vr
        left join game_saves gs on gs.user_id = vr.target
        left join village_profiles vp on vp.user_id = vr.target
       where (not coalesce(p_open_only, true) or vr.handled_at is null)
       order by vr.created_at desc
       limit greatest(1, least(coalesce(p_limit, 50), 500))
    ) r), '[]'::jsonb));
end $$;

revoke all on function public.admin_village_reports(int, boolean) from public, anon;
grant execute on function public.admin_village_reports(int, boolean) to authenticated;

update village_profiles set public_id = gen_random_uuid(), updated_at = now()
 where user_id in (select distinct blocker from village_blocks);

commit;
