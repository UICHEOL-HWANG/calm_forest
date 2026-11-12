# Promo Gift (홍보 링크 선물) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선물 코드가 붙은 홍보 링크로 온 사람에게 게스트 단계 선물(세이브)과 로그인 단계 선물(전용 꾸미기 2종)을 준다.

**Architecture:** DB `promo_codes`·`promo_redemptions` + security definer RPC 가 판정·지급의 진실이고, Worker `/api/promo-gift` 는 JWT 에서 uid 를 꺼내 RPC 만 부른다. 클라이언트 `js/promo-gift/` 는 코드 보관(웹 URL·`/g/` 앱 링크·Play referrer·토스 initialURL·수동 입력) → 게임 진입 뒤 대기 → 단계별 claim → 봉투 창을 맡는다. 가입 선물(`js/signup-gift/`)·앱 초대 링크(`js/referral/`, `functions/invite-link.js`) 구조를 그대로 따른다.

**Tech Stack:** 바닐라 JS ES 모듈, three.js(vendor), Cloudflare Worker, Supabase Postgres(plpgsql), node:test, pg8000(Python 3.8 셀프테스트), Capacitor 8.

**Spec:** `docs/superpowers/specs/2026-11-13-promo-gift-design.md`

## Global Constraints

- 새 코드·CSS·테스트에 **주석 금지**(프로젝트 규칙). 설명은 커밋 메시지·dev docs 로.
- 사용자 문구: 해요체, 엠대시(—) 금지, "놀다" 금지. 새 한국어 문구는 전부 `js/i18n-en.js` 에 영어판. 번역은 DOM 텍스트 노드 전체가 사전 키와 같을 때만 걸리므로 아이콘과 이름은 다른 요소에 넣는다.
- 코드 형식: 대문자 영숫자 4~16자 `^[A-Z0-9]{4,16}$`. 공백·하이픈은 지우고 대문자로 바꾼 뒤 검사.
- 1단계 선물: `{ coins: 200, seed_wheat: 3, seed_corn: 3, seed_grape: 3, fert: 5, bait: 5 }`.
- 2단계 꾸미기 id: `promoballoon`(꼬마 열기구) · `promosuitcase`(여행 가방 더미). purchases event_id `promo_gift:<uid>:<item>`, kind `'decor'`, source `'promo'`, transaction_id·price_id `'promo_gift'`, amount 0.
- 2단계 유예: `ends_at + 7일`. 2단계엔 `max_uses`·`not_started` 를 적용하지 않는다. `active=false` 는 두 단계 모두 즉시 막는다.
- 기기 저장 키(localStorage): `cf_gift_code` · `cf_gift_via` · `cf_gift_stage1_device` · `cf_gift_link_seen`.
- GA4 새 이벤트 3개, 파라미터는 기존 키 재사용: `promo_gift_arrive{code, via}` · `promo_gift_claim{code, step, result}` · `promo_gift_login_click{code}`. (스펙의 `stage` 는 기존 키 `step` 으로 보낸다)
- 2단계 창 버튼은 `확인` 하나. 보관함을 여는 API 가 없어 문구로 "작업대 🧺 보관함"을 안내한다(스펙 6절 "마당에 놓기"를 대체).
- 홍보 선물 창이 가입 선물 상자보다 먼저, 한 번에 창 하나.
- 새 꾸미기 id 가 있으므로 배포는 DB 먼저, 그 뒤 5곳(웹·토스·Play·iOS·itch) 동시.
- 커밋은 워크트리 브랜치에 로컬로만. 푸시·병합·배포·운영 DB 적용은 사용자 승인 후.

## File Structure

| 파일 | 책임 |
|---|---|
| `sql/migrations/migrate_promo_gift.sql` (new) | 표 2개, source CHECK, 가드 목록, RPC 2개 |
| `sql/tests/promo_gift_selftest.py` (new) | 운영 DB 롤백 셀프테스트 |
| `tests/promo-gift-sql.test.mjs` (new) | 마이그레이션 원문 정적 검사 |
| `js/data/reward-decor.js` (mod) | 두 품목 추가 |
| `tests/signup-gift-sql.test.mjs` (mod) | 가드 목록 비교를 promo 이전 품목으로 한정 |
| `js/promo-gift/rules.js` (new) | 순수 규칙: 코드 정규화·파싱·단계 결정·결과 정리 |
| `functions/api/referral.js` (mod) | `verifiedUser` 추가, `verifiedUid` 는 그 위에서 |
| `functions/api/promo-gift.js` (new) | POST check·claim, 2단계 신규면 소식 1건 |
| `functions/invite-link.js` (mod) | `/g/CODE` → `/?gift=CODE` |
| `worker/index.js` (mod) | `/api/promo-gift`·`/g/` 라우트 |
| `assets/well-known/apple-app-site-association`, `android/app/src/main/AndroidManifest.xml` (mod) | `/g/*` 앱 링크 |
| `js/config.js` (mod) | `PROMO_GIFT_API` |
| `js/promo-gift/copy.js` (new) | 봉투·실패·메뉴 문구, `allCopy()` |
| `js/i18n-en.js` (mod) | 영어판 |
| `js/spaces/promo-gift-art.js` (new) | 열기구·가방 더미 3D |
| `js/game.js` (mod) | 꾸미기 메시 분기, `grantItems` |
| `js/promo-gift/flow.js` (new) | 저장소 읽기·쓰기, claim 순서, 지급·표시 호출 |
| `js/promo-gift/ui.js` (new) | 봉투 창·코드 입력 창 DOM |
| `js/promo-gift/index.js` (new) | 부팅 연결·API 호출·대기·onPlay·수동 입력 |
| `js/game-lazy.js` (mod) | `grantItems` 통과 |
| `js/app-banner.js` (mod) | 첫 방문 기록·Play referrer 에 `gift` |
| `index.html` (mod) | 창 마크업·CSS·메뉴 버튼·부팅/onPlay 연결·`ui.connectAccount` |
| `tests/promo-gift-*.test.mjs` (new) | rules·api·link·copy·art·flow·banner·wiring |

**태스크 순서:** 0 → 1 → 2(rules) → 3(api) → 4(link) → 5(copy) → 6(art) → 7(flow) → 8(ui·wiring) → 9(검증) → 10(배포). 2번이 3·4번이 쓰는 함수를 만든다.

---

### Task 0: 워크트리

- [ ] **Step 1: main 최신 확인 후 워크트리 생성**

```bash
cd /Users/uicheol_hwang/calm_forest
git log --oneline -3
git worktree add -b feat/promo-gift .claude/worktrees/promo-gift main
cd .claude/worktrees/promo-gift
ln -s /Users/uicheol_hwang/calm_forest/node_modules node_modules
npm test 2>&1 | grep -E "^# (pass|fail)"
```
Expected: 로그에 `6cda473e docs: promo gift…` 가 보이고 `# fail 0`.

- [ ] **Step 2: 미리보기 서버 등록** — 루트 `/Users/uicheol_hwang/calm_forest/.claude/launch.json` 의 `configurations` 배열 끝에 추가(이 파일은 다른 세션도 쓰므로 커밋하지 않는다):

```json
    {
      "name": "promo-gift",
      "runtimeExecutable": "python3",
      "runtimeArgs": ["/Users/uicheol_hwang/calm_forest/.claude/worktrees/promo-gift/scripts/serve.py", "8895"],
      "port": 8895
    }
```

---

### Task 1: DB 마이그레이션

**Files:**
- Create: `sql/migrations/migrate_promo_gift.sql`
- Create: `tests/promo-gift-sql.test.mjs`
- Create: `sql/tests/promo_gift_selftest.py`
- Modify: `js/data/reward-decor.js` (`giftlantern` 줄 다음)
- Modify: `tests/signup-gift-sql.test.mjs:11`

**Interfaces:**
- Produces: `promo_code_check(p_code text, p_stage int default 1) → jsonb {ok:true, code, label, label_en} | {ok:false, reason}` · `promo_gift_claim(p_user uuid, p_code text, p_stage int) → jsonb {ok:true, new, code, label?, label_en?, items[]} | {ok:false, reason}` · reason ∈ `unknown|inactive|not_started|expired|full|anonymous|no_user|bad_stage`
- Produces: `REWARD_DECOR` 에 `{ id:'promoballoon', reward:'promo' }`, `{ id:'promosuitcase', reward:'promo' }`

- [ ] **Step 1: 정적 테스트 작성** `tests/promo-gift-sql.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const SQL = readFileSync(new URL('../sql/migrations/migrate_promo_gift.sql', import.meta.url), 'utf8');
const ids = (s) => [...s.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);
const fn = (name) => SQL.match(new RegExp(`create or replace function public\\.${name}[\\s\\S]*?end \\$\\$;`))[0];

test('가드 목록은 보상 장식 전부, 선물 목록은 promo 두 개', () => {
  const guard = SQL.match(/_reward_decor_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(guard), REWARD_DECOR.map(d => d.id));
  const promo = SQL.match(/_promo_decor_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(promo), ['promoballoon', 'promosuitcase']);
  assert.deepEqual(REWARD_DECOR.filter(d => d.reward === 'promo').map(d => d.id), ['promoballoon', 'promosuitcase']);
});

test('원장 출처에 promo 를 더하고 기존 값을 유지한다', () => {
  assert.match(SQL, /purchases_source_check check \(source in \('paddle', 'referral', 'signup', 'promo'\)\)/);
});

test('두 표는 RLS 를 켜고 일반 역할 접근을 막는다', () => {
  for (const t of ['promo_codes', 'promo_redemptions']) {
    assert.match(SQL, new RegExp(`create table if not exists public\\.${t}`));
    assert.match(SQL, new RegExp(`alter table public\\.${t} enable row level security`));
    assert.match(SQL, new RegExp(`revoke all on public\\.${t} from anon, authenticated`));
  }
  assert.ok(SQL.includes("check (code ~ '^[A-Z0-9]{4,16}$')"));
  assert.match(SQL, /primary key \(user_id, stage\)/);
});

test('check 는 단계별로 기간·한도를 다르게 본다', () => {
  const f = fn('promo_code_check');
  for (const r of ['unknown', 'inactive', 'not_started', 'expired', 'full']) assert.match(f, new RegExp(`'${r}'`));
  assert.match(f, /interval '7 days'/);
  assert.match(f, /stage = 1/);
});

test('claim 은 익명 2단계를 막고 단계당 한 번만 기록하고 promo 원장을 남긴다', () => {
  const f = fn('promo_gift_claim');
  assert.match(f, /security definer/);
  assert.match(f, /'anonymous'/);
  assert.match(f, /'bad_stage'/);
  assert.match(f, /on conflict \(user_id, stage\) do nothing/);
  assert.ok(f.includes("'promo_gift:' || p_user || ':' || v_id"));
  assert.match(f, /on conflict \(event_id\) do nothing/);
  assert.match(f, /'promo'\)/);
});

test('RPC 는 service_role 만 실행한다', () => {
  for (const name of ['promo_code_check(text, int)', 'promo_gift_claim(uuid, text, int)', '_promo_decor_ids()']) {
    assert.ok(SQL.includes(`revoke all on function public.${name}`), name);
  }
  assert.doesNotMatch(SQL, /grant execute on function public\.\w+\([^)]*\)\s+to (anon|authenticated)/);
  assert.match(SQL, /grant execute on function public\.promo_gift_claim\(uuid, text, int\)\s+to service_role;/);
  assert.match(SQL, /grant execute on function public\.promo_code_check\(text, int\)\s+to service_role;/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-sql.test.mjs`
Expected: FAIL `ENOENT ... migrate_promo_gift.sql`

- [ ] **Step 3: 마이그레이션 작성** `sql/migrations/migrate_promo_gift.sql`

```sql
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
```

`max_uses` 는 동시 요청 때 한두 명 넘칠 수 있다(잠금 없음). 선착순 선물이라 허용하고 커밋 메시지에 적는다.

- [ ] **Step 4: 보상 장식 목록에 두 품목 추가** — `js/data/reward-decor.js` 의 `REWARD_DECOR` 배열에서 `giftlantern` 줄 다음에:

```js
  Object.freeze({ id: 'promoballoon', name: '꼬마 열기구', ico: '🎈', cost: { leaf: 9999 }, desc: '링크 선물. 줄무늬 열기구가 말뚝에 매여 있어요', hidden: true, reward: 'promo' }),
  Object.freeze({ id: 'promosuitcase', name: '여행 가방 더미', ico: '🧳', cost: { leaf: 9999 }, desc: '링크 선물. 꼬리표 붙은 여행 가방 세 개', hidden: true, reward: 'promo' }),
```

