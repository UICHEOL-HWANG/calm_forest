import * as THREE from 'three';
import { KAYAK } from './kayak-pose.js';

const MAT = {
  shaft: new THREE.MeshStandardMaterial({ color: 0xf3e6cc, roughness: 0.85 }),
  blade: new THREE.MeshStandardMaterial({ color: 0x3fb3c2, roughness: 0.45 }),
  tip: new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: 0.45 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xe2b04a, roughness: 0.35, metalness: 0.3 }),
  grip: new THREE.MeshStandardMaterial({ color: 0xb2453e, roughness: 0.85 }),
};

function dropShape(w, L) {
  const s = new THREE.Shape();
  s.moveTo(-0.05, 0); s.lineTo(0.05, 0);
  s.bezierCurveTo(w * 0.5, L * 0.15, w, L * 0.45, w, L * 0.7);
  s.absarc(0, L * 0.7, w, 0, Math.PI, false);
  s.bezierCurveTo(-w, L * 0.45, -w * 0.5, L * 0.15, -0.05, 0);
  return s;
}

function bladeGeo(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 14 });
  g.translate(0, 0, -depth / 2); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 2);
  return g;
}

function ring(g, z, r, mat, h) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat);
  m.rotation.x = Math.PI / 2; m.position.z = z; g.add(m);
}

export function makeKayakPaddle() {
  const len = KAYAK.len, root = 0.5, g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, len - root * 2 + 0.1, 10), MAT.shaft);
  shaft.rotation.x = Math.PI / 2; shaft.position.z = len / 2; g.add(shaft);
  const blade = bladeGeo(dropShape(0.2, 0.8), 0.035), tip = bladeGeo(dropShape(0.12, 0.42), 0.05);
  for (const d of [-1, 1]) {
    const z = d > 0 ? len - root : root;
    const b = new THREE.Mesh(blade, MAT.blade); b.position.z = z; b.scale.z = d; g.add(b);
    const tp = new THREE.Mesh(tip, MAT.tip); tp.position.z = z + d * 0.36; tp.scale.z = d; g.add(tp);
    ring(g, z, 0.06, MAT.gold, 0.07);
    ring(g, len / 2 + d * 0.35, 0.058, MAT.grip, 0.28);
  }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return g;
}

const _c = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
const AXIS = new THREE.Vector3(0, 0, 1);

export function placeKayakPaddle(paddle, handR, handL, firstPerson = false) {
  const parent = paddle.parent;
  handR.getWorldPosition(_c); handL.getWorldPosition(_d);
  _d.sub(_c);
  if (_d.lengthSq() < 1e-6) return;
  _c.addScaledVector(_d, 0.5);
  _d.normalize();
  _c.addScaledVector(_d, -KAYAK.len / 2);
  _q.setFromUnitVectors(AXIS, _d);
  parent.updateMatrixWorld(true);
  parent.getWorldQuaternion(_pq);
  paddle.position.copy(parent.worldToLocal(_c));
  paddle.quaternion.copy(_pq.invert().multiply(_q));
  if (firstPerson) { paddle.position.z -= KAYAK.fpAhead; paddle.position.y -= KAYAK.fpDrop; }
}
