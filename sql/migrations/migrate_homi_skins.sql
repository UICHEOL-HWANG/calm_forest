begin;

create or replace function public._premium_cosmetic_ids()
returns text[] language sql immutable set search_path = public as $$
  select array[
    'firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl',
    'forest_spirit', 'plush_doll', 'ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry',
    'tools_shroom', 'tools_moon', 'tools_bloom', 'tools_batnight', 'tools_harvest',
    'bat_wing', 'bat_cape',
    'tools_maple', 'tools_frost', 'tools_honey', 'tools_kitty', 'tools_shell',
    'acorn_cap', 'bee_band', 'kitty_pack', 'nest_pack', 'maple_trail', 'bubble_trail',
    'tools_star', 'friend_wing', 'friend_pin',
    'homi_najeon', 'homi_coral', 'homi_whale'
  ]::text[]
$$;

revoke all on function public._premium_cosmetic_ids() from public, anon, authenticated;

commit;
