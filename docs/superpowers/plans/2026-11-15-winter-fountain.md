# Winter Fountain Season Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 12/18~12/31 겨울 시즌에 수확제 광장 자리에서 각자 "내 분수"(1인 목표 95개, 4단계)를 짓고, 마을 전체 기부로 광장 둘레 등불 9개(300·800·1,500)를 켜는 시즌을 연다. 게스트도 참여한다.

**Architecture:** 클라이언트 시즌 목록(`PLAZA_SEASONS` + `pickSeason`)이 날짜로 현재 시즌을 고르고, `kind: 'winter'`이면 `js/plaza/index.js`가 모든 진입점을 새 런타임 `js/plaza/winter.js`로 넘긴다. 수확제 경로는 한 줄도 바뀌지 않는다. 내 분수 진행은 세이브(`gameState.plaza.winter[season]`)가 원본이고, 서버는 새 RPC `plaza_give`로 1인 상한·하루 상한·마을 누적만 지킨다. 규칙은 전부 순수 모듈(`seasons.js`, `winter-rules.js`, `winter-guide.js`, `winter-card.js`)로 두고 node 테스트로 잠근다.

**Tech Stack:** 바닐라 ES 모듈, Three.js, `node --test tests/*.test.mjs`, Supabase Postgres(plpgsql RPC, pg8000 풀러로 직접 실행), Cloudflare Worker `/api/plaza`(변경 없음), GA4 `trackEvent`(js/analytics.js), 보상형 광고 `createRewarded`/`adPill`(js/ads/rewarded.js, js/game.js:2118).

**Spec:** `docs/superpowers/specs/2026-11-15-winter-fountain-design.md` · 시안 `/Users/uicheol_hwang/calm_forest/.claude/worktrees/merge-main/sims/winter-fountain-v2/`(index.html·game-shim.js, 커밋 안 함)

## Global Constraints

- 기간 12/18 00:00 ~ 1/1 00:00 KST(`winter-2026`), 하루 상한 30, 1인 목표: 1단계 목재 20·돌 15, 2단계 돌 25·석탄 10, 3단계 물고기 10·채집물 15(합계 95).
- 마을 등불 9개, 3단계: 누적 300 → 3개, 800 → 6개, 1,500 → 9개. 보상 1단계 코인 30, 2단계 고급 씨앗 3(밀·옥수수·포도 1개씩), 3단계 꾸미기 `winterlamp` 1 + 12/31 불꽃.
- 꾸미기 보상(`winterfountain`, `winterlamp`)은 로그인 계정만 보관함으로. 게스트는 세이브에 보류했다가 로그인 뒤 지급. 코인·씨앗은 게스트도 세이브로.
- 광고 `fountain_short`(모자란 지금 단계 재료, 합계 최대 10개, 하루 2회, 텐진 `rv_house`) · `fountain_double`(등불 단계 코인·씨앗 한 번 더, 단계마다 1회, 텐진 `rv_double`).
- 새 코드·CSS·테스트에 주석을 쓰지 않는다(기존 주석은 건드리지 않는다).
- 새 로직은 game.js에 넣지 않는다. game.js에서 `plaza`가 들어간 줄은 14줄 이하(`tests/plaza-wiring.test.mjs`가 잠근다). 이 계획은 14줄을 그대로 유지한다.
- 상태 갱신은 불변으로 한다. 규칙 함수는 새 객체를 돌려준다. 예외: 인벤토리는 다른 모듈이 객체째 캐시하므로 수확제와 같이 `gameState.inventory[item] = ...` 필드 대입을 쓴다(js/plaza/index.js:239 주석과 같은 규칙).
- UI 문구: 해요체, 엠대시(—) 금지, "놀다" 계열 금지, 화살표 이모지 금지, 머리 위 말풍선에 글자 금지. 새 문구는 Task 5에서 사용자 검수를 받은 뒤에 화면에 붙인다.
- 한국어 문구를 추가하면 `js/i18n-en.js`에 영어 값을 같이 넣는다.
- 새 GA4 이벤트는 2개, 파라미터는 기존 키(`season`, `stage`, `guest`, `via`)만 쓴다.
- 브라우저 확인은 전부 무음으로 한다(아래 "무음 브라우저 확인" 절차). 소리를 켠 확인은 하지 않는다.
- 커밋 메시지는 영어, `<type>(<scope>): <description>` 형식. 서명 줄을 붙이지 않는다. 푸시·병합·배포는 사용자 지시가 있을 때만.
- 파일은 편집 도구로 한 곳씩 고친다. sed·python 일괄 치환 금지.
- 작업 위치: 워크트리 `/Users/uicheol_hwang/calm_forest/.claude/worktrees/winter-fountain`(브랜치 `feat/winter-fountain-v2`). 워크트리에는 `.env`와 `node_modules`가 없다. 그래서 `@capacitor/app 이 두 앱에 들어간다` 테스트 1건은 원래 실패한다.
- 서버 SQL은 구현 중에 운영 DB에 적용하지 않는다. 배포 날 Task 11 절차로 직접(pg8000 풀러) 적용한다. 구현 중 서버 경로는 Playwright 요청 가로채기로 흉내 낸다.
- 새 꾸미기 id(`winterfountain`, `winterlamp`)와 새 세이브 칸(`plaza.winter`)이 생기므로 배포는 5곳(웹, 토스, Play, iOS, itch) 동시다.

## 스펙에서 달라진 점 (코드를 읽고 계획 단계에서 확정)

1. **광장의 지금 모습은 수확제 1단계가 아니라 완공(4단계)이다.** 운영 `/api/plaza?season=harvest-2026`은 `completed: true, forced: true, stage: 4`를 돌려주고(2026-11-15 조회), `visualStage()`(js/plaza/rules.js:47)는 그걸 4로 그린다. 시안은 `buildPlaza(1, 'after')`로 그려서 스펙의 "1단계 잔재(흙바닥·더미·말뚝) 숨기기"가 나왔지만 실제로 숨길 1단계 잔재는 없다. 겨울 바탕은 `buildPlaza(4, 'after', { winter: true })` + `buildPath(4, 'after')`로 고정한다. 바뀌는 점: 호박 더미를 뺀다(분수 둘레 등불 하나가 호박 (3.0, 1.9)과 0.36 거리로 겹친다), 눈 원판은 돌바닥(높이 0.08) 위로 올라오게 두께 0.1로 깐다. 수확 나무·벤치·가로등·허수아비·볏단·명판은 남는다. Task 6 게이트에서 사용자가 본다.
2. **기부함이 없다.** 4단계·after 광장은 기부함 자리에 명판이 선다(js/plaza/build.js:69). 겨울에는 분수 자체가 기부 지점이다(반경 2.8, 프롬프트 "❄️ 내 분수에 보태기"). 명판은 모양만 남고 겨울 동안 상호작용하지 않는다.
3. **내 분수 진행은 세이브가 원본이다.** 게스트가 로그인하면 세이브는 새 계정으로 옮겨지지만(js/supabase-client.js:594 `migrateGuestSave`) 서버 기부 행은 익명 uid에 남는다. 서버 합계로 단계를 정하면 로그인한 게스트가 1단계로 되돌아간다. 그래서 `plaza_mine`·`_plaza_current_stage`(전 유저 합산)를 쓰지 않고 새 RPC `plaza_give(p_season, p_stage, p_item, p_qty)`를 둔다. 서버는 (시즌, 사용자, 단계, 재료)별 1인 상한, 하루 상한 30, 게스트 허용 여부만 지키고 단계 순서는 클라이언트가 지킨다. 어뷰징 피해는 수확제와 같이 하루 상한으로 묶인다.
4. **서버 열이 둘이다.** 스펙의 `allow_guests`에 더해 `per_user boolean`을 둔다. `plaza_give`는 `per_user` 시즌만 받고, 기존 `plaza_donate`는 `per_user` 시즌을 `season`으로 거절한다(전 유저 단계 계산이 1인 목표 시즌에 섞이지 않게). 수확제 행은 둘 다 기본값 false라 동작이 같다.
5. **등불 보상 자격은 "처음 보탤 때의 마을 누적"으로 판정한다.** `plaza_give`가 넣기 직전 마을 누적 `village_before`를 돌려주고, 클라이언트가 처음 받은 값을 세이브 `joined`에 남긴다. 단계 k의 자격은 `joined < [300, 800, 1500][k-1]`. 서버 조회가 하나도 늘지 않고 로그인 이관에도 살아남는다.
6. **새 이벤트 이름은 `plaza_fountain_stage`, `plaza_lamp_stage`다.** `tests/plaza-tracking.test.mjs`가 js/plaza/ 안의 이벤트를 전부 `plaza_` 접두사로 잠근다.
7. **올빼미 초대·🍂 단풍잎·좌판·환전은 겨울에 돌지 않는다.** 겨울 경로는 `updateInvite`·`maybeConvert`·`stageSeenPlan`을 부르지 않는다. 안내는 배너 + 금색 화살표로 대신한다.
8. **`fountain_double`은 기부 창의 마을 등불 칸에 붙는다.** 보상 알림은 토스트(팝업 큐 `kind: 'result'`)이고 `showHintModal`(index.html:5272)은 광고 버튼 자리가 없다.
9. **의뢰 줄은 "❄️ 내 분수 n/4"로 n = 지금 단계(1~3).** 시안 칩과 같다. 다 지으면 줄이 사라진다.
10. **12/31 불꽃**은 시즌 마지막 KST 날(`closesKst` 하루 전)에 마을 3단계이고 `nightLevel > 0.3`일 때 광장 위에 뜬다.
11. **트래킹은 런타임 작업(Task 8)에 합친다.** `tests/event-taxonomy.test.mjs`가 코드에서 나가는 이벤트마다 CSV 행을 요구하므로 이벤트와 행이 같은 커밋에 들어가야 한다.
12. **시즌 전환은 페이지를 열 때 한 번 정한다.** 12/18 00:00을 넘겨 켜 둔 화면은 다시 열어야 겨울이 된다.
13. **`?plazaSeason=<처음 보는 id>`(localhost 전용)**는 목록의 마지막 시즌(겨울) 정의를 그 id로 복사해 쓴다. 테스트 시즌 서버 경로 검증용이다.
14. 기존 테스트 두 곳만 고친다: `tests/plaza-rules.test.mjs`의 `restorePlaza` 왕복 기대값에 `winter: {}`를 더하고, `tests/plaza-wiring.test.mjs`의 연결 바늘 `'initPlaza()'`를 `'initPlaza(GE)'`로 바꾼다.
15. 남는 위험: 익명 계정을 계속 새로 만들면 마을 누적을 부풀릴 수 있다(계정당 하루 30). 광고 횟수 서버 검증과 같이 범위 밖으로 둔다.

## File Structure

| 파일 | 역할 |
|---|---|
| Create `sql/migrations/migrate_plaza_winter.sql` | `allow_guests`·`per_user` 열, `plaza_give`, `plaza_donate` 가드, `plaza_progress`에 `total`·`per_user`, winter-2026 시드 |
| Create `sql/tests/plaza_winter_selftest.sql` | DO 블록 하나, 끝에서 `raise exception 'WINTER_SELFTEST_OK'`로 전부 되돌린다 |
| Modify `js/data/plaza.js` | `PLAZA_SEASONS`, `WINTER_NEEDS`, 등불·광고 상수, `PLAZA_FOUNTAIN`, `PLAZA_ITEMS.fish` |
| Create `js/plaza/seasons.js` | `pickSeason`, `datePhase`, `SEASON_OVERRIDE` (순수) |
| Create `js/plaza/winter-rules.js` | 내 분수·등불·보상·광고 계산 (순수) |
| Create `js/plaza/winter-copy.js` | 겨울 문구 |
| Create `js/plaza/winter-build.js` | 눈 원판·등불 9개·불꽃·마당 꾸미기 메시 |
| Create `js/plaza/winter.js` | 겨울 런타임(짓기·기부·보상·창·안내·광고) |
| Create `js/plaza/winter-guide.js` | 배너·화살표 판정 (순수) |
| Create `js/plaza/winter-card.js` | 의뢰 패널 줄 (순수) |
| Modify `js/plaza/index.js` | 시즌 선택, 겨울이면 winter.js로 넘김 |
| Modify `js/plaza/rules.js` | `plazaDefault`·`restorePlaza`에 `winter` 칸 |
| Modify `js/plaza/build.js` | `buildPlaza(stage, phase, { winter })` 호박 빼기 |
| Modify `js/plaza/solids.js` | `plazaPropSolids(..., { winter })`, `winterPropSolids()` |
| Modify `js/plaza/fountain.js` | 자리 상수를 data로, localhost 미리보기 삭제 |
| Modify `js/plaza/decor.js` | `winterfountain`·`winterlamp` 메시 |
| Modify `js/plaza/ui.js` | `'fountain'` 창 |
| Modify `js/plaza/net.js`, `js/supabase-client.js` | `give` = `plaza_give` RPC |
| Modify `js/game.js` | `initPlaza(GE)` 위치 이동, import 줄에 `fountainSpotNow`, `FIRST_VISIT_AT.fountain`, 충돌체 목록에 `winterlamp` |
| Modify `js/spaces/doors.js`, `js/spaces/npc.js` | 분수 프롬프트, 의뢰 패널 줄 |
| Modify `js/data/catalog.js`, `js/world/outdoor-overlap.js` | 꾸미기 2종 |
| Modify `js/guide/arbiter.js`, `js/guide/feature-rules.js` | `fountain` 우선순위, 화살표 문구, 첫 방문 한 줄 |
| Modify `js/guide/prepass-rules.js`, `js/tenjin-events.js`, `js/weekly/bridge.js` | 광고 슬롯, 텐진 묶음, `makeGuideEnv` export |
| Modify `js/i18n-en.js`, `docs/analysis/event-taxonomy.csv`, `docs/analysis/GA4_GUIDE.md` | 영어, 이벤트 행 |

서버 쪽 `functions/api/plaza.js`·`worker/index.js:235`·`scripts/serve.py:786`은 바꾸지 않는다. `/api/plaza`는 시즌 인자를 그대로 넘기고 `plaza_progress`가 새 필드를 돌려줄 뿐이다(`tests/plaza-route.test.mjs` 그대로).

## 무음 브라우저 확인 (모든 브라우저 단계 공통)

워크트리 서버를 절대경로로 띄운다(원 저장소 launch.json의 preview는 원 저장소를 서빙한다, worktree-pitfalls):

```bash
python3 /Users/uicheol_hwang/calm_forest/.claude/worktrees/winter-fountain/scripts/serve.py 8031
```

Bash `run_in_background: true`로 띄우고, Playwright MCP(`mcp__plugin_playwright_playwright__browser_run_code_unsafe`)로 첫 페이지 전에 무음 스크립트를 심는다:

```js
async (page) => {
  await page.context().addInitScript(() => {
    const connect = AudioNode.prototype.connect;
    const silent = new WeakMap();
    AudioNode.prototype.connect = function (dest, ...rest) {
      if (typeof AudioDestinationNode !== 'undefined' && dest instanceof AudioDestinationNode) {
        let gain = silent.get(dest.context);
        if (!gain) {
          gain = dest.context.createGain();
          gain.gain.value = 0;
          connect.call(gain, dest);
          silent.set(dest.context, gain);
        }
        return connect.call(this, gain, ...rest);
      }
      return connect.call(this, dest, ...rest);
    };
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...a) { this.muted = true; return play.apply(this, a); };
  });
  await page.goto('http://localhost:8031/?plazaSeason=winter-2026');
  return await page.evaluate(async () => (await fetch('/js/plaza/winter.js')).status);
}
```

마지막 값이 200이어야 워크트리를 보고 있는 것이다. 광장으로 순간 이동은 같은 도구로 `await page.evaluate(async () => { const g = await import('/js/game.js'); g.player.position.set(23, 0, 1); })`.

---

### Task 0: dev docs

**Files:**
- Create: `dev/active/winter-fountain/winter-fountain-plan.md`
- Create: `dev/active/winter-fountain/winter-fountain-context.md`
- Create: `dev/active/winter-fountain/winter-fountain-tasks.md`

**Interfaces:**
- Consumes: 이 계획 문서
- Produces: 이어서 작업할 세션이 읽는 맥락

- [ ] **Step 1: 세 파일을 만든다**

`winter-fountain-plan.md`: 첫 줄 `계획 원문: docs/superpowers/plans/2026-11-15-winter-fountain.md` 다음에 Goal·Architecture·"스펙에서 달라진 점" 15항목을 그대로 옮긴다.

`winter-fountain-context.md`:

```markdown
# winter-fountain context
Last Updated: 2026-11-15 (KST)

## 핵심 파일
- js/plaza/winter.js 런타임, js/plaza/winter-rules.js 규칙, js/plaza/seasons.js 시즌 선택
- sql/migrations/migrate_plaza_winter.sql, sql/tests/plaza_winter_selftest.sql (배포 날 적용)

## 결정
- 내 분수 진행 = 세이브 gameState.plaza.winter[season] (로그인 이관 때문)
- 서버 RPC plaza_give: 1인 상한·하루 상한·게스트 허용만, village_before 반환
- 겨울 바탕 = 수확제 완공(4, after) - 호박 + 눈 원판, 분수가 기부 지점

## 의존
- 운영 harvest-2026 은 forced 완공(stage 4)
- 배포 5곳 동시(새 꾸미기 id 2종, 새 세이브 칸)
```

`winter-fountain-tasks.md`: Task 0~11 제목을 `- [ ]` 체크리스트로.

- [ ] **Step 2: 커밋**

```bash
git add dev/active/winter-fountain
git commit -m "docs(plaza): winter fountain dev docs"
```

---

### Task 1: 서버 SQL + 시즌·재료 상수

**Files:**
- Create: `sql/migrations/migrate_plaza_winter.sql`
- Create: `sql/tests/plaza_winter_selftest.sql`
- Modify: `js/data/plaza.js:21-24` (PLAZA_ITEMS), 파일 끝에 상수 추가
- Test: `tests/plaza-winter-sql.test.mjs`

