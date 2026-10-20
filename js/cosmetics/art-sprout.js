import { DOME_BOT, onSurf, neckAnchor } from './anchors.js';

export const KP = Object.freeze({
  yellow: 0xf7c843, yellowDark: 0xdba52c, red: 0xd2604f,
  green: 0x4f9a5a, greenDark: 0x3d7d48,
  tulip: 0xe0788a, tulipDark: 0xc25e72, plate: 0xd8d2c2,
});

function lift(g, grp) {
  grp.updateMatrix();
  for (const m of [...grp.children]) {
    m.updateMatrix();
    m.matrix.premultiply(grp.matrix);
    m.matrix.decompose(m.position, m.quaternion, m.scale);
    g.add(m);
  }
  g.remove(grp);
}

export function buildKinderHat(THREE, g, k, h) {
  const { clay, put } = h;
  const HR = k.HR, r = HR * 1.06;
  const y0 = DOME_BOT * HR, rc = Math.sqrt(r * r - y0 * y0) * 1.02, H = HR * 0.36, DOME = 0.56;
  const side = put(g, new THREE.Mesh(new THREE.CylinderGeometry(rc * 0.97, rc, H, 24, 1, true), clay(KP.yellow, false)), 0, y0 + H / 2, 0);
  side.material.side = THREE.DoubleSide;
  const cap = put(g, new THREE.Mesh(new THREE.SphereGeometry(rc * 0.97, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), clay(KP.yellow, false)), 0, y0 + H, 0);
  cap.scale.y = DOME;
  put(g, new THREE.Mesh(new THREE.SphereGeometry(HR * 0.07, 8, 6), clay(KP.yellowDark)), 0, y0 + H + rc * 0.97 * DOME - HR * 0.01, 0, false);
  const band = put(g, new THREE.Mesh(new THREE.CylinderGeometry(rc, rc * 1.015, HR * 0.13, 24, 1, true), clay(KP.green)), 0, y0 + HR * 0.08, 0, false);
  band.material.side = THREE.DoubleSide;
  const A = Math.PI * 0.62;
  const bow = new THREE.Group();
  bow.position.set(Math.cos(A) * rc * 1.04, y0 + HR * 0.08, Math.sin(A) * rc * 1.04);
  bow.rotation.y = Math.PI / 2 - A;
  g.add(bow);
  [-1, 1].forEach(t => {
    const wing = put(bow, new THREE.Mesh(new THREE.BoxGeometry(HR * 0.17, HR * 0.11, HR * 0.04), clay(KP.green)), t * HR * 0.10, 0, 0, false);
    wing.rotation.z = t * 0.25;
  });
  put(bow, new THREE.Mesh(new THREE.BoxGeometry(HR * 0.06, HR * 0.13, HR * 0.06), clay(KP.greenDark)), 0, 0, HR * 0.01, false);
  lift(g, bow);
  const brim = put(g, new THREE.Mesh(new THREE.CylinderGeometry(rc, rc * 1.30, HR * 0.30, 28, 1, true), clay(KP.yellow)), 0, y0 - HR * 0.13, 0);
  brim.material.side = THREE.DoubleSide;
}

export function buildTulipTag(THREE, g, k, h) {
  const { clay, put, P } = h;
  const r = k.neckR, w = r * 0.82;
  const cord = put(g, new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.06, 5, 22), clay(P.leaf)), 0, 0, 0);
  cord.rotation.x = Math.PI / 2;
  const sp = onSurf(k.bs, k.R, k.bodyY, 0.30, 0.62, 0.78, 1.10);
  const na = neckAnchor(k.HR, k.HY);
  const tag = new THREE.Group();
  tag.position.set(sp.x - na.x, sp.y - na.y, sp.z - na.z);
  tag.rotation.set(-0.45, 0.30, 0);
  g.add(tag);
  const body = put(tag, new THREE.Mesh(new THREE.SphereGeometry(w * 0.5, 12, 9), clay(KP.tulip)), 0, 0, 0);
  body.scale.set(1, 0.95, 0.30);
  [-1, 0, 1].forEach(t => {
    const tip = put(tag, new THREE.Mesh(new THREE.ConeGeometry(w * 0.20, w * 0.42, 4), clay(t ? KP.tulip : KP.tulipDark)), t * w * 0.28, w * 0.48 - Math.abs(t) * w * 0.05, 0, false);
    tip.scale.z = 0.5;
    tip.rotation.z = -t * 0.35;
  });
  put(tag, new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, w * 0.30, w * 0.06), clay(KP.plate)), 0, -w * 0.02, w * 0.15, false);
  const lf = put(tag, new THREE.Mesh(new THREE.SphereGeometry(w * 0.22, 7, 5), clay(P.leaf)), w * 0.30, -w * 0.48, 0, false);
  lf.scale.set(1, 0.5, 0.25);
  lf.rotation.z = 0.6;
  put(tag, new THREE.Mesh(new THREE.CylinderGeometry(w * 0.04, w * 0.04, w * 0.42, 5), clay(P.stem)), 0, -w * 0.58, 0, false);
  lift(g, tag);
}

export function buildKinderBag(THREE, g, k, h) {
  const { clay, put, P, strapOf, strapLoop } = h;
  const R = k.R, w = R * 0.80, hang = -w * 0.42;
  const disc = put(g, new THREE.Mesh(new THREE.CylinderGeometry(w * 0.42, w * 0.42, w * 0.17, 22), clay(KP.yellow)), 0, hang, 0);
  disc.rotation.z = Math.PI / 2;
  const trim = put(g, new THREE.Mesh(new THREE.TorusGeometry(w * 0.40, w * 0.045, 5, 24), clay(KP.red)), -w * 0.09, hang, 0, false);
  trim.rotation.y = Math.PI / 2;
  const s = w * 0.30, sprout = new THREE.Group();
  sprout.position.set(-w * 0.10, hang - w * 0.20, 0);
  sprout.rotation.z = Math.PI / 2;
  g.add(sprout);
  put(sprout, new THREE.Mesh(new THREE.CylinderGeometry(s * 0.10, s * 0.12, s * 0.7, 5), clay(P.stem)), 0, s * 0.35, 0, false);
  [-1, 1].forEach(t => {
    const lf = put(sprout, new THREE.Mesh(new THREE.SphereGeometry(s * 0.55, 7, 5), clay(t < 0 ? P.leaf : P.leafLit)), t * s * 0.45, s * 0.78, 0, false);
    lf.scale.set(1, 0.16, 0.62);
    lf.rotation.z = t * 0.45;
  });
  lift(g, sprout);
  put(g, new THREE.Mesh(new THREE.BoxGeometry(w * 0.10, w * 0.20, w * 0.20), clay(KP.yellowDark)), 0, hang + w * 0.46, 0, false);
  strapLoop(g, w * 0.15, w * 0.05, clay(KP.red));
  strapOf(g, k, R * 0.078, clay(KP.red));
}
