import { COURSE, OBSTACLE_BODY } from './course.js';
import { ACORNS, PLAZA, nearestOnPath } from './climb.js';
import { SUMMIT_Y, slopePoint, terrainHeight, inSlopeCorridor, acornY, cloudPuffs } from './terrain.js';
import { cloudPuffMesh } from './backdrop.js';
import { buildSledMesh } from './sled-art.js';
import { colored, mergeColored } from './merge-colored.js';
import { MOUNTAIN_THEMES } from './theme.js';

export const GROUND = Object.freeze({ step: 1.6, x0: -80, x1: 80, z0: -70, z1: 110 });
export const G = Object.freeze({ snow: 0, shade: 1, track: 2, rock: 3, path: 4, plaza: 5, plain: 6 });
export const PINE_MAX = 320;
export const RANGE = Object.freeze({ layers: 3, segments: 90, r0: 140, dr: 20, amp: 65, dAmp: 13, base: -28 });
export const SNOWFALL = Object.freeze({ perBand: 600, bands: 3, count: 1800, span: 60, band: 30, below: 40, fall: 1.6, size: 0.18 });
export const PLAIN = Object.freeze({ x: 0, z: 20, r: 270, y: -0.6, segments: 48 });
export const GATE_COLORS = Object.freeze([0xe0443a, 0x2f6fd6]);
export const INTERIOR_DRAW_BUDGET = 9;

const PINE = Object.freeze({ trunk: 0, dark: 1, snow: 2, needle: 3 });
const OBST = Object.freeze({ rock: 0, snow: 1 });
const PATH_CLEAR = 1.6;
const ROCK_SLOPE = 0.9;
const ROCK_MIN_Y = 4;

const lcg = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

export function groundClass(x, z, h, slope) {
  if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r) return G.plaza;
  if (nearestOnPath({ x, z }).dist < PATH_CLEAR) return G.path;
  if (inSlopeCorridor(x, z, 0)) return G.track;
  if (slope > ROCK_SLOPE && h > ROCK_MIN_Y) return G.rock;
  const n = Math.sin(x * 0.37 + z * 0.21) * Math.sin(x * 0.11 - z * 0.43);
  return n > 0.25 ? G.shade : G.snow;
}

function lerpHex(THREE, a, b, k) {
  return new THREE.Color(a).lerp(new THREE.Color(b), k);
}

function groundPalette(THREE, t) {
  return [
    new THREE.Color(t.snow), new THREE.Color(t.snowShade), new THREE.Color(t.track),
    lerpHex(THREE, t.rock, t.snowShade, 0.25), new THREE.Color(t.path), lerpHex(THREE, t.path, t.snow, 0.55),
    new THREE.Color(t.snowShade),
  ];
}

function paintClasses(geo, classes, palette) {
  const col = geo.getAttribute('color');
  const arr = col.array;
  for (let i = 0; i < classes.length; i++) {
    const c = palette[classes[i]];
    arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b;
  }
  col.needsUpdate = true;
}

function classedGeometry(THREE, positions, classes) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(positions.length), 3));
  g.computeVertexNormals();
  g.userData.classes = Uint8Array.from(classes);
  return g;
}

function groundMesh(THREE) {
  const { step, x0, x1, z0, z1 } = GROUND;
  const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const rows = Array.from({ length: nz + 1 }, (_, j) => Array.from({ length: nx + 1 }, (_, i) => {
    const x = x0 + i * step, z = z0 + j * step;
    return [x, terrainHeight(x, z), z];
  }));
  const pos = [], cls = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const p00 = rows[j][i], p10 = rows[j][i + 1], p01 = rows[j + 1][i], p11 = rows[j + 1][i + 1];
    for (const tri of [[p00, p01, p11], [p00, p11, p10]]) {
      const ys = tri.map(v => v[1]);
      const c = groundClass((tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][2] + tri[1][2] + tri[2][2]) / 3,
        (ys[0] + ys[1] + ys[2]) / 3, (Math.max(...ys) - Math.min(...ys)) / step);
      for (const v of tri) { pos.push(v[0], v[1], v[2]); cls.push(c); }
    }
  }
  for (let i = 0; i < PLAIN.segments; i++) {
    const a0 = (i / PLAIN.segments) * Math.PI * 2, a1 = ((i + 1) / PLAIN.segments) * Math.PI * 2;
    pos.push(PLAIN.x, PLAIN.y, PLAIN.z,
      PLAIN.x + Math.cos(a1) * PLAIN.r, PLAIN.y, PLAIN.z + Math.sin(a1) * PLAIN.r,
      PLAIN.x + Math.cos(a0) * PLAIN.r, PLAIN.y, PLAIN.z + Math.sin(a0) * PLAIN.r);
    cls.push(G.plain, G.plain, G.plain);
  }
  return new THREE.Mesh(classedGeometry(THREE, pos, cls), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

function partsGeometry(THREE, parts) {
  const cls = [];
  const geos = parts.map(([geo, c, at, scale = [1, 1, 1]]) => {
    const g = colored(THREE, geo, 0xffffff);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion(), new THREE.Vector3(...scale)));
    for (let i = 0; i < g.getAttribute('position').count; i++) cls.push(c);
    return g;
  });
  const out = mergeColored(THREE, geos);
  out.userData.classes = Uint8Array.from(cls);
  return out;
}

