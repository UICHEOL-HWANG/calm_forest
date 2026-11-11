import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createNav } from '../js/guide/path.js';
import { VILLAGE_WALL, segHitsBox } from '../js/mirror/layout.js';
import { STOP_SOLIDS } from '../js/restaurant/nav-solids.js';

const DOOR = { x: 12, z: 23.6 };

function walk(nav, from, to) {
  const legs = [];
  let me = from;
  for (let i = 0; i < 12; i++) {
    const next = nav.route(me, to);
    legs.push([me, next]);
    if (Math.hypot(next.x - to.x, next.z - to.z) < 1e-6) break;
    me = next;
  }
  return legs;
}

test('the route to the restaurant door goes around the mirror stop and its carriage', () => {
  const nav = createNav([...STOP_SOLIDS], () => true, { pad: 1.3, clear: 0.3 });
  for (const from of [{ x: 16.8, z: 15.0 }, { x: 24.3, z: 8.2 }, { x: 20.5, z: 14.2 }]) {
    for (const [a, b] of walk(nav, from, DOOR)) {
      for (const box of VILLAGE_WALL) assert.ok(!segHitsBox(a, b, box), `${JSON.stringify(a)} -> ${JSON.stringify(b)} crosses the stop`);
    }
  }
});

test('the restaurant village nav includes the stop solids', () => {
  const src = readFileSync(new URL('../js/spaces/restaurant.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ STOP_SOLIDS \} from '\.\.\/restaurant\/nav-solids\.js';/);
  assert.match(src, /\.\.\.CAFE_SOLIDS, \.\.\.STOP_SOLIDS\]/);
});
