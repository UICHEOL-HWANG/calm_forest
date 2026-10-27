alter table public.forage_runs
  add column if not exists homi_tier smallint,
  add column if not exists engraves text[];

alter table public.forage_runs drop constraint if exists forage_runs_homi;
alter table public.forage_runs add constraint forage_runs_homi check (
  (homi_tier is null or homi_tier between 0 and 2)
  and (engraves is null or (cardinality(engraves) <= 2 and engraves <@ array['reach', 'eye', 'spare']::text[]))
);
