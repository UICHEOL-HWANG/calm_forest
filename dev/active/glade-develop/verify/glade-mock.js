import * as THREE from 'three';
import { scene, player, trees, clayMat } from '/js/game.js';
import { GLADE, GLADE_R, BUG_KINDS } from '/js/data/places.js';

const COLOR = Object.fromEntries(BUG_KINDS.map(k => [k.id, k.color]));
const MIX = ['yellow', 'yellow', 'blue', 'yellow', 'green', 'blue', 'yellow', 'green', 'blue', 'yellow', 'rainbow', 'yellow'];
const ANCHOR_Y = 2.5, SAG = 0.5, GAP = 0.95;
let group = null;

const lit = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
const soft = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

export function ring() {
  return trees.map(t => ({ x: t.position.x - GLADE.x, z: t.position.z - GLADE.z }))
    .map(p => ({ ...p, d: Math.hypot(p.x, p.z), a: Math.atan2(p.z, p.x) }))
    .filter(p => p.d > GLADE_R + 0.9 && p.d < GLADE_R + 3.2)
    .sort((p, q) => p.a - q.a);
}

export function clear() {
  if (group) scene.remove(group);
  group = new THREE.Group();
  group.position.set(GLADE.x, 0, GLADE.z);
  scene.add(group);
}

export function stand(where) {
  const z = where === 'swarm' ? 2.4 : 3.2;
  player.position.set(GLADE.x + 0.2, 0, GLADE.z + z);
  player.rotation.y = Math.PI;
  return ring().map(p => +p.a.toFixed(2));
}

function anchors(withPosts) {
  const list = ring().map(p => ({ a: p.a, x: p.x * (1 - 0.7 / p.d), z: p.z * (1 - 0.7 / p.d), post: false }));
  if (!withPosts) return list;
  const out = [];
  list.forEach((p, i) => {
    out.push(p);
    const q = list[(i + 1) % list.length];
    const span = ((q.a - p.a) + Math.PI * 2) % (Math.PI * 2);
    const extra = span > GAP ? Math.round(span / 0.6) - 1 : 0;
    for (let k = 1; k <= extra; k++) {
      const a = p.a + (span * k) / (extra + 1), r = GLADE_R + 1.5;
      out.push({ a, x: Math.cos(a) * r, z: Math.sin(a) * r, post: true });
    }
  });
  return out;
}

function post(p) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, ANCHOR_Y + 0.1, 7), clayMat(0x8a6a4a));
  pole.position.set(p.x, (ANCHOR_Y + 0.1) / 2, p.z); pole.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), clayMat(0xa5835c));
  cap.position.set(p.x, ANCHOR_Y + 0.14, p.z);
  group.add(pole, cap);
}

function curve(p, q) {
  const pts = [];
  for (let s = 0; s <= 14; s++) {
    const u = s / 14;
    pts.push(new THREE.Vector3(p.x + (q.x - p.x) * u, ANCHOR_Y - SAG * 4 * u * (1 - u), p.z + (q.z - p.z) * u));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function bulb(pos, c) {
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 6), clayMat(0x3a3128)); cap.position.copy(pos);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), lit(c)); core.position.copy(pos).setY(pos.y - 0.11);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), soft(c, 0.22)); halo.position.copy(core.position);
  group.add(cap, core, halo);
}

function jar(pos, c) {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 5), clayMat(0x5a4632)); cord.position.copy(pos).setY(pos.y - 0.1);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 10), clayMat(0x8a6a4a)); lid.position.copy(pos).setY(pos.y - 0.22);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.26, 10), new THREE.MeshStandardMaterial({ color: 0xdff5ff, transparent: true, opacity: 0.32, roughness: 0.2 }));
  glass.position.copy(pos).setY(pos.y - 0.37);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lit(c)); core.position.copy(glass.position);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), soft(c, 0.24)); halo.position.copy(glass.position);
  group.add(cord, lid, glass, core, halo);
}

function paper(pos, c) {
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8), clayMat(0x6b5236)); top.position.copy(pos).setY(pos.y - 0.04);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), lit(new THREE.Color(c).multiplyScalar(0.92)));
  body.scale.y = 0.85; body.position.copy(pos).setY(pos.y - 0.2);
  const bottom = top.clone(); bottom.position.setY(pos.y - 0.36);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), soft(c, 0.2)); halo.position.copy(body.position);
  group.add(top, body, bottom, halo);
}

