# 계절 한정 2차 (반디·채집물 + 계절 끝 푸시 + 스탬프 카드 설계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계절(14일)마다 "지금만 만날 수 있는 것"을 물고기 1종에서 물고기·반디·채집물 3종으로 넓히고, 계절이 끝나기 전에 푸시로 알려 복귀 계기를 만든다. 스탬프 카드는 설계 게이트까지만 간다.

**Architecture:** 새 시스템을 만들지 않는다. 계절 게이트는 이미 `js/dex-gates.js` 의 `DEX_GATES[cat][id].season` 으로 돌아가고(물고기 4종), 안내 문구는 `js/season.js` 의 순수 함수가 만든다. 이번 작업은 그 표에 줄을 추가하고, "계절 한정 어종 1개"를 받던 안내 함수를 "계절 한정 목록"을 받게 일반화하고, 푸시 판정(`functions/push/pick-kind.js`)에 종류 하나를 더한다.

**Tech Stack:** 바닐라 ES 모듈 + Three.js, `node --test tests/*.test.mjs`, Cloudflare Worker(`functions/`), Supabase Postgres.

**Spec:** 별도 스펙 없음. 근거 문서는 `docs/superpowers/specs/2026-10-01-seasons-design.md`(계절 1단계) 와 `docs/superpowers/specs/2026-09-18-dex-gates-design.md`(게이트). 이 계획서의 "확정된 설계" 절이 스펙을 대신한다.

**기준 커밋:** main `c7067238`, 브랜치 `feat/season-limited-v2`, 워크트리 `.claude/worktrees/season-limited`.

## Global Constraints

- 사용자와의 대화는 한국어 존댓말만. 코드·커밋 메시지·변수명은 영어.
- 새 코드·CSS·테스트에 **주석을 쓰지 않는다**(기존 파일의 주석은 건드리지 않는다). 설명은 커밋 메시지와 dev docs로.
- `js/game.js` 에는 연결 줄만 추가한다. 새 로직은 `js/season.js`, `js/dex-gates.js`, `js/spaces/*.js`, `js/data/*.js` 에 둔다.
- 유저에게 보이는 문구에 엠대시(—), "놀다" 계열, 화살표 이모지를 쓰지 않는다. 기존 `seasonNotice` 문구에 있는 " — " 는 이번에 문장을 고칠 때 같이 걷어낸다.
- 새 문구(종 이름, 안내, 푸시)는 **구현 전에 후보를 사용자에게 보여 주고 확정**받는다(Task 1). 확정 전에는 문구가 들어가는 태스크를 시작하지 않는다.
- 한국어 문장 틀을 바꾸면 `js/i18n-en.js` 의 패턴 키도 같이 바꾼다. 번역 키·값 앞뒤에 공백을 넣지 않는다.
- 한글은 유니코드 이스케이프(`\uXXXX`)로 손으로 적지 않는다.
- `gateOpen(null, …)` 은 반드시 `true` 로 남긴다. 게이트가 없는 흔한 종이 막히면 대형 사고다.
- 기존 유저 무영향: 도감 발견은 추가만, 배지 회수 없음, 박물관 층은 줄지 않음. 기존 4종(무지개 물고기·보석·무지개반디·숲 약초)의 확률과 게이트는 바꾸지 않는다.
- 새 GA4 이벤트를 만들지 않는다. 기존 이벤트(`season_start_seen`, `dex_gate_blocked`, `push_open`)의 값만 늘어난다. 코드 파라미터 키 23개 상한을 넘기지 않는다.
- 커밋만 한다. **푸시·병합·배포는 하지 않는다.** SQL 은 파일만 만들고 운영 DB 에 적용하지 않는다(Task 7 의 사용자 게이트).
- 새 도감 id 가 들어가므로 출시 때는 5곳(웹·토스·Play·iOS·itch) 동시 배포가 필요하다. 이 계획의 범위는 아니고, 마지막 보고에 첫 줄 ⚠️ 로 적는다.
- 테스트 명령: `npm test`. 태스크마다 관련 파일만 먼저 돌리고(`node --test tests/<file>.test.mjs`), 커밋 전에 전체를 돌린다.
- 코드를 쓴 뒤에는 code-reviewer 에이전트를 돌리고 CRITICAL·HIGH 를 고친다.
- 워크트리 함정: `.env` 가 없고, 미리보기 서버는 저장소 루트를 띄운다. 브라우저 확인은 `?season=spring&weather=clear` 같은 강제 파라미터로 한다.

## 확정된 설계

### 이미 있는 것(다시 만들지 않는다)

| 무엇 | 어디 |
|---|---|
| 계절 판정 `seasonInfo(date)` → `{ season, day, left, cycle }` | `js/season.js`, 서버 사본 `functions/api/_game-day.js` |
| 계절 게이트(`season` 배열)와 굴림 `rollKind` | `js/dex-gates.js` |
| 계절 한정 물고기 4종(봄 벚꽃 송어, 여름 동글 복어, 가을 단풍 잉어, 겨울 얼음 빙어) | `js/data/catalog.js` `FISH_KINDS`, `js/data/dex.js` |
| 출석 카드 안내(새 계절 첫 접속, 끝나기 3일 전) `seasonNotice` | `js/season.js`, 호출 `js/game.js:1550-1577`, 표시 `js/daily-card.js` |
| HUD 계절 아이콘 한 줄 `seasonStatusLine` | `js/season.js`, 호출 `js/game.js:2362` |
| 푸시 하루 1통 판정 `pickPush`, 문구 `messageFor` | `functions/push/pick-kind.js`, 실행 `functions/push-cron.js` |

물고기 4종이 들어간 커밋은 `6838050c` 다. 반디·채집물을 추가할 때 **이 커밋이 건드린 파일 목록을 체크리스트로 쓴다**(`git show --stat 6838050c`).

### 이번에 추가하는 것

**단계 1. 계절 한정 반디 4종, 채집물 4종**

