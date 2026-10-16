export const SNOW = 0xf6f8fb;
const SNOW_SHADE = 0xdfe6ef, ROCK = 0x4a4440, ROCK_LIGHT = 0x6b625a;
const FOREST = 0x3f6b34, FOREST_DARK = 0x2f5329, MEADOW = 0xa7924f;

function ridge(a) {
  return Math.sin(a * 7) * 0.5 + Math.sin(a * 13 + 1.3) * 0.3 + Math.sin(a * 23 + 0.4) * 0.2;
}

function heightAt(r, a, R, H) {
  const t = Math.min(r / R, 1);
  if (t < 0.045) return H * Math.pow(1 - 0.045, 1.55) - H * 0.011;
  const gully = ridge(a) * H * 0.025 * Math.sin(Math.PI * Math.min(t * 1.4, 1));
  return Math.max(0, H * Math.pow(1 - t, 1.55) + gully);
}

export function colorAt(h, a, H) {
  const k = h / H;
  const gully = Math.max(0, Math.sin(a * 31 + 0.7)) * 0.14 + Math.max(0, Math.sin(a * 19 + 2.1)) * 0.08;
  const snowLine = 0.5 + ridge(a * 1.3 + 2) * 0.06 - gully;
  if (k > snowLine) return Math.sin(a * 17) > 0.35 ? SNOW_SHADE : SNOW;
  if (k > 0.22) return Math.sin(a * 23 + k * 9) > 0 ? ROCK : ROCK_LIGHT;
  const patch = Math.sin(a * 5 + k * 31) * Math.sin(a * 11 - k * 17);
  if (patch > 0.55) return MEADOW;
  return patch < -0.2 ? FOREST_DARK : FOREST;
}

export function mountainMesh(THREE, R, H) {
  const SEG = 96, RINGS = 28, pos = [], col = [], c = new THREE.Color();
  const pt = (i, j) => {
    const r = R * Math.pow(i / RINGS, 1.15), a = (j / SEG) * Math.PI * 2;
    return [Math.cos(a) * r, heightAt(r, a, R, H), Math.sin(a) * r, a];
  };
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
    const p00 = pt(i, j), p01 = pt(i, j + 1), p10 = pt(i + 1, j), p11 = pt(i + 1, j + 1);
    for (const tri of [[p00, p11, p10], [p00, p01, p11]]) {
      c.setHex(colorAt((tri[0][1] + tri[1][1] + tri[2][1]) / 3, (tri[0][3] + tri[1][3] + tri[2][3]) / 3, H));
      for (const p of tri) { pos.push(p[0], p[1], p[2]); col.push(c.r, c.g, c.b); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false }));
}

function edge(a, k) {
  return 1 + k * (0.16 * Math.sin(a * 3 + 0.6) + 0.09 * Math.sin(a * 5 + 2.1) + 0.06 * Math.sin(a * 11 + 0.3));
}

function landmarkHeight(r, a, R, H, k) {
  const t = r / (R * edge(a, k));
  if (t >= 1) return 0;
  if (t < 0.045) return H * Math.pow(1 - 0.045, 1.55) - H * 0.011;
  const core = H * Math.pow(1 - t, 1.55);
  const spur = k * Math.max(0, Math.sin(a * 4 + 0.9)) * H * 0.06 * Math.sin(Math.PI * Math.min(1, t * 1.15));
  const gully = ridge(a) * H * 0.025 * Math.sin(Math.PI * Math.min(t * 1.4, 1));
  const foot = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;
  return Math.max(0, (core + spur + gully) * Math.pow(foot, 0.6));
}

export function landmarkMountain(THREE, { radius: R, height: H, spur: k, groundColor }) {
  const SEG = 120, RINGS = 34, pos = [], col = [], c = new THREE.Color(), ground = new THREE.Color(groundColor);
  const outer = R * (1 + 0.32 * k) + 0.01;
  const pt = (i, j) => {
    const a = (j / SEG) * Math.PI * 2, r = outer * Math.pow(i / RINGS, 1.1);
    return [Math.cos(a) * r, landmarkHeight(r, a, R, H, k), Math.sin(a) * r, a];
  };
  for (let i = 0; i < RINGS; i++) for (let j = 0; j < SEG; j++) {
    const p00 = pt(i, j), p01 = pt(i, j + 1), p10 = pt(i + 1, j), p11 = pt(i + 1, j + 1);
    for (const tri of [[p00, p11, p10], [p00, p01, p11]]) for (const [x, y, z, a] of tri) {
      const t = Math.hypot(x, z) / (R * edge(a, k));
      const f = Math.min(1, Math.max(0, (t - 0.86) / 0.14));
      c.setHex(colorAt(Math.max(y, 0.001), a, H)).lerp(ground, f * f);
      pos.push(x, Math.max(y, 0) - 0.02 * (1 - Math.min(1, t)), z);
      col.push(c.r, c.g, c.b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
}

export function cloudBand(THREE, R, H, frontGap, cloudScale = 1) {
  let seed = 11;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const y = H * 0.38, ring = R * (1 - Math.pow(0.38, 1 / 1.55)) + R * 0.03, puffs = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rnd() * 0.15;
    if (Math.abs(a - Math.PI / 2) < frontGap) continue;
    const size = R * (0.037 + rnd() * 0.02);
    for (let k = 0; k < 4; k++) {
      const s = size * (0.55 + rnd() * 0.6) * cloudScale;
      puffs.push([Math.cos(a) * ring + (rnd() - 0.5) * size * 2.4, y + (rnd() - 0.3) * size * 0.5, Math.sin(a) * ring + (rnd() - 0.5) * size * 1.2, s]);
    }
  }
  return cloudPuffMesh(THREE, puffs);
}

export function cloudPuffMesh(THREE, puffs) {
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true, emissive: 0xd4dce6, emissiveIntensity: 0.55, fog: false }), puffs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  puffs.forEach(([x, py, z, s], i) => { m.compose(v.set(x, py, z), q, sc.set(s * 1.3, s * 0.7, s)); mesh.setMatrixAt(i, m); });
  return mesh;
}

export function buildBackdrop(THREE, { radius, height, frontGap, cloudScale = 1 }) {
  const group = new THREE.Group();
  group.add(mountainMesh(THREE, radius, height), cloudBand(THREE, radius, height, frontGap, cloudScale));
  return group;
}
