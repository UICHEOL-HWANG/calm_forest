import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('낚시 보장: 다음 한 번만, DDA 안 건드림, assist 기록', () => {
  const f = src('js/spaces/fishing.js');
  assert.match(f, /export function setFishAssist\(on\)/);
  assert.match(f, /const ASSIST_BITE_SEC = 1\.2;/);
  assert.match(f, /const ASSIST_HOLD_SEC = 20;/);
  assert.match(f, /if \(!assisted\) settleDifficulty\('fish', 1\);/);
  assert.match(f, /\.\.\.\(assisted \? \{ assist: 1 \} : \{\}\)/);
});

test('먹이·수첩 연결', () => {
  const f = src('js/pond/feed.js');
  assert.match(f, /export function feedPond\(kind = 'free'\)/);
  assert.match(f, /export function openPondBook\(\)/);
  assert.match(f, /trackEvent\('pond_feed', \{ kind, count: pondCount\(\) \}\)/);
  assert.match(f, /trackEvent\('pond_book_open', \{ count: book\.got \}\)/);
  assert.match(f, /buffs\.luck = Math\.max\(buffs\.luck, clock\.elapsedTime\) \+ FEED_BUFF_SEC/);
  assert.doesNotMatch(f, /^\s*\/\//m);
});

test('🐟 행동 버튼: 프롬프트·아이콘·분기·광고', () => {
  const d = src('js/spaces/doors.js');
  assert.match(d, /if \(!prompt && pondNear\(\)\) \{ \$w\.nearDoor = 'pond'; prompt = POND_COPY\.prompt; \}/);
  const h = src('index.html');
  assert.equal((h.match(/\|🗑️\|🐟\)\/u/g) || []).length, 2);
  const g = src('js/game.js');
  assert.match(g, /if \(nearDoor === 'pond'\) return openPondBook\(\);/);
  assert.match(g, /rewarded\.button\('pond_feed_more', \['광고 보고', ' ', POND_COPY\.adMore\]/);
  assert.match(src('js/guide/prepass-rules.js'), /'sell_bonus', 'pond_feed_more'\]/);
});

test('마당 채우기 연결', () => {
  const y = src('js/pond/yard-guide.js');
  assert.match(y, /export function createYardGuide\(deps\)/);
  assert.match(y, /export function installYardGuide\(deps\)/);
  assert.match(y, /export function yardGuidePointTo\(kind\)/);
  assert.match(y, /run\('yard_fill', yardSteps\(POND_COPY\)/);
  assert.match(y, /run\('pond_d1', d1Steps\(POND_COPY\)/);
  assert.match(y, /onStep: e => deps\.track\('guide_step', e\)/);
  assert.match(y, /hintsSeen\.yardFill = true/);
  assert.match(y, /hintsSeen\.pondD1 = true/);
  assert.doesNotMatch(y, /guideRevamp|e6Decision/);
  const g = src('js/game.js');
  assert.match(g, /yardGuide = installYardGuide\(\{/);
  assert.match(g, /if \(mode === 'play'\) yardGuide\?\.update\(dt\);/);
  assert.match(g, /otherGuide: \(\) => portGuideActive\(\) \|\| restaurantGuideActive\(\) \|\| auctionGuideActive\(\) \|\| !!yardGuide\?\.active\(\),/);
});
