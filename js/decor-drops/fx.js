import * as THREE from 'three';
import { decorMeshes } from '../game.js';
import { SET_OF, pose, swarmAt, puffAt } from './fx-math.js';

let active = new Set();
window.addEventListener('decor-set-fx', (e) => { active = new Set(Array.isArray(e.detail) ? e.detail : []); });

const m4 = new THREE.Matrix4();

function animParts(m) {
  if (!m.userData.fxParts) {
    const parts = [];
    m.traverse(o => { if (o !== m && o.userData?.anim) parts.push(o); });
    m.userData.fxParts = parts;
  }
  return m.userData.fxParts;
}

function applyPose(o, p) {
  if (p.rot) for (const [k, v] of Object.entries(p.rot)) o.rotation[k] = v;
  if (p.scaleY != null) o.scale.y = p.scaleY;
  if (p.y != null) o.position.y = p.y;
  if (p.visible != null) o.visible = p.visible;
}

function drive(o, t, on) {
  const u = o.userData;
  if (o.isInstancedMesh && Array.isArray(u.pts)) {
    u.pts.forEach((pt, i) => {
      const q = swarmAt(u, pt, t, on);
      m4.makeScale(q.s, q.s, q.s).setPosition(q.x, q.y, q.z);
      o.setMatrixAt(i, m4);
    });
    o.instanceMatrix.needsUpdate = true;
    return;
  }
  applyPose(o, pose(u, t, on));
  if (u.anim === 'steam' && on) {
    for (const c of o.children) {
      const q = puffAt(c.userData, u, t);
      c.position.set(q.x, q.y, q.z);
      c.scale.setScalar(q.scale);
      c.material.opacity = q.opacity;
    }
  }
}

export function updateSetFx(t) {
  for (const m of decorMeshes) {
    const set = SET_OF[m.userData.rec?.id];
    if (!set) continue;
    const on = active.has(set);
    if (!on && m.userData.fxRest) continue;
    for (const o of animParts(m)) drive(o, t, on);
    m.userData.fxRest = !on;
  }
}
