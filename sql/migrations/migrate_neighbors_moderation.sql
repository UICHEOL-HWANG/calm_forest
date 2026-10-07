-- =============================================================
--  🛡️ 이웃 마을 UGC 자율 관리 — 닉네임 금칙어 표시 필터 + 관리자 숨기기
--  ------------------------------------------------------------
--  앱인토스 정책: 이용자 생성 콘텐츠(UGC)를 운영자가 스스로 관리할 수단이 있어야 한다.
--  이 게임의 자유 입력 UGC 는 닉네임 하나뿐이고, 이웃 마을이 그것을 남에게 보여 준다.
--
--  ① village_profiles 에 hidden_by_admin(이웃 목록·구경에서 제외) · nick_hidden(닉네임 가림) 추가
--  ② _nb_nick(state, user) — 남에게 보여 줄 닉네임의 단일 출처.
--       nick_hidden 이거나 금칙어(_nb_nick_blocked)면 '이름 없는 여행자', 아니면 left(trim,16), 비면 '이름 없는 여행자'.
--       neighbors_today · neighbor_showcase · my_visitors 가 모두 이것만 쓴다(인라인 닉네임 식 제거).
--  ③ _nb_candidates · neighbor_showcase 가 hidden_by_admin 을 뺀다 · neighbor_react 는 숨긴 집에 'private'.
--  ④ 관리자 RPC 2종(cf_is_admin 가드, authenticated 만 실행): admin_village_find · admin_village_moderate
--       — user_id·이메일은 응답에 절대 없다(public_id 만).
--
--  ⚠️ 금칙어 패턴은 js/nickname-filter.js NICK_BLOCK_PATTERNS.join('|') 와 글자 그대로 같아야 한다
--     (tests/neighbors-moderation.test.mjs 가 검사). 서버 정규화는 클라보다 단순하다:
--     앞 64자 → NFKC(전각→반각) + 조합용 자모를 호환 자모로 → 소문자 → 한글·영문 외 전부 제거 → 반복 접기. leet(f4ck) 치환은 없다.
--     입력 길이 상한(64·표시 16·관리자 40)은 정규식 비용 상한(클라가 쓰는 닉네임 길이를 믿지 않는다).
--  ⚠️ 이 파일의 함수 본문은 migrate_neighbors.sql(최종 상태)과 글자 그대로 같다 — 새로 깔 땐 그 파일 하나면 된다.
--  적용: migrate_neighbors.sql · migrate_neighbors_sim_split.sql 뒤 1회(멱등) → sql/tests/neighbors_selftest.sql 로 검증
-- =============================================================
begin;

alter table public.village_profiles
  add column if not exists hidden_by_admin boolean not null default false,
  add column if not exists nick_hidden boolean not null default false;

-- 금칙어 판정(서버 쪽 표시 필터) — 패턴 = js/nickname-filter.js NICK_BLOCK_PATTERNS
create or replace function public._nb_nick_blocked(p_nick text)
returns boolean language sql immutable set search_path = public as $$
  -- 앞 64자만(정규식 비용 상한) → NFKC(전각 ｆｕｃｋ → fuck) → 조합용 자모를 호환 자모로 되돌림(NFKC 가 ㅅ→ᄉ 로 바꾼다) → 소문자
  select regexp_replace(regexp_replace(lower(translate(normalize(left(coalesce(p_nick, ''), 64), NFKC),
           'ᄀᄁᄂᄃᄄᄅᄆᄇᄈᄉᄊᄋᄌᄍᄎᄏᄐᄑ하ᅢᅣᅤᅥᅦᅧᅨᅩᅪᅫᅬᅭᅮᅯᅰᅱᅲᅳᅴᅵ',
           'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ')),
           '[^a-z가-힣ㄱ-ㆎ]', '', 'g'), '(.)\1+', '\1', 'g')
         ~* '[시씨쓰]이?[발빨팔]|씨[바빠]|[ㅅㅆ]ㅂ|[ㅅㅆ]발|[시씨]ㅂ|[병븅빙]신|병싄|ㅂㅅ|개[새세쉐섀색][끼기키히]|ㄱㅅㄲ|좆|좃|존나|지랄|ㅈㄹ|미친[놈년새]|썅|씹[새쌔년할창]|느금|니[애에]미|엠창|ㄴㄱㅁ|섹스|쎅스|섹수|보지(?!마|말)|자지(?!마|말)|강간|창녀|야동|포르노|한남충|맘충|급식충|틀딱|김치녀|된장녀|메갈(?!로)|일베|짱깨|쪽바리|깜둥|조센징|히틀러|f[uv]ck|fck|shit(?!ake)|bia?tch|ashole|bastard|cunt|dick|pusy|slut|whore|niger|niga|fagot|retard|nazi|hitler|penis|porn|^sex|sexy|sexual|^rape';