function flag(pos, dir) {
  const g = new THREE.ConeGeometry(0.09, 0.2, 3);
  const m = new THREE.Mesh(g, clayMat(0xf3e6c8));
  m.rotation.set(Math.PI, Math.atan2(dir.x, dir.z), 0);
  m.position.copy(pos).setY(pos.y - 0.12);
  group.add(m);
}

export function strings(v) {
  clear();
  const posts = v !== 'S1';
  const list = anchors(posts);
  list.filter(p => p.post).forEach(post);
  let n = 0, segs = 0;
  list.forEach((p, i) => {
    const q = list[(i + 1) % list.length];
    const span = ((q.a - p.a) + Math.PI * 2) % (Math.PI * 2);
    if (span > GAP) return;
    segs++;
    const c = curve(p, q);
    if (v === 'S1') group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(14)), new THREE.LineBasicMaterial({ color: 0x241d16 })));
    else group.add(new THREE.Mesh(new THREE.TubeGeometry(c, 14, 0.022, 5), clayMat(0x6b5236)));
    const count = v === 'S1' ? 6 : 4;
    for (let s = 1; s <= count; s++) {
      const u = s / (count + 1), pos = c.getPoint(u), col = COLOR[MIX[n++ % MIX.length]];
      if (v === 'S1') bulb(pos, col); else if (v === 'S2') jar(pos, col); else paper(pos, col);
      if (v === 'S3' && s < count) flag(c.getPoint(u + 0.5 / (count + 1)), c.getTangent(u));
    }
  });
  return { anchors: list.length, posts: list.filter(p => p.post).length, segs };
}

function small(c) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), lit(c)), new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), soft(c, 0.24)));
  return g;
}

function big(v, c) {
  const g = new THREE.Group();
  if (v === 'F1') {
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), lit(c)), new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 10), soft(c, 0.26)), new THREE.Mesh(new THREE.SphereGeometry(0.85, 12, 10), soft(c, 0.08)));
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 5, 32), soft(c, 0.5)); ringM.rotation.x = 1.2; g.add(ringM);
  } else if (v === 'F2') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), lit(c)); body.scale.set(1, 0.85, 1.5);
    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), soft(0xffffff, 0.3)); wingL.scale.set(1, 0.08, 0.55); wingL.position.set(-0.24, 0.12, 0); wingL.rotation.z = 0.5;
    const wingR = wingL.clone(); wingR.position.x = 0.24; wingR.rotation.z = -0.5;
    g.add(body, wingL, wingR, new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), soft(c, 0.2)));
  } else {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), clayMat(0x5a4030)); head.position.z = -0.2;
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), lit(c)); tail.position.z = 0.1;
    const wingL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), soft(0xffffff, 0.28)); wingL.scale.set(1, 0.08, 0.6); wingL.position.set(-0.2, 0.14, -0.05); wingL.rotation.z = 0.6;
    const wingR = wingL.clone(); wingR.position.x = 0.2; wingR.rotation.z = -0.6;
    const feelL = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 4), clayMat(0x5a4030)); feelL.position.set(-0.06, 0.1, -0.32); feelL.rotation.x = -0.9;
    const feelR = feelL.clone(); feelR.position.x = 0.06;
    g.add(head, tail, wingL, wingR, feelL, feelR, new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), soft(c, 0.22)));
    g.rotation.y = -Math.PI / 2;
  }
  return g;
}

export function swarm(v) {
  clear();
  const c = 0xffc46b, kid = COLOR.yellow;
  const lead = big(v, c); lead.position.set(1.9, 1.75, -0.4); group.add(lead);
  const pts = [lead.position.clone()];
  [1.1, 0.4, -0.3, -1.0].forEach((x, i) => {
    const f = small(kid); f.position.set(x, 1.55 + 0.14 * Math.sin(i * 1.6), -0.4 + 0.12 * Math.cos(i * 1.3));
    const b = [1, 0.35, 0.6, 0.2][i];
    f.children[0].material.opacity = 0.3 + 0.7 * b; f.children[0].material.transparent = true; f.children[1].material.opacity = 0.06 + 0.3 * b;
    group.add(f); pts.push(f.position.clone());
  });
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xfff2a8, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending })));
  return { v };
}