**Interfaces:**
- Consumes: 기존 `plaza_seasons`·`plaza_needs`·`plaza_donations`(sql/migrations/migrate_plaza.sql:15-42)
- Produces:
  - RPC `plaza_give(p_season text, p_stage int, p_item text, p_qty int) → jsonb` 성공 `{ ok: true, accepted, today_left, my_total, stage, item_have, item_need, village_before }`, 실패 `{ ok: false, reason: 'auth'|'qty'|'season'|'login'|'need'|'cap', stage?, today_left? }`
  - `plaza_progress(p_season)` 결과에 `total`(시즌 전체 기부 합)·`per_user` 추가
  - `js/data/plaza.js`: `PLAZA_SEASONS`, `WINTER_NEEDS`, `WINTER_LAMP_THRESHOLDS`, `WINTER_LAMPS`, `WINTER_LAMP_R`, `WINTER_LAMP_REWARD`, `WINTER_SHORT_MAX`, `PLAZA_FOUNTAIN`, `PLAZA_ITEMS.fish`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/plaza-winter-sql.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLAZA_SEASONS, WINTER_NEEDS, PLAZA_ITEMS, PLAZA_DAILY_CAP } from '../js/data/plaza.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const sql = read('sql/migrations/migrate_plaza_winter.sql');
const selftest = read('sql/tests/plaza_winter_selftest.sql');
const winter = PLAZA_SEASONS.find(s => s.id === 'winter-2026');

test('겨울 시즌 행: 기간·상한·게스트·1인 목표가 시즌 목록과 같다', () => {
  assert.ok(winter && winter.kind === 'winter' && winter.guests === true);
  const row = `('winter-2026', '${winter.opensKst} 00:00:00+09', '${winter.closesKst} 00:00:00+09', ${PLAZA_DAILY_CAP}, true, true)`;
  assert.ok(sql.includes(row), row);
});

test('1인 목표 재료가 WINTER_NEEDS 와 같고 표시 정보가 있다', () => {
  const rows = [...sql.matchAll(/\('winter-2026', (\d), '([a-z_]+)', (\d+)\)/g)].map(m => ({ stage: Number(m[1]), item: m[2], need: Number(m[3]) }));
  assert.deepEqual(rows, WINTER_NEEDS.map(n => ({ ...n })));
  assert.equal(WINTER_NEEDS.reduce((a, n) => a + n.need, 0), 95);
  for (const n of WINTER_NEEDS) assert.ok(PLAZA_ITEMS[n.item], n.item);
});

test('plaza_give: 게스트 허용은 시즌 칸으로만, 단계는 인자, 로그인 계정 역할에만 실행 권한', () => {
  assert.ok(sql.includes('create or replace function public.plaza_give(p_season text, p_stage int, p_item text, p_qty int)'));
  assert.ok(sql.includes("if not v_s.allow_guests and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then"));
  assert.ok(sql.includes("'village_before', v_before"));
  assert.ok(sql.includes('revoke all on function public.plaza_give(text, int, text, int) from public, anon;'));
  assert.ok(sql.includes('grant execute on function public.plaza_give(text, int, text, int) to authenticated;'));
});

test('plaza_donate 는 1인 목표 시즌을 거절하고, plaza_progress 는 total·per_user 를 준다', () => {
  assert.ok(sql.includes('if not found or v_s.per_user or now() < v_s.starts_at or now() >= v_s.ends_at then'));
  assert.ok(sql.includes("'total', v_total"));
  assert.ok(sql.includes("'per_user', v_s.per_user"));
});

test('셀프테스트는 DO 블록 하나이고 끝에서 스스로 되돌린다', () => {
  assert.equal(selftest.match(/do \$\$/g)?.length, 1);
  assert.ok(selftest.includes("raise exception 'WINTER_SELFTEST_OK'"));
  assert.ok(!/\bcommit\b/i.test(selftest));
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/plaza-winter-sql.test.mjs`
Expected: FAIL (`ENOENT ... migrate_plaza_winter.sql`)

- [ ] **Step 3: 데이터 상수를 넣는다**

`js/data/plaza.js:21-24`의 `PLAZA_ITEMS`에 물고기를 더한다:

```js
export const PLAZA_ITEMS = {
  wood: { ico: '🪵', name: '목재' }, stone: { ico: '🪨', name: '돌' }, coal: { ico: '⚫', name: '석탄' },
  crop: { ico: '🥕', name: '작물' }, forage: { ico: '🍄', name: '채집물' }, fish: { ico: '🐟', name: '물고기' },
};
```

파일 끝(57줄 뒤)에:

```js
export const PLAZA_SEASONS = Object.freeze([
  Object.freeze({ id: 'harvest-2026', kind: 'harvest', opensKst: '2026-10-09', closesKst: '2026-10-23', guests: false }),
  Object.freeze({ id: 'winter-2026', kind: 'winter', opensKst: '2026-12-18', closesKst: '2027-01-01', guests: true }),
]);
export const WINTER_NEEDS = Object.freeze([
  Object.freeze({ stage: 1, item: 'stone', need: 15 }), Object.freeze({ stage: 1, item: 'wood', need: 20 }),
  Object.freeze({ stage: 2, item: 'coal', need: 10 }), Object.freeze({ stage: 2, item: 'stone', need: 25 }),
  Object.freeze({ stage: 3, item: 'fish', need: 10 }), Object.freeze({ stage: 3, item: 'forage', need: 15 }),
]);
export const WINTER_LAMP_THRESHOLDS = Object.freeze([300, 800, 1500]);
export const WINTER_LAMPS = 9;
export const WINTER_LAMP_R = 5.4;
export const WINTER_LAMP_REWARD = Object.freeze({
  1: Object.freeze({ coins: 30 }),
  2: Object.freeze({ seed_wheat: 1, seed_corn: 1, seed_grape: 1 }),
  3: Object.freeze({ decor: 'winterlamp' }),
});
export const WINTER_SHORT_MAX = 10;
export const PLAZA_FOUNTAIN = Object.freeze({ x: 1.6, z: 2.8 });
```

- [ ] **Step 4: 마이그레이션을 쓴다**

`sql/migrations/migrate_plaza_winter.sql`(주석 없이):

```sql
begin;

alter table public.plaza_seasons add column if not exists allow_guests boolean not null default false;
alter table public.plaza_seasons add column if not exists per_user boolean not null default false;

create or replace function public.plaza_donate(p_season text, p_item text, p_qty int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_s     plaza_seasons;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_stage smallint;
  v_need  int;
  v_have  int;
  v_used  int;
  v_left  int;
  v_acc   int;
  v_total int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then return jsonb_build_object('ok', false, 'reason', 'login'); end if;
  if p_qty is null or p_qty < 1 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found or v_s.per_user or now() < v_s.starts_at or now() >= v_s.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'season');
  end if;

  perform pg_advisory_xact_lock(hashtext('plaza:' || p_season));

  v_stage := _plaza_current_stage(p_season);
  if v_stage is null then return jsonb_build_object('ok', false, 'reason', 'full'); end if;

  select need into v_need from plaza_needs where season = p_season and stage = v_stage and item = p_item;
  if not found then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', v_stage); end if;
  select coalesce(sum(qty), 0) into v_have from plaza_donations
    where season = p_season and stage = v_stage and item = p_item;
  if v_have >= v_need then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', v_stage); end if;

  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  v_left := v_s.daily_cap - v_used;
  if v_left <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap', 'today_left', 0); end if;

  v_acc := least(p_qty, v_left, v_need - v_have);
  insert into plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (v_uid, p_season, v_stage, p_item, v_acc, v_today);

  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  return jsonb_build_object('ok', true, 'accepted', v_acc, 'today_left', v_left - v_acc,
    'my_total', v_total, 'tier', _plaza_tier(v_total), 'stage', v_stage,
    'item_have', v_have + v_acc, 'item_need', v_need);
end $$;

create or replace function public.plaza_give(p_season text, p_stage int, p_item text, p_qty int)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_s      plaza_seasons;
  v_today  date := (now() at time zone 'Asia/Seoul')::date;
  v_need   int;
  v_mine   int;
  v_used   int;
  v_left   int;
  v_acc    int;
  v_before int;
  v_total  int;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'reason', 'auth'); end if;
  if p_qty is null or p_qty < 1 then return jsonb_build_object('ok', false, 'reason', 'qty'); end if;
  select * into v_s from plaza_seasons where season = p_season;
  if not found or not v_s.per_user or now() < v_s.starts_at or now() >= v_s.ends_at then
    return jsonb_build_object('ok', false, 'reason', 'season');
  end if;
  if not v_s.allow_guests and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return jsonb_build_object('ok', false, 'reason', 'login');
  end if;

  perform pg_advisory_xact_lock(hashtext('plaza:' || p_season || ':' || v_uid::text));

  select need into v_need from plaza_needs where season = p_season and stage = p_stage and item = p_item;
  if not found then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', p_stage); end if;
  select coalesce(sum(qty), 0) into v_mine from plaza_donations
    where season = p_season and user_id = v_uid and stage = p_stage and item = p_item;
  if v_mine >= v_need then return jsonb_build_object('ok', false, 'reason', 'need', 'stage', p_stage); end if;

  select coalesce(sum(qty), 0) into v_used from plaza_donations
    where season = p_season and user_id = v_uid and kst_day = v_today;
  v_left := v_s.daily_cap - v_used;
  if v_left <= 0 then return jsonb_build_object('ok', false, 'reason', 'cap', 'today_left', 0); end if;

  v_acc := least(p_qty, v_left, v_need - v_mine);
  select coalesce(sum(qty), 0) into v_before from plaza_donations where season = p_season;
  insert into plaza_donations (user_id, season, stage, item, qty, kst_day)
    values (v_uid, p_season, p_stage, p_item, v_acc, v_today);

  select coalesce(sum(qty), 0) into v_total from plaza_donations where season = p_season and user_id = v_uid;
  return jsonb_build_object('ok', true, 'accepted', v_acc, 'today_left', v_left - v_acc,
    'my_total', v_total, 'stage', p_stage, 'item_have', v_mine + v_acc, 'item_need', v_need,
    'village_before', v_before);
end $$;

create or replace function public.plaza_progress(p_season text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_s      plaza_seasons;
  v_cur    smallint;
  v_max    smallint;
  v_done   boolean;
  v_forced boolean;
  v_items  jsonb;
  v_names  jsonb;
  v_donors int;
  v_total  int;
begin
  select * into v_s from plaza_seasons where season = p_season;
  if not found then return jsonb_build_object('error', 'unknown season'); end if;
  v_cur := _plaza_current_stage(p_season);
  select max(stage) into v_max from plaza_needs where season = p_season;
  v_forced := v_cur is not null and now() >= v_s.ends_at;
  v_done := v_cur is null or v_forced;

  select coalesce(jsonb_agg(jsonb_build_object('stage', n.stage, 'item', n.item, 'have', h.have, 'need', n.need)
                            order by n.stage, n.item), '[]'::jsonb)
    into v_items
  from plaza_needs n
  left join lateral (
    select coalesce(sum(d.qty), 0) as have from plaza_donations d
    where d.season = n.season and d.stage = n.stage and d.item = n.item
  ) h on true
  where n.season = p_season;

  select count(distinct user_id), coalesce(sum(qty), 0) into v_donors, v_total from plaza_donations where season = p_season;

  select coalesce(jsonb_agg(x.nick order by x.first_at), '[]'::jsonb) into v_names
  from (
    select coalesce(nullif(gs.state->>'nickname', ''), '이름 없는 여행자') as nick, min(d.created_at) as first_at
    from plaza_donations d
    left join game_saves gs on gs.user_id = d.user_id
    where d.season = p_season
    group by d.user_id, gs.state->>'nickname'
    order by min(d.created_at)
    limit 500
  ) x;

  return jsonb_build_object('season', p_season, 'starts_at', v_s.starts_at, 'ends_at', v_s.ends_at,
    'started', now() >= v_s.starts_at,
    'active', now() >= v_s.starts_at and now() < v_s.ends_at,
    'completed', v_done, 'forced', v_forced,
    'stage', case when v_done then v_max + 1 else v_cur end, 'max_stage', v_max,
    'items', v_items, 'donors', v_donors, 'names', v_names,
    'total', v_total, 'per_user', v_s.per_user);
end $$;

revoke all on function public.plaza_give(text, int, text, int) from public, anon;
grant execute on function public.plaza_give(text, int, text, int) to authenticated;

insert into public.plaza_seasons (season, starts_at, ends_at, daily_cap, allow_guests, per_user)
values ('winter-2026', '2026-12-18 00:00:00+09', '2027-01-01 00:00:00+09', 30, true, true)
on conflict (season) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at,
  daily_cap = excluded.daily_cap, allow_guests = excluded.allow_guests, per_user = excluded.per_user;

insert into public.plaza_needs (season, stage, item, need) values
  ('winter-2026', 1, 'stone', 15), ('winter-2026', 1, 'wood', 20),
  ('winter-2026', 2, 'coal', 10), ('winter-2026', 2, 'stone', 25),
  ('winter-2026', 3, 'fish', 10), ('winter-2026', 3, 'forage', 15)
on conflict (season, stage, item) do update set need = excluded.need;

commit;
```

`plaza_donate`와 `plaza_progress` 본문은 sql/migrations/migrate_plaza_login_only.sql:15-61, migrate_plaza.sql:126-175를 그대로 옮기고 위 표시한 줄만 다르다(`v_s.per_user` 가드, `v_total`·`total`·`per_user`). 익명 거절 줄은 그대로 남는다.

- [ ] **Step 5: 셀프테스트를 쓴다**

`sql/tests/plaza_winter_selftest.sql`:

```sql
do $$
declare
  v_member uuid;
  v_guest  uuid;
  r jsonb;
  p jsonb;
begin
  select id into v_member from auth.users where coalesce(is_anonymous, false) = false order by created_at limit 1;
  select id into v_guest from auth.users where is_anonymous order by created_at limit 1;
  if v_member is null or v_guest is null then raise exception 'WINTER_SELFTEST_SETUP no users'; end if;

  insert into plaza_seasons (season, starts_at, ends_at, daily_cap, allow_guests, per_user)
    values ('wtest-selftest', now() - interval '1 hour', now() + interval '1 hour', 30, true, true);
  insert into plaza_needs (season, stage, item, need)
    values ('wtest-selftest', 1, 'wood', 20), ('wtest-selftest', 1, 'stone', 15), ('wtest-selftest', 2, 'coal', 10);

  perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  r := plaza_give('wtest-selftest', 1, 'wood', 25);
  assert (r->>'ok')::boolean and (r->>'accepted')::int = 20 and (r->>'today_left')::int = 10 and (r->>'village_before')::int = 0, 'guest give capped by personal need: ' || r::text;
  r := plaza_give('wtest-selftest', 1, 'wood', 1);
  assert r->>'reason' = 'need', 'personal need full: ' || r::text;
  r := plaza_give('wtest-selftest', 2, 'coal', 10);
  assert (r->>'accepted')::int = 10 and (r->>'today_left')::int = 0, 'stage order is client side: ' || r::text;
  r := plaza_give('wtest-selftest', 1, 'stone', 1);
  assert r->>'reason' = 'cap', 'daily cap: ' || r::text;
  r := plaza_give('wtest-selftest', 3, 'fish', 1);
  assert r->>'reason' = 'need', 'unknown need: ' || r::text;

  perform set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated', 'is_anonymous', false)::text, true);
  r := plaza_donate('wtest-selftest', 'wood', 1);
  assert r->>'reason' = 'season', 'plaza_donate refuses per-user season: ' || r::text;
  r := plaza_give('wtest-selftest', 1, 'wood', 5);
  assert (r->>'accepted')::int = 5 and (r->>'village_before')::int = 30 and (r->>'my_total')::int = 5, 'member give: ' || r::text;
  p := plaza_progress('wtest-selftest');
  assert (p->>'total')::int = 35 and (p->>'per_user')::boolean, 'progress total: ' || p::text;

  update plaza_seasons set allow_guests = false where season = 'wtest-selftest';
  perform set_config('request.jwt.claims', json_build_object('sub', v_guest, 'role', 'authenticated', 'is_anonymous', true)::text, true);
  r := plaza_give('wtest-selftest', 1, 'stone', 1);
  assert r->>'reason' = 'login', 'guests off: ' || r::text;

  p := plaza_progress('harvest-2026');
  assert (p->>'completed')::boolean and (p->>'stage')::int = 4 and not (p->>'per_user')::boolean, 'harvest unchanged: ' || p::text;

  raise exception 'WINTER_SELFTEST_OK';
end $$;
```

마지막 `raise exception`이 블록 전체를 되돌려 테스트 시즌·기부 행이 남지 않는다. 실행 결과는 오류 메시지에 `WINTER_SELFTEST_OK`가 있으면 통과다(Task 11).

- [ ] **Step 6: 통과를 확인한다**

Run: `node --test tests/plaza-winter-sql.test.mjs tests/plaza-sync.test.mjs tests/plaza-copy.test.mjs`
Expected: PASS (수확제 동기 테스트도 그대로 통과)

- [ ] **Step 7: 커밋**

```bash
git add sql/migrations/migrate_plaza_winter.sql sql/tests/plaza_winter_selftest.sql js/data/plaza.js tests/plaza-winter-sql.test.mjs
git commit -m "feat(plaza): winter season SQL with per-user goals and guest giving"
```

---

### Task 2: 시즌 목록과 날짜로 고르기

**Files:**
- Create: `js/plaza/seasons.js`
- Modify: `js/plaza/index.js:9` (import), `js/plaza/index.js:30-32` (SEASON)
- Test: `tests/plaza-seasons.test.mjs`

**Interfaces:**
- Consumes: `PLAZA_SEASONS` (Task 1)
- Produces:
  - `pickSeason(nowMs: number, overrideId?: string|null, list = PLAZA_SEASONS) → { id, kind, opensKst, closesKst, guests }`
  - `datePhase(def, nowMs) → 'before'|'active'|'after'`
  - `SEASON_OVERRIDE: string|null` (localhost `?plazaSeason=`)
  - `js/plaza/index.js`의 `DEF`(모듈 상수), `SEASON = DEF.id`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/plaza-seasons.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickSeason, datePhase } from '../js/plaza/seasons.js';
import { PLAZA_SEASONS, PLAZA_SEASON, PLAZA_OPENS_KST } from '../js/data/plaza.js';

const at = (iso) => Date.parse(iso);

test('pickSeason: 겨울 시작 전엔 수확제(지금 동작 그대로)', () => {
  assert.equal(pickSeason(at('2026-11-15T12:00:00+09:00')).id, 'harvest-2026');
  assert.equal(pickSeason(at('2026-12-17T23:59:59+09:00')).id, 'harvest-2026');
  assert.equal(pickSeason(at('2026-09-01T00:00:00+09:00')).id, 'harvest-2026');
});

test('pickSeason: 12/18 00:00 KST 부터 겨울, 끝난 뒤에도 마지막 시즌', () => {
  assert.equal(pickSeason(at('2026-12-18T00:00:00+09:00')).kind, 'winter');
  assert.equal(pickSeason(at('2027-02-01T00:00:00+09:00')).id, 'winter-2026');
});

test('pickSeason: ?plazaSeason= 덮어쓰기, 모르는 id 는 마지막 시즌 정의를 빌린다', () => {
  assert.equal(pickSeason(at('2026-11-15T00:00:00+09:00'), 'winter-2026').id, 'winter-2026');
  const t = pickSeason(at('2026-11-15T00:00:00+09:00'), 'wtest-1');
  assert.deepEqual({ id: t.id, kind: t.kind, guests: t.guests }, { id: 'wtest-1', kind: 'winter', guests: true });
});

test('datePhase: KST 자정 경계', () => {
  const w = PLAZA_SEASONS[1];
  assert.equal(datePhase(w, at('2026-12-17T23:59:59+09:00')), 'before');
  assert.equal(datePhase(w, at('2026-12-18T00:00:00+09:00')), 'active');
  assert.equal(datePhase(w, at('2026-12-31T23:59:59+09:00')), 'active');
  assert.equal(datePhase(w, at('2027-01-01T00:00:00+09:00')), 'after');
});

test('수확제 상수는 그대로이고 목록 첫 시즌과 같다', () => {
  assert.equal(PLAZA_SEASONS[0].id, PLAZA_SEASON);
  assert.equal(PLAZA_SEASONS[0].opensKst, PLAZA_OPENS_KST);
  const opens = PLAZA_SEASONS.map(s => Date.parse(`${s.opensKst}T00:00:00+09:00`));
  assert.deepEqual(opens, [...opens].sort((a, b) => a - b));
});

test('index.js 는 시즌을 pickSeason 으로 고른다', () => {
  const src = readFileSync(new URL('../js/plaza/index.js', import.meta.url), 'utf8');
  assert.ok(src.includes('const DEF = pickSeason(Date.now(), SEASON_OVERRIDE);'));
  assert.ok(src.includes('export const SEASON = DEF.id;'));
  assert.ok(!src.includes('|| PLAZA_SEASON'));
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/plaza-seasons.test.mjs`
Expected: FAIL (`Cannot find module .../js/plaza/seasons.js`)

- [ ] **Step 3: seasons.js를 쓴다**

```js
import { PLAZA_SEASONS } from '../data/plaza.js';

const kstMs = (day) => Date.parse(`${day}T00:00:00+09:00`);
const LOCAL = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export const SEASON_OVERRIDE = LOCAL ? new URLSearchParams(location.search).get('plazaSeason') : null;

export function pickSeason(nowMs, overrideId = null, list = PLAZA_SEASONS) {
  if (overrideId) return list.find(s => s.id === overrideId) || { ...list[list.length - 1], id: overrideId };
  const opened = list.filter(s => kstMs(s.opensKst) <= nowMs);
  return opened.length ? opened[opened.length - 1] : list[0];
}

export function datePhase(def, nowMs) {
  if (nowMs < kstMs(def.opensKst)) return 'before';
  return nowMs < kstMs(def.closesKst) ? 'active' : 'after';
}
```

- [ ] **Step 4: index.js가 시즌 목록을 쓰게 한다**

`js/plaza/index.js:9` import에서 `PLAZA_SEASON, `을 지운다:

```js
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_VIEW_R, PLAZA_OPENS_KST } from '../data/plaza.js';
import { pickSeason, SEASON_OVERRIDE } from './seasons.js';
```

`js/plaza/index.js:30-32`를 바꾼다:

```js
const IS_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const DEF = pickSeason(Date.now(), SEASON_OVERRIDE);
export const SEASON = DEF.id;
```

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test tests/plaza-seasons.test.mjs tests/plaza-*.test.mjs tests/fountain-stages.test.mjs`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add js/plaza/seasons.js js/plaza/index.js tests/plaza-seasons.test.mjs
git commit -m "feat(plaza): pick the current plaza season by date"
```

---

### Task 3: 내 분수 규칙

**Files:**
- Create: `js/plaza/winter-rules.js`
- Modify: `js/plaza/rules.js:1-5` (import), `js/plaza/rules.js:58-74` (`plazaDefault`, `restorePlaza`)
- Modify: `tests/plaza-rules.test.mjs:69` (왕복 기대값)
- Test: `tests/winter-fountain-rules.test.mjs`

**Interfaces:**
- Consumes: `WINTER_NEEDS`, `PLAZA_DAILY_CAP` (data), `giveText` (js/plaza/copy.js:54)
- Produces (`js/plaza/winter-rules.js`):
  - `FOUNTAIN_DONE = 4`, `kstDay(ms) → 'YYYY-MM-DD'`
  - `winterDefault() → { given: {}, day: '', today: 0, joined: -1, lamps: [], doubled: [], owed: [], got: [], seenStage: 1, seenLamp: 0, banner: 0, total: 0 }` (`given` 키는 `'<stage>:<item>'`)
  - `restoreWinter(saved)`, `restoreWinterMap(saved) → { [seasonId]: winterState }`
  - `myRows(st, needs?) → [{ stage, item, need, have }]`, `myStage(st, needs?) → 1..4`, `stageRows(st, needs?) → [{ item, have, need }]`(지금 단계, 이름순), `myTotal(st) → number`
  - `todayLeft(st, day, cap?) → number`, `recordGive(st, day, { stage, item, accepted, today_left, village_before }) → st`, `recordCap(st, day) → st`
  - `winterButtons(inv, left, row) → [{ label, qty, on, cls }] ×3`
  - `plazaDefault()`에 `winter: {}`, `restorePlaza()`가 `winter: restoreWinterMap(saved.winter)`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-fountain-rules.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winterDefault, restoreWinter, restoreWinterMap, myRows, myStage, stageRows, myTotal, todayLeft,
         recordGive, recordCap, winterButtons, kstDay, FOUNTAIN_DONE } from '../js/plaza/winter-rules.js';
import { plazaDefault, restorePlaza } from '../js/plaza/rules.js';

const S = (given = {}, o = {}) => ({ ...winterDefault(), given, ...o });
const ALL1 = { '1:wood': 20, '1:stone': 15 };
const ALL2 = { ...ALL1, '2:stone': 25, '2:coal': 10 };

test('myStage: 지금 단계 재료가 다 차야 다음 단계, 3단계를 채우면 완공(4)', () => {
  assert.equal(myStage(S()), 1);
  assert.equal(myStage(S({ '1:wood': 20, '1:stone': 14 })), 1);
  assert.equal(myStage(S(ALL1)), 2);
  assert.equal(myStage(S(ALL2)), 3);
  assert.equal(myStage(S({ ...ALL2, '3:fish': 10, '3:forage': 15 })), FOUNTAIN_DONE);
});

test('myStage: 앞 단계가 비어 있으면 뒤 단계 기록이 있어도 앞 단계', () => {
  assert.equal(myStage(S({ '2:coal': 10 })), 1);
});

test('stageRows: 지금 단계 품목만 이름순, 넘친 기록은 need 로 자른다', () => {
  assert.deepEqual(stageRows(S({ '1:wood': 99 })), [{ item: 'stone', have: 0, need: 15 }, { item: 'wood', have: 20, need: 20 }]);
  assert.deepEqual(stageRows(S(ALL1)).map(r => r.item), ['coal', 'stone']);
});

test('myRows·myTotal: 1인 목표 합계 95, 내 기록 합', () => {
  assert.equal(myRows(S()).reduce((a, r) => a + r.need, 0), 95);
  assert.equal(myTotal(S({ '1:wood': 5, '1:stone': 3 })), 8);
});

test('recordGive: 새 객체, 처음 보탠 때의 마을 누적을 joined 로 한 번만 남긴다', () => {
  const a = S();
  const b = recordGive(a, '2026-12-18', { stage: 1, item: 'wood', accepted: 5, today_left: 25, village_before: 120 });
  assert.notEqual(b, a);
  assert.deepEqual(a.given, {});
  assert.deepEqual(b.given, { '1:wood': 5 });
  assert.equal(b.today, 5); assert.equal(b.day, '2026-12-18'); assert.equal(b.joined, 120);
  const c = recordGive(b, '2026-12-18', { stage: 1, item: 'wood', accepted: 3, today_left: 22, village_before: 400 });
  assert.equal(c.given['1:wood'], 8); assert.equal(c.joined, 120); assert.equal(c.today, 8);
});

test('todayLeft·recordCap: 날이 바뀌면 상한이 다시 30', () => {
  const s = S({}, { day: '2026-12-18', today: 30 });
  assert.equal(todayLeft(s, '2026-12-18'), 0);
  assert.equal(todayLeft(s, '2026-12-19'), 30);
  assert.equal(todayLeft(recordCap(S(), '2026-12-20'), '2026-12-20'), 0);
});

test('kstDay: KST 자정 경계', () => {
  assert.equal(kstDay(Date.parse('2026-12-17T14:59:59Z')), '2026-12-17');
  assert.equal(kstDay(Date.parse('2026-12-17T15:00:00Z')), '2026-12-18');
});

test('winterButtons: +1 · +5 · 실제로 낼 수 있는 수', () => {
  const row = { item: 'stone', have: 10, need: 15 };
  assert.deepEqual(winterButtons({ stone: 9 }, 30, row).map(b => [b.qty, b.on]), [[1, true], [5, true], [5, true]]);
  assert.deepEqual(winterButtons({ stone: 2 }, 30, row).map(b => [b.qty, b.on]), [[1, true], [5, false], [2, true]]);
  assert.deepEqual(winterButtons({ stone: 9 }, 0, row).map(b => b.on), [false, false, false]);
  assert.deepEqual(winterButtons({ stone: 9 }, 30, row).map(b => b.label), ['+1', '+5', '5개 보태기']);
});

test('restoreWinter: 깨진 값은 버리고 새 객체', () => {
  assert.deepEqual(restoreWinter(null), winterDefault());
  const r = restoreWinter({ given: { '1:wood': 5, '9:wood': 3, x: 1, '1:stone': -2 }, lamps: [1, 1, 7], owed: ['winterfountain', 'hack'], joined: 'x', seenStage: 9 });
  assert.deepEqual(r.given, { '1:wood': 5 });
  assert.deepEqual(r.lamps, [1]);
  assert.deepEqual(r.owed, ['winterfountain']);
  assert.equal(r.joined, -1); assert.equal(r.seenStage, 4);
  assert.deepEqual(restoreWinterMap({ 'winter-2026': { given: { '1:wood': 2 } }, 'BAD ID': {} }),
    { 'winter-2026': { ...winterDefault(), given: { '1:wood': 2 } } });
});

test('광장 세이브에 winter 칸이 생기고 옛 세이브는 빈 칸', () => {
  assert.deepEqual(plazaDefault().winter, {});
  assert.deepEqual(restorePlaza({ lastStage: 4 }).winter, {});
  assert.deepEqual(restorePlaza({ winter: { 'winter-2026': { given: { '1:wood': 3 } } } }).winter['winter-2026'].given, { '1:wood': 3 });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-fountain-rules.test.mjs`
Expected: FAIL (`Cannot find module .../winter-rules.js`)

- [ ] **Step 3: winter-rules.js를 쓴다**

```js
import { WINTER_NEEDS, PLAZA_DAILY_CAP } from '../data/plaza.js';
import { giveText } from './copy.js';

export const FOUNTAIN_DONE = 4;
const STAGES = Object.freeze([1, 2, 3]);
const DECOR_IDS = Object.freeze(['winterfountain', 'winterlamp']);
const keyOf = (stage, item) => `${stage}:${item}`;
const int0 = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const plain = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : null);
export const stageList = (a) => (Array.isArray(a) ? [...new Set(a.filter(n => STAGES.includes(n)))].sort((x, y) => x - y) : []);
export const decorList = (a) => (Array.isArray(a) ? [...new Set(a.filter(id => DECOR_IDS.includes(id)))] : []);

export const kstDay = (ms) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);

export function winterDefault() {
  return { given: {}, day: '', today: 0, joined: -1, lamps: [], doubled: [], owed: [], got: [], seenStage: 1, seenLamp: 0, banner: 0, total: 0 };
}

export function restoreWinter(saved) {
  const s = plain(saved);
  if (!s) return winterDefault();
  const given = Object.fromEntries(Object.entries(plain(s.given) || {})
    .filter(([k, v]) => /^[1-3]:[a-z_]{1,24}$/.test(k) && Number.isInteger(v) && v > 0));
  return {
    given,
    day: typeof s.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.day) ? s.day : '',
    today: Math.min(PLAZA_DAILY_CAP, int0(s.today)),
    joined: Number.isInteger(s.joined) && s.joined >= 0 ? s.joined : -1,
    lamps: stageList(s.lamps),
    doubled: stageList(s.doubled),
    owed: decorList(s.owed),
    got: decorList(s.got),
    seenStage: Math.min(FOUNTAIN_DONE, Math.max(1, int0(s.seenStage))),
    seenLamp: Math.min(STAGES.length, int0(s.seenLamp)),
    banner: int0(s.banner),
    total: int0(s.total),
  };
}