- 반디는 색만 다르다(`makeFirefly(kind)` 가 `kind.color` 만 읽는다). 3D 작업이 없다.
- 채집물은 `forageMesh(kind)` 에 종마다 모양 분기가 필요하다. 시안 비교 게이트가 있다(Task 4).
- 누적 확률 `p` 는 물고기 선례대로 **0** 으로 두고 목록 맨 앞에 넣는다. 그 계절에만 게이트가 `p` 를 준다.
- 게이트 안 확률: 반디 **0.14**, 채집물 **0.14**. 물고기 0.12 보다 조금 높게 잡은 이유는 반디가 밤에만 잡히고 채집물은 다시 돋는 데 시간이 걸려 시도 횟수가 적기 때문이다. 이 수치는 Task 1 에서 사용자 확인을 받는다.
- 반디는 밤 전용 공간(반딧불이 계곡)에서만 나오므로 게이트에 `night` 를 넣지 않는다. 계절만 본다.
- 채집물 보상 `give` 는 `{ forage: 1 }` 로 통일한다(가장 싼 버섯과 같다). 경제에 새 값을 넣지 않는다.

종 후보(이름과 색은 Task 1 에서 확정):

| 계절 | 반디 id | 이름 후보 | 색 | 채집물 id | 이름 후보 | 색 |
|---|---|---|---|---|---|---|
| 봄 | `petal` | 꽃잎반디 | `0xffb3d1` | `mugwort` | 쑥 | `0x9cc98a` |
| 여름 | `ember` | 불씨반디 | `0xffa35c` | `wildgrape` | 머루 | `0x6b4fa3` |
| 가을 | `amber` | 단풍반디 | `0xf0c060` | `chestnut` | 알밤 | `0x9b6236` |
| 겨울 | `frost` | 서리반디 | `0xd6f1ff` | `pinecone` | 솔방울 | `0x8a6a4a` |

**단계 2. 안내 일반화 + 계절 끝 푸시**

- `seasonNotice`, `seasonStatusLine` 이 물고기 1종 대신 "이번 계절 한정 목록"을 받는다. 목록은 새 순수 함수 `seasonLimited(seasonId, tables)` 가 만든다.
- 푸시 종류 `season` 을 추가한다. 조건은 전부 참일 때만:
  1. 계절이 끝나기까지 `left <= 3`
  2. 오늘 아직 접속하지 않음(`lastMs < dates.todayStartMs`)
  3. 이번 계절 한정 3종 중 도감에 없는 것이 1종 이상
  4. 이번 계절에 `season` 푸시를 받은 적 없음(최근 14일 발송 기록 0)
  5. 마지막 접속이 30일 이내(기존 `GIVE_UP_DAYS`)
- 우선순위는 `night > craft > pond > season > return`. 복귀 문구보다 구체적인 이유이므로 `return` 앞에 둔다.
- 서버는 세이브의 도감이 필요하다. `push_candidates` RPC 가 `dex`(fish·bug·forage 키만)와 `season_14d`(최근 14일 `season` 발송 수)를 더 돌려주게 한다.

**단계 3. 계절 스탬프 카드 — 설계 게이트까지만**

구현하지 않는다. Task 9 에서 설계안과 시안을 만들어 사용자 승인을 받고, 승인되면 별도 스펙·계획으로 넘긴다.

## File Structure

| 파일 | 변경 | 책임 |
|---|---|---|
| `js/data/places.js` | 수정 | `BUG_KINDS`, `FORAGE_KINDS` 에 계절 한정 줄 추가 |
| `js/data/dex.js` | 수정 | `DEX.bug`, `DEX.forage` 에 4종씩 추가 |
| `js/dex-gates.js` | 수정 | `DEX_GATES.bug`, `DEX_GATES.forage` 에 계절 게이트 |
| `js/season.js` | 수정 | `seasonLimited` 추가, `seasonNotice`·`seasonStatusLine` 일반화 |
| `js/spaces/forest.js` | 수정 | `forageMesh` 에 새 4종 모양 |
| `js/game.js` | 수정(연결만) | `seasonFish`/`seasonOwned` 호출부를 목록 버전으로 교체 |
| `js/daily-card.js` | 수정 | `dailyCardView` 입력을 목록으로 |
| `js/i18n-en.js` | 수정 | 새 종 이름, 바뀐 문장 패턴 |
| `functions/api/_game-day.js` | 확인 | 서버 계절 사본. 바꿀 게 없으면 손대지 않는다 |
| `functions/push/pick-kind.js` | 수정 | `season` 종류 판정과 문구 |
| `functions/push-cron.js` | 수정(필요 시) | 판정에 넘길 계절 정보 연결 |
| `sql/migrations/migrate_push_season.sql` | 생성 | `push_candidates` 열 추가, `push_logs` 종류 체크 |
| `tests/dex-gates.test.mjs`, `tests/season.test.mjs`, `tests/push-pick.test.mjs`, `tests/daily-card.test.mjs` | 수정 | 아래 태스크의 테스트 |
| `sims/season-forage-compare.html` | 생성 | 채집물 4종 모양 시안 비교 |
| `sims/season-stamp-compare.html` | 생성 | 스탬프 카드 시안 비교(Task 9) |
| `dev/active/season-limited-v2/*` | 갱신 | 진행 상황 |

---

### Task 1: 문구·수치 확정 게이트 (코드 없음)

**Files:** 없음. `dev/active/season-limited-v2/season-limited-v2-context.md` 의 "확정 사항" 절만 갱신한다.

- [ ] **Step 1: 사용자에게 아래 묶음을 한 번에 보여 주고 확정받는다**

  1. 종 이름 8개(위 표). 각 이름마다 대안 1개를 같이 낸다.
  2. 게이트 안 확률 0.14(반디·채집물). 물고기는 0.12 그대로.
  3. 게임 내 안내 문구 후보(3안씩):
     - 새 계절 첫 접속: `🌸 봄이 왔어요! 14일 동안 봄에만 만나는 친구가 3종 있어요.`
     - 끝나기 3일 전: `⏳ 봄이 3일 남았어요. 봄 한정 3종 중 2종이 아직 도감에 없어요.`
     - HUD 한 줄: `🌸 봄 · 3일 남음 · 한정 1/3`
  4. 푸시 문구 후보(3안씩):
     - 제목 `🌸 봄이 3일 남았어요` / 본문 `이번 계절에만 만나는 친구가 아직 남아 있어요 🌿`

- [ ] **Step 2: 확정된 값을 context 문서에 적는다**

  확정 전에는 Task 2 이후를 시작하지 않는다. 사용자가 이름을 바꾸면 이 계획서의 표와 이후 태스크의 문자열을 그 값으로 읽는다. id 는 바꾸지 않는다.

---

### Task 2: 계절 한정 반디 4종 (데이터 + 게이트)

**Files:**
- Modify: `js/data/places.js:72-77` (`BUG_KINDS`)
- Modify: `js/data/dex.js` (`DEX.bug`)
- Modify: `js/dex-gates.js` (`DEX_GATES.bug`)
- Test: `tests/dex-gates.test.mjs`, `tests/season.test.mjs`

