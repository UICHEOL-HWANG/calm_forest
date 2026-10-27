import { HOE_DEFAULT, HOE_FACE, buildHoe } from './hoe-art.js';
import { dressHoe, skinOf, tierLook } from './hoe-skins.js';

const WOOD = 0x9a7350, WOOD_DARK = 0x6a4a30, SEA = 0x3d8fb0, FOAM = 0xf4f1e6, ROPE = 0xd8c08a, GOLD = 0xe7c25a;

function box(THREE, mat, w, h, d, x, y, z, color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function hoeOn(THREE, mat, { skin = null, tier = 0, scale = 2.2 }) {
  const look = skin ? skinOf(skin) : tierLook(tier);
  const hoe = buildHoe(THREE, mat, HOE_DEFAULT, HOE_FACE, look?.pal || null, look?.over || null);
  dressHoe(THREE, mat, hoe, skin, tier);
  hoe.scale.setScalar(scale);
  return hoe;
}

function awning(THREE, mat, g) {
  for (let i = 0; i < 6; i++) {
    const s = box(THREE, mat, .36, .05, 1.15, -0.9 + .18 + i * .36, 2.08, .1, i % 2 ? FOAM : SEA);
    s.rotation.x = -.26; g.add(s);
  }
  for (let i = 0; i < 6; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(.1, .18, 3), mat(i % 2 ? FOAM : SEA));
    f.position.set(-0.9 + .18 + i * .36, 1.86, .7); f.rotation.x = Math.PI; g.add(f);
  }
}

function sign(THREE, mat, g) {
  g.add(box(THREE, mat, 1.86, .08, .1, 0, 2.7, -.36, WOOD_DARK));
  [-.36, .36].forEach(x => g.add(box(THREE, mat, .03, .1, .03, x, 2.62, -.36, ROPE)));
  g.add(box(THREE, mat, .94, .46, .04, 0, 2.38, -.37, WOOD_DARK));
  g.add(box(THREE, mat, .84, .36, .04, 0, 2.38, -.34, FOAM));
  const badge = hoeOn(THREE, mat, { tier: 2, scale: 1.25 });
  badge.rotation.set(0, 0, -1.1); badge.position.set(-.16, 2.3, -.3); g.add(badge);
}

function counter(THREE, mat, g) {
  g.add(box(THREE, mat, 1.9, .08, .72, 0, .86, .18, WOOD));
  g.add(box(THREE, mat, 1.8, .8, .6, 0, .42, .18, WOOD_DARK));
  g.add(box(THREE, mat, 1.82, .1, .62, 0, .62, .19, SEA));
  [-0.88, .88].forEach(x => {
    g.add(box(THREE, mat, .09, 2.74, .09, x, 1.37, -.36, WOOD));
    g.add(box(THREE, mat, .09, 1.82, .09, x, .91, .55, WOOD));
  });
}

function rack(THREE, mat, g) {
  g.add(box(THREE, mat, 1.5, .07, .07, 0, 1.55, -.32, WOOD_DARK));
  [0, 1, 2].forEach((tier, i) => {
    const h = hoeOn(THREE, mat, { tier });
    h.rotation.set(0, 0, Math.PI); h.position.set(-.5 + i * .5, 1.55, -.26); g.add(h);
  });
}

function showcase(THREE, mat, g) {
  g.add(box(THREE, mat, .9, .05, .34, .38, .93, .22, FOAM));
  g.add(box(THREE, mat, .92, .03, .36, .38, .955, .22, GOLD));
  ['najeon', 'coral', 'whale', 'mudset'].forEach((id, i) => {
    const h = hoeOn(THREE, mat, { skin: id, scale: 1.7 });
    h.rotation.set(-.35, 0, -.25);
    h.position.set(.1 + i * .19, 1.02, .22); g.add(h);
  });
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.07), mat(0x8fe3ff, false));
  gem.position.set(.38, 1.42, .3); g.add(gem);
}

function goods(THREE, mat, g) {
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(.22, .17, .2, 12), mat(ROPE));
  basket.position.set(-.55, 1, .25); g.add(basket);
  [0xe9dcc2, 0xc78a5a, 0xf2b8a2].forEach((c, i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), mat(c));
    s.scale.set(1, .5, .85); s.position.set(-.62 + i * .08, 1.12, .22 + (i % 2) * .06); g.add(s);
  });
}

export function buildHomiStall(THREE, mat) {
  const g = new THREE.Group();
  counter(THREE, mat, g);
  awning(THREE, mat, g);
  rack(THREE, mat, g);
  showcase(THREE, mat, g);
  goods(THREE, mat, g);
  sign(THREE, mat, g);
  return g;
}