export function restoreWinterMap(saved) {
  const s = plain(saved);
  if (!s) return {};
  return Object.fromEntries(Object.entries(s)
    .filter(([id]) => /^[a-z0-9-]{3,32}$/.test(id))
    .map(([id, v]) => [id, restoreWinter(v)]));
}

export function myRows(st, needs = WINTER_NEEDS) {
  return needs.map(n => ({ stage: n.stage, item: n.item, need: n.need, have: Math.min(n.need, st.given[keyOf(n.stage, n.item)] || 0) }));
}

export function myStage(st, needs = WINTER_NEEDS) {
  const open = myRows(st, needs).find(r => r.have < r.need);
  return open ? open.stage : FOUNTAIN_DONE;
}

export function stageRows(st, needs = WINTER_NEEDS) {
  const stage = myStage(st, needs);
  return myRows(st, needs).filter(r => r.stage === stage)
    .map(({ item, have, need }) => ({ item, have, need }))
    .sort((a, b) => a.item.localeCompare(b.item));
}

export const myTotal = (st) => Object.values(st.given).reduce((a, n) => a + n, 0);

export const todayLeft = (st, day, cap = PLAZA_DAILY_CAP) => Math.max(0, cap - (st.day === day ? st.today : 0));

export function recordGive(st, day, { stage, item, accepted, today_left, village_before }) {
  const k = keyOf(stage, item);
  const n = Math.max(0, accepted | 0);
  const usedBefore = st.day === day ? st.today : 0;
  return {
    ...st,
    given: { ...st.given, [k]: (st.given[k] || 0) + n },
    day,
    today: Number.isInteger(today_left) ? PLAZA_DAILY_CAP - today_left : usedBefore + n,
    joined: st.joined >= 0 || !Number.isInteger(village_before) ? st.joined : village_before,
  };
}

export const recordCap = (st, day) => ({ ...st, day, today: PLAZA_DAILY_CAP });

export function winterButtons(inv, left, row) {
  const max = Math.max(0, Math.min(inv?.[row.item] | 0, left | 0, row.need - row.have));
  return [
    { label: '+1', qty: 1, on: max >= 1, cls: '' },
    { label: '+5', qty: 5, on: max >= 5, cls: '' },
    { label: giveText(max), qty: max, on: max >= 1, cls: 'max' },
  ];
}
```

- [ ] **Step 4: 광장 세이브에 winter 칸을 단다**

`js/plaza/rules.js:5` 아래에:

```js
import { restoreWinterMap } from './winter-rules.js';
```

`js/plaza/rules.js:58-74`:

```js
export function plazaDefault() {
  return { lastStage: 0, claimed: {}, invited: '', converted: {}, seen: {}, winter: {} };
}
```

`restorePlaza`의 반환 객체 끝(`seen: onlyTrue(saved.seen),` 다음)에 `winter: restoreWinterMap(saved.winter),`를 더한다.

`tests/plaza-rules.test.mjs:69`의 `  assert.deepEqual(r, saved); assert.notEqual(r, saved);` 줄 전체를 다음으로 바꾼다:

```js
  assert.deepEqual(r, { ...saved, winter: {} }); assert.notEqual(r, saved);