**Interfaces:**
- Produces: `BUG_KINDS` 의 새 항목 `{ id, name, ico, color, p: 0, season }`. `DEX_GATES.bug.{petal,ember,amber,frost} = { season: [<계절>], p: 0.14 }`.

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`tests/season.test.mjs` 끝에 추가)

```js
test('season-limited bugs: exactly one per season, table/dex/gate agree', () => {
  for (const id of SEASON_IDS) {
    const kinds = BUG_KINDS.filter(k => k.season === id);
    assert.equal(kinds.length, 1, `${id} should have exactly one seasonal bug`);
    const k = kinds[0];
    assert.equal(k.p, 0);
    assert.ok(DEX.bug.find(d => d.id === k.id), `${k.id} missing from DEX.bug`);
    assert.deepEqual(DEX_GATES.bug[k.id].season, [id]);
    assert.ok(DEX_GATES.bug[k.id].p > 0);
  }
});

test('season-limited bugs: only roll in their season, other seasons keep the old distribution', () => {
  const N = 4000;
  const count = (season) => {
    const seen = {};
    for (let i = 0; i < N; i++) {
      const k = rollKind(BUG_KINDS, 'bug', { weather: 'clear', season, night: true }, () => (i + 0.5) / N);
      seen[k.id] = (seen[k.id] || 0) + 1;
    }
    return seen;
  };
  const spring = count('spring');
  assert.ok(Math.abs(spring.petal / N - 0.14) < 0.012);
  assert.equal(spring.ember, undefined);
  assert.equal(spring.rainbow, undefined);
  const none = count(undefined);
  for (const id of ['petal', 'ember', 'amber', 'frost']) assert.equal(none[id], undefined);
  assert.ok(Math.abs(none.green / N - 0.16 / 0.94) < 0.012);
});
```

  파일 위쪽 import 에 `BUG_KINDS`(`../js/data/places.js`)가 없으면 추가한다. `places.js` 는 `three` 를 import 하므로 Node 에서 읽히는지 먼저 확인한다(`node -e "import('./js/data/places.js')"`). 읽히지 않으면 `tests/season.test.mjs` 가 `FISH_KINDS` 를 읽는 방식(소스 텍스트 파싱 또는 기존 헬퍼)을 그대로 따른다. 새 로더를 만들지 않는다.

- [ ] **Step 2: 실패를 확인한다**

  Run: `node --test tests/season.test.mjs`
  Expected: 새 테스트 2개 FAIL (`should have exactly one seasonal bug`)

- [ ] **Step 3: 데이터와 게이트를 추가한다**

  `js/data/places.js` `BUG_KINDS` 맨 앞:

```js
  { id: 'petal', name: '꽃잎반디', ico: '🌸', color: 0xffb3d1, p: 0, season: 'spring' },
  { id: 'ember', name: '불씨반디', ico: '🔥', color: 0xffa35c, p: 0, season: 'summer' },
  { id: 'amber', name: '단풍반디', ico: '🍁', color: 0xf0c060, p: 0, season: 'autumn' },
  { id: 'frost', name: '서리반디', ico: '❄️', color: 0xd6f1ff, p: 0, season: 'winter' },
```

  `js/data/dex.js` `DEX.bug` 끝에 같은 id·name·ico 4줄.

  `js/dex-gates.js` `DEX_GATES.bug`:

```js
  bug:    {
    rainbow: { weather: ['rain', 'fog'], night: true, p: 0.18 },
    petal: { season: ['spring'], p: 0.14 },
    ember: { season: ['summer'], p: 0.14 },
    amber: { season: ['autumn'], p: 0.14 },
    frost: { season: ['winter'], p: 0.14 },
  },
```

- [ ] **Step 4: 기존 잠금 테스트를 새 종에 맞춘다**

  `tests/dex-gates.test.mjs` 의 `known.bug` 배열에 `'petal', 'ember', 'amber', 'frost'` 를 추가한다. "게이트 확률은 원래 확률보다 커야 한다" 테스트의 `before` 표는 건드리지 않는다(새 종은 원래 확률이 0).

- [ ] **Step 5: 6838050c 체크리스트를 돈다**

  Run: `git show --stat 6838050c`
  이 커밋이 건드린 파일마다 "반디에도 같은 처리가 필요한가"를 확인하고 필요한 곳만 고친다. 최소한 아래를 본다:
  - `grep -rn "'rainbow'" js functions tests | grep -v 'js/b/'` 로 반디 id 를 나열하는 곳(박물관 전시 `js/museum/exhibit-parts.js`, 판매가 `js/shop/price-ids.js`, 도감 노트 `functions/api/dex-notes.js`, 일일 의뢰 `functions/api/daily-quests.js`, 큐레이터 의뢰 선택).
  - 큐레이터·일일 의뢰가 철 지난 반디를 고르지 않는지. 물고기는 `js/game.js:878` 에서 `season: SEASON` 을 넘겨 막는다. 반디 의뢰 경로에도 같은 값이 넘어가는지 확인하고, 안 넘어가면 넘긴다.
  - 박물관 전시 칸 상한(`GALLERY_MAX`)을 넘지 않는지 `tests/museum.test.mjs` 로 확인.

- [ ] **Step 6: 영어 이름을 넣는다**

  `js/i18n-en.js` 에서 `'무지개반디'` 줄을 찾아 같은 형식으로 4줄 추가: `'꽃잎반디': 'Petal firefly'`, `'불씨반디': 'Ember firefly'`, `'단풍반디': 'Maple firefly'`, `'서리반디': 'Frost firefly'`.

- [ ] **Step 7: 통과를 확인하고 커밋한다**

  Run: `npm test`
  Expected: 전체 PASS

```bash
git add js/data/places.js js/data/dex.js js/dex-gates.js js/i18n-en.js tests/
git commit -m "feat(season): add one season-limited firefly per season"
```

---

### Task 3: 계절 한정 채집물 4종 (데이터 + 게이트, 모양은 임시)

**Files:**
- Modify: `js/data/places.js:146-151` (`FORAGE_KINDS`)
- Modify: `js/data/dex.js` (`DEX.forage`)
- Modify: `js/dex-gates.js` (`DEX_GATES.forage`)
- Modify: `js/spaces/forest.js` (`forageMesh`)
- Test: `tests/season.test.mjs`, `tests/dex-gates.test.mjs`

