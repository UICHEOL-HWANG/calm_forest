import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const R = readFileSync(new URL('../js/spaces/river.js', import.meta.url), 'utf8');
const G = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const fn = name => { const i = R.indexOf(`function ${name}(`); assert.ok(i >= 0, name); return R.slice(i, R.indexOf('\n}\n', i)); };
const call = (body, ev) => { const i = body.indexOf(`trackEvent('${ev}'`); assert.ok(i > 0, `${ev} 없음`); return body.slice(i, body.indexOf('});', i)); };

test('옛 강화 코드가 사라졌다', () => {
  for (const s of ['BOAT_UPGRADES', 'BOAT_LAMPS', 'buyBoatUpgrade', 'boatShopView', 'boatLampMax', 'up.hull', 'up.lamp', 'up.oar']) assert.ok(!R.includes(s), s);
});

test('startBoatRun: 고른 배·코스로 시드와 코스를 만든다', () => {
  const s = fn('startBoatRun');
  assert.match(s, /courseSeedKey\(boat\.runNo, course\)/);
  assert.match(s, /buildCourse\(boat\.seed, boat\.night, \{ chest: offered, course \}\)/);
  assert.match(s, /lamps: BOATS\[boatId\]\.lamps/);
  assert.match(s, /ramLeft: ramPerRun\(/);
  assert.match(s, /makeBoatModel\(boatId\)/);
  for (const p of ['boat_id', 'course']) assert.match(call(s, 'boat_start'), new RegExp(`${p}:|\\b${p},`), p);
});

test('급류는 첫 완주 전엔 못 탄다', () => {
  assert.match(fn('selectCourse'), /clears/);
  assert.match(fn('startBoatRun'), /clears/);
});

test('updateBoatRun: 코스 속도 배율·스킬·스퍼트 대기·조향', () => {
  const u = fn('updateBoatRun');
  assert.match(u, /COURSES\[boat\.course\]\.speedMul/);
  assert.match(u, /wantSkill/);
  assert.match(u, /startSkill\(/);
  assert.match(u, /boostCd\(/);
  assert.match(u, /steerParams\(boat\.boatId\)/);
  assert.match(u, /userData\.oars/);
  assert.match(call(u, 'boat_skill'), /boat_id:/);
});

test('updateRiverObjects: 판정은 abilities 로', () => {
  const u = fn('updateRiverObjects');
  for (const f of ['obstacleOutcome', 'isHit', 'isNearMiss', 'comboStep', 'whirlMode']) assert.match(u, new RegExp(`${f}\\(`), f);
});

test('endBoatRun: 재료 적립·통계·새 컬럼', () => {
  const e = fn('endBoatRun');
  assert.match(e, /addRunMats\(/);
  assert.match(e, /COURSES\[boat\.course\]\.matMul/);
  for (const k of ['rapidClears', 'rapidNightClears', 'rapidPerfect', 'nightClears', 'raftClears', 'comboBest']) assert.match(e, new RegExp(k), k);
  for (const c of ['course: boat.course', 'boat_id: boat.boatId', 'loadout:', 'skill_used:', 'combo_max:', 'near_miss:', 'mats:', 'course_v: COURSE_V']) assert.ok(e.includes(c), c);
  for (const p of ['boat_id', 'course']) assert.match(call(e, 'boat_end'), new RegExp(`${p}:`), p);
  assert.match(e, /bestRapid/);
});

test('unlockBoatNow: 코인 원장·GA4', () => {
  const u = fn('unlockBoatNow');
  assert.match(u, /unlockBoat\(/);
  assert.match(u, /logEcon\('boat_unlock'/);
  assert.match(call(u, 'boat_unlock'), /boat_id:/);
});

test('game.js: wantSkill 접근자·Input 훅·스킬 키', () => {
  assert.match(G, /let wantSkill = false;/);
  assert.match(G, /get wantSkill\(\) \{ return wantSkill; \}, set wantSkill\(v\) \{ wantSkill = v; \}/);
  for (const h of ['getDock()', 'selectBoat(id)', 'selectCourse(c)', 'unlockBoat(id)', 'boatSkill()']) assert.ok(G.includes(h), h);
  assert.match(G, /KeyF/);
  assert.ok(!G.includes('boatShopView'));
});