```

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test tests/winter-fountain-rules.test.mjs tests/plaza-rules.test.mjs`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add js/plaza/winter-rules.js js/plaza/rules.js tests/winter-fountain-rules.test.mjs tests/plaza-rules.test.mjs
git commit -m "feat(plaza): personal winter fountain rules and save slot"
```

---

### Task 4: 마을 등불·보상·광고 계산

**Files:**
- Modify: `js/plaza/winter-rules.js` (끝에 추가, import 확장)
- Test: `tests/winter-lamp-rules.test.mjs`

**Interfaces:**
- Consumes: Task 3 상태 모양, `WINTER_LAMP_THRESHOLDS`, `WINTER_LAMPS`, `WINTER_LAMP_R`, `WINTER_LAMP_REWARD`, `WINTER_SHORT_MAX`
- Produces:
  - `villageStage(total) → 0..3`, `litLamps(total) → 0|3|6|9`, `nextLampLeft(total) → number`
  - `lampSpot(i) → { x, z }`(광장 로컬, 반지름 5.4), `lampLit(i, lit) → boolean`
  - `lampEligible(st, k)`, `lampClaims(st, total) → number[]`, `lampGrant(k) → { give: object|null, decor: string|null }`, `claimLamp(st, k) → st`
  - `doubleOpen(st, k) → boolean`, `markDoubled(st, k) → st`
  - `decorPlan(st, id, isGuest) → { st, grant: boolean }`, `settleOwed(st, isGuest) → { st, grant: string[] }`
  - `shortFill(rows, inv, max?) → { [item]: n }`
  - `fireworksDue(def, nowMs, total) → boolean`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-lamp-rules.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { winterDefault, villageStage, litLamps, nextLampLeft, lampSpot, lampLit, lampEligible, lampClaims, lampGrant,
         claimLamp, doubleOpen, markDoubled, decorPlan, settleOwed, shortFill, fireworksDue } from '../js/plaza/winter-rules.js';
import { PLAZA_SEASONS } from '../js/data/plaza.js';

const S = (o = {}) => ({ ...winterDefault(), ...o });
const WINTER = PLAZA_SEASONS[1];

test('villageStage·litLamps: 300 → 3개, 800 → 6개, 1500 → 9개', () => {
  assert.deepEqual([0, 299, 300, 799, 800, 1499, 1500, 9999].map(villageStage), [0, 0, 1, 1, 2, 2, 3, 3]);
  assert.deepEqual([0, 300, 800, 1500].map(litLamps), [0, 3, 6, 9]);
  assert.equal(nextLampLeft(120), 180);
  assert.equal(nextLampLeft(800), 700);
  assert.equal(nextLampLeft(1500), 0);
});

test('lampLit: 켜지는 순서는 흩어 놓는다(세로 폰에서도 보이게)', () => {
  const on = (lit) => Array.from({ length: 9 }, (_, i) => i).filter(i => lampLit(i, lit));
  assert.deepEqual(on(3), [0, 3, 6]);
  assert.deepEqual(on(6), [0, 1, 3, 4, 6, 7]);
  assert.equal(on(9).length, 9);
});

test('lampSpot: 광장 둘레 반지름 5.4', () => {
  for (let i = 0; i < 9; i++) { const p = lampSpot(i); assert.ok(Math.abs(Math.hypot(p.x, p.z) - 5.4) < 1e-9); }
  assert.ok(Math.abs(lampSpot(0).x) < 1e-9 && lampSpot(0).z < 0);
});

test('lampClaims: 그 단계가 켜지기 전에 보탠 사람만, 한 번씩', () => {
  assert.deepEqual(lampClaims(S({ joined: 120 }), 900), [1, 2]);
  assert.deepEqual(lampClaims(claimLamp(S({ joined: 120 }), 1), 900), [2]);
  assert.deepEqual(lampClaims(S({ joined: 500 }), 900), [2]);
  assert.deepEqual(lampClaims(S({ joined: -1 }), 1500), []);
  assert.deepEqual(lampClaims(S({ joined: 299 }), 300), [1]);
  assert.deepEqual(lampClaims(S({ joined: 300 }), 300), []);
  assert.equal(lampEligible(S({ joined: 1499 }), 3), true);
});

test('lampGrant: 1 코인 30, 2 고급 씨앗 3, 3 겨울 등불 꾸미기', () => {
  assert.deepEqual(lampGrant(1), { give: { coins: 30 }, decor: null });
  assert.deepEqual(lampGrant(2), { give: { seed_wheat: 1, seed_corn: 1, seed_grape: 1 }, decor: null });
  assert.deepEqual(lampGrant(3), { give: null, decor: 'winterlamp' });
});

test('doubleOpen: 받은 단계의 코인·씨앗만, 단계마다 한 번', () => {
  const s = S({ lamps: [1, 3] });
  assert.equal(doubleOpen(s, 1), true);
  assert.equal(doubleOpen(s, 2), false);
  assert.equal(doubleOpen(s, 3), false);
  assert.equal(doubleOpen(markDoubled(s, 1), 1), false);
});

test('decorPlan: 게스트는 보류, 로그인 계정은 바로 받고 두 번 주지 않는다', () => {
  const g = decorPlan(S(), 'winterfountain', true);
  assert.equal(g.grant, false); assert.deepEqual(g.st.owed, ['winterfountain']);
  const m = decorPlan(S(), 'winterfountain', false);
  assert.equal(m.grant, true); assert.deepEqual(m.st.got, ['winterfountain']);
  assert.equal(decorPlan(m.st, 'winterfountain', false).grant, false);
});

test('settleOwed: 로그인하면 보류분을 한 번에, 게스트면 그대로', () => {
  const s = S({ owed: ['winterfountain', 'winterlamp'] });
  assert.deepEqual(settleOwed(s, true), { st: s, grant: [] });
  const r = settleOwed(s, false);
  assert.deepEqual(r.grant, ['winterfountain', 'winterlamp']);
  assert.deepEqual(r.st.owed, []); assert.deepEqual(r.st.got, ['winterfountain', 'winterlamp']);
});

test('shortFill: 가방과 합쳐도 모자란 만큼, 합계 최대 10', () => {
  const rows = [{ item: 'coal', have: 2, need: 10 }, { item: 'stone', have: 5, need: 25 }];
  assert.deepEqual(shortFill(rows, { coal: 3, stone: 0 }), { coal: 5, stone: 5 });
  assert.deepEqual(shortFill(rows, { coal: 8, stone: 20 }), {});
  assert.deepEqual(shortFill(rows, { coal: 8, stone: 18 }), { stone: 2 });
});

test('fireworksDue: 시즌 마지막 KST 날(12/31)에 마을 3단계', () => {
  const at = (iso) => Date.parse(iso);
  assert.equal(fireworksDue(WINTER, at('2026-12-31T20:00:00+09:00'), 1500), true);
  assert.equal(fireworksDue(WINTER, at('2026-12-30T20:00:00+09:00'), 1500), false);
  assert.equal(fireworksDue(WINTER, at('2026-12-31T20:00:00+09:00'), 800), false);
  assert.equal(fireworksDue(WINTER, at('2027-01-01T00:30:00+09:00'), 1500), false);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-lamp-rules.test.mjs`
Expected: FAIL (`villageStage is not a function` 계열 import 오류)

- [ ] **Step 3: winter-rules.js에 더한다**

첫 줄 import를 바꾼다:

```js
import { WINTER_NEEDS, PLAZA_DAILY_CAP, WINTER_LAMP_THRESHOLDS, WINTER_LAMPS, WINTER_LAMP_R, WINTER_LAMP_REWARD, WINTER_SHORT_MAX } from '../data/plaza.js';
```

파일 끝에:

```js
const PER_STAGE = WINTER_LAMPS / WINTER_LAMP_THRESHOLDS.length;

export const villageStage = (total) => WINTER_LAMP_THRESHOLDS.filter(t => (total | 0) >= t).length;

export const litLamps = (total) => villageStage(total) * PER_STAGE;

export function nextLampLeft(total) {
  const t = WINTER_LAMP_THRESHOLDS.find(x => (total | 0) < x);
  return t === undefined ? 0 : t - (total | 0);
}

export function lampSpot(i) {
  const a = -Math.PI / 2 + (i / WINTER_LAMPS) * Math.PI * 2;
  return { x: Math.cos(a) * WINTER_LAMP_R, z: Math.sin(a) * WINTER_LAMP_R };
}

export const lampLit = (i, lit) => (i % PER_STAGE) * PER_STAGE + Math.floor(i / PER_STAGE) < lit;

export const lampEligible = (st, k) => st.joined >= 0 && st.joined < WINTER_LAMP_THRESHOLDS[k - 1];

export const lampClaims = (st, total) => STAGES.filter(k => k <= villageStage(total) && lampEligible(st, k) && !st.lamps.includes(k));

export function lampGrant(k) {
  const r = WINTER_LAMP_REWARD[k];
  return r.decor ? { give: null, decor: r.decor } : { give: { ...r }, decor: null };
}

export const claimLamp = (st, k) => ({ ...st, lamps: stageList([...st.lamps, k]) });

export const doubleOpen = (st, k) => st.lamps.includes(k) && !WINTER_LAMP_REWARD[k].decor && !st.doubled.includes(k);

export const markDoubled = (st, k) => ({ ...st, doubled: stageList([...st.doubled, k]) });

export function decorPlan(st, id, isGuest) {
  if (st.got.includes(id)) return { st, grant: false };
  if (isGuest) return { st: { ...st, owed: decorList([...st.owed, id]) }, grant: false };
  return { st: { ...st, got: decorList([...st.got, id]), owed: st.owed.filter(x => x !== id) }, grant: true };
}

export function settleOwed(st, isGuest) {
  if (isGuest || !st.owed.length) return { st, grant: [] };
  const grant = st.owed.filter(id => !st.got.includes(id));
  return { st: { ...st, owed: [], got: decorList([...st.got, ...grant]) }, grant };
}

export function shortFill(rows, inv, max = WINTER_SHORT_MAX) {
  return rows.reduce(({ give, left }, r) => {
    const n = Math.min(left, Math.max(0, r.need - r.have - (inv?.[r.item] | 0)));
    return n > 0 ? { give: { ...give, [r.item]: n }, left: left - n } : { give, left };
  }, { give: {}, left: max }).give;
}

export function fireworksDue(def, nowMs, total) {
  const lastDay = kstDay(Date.parse(`${def.closesKst}T00:00:00+09:00`) - 1);
  return villageStage(total) >= STAGES.length && kstDay(nowMs) === lastDay;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test tests/winter-lamp-rules.test.mjs tests/winter-fountain-rules.test.mjs`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add js/plaza/winter-rules.js tests/winter-lamp-rules.test.mjs
git commit -m "feat(plaza): village lamp thresholds, rewards and ad fill rules"
```

---

### Task 5: 겨울 문구 + 영어 (사용자 게이트: 문구 검수)

**Files:**
- Create: `js/plaza/winter-copy.js`
- Modify: `js/guide/feature-rules.js:19-32` (`ARROW_LABEL.fountain`, `FIRST_VISIT.fountain`)
- Modify: `js/i18n-en.js` (수확제 광장 절 350줄 근처 끝에 겨울 절 추가)
- Modify: `tests/feature-rules.test.mjs:63-69,82` (목록을 잠그는 기존 테스트에 새 항목 반영)
- Test: `tests/winter-copy.test.mjs`

**Interfaces:**
- Consumes: `fill`, `PLAZA_COPY` (js/plaza/copy.js), `PLAZA_ITEMS`
- Produces: `WINTER_COPY`(아래 키 전부), `winterToast(key, item, n) → string`, `ARROW_LABEL.fountain`, `FIRST_VISIT.fountain = { key: 'visitFountain', ico: '❄️', title: '겨울 분수', line }`

- [ ] **Step 1: 문구 후보를 사용자에게 보인다 (게이트)**

아래 표를 그대로 보여 주고 "이대로 갈까요, 고칠 줄이 있나요?"를 묻는다. 확정 전엔 Step 2로 가지 않는다. 고친 줄이 있으면 아래 코드와 테스트의 같은 문자열을 함께 고친다. 모바일 폭 실측은 Task 8 브라우저 단계에서 한다.

| 자리 | 문구 |
|---|---|
| 분수 앞 프롬프트 | ❄️ 내 분수에 보태기 |
| 창 제목 / 부제 | ❄️ 내 분수 짓기 / {n}단계 · {이름} |
| 단계 이름 | 받침돌 놓기 · 아랫단과 기둥 · 윗단 올리기 · 얼음 분수 완성 |
| 진행 막대 | 내 분수 |
| 안내 줄 | 다 지으면 내 마당에 꼬마 분수가 생겨요 |
| 다 지은 뒤 | 내 분수를 다 지었어요. 시즌이 끝나도 광장에 남아요 |
| 시즌 뒤 | 겨울 분수 기간이 끝났어요. 내 분수는 그대로 남아요 |
| 게스트 줄 | 로그인하면 꾸미기 선물도 받아요 |
| 완공 토스트 | ❄️ 내 분수를 다 지었어요! 마당 분수를 받았어요 / (게스트) ❄️ 내 분수를 다 지었어요! 로그인하면 마당 분수를 받아요 |
| 보류분 지급 | 🧺 겨울 선물을 보관함에 넣었어요. 작업대 장식 탭에서 꺼내 놓아요 |
| 마을 칸 | 마을 등불 · 다음 등불까지 마을 재료 {n}개 남았어요 · 마을 등불이 모두 켜졌어요 · 등불이 켜지면 보탠 분 모두 선물을 받아요 |
| 등불 토스트 | 🏮 등불 {n}개가 켜졌어요! 선물을 받았어요 |
| 불꽃 토스트 | 🎆 12월 31일, 마을 등불이 모두 켜졌어요 |
| 배너 | ❄️ 겨울 분수를 함께 지어요 / 광장에서 재료를 보태 내 분수를 지어요 |
| 화살표 목적지 | 광장으로 가요 |
| 첫 방문 | ❄️ 겨울 분수 / 재료를 보태면 내 분수가 올라가요 |
| 의뢰 줄 | ❄️ 내 분수 · 광장 분수에 재료 보태기 · 광장 분수에서 보태요 |
| 기부 결과 | {재료} {n}개를 보탰어요! · 이 재료는 다 모았어요! · 겨울 분수 기간이 아니에요 · 내 분수를 다 지었어요 |
| 광고 | 광고 보고 재료 채우기 · 광고 보고 한 번 더 받기 |
| 꾸미기 | 꼬마 분수 / 겨울 분수를 다 지은 선물 · 겨울 등불 / 마을 등불 선물. 밤에 빛나요 |

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`tests/winter-copy.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WINTER_COPY, winterToast } from '../js/plaza/winter-copy.js';
import { ARROW_LABEL, FIRST_VISIT } from '../js/guide/feature-rules.js';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const strings = (o) => (typeof o === 'string' ? [o] : Object.values(o).flatMap(strings));
const ALL = [...strings(WINTER_COPY), ARROW_LABEL.fountain, FIRST_VISIT.fountain.title, FIRST_VISIT.fountain.line,
  '광고 보고', '재료 채우기', '한 번 더 받기', '꼬마 분수', '겨울 분수를 다 지은 선물', '겨울 등불', '마을 등불 선물. 밤에 빛나요', '물고기'].filter(Boolean);

test('문구 규칙: 엠대시·놀다·화살표 이모지 없음', () => {
  for (const s of ALL) {
    assert.ok(!s.includes('—'), s);
    assert.ok(!/놀/.test(s), s);
    assert.ok(!/[⬅➡⬆⬇↗↘↙↖]/u.test(s), s);
  }
});

test('모든 겨울 문구에 영어가 있다', () => {
  for (const s of ALL.filter(x => /[가-힣]/.test(x))) assert.ok(!/[가-힣]/.test(t(s)), `영어 없음: ${s}`);
});

test('확정 문구 조합', () => {
  assert.equal(winterToast('ok', 'fish', 5), '🐟 물고기 5개를 보탰어요!');
  assert.equal(winterToast('???', 'fish', 0), '연결이 불안정해요. 잠시 뒤 다시 해 주세요 (재료는 그대로예요)');
  assert.equal(WINTER_COPY.stages.length, 5);
  assert.equal(ARROW_LABEL.fountain, '광장으로 가요');
  assert.deepEqual(FIRST_VISIT.fountain, { key: 'visitFountain', ico: '❄️', title: '겨울 분수', line: '재료를 보태면 내 분수가 올라가요' });
});
```

- [ ] **Step 3: 실패를 확인한다**

Run: `node --test tests/winter-copy.test.mjs`
Expected: FAIL (`Cannot find module .../winter-copy.js`)

- [ ] **Step 4: winter-copy.js를 쓴다**

```js
import { PLAZA_ITEMS } from '../data/plaza.js';
import { fill, PLAZA_COPY } from './copy.js';

export const WINTER_COPY = {
  prompt: '❄️ 내 분수에 보태기',
  title: '❄️ 내 분수 짓기',
  subtitle: '{0}단계 · {1}',
  stages: ['', '받침돌 놓기', '아랫단과 기둥', '윗단 올리기', '얼음 분수 완성'],
  myBar: '내 분수',
  yardNote: '다 지으면 내 마당에 꼬마 분수가 생겨요',
  doneNote: '내 분수를 다 지었어요. 시즌이 끝나도 광장에 남아요',
  closed: '겨울 분수 기간이 끝났어요. 내 분수는 그대로 남아요',
  guestLine: '로그인하면 꾸미기 선물도 받아요',
  complete: '❄️ 내 분수를 다 지었어요! 마당 분수를 받았어요',
  completeGuest: '❄️ 내 분수를 다 지었어요! 로그인하면 마당 분수를 받아요',
  stored: '🧺 겨울 선물을 보관함에 넣었어요. 작업대 장식 탭에서 꺼내 놓아요',
  village: {
    title: '마을 등불',
    next: '다음 등불까지 마을 재료 {0}개 남았어요',
    all: '마을 등불이 모두 켜졌어요',
    note: '등불이 켜지면 보탠 분 모두 선물을 받아요',
  },
  lampToast: '🏮 등불 {0}개가 켜졌어요! 선물을 받았어요',
  fireworks: '🎆 12월 31일, 마을 등불이 모두 켜졌어요',
  banner: { title: '❄️ 겨울 분수를 함께 지어요', line: '광장에서 재료를 보태 내 분수를 지어요' },
  card: { name: '겨울 분수', title: '❄️ 내 분수', desc: '광장 분수에 재료 보태기', how: '광장 분수에서 보태요' },
  toast: {
    ok: '{0} {1}개를 보탰어요!',
    need: '이 재료는 다 모았어요!',
    season: '겨울 분수 기간이 아니에요',
    full: '내 분수를 다 지었어요',
    cap: PLAZA_COPY.toast.cap,
  },
};

export function winterToast(key, item, n) {
  const it = PLAZA_ITEMS[item];
  return fill(WINTER_COPY.toast[key] || PLAZA_COPY.toast.offline, it ? `${it.ico} ${it.name}` : '', n);
}
```

- [ ] **Step 5: 화살표 문구와 첫 방문 한 줄을 더한다**

`js/guide/feature-rules.js:19-25` `ARROW_LABEL`에 `house` 다음 줄로 `fountain: '광장으로 가요',`. `FIRST_VISIT`(27-32줄)에 `pond` 다음 줄로:

```js
  fountain: Object.freeze({ key: 'visitFountain', ico: '❄️', title: '겨울 분수', line: '재료를 보태면 내 분수가 올라가요' }),