**Interfaces:**
- Produces: `FORAGE_KINDS` 새 항목 `{ id, name, ico, p: 0, give: { forage: 1 }, color, season }`. `DEX_GATES.forage.{mugwort,wildgrape,chestnut,pinecone} = { season: [<계절>], p: 0.14 }`.

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`tests/season.test.mjs`)

```js
test('season-limited forage: exactly one per season, table/dex/gate agree', () => {
  for (const id of SEASON_IDS) {
    const kinds = FORAGE_KINDS.filter(k => k.season === id);
    assert.equal(kinds.length, 1, `${id} should have exactly one seasonal forage`);
    const k = kinds[0];
    assert.equal(k.p, 0);
    assert.deepEqual(k.give, { forage: 1 });
    assert.ok(DEX.forage.find(d => d.id === k.id), `${k.id} missing from DEX.forage`);
    assert.deepEqual(DEX_GATES.forage[k.id].season, [id]);
  }
});

test('season-limited forage: herb night gate still works next to the season gate', () => {
  const N = 4000;
  const seen = {};
  for (let i = 0; i < N; i++) {
    const k = rollKind(FORAGE_KINDS, 'forage', { weather: 'clear', season: 'autumn', night: true }, () => (i + 0.5) / N);
    seen[k.id] = (seen[k.id] || 0) + 1;
  }
  assert.ok(Math.abs(seen.chestnut / N - 0.14) < 0.012);
  assert.ok(Math.abs(seen.herb / N - 0.30) < 0.012);
  assert.equal(seen.mugwort, undefined);
});
```

- [ ] **Step 2: 실패를 확인한다**

  Run: `node --test tests/season.test.mjs`
  Expected: 새 테스트 2개 FAIL

- [ ] **Step 3: 데이터와 게이트를 추가한다**

  `FORAGE_KINDS` 맨 앞:

```js
  { id: 'mugwort',   name: '쑥',     ico: '🌱', p: 0, give: { forage: 1 }, color: 0x9cc98a, season: 'spring' },
  { id: 'wildgrape', name: '머루',   ico: '🍇', p: 0, give: { forage: 1 }, color: 0x6b4fa3, season: 'summer' },
  { id: 'chestnut',  name: '알밤',   ico: '🌰', p: 0, give: { forage: 1 }, color: 0x9b6236, season: 'autumn' },
  { id: 'pinecone',  name: '솔방울', ico: '🌲', p: 0, give: { forage: 1 }, color: 0x8a6a4a, season: 'winter' },
```

  `DEX.forage` 끝에 같은 4줄(id·name·ico). `DEX_GATES.forage` 에 `herb` 는 그대로 두고 4줄 추가(`{ season: ['spring'], p: 0.14 }` 형식).

  `tests/dex-gates.test.mjs` 의 `known.forage` 에 4개 id 추가.

- [ ] **Step 4: 모양은 임시로 넣는다**

  `forageMesh(kind)` 를 읽고, 분기에 걸리지 않는 종이 어떻게 그려지는지 확인한다. 기본 분기가 없으면 새 4종은 `kind.color` 로 칠한 `IcosahedronGeometry(0.14, 0)` 세 덩이를 버섯과 같은 배치(`[[0,0,1],[0.26,0.12,0.7],[-0.2,-0.18,0.55]]`)로 놓는 분기 하나를 추가한다. 이 임시 모양은 Task 4 에서 교체된다.

- [ ] **Step 5: 6838050c 체크리스트를 돈다(채집물 기준)**

  `grep -rn "mushroom" js functions tests sql | grep -v 'js/b/'` 로 채집물 id 를 나열하는 곳을 확인한다. 특히:
  - `js/free-pot/rules.js`, `js/free-pot/table.js`(자유 주방 재료), `js/cook-ingredients.js`: 새 채집물이 재료로 새지 않아야 한다. 재료 표가 `FORAGE_KINDS` 에서 파생되면 새 4종을 제외한다. 손으로 적은 표면 손대지 않는다.
  - `js/museum/exhibit-parts.js`: 전시 모양이 `forageMesh` 를 재사용하는지.
  - `sql/migrations/migrate_security_hardening.sql` 등에 도감 키 화이트리스트(jsonb CHECK)가 있는지. 있으면 새 id 가 저장에서 거절되지 않게 `sql/migrations/migrate_season_dex_ids.sql` 을 따로 만든다(적용은 하지 않는다).
  - 이웃 마을·연못 SQL 은 물고기만 다루므로 영향 없음을 확인만 한다.

- [ ] **Step 6: 영어 이름**

  `js/i18n-en.js`: `'쑥': 'Mugwort'`, `'머루': 'Wild grape'`, `'알밤': 'Chestnut'`, `'솔방울': 'Pinecone'`. `'쑥'` 처럼 한 글자 키가 다른 낱말을 먹지 않는지 한글 잔존 테스트와 실제 화면으로 확인한다. 문제가 되면 이름을 `봄 쑥` 으로 바꾸는 안을 사용자에게 올린다.

- [ ] **Step 7: 통과 확인, 커밋**

  Run: `npm test`

```bash
git add js/data/places.js js/data/dex.js js/dex-gates.js js/spaces/forest.js js/i18n-en.js tests/
git commit -m "feat(season): add one season-limited forage per season"
```

---

### Task 4: 채집물 4종 모양 시안 게이트

**Files:**
- Create: `sims/season-forage-compare.html`
- Modify: `js/spaces/forest.js` (`forageMesh`)

- [ ] **Step 1: 시안 페이지를 만든다**

  종마다 모양 3안을 Three.js 로 렌더해 한 화면에 나란히 놓는다(4종 × 3안). 게임과 같은 `clayMat`·조명·위에서 내려다보는 카메라 각도를 쓴다. 기존 `sims/*-compare.html` 중 하나의 뼈대를 복사해 쓴다.

  조형 기준(이전 교훈): 부속을 꽂지 말고 덩어리 형태로 읽히게 한다. 위에서 보는 카메라에서는 바닥에 누운 넓은 형태가 가장 잘 읽힌다. 겹친 면은 줄무늬가 생기므로 면을 겹치지 않는다.

- [ ] **Step 2: PC·모바일 폭으로 캡처해 사용자에게 보여 주고 종마다 1안을 고르게 한다**

  사용자가 고르기 전에는 Step 3 으로 가지 않는다.

- [ ] **Step 3: 고른 안을 `forageMesh` 에 옮기고 임시 분기를 지운다**

