import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stepLines, boostLeft, LINE_MAX } from '../js/mountain/boost-lines.js';
import { PHYS, createSled, tryBoost } from '../js/mountain/sled.js';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
const seq = () => { let i = 0; return () => ((i++ * 0.37) % 1); };

test('speed lines spawn only while boosting and fly outward', () => {
  const rnd = seq();
  const idle = stepLines([], 0.016, { active: false, diag: 400, rnd });
  assert.deepEqual(idle, []);
  const one = stepLines([], 0.016, { active: true, diag: 400, rnd });
  assert.ok(one.length > 0);
  const later = stepLines(one, 0.05, { active: false, diag: 400, rnd });
  later.forEach((l, i) => assert.ok(l.r > one[i].r));
});

test('speed lines leave the screen and never pile up', () => {
  const rnd = seq();
  let lines = [];
  for (let i = 0; i < 400; i++) lines = stepLines(lines, 0.016, { active: true, diag: 400, rnd });
  assert.ok(lines.length <= LINE_MAX);
  for (let i = 0; i < 100; i++) lines = stepLines(lines, 0.016, { active: false, diag: 400, rnd });
  assert.equal(lines.length, 0);
});

test('stepLines does not mutate its input', () => {
  const rnd = seq();
  const a = stepLines([], 0.016, { active: true, diag: 400, rnd });
  const frozen = JSON.stringify(a);
  stepLines(a, 0.05, { active: true, diag: 400, rnd });
  assert.equal(JSON.stringify(a), frozen);
});

test('the button gauge follows the boost time left', () => {
  const s = tryBoost(createSled(1));
  assert.equal(boostLeft(s), 1);
  assert.equal(boostLeft({ ...s, boostLeftMs: PHYS.boostMs / 4 }), 0.25);
  assert.equal(boostLeft(createSled(1)), 0);
});

test('sound and particles exist for the boost', () => {
  assert.match(src('sound.js'), /sledBoost\(\)/);
  assert.match(src('mountain/sled-fx.js'), /export function spawnBoostTrail/);
});

test('the hud draws the lines and a ring gauge on the boost button', () => {
  const hud = src('mountain/sled-hud.js');
  assert.match(hud, /export function showBoostFx/);
  assert.match(hud, /class="sled-lines"/);
  assert.match(hud, /conic-gradient/);
  assert.match(hud, /--boost-left/);
});

test('a boost that spends an acorn plays the sound and the burst; trail and hud run while it lasts', () => {
  const m = src('spaces/mountain.js');
  const boost = m.slice(m.indexOf('function boost()'), m.indexOf('function boost()') + 500);
  assert.match(boost, /Sound\.sledBoost\(\)/);
  assert.match(boost, /spawnSnowBurst\(/);
  assert.match(boost, /acorns/);
  const from = m.indexOf("} else if (run.phase === 'sled') {");
  const sled = m.slice(from, m.indexOf('\n  }', from + 40) + 4);
  assert.match(sled, /spawnBoostTrail\(/);
  assert.match(sled, /showBoostFx\(/);
});
