import * as THREE from 'three';
import { waypoint, edgeArrow } from './route.js';

export function createGuideView({ scene, camera, root }) {
  const gold = 0xffc94a;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 28), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.visible = false; ring.renderOrder = 5; scene.add(ring);
  const sh = new THREE.Shape(); sh.moveTo(0, 0.55); sh.lineTo(0.42, -0.25); sh.lineTo(0, -0.05); sh.lineTo(-0.42, -0.25); sh.closePath();
  const chev = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: gold, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }));
  chev.visible = false; chev.renderOrder = 5; scene.add(chev);
  const card = root.querySelector('#guide-card'), mark = root.querySelector('#guide-mark'), edge = root.querySelector('#guide-edge');
  const v = new THREE.Vector3();
  let cardKey = null, markKey = null, edgeKey = null;
  const html = (el, key, last, s) => { if (key !== last) el.innerHTML = s; return key; };
  function hide() { ring.visible = chev.visible = false; card.hidden = mark.hidden = edge.hidden = true; }
  function show(step, index, total, ctx, me, solids, groundY = 0) {
    if (!step) return hide();
    card.hidden = false;
    const text = typeof step.text === 'function' ? step.text(ctx) : step.text;
    cardKey = html(card, `${index}|${text}`, cardKey, `<small>${index + 1}/${total}</small>${text}`);
    const tgt = step.target(ctx);
    if (!tgt) { ring.visible = chev.visible = false; mark.hidden = edge.hidden = true; return; }
    const d = Math.hypot(tgt.x - me.x, tgt.z - me.z);
    ring.position.set(tgt.x, (tgt.y ?? groundY) + 0.06, tgt.z); ring.visible = true;
    ring.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.12);
    chev.visible = d > 2.5;
    if (chev.visible) {
      const wp = step.via?.(ctx) ?? waypoint(me, tgt, solids), ang = Math.atan2(wp.x - me.x, wp.z - me.z);
      chev.position.set(me.x + Math.sin(ang) * 1.9, groundY + 0.12, me.z + Math.cos(ang) * 1.9);
      chev.quaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, ang + Math.PI, 'XYZ'));
    }
    v.set(tgt.x, (tgt.y ?? groundY) + 1.6, tgt.z).project(camera);
    const r = root.getBoundingClientRect();
    const e = edgeArrow({ x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height, inFront: v.z < 1 }, r.width, r.height);
    const label = `${Math.round(d)}m`;
    mark.hidden = !e.inside; edge.hidden = e.inside;
    if (e.inside) { mark.style.left = `${e.x}px`; mark.style.top = `${e.y}px`; markKey = html(mark, d > 3 ? label : '', markKey, `⬇️<span>${d > 3 ? label : ''}</span>`); }
    else { edge.style.left = `${e.x}px`; edge.style.top = `${e.y}px`; edgeKey = html(edge, `${Math.round(e.deg)}|${label}`, edgeKey, `<i style="transform:rotate(${e.deg}deg)">➜</i><span>${label}</span>`); }
  }
  hide();
  return { show, hide };
}