- [ ] **Step 5: 가입 선물 SQL 테스트를 그 마이그레이션 시점 품목으로 한정** — `tests/signup-gift-sql.test.mjs:11` 을:

```js
  assert.deepEqual(ids(decor), REWARD_DECOR.filter(d => d.reward !== 'promo').map(d => d.id));
```

- [ ] **Step 6: 통과 확인**

Run: `node --test tests/promo-gift-sql.test.mjs tests/signup-gift-sql.test.mjs tests/referral-items.test.mjs`
Expected: 전부 PASS

- [ ] **Step 7: 운영 롤백 셀프테스트 작성** `sql/tests/promo_gift_selftest.py`

```python
import os
import re
import ssl
import sys
import uuid
from typing import Optional

import pg8000.native

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MIG = os.path.join(ROOT, 'sql', 'migrations', 'migrate_promo_gift.sql')


def env_pw() -> str:
    path = os.environ.get('CALM_ENV') or os.path.join(ROOT, '.env')
    for line in open(path, encoding='utf-8'):
        if line.startswith('SUPABASE_DB_PASSWORD='):
            return line.split('=', 1)[1].strip().strip('"').strip("'")
    raise SystemExit('no SUPABASE_DB_PASSWORD')


def connect() -> pg8000.native.Connection:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return pg8000.native.Connection(
        user='postgres.zuyxgjfihxtfdpolljzw', password=env_pw(),
        host='aws-1-ap-northeast-2.pooler.supabase.com', port=5432,
        database='postgres', ssl_context=ctx)


def migration_body() -> str:
    sql = open(MIG, encoding='utf-8').read()
    return re.sub(r'^\s*(begin|commit);\s*$', '', sql, flags=re.M | re.I)


def check(cond: bool, msg: str) -> bool:
    print(('PASS ' if cond else 'FAIL ') + msg)
    return cond


def new_user(con: pg8000.native.Connection, anon: bool = False) -> str:
    uid = str(uuid.uuid4())
    con.run("""insert into auth.users (id, aud, role, email, is_anonymous, created_at, updated_at)
               values (cast(:u as uuid), 'authenticated', 'authenticated', :e, :a, now(), now())""",
            u=uid, e=None if anon else f'selftest-{uid[:8]}@selftest.invalid', a=anon)
    return uid


def add_code(con: pg8000.native.Connection, c: str, starts: str = '-1 day', ends: Optional[str] = '30 days',
             max_uses: Optional[int] = None, active: bool = True) -> None:
    con.run("""insert into promo_codes (code, label, label_en, starts_at, ends_at, max_uses, active)
               values (:c, '셀프테스트', 'selftest', now() + cast(:s as interval),
                       now() + cast(:e as interval), :m, :a)""",
            c=c, s=starts, e=ends, m=max_uses, a=active)
    if ends is None:
        con.run('update promo_codes set ends_at = null where code = :c', c=c)


def claim(con: pg8000.native.Connection, uid: str, c: str, stage: int) -> dict:
    return con.run('select public.promo_gift_claim(cast(:u as uuid), :c, :s)', u=uid, c=c, s=stage)[0][0]


def run_checks(con: pg8000.native.Connection) -> bool:
    ok = True
    add_code(con, 'STOK')
    add_code(con, 'STOLD', starts='-40 days', ends='-3 days')
    add_code(con, 'STGONE', starts='-40 days', ends='-10 days')
    add_code(con, 'STSOON', starts='1 day')
    add_code(con, 'STFULL', max_uses=1)
    add_code(con, 'STOFF', active=False)
    add_code(con, 'STNOEND', ends=None)

    guest = new_user(con, anon=True)
    r = claim(con, guest, 'STOK', 1)
    ok &= check(r['ok'] and r['new'] and r['label'] == '셀프테스트', '게스트 1단계 신규 지급')
    ok &= check(not claim(con, guest, 'STOK', 1)['new'], '게스트 1단계 두 번째는 new=false')
    ok &= check(claim(con, guest, 'STOK', 2).get('reason') == 'anonymous', '게스트 2단계 거절')

    member = new_user(con)
    r = claim(con, member, 'stok', 2)
    ok &= check(r['ok'] and r['new'] and r['items'] == ['promoballoon', 'promosuitcase'], '로그인 2단계 지급(소문자 코드 허용)')
    rows = con.run('select item_id, source from purchases where user_id = cast(:u as uuid) order by item_id', u=member)
    ok &= check(rows == [['promoballoon', 'promo'], ['promosuitcase', 'promo']], '원장 두 줄 source promo')
    ok &= check(not claim(con, member, 'STOK', 2)['new'], '2단계 두 번째는 new=false')
    n = con.run('select count(*) from purchases where user_id = cast(:u as uuid)', u=member)[0][0]
    ok &= check(n == 2, '원장 중복 없음')

    cases = [('NOPE', 1, 'unknown'), ('STOFF', 1, 'inactive'), ('STOFF', 2, 'inactive'),
             ('STSOON', 1, 'not_started'), ('STOLD', 1, 'expired'), ('STGONE', 2, 'expired')]
    for c, stage, reason in cases:
        ok &= check(claim(con, new_user(con), c, stage).get('reason') == reason, f'{c} 단계{stage} → {reason}')
    ok &= check(claim(con, new_user(con), 'STOLD', 2)['ok'], '종료 3일 뒤 2단계는 유예로 지급')
    ok &= check(claim(con, new_user(con), 'STSOON', 2)['ok'], '시작 전 코드도 2단계는 지급')
    ok &= check(claim(con, new_user(con, anon=True), 'STNOEND', 1)['ok'], '종료일 없는 코드')

    ok &= check(claim(con, new_user(con, anon=True), 'STFULL', 1)['new'], '선착순 1명 지급')
    ok &= check(claim(con, new_user(con, anon=True), 'STFULL', 1).get('reason') == 'full', '두 번째는 full')
    ok &= check(claim(con, new_user(con), 'STOK', 3).get('reason') == 'bad_stage', '단계 3 거절')

    guard = con.run('select public._reward_decor_ids()')[0][0]
    ok &= check('promoballoon' in guard and 'promosuitcase' in guard and 'friendarch' in guard, '가드 목록')
    return ok


def main() -> None:
    apply = '--apply' in sys.argv
    live = '--live' in sys.argv
    if apply and live:
        raise SystemExit('--live 와 --apply 는 같이 쓸 수 없다')
    con = connect()
    con.run('begin')
    try:
        if not live:
            con.run(migration_body())
        ok = run_checks(con)
    finally:
        con.run('rollback')
    left = con.run("select count(*) from auth.users where email like 'selftest-%@selftest.invalid'")[0][0]
    ok &= check(left == 0, f'잔여 selftest 계정 = {left}')
    if ok and apply:
        con.run('begin')
        con.run(migration_body())
        con.run('commit')
        print('APPLIED migrate_promo_gift.sql')
    print('ALL PASS' if ok else 'SOME FAILED')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
```

- [ ] **Step 8: 운영 DB 롤백 테스트(적용 안 함)**

Run: `CALM_ENV=/Users/uicheol_hwang/calm_forest/.env python3 sql/tests/promo_gift_selftest.py`
Expected: 마지막 두 줄 `PASS 잔여 selftest 계정 = 0`, `ALL PASS`. (`--apply` 는 Task 10 에서 승인 후)

- [ ] **Step 9: 커밋**

```bash
git add sql/migrations/migrate_promo_gift.sql sql/tests/promo_gift_selftest.py tests/promo-gift-sql.test.mjs tests/signup-gift-sql.test.mjs js/data/reward-decor.js
git commit -m "feat(promo-gift): promo code tables and claim RPCs"
```

---

### Task 2: 클라이언트 규칙

**Files:**
- Create: `js/promo-gift/rules.js`
- Test: `tests/promo-gift-rules.test.mjs`

**Interfaces:**
- Produces:
  - `STAGE1_BUNDLE` · `PROMO_DECOR_IDS = ['promoballoon','promosuitcase']` · `KEYS = { code, via, device, seen }` · `VIAS = ['url','deeplink','referrer','toss','manual']`
  - `normalizeGiftCode(text) → string|null`
  - `readGiftParam(search) → string|null` — `/g/CODE` 경로 또는 `gift=` 쿼리. 쿼리만·전체 URL·스킴 URL 모두
  - `giftFromReferrer(raw) → string|null` — Play referrer 원문(%3D 인코딩 허용)
  - `nextClaims({ isGuest, provider, stage1Device, hasCode }) → number[]`
  - `settle(stage, res) → { result, keep, mark, show, stop }`

- [ ] **Step 1: 테스트 작성** `tests/promo-gift-rules.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE1_BUNDLE, PROMO_DECOR_IDS, KEYS, VIAS, normalizeGiftCode, readGiftParam, giftFromReferrer, nextClaims, settle } from '../js/promo-gift/rules.js';

test('상수', () => {
  assert.deepEqual({ ...STAGE1_BUNDLE }, { coins: 200, seed_wheat: 3, seed_corn: 3, seed_grape: 3, fert: 5, bait: 5 });
  assert.deepEqual([...PROMO_DECOR_IDS], ['promoballoon', 'promosuitcase']);
  assert.deepEqual({ ...KEYS }, { code: 'cf_gift_code', via: 'cf_gift_via', device: 'cf_gift_stage1_device', seen: 'cf_gift_link_seen' });
  assert.deepEqual([...VIAS], ['url', 'deeplink', 'referrer', 'toss', 'manual']);
});

test('normalizeGiftCode', () => {
  assert.equal(normalizeGiftCode(' autumn-24 '), 'AUTUMN24');
  assert.equal(normalizeGiftCode('ab cd'), 'ABCD');
  for (const bad of ['', null, undefined, 'ABC', 'A'.repeat(17), 'ABC!', '가나다라']) assert.equal(normalizeGiftCode(bad), null, String(bad));
});

test('readGiftParam — 경로·쿼리·전체 URL·스킴 URL', () => {
  assert.equal(readGiftParam('?gift=insta1'), 'INSTA1');
  assert.equal(readGiftParam('?utm_source=meta&gift=INSTA1#x'), 'INSTA1');
  assert.equal(readGiftParam('/g/INSTA1'), 'INSTA1');
  assert.equal(readGiftParam('https://calmforest.cloud/g/INSTA1?utm_source=x'), 'INSTA1');
  assert.equal(readGiftParam('intoss://calmforest?gift=INSTA1'), 'INSTA1');
  assert.equal(readGiftParam('?invite=ABCD2345'), null);
  assert.equal(readGiftParam('/i/ABCD2345'), null);
  assert.equal(readGiftParam(''), null);
  assert.equal(readGiftParam(null), null);
});

test('giftFromReferrer — 평문·인코딩', () => {
  assert.equal(giftFromReferrer('utm_source=web_banner&gift=INSTA1'), 'INSTA1');
  assert.equal(giftFromReferrer('utm_source%3Dweb_banner%26gift%3DINSTA1'), 'INSTA1');
  assert.equal(giftFromReferrer('utm_source=google-play&utm_medium=organic'), null);
  assert.equal(giftFromReferrer(''), null);
});

test('nextClaims', () => {
  assert.deepEqual(nextClaims({ hasCode: false, isGuest: true, provider: 'anonymous', stage1Device: false }), []);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: true, provider: 'offline', stage1Device: false }), []);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: true, provider: 'anonymous', stage1Device: false }), [1]);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: true, provider: 'anonymous', stage1Device: true }), []);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: false, provider: 'email', stage1Device: true }), [2]);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: false, provider: 'google', stage1Device: false }), [1, 2]);
});

test('settle — 결과별 코드 보관·기기 표시·창·중단', () => {
  assert.deepEqual(settle(1, null), { result: 'net_fail', keep: true, mark: false, show: null, stop: true });
  assert.deepEqual(settle(1, { error: 502 }), { result: 'net_fail', keep: true, mark: false, show: null, stop: true });
  assert.deepEqual(settle(1, { ok: true, new: true }), { result: 'new', keep: true, mark: true, show: 1, stop: false });
  assert.deepEqual(settle(1, { ok: true, new: false }), { result: 'dup', keep: true, mark: true, show: null, stop: false });
  assert.deepEqual(settle(2, { ok: true, new: true }), { result: 'new', keep: false, mark: false, show: 2, stop: false });
  assert.deepEqual(settle(2, { ok: true, new: false }), { result: 'dup', keep: false, mark: false, show: null, stop: false });
  assert.deepEqual(settle(2, { ok: false, reason: 'anonymous' }), { result: 'anonymous', keep: true, mark: false, show: null, stop: true });
  assert.deepEqual(settle(1, { ok: false, reason: 'not_started' }), { result: 'not_started', keep: true, mark: false, show: null, stop: true });
  for (const r of ['unknown', 'inactive', 'expired', 'full', 'bad_code']) {
    assert.deepEqual(settle(1, { ok: false, reason: r }), { result: r, keep: false, mark: false, show: null, stop: true }, r);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-rules.test.mjs`
