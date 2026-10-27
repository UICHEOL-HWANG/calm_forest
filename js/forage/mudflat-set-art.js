export const MUD_GEAR = 'mud_gear';

const BOOT = { body: 0xd8463c, sole: 0x3b2b26, trim: 0xffffff };
const WICKER = 0xd8b47a, WICKER_DARK = 0x9a7347;

function mesh(THREE, geo, m, x, y, z) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o;
}

function boot(THREE, mat, s) {
  const g = new THREE.Group();
  g.add(mesh(THREE, new THREE.CylinderGeometry(.085 * s, .095 * s, .2 * s, 12), mat(BOOT.body), 0, .1 * s, 0));
  const toe = mesh(THREE, new THREE.SphereGeometry(.1 * s, 12, 8), mat(BOOT.body), 0, .05 * s, .07 * s);
  toe.scale.set(.95, .6, 1.25); g.add(toe);
  g.add(mesh(THREE, new THREE.CylinderGeometry(.097 * s, .097 * s, .028 * s, 16), mat(BOOT.sole), 0, .014 * s, 0));
  const ball = mesh(THREE, new THREE.SphereGeometry(.1 * s, 12, 8), mat(BOOT.sole), 0, .016 * s, .07 * s);
  ball.scale.set(.97, .16, 1.26); g.add(ball);
  const cuff = mesh(THREE, new THREE.TorusGeometry(.088 * s, .018 * s, 6, 16), mat(BOOT.trim), 0, .2 * s, 0);
  cuff.rotation.x = Math.PI / 2; g.add(cuff);
  g.add(mesh(THREE, new THREE.CylinderGeometry(.097 * s, .097 * s, .03 * s, 12), mat(BOOT.trim), 0, .12 * s, 0));
  return g;
}

export function buildMudBoots(THREE, mat, { R, bs }) {
  const s = R / .55, g = new THREE.Group();
  [-1, 1].forEach(sd => {
    const b = boot(THREE, mat, s);
    b.position.set(sd * R * bs[0] * .34, -.01, R * bs[2] * .08); b.rotation.y = sd * .12;
    b.userData.baseY = b.position.y; g.add(b);
  });
  return g;
}

function shells(THREE, mat, r, y) {
  const g = new THREE.Group();
  [[0xe9dcc2, 0, 0], [0xc78a5a, .5, .4], [0xf2b8a2, -.5, .2], [0xf05a3c, .2, -.5]].forEach(([c, a, b], i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(r * .32, 8, 6), mat(c)); s.scale.set(1, .5, .85);
    s.position.set(a * r * .6, y + (i % 2) * .015, b * r * .6); g.add(s);
  });
  return g;
}

function strap(THREE, mat, from, to, color) {
  const dir = new THREE.Vector3().subVectors(to, from), len = dir.length();
  const m = new THREE.Mesh(new THREE.BoxGeometry(.035, len, .012), mat(color));
  m.position.copy(from).addScaledVector(dir, .5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function buildMudBasket(THREE, mat, { R, bs, bodyY }) {
  const g = new THREE.Group(), s = R / .55, r1 = .2 * s, r2 = .17 * s, h = .18 * s;
  const b = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 14, 1, true), mat(WICKER)); wall.material.side = THREE.DoubleSide; b.add(wall);
  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry((r2 + (r1 - r2) * (i + .5) / 4) * 1.01, .008, 4, 18), mat(WICKER_DARK));
    band.rotation.x = Math.PI / 2; band.position.y = -h / 2 + h * (i + .5) / 4; b.add(band);
  }
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(r2, 14), mat(WICKER_DARK)); bottom.rotation.x = Math.PI / 2; bottom.position.y = -h / 2; b.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r1, .018, 6, 18), mat(WICKER_DARK)); rim.rotation.x = Math.PI / 2; rim.position.y = h / 2; b.add(rim);
  b.add(shells(THREE, mat, r1, .09 * s));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.19 * s, .014 * s, 5, 16, Math.PI), mat(WICKER_DARK));
  handle.position.y = .09 * s; b.add(handle);
  b.position.set(-R * bs[0] * .98, bodyY - R * .25, R * bs[2] * .25); b.rotation.z = .12; g.add(b);
  g.add(strap(THREE, mat, new THREE.Vector3(-R * bs[0] * .9, bodyY - R * .1, R * bs[2] * .2), new THREE.Vector3(R * bs[0] * .5, bodyY + R * .78, R * .1), 0x7a5a36));
  return g;
}

const MATS = new Map();
const cached = mat => (c, ...rest) => {
  const key = `${c}|${rest.join('|')}`;
  if (!MATS.has(key)) MATS.set(key, mat(c, ...rest));
  return MATS.get(key);
};

export function buildMudGear(THREE, mat, k) {
  const m = cached(mat), g = new THREE.Group(), boots = buildMudBoots(THREE, m, k);
  g.add(buildMudBasket(THREE, m, k), boots);
  g.traverse(o => { if (o.isMesh) o.userData.skinOwned = true; });
  g.userData.boots = boots;
  return g;
}

export function stepBoots(boots, phase, moving, hop) {
  boots.children.forEach((b, i) => {
    const k = moving ? Math.max(0, Math.sin(phase + i * Math.PI)) : 0;
    b.position.y = b.userData.baseY - hop + k * .1;
    b.rotation.x = -k * .55;
  });
}
