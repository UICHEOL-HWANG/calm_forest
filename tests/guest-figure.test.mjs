import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const three = new URL('../vendor/three/three.module.js', import.meta.url).href;
const dir = mkdtempSync(join(tmpdir(), 'guest-'));
const file = join(dir, 'guest-figure.mjs');
writeFileSync(file, read('js/guest-figure.js').replace("from 'three'", `from '${three}'`));
const { buildGuestFigure, GUEST_SHAPE } = await import(pathToFileURL(file).href);
const THREE = await import(three);
const { CAFE_GUESTS } = { CAFE_GUESTS: [
  { id: 'guest_deer', color: 0xd9a86a, hat: 0x7a5f3c, ear: 'round', acc: 'antler' },
  { id: 'guest_hedgehog', color: 0xa08fb8, hat: 0x5a4d6a, ear: 'tiny', acc: 'spike' },
  { id: 'guest_turtle', color: 0x4fa890, hat: 0xe8a07a, ear: 'tiny', acc: 'beanie' },
  { id: 'guest_raccoon', color: 0x7d8794, hat: 0xc96a5a, ear: 'point', acc: 'scarf' },
] };

test('C안 치비 비율: 머리가 몸보다 크다', () => {
  assert.ok(GUEST_SHAPE.head > GUEST_SHAPE.body);
});

test('손님 하나는 재질별로 합쳐 메시 10개 이하, 매끈한 구(각진 다면체 아님)', () => {
  for (const d of CAFE_GUESTS) {
    const g = buildGuestFigure(d);
    const meshes = g.children.filter(c => c.isMesh);
    assert.ok(meshes.length > 0 && meshes.length <= 10, `${d.id}: ${meshes.length}`);
    assert.ok(meshes.every(m => !m.material.flatShading));
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(box.min.y >= -0.01 && box.max.y < 2.2, `${d.id} 높이 ${box.max.y}`);
  }
});

test('얼굴: 흰 하이라이트와 볼터치 재질이 있다', () => {
  const g = buildGuestFigure(CAFE_GUESTS[0]);
  const colors = g.children.map(m => m.material.color.getHex());
  assert.ok(colors.includes(0xffffff));
  assert.ok(colors.includes(0xf4a7b5));
});

test('카페·식당 손님은 새 생성기를 쓴다', () => {
  const cafe = read('js/spaces/cafe.js');
  assert.match(cafe, /import \{ buildGuestFigure \} from '\.\.\/guest-figure\.js';/);
  assert.match(cafe, /const g = buildGuestFigure\(def\);/);
  assert.doesNotMatch(read('js/guest-figure.js'), /cosmetics\/trail/);
});