Expected: FAIL `Cannot find module .../js/promo-gift/rules.js`

- [ ] **Step 3: 구현** `js/promo-gift/rules.js`

```js
const CODE_RE = /^[A-Z0-9]{4,16}$/;
const PATH_RE = /\/g\/([A-Za-z0-9-]{4,20})(?=[/?#]|$)/;
const KEEP_REASONS = new Set(['anonymous', 'not_started', 'no_user']);

export const STAGE1_BUNDLE = Object.freeze({ coins: 200, seed_wheat: 3, seed_corn: 3, seed_grape: 3, fert: 5, bait: 5 });
export const PROMO_DECOR_IDS = Object.freeze(['promoballoon', 'promosuitcase']);
export const KEYS = Object.freeze({ code: 'cf_gift_code', via: 'cf_gift_via', device: 'cf_gift_stage1_device', seen: 'cf_gift_link_seen' });
export const VIAS = Object.freeze(['url', 'deeplink', 'referrer', 'toss', 'manual']);

export function normalizeGiftCode(text) {
  const s = String(text ?? '').trim().replace(/[\s-]+/g, '').toUpperCase();
  return CODE_RE.test(s) ? s : null;
}

export function readGiftParam(search) {
  const str = String(search || '').split('#')[0];
  const path = str.match(PATH_RE);
  if (path) return normalizeGiftCode(path[1]);
  const q = str.indexOf('?');
  try { return normalizeGiftCode(new URLSearchParams(q >= 0 ? str.slice(q) : str).get('gift')); } catch (e) { return null; }
}

export function giftFromReferrer(raw) {
  let text = String(raw || '').trim();
  if (!text) return null;
  if (!text.includes('=') && /%3d/i.test(text)) {
    try { text = decodeURIComponent(text); } catch (e) { return null; }
  }
  try { return normalizeGiftCode(new URLSearchParams(text).get('gift')); } catch (e) { return null; }
}

export function nextClaims({ isGuest, provider, stage1Device, hasCode }) {
  if (!hasCode || provider === 'offline') return [];
  const guest = !!isGuest || provider === 'anonymous';
  if (guest) return stage1Device ? [] : [1];
  return stage1Device ? [2] : [1, 2];
}

export function settle(stage, res) {
  if (!res || res.error) return { result: 'net_fail', keep: true, mark: false, show: null, stop: true };
  if (res.ok) return { result: res.new ? 'new' : 'dup', keep: stage === 1, mark: stage === 1, show: res.new ? stage : null, stop: false };
  const reason = String(res.reason || 'unknown');
  return { result: reason, keep: KEEP_REASONS.has(reason), mark: false, show: null, stop: true };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/promo-gift-rules.test.mjs`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add js/promo-gift/rules.js tests/promo-gift-rules.test.mjs
git commit -m "feat(promo-gift): gift code parsing and claim rules"
```

---

### Task 3: Worker API

**Files:**
- Modify: `functions/api/referral.js:49-60` (`verifiedUid` 함수 전체)
- Create: `functions/api/promo-gift.js`
- Modify: `worker/index.js` (signup-gift import 다음 줄, `/api/signup-gift` 블록 다음)
- Modify: `js/config.js` (`SIGNUP_GIFT_API` 줄 다음)
- Test: `tests/promo-gift-api.test.mjs`

**Interfaces:**
- Consumes: Task 1 RPC `promo_code_check({p_code, p_stage})`, `promo_gift_claim({p_user, p_code, p_stage})` · Task 2 `normalizeGiftCode`
- Produces: `POST /api/promo-gift` body `{action:'check'|'claim', code, stage}` → RPC 응답 그대로 / 400 `{ok:false, reason:'bad_code'}` / 400 `{error:'bad_stage'|'bad_action'|'bad_json'}` / 401 / 502 / 503 · `verifiedUser(env, request, fetchImpl) → {id, anonymous}|null` · `PROMO_NOTICE` · `CONFIG.PROMO_GIFT_API`

- [ ] **Step 1: 테스트 작성** `tests/promo-gift-api.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost, PROMO_NOTICE } from '../functions/api/promo-gift.js';
import { verifiedUid } from '../functions/api/referral.js';

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };

function req(body, { token = 'tok' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://calm.test/api/promo-gift', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

function fakeFetch({ user = { id: UID, is_anonymous: false }, out = { ok: true, new: true }, rpcStatus = 200 } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
    if (u.endsWith('/auth/v1/user')) return user ? new Response(JSON.stringify(user), { status: 200 }) : new Response('', { status: 401 });
    if (u.includes('/rest/v1/rpc/')) return new Response(JSON.stringify(out), { status: rpcStatus });
    if (u.endsWith('/rest/v1/notices')) return new Response('', { status: 201 });
    return new Response('', { status: 404 });
  };
  f.calls = calls;
  return f;
}
const call = (f, body, opts) => onRequestPost({ request: req(body, opts), env, fetchImpl: f });
const rpcOf = (f) => f.calls.find(c => c.url.includes('/rest/v1/rpc/'));

test('설정이 없으면 503', async () => {
  const r = await onRequestPost({ request: req({ action: 'check', code: 'ABCD' }), env: { ...env, SUPABASE_SERVICE_KEY: '' }, fetchImpl: fakeFetch() });
  assert.equal(r.status, 503);
});

test('나쁜 본문·action·코드·단계는 400 이고 RPC 를 안 부른다', async () => {
  for (const body of ['not json', { action: 'nope', code: 'ABCD' }, { action: 'check', code: 'A' }, { action: 'claim', code: 'ABCD', stage: 3 }]) {
    const f = fakeFetch();
    assert.equal((await call(f, body)).status, 400, JSON.stringify(body));
    assert.equal(rpcOf(f), undefined);
  }
});

test('토큰이 없으면 401', async () => {
  assert.equal((await call(fakeFetch(), { action: 'check', code: 'ABCD' }, { token: null })).status, 401);
});

test('게스트(익명)는 1단계는 되고 2단계는 RPC 전에 막는다', async () => {
  const anon = { id: UID, is_anonymous: true };
  const f1 = fakeFetch({ user: anon });
  await call(f1, { action: 'claim', code: 'abcd', stage: 1 });
  assert.deepEqual(rpcOf(f1).body, { p_user: UID, p_code: 'ABCD', p_stage: 1 });
  const f2 = fakeFetch({ user: anon });
  assert.deepEqual(await (await call(f2, { action: 'claim', code: 'ABCD', stage: 2 })).json(), { ok: false, reason: 'anonymous' });
  assert.equal(rpcOf(f2), undefined);
});

test('check 는 promo_code_check 를 1단계로 부른다', async () => {
  const f = fakeFetch({ out: { ok: true, code: 'ABCD', label: 'L', label_en: 'E' } });
  const r = await (await call(f, { action: 'check', code: 'ab-cd' })).json();
  assert.ok(rpcOf(f).url.endsWith('/rpc/promo_code_check'));
  assert.deepEqual(rpcOf(f).body, { p_code: 'ABCD', p_stage: 1 });
  assert.equal(r.label, 'L');
});

test('uid 는 JWT 에서만 꺼낸다', async () => {
  const f = fakeFetch();
  await call(f, { action: 'claim', code: 'ABCD', stage: 2, user: 'someone-else' });
  assert.equal(rpcOf(f).body.p_user, UID);
});

test('2단계 신규 지급일 때만 소식 1건', async () => {
  const f1 = fakeFetch({ out: { ok: true, new: true, items: ['promoballoon', 'promosuitcase'] } });
  await call(f1, { action: 'claim', code: 'ABCD', stage: 2 });
  const n = f1.calls.filter(c => c.url.endsWith('/rest/v1/notices'));
  assert.equal(n.length, 1);
  assert.deepEqual(n[0].body, [{ ...PROMO_NOTICE, target_user_id: UID }]);
  for (const [stage, out] of [[2, { ok: true, new: false }], [1, { ok: true, new: true }]]) {
    const f = fakeFetch({ out });
    await call(f, { action: 'claim', code: 'ABCD', stage });
    assert.equal(f.calls.filter(c => c.url.endsWith('/rest/v1/notices')).length, 0);
  }
});

test('RPC 실패는 502', async () => {
  assert.equal((await call(fakeFetch({ rpcStatus: 500 }), { action: 'claim', code: 'ABCD', stage: 1 })).status, 502);
});

test('verifiedUid 는 여전히 익명을 막는다', async () => {
  const r = (u) => verifiedUid(env, req({}), fakeFetch({ user: u }));
  assert.equal(await r({ id: UID, is_anonymous: true }), null);
  assert.equal(await r({ id: UID, is_anonymous: false }), UID);
});

test('소식 문구에 엠대시가 없고 영어판이 있다', () => {
  for (const k of ['title', 'body']) {
    assert.doesNotMatch(PROMO_NOTICE[k], /—/);
    assert.ok(PROMO_NOTICE[`${k}_en`]);
  }
});

test('worker 가 /api/promo-gift 를 POST 로만 연결하고 config 에 주소가 있다', () => {
  const w = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(w, /import \{ onRequestPost as promoGift \} from '\.\.\/functions\/api\/promo-gift\.js';/);
  assert.match(w, /if \(pathname === '\/api\/promo-gift'\) \{\s*if \(request\.method !== 'POST'\)[^\n]*\n\s*return await promoGift\(\{ request, env \}\);/);
  const c = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.match(c, /PROMO_GIFT_API: `\$\{API_BASE\}\/api\/promo-gift`/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-api.test.mjs`
Expected: FAIL `Cannot find module .../functions/api/promo-gift.js`

- [ ] **Step 3: `verifiedUser` 추가** — `functions/api/referral.js` 의 `export async function verifiedUid(...) { … }` 전체(49~60행)를 다음으로 바꾼다:

```js
export async function verifiedUser(env, request, fetchImpl) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? { id: u.id, anonymous: !!u.is_anonymous } : null;
  } catch (e) { return null; }
}

export async function verifiedUid(env, request, fetchImpl) {
  const u = await verifiedUser(env, request, fetchImpl);
  return u && !u.anonymous ? u.id : null;
}
```

- [ ] **Step 4: API 작성** `functions/api/promo-gift.js`

```js
import { json, verifiedUser, serviceHeaders, rpc } from './referral.js';
import { normalizeGiftCode } from '../../js/promo-gift/rules.js';

const TIMEOUT_MS = 8000;
const ACTIONS = new Set(['check', 'claim']);

export const PROMO_NOTICE = Object.freeze({
  title: '🎈 약속한 꾸미기 세트가 도착했어요',
  body: '꼬마 열기구와 여행 가방 더미를 작업대 🧺 보관함에 넣어 뒀어요. 마당에 놓아 보세요.',
  title_en: '🎈 Your promised decor set has arrived',
  body_en: 'We put the Little Hot-Air Balloon and the Suitcase Stack in the Workbench 🧺 storage. Place them in your yard.',
});

const log = (o) => console.log(JSON.stringify({ evt: 'promo_gift', ...o }));

async function sendNotice(env, fetchImpl, uid) {
  try {
    const r = await fetchImpl(`${env.SUPABASE_URL}/rest/v1/notices`, {
      method: 'POST', headers: { ...serviceHeaders(env), prefer: 'return=minimal' },
      body: JSON.stringify([{ ...PROMO_NOTICE, target_user_id: uid }]), signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!r.ok) log({ status: 'notice_fail', http: r.status });
  } catch (e) {
    log({ status: 'notice_throw', msg: String(e?.message || e).slice(0, 200) });
  }
}

export async function onRequestPost({ request, env, fetchImpl = fetch }) {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_KEY) {
    log({ status: 'not_configured' });
    return json({ error: 'not configured' }, 503);
  }
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }
  if (!ACTIONS.has(body?.action)) return json({ error: 'bad_action' }, 400);
  const code = normalizeGiftCode(body.code);
  if (!code) return json({ ok: false, reason: 'bad_code' }, 400);
  const stage = body.action === 'check' ? 1 : Number(body.stage);
  if (stage !== 1 && stage !== 2) return json({ error: 'bad_stage' }, 400);

  const user = await verifiedUser(env, request, fetchImpl);
  if (!user) return json({ error: 'login_required' }, 401);
  if (body.action === 'claim' && stage === 2 && user.anonymous) return json({ ok: false, reason: 'anonymous' });

  try {
    if (body.action === 'check') return json(await rpc(env, fetchImpl, 'promo_code_check', { p_code: code, p_stage: 1 }));
    const out = await rpc(env, fetchImpl, 'promo_gift_claim', { p_user: user.id, p_code: code, p_stage: stage });
    if (out?.ok && out.new) log({ status: 'granted', stage, code });
    if (out?.ok && out.new && stage === 2) await sendNotice(env, fetchImpl, user.id);
    return json(out);
  } catch (e) {
    log({ status: 'rpc_fail', msg: String(e?.message || e).slice(0, 200) });
    return json({ error: 'upstream' }, 502);
  }
}
```

- [ ] **Step 5: 라우트·설정**

`worker/index.js` — `import { onRequestPost as signupGift } from '../functions/api/signup-gift.js';` 다음 줄에:

```js
import { onRequestPost as promoGift } from '../functions/api/promo-gift.js';
```

같은 파일 `/api/signup-gift` 블록 바로 다음에:

```js
  if (pathname === '/api/promo-gift') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    return await promoGift({ request, env });
  }
```

`js/config.js` — `SIGNUP_GIFT_API: …,` 줄 다음에:

```js
  PROMO_GIFT_API: `${API_BASE}/api/promo-gift`,
```

- [ ] **Step 6: 통과 확인(기존 추천·가입 선물 API 포함)**

Run: `node --test tests/promo-gift-api.test.mjs tests/referral-api.test.mjs tests/signup-gift-api.test.mjs`
Expected: 전부 PASS

- [ ] **Step 7: 커밋**

```bash
git add functions/api/referral.js functions/api/promo-gift.js worker/index.js js/config.js tests/promo-gift-api.test.mjs
git commit -m "feat(promo-gift): /api/promo-gift check and claim"
```

---

### Task 4: `/g/CODE` 링크와 앱 링크

**Files:**
- Modify: `functions/invite-link.js`
- Modify: `worker/index.js` (invite-link import 줄, `/i/` 라우트 줄 다음)
- Modify: `assets/well-known/apple-app-site-association`
- Modify: `android/app/src/main/AndroidManifest.xml` (`/i/` intent-filter 안)
- Test: `tests/promo-gift-link.test.mjs`

**Interfaces:**
- Consumes: Task 2 `readGiftParam`
- Produces: `giftLinkTarget(pathname) → '/?gift=CODE' | '/'` · `onGiftRequestGet({ request }) → 302|405`

- [ ] **Step 1: 테스트 작성** `tests/promo-gift-link.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { giftLinkTarget, onGiftRequestGet } from '../functions/invite-link.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('giftLinkTarget — /g/CODE 는 ?gift= 로, 나머지는 /', () => {
  assert.equal(giftLinkTarget('/g/autumn24'), '/?gift=AUTUMN24');
  assert.equal(giftLinkTarget('/g/AB'), '/');
  assert.equal(giftLinkTarget('/g/'), '/');
});

