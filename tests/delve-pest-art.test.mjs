import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const KINDS = ['axolotl', 'crab', 'bat', 'grub', 'moth', 'mole', 'dormouse', 'roller'];
const STATES = ['idle', 'hide', 'lurk', 'approach', 'carry', 'flee', 'eat', 'sleep', 'gone', 'away', 'lost', 'doze', 'mimic', 'feint'];
const FILES = ['pest-art.js', 'pest-art-kit.js', 'pest-art-thieves.js', 'pest-art-new.js'];

async function load() {
  const { register } = await import('node:module');
  const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
  register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);
  return { THREE: await import('three'), art: await import('../js/delve/pest-art.js') };
}

const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
function visibleBox(THREE, g) {
  g.updateMatrixWorld(true);
  const box = new THREE.Box3();
  g.traverse(o => { if (o.isMesh && shown(o)) box.expandByObject(o); });
  return box;
}
function triangles(g) {
  let n = 0;
  g.traverse(o => { if (o.isMesh) { const geo = o.geometry; n += (geo.index ? geo.index.count : geo.attributes.position.count) / 3; } });
  return n;
}

test('every thief builds at size 2.2 and takes every state without NaN', async () => {
  const { THREE, art } = await load();
  for (const kind of KINDS) {
    const p = art.makePest(kind, { submerged: kind === 'axolotl' });
    assert.ok(p.g.isGroup, kind);
    assert.equal(p.g.scale.x, 2.2, kind);
    assert.ok(p.holdAt.isVector3, kind);
    assert.equal(typeof p.hover, 'number', kind);
    for (const s of STATES) for (const t of [0, 0.37, 2.5]) {
      p.pose(s, t);
      assert.ok(Number.isFinite(p.hover), `${kind} ${s}`);
      const box = visibleBox(THREE, p.g);
      assert.ok(box.isEmpty() || [box.min.x, box.min.y, box.max.x, box.max.y].every(Number.isFinite), `${kind} ${s}`);
    }
  }
});

test('flyers hover and walkers stand on the floor', async () => {
  const { art } = await load();
  for (const kind of ['bat', 'moth']) { const p = art.makePest(kind); p.pose('lurk', 0); assert.ok(p.hover > 1, kind); }
  for (const kind of ['axolotl', 'crab', 'grub', 'mole', 'dormouse', 'roller']) { const p = art.makePest(kind); p.pose('lurk', 0); assert.equal(p.hover, 0, kind); }
});

test('the roller mimic looks like an ore chunk in size', async () => {
  const { THREE, art } = await load();
  const p = art.makePest('roller'); p.pose('mimic', 0);
  const a = visibleBox(THREE, p.g).getSize(new THREE.Vector3()), b = visibleBox(THREE, art.makeOreChunk()).getSize(new THREE.Vector3());
  assert.ok(Math.abs(a.x - b.x) / b.x < 0.35 && Math.abs(a.z - b.z) / b.z < 0.35, `${a.toArray()} vs ${b.toArray()}`);
  p.pose('lurk', 0);
  assert.ok(visibleBox(THREE, p.g).getSize(new THREE.Vector3()).z > b.z * 2);
});

test('the mole hides underground while approaching and the moth flies off when away', async () => {
  const { THREE, art } = await load();
  const mole = art.makePest('mole');
  mole.pose('lurk', 0); const up = visibleBox(THREE, mole.g).max.y;
  mole.pose('approach', 0); const under = visibleBox(THREE, mole.g).max.y;
  assert.ok(under < up * 0.5, `${under} vs ${up}`);
  const moth = art.makePest('moth');
  moth.pose('lurk', 0); const h = moth.hover;
  moth.pose('away', 0); assert.ok(moth.hover > h);
});

test('triangle budget stays mobile friendly', async () => {
  const { art } = await load();
  for (const kind of KINDS) assert.ok(triangles(art.makePest(kind).g) < 6000, kind);
  assert.ok(triangles(art.makeMoleHole()) < 600);
  assert.ok(triangles(art.makeGlowCrystal()) < 600);
});

test('pest art keeps its old exports and avoids newer canvas APIs', async () => {
  const { art } = await load();
  for (const name of ['makeOreChunk', 'makePuddle', 'makeBurrow', 'makeTrail', 'makeRing', 'makeBait', 'emojiBubble', 'makeShaft', 'makeLadderUp', 'makeRock', 'makeLift', 'makePest', 'makeMoleHole', 'makeGlowCrystal']) assert.equal(typeof art[name], 'function', name);
  for (const f of FILES) {
    const src = readFileSync(new URL(`../js/delve/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /roundRect/, f);
    assert.doesNotMatch(src, /^\s*\/\//m, f);
  }
});
