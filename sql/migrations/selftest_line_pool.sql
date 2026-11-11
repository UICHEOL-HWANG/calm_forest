do $$
declare a bigint; b bigint; c bigint; first_pick text; again text; hidden_hits int;
begin
  insert into public.line_pool (kind, key, slot, lang, text) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 하나') returning id into a;
  insert into public.line_pool (kind, key, slot, lang, text) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 둘') returning id into b;
  insert into public.line_pool (kind, key, slot, lang, text, hidden) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 숨김', true) returning id into c;
  select string_agg(text, '|' order by text) into first_pick from public.line_pick_many('auction', array['_selftest'], 'ko', '2026-11-10:auction', 1);
  select string_agg(text, '|' order by text) into again from public.line_pick_many('auction', array['_selftest'], 'ko', '2026-11-10:auction', 1);
  if first_pick is distinct from again then raise exception 'pick not deterministic: % vs %', first_pick, again; end if;
  select count(*) into hidden_hits from public.line_pick_many('auction', array['_selftest'], 'ko', 'x', 10) where id = c;
  if hidden_hits <> 0 then raise exception 'hidden line was picked'; end if;
  if (select n from public.line_pool_counts() where key = '_selftest') <> 2 then raise exception 'counts must skip hidden'; end if;
  begin
    insert into public.line_pool (kind, key, slot, lang, text) values ('auction', '_selftest', 'last', 'ko', '셀프테스트 하나');
    raise exception 'duplicate text was accepted';
  exception when unique_violation then null;
  end;
  delete from public.line_pool where key = '_selftest';
  raise notice 'line_pool selftest ok: %', first_pick;
end $$;