test('302 로 보내고 utm 은 남기고 gift 는 하나만', async () => {
  const r = await onGiftRequestGet({ request: new Request('https://calmforest.cloud/g/AUTUMN24?utm_source=meta&gift=EVIL') });
  assert.equal(r.status, 302);
  const loc = new URL(r.headers.get('Location'));
  assert.deepEqual(loc.searchParams.getAll('gift'), ['AUTUMN24']);
  assert.equal(loc.searchParams.get('utm_source'), 'meta');
});

test('POST 는 405', async () => {
  const r = await onGiftRequestGet({ request: new Request('https://calmforest.cloud/g/AUTUMN24', { method: 'POST' }) });
  assert.equal(r.status, 405);
});

test('worker·AASA·안드 매니페스트가 /g/ 를 연다', () => {
  assert.match(read('../worker/index.js'), /if \(pathname\.startsWith\('\/g\/'\)\) return await giftLink\(\{ request \}\);/);
  const aasa = JSON.parse(read('../assets/well-known/apple-app-site-association'));
  assert.deepEqual(aasa.applinks.details[0].components, [{ '/': '/i/*' }, { '/': '/g/*' }]);
  assert.match(read('../android/app/src/main/AndroidManifest.xml'), /android:pathPrefix="\/g\/"/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-link.test.mjs`
Expected: FAIL (`giftLinkTarget` export 없음)

- [ ] **Step 3: 구현**

`functions/invite-link.js` — 첫 줄 import 다음에:

```js
import { readGiftParam } from '../js/promo-gift/rules.js';
```

`onRequestGet` 함수 다음에:

```js
export function giftLinkTarget(pathname) {
  const code = readGiftParam(pathname);
  return code ? `/?gift=${code}` : '/';
}

export async function onGiftRequestGet({ request }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 });
  const url = new URL(request.url);
  const dest = new URL(giftLinkTarget(url.pathname), url.origin);
  for (const [k, v] of url.searchParams) if (k !== 'gift') dest.searchParams.append(k, v);
  return new Response(null, { status: 302, headers: { Location: dest.toString(), 'Cache-Control': 'no-store' } });
}
```

`worker/index.js` 의 invite-link import 줄을:

```js
import { onRequestGet as inviteLink, onGiftRequestGet as giftLink, wellKnown } from '../functions/invite-link.js';
```

`if (pathname.startsWith('/i/')) return await inviteLink({ request });` 다음 줄에:

```js
      if (pathname.startsWith('/g/')) return await giftLink({ request });
```

`assets/well-known/apple-app-site-association` 의 `"components"` 줄을:

```json
        "components": [{ "/": "/i/*" }, { "/": "/g/*" }]
```

`android/app/src/main/AndroidManifest.xml` 의 `<data android:scheme="https" android:host="calmforest.cloud" android:pathPrefix="/i/" />` 다음 줄에:

```xml
                <data android:scheme="https" android:host="calmforest.cloud" android:pathPrefix="/g/" />
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/promo-gift-link.test.mjs tests/invite-link.test.mjs`
Expected: PASS. `tests/invite-link.test.mjs` 가 AASA components 를 `[{ '/': '/i/*' }]` 로 통째 비교해 실패하면 그 단언을 `assert.deepEqual(aasa.applinks.details[0].components[0], { '/': '/i/*' })` 로 바꾼다.

- [ ] **Step 5: 커밋**

```bash
git add functions/invite-link.js worker/index.js assets/well-known/apple-app-site-association android/app/src/main/AndroidManifest.xml tests/promo-gift-link.test.mjs tests/invite-link.test.mjs
git commit -m "feat(promo-gift): /g/CODE links open the app or the web with ?gift="
```

---

### Task 5: 문구와 영어판

**Files:**
- Create: `js/promo-gift/copy.js`
- Modify: `js/i18n-en.js` (`'초대 코드 {0} · 앱에서 입력해도 받을 수 있어요'` 줄 다음)
- Test: `tests/promo-gift-copy.test.mjs`

**Interfaces:**
- Consumes: Task 2 `STAGE1_BUNDLE`
- Produces: `LETTER` · `FAIL` · `MENU` · `DECOR_TILES` · `stage1Lines(bundle) → [{ico, name, qty}]` · `allCopy() → string[]`

- [ ] **Step 1: 테스트 작성** `tests/promo-gift-copy.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LETTER, FAIL, MENU, DECOR_TILES, stage1Lines, allCopy } from '../js/promo-gift/copy.js';
import { STAGE1_BUNDLE } from '../js/promo-gift/rules.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');

test('1단계 목록은 4줄(씨앗 3종은 한 줄)', () => {
  assert.deepEqual(stage1Lines(STAGE1_BUNDLE), [
    { ico: '🪙', name: '코인', qty: '200' },
    { ico: '🌾', name: '고급 씨앗 3종', qty: '각 3개' },
    { ico: '🌱', name: '비료', qty: '5개' },
    { ico: '🪱', name: '미끼', qty: '5개' },
  ]);
});

test('2단계 칸은 보상 장식 이름과 같다', () => {
  const promo = REWARD_DECOR.filter(d => d.reward === 'promo');
  assert.deepEqual(DECOR_TILES.map(t => [t.ico, t.name]), promo.map(d => [d.ico, d.name]));
});

test('실패 문구는 이유별', () => {
  for (const r of ['unknown', 'inactive', 'expired', 'full', 'bad_code', 'not_started', 'net_fail', 'dup']) assert.ok(FAIL[r], r);
});

test('문구에 엠대시·놀다가 없고 전부 영어판이 있다', () => {
  for (const s of allCopy()) {
    assert.doesNotMatch(s, /—/, s);
    assert.doesNotMatch(s, /놀/, s);
    assert.ok(en.includes(`'${s}'`), `영어판 없음: ${s}`);
  }
  for (const d of REWARD_DECOR.filter(x => x.reward === 'promo')) {
    assert.ok(en.includes(`'${d.name}'`), d.name);
    assert.ok(en.includes(`'${d.desc}'`), d.desc);
  }
});

