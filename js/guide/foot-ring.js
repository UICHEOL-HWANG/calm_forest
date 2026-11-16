import { paintFootRing, paintFootArrow, RING_PX, ARROW_PX } from './foot-ring-art.js';

export const FOOT_RADIUS = 1.12;
const ARROW_SIZE = 1.1;
let shared = null;

function texture(THREE, px, paint) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  paint(c.getContext('2d'), px);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function material(THREE, map) {
  return new THREE.MeshBasicMaterial({ map, color: 0xcfcfcf, transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

export function footAngle(from, to) {
  return Math.atan2(to.x - from.x, to.z - from.z);
}

export function createFootRing(THREE, parent) {
  shared ??= { ring: texture(THREE, RING_PX, paintFootRing), arrow: texture(THREE, ARROW_PX, paintFootArrow) };
  const group = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(FOOT_RADIUS / 0.4, FOOT_RADIUS / 0.4), material(THREE, shared.ring));
  const arrow = new THREE.Mesh(new THREE.PlaneGeometry(ARROW_SIZE, ARROW_SIZE), material(THREE, shared.arrow));
  for (const m of [ring, arrow]) m.rotation.x = -Math.PI / 2;
  ring.renderOrder = 5;
  arrow.renderOrder = 6;
  group.add(ring, arrow);
  group.visible = false;
  parent.add(group);
  function show(x, y, z, angle, t = performance.now() / 1000) {
    if (document.body.classList.contains('concert-open')) { group.visible = false; return; }
    group.position.set(x, y + 0.05, z);
    group.rotation.y = angle;
    const k = Math.sin(t * 3.6);
    ring.scale.setScalar(1 + k * 0.025);
    ring.material.opacity = 0.9 + k * 0.1;
    arrow.position.z = FOOT_RADIUS + ARROW_SIZE * 0.68 + (Math.sin(t * 5.2) * 0.5 + 0.5) * 0.16;
    group.visible = true;
  }
  function hide() { group.visible = false; }
  return { show, hide, group };
}

export function footHintCss(sel) {
  return `${sel}{position:absolute;top:76px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;white-space:nowrap;padding:6px 13px 6px 10px;border-radius:999px;background:linear-gradient(#fffdf5,#fff3d6);border:1.5px solid #f3c55a;color:#6a4708;font-size:13px;font-weight:800;letter-spacing:-.01em;box-shadow:0 4px 12px rgba(94,60,0,.28),inset 0 1px 0 #fff}${sel}::before{content:'';width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fff6cc,#ffc94a 60%,#e59a1f);box-shadow:0 0 6px rgba(255,201,74,.9)}`;
}