$$;

-- 남에게 보여 줄 닉네임의 단일 출처
create or replace function public._nb_nick(p_state jsonb, p_user uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
           when n.v = '' then '이름 없는 여행자'
           when exists (select 1 from village_profiles vp where vp.user_id = p_user and vp.nick_hidden) then '이름 없는 여행자'
           when _nb_nick_blocked(left(n.v, 16)) then '이름 없는 여행자'
           else left(n.v, 16)
         end
  from (select btrim(case when jsonb_typeof(p_state->'nickname') = 'string' then p_state->>'nickname' else '' end) as v) n;
$$;

-- 후보 = 공개(행 없으면 공개) + 관리자 숨김 아님 + 비익명 + 7일 안에 저장 + 집 1단계 이상 + 본인 제외. 하루 고정 정렬(리롤 불가)
create or replace function public._nb_candidates(p_caller uuid, p_day date, p_limit int default 3)
returns table (uid uuid, k text)
language sql stable security definer set search_path = public as $$
  select gs.user_id, md5(p_caller::text || p_day::text || gs.user_id::text)
  from game_saves gs
  join auth.users u on u.id = gs.user_id
  left join village_profiles vp on vp.user_id = gs.user_id
  where gs.user_id <> p_caller
    and coalesce(u.is_anonymous, false) = false
    and coalesce(vp.is_public, true)
    and not coalesce(vp.hidden_by_admin, false)
    and gs.updated_at >= now() - interval '7 days'
    and case when jsonb_typeof(gs.state->'houseStage') = 'number' then (gs.state->>'houseStage')::numeric >= 1 else false end
    -- 🧑‍🤝‍🧑 페르소나(@sim.calmforest.local)는 페르소나끼리, 실사용자는 실사용자끼리만 만난다
    and (lower(coalesce(u.email, '')) like '%@sim.calmforest.local') = exists (select 1 from auth.users c where c.id = p_caller and lower(coalesce(c.email, '')) like '%@sim.calmforest.local')
  order by 2
  limit greatest(0, least(coalesce(p_limit, 3), 100000));
$$;

create or replace function public.neighbors_today()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_list jsonb;
  v_rew  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  -- 뽑힌 이웃의 프로필 행을 먼저 만든다 — public_id 가 있어야 밖으로 내보낼 수 있다
  insert into village_profiles (user_id) select c.uid from _nb_candidates(v_uid, v_day, 3) c
  on conflict (user_id) do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', vp.public_id,
           'nick', _nb_nick(gs.state, c.uid),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'house_stage', (gs.state->>'houseStage')::numeric::int,
           'decor_n', jsonb_array_length(_nb_yard(gs.state)),
           'visited_today', vv.emoji is not null,
           'reacted_emoji', vv.emoji
         ) order by c.k), '[]'::jsonb)
    into v_list
  from _nb_candidates(v_uid, v_day, 3) c
  join game_saves gs on gs.user_id = c.uid
  join village_profiles vp on vp.user_id = c.uid
  left join village_visits vv on vv.visitor = v_uid and vv.host = c.uid and vv.day = v_day;
  select count(*) into v_rew from village_visits where visitor = v_uid and day = v_day and rewarded;
  return jsonb_build_object('ok', true, 'list', v_list, 'rewarded_today', v_rew);
end $$;