test('봉투 핵심 문구', () => {
  assert.equal(LETTER.title1, '고요한 숲에 온 걸 환영해요');
  assert.equal(LETTER.ps, '추신. 로그인하면 전용 꾸미기 세트를 하나 더 보내 드려요 🎈');
  assert.equal(LETTER.title2, '약속한 꾸미기 세트예요');
  assert.equal(MENU.button, '선물 코드');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-copy.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현** `js/promo-gift/copy.js`

```js
export const LETTER = Object.freeze({
  fallbackFrom: '숲에서 온 초대장',
  title1: '고요한 숲에 온 걸 환영해요',
  note1: '첫날 쓰라고 몇 가지 챙겨 넣었어요',
  ps: '추신. 로그인하면 전용 꾸미기 세트를 하나 더 보내 드려요 🎈',
  take: '받기',
  login: '✉️ 로그인하고 더 받기',
  from2: '두 번째 편지',
  title2: '약속한 꾸미기 세트예요',
  note2: '작업대 🧺 보관함에 넣어 뒀어요. 마당에 놓아 보세요',
  ok: '확인',
});

export const FAIL = Object.freeze({
  unknown: '없는 선물 코드예요',
  bad_code: '선물 코드를 다시 확인해 주세요',
  inactive: '지금은 쓸 수 없는 코드예요',
  expired: '기간이 끝난 코드예요',
  full: '선착순이 마감됐어요',
  not_started: '아직 시작 전인 코드예요',
  net_fail: '연결이 불안정해요. 잠시 후 다시 해 주세요',
  dup: '이미 선물을 받았어요',
});

export const MENU = Object.freeze({
  button: '선물 코드',
  title: '선물 코드를 넣어 주세요',
  placeholder: '예: AUTUMN24',
  submit: '받기',
  close: '닫기',
});

export const DECOR_TILES = Object.freeze([
  Object.freeze({ ico: '🎈', name: '꼬마 열기구' }),
  Object.freeze({ ico: '🧳', name: '여행 가방 더미' }),
]);

const SEED_KEYS = ['seed_wheat', 'seed_corn', 'seed_grape'];

export function stage1Lines(bundle) {
  const seeds = SEED_KEYS.map(k => bundle[k] || 0);
  return [
    { ico: '🪙', name: '코인', qty: String(bundle.coins || 0) },
    { ico: '🌾', name: '고급 씨앗 3종', qty: `각 ${Math.min(...seeds)}개` },
    { ico: '🌱', name: '비료', qty: `${bundle.fert || 0}개` },
    { ico: '🪱', name: '미끼', qty: `${bundle.bait || 0}개` },
  ];
}

export function allCopy() {
  return [
    ...Object.values(LETTER), ...Object.values(FAIL), ...Object.values(MENU),
    ...DECOR_TILES.map(t => t.name),
    '코인', '고급 씨앗 3종', '비료', '미끼', '각 3개', '5개',
  ];
}
```

- [ ] **Step 4: 영어판 추가**

먼저 이미 있는 키를 확인한다:

```bash
for k in "받기" "확인" "닫기" "코인" "비료" "미끼" "선물 코드"; do grep -c "^  '$k':" js/i18n-en.js | sed "s/^/$k /"; done
```

`js/i18n-en.js` 의 `'초대 코드 {0} · 앱에서 입력해도 받을 수 있어요': …,` 줄 다음에 아래를 넣는다. 위 확인에서 1 이 나온(이미 있는) 키는 이 목록에서 뺀다:

```js
  '숲에서 온 초대장': 'An invitation from the forest',
  '고요한 숲에 온 걸 환영해요': 'Welcome to Calm Forest',
  '첫날 쓰라고 몇 가지 챙겨 넣었어요': 'We packed a few things for your first day',
  '추신. 로그인하면 전용 꾸미기 세트를 하나 더 보내 드려요 🎈': 'P.S. Log in and we will send you an exclusive decor set too 🎈',
  '✉️ 로그인하고 더 받기': '✉️ Log in for more',
  '두 번째 편지': 'A second letter',
  '약속한 꾸미기 세트예요': 'Here is the decor set we promised',
  '작업대 🧺 보관함에 넣어 뒀어요. 마당에 놓아 보세요': 'It is in the Workbench 🧺 storage. Place it in your yard',
  '없는 선물 코드예요': 'That gift code does not exist',
  '선물 코드를 다시 확인해 주세요': 'Please check the gift code',
  '지금은 쓸 수 없는 코드예요': 'This code cannot be used right now',
  '기간이 끝난 코드예요': 'This code has expired',
  '선착순이 마감됐어요': 'All gifts for this code have been claimed',
  '아직 시작 전인 코드예요': 'This code is not active yet',
  '연결이 불안정해요. 잠시 후 다시 해 주세요': 'The connection is unstable. Please try again soon',
  '이미 선물을 받았어요': 'You already got this gift',
  '선물 코드': 'Gift code',
  '선물 코드를 넣어 주세요': 'Enter your gift code',
  '예: AUTUMN24': 'e.g. AUTUMN24',
  '고급 씨앗 3종': '3 kinds of premium seeds',
  '각 3개': '3 each',
  '5개': '5',
  '꼬마 열기구': 'Little Hot-Air Balloon',
  '링크 선물. 줄무늬 열기구가 말뚝에 매여 있어요': 'Link gift. A striped balloon tied to a stake',
  '여행 가방 더미': 'Suitcase Stack',
  '링크 선물. 꼬리표 붙은 여행 가방 세 개': 'Link gift. Three suitcases with luggage tags',
  '받기': 'Claim',
  '확인': 'OK',
  '닫기': 'Close',
  '코인': 'Coins',
  '비료': 'Fertilizer',
  '미끼': 'Bait',
```

- [ ] **Step 5: 통과 확인(사전 중복 키 검사 포함)**

Run: `node --test tests/promo-gift-copy.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: PASS, `# fail 0`

- [ ] **Step 6: 커밋**

```bash
git add js/promo-gift/copy.js js/i18n-en.js tests/promo-gift-copy.test.mjs
git commit -m "feat(promo-gift): letter copy with English"
```

---

### Task 6: 꾸미기 3D 와 게임 연결

**Files:**
- Create: `js/spaces/promo-gift-art.js`
- Modify: `js/game.js:334` 다음 (import), `js/game.js` `SIGNUP_GIFT_IDS.includes(id)` 분기 다음
- Test: `tests/promo-gift-art.test.mjs`

**Interfaces:**
- Consumes: Task 2 `PROMO_DECOR_IDS`, `colored`·`mergeColored` (`js/mountain/merge-colored.js`)
- Produces: `buildPromoGift(T, id) → THREE.Group|null`

- [ ] **Step 1: 테스트 작성** `tests/promo-gift-art.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildPromoGift } from '../js/spaces/promo-gift-art.js';
import { PROMO_DECOR_IDS } from '../js/promo-gift/rules.js';

const LIMIT = { promoballoon: { h: 4.2, w: 1.8 }, promosuitcase: { h: 1.2, w: 2.0 } };

for (const id of PROMO_DECOR_IDS) {
  test(`${id} 는 메시 1개로 합쳐지고 크기가 맞다`, () => {
    const g = buildPromoGift(THREE, id);
    const meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 1, `${id} 메시 ${meshes.length}`);
    assert.ok(meshes[0].castShadow);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(box.min.y > -0.05, `${id} 바닥 아래 ${box.min.y}`);
    assert.ok(box.max.y < LIMIT[id].h, `${id} 높이 ${box.max.y}`);
    assert.ok(box.max.x - box.min.x < LIMIT[id].w && box.max.z - box.min.z < LIMIT[id].w, `${id} 너비`);
  });
}

test('모르는 id 는 null', () => {
  assert.equal(buildPromoGift(THREE, 'nope'), null);
});

test('game.js outdoorMesh 가 링크 선물 꾸미기를 그린다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ buildPromoGift \} from '\.\/spaces\/promo-gift-art\.js';/);
  assert.match(src, /import \{ PROMO_DECOR_IDS \} from '\.\/promo-gift\/rules\.js';/);
  assert.match(src, /\} else if \(PROMO_DECOR_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildPromoGift\(THREE, id\)\);/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-art.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현** `js/spaces/promo-gift-art.js` (시안 `sims/promo-gift/decor.html` 의 `balloon`·`suitcases` 를 가입 선물 아트와 같은 bake 방식으로 옮김)

```js
import { colored, mergeColored } from '../mountain/merge-colored.js';

const SCALE = 1.25;

function kit(T) {
  const root = new T.Group();
  const part = (geo, hex, x = 0, y = 0, z = 0, parent = root) => {
    const m = new T.Mesh(geo);
    m.userData.hex = hex;
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const lathe = (pr, seg = 10) => new T.LatheGeometry(pr.map(([x, y]) => new T.Vector2(x, y)), seg);
  const tube = (pts, r, seg = 16) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(([x, y, z]) => new T.Vector3(x, y, z))), seg, r, 4);
  return { root, part, lathe, tube };
}

function balloon(T, k) {
  const { root, part, lathe, tube } = k;
  part(new T.CylinderGeometry(0.08, 0.1, 0.12, 6), 0x9a7350, 0, 0.06, 0);
  part(tube([[0, 0.1, 0], [0.12, 0.6, 0.05], [0.05, 1.05, 0]], 0.008), 0x6b4a33);
  const basket = new T.Group();
  basket.position.set(0.05, 1.05, 0);
  root.add(basket);
  part(lathe([[0, 0], [0.2, 0], [0.24, 0.22], [0.25, 0.26], [0, 0.26]]), 0xc9a072, 0, 0, 0, basket);
  part(lathe([[0.235, 0.18], [0.26, 0.2], [0.26, 0.26], [0.24, 0.27]]), 0x8a5a3a, 0, 0, 0, basket);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    part(new T.CylinderGeometry(0.008, 0.008, 0.5, 4), 0x6b4a33, Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22, basket);
  }
  const env = part(new T.BoxGeometry(0.14, 0.1, 0.02), 0xfff6e0, 0.07, 0.31, 0.17, basket);
  env.rotation.z = 0.2;
  const bal = new T.Group();
  bal.position.set(0.05, 2.2, 0);
  bal.scale.set(1, 1.15, 1);
  root.add(bal);
  for (let i = 0; i < 12; i++) {
    part(new T.SphereGeometry(0.62, 6, 14, (i / 12) * Math.PI * 2, Math.PI * 2 / 12, 0, Math.PI * 0.82), i % 2 ? 0xf6e7c8 : 0xd9574a, 0, 0, 0, bal);
  }
  part(new T.CylinderGeometry(0.2, 0.26, 0.12, 12), 0xf4cf62, 0, -0.6, 0, bal);
}

function suitcases(T, k) {
  const { root, part } = k;
  const one = (w, h, d, hex, x, y, z, ry) => {
    const c = new T.Group();
    c.position.set(x, y, z);
    c.rotation.y = ry;
    root.add(c);
    part(new T.BoxGeometry(w, h, d), hex, 0, h / 2, 0, c);
    for (const s of [-1, 1]) part(new T.BoxGeometry(0.05, h + 0.01, d + 0.01), 0x6b4a33, s * w * 0.3, h / 2, 0, c);
    part(new T.TorusGeometry(0.07, 0.02, 4, 10, Math.PI), 0x6b4a33, 0, h + 0.005, 0, c);
    part(new T.BoxGeometry(0.14, 0.1, 0.01), 0xfff6e0, w * 0.15, h * 0.55, d / 2 + 0.006, c);
  };
  one(0.9, 0.3, 0.55, 0x7fb37a, 0, 0, 0, 0.1);
  one(0.7, 0.26, 0.45, 0xe7a77a, 0.04, 0.3, 0.02, -0.2);
  one(0.42, 0.42, 0.22, 0x8fb7d9, 0.6, 0, 0.35, -0.5);
  const map = part(new T.BoxGeometry(0.3, 0.01, 0.22), 0xf6ead2, -0.05, 0.565, 0.02);
  map.rotation.y = 0.4;
}

const SHAPES = { promoballoon: balloon, promosuitcase: suitcases };

function bake(T, root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(o => {
    if (!o.isMesh) return;
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    geo.applyMatrix4(o.matrixWorld);
    parts.push(colored(T, geo, o.userData.hex));
    o.geometry.dispose();
  });
  return mergeColored(T, parts);
}