- [ ] **Step 4: 게임 화면에서 확인한다**

  `?season=spring&weather=clear` 로 채집 숲에 가서 새 종이 돋고, 주우면 도감 토스트에 이름이 뜨는지 본다. 네 계절을 각각 확인하고 캡처를 남긴다.

- [ ] **Step 5: 커밋**

```bash
git add sims/season-forage-compare.html js/spaces/forest.js
git commit -m "feat(season): shape the four season-limited forage items"
```

---

### Task 5: 계절 한정 목록 함수와 안내 문구 일반화

**Files:**
- Modify: `js/season.js`
- Test: `tests/season.test.mjs`

**Interfaces:**
- Produces:
  - `seasonLimited(seasonId, { fish, bug, forage, dex })` → `[{ cat: 'fish'|'bug'|'forage', id, name, ico }]`. `fish` 는 `FISH_KINDS`(키가 `rarity`), `bug`·`forage` 는 각 KINDS 표, `dex` 는 `DEX`(물고기 아이콘을 여기서 찾는다).
  - `seasonNotice({ season, left }, limited, ownedCount, isNew)` → 문자열
  - `seasonStatusLine({ season, left }, limited, ownedCount)` → 문자열
- `js/season.js` 는 DOM·Three 의존이 없어야 한다. 표는 인자로 받고 import 하지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

  아래 문구는 Task 1 에서 확정된 값으로 바꿔 넣는다. 여기 적힌 것은 후보 1안이다.

```js
const LIM = [
  { cat: 'fish', id: 'sakura_trout', name: '벚꽃 송어', ico: '🌸' },
  { cat: 'bug', id: 'petal', name: '꽃잎반디', ico: '🌸' },
  { cat: 'forage', id: 'mugwort', name: '쑥', ico: '🌱' },
];
const SPRING = { season: seasonById('spring'), left: 3 };

test('seasonLimited: one fish, one bug, one forage for every season', () => {
  for (const id of SEASON_IDS) {
    const list = seasonLimited(id, { fish: FISH_KINDS, bug: BUG_KINDS, forage: FORAGE_KINDS, dex: DEX });
    assert.deepEqual(list.map(x => x.cat), ['fish', 'bug', 'forage']);
    for (const x of list) assert.ok(x.id && x.name && x.ico);
  }
  assert.deepEqual(seasonLimited('nope', { fish: FISH_KINDS, bug: BUG_KINDS, forage: FORAGE_KINDS, dex: DEX }), []);
});

test('seasonNotice: new season, last three days with something missing, otherwise empty', () => {
  assert.equal(seasonNotice({ season: seasonById('spring'), left: 14 }, LIM, 0, true),
    '🌸 봄이 왔어요! 14일 동안 봄에만 만나는 친구가 3종 있어요.');
  assert.equal(seasonNotice(SPRING, LIM, 1, false),
    '⏳ 봄이 3일 남았어요. 봄 한정 3종 중 2종이 아직 도감에 없어요.');
  assert.equal(seasonNotice(SPRING, LIM, 3, false), '');
  assert.equal(seasonNotice({ season: seasonById('spring'), left: 4 }, LIM, 0, false), '');
  assert.equal(seasonNotice(SPRING, [], 0, true), '');
});

test('seasonStatusLine: shows owned count', () => {
  assert.equal(seasonStatusLine(SPRING, LIM, 1), '🌸 봄 · 3일 남음 · 한정 1/3');
  assert.equal(seasonStatusLine(SPRING, [], 0), '🌸 봄 · 3일 남음');
});
```

  기존 테스트 "안내 문구 — 새 계절 · 끝나기 3일 전…", "HUD 상태 문구 — 낚았으면 ✅", "안내 문구는 영어 사전 패턴으로 덮인다" 는 새 시그니처에 맞게 고친다. 영어 패턴 테스트는 지우지 말고 새 문장으로 바꾼다.

- [ ] **Step 2: 실패 확인**

  Run: `node --test tests/season.test.mjs`
  Expected: FAIL (`seasonLimited is not a function`)

- [ ] **Step 3: 구현한다**

```js
export function seasonLimited(seasonId, { fish = [], bug = [], forage = [], dex = {} } = {}) {
  const out = [];
  const f = fish.find(k => k.season === seasonId);
  if (f) out.push({ cat: 'fish', id: f.rarity, name: f.name, ico: dex.fish?.find(d => d.id === f.rarity)?.ico || '🐟' });
  const b = bug.find(k => k.season === seasonId);
  if (b) out.push({ cat: 'bug', id: b.id, name: b.name, ico: b.ico });
  const g = forage.find(k => k.season === seasonId);
  if (g) out.push({ cat: 'forage', id: g.id, name: g.name, ico: g.ico });
  return out;
}

export function seasonNotice({ season, left }, limited, ownedCount, isNew) {
  const total = limited?.length || 0;
  if (!total) return '';
  const ga = josa(season.name, '이', '가');
  if (isNew) return `${season.ico} ${season.name}${ga} 왔어요! ${left}일 동안 ${season.name}에만 만나는 친구가 ${total}종 있어요.`;
  const missing = total - ownedCount;
  if (left <= 3 && missing > 0) return `⏳ ${season.name}${ga} ${left}일 남았어요. ${season.name} 한정 ${total}종 중 ${missing}종이 아직 도감에 없어요.`;
  return '';
}

export function seasonStatusLine({ season, left }, limited, ownedCount) {
  const head = `${season.ico} ${season.name} · ${left}일 남음`;
  const total = limited?.length || 0;
  return total ? `${head} · 한정 ${ownedCount}/${total}` : head;
}
```

  기존 `seasonNotice`·`seasonStatusLine` 본문을 위로 교체한다. 파일 머리 주석의 "fish = …" 설명 줄은 내용이 틀려지므로 그 줄만 지운다.

- [ ] **Step 4: 영어 패턴을 바꾼다**

  `js/i18n-en.js` 에서 `왔어요!` 로 검색해 기존 계절 패턴 3개를 찾아 새 문장 틀에 맞게 바꾼다. 영어 문장:
  - `{ico} {Season} is here! For {n} days, {total} friends only appear in {season}.`
  - `⏳ {n} days of {season} left. {missing} of {total} {season}-only friends are still missing from your book.`
  - `{ico} {Season} · {n} days left · Seasonal {owned}/{total}`

