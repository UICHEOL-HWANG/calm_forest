import { diveDepthAt } from './dive-run.js';

export const DIVE_FLOOR = { Z0: -34, Z1: 10, W: 54 };

function rnd(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

function inst(THREE, geo, mat, n) {
  const m = new THREE.InstancedMesh(geo, mat, n);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  return m;
}

export function buildDiveScene(THREE, mat, mobile) {
  const g = new THREE.Group(), r = rnd(23), o = new THREE.Object3D();
  const { Z0, Z1, W } = DIVE_FLOOR;
  const geo = new THREE.PlaneGeometry(W, Z1 - Z0, mobile ? 40 : 60, mobile ? 34 : 50);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, -diveDepthAt(p.getX(i), -p.getY(i) + (Z0 + Z1) / 2));
  geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, mat(0xd9c79a));
  floor.rotation.x = -Math.PI / 2; floor.position.z = (Z0 + Z1) / 2; floor.receiveShadow = true;
  g.add(floor);

  const surfGeo = new THREE.PlaneGeometry(90, 70, mobile ? 24 : 36, mobile ? 18 : 28);
  surfGeo.rotateX(-Math.PI / 2);
  const surf = new THREE.Mesh(surfGeo, new THREE.MeshStandardMaterial({ color: 0x3aa6cf, roughness: .2, metalness: .1, transparent: true, opacity: .84, side: THREE.DoubleSide, flatShading: true }));
  surf.position.z = -12;
  g.add(surf);

  const kelps = [];
  for (let i = 0; i < 40; i++) {
    const x = -20 + r() * 40, z = Z0 + 3 + r() * (Z1 - Z0 - 6), d = diveDepthAt(x, z);
    kelps.push({ x, z, y: -d, n: Math.max(1, Math.min(3 + Math.floor(r() * Math.min(3, d * .4)), Math.floor((d - 1.2) / .5))), ph: r() * 6 });
  }
  const kelpMesh = inst(THREE, new THREE.CapsuleGeometry(.09, .38, 3, 6), mat(0x45965f), kelps.reduce((a, k) => a + k.n, 0));
  g.add(kelpMesh);

  const rocks = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1), mat(0x7d8a86), 24);
  for (let i = 0; i < 24; i++) {
    const x = -20 + r() * 40, z = Z0 + 2 + r() * (Z1 - Z0 - 4), k = .4 + r() * .9;
    o.position.set(x, -diveDepthAt(x, z) + .1, z); o.rotation.set(r(), r() * 6, r()); o.scale.set(k, k * .6, k);
    o.updateMatrix(); rocks.setMatrixAt(i, o.matrix);
  }
  g.add(rocks);

  const CORAL = [0xf28aa8, 0xffa86a, 0xc48af0, 0xffd36a];
  const coral = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(0xffffff), 22 * 5);
  const c = new THREE.Color();
  for (let i = 0; i < 22; i++) {
    const x = -18 + r() * 36, z = Z0 + 4 + r() * (Z1 - Z0 - 10), y = -diveDepthAt(x, z);
    for (let k = 0; k < 5; k++) {
      o.position.set(x + (r() - .5) * .5, y + .15 + r() * .4, z + (r() - .5) * .5); o.rotation.set(r(), r(), r()); o.scale.setScalar(.16 + r() * .14);
      o.updateMatrix(); coral.setMatrixAt(i * 5 + k, o.matrix); coral.setColorAt(i * 5 + k, c.set(CORAL[i % 4]));
    }
  }
  g.add(coral);

  const shafts = inst(THREE, new THREE.CylinderGeometry(.4, 1.6, 11, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xdff8ff, transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide }), 9);
  const shaftAt = Array.from({ length: 9 }, () => ({ x: -16 + r() * 32, z: -24 + r() * 30, ph: r() * 6 }));
  g.add(shafts);

  const FISH = [0xffd36a, 0x8ad0f0, 0xf0a0c0, 0xffffff];
  const fish = inst(THREE, new THREE.ConeGeometry(.08, .3, 5), mat(0xffffff), 28);
  const schools = Array.from({ length: 4 }, () => ({
    cx: -10 + r() * 20, cz: -20 + r() * 22, cy: -2 - r() * 4, r: 3 + r() * 3, sp: .3 + r() * .3, ph: r() * 6,
    off: Array.from({ length: 7 }, () => [(r() - .5) * 1.2, (r() - .5) * .6, (r() - .5) * 1.2]),
  }));
  for (let i = 0; i < 28; i++) fish.setColorAt(i, c.set(FISH[Math.floor(i / 7)]));
  g.add(fish);

  return { group: g, surf, surfBase: surfGeo.attributes.position.array.slice(), kelps, kelpMesh, shafts, shaftAt, fish, schools, o };
}