export function buildPromoGift(T, id) {
  const shape = SHAPES[id];
  if (!shape) return null;
  const k = kit(T);
  shape(T, k);
  k.root.scale.setScalar(SCALE);
  const g = new T.Group();
  const mesh = new T.Mesh(bake(T, k.root), new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return g;
}
```

- [ ] **Step 4: game.js 연결** — `js/game.js` 의 `import { SIGNUP_GIFT_IDS, buildSignupGift } from './spaces/signup-gift-art.js';` 다음 줄에:

```js
import { buildPromoGift } from './spaces/promo-gift-art.js';
import { PROMO_DECOR_IDS } from './promo-gift/rules.js';
```

같은 파일의

```js
  } else if (SIGNUP_GIFT_IDS.includes(id)) {
    g.add(buildSignupGift(THREE, id, (m) => houseWindows.push(m)));
```

다음에:

```js
  } else if (PROMO_DECOR_IDS.includes(id)) {
    g.add(buildPromoGift(THREE, id));
```

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/promo-gift-art.test.mjs tests/signup-gift-art.test.mjs`
Expected: PASS. 높이·너비 단언이 실패하면 모양(시안 승인본)은 바꾸지 말고 실측값을 출력해(`console.log(box.max.y)` 를 임시로 넣어 확인 후 제거) `LIMIT` 을 실측+0.2 로 맞춘다.

- [ ] **Step 6: 커밋**

```bash
git add js/spaces/promo-gift-art.js js/game.js tests/promo-gift-art.test.mjs
git commit -m "feat(promo-gift): hot-air balloon and suitcase stack decor"
```

실제 게임 화면 확인은 Task 9 Step 2-4(2단계 지급 뒤 마당에 놓기)에서 한다.

---

### Task 7: 흐름(flow)

**Files:**
- Create: `js/promo-gift/flow.js`
- Test: `tests/promo-gift-flow.test.mjs`

**Interfaces:**
- Consumes: Task 2 `KEYS`, `normalizeGiftCode`, `nextClaims`, `settle`, `STAGE1_BUNDLE`
- Produces:
  - `pendingCode(storage) → string|null`
  - `captureCode({ storage, code, via, force = false, track }) → string|null` — 같은 링크 재전달(`seen`)은 무시, `force` 면 다시 받음
  - `runPromoGift({ auth, storage, call, grant, show, track }) → Promise<Array<{stage, label, labelEn, loggedIn}>>`
    - `call(stage, code) → Promise<res|null>` · `grant(bundle)` · `show(view) → Promise<void>`(창이 닫히면 resolve)

- [ ] **Step 1: 테스트 작성** `tests/promo-gift-flow.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureCode, pendingCode, runPromoGift } from '../js/promo-gift/flow.js';
import { KEYS, STAGE1_BUNDLE } from '../js/promo-gift/rules.js';

function mem(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
const GUEST = { isGuest: true, provider: 'anonymous' };
const MEMBER = { isGuest: false, provider: 'email' };

function harness(replies, storage) {
  const calls = [], grants = [], shows = [], events = [];
  const deps = {
    storage,
    call: async (stage, code) => { calls.push([stage, code]); return replies.shift(); },
    grant: (b) => grants.push(b),
    show: async (v) => { shows.push(v); },
    track: (ev, p) => events.push([ev, p]),
  };
  return { deps, calls, grants, shows, events };
}

test('captureCode — 저장·도착 이벤트·같은 링크 재전달 무시·수동 입력은 다시 받음', () => {
  const s = mem();
  const ev = [];
  const track = (e, p) => ev.push([e, p]);
  assert.equal(captureCode({ storage: s, code: 'insta1', via: 'deeplink', track }), 'INSTA1');
  assert.equal(s.getItem(KEYS.code), 'INSTA1');
  assert.equal(s.getItem(KEYS.via), 'deeplink');
  assert.deepEqual(ev, [['promo_gift_arrive', { code: 'INSTA1', via: 'deeplink' }]]);
  s.removeItem(KEYS.code);
  assert.equal(captureCode({ storage: s, code: 'INSTA1', via: 'deeplink', track }), null);
  assert.equal(captureCode({ storage: s, code: 'INSTA1', via: 'manual', force: true, track }), 'INSTA1');
  assert.equal(captureCode({ storage: s, code: 'x', via: 'url', track }), null);
  assert.equal(pendingCode(s), 'INSTA1');
});

test('게스트 1단계 신규 → 지급·기기 표시·코드 유지·창 1장', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const h = harness([{ ok: true, new: true, label: '인스타그램에서 온 초대장', label_en: 'From Instagram' }], s);
  const views = await runPromoGift({ auth: GUEST, ...h.deps });
  assert.deepEqual(h.calls, [[1, 'INSTA1']]);
  assert.deepEqual(h.grants, [STAGE1_BUNDLE]);
  assert.equal(s.getItem(KEYS.device), '1');
  assert.equal(s.getItem(KEYS.code), 'INSTA1');
  assert.deepEqual(views, [{ stage: 1, label: '인스타그램에서 온 초대장', labelEn: 'From Instagram', loggedIn: false }]);
  assert.deepEqual(h.events, [['promo_gift_claim', { code: 'INSTA1', step: 1, result: 'new' }]]);
});

test('같은 기기의 새 게스트는 아무것도 안 부른다', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1', [KEYS.device]: '1' });
  const h = harness([], s);
  assert.deepEqual(await runPromoGift({ auth: GUEST, ...h.deps }), []);
  assert.deepEqual(h.calls, []);
});

test('게스트였던 기기에서 로그인 → 2단계만, 코드 지움', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1', [KEYS.device]: '1' });
  const h = harness([{ ok: true, new: true, label: 'L', label_en: 'E', items: ['promoballoon', 'promosuitcase'] }], s);
  const views = await runPromoGift({ auth: MEMBER, ...h.deps });
  assert.deepEqual(h.calls, [[2, 'INSTA1']]);
  assert.deepEqual(h.grants, []);
  assert.equal(s.getItem(KEYS.code), null);
  assert.deepEqual(views, [{ stage: 2, label: 'L', labelEn: 'E', loggedIn: true }]);
});

test('처음 온 로그인 유저 → 1·2단계 연속, 창 2장 순서대로', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const h = harness([{ ok: true, new: true, label: 'L', label_en: 'E' }, { ok: true, new: true, label: 'L', label_en: 'E' }], s);
  await runPromoGift({ auth: MEMBER, ...h.deps });
  assert.deepEqual(h.calls, [[1, 'INSTA1'], [2, 'INSTA1']]);
  assert.deepEqual(h.shows.map(v => [v.stage, v.loggedIn]), [[1, true], [2, true]]);
  assert.equal(s.getItem(KEYS.code), null);
});

test('1단계 실패(만료)면 2단계를 안 부르고 코드를 지운다', async () => {
  const s = mem({ [KEYS.code]: 'OLD1' });
  const h = harness([{ ok: false, reason: 'expired' }], s);
  await runPromoGift({ auth: MEMBER, ...h.deps });
  assert.deepEqual(h.calls, [[1, 'OLD1']]);
  assert.equal(s.getItem(KEYS.code), null);
  assert.deepEqual(h.shows, []);
});

test('네트워크 실패는 코드를 남기고 창을 안 띄운다', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const h = harness([null], s);
  await runPromoGift({ auth: GUEST, ...h.deps });
  assert.equal(s.getItem(KEYS.code), 'INSTA1');
  assert.equal(s.getItem(KEYS.device), null);
  assert.deepEqual(h.events, [['promo_gift_claim', { code: 'INSTA1', step: 1, result: 'net_fail' }]]);
});

test('창은 하나씩 — 앞 창이 닫혀야 다음 창', async () => {
  const s = mem({ [KEYS.code]: 'INSTA1' });
  const order = [];
  let release;
  const first = new Promise(r => { release = r; });
  const p = runPromoGift({
    auth: MEMBER, storage: s, track: () => {}, grant: () => {},
    call: async () => ({ ok: true, new: true, label: 'L', label_en: 'E' }),
    show: async (v) => { order.push(`open${v.stage}`); if (v.stage === 1) await first; order.push(`close${v.stage}`); },
  });
  await new Promise(r => setTimeout(r, 0));
  assert.deepEqual(order, ['open1']);
  release();
  await p;
  assert.deepEqual(order, ['open1', 'close1', 'open2', 'close2']);
});

test('저장소가 깨져도 던지지 않는다', async () => {
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  assert.equal(pendingCode(broken), null);
  assert.equal(captureCode({ storage: broken, code: 'INSTA1', via: 'url', track: () => {} }), null);
  assert.deepEqual(await runPromoGift({ auth: GUEST, storage: broken, call: async () => null, grant: () => {}, show: async () => {}, track: () => {} }), []);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-flow.test.mjs`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현** `js/promo-gift/flow.js`

```js
import { KEYS, STAGE1_BUNDLE, normalizeGiftCode, nextClaims, settle } from './rules.js';

const read = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
const write = (s, k, v) => { try { s.setItem(k, v); return true; } catch (e) { return false; } };
const drop = (s, k) => { try { s.removeItem(k); } catch (e) { return; } };

export function pendingCode(storage) {
  return normalizeGiftCode(read(storage, KEYS.code));
}

export function captureCode({ storage, code, via, force = false, track }) {
  const c = normalizeGiftCode(code);
  if (!c) return null;
  if (!force && read(storage, KEYS.seen) === c) return null;
  if (!write(storage, KEYS.code, c)) return null;
  write(storage, KEYS.via, via);
  write(storage, KEYS.seen, c);
  track('promo_gift_arrive', { code: c, via });
  return c;
}

export async function runPromoGift({ auth, storage, call, grant, show, track }) {
  const code = pendingCode(storage);
  const loggedIn = !auth?.isGuest && auth?.provider !== 'anonymous' && auth?.provider !== 'offline';
  const stages = nextClaims({ isGuest: !!auth?.isGuest, provider: auth?.provider, stage1Device: read(storage, KEYS.device) === '1', hasCode: !!code });
  const views = [];
  for (const stage of stages) {
    const res = await call(stage, code);
    const s = settle(stage, res);
    track('promo_gift_claim', { code, step: stage, result: s.result });
    if (s.mark) write(storage, KEYS.device, '1');
    if (!s.keep) drop(storage, KEYS.code);
    if (s.show === 1) grant(STAGE1_BUNDLE);
    if (s.show) views.push({ stage: s.show, label: res.label || null, labelEn: res.label_en || null, loggedIn });
    if (s.stop) break;
  }
  for (const v of views) await show(v);
  return views;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/promo-gift-flow.test.mjs`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add js/promo-gift/flow.js tests/promo-gift-flow.test.mjs
git commit -m "feat(promo-gift): claim flow per stage with device mark"
```

---

### Task 8: 창·부팅·지급 연결

**Files:**
- Modify: `js/app-banner.js` (import, `captureTouch`, `playReferrer`)
- Modify: `js/game.js` (`export function getGameState` 바로 위), `js/game-lazy.js` (`resyncPurchases` 줄 다음)
- Create: `js/promo-gift/ui.js`, `js/promo-gift/index.js`
- Modify: `index.html` (CSS, 마크업, 메뉴 버튼, import 2곳, 부팅, install referrer, onPlay, `ui.connectAccount`, 메뉴 클릭)
- Test: `tests/promo-gift-banner.test.mjs`, `tests/promo-gift-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 2 `readGiftParam`·`giftFromReferrer`·`normalizeGiftCode`·`STAGE1_BUNDLE` · Task 5 `LETTER`·`FAIL`·`MENU`·`DECOR_TILES`·`stage1Lines` · Task 7 `captureCode`·`pendingCode`·`runPromoGift`
- Produces:
  - `grantItems(bundle, source = 'promo_gift')` (game.js·game-lazy)
  - `letterView(view, lang) → { seal, from, title, note, lines, tiles, ps, take, login }` · `showLetter(view, { track, connect, code, lang }) → Promise<void>` · `openCodeEntry({ submit })` (ui.js, i18n 을 불러오지 않음)
  - `bootPromoGift({ track })` · `linkInstallGift(installP)` · `promoGiftOnPlay({ auth, track, ui, grant }) → Promise<{views, result}>` · `openGiftCodeEntry({ auth, track, ui, grant })` (index.js)

- [ ] **Step 1: 배너 테스트 작성** `tests/promo-gift-banner.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureTouch, playReferrer } from '../js/app-banner.js';

const id = () => 'J1';

test('첫 방문 기록에 gift 를 담고 새 코드가 오면 바꾼다', () => {
  const a = captureTouch('?gift=insta1', null, 1, id);
  assert.equal(a.gift, 'INSTA1');
  assert.equal(captureTouch('', a, 2, id), a);
  const c = captureTouch('?gift=THREAD2', a, 3, id);
  assert.equal(c.gift, 'THREAD2');
  assert.equal(c.jid, 'J1');
  assert.equal(captureTouch('', null, 1, id).gift, undefined);
});

test('Play referrer 에 gift 를 싣는다', () => {
  assert.match(decodeURIComponent(playReferrer({ jid: 'J1', utm: { source: 'meta' }, gift: 'INSTA1' })), /(^|&)gift=INSTA1(&|$)/);
  assert.doesNotMatch(decodeURIComponent(playReferrer({ jid: 'J1', gift: 'bad!' })), /gift=/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/promo-gift-banner.test.mjs`
Expected: FAIL (`a.gift` undefined)

- [ ] **Step 3: app-banner 수정** — `js/app-banner.js`

`import { readInviteParam } from './referral/rules.js';` 다음 줄에:

```js
import { readGiftParam, normalizeGiftCode } from './promo-gift/rules.js';
```

`captureTouch` 안의

```js
  const invite = readInviteParam(search) || prev?.invite;
  if (prev?.jid && !src && invite === prev?.invite) return prev;
```

를

```js
  const invite = readInviteParam(search) || prev?.invite;
  const gift = readGiftParam(search) || prev?.gift;
  if (prev?.jid && !src && invite === prev?.invite && gift === prev?.gift) return prev;
```

로, `captureTouch` 의 return 줄을

```js
  return { jid: prev?.jid || makeId(), ts: prev?.ts ?? now, utm, ...(invite ? { invite } : {}), ...(gift ? { gift } : {}) };
```

로 바꾸고, `playReferrer` 의 `if (invite) parts.push(['invite', invite]);` 다음에:

```js
  const gift = normalizeGiftCode(touch?.gift);
  if (gift) parts.push(['gift', gift]);
```

Run: `node --test tests/promo-gift-banner.test.mjs && npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: PASS, `# fail 0`

- [ ] **Step 4: `grantItems` 추가** — `js/game.js` 의 `export function getGameState() {` 바로 위에:

```js
export function grantItems(bundle, source = 'promo_gift') {
  for (const [k, v] of Object.entries(bundle || {})) {
    if (!(k in gameState.inventory) || !Number.isInteger(v) || v <= 0) continue;
    gameState.inventory[k] += v;
    logEcon(source, k, v, gameState.inventory[k]);
  }
  requestSave();
  refreshInventoryUI();
}
```

`js/game-lazy.js` 의 `export const resyncPurchases = …` 줄 다음에:

```js
export const grantItems = (...a) => need().game.grantItems(...a);
```

- [ ] **Step 5: ui.js 작성** `js/promo-gift/ui.js`

```js
import { LETTER, FAIL, MENU, DECOR_TILES, stage1Lines } from './copy.js';
import { STAGE1_BUNDLE } from './rules.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function fill(box, nodes) {
  box.replaceChildren(...nodes);
  box.hidden = nodes.length === 0;
}

function row({ ico, name, qty }) {
  const d = el('div', 'pg-row');
  const left = el('span', 'pg-name');
  left.append(el('span', 'pg-ico', ico), el('span', null, name));
  d.append(left, el('b', null, qty));
  return d;
}

function tile({ ico, name }) {
  const d = el('div', 'pg-tile');
  d.append(el('i', null, ico), el('b', null, name));
  return d;
}

export function letterView(view, lang) {
  if (view.stage === 2) {
    return { seal: '🎈', from: LETTER.from2, title: LETTER.title2, note: LETTER.note2, lines: [], tiles: [...DECOR_TILES], ps: null, take: LETTER.ok, login: null };
  }
  const from = (lang === 'en' ? view.labelEn : view.label) || LETTER.fallbackFrom;
  return {
    seal: '🌲', from, title: LETTER.title1, note: LETTER.note1,
    lines: stage1Lines(STAGE1_BUNDLE), tiles: [],
    ps: view.loggedIn ? null : LETTER.ps,
    take: LETTER.take, login: view.loggedIn ? null : LETTER.login,
  };
}

export function showLetter(view, { track, connect, code, lang }) {
  const modal = $('promo-gift-modal');
  if (!modal) return Promise.resolve();
  const v = letterView(view, lang);
  $('promo-gift-seal').textContent = v.seal;
  $('promo-gift-from').textContent = v.from;
  $('promo-gift-title').textContent = v.title;
  $('promo-gift-note').textContent = v.note;
  fill($('promo-gift-list'), v.lines.map(row));
  fill($('promo-gift-set'), v.tiles.map(tile));
  $('promo-gift-rule').hidden = v.lines.length === 0;
  $('promo-gift-ps').textContent = v.ps || '';
  $('promo-gift-ps').hidden = !v.ps;
  $('promo-gift-ok').textContent = v.take;
  $('promo-gift-cta').textContent = v.login || '';
  $('promo-gift-cta').hidden = !v.login;
  modal.classList.toggle('solo', !v.login);
  return new Promise((resolve) => {
    const close = () => { modal.classList.remove('show'); resolve(); };
    $('promo-gift-ok').onclick = close;
    $('promo-gift-cta').onclick = () => {
      track('promo_gift_login_click', { code });
      close();
      connect?.('promo_gift');
    };
    modal.classList.add('show');
  });
}

export function openCodeEntry({ submit }) {
  const modal = $('gift-code-modal');
  if (!modal) return;
  const input = $('gift-code-input');
  const msg = $('gift-code-msg');
  const go = $('gift-code-submit');
  $('gift-code-title').textContent = MENU.title;
  input.placeholder = MENU.placeholder;
  input.value = '';
  msg.textContent = '';
  go.textContent = MENU.submit;
  $('gift-code-close').textContent = MENU.close;
  $('gift-code-close').onclick = () => modal.classList.remove('show');
  go.onclick = async () => {
    go.disabled = true;
    const r = await submit(input.value, () => modal.classList.remove('show'));
    go.disabled = false;
    if (!r.ok) msg.textContent = FAIL[r.reason] || FAIL.unknown;
  };
  modal.classList.add('show');
  input.focus();
}
```

- [ ] **Step 6: index.js 작성** `js/promo-gift/index.js`

```js
import { CONFIG, IS_DEV_SESSION } from '../config.js';
import { getAccessToken } from '../supabase-client.js';
import { IS_TOSS, IS_NATIVE, loadTossSDK } from '../platform.js';
import { capPlugin, capListen } from '../cap-bridge.js';
import { getLang } from '../i18n.js';
import { readGiftParam, giftFromReferrer, normalizeGiftCode } from './rules.js';
import { captureCode, pendingCode, runPromoGift } from './flow.js';
import { showLetter, openCodeEntry } from './ui.js';

const BUSY = ['body.intro-open', '#char-modal.show', '#tutorial-modal.show', '#hint-modal.show', '#nudge-modal.show', '#gift-box-modal.show'];
const SDK_WAIT_MS = 4000;
const NONE = Object.freeze({ views: [], result: 'net_fail' });
const memo = { track: () => {}, play: null, running: null };

const enabled = () => !IS_DEV_SESSION && !!CONFIG.PROMO_GIFT_API;
const store = () => { try { return localStorage; } catch (e) { return null; } };
const withTimeout = (p, fallback) => Promise.race([p, new Promise(r => setTimeout(() => r(fallback), SDK_WAIT_MS))]);
const busyWith = (ui) => () => BUSY.some(sel => document.querySelector(sel)) || !!ui?.coachActive?.() || !!ui?.anyModalOpen?.();

function whenIdle(busy, { first = 1500, every = 700, maxMs = 120000 } = {}) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    let clear = 0;
    const tick = () => {
      clear = busy() ? 0 : clear + 1;
      if (clear >= 2 || Date.now() - t0 >= maxMs) resolve();
      else setTimeout(tick, every);
    };
    setTimeout(tick, first);
  });
}

async function call(stage, code) {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const r = await fetch(CONFIG.PROMO_GIFT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: 'claim', code, stage }),
    });
    if (r.status === 400) return await r.json().catch(() => ({ ok: false, reason: 'bad_code' }));
    if (!r.ok) return { error: r.status };
    return await r.json();
  } catch (e) {
    return null;
  }
}

function runNow(ctx, { wait = true } = {}) {
  const s = store();
  if (!s) return Promise.resolve(NONE);
  if (memo.running) return memo.running;
  memo.running = (async () => {
    if (wait) await whenIdle(busyWith(ctx.ui));
    const code = pendingCode(s);
    let result = 'dup';
    const track = (ev, p) => { if (ev === 'promo_gift_claim') result = p.result; ctx.track(ev, p); };
    const views = await runPromoGift({
      auth: ctx.auth, storage: s, call, grant: ctx.grant, track,
      show: (view) => { ctx.beforeShow?.(); return showLetter(view, { track: ctx.track, connect: ctx.ui?.connectAccount, code, lang: getLang() }); },
    });
    return { views, result };
  })().catch(() => NONE).finally(() => { memo.running = null; });
  return memo.running;
}

export function bootPromoGift({ track }) {
  if (!enabled()) return;
  const s = store();
  if (!s) return;
  memo.track = track;
  captureCode({ storage: s, code: readGiftParam(location.search), via: 'url', track });
  if (IS_TOSS) {
    loadTossSDK().then(async (sdk) => {
      const entry = sdk?.Environment?.initialURL || (await sdk?.getSchemeUri?.()) || '';
      captureCode({ storage: s, code: readGiftParam(entry), via: 'toss', track });
    }).catch(() => null);
  }
  if (!IS_NATIVE) return;
  const app = capPlugin('App');
  if (app) {
    withTimeout(Promise.resolve(app.getLaunchUrl()).then(r => r?.url || null).catch(() => null), null)
      .then(url => captureCode({ storage: s, code: readGiftParam(url), via: 'deeplink', track }));
  }
  try {
    capListen('App', 'appUrlOpen', (ev) => {
      if (captureCode({ storage: s, code: readGiftParam(ev?.url), via: 'deeplink', track }) && memo.play) runNow(memo.play);
    });
  } catch (e) {
    return;
  }
}

export function linkInstallGift(installP) {
  if (!enabled() || !IS_NATIVE || !installP) return;
  const s = store();
  if (!s) return;
  withTimeout(installP, null).then(attr => captureCode({ storage: s, code: giftFromReferrer(attr?.raw), via: 'referrer', track: memo.track }));
}

export function promoGiftOnPlay({ auth, track, ui, grant }) {
  if (!enabled()) return Promise.resolve(NONE);
  memo.play = { auth, track, ui, grant };
  return runNow(memo.play);
}

export function openGiftCodeEntry({ auth, track, ui, grant }) {
  const s = store();
  if (!s || !enabled()) return;
  openCodeEntry({
    submit: async (text, closeEntry) => {
      const code = normalizeGiftCode(text);
      if (!code) return { ok: false, reason: 'bad_code' };
      captureCode({ storage: s, code, via: 'manual', force: true, track });
      memo.play = { auth, track, ui, grant };
      const { views, result } = await runNow({ ...memo.play, beforeShow: closeEntry }, { wait: false });
      return views.length ? { ok: true } : { ok: false, reason: result };
    },
  });
}
```

- [ ] **Step 7: index.html 마크업·CSS·메뉴**

`#gift-box-modal` 블록(`<div id="gift-box-modal" data-state="closed">` 부터 그 `</div>` 두 줄까지) 다음에:

```html
  <div id="promo-gift-modal" role="dialog" aria-modal="true" aria-labelledby="promo-gift-title">
    <div class="pg-env">
      <div class="pg-flap"></div>
      <div class="pg-seal" id="promo-gift-seal">🌲</div>
      <div class="pg-letter">
        <div class="pg-from" id="promo-gift-from"></div>
        <div class="pg-title" id="promo-gift-title"></div>
        <p class="pg-note" id="promo-gift-note"></p>
        <hr class="pg-rule" id="promo-gift-rule">
        <div class="pg-list" id="promo-gift-list"></div>
        <div class="pg-set" id="promo-gift-set" hidden></div>
        <div class="pg-ps" id="promo-gift-ps"></div>
        <div class="pg-btns">
          <button id="promo-gift-ok" class="pg-ghost" type="button"></button>
          <button id="promo-gift-cta" class="pg-cta" type="button"></button>
        </div>
      </div>
    </div>
  </div>
  <div id="gift-code-modal" role="dialog" aria-modal="true" aria-labelledby="gift-code-title">
    <div class="tut-card daily-card gift-code-card">
      <b id="gift-code-title"></b>
      <input id="gift-code-input" type="text" autocomplete="off" autocapitalize="characters" maxlength="20">
      <p id="gift-code-msg" role="status"></p>
      <div class="pg-btns">
        <button id="gift-code-close" class="pg-ghost" type="button"></button>
        <button id="gift-code-submit" class="pg-cta" type="button"></button>
      </div>
    </div>
  </div>
```

CSS — `#gift-box-modal #gift-box-ok[hidden] { display: none; }` 줄 다음에:

```css
  #promo-gift-modal, #gift-code-modal { position: fixed; inset: 0; z-index: 33; display: none; place-items: center; background: rgba(20,40,30,0.55); }
  #promo-gift-modal.show, #gift-code-modal.show { display: grid; }
  #promo-gift-modal [hidden], .pg-btns [hidden] { display: none; }
  #promo-gift-modal .pg-env { position: relative; width: min(344px, 92vw); animation: giftPop .45s ease-out; }
  #promo-gift-modal .pg-flap { height: 92px; background: linear-gradient(180deg, #e9d9b8, #dcc79f); border-radius: 22px 22px 0 0; clip-path: polygon(0 0, 100% 0, 100% 40%, 50% 100%, 0 40%); }
  #promo-gift-modal .pg-seal { position: absolute; left: 50%; top: 52px; transform: translateX(-50%); width: 50px; height: 50px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #e0675a, #c9483c); box-shadow: 0 3px 0 #9b3328; display: grid; place-items: center; font-size: 22px; z-index: 2; }
  #promo-gift-modal .pg-letter { margin-top: -34px; background: #fffaf0; border-radius: 0 0 22px 22px; padding: 46px 16px 16px; text-align: center; box-shadow: 0 0 0 3px #e9d9b8 inset; color: #2b3a30; }
  #promo-gift-modal .pg-from { font-size: 11px; font-weight: 800; letter-spacing: .5px; color: #9a7a52; word-break: keep-all; }
  #promo-gift-modal .pg-title { font-size: 18px; font-weight: 800; margin: 4px 0; word-break: keep-all; }
  #promo-gift-modal .pg-note { font-size: 13px; color: #5b6b60; margin: 0 0 12px; line-height: 1.5; word-break: keep-all; }
  #promo-gift-modal .pg-rule { border: none; border-top: 1.5px dashed #e3d4b6; margin: 0 0 10px; }
  #promo-gift-modal .pg-row { display: flex; justify-content: space-between; font-size: 13px; line-height: 1.9; padding: 0 6px; text-align: left; }
  #promo-gift-modal .pg-ico { margin-right: 4px; }
  #promo-gift-modal .pg-row b { color: #7a8a7f; }
  #promo-gift-modal .pg-set { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  #promo-gift-modal .pg-tile { padding: 14px 4px 10px; border-radius: 14px; background: linear-gradient(160deg, #fff, #fdf3dc); border: 2px solid #f0c96a; }
  #promo-gift-modal .pg-tile i { display: block; font-style: normal; font-size: 38px; line-height: 1.1; }
  #promo-gift-modal .pg-tile b { display: block; font-size: 13px; margin-top: 3px; }
  #promo-gift-modal .pg-ps { text-align: left; margin-top: 8px; font-size: 12.5px; font-weight: 700; color: #6b4a12; background: #fff8e8; border-radius: 12px; padding: 9px 11px; word-break: keep-all; }
  .pg-btns { display: flex; gap: 8px; margin-top: 12px; }
  .pg-btns .pg-cta { flex: 1; border: none; border-radius: 16px; padding: 13px 8px; background: var(--mint); color: #2d4a37; font-size: 14px; font-weight: 800; font-family: inherit; cursor: pointer; }
  .pg-btns .pg-ghost { flex: none; border: none; border-radius: 16px; padding: 13px 14px; background: #ebe3d3; color: #6b5b4a; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; }
  #promo-gift-modal.solo .pg-ghost { flex: 1; background: var(--mint); color: #2d4a37; font-weight: 800; }
  #gift-code-modal .gift-code-card { width: min(320px, 90vw); text-align: center; }
  #gift-code-modal #gift-code-title { display: block; font-size: 17px; margin-bottom: 10px; word-break: keep-all; }
  #gift-code-modal #gift-code-input { width: 100%; box-sizing: border-box; padding: 11px 12px; border: 1px solid #e3dccb; border-radius: 12px; font-size: 16px; letter-spacing: 1px; text-transform: uppercase; text-align: center; }
  #gift-code-modal #gift-code-input::placeholder { letter-spacing: 0; text-transform: none; }
  #gift-code-modal #gift-code-msg { min-height: 18px; margin: 8px 0 0; font-size: 13px; color: #a6452f; word-break: keep-all; }
```

메뉴 — `<button id="invite-btn" style="display:none;">…</button>` 줄 다음에:

```html
      <button id="gift-code-btn"><span class="uico">🎁</span><span class="ulbl">선물 코드</span></button>
```

- [ ] **Step 8: index.html 스크립트 연결** (각 위치는 `grep -n` 으로 찾는다)
  1. `import { signupGiftOnPlay } from './js/signup-gift/index.js';` 다음 줄:
     ```js
         import { bootPromoGift, linkInstallGift, promoGiftOnPlay, openGiftCodeEntry } from './js/promo-gift/index.js';
     ```
  2. `./js/game-lazy.js` import 목록의 `resyncPurchases,` 뒤에 ` grantItems,` 추가.
  3. `grep -n "bootReferral(" index.html` 로 찾은 호출 줄 다음 줄(같은 들여쓰기):
     ```js
         bootPromoGift({ track: trackEvent });
     ```
  4. `if (referrerFresh) linkInstallInvite(referrerP);` 다음 줄(같은 들여쓰기):
     ```js
               if (referrerFresh) linkInstallGift(referrerP);
     ```
  5. `signupGiftOnPlay({ auth: authState, track: trackEvent, resync: resyncPurchases, ui });` 줄을:
     ```js
           promoGiftOnPlay({ auth: authState, track: trackEvent, ui, grant: (b) => grantItems(b) })
             .then(r => { if (r.views.some(v => v.stage === 2)) return resyncPurchases('promo_gift', { quiet: true }); })
             .catch(() => null)
             .finally(() => signupGiftOnPlay({ auth: authState, track: trackEvent, resync: resyncPurchases, ui }));
     ```
  6. `const nudgeConnect = IS_TOSS ? …` 정의 문장이 끝나는 `;` 다음 줄:
     ```js
         ui.connectAccount = (from) => nudgeConnect(from);
     ```
  7. `$('invite-btn').addEventListener('click', …);` 블록 다음:
     ```js
         $('gift-code-btn').addEventListener('click', () => openGiftCodeEntry({ auth: authState, track: trackEvent, ui, grant: (b) => grantItems(b) }));
     ```

- [ ] **Step 9: 연결 테스트 작성** `tests/promo-gift-wiring.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { letterView } from '../js/promo-gift/ui.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const lazy = readFileSync(new URL('../js/game-lazy.js', import.meta.url), 'utf8');

test('봉투 1단계 — 게스트는 추신·로그인 버튼, 로그인 유저는 없음, 영어면 label_en', () => {
  const g = letterView({ stage: 1, label: '인스타그램에서 온 초대장', labelEn: 'From Instagram', loggedIn: false }, 'ko');
  assert.equal(g.from, '인스타그램에서 온 초대장');
  assert.equal(g.lines.length, 4);
  assert.ok(g.ps && g.login);
  const m = letterView({ stage: 1, label: 'L', labelEn: 'From Instagram', loggedIn: true }, 'en');
  assert.equal(m.from, 'From Instagram');
  assert.equal(m.ps, null);
  assert.equal(m.login, null);
  assert.equal(letterView({ stage: 1, label: null, labelEn: null, loggedIn: false }, 'ko').from, '숲에서 온 초대장');
});

test('봉투 2단계 — 꾸미기 두 칸, 확인 버튼만', () => {
  const v = letterView({ stage: 2, label: 'L', labelEn: 'E', loggedIn: true }, 'ko');
  assert.deepEqual(v.tiles.map(t => [t.ico, t.name]), [['🎈', '꼬마 열기구'], ['🧳', '여행 가방 더미']]);
  assert.equal(v.take, '확인');
  assert.equal(v.login, null);
});

test('index.html — 마크업·메뉴·부팅·onPlay 순서·로그인 출구', () => {
  for (const id of ['promo-gift-modal', 'promo-gift-seal', 'promo-gift-from', 'promo-gift-title', 'promo-gift-note', 'promo-gift-rule', 'promo-gift-list', 'promo-gift-set', 'promo-gift-ps', 'promo-gift-ok', 'promo-gift-cta', 'gift-code-modal', 'gift-code-title', 'gift-code-input', 'gift-code-msg', 'gift-code-submit', 'gift-code-close', 'gift-code-btn']) {
    assert.ok(html.includes(`id="${id}"`), id);
  }
  assert.match(html, /import \{ bootPromoGift, linkInstallGift, promoGiftOnPlay, openGiftCodeEntry \} from '\.\/js\/promo-gift\/index\.js';/);
  assert.match(html, /bootPromoGift\(\{ track: trackEvent \}\);/);
  assert.match(html, /if \(referrerFresh\) linkInstallGift\(referrerP\);/);
  assert.match(html, /promoGiftOnPlay\([\s\S]{0,400}\.finally\(\(\) => signupGiftOnPlay\(/);
  assert.match(html, /ui\.connectAccount = \(from\) => nudgeConnect\(from\);/);
  assert.match(html, /\$\('gift-code-btn'\)\.addEventListener\('click', \(\) => openGiftCodeEntry\(/);
});

test('grantItems — 인벤토리에 있는 양의 정수만, 경제 로그·저장·HUD', () => {
  const fn = game.match(/export function grantItems[\s\S]*?\n\}/)[0];
  assert.match(fn, /k in gameState\.inventory/);
  assert.match(fn, /Number\.isInteger\(v\)/);
  assert.match(fn, /logEcon\(source, k, v, gameState\.inventory\[k\]\)/);
  assert.match(fn, /requestSave\(\);/);
  assert.match(fn, /refreshInventoryUI\(\);/);
  assert.match(lazy, /export const grantItems = \(\.\.\.a\) => need\(\)\.game\.grantItems\(\.\.\.a\);/);
});

test('새 코드에 주석이 없다', () => {
  for (const p of ['../js/promo-gift/rules.js', '../js/promo-gift/flow.js', '../js/promo-gift/ui.js', '../js/promo-gift/index.js', '../js/promo-gift/copy.js', '../js/spaces/promo-gift-art.js', '../functions/api/promo-gift.js']) {
    const src = readFileSync(new URL(p, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m, p);
  }
});
```

`js/i18n.js` 는 불러오는 순간 `location`·`navigator` 를 읽어 Node 에서 깨진다(계획 작성 때 확인함). 그래서 ui.js 는 i18n 을 불러오지 않고, index.js 가 `getLang()` 을 `showLetter(view, { …, lang })` 로 넘긴다. ui.js 에 i18n import 를 다시 넣지 말 것.

- [ ] **Step 10: 전체 테스트·빌드**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)" && node scripts/build-web.mjs | tail -2`
Expected: `# fail 0`, `✅ dist/ 준비 완료 — …개 파일`

