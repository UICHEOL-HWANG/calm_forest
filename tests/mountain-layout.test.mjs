import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { CLIMB_PATH, CLIMB_START, ACORNS, PLAZA, nearestOnPath } from '../js/mountain/climb.js';
import { SUMMIT_Y, slopePoint, pathY, pathHeight, terrainHeight, acornY } from '../js/mountain/terrain.js';
import { buildMountainSpace, PLAIN } from '../js/mountain/interior-art.js';
import { COURSE, centerX, COURSE_V } from '../js/mountain/course.js';
import { PHYS_V } from '../js/mountain/sled.js';
import { CAMP, summitHeight } from '../js/mountain/camp-layout.js';

const OLD_PATH_LENGTH = 117.285;
const CORRIDOR = COURSE.width / 2 + 3;
const HALF = COURSE.width / 2;
const z0 = slopePoint(0, 0).z, z1 = slopePoint(COURSE.length, 0).z;
const courseZ = z => ((z - z0) / (z1 - z0)) * COURSE.length;
const slopeY = cz => slopePoint(cz, 0).y;

function inCorridor(x, z, half = CORRIDOR) {
  const cz = courseZ(z);
  return cz >= 0 && cz <= COURSE.length && Math.abs(x - centerX(cz)) <= half;
}

function pathSamples(step = 0.5) {
  const out = [];
  for (let i = 0; i < CLIMB_PATH.length - 1; i++) {
    const a = CLIMB_PATH[i], b = CLIMB_PATH[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < n; j++) {
      const k = j / n;
      out.push({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, y: pathY(i) + (pathY(i + 1) - pathY(i)) * k });
    }
  }
  const last = CLIMB_PATH.at(-1);
  out.push({ x: last.x, z: last.z, y: pathY(CLIMB_PATH.length - 1) });
  return out;
}

const pathLength = () => CLIMB_PATH.slice(1).reduce((s, b, i) => s + Math.hypot(b.x - CLIMB_PATH[i].x, b.z - CLIMB_PATH[i].z), 0);
const summit = CLIMB_PATH.at(-1);

function pathHeightNear(p) {
  const n = nearestOnPath(p);
  const a = CLIMB_PATH[n.seg], b = CLIMB_PATH[n.seg + 1];
  const k = Math.hypot(n.x - a.x, n.z - a.z) / (Math.hypot(b.x - a.x, b.z - a.z) || 1);
  return { dist: n.dist, y: pathY(n.seg) + (pathY(n.seg + 1) - pathY(n.seg)) * k };
}

test('course data and physics versions stay at 1 and 2 and the slope mapping is unchanged', () => {
  assert.equal(COURSE_V, 1);
  assert.equal(PHYS_V, 2);
  assert.deepEqual(slopePoint(0, centerX(0)), { x: 0, y: SUMMIT_Y, z: -4 });
  assert.deepEqual(slopePoint(COURSE.length, 0), { x: 0, y: 0, z: 66 });
});

test('the climb path ends at the slope start and never enters the slope corridor before the summit', () => {
  assert.deepEqual({ x: summit.x, z: summit.z }, { x: slopePoint(0, centerX(0)).x, z: slopePoint(0, 0).z });
  for (const s of pathSamples()) {
    if (Math.hypot(s.x - summit.x, s.z - summit.z) <= 2) continue;
    assert.ok(!inCorridor(s.x, s.z), `path sample in corridor ${JSON.stringify(s)}`);
  }
});

test('the climb path goes around behind the summit', () => {
  assert.ok(CLIMB_PATH.some(p => p.z < summit.z - 8));
  assert.ok(CLIMB_PATH[0].z > z1);
});

test('the plaza sits at the slope foot and only the final 2 m of the course enter it', () => {
  const end = slopePoint(COURSE.length, centerX(COURSE.length));
  assert.ok(Math.hypot(end.x - PLAZA.x, end.z - PLAZA.z) < PLAZA.r);
  for (let cz = 0; cz <= COURSE.length; cz += 0.5) {
    const p = slopePoint(cz, centerX(cz));
    for (let s = -CORRIDOR; s <= CORRIDOR; s += 0.5) {
      const inside = Math.hypot(p.x + s - PLAZA.x, p.z - PLAZA.z) < PLAZA.r;
      if (inside) assert.ok(cz >= COURSE.length - 2, `course z ${cz} offset ${s} in plaza`);
    }
  }
});

test('path height rises monotonically from 0 at the plaza rim to the summit without jumps', () => {
  assert.equal(pathY(0), 0);
  assert.equal(pathY(CLIMB_PATH.length - 1), SUMMIT_Y);
  assert.ok(Math.abs(Math.hypot(CLIMB_PATH[0].x - PLAZA.x, CLIMB_PATH[0].z - PLAZA.z) - PLAZA.r) <= 0.05);
  const s = pathSamples();
  for (let i = 1; i < s.length; i++) {
    assert.ok(s[i].y >= s[i - 1].y, `y drops at ${i}`);
    assert.ok(s[i].y - s[i - 1].y < 0.2, `y jumps at ${i}`);
  }
});

