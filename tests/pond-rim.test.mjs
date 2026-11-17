import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCsv } from '../tools/amplitude/csv.mjs';
import { POND_RIMS, RIM_IDS, pondRimOf, pondRimsOwned, rimView, applyRim } from '../js/pond/rim.js';
import { rimPieces, pondLayout } from '../js/pond/shape.js';
import { POND_STAGE_R } from '../js/data/pond.js';

test('네 가지 물가: 기본 돌은 무료, 나머지는 150코인', () => {
  assert.deepEqual(POND_RIMS.map(r => [r.id, r.name, r.cost]), [
    ['rock', '기본 돌', 0], ['pebble', '흰 조약돌', 150], ['brick', '붉은 벽돌', 150], ['shell', '조개와 산호', 150],
  ]);
  assert.deepEqual(RIM_IDS, ['rock', 'pebble', 'brick', 'shell']);
  for (const r of POND_RIMS) assert.ok(r.ico);
  assert.ok(Object.isFrozen(POND_RIMS) && Object.isFrozen(POND_RIMS[1]));
});

test('지금 물가: 모르거나 없으면 기본 돌', () => {
  assert.equal(pondRimOf({ pondRim: 'brick' }), 'brick');
  for (const h of [undefined, null, {}, { pondRim: 'gold' }, { pondRim: 3 }, { pondRim: ['pebble'] }, { pondRim: 'toString' }]) {
    assert.equal(pondRimOf(h), 'rock');
  }
});

test('가진 물가: 기본 돌은 늘 있고, 아는 id 만, 겹치지 않게', () => {
  assert.deepEqual(pondRimsOwned(undefined), ['rock']);
  assert.deepEqual(pondRimsOwned({ pondRims: 'pebble' }), ['rock']);
  assert.deepEqual(pondRimsOwned({ pondRims: ['shell', 'gold', 'pebble', 'shell', 4, null, 'rock'] }), ['rock', 'pebble', 'shell']);
  assert.deepEqual(pondRimsOwned({ pondRim: 'brick' }), ['rock']);
});

test('줄 모델: 쓰는 중·가진 것·살 수 있는 것', () => {
  const v = rimView({ pondRim: 'pebble', pondRims: ['pebble'] }, 150);
  assert.deepEqual(v.map(r => [r.id, r.owned, r.using, r.canBuy]), [
    ['rock', true, false, false], ['pebble', true, true, false], ['brick', false, false, true], ['shell', false, false, true],
  ]);
  assert.deepEqual(Object.keys(v[0]), ['id', 'name', 'ico', 'cost', 'owned', 'using', 'canBuy']);
  assert.ok(rimView({}, 149).every(r => !r.canBuy));
  assert.ok(rimView({}, undefined).every(r => !r.canBuy));
  assert.equal(rimView({}, 0)[0].using, true);
});

test('사기: 150코인을 한 번만 내고 바로 바뀐다, 원본은 그대로', () => {
  const inv = Object.freeze({ coins: 200, wood: 3 }), hints = Object.freeze({ pond: true, pondStage: 2 });
  const out = applyRim(inv, hints, 'brick');
  assert.deepEqual(out, {
    inventory: { coins: 50, wood: 3 },
    hintsSeen: { pond: true, pondStage: 2, pondRim: 'brick', pondRims: ['brick'] },
    bought: true, cost: 150,
  });
  assert.deepEqual(inv, { coins: 200, wood: 3 });
  assert.deepEqual(hints, { pond: true, pondStage: 2 });
  assert.equal(applyRim(out.inventory, out.hintsSeen, 'brick'), null);
});

test('가진 물가로는 공짜로 바꾼다', () => {
  const hints = { pondRim: 'brick', pondRims: ['brick', 'shell'] };
  const back = applyRim({ coins: 0 }, hints, 'rock');
  assert.deepEqual(back, { inventory: { coins: 0 }, hintsSeen: { pondRim: 'rock', pondRims: ['brick', 'shell'] }, bought: false, cost: 0 });
  assert.equal(applyRim({ coins: 0 }, back.hintsSeen, 'shell').cost, 0);
  assert.deepEqual(hints, { pondRim: 'brick', pondRims: ['brick', 'shell'] });
});

test('못 사는 경우는 null', () => {
  assert.equal(applyRim({ coins: 149 }, {}, 'pebble'), null);
  assert.equal(applyRim({}, {}, 'pebble'), null);
  assert.equal(applyRim({ coins: 'many' }, {}, 'pebble'), null);
  assert.equal(applyRim({ coins: 999 }, {}, 'gold'), null);
  assert.equal(applyRim({ coins: 999 }, {}, 'rock'), null);
  assert.equal(applyRim({ coins: 999 }, { pondRim: 'shell', pondRims: ['shell'] }, 'shell'), null);
});