```

기존 `tests/feature-rules.test.mjs`가 두 목록을 통째로 잠그므로 같이 고친다. 63-69줄 기대 객체의 `house: '집 터로 가요',` 다음 줄에 `fountain: '광장으로 가요',`, 82줄을 `assert.deepEqual(Object.keys(FIRST_VISIT), ['weekly', 'concert', 'auction', 'pond', 'fountain']);`로.

- [ ] **Step 6: 영어를 넣는다**

`js/i18n-en.js` 수확제 광장 절(350줄~) 끝에 같은 들여쓰기로:

```js
  '물고기': 'Fish',
  '❄️ 내 분수에 보태기': '❄️ Add to my fountain',
  '❄️ 내 분수 짓기': '❄️ Build my fountain',
  '{0}단계 · {1}': 'Stage {0} · {1}',
  '받침돌 놓기': 'Lay the base stones',
  '아랫단과 기둥': 'Lower basin and pillar',
  '윗단 올리기': 'Raise the upper bowl',
  '얼음 분수 완성': 'Ice fountain finished',
  '내 분수': 'My fountain',
  '다 지으면 내 마당에 꼬마 분수가 생겨요': 'Finish it to get a little fountain for your yard',
  '내 분수를 다 지었어요. 시즌이 끝나도 광장에 남아요': 'Your fountain is finished. It stays in the plaza after the season',
  '겨울 분수 기간이 끝났어요. 내 분수는 그대로 남아요': 'The winter fountain season is over. Your fountain stays as it is',
  '로그인하면 꾸미기 선물도 받아요': 'Log in to get the decor gifts too',
  '❄️ 내 분수를 다 지었어요! 마당 분수를 받았어요': '❄️ Your fountain is finished! You got a yard fountain',
  '❄️ 내 분수를 다 지었어요! 로그인하면 마당 분수를 받아요': '❄️ Your fountain is finished! Log in to get the yard fountain',
  '🧺 겨울 선물을 보관함에 넣었어요. 작업대 장식 탭에서 꺼내 놓아요': '🧺 Winter gifts are in storage. Place them from the workbench decor tab',
  '마을 등불': 'Village lanterns',
  '다음 등불까지 마을 재료 {0}개 남았어요': '{0} more village materials until the next lanterns',
  '마을 등불이 모두 켜졌어요': 'All village lanterns are lit',
  '등불이 켜지면 보탠 분 모두 선물을 받아요': 'When lanterns light up, everyone who chipped in gets a gift',
  '🏮 등불 {0}개가 켜졌어요! 선물을 받았어요': '🏮 {0} lanterns are lit! You got a gift',
  '🎆 12월 31일, 마을 등불이 모두 켜졌어요': '🎆 December 31st, every village lantern is lit',
  '❄️ 겨울 분수를 함께 지어요': '❄️ Build winter fountains together',
  '광장에서 재료를 보태 내 분수를 지어요': 'Bring materials to the plaza and build your fountain',
  '겨울 분수': 'Winter fountain',
  '❄️ 내 분수': '❄️ My fountain',
  '광장 분수에 재료 보태기': 'Add materials to the plaza fountain',
  '광장 분수에서 보태요': 'Give at the plaza fountain',
  '{0} {1}개를 보탰어요!': 'Gave {1} {0}!',
  '이 재료는 다 모았어요!': 'This material is complete!',
  '겨울 분수 기간이 아니에요': "It's not the winter fountain season",
  '내 분수를 다 지었어요': 'Your fountain is finished',
  '광장으로 가요': 'Head to the plaza',
  '재료를 보태면 내 분수가 올라가요': 'Add materials and your fountain grows',
  '재료 채우기': 'and fill materials',
  '한 번 더 받기': 'and get it again',
  '꼬마 분수': 'Little fountain',
  '겨울 분수를 다 지은 선물': 'Gift for finishing the winter fountain',
  '겨울 등불': 'Winter lantern',
  '마을 등불 선물. 밤에 빛나요': 'Village lantern gift. Glows at night',
```

이미 같은 키가 있으면(`grep -n "'물고기':" js/i18n-en.js` 등으로 확인) 그 줄은 넣지 않는다. 객체 리터럴 중복 키는 뒤 값이 이기므로 기존 값을 덮지 않게 한다.

- [ ] **Step 7: 통과를 확인한다**

Run: `node --test tests/winter-copy.test.mjs tests/plaza-copy.test.mjs tests/feature-rules.test.mjs`
Expected: PASS

- [ ] **Step 8: 커밋**

```bash
git add js/plaza/winter-copy.js js/guide/feature-rules.js js/i18n-en.js tests/winter-copy.test.mjs tests/feature-rules.test.mjs
git commit -m "feat(plaza): winter fountain copy with English"
```

---

### Task 6: 광장 겨울 모습 + 충돌체 (사용자 게이트: 게임 화면 확인)

**Files:**
- Create: `js/plaza/winter-build.js`
- Modify: `js/plaza/build.js:26-66,90,97-103` (`opts` 전달, 호박 빼기)
- Modify: `js/plaza/solids.js:8,19-42` (`{ winter }`, `winterPropSolids`)
- Modify: `js/plaza/fountain.js:9-15,101,128-137`
- Test: `tests/winter-solids.test.mjs`

**Interfaces:**
- Consumes: `lampSpot`, `lampLit` (Task 4), `PLAZA_FOUNTAIN`, `WINTER_LAMPS`, `buildFountain(stage)` (js/plaza/fountain.js:98), `FOUNTAIN_LAST_STAGE`
- Produces:
  - `buildPlaza(stage, phase, { winter = false } = {})` (winter면 호박 더미 없음)
  - `plazaPropSolids(stage, phase, { winter = false } = {})`, `winterPropSolids() → [x, z, r][]`
  - `buildWinterPlaza(lit) → { group, dispose }`(눈 원판 + 등불 9개), `buildFireworks() → { group, update(dt), dispose }`, `yardFountainMesh() → THREE.Group`, `yardLampMesh() → THREE.Group`
  - `FOUNTAIN_BASIN_R = 1.45`, `FOUNTAIN_LANTERN_R = 1.716`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-solids.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plazaPropSolids, winterPropSolids, SCARECROW, PUMPKIN_PILE, FOUNTAIN_BASIN_R } from '../js/plaza/solids.js';
import { lampSpot } from '../js/plaza/winter-rules.js';
import { PLAZA, PLAZA_BOX, PLAZA_FOUNTAIN } from '../js/data/plaza.js';

const has = (list, x, z) => list.some(([sx, sz, r]) => Math.hypot(sx - x, sz - z) < r);
const w = (x, z) => [PLAZA.x + x, PLAZA.z + z];

test('겨울: 호박 더미는 빠지고 나머지 완공 기물·명판은 막힌다', () => {
  const s = winterPropSolids();
  assert.ok(!has(s, ...w(PUMPKIN_PILE.x, PUMPKIN_PILE.z)));
  assert.ok(has(s, ...w(SCARECROW.x, SCARECROW.z)));
  assert.ok(has(s, PLAZA_BOX.x, PLAZA_BOX.z));
  assert.ok(has(plazaPropSolids(4, 'after'), ...w(PUMPKIN_PILE.x, PUMPKIN_PILE.z)), '수확제 경로는 그대로');
});

test('겨울: 분수와 등불 9개가 막힌다', () => {
  const s = winterPropSolids();
  assert.ok(has(s, ...w(PLAZA_FOUNTAIN.x, PLAZA_FOUNTAIN.z)));
  for (let i = 0; i < 9; i++) { const p = lampSpot(i); assert.ok(has(s, ...w(p.x, p.z)), `등불 ${i}`); }
});

test('겨울: 명판과 분수 사이·광장 가운데로 걸어 들어갈 수 있다', () => {
  const s = winterPropSolids();
  assert.ok(!has(s, PLAZA.x, PLAZA.z + 2));
  assert.ok(!has(s, ...w(-0.4, 3.0)));
});

test('분수 충돌 원은 명판·벤치·나무와 겹치지 않는다', () => {
  const f = w(PLAZA_FOUNTAIN.x, PLAZA_FOUNTAIN.z);
  for (const [x, z, r] of [[PLAZA_BOX.x, PLAZA_BOX.z, 0.6], [...w(3.6, 0), 0.5], [...w(0, 0), 1.0]]) {
    assert.ok(Math.hypot(f[0] - x, f[1] - z) > FOUNTAIN_BASIN_R + r, `${x},${z}`);
  }
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-solids.test.mjs`
Expected: FAIL (`winterPropSolids` 없음)

- [ ] **Step 3: 충돌체를 쓴다**

`js/plaza/solids.js:8` import를 바꾸고 한 줄 더한다:

```js
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF, PLAZA_BUNTING_POSTS, PLAZA_FOUNTAIN, WINTER_LAMPS } from '../data/plaza.js';
import { lampSpot } from './winter-rules.js';
```

`js/plaza/solids.js:19`의 시그니처를 `export function plazaPropSolids(stage, phase, { winter = false } = {}) {`로, 38줄 `out.push(world(PUMPKIN_PILE.x, ...))`를 `if (!winter) out.push(world(PUMPKIN_PILE.x, PUMPKIN_PILE.z, PUMPKIN_PILE.r));`로 바꾼다. 파일 끝에:

```js
export const FOUNTAIN_BASIN_R = 1.45;
export const FOUNTAIN_LANTERN_R = 1.716;

export function winterPropSolids() {
  const lanterns = [0, 1, 2, 3].map(k => {
    const a = Math.PI / 4 + (k / 4) * Math.PI * 2;
    return world(PLAZA_FOUNTAIN.x + Math.cos(a) * FOUNTAIN_LANTERN_R, PLAZA_FOUNTAIN.z + Math.sin(a) * FOUNTAIN_LANTERN_R, 0.12);
  });
  const lamps = Array.from({ length: WINTER_LAMPS }, (_, i) => { const p = lampSpot(i); return world(p.x, p.z, 0.15); });
  return [...plazaPropSolids(4, 'after', { winter: true }), world(PLAZA_FOUNTAIN.x, PLAZA_FOUNTAIN.z, FOUNTAIN_BASIN_R), ...lanterns, ...lamps];
}
```

(1.716 = fountain.js:74 등불 반지름 1.32 × 크기 1.3. 1.45 = 아랫단 반지름 1.08 × 1.3을 조금 넘긴 값.)

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test tests/winter-solids.test.mjs tests/plaza-solids.test.mjs`
Expected: PASS

- [ ] **Step 5: build.js에 겨울 옵션을 단다**

`js/plaza/build.js`: `stage3(add)` → `stage3(add, opts = {})`, 51줄 호박 세 개 줄을 `if (!opts.winter) { ... }`로 감싼다. `stage4(add)` → `stage4(add, opts = {})`, 60줄 `stage3(add);` → `stage3(add, opts);`. 97줄 시그니처 `export function buildPlaza(stage, phase, opts = {}) {`, 103줄 `if (stage >= 1) { STAGES[stage](add, opts); props(add, stage, phase); }`. stage1·stage2는 두 번째 인자를 무시하므로 그대로 둔다.

- [ ] **Step 6: fountain.js 자리를 data로 옮기고 미리보기를 지운다**

`js/plaza/fountain.js:10`을 `import { mergeGeos, houseWindows, paintGeo, vtxMat } from '../game.js';`로(`scene` 제거), 11줄을 `import { PLAZA, PLAZA_FOUNTAIN } from '../data/plaza.js';`로, 15줄 `export const FOUNTAIN_LOCAL = ...`을 지우고, 101줄을 `group.position.set(PLAZA.x + PLAZA_FOUNTAIN.x, 0, PLAZA.z + PLAZA_FOUNTAIN.z);`로 바꾼다. 128-137줄(`window.__fountain` 미리보기 블록)을 지운다. 12줄 import의 `FOUNTAIN_LAMPS, FOUNTAIN_LAST_STAGE`는 계속 쓰인다.

- [ ] **Step 7: winter-build.js를 쓴다**

```js
import * as THREE from 'three';
import { mergeGeos, houseWindows, paintGeo, vtxMat } from '../game.js';
import { PLAZA, PLAZA_R, WINTER_LAMPS } from '../data/plaza.js';
import { lampSpot, lampLit } from './winter-rules.js';
import { buildFountain } from './fountain.js';
import { FOUNTAIN_LAST_STAGE } from './fountain-stages.js';

const PAL = { snow: 0xe6eef0, pole: 0x5a5148, off: 0x8f8a7d, cap: 0xf6faf9, ribbon: 0xc8453a, lit: 0xffe28a };
const SNOW_H = 0.1;
const YARD_SCALE = 0.55;
const FW_PERIOD = 2.4;
const BURSTS = [[-2.6, 3.6, -2.5, 0xffd36a], [2.8, 4.0, -3.2, 0x9fe3ff], [0.1, 4.6, -4.5, 0xffa3c4]];
const BUCKET_OF = (k) => (k === 'lit' ? 'lamp' : k === 'snow' ? 'ground' : 'solid');

function assemble(fillParts) {
  const buckets = new Map();
  const add = (k, geo) => {
    const b = BUCKET_OF(k), g = paintGeo(geo, PAL[k]);
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  fillParts(add);
  const group = new THREE.Group();
  const mats = [];
  for (const [b, geos] of buckets) {
    const mat = b === 'lamp'
      ? new THREE.MeshStandardMaterial({ color: PAL.lit, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 })
      : vtxMat();
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'solid'; m.receiveShadow = b !== 'lamp';
    group.add(m); mats.push(mat);
    if (b === 'lamp') houseWindows.push(mat);
  }
  return {
    group,
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const mat of mats) { const i = houseWindows.indexOf(mat); if (i >= 0) houseWindows.splice(i, 1); mat.dispose(); }
    },
  };
}

function lampGeos(add, lit, x, z) {
  add('pole', new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6).translate(x, 0.7, z));
  add(lit ? 'lit' : 'off', new THREE.IcosahedronGeometry(0.2, 0).translate(x, 1.5, z));
  add('cap', new THREE.SphereGeometry(0.15, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 1.66, z));
  if (lit) add('ribbon', new THREE.TorusGeometry(0.1, 0.03, 5, 10).rotateX(Math.PI / 2).translate(x, 1.22, z));
}

export function buildWinterPlaza(lit) {
  const out = assemble((add) => {
    add('snow', new THREE.CylinderGeometry(PLAZA_R + 0.05, PLAZA_R + 0.05, SNOW_H, 32).translate(0, SNOW_H / 2, 0));
    for (let i = 0; i < WINTER_LAMPS; i++) { const p = lampSpot(i); lampGeos(add, lampLit(i, lit), p.x, p.z); }
  });
  out.group.name = 'plazaWinter';
  out.group.position.set(PLAZA.x, 0, PLAZA.z);
  return out;
}

export function yardFountainMesh() {
  const f = buildFountain(FOUNTAIN_LAST_STAGE);
  f.group.position.set(0, 0, 0);
  f.group.scale.setScalar(YARD_SCALE);
  return f.group;
}

export function yardLampMesh() {
  return assemble((add) => lampGeos(add, true, 0, 0)).group;
}

const rand = (k, i, j) => { const v = Math.sin(k * 127.1 + i * 311.7 + j * 74.7) * 43758.5453; return v - Math.floor(v); };

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const x = c.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, '#fff'); g.addColorStop(0.4, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}

export function buildFireworks() {
  const group = new THREE.Group();
  group.name = 'plazaFireworks';
  group.position.set(PLAZA.x, 0, PLAZA.z);
  const tex = dotTexture();
  const bursts = BURSTS.map(([x, y, z, hex], k) => {
    const pts = Array.from({ length: 70 }, (_, i) => {
      const u = rand(k, i, 0) * 2 - 1, a = rand(k, i, 1) * Math.PI * 2, s = Math.sqrt(1 - u * u);
      return [s * Math.cos(a), u, s * Math.sin(a)];
    }).flat();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = new THREE.PointsMaterial({ size: 0.42, color: hex, map: tex, transparent: true, depthWrite: false, fog: false });
    const points = new THREE.Points(geo, mat);
    points.position.set(x, y, z);
    group.add(points);
    return { points, geo, mat, phase: k / BURSTS.length };
  });
  let clock = 0;
  return {
    group,
    update(dt) {
      clock += dt;
      for (const b of bursts) {
        const f = (clock / FW_PERIOD + b.phase) % 1;
        b.points.scale.setScalar(0.3 + f * 1.8);
        b.mat.opacity = 1 - f;
      }
    },
    dispose() { for (const b of bursts) { b.geo.dispose(); b.mat.dispose(); } tex.dispose(); },
  };
}
```

- [ ] **Step 8: 테스트 전체를 돌린다**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app` 1건 외 PASS

- [ ] **Step 9: 커밋**

```bash
git add js/plaza/winter-build.js js/plaza/build.js js/plaza/solids.js js/plaza/fountain.js tests/winter-solids.test.mjs
git commit -m "feat(plaza): winter plaza snow, village lanterns and fireworks meshes"
```

- [ ] **Step 10: 게임 화면 확인 (사용자 게이트, Task 8 Step 9 뒤에 한 번에 한다)**

화면 연결은 Task 8에서 끝난다. Task 8 Step 9의 캡처(PC 1280×800·모바일 390×844, 낮·밤, `?plaza=1..4`, `?plazaTotal=0|300|800|1500`, `?plazaFireworks=1`, 마당 꼬마 분수)를 시안 `sims/winter-fountain-v2/compare-mobile.png`·`compare-pc.png`와 나란히 사용자에게 보이고 "광장 바탕이 수확제 완공 모습(나무·벤치·허수아비·볏단)인 채로 눈 원판·분수·등불이 올라갑니다. 이대로 갈까요?"를 묻는다. 고칠 점이 나오면 이 Task로 돌아와 고친다.

---

### Task 7: 꾸미기 보상 2종 (꼬마 분수·겨울 등불)

**Files:**
- Modify: `js/data/catalog.js:261` 다음 줄
- Modify: `js/plaza/decor.js:1-15`(import), `js/plaza/decor.js:145-148`
- Modify: `js/game.js:6216` (충돌체 목록 두 곳에 `'winterlamp'`)
- Modify: `js/world/outdoor-overlap.js:2`
- Test: `tests/winter-decor.test.mjs`

**Interfaces:**
- Consumes: `yardFountainMesh`, `yardLampMesh` (Task 6)
- Produces: OUTDOOR 행 `winterfountain`(box 1.5×1.5), `winterlamp`(작은 원 0.22). `plazaDecorMesh('winterfountain'|'winterlamp')`가 메시를 돌려준다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-decor.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outdoorFootprint } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('꾸미기 2종: 작업대에선 숨기고 보관함으로만 꺼낸다', () => {
  const src = read('js/data/catalog.js');
  assert.match(src, /id: 'winterfountain', name: '꼬마 분수', ico: '⛲', cost: \{ coins: 9999 \}, desc: '겨울 분수를 다 지은 선물', hidden: true, box: \[1\.5, 1\.5\] \}/);
  assert.match(src, /id: 'winterlamp', +name: '겨울 등불', ico: '🏮', cost: \{ coins: 9999 \}, desc: '마을 등불 선물\. 밤에 빛나요', hidden: true \}/);
});

test('겨울 등불은 작은 기물로 막힌다, 꼬마 분수는 box 로', () => {
  const line = read('js/game.js').split('\n').find(l => l.includes("} else solid = ['fence'"));
  assert.equal((line.match(/'winterlamp'/g) || []).length, 2);
  assert.deepEqual(outdoorFootprint('winterlamp', 1, 2, 0), { x: 1, z: 2, r: 0.22 });
});

