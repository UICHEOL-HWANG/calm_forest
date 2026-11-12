begin;

create table if not exists public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9]{4,16}$'),
  label text not null,
  label_en text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_uses int check (max_uses is null or max_uses > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from anon, authenticated;

create table if not exists public.promo_redemptions (
  user_id uuid not null references auth.users on delete cascade,
  stage smallint not null check (stage in (1, 2)),
  code text not null references public.promo_codes,
  created_at timestamptz not null default now(),
  primary key (user_id, stage)
);
create index if not exists promo_redemptions_code_stage on public.promo_redemptions (code, stage);
alter table public.promo_redemptions enable row level security;
revoke all on public.promo_redemptions from anon, authenticated;

alter table public.purchases drop constraint if exists purchases_source_check;
alter table public.purchases add constraint purchases_source_check check (source in ('paddle', 'referral', 'signup', 'promo'));

create or replace function public._reward_decor_ids()
returns text[] language sql immutable set search_path = public as $$
  select array['friendarch', 'giftsprout', 'giftmailbox', 'giftlantern', 'promoballoon', 'promosuitcase']::text[]
$$;

create or replace function public._promo_decor_ids()
returns text[] language sql immutable set search_path = public as $$
  select array['promoballoon', 'promosuitcase']::text[]
$$;

create or replace function public.promo_code_check(p_code text, p_stage int default 1)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r      promo_codes%rowtype;
  v_used int;
begin
  select * into r from promo_codes where code = upper(p_code);
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;
  if not r.active then return jsonb_build_object('ok', false, 'reason', 'inactive'); end if;
  if p_stage = 1 then
    if now() < r.starts_at then return jsonb_build_object('ok', false, 'reason', 'not_started'); end if;
    if r.ends_at is not null and now() >= r.ends_at then return jsonb_build_object('ok', false, 'reason', 'expired'); end if;
    if r.max_uses is not null then
      select count(*) into v_used from promo_redemptions where code = r.code and stage = 1;
      if v_used >= r.max_uses then return jsonb_build_object('ok', false, 'reason', 'full'); end if;
    end if;
  elsif r.ends_at is not null and now() >= r.ends_at + interval '7 days' then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  return jsonb_build_object('ok', true, 'code', r.code, 'label', r.label, 'label_en', r.label_en);
end $$;

create or replace function public.promo_gift_claim(p_user uuid, p_code text, p_stage int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_anon  boolean;
  v_prev  text;
  v_chk   jsonb;
  v_got   text;
  v_id    text;
  v_items text[] := _promo_decor_ids();
  v_out   jsonb;
begin
  if p_stage not in (1, 2) then return jsonb_build_object('ok', false, 'reason', 'bad_stage'); end if;
  select u.is_anonymous into v_anon from auth.users u where u.id = p_user;
  if not found then return jsonb_build_object('ok', false, 'reason', 'no_user'); end if;
  v_out := case when p_stage = 2 then to_jsonb(v_items) else '[]'::jsonb end;

  select code into v_prev from promo_redemptions where user_id = p_user and stage = p_stage;
  if found then return jsonb_build_object('ok', true, 'new', false, 'code', v_prev, 'items', v_out); end if;

  if p_stage = 2 and coalesce(v_anon, false) then return jsonb_build_object('ok', false, 'reason', 'anonymous'); end if;

  v_chk := promo_code_check(p_code, p_stage);
  if not (v_chk->>'ok')::boolean then return v_chk; end if;

  insert into promo_redemptions (user_id, stage, code) values (p_user, p_stage, v_chk->>'code')
  on conflict (user_id, stage) do nothing
  returning code into v_got;
  if v_got is null then return jsonb_build_object('ok', true, 'new', false, 'code', v_chk->>'code', 'items', v_out); end if;

  if p_stage = 2 then
    foreach v_id in array v_items loop
      insert into purchases (event_id, transaction_id, user_id, item_id, kind, price_id, amount, occurred_at, source)
      values ('promo_gift:' || p_user || ':' || v_id, 'promo_gift', p_user, v_id, 'decor', 'promo_gift', 0, now(), 'promo')
      on conflict (event_id) do nothing;
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'new', true, 'code', v_got, 'label', v_chk->>'label', 'label_en', v_chk->>'label_en', 'items', v_out);
end $$;

revoke all on function public._promo_decor_ids()                from public, anon, authenticated;
revoke all on function public.promo_code_check(text, int)       from public, anon, authenticated;
revoke all on function public.promo_gift_claim(uuid, text, int) from public, anon, authenticated;
grant execute on function public.promo_code_check(text, int)       to service_role;
grant execute on function public.promo_gift_claim(uuid, text, int) to service_role;

commit;
