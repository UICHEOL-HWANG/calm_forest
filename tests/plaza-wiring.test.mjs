import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js 에는 광장 연결 줄만 — 로직은 js/plaza/ 에', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /plaza/i.test(l));
  assert.ok(lines.length <= 14, `game.js 에 plaza 줄이 ${lines.length}개 — 14 이하여야 한다:\n${lines.join('\n')}`);
  assert.ok(!/function\s+\w*plaza/i.test(game), 'game.js 에 plaza 함수 정의가 생겼다 — js/plaza/ 로 옮길 것');
  assert.ok(!/(const|let)\s+\w*plaza\w*\s*=\s*(\(|function|\{)/i.test(game), 'game.js 에 plaza 로직 선언이 생겼다');
});

test('game.js 연결 지점이 전부 있다', () => {
  const game = read('js/game.js');
  for (const needle of ["from './plaza/index.js'", 'initPlaza()', 'updatePlaza(dt', 'plazaSpotNow()', 'plazaScatterBlocks(',
                        'plaza: plazaDefault()', 'restorePlaza(saved.plaza)']) {
    assert.ok(game.includes(needle), `game.js 에 ${needle} 연결이 없다`);
  }
  assert.ok(read('js/spaces/doors.js').includes('plazaSpot('), 'doors.js 근접 프롬프트 연결이 없다');
});

test('시즌 전엔 지도에서 완전히 숨긴다(plazaMapVisible)', () => {
  const game = read('js/game.js');
  assert.ok(game.includes("need: 'plaza'"), 'VILLAGE_PLACES 광장 항목에 need: \'plaza\' 가 없다');
  assert.ok(game.includes('plazaMapVisible'), 'villagePlaces() 가 plazaMapVisible 을 안 쓴다');
});

test('지도 지명 좌표가 PLAZA 와 같다', () => {
  const place = read('js/game.js').match(/name: '수확제 광장', x: (-?[\d.]+), z: (-?[\d.]+)/);
  const def = read('js/data/plaza.js').match(/PLAZA = \{ x: (-?[\d.]+), z: (-?[\d.]+) \}/);
  assert.ok(place && def);
  assert.deepEqual([Number(place[1]), Number(place[2])], [Number(def[1]), Number(def[2])]);
});
