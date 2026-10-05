import * as THREE from 'three';

const R = 4.2, H = 3.4, BASE = 1.2, DOME_Y = BASE + H + 0.32;
// 🪜 Stair footprint (gate-local) — the space registers it as a collider so the player stops at the
//    bottom step instead of walking through it at ground height.
export const R_BASE = R;
export const STAIR_HALF_W = 1.1;
export const STAIR_FOOT = R + 3.15;   // front edge of the bottom step (centre R+2.9, depth 0.5)
const ROT = -2.35, SLIT = 1.3;

// Subtract the intersection of three half-spaces, interpolating normals/UVs
// at each boundary. This keeps a straight slit without renderer clipping.
function openDome() {
  const source = new THREE.SphereGeometry(R + 0.1, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const flat = source.toNonIndexed();
  const output = [];
  const planes = [v => v[0] + SLIT / 2, v => SLIT / 2 - v[0], v => R * 0.18 - v[2]];
  const emit = poly => {
    for (let i = 1; i + 1 < poly.length; i++) output.push(poly[0], poly[i], poly[i + 1]);
  };
  for (let i = 0; i < flat.attributes.position.count; i += 3) {
    let poly = Array.from({ length: 3 }, (_, k) => {
      const v = [];
      for (const name of ['position', 'normal', 'uv']) {
        const attr = flat.attributes[name];
        for (let j = 0; j < attr.itemSize; j++) v.push(attr.array[(i + k) * attr.itemSize + j]);
      }
      return v;
    });
    for (const distance of planes) {
      const inside = [], outside = [];
      for (let j = 0; j < poly.length; j++) {
        const a = poly[j], b = poly[(j + 1) % poly.length];
        const da = distance(a), db = distance(b);
        (da >= 0 ? inside : outside).push(a);
        if ((da >= 0) !== (db >= 0)) {
          const t = da / (da - db), v = a.map((n, k) => n + (b[k] - n) * t);
          inside.push(v); outside.push(v);
        }
      }
      emit(outside);
      poly = inside;
    }
  }
  const geo = new THREE.BufferGeometry();
  for (const [name, start, size] of [['position', 0, 3], ['normal', 3, 3], ['uv', 6, 2]]) {
    geo.setAttribute(name, new THREE.Float32BufferAttribute(output.flatMap(v => v.slice(start, start + size)), size));
  }
  source.dispose(); flat.dispose();
  return geo.rotateY(ROT).translate(0, DOME_Y, 0);
}

export function buildObservatoryExterior(mergeGeos) {
  const group = new THREE.Group(), parts = new Map();
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
  const mats = {
    body: material(0xffffff, { vertexColors: true }),
    trim: material(0xb9ae95, { flatShading: true }),
    gold: material(0xd9b45a, { metalness: 0.5, roughness: 0.4 }),
    door: material(0x2f3f6b),
    inner: new THREE.MeshBasicMaterial({ color: 0x141a30, side: THREE.BackSide }),
    glass: material(0xffd58a, { emissive: 0xffd58a, emissiveIntensity: 0.8 }),
    tube: material(0xeeeae2, { metalness: 0.3, roughness: 0.5 }),
    stars: material(0xf3d27a, { emissive: 0xf3d27a, emissiveIntensity: 0.9 }),
  };
  const add = (key, geo, color) => {
    if (color !== undefined) {
      const c = new THREE.Color(color), values = [];
      for (let i = 0; i < geo.attributes.position.count; i++) values.push(c.r, c.g, c.b);
      geo.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
    }
    if (!parts.has(key)) parts.set(key, []);
    parts.get(key).push(geo);
  };
  const cylinder = (rt, rb, height, y) => new THREE.CylinderGeometry(rt, rb, height, 24).translate(0, y, 0);
  add('body', cylinder(R + 1.3, R + 1.6, BASE, BASE / 2), 0xb9ae95);
  add('body', cylinder(R, R, H, BASE + H / 2), 0xd8d0bc);
  add('body', openDome(), 0x2f3f6b);
  for (let i = 0; i < 4; i++) {
    add('trim', new THREE.BoxGeometry(STAIR_HALF_W * 2, 0.3, 0.5).translate(0, 0.15 + i * 0.3, R + 2.9 - i * 0.45));
  }
  add('trim', cylinder(R + 0.3, R + 0.2, 0.32, BASE + H + 0.16));
  add('inner', new THREE.SphereGeometry(R - 0.1, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, DOME_Y, 0));
  // Floor of the lining: hides the wall/trim top caps seen through the lower slit.
  add('inner', new THREE.CircleGeometry(R + 0.05, 40).rotateX(Math.PI / 2).translate(0, DOME_Y + 0.01, 0));
  for (const sx of [-1, 1]) {
    add('gold', new THREE.TorusGeometry(R + 0.14, 0.08, 6, 40, Math.PI * 0.6)
      .rotateY(ROT + Math.PI / 2)
      .translate(Math.cos(ROT) * sx * (SLIT / 2 + 0.06), DOME_Y, -Math.sin(ROT) * sx * (SLIT / 2 + 0.06)));
  }
  add('gold', new THREE.TorusGeometry(R + 0.12, 0.1, 6, 48).rotateX(Math.PI / 2).translate(0, DOME_Y + 0.04, 0));
  const direction = new THREE.Vector3(-Math.sin(ROT), 0, -Math.cos(ROT));
  const tube = new THREE.CylinderGeometry(0.26, 0.22, 2.2, 16);
  tube.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().setY(1.1).normalize()));
  add('tube', tube.translate(direction.x * 2.6, DOME_Y + 2.9, direction.z * 2.6));
  let seed = 3;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    let x, y, z;
    do {
      const th = rnd() * Math.PI * 2, ph = 0.25 + rnd() * 1.2;
      x = Math.sin(ph) * Math.cos(th) * (R + 0.13);
      y = Math.cos(ph) * (R + 0.13);
      z = Math.sin(ph) * Math.sin(th) * (R + 0.13);
    } while (Math.abs(x * Math.cos(ROT) - z * Math.sin(ROT)) < SLIT / 2 + 0.12
      && x * Math.sin(ROT) + z * Math.cos(ROT) < R * 0.18);
    add('stars', new THREE.OctahedronGeometry(0.07 + rnd() * 0.07).translate(x, DOME_Y + y, z));
  }
  const arch = new THREE.Shape();
  arch.moveTo(-0.6, 0); arch.lineTo(0.6, 0); arch.lineTo(0.6, 1.9);
  arch.absarc(0, 1.9, 0.6, 0, Math.PI, false); arch.lineTo(-0.6, 0);
  add('door', new THREE.ExtrudeGeometry(arch, { depth: 0.2, bevelEnabled: false, curveSegments: 16 }).translate(0, BASE, R - 0.12));
  add('trim', new THREE.TorusGeometry(0.68, 0.08, 6, 18, Math.PI).translate(0, BASE + 1.9, R + 0.06));
  add('gold', new THREE.SphereGeometry(0.06, 8, 6).translate(0.38, BASE + 1, R + 0.12));
  add('glass', new THREE.CircleGeometry(0.34, 5).rotateZ(Math.PI / 10).translate(0, BASE + 2.95, R + 0.03));
  for (const a of [-0.75, 0.75, -1.6, 1.6]) {
    add('glass', new THREE.CircleGeometry(0.34, 16).rotateY(a).translate(Math.sin(a) * (R + 0.02), BASE + 2.1, Math.cos(a) * (R + 0.02)));
    add('trim', new THREE.TorusGeometry(0.36, 0.06, 6, 18).rotateY(a).translate(Math.sin(a) * (R + 0.06), BASE + 2.1, Math.cos(a) * (R + 0.06)));
  }
  for (const [key, geos] of parts) {
    const mesh = new THREE.Mesh(mergeGeos(geos), mats[key]);
    mesh.name = key; mesh.castShadow = key === 'body'; mesh.receiveShadow = true;
    group.add(mesh);
    for (const geo of geos) geo.dispose();
  }
  return group;
}