- [ ] **Step 5: 통과 확인**

  Run: `node --test tests/season.test.mjs`
  Expected: PASS. 이 시점에 `js/game.js`, `js/daily-card.js` 호출부는 아직 옛 인자를 넘기므로 다른 테스트가 깨질 수 있다. Task 6 과 한 커밋으로 묶는다. 여기서는 커밋하지 않는다.

---

### Task 6: 호출부 연결 (game.js, daily-card.js)

**Files:**
- Modify: `js/game.js:1550-1555` (`seasonFish`, `seasonOwned`), `:1571-1577` (`checkDailyBonus`), `:2362` (`seasonStatus`)
- Modify: `js/daily-card.js` (`dailyCardView`)
- Test: `tests/daily-card.test.mjs`

**Interfaces:**
- Consumes: Task 5 의 `seasonLimited`, `seasonNotice`, `seasonStatusLine`.
- Produces: `dailyCardView` 입력 `{ …, season, seasonLeft, limited, limitedOwned, seasonNew }` (기존 `fish`, `fishOwned` 를 대체).

- [ ] **Step 1: `dailyCardView` 가 `fish`·`fishOwned` 를 어떻게 쓰는지 읽는다**

  Run: `grep -n "fish\|season" js/daily-card.js tests/daily-card.test.mjs`

- [ ] **Step 2: 테스트를 새 입력으로 바꾼다**

  `tests/daily-card.test.mjs` 에서 `fish:` `fishOwned:` 를 넘기는 곳을 `limited:` `limitedOwned:` 로 바꾸고, 기대 문장을 Task 5 의 문장으로 바꾼다. 테스트를 하나 추가한다:

```js
test('daily card: season line is empty when every seasonal entry is owned', () => {
  const view = dailyCardView({ ...BASE, season: seasonById('spring'), seasonLeft: 2, seasonNew: false,
    limited: [{ cat: 'fish', id: 'sakura_trout', name: '벚꽃 송어', ico: '🌸' }], limitedOwned: 1 });
  assert.ok(!JSON.stringify(view).includes('남았어요'));
});
```

  `BASE` 는 그 파일에 이미 있는 기본 입력 객체 이름으로 바꾼다.

- [ ] **Step 3: 실패 확인**

  Run: `node --test tests/daily-card.test.mjs`
  Expected: FAIL

- [ ] **Step 4: `js/daily-card.js` 를 고친다**

  `seasonNotice({ season, left: seasonLeft }, fish, fishOwned, seasonNew)` 호출을 `seasonNotice({ season, left: seasonLeft }, limited, limitedOwned, seasonNew)` 로 바꾸고 구조 분해 인자 이름을 맞춘다.

- [ ] **Step 5: `js/game.js` 를 고친다(연결 줄만)**

  `seasonFish`/`seasonOwned` 두 함수를 아래로 교체한다:

```js
function seasonList(id) { return seasonLimited(id, { fish: FISH_KINDS, bug: BUG_KINDS, forage: FORAGE_KINDS, dex: DEX }); }
function seasonOwnedCount(list) { return list.filter(x => gameState.dex[x.cat]?.[x.id]).length; }
```

  `checkDailyBonus` 안: `const sFish = seasonFish(...)` → `const sList = seasonList(SEASON_INFO.season.id);`, `dailyCardView` 인자의 `fish: sFish, fishOwned: seasonOwned(sFish)` → `limited: sList, limitedOwned: seasonOwnedCount(sList)`.

  `seasonStatus()`: `{ const l = seasonList(SEASON); return seasonStatusLine({ season: seasonById(SEASON), left: SEASON_INFO.left }, l, seasonOwnedCount(l)); }`.

  import 줄에 `seasonLimited` 를 더하고, `BUG_KINDS`·`FORAGE_KINDS` 가 game.js 에 이미 import 되어 있는지 확인한다(없으면 `./data/places.js` import 에 추가).

  `seasonFish`·`seasonOwned` 의 다른 호출자가 없는지 `grep -rn "seasonFish\|seasonOwned" js | grep -v 'js/b/'` 로 확인한다.

- [ ] **Step 6: 번들 사본을 확인한다**

  `js/b/` 는 빌드 산출물이다. 손으로 고치지 않는다. `package.json` scripts 에서 빌드 명령을 확인하고, 테스트가 번들 최신 여부를 검사하면 그 명령을 돌린다.

- [ ] **Step 7: 전체 통과, 화면 확인, 커밋**

  Run: `npm test`
  Expected: 전체 PASS

  화면: `?season=spring&weather=clear` 로 접속해 HUD 계절 아이콘을 눌러 `한정 0/3` 한 줄을 확인. 영어 화면에서 한글이 남지 않는지 확인. 모바일 폭(375)에서 한 줄이 넘치지 않는지 확인하고 캡처를 남긴다.

```bash
git add js/season.js js/game.js js/daily-card.js js/i18n-en.js tests/
git commit -m "feat(season): count all season-limited entries in the daily card and HUD line"
```

---

### Task 7: 계절 끝 푸시 — 판정과 문구

**Files:**
- Modify: `functions/push/pick-kind.js`
- Modify: `functions/push-cron.js` (계절 정보 전달이 필요할 때만)
- Create: `sql/migrations/migrate_push_season.sql`
- Test: `tests/push-pick.test.mjs`

**Interfaces:**
- Consumes: `row.dex`(`{ fish: {...}, bug: {...}, forage: {...} }` 또는 null), `row.season_14d`(정수). 서버 계절 판정은 `functions/api/_game-day.js` 가 내보내는 함수를 쓴다(이름은 파일을 읽어 확인. `js/season.js` 와 같은 식이다).
- Produces: `pickPush(row, dates, night, seasonCtx)` 가 `{ kind: 'season', season: <id> }` 를 돌려줄 수 있다. `seasonCtx = { id, name, ico, left, limited: [{ cat, id }] }`. `seasonCtx` 가 없으면 기존 동작 그대로다.

- [ ] **Step 1: 실패하는 테스트를 쓴다** (`tests/push-pick.test.mjs`)

  그 파일의 기존 행·날짜 헬퍼를 그대로 쓴다. 아래 `ROW`·`DATES` 는 그 헬퍼로 만든 값이다: 마지막 접속이 어제, 밭 비어 있음, 가공·연못 없음, `returns_7d: 0`.