- [ ] **Step 11: 커밋**

```bash
git add js/app-banner.js js/game.js js/game-lazy.js js/promo-gift/ui.js js/promo-gift/index.js index.html tests/promo-gift-banner.test.mjs tests/promo-gift-wiring.test.mjs
git commit -m "feat(promo-gift): envelope letter, code entry and boot wiring"
```

---

### Task 9: 실제 동작 검증·리뷰

**선행:** Task 10 Step 1(운영 DB 적용)이 먼저 필요하다. API 가 운영 DB RPC 를 부르기 때문이다. 사용자 승인을 받고 적용한다.

- [ ] **Step 1: 검증용 코드 등록(2시간 뒤 자동 만료)** — pg8000 풀러로 직접:

```sql
insert into promo_codes (code, label, label_en, ends_at, max_uses)
values ('QAPROMO1', 'QA 테스트 초대장', 'QA test invitation', now() + interval '2 hours', 5);
```

- [ ] **Step 2: 로컬 Worker E2E** — 워크트리에 `.dev.vars` 가 없으면 루트에서 복사(커밋 금지, `.gitignore` 확인). `npx wrangler dev --port 8896 --local` 을 백그라운드로 띄우고 `preview_start {url:"http://localhost:8896/?gift=qapromo1"}`:
  1. 게스트 입장 → 온보딩 끝난 뒤 봉투 1단계(머리 "QA 테스트 초대장", 추신·로그인 버튼) · PC 캡처
  2. `받기` → `read_page` 로 인벤토리 코인 +200, 씨앗·비료·미끼 증가 확인
  3. `resize_window {preset:"mobile"}` → 새로고침 → 창이 다시 안 뜨는지 확인 · 모바일 캡처(1단계는 새 게스트로 `localStorage.clear()` 뒤 재현)
  4. 테스트 계정으로 이메일 로그인 → 봉투 2단계(🎈🧳 두 칸, 확인 버튼만) → 작업대 🧺 보관함에서 꺼내 마당에 놓기 · 게임 거리·가까이 캡처
  5. ☰ → 🎁 선물 코드 → `nope` 입력 → "선물 코드를 다시 확인해 주세요", `ZZZZ9999` → "없는 선물 코드예요"
  6. `read_console_messages {onlyErrors:true}` 0건 · `read_network_requests {urlPattern:"promo-gift"}` 응답 확인

