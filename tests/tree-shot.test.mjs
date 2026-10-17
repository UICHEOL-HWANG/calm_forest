import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { approachTime, createShotRig, ease, shotFrame, SHOT_HOLD } from '../js/world/tree-shot.js';

const BOX = { cx: 4, cy: 5, cz: -34, hx: 6.5, hy: 5, hz: 5 };
const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');

test('구도: 폰 세로는 가로 시야가 좁아 더 물러나고, 시선은 우듬지 중심 · 피치는 마을(41°)보다 낮다', () => {
  const land = shotFrame(BOX, 1280 / 720), port = shotFrame(BOX, 390 / 844);
  assert.ok(port.dist > land.dist * 1.4, `${port.dist} vs ${land.dist}`);
  assert.deepEqual(land.look, { x: 4, y: 5, z: -34 });
  const pitch = Math.atan2(land.pos.y - land.look.y, land.pos.z - land.look.z) * 180 / Math.PI;
  assert.ok(pitch > 24 && pitch < 31, String(pitch));
  // 가로 반폭이 화면 안에 들어온다(세로 화면)
  const th = Math.tan(21 * Math.PI / 180) * (390 / 844);
  assert.ok(BOX.hx / (port.dist - BOX.hz) < th);
});

test('리그: 들어가기 → 머물며 잎을 풀어 준다 → 기본 시점으로 돌아와 끝 · 총 ≈3.5초', () => {
  let held = 0;
  const home = (p, l) => { p.x = 0; p.y = 14; p.z = 16; l.x = 0; l.y = 1.2; l.z = 0; };
  const r = createShotRig({ from: { pos: { x: 0, y: 14, z: 16 }, look: { x: 0, y: 1.2, z: 0 } }, to: shotFrame(BOX, 1.6), home, onHold: () => held++ });
  let t = 0, phases = new Set();
  while (r.update(1 / 60) !== 'done' && t < 10) { t += 1 / 60; phases.add(r.phase); if (r.phase === 'in') assert.equal(held, 0); }
  assert.equal(held, 1);
  assert.ok(phases.has('hold') && phases.has('out'));
  assert.ok(t > 3 && t < 4.2, String(t));
  assert.ok(Math.abs(r.cur.pos.z - 16) < 1e-6 && Math.abs(r.cur.look.y - 1.2) < 1e-6);
  assert.ok(SHOT_HOLD >= 1.5);
});

test('넘기기: 들어가는 도중에도 잎을 풀고 0.5초 안에 돌아온다', () => {
  let held = 0;
  const r = createShotRig({ from: { pos: { x: 0, y: 14, z: 16 }, look: { x: 0, y: 1, z: 0 } }, to: shotFrame(BOX, 1.6), home: (p, l) => { Object.assign(p, { x: 0, y: 14, z: 16 }); Object.assign(l, { x: 0, y: 1, z: 0 }); }, onHold: () => held++ });
  r.update(0.2); r.skip();
  assert.equal(held, 1); assert.equal(r.phase, 'out');
  let t = 0; while (r.update(1 / 60) !== 'done') t += 1 / 60;
  assert.ok(t < 0.5);
});

test('곡선·시간 경계', () => {
  assert.equal(ease(0), 0); assert.equal(ease(1), 1); assert.equal(ease(2), 1);
  assert.equal(approachTime({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }), 0.9);
  assert.equal(approachTime({ x: 0, y: 0, z: 0 }, { x: 999, y: 0, z: 0 }), 1.4);
});

test('배선: 이정표 1회 플래그 · 해금 꺼짐/레거시 제외 · 귀환 모달이 조망샷 뒤로 · GA4', () => {
  const w = read('js/spaces/world-tree.js'), g = read('js/game.js');
  assert.match(w, /treeShot_intro/);
  assert.match(w, /`treeShot_\$\{branch\}_\$\{kind\}`/);
  assert.match(w, /function shotsOn\(\) \{ return unlocksOn\(\) && !gameState\.unlocks\?\.legacy; \}/);
  assert.match(w, /trackEvent\('tree_shot', \{ kind: q\.kind, branch: q\.branch, skipped/);
  assert.match(w, /ui\.anyModalOpen\?\.\(\) && !ui\.coachActive\?\.\(\)/);
  assert.match(w, /id = 'treeshot-modal'/);   // -modal → anyModalOpen 이 걷기·액션을 멈춘다
  // 서식지: 조망샷을 귀환(syncUnlocks)보다 먼저 줄 세운다
  const hab = w.slice(w.indexOf("if (e.type === 'habitat')"), w.indexOf("} else if (e.type === 'bundle')"));
  assert.ok(hab.indexOf("queueTreeShot('habitat'") < hab.indexOf('syncUnlocks(false)'));
  const q = g.slice(g.indexOf('function queueStoryModal'), g.indexOf('function afterModals'));
  assert.ok(q.indexOf('coachActive') < q.indexOf('treeShotBusy()'));
  assert.match(g.slice(g.indexOf('function afterModals'), g.indexOf('function showReturnModal')), /treeShotBusy\(\)/);
  assert.match(read('js/i18n-en.js'), /'🌳 저 나무가 세계수예요\. 다시 살려 볼까요\?'/);
});