function pineGeometry(THREE) {
  return partsGeometry(THREE, [
    [new THREE.CylinderGeometry(0.18, 0.24, 1.0, 6), PINE.trunk, [0, 0.5, 0]],
    [new THREE.ConeGeometry(1.5, 2.2, 7), PINE.dark, [0, 1.9, 0]],
    [new THREE.ConeGeometry(1.55, 0.35, 7), PINE.snow, [0, 2.0, 0]],
    [new THREE.ConeGeometry(1.15, 1.9, 7), PINE.needle, [0, 3.0, 0]],
    [new THREE.ConeGeometry(1.2, 0.35, 7), PINE.snow, [0, 3.1, 0]],
    [new THREE.ConeGeometry(0.8, 1.6, 7), PINE.needle, [0, 4.0, 0]],
    [new THREE.ConeGeometry(0.55, 0.7, 7), PINE.snow, [0, 4.65, 0]],
  ]);
}

export function pineSpots() {
  const r = lcg(7);
  const spots = [];
  for (let k = 0; k < 2400 && spots.length < PINE_MAX; k++) {
    const x = -75 + r() * 150, z = -60 + r() * 165;
    if (inSlopeCorridor(x, z, 2.5)) continue;
    if (nearestOnPath({ x, z }).dist < 3) continue;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < PLAZA.r + 2) continue;
    if (ACORNS.some(a => Math.hypot(x - a.x, z - a.z) < 2.5)) continue;
    const h = terrainHeight(x, z);
    if (h > SUMMIT_Y * 0.8) continue;
    if (!inSlopeCorridor(x, z, 9) && r() < 0.55) continue;
    spots.push([x, h, z, 0.7 + r() * 0.9]);
  }
  return spots;
}

function pinesMesh(THREE) {
  const spots = pineSpots();
  const mesh = new THREE.InstancedMesh(pineGeometry(THREE), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), spots.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, y, z, k], i) => {
    q.setFromAxisAngle(up, (x * 13 + z * 7) % 6.28);
    mesh.setMatrixAt(i, m.compose(v.set(x, y - 0.2, z), q, s.setScalar(k)));
  });
  mesh.computeBoundingSphere();
  return mesh;
}

export function gateSpots() {
  return COURSE.flags.flatMap((f, i) => [-1, 1].map(side => ({ ...slopePoint(f.z, f.x + side * f.half), flag: i, side, color: GATE_COLORS[i % 2] })));
}

