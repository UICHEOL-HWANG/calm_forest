# ❄️ 눈의 가지 · 5장 「얼어붙은 가지」 · 썰매지기 대화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 세계수 판에 6번째 가지(❄️ 눈의 가지, 흰 잎)를 더하고, 메인 스토리 4장(안개숲 심장) 다음 5장으로 엮고, 설산 썰매지기와 대화할 수 있게 한다.

**Architecture:** 가지·꽃피우기·연출·장 표는 전부 데이터 표(순수 모듈)라 표에 행을 더하고, 표를 소비하는 쪽은 `after`(선행 가지)·`lead`(안내 문구)·`leaf`(잎 색)·`seed`(난수) 같은 선택 필드만 읽게 한다. 장 번호가 밀리는 기존 세이브는 순수 함수 `migrateStory` 로 한 번 고친다. 썰매지기 대화는 순수 판정(`js/mountain/keeper-talk.js`) + 거울 마을 대화 박스(`js/mirror/talk-box.js`) 재사용.

**Tech Stack:** 바닐라 JS ES 모듈 · Three.js(vendor) · node:test (`npm test` = `node --test tests/*.test.mjs`) · Supabase Postgres(제약 1건)

**Spec:** `docs/superpowers/specs/2026-10-28-snow-branch-design.md` (이 계획이 스펙과 다른 곳은 §0 에 적었다)

## Global Constraints

- 새 코드·CSS·테스트에 **주석을 넣지 않는다**(no-code-comments 규칙). 설명은 커밋 메시지·dev docs 로.
- 게임 화면 문구에 **엠대시(—) 금지**. 끊을 땐 마침표, 제목 구분은 `·`.
- 모든 화면 문구는 **Task 0 검수 결과**를 쓴다. 계획 안의 문구는 초안이다.
- 디자인(세계수 흰 가지, 세계수 썰매 색)은 **시안 3개를 렌더해 PC·모바일로 나란히** 비교받고 고른다.
- 상태를 고치지 않는다. 순수 함수는 새 객체를 돌려준다.
- GA4 이벤트 파라미터는 이벤트당 5개 이하, 새 키보다 기존 키(`branch`, `chapter`, `via`, `stage`)를 쓴다.
- 영어: `js/i18n-en.js` 에 한국어 원문 통문장 키로 넣는다. 조각내지 않는다.
- 커밋만 한다. 푸시·병합·배포는 하지 않는다(사용자 지시 2026-10-28).
- 작업 디렉터리: `/Users/uicheol_hwang/calm_forest/.claude/worktrees/mobile-hud-overlap` (브랜치 `feat/snow-branch`).

## §0 스펙과 달라진 점 (조사 결과, Task 1 에서 스펙에도 반영)

1. 코코아 꾸러미 재료 `forage` → `seed`. 기존 테스트가 꾸러미 재료를 시작 재료(🪵🪨⚫💎🐟🌾🌰)로 묶어 둔다.
2. `branchUsable` 이 "바로 앞 가지" 를 본다. 눈의 가지를 숲·광산 사이에 끼우면 광산이 눈에 막힌다 → 가지에 `after` 필드, 눈·광산 둘 다 `after: 'forest'`.
3. 지역 연출 표의 `npc` 는 마을 NPC 여야 해서(`startReturnWalk`), 눈의 가지는 `npc: null`.
4. 산장 창 불빛: 병합 glow 메시 색을 바꾸면 다른 불빛까지 바뀐다 → 완성 때만 보이는 작은 메시 1개(그때만 드로우콜 +1).
5. 세계수 3D: 눈 가지는 `LIMBS` **맨 끝**에 두고 자기 난수(`seed`)를 써서, 기존 5가지·우듬지 모양이 한 정점도 안 바뀌게 한다(체크섬 테스트). 잎은 흰색(사용자 요청 2026-10-28).
6. 세계수 썰매는 새 물리 없이 `basic` 과 같은 능력치·모델(`davos`), 색만 다른 전용 스킨. DB 제약 `sled_runs_sled` 에 `'worldtree'` 추가가 필요하다(배포 전 실행).

## 파일 구조

| 파일 | 하는 일 | Task |
|---|---|---|
| `js/world/tree-board.js` | 가지 표 + `after` 게이트 + ☃️ 장식 | 1 |
| `js/spaces/world-tree.js` | 판 뷰: 선행 가지 이름·`lead` 문구 | 1 |
| `js/story/rules.js` | `BRANCH_NAME.snow` · 5장 규칙 · `migrateStory` | 1, 5 |
| `js/world/tree-bloom.js` | 꽃피우기 3단계·돌봄·손님 | 2 |
| `js/world/region-cine.js` · `js/world/region-fx.js` | 귀환 연출·눈송이 | 3 |
| `js/world/tree-art.js` | 흰 잎 6번째 가지 · `limbs` 옵션 | 4 |
| `sims/snow-limb-compare.html` | 흰 가지 시안 3개 | 4 |
| `js/story/chapters.js` · `js/game.js` · `js/world/unlocks.js` | 5장 삽입·이전·해금 숫자 | 5 |
| `guide/guide.html` · `guide/guide-en.html` | 장 번호 문구 | 5 |
| `js/mountain/sled-lineup.js` · `cafe-shop.js` · `sql/migrations/migrate_sled_worldtree.sql` | ❄️ 세계수 썰매 | 6 |
| `sims/worldtree-sled-compare.html` | 썰매 색 시안 3개 | 6 |
| `js/mountain/keeper-talk.js` (새) | 대화 단계·대사 순수 판정 | 7 |
| `js/mountain/keeper-bubble.js` · `js/spaces/mountain.js` · `js/spaces/doors.js` · `js/mountain/camp-art.js` | 대화 배선·❕·선물·창 불빛·트래킹 | 8 |
| `js/i18n-en.js` | 영어 | 1~8 |
| `tests/snow-*.test.mjs` | 새 테스트 | 1~8 |

---

### Task 0: 문구 검수 (사용자 승인 게이트)

**Files:** 없음(대화에서 표로 보여 주고 승인받는다)

- [ ] **Step 1: 아래 표를 사용자에게 보여 준다.** 각 줄에 후보 1~2개. 엠대시 없음.

| 자리 | 초안 |
|---|---|
| 가지 이름·짧은 이름 | 눈의 가지 · 눈 |
| 이웃 | 🛷 썰매지기 |
| 판 안내(미완성/완성) | 빈터를 꾸미면 🛷 썰매지기의 산장에 불이 켜져요 / 🛷 썰매지기의 산장에 불이 켜졌어요 |
| 꾸러미 | 땔감 꾸러미(🪵30 ⚫8 → 🪙60) · 코코아 꾸러미(🌾20 🌰5 → 🪙70) |
| 꽃 장식 | ☃️ 눈사람 |
| 손님(낮 3·밤 2) | 🐧 펭귄 · 🦭 물범 · 🐰 눈토끼 / 🐺 늑대 · 🐻 반달곰 |
| 귀환 연출 | ❄️ 눈의 가지 · 정상 산장에 불이 켜졌어요 |
| 4장 완료 | 안개가 걷혔어요. "와 줘서 고마워. 그런데 정상의 가지 하나가 아직 얼어 있단다." |
| 5장 제목·목표 | 얼어붙은 가지 · 눈의 가지 빈터 꾸미기 |
| 5장 시작 | 🛷 설산 정상의 썰매지기를 찾아가 보자. 얼어붙은 가지 이야기를 들려줄 거예요. |
| 5장 완료 | 눈의 가지에 온기가 돌아요. 산장 창에 불이 켜졌어요. |
| 프롬프트 | 💬 썰매지기에게 말 걸기 |
| 대사 guide | 어서 와요. 산장에서 코코아로 몸부터 녹여요. / 몸이 풀리면 출발대에서 썰매를 타 봐요. 도토리를 주우면 더 빨라져요. |
| 대사 quest | 세계수 소식 들었어요. 이 산에도 가지가 하나 있는데, 겨우내 얼어 있어요. / 세계수 판에서 ❄️ 눈의 가지 빈터를 따뜻하게 꾸며 줄래요? |
| 대사 thanks | 창에 불이 다시 켜졌어요. 고마워요. / (선물 1회) 이 썰매는 세계수 가지로 만든 거예요. 타고 내려가 봐요. |
| 썰매 | ❄️ 세계수 썰매 · 균형 잡힌 기본 썰매 · 잠금: ❄️ 눈의 가지를 꾸미면 받아요 · 토스트: ❄️ 세계수 썰매를 받았어요 |

- [ ] **Step 2: 승인된 문구로 아래 Task 의 초안 문자열을 바꿔 쓴다.** 바뀐 문구는 dev/archive/snow-branch/snow-branch-context.md 의 "확정 문구" 표에 남긴다.

---

### Task 1: 세계수 판 — 눈의 가지 데이터 · `after` 게이트 · ☃️ 장식 · 판 안내

**Files:**
- Modify: `js/world/tree-board.js` (TREE_DECOR, BRANCHES, `branchUsable`)
- Modify: `js/spaces/world-tree.js:118-128` (`prevName`, `lead`)
- Modify: `js/story/rules.js:8` (`BRANCH_NAME`)
- Modify: `js/i18n-en.js` (가지 이름 줄 115 근처, 장식 줄 119, 꾸러미 줄 120)
- Modify: `tests/world-tree-board.test.mjs:22-34`
- Create: `tests/snow-branch-board.test.mjs`
- Create: `tests/snow-i18n.test.mjs`
- Modify: `docs/superpowers/specs/2026-10-28-snow-branch-design.md` (§0 반영)

**Interfaces:**
- Produces: `BRANCHES` 에 `{ id: 'snow', after: 'forest', lead: { todo, done }, ... }`, `mine.after = 'forest'`, `TREE_DECOR` 에 `snowman`(bloom `'snow'`). `branchUsable(tree, id)` 는 `def.after` 가 있으면 그 가지를 본다. `tests/snow-i18n.test.mjs` 의 `KO` 배열(뒤 Task 가 문자열을 덧붙인다).

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/snow-branch-board.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRANCHES, BRANCH_IDS, TREE_DECOR, defaultTree, placeDecor, habitatDone, branchUsable, restoreTree } from '../js/world/tree-board.js';

