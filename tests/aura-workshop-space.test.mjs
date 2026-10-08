import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const SRC = gameSource();
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('공방 좌표는 계곡 입구 쪽(마을에서 보이는 북쪽 가장자리, 나무 링 안쪽)', () => {
  const m = SRC.match(/LIGHT_WORKSHOP = new THREE\.Vector3\(([-\d.]+), 0, ([-\d.]+)\)/);
  assert.ok(m, 'places.js 에 LIGHT_WORKSHOP');
  const d = Math.hypot(Number(m[1]) - 7, Number(m[2]) - 26);
  assert.ok(d >= 4 && d <= 6.5, `계곡 중심에서 ${d}`);
  assert.ok(Number(m[2]) < 26, '마을 쪽(북쪽) — 남쪽 끝은 카메라 반대편이라 나무에 가린다');
});

test('공방 앞에선 반딧불이 구역 안내가 비킨다(밤에 안내 두 줄 겹침 방지)', () => {
  assert.match(SRC, /if \(nearGlade && !nearLightWorkshop\)/);
});

test('공방은 지어지고, 가까우면 프롬프트, 액션이면 모달', () => {
  assert.match(SRC, /buildLightWorkshop\(\);/);
  assert.match(SRC, /nearLightWorkshop = /);
  assert.match(SRC, /if \(nearLightWorkshop\) \{[\s\S]{0,200}ui\.openLightWorkshop\?\.\(\)/);
  assert.match(SRC, /nearCosShop \|\| nearLightWorkshop/, '월드 액션 억제 목록에도 들어간다');
  assert.match(HTML, /openLightWorkshop\(\) \{/);
});

test('공방 메시는 mergeGeos 로 병합해 드로우콜을 아낀다', () => {
  const src = readFileSync(new URL('../js/spaces/light-workshop.js', import.meta.url), 'utf8');
  assert.match(src, /mergeGeos\(/);
});

test('🧱 공방 외관 C안 — 벽돌·기와 오두막은 별도 모듈, THREE 는 인자로 받는다', () => {
  const hut = readFileSync(new URL('../js/spaces/light-workshop-hut.js', import.meta.url), 'utf8');
  assert.doesNotMatch(hut, /^import .*from 'three'/m, 'node 테스트 — THREE 는 인자로');
  assert.match(hut, /export function buildHutGeos\(THREE\)/);
  assert.match(hut, /export function buildCartGeos\(THREE, /);
  for (const part of ['brickWall', '빗살', '십자', '디딤판', '기와']) assert.match(hut, new RegExp(part), part);
});

test('🧱 공방은 메시를 병합해 드로우콜 예산(12) 안 — 오두막 1·불빛 1·주인 3·이름표·팻말', () => {
  const src = readFileSync(new URL('../js/spaces/light-workshop.js', import.meta.url), 'utf8');
  assert.match(src, /buildHutGeos\(THREE\)/);
  assert.match(src, /buildCartGeos\(THREE, /);
  const fn = src.slice(src.indexOf('export function buildLightWorkshop'));
  const meshes = (fn.match(/new THREE\.Mesh\(/g) || []).length;
  assert.equal(meshes, 2, '오두막(정점색 병합) 1 + 창·문 불빛 1');
  assert.doesNotMatch(fn, /ConeGeometry/, '옛 사각뿔 지붕은 치운다');
});
