const wob = v => .9 * Math.sin(v * .35 + 1) + .5 * Math.sin(v * .9 + 2) + .3 * Math.sin(v * 1.7 + .4);

export const bayEdge = (z, z1) => 18.5 + Math.max(0, z1 - 3 - z) * .3;

function bayLine(z0, z1, grow = 0) {
  const pts = [];
  const side = (z, s) => s * (bayEdge(z, z1) + 1.8 * wob(z * .45 + (s > 0 ? 7 : 0)) + grow);
  for (let z = z0 - 30; z <= z1 - 3; z += 1.5) pts.push([side(z, -1), z]);
  for (let k = 1; k < 8; k++) {
    const a = Math.PI - k / 8 * Math.PI / 2;
    pts.push([-11 + Math.cos(a) * (7.5 + grow), z1 - 3 + Math.sin(a) * (4 + grow)]);
  }
  for (let x = -10; x <= 10; x += 1.2) pts.push([x, z1 + 1 + .7 * wob(x * .8) + grow]);
  for (let k = 1; k < 8; k++) {
    const a = Math.PI / 2 - k / 8 * Math.PI / 2;
    pts.push([11 + Math.cos(a) * (7.5 + grow), z1 - 3 + Math.sin(a) * (4 + grow)]);
  }
  for (let z = z1 - 3; z >= z0 - 30; z -= 1.5) pts.push([side(z, 1), z]);
  return pts;
}

const toShape = (THREE, pts) => new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));

function ring(THREE, outer, inner) {
  const s = toShape(THREE, outer);
  s.holes.push(new THREE.Path(inner.map(([x, z]) => new THREE.Vector2(x, -z))));
  return s;
}

function flat(THREE, shape, mat, y) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 2), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
  return m;
}

function scatter(THREE, geo, mat, list) {
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  const o = new THREE.Object3D();
  list.forEach((f, i) => { f(o); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.instanceMatrix.needsUpdate = true;
  m.castShadow = true;
  return m;
}

function rnd(seed) {
  let x = seed >>> 0;
  return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
}

export function buildShore(THREE, mat, { z0, z1, seed = 11 }) {
  const g = new THREE.Group(), r = rnd(seed);
  const far = [[-70, z0 - 40], [-70, z1 + 50], [70, z1 + 50], [70, z0 - 40]];
  g.add(flat(THREE, ring(THREE, bayLine(z0, z1, 1.6), bayLine(z0, z1)), mat(0xc9b48a, false), .068));
  g.add(flat(THREE, ring(THREE, far, bayLine(z0, z1, 1.6)), mat(0xe8d9a8, false), .072));
  const grassLine = [];
  for (let x = -70; x <= 70; x += 1.5) grassLine.push([x, z1 + 7 + 1.4 * wob(x * .7) - Math.max(0, Math.abs(x) - 18) * .35]);
  const bank = new THREE.Mesh(new THREE.ExtrudeGeometry(toShape(THREE, [...grassLine, [70, z1 + 60], [-70, z1 + 60]]),
    { depth: .3, bevelEnabled: true, bevelThickness: .12, bevelSize: .35, bevelSegments: 2, curveSegments: 4 }), mat(0x9ec98a, false));
  bank.rotation.x = -Math.PI / 2; bank.position.y = -.1; bank.receiveShadow = true;
  g.add(bank);
  const rocks = [];
  for (let i = 0; i < 26; i++) {
    const s = i % 2 ? 1 : -1, z = z1 - 2 - r() * 26, x = s * (bayEdge(z, z1) + 1 + r() * 3), k = .35 + r() * .9;
    rocks.push(o => { o.position.set(x, .1, z); o.rotation.set(r(), r() * 6, r()); o.scale.set(k, k * (.55 + r() * .4), k); });
  }
  for (let i = 0; i < 7; i++) {
    const x = -14 + r() * 28, z = z1 + 2.2 + r() * 3, k = .25 + r() * .3;
    rocks.push(o => { o.position.set(x, .08, z); o.rotation.set(0, r() * 6, 0); o.scale.set(k, k * .7, k); });
  }
  g.add(scatter(THREE, new THREE.DodecahedronGeometry(1), mat(0x8a8f86), rocks));
  const dunes = [];
  for (let i = 0; i < 12; i++) {
    const s = i % 2 ? 1 : -1, z = z1 - 4 - r() * 24, x = s * (bayEdge(z, z1) + 4 + r() * 4), k = 1.6 + r() * 2;
    dunes.push(o => { o.position.set(x, 0, z); o.rotation.set(0, r() * 6, 0); o.scale.set(k, .35 + r() * .25, k * (1 + r())); });
  }
  g.add(scatter(THREE, new THREE.SphereGeometry(1, 12, 8), mat(0xe2d29e, false), dunes));
  return g;
}
