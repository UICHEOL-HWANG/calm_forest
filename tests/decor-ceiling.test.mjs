// tests/decor-ceiling.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';
import { ceilingOk } from '../js/house/surface.js';

const SRC = gameSource();
const start = SRC.indexOf('const DECOR = [');
const LINES = SRC.slice(start, SRC.indexOf('\n];', start)).split('\n');
const idOf = (l) => (l.match(/id: '(\w+)'/) || [])[1];
const numOf = (l, re) => { const m = l.match(re); return m ? Number(m[1]) : null; };

const tops = LINES.filter(l => /\btop: \{/.test(l)).map(l => ({ id: idOf(l), y: numOf(l, /top: \{ y: ([\d.]+)/) }));
const smalls = LINES.filter(l => /\bsm: true/.test(l)).map(l => ({ id: idOf(l), h: numOf(l, /\bh: ([\d.]+)/) }));
const DECOR_SCALE = Number(SRC.match(/const DECOR_SCALE = ([\d.]+)/)[1]);

test('상판 가구는 낮은 4종만이다(책장·옷장·벽난로 제외)', () => {
  assert.deepEqual(tops.map(t => t.id).sort(), ['bigtable', 'nightstand', 'stool', 'table']);
  tops.forEach(t => assert.ok(Number.isFinite(t.y), `${t.id} top.y`));
});

test('올릴 수 있는 소품(sm)은 전부 높이 h 를 가진다', () => {
  assert.ok(smalls.length >= 5);   // 화분·탁상 등불·어항·꽃병·라디오 (+ 2부의 유령 촛불)
  smalls.forEach(s => assert.ok(Number.isFinite(s.h) && s.h > 0, `${s.id} 에 h 가 없다`));
});

test('모든 상판 × 소품 조합이 천장 아래에 든다', () => {
  for (const t of tops) for (const s of smalls) {
    assert.equal(ceilingOk(t.y, s.h, DECOR_SCALE), true, `${s.id} 를 ${t.id} 위에 올리면 천장을 뚫는다`);
  }
});
