import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { gameSource } from './helpers/game-source.mjs';
import { SUMMIT_Y, slopePoint, terrainHeight, cloudPuffs } from '../js/mountain/terrain.js';
import { buildMountainSpace, INTERIOR_DRAW_BUDGET } from '../js/mountain/interior-art.js';
import { MOUNTAIN_THEMES } from '../js/mountain/theme.js';
import { COURSE, centerX } from '../js/mountain/course.js';
import { CLIMB_PATH, nearestOnPath } from '../js/mountain/climb.js';
import { SLED_CAM, SLED_SEAT, facingYaw, sledYaw, sledCamTargets, sledPitch } from '../js/mountain/sled-view.js';
import { buildSledMesh } from '../js/mountain/sled-art.js';

const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));
const meshesOf = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const drawablesOf = g => { const out = []; g.traverse(o => { if (o.isMesh || o.isPoints) out.push(o); }); return out; };
const VFOV = 42;
const PATH_BAND = 1.5;
const CLEAR = 3;

const slopeCentre = Array.from({ length: 331 }, (_, i) => slopePoint(i, centerX(i)));
const slopeCentreDist = (x, z) => Math.min(...slopeCentre.map(p => Math.hypot(x - p.x, z - p.z)));
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const pitchOf = v => Math.atan2(v.y, Math.hypot(v.x, v.z));
const deg = r => (r * 180) / Math.PI;

test('the game faces the avatar along atan2(dx, dz) when it walks', () => {
  assert.match(gameSource(), /player\.rotation\.y = lerpAngle\(player\.rotation\.y, Math\.atan2\(mx, mz\), 0\.2\)/);
  assert.equal(facingYaw(0, 1), 0);
  assert.equal(facingYaw(1, 0), Math.PI / 2);
  assert.equal(facingYaw(0, -1), Math.PI);
});

test('the sledding avatar faces downhill (+z) and leans a little toward the steer side', () => {
  const dir = yaw => ({ x: Math.sin(yaw), z: Math.cos(yaw) });
  assert.equal(sledYaw(0), facingYaw(0, 1));
  assert.ok(dir(sledYaw(0)).z > 0.999);
  assert.ok(sledYaw(1) > 0.1 && sledYaw(1) < 0.5);
  assert.equal(sledYaw(-1), -sledYaw(1));
  const down = sub(slopePoint(COURSE.length, 0), slopePoint(0, 0));
  assert.ok(down.z > 0 && down.y < 0);
});

