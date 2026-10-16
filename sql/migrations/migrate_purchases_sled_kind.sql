alter table public.purchases drop constraint if exists purchases_kind_check;
alter table public.purchases add constraint purchases_kind_check check (kind in ('cosmetic', 'pet', 'decor', 'sled'));