test('terrain matches the path, the slope centre line and the plaza', () => {
  for (const s of pathSamples()) assert.ok(Math.abs(terrainHeight(s.x, s.z) - s.y) <= 0.3, `path ${JSON.stringify(s)} -> ${terrainHeight(s.x, s.z)}`);
  for (let cz = 0; cz <= COURSE.length; cz += 5) {
    const p = slopePoint(cz, centerX(cz));
    assert.ok(Math.abs(terrainHeight(p.x, p.z) - p.y) <= 0.3, `slope ${cz} -> ${terrainHeight(p.x, p.z)} vs ${p.y}`);
  }
  for (let r = 0; r < PLAZA.r; r += 1) {
    for (let a = 0; a < 16; a++) {
      const t = (a / 16) * Math.PI * 2;
      assert.equal(terrainHeight(PLAZA.x + Math.cos(t) * r, PLAZA.z + Math.sin(t) * r), 0);
    }
  }
});

test('no terrain walls along the slope edges', () => {
  for (let cz = 0; cz <= COURSE.length; cz += 5) {
    for (const side of [-1, 1]) {
      const p = slopePoint(cz, centerX(cz) + side * HALF);
      assert.ok(Math.abs(terrainHeight(p.x, p.z) - p.y) <= 0.5, `edge ${cz}/${side} -> ${terrainHeight(p.x, p.z)} vs ${p.y}`);
    }
  }
});

test('terrain never rises above the path band or the slope corridor', () => {
  for (let x = -70; x <= 70; x += 1) {
    for (let z = -70; z <= 90; z += 1) {
      const h = terrainHeight(x, z);
      const near = pathHeightNear({ x, z });
      if (near.dist <= 1.5) assert.ok(h <= near.y + 0.3, `path band (${x},${z}) ${h} > ${near.y}`);
      if (inCorridor(x, z)) assert.ok(h <= slopeY(courseZ(z)) + 0.3, `corridor (${x},${z}) ${h} > ${slopeY(courseZ(z))}`);
    }
  }
});

test('terrain reads as a peak that falls to the ground at the space edge', () => {
  assert.ok(Math.abs(terrainHeight(summit.x, summit.z) - SUMMIT_Y) <= 0.3);
  for (let a = 0; a < 24; a++) {
    const t = (a / 24) * Math.PI * 2;
    assert.equal(terrainHeight(summit.x + Math.cos(t) * 90, summit.z + Math.sin(t) * 90), 0);
    assert.ok(terrainHeight(summit.x + Math.cos(t) * 20, summit.z + Math.sin(t) * 20) < SUMMIT_Y);
  }
});

test('climb start is away from the plaza centre where a finished run lands', () => {
  assert.ok(Math.hypot(CLIMB_START.x - PLAZA.x, CLIMB_START.z - PLAZA.z) >= 4);
});

test('the new path is within 25% of the old length', () => {
  const len = pathLength();
  assert.ok(Math.abs(len - OLD_PATH_LENGTH) / OLD_PATH_LENGTH <= 0.25, String(len));
});

test('acorns stay out of the slope corridor and sit on the path height near the ground', () => {
  for (let i = 0; i < ACORNS.length; i++) {
    const a = ACORNS[i];
    assert.ok(!inCorridor(a.x, a.z), JSON.stringify(a));
    const near = pathHeightNear(a);
    assert.ok(Math.abs(acornY(i) - (near.y + 0.5)) < 1e-9, `acorn ${i} y`);
    assert.ok(Math.abs(terrainHeight(a.x, a.z) - near.y) <= 0.5, `acorn ${i} ground ${terrainHeight(a.x, a.z)} vs ${near.y}`);
  }
});

const spaceSrc = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');

test('the exit sits inside the plaza, south of its centre', () => {
  const m = spaceSrc.match(/MOUNTAIN_EXIT_LOCAL = \{ x: (-?[\d.]+), z: (-?[\d.]+) \}/);
  assert.ok(m);
  const exit = { x: +m[1], z: +m[2] };
  assert.ok(Math.hypot(exit.x - PLAZA.x, exit.z - PLAZA.z) < PLAZA.r - 0.5);
  assert.ok(exit.z > PLAZA.z + 4);
  assert.ok(Math.hypot(exit.x - CLIMB_START.x, exit.z - CLIMB_START.z) > 4);
});

test('the walk clamp lifts the player with the shared path height', () => {
  assert.match(spaceSrc, /p\.y = summitHeight\(c\);/);
  assert.equal(summitHeight({ yard: true, onPath: false, seg: 0, k: 0 }), CAMP.deck.y);
  assert.equal(summitHeight({ yard: false, onPath: true, seg: 2, k: 0.5 }), pathHeight(2, 0.5));
  assert.equal(summitHeight({ yard: false, onPath: false, seg: 0, k: 0 }), 0);
  assert.equal(pathHeight(2, 0.5), (pathY(2) + pathY(3)) / 2);
});

test('the space ground is one heightfield mesh built from terrainHeight within the call budget', () => {
  const g = buildMountainSpace(THREE);
  const meshes = [];
  g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.ok(meshes.length <= 60, String(meshes.length));
  const ground = g.userData.ground;
  assert.ok(ground?.isMesh && meshes.includes(ground));
  const pos = ground.geometry.attributes.position;
  assert.ok(ground.geometry.attributes.color);
  const field = pos.count - PLAIN.segments * 3;
  for (let i = 0; i < field; i += 97) {
    assert.ok(Math.abs(pos.getY(i) - terrainHeight(pos.getX(i), pos.getZ(i))) < 1e-4, `vertex ${i}`);
  }
  let maxR = 0;
  for (let i = 0; i < field; i++) maxR = Math.max(maxR, Math.hypot(pos.getX(i) - summit.x, pos.getZ(i) - summit.z));
  assert.ok(maxR >= 70);
});
