import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { kayakStroke, kayakStun, KAYAK } from '../js/boat/kayak-pose.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('두 팔은 번갈아 올라가고 몸은 젓는 쪽으로 비튼다', () => {
  for (const t of [0.1, 0.4, 0.9, 1.3]) {
    const p = kayakStroke(t, false);
    assert.ok(Math.abs((p.R[0] + p.L[0]) / 2 - KAYAK.armX) < 1e-9);
    assert.equal(p.R[2], KAYAK.spread);
    assert.equal(p.L[2], -KAYAK.spread);
    assert.equal(Math.sign(p.twist), Math.sign(p.R[0] - KAYAK.armX));
  }
  const top = kayakStroke(Math.PI / 2 / KAYAK.w, false);
  assert.ok(Math.abs(top.twist - KAYAK.twist) < 1e-9);
});

test('스퍼트 땐 두 배 빠르게 젓는다', () => {
  const t = 0.37;
  assert.deepEqual(kayakStroke(t, true), kayakStroke(t * 2, false));
});

test('부딪히면 두 팔을 번쩍 들고 몸 비틀기를 푼다', () => {
  const hit = kayakStun(1), calm = kayakStun(0);
  assert.ok(hit.R[0] < calm.R[0] && hit.L[0] < calm.L[0]);
  assert.equal(hit.twist, 0);
  assert.equal(calm.R[0], KAYAK.armX);
});

test('침몰·충돌·젓기 모두 노를 손에 붙여 둔다', () => {
  const r = read('js/spaces/river.js');
  const i = r.indexOf('export function updateBoatRun(');
  const body = r.slice(i, r.indexOf('\n}\n', i));
  assert.ok((body.match(/holdPaddle\(\)/g) || []).length >= 2);
  assert.match(body, /poseArms\(kayakStun\(k\)\)/);
});

test('물방울 클래식 노: 청록 물방울 날·크림 무늬·금테·빨간 손잡이', () => {
  const src = read('js/boat/kayak-paddle.js');
  assert.match(src, /export function makeKayakPaddle\(/);
  assert.match(src, /export function placeKayakPaddle\(/);
  for (const c of ['0x3fb3c2', '0xfff4dc', '0xe2b04a', '0xb2453e', '0xf3e6cc']) assert.ok(src.includes(c), c);
  assert.ok((src.match(/new THREE\.MeshStandardMaterial/g) || []).length <= 5);
});

test('나룻배는 배에 붙은 노 대신 캐릭터가 카약 노를 쥔다', () => {
  const m = read('js/boat/models.js');
  const i = m.indexOf('function ferryModel(');
  const body = m.slice(i, m.indexOf('\n}\n', i));
  assert.ok(!body.includes('makeOar('));
  assert.match(body, /g\.userData\.paddle = makeKayakPaddle\(\)/);
  const r = read('js/spaces/river.js');
  assert.match(r, /playerArms/);
  assert.match(r, /kayakStroke\(/);
  assert.match(r, /placeKayakPaddle\([^)]*boatView === 'first'\)/);
});

test('배 위에선 우산을 펴지 않는다(왼팔이 노를 쥔다)', () => {
  const g = read('js/game.js');
  const i = g.indexOf('function updateUmbrella(');
  const body = g.slice(i, g.indexOf('\n}\n', i));
  assert.match(body, /boat\.active/);
});
