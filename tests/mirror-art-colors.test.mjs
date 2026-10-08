import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invertColorPure } from '../js/mirror/art-color.js';

const hsl = (hex) => { const r = (hex >> 16 & 255) / 255, g = (hex >> 8 & 255) / 255, b = (hex & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn; return { s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l }; };
test('보색 — 채도 ≤ 0.56, 명도 0.44~0.73(블룸 임계 아래, 밤 배경에서 묻히지 않게)', () => {
  for (const c of [0x5fbf62, 0x3f8fd6, 0xf7f4ee, 0x222222, 0xffffff, 0xf0cd6a, 0x27506f]) {
    const o = invertColorPure(c), { s, l } = hsl(o);
    assert.ok(s <= 0.56 && l >= 0.44 && l <= 0.73, `${c.toString(16)} → ${o.toString(16)} s${s.toFixed(2)} l${l.toFixed(2)}`);
  }
  assert.notEqual(invertColorPure(0x5fbf62), 0x5fbf62);
});
