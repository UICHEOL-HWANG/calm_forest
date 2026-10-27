const BOOTS = {
  A: { body: 0xf2c230, sole: 0x7a5a2a, trim: 0xfff3c4 },
  B: { body: 0xd8463c, sole: 0x3b2b26, trim: 0xffffff, stripe: true },
  C: { body: 0x4f8f5a, sole: 0x2f2a24, trim: 0xa3d07a, mud: 0x6e5440 },
};

function mesh(THREE, geo, m, x, y, z) {
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; return o;
}

function boot(THREE, mat, look, s) {
  const g = new THREE.Group();
  g.add(mesh(THREE, new THREE.CylinderGeometry(.085 * s, .095 * s, .2 * s, 12), mat(look.body), 0, .1 * s, 0));
  const toe = mesh(THREE, new THREE.SphereGeometry(.1 * s, 12, 8), mat(look.body), 0, .05 * s, .07 * s);
  toe.scale.set(.95, .6, 1.25); g.add(toe);
  g.add(mesh(THREE, new THREE.CylinderGeometry(.097 * s, .097 * s, .028 * s, 16), mat(look.sole), 0, .014 * s, 0));
  const ball = mesh(THREE, new THREE.SphereGeometry(.1 * s, 12, 8), mat(look.sole), 0, .016 * s, .07 * s);
  ball.scale.set(.97, .16, 1.26); g.add(ball);
  const cuff = mesh(THREE, new THREE.TorusGeometry(.088 * s, .018 * s, 6, 16), mat(look.trim), 0, .2 * s, 0);
  cuff.rotation.x = Math.PI / 2; g.add(cuff);
  if (look.stripe) { const st = mesh(THREE, new THREE.CylinderGeometry(.097 * s, .097 * s, .03 * s, 12), mat(look.trim), 0, .12 * s, 0); g.add(st); }
  if (look.mud) [[.06, .05, .12], [-.05, .09, .06], [.02, .14, .08]].forEach(([x, y, z]) => {
    const d = mesh(THREE, new THREE.SphereGeometry(.03 * s, 6, 5), mat(look.mud), x * s, y * s, z * s); d.scale.set(1, .6, .5); g.add(d);
  });
  return g;
}

export function buildMudBoots(THREE, mat, variant, { R, bs }) {
  const look = BOOTS[variant] || BOOTS.A, s = R / .55, g = new THREE.Group();
  [-1, 1].forEach(sd => {
    const b = boot(THREE, mat, look, s);
    b.position.set(sd * R * bs[0] * .42, -.01, R * bs[2] * .55); b.rotation.y = sd * .12; g.add(b);
  });
  return g;
}

function weave(THREE, mat, r1, r2, h, color, dark) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 14, 1, true), mat(color)));
  g.children[0].material.side = THREE.DoubleSide;
  for (let i = 0; i < 4; i++) {
    const y = -h / 2 + h * (i + .5) / 4, r = r2 + (r1 - r2) * (i + .5) / 4;
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.01, .008, 4, 18), mat(dark)); band.rotation.x = Math.PI / 2; band.position.y = y; g.add(band);
  }
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(r2, 14), mat(dark)); bottom.rotation.x = Math.PI / 2; bottom.position.y = -h / 2; g.add(bottom);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r1, .018, 6, 18), mat(dark)); rim.rotation.x = Math.PI / 2; rim.position.y = h / 2; g.add(rim);
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

export function buildMudBasket(THREE, mat, variant, { R, bs, bodyY }) {
  const g = new THREE.Group(), s = R / .55;
  if (variant === 'B') {
    const b = weave(THREE, mat, .2 * s, .17 * s, .18 * s, 0xd8b47a, 0x9a7347);
    b.add(shells(THREE, mat, .2 * s, .09 * s));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.19 * s, .014 * s, 5, 16, Math.PI), mat(0x9a7347));
    handle.position.y = .09 * s; b.add(handle);
    b.position.set(-R * bs[0] * .98, bodyY - R * .25, R * bs[2] * .25); b.rotation.z = .12; g.add(b);
    g.add(strap(THREE, mat, new THREE.Vector3(-R * bs[0] * .9, bodyY - R * .1, R * bs[2] * .2), new THREE.Vector3(R * bs[0] * .5, bodyY + R * .78, R * .1), 0x7a5a36));
    return g;
  }
  const net = variant === 'C';
  const b = net ? weave(THREE, mat, .19 * s, .14 * s, .34 * s, 0x2f6f78, 0x1f4f58) : weave(THREE, mat, .2 * s, .15 * s, .36 * s, 0xcfa86a, 0x8a6a3e);
  if (net) b.children[0].material.wireframe = true;
  b.add(shells(THREE, mat, .19 * s, .14 * s));
  b.scale.setScalar(.85); b.position.set(0, bodyY + R * .62, -R * bs[2] * 1.05); b.rotation.x = -.22; g.add(b);
  [-1, 1].forEach(sd => g.add(strap(THREE, mat,
    new THREE.Vector3(sd * R * .3, bodyY + R * .78, -R * bs[2] * .82), new THREE.Vector3(sd * R * .36, bodyY + R * .62, R * bs[2] * .55), net ? 0x1f4f58 : 0x7a5a36)));
  if (!net) {
    const tag = new THREE.Mesh(new THREE.TorusGeometry(.045 * s, .01 * s, 5, 10), mat(0xd9774f));
    tag.position.set(.1 * s, bodyY + R * .5, -R * bs[2] * 1.26); g.add(tag);
  }
  return g;
}