test('조각 수는 시안과 같다', () => {
  const count = (rim) => [POND_STAGE_R[0], POND_STAGE_R[2]].map(r => rimPieces(r, rim).length);
  assert.deepEqual(count('pebble'), [36, 70]);
  assert.deepEqual(count('brick'), [26, 49]);
  assert.deepEqual(count('shell'), [37, 69]);
  assert.deepEqual(count('rock'), [14, 27]);
  assert.deepEqual(count('gold'), [14, 27]);
});

test('기본 돌 조각은 지금 배치와 같은 값이다', () => {
  for (const [i, r] of POND_STAGE_R.entries()) {
    assert.deepEqual(rimPieces(r, 'rock'), pondLayout(r, i + 1).rocks);
  }
});

test('조각은 물가에 놓이고 뜨거나 가라앉지 않으며 블룸 문턱보다 어둡다', () => {
  const bright = (hex) => Math.max((hex >> 16) & 255, (hex >> 8) & 255, hex & 255) / 255;
  for (const rim of ['pebble', 'brick', 'shell']) {
    for (const r of POND_STAGE_R) {
      const list = rimPieces(r, rim);
      for (const p of list) {
        assert.ok(bright(p.color) < 0.85, `${rim} ${p.shape} ${p.color.toString(16)}`);
        assert.ok(p.y >= 0 && p.y <= 0.25, `${rim} ${p.shape} y ${p.y}`);
        if (p.shape === 'sand') continue;
        const d = Math.hypot(p.x, p.z);
        assert.ok(d > r - 0.2 && d < r + 0.6, `${rim} ${p.shape} at ${d.toFixed(2)} for r ${r}`);
      }
      assert.deepEqual(rimPieces(r, rim), list);
    }
  }
  const sand = rimPieces(2, 'shell').filter(p => p.shape === 'sand');
  assert.equal(sand.length, 1);
  assert.ok(sand[0].outer <= 2 + 0.6);
});

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('연결: 저장된 물가로 짓고, 바꿀 때는 물가 조형만 갈아 끼운다', () => {
  const p = src('js/pond/index.js');
  assert.match(p, /rim = pondRimOf\(gameState\.hintsSeen\);\n\s*pond = buildPond\(\{ fishMesh, mergeGeos, paintGeo, emojiSprite, r, stage, rim \}\);/);
  const fn = p.match(/export function setPondRim\(\) \{[\s\S]*?\n\}/)[0];
  assert.match(fn, /if \(!spaceLinkOn\(e3Decision\(\)\) \|\| !pond\) return;/);
  assert.match(fn, /pond\.setRim\(next\);/);
  assert.doesNotMatch(fn, /teardown|grow|clearYard|solidCircle|obstacles/);
  const b = src('js/pond/build.js');
  assert.match(b, /r = POND_R, stage = 1, rim = 'rock' \}\)/);
  assert.match(b, /setRim\(next\) \{\n\s*shore\.geometry\.dispose\(\);\n\s*shore\.geometry = shoreGeometry\(/);
  assert.equal((b.match(/new THREE\.Mesh\(/g) || []).length, 2);
});

test('창: 저장과 기록이 조형 교체보다 먼저, 교체 실패는 구매를 되돌리지 않는다', () => {
  const f = src('js/pond/rim-ui.js');
  const fn = f.match(/export function pickRim\(id\) \{[\s\S]*?\n\}/)[0];
  const order = ['applyRim(', "if (out.bought) logEcon('pond_rim', id, -out.cost, gameState.inventory.coins);", 'refreshInventoryUI();',
    "trackEvent('pond_rim', { item: id, coins: out.cost });", 'requestSave();', 'try {', 'setPondRim();', 'console.error(', 'openPondRim();', 'ui.toast?.(POND_COPY.rimDone'];
  let at = -1;
  for (const s of order) { const i = fn.indexOf(s, at + 1); assert.ok(i > at, s); at = i; }
  assert.match(fn, /if \(!out\) return false;/);
  assert.doesNotMatch(f, /rewarded|guideShortAd|closeBook/);
  assert.match(f, /b\.disabled = r\.using \|\| \(!r\.owned && !r\.canBuy\);/);
  assert.match(f, /hint: rows\.some\(r => !r\.owned\) && !rows\.some\(r => r\.canBuy\) \? POND_COPY\.rimShort : '',/);
  for (const p of ['js/pond/rim.js', 'js/pond/rim-ui.js', 'js/pond/shape.js', 'js/pond/build.js']) assert.doesNotMatch(src(p), /^\s*\/\//m, p);
  assert.doesNotMatch(src('js/game.js'), /pondRim|rim-ui/);
});

test('이벤트 표: pond_rim 행', () => {
  const row = parseCsv(src('docs/analysis/event-taxonomy.csv')).find(r => r.event_name === 'pond_rim');
  assert.ok(row);
  assert.equal(row.category, 'gathering');
  assert.equal(row.feature, 'pond');
  assert.deepEqual(row.custom_keys.split('|').sort(), ['coins', 'item']);
  assert.match(row.code_line, /^js\/pond\/rim-ui\.js:\d+$/);
});