test('광장 장식 메시가 겨울 2종을 안다', () => {
  const src = read('js/plaza/decor.js');
  assert.ok(src.includes('winterfountain: yardFountainMesh'));
  assert.ok(src.includes('winterlamp: yardLampMesh'));
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-decor.test.mjs`
Expected: FAIL (catalog 정규식 불일치)

- [ ] **Step 3: 카탈로그 행을 넣는다**

`js/data/catalog.js:261`(`harvestscarecrow`) 다음 줄:

```js
  { id: 'winterfountain',   name: '꼬마 분수',      ico: '⛲', cost: { coins: 9999 }, desc: '겨울 분수를 다 지은 선물', hidden: true, box: [1.5, 1.5] },
  { id: 'winterlamp',       name: '겨울 등불',      ico: '🏮', cost: { coins: 9999 }, desc: '마을 등불 선물. 밤에 빛나요', hidden: true },
```

- [ ] **Step 4: 메시와 충돌체를 잇는다**

`js/plaza/decor.js` import 블록 끝에 `import { yardFountainMesh, yardLampMesh } from './winter-build.js';`, 145-148줄:

```js
const WINTER_MODELS = { winterfountain: yardFountainMesh, winterlamp: yardLampMesh };

export function plazaDecorMesh(id) {
  if (WINTER_MODELS[id]) return WINTER_MODELS[id]();
  const build = MODELS[id];
  return build ? assemble(build) : null;
}
```

`js/game.js:6216`: 앞 배열의 `'harvestscarecrow', ` 다음과, 뒤 작은 반지름 배열의 `'harvestscarecrow', ` 다음에 각각 `'winterlamp', `를 넣는다(줄에 `plaza` 글자는 생기지 않는다).

`js/world/outdoor-overlap.js:2` `SMALL`에 `'winterlamp'`를 더한다.

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test tests/winter-decor.test.mjs tests/plaza-solids.test.mjs tests/plaza-wiring.test.mjs`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add js/data/catalog.js js/plaza/decor.js js/game.js js/world/outdoor-overlap.js tests/winter-decor.test.mjs
git commit -m "feat(plaza): yard fountain and winter lantern decor rewards"
```

---

### Task 8: 겨울 런타임 + 기부 창 + 연결 + 트래킹

**Files:**
- Create: `js/plaza/winter.js`
- Modify: `js/plaza/index.js` (겨울이면 넘기기, `addStored` 이동)
- Modify: `js/plaza/ui.js:9-15,96-117,195-208` + CSS
- Modify: `js/plaza/net.js:6,10-11`, `js/supabase-client.js:721`
- Modify: `js/game.js:83,3728,3730` (`initPlaza(GE)`), `js/spaces/doors.js:427-429`
- Modify: `tests/plaza-wiring.test.mjs:17`
- Modify: `docs/analysis/event-taxonomy.csv`, `docs/analysis/GA4_GUIDE.md:116` 다음
- Test: `tests/winter-wiring.test.mjs`

**Interfaces:**
- Consumes: Task 2~7 전부, `progress` (js/plaza/net.js:12), `interpretDonate` (js/plaza/donate.js:8), `modalQueue` (js/guide/modal-queue.js), `refreshQuestPanel` (js/spaces/npc.js:878)
- Produces (`js/plaza/winter.js`):
  - `initWinter(def, ge, debugStage)`, `updateWinter(dt, inVillage)`, `refreshWinter(force?) → Promise`, `winterSpot(pos) → 'fountain'|null`, `winterSpotNow()`, `fountainSpotNow() → boolean`, `openWinter()`, `winterPhase() → 'before'|'active'|'after'`, `addStored(id)`
  - 창 ctx `{ kind: 'fountain', stage, rows, todayLeft, inv, busy, guest, phase, total, lamps, adShort: () => Node|null, adDouble: (k) => Node|null, onDonate(item, qty), onClose }`
  - `js/plaza/net.js` `give(season, stage, item, qty)`, `js/supabase-client.js` `plazaGive`
  - 이벤트 `plaza_fountain_stage { season, stage, guest }`, `plaza_lamp_stage { season, stage, via: 'seen'|'reward' }`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-wiring.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('index.js 는 겨울이면 모든 진입점을 winter.js 로 넘긴다', () => {
  const src = read('js/plaza/index.js');
  for (const needle of ["const WINTER = DEF.kind === 'winter';", 'if (WINTER) { initWinter(DEF, ge, DEBUG_STAGE); return; }',
    'if (WINTER) return refreshWinter(force);', 'if (WINTER) { updateWinter(dt, inVillage); return; }',
    'if (WINTER) return winterSpot(pos);', 'if (WINTER) { openWinter(); return; }', 'if (WINTER) return winterPhase();',
    "export { fountainSpotNow } from './winter.js';"]) assert.ok(src.includes(needle), needle);
});

test('game.js 연결: initPlaza(GE) 는 GE 뒤, plaza 줄 수는 그대로 14 이하', () => {
  const game = read('js/game.js');
  assert.ok(game.indexOf('initPlaza(GE)') > game.indexOf('const GE = {'));
  assert.ok(!game.includes('initPlaza();'));
  assert.ok(game.split('\n').filter(l => /plaza/i.test(l)).length <= 14);
  assert.ok(read('js/spaces/doors.js').includes("plazaHere === 'fountain'"));
});

test('plaza_give RPC 래퍼와 net.give', () => {
  assert.ok(read('js/supabase-client.js').includes("export function plazaGive(season, stage, item, qty) { return plazaCall('plaza_give', { p_season: season, p_stage: stage, p_item: item, p_qty: qty }); }"));
  assert.ok(read('js/plaza/net.js').includes('export const give = plazaGive;'));
});

test('겨울 이벤트 2종이 코드·분류표·GA4_GUIDE 에 있다', () => {
  const src = read('js/plaza/winter.js'), csv = read('docs/analysis/event-taxonomy.csv'), doc = read('docs/analysis/GA4_GUIDE.md');
  for (const e of ['plaza_fountain_stage', 'plaza_lamp_stage']) {
    assert.ok(src.includes(`trackEvent('${e}'`), e);
    assert.ok(csv.split('\n').some(l => l.startsWith(`${e},`)), e);
    assert.ok(doc.includes(`\`${e}\``), e);
  }
});