```js
const CTX = { id: 'spring', name: '봄', ico: '🌸', left: 3,
  limited: [{ cat: 'fish', id: 'sakura_trout' }, { cat: 'bug', id: 'petal' }, { cat: 'forage', id: 'mugwort' }] };

test('season push: last three days, something missing, not sent this season', () => {
  const row = { ...ROW, dex: { fish: { sakura_trout: 1 }, bug: {}, forage: {} }, season_14d: 0 };
  assert.deepEqual(pickPush(row, DATES, null, CTX), { kind: 'season', season: 'spring' });
});

test('season push: silent when everything is owned, already sent, too early, played today, or column missing', () => {
  const all = { fish: { sakura_trout: 1 }, bug: { petal: 1 }, forage: { mugwort: 1 } };
  assert.notEqual(pickPush({ ...ROW, dex: all, season_14d: 0 }, DATES, null, CTX)?.kind, 'season');
  assert.notEqual(pickPush({ ...ROW, dex: {}, season_14d: 1 }, DATES, null, CTX)?.kind, 'season');
  assert.notEqual(pickPush({ ...ROW, dex: {}, season_14d: 0 }, DATES, null, { ...CTX, left: 4 })?.kind, 'season');
  const today = { ...ROW, updated_at: new Date(DATES.todayStartMs + 3600e3).toISOString(), dex: {}, season_14d: 0 };
  assert.notEqual(pickPush(today, DATES, null, CTX)?.kind, 'season');
  assert.notEqual(pickPush({ ...ROW, dex: {} }, DATES, null, CTX)?.kind, 'season');
});

test('season push: ranks below night and above return; missing ctx keeps old behaviour', () => {
  const row = { ...ROW, dex: {}, season_14d: 0 };
  assert.equal(pickPush(row, DATES, { visited: true }, CTX).kind, 'night');
  const away = { ...row, updated_at: new Date(DATES.todayStartMs - 5 * 86400000).toISOString() };
  assert.equal(pickPush(away, DATES, null, CTX).kind, 'season');
  assert.equal(pickPush(away, DATES, null, undefined).kind, 'return');
  assert.equal(pickPush({ ...row, dex: null }, DATES, null, CTX).kind, 'season');
});

test('season push message: ko and en for all four seasons', () => {
  const ko = messageFor({ kind: 'season', season: 'spring' }, 'ko', CTX);
  assert.equal(ko.title, '🌸 봄이 3일 남았어요');
  assert.equal(ko.body, '이번 계절에만 만나는 친구가 아직 남아 있어요 🌿');
  for (const [id, name] of [['summer', '여름'], ['autumn', '가을'], ['winter', '겨울']]) {
    assert.equal(messageFor({ kind: 'season', season: id }, 'ko', { ...CTX, id, name, ico: '🌿' }).title, `🌿 ${name}이 3일 남았어요`);
  }
  const en = messageFor({ kind: 'season', season: 'spring' }, 'en', CTX);
  assert.ok(!/[가-힣]/.test(en.title + en.body));
});
```

  문구는 Task 1 확정값으로 바꾼다.

- [ ] **Step 2: 실패 확인**

  Run: `node --test tests/push-pick.test.mjs`
  Expected: 새 테스트 FAIL

- [ ] **Step 3: `pickPush` 에 종류를 더한다**

  `pond` 판정 줄 바로 아래, `return` 판정 위에:

```js
  if (seasonCtx && seasonCtx.left <= 3 && lastMs < dates.todayStartMs && row.season_14d === 0) {
    const dex = row.dex || {};
    if (seasonCtx.limited.some(x => !dex[x.cat]?.[x.id])) return { kind: 'season', season: seasonCtx.id };
  }
```

  시그니처를 `pickPush(row, dates, night, seasonCtx)` 로 넓힌다. `row.season_14d === 0` 은 엄격 비교다. SQL 이 아직 옛 버전이라 열이 없으면(`undefined`) 발송하지 않는다.

- [ ] **Step 4: `messageFor` 에 문구를 더한다**

  시그니처 `messageFor(pick, lang = 'ko', seasonCtx)`. `night` 분기 아래:

```js
  if (pick.kind === 'season' && seasonCtx) {
    return en ? { title: `${seasonCtx.ico} ${seasonCtx.left} days of ${seasonCtx.id} left`, body: 'Some seasonal friends are still waiting 🌿' }
              : { title: `${seasonCtx.ico} ${seasonCtx.name}이 ${seasonCtx.left}일 남았어요`, body: '이번 계절에만 만나는 친구가 아직 남아 있어요 🌿' };
  }
```

  조사: 봄·여름·가을·겨울 모두 받침이 있어 "이" 고정이 맞다.

- [ ] **Step 5: 크론에서 계절 정보를 만들어 넘긴다**

  `functions/push-cron.js` 에서 `pickPush(...)`·`messageFor(...)` 호출부를 찾아 `seasonCtx` 를 한 번 만들어 넘긴다. 계절은 `dates.today`(KST) 기준으로 `functions/api/_game-day.js` 의 계절 함수로 구한다. `limited` 는 `js/season.js` 의 `seasonLimited` 에 `FISH_KINDS`(`js/data/catalog.js`)·`BUG_KINDS`·`FORAGE_KINDS`(`js/data/places.js`)를 넘겨 만든다.

  `js/data/places.js` 와 `js/data/catalog.js` 가 `three` 를 import 하면 Worker 번들에 Three.js 가 딸려 온다. 그럴 경우 import 하지 말고 `functions/push/season-limited-ids.js` 에 `{ spring: [{ cat, id }, …], … }` 표를 따로 두고, **그 표가 KINDS 표와 일치하는지 검사하는 테스트**를 `tests/push-pick.test.mjs` 에 추가한다. `pick-kind.js` 가 `js/craft/slots.js` 를 import 하는 선례가 있으니 먼저 `npx wrangler deploy --dry-run` 으로 번들 크기를 본다(배포되지 않는다).

  `push_logs` 에 기록하는 `kind` 값에 `season` 이 들어간다. 크론의 발송 한도(`PUSH_BUDGET`)와 subrequest 수 계산은 종류가 늘어도 변하지 않음을 확인한다(유저당 1통 그대로).

- [ ] **Step 6: SQL 마이그레이션 파일을 쓴다(적용하지 않는다)**

  먼저 현재 정의를 확인한다. `sql/migrations/migrate_push_pond.sql` 이 `push_candidates` 의 최신 정의로 보이고, `migrate_push_ios.sql`·`migrate_push_weekly_market.sql` 이 그 뒤에 무엇을 바꿨는지 읽는다. `push_logs_kind_check` 는 파일마다 목록이 다르다(`migrate_push_weekly_market.sql` 에는 `pond` 가 빠져 있다). **운영 DB 의 실제 제약을 읽어서** 그 목록에 `season` 만 더한다. 아래 두 조회는 읽기 전용이라 실행해도 된다:

