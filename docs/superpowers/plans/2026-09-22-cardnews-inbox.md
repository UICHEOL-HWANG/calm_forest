# 카드뉴스 소재 인박스 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 크론이 모은 카드뉴스 소재를 웹에서 훑고 묶음으로 정리할 수 있게 만든다.

**Architecture:** Cloudflare Pages(정적) + Worker API 3라우트 + Supabase Postgres. 브라우저는 Supabase에 직접 붙지 않고 Worker만 부른다. 프론트의 `supabase-js`는 구글 로그인 한 군데뿐이고, 데이터는 전부 Worker를 거친다. 크론은 사람이 아니라 시크릿 헤더로 인증한다.

**Tech Stack:** Cloudflare Pages Functions · Supabase(Postgres + Auth) · 바닐라 JS(빌드 없음) · `node:test`

**Spec:** [docs/superpowers/specs/2026-09-22-cardnews-inbox-design.md](../specs/2026-09-22-cardnews-inbox-design.md)

## Global Constraints

모든 태스크의 요구사항에 아래가 암묵적으로 포함된다.

- **스키마는 `cardnews`** — 게임 데이터(`public`)와 섞지 않는다.
- **`unique (owner, collected_on, source, title)`** — 크론이 로그인마다 깨어나므로 업로드는 반드시 `upsert`. 이게 없으면 중복이 쌓인다.
- **RLS 정책은 `owner = (select auth.uid())`** — `auth.uid()`를 서브쿼리로 감싼다(매 행 함수 호출 회피).
- **`worker/index.js`에 라우트를 등록하지 않으면 404다.** `functions/api`에 파일만 만들고 등록을 빠뜨려 사고가 난 전례가 있다(dex-notes·daily-quests).
- **프론트에 Supabase service key를 두지 않는다.** anon key와 URL만.
- **이미지는 이 단계에 없다.** 전부 텍스트다. R2 버킷은 2단계에서 만든다.
- **메일 발송을 막지 않는다.** 업로드가 실패해도 메일은 나가야 한다 — 메일이 아직 주 통로다.
- **`host.mjs`(KV)를 건드리지 않는다.** 발행용 임시 URL은 KV가 정확한 선택이다.
- 테스트: `npm test` (= `node --test tests/*.test.mjs`). 테스트 이름은 한국어로, 스펙 근거를 적는다.
- 커밋: `<type>: <설명>` (feat / fix / docs / test / chore).
- 코드 주석은 기존 파일들처럼 한국어로 "왜"를 적는다.

---

### Task 1: DB 스키마

**Files:**
- Create: `sql/migrations/migrate_cardnews_inbox.sql`

**Interfaces:**
- Consumes: 없음
- Produces: 테이블 `cardnews.topics`, `cardnews.bundles`. 이후 모든 태스크가 이 컬럼 이름에 의존한다.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`sql/migrations/migrate_cardnews_inbox.sql`:

```sql
-- =============================================================
--  카드뉴스 소재 인박스 — 1단계 스키마
--  스펙: docs/superpowers/specs/2026-09-22-cardnews-inbox-design.md
--  ⚠️ bundles 를 먼저 만든다 — topics.bundle_id 가 참조한다.
-- =============================================================
create schema if not exists cardnews;

create table if not exists cardnews.bundles (
  id          uuid primary key default gen_random_uuid(),
  owner       uuid not null references auth.users default auth.uid(),
  title       text not null,
  memo        text not null default '',
  status      text not null default 'draft'
              check (status in ('draft','ready')),
  created_at  timestamptz not null default now()
);

create table if not exists cardnews.topics (
  id            uuid primary key default gen_random_uuid(),
  owner         uuid not null references auth.users default auth.uid(),
  collected_on  date not null,
  source        text not null
                check (source in ('jobplanet','blind','dc','mlb','news')),
  category      text,
  title         text not null,
  excerpt       text not null default '',
  url           text,
  bundle_id     uuid references cardnews.bundles on delete set null,
  dismissed     boolean not null default false,
  created_at    timestamptz not null default now(),
  -- ⚠️ 크론이 부팅·로그인마다 깨어난다. 이 제약이 upsert 의 충돌 대상이다.
  unique (owner, collected_on, source, title)
);

create index if not exists topics_owner_day on cardnews.topics (owner, collected_on);
create index if not exists topics_bundle    on cardnews.topics (bundle_id);

alter table cardnews.topics  enable row level security;
alter table cardnews.bundles enable row level security;

-- (select auth.uid()) — 서브쿼리로 감싸야 행마다 함수를 부르지 않는다
drop policy if exists topics_own on cardnews.topics;
create policy topics_own on cardnews.topics
  for all using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

drop policy if exists bundles_own on cardnews.bundles;
create policy bundles_own on cardnews.bundles
  for all using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
```

- [ ] **Step 2: Supabase에 적용**

Supabase 대시보드 SQL Editor에 위 파일 내용을 붙여 실행한다. (MCP는 읽기 전용이라 DDL을 못 돌린다.)

- [ ] **Step 3: 적용 확인**

SQL Editor에서 실행:

```sql
select table_name from information_schema.tables where table_schema = 'cardnews';
-- 기대: bundles, topics

select conname from pg_constraint
where conrelid = 'cardnews.topics'::regclass and contype = 'u';
-- 기대: unique 제약 1건

select policyname from pg_policies where schemaname = 'cardnews';
-- 기대: topics_own, bundles_own
```

- [ ] **Step 4: 커밋**

```bash
git add sql/migrations/migrate_cardnews_inbox.sql
git commit -m "feat: 🗂️ 카드뉴스 소재 인박스 스키마 — topics·bundles + RLS"
```

---

### Task 2: 수집 JSON 정규화 모듈