export function updateDiveScene(s, t, cam) {
  const pa = s.surf.geometry.attributes.position, b = s.surfBase;
  for (let i = 0; i < pa.count; i++) pa.setY(i, .08 * Math.sin(t * 1.6 + b[i * 3] * .5 + b[i * 3 + 2] * .3));
  pa.needsUpdate = true;
  const o = s.o;
  let n = 0;
  for (const k of s.kelps) {
    let x = k.x, y = k.y, ang = 0;
    const hide = cam && k.z > cam.z - 3.2 && k.z < cam.z + 1 && Math.abs(k.x - cam.x) < 2.2;
    for (let j = 0; j < k.n; j++) {
      ang += Math.sin(t * 1.2 + k.ph + j * .6) * (.12 + j * .03);
      o.position.set(x - Math.sin(ang) * .25, y + Math.cos(ang) * .25, k.z);
      o.rotation.set(0, 0, ang);
      if (hide) o.scale.setScalar(.0001); else o.scale.set(1.5, 1, 1);
      o.updateMatrix(); s.kelpMesh.setMatrixAt(n++, o.matrix);
      x -= Math.sin(ang) * .5; y += Math.cos(ang) * .5;
    }
  }
  s.kelpMesh.instanceMatrix.needsUpdate = true;
  s.shaftAt.forEach((a, i) => {
    o.position.set(a.x, -6.3, a.z); o.rotation.set(0, 0, .25 + Math.sin(t * .4 + a.ph) * .06); o.scale.set(1, 1, 1);
    o.updateMatrix(); s.shafts.setMatrixAt(i, o.matrix);
  });
  s.shafts.instanceMatrix.needsUpdate = true;
  s.shafts.material.opacity = .06 + .02 * Math.sin(t * .8);
  s.schools.forEach((sc, si) => {
    const a = t * sc.sp + sc.ph, cx = sc.cx + Math.cos(a) * sc.r, cy = sc.cy + Math.sin(a * 2) * .3, cz = sc.cz + Math.sin(a) * sc.r;
    sc.off.forEach(([dx, dy, dz], k) => {
      o.position.set(cx + dx, cy + dy, cz + dz); o.rotation.set(0, -a, -Math.PI / 2); o.scale.set(1, 1, 1);
      o.updateMatrix(); s.fish.setMatrixAt(si * 7 + k, o.matrix);
    });
  });
  s.fish.instanceMatrix.needsUpdate = true;
}

export function buildDiveItem(THREE, mat, sp) {
  const g = new THREE.Group();
  if (sp.id === 'conch') {
    const m = new THREE.Mesh(new THREE.ConeGeometry(.2, .42, 8), mat(0xe8b88a)); m.rotation.z = 1.1; g.add(m);
    const lip = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), mat(0xf6d8c0)); lip.position.set(.14, -.05, 0); g.add(lip);
  } else if (sp.id === 'star') {
    const s = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, rr = k % 2 ? .1 : .26; s[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
    const m = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .05, bevelEnabled: true, bevelSize: .02, bevelThickness: .02, bevelSegments: 1 }), mat(0xf28a5a));
    m.rotation.x = -Math.PI / 2; g.add(m);
  } else if (sp.id === 'abalone') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x8a7a6a)); m.scale.set(1.2, .45, .85); g.add(m);
    const in_ = new THREE.Mesh(new THREE.CircleGeometry(.2, 12), mat(0xbfe0e0)); in_.rotation.x = Math.PI / 2; in_.scale.set(1.2, .85, 1); g.add(in_);
  } else if (sp.id === 'octo') {
    const h = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 10), mat(0xc9675a, false)); h.scale.set(1, 1.15, 1); h.position.y = .2; g.add(h);
    const legs = new THREE.Mesh(new THREE.TorusGeometry(.16, .05, 6, 14), mat(0xc9675a, false)); legs.rotation.x = Math.PI / 2; legs.position.y = .03; g.add(legs);
  } else {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9a8aa8)); sh.scale.set(1, .35, 1); g.add(sh);
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(.08, 14, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .15, metalness: .3, emissive: 0x554a60 }));
    pearl.position.y = .07; g.add(pearl); g.userData.glow = pearl;
  }
  return g;
}