test('겨울 경로는 단풍잎·올빼미·환전을 부르지 않는다', () => {
  const src = read('js/plaza/winter.js');
  for (const bad of ['leaf', 'updateInvite', 'convertPlan', 'stageSeenPlan']) assert.ok(!src.includes(bad), bad);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-wiring.test.mjs`
Expected: FAIL

- [ ] **Step 3: RPC 래퍼**

`js/supabase-client.js:721` 다음 줄:

```js
export function plazaGive(season, stage, item, qty) { return plazaCall('plaza_give', { p_season: season, p_stage: stage, p_item: item, p_qty: qty }); }
```

`js/plaza/net.js:6`을 `import { plazaDonate, plazaMine, plazaGive } from '../supabase-client.js';`로, 11줄 다음에 `export const give = plazaGive;`.

- [ ] **Step 4: winter.js를 쓴다**

```js
import { gameState, player, dist2D, ui, scene, solidCircle, removeSolid, obstacles, giveReward, refreshInventoryUI, requestSave, mode, nightLevel } from '../game.js';
import { trackEvent } from '../analytics.js';
import { state as authState } from '../supabase-client.js';
import { modalQueue } from '../guide/modal-queue.js';
import { refreshQuestPanel } from '../spaces/npc.js';
import { PLAZA, PLAZA_R, PLAZA_FOUNTAIN, PLAZA_VIEW_R } from '../data/plaza.js';
import { gateOpens, seasonPhase, nearPollDue } from './rules.js';
import { datePhase } from './seasons.js';
import { progress, give } from './net.js';
import { interpretDonate } from './donate.js';
import { buildPlaza } from './build.js';
import { buildPath } from './path.js';
import { buildFountain } from './fountain.js';
import { buildWinterPlaza, buildFireworks } from './winter-build.js';
import { winterPropSolids, plazaPathSolids } from './solids.js';
import { winterDefault, myStage, stageRows, todayLeft, recordGive, recordCap, kstDay, villageStage, litLamps,
         lampClaims, lampGrant, claimLamp, decorPlan, settleOwed, fireworksDue, FOUNTAIN_DONE } from './winter-rules.js';
import { WINTER_COPY, winterToast } from './winter-copy.js';
import { fill, stagePct } from './copy.js';
import { openPlazaModal, renderPlazaModal } from './ui.js';

const SPOT_R = 2.8;
const VIEW_R = 12;
const FOUNTAIN_AT = { x: PLAZA.x + PLAZA_FOUNTAIN.x, z: PLAZA.z + PLAZA_FOUNTAIN.z };
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const QS = new URLSearchParams(location.search);
const DEBUG_TOTAL = LOCAL && /^\d{1,5}$/.test(QS.get('plazaTotal') || '') ? Number(QS.get('plazaTotal')) : null;
const DEBUG_FIREWORKS = LOCAL && QS.get('plazaFireworks') === '1';

let def = null, debugStage = null, saveRestored = false, lastProg = null, spot = null, busy = false, open = false;
let built = [], solids = [], obstacle = null, shown = '', fireworks = null, fireworksToasted = false;
let viewCheck = 0, lastNearPollAt = -Infinity;
const viewed = new Set();

export function addStored(id) {
  const stored = gameState.outdoorStored || {};
  gameState.outdoorStored = { ...stored, [id]: (stored[id] || 0) + 1 };
}

const guest = () => authState.isGuest !== false;
const st = () => gameState.plaza.winter?.[def.id] || winterDefault();
const economy = () => debugStage === null && DEBUG_TOTAL === null;
const total = () => DEBUG_TOTAL ?? (Number.isInteger(lastProg?.total) ? lastProg.total : st().total);
const stageNow = () => (debugStage === null ? myStage(st()) : Math.max(1, debugStage));
const dayNow = () => kstDay(Date.now());

function commit(next) {
  gameState.plaza = { ...gameState.plaza, winter: { ...gameState.plaza.winter, [def.id]: next } };
  requestSave();
}

export const winterPhase = () => (lastProg?.starts_at ? seasonPhase(lastProg, Date.now()) : datePhase(def, Date.now()));

function clear() {
  for (const b of built) { scene.remove(b.group); b.dispose(); }
  built = [];
  for (const c of solids) removeSolid(c);
  solids = [];
  if (obstacle) { const i = obstacles.indexOf(obstacle); if (i >= 0) obstacles.splice(i, 1); obstacle = null; }
}

function rebuild() {
  const key = `${stageNow()}:${litLamps(total())}`;
  if (key === shown) return;
  shown = key;
  clear();
  built = [buildPlaza(4, 'after', { winter: true }), buildPath(4, 'after'), buildWinterPlaza(litLamps(total())), buildFountain(stageNow())];
  for (const b of built) scene.add(b.group);
  for (const [x, z, r] of [...winterPropSolids(), ...plazaPathSolids(4, 'after')]) solids.push(solidCircle(x, z, r));
  obstacle = { x: PLAZA.x, z: PLAZA.z, r: PLAZA_R };
  obstacles.push(obstacle);
}

function tickFireworks(dt) {
  const on = DEBUG_FIREWORKS || (fireworksDue(def, Date.now(), total()) && nightLevel > 0.3);
  if (on && !fireworks) {
    fireworks = buildFireworks();
    scene.add(fireworks.group);
    if (!fireworksToasted) { fireworksToasted = true; ui.toast?.(WINTER_COPY.fireworks, 4200); }
  }
  if (!on && fireworks) { scene.remove(fireworks.group); fireworks.dispose(); fireworks = null; }
  fireworks?.update(dt);
}

function settle() {
  if (!saveRestored || !economy()) return;
  const r = settleOwed(st(), guest());
  if (!r.grant.length) return;
  for (const id of r.grant) addStored(id);
  commit(r.st);
  ui.toast?.(WINTER_COPY.stored, 3600);
}

function grantLamp(s, k) {
  const g = lampGrant(k);
  if (g.give) giveReward(g.give, 'plaza_lamp', `lamp${k}`);
  const d = g.decor ? decorPlan(s, g.decor, guest()) : { st: s, grant: false };
  if (d.grant) addStored(g.decor);
  trackEvent('plaza_lamp_stage', { season: def.id, stage: k, via: 'reward' });
  modalQueue.request({ kind: 'result', key: `lamp-${def.id}-${k}`, show: () => ui.toast?.(fill(WINTER_COPY.lampToast, k * 3), 4200) });
  return claimLamp(d.st, k);
}

function claimLamps() {
  if (!saveRestored || !economy()) return;
  const t = total(), before = st(), vs = villageStage(t);
  const seen = Array.from({ length: Math.max(0, vs - before.seenLamp) }, (_, i) => before.seenLamp + 1 + i);
  for (const k of seen) trackEvent('plaza_lamp_stage', { season: def.id, stage: k, via: 'seen' });
  const claims = lampClaims(before, t);
  const moved = villageStage(before.total) !== vs;
  if (!seen.length && !claims.length && !moved) return;
  commit(claims.reduce(grantLamp, { ...before, seenLamp: Math.max(before.seenLamp, vs), total: t }));
}

function afterGive(beforeStage) {
  const s = st(), now = myStage(s);
  if (now <= beforeStage) return;
  trackEvent('plaza_fountain_stage', { season: def.id, stage: now, guest: guest() ? 1 : 0 });
  if (now < FOUNTAIN_DONE) { commit({ ...s, seenStage: now }); return; }
  const d = decorPlan({ ...s, seenStage: now }, 'winterfountain', guest());
  if (d.grant) addStored('winterfountain');
  commit(d.st);
  ui.toast?.(d.grant ? WINTER_COPY.complete : WINTER_COPY.completeGuest, 4200);
}

export async function refreshWinter(force = false) {
  const p = await progress.get(def.id, { force });
  if (p) lastProg = p;
  settle();
  claimLamps();
  rebuild();
}

async function onGive(item, qty) {
  if (!economy() || busy || qty <= 0 || winterPhase() !== 'active') return;
  const stage = myStage(st());
  busy = true;
  render();
  try {
    const raw = await give(def.id, stage, item, qty);
    const r = interpretDonate(qty, raw);
    trackEvent(r.event, { season: def.id, item, ...r.params });
    if (r.spend > 0) {
      gameState.inventory[item] = Math.max(0, (gameState.inventory[item] || 0) - r.spend);
      commit(recordGive(st(), dayNow(), { stage, item, accepted: r.spend, today_left: raw.today_left, village_before: raw.village_before }));
      refreshInventoryUI();
      ui.toast?.(winterToast(r.toastKey, item, r.spend));
      afterGive(stage);
      await refreshWinter(true);
    } else {
      if (r.params.reason === 'cap') commit(recordCap(st(), dayNow()));
      ui.toast?.(winterToast(r.toastKey, item, 0));
    }
  } finally {
    busy = false;
    if (open) render();
    refreshQuestPanel();
  }
}

const ctx = () => ({
  kind: 'fountain', stage: stageNow(), rows: stageRows(st()), todayLeft: todayLeft(st(), dayNow()),
  inv: gameState.inventory, busy, guest: guest(), phase: winterPhase(), total: total(), lamps: st().lamps,
  adShort: () => null, adDouble: () => null,
  onDonate: onGive, onClose: () => { open = false; },
});

function render() { renderPlazaModal(ctx()); }

export function openWinter() {
  if (spot !== 'fountain') return;
  open = true;
  openPlazaModal('fountain', ctx());
  trackEvent('plaza_modal_open', { season: def.id, stage: stageNow(), today_left: todayLeft(st(), dayNow()), ...(guest() ? { guest: true } : {}) });
}

function trackView() {
  const stage = stageNow();
  if (viewed.has(stage) || dist2D(PLAZA, player.position) > VIEW_R) return;
  viewed.add(stage);
  trackEvent('plaza_view', { season: def.id, stage, pct: stage >= FOUNTAIN_DONE ? 100 : stagePct(stageRows(st())), from: 'other' });
}

export function winterSpot(pos) {
  spot = dist2D(FOUNTAIN_AT, pos) < SPOT_R ? 'fountain' : null;
  return spot;
}

export const winterSpotNow = () => spot;
export const fountainSpotNow = () => spot === 'fountain';

export function initWinter(seasonDef, ge, debug) {
  def = seasonDef;
  debugStage = debug;
  rebuild();
  refreshWinter();
}

export function updateWinter(dt, inVillage) {
  if (gateOpens(saveRestored, mode)) { saveRestored = true; refreshWinter(); }
  tickFireworks(dt);
  if (!inVillage) { spot = null; return; }
  viewCheck -= dt;
  if (viewCheck > 0) return;
  viewCheck = 1;
  trackView();
  if (dist2D(PLAZA, player.position) < PLAZA_VIEW_R && nearPollDue(lastProg, Date.now(), lastNearPollAt)) {
    lastNearPollAt = Date.now();
    refreshWinter();
  }
}
```

`ge`는 Task 9에서 쓴다. `adShort`·`adDouble`은 Task 10에서 광고 함수로 바뀐다(지금은 버튼을 그리지 않는 함수).

- [ ] **Step 5: index.js가 겨울을 넘기게 한다**

`js/plaza/index.js`:

1. import 블록 끝에:

```js
import { initWinter, updateWinter, refreshWinter, winterSpot, winterSpotNow, openWinter, winterPhase, addStored } from './winter.js';
```

2. 21-22줄 export 옆에 `export { fountainSpotNow } from './winter.js';`
3. `export const SEASON = DEF.id;` 다음 줄에 `const WINTER = DEF.kind === 'winter';`
4. `phaseNow()` 첫 줄에 `if (WINTER) return winterPhase();`
5. `refresh(force)` 첫 줄에 `if (WINTER) return refreshWinter(force);`
6. `export function initPlaza() {` → `export function initPlaza(ge) {`, 첫 줄에 `if (WINTER) { initWinter(DEF, ge, DEBUG_STAGE); return; }`
7. `updatePlaza(dt, inVillage)` 첫 줄에 `if (WINTER) { updateWinter(dt, inVillage); return; }`
8. `plazaSpot(pos)` 첫 줄에 `if (WINTER) return winterSpot(pos);`
9. `export function plazaSpotNow() { return WINTER ? winterSpotNow() : spotNow; }`
10. `openPlaza()` 첫 줄에 `if (WINTER) { openWinter(); return; }`
11. 162-166줄 `function addStored` 정의를 지운다(위 import로 대체, `onBuy`·`onClaim`이 계속 쓴다).
12. 마지막 줄 `export const plazaMapVisible = () => WINTER || shownStage > 0;`

- [ ] **Step 6: 기부 창**

`js/plaza/ui.js` import에 더한다:

```js
import { WINTER_LAMPS } from '../data/plaza.js';
import { winterButtons, litLamps, nextLampLeft, FOUNTAIN_DONE } from './winter-rules.js';
import { WINTER_COPY } from './winter-copy.js';
```

`itemRow`(110-117줄)가 버튼 묶음을 받게 바꾼다:

```js
function itemRow(ctx, row, it, btns = buttons(ctx, row)) {
  const r = el('div', rowClass('pz-c', row));
  const info = el('div', 'pz-info'), top = el('div', 'pz-top');
  top.append(el('span', 'pz-name', it.name), el('span', 'pz-num', `${row.have}/${row.need} · ${haveText(ctx, row.item)}`));
  info.append(top, bar(row.have, row.need));
  r.append(el('div', 'pz-ico', it.ico), info, btns);
  return r;
}
```

`renderPlaque` 다음(193줄 뒤)에:

```js
function winterBtns(ctx, row) {
  const wrap = el('div', 'pz-btns');
  for (const d of winterButtons(ctx.inv, ctx.todayLeft, row)) {
    const b = el('button', d.cls, d.label);
    b.disabled = !!ctx.busy || !d.on;
    b.onclick = () => ctx.onDonate?.(row.item, d.qty);
    wrap.appendChild(b);
  }
  return wrap;
}

function fountainBar(stage) {
  const s = el('div', 'pz-stage'), top = el('div', 'pz-top');
  top.append(el('span', 'pz-num', WINTER_COPY.myBar), el('span', 'pz-pct', `${stage}/${FOUNTAIN_DONE}`));
  s.append(top, bar(stage, FOUNTAIN_DONE));
  return s;
}

function lampsBlock(ctx) {
  const lit = litLamps(ctx.total), left = nextLampLeft(ctx.total);
  const v = el('div', 'pz-village'), top = el('div', 'pz-top');
  top.append(el('span', 'pz-name', WINTER_COPY.village.title), el('span', 'pz-num', `${lit}/${WINTER_LAMPS}`));
  const row = el('div', 'pz-lamps');
  for (let i = 0; i < WINTER_LAMPS; i++) row.appendChild(el('span', i < lit ? '' : 'off', '🏮'));
  v.append(top, bar(lit, WINTER_LAMPS), row,
    el('div', 'pz-desc', left > 0 ? fill(WINTER_COPY.village.next, left) : WINTER_COPY.village.all),
    el('div', 'pz-desc', WINTER_COPY.village.note));
  for (const k of ctx.lamps || []) { const p = ctx.adDouble?.(k); if (p) v.appendChild(p); }
  return v;
}

function renderFountain(ctx) {
  card.append(el('p', 'pz-sub', fill(WINTER_COPY.subtitle, ctx.stage, WINTER_COPY.stages[ctx.stage] || '')), fountainBar(ctx.stage));
  if (ctx.phase !== 'active') card.appendChild(el('div', 'pz-note', ctx.phase === 'after' ? WINTER_COPY.closed : WINTER_COPY.toast.season));
  else if (ctx.stage >= FOUNTAIN_DONE) card.appendChild(el('div', 'pz-note', WINTER_COPY.doneNote));
  else {
    const me = el('div', 'pz-me');
    me.appendChild(el('span', 'pz-chip warm', fill(PLAZA_COPY.todayLeft, ctx.todayLeft)));
    const list = el('div', 'pz-list');
    for (const r of ctx.rows) { const it = PLAZA_ITEMS[r.item]; if (it) list.appendChild(itemRow(ctx, r, it, winterBtns(ctx, r))); }
    card.append(me, list);
    const ad = ctx.adShort?.();
    if (ad) card.appendChild(ad);
    card.appendChild(el('div', 'pz-desc', WINTER_COPY.yardNote));
  }
  if (ctx.guest) card.appendChild(el('div', 'pz-desc', WINTER_COPY.guestLine));
  card.appendChild(lampsBlock(ctx));
}
```

195줄 `TITLE`에 `fountain: () => WINTER_COPY.title`를, `renderPlazaModal`의 분기에 `else if (ctx.kind === 'fountain') renderFountain(ctx);`를 더한다. `CSS` 끝(`@media` 앞)에:

```css
.pz-village { flex: 0 0 auto; display: flex; flex-direction: column; gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #d7dee5; }
.pz-village .pz-top { display: flex; justify-content: space-between; align-items: baseline; font-weight: 800; }
.pz-lamps { letter-spacing: 1px; }
.pz-lamps .off { opacity: .3; }
```

- [ ] **Step 7: game.js·doors.js 연결**

`js/game.js:83` import 목록 끝에 `, fountainSpotNow`를 더한다(같은 줄). 3728줄 `initPlaza();                // 🌾 수확제 광장(시즌 터·돌길)` 줄을 지우고, 3730줄 `const GE = { ... };` 바로 다음 줄에 `initPlaza(GE);`를 넣는다. plaza 줄 수는 14 그대로다.

`js/spaces/doors.js:427`(`else if (plazaHere === 'box') ...`) 바로 앞, 같은 `else if` 사슬 안에 한 줄:

```js
  else if (plazaHere === 'fountain') prompt = '❄️ 내 분수에 보태기';
```

`tests/plaza-wiring.test.mjs:17` 바늘 목록의 `'initPlaza()'`를 `'initPlaza(GE)'`로 바꾼다.

- [ ] **Step 8: 이벤트 분류표와 GA4 안내**

`docs/analysis/event-taxonomy.csv`의 `plaza_donate_fail` 줄 다음에(정렬 유지, 335줄 `plaza_view` 앞):

```csv
plaza_fountain_stage,content,harvest_plaza,2,N,not_fired,0,0,,,season|stage|guest,js/plaza/winter.js:LINE_F,"겨울 분수 시즌에 내 분수가 다음 단계에 올라갔을 때 (stage=도달 단계 2~4, guest=게스트면 1)",
plaza_lamp_stage,content,harvest_plaza,2,N,not_fired,0,0,,,season|stage|via,js/plaza/winter.js:LINE_L,"마을 등불 단계를 처음 보거나 그 단계 선물을 받았을 때 (stage=1~3, via=seen·reward)",
```

`LINE_F`·`LINE_L` 자리에는 `grep -n "trackEvent('plaza_fountain_stage'" js/plaza/winter.js`와 `grep -n "trackEvent('plaza_lamp_stage', { season: def.id, stage: k, via: 'reward'" js/plaza/winter.js`가 출력한 줄 번호를 숫자로 적는다. 행은 이름순으로 끼운다(`plaza_fountain_stage`는 `plaza_donate_fail` 뒤, `plaza_lamp_stage`는 `plaza_invite_deliver` 뒤 `plaza_leaf_convert` 앞).

`docs/analysis/GA4_GUIDE.md:116`(`plaza_stage_seen` 행) 다음에:

```markdown
| `plaza_fountain_stage` | ❄️ 내 분수가 다음 단계에 오름(겨울 시즌) | `season`, `stage`(2~4, 4=완공), `guest`(1/0) |
| `plaza_lamp_stage` | 🏮 마을 등불 단계를 처음 봄·그 단계 선물 받음 | `season`, `stage`(1~3), `via`(seen/reward) |
```

- [ ] **Step 9: 통과를 확인한다**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app` 1건 외 PASS (event-taxonomy·plaza-tracking·plaza-wiring 포함)

- [ ] **Step 10: 무음 브라우저 확인 (Task 6 게이트 캡처 포함)**

"무음 브라우저 확인" 절차로 서버를 띄우고 무음 스크립트를 심은 뒤 아래를 캡처한다(`page.setViewportSize`로 PC 1280×800, 모바일 390×844):

1. `?plazaSeason=winter-2026&plaza=1&plazaTotal=0`, `&plaza=2&plazaTotal=300`, `&plaza=3&plazaTotal=800`, `&plaza=4&plazaTotal=1500` 낮. 광장으로 순간 이동 후 캡처. 확인: 수확 나무·벤치·허수아비·볏단·명판이 있고 호박이 없다, 눈 원판이 돌바닥을 덮는다, 분수가 단계대로, 켜진 등불이 흩어져 있다.
2. 같은 URL에 밤: `await page.evaluate(async () => { const g = await import('/js/game.js'); return g.nightLevel; })`로 확인하며 게임 시계를 밤으로 돌리는 기존 디버그가 없으면 `?plazaFireworks=1`과 함께 실제 밤 시간대(KST 19시 이후)에 확인한다. 확인: 켜진 등불·분수 등불 4개가 빛난다, 불꽃이 광장 위에 뜬다.
3. `?plazaSeason=winter-2026&plaza=4` 상태에서 콘솔 `const g = await import('/js/game.js'); g.gameState.outdoorStored = { ...g.gameState.outdoorStored, winterfountain: 1, winterlamp: 1 };` 후 작업대 장식 탭에서 마당에 놓고 캡처. 확인: 꼬마 분수 0.55배, 집 모퉁이 옆에 놓인다, 겨울 등불이 밤에 빛난다, 캐릭터가 통과하지 못한다.
4. 기부 흐름(가로챈 서버): 디버그 인자 없이 `?plazaSeason=winter-2026`으로 열기 전에 Playwright로 두 요청을 가로챈다:

```js
async (page) => {
  let total = 280;
  await page.route('**/api/plaza?season=winter-2026', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({
    season: 'winter-2026', starts_at: '2026-11-01T00:00:00+09:00', ends_at: '2027-01-01T00:00:00+09:00',
    started: true, active: true, completed: false, stage: 1, items: [], donors: 3, names: [], total, per_user: true }) }));
  await page.route('**/rest/v1/rpc/plaza_give', async r => {
    const a = JSON.parse(r.request().postData());
    const before = total; total += a.p_qty;
    await r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, accepted: a.p_qty, today_left: 30 - a.p_qty,
      my_total: a.p_qty, stage: a.p_stage, item_have: a.p_qty, item_need: 20, village_before: before }) });
  });
  await page.goto('http://localhost:8031/?plazaSeason=winter-2026');
}
```

순간 이동을 분수 앞(24.6, 0, 1.0)으로 하고, 콘솔에서 가방에 목재·돌을 넣은 뒤(`g.gameState.inventory.wood = 40; g.gameState.inventory.stone = 40;`) 분수 프롬프트로 창을 연다. 확인: 창 제목·부제·내 분수 막대·재료 두 줄·+1/+5/N개 보태기·마을 등불 칸, 모바일 폭에서 줄바꿈 깨짐 없음. "+5"를 누르면 토스트 "🪵 목재 5개를 보탰어요!"와 가방 차감, 마을 누적이 300을 넘는 순간 "🏮 등불 3개가 켜졌어요! 선물을 받았어요"와 코인 +30, 목재·돌을 다 채우면 분수가 2단계로 다시 지어진다. `read_console_messages`에 오류가 없다.

캡처는 scratchpad에 저장하고(저장소에 커밋하지 않는다) Task 6 Step 10 게이트에 쓴다.

- [ ] **Step 11: 커밋**

```bash
git add js/plaza/winter.js js/plaza/index.js js/plaza/ui.js js/plaza/net.js js/supabase-client.js js/game.js js/spaces/doors.js tests/plaza-wiring.test.mjs tests/winter-wiring.test.mjs docs/analysis/event-taxonomy.csv docs/analysis/GA4_GUIDE.md
git commit -m "feat(plaza): winter fountain runtime, give panel and tracking"
```

---

### Task 9: 안내 (배너·금색 화살표·첫 방문·의뢰 줄)

**Files:**
- Create: `js/plaza/winter-guide.js`, `js/plaza/winter-card.js`
- Modify: `js/guide/arbiter.js:1-3` (`fountain: 25`)
- Modify: `js/weekly/bridge.js:32` (`export function makeGuideEnv`)
- Modify: `js/plaza/winter.js` (안내 틱)
- Modify: `js/game.js:1678` (`FIRST_VISIT_AT.fountain`)
- Modify: `js/spaces/npc.js:1-38`(import), `js/spaces/npc.js:878`(views)
- Test: `tests/winter-guide.test.mjs`

**Interfaces:**
- Consumes: `guideArbiter` (js/guide/arbiter.js:34), `featureGuidesOpen` (js/guide/feature-rules.js:11), `makeGuideEnv(g)`가 돌려주는 `{ uiBusy, cine, cameraFree, makeGuide(name, spot, reach) }`, `YARD_MAX_TRIES = 2`, `YARD_STALL_SEC = 600` (js/pond/yard-steps.js)
- Produces:
  - `FOUNTAIN_BANNER_MAX = 2`, `bannerDue({ phase, open, reached, busy, tries }) → boolean`, `arrowWanted({ phase, open, reached, inVillage, busy, other }) → boolean`
  - `fountainCard(plaza, nowMs, open, override?) → quest view | null`
  - `winterGuideActive() → boolean`(winter.js), 중재 등록 이름 `'fountain'`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-guide.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bannerDue, arrowWanted, FOUNTAIN_BANNER_MAX } from '../js/plaza/winter-guide.js';
import { fountainCard } from '../js/plaza/winter-card.js';
import { GUIDE_PRIORITY, createArbiter } from '../js/guide/arbiter.js';
import { winterDefault } from '../js/plaza/winter-rules.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const B = { phase: 'active', open: true, reached: false, busy: false, tries: 0 };
const A = { phase: 'active', open: true, reached: false, inVillage: true, busy: false, other: false };

test('bannerDue: 시즌 중·집 완성 뒤·아직 안 와 봤고 2번까지', () => {
  assert.equal(FOUNTAIN_BANNER_MAX, 2);
  assert.equal(bannerDue(B), true);
  assert.equal(bannerDue({ ...B, tries: 2 }), false);
  assert.equal(bannerDue({ ...B, open: false }), false);
  assert.equal(bannerDue({ ...B, reached: true }), false);
  assert.equal(bannerDue({ ...B, busy: true }), false);
  assert.equal(bannerDue({ ...B, phase: 'after' }), false);
});

test('arrowWanted: 다른 안내가 앞서면 비킨다', () => {
  assert.equal(arrowWanted(A), true);
  assert.equal(arrowWanted({ ...A, other: true }), false);
  assert.equal(arrowWanted({ ...A, inVillage: false }), false);
  assert.equal(arrowWanted({ ...A, reached: true }), false);
});

test('중재: fountain 은 이야기 목표보다 낮다', () => {
  assert.ok(GUIDE_PRIORITY.fountain < GUIDE_PRIORITY.goal);
  const arb = createArbiter();
  arb.register({ name: 'goal', active: () => true });
  arb.register({ name: 'fountain', active: () => false });
  assert.equal(arb.mayShow('fountain'), false);
});

test('fountainCard: 시즌 중·안내가 열린 사람에게 "❄️ 내 분수 n/4", 다 지으면 사라진다', () => {
  const now = Date.parse('2026-12-20T12:00:00+09:00');
  const plaza = { winter: { 'winter-2026': { ...winterDefault(), given: { '1:wood': 20, '1:stone': 15 } } } };
  const c = fountainCard(plaza, now, true, null);
  assert.deepEqual([c.title, c.progress, c.target], ['❄️ 내 분수', 2, 4]);
  assert.equal(fountainCard(plaza, now, false, null), null);
  assert.equal(fountainCard(plaza, Date.parse('2026-12-10T12:00:00+09:00'), true, null), null);
  const done = { winter: { 'winter-2026': { ...winterDefault(), given: { '1:wood': 20, '1:stone': 15, '2:stone': 25, '2:coal': 10, '3:fish': 10, '3:forage': 15 } } } };
  assert.equal(fountainCard(done, now, true, null), null);
  assert.equal(fountainCard({}, Date.parse('2026-12-10T12:00:00+09:00'), true, 'wtest-1').progress, 1);
});

test('연결: 중재 등록·첫 방문·의뢰 패널', () => {
  assert.ok(read('js/plaza/winter.js').includes("guideArbiter.register({ name: 'fountain', active: winterGuideActive })"));
  assert.ok(read('js/game.js').includes('fountain: () => fountainSpotNow()'));
  assert.ok(read('js/spaces/npc.js').includes('fountainCard(gameState.plaza, Date.now(), featureGuidesOpen(gameState))'));
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-guide.test.mjs`
Expected: FAIL (`Cannot find module .../winter-guide.js`)

- [ ] **Step 3: 순수 판정 두 파일**

`js/plaza/winter-guide.js`:

```js
import { YARD_MAX_TRIES } from '../pond/yard-steps.js';

export const FOUNTAIN_BANNER_MAX = YARD_MAX_TRIES;

export const bannerDue = ({ phase, open, reached, busy, tries }) =>
  phase === 'active' && !!open && !reached && !busy && (tries | 0) < FOUNTAIN_BANNER_MAX;

export const arrowWanted = ({ phase, open, reached, inVillage, busy, other }) =>
  phase === 'active' && !!open && !reached && !!inVillage && !busy && !other;
```

`js/plaza/winter-card.js`:

```js
import { pickSeason, datePhase, SEASON_OVERRIDE } from './seasons.js';
import { myStage, winterDefault, FOUNTAIN_DONE } from './winter-rules.js';
import { WINTER_COPY } from './winter-copy.js';

export function fountainCard(plaza, nowMs, open, override = SEASON_OVERRIDE) {
  if (!open) return null;
  const def = pickSeason(nowMs, override);
  if (def.kind !== 'winter' || (!override && datePhase(def, nowMs) !== 'active')) return null;
  const stage = myStage(plaza?.winter?.[def.id] || winterDefault());
  if (stage >= FOUNTAIN_DONE) return null;
  const c = WINTER_COPY.card;
  return { id: 'winter_fountain', name: c.name, title: c.title, desc: c.desc, how: c.how, progress: stage, target: FOUNTAIN_DONE, ready: false };
}
```

- [ ] **Step 4: 중재 우선순위와 안내 환경 export**

`js/guide/arbiter.js:2`에 `concert: 20` 앞으로 `fountain: 25, `를 넣는다. `js/weekly/bridge.js:32` `function makeGuideEnv(g) {` → `export function makeGuideEnv(g) {`.

- [ ] **Step 5: winter.js에 안내 틱을 단다**

import에 더한다:

```js
import { guideArbiter } from '../guide/arbiter.js';
import { featureGuidesOpen } from '../guide/feature-rules.js';
import { YARD_STALL_SEC } from '../pond/yard-steps.js';
import { makeGuideEnv } from '../weekly/bridge.js';
import { bannerDue, arrowWanted } from './winter-guide.js';
```

`winter-rules.js` import 목록에 `myTotal`을 더한다. 상태 변수 줄 아래에:

```js
const ARROW_REACH = 4;
let guideEnv = null, arrow = null, bannered = false, arrowSec = 0;

export const winterGuideActive = () => !!arrow?.active;

const reached = () => !!gameState.hintsSeen?.visitFountain || myTotal(st()) > 0;

function tickGuide(dt, inVillage) {
  if (!guideEnv || debugStage !== null || !saveRestored) return;
  const s = st();
  const base = { phase: winterPhase(), open: featureGuidesOpen(gameState), reached: reached() };
  const busy = guideEnv.uiBusy() || guideEnv.cine();
  if (!bannered && inVillage && bannerDue({ ...base, busy, tries: s.banner })) {
    bannered = true;
    commit({ ...s, banner: s.banner + 1 });
    ui.showHintBanner?.({ ico: '❄️', title: WINTER_COPY.banner.title, line: WINTER_COPY.banner.line, near: () => true, attention: true, slotQuest: true, kind: 'feature', key: `fountain-${def.id}` });
  }
  const want = bannered && arrowSec < YARD_STALL_SEC
    && arrowWanted({ ...base, inVillage, busy, other: !guideArbiter.mayShow('fountain') || !guideEnv.cameraFree() });
  if (!want) { if (arrow?.active) arrow.cancel('gate'); return; }
  arrow ??= guideEnv.makeGuide('fountain', FOUNTAIN_AT, ARROW_REACH);
  if (!arrow.active) arrow.start();
  arrowSec += dt;
  arrow.update(dt);
}
```

`initWinter` 본문 `debugStage = debug;` 다음에:

```js
  guideEnv = ge ? makeGuideEnv(ge) : null;
  guideArbiter.register({ name: 'fountain', active: winterGuideActive });
```

`updateWinter`의 `tickFireworks(dt);` 다음 줄에 `tickGuide(dt, inVillage);`.

- [ ] **Step 6: 첫 방문과 의뢰 줄**

`js/game.js:1678` `FIRST_VISIT_AT` 객체의 `pond: ...` 앞에 `fountain: () => fountainSpotNow(), `를 넣는다(이 줄에 `plaza` 글자는 없다).

`js/spaces/npc.js` import 블록 끝에:

```js
import { fountainCard } from '../plaza/winter-card.js';
import { featureGuidesOpen } from '../guide/feature-rules.js';
```

(이미 `featureGuidesOpen`을 import하고 있으면 두 번째 줄은 넣지 않는다.) 878줄 `views` 배열의 `portCard(gameState.port, port.active)` 뒤에 `, fountainCard(gameState.plaza, Date.now(), featureGuidesOpen(gameState))`를 넣는다.

- [ ] **Step 7: 통과를 확인한다**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app` 1건 외 PASS

- [ ] **Step 8: 무음 브라우저 확인**

무음 절차로 `?plazaSeason=winter-2026` + Task 8 Step 10의 `/api/plaza` 가로채기를 걸고 집 3단계 이상 세이브(기존 계정 또는 콘솔 `g.gameState.houseStage = 3`)로 마을 시작점(스폰)에 선다. 확인: 배너 "❄️ 겨울 분수를 함께 지어요"가 한 번 뜨고, 금색 화살표가 "광장으로 가요"와 함께 광장을 가리킨다, 분수 앞에 오면 첫 방문 배너 "재료를 보태면 내 분수가 올라가요"가 뜨고 화살표가 사라진다, 의뢰 패널(PC)·의뢰 버튼 시트(모바일 390×844)에 "❄️ 내 분수 1/4" 줄이 있다. 새로고침 두 번 뒤 세 번째에는 배너가 안 뜬다(`gameState.plaza.winter['winter-2026'].banner === 2`).

- [ ] **Step 9: 커밋**

```bash
git add js/plaza/winter-guide.js js/plaza/winter-card.js js/plaza/winter.js js/guide/arbiter.js js/weekly/bridge.js js/game.js js/spaces/npc.js tests/winter-guide.test.mjs
git commit -m "feat(plaza): winter fountain banner, arrow, first visit and quest line"
```

---

### Task 10: 광고 (재료 채우기·한 번 더 받기)

**Files:**
- Modify: `js/guide/prepass-rules.js:9-29` (`SLOT_CAPS`, `AD_PARTS`)
- Modify: `js/tenjin-events.js:20,28` (`GROUP_RULES`)
- Modify: `js/plaza/winter.js` (`adShort`, `adDouble`)
- Test: `tests/winter-ads.test.mjs`

**Interfaces:**
- Consumes: `adPill(slot, grant, done) → Node|null` (js/game.js:2118, `repeatOpen`·`rewarded.pill`·`adQuiet` 경유), `shortFill`, `doubleOpen`, `markDoubled`, `lampGrant`
- Produces: 슬롯 `fountain_short`(하루 2), `fountain_double`(하루 2, 단계마다 1은 세이브 `doubled`가 막는다), `rvGroup('fountain_short') === 'house'`, `rvGroup('fountain_double') === 'double'`

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`tests/winter-ads.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SLOT_CAPS, AD_PARTS, slotLeft, bumpDay, adQuiet } from '../js/guide/prepass-rules.js';
import { rvGroup } from '../js/tenjin-events.js';

test('슬롯 상한: 재료 채우기 하루 2회, 한 번 더 받기 하루 2회', () => {
  assert.equal(SLOT_CAPS.fountain_short, 2);
  assert.equal(SLOT_CAPS.fountain_double, 2);
  const day = '2026-12-20';
  const used = bumpDay(bumpDay(null, day, 'fountain_short'), day, 'fountain_short');
  assert.equal(slotLeft(used, 'fountain_short', { day }), 0);
  assert.equal(slotLeft(used, 'fountain_short', { day: '2026-12-21' }), 2);
});

test('버튼 문구', () => {
  assert.deepEqual(AD_PARTS.fountain_short, ['광고 보고', ' ', '재료 채우기']);
  assert.deepEqual(AD_PARTS.fountain_double, ['광고 보고', ' ', '한 번 더 받기']);
});

test('텐진 묶음: 재료 채우기 = house, 한 번 더 = double', () => {
  assert.equal(rvGroup('fountain_short'), 'house');
  assert.equal(rvGroup('fountain_double'), 'double');
});

test('튜토리얼·팝업 대기 중엔 광고를 숨긴다(adQuiet 경유)', () => {
  assert.equal(adQuiet({ tutorial: true }), true);
  assert.equal(adQuiet({ modalQueue: true }), true);
  const src = readFileSync(new URL('../js/plaza/winter.js', import.meta.url), 'utf8');
  assert.ok(src.includes("adPill('fountain_short'"));
  assert.ok(src.includes("adPill('fountain_double'"));
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test tests/winter-ads.test.mjs`
Expected: FAIL (`SLOT_CAPS.fountain_short` undefined)

- [ ] **Step 3: 슬롯과 묶음**

`js/guide/prepass-rules.js:14` `restaurant_double: 1, bait_box: 1,` 줄 다음에 `fountain_short: 2, fountain_double: 2,`. `AD_PARTS` 끝(`bait_box` 줄 다음)에:

```js
  fountain_short: ['광고 보고', ' ', '재료 채우기'],
  fountain_double: ['광고 보고', ' ', '한 번 더 받기'],
```

`js/tenjin-events.js:20` → `['house', /^(house\d+|bridge|farm\d+|branch_.+|fountain_short)$/],`, 28줄 → `['double', /^(restaurant_double|bait_box|fountain_double)$/],`.

- [ ] **Step 4: winter.js 창에 광고를 붙인다**

game.js import에 `adPill`을 더하고, `winter-rules.js` import에 `shortFill, doubleOpen, markDoubled`를 더한다. `ctx` 위에:

```js
function adShort() {
  if (!economy() || winterPhase() !== 'active') return null;
  const giveMap = shortFill(stageRows(st()), gameState.inventory);
  if (!Object.keys(giveMap).length) return null;
  return adPill('fountain_short', () => { giveReward(giveMap, 'fountain_short', `stage${myStage(st())}`); requestSave(); }, () => { if (open) render(); });
}

function adDouble(k) {
  if (!economy() || !doubleOpen(st(), k)) return null;
  return adPill('fountain_double', () => { giveReward(lampGrant(k).give, 'fountain_double', `lamp${k}`); commit(markDoubled(st(), k)); }, () => { if (open) render(); });
}
```

`ctx`의 `adShort: () => null, adDouble: () => null,`을 `adShort, adDouble,`로 바꾼다.

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app` 1건 외 PASS

- [ ] **Step 6: 무음 브라우저 확인**

무음 절차 + Task 8 가로채기 + `?prepass=1`(localhost 광고 즉시 완료, js/game.js `PREPASS_DEV`). 가방 석탄 0으로 2단계 창을 연다. 확인: "AD 광고 보고 재료 채우기" 버튼이 재료 줄 아래에 있다, 누르면 석탄·돌이 모자란 만큼(합계 10까지) 가방에 들어오고 버튼이 사라진다, 같은 날 세 번째에는 안 보인다. 마을 1단계를 받은 뒤 마을 등불 칸에 "광고 보고 한 번 더 받기"가 보이고 누르면 코인 +30, 다시 열면 없다. 3단계(꾸미기)에는 버튼이 없다.

- [ ] **Step 7: 커밋**

```bash
git add js/guide/prepass-rules.js js/tenjin-events.js js/plaza/winter.js tests/winter-ads.test.mjs
git commit -m "feat(plaza): optional rewarded ads for winter fountain"
```

---

### Task 11: 최종 검증·리뷰·배포 날 절차

**Files:**
- Modify: `dev/active/winter-fountain/winter-fountain-context.md`, `winter-fountain-tasks.md`
- (배포 날) Create in scratchpad only: `<scratchpad>/winter_sql.py`

**Interfaces:**
- Consumes: 전 Task
- Produces: 검증 기록, 사용자 확인, 배포 날 체크리스트

- [ ] **Step 1: 전체 테스트**

Run: `node --test tests/*.test.mjs`
Expected: `@capacitor/app 이 두 앱에 들어간다` 1건 외 PASS. 실패가 그 밖에 있으면 고친 뒤 다시 돈다.

- [ ] **Step 2: 수확제 회귀 확인 (무음)**

`?plazaSeason` 없이 연다(오늘 날짜면 수확제). 확인: 광장이 지금 운영과 같은 완공 모습(호박 포함, 눈·등불·분수 없음), 명판 "🌾 광장 명판 보기"가 열린다, 콘솔 오류 없음. `?plaza=2`도 수확제 2단계로 보인다.

- [ ] **Step 3: 코드 리뷰**

`superpowers:requesting-code-review`로 `git diff main...HEAD`를 리뷰받는다(code-reviewer 에이전트). CRITICAL·HIGH는 고치고 다시 테스트한다.

- [ ] **Step 4: 사용자 최종 확인 (게이트)**

Task 8·9·10 캡처를 PC·모바일 나란히 보이고 "겨울 분수 화면·안내·광고 흐름 이대로 확정할까요?"를 묻는다.

- [ ] **Step 5: dev docs 갱신과 커밋**

context의 `Last Updated`를 바꾸고 tasks 체크를 채운다.

```bash
git add dev/active/winter-fountain
git commit -m "docs(plaza): winter fountain verification notes"
```

- [ ] **Step 6: 배포 날 서버 절차 (사용자가 배포를 지시한 뒤에만)**

scratchpad에 Write 도구로 `winter_sql.py`를 만든다:

```python
import sys
sys.path.insert(0, 'ml')
from calm_ml.db import connect

mode, path = sys.argv[1], sys.argv[2]
con = connect()
if mode == 'apply':
    con.run(open(path, encoding='utf-8').read())
    print('APPLIED', path)
else:
    try:
        con.run(open(path, encoding='utf-8').read())
        print('FAIL no exception, selftest did not reach the end')
    except Exception as e:
        print('PASS' if 'WINTER_SELFTEST_OK' in str(e) else 'FAIL', str(e)[:400])
```

`.env`는 원 저장소에만 있으므로 원 저장소에서 돌린다:

```bash
cd /Users/uicheol_hwang/calm_forest && ml/.venv/bin/python <scratchpad>/winter_sql.py apply /Users/uicheol_hwang/calm_forest/.claude/worktrees/winter-fountain/sql/migrations/migrate_plaza_winter.sql
cd /Users/uicheol_hwang/calm_forest && ml/.venv/bin/python <scratchpad>/winter_sql.py test /Users/uicheol_hwang/calm_forest/.claude/worktrees/winter-fountain/sql/tests/plaza_winter_selftest.sql
```

Expected: `APPLIED ...` 다음 `PASS WINTER_SELFTEST_OK`. 잔여 확인: Supabase MCP `execute_sql`(읽기)로 `select count(*) from plaza_seasons where season like 'wtest-%'` = 0, `select season, allow_guests, per_user from plaza_seasons` 에 harvest-2026 false/false, winter-2026 true/true.

실제 서버 경로 한 번 더(선택): 위 스크립트 `apply`로 `insert into plaza_seasons (season, starts_at, ends_at, daily_cap, allow_guests, per_user) values ('wtest-live', now(), now() + interval '2 hours', 30, true, true); insert into plaza_needs select 'wtest-live', stage, item, need from plaza_needs where season = 'winter-2026';`를 담은 scratchpad SQL을 넣고, 무음 브라우저로 `http://localhost:8031/?plazaSeason=wtest-live`(가로채기 없이)에서 1단계를 기부해 본다. 끝나면 DO 블록 하나로 정리한다(scratchpad SQL, Write로 작성):

```sql
do $$
begin
  delete from plaza_donations where season = 'wtest-live';
  delete from plaza_needs where season = 'wtest-live';
  delete from plaza_seasons where season = 'wtest-live';
end $$;
```

테스트용 익명 계정은 브라우저가 만든 그 uid만 `auth.users`에서 지운다(uid는 콘솔 `(await import('/js/supabase-client.js')).state.userId`로 확인, 지우기 전에 사용자에게 uid를 보이고 확인받는다).

- [ ] **Step 7: 배포 체크리스트 (사용자 지시 뒤, deploy-checklist 메모 그대로)**

1. 푸시 전 키 스캔(`git grep` 키 패턴, push-secret-scan 메모).
2. SQL 적용(Step 6)을 클라이언트 배포보다 먼저. 클라이언트는 서버가 없어도 날짜로 겨울 모습을 그리고, 기부만 `season`으로 거절된다.
3. 5곳 동시: 웹(wrangler), 토스(`bundle_upload` memo), Play 프로덕션, iOS, itch zip(`build:itch`). 새 꾸미기 id 2종과 `plaza.winter` 세이브 칸 때문에 한 곳이라도 늦으면 구버전이 저장하며 칸을 지운다.
4. main과 feat/capacitor-app 둘 다 푸시.
5. ⚠️ 사용자 몫(답변 첫 줄에): 토스 콘솔 검수 제출·출시, Play 프로덕션 승인, iOS 심사 제출, itch 업로드, 12/18 시작 공지.
6. 12/18 00:00 KST 뒤 운영 화면에서 광장 겨울 모습과 첫 기부를 확인하고, 다음 날 BigQuery에 `plaza_fountain_stage`·`plaza_lamp_stage`·`plaza_donate(season=winter-2026)` 적재를 확인한다.

---

## Self-Review

**Spec coverage**
- §1 시즌 구조: 시즌 목록·날짜 선택·`?plazaSeason=` 유지(Task 2), 시즌별 문구(Task 5), `allow_guests`·winter-2026 행·게스트 기부(Task 1, `plaza_give`로 구현, 달라진 점 3·4), `/api/plaza` 그대로(파일 구조 절).
- §2 내 분수: 단계 표·95개·하루 30(Task 1·3), 순서대로만(Task 3 `myStage`·Task 8 `onGive`가 지금 단계로만 보냄), 자동 완공 없음·시즌 뒤 남음(Task 8 `winterPhase`가 after면 기부 닫힘, 모습은 내 단계), 완공 보상·게스트 보류(Task 4 `decorPlan`·Task 8 `afterGive`·`settle`), `buildFountain(stage)`·마당 0.55배(Task 6·7).
- §3 마을 등불: 9개·3단계·임계값(Task 4), 단계별 보상·자격(Task 4·8, 달라진 점 5), 꾸미기는 로그인만·코인 씨앗은 게스트도(Task 8 `grantLamp`), 3D r 5.4·흩어진 순서·꺼짐/켜짐 모양·밤 발광(Task 6 `houseWindows`).
- §4 광장 겨울 정리: 눈 원판·충돌체(Task 6), 좌판 닫힘(겨울 경로에 좌판 없음), 1단계 잔재 대신 완공 바탕(달라진 점 1·2).
- §5 안내: 중재 등록·이야기 목표보다 낮음·튜토리얼 금지·집 완성 뒤(Task 9), 배너 최대 2번·금색 화살표·"광장으로 가요"(Task 9), 첫 방문 한 줄(Task 5·9), 의뢰 줄 n/4(Task 9), 등불 토스트 팝업 큐(Task 8), 문구 규칙(Task 5 테스트).
- §6 광고: 두 슬롯·하루 2회·텐진 묶음·adQuiet·SLOT_CAPS·rvGroup(Task 10), 앱·토스만은 기존 `prepassProvider` 가용성으로.
- §7 측정: 기존 `plaza_*`가 `season=winter-2026`으로(Task 8), 새 이벤트 2종(Task 8, 달라진 점 6).
- §8 일정·배포: 5곳 동시·SQL 직접 적용·DO 블록 셀프테스트·테스트 시즌 정리(Task 11).
- 범위 밖 항목은 손대지 않는다.

**Placeholder scan:** 코드 단계는 전부 실제 코드다. CSV의 `LINE_F`·`LINE_L`은 같은 단계에 적힌 `grep -n` 출력으로 채우는 숫자이고, 줄 번호는 Task 8 코드가 확정된 뒤에만 알 수 있다.

**Type consistency:** `myStage`·`stageRows`·`todayLeft`·`recordGive`·`recordCap`·`lampClaims`·`lampGrant`·`claimLamp`·`decorPlan`·`settleOwed`·`shortFill`·`doubleOpen`·`markDoubled`·`fireworksDue`·`litLamps`·`nextLampLeft`·`lampSpot`·`lampLit`는 Task 3·4 정의와 Task 6·8·9·10 사용처의 이름·인자가 같다. 창 ctx 키(`stage, rows, todayLeft, inv, busy, guest, phase, total, lamps, adShort, adDouble, onDonate, onClose`)는 winter.js `ctx`와 ui.js `renderFountain`·`lampsBlock`이 같은 이름을 쓴다. `initPlaza(ge)` → `initWinter(DEF, ge, DEBUG_STAGE)` → `makeGuideEnv(ge)` 순서가 맞다. `plazaGive(season, stage, item, qty)`는 SQL `plaza_give(p_season, p_stage, p_item, p_qty)`와 같은 순서다.
