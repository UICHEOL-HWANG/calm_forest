import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js only wires the weekly module', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /weekly/i.test(l));
  assert.ok(lines.length <= 16, `${lines.length} weekly lines:\n${lines.join('\n')}`);
  assert.ok(game.includes('const m = weeklyDecorMesh(THREE, id); if (m)'));
  assert.ok(read('js/spaces/indoor.js').includes('weeklyDecorMesh(THREE, id)'));
  assert.ok(!/function\s+\w*weekly/i.test(game));
  for (const k of ["from './weekly/index.js'", 'initWeekly(', 'updateWeekly(', 'weeklySpotNow()', 'openWeekly()', 'weekly: weeklyDefault()', 'restoreWeekly(saved.weekly)', 'weeklyNote(type, amount)']) {
    assert.ok(game.includes(k), k);
  }
});

test('the weekly dev hook sits once inside the localhost-only dev block', () => {
  const game = read('js/game.js');
  const hook = 'window.__weekly = weeklyDev();';
  assert.equal(game.split(hook).length - 1, 1);
  const lines = game.split('\n');
  const at = lines.findIndex(l => l.includes(hook));
  const guardAt = lines.findLastIndex((l, i) => i < at && /^ {2}if \(/.test(l));
  assert.ok(guardAt >= 0 && at - guardAt < 120);
  assert.ok(lines[guardAt].includes('localhost|127\\.0\\.0\\.1') && lines[guardAt].includes('location.hostname'));
  assert.ok(!lines.slice(guardAt + 1, at).some(l => /^ {2}\}/.test(l)));
});

test('the clock override is read only on localhost', () => {
  const game = read('js/game.js');
  const reads = game.split('\n').filter(l => l.includes("get('weeknow')"));
  assert.equal(reads.length, 1);
  assert.ok(reads[0].includes('localhost|127\\.0\\.0\\.1') && reads[0].includes('location.hostname'));
  assert.match(game, /now: \(\) => DEV_NOW \|\| Date\.now\(\)/);
});

test('doors shows the weekly prompt', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /weeklySpotNow\(\)/);
  assert.match(doors, /weeklyPrompt\(\)/);
});

test('weekly modules stay out of game.js internals', () => {
  for (const f of ['index', 'rules', 'track', 'bridge', 'guide']) assert.doesNotMatch(read(`js/weekly/${f}.js`), /from '\.\.\/game\.js'/, f);
});

test('actions without quest events call weeklyNote', () => {
  assert.match(read('js/spaces/cafe.js'), /weeklyNote\('serve'\)/);
  assert.match(read('js/spaces/delve.js'), /weeklyNote\('delve'\)/);
  assert.match(read('js/mountain/sled-run.js'), /weeklyNote\('sled'\)/);
  assert.match(read('js/observatory/star-run.js'), /weeklyNote\('star'\)/);
  assert.match(read('js/spaces/carving.js'), /weeklyNote\('carve'\)/);
  assert.match(read('js/spaces/neighbor.js'), /weeklyNote\('neighbor'\)/);
  assert.match(read('js/game.js'), /weeklyNote\('daily'\)/);
});

const fnBody = (src, name) => {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = src.slice(start + 1).search(/\n(export )?(async )?function /);
  return src.slice(start, next < 0 ? undefined : start + 1 + next);
};

test('daily quests count on claim, not on accept', () => {
  const game = read('js/game.js');
  assert.match(fnBody(game, 'npcClaim'), /if \(o\.def\.daily\) weeklyNote\('daily'\)/);
  assert.doesNotMatch(fnBody(game, 'npcAccept'), /weeklyNote/);
});

test('delve counts only descents by the ladder', () => {
  assert.match(read('js/spaces/delve.js'), /if \(via === 'ladder'\) weeklyNote\('delve'\)/);
});

test('neighbor counts only first visits', () => {
  assert.match(read('js/spaces/neighbor.js'), /if \(!entry\.revisit\) weeklyNote\('neighbor'\)/);
});

test('carving counts only finished carvings', () => {
  assert.match(read('js/spaces/carving.js'), /if \(kind === 'done'\) weeklyNote\('carve'\)/);
});