function gatesMesh(THREE) {
  const geos = gateSpots().flatMap(s => [
    colored(THREE, new THREE.CylinderGeometry(0.07, 0.07, 1.9, 6), s.color).translate(s.x, s.y + 0.95, s.z),
    colored(THREE, new THREE.BoxGeometry(0.9, 0.55, 0.04), s.color).translate(s.x - s.side * 0.45, s.y + 1.6, s.z),
  ]);
  return new THREE.Mesh(mergeColored(THREE, geos), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

function obstaclesMesh(THREE) {
  const parts = COURSE.obstacles.flatMap(o => {
    const p = slopePoint(o.z, o.x), r = o.r, b = r * OBSTACLE_BODY[o.kind];
    if (o.kind === 'rock') {
      return [
        [new THREE.DodecahedronGeometry(1, 0), OBST.rock, [p.x, p.y + 0.4, p.z], [b, b, b]],
        [new THREE.DodecahedronGeometry(1, 0), OBST.snow, [p.x, p.y + 0.85, p.z], [r * 0.62, r * 0.28, r * 0.62]],
      ];
    }
    return [[new THREE.IcosahedronGeometry(1, 1), OBST.snow, [p.x, p.y + 0.55, p.z], [b, b, b]]];
  });
  return new THREE.Mesh(partsGeometry(THREE, parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

function rangeHeight(a, layer) {
  const amp = RANGE.amp - layer * RANGE.dAmp;
  return amp * (0.45 + 0.55 * Math.abs(Math.sin(a * (5 + layer) + layer)) * (0.6 + 0.4 * Math.sin(a * 13 + layer * 2)));
}

function rangesMesh(THREE) {
  const pos = [], cls = [], N = RANGE.segments;
  for (let layer = 0; layer < RANGE.layers; layer++) {
    const R = RANGE.r0 + layer * RANGE.dr;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      const b0 = [Math.cos(a0) * R, RANGE.base, Math.sin(a0) * R], b1 = [Math.cos(a1) * R, RANGE.base, Math.sin(a1) * R];
      const t0 = [b0[0], rangeHeight(a0, layer), b0[2]], t1 = [b1[0], rangeHeight(a1, layer), b1[2]];
      for (const v of [b0, t1, t0, b0, b1, t1]) { pos.push(...v); cls.push(layer); }
    }
  }
  const mesh = new THREE.Mesh(classedGeometry(THREE, pos, cls), new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  return mesh;
}

function snowfallPoints(THREE) {
  const r = lcg(3), pos = new Float32Array(SNOWFALL.count * 3);
  for (let i = 0; i < SNOWFALL.perBand; i++) {
    const x = (r() - 0.5) * SNOWFALL.span, y = r() * SNOWFALL.band, z = (r() - 0.5) * SNOWFALL.span;
    for (let b = 0; b < SNOWFALL.bands; b++) pos.set([x, y + b * SNOWFALL.band, z], (b * SNOWFALL.perBand + i) * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: SNOWFALL.size, transparent: true, opacity: 0.9, depthWrite: false }));
  pts.frustumCulled = false;
  pts.visible = false;
  return pts;
}

function acornsMesh(THREE) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshLambertMaterial({ color: 0x9a6a2f, flatShading: true }), ACORNS.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  ACORNS.forEach((a, i) => mesh.setMatrixAt(i, m.compose(v.set(a.x, acornY(i), a.z), q, s)));
  return mesh;
}

export function paintInterior(THREE, ud, theme) {
  const hex = h => new THREE.Color(h);
  paintClasses(ud.ground.geometry, ud.ground.geometry.userData.classes, groundPalette(THREE, theme));
  paintClasses(ud.pines.geometry, ud.pines.geometry.userData.classes, [theme.trunk, theme.pineDark, theme.snow, theme.pine].map(hex));
  paintClasses(ud.obstacles.geometry, ud.obstacles.geometry.userData.classes, [theme.rock, theme.snow].map(hex));
  paintClasses(ud.ranges.geometry, ud.ranges.geometry.userData.classes, theme.ranges.map(hex));
  ud.clouds.material.color.setHex(theme.cloud);
  ud.clouds.material.emissive.setHex(theme.cloudGlow);
}

export function followCamera(ud, local, t) {
  ud.ranges.position.set(local.x, 0, local.z);
  ud.snowfall.position.set(local.x, local.y - SNOWFALL.below - ((t * SNOWFALL.fall) % SNOWFALL.band), local.z);
}

export function buildMountainSpace(THREE) {
  const group = new THREE.Group();
  const ud = {
    ground: groundMesh(THREE), ranges: rangesMesh(THREE), pines: pinesMesh(THREE),
    gates: gatesMesh(THREE), obstacles: obstaclesMesh(THREE), acorns: acornsMesh(THREE),
    clouds: cloudPuffMesh(THREE, cloudPuffs()), sled: buildSledMesh(THREE), snowfall: snowfallPoints(THREE),
  };
  group.add(...Object.values(ud));
  group.userData = ud;
  paintInterior(THREE, ud, MOUNTAIN_THEMES.day);
  return group;
}