create or replace function public.neighbor_showcase(p_public_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_user uuid; v_pub boolean; v_hid boolean; s jsonb;
begin
  if p_public_id is null then return null; end if;
  select user_id, is_public, hidden_by_admin into v_user, v_pub, v_hid from village_profiles where public_id = p_public_id;
  if not found or not v_pub or v_hid then return null; end if;
  if exists (select 1 from auth.users u where u.id = v_user and coalesce(u.is_anonymous, false)) then return null; end if;
  select state into s from game_saves where user_id = v_user;
  if s is null or jsonb_typeof(s) <> 'object' then return null; end if;
  -- ⚠️ 허용 목록 — 키를 하나씩 고른다. 여기 없는 세이브 필드는 절대 나가지 않는다
  return jsonb_build_object(
    'nickname',   to_jsonb(_nb_nick(s, v_user)),
    'character',  _nb_str(s->'character', 16),
    'equipped',   jsonb_build_object(
                    'head',  _nb_str(s #> '{cosmetics,equipped,head}'),
                    'neck',  _nb_str(s #> '{cosmetics,equipped,neck}'),
                    'back',  _nb_str(s #> '{cosmetics,equipped,back}'),
                    'trail', _nb_str(s #> '{cosmetics,equipped,trail}'),
                    'skin',  _nb_str(s #> '{cosmetics,equipped,skin}')),
    'pet',        case when jsonb_typeof(s->'pet') = 'object'
                    then jsonb_build_object('kind', _nb_str(s #> '{pet,kind}', 16), 'works', _nb_num(s #> '{pet,works}'))
                    else 'null'::jsonb end,
    'houseStage', _nb_num(s->'houseStage'),
    'houseStyle', jsonb_build_object('roof', _nb_num(s #> '{houseStyle,roof}'),
                                     'wall', _nb_num(s #> '{houseStyle,wall}'),
                                     'door', _nb_num(s #> '{houseStyle,door}')),
    'style',      _nb_str(s #> '{house,style}', 16),
    'addons',     (select coalesce(jsonb_agg(q.v), '[]'::jsonb) from (
                     select e.v from jsonb_array_elements(case when jsonb_typeof(s #> '{house,addons}') = 'array'
                                                               then s #> '{house,addons}' else '[]'::jsonb end) as e(v)
                     where jsonb_typeof(e.v) = 'string' and length(e.v #>> '{}') <= 40 limit 40) q),
    'outdoor',    _nb_yard(s),
    'coop',       jsonb_build_object('built', coalesce(s #> '{coop,built}' = 'true'::jsonb, false))
  );
end $$;

create or replace function public.my_visitors(p_since timestamptz)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_since timestamptz := coalesce(p_since, now() - interval '2 days');
  v_total int;
  v_list  jsonb;
  v_pub   boolean;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  insert into village_profiles (user_id) values (v_uid) on conflict (user_id) do nothing;
  select is_public into v_pub from village_profiles where user_id = v_uid;
  select count(distinct visitor) into v_total from village_visits where host = v_uid and created_at > v_since;
  select coalesce(jsonb_agg(jsonb_build_object(
           'nick', _nb_nick(gs.state, x.visitor),
           'character', case when jsonb_typeof(gs.state->'character') = 'string' then left(gs.state->>'character', 16) end,
           'emoji', x.emoji, 'at', x.created_at) order by x.created_at desc), '[]'::jsonb)
    into v_list
  from (
    select dd.visitor, dd.emoji, dd.created_at from (
      select distinct on (v.visitor) v.visitor, v.emoji, v.created_at
      from village_visits v where v.host = v_uid and v.created_at > v_since
      order by v.visitor, v.created_at desc
    ) dd order by dd.created_at desc limit 10
  ) x
  left join game_saves gs on gs.user_id = x.visitor;
  return jsonb_build_object('ok', true, 'total', v_total, 'list', v_list, 'is_public', v_pub);
end $$;

-- 🛡️ 관리자 숨김 집엔 반응을 남길 수 없다(열려 있던 화면의 public_id 로 와도 'private')
create or replace function public.neighbor_react(p_public_id uuid, p_emoji text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_day  date := _nb_kst_today();
  v_host uuid;
  v_pub  boolean;
  v_hid  boolean;
  v_cnt  int;
  v_rew  boolean;
  v_id   bigint;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_emoji is null or p_emoji not in ('wave', 'heart', 'flower', 'star') then return jsonb_build_object('ok', false, 'reason', 'emoji'); end if;
  select user_id, is_public, hidden_by_admin into v_host, v_pub, v_hid from village_profiles where public_id = p_public_id;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_host = v_uid then return jsonb_build_object('ok', false, 'reason', 'self'); end if;
  if not v_pub or v_hid then return jsonb_build_object('ok', false, 'reason', 'private'); end if;   -- 🛡️ 관리자 숨김도 비공개처럼(행·보상 없음)
  perform pg_advisory_xact_lock(hashtext('nb:' || v_uid::text));   -- 동시 반응으로 상한 3을 넘지 않게
  select count(*) into v_cnt from village_visits where visitor = v_uid and day = v_day and rewarded;
  v_rew := v_cnt < 3;
  insert into village_visits (visitor, host, day, emoji, rewarded) values (v_uid, v_host, v_day, p_emoji, v_rew)
  on conflict (visitor, host, day) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'dup', 'rewarded', false, 'rewarded_today', v_cnt);
  end if;
  return jsonb_build_object('ok', true, 'reason', 'ok', 'rewarded', v_rew,
                            'rewarded_today', v_cnt + case when v_rew then 1 else 0 end);
end $$;

-- ── 🛡️ 관리자 RPC — dashboards/notices_admin.html 「🏡 이웃 마을 관리」 ──
-- 저장된 닉네임으로 찾기(최대 20명, 최근 저장 순). 프로필 행이 없으면 만들어 public_id 를 준다. user_id·이메일은 내보내지 않는다.
create or replace function public.admin_village_find(p_nick text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_q    text := btrim(coalesce(p_nick, ''));
  v_ids  uuid[];
  v_list jsonb;
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  if v_q = '' or length(v_q) > 40 then return jsonb_build_object('ok', false, 'reason', 'query'); end if;
  v_q := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';   -- 입력의 % _ 는 글자 그대로
  select array_agg(q.user_id order by q.updated_at desc) into v_ids from (
    select gs.user_id, gs.updated_at
    from game_saves gs join auth.users u on u.id = gs.user_id
    where coalesce(u.is_anonymous, false) = false
      and jsonb_typeof(gs.state->'nickname') = 'string' and gs.state->>'nickname' ilike v_q
    order by gs.updated_at desc limit 20
  ) q;
  insert into village_profiles (user_id) select unnest(coalesce(v_ids, '{}'::uuid[])) on conflict (user_id) do nothing;
  select coalesce(jsonb_agg(jsonb_build_object(
           'public_id', vp.public_id,
           'nick', left(gs.state->>'nickname', 40),
           'house_stage', case when jsonb_typeof(gs.state->'houseStage') = 'number' then (gs.state->>'houseStage')::numeric::int end,
           'hidden_by_admin', vp.hidden_by_admin,
           'nick_hidden', vp.nick_hidden,
           'filtered', _nb_nick_blocked(left(gs.state->>'nickname', 40)),
           'updated_at', gs.updated_at
         ) order by x.ord), '[]'::jsonb)
    into v_list
  from unnest(coalesce(v_ids, '{}'::uuid[])) with ordinality as x(uid, ord)
  join game_saves gs on gs.user_id = x.uid
  join village_profiles vp on vp.user_id = x.uid;
  return jsonb_build_object('ok', true, 'list', v_list);
end $$;

-- 숨기기 플래그 바꾸기 — null 인자는 그대로 둔다
create or replace function public.admin_village_moderate(p_public_id uuid, p_hide boolean, p_hide_nick boolean)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_hid boolean; v_nh boolean;
begin
  if not coalesce(public.cf_is_admin(), false) then return jsonb_build_object('ok', false, 'reason', 'forbidden'); end if;
  update village_profiles
     set hidden_by_admin = coalesce(p_hide, hidden_by_admin),
         nick_hidden     = coalesce(p_hide_nick, nick_hidden),
         updated_at      = now()
   where public_id = p_public_id
  returning hidden_by_admin, nick_hidden into v_hid, v_nh;
  if not found then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'hidden_by_admin', v_hid, 'nick_hidden', v_nh);
end $$;

-- ── 권한 ──
revoke all on function public._nb_nick_blocked(text) from public, anon, authenticated;
revoke all on function public._nb_nick(jsonb, uuid) from public, anon, authenticated;
revoke all on function public._nb_candidates(uuid, date, int) from public, anon, authenticated;
revoke all on function public.admin_village_find(text) from public, anon;
revoke all on function public.admin_village_moderate(uuid, boolean, boolean) from public, anon;
grant execute on function public.admin_village_find(text) to authenticated;
grant execute on function public.admin_village_moderate(uuid, boolean, boolean) to authenticated;

commit;

-- ── 검증 ── sql/tests/neighbors_selftest.sql (⑥ 모더레이션 구간)
