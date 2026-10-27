import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dockHtml, LACK_LABEL } from '../js/boat/dock-ui.js';

const view = {
  star: 620, coins: 100, runsLeft: 2, runsMax: 3, best: 812, bestRapid: 0, rapidOpen: false,
  sel: { boat: 'ferry', course: 'calm' }, mat: { lotus: 4, driftwood: 0, shell: 0, moon_fish: 0 },
  boats: [
    { id: 'ferry', name: '나룻배', ico: '🛶', owned: true, live: true, selected: true, lamps: 3, skill: null, lacks: [], ok: false },
    { id: 'lotus', name: '연잎배', ico: '🍃', owned: false, live: true, selected: false, lamps: 2, skill: null, lacks: [{ key: 'mat:lotus', have: 4, need: 10 }, { key: 'need:clears', have: 2, need: 3 }], ok: false },
  ],
};

test('boat card: riding and build buttons with lacks', () => {
  const h = dockHtml(view);
  assert.match(h, /data-boat="ferry"[^>]*>타는 중</);
  assert.match(h, /data-unlock="lotus"[^>]*disabled/);
  assert.match(h, /🪷 연꽃 4\/10/);
  assert.match(h, /완주 2\/3번/);
});

test('rapids locked note', () => {
  assert.match(dockHtml(view), /잔잔한 물길을 한 번 완주하면 급류가 열려요/);
  assert.doesNotMatch(dockHtml({ ...view, rapidOpen: true }), /한 번 완주하면 급류가 열려요/);
});

test('lack labels', () => {
  assert.equal(LACK_LABEL({ key: 'star', have: 1, need: 500 }), '⭐ 별조각 1/500');
  assert.equal(LACK_LABEL({ key: 'coins', have: 100, need: 3000 }), '🪙 코인 100/3000');
  assert.equal(LACK_LABEL({ key: 'need:rapidPerfect', have: 0, need: 1 }), '급류 무피해 완주 0/1번');
});

test('index.html wiring', () => {
  const H = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(H, /id="boat-skill"/);
  assert.match(H, /\{ id: 'boat_rapid',/);
  assert.match(H, /Input\.unlockBoat\(/);
  assert.match(H, /renderDock\(/);
  assert.doesNotMatch(H, /Input\.buyBoatUpgrade/);
});

test('no em dash in dock-ui', () => {
  assert.ok(!readFileSync(new URL('../js/boat/dock-ui.js', import.meta.url), 'utf8').includes('—'));
});