출처마다 필드가 다르다. `jobplanet`은 `category`가 있고 url이 없다, `blind`도 url이 없다, `dc`/`mlb`만 url이 있는데 `javascript:;` 같은 값이 섞인다. 이걸 한 형태로 접는 **순수 함수**다. DB도 네트워크도 건드리지 않으므로 테스트가 싸다.

**Files:**
- Create: `functions/api/_cards-normalize.js`
- Test: `tests/cards-normalize.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `cleanUrl(value) -> string | null`
  - `normalizeTopics(raw, { collectedOn }) -> Array<{collected_on, source, category, title, excerpt, url}>`
  - 상수 `SOURCES = ['jobplanet','blind','dc','mlb','news']`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/cards-normalize.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanUrl, normalizeTopics, SOURCES } from '../functions/api/_cards-normalize.js';

test('cleanUrl: http(s) 만 남기고 나머지는 null', () => {
  assert.equal(cleanUrl('https://gall.dcinside.com/x'), 'https://gall.dcinside.com/x');
  assert.equal(cleanUrl('http://a.b/c'), 'http://a.b/c');
  // 실측: 디시 목록에서 'javascript:;' 가 url 자리에 들어온다
  assert.equal(cleanUrl('javascript:;'), null);
  assert.equal(cleanUrl(''), null);
  assert.equal(cleanUrl(undefined), null);
  assert.equal(cleanUrl('   '), null);
});

test('normalizeTopics: 출처별 필드 차이를 한 형태로 접는다', () => {
  const raw = {
    date: '2026-09-22',
    sources: {
      jobplanet: [{ category: '이직/취준', title: '제목A', excerpt: '본문A' }],
      blind:     [{ title: '제목B', excerpt: '본문B' }],
      dc:        [{ title: '제목C', url: 'javascript:;', excerpt: '' }],
      mlb:       [{ title: '제목D', url: 'https://mlbpark/x', excerpt: '본문D' }],
    },
  };
  const rows = normalizeTopics(raw, { collectedOn: '2026-09-22' });
  assert.equal(rows.length, 4);

  const a = rows.find(r => r.title === '제목A');
  assert.equal(a.source, 'jobplanet');
  assert.equal(a.category, '이직/취준');
  assert.equal(a.url, null, '잡플래닛은 url 이 없다');
  assert.equal(a.collected_on, '2026-09-22');

  const b = rows.find(r => r.title === '제목B');
  assert.equal(b.category, null, '블라인드는 category 가 없다');

  const c = rows.find(r => r.title === '제목C');
  assert.equal(c.url, null, 'javascript:; 는 DB 에 넣지 않는다');
  assert.equal(c.excerpt, '', '빈 본문은 빈 문자열로 (null 아님 — NOT NULL 컬럼)');

  assert.equal(rows.find(r => r.title === '제목D').url, 'https://mlbpark/x');
});

test('normalizeTopics: 쓰레기 입력을 조용히 버린다', () => {
  const raw = {
    sources: {
      dc: [
        { title: '', excerpt: 'x' },          // 제목 없음 → 버린다
        { excerpt: 'y' },                      // 제목 자체가 없음 → 버린다
        { title: '  공백 정리  ', excerpt: '  z  ' },
      ],
      unknown_src: [{ title: '알 수 없는 출처' }],   // 화이트리스트 밖 → 버린다
    },
  };
  const rows = normalizeTopics(raw, { collectedOn: '2026-09-22' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, '공백 정리', '앞뒤 공백을 턴다');
  assert.equal(rows[0].excerpt, 'z');
});

test('normalizeTopics: 같은 날 같은 출처에 같은 제목이 두 번 오면 하나만 남는다', () => {
  // DB 의 unique 제약과 같은 기준으로 미리 접는다 — 한 배치 안의 중복은
  // upsert 가 "ON CONFLICT DO UPDATE command cannot affect row a second time"
  // 로 통째로 실패시킨다.
  const raw = { sources: { blind: [{ title: '같은 제목', excerpt: '1' }, { title: '같은 제목', excerpt: '2' }] } };
  const rows = normalizeTopics(raw, { collectedOn: '2026-09-22' });
  assert.equal(rows.length, 1);
});

test('SOURCES: 스펙의 check 제약과 같은 목록', () => {
  assert.deepEqual(SOURCES, ['jobplanet', 'blind', 'dc', 'mlb', 'news']);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `node --test tests/cards-normalize.test.mjs`
Expected: FAIL — `Cannot find module '../functions/api/_cards-normalize.js'`

- [ ] **Step 3: 구현**

`functions/api/_cards-normalize.js`:

```js
// =============================================================
//  calm forest · 🗂️ 수집 JSON → DB 행 정규화 (순수 함수)
//  ------------------------------------------------------------
//  topics.mjs 가 뱉는 { date, sources:{...}, dropped } 를 topics 테이블
//  행 배열로 접는다. 네트워크도 DB 도 건드리지 않는다 — 그래서 테스트가 싸다.
//
//  ⚠️ 출처마다 필드가 다르다(실측):
//     jobplanet {category,title,excerpt} · blind {title,excerpt}
//     dc·mlb    {title,url,excerpt}  ← url 자리에 'javascript:;' 가 온다
// =============================================================

// DB 의 check 제약과 같은 목록이어야 한다. 여기 없는 출처는 통째로 버린다
// (오타 난 키가 조용히 DB 로 흘러드는 것을 막는다).
export const SOURCES = ['jobplanet', 'blind', 'dc', 'mlb', 'news'];

/** http(s) 로 시작하는 것만 URL 로 인정한다. 나머지는 null — DB 에 쓰레기를 들이지 않는다 */
export function cleanUrl(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return /^https?:\/\//i.test(v) ? v : null;
}