const RICH = { wood: 999, stone: 999, coal: 999, fish: 999, crop: 999, seed: 999, gem: 9 };
const place = (tree, id, decos) => decos.reduce((t, d, i) => { const r = placeDecor(t, id, i, d, RICH); assert.ok(r.ok, `${id} ${d} ${r.reason}`); return r.tree; }, tree);
const UP_TO_FOREST = { water: ['pond', 'pond', 'bigtree'], farm: ['plot', 'plot', 'plot', 'pond'], kitchen: ['plot', 'plot', 'lantern', 'lantern', 'flowers'], forest: ['bigtree', 'bigtree', 'flowers', 'hut'] };
const forestDone = () => Object.entries(UP_TO_FOREST).reduce((t, [id, d]) => place(t, id, d), defaultTree());

test('눈의 가지는 숲 다음에 보이고 썰매지기가 이웃이다', () => {
  assert.deepEqual(BRANCH_IDS, ['water', 'farm', 'kitchen', 'forest', 'snow', 'mine']);
  const snow = BRANCHES.find(b => b.id === 'snow');
  assert.equal(snow.npc, 'sledkeeper');
  assert.equal(snow.after, 'forest');
  assert.equal(BRANCHES.find(b => b.id === 'mine').after, 'forest');
  assert.ok(snow.lead.todo && snow.lead.done);
});

test('숲을 마치면 눈과 광산이 둘 다 열리고 광산은 눈을 기다리지 않는다', () => {
  const t = forestDone();
  assert.equal(branchUsable(t, 'snow'), true);
  assert.equal(branchUsable(t, 'mine'), true);
  assert.equal(branchUsable(defaultTree(), 'snow'), false);
});

test('기존 장식만으로 6칸 안에서 눈의 가지 빈터를 채운다', () => {
  const t = place(forestDone(), 'snow', ['hut', 'hut', 'lantern', 'lantern']);
  assert.equal(habitatDone(t, 'snow'), true);
});

test('☃️ 눈사람은 눈의 가지 꽃 장식이다', () => {
  const d = TREE_DECOR.find(x => x.id === 'snowman');
  assert.equal(d.bloom, 'snow');
  for (const k of Object.keys(d.cost)) assert.ok(['wood', 'stone', 'coal'].includes(k));
});

test('restoreTree 가 눈의 가지 진행을 보존한다', () => {
  const t = place(forestDone(), 'snow', ['hut', 'hut', 'lantern', 'lantern']);
  const back = restoreTree(JSON.parse(JSON.stringify(t)));
  assert.equal(back.branches.snow.habitat, true);
  assert.deepEqual(back.branches.snow.tiles.slice(0, 4), ['hut', 'hut', 'lantern', 'lantern']);
});
```

`tests/snow-i18n.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const KO = [
  '눈의 가지', '썰매지기', '땔감 꾸러미', '코코아 꾸러미', '눈사람',
  '빈터를 꾸미면 🛷 썰매지기의 산장에 불이 켜져요', '🛷 썰매지기의 산장에 불이 켜졌어요',
];