```sql
select pg_get_constraintdef(oid) from pg_constraint where conname = 'push_logs_kind_check';
select pg_get_functiondef('public.push_candidates(date, int)'::regprocedure);
```

  결과를 바탕으로 `sql/migrations/migrate_push_season.sql` 을 쓴다. 뼈대(꺾쇠 자리는 조회 결과로 채운다):

```sql
begin;
set local lock_timeout = '3s';

alter table public.push_logs drop constraint if exists push_logs_kind_check;
alter table public.push_logs add constraint push_logs_kind_check
  check (kind in (<운영 DB 의 현재 목록 그대로>, 'season'));

drop function if exists public.push_candidates(date, int);
create or replace function public.push_candidates(p_today date, p_limit int default 100)
returns table (<현재 열 그대로>, dex jsonb, season_14d int)
language sql stable security definer set search_path = public as $$
  <현재 본문 그대로. 안쪽 select 와 바깥 select 에 아래 두 열 추가>
         jsonb_build_object('fish', s.state -> 'dex' -> 'fish', 'bug', s.state -> 'dex' -> 'bug', 'forage', s.state -> 'dex' -> 'forage') as dex,
         (select count(*)::int from public.push_logs l
           where l.user_id = t.user_id and l.kind = 'season' and l.status = 'sent'
             and l.sent_at > now() - interval '14 days') as season_14d
$$;

revoke all on function public.push_candidates(date, int) from public, anon, authenticated;
grant execute on function public.push_candidates(date, int) to service_role;

commit;
```

  꺾쇠가 남은 파일을 커밋하지 않는다.

  배포 순서를 dev docs 에 적는다: SQL 먼저(열 추가는 옛 Worker 와 호환), Worker 나중.

- [ ] **Step 7: 통과 확인, 커밋**

  Run: `npm test`

```bash
git add functions/push/ functions/push-cron.js sql/migrations/migrate_push_season.sql tests/push-pick.test.mjs
git commit -m "feat(push): remind players in the last three days of a season"
```

- [ ] **Step 8: 사용자 게이트**

  SQL 운영 적용, Worker 배포, 5곳 앱 배포는 하지 않는다. 마지막 보고에 "사용자 승인 후 진행" 항목으로 적는다.

---

### Task 8: 검증과 리뷰

- [ ] **Step 1: 전체 테스트**

  Run: `npm test`
  Expected: 전체 PASS, 실패 0

- [ ] **Step 2: 네 계절 화면 확인**

  `?season=spring|summer|autumn|winter` 각각에서:
  - 밤(저장소의 밤 강제 파라미터 사용)에 반딧불이 계곡에서 그 계절 반디가 보이고 잡으면 도감에 들어간다.
  - 채집 숲에서 그 계절 채집물이 돋고 주우면 도감에 들어간다.
  - 다른 계절의 한정 종은 나오지 않는다.
  - HUD 계절 줄의 `한정 n/3` 이 잡을 때마다 오른다.
  - 박물관에서 새 종 전시가 깨지지 않는다.

- [ ] **Step 3: 기존 유저 세이브 확인**

  새 id 가 없는 세이브를 불러와도 오류가 없고, 도감 총계·배지·박물관 층이 줄지 않는지 확인한다(`tests/dex-gates.test.mjs`, `tests/museum.test.mjs` 의 잠금 테스트 + 실제 화면).

- [ ] **Step 4: code-reviewer 에이전트를 돌리고 CRITICAL·HIGH 를 고친다**

- [ ] **Step 5: dev docs 갱신, 최종 보고**

  `dev/active/season-limited-v2/season-limited-v2-tasks.md` 체크, context 의 Last Updated 갱신. 보고 첫 줄에 ⚠️ 사용자 몫(SQL 적용 승인, 5곳 배포, 공지)을 적는다.

---

### Task 9: 계절 스탬프 카드 — 설계 게이트 (구현 금지)

**Files:**
- Create: `sims/season-stamp-compare.html`
- Create: `docs/superpowers/specs/2026-11-15-season-stamp-card-design.md` (사용자 승인 뒤에만)

Task 1~8 이 끝난 뒤에 시작한다. 이 태스크의 산출물은 승인된 설계 문서 1개다. 코드를 쓰지 않는다.

- [ ] **Step 1: 설계 초안을 대화로 올린다**

  초안의 출발점:
  - 계절마다 8칸. 칸은 세이브에서 판정 가능한 상태형 조건만 쓴다(1회성·하루 상한 목표는 상태형이어야 한다는 기존 교훈). 후보: 한정 물고기·반디·채집물 발견(3칸), 그 계절 날씨 3종 보기, 출석 5일, 작물 수확 20회, 요리 3회, 이웃 방문 1회.
  - 완주 보상은 계절 한정 꾸미기 1종. 중간(4칸)에 코인.
  - 진입점은 HUD 계절 아이콘(이미 있음)과 출석 카드.
  - 칸마다 실제로 달성 가능한지 BigQuery 로 최근 14일 분포를 먼저 본다.

- [ ] **Step 2: 사용자와 정할 것**

  칸 수, 조건 목록, 보상(경제 수치 확인 필수), 계절이 끝나면 미완주 카드를 어떻게 할지, 게스트 포함 여부.

- [ ] **Step 3: 화면 시안 3안 이상을 렌더해 PC·모바일 나란히 보여 준다**

- [ ] **Step 4: 승인되면 스펙을 쓰고 멈춘다**

  구현 계획은 writing-plans 로 별도 문서를 만든다.

---

## Self-Review 메모

- 단계 1(한정 등장) = Task 2·3·4, 단계 2(끝 예고) = Task 5·6(게임 내)·7(푸시), 단계 3(스탬프) = Task 9(설계만).
- 태스크 사이 이름 일치 확인: `seasonLimited`, `limited`/`limitedOwned`, `seasonCtx`, `season_14d`, `dex`.
- 실행자가 코드로 확인해야 하는 것(각 태스크에 확인 명령을 적어 둠): `places.js` 의 Node import 가능 여부, `forageMesh` 의 기본 분기 유무, `_game-day.js` 가 내보내는 함수 이름, 운영 DB 의 `push_logs_kind_check` 현재 목록, 도감 키 jsonb CHECK 존재 여부.
