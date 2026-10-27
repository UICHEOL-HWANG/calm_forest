import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildHomiStall } from '../js/forage/homi-stall-art.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const places = read('js/data/places.js');
const num = re => Number(re.exec(places)[1]);
const HOMI_STALL = { x: num(/HOMI_STALL = \{ x: (-?[\d.]+)/), z: num(/HOMI_STALL = \{ x: -?[\d.]+, z: (-?[\d.]+)/), r: num(/HOMI_STALL = \{[^}]* r: ([\d.]+)/) };
const SEA_GATE = { x: num(/SEA_GATE = new THREE\.Vector3\((-?[\d.]+)/), z: num(/SEA_GATE = new THREE\.Vector3\(-?[\d.]+, 0, (-?[\d.]+)/) };
const SEA_COVE = { x: SEA_GATE.x + 9.5, z: SEA_GATE.z - 9, r: num(/SEA_COVE = \{[^}]* r: ([\d.]+)/) };
const mat = c => new THREE.MeshStandardMaterial({ color: c });
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('the hoe stall stands on dry land in front of the sea gate', () => {
  assert.ok(d2(HOMI_STALL, SEA_COVE) > SEA_COVE.r + HOMI_STALL.r, 'not in the water');
  assert.ok(d2(HOMI_STALL, SEA_GATE) > 2.2 + HOMI_STALL.r, 'does not block the gate');
});

test('the stall model shows the three hoe tiers and the four paid skins', () => {
  const g = buildHomiStall(THREE, mat);
  const hoes = [];
  g.traverse(o => { if (o.userData?.toolId === 'homi') hoes.push(o); });
  assert.equal(hoes.length, 3 + 4 + 1);
  const box = new THREE.Box3().setFromObject(g), size = box.getSize(new THREE.Vector3());
  assert.ok(Math.max(size.x, size.z) / 2 <= HOMI_STALL.r + .3, 'collider covers the counter');
});

test('the sign hangs from the crossbar so nothing floats', () => {
  const g = buildHomiStall(THREE, mat);
  const ys = [];
  g.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && Math.abs(o.position.z + .36) < .02 && o.geometry.parameters.width > 1.8) ys.push(o.position.y); });
  const bar = Math.max(...ys);
  const posts = [];
  g.traverse(o => { if (o.isMesh && o.geometry.type === 'BoxGeometry' && o.geometry.parameters.width < .1 && o.geometry.parameters.height > 1 && Math.abs(o.position.z + .36) < .02) posts.push(o.position.y + o.geometry.parameters.height / 2); });
  assert.equal(posts.length, 2); assert.ok(posts.every(top => top >= bar), 'posts reach the crossbar');
});

test('the stall is built, solid, kept clear of trees and opens the stall menu', () => {
  const sea = read('js/spaces/sea.js'), game = read('js/game.js'), doors = read('js/spaces/doors.js'), html = read('index.html');
  assert.match(sea, /buildHomiStall\(THREE, clayMat\)/);
  assert.match(sea, /solidCircle\(HOMI_STALL\.x, HOMI_STALL\.z, HOMI_STALL\.r\)/);
  assert.match(game, /dist2D\(\{ x, z \}, HOMI_STALL\) < 3\.2/);
  assert.match(game, /dist2D\(\{ x, z \}, HOMI_STALL\) < 2\.4\) continue;/);
  assert.match(game, /if \(nearHomiStall\) \{ trackEvent\('shop_open', \{ tab: 'homi' \}\); return ui\.openHomiStall\?\.\(\); \}/);
  assert.match(doors, /\$w\.nearHomiStall = inVillage && /);
  assert.match(html, /openHomiStall\(\) \{ Input\.setAnalog\(0, 0\); openHomi\(\); \}/);
  assert.match(html, /Input\.getShopBuy\(\)\.filter\(it => !it\.homi\)/);
  assert.match(html, /Input\.setCosTab\?\.\('homi'\)/);
});

test('the mudflat hoe wears the equipped paid skin', () => {
  const mud = read('js/spaces/mudflat.js');
  assert.match(mud, /skin = homiSkinOf\(gameState\.cosmetics\), look = skinOf\(skin\) \|\| tierLook\(tier\)/);
  assert.match(mud, /look\?\.pal, look\?\.over\), skin, tier\)/);
});

test('on phones the action button shows the hoe, not a door, at the stall', () => {
  const html = read('index.html');
  const re = /doorIcon = \/\^\(([^)]+)\)\/u/.exec(html);
  assert.ok(re[1].split('|').includes('🪏'));
  assert.match(read('js/spaces/doors.js'), /prompt = '🪏 호미 노점';/);
});

test('opening the shop from the stall lands on the hoe tab even while the sprout tab is open', () => {
  const cafe = read('js/spaces/cafe.js');
  assert.match(cafe, /if \(cosTabAsked\) \{ cosTab = cosTabAsked; cosTabAsked = null; \} else if \(sproutOpen\(gameState\.cosmetics\)\) cosTab = 'sprout';/);
});