test('weekly prompt order matches handleAction (plaza before weekly)', () => {
  const doors = read('js/spaces/doors.js');
  assert.ok(doors.indexOf('weeklySpotNow()') > doors.indexOf("plazaHere === 'plaque'"));
  const game = read('js/game.js');
  assert.ok(game.indexOf('if (weeklySpotNow()) return openWeekly()') > game.indexOf('if (plazaSpotNow()) return openPlaza()'));
});

test('only five weekly events are tracked', () => {
  const names = [...read('js/weekly/track.js').matchAll(/trackEvent\('([a-z_]+)'/g)].map(m => m[1]);
  assert.deepEqual(names.sort(), ['market_buy', 'market_login_prompt', 'market_open', 'weekly_board_open', 'weekly_quest_claim']);
});

test('guest check treats an unresolved session as guest', () => {
  assert.ok(read('js/game.js').includes('authState.isGuest !== false'));
});

test('dev time override is a dev-session param', () => {
  assert.match(read('js/first-loop.js'), /'weeknow'/);
});

test('the weekly guide reuses createAuctionGuide under its own name', () => {
  const bridge = read('js/weekly/bridge.js');
  assert.match(bridge, /import \{ createAuctionGuide \} from '\.\.\/auction\/guide\.js'/);
  assert.match(bridge, /createAuctionGuide\(\{\s*name,/);
  assert.match(read('js/weekly/index.js'), /makeGuide\(`weekly-\$\{target\}`/);
  assert.doesNotMatch(read('js/weekly/guide.js'), /auction/);
  assert.doesNotMatch(read('js/weekly/index.js'), /from '\.\.\/auction\/index\.js'/);
});

test('game.js passes the guide environment through the existing weekly lines', () => {
  const game = read('js/game.js');
  assert.match(game, /guide: GE/);
  assert.match(game, /guideEnv: wb\.guideEnv/);
  assert.match(game, /function guideBusy\(\) \{ return portGuideActive\(\) \|\| restaurantGuideActive\(\) \|\| auctionGuideActive\(\) \|\| affinityGuideActive\(\) \|\| !!yardGuide\?\.active\(\); \}/);
  assert.match(game, /otherGuide: guideBusy \};/);
});

test('weekly index saves only from claim, buy and open', () => {
  const src = read('js/weekly/index.js').replace(/^const saveCommit = .*$/m, '');
  const fns = [...src.matchAll(/\n(?:export )?function (\w+)\(/g)].map(m => ({ name: m[1], at: m.index }));
  const users = [...src.matchAll(/saveCommit\(|requestSave\(/g)].map(m => fns.filter(f => f.at < m.index).pop()?.name);
  assert.deepEqual([...new Set(users)].sort(), ['onBuy', 'onClaim', 'openWeekly']);
});

test('initWeekly, updateWeekly and weeklyNote never save or use the saving helper', () => {
  const src = read('js/weekly/index.js');
  assert.doesNotMatch(fnBody(src, 'initWeekly'), /requestSave|saveCommit|setIfChanged|commit\(/);
  assert.doesNotMatch(fnBody(src, 'updateWeekly'), /requestSave|saveCommit/);
  assert.doesNotMatch(fnBody(src, 'weeklyNote'), /requestSave|saveCommit/);
});

test('onClaim and onBuy save once on success and not on refusal', () => {
  const src = read('js/weekly/index.js');
  const claim = fnBody(src, 'onClaim');
  assert.equal((claim.match(/saveCommit\(/g) || []).length, 1);
  assert.ok(claim.indexOf('if (!r.ok) return r') < claim.indexOf('saveCommit('));
  const buy = fnBody(src, 'onBuy');
  assert.equal((buy.match(/saveCommit\(/g) || []).length, 1);
  assert.ok(buy.indexOf('if (!plan.ok) return plan') < buy.indexOf('saveCommit('));
  assert.ok(buy.indexOf("grant_failed") < buy.indexOf('saveCommit('));
});

test('onBuy refuses an item with no art before planning, granting, spending or saving', () => {
  const buy = fnBody(read('js/weekly/index.js'), 'onBuy');
  const guard = buy.indexOf("if (!hasItemArt(item.id)) return { ok: false, reason: 'soon' };");
  assert.ok(guard >= 0);
  for (const later of ['buyPlan(', 'grantDecorItem(', 'saveCommit(', 'spend(']) assert.ok(guard < buy.indexOf(later), later);
});