/**
 * @param raw  topics.mjs 출력 { date, sources, dropped }
 * @param collectedOn 'YYYY-MM-DD' — raw.date 를 믿지 않고 호출자가 정한다
 *                    (크론이 자정을 넘겨 돌 수 있다)
 */
export function normalizeTopics(raw, { collectedOn }) {
  const sources = (raw && raw.sources) || {};
  const rows = [];
  // 한 배치 안의 중복을 미리 접는다 — upsert 는 같은 충돌 키를 한 문장에서
  // 두 번 건드리면 통째로 실패한다(ON CONFLICT DO UPDATE ... second time).
  const seen = new Set();

  for (const source of SOURCES) {
    const items = sources[source];
    if (!Array.isArray(items)) continue;

    for (const it of items) {
      const title = typeof it?.title === 'string' ? it.title.trim() : '';
      if (!title) continue;                      // 제목 없는 건 소재가 아니다

      const key = JSON.stringify([source, title]);
      if (seen.has(key)) continue;
      seen.add(key);

      const category = typeof it?.category === 'string' && it.category.trim()
        ? it.category.trim() : null;
      const excerpt = typeof it?.excerpt === 'string' ? it.excerpt.trim() : '';

      rows.push({
        collected_on: collectedOn,
        source,
        category,
        title,
        excerpt,                                  // NOT NULL 컬럼 — null 대신 ''
        url: cleanUrl(it?.url),
      });
    }
  }
  return rows;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/cards-normalize.test.mjs`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add functions/api/_cards-normalize.js tests/cards-normalize.test.mjs
git commit -m "feat: 🗂️ 수집 JSON 정규화 — 출처별 필드 차이·쓰레기 url·배치 내 중복"
```

---

### Task 3: 인증 헬퍼

사람과 크론의 인증이 갈린다. 그 판단을 한 곳에 모은다.

**Files:**
- Create: `functions/api/_cards-auth.js`
- Test: `tests/cards-auth.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `json(body, status) -> Response`
  - `readBearer(request) -> string | null`
  - `safeEqual(a, b) -> boolean`
  - `isIngestAuthorized(request, env) -> boolean`
  - `getUserId(token, env) -> Promise<string | null>`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/cards-auth.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBearer, safeEqual, isIngestAuthorized } from '../functions/api/_cards-auth.js';

const req = (headers) => new Request('https://x/api/cards-topics', { headers });

test('readBearer: Authorization 헤더에서 토큰만 꺼낸다', () => {
  assert.equal(readBearer(req({ Authorization: 'Bearer abc.def' })), 'abc.def');
  assert.equal(readBearer(req({ Authorization: 'bearer abc' })), 'abc', '대소문자를 가리지 않는다');
  assert.equal(readBearer(req({ Authorization: 'Basic abc' })), null);
  assert.equal(readBearer(req({})), null);
});

test('safeEqual: 길이가 달라도 터지지 않고 false', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), false, '빈 값끼리는 통과시키지 않는다 — 시크릿 미설정 사고 방지');
  assert.equal(safeEqual(undefined, undefined), false);
});

test('isIngestAuthorized: 시크릿이 맞을 때만 true', () => {
  const env = { CARDNEWS_INGEST_SECRET: 's3cret' };
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': 's3cret' }), env), true);
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': 'wrong' }), env), false);
  assert.equal(isIngestAuthorized(req({}), env), false);
});

test('isIngestAuthorized: 서버에 시크릿이 없으면 무조건 false', () => {
  // 환경변수를 안 넣은 채 배포하면 아무나 통과하는 사고가 난다 — 막아 둔다
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': '' }), {}), false);
  assert.equal(isIngestAuthorized(req({ 'x-cardnews-secret': 'anything' }), {}), false);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인**

Run: `node --test tests/cards-auth.test.mjs`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`functions/api/_cards-auth.js`:

```js
// =============================================================
//  calm forest · 🔐 카드뉴스 API 인증 공통부
//  ------------------------------------------------------------
//  인증이 둘로 갈린다:
//    사람  → Supabase Auth 세션 JWT (Authorization: Bearer)
//    크론  → 시크릿 헤더 (x-cardnews-secret). 로그인한 사용자가 없다.
// =============================================================

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function readBearer(request) {
  const raw = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m ? m[1].trim() : null;
}

/** 길이가 같을 때 끝까지 훑어 비교한다. 빈 값끼리는 통과시키지 않는다. */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isIngestAuthorized(request, env) {
  // ⚠️ 서버에 시크릿이 없으면 무조건 거부한다. 환경변수를 빠뜨린 채 배포했을 때
  //    아무나 쓰기가 되는 게 제일 나쁜 실패다.
  return safeEqual(request.headers.get('x-cardnews-secret') || '', env?.CARDNEWS_INGEST_SECRET || '');
}

/**
 * JWT 서명을 직접 검증하지 않고 Supabase 에 물어본다 — 사용자가 1명이라
 * 요청당 호출 1회가 부담이 아니고, 키 롤링·만료를 그쪽이 책임진다.
 * @returns 사용자 uuid, 아니면 null
 */
export async function getUserId(token, env) {
  if (!token || !env?.SUPABASE_URL || !env?.SUPABASE_ANON_KEY) return null;
  const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const user = await res.json().catch(() => null);
  return user?.id || null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/cards-auth.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add functions/api/_cards-auth.js tests/cards-auth.test.mjs
git commit -m "feat: 🔐 카드뉴스 API 인증 공통부 — 사람은 JWT, 크론은 시크릿"
```

---

### Task 4: `cards-ingest` 라우트

크론이 수집 결과를 올리는 입구. 데이터가 들어와야 나머지 화면이 의미를 가지므로 먼저 만든다.

**Files:**
- Create: `functions/api/cards-ingest.js`
- Modify: `worker/index.js` (import 블록 21~22행 근처, 라우트 분기 `/api/orchard-events` 뒤)

**Interfaces:**
- Consumes: Task 2의 `normalizeTopics`, Task 3의 `isIngestAuthorized`·`json`
- Produces: `POST /api/cards-ingest` — 요청 `{ date, sources }`, 응답 `{ ok: true, count: <숫자> }`

- [ ] **Step 1: 구현**

`functions/api/cards-ingest.js`:

```js
// =============================================================
//  calm forest · 📥 카드뉴스 소재 수집 업로드 (Pages Function)
//  ------------------------------------------------------------
//  POST /api/cards-ingest   헤더: x-cardnews-secret
//    body { date: 'YYYY-MM-DD', sources: { jobplanet:[...], ... } }
//    → { ok: true, count: N }
//
//  ⚠️ 크론이 부른다. 로그인한 사용자가 없으므로 owner 를 auth.uid() 에서
//     꺼낼 수 없다 — 환경변수 CARDNEWS_OWNER_UID 를 쓴다.
//  ⚠️ upsert 다. 크론은 부팅·로그인마다 깨어나므로 같은 날 여러 번 올라온다.
// =============================================================
import { normalizeTopics } from './_cards-normalize.js';
import { isIngestAuthorized, json } from './_cards-auth.js';

export async function onRequestPost({ request, env }) {
  if (!isIngestAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);

  const owner = env.CARDNEWS_OWNER_UID;
  if (!owner) return json({ error: 'CARDNEWS_OWNER_UID missing' }, 500);

  const raw = await request.json().catch(() => null);
  if (!raw) return json({ error: 'bad json' }, 400);

  // raw.date 를 믿지 않는다 — 크론이 자정을 넘겨 돌 수 있다. 다만 주면 존중한다.
  const collectedOn = /^\d{4}-\d{2}-\d{2}$/.test(raw.date || '')
    ? raw.date
    : new Date().toISOString().slice(0, 10);

  const rows = normalizeTopics(raw, { collectedOn }).map(r => ({ ...r, owner }));
  if (rows.length === 0) return json({ ok: true, count: 0 });

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/topics?on_conflict=owner,collected_on,source,title`,
    {
      method: 'POST',
      headers: {
        apikey: env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'content-type': 'application/json',
        'content-profile': 'cardnews',         // public 이 아니라 cardnews 스키마
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    },
  );
  if (!res.ok) return json({ error: 'upsert failed', detail: await res.text() }, 502);

  return json({ ok: true, count: rows.length });
}
```

- [ ] **Step 2: `worker/index.js`에 등록**

import 블록(다른 `functions/api` import들 옆)에 추가:

```js
import { onRequestPost as cardsIngest } from '../functions/api/cards-ingest.js';
```

라우트 분기(`/api/orchard-events` 블록 뒤)에 추가:

```js
  // 📥 카드뉴스 소재 업로드 — 크론이 부른다(사람 JWT 아님, 시크릿 헤더)
  if (pathname === '/api/cards-ingest') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    return await cardsIngest({ request, env });
  }
```

- [ ] **Step 3: 등록 확인**

Run: `grep -c "cards-ingest" worker/index.js`
Expected: 2 이상. **0이면 배포해도 404다.**

- [ ] **Step 4: Cloudflare 환경변수 추가**

Worker 설정에 넣는다(값은 이 문서에 적지 않는다): `CARDNEWS_INGEST_SECRET`(새 랜덤 문자열), `CARDNEWS_OWNER_UID`(Supabase Auth의 본인 계정 uuid), `SUPABASE_URL`·`SUPABASE_SERVICE_KEY`·`SUPABASE_ANON_KEY`(기존 것이 있으면 재사용).

⚠️ **`SUPABASE_ANON_KEY`를 빠뜨리면 Task 5·6이 배포 후 모든 요청을 401로 떨어뜨린다** — `getUserId()`가 이 값을 `apikey` 헤더에 쓰는데, 없으면 항상 `null`을 반환한다. Task 10 Step 4의 "401 기대" 검증이 이 실패를 정상으로 오인하므로 여기서 확실히 넣는다. anon key는 원래 공개되는 값이라 "프론트에 service key를 두지 않는다"는 제약과 무관하다.

- [ ] **Step 5: 커밋**

```bash
git add functions/api/cards-ingest.js worker/index.js
git commit -m "feat: 📥 카드뉴스 소재 업로드 라우트 — 시크릿 인증·upsert"
```

---

### Task 5: `cards-topics` 라우트

**Files:**
- Create: `functions/api/cards-topics.js`
- Modify: `worker/index.js`

**Interfaces:**
- Consumes: Task 3의 `readBearer`·`getUserId`·`json`
- Produces:
  - `GET /api/cards-topics?date=YYYY-MM-DD&showDismissed=1` → `{ topics: [{id, source, category, title, excerpt, url, bundle_id, dismissed}] }`
  - `PATCH /api/cards-topics` body `{ id, dismissed }` → `{ ok: true }`

- [ ] **Step 1: 구현**

`functions/api/cards-topics.js`:

```js
// =============================================================
//  calm forest · 🗂️ 소재 목록·숨김 (Pages Function)
//  ------------------------------------------------------------
//  GET   /api/cards-topics?date=2026-09-22[&showDismissed=1]
//  PATCH /api/cards-topics   { id, dismissed }
//
//  ⚠️ 사람이 부른다. owner 는 JWT 에서 꺼낸다 — 클라이언트가 보낸 owner 는 믿지 않는다.
// =============================================================
import { readBearer, getUserId, json } from './_cards-auth.js';

const COLS = 'id,source,category,title,excerpt,url,bundle_id,dismissed';

const H = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
  'accept-profile': 'cardnews',
  'content-profile': 'cardnews',
});

export async function onRequestGet({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const url = new URL(request.url);
  const date = url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'bad date' }, 400);

  let q = `topics?select=${COLS}&owner=eq.${uid}&collected_on=eq.${date}&order=source.asc,created_at.asc`;
  if (url.searchParams.get('showDismissed') !== '1') q += '&dismissed=is.false';

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${q}`, { headers: H(env) });
  if (!res.ok) return json({ error: 'query failed' }, 502);
  return json({ topics: await res.json() });
}

export async function onRequestPatch({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  if (!body?.id || typeof body.dismissed !== 'boolean') return json({ error: 'bad body' }, 400);

  // owner=eq.<uid> 를 조건에 함께 건다 — 남의 행 id 를 보내도 0건이 걸린다
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/topics?id=eq.${body.id}&owner=eq.${uid}`,
    {
      method: 'PATCH',
      headers: { ...H(env), Prefer: 'return=minimal' },
      body: JSON.stringify({ dismissed: body.dismissed }),
    },
  );
  if (!res.ok) return json({ error: 'update failed' }, 502);
  return json({ ok: true });
}
```

- [ ] **Step 2: `worker/index.js`에 등록**

```js
import { onRequestGet as cardsTopicsGet, onRequestPatch as cardsTopicsPatch } from '../functions/api/cards-topics.js';
```

```js
  // 🗂️ 카드뉴스 소재 목록·숨김 — 사람이 부른다(Supabase Auth JWT)
  if (pathname === '/api/cards-topics') {
    if (request.method === 'GET')   return await cardsTopicsGet({ request, env });
    if (request.method === 'PATCH') return await cardsTopicsPatch({ request, env });
    return new Response('Method Not Allowed', { status: 405 });
  }
```

- [ ] **Step 3: 등록 확인**

Run: `grep -c "cards-topics" worker/index.js`
Expected: 2 이상

- [ ] **Step 4: 커밋**

```bash
git add functions/api/cards-topics.js worker/index.js
git commit -m "feat: 🗂️ 소재 목록·숨김 라우트"
```

---

### Task 6: `cards-bundles` 라우트

**Files:**
- Create: `functions/api/cards-bundles.js`
- Modify: `worker/index.js`

**Interfaces:**
- Consumes: Task 3의 `readBearer`·`getUserId`·`json`
- Produces:
  - `GET /api/cards-bundles` → `{ bundles: [{id, title, memo, status, created_at, topic_count}] }`
  - `POST /api/cards-bundles` body `{ title, memo, topic_ids: [] }` → `{ ok: true, id }`
  - `PATCH /api/cards-bundles` body `{ id, title?, memo?, status? }` → `{ ok: true }`

- [ ] **Step 1: 구현**

`functions/api/cards-bundles.js`:

```js
// =============================================================
//  calm forest · 📦 소재 묶음 (Pages Function)
//  ------------------------------------------------------------
//  GET   /api/cards-bundles
//  POST  /api/cards-bundles   { title, memo, topic_ids: [] }
//  PATCH /api/cards-bundles   { id, title?, memo?, status? }
//
//  묶음 하나 = 카드뉴스 한 편의 씨앗. status='ready' 가 "초안 만들어 달라" 신호다.
// =============================================================
import { readBearer, getUserId, json } from './_cards-auth.js';

const H = (env) => ({
  apikey: env.SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  'content-type': 'application/json',
  'accept-profile': 'cardnews',
  'content-profile': 'cardnews',
});

export async function onRequestGet({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  // topics(count) 로 묶인 소재 수를 함께 센다 — 목록에 "3건" 을 보여주려고
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bundles?select=id,title,memo,status,created_at,topics(count)&owner=eq.${uid}&order=created_at.desc`,
    { headers: H(env) },
  );
  if (!res.ok) return json({ error: 'query failed' }, 502);
  const rows = await res.json();
  return json({
    bundles: rows.map(b => ({
      id: b.id, title: b.title, memo: b.memo, status: b.status,
      created_at: b.created_at, topic_count: b.topics?.[0]?.count ?? 0,
    })),
  });
}

export async function onRequestPost({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  if (!title) return json({ error: 'title required' }, 400);
  const ids = Array.isArray(body?.topic_ids) ? body.topic_ids.filter(x => typeof x === 'string') : [];

  const made = await fetch(`${env.SUPABASE_URL}/rest/v1/bundles`, {
    method: 'POST',
    headers: { ...H(env), Prefer: 'return=representation' },
    body: JSON.stringify([{ owner: uid, title, memo: (body?.memo || '').trim() }]),
  });
  if (!made.ok) return json({ error: 'insert failed' }, 502);
  const bundle = (await made.json())[0];

  // 소재를 묶음에 건다. 여기서 실패해도 묶음은 남는다 — 화면에서 다시 담으면 된다.
  if (ids.length) {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/topics?owner=eq.${uid}&id=in.(${ids.join(',')})`,
      {
        method: 'PATCH',
        headers: { ...H(env), Prefer: 'return=minimal' },
        body: JSON.stringify({ bundle_id: bundle.id }),
      },
    );
  }
  return json({ ok: true, id: bundle.id });
}

export async function onRequestPatch({ request, env }) {
  const uid = await getUserId(readBearer(request), env);
  if (!uid) return json({ error: 'unauthorized' }, 401);

  const body = await request.json().catch(() => null);
  if (!body?.id) return json({ error: 'id required' }, 400);

  const patch = {};
  if (typeof body.title === 'string') patch.title = body.title.trim();
  if (typeof body.memo === 'string') patch.memo = body.memo.trim();
  if (body.status === 'draft' || body.status === 'ready') patch.status = body.status;
  if (Object.keys(patch).length === 0) return json({ error: 'nothing to update' }, 400);

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/bundles?id=eq.${body.id}&owner=eq.${uid}`,
    { method: 'PATCH', headers: { ...H(env), Prefer: 'return=minimal' }, body: JSON.stringify(patch) },
  );
  if (!res.ok) return json({ error: 'update failed' }, 502);
  return json({ ok: true });
}
```

- [ ] **Step 2: `worker/index.js`에 등록**

```js
import { onRequestGet as cardsBundlesGet, onRequestPost as cardsBundlesPost, onRequestPatch as cardsBundlesPatch } from '../functions/api/cards-bundles.js';
```

```js
  // 📦 카드뉴스 묶음 — status='ready' 가 초안 요청 신호
  if (pathname === '/api/cards-bundles') {
    if (request.method === 'GET')   return await cardsBundlesGet({ request, env });
    if (request.method === 'POST')  return await cardsBundlesPost({ request, env });
    if (request.method === 'PATCH') return await cardsBundlesPatch({ request, env });
    return new Response('Method Not Allowed', { status: 405 });
  }
```

- [ ] **Step 3: 세 라우트가 모두 등록됐는지 확인**

Run:

```bash
for r in cards-ingest cards-topics cards-bundles; do printf '%s: %s\n' "$r" "$(grep -c "$r" worker/index.js)"; done
```

Expected: 셋 다 2 이상

- [ ] **Step 4: 커밋**

```bash
git add functions/api/cards-bundles.js worker/index.js
git commit -m "feat: 📦 소재 묶음 라우트 — 생성·목록·상태 변경"
```

---

### Task 7: 크론 업로드 연동

**Files:**
- Create: `tools/cardnews/ingest-upload.mjs`
- Modify: `tools/cardnews/cron-topics.sh`

**Interfaces:**
- Consumes: Task 4의 `POST /api/cards-ingest`
- Produces: `node ingest-upload.mjs <json파일>` — 성공 시 종료코드 0, 실패 시 1

- [ ] **Step 1: 업로더 작성**

`tools/cardnews/ingest-upload.mjs`:

```js
// =============================================================
//  calm forest · 📤 수집 결과를 인박스 API 로 올린다
//  ------------------------------------------------------------
//  사용: node ingest-upload.mjs decks/_inbox/2026-09-22-community.json
//  환경: CARDNEWS_API_BASE, CARDNEWS_INGEST_SECRET
//
//  ⚠️ 실패해도 크론 전체를 죽이지 않는다 — 호출하는 쪽이 판단한다.
// =============================================================
import { readFile } from 'node:fs/promises';

const file = process.argv[2];
const base = process.env.CARDNEWS_API_BASE;
const secret = process.env.CARDNEWS_INGEST_SECRET;

if (!file) { console.error('사용: node ingest-upload.mjs <수집 json>'); process.exit(1); }
if (!base || !secret) { console.error('CARDNEWS_API_BASE / CARDNEWS_INGEST_SECRET 이 없다'); process.exit(1); }

const raw = JSON.parse(await readFile(file, 'utf8'));

const res = await fetch(`${base}/api/cards-ingest`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-cardnews-secret': secret },
  body: JSON.stringify({ date: raw.date, sources: raw.sources }),
});

const text = await res.text();
if (!res.ok) { console.error(`업로드 실패 ${res.status}: ${text}`); process.exit(1); }
console.log(`업로드 완료: ${text}`);
```

- [ ] **Step 2: `cron-topics.sh`에 단계 추가**

`cat "$OUT" >> "$LOG"` 다음 줄, `# ── 메일 ──` 블록 **앞에** 넣는다:

```bash
# ── 인박스 업로드 ────────────────────────────────────────────
#  ⚠️ 실패해도 메일은 나가야 한다. 메일이 아직 주 통로다 — 여기서 exit 하지 않는다.
#  ⚠️ 시크릿은 리포에 없다. ~/.config/calmforest/cardnews.env 에서 읽는다.
if [ "$STATUS" = "성공" ]; then
  ENVFILE="$HOME/.config/calmforest/cardnews.env"
  if [ -f "$ENVFILE" ]; then
    # shellcheck disable=SC1090
    . "$ENVFILE"
    INBOX="decks/_inbox/$(date '+%Y-%m-%d')-community.json"
    if [ -f "$INBOX" ]; then
      if node ingest-upload.mjs "$INBOX" >> "$LOG" 2>&1; then
        echo "인박스 업로드 완료" >> "$LOG"
      else
        echo "⚠️ 인박스 업로드 실패 — 메일은 계속 보낸다" >> "$LOG"
      fi
    else
      echo "⚠️ 수집 파일이 없다: $INBOX" >> "$LOG"
    fi
  else
    echo "인박스 업로드 건너뜀 — $ENVFILE 이 없다" >> "$LOG"
  fi
fi
```

- [ ] **Step 3: 환경파일 만들기**

```bash
mkdir -p ~/.config/calmforest
printf 'export CARDNEWS_API_BASE=https://calmforest.cloud\nexport CARDNEWS_INGEST_SECRET=REPLACE_WITH_TASK4_VALUE\n' > ~/.config/calmforest/cardnews.env
chmod 600 ~/.config/calmforest/cardnews.env
```

`REPLACE_WITH_TASK4_VALUE` 자리에 Task 4에서 만든 시크릿을 손으로 넣는다.

- [ ] **Step 4: 문법 검사와 수동 업로드 확인**

```bash
bash -n tools/cardnews/cron-topics.sh
cd tools/cardnews && . ~/.config/calmforest/cardnews.env && node ingest-upload.mjs "decks/_inbox/$(date '+%Y-%m-%d')-community.json"
```

Expected: `업로드 완료: {"ok":true,"count":20}` 형태

- [ ] **Step 5: 두 번 올려도 안 늘어나는지 확인**

같은 명령을 한 번 더 실행한 뒤 Supabase SQL Editor에서:

```sql
select count(*) from cardnews.topics where collected_on = current_date;
```

Expected: 두 번 올린 뒤에도 행 수가 같다(upsert·unique 동작)

- [ ] **Step 6: 커밋**

```bash
git add tools/cardnews/ingest-upload.mjs tools/cardnews/cron-topics.sh
git commit -m "feat: 📤 수집 결과를 인박스로 업로드 — 실패해도 메일은 나간다"
```

---

### Task 8: 레이아웃 시안 비교 (결정 게이트)

**한 안만 만들어 승인받지 않는다.** 시안 3개를 렌더해 PC·모바일을 나란히 캡처하고 고른 뒤에 구현한다.

**Files:**
- Create: `tools/cardnews/web/_mock/a.html`, `b.html`, `c.html` (버리는 목업)

**Interfaces:**
- Consumes: 없음 (하드코딩한 가짜 소재 6건)
- Produces: 선택된 레이아웃 1안 — Task 9가 이걸 구현한다

- [ ] **Step 1: 시안 3개 작성**

같은 가짜 데이터(출처 4곳, 소재 6건)로 세 배치를 만든다. 전부 정적 HTML이고 로직은 없다.

- **A안 — 좌우 분할**: 왼쪽 소재 목록(스크롤), 오른쪽 고정 트레이. 담아도 목록 위치가 안 흔들린다. 넓은 화면에 유리.
- **B안 — 위아래**: 소재 목록이 전체 폭, 트레이는 화면 하단 고정 바. 모바일에서 자연스럽다.
- **C안 — 한 줄 목록 + 모달**: 제목만 조밀하게 늘어놓고 클릭하면 본문이 모달로. 20건을 가장 빨리 훑는다. 대신 본문을 보려면 한 번 더 눌러야 한다.

- [ ] **Step 2: 세 안을 PC·모바일 폭으로 캡처**

각 안을 데스크톱(1280px)과 모바일(375px)로 열어 캡처한다. 총 6장.

- [ ] **Step 3: 나란히 놓고 사용자에게 선택받기**

6장을 한 번에 보여주고 고르게 한다. **고르기 전에는 Task 9로 넘어가지 않는다.**

- [x] **Step 4: 고른 안을 기록하고 목업 정리**

**선택: A안(좌우 분할) — 담을 때마다 목록이 밀리지 않는 것이 하루 20건 훑는 작업에서 가장 크다. 모바일에서는 트레이가 목록 아래로 내려간다.** (2026-09-22)

비교에서 드러난 것: 실측 제목 길이(잡플래닛 최대 120자)를 넣자 **C안의 전제가 깨졌다.** "제목만 한 줄로 조밀하게"가 성립하지 않아 조밀함이라는 유일한 장점이 사라졌고, 본문이 아예 없는 건(디시·엠팍)은 모달을 열어도 빈 화면이 된다. 가짜 데이터를 쓰더라도 **길이 분포는 실측을 따라야** 이런 게 보인다.

목업은 버리는 물건이므로 지운다.

```bash
rm -rf tools/cardnews/web/_mock
git add docs/superpowers/plans/2026-09-22-cardnews-inbox.md
git commit -m "docs: 🎨 인박스 레이아웃 시안 선택 기록"
```

---

### Task 9: 프론트 구현

**Files:**
- Create: `tools/cardnews/web/index.html`
- Create: `tools/cardnews/web/config.js`
- Create: `tools/cardnews/web/app.js`
- Create: `tools/cardnews/web/style.css`

**Interfaces:**
- Consumes: Task 5·6의 세 라우트, Task 8에서 고른 레이아웃
- Produces: 배포 가능한 정적 사이트

- [ ] **Step 1: 로그인과 API 헬퍼**

`index.html`은 `supabase-js`를 CDN에서 불러 **구글 로그인만** 처리한다. 데이터는 전부 `fetch`로 Worker를 부르고, 모든 요청에 `Authorization: Bearer <access_token>`을 싣는다.

먼저 설정 상수를 `tools/cardnews/web/config.js`에 둔다. **anon key와 URL만** 들어간다 — 이 둘은 브라우저에 공개되는 값이고, RLS가 실제 방어선이다. service key는 절대 여기 두지 않는다.

```js
// tools/cardnews/web/config.js
// ⚠️ 공개되는 값만 둔다. service key 는 Worker 환경변수에만 있다.
export const SUPABASE_URL = 'https://<프로젝트>.supabase.co';
export const SUPABASE_ANON_KEY = '<anon key>';
```

`showLogin()`은 로그인 버튼 화면을 보여주고 `sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } })`를 건다. 세션이 있으면 인박스를, 없으면 이 화면을 그린다.

`app.js`:

```js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ⚠️ supabase-js 를 쓰는 곳은 로그인 하나뿐이다. 소재·묶음 읽기와 쓰기는
//    전부 Worker 를 거친다 — service key 가 브라우저에 내려오지 않게.
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function token() {
  const { data } = await sb.auth.getSession();
  return data.session?.access_token || null;
}

async function api(path, init = {}) {
  const t = await token();
  if (!t) { showLogin(); throw new Error('no session'); }
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), 'content-type': 'application/json', Authorization: `Bearer ${t}` },
  });
  if (res.status === 401) { showLogin(); throw new Error('unauthorized'); }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const loadTopics = (date, showDismissed) =>
  api(`/api/cards-topics?date=${date}${showDismissed ? '&showDismissed=1' : ''}`);

const setDismissed = (id, dismissed) =>
  api('/api/cards-topics', { method: 'PATCH', body: JSON.stringify({ id, dismissed }) });

const createBundle = (title, memo, topic_ids) =>
  api('/api/cards-bundles', { method: 'POST', body: JSON.stringify({ title, memo, topic_ids }) });

const loadBundles = () => api('/api/cards-bundles');

const setBundleStatus = (id, status) =>
  api('/api/cards-bundles', { method: 'PATCH', body: JSON.stringify({ id, status }) });
```

- [ ] **Step 2: 소재 목록 렌더**

`loadTopics(오늘)`를 불러 출처별 섹션으로 그린다. 카드 하나에 제목·접힌 본문·출처 배지·버튼 둘(담기/숨기기). `bundle_id`가 이미 있는 소재는 "묶음에 담김"으로 표시하고 담기 버튼을 끈다.

- [ ] **Step 3: 담기 트레이와 묶음 저장**

담은 소재 id를 메모리 배열에 모은다. 제목(필수)과 메모(선택)를 받아 `createBundle`을 부르고, 성공하면 배열을 비우고 `loadTopics`를 다시 불러 화면을 맞춘다.

- [ ] **Step 4: 숨김 토글**

`dismissed`는 기본으로 목록에서 빠진다. "숨긴 것 보기" 체크박스가 켜지면 `showDismissed=1`로 다시 읽고, 숨긴 카드에는 되살리기 버튼(`setDismissed(id,false)`)을 둔다.

- [ ] **Step 5: 묶음 목록 화면**

`loadBundles()`로 묶음·`topic_count`·상태를 보여준다. `draft`인 묶음에 **초안 요청** 버튼을 두고 `setBundleStatus(id,'ready')`를 부른다.

- [ ] **Step 6: 로컬에서 한 바퀴 돌기**

```bash
cd tools/cardnews/web && python3 -m http.server 8787
```

로그인 → 소재 목록 → 담기 → 묶음 저장 → 묶음 목록 → 초안 요청까지 손으로 확인한다. (Worker를 로컬에서 부르려면 `wrangler dev`를 쓰거나 API base를 배포 도메인으로 둔다.)

- [ ] **Step 7: 모바일 폭 확인**

375px 폭에서 소재가 읽히고 담기 버튼이 눌리는지 본다. 가로 스크롤이 생기면 고친다.

- [ ] **Step 8: 커밋**

```bash
git add tools/cardnews/web
git commit -m "feat: 🗂️ 소재 인박스 웹 — 로그인·목록·담기·묶음"
```

---

### Task 10: 배포와 종단 검증

**Files:**
- Modify: 없음 (설정 작업)

**Interfaces:**
- Consumes: Task 1~9 전부
- Produces: `https://cards.calmforest.cloud` 가동

- [ ] **Step 1: Cloudflare Pages 프로젝트 생성**

새 Pages 프로젝트를 만들고 **root directory를 `tools/cardnews/web`** 으로 지정한다. 빌드 명령은 없다(정적). 게임 사이트와 **별도 프로젝트**여야 게임 릴리스·토스 번들·itch zip에 딸려가지 않는다.

- [ ] **Step 2: 도메인 연결**

`cards.calmforest.cloud` 를 이 Pages 프로젝트에 붙인다.

- [ ] **Step 3: Supabase Auth 리디렉트 허용 목록에 추가**

Supabase 대시보드 → Authentication → URL Configuration 에 `https://cards.calmforest.cloud` 를 넣는다. **안 넣으면 구글 로그인이 돌아오지 못한다.**

- [ ] **Step 4: 인증 거부 확인**

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://cards.calmforest.cloud/api/cards-topics
curl -s -o /dev/null -w '%{http_code}\n' https://cards.calmforest.cloud/api/cards-bundles
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://cards.calmforest.cloud/api/cards-ingest -d '{}'
```

Expected: 셋 다 `401` (404면 Task 4~6의 worker 등록이 빠진 것이다)

- [ ] **Step 5: 크론을 실제로 한 번 돌려 확인**

```bash
rm -f "$HOME/Library/Application Support/calmforest/topics-last-run"
launchctl kickstart -k gui/$(id -u)/cloud.calmforest.topics
```

`~/Library/Logs/calmforest-topics.log` 에 `인박스 업로드 완료`가 찍히고, **메일도 평소대로 오는지** 함께 확인한다.

- [ ] **Step 6: 나머지 검증 항목 확인**

```sql
-- url 쓰레기가 안 들어갔다
select count(*) from cardnews.topics where url is not null and url not like 'http%';
-- 기대: 0

-- 두 번 올려도 안 늘어난다 (Task 7 에서 이미 확인, 크론 실행 후 재확인)
select count(*) from cardnews.topics where collected_on = current_date;
```

웹에서 손으로 확인:
- 소재를 담아 묶음을 만들면 `bundle_id`가 채워진다.
- 묶음을 지우면 소재가 `bundle_id is null`로 **살아남는다**(`on delete set null`).
- 숨긴 소재가 기본 목록에서 빠지고 토글로 돌아온다.
- 모바일 폭에서 읽히고 눌린다.

- [ ] **Step 7: 전체 테스트**

Run: `npm test`
Expected: 기존 테스트 + `cards-normalize`(5) + `cards-auth`(4) 전부 PASS

- [ ] **Step 8: 커밋**

```bash
git commit --allow-empty -m "chore: 🚀 카드뉴스 소재 인박스 1단계 가동 확인"
```

---

## 완료 기준

- 아침에 맥을 켜면 소재가 `cards.calmforest.cloud` 에 들어와 있다.
- 소재를 훑어 묶음으로 만들고 **초안 요청**까지 누를 수 있다.
- 메일은 평소대로 온다(웹이 메일을 대체하지 않았다).
- `npm test` 가 통과한다.