test('rideSlope uses the convention helper, not a raw steer angle', () => {
  const ride = between(src, 'function rideSlope', '\n}');
  assert.match(ride, /run\.yaw \+= \(sledYaw\(lean\) - run\.yaw\)/);
  assert.match(ride, /player\.rotation\.y = run\.yaw;/);
  assert.doesNotMatch(ride, /steer \* 0\.3/);
  assert.match(readFileSync(new URL('../js/mountain/sled-view.js', import.meta.url), 'utf8'), /facingYaw\(/);
});

test('the sled camera sits behind and above the sled and looks downhill', () => {
  for (const k of ['up', 'back', 'lookAhead', 'lookDrop']) assert.equal(typeof SLED_CAM[k], 'number', k);
  for (const z of [0, 80, 165, 250, COURSE.length]) {
    const x = centerX(z);
    const p = slopePoint(z, x);
    const { pos, look } = sledCamTargets({ x, z });
    assert.ok(pos.z < p.z, `behind at ${z}`);
    assert.ok(pos.y > p.y, `above at ${z}`);
    assert.ok(look.z > p.z, `looks ahead at ${z}`);
    assert.ok(pos.y > terrainHeight(pos.x, pos.z) + 1, `camera clears the ground at ${z}`);
  }
  assert.match(between(src, 'function sledCamera', '\n}'), /sledCamTargets\(/);
});

test('the sled camera keeps the avatar in the lower third and the next three flags in view', () => {
  const half = (VFOV / 2) * Math.PI / 180;
  for (const f of [0, 4, 8]) {
    const s = { x: COURSE.flags[f].x, z: COURSE.flags[f].z - 12 };
    const { pos, look } = sledCamTargets(s);
    const p = slopePoint(s.z, s.x);
    const centre = pitchOf(sub(look, pos));
    const avatar = pitchOf(sub({ x: p.x, y: p.y + 0.9, z: p.z }, pos));
    const below = Math.tan(centre - avatar) / Math.tan(half);
    assert.ok(below > 0.25 && below < 0.65, `avatar screen offset ${below.toFixed(2)} at flag ${f}`);
    for (const g of COURSE.flags.slice(f, f + 3)) {
      const q = slopePoint(g.z, g.x);
      const off = pitchOf(sub({ x: q.x, y: q.y + 0.8, z: q.z }, pos)) - centre;
      assert.ok(Math.abs(off) < half * 0.9, `flag at ${g.z} ${deg(off).toFixed(1)}deg`);
    }
  }
});

test('the in-space cloud band is one fog-free InstancedMesh of every puff', () => {
  const g = buildMountainSpace(THREE);
  const clouds = g.userData.clouds;
  assert.ok(clouds?.isInstancedMesh);
  assert.equal(clouds.material.fog, false);
  assert.equal(clouds.count, cloudPuffs().length);
  assert.ok(cloudPuffs().length >= 30);
  assert.equal(meshesOf(g).filter(m => m === clouds).length, 1);
});

test('cloud puffs ring the mountain at mid-slope height off every playable route', () => {
  const puffs = cloudPuffs();
  for (const [x, y, z] of puffs) {
    assert.ok(y >= SUMMIT_Y * 0.25 && y <= SUMMIT_Y * 0.6, `height ${y}`);
    assert.ok(slopeCentreDist(x, z) >= COURSE.width / 2 + CLEAR, `slope at ${x.toFixed(1)},${z.toFixed(1)}`);
    assert.ok(nearestOnPath({ x, z }).dist >= PATH_BAND + CLEAR, `path at ${x.toFixed(1)},${z.toFixed(1)}`);
    assert.ok(y > terrainHeight(x, z), `buried at ${x.toFixed(1)},${z.toFixed(1)}`);
  }
  const summit = CLIMB_PATH.at(-1);
  const angles = puffs.map(([x, , z]) => Math.atan2(z - summit.z, x - summit.x));
  assert.ok(angles.some(a => a > 0.2 && a < 1.3), 'puffs beside the run on the +x side');
  assert.ok(angles.some(a => a > 1.85 && a < 2.95), 'puffs beside the run on the -x side');
});

function puffsInView(s) {
  const { pos, look } = sledCamTargets(s);
  const cam = new THREE.PerspectiveCamera(VFOV, 16 / 9, 0.1, 200);
  cam.position.set(pos.x, pos.y, pos.z);
  cam.lookAt(look.x, look.y, look.z);
  cam.updateMatrixWorld();
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  return cloudPuffs().filter(([x, y, z]) => frustum.containsPoint(new THREE.Vector3(x, y, z))).length;
}

test('cloud puffs beside and below the run stay in the sled camera view during the descent', () => {
  for (const z of [0, 60, 120, 180]) {
    const n = puffsInView({ x: centerX(z), z });
    assert.ok(n >= 6, `${n} puffs in view at course z ${z}`);
  }
});

test('the sled is one hidden mesh in the space group', () => {
  const sled = buildSledMesh(THREE);
  assert.ok(sled.isMesh && !sled.isInstancedMesh);
  assert.equal(sled.children.length, 0);
  assert.equal(sled.visible, false);
  assert.ok(sled.geometry.getAttribute('color'));
  const g = buildMountainSpace(THREE);
  assert.ok(g.userData.sled?.isMesh);
  assert.equal(g.userData.sled.visible, false);
  assert.ok(SLED_SEAT > 0 && SLED_SEAT < 0.5);
  assert.ok(sledPitch() > 0.3 && sledPitch() < 0.5);
});

test('the space stays within its draw-call budget', () => {
  const ds = drawablesOf(buildMountainSpace(THREE));
  assert.ok(ds.length <= INTERIOR_DRAW_BUDGET, `${ds.length} drawables`);
});

test('snowballs and rocks share one merged mesh that keeps both colours', () => {
  const g = buildMountainSpace(THREE);
  const obs = g.userData.obstacles;
  assert.ok(obs?.isMesh && !obs.isInstancedMesh);
  const col = obs.geometry.getAttribute('color');
  const hexes = new Set();
  const c = new THREE.Color();
  for (let i = 0; i < col.count; i += 3) hexes.add(c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).getHex());
  assert.deepEqual([...hexes].sort(), [MOUNTAIN_THEMES.day.rock, MOUNTAIN_THEMES.day.snow].sort());
});

test('the sled shows for countdown and sled and hides when the run closes', () => {
  assert.match(between(src, 'function startSled', '\n}'), /showSled\(true\)/);
  assert.match(between(src, 'function showFinish', '\n}'), /showSled\(false\)/);
  assert.match(between(src, 'function closeRun', '\n}'), /showSled\(false\)/);
  assert.match(between(src, 'function rideSlope', '\n}'), /placeSled\(/);
});
