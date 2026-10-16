import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import {
  buildMountainSpace, paintInterior, followCamera, gateSpots, pineSpots, groundClass, G,
  GROUND, PLAIN, PINE_MAX, RANGE, SNOWFALL, INTERIOR_DRAW_BUDGET,
} from '../js/mountain/interior-art.js';
import { applyLook } from '../js/mountain/interior-look.js';
import { MOUNTAIN_THEMES } from '../js/mountain/theme.js';
import { COURSE } from '../js/mountain/course.js';
import { PLAZA, nearestOnPath, ACORNS } from '../js/mountain/climb.js';
import { SUMMIT_Y, slopePoint, terrainHeight, inSlopeCorridor } from '../js/mountain/terrain.js';

const drawables = g => { const out = []; g.traverse(o => { if (o.isMesh || o.isPoints) out.push(o); }); return out; };
const space = buildMountainSpace(THREE);
const ud = space.userData;
const hexes = (attr, step = 1) => {
  const c = new THREE.Color(), set = new Set();
  for (let i = 0; i < attr.count; i += step) set.add(c.setRGB(attr.getX(i), attr.getY(i), attr.getZ(i)).getHex());
  return set;
};

test('interior art modules take THREE as a parameter', () => {
  for (const f of ['interior-art', 'interior-look', 'theme', 'terrain']) {
    const src = readFileSync(new URL(`../js/mountain/${f}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from 'three'/, f);
    assert.doesNotMatch(src, /\/\/|\/\*/, `${f} has a comment`);
  }
});

test('the interior is at most its draw budget of drawables while sledding', () => {
  const ds = drawables(space);
  assert.ok(INTERIOR_DRAW_BUDGET <= 9);
  assert.ok(ds.length <= INTERIOR_DRAW_BUDGET, `${ds.length} drawables`);
  for (const k of ['ground', 'ranges', 'pines', 'gates', 'obstacles', 'acorns', 'clouds', 'sled', 'snowfall']) {
    assert.ok(ds.includes(ud[k]), k);
  }
});

test('old strips, plaza disc and cone flags are gone', () => {
  for (const m of drawables(space)) {
    assert.ok(!(m.geometry.type === 'ConeGeometry'), 'cone flags');
    assert.ok(!(m.geometry.type === 'CircleGeometry'), 'plaza disc');
    assert.ok(!(m.material.polygonOffset), 'overlay strip');
  }
});

test('ground is a heightfield of grid step >= 1.6 with mobile-sane triangles', () => {
  assert.ok(GROUND.step >= 1.6);
  const pos = ud.ground.geometry.attributes.position;
  const tris = pos.count / 3;
  const nx = Math.round((GROUND.x1 - GROUND.x0) / GROUND.step), nz = Math.round((GROUND.z1 - GROUND.z0) / GROUND.step);
  assert.equal(tris, nx * nz * 2 + PLAIN.segments);
  assert.ok(tris <= 24000, `${tris}`);
  for (let i = 0; i < nx * nz * 6; i += 131) assert.ok(Math.abs(pos.getY(i) - terrainHeight(pos.getX(i), pos.getZ(i))) < 1e-4);
});

test('ground classes follow the prototype zones', () => {
  assert.equal(groundClass(PLAZA.x, PLAZA.z, 0, 0), G.plaza);
  const p = slopePoint(100, COURSE.flags[3].x);
  assert.equal(groundClass(p.x, p.z, p.y, 0.3), G.track);
  const n = { x: 25, z: 30 };
  assert.ok(nearestOnPath(n).dist < 1.6);
  assert.equal(groundClass(n.x, n.z, 20, 0.2), G.path);
  assert.equal(groundClass(-40, 10, 8, 1.2), G.rock);
  assert.ok([G.snow, G.shade].includes(groundClass(-40, 10, 8, 0.2)));
});

test('ground repaints per theme in place without rebuilding geometry', () => {
  const pos = ud.ground.geometry.attributes.position, col = ud.ground.geometry.attributes.color;
  const before = col.version;
  paintInterior(THREE, ud, MOUNTAIN_THEMES.dusk);
  assert.equal(ud.ground.geometry.attributes.position, pos);
  assert.equal(ud.ground.geometry.attributes.color, col);
  assert.ok(col.version > before);
  assert.ok(hexes(col, 3).has(MOUNTAIN_THEMES.dusk.snow));
  assert.ok(hexes(col, 3).has(MOUNTAIN_THEMES.dusk.track));
  assert.ok(hexes(col, 3).has(MOUNTAIN_THEMES.dusk.path));
  paintInterior(THREE, ud, MOUNTAIN_THEMES.day);
  const day = hexes(col, 3);
  assert.ok(day.has(MOUNTAIN_THEMES.day.snow) && day.has(MOUNTAIN_THEMES.day.snowShade) && !day.has(MOUNTAIN_THEMES.dusk.snow));
});

test('gates are two poles and two flags per course flag at the flag positions, red and blue alternating', () => {
  const spots = gateSpots();
  assert.equal(spots.length, COURSE.flags.length * 2);
  COURSE.flags.forEach((f, i) => {
    for (const side of [-1, 1]) {
      const s = spots.find(g => g.flag === i && g.side === side);
      const p = slopePoint(f.z, f.x + side * f.half);
      assert.ok(Math.hypot(s.x - p.x, s.y - p.y, s.z - p.z) < 1e-9, `gate ${i} ${side}`);
      assert.equal(s.color, i % 2 ? 0x2f6fd6 : 0xe0443a);
    }
  });
  const g = ud.gates.geometry, pole = new THREE.CylinderGeometry(0.07, 0.07, 1.9, 6).toNonIndexed(), flag = new THREE.BoxGeometry(0.9, 0.55, 0.04).toNonIndexed();
  assert.equal(g.attributes.position.count, spots.length * (pole.attributes.position.count + flag.attributes.position.count));
  assert.deepEqual([...hexes(g.attributes.color)].sort(), [0x2f6fd6, 0xe0443a].sort());
  const pos = g.attributes.position;
  for (const s of spots) {
    let near = 0;
    for (let i = 0; i < pos.count; i++) if (Math.hypot(pos.getX(i) - s.x, pos.getZ(i) - s.z) < 0.08 && pos.getY(i) >= s.y - 1e-6 && pos.getY(i) <= s.y + 1.9 + 1e-6) near++;
    assert.ok(near >= 12, `pole at ${s.x.toFixed(1)},${s.z.toFixed(1)}`);
  }
});

test('pines stay out of the run, the path, the plaza and the summit', () => {
  const spots = pineSpots();
  assert.ok(spots.length >= 150 && spots.length <= PINE_MAX, `${spots.length}`);
  for (const [x, y, z] of spots) {
    assert.ok(!inSlopeCorridor(x, z, 2.5), `slope ${x},${z}`);
    assert.ok(nearestOnPath({ x, z }).dist >= 3, `path ${x},${z}`);
    assert.ok(Math.hypot(x - PLAZA.x, z - PLAZA.z) >= PLAZA.r + 2, `plaza ${x},${z}`);
    assert.ok(terrainHeight(x, z) <= SUMMIT_Y * 0.8, `summit ${x},${z}`);
    assert.ok(Math.abs(y - terrainHeight(x, z)) < 1e-9);
  }
  for (const a of ACORNS) assert.ok(spots.every(([x, , z]) => Math.hypot(x - a.x, z - a.z) > 1.5), 'acorn hidden by a pine');
  assert.ok(ud.pines.isInstancedMesh);
  assert.equal(ud.pines.count, spots.length);
});

test('pines repaint their snow caps and needles per theme', () => {
  paintInterior(THREE, ud, MOUNTAIN_THEMES.dusk);
  const dusk = hexes(ud.pines.geometry.attributes.color);
  for (const f of ['pine', 'pineDark', 'snow', 'trunk']) assert.ok(dusk.has(MOUNTAIN_THEMES.dusk[f]), f);
  paintInterior(THREE, ud, MOUNTAIN_THEMES.day);
  const day = hexes(ud.pines.geometry.attributes.color);
  for (const f of ['pine', 'pineDark', 'snow', 'trunk']) assert.ok(day.has(MOUNTAIN_THEMES.day[f]), f);
});

test('obstacles are one merged mesh of snow-capped rocks and snowballs at the course spots', () => {
  const obs = ud.obstacles;
  assert.ok(obs.isMesh && !obs.isInstancedMesh);
  assert.deepEqual([...hexes(obs.geometry.attributes.color)].sort(), [MOUNTAIN_THEMES.day.rock, MOUNTAIN_THEMES.day.snow].sort());
  obs.geometry.computeBoundingBox();
  for (const o of COURSE.obstacles) {
    const p = slopePoint(o.z, o.x);
    assert.ok(obs.geometry.boundingBox.containsPoint(new THREE.Vector3(p.x, p.y + 0.5, p.z)));
  }
});

test('distant ranges are at most 3 layers of 90 segments, fog-free, inside the camera far plane', () => {
  assert.ok(RANGE.layers <= 3 && RANGE.segments <= 90);
  const r = ud.ranges;
  assert.equal(r.material.fog, false);
  assert.equal(r.geometry.attributes.position.count, RANGE.layers * RANGE.segments * 6);
  const pos = r.geometry.attributes.position;
  let far = 0;
  for (let i = 0; i < pos.count; i++) far = Math.max(far, Math.hypot(pos.getX(i), pos.getY(i) - 40, pos.getZ(i)));
  assert.ok(far < 200, `${far}`);
  paintInterior(THREE, ud, MOUNTAIN_THEMES.night);
  assert.deepEqual([...hexes(r.geometry.attributes.color)].sort(), [...MOUNTAIN_THEMES.night.ranges].sort());
  paintInterior(THREE, ud, MOUNTAIN_THEMES.day);
});

test('the snow plain is part of the ground mesh, below it, and reaches past the ranges from every camera spot', () => {
  const pos = ud.ground.geometry.attributes.position, cls = ud.ground.geometry.userData.classes;
  const first = pos.count - PLAIN.segments * 3;
  for (let i = first; i < pos.count; i++) {
    assert.equal(cls[i], G.plain);
    assert.ok(Math.abs(pos.getY(i) - PLAIN.y) < 1e-6);
  }
  for (const x of [GROUND.x0, GROUND.x1]) for (const z of [GROUND.z0, GROUND.z1]) {
    assert.ok(PLAIN.r - Math.hypot(x - PLAIN.x, z - PLAIN.z) >= RANGE.r0, `${x},${z}`);
  }
});

test('ranges and snowfall follow the camera; ranges stay level', () => {
  followCamera(ud, { x: 12, y: 30, z: -40 }, 0);
  assert.deepEqual([ud.ranges.position.x, ud.ranges.position.y, ud.ranges.position.z], [12, 0, -40]);
  assert.equal(ud.snowfall.position.x, 12);
  assert.equal(ud.snowfall.position.z, -40);
  for (const t of [0, 3, 7.7, 18.74, 100]) {
    followCamera(ud, { x: 0, y: 30, z: 0 }, t);
    const lo = ud.snowfall.position.y, hi = lo + SNOWFALL.band * SNOWFALL.bands;
    assert.ok(lo <= 30 - SNOWFALL.below && hi >= 30 + 20, `t ${t}`);
  }
});

function flakesAt(t, cam) {
  followCamera(ud, cam, t);
  const pos = ud.snowfall.geometry.attributes.position, oy = ud.snowfall.position.y;
  return Array.from({ length: pos.count }, (_, i) => [pos.getX(i), pos.getY(i) + oy, pos.getZ(i)]);
}

test('snowfall never jumps: each frame a flake falls one step or wraps by exactly one repeated band', () => {
  const cam = { x: 0, y: 30, z: 0 }, dt = 1 / 60, step = SNOWFALL.fall * dt;
  const wrapAt = SNOWFALL.band / SNOWFALL.fall;
  let wraps = 0;
  for (let t = wrapAt - 0.5; t < wrapAt * 2 + 0.5; t += dt) {
    const a = flakesAt(t, cam), b = flakesAt(t + dt, cam);
    for (let i = 0; i < a.length; i++) {
      const d = b[i][1] - a[i][1];
      const fell = Math.abs(d + step) < 1e-4, wrapped = Math.abs(d - (SNOWFALL.band - step)) < 1e-4;
      assert.ok(fell || wrapped, `flake ${i} moved ${d} at t ${t}`);
      if (wrapped) wraps++;
    }
  }
  assert.ok(wraps > 0, 'a wrap happened in the window');
});

test('snowfall bands repeat, so the picture after a wrap equals the picture before it moved one step', () => {
  const cam = { x: 3, y: 30, z: -8 }, dt = 1 / 60, step = SNOWFALL.fall * dt;
  const t = SNOWFALL.band / SNOWFALL.fall - dt / 2;
  const key = ([x, y, z]) => `${x.toFixed(3)},${y.toFixed(2)},${z.toFixed(3)}`;
  const lo = cam.y - SNOWFALL.below + 0.1, hi = cam.y + 20;
  const inView = f => f[1] > lo && f[1] < hi;
  const before = new Set(flakesAt(t, cam).filter(inView).map(([x, y, z]) => key([x, y - step, z])));
  const after = flakesAt(t + dt, cam).filter(f => f[1] > lo && f[1] < hi - step);
  assert.ok(after.length > 100);
  for (const f of after) assert.ok(before.has(key(f)), `flake popped at ${key(f)}`);
});

test('snowfall is one hidden Points cloud', () => {
  assert.ok(ud.snowfall.isPoints);
  assert.equal(ud.snowfall.visible, false);
  assert.equal(ud.snowfall.geometry.attributes.position.count, SNOWFALL.count);
});

test('clouds and plain take the theme colours', () => {
  paintInterior(THREE, ud, MOUNTAIN_THEMES.dusk);
  assert.equal(ud.clouds.material.color.getHex(), MOUNTAIN_THEMES.dusk.cloud);
  assert.equal(ud.clouds.material.emissive.getHex(), MOUNTAIN_THEMES.dusk.cloudGlow);
  const col = ud.ground.geometry.attributes.color, c = new THREE.Color();
  assert.equal(c.setRGB(col.getX(col.count - 1), col.getY(col.count - 1), col.getZ(col.count - 1)).getHex(), MOUNTAIN_THEMES.dusk.snowShade);
  paintInterior(THREE, ud, MOUNTAIN_THEMES.day);
});

function env() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x123456);
  scene.fog = new THREE.Fog(0x123456, 18, 74);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbfe8c9, 0.9);
  const ambient = new THREE.AmbientLight(0xfff0dd, 0.25);
  const sunLight = new THREE.DirectionalLight(0xffe9c4, 1.1);
  return { scene, hemiLight, ambient, sunLight, bloomPass: { strength: 0.5 }, gradePass: { uniforms: { uNight: { value: 0.7 } } },
    playerLight: new THREE.PointLight(0xffb95e, 2.5), target: new THREE.Vector3(5, 10, -1000) };
}

test('applyLook sets fog, sky, hemisphere, sun and bloom from the theme', () => {
  for (const key of Object.keys(MOUNTAIN_THEMES)) {
    const e = env(), th = MOUNTAIN_THEMES[key], sky = new THREE.Texture();
    applyLook(e, th, sky);
    assert.equal(e.scene.fog.color.getHex(), th.fog);
    assert.equal(e.scene.fog.near, th.fogNear);
    assert.equal(e.scene.fog.far, th.fogFar);
    assert.equal(e.scene.background, sky);
    assert.equal(e.hemiLight.color.getHex(), th.hemiSky);
    assert.equal(e.hemiLight.groundColor.getHex(), th.hemiGround);
    assert.equal(e.sunLight.color.getHex(), th.sun);
    assert.ok(e.sunLight.intensity > 0 && e.hemiLight.intensity > 0);
    const dir = e.sunLight.position.clone().sub(e.sunLight.target.position).normalize();
    assert.ok(dir.distanceTo(new THREE.Vector3(...th.sunDir).normalize()) < 1e-6, key);
    assert.ok(e.sunLight.target.position.equals(e.target));
    assert.ok(e.bloomPass.strength < 0.5);
    assert.equal(e.gradePass.uniforms.uNight.value, th.grade);
    assert.equal(e.playerLight.intensity, th.torch);
  }
});

test('applyLook falls back to the fog colour when no sky texture is ready', () => {
  const e = env();
  applyLook(e, MOUNTAIN_THEMES.dusk, null);
  assert.ok(e.scene.background.isColor);
  assert.equal(e.scene.background.getHex(), MOUNTAIN_THEMES.dusk.fog);
});
