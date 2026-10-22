// tests/halloween-capes.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🦇 망토 2종 — art-bats.js export · art.js BACK 표에 등록', () => {
  const b = read('../js/cosmetics/art-bats.js');
  assert.match(b, /export function buildBatWing\(THREE, g, k, h\)/);
  assert.match(b, /export function buildBatCape\(THREE, g, k, h\)/);
  assert.doesNotMatch(b, /from '\.\/art\.js'/, '순환 import 금지');
  const a = read('../js/cosmetics/art.js');
  assert.match(a, /bat_wing:\s*\(g, k\)\s*=>\s*buildBatWing\(THREE, g, k, h\)/);
  assert.match(a, /bat_cape:\s*\(g, k\)\s*=>\s*buildBatCape\(THREE, g, k, h\)/);
});

test('🦇 탈락안(B 뾰족 짧은 망토)은 이식하지 않는다', () => {
  assert.doesNotMatch(read('../js/cosmetics/art-bats.js'), /톱니|jagged|serrated/i);
});

test('🐻🐼 망토 천이 어깨 몸통을 비켜 간다 — capeClearR 은 몸 타원체 둘레보다 바깥', async () => {
  const { capeClearR } = await import('../js/cosmetics/art-bats.js');
  for (const k of [{ R: 0.63, bs: [1.08, 1.00, 1.06] }, { R: 0.50, bs: [1.02, 0.94, 1.02] }]) {
    for (let y = -0.29 * k.R; y < 0.6 * k.R; y += 0.05 * k.R) {
      for (let th = -Math.PI * 0.53; th <= Math.PI * 0.53; th += 0.1) {
        const r = capeClearR(k, th, y), x = Math.sin(th) * r, z = Math.cos(th) * r;
        const ey = (y + k.R * 0.30) / (k.R * k.bs[1]);
        const inside = (x / (k.R * k.bs[0])) ** 2 + (z / (k.R * k.bs[2])) ** 2 + ey * ey;
        assert.ok(inside >= 1, `몸 안쪽 R=${k.R} y=${y.toFixed(2)} th=${th.toFixed(2)} → ${inside.toFixed(3)}`);
      }
    }
  }
});

test('🐻🐼 일반 망토·박쥐 망토 둘 다 capeClearR 로 천 반지름을 받친다', () => {
  assert.match(read('../js/cosmetics/art-bats.js'), /Math\.max\(capeClearR\(K, th, y\)/);
  assert.match(read('../js/cosmetics/art.js'), /Math\.max\(capeClearR\(k, th, y\), rCloth\)/);
});

test('capeClearR — 몸 중심 높이에서 등(th=0)은 bs[2], 옆(±90°)은 bs[0] 반지름 + 여유', async () => {
  const { capeClearR } = await import('../js/cosmetics/art-bats.js');
  const k = { R: 0.63, bs: [1.08, 1.00, 1.06] }, y = -0.30 * k.R;
  assert.ok(Math.abs(capeClearR(k, 0, y, 0) - k.R * k.bs[2]) < 1e-9);
  assert.ok(Math.abs(capeClearR(k, Math.PI / 2, y, 0) - k.R * k.bs[0]) < 1e-9);
  assert.ok(Math.abs(capeClearR(k, -Math.PI / 2, y, 0.07) - k.R * k.bs[0] * 1.07) < 1e-9);
  assert.equal(capeClearR(k, 0, 0.75 * k.R), 0);
});
