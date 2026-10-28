alter table public.sled_runs drop constraint if exists sled_runs_sled;
alter table public.sled_runs add constraint sled_runs_sled check (sled is null or sled in ('basic','sky','forest','starry','worldtree','toboggan','wind','acorn','skiff'));