- [ ] **Step 3: 안드 에뮬레이터** — 디버그 APK(JDK 21+, openjdk-22) 설치 후
  ```bash
  adb shell am start -a android.intent.action.VIEW -d https://calmforest.cloud/g/QAPROMO1
  ```
  콜드 스타트 → chrome://inspect 로 웹뷰 `localStorage.cf_gift_code === 'QAPROMO1'` 확인.

- [ ] **Step 4: 정리** — QA 코드 끄고 테스트 기록 삭제:

```sql
update promo_codes set active = false where code = 'QAPROMO1';
delete from purchases where source = 'promo' and user_id in (select user_id from promo_redemptions where code = 'QAPROMO1');
delete from promo_redemptions where code = 'QAPROMO1';
```

- [ ] **Step 5: 코드 리뷰** — `superpowers:requesting-code-review` 로 `main..feat/promo-gift` 리뷰. 볼 것: uid 출처·익명 2단계·RLS·입력 길이(보안), 단계 순서·기기 표시·만료 유예·창 순서(정확성). CRITICAL·HIGH 반영 후 `npm test` 재실행.

- [ ] **Step 6: 결과 전달·dev docs** — PC·모바일 캡처를 사용자에게 보내고 `dev/active/promo-gift/` 세 파일 갱신 후 커밋.

---

### Task 10: 배포 (사용자 승인 후)

- [ ] **Step 1: DB 운영 적용**

Run: `CALM_ENV=/Users/uicheol_hwang/calm_forest/.env python3 sql/tests/promo_gift_selftest.py --apply`
Expected: `ALL PASS` 다음 `APPLIED migrate_promo_gift.sql`. 이어서 `--live` 로 한 번 더 `ALL PASS`.

- [ ] **Step 2: 선행 작업 상태 확인** — `d24ea672`(로그인 버그)·`6806311f`(앱 딥링크)가 아직 미배포면 같이 나간다. App ID Associated Domains 가 켜졌는지 사용자에게 확인.

- [ ] **Step 3: 병합·푸시·5곳 배포** — `feat/promo-gift` 를 main 에 병합, 푸시 전 키 스캔(memory `push-secret-scan.md`), memory `deploy-checklist.md` 순서로 5곳 **동시**(웹 wrangler → 토스 bundle_upload(memo) → Play 프로덕션 → iOS 제출 → itch zip). main·feat/capacitor-app 둘 다 푸시.

- [ ] **Step 4: 첫 캠페인 코드 등록** — 사용자가 정한 값으로:

```sql
insert into promo_codes (code, label, label_en, starts_at, ends_at, max_uses)
values ('<CODE>', '<봉투 머리 문구>', '<English label>', '<시작 시각>', '<종료 시각>', <한도 또는 null>);
```
링크 안내: `https://calmforest.cloud/g/<CODE>?utm_source=…` (UTM 은 뒤에 쿼리로 붙인다).

- [ ] **Step 5: 다음 날 BQ 재검증** — `promo_gift_arrive`·`promo_gift_claim`·`promo_gift_login_click` 이 GA4 export 에 들어왔는지, 숫자가 `promo_redemptions` 와 맞는지 확인.
