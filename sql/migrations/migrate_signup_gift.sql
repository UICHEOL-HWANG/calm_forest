begin;

create table if not exists public.signup_gift_config (
  id smallint primary key default 1 check (id = 1),
  starts_at timestamptz not null
);
alter table public.signup_gift_config enable row level security;
revoke all on public.signup_gift_config from anon, authenticated;
insert into public.signup_gift_config (id, starts_at) values (1, now()) on conflict do nothing;

alter table public.purchases drop constraint if exists purchases_source_check;
alter table public.purchases add constraint purchases_source_check check (source in ('paddle', 'referral', 'signup'));

create or replace function public._reward_decor_ids()
returns text[] language sql immutable set search_path = public as $$
  select array['friendarch', 'giftsprout', 'giftmailbox', 'giftlantern']::text[]
$$;

create or replace function public._signup_gift_pool()
returns text[] language sql immutable set search_path = public as $$
  select array['giftsprout', 'giftmailbox', 'giftlantern']::text[]
$$;

create or replace function public.signup_gift_claim(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_anon    boolean;
  v_created timestamptz;
  v_item    text;
  v_pool    text[] := _signup_gift_pool();
begin
  select u.is_anonymous, u.created_at into v_anon, v_created from auth.users u where u.id = p_user;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_user'); end if;
  if coalesce(v_anon, false) then return jsonb_build_object('ok', false, 'reason', 'anonymous'); end if;

  select item_id into v_item from purchases where event_id = 'signup_gift:' || p_user and revoked_at is null;
  if found then return jsonb_build_object('ok', true, 'item', v_item, 'new', false); end if;

  if v_created < (select starts_at from signup_gift_config where id = 1) then
    return jsonb_build_object('ok', false, 'reason', 'too_early');
  end if;

  insert into purchases (event_id, transaction_id, user_id, item_id, kind, price_id, amount, occurred_at, source)
  values ('signup_gift:' || p_user, 'signup_gift', p_user, v_pool[1 + floor(random() * array_length(v_pool, 1))::int], 'decor', 'signup_gift', 0, now(), 'signup')
  on conflict (event_id) do nothing
  returning item_id into v_item;
  if v_item is not null then return jsonb_build_object('ok', true, 'item', v_item, 'new', true); end if;

  select item_id into v_item from purchases where event_id = 'signup_gift:' || p_user and revoked_at is null;
  if v_item is null then return jsonb_build_object('ok', false, 'reason', 'revoked'); end if;
  return jsonb_build_object('ok', true, 'item', v_item, 'new', false);
end $$;

revoke all on function public._signup_gift_pool()      from public, anon, authenticated;
revoke all on function public.signup_gift_claim(uuid)  from public, anon, authenticated;
grant execute on function public.signup_gift_claim(uuid)  to service_role;

commit;