test('눈의 가지 문구는 전부 영어가 있다', () => {
  for (const s of KO) assert.doesNotMatch(t(s), /[가-힣]/, s);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/snow-branch-board.test.mjs tests/snow-i18n.test.mjs`
Expected: FAIL. `BRANCH_IDS` 가 5개, `snowman` 없음, 영어 없음.

- [ ] **Step 3: 구현**

`js/world/tree-board.js`: `TREE_DECOR` 마지막 줄(`crystallamp`) 뒤에:

```js
  { id: 'snowman',   ico: '☃️', name: '눈사람',   tags: { shelter: 2, shade: 2 }, cost: { stone: 3, wood: 1 }, bloom: 'snow' },
```

`BRANCHES` 의 `forest` 행 뒤, `mine` 행 앞에:

```js
  { id: 'snow',    ico: '❄️', name: '눈의 가지',   short: '눈',   npc: 'sledkeeper', npcIco: '🛷', npcName: '썰매지기', after: 'forest',
    lead: { todo: '빈터를 꾸미면 🛷 썰매지기의 산장에 불이 켜져요', done: '🛷 썰매지기의 산장에 불이 켜졌어요' },
    habitat: { shelter: 4, light: 3 },
    bundles: [
      { id: 'firewood',  name: '땔감 꾸러미',    need: { wood: 30, coal: 8 },  reward: { coins: 60 } },
      { id: 'cocoa',     name: '코코아 꾸러미',  need: { crop: 20, seed: 5 },  reward: { coins: 70 } },
    ] },
```

`mine` 행의 `npcName: '광부 아저씨',` 뒤에 `after: 'forest',` 를 넣는다.

`branchUsable` 을 바꾼다:

```js
export function branchUsable(tree, id) {
  const i = BRANCH_IDS.indexOf(id);
  if (i < 0) return false;
  if (i === 0) return true;
  return habitatDone(tree, BRANCHES[i].after || BRANCH_IDS[i - 1]);
}
```

`js/spaces/world-tree.js` 의 `prevName` 줄과 `lead` 식을 바꾼다:

```js
      prevName: i > 0 ? (p => `${p.ico} ${p.name}`)(def.after ? branchOf(def.after) : BRANCHES[i - 1]) : '',
      lead: def.lead
        ? (habitatDone(tree, def.id) ? def.lead.done : def.lead.todo)
        : habitatDone(tree, def.id) || isOpen(def.npc)
          ? (jong(def.npcName) ? `${def.npcIco} ${def.npcName}이 돌아와 있어요` : `${def.npcIco} ${def.npcName}가 돌아와 있어요`)
          : (jong(def.npcName) ? `빈터를 꾸미면 ${def.npcIco} ${def.npcName}이 돌아와요` : `빈터를 꾸미면 ${def.npcIco} ${def.npcName}가 돌아와요`),
```

(`branchOf` 가 world-tree.js 에 import 돼 있지 않으면 `'../world/tree-board.js'` import 목록에 더한다.)

`js/story/rules.js:8`:

```js
const BRANCH_NAME = { water: '물의 가지', farm: '밭의 가지', kitchen: '부엌의 가지', forest: '숲의 가지', snow: '눈의 가지' };
```

`js/i18n-en.js`: 가지 이름 줄(115)에 `'눈의 가지': 'Snow Branch',`, 장식 줄(119)에 `'눈사람': 'Snowman',`, 꾸러미 줄(120)에 `'땔감 꾸러미': 'Firewood Bundle', '코코아 꾸러미': 'Cocoa Bundle',`, 그리고 같은 사전 안 아무 자리에:

```js
  '썰매지기': 'Sled Keeper',
  '빈터를 꾸미면 🛷 썰매지기의 산장에 불이 켜져요': 'Decorate the clearing and the 🛷 Sled Keeper\'s hut lights up',
  '🛷 썰매지기의 산장에 불이 켜졌어요': 'The 🛷 Sled Keeper\'s hut is lit again',
```

`tests/world-tree-board.test.mjs`: `RECIPE` 에 `snow: ['hut', 'hut', 'lantern', 'lantern'],` 추가, 순서 테스트를 바꾼다:

```js
test('가지 순서: 💧 물이 첫 번째(E3 첫 물고기) → 밭 → 부엌 → 숲 → ❄️ 눈 → ⛏️ 광산', () => {
  assert.deepEqual(BRANCH_IDS, ['water', 'farm', 'kitchen', 'forest', 'snow', 'mine']);
  assert.deepEqual(BRANCHES.map(b => b.npc), ['angler', 'farmer', 'chef', 'forager', 'sledkeeper', 'miner']);
});
```

스펙 §3 의 코코아 재료·`after`·`lead` 와 §5 `npc: null`, §6 흰 잎·`seed`, §9 창 불빛 메시를 §0 에 맞게 고친다.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/snow-branch-board.test.mjs tests/snow-i18n.test.mjs tests/world-tree-board.test.mjs tests/tree-board-tabs.test.mjs tests/tree-recommend.test.mjs tests/story-chapters.test.mjs`
Expected: PASS. tree-bloom 쪽 실패는 Task 2 에서 채우는 것이라 이 단계에선 돌리지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add js/world/tree-board.js js/spaces/world-tree.js js/story/rules.js js/i18n-en.js tests/world-tree-board.test.mjs tests/snow-branch-board.test.mjs tests/snow-i18n.test.mjs docs/superpowers/specs/2026-10-28-snow-branch-design.md
git commit -m "feat(tree): snow branch on the world tree board, opened after the forest"
```

---

### Task 2: 꽃피우기 · 돌봄 · 손님

**Files:**
- Modify: `js/world/tree-bloom.js` (`STAGES`, `CARE_NEEDS`, `GUESTS`)
- Modify: `js/i18n-en.js:170` 근처(손님 이름 줄)
- Modify: `tests/snow-i18n.test.mjs` (`KO` 에 손님 이름 추가)

**Interfaces:**
- Consumes: Task 1 의 `BRANCH_IDS`(snow 포함), `TREE_DECOR.snowman`.
- Produces: `STAGES.snow`, `CARE_NEEDS.snow`, `GUESTS.snow`(id: `penguin`, `seal`, `snowhare`, `wolf`, `moonbear`).

- [ ] **Step 1: 실패 확인(기존 테스트가 새 가지를 자동으로 검사한다)**

`tests/snow-i18n.test.mjs` 의 `KO` 끝에 `'펭귄', '물범', '눈토끼', '늑대', '반달곰',` 추가.

Run: `node --test tests/tree-bloom.test.mjs tests/snow-i18n.test.mjs`
Expected: FAIL. `STAGES[snow]` undefined.

- [ ] **Step 2: 구현**

`js/world/tree-bloom.js`: `STAGES` 의 `mine` 앞에:

```js
  snow: [
    { need: { wood: 50, coal: 15 }, reward: { bait: 5 } },
    { need: { forage: 15, stone: 30 }, reward: { fert: 3 } },
    { need: { charcoal: 4, crop: 30 }, reward: { seed: 15 } },
  ],
```

`CARE_NEEDS` 의 `mine` 앞에 `snow: [{ coal: 4 }, { wood: 10 }],`

`GUESTS` 의 `mine` 앞에:

```js
  snow: [
    { id: 'penguin', ico: '🐧', name: '펭귄', need: { shelter: 3 }, when: 'day' },
    { id: 'seal', ico: '🦭', name: '물범', need: { shelter: 2, light: 2 }, when: 'day' },
    { id: 'snowhare', ico: '🐰', name: '눈토끼', need: { shade: 2, shelter: 2 }, when: 'day' },
    { id: 'wolf', ico: '🐺', name: '늑대', need: { shelter: 4 }, when: 'night' },
    { id: 'moonbear', ico: '🐻', name: '반달곰', need: { shelter: 3, light: 2 }, when: 'night' },
  ],
```

`js/i18n-en.js` 손님 줄에 `'펭귄': 'Penguin', '물범': 'Seal', '눈토끼': 'Snow Hare', '늑대': 'Wolf', '반달곰': 'Moon Bear',`

- [ ] **Step 3: 통과 확인**

Run: `node --test tests/tree-bloom.test.mjs tests/snow-i18n.test.mjs tests/world-tree-board.test.mjs`
Expected: PASS(손님 id 유일성·6칸 도달성·코인 없음 포함).

- [ ] **Step 4: 커밋**

```bash
git add js/world/tree-bloom.js js/i18n-en.js tests/snow-i18n.test.mjs
git commit -m "feat(tree): snow branch bloom stages, care and five snow guests"
```

---

### Task 3: 귀환 연출 · 눈송이 이펙트

**Files:**
- Modify: `js/world/region-cine.js` (`REGIONS`)
- Modify: `js/world/region-fx.js` (`PALETTE`, `AMBIENT`)
- Modify: `tests/region-cine.test.mjs:12-40`
- Modify: `js/i18n-en.js`, `tests/snow-i18n.test.mjs`

**Interfaces:**
- Produces: `regionFor('snow', 'habitat')` → `{ id: 'snowpeak', npc: null, place: null, at: { x: -15, z: -29.5 }, fx: 'snow', ... }`.

- [ ] **Step 1: 테스트 수정(먼저 실패하게)**

`tests/region-cine.test.mjs` 첫 세 테스트를 바꾼다:

```js
test('지역 표: 서식지 6가지 + 물 꾸러미 = 7곳, 그 밖의 완성은 지역 연출이 없다', () => {
  assert.equal(Object.keys(REGIONS).length, 7);
  for (const b of ['water', 'farm', 'kitchen', 'forest', 'snow', 'mine']) assert.ok(regionFor(b, 'habitat'), b);
  assert.ok(regionFor('water', 'bundles'));
  assert.equal(regionFor('farm', 'bundles'), null);
  assert.equal(regionFor('water', 'bloom'), null);
  assert.equal(regionFor('water', 'chapter'), null);
});

test('지역 표: 솟아오르는 건물은 실제 해금 id 이고, 광산·눈은 솟아오름이 없다', () => {
  for (const r of Object.values(REGIONS)) {
    if (r.place) assert.ok(UNLOCK_IDS.includes(r.place), r.place);
    assert.ok(Number.isFinite(r.at.x) && Number.isFinite(r.at.z));
    assert.ok(['water', 'farm', 'kitchen', 'forest', 'snow', 'mine'].includes(r.fx));
  }
  assert.equal(regionFor('mine', 'habitat').place, null);
  assert.equal(regionFor('snow', 'habitat').place, null);
  assert.equal(regionFor('snow', 'habitat').npc, null);
  assert.equal(regionFor('water', 'habitat').place, 'river');
  assert.equal(regionFor('water', 'bundles').place, 'sea');
  assert.deepEqual(Object.values(REGIONS).map(r => r.npc), ['angler', 'ferryman', 'farmer', 'chef', 'forager', null, 'miner']);
  for (const r of Object.values(REGIONS)) if (r.npc) assert.ok(UNLOCK_IDS.includes(r.npc), r.npc);
});

test('지역 좌표는 js/data/places.js 의 입구 좌표와 같다', () => {
  const src = read('js/data/places.js');
  const pos = (name) => { const m = src.match(new RegExp(`export const ${name} = new THREE\\.Vector3\\(([-\\d.]+), 0, ([-\\d.]+)\\)`)); return { x: +m[1], z: +m[2] }; };
  const want = { 'water:habitat': 'DOCK_GATE', 'water:bundles': 'SEA_GATE', 'farm:habitat': 'COOP', 'kitchen:habitat': 'KITCHEN', 'forest:habitat': 'FOREST', 'snow:habitat': 'MOUNTAIN_GATE', 'mine:habitat': 'MINE_GATE' };
  for (const [k, name] of Object.entries(want)) assert.deepEqual(REGIONS[k].at, pos(name), k);
});
```

같은 파일에 이펙트 테스트를 덧붙인다(파일 위쪽에 `read` 헬퍼가 이미 있다):

```js
test('눈송이 이펙트: 팔레트와 떠다니는 설정이 있다', () => {
  const src = read('js/world/region-fx.js');
  assert.match(src, /snow:\s+\[0x/);
  assert.match(src, /snow:\s+\{ rate:/);
});
```

`tests/snow-i18n.test.mjs` 의 `KO` 에 `'❄️ 눈의 가지', '정상 산장에 불이 켜졌어요',` 추가.

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/region-cine.test.mjs tests/snow-i18n.test.mjs`
Expected: FAIL. REGIONS 6곳.

- [ ] **Step 3: 구현**

`js/world/region-cine.js` `REGIONS` 의 `mine:habitat` 앞에:

```js
  'snow:habitat':    { id: 'snowpeak', npc: null, place: null,     at: { x: -15, z: -29.5 },   fx: 'snow',    sub: '❄️ 눈의 가지',   main: '정상 산장에 불이 켜졌어요' },
```

`js/world/region-fx.js`: `PALETTE` 의 `mine` 앞에 `snow:    [0xffffff, 0xe6f4ff, 0xbfe0ff],`, `AMBIENT` 의 `mine` 앞에 `snow:    { rate: 20, r: 5, y: [3, 6], vy: -0.6, wob: 1.2, life: 3.4, big: 0, rings: 0 },`

`js/i18n-en.js`: `'❄️ 눈의 가지': '❄️ Snow Branch', '정상 산장에 불이 켜졌어요': 'The summit hut is lit again',`

- [ ] **Step 4: 통과 확인 + 연출 수동 확인**

Run: `node --test tests/region-cine.test.mjs tests/snow-i18n.test.mjs`
Expected: PASS.

수동: 아래 "검증 방법" 으로 띄운 화면 콘솔에서 `window.__treeShot('habitat', 'snow')` 를 부르고, 설산 입구에 눈송이가 내리고 제목이 뜨는지 스크린샷으로 본다. `startReturnWalk(null)` 은 false 로 조용히 끝나야 한다(콘솔 오류 0).

- [ ] **Step 5: 커밋**

```bash
git add js/world/region-cine.js js/world/region-fx.js js/i18n-en.js tests/region-cine.test.mjs tests/snow-i18n.test.mjs
git commit -m "feat(tree): snow branch return shot lands at the mountain gate with falling snow"
```

---

### Task 4: 세계수 3D — 흰 잎 6번째 가지 (시안 비교 게이트)

**Files:**
- Modify: `js/world/tree-art.js` (`LIMBS`, `buildTreeArt` 옵션·난수·잎 색)
- Modify: `tests/world-tree-art.test.mjs`
- Create: `sims/snow-limb-compare.html`

**Interfaces:**
- Produces: `LIMBS.snow = { dir, h, len, leaf, seed }` (객체 **맨 끝**). `buildTreeArt(three, { label, limbs = LIMBS })`. `art.clusters.snow`.

- [ ] **Step 1: 지금 나무의 체크섬을 잰다(수정 전에)**

Run:

```bash
node --input-type=module -e "
import * as THREE from './vendor/three/three.module.js';
import { buildTreeArt } from './js/world/tree-art.js';
const art = buildTreeArt(THREE);
const sum = g => { const p = g.attributes.position.array; let s = 0; for (let i = 0; i < p.length; i++) s += p[i] * ((i % 7) + 1); return Math.round(s * 1000); };
const out = {}; for (const [id, c] of Object.entries(art.clusters)) out[id] = sum(c.mesh.geometry);
console.log(JSON.stringify(out));
"
```

출력 JSON 을 아래 테스트의 `BEFORE` 값으로 쓴다.

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/world-tree-art.test.mjs` 의 드로우콜 테스트를 바꾸고 두 테스트를 더한다. `BEFORE` 의 오른쪽은 Step 1 출력 JSON 을 그대로 붙인 객체 리터럴이다:

```js
test('드로우콜 ≤ 14 · 라이트 0 · 가지 잎 메시는 판 가지 6개와 1:1', () => {
  const art = buildTreeArt(THREE);
  const d = drawables(art.group);
  assert.ok(d.length <= 14, `draw calls ${d.length}`);
  let lights = 0; art.group.traverse(o => { if (o.isLight) lights++; });
  assert.equal(lights, 0);
  assert.deepEqual(Object.keys(art.clusters).sort(), ['farm', 'forest', 'kitchen', 'mine', 'snow', 'water']);
});

const BEFORE = STEP1_JSON;
const sum = g => { const p = g.attributes.position.array; let s = 0; for (let i = 0; i < p.length; i++) s += p[i] * ((i % 7) + 1); return Math.round(s * 1000); };

test('눈 가지를 더해도 기존 5가지 잎은 한 정점도 안 바뀐다', () => {
  const art = buildTreeArt(THREE);
  for (const id of ['water', 'farm', 'kitchen', 'forest', 'mine']) assert.equal(sum(art.clusters[id].mesh.geometry), BEFORE[id], id);
});

test('눈 가지 잎은 흰색 계열이다', () => {
  const art = buildTreeArt(THREE);
  const col = art.clusters.snow.mesh.geometry.attributes.color.array;
  let r = 0, g = 0, b = 0; for (let i = 0; i < col.length; i += 3) { r += col[i]; g += col[i + 1]; b += col[i + 2]; }
  const n = col.length / 3;
  assert.ok(r / n > 0.7 && g / n > 0.7 && b / n > 0.7, `${r / n} ${g / n} ${b / n}`);
});
```

(`STEP1_JSON` 은 Step 1 출력으로 바꿔 넣는다. 예: `{"water":123,"farm":456,...}`.) 같은 파일의 `BR` 헬퍼는 `Object.keys(LIMBS)` 를 쓰므로 그대로 둔다.

- [ ] **Step 3: 실패 확인**

Run: `node --test tests/world-tree-art.test.mjs`
Expected: FAIL. clusters 에 snow 없음.

- [ ] **Step 4: 구현**

`js/world/tree-art.js`: `LEAF` 정의 아래에

```js
const SNOW_LEAF = { under: 0xc9d6e2, mid: 0xe8f1f8, top: 0xffffff };
```

`LIMBS` 끝(`mine` 다음)에:

```js
  snow:    { dir: [0.588, -0.809],  h: 5.6, len: 4.6, leaf: SNOW_LEAF, seed: 61 },
```

`buildTreeArt` 시그니처:

```js
export function buildTreeArt(three, { label = '세계수', limbs = LIMBS } = {}) {
```

`rnd` 정의 줄 바로 아래에:

```js
  const seeded = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const rngOf = {};
```

`limb` 가 난수를 받게:

```js
  const limb = (pts, r0, r1, radial, segs, rr = rnd) => bark.add(tube(pts, (t) => r0 + (r1 - r0) * t, { radial, segs, rnd: rr }), bt);
```

가지 루프 머리를 `for (const [id, L] of Object.entries(limbs)) {` 로 바꾸고 첫 줄에 `const r = rngOf[id] = L.seed ? seeded(L.seed) : rnd;` 를 둔다. 루프 안의 `rnd()` 를 전부 `r()` 로 바꾸고, 루프 안 `limb(...)` 호출 끝 인자로 `r` 을 더한다.

`flowerTo` 가 난수를 받게(나머지 줄은 그대로):

```js
  const flowerTo = (b, sp, R, meta, rr = rnd) => {
    const g = blossomGeo(R), cols = g.userData.cols;
    g.rotateY(rr() * Math.PI * 2).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), sp.n)).translate(sp.p.x, sp.p.y, sp.p.z);
```

잎 루프 `for (const [id, list] of Object.entries(anchors)) {` 안의 앞부분:

```js
    const rr = rngOf[id] || rnd, pal = limbs[id]?.leaf || LEAF;
    const b = builder(), maxO = Math.max(...list.map(a => a.order));
    for (const a of list) {
      const t0 = a.order / maxO;
      const spots = leafCloud(b, a, pal, rr, { kind: 'leaf', t0 });
      spots.forEach((sp, f) => flowerTo(b, sp, 0.3 + rr() * 0.07, { kind: 'bloom', t0: f / spots.length * 0.5 }, rr));
    }
```

(기존 줄에 붙어 있던 한국어 주석은 그대로 둔다. 새로 쓰는 줄에만 주석이 없으면 된다.) 다른 곳에서 `LIMBS` 를 직접 도는 코드(`limbTip` 등)는 그대로 `LIMBS` 를 쓴다(`limbs` 옵션은 시안 전용).

- [ ] **Step 5: 통과 확인**

Run: `node --test tests/world-tree-art.test.mjs tests/tree-shot.test.mjs`
Expected: PASS. 체크섬이 다르면 snow 가 공용 `rnd` 를 한 번이라도 소비한 것이다. 루프 안에 남은 `rnd()` 를 찾는다.

- [ ] **Step 6: 시안 3개 렌더·비교 (사용자 게이트)**

`sims/snow-limb-compare.html`: 같은 카메라로 시안 A·B·C 를 나란히 그린다. 각 시안은 `buildTreeArt(THREE, { limbs: { ...LIMBS, snow: V } })`.
- A: `{ dir: [0.588, -0.809], h: 5.6, len: 4.6, leaf: { under: 0xc9d6e2, mid: 0xe8f1f8, top: 0xffffff }, seed: 61 }` (서리 흰색)
- B: 같은 자리, `leaf: { under: 0xe4e8ec, mid: 0xf6f8fa, top: 0xffffff }` (순백)
- C: `h: 6.4, len: 4.2`, 잎은 A (높은 자리)

모든 가지 잎이 다 자란 상태: `art.setState({ life: 1, branches: Object.fromEntries(Object.keys(LIMBS).map(id => [id, { leaves: 1, bloom: 0 }])) }, 1)`. 헤드리스 Chrome 으로 캡처(game-capture-pitfall 메모리: 고정 스텝 시계·포커스 에뮬)해서 한 장에 붙이고, PC 폭·모바일 폭 두 장을 `SendUserFile(display: 'render')` 로 보낸다. 사용자가 고른 값을 `LIMBS.snow` 에 넣고 Step 2 의 흰색 테스트가 여전히 통과하는지 본다.

- [ ] **Step 7: 커밋**

```bash
git add js/world/tree-art.js tests/world-tree-art.test.mjs sims/snow-limb-compare.html
git commit -m "feat(tree): white-leafed snow limb on the world tree, existing limbs unchanged"
```

---

### Task 5: 메인 스토리 5장 · 세이브 이전 · 해금 숫자 · 안내서

**Files:**
- Modify: `js/story/chapters.js` (STORY 삽입, `secret.done`, `SNOW_CHAPTER`)
- Modify: `js/story/rules.js` (`snowbranch` 규칙, `STORY_V`, `migrateStory`)
- Modify: `js/game.js:1103` (기본 story), `:2947` (복원), `:1224` (토스트)
- Modify: `js/world/unlocks.js:72-77`
- Modify: `guide/guide.html:292,414,743` 과 `guide/guide-en.html` 의 같은 문단
- Modify: `js/i18n-en.js`
- Modify: `tests/story-chapters.test.mjs:15-83`, `tests/world-unlocks.test.mjs:53-58`
- Create: `tests/snow-story.test.mjs`
- Modify: `tests/snow-i18n.test.mjs`

**Interfaces:**
- Consumes: Task 1 `BRANCH_NAME.snow`, `tree.branches.snow.habitat`.
- Produces: `STORY[4].id === 'snowbranch'`, `export const SNOW_CHAPTER` (= 4), `export const STORY_V = 2`, `export function migrateStory(story) → { story, from, to }`.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/snow-story.test.mjs` (`open` 헬퍼는 `tests/world-unlocks.test.mjs` 맨 위의 `open`·`fresh` 정의를 그대로 복사한다. 아래는 그 파일과 같은 이름을 쓴다고 가정한 모양):

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORY, storyFor, SNOW_CHAPTER } from '../js/story/chapters.js';
import { chapterDone, chapterProgress, migrateStory, STORY_V } from '../js/story/rules.js';

const snowDone = { tree: { branches: { snow: { habitat: true } } } };

test('5장은 눈의 가지이고 STORY·REWORLD 같은 자리다', () => {
  assert.equal(SNOW_CHAPTER, 4);
  assert.equal(STORY[4].id, 'snowbranch');
  assert.equal(storyFor(true)[4].id, 'snowbranch');
  assert.equal(STORY[3].id, 'secret');
  assert.equal(STORY[5].id, 'living');
});

test('5장 판정: 눈의 가지 빈터 완성', () => {
  assert.equal(chapterDone(STORY, 4, {}), false);
  assert.equal(chapterDone(STORY, 4, snowDone), true);
  assert.equal(chapterProgress(STORY, 4, {}), '❄️ 눈의 가지 빈터 0/1');
});

test('migrateStory: 5장 이상 간 옛 세이브만 한 칸 민다, 한 번만, 원본은 그대로', () => {
  const cases = [[0, 0], [3, 3], [4, 4], [5, 6], [7, 8], [8, 9]];
  for (const [ch, want] of cases) {
    const src = { ch, q: 3, started: { home: 1 } };
    const { story, from, to } = migrateStory(src);
    assert.equal(story.ch, want, `ch ${ch}`);
    assert.equal(story.v, STORY_V);
    assert.equal(from, ch);
    assert.equal(to, want);
    assert.equal(src.ch, ch);
    assert.deepEqual(story.started, { home: 1 });
    assert.equal(migrateStory(story).story.ch, want);
  }
});

test('game.js: 새 세이브 story.v · 복원 때 migrateStory · 이전 이벤트 · 토스트 장 번호', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /story: \{ ch: 0, q: 0, started: \{\}, v: STORY_V \}/);
  assert.match(src, /migrateStory\(\{ ch: 0, q: 0, started: \{\}, \.\.\.saved\.story \}\)/);
  assert.match(src, /trackEvent\('story_migrated', \{ from: mig\.from, to: mig\.to \}\)/);
  assert.match(src, /st\.ch === 4 \|\| st\.ch === 8/);
});
```

`tests/snow-i18n.test.mjs` `KO` 에 추가:

```js
  '얼어붙은 가지', '눈의 가지 빈터 꾸미기',
  '🛷 설산 정상의 썰매지기를 찾아가 보자. 얼어붙은 가지 이야기를 들려줄 거예요.',
  '눈의 가지에 온기가 돌아요. 산장 창에 불이 켜졌어요.',
  '안개가 걷혔어요. "와 줘서 고마워. 그런데 정상의 가지 하나가 아직 얼어 있단다."',
  '❄️ 눈의 가지 빈터 0/1', '❄️ 눈의 가지 빈터 1/1',
```

`tests/world-unlocks.test.mjs` 53~58 을 바꾼다(해금 숫자 테스트는 이 파일에 둔다):

```js
test('장 진행: 7장 → 천문대·별 보는 아이, 8장 → 이웃·거울 마을', () => {
  assert.ok(!open(fresh({ story: { ch: 6 } })).has('observatory'));
  assert.ok(open(fresh({ story: { ch: 7 } })).has('stargazer'));
  assert.ok(!open(fresh({ story: { ch: 7 } })).has('neighbor'));
  const o = open(fresh({ story: { ch: 8 } }));
  assert.ok(o.has('neighbor') && o.has('mirror'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/snow-story.test.mjs tests/world-unlocks.test.mjs tests/snow-i18n.test.mjs`
Expected: FAIL. `SNOW_CHAPTER` export 없음, 해금 숫자 6/7.

- [ ] **Step 3: 구현**

`js/story/chapters.js`: `secret` 행의 `done` 을 Task 0 확정 문구로 바꾸고, `secret` 행 뒤(`living` 앞)에:

```js
  {
    id: 'snowbranch', ico: '❄️', title: '얼어붙은 가지', goal: '눈의 가지 빈터 꾸미기',
    start: '🛷 설산 정상의 썰매지기를 찾아가 보자. 얼어붙은 가지 이야기를 들려줄 거예요.',
    done: '눈의 가지에 온기가 돌아요. 산장 창에 불이 켜졌어요.',
    reward: { coins: 90 },
  },
```

파일 끝에:

```js
export const SNOW_CHAPTER = STORY.findIndex(c => c.id === 'snowbranch');
```

`js/story/rules.js`: `STORY_RULES` 안 `branchWater` 뒤에:

```js
  snowbranch: { done: s => branchHab(s, 'snow'), progress: s => `❄️ 눈의 가지 빈터 ${branchHab(s, 'snow') ? 1 : 0}/1` },
```

`STORY_RULES.livingGated` 줄 뒤에:

```js
export const STORY_V = 2;
const INSERTED_AT = 4;

export function migrateStory(story) {
  const from = num(story?.ch);
  if (num(story?.v) >= STORY_V) return { story: { ...story, v: STORY_V }, from, to: from };
  const to = from > INSERTED_AT ? from + 1 : from;
  return { story: { ...story, ch: to, v: STORY_V }, from, to };
}
```

`js/game.js`:
- `'./story/rules.js'` import 목록에 `migrateStory, STORY_V` 추가.
- 1103: `story: { ch: 0, q: 0, started: {} },` → `story: { ch: 0, q: 0, started: {}, v: STORY_V },` (뒤 주석은 그대로).
- 2947 의 한 줄 `if (saved.story) gameState.story = { … };` 을 바꾼다(바로 다음 `else if (saved.npcs)` 줄은 그대로 이어진다):

```js
  if (saved.story) {
    const mig = migrateStory({ ch: 0, q: 0, started: {}, ...saved.story });
    gameState.story = mig.story;
    if (mig.from !== mig.to) trackEvent('story_migrated', { from: mig.from, to: mig.to });
  }
```

- 1224: `(st.ch === 4 || st.ch === 7)` → `(st.ch === 4 || st.ch === 8)`.

`js/world/unlocks.js` 72~77: `>= 6` 두 개를 `>= 7`, `>= 7` 두 개를 `>= 8` 로. 주석 줄의 `6장(숲의 기억)` → `7장(숲의 기억)`, `7장(별을 잇는 밤)` → `8장(별을 잇는 밤)`.

`tests/story-chapters.test.mjs` 15~83 을 아래로 바꾼다(인덱스 +1, 5장 = 눈). `storyReworld` 이후 테스트는 인덱스 0~3 만 쓰므로 그대로 둔다:

```js
test('STORY: 9장, id 고유, 순서, 잠긴 장 없음', () => {
  assert.deepEqual(STORY.map(c => c.id), ['home', 'friends', 'taste', 'secret', 'snowbranch', 'living', 'memory', 'stars', 'neighbors']);
  assert.ok(STORY.every(c => !c.soon));
  assert.deepEqual(STORY.slice(4).map(c => c.reward.coins), [90, 100, 120, 120, 150]);
  for (const c of STORY) assert.ok(STORY_RULES[c.id], `규칙 없음: ${c.id}`);
  assert.equal(STORY[8].done, '이웃 마을에 다녀왔어요. 숲은 생각보다 넓어요.');
  assert.doesNotMatch(readFileSync(new URL('../js/story/chapters.js', import.meta.url), 'utf8'), /문구 검수 대기/);
});

test('기존 1~4장 판정·진행 문구는 그대로', () => {
  assert.equal(chapterDone(STORY, 0, base({ houseStage: 3 })), true);
  assert.equal(chapterProgress(STORY, 0, base({ houseStage: 5 })), '공사 3/3');
  assert.equal(chapterProgress(STORY, 1, base({ story: { ch: 1, q: 2 } })), '의뢰 2/3');
  assert.equal(chapterProgress(STORY, 2, base({ kitchen: { cooked: 2 } })), '요리 1/1 · 서빙 0/1');
  assert.equal(chapterProgress(STORY, 3, base()), '정화 0/1');
});

const snow = { tree: { branches: { snow: { habitat: true } } } };

test('6장 living: 밭 2단계 AND 나무 1그루', () => {
  const tree = [{ x: 0, z: 0 }];
  assert.equal(chapterDone(STORY, 5, ch4Done({ farm: { stage: 2 } })), false);
  assert.equal(chapterDone(STORY, 5, ch4Done({ orchard: { trees: tree } })), false);
  assert.equal(chapterDone(STORY, 5, ch4Done({ farm: { stage: 2 }, orchard: { trees: tree } })), true);
  assert.equal(chapterProgress(STORY, 5, ch4Done({ farm: { stage: 3 } })), '밭 2/2 · 나무 0/1');
});

test('7장 memory · 8장 stars: 1개 이상', () => {
  assert.equal(chapterDone(STORY, 6, ch4Done()), false);
  assert.equal(chapterDone(STORY, 6, ch4Done({ museum: { special: { rain_fish: { id: 'carp', at: 1 } } } })), true);
  assert.equal(chapterProgress(STORY, 6, ch4Done()), '특별 진열 0/1');
  assert.equal(chapterDone(STORY, 7, ch4Done({ star: { cleared: { big_dipper: '2026-10-07' } } })), true);
  assert.equal(chapterProgress(STORY, 7, ch4Done()), '별자리 0/1');
});

test('9장 neighbors: 이웃 마을 방문 1회 · 범위 밖은 false', () => {
  assert.equal(isSoon(STORY, 8), false);
  assert.equal(chapterDone(STORY, 8, ch4Done()), false);
  assert.equal(chapterDone(STORY, 8, ch4Done({ neighbors: { visited: 1, seenAt: 0 } })), true);
  assert.equal(chapterProgress(STORY, 8, ch4Done()), '방문 0/1');
  assert.equal(chapterProgress(STORY, 8, ch4Done({ neighbors: { visited: 3 } })), '방문 1/1');
  assert.equal(chapterDone(STORY, 99, ch4Done()), false);
});

test('pendingChapters: 4장 완료자는 눈의 가지에서 멈추고, 다 충족이면 [4..8](보상 합 580)', () => {
  const s = ch4Done({ farm: { stage: 2 }, orchard: { trees: [{}] }, museum: { special: { a: {} } }, star: { cleared: { b: 1 } } });
  assert.deepEqual(pendingChapters(STORY, s), []);
  assert.deepEqual(pendingChapters(STORY, { ...s, ...snow }), [4, 5, 6, 7]);
  const all = pendingChapters(STORY, { ...s, ...snow, neighbors: { visited: 1 } });
  assert.deepEqual(all, [4, 5, 6, 7, 8]);
  assert.equal(all.reduce((n, i) => n + STORY[i].reward.coins, 0), 580);
});

test('buildStoryView: 9장이 현재면 칩이 보이고 진행은 방문 n/1', () => {
  const v = buildStoryView(STORY, ch4Done({ story: { ch: 8, q: 3, started: {} } }));
  assert.equal(v.allDone, false);
  assert.equal(v.chapters[8].state, 'now');
  assert.equal(v.chapters[8].progress, '방문 0/1');
  assert.equal(v.chapters[7].state, 'done');
  const v5 = buildStoryView(STORY, ch4Done());
  assert.equal(v5.chapters[4].state, 'now');
  assert.equal(v5.chapters[4].progress, '❄️ 눈의 가지 빈터 0/1');
  assert.equal(v5.chapters[5].state, 'lock');
  assert.equal(buildStoryView(STORY, base({ story: { ch: 9, q: 3 } })).allDone, true);
});
```

`js/i18n-en.js` 에 추가:

```js
  '얼어붙은 가지': 'The Frozen Branch',
  '눈의 가지 빈터 꾸미기': 'Decorate the Snow Branch clearing',
  '🛷 설산 정상의 썰매지기를 찾아가 보자. 얼어붙은 가지 이야기를 들려줄 거예요.': '🛷 Visit the Sled Keeper on the snowy summit. They will tell you about the frozen branch.',
  '눈의 가지에 온기가 돌아요. 산장 창에 불이 켜졌어요.': 'Warmth returns to the Snow Branch. The hut window glows again.',
  '안개가 걷혔어요. "와 줘서 고마워. 그런데 정상의 가지 하나가 아직 얼어 있단다."': 'The mist is gone. "Thank you for coming. But one branch up on the summit is still frozen."',
```

진행 문구(`❄️ 눈의 가지 빈터 0/1`, `1/1`)는 `git grep -n "물의 가지 빈터" js/i18n-en.js` 로 기존 `💧 물의 가지 빈터` 번역 방식(숫자 자리표시 패턴인지 통문장인지)을 보고 같은 방식으로 넣는다. 게이트 문구 `🌳 눈의 가지 빈터 0/1` 도 같은 방식이다.

안내서: `guide/guide.html` 414 줄 장 목록을 9장으로 고친다. 제목 `📖 나의 이야기 - 9장`, 목록에 `4장 세계수의 심장(…, +80🪙) → 5장 얼어붙은 가지(설산 썰매지기 · 눈의 가지 빈터 꾸미기, +90🪙) → 6장 마을의 살림 → 7장 숲의 기억 → 8장 별을 잇는 밤 → 9장 이웃의 숲` (기존 괄호 설명·보상은 그대로 옮긴다). 292 줄 `이야기 6장 뒤` → `이야기 7장 뒤`, 743 줄 `이야기 6장을 마치면` → `이야기 7장을 마치면`. `guide/guide-en.html` 에서 같은 문단을 `grep -n "Chapter [5-8]\|chapters" guide/guide-en.html` 로 찾아 똑같이 고친다.

마지막으로 장 번호 하드코딩 전수 검색:

```bash
git grep -n "story?\.ch\|story\.ch\|\.ch >= \|\.ch === " -- js index.html functions worker
```

스펙 7-3 표에 없는 곳이 나오면 이 Task 에서 같이 고치고 `tests/snow-story.test.mjs` 에 그 자리를 고정하는 assertion 을 한 줄 더한다.

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/snow-story.test.mjs tests/story-*.test.mjs tests/world-unlocks.test.mjs tests/tree-shot.test.mjs tests/snow-i18n.test.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add js/story js/game.js js/world/unlocks.js js/i18n-en.js guide/guide.html guide/guide-en.html tests/story-chapters.test.mjs tests/world-unlocks.test.mjs tests/snow-story.test.mjs tests/snow-i18n.test.mjs
git commit -m "feat(story): chapter 5 'The Frozen Branch' after the world tree heart, old saves shift once"
```

---

### Task 6: ❄️ 세계수 썰매 (색 시안 게이트 + DB 제약 파일)

**Files:**
- Modify: `js/mountain/sled-lineup.js` (`worldtree` 행)
- Modify: `js/mountain/cafe-shop.js` (`needs: 'snowbranch'` 잠금, `grantSnowSled`)
- Create: `sql/migrations/migrate_sled_worldtree.sql`
- Create: `sims/worldtree-sled-compare.html`
- Create: `tests/snow-sled.test.mjs`
- Modify: `js/i18n-en.js`, `tests/snow-i18n.test.mjs`

**Interfaces:**
- Produces: `SLED_LINEUP.worldtree`(stats `[3,3,3,3]`, model `davos`, `needs: 'snowbranch'`), `export const SNOW_SLED_LOCK`, `export const SNOW_SLED_TOAST`, `export function grantSnowSled(hut) → hut`.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/snow-sled.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLED_LINEUP, SLED_IDS, physOf, CASH_SLED_IDS } from '../js/mountain/sled-lineup.js';
import { rowOf, grantSnowSled, SNOW_SLED_LOCK, cafeState } from '../js/mountain/cafe-shop.js';
import { cafeItem } from '../js/mountain/cafe-catalog.js';

test('세계수 썰매는 기본 썰매와 같은 능력치·물리, 팔지 않는다', () => {
  const s = SLED_LINEUP.worldtree;
  assert.ok(SLED_IDS.includes('worldtree'));
  assert.deepEqual([...s.stats], [3, 3, 3, 3]);
  assert.equal(s.model, 'davos');
  assert.equal(s.coins, 0);
  assert.ok(!CASH_SLED_IDS.includes('worldtree'));
  assert.deepEqual(physOf('worldtree'), physOf('basic'));
});

test('눈의 가지 전엔 잠겨 있고, 받은 뒤엔 탈 수 있다', () => {
  const st = cafeState({ inventory: { coins: 99999 }, cosmetics: { owned: [], equipped: {} }, mountain: {} });
  assert.deepEqual(rowOf(cafeItem('worldtree'), st), { kind: 'locked', label: SNOW_SLED_LOCK, disabled: true });
  const hut = grantSnowSled(st.hut);
  assert.ok(hut.sleds.includes('worldtree'));
  assert.equal(grantSnowSled(hut), hut);
  assert.equal(rowOf(cafeItem('worldtree'), { ...st, hut }).kind, 'ride');
});

test('DB 제약 마이그레이션에 모든 썰매 id 가 있다', () => {
  const sql = readFileSync(new URL('../sql/migrations/migrate_sled_worldtree.sql', import.meta.url), 'utf8');
  assert.match(sql, /sled_runs_sled/);
  for (const id of SLED_IDS) assert.match(sql, new RegExp(`'${id}'`), id);
});
```

`tests/snow-i18n.test.mjs` `KO` 에 `'세계수 썰매', '❄️ 눈의 가지를 꾸미면 받아요', '❄️ 세계수 썰매를 받았어요',` 추가.

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/snow-sled.test.mjs`
Expected: FAIL. worldtree 없음.

- [ ] **Step 3: 구현**

`js/mountain/sled-lineup.js`: `starry` 행 뒤(`toboggan` 앞)에:

```js
  worldtree: entry({
    id: 'worldtree', ico: '❄️', name: '세계수 썰매', line: '균형 잡힌 기본 썰매', stats: [3, 3, 3, 3], model: 'davos', needs: 'snowbranch',
    palette: { wood: 0xf4f7fa, dark: 0xb9c9d6, metal: 0x7fb2e8, accent: 0x66c96a },
  }),
```

`js/mountain/cafe-shop.js`: 상수 줄 아래에:

```js
export const SNOW_SLED_LOCK = '❄️ 눈의 가지를 꾸미면 받아요';
export const SNOW_SLED_TOAST = '❄️ 세계수 썰매를 받았어요';
```

`rowOf` 의 `if (item.needs === 'finish')` 줄 아래에:

```js
    if (item.needs === 'snowbranch') return { kind: 'locked', label: SNOW_SLED_LOCK, disabled: true };
```

파일 끝에:

```js
export function grantSnowSled(hut) {
  if (hut.sleds.includes('worldtree')) return hut;
  return { ...hut, sleds: [...hut.sleds, 'worldtree'] };
}
```

`sql/migrations/migrate_sled_worldtree.sql`:

```sql
alter table public.sled_runs drop constraint if exists sled_runs_sled;
alter table public.sled_runs add constraint sled_runs_sled check (sled is null or sled in ('basic','sky','forest','starry','worldtree','toboggan','wind','acorn','skiff'));
```

`js/i18n-en.js`: `'세계수 썰매': 'World Tree Sled', '❄️ 눈의 가지를 꾸미면 받아요': '❄️ Decorate the Snow Branch to get it', '❄️ 세계수 썰매를 받았어요': '❄️ You got the World Tree Sled',`

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/snow-sled.test.mjs tests/mountain-*.test.mjs tests/snow-i18n.test.mjs`
Expected: PASS. 기존 mountain 테스트가 썰매 개수(8)나 순서를 박아 뒀으면 실패 메시지가 가리키는 그 줄만 9·새 순서로 고친다.

- [ ] **Step 5: 색 시안 3개 (사용자 게이트)**

`sims/worldtree-sled-compare.html`: `buildSledMesh`(js/mountain/sled-art.js)로 세 팔레트를 나란히 그린다.
- A(서리): `{ wood: 0xf4f7fa, dark: 0xb9c9d6, metal: 0x7fb2e8, accent: 0x66c96a }`
- B(흰 나무 + 초록 잎 띠): `{ wood: 0xffffff, dark: 0xdfe6ec, metal: 0x3dab84, accent: 0xb8e985 }`
- C(은빛 + 금): `{ wood: 0xe8eef3, dark: 0x9fb0be, metal: 0xe8c78e, accent: 0xffffff }`

캡처를 `SendUserFile(display: 'render')` 로 보내고 고른 팔레트를 `worldtree.palette` 에 넣는다.

- [ ] **Step 6: 커밋**

```bash
git add js/mountain/sled-lineup.js js/mountain/cafe-shop.js sql/migrations/migrate_sled_worldtree.sql sims/worldtree-sled-compare.html js/i18n-en.js tests/snow-sled.test.mjs tests/snow-i18n.test.mjs
git commit -m "feat(mountain): World Tree sled, unlocked by the snow branch"
```

DB 마이그레이션은 **배포 직전**에 pooler 로 직접 실행한다(sql-run-direct-pooler 메모리). 이 계획에선 실행하지 않는다.

---

### Task 7: 썰매지기 대화 판정 (순수 모듈)

**Files:**
- Create: `js/mountain/keeper-talk.js`
- Create: `tests/snow-keeper-talk.test.mjs`
- Modify: `js/i18n-en.js`, `tests/snow-i18n.test.mjs`

**Interfaces:**
- Consumes: `SNOW_CHAPTER`(Task 5).
- Produces:
  - `export const KEEPER_TALK_R = 1.6`
  - `export const KEEPER_PROMPT = '💬 썰매지기에게 말 걸기'`
  - `export function keeperStage(s) → 'guide' | 'quest' | 'thanks'`
  - `export function keeperLines(stage, { gift }) → string[]` (한국어 원문, 호출부가 `t()`)
  - `export function keeperWantsTalk(s) → boolean` (❕ 표시 여부)

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/snow-keeper-talk.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keeperStage, keeperLines, keeperWantsTalk, KEEPER_PROMPT, KEEPER_TALK_R } from '../js/mountain/keeper-talk.js';
import { SNOW_CHAPTER } from '../js/story/chapters.js';

const at = (ch, o = {}) => ({ story: { ch }, tree: { branches: {} }, hintsSeen: {}, ...o });
const done = { tree: { branches: { snow: { habitat: true } } } };

test('단계: 5장 전 안내, 5장 중 부탁, 빈터 완성 뒤 감사', () => {
  assert.equal(keeperStage(at(0)), 'guide');
  assert.equal(keeperStage(at(SNOW_CHAPTER)), 'quest');
  assert.equal(keeperStage(at(SNOW_CHAPTER + 1)), 'guide');
  assert.equal(keeperStage(at(0, done)), 'thanks');
  assert.equal(keeperStage(at(SNOW_CHAPTER, done)), 'thanks');
});

test('대사: 단계마다 한 줄 이상·엠대시 없음, 선물 줄은 감사 단계에서 gift 일 때만', () => {
  for (const st of ['guide', 'quest', 'thanks']) {
    const lines = keeperLines(st, { gift: false });
    assert.ok(lines.length >= 1, st);
    for (const l of lines) { assert.ok(l.length > 0); assert.doesNotMatch(l, /—/); }
  }
  assert.ok(keeperLines('thanks', { gift: true }).length > keeperLines('thanks', { gift: false }).length);
  assert.deepEqual(keeperLines('guide', { gift: true }), keeperLines('guide', { gift: false }));
});

test('❕ 는 부탁 단계에서 아직 말을 안 걸었을 때만', () => {
  assert.equal(keeperWantsTalk(at(SNOW_CHAPTER)), true);
  assert.equal(keeperWantsTalk(at(SNOW_CHAPTER, { hintsSeen: { keeperQuest: true } })), false);
  assert.equal(keeperWantsTalk(at(0)), false);
  assert.equal(keeperWantsTalk(at(SNOW_CHAPTER, done)), false);
});

test('프롬프트·반경', () => {
  assert.equal(KEEPER_PROMPT, '💬 썰매지기에게 말 걸기');
  assert.ok(KEEPER_TALK_R > 1 && KEEPER_TALK_R < 2.2);
});
```

`tests/snow-i18n.test.mjs`: `setLang('en');` 줄 아래에 `const { keeperLines, KEEPER_PROMPT } = await import('../js/mountain/keeper-talk.js');` 를 두고 테스트를 하나 더한다:

```js
test('썰매지기 대사·프롬프트 영어', () => {
  for (const st of ['guide', 'quest', 'thanks']) for (const l of keeperLines(st, { gift: true })) assert.doesNotMatch(t(l), /[가-힣]/, l);
  assert.doesNotMatch(t(KEEPER_PROMPT), /[가-힣]/);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/snow-keeper-talk.test.mjs`
Expected: FAIL. 모듈 없음.

- [ ] **Step 3: 구현**

`js/mountain/keeper-talk.js`:

```js
import { SNOW_CHAPTER } from '../story/chapters.js';

export const KEEPER_TALK_R = 1.6;
export const KEEPER_PROMPT = '💬 썰매지기에게 말 걸기';

const LINES = {
  guide: ['어서 와요. 산장에서 코코아로 몸부터 녹여요.', '몸이 풀리면 출발대에서 썰매를 타 봐요. 도토리를 주우면 더 빨라져요.'],
  quest: ['세계수 소식 들었어요. 이 산에도 가지가 하나 있는데, 겨우내 얼어 있어요.', '세계수 판에서 ❄️ 눈의 가지 빈터를 따뜻하게 꾸며 줄래요?'],
  thanks: ['창에 불이 다시 켜졌어요. 고마워요.'],
};
const GIFT_LINE = '이 썰매는 세계수 가지로 만든 거예요. 타고 내려가 봐요.';

const snowDone = (s) => !!s?.tree?.branches?.snow?.habitat;

export function keeperStage(s) {
  if (snowDone(s)) return 'thanks';
  return (Number(s?.story?.ch) || 0) === SNOW_CHAPTER ? 'quest' : 'guide';
}

export function keeperLines(stage, { gift = false } = {}) {
  const base = LINES[stage] || LINES.guide;
  return stage === 'thanks' && gift ? [...base, GIFT_LINE] : [...base];
}

export function keeperWantsTalk(s) {
  return keeperStage(s) === 'quest' && !s?.hintsSeen?.keeperQuest;
}
```

`js/i18n-en.js`:

```js
  '💬 썰매지기에게 말 걸기': '💬 Talk to the Sled Keeper',
  '어서 와요. 산장에서 코코아로 몸부터 녹여요.': 'Welcome. Warm up with a cocoa in the hut first.',
  '몸이 풀리면 출발대에서 썰매를 타 봐요. 도토리를 주우면 더 빨라져요.': 'Once you warm up, take a sled from the start deck. Acorns make you faster.',
  '세계수 소식 들었어요. 이 산에도 가지가 하나 있는데, 겨우내 얼어 있어요.': 'I heard about the World Tree. One of its branches reaches this mountain, and it has been frozen all winter.',
  '세계수 판에서 ❄️ 눈의 가지 빈터를 따뜻하게 꾸며 줄래요?': 'Could you make the ❄️ Snow Branch clearing cozy on the World Tree board?',
  '창에 불이 다시 켜졌어요. 고마워요.': 'The window is lit again. Thank you.',
  '이 썰매는 세계수 가지로 만든 거예요. 타고 내려가 봐요.': 'I made this sled from a World Tree branch. Take it for a ride.',
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/snow-keeper-talk.test.mjs tests/snow-i18n.test.mjs`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add js/mountain/keeper-talk.js js/i18n-en.js tests/snow-keeper-talk.test.mjs tests/snow-i18n.test.mjs
git commit -m "feat(mountain): sled keeper talk stages and lines"
```

---

### Task 8: 썰매지기 배선 — 프롬프트 · 대화 박스 · ❕ · 선물 · 창 불빛 · 트래킹

**Files:**
- Modify: `js/mountain/keeper-bubble.js` (`arrive(mode)`)
- Modify: `js/mountain/camp-art.js` (`buildCamp` 끝 · 창 불빛 메시 `userData.hutLight`)
- Modify: `js/spaces/mountain.js` (`keeperReady`, 대화 진행·닫기, 선물, 창 불빛 갱신, `arriveHut`, `mountainAction`)
- Modify: `js/spaces/doors.js:54` (import), `:313-319` (설산 분기)
- Create: `tests/snow-keeper-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 6 `grantSnowSled`, `SNOW_SLED_TOAST`; Task 7 전부; `showTalk / hideTalk / onTalkTap / talkShown` (js/mirror/talk-box.js).
- Produces: `export function keeperReady() → boolean` (mountain.js), `export { KEEPER_PROMPT }` (mountain.js 재노출), nearDoor `'keepertalk'`.

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/snow-keeper-wiring.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildCamp } from '../js/mountain/camp-art.js';
import { CAMP, DOOR_SPOT, DOOR_R } from '../js/mountain/camp-layout.js';
import { KEEPER_TALK_R } from '../js/mountain/keeper-talk.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('doors: 썰매지기 판정은 출발대·문 뒤에 있다', () => {
  const src = read('js/spaces/doors.js');
  const seg = src.slice(src.indexOf('} else if (atMountain) {'), src.indexOf('} else if (atObservatory)'));
  const iSled = seg.indexOf('sledStartReady()'), iDoor = seg.indexOf('hutDoorReady()'), iKeeper = seg.indexOf('keeperReady()');
  assert.ok(iSled > 0 && iDoor > iSled && iKeeper > iDoor, `${iSled} ${iDoor} ${iKeeper}`);
  assert.match(seg, /nd = 'keepertalk'; prompt = KEEPER_PROMPT;/);
});

test('mountain: 대화·선물·트래킹·말풍선 모드가 배선돼 있다', () => {
  const src = read('js/spaces/mountain.js');
  assert.match(src, /if \(nearDoor === 'keepertalk'\) return talkKeeper\(\);/);
  assert.match(src, /trackEvent\('keeper_talk_open', \{ stage \}\)/);
  assert.match(src, /trackEvent\('keeper_talk_close', \{ stage: done\.stage, via, lines_seen: done\.i \+ 1 \}\)/);
  assert.match(src, /trackEvent\('keeper_gift', \{ item_id: 'worldtree' \}\)/);
  assert.match(src, /keeperBubble\?\.arrive\(keeperWantsTalk\(gameState\) \? 'quest' : 'idle'\)/);
});

test('썰매지기 대화 자리는 산장 문 판정 밖에서도 닿는다', () => {
  const d = Math.hypot(CAMP.keeper.x - DOOR_SPOT.x, CAMP.keeper.z - DOOR_SPOT.z);
  assert.ok(d > DOOR_R, `${d}`);
  assert.ok(KEEPER_TALK_R + DOOR_R > d);
});

test('산장 창 불빛 메시는 따로 있고 처음엔 꺼져 있다', () => {
  const g = buildCamp(THREE);
  const light = g.userData.hutLight;
  assert.ok(light && light.isMesh);
  assert.equal(light.visible, false);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/snow-keeper-wiring.test.mjs`
Expected: FAIL.

- [ ] **Step 3: keeper-bubble 모드**

`js/mountain/keeper-bubble.js` 의 `arrive()` 를 바꾼다:

```js
    arrive(mode = 'idle') {
      if (mode === 'quest') { show('❕'); swapT = 0; return; }
      show('☕'); swapT = KEEPER_BUBBLE.swapS;
    },
```

- [ ] **Step 4: camp-art 창 불빛 메시**

`buildCamp` 의 `return group;` 바로 앞에:

```js
  const W = frame(CAMP.hut.x, CAMP.hut.z, CAMP.hut.ry, CAMP.deck.y - 0.1);
  const hutLight = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.55, depthWrite: false }));
  hutLight.position.set(...W.at(0, 2.32, 1.83));
  hutLight.rotation.y = CAMP.hut.ry + Math.PI / 2;
  hutLight.visible = false;
  group.add(hutLight);
  group.userData.hutLight = hutLight;
```

(`2.32` = 집 폭 절반 2.2 + 0.12, `1.83` = `hutAframe` 의 유리 삼각형 높이 `base + rise / 3 - 0.1` = 0.6 + 1.233. 앞면이 문 쪽을 보는지 Step 8 에서 앱 브라우저로 보고 `rotation.y` 의 `+ Math.PI / 2` 부호를 맞춘다.)

- [ ] **Step 5: mountain.js 대화·선물·불빛**

import 추가(이미 있는 import 줄이 있으면 이름만 더한다):

```js
import { KEEPER_TALK_R, KEEPER_PROMPT, keeperStage, keeperLines, keeperWantsTalk } from '../mountain/keeper-talk.js';
import { hideTalk, onTalkTap, showTalk, talkShown } from '../mirror/talk-box.js';
import { grantSnowSled, SNOW_SLED_TOAST } from '../mountain/cafe-shop.js';
import { t } from '../i18n.js';
```

import 블록 아래에 `export { KEEPER_PROMPT };`

`hutDoorReady` 아래에:

```js
export function keeperReady() {
  if (!$w.atMountain || sledActive() || inCafe()) return false;
  return Math.hypot(player.position.x - MOUNTAIN.x - CAMP.keeper.x, player.position.z - MOUNTAIN.z - CAMP.keeper.z) < KEEPER_TALK_R;
}

let talk = null;

function keeperShow() {
  const touch = document.body.classList.contains('is-touch');
  showTalk({ face: '🛷', color: '#e5484d', name: t('썰매지기'), line: t(talk.lines[talk.i]), next: touch ? t('▶ 탭') : t('▶ Space · 클릭') });
}

function giveSnowSled() {
  const hut = gameState.mountain?.hut || { sleds: ['basic'], sled: 'basic' };
  const next = grantSnowSled(hut);
  if (next === hut) return;
  gameState.mountain = { ...(gameState.mountain || {}), hut: next };
  ui.toast?.(SNOW_SLED_TOAST, 2600);
  trackEvent('keeper_gift', { item_id: 'worldtree' });
  requestSave();
}

function closeKeeperTalk(via) {
  if (!talk) return;
  const done = talk;
  talk = null;
  hideTalk();
  trackEvent('keeper_talk_close', { stage: done.stage, via, lines_seen: done.i + 1 });
  if (done.gift && done.i + 1 >= done.lines.length) giveSnowSled();
}

function talkKeeper() {
  if (talk) {
    if (talk.i + 1 < talk.lines.length) { talk = { ...talk, i: talk.i + 1 }; keeperShow(); return; }
    return closeKeeperTalk('action');
  }
  const stage = keeperStage(gameState);
  const gift = stage === 'thanks' && !(gameState.mountain?.hut?.sleds || []).includes('worldtree');
  talk = { stage, gift, lines: keeperLines(stage, { gift }), i: 0 };
  if (stage === 'quest' && !gameState.hintsSeen?.keeperQuest) {
    gameState.hintsSeen = { ...(gameState.hintsSeen || {}), keeperQuest: true };
    requestSave();
    keeperBubble?.arrive('idle');
  }
  keeperShow();
  onTalkTap(() => talkKeeper());
  trackEvent('keeper_talk_open', { stage });
}
```

(`ui`·`requestSave`·`trackEvent`·`gameState`·`player`·`$w`·`MOUNTAIN`·`CAMP` 는 mountain.js 에 이미 import 돼 있다. `'▶ 탭'` / `'▶ Space · 클릭'` 영어 키는 거울 마을이 쓰는 문자열이 아니므로 i18n-en.js 에 `'▶ 탭': '▶ Tap', '▶ Space · 클릭': '▶ Space · click',` 를 더한다. 이미 있으면 생략.)

`mountainAction` 맨 위에:

```js
  if (nearDoor === 'keepertalk') return talkKeeper();
```

`arriveHut` 의 `keeperBubble?.arrive();` 를 바꾼다:

```js
  keeperBubble?.arrive(keeperWantsTalk(gameState) ? 'quest' : 'idle');
```

`updateMountain(dt)` 함수 맨 앞(카페 분기보다 위)에:

```js
  if (talk && (!keeperReady() || !talkShown())) closeKeeperTalk('leave');
  const hl = $w.mountainGroup?.userData?.hutLight, lit = !!gameState.tree?.branches?.snow?.habitat;
  if (hl && hl.visible !== lit) hl.visible = lit;
```

`hutLight` 를 `$w.mountainGroup.userData` 로 올린다: `ensureMountainSpace()` 안에서 `buildCamp(...)` 결과를 그룹에 붙이는 줄 바로 다음에 `<그룹 변수>.userData.hutLight = <camp 변수>.userData.hutLight;` (변수 이름은 그 함수의 실제 이름을 따른다. `grep -n "buildCamp" js/spaces/mountain.js js/mountain/*.js` 로 붙는 자리를 찾는다.)

`exitMountain` 첫 줄과 `startSled` 첫 줄에 `closeKeeperTalk('leave');`.

- [ ] **Step 6: doors.js 프롬프트**

54 줄 import 에 `keeperReady, KEEPER_PROMPT` 를 더한다. 설산 분기의 `else if (hutDoorReady()) { nd = 'hutcafe'; prompt = '☕ 산장 카페 들어가기'; }` 뒤에:

```js
    else if (keeperReady()) { nd = 'keepertalk'; prompt = KEEPER_PROMPT; }
```

- [ ] **Step 7: 통과 확인**

Run: `node --test tests/snow-keeper-wiring.test.mjs tests/mountain-*.test.mjs tests/mobile-hud-overlap.test.mjs`
Expected: PASS.

- [ ] **Step 8: 앱 브라우저 수동 검증 (모바일 375×812)**

"검증 방법" 절차로 설산에 들어가 `const L = await import('/js/mountain/camp-layout.js'); g.player.position.set(L.CAMP.keeper.x + 1.0, 30, -1000 + L.CAMP.keeper.z)` 로 썰매지기 옆에 선다.
1. 근접 알약이 💬 로 뜨고, 액션 버튼 → 대화 박스(🛷 · 썰매지기 · guide 첫 줄). 박스 탭 → 둘째 줄 → 탭 → 닫힘. 콘솔 오류 0.
2. `g.gameState.story.ch = 4` 로 두고 `(await import('/js/spaces/mountain.js'))` 의 정상 도착 경로를 밟거나 말풍선 모드를 확인한다. ❕ 가 보이고, 대화 후 ❕ 가 사라지며 `g.gameState.hintsSeen.keeperQuest === true`.
3. `g.gameState.tree.branches.snow.habitat = true` → 산장 창 불빛이 켜진다. 대화 마지막 줄(선물) 뒤 토스트 `❄️ 세계수 썰매를 받았어요`, 카페 썰매 탭에 `타기`.
4. 대화 중 멀리 걸어가면 박스가 닫힌다.
각 단계 스크린샷을 남긴다.

- [ ] **Step 9: 커밋**

```bash
git add js/mountain/keeper-bubble.js js/mountain/camp-art.js js/spaces/mountain.js js/spaces/doors.js js/i18n-en.js tests/snow-keeper-wiring.test.mjs
git commit -m "feat(mountain): talk to the sled keeper, quest bubble, World Tree sled gift and lit hut"
```

---

### Task 9: 마무리 — 전체 테스트 · 리뷰 · 분석 문서 · 배포 체크리스트

**Files:**
- Modify: `docs/analysis/METRICS_FRAMEWORK.md`
- Modify: `dev/archive/snow-branch/snow-branch-tasks.md`, `snow-branch-context.md`

- [ ] **Step 1: 전체 테스트**

Run: `npm test 2>&1 | grep -E "^# (tests|pass|fail)|^not ok"`
Expected: `# fail 0`. 워크트리에 `node_modules` 가 없으면 먼저 `npm ci`.

- [ ] **Step 2: 코드 리뷰.** `everything-claude-code:code-reviewer` 서브에이전트에 `git diff main...HEAD` 범위와 스펙 경로를 주고 실제 버그만 보고받는다. CRITICAL·HIGH 는 고친다.

- [ ] **Step 3: 분석 문서.** `docs/analysis/METRICS_FRAMEWORK.md` 의 이야기 장 퍼널 절에 한 단락을 더한다: 배포일부터 `story_chapter_*` 의 `n` 은 5 이후 한 칸 밀린다(5 = snowbranch), 장 비교는 `chapter` id 로 한다, 새 이벤트 `keeper_talk_open` · `keeper_talk_close` · `keeper_gift` · `story_migrated`. 배포일 칸은 배포 때 채운다고 적는다.

- [ ] **Step 4: 배포 체크리스트를 dev docs 에 남긴다(실행하지 않음).** ① `sql/migrations/migrate_sled_worldtree.sql` pooler 직접 실행 → ② 웹·토스·Play·iOS·itch **동시** 배포 → ③ 토스 출시 후 notices_admin.html 공지. 동시 배포 이유: 옛 클라이언트의 `restoreTree` 는 snow 가지를, 설산 `save.js` 는 worldtree 썰매를 세이브에서 지운다. 옛 클라이언트는 `story.v` 를 몰라 장 번호를 옛 표로 읽는다.

- [ ] **Step 5: 커밋**

```bash
git add docs/analysis/METRICS_FRAMEWORK.md dev/archive/snow-branch
git commit -m "docs: snow branch analytics notes and deploy checklist"
```

---

## 검증 방법 (앱 브라우저, 모든 수동 단계 공통)

1. 서버: 워크트리에서 `python3 scripts/serve.py 8063` 을 백그라운드로. preview_start 가 다른 세션 서버로 꽉 차 있으면 `mcp__Claude_Browser__navigate` 로 `http://localhost:8063/?dbg=1&weather=clear&touchsim=1` 를 바로 연다.
2. `resize_window` preset mobile.
3. 콘솔(javascript_tool)에서 `window.fetch` 를 감싸 `supabase.co` 요청을 막고(오프라인 게스트 · 운영 DB 무기록), `requestAnimationFrame` 을 `setTimeout(16)` 으로 바꾼다.
4. 게스트 → 닉네임 입력 → 시작 → 건너뛰기. 설산: `const g = await import('/js/game.js'); g.gameState.firstDay = '2026-10-01'; (await import('/js/spaces/mountain.js')).enterMountain();`. 정상 위치 이동은 `g.player.position.set(x, 30, -1000 + z)` (y=30 필수. `__tp` 는 y=0 으로 놓아 경로 밖으로 밀려난다).
5. 끝나면 `resize_window` preset desktop.

## Self-Review 결과

- 스펙 §3~§12 → Task 1~9 대응. §13 위험: 장 번호 전수 검색은 Task 5 Step 3. legacy 세이브의 판 진입은 조사로 해소(legacy 는 박물관이 열려 있어 `worldTreePrompt` 로 판에 들어간다). region-cine 의 NPC 전제는 §0-3 으로 해소.
- 자리표시: Task 4 Step 2 의 `STEP1_JSON` 은 Step 1 실측값을 붙이는 절차다(구현 전엔 숫자를 알 수 없다).
- 이름 일관성: `grantSnowSled`·`SNOW_SLED_TOAST`·`SNOW_SLED_LOCK`(Task 6) ↔ Task 8. `keeperStage`·`keeperLines`·`keeperWantsTalk`·`KEEPER_PROMPT`·`KEEPER_TALK_R`(Task 7) ↔ Task 8. `SNOW_CHAPTER`(Task 5) ↔ Task 7. `talkKeeper`·`closeKeeperTalk` 의 `done.stage`/`done.i` ↔ wiring 테스트 정규식.
