import { planAround, nextPoint, pathLength, guideStatus, blocked } from './route.js';

export const GUIDE_TUNING = Object.freeze({ pad: 0.9, gap: 1.6, reach: 1.4, replan: 0.75, near: 15, edge: { side: 44, top: 104, bottom: 132 } });

export function onScreen(p, w, h, m = 24) {
  return !!p && p.x >= m && p.x <= w - m && p.y >= m && p.y <= h - m;
}

export function edgePoint(cx, cy, dx, dy, rect) {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  const kx = ux > 0 ? (rect.x2 - cx) / ux : ux < 0 ? (rect.x1 - cx) / ux : Infinity;
  const ky = uy > 0 ? (rect.y2 - cy) / uy : uy < 0 ? (rect.y1 - cy) / uy : Infinity;
  const k = Math.max(0, Math.min(kx, ky));
  return { x: cx + ux * k, y: cy + uy * k, angle: Math.atan2(ux, -uy) };
}

export function distLabel(m) { return `${Math.max(1, Math.round(m))}m`; }

export function nearBlockers(all, from, to, near) {
  const minX = Math.min(from.x, to.x) - near, maxX = Math.max(from.x, to.x) + near;
  const minZ = Math.min(from.z, to.z) - near, maxZ = Math.max(from.z, to.z) + near;
  return all.filter(b => (b.r !== undefined
    ? b.x + b.r > minX && b.x - b.r < maxX && b.z + b.r > minZ && b.z - b.r < maxZ
    : b.x2 > minX && b.x1 < maxX && b.z2 > minZ && b.z1 < maxZ));
}

const CSS = `#auction-guide-compass{position:fixed;z-index:25;width:clamp(80px,10vw,120px);aspect-ratio:1;display:none;pointer-events:none;transform:translate(-50%,-50%)}
#auction-guide-compass .ag-pointer{position:absolute;left:50%;top:50%;width:100%;height:100%;transform:translate(-50%,-50%) rotate(var(--ag-angle,0rad)) translateY(-45%);animation:ag-pulse 1.5s ease-in-out infinite}
#auction-guide-compass .ag-pointer::before{content:'';position:absolute;left:43%;top:1%;width:14%;height:31%;background:#88d7a0;border-radius:6px;box-shadow:0 0 9px #d5ffdc}
#auction-guide-compass .ag-pointer::after{content:'';position:absolute;left:31%;top:-6%;width:38%;height:28%;background:#a0e9ac;clip-path:polygon(50% 0,100% 100%,50% 78%,0 100%);filter:drop-shadow(0 0 5px #fff)}
#auction-guide-compass .ag-hint{position:absolute;top:110%;left:50%;transform:translateX(-50%);white-space:nowrap;padding:7px 12px;border-radius:14px;background:rgba(255,255,245,.94);color:#365b40;font-size:13px;font-weight:700;box-shadow:0 3px 12px #315b3428}
@keyframes ag-pulse{50%{transform:translate(-50%,-50%) rotate(var(--ag-angle,0rad)) translateY(-45%) scale(1.08)}}
#auction-guide-mark{position:fixed;z-index:26;display:none;pointer-events:none;transform:translate(-50%,-100%);flex-direction:column;align-items:center;gap:2px}
#auction-guide-mark.show{display:flex}
#auction-guide-mark .ag-tri{width:30px;height:24px;background:#f2c14e;clip-path:polygon(0 0,100% 0,50% 100%);filter:drop-shadow(0 2px 3px rgba(80,50,0,.45));animation:ag-bob 1.1s ease-in-out infinite}
#auction-guide-mark .ag-dist,#auction-guide-edge .ag-dist{padding:3px 9px;border-radius:10px;background:rgba(255,250,235,.95);color:#6a4a00;font-size:13px;font-weight:800;box-shadow:0 2px 8px rgba(80,50,0,.25);white-space:nowrap}
@keyframes ag-bob{50%{transform:translateY(6px)}}
#auction-guide-edge{position:fixed;z-index:26;display:none;pointer-events:none;transform:translate(-50%,-50%);flex-direction:column;align-items:center;gap:4px}
#auction-guide-edge.show{display:flex}
#auction-guide-edge .ag-disc{width:46px;height:46px;border-radius:50%;background:rgba(255,250,235,.95);box-shadow:0 3px 10px rgba(80,50,0,.3);display:grid;place-items:center}
#auction-guide-edge .ag-head{width:24px;height:26px;background:#f2c14e;clip-path:polygon(50% 0,100% 100%,50% 76%,0 100%);transform:rotate(var(--ag-angle,0rad))}
body.auction-guide #hint-banner{display:none!important}
@media(prefers-reduced-motion:reduce){#auction-guide-compass .ag-pointer,#auction-guide-mark .ag-tri{animation:none}}`;

export function createAuctionGuide(deps) {
  let active = false, route = [], point = null, replanAt = 0, compass = null, mark = null, edge = null, ring = null, clock = 0;
  const v = { right: new deps.THREE.Vector3(), up: new deps.THREE.Vector3(), d: new deps.THREE.Vector3() };

  function mount() {
    if (compass) return;
    const style = document.createElement('style');
    style.id = 'auction-guide-style';
    style.textContent = CSS;
    document.head.appendChild(style);
    compass = document.createElement('div');
    compass.id = 'auction-guide-compass';
    compass.innerHTML = '<div class="ag-pointer"></div><div class="ag-hint"></div>';
    compass.querySelector('.ag-hint').textContent = deps.t(deps.follow);
    mark = document.createElement('div');
    mark.id = 'auction-guide-mark';
    mark.innerHTML = '<div class="ag-dist"></div><div class="ag-tri"></div>';
    edge = document.createElement('div');
    edge.id = 'auction-guide-edge';
    edge.innerHTML = '<div class="ag-disc"><div class="ag-head"></div></div><div class="ag-dist"></div>';
    document.body.append(compass, mark, edge);
    const THREE = deps.THREE;
    ring = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.75, 64),
      new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(deps.spot.x, 0.07, deps.spot.z);
    ring.visible = false;
    deps.scene.add(ring);
  }

  function hide() {
    if (!compass) return;
    compass.style.display = 'none';
    mark.classList.remove('show');
    edge.classList.remove('show');
    ring.visible = false;
  }

  function pos() { return { x: deps.player.position.x, z: deps.player.position.z }; }

  function replan() {
    const from = pos(), { big, small } = deps.solids(), near = GUIDE_TUNING.near;
    route = planAround(from, deps.spot, nearBlockers(big, from, deps.spot, near), nearBlockers(small, from, deps.spot, near), { pad: GUIDE_TUNING.pad, gap: GUIDE_TUNING.gap, inside: deps.inside });
    replanAt = clock + GUIDE_TUNING.replan;
  }

  function legBlocked(here) {
    const { big, small } = deps.solids();
    return blocked(here, route[0], [...big, ...nearBlockers(small, here, route[0], 2)], GUIDE_TUNING.pad);
  }

  function start() {
    if (active) return;
    mount();
    active = true;
    clock = 0;
    replan();
    document.body.classList.add('auction-guide');
    deps.track('guide_step', { guide: 'auction', step: 1, act: 'start' });
  }

  function stop(act, reason) {
    if (!active) return;
    active = false;
    route = [];
    point = null;
    hide();
    document.body.classList.remove('auction-guide');
    deps.track('guide_step', reason ? { guide: 'auction', step: 1, act, reason } : { guide: 'auction', step: 1, act });
  }

  function angleTo(target) {
    v.d.set(target.x - deps.player.position.x, 0, target.z - deps.player.position.z);
    v.right.set(1, 0, 0).applyQuaternion(deps.camera.quaternion);
    v.up.set(0, 1, 0).applyQuaternion(deps.camera.quaternion);
    return Math.atan2(v.d.dot(v.right), v.d.dot(v.up));
  }

  function drawTarget(meters) {
    const w = window.innerWidth, h = window.innerHeight;
    const label = distLabel(meters);
    const at = deps.project({ x: deps.spot.x, y: 0, z: deps.spot.z }, 1.4);
    if (onScreen(at, w, h, 30)) {
      edge.classList.remove('show');
      mark.style.left = at.x + 'px';
      mark.style.top = at.y + 'px';
      mark.querySelector('.ag-dist').textContent = label;
      mark.classList.add('show');
      return;
    }
    mark.classList.remove('show');
    const e = GUIDE_TUNING.edge;
    const rect = { x1: e.side, y1: e.top, x2: w - e.side, y2: h - e.bottom };
    const cx = w / 2, cy = h / 2;
    const a = angleTo(deps.spot);
    const dir = at ? { x: at.x - cx, y: at.y - cy } : { x: Math.sin(a), y: -Math.cos(a) };
    const p = edgePoint(cx, cy, dir.x, dir.y, rect);
    edge.style.left = p.x + 'px';
    edge.style.top = p.y + 'px';
    edge.style.setProperty('--ag-angle', p.angle + 'rad');
    edge.querySelector('.ag-dist').textContent = label;
    edge.classList.add('show');
  }

  function update(dt) {
    if (!active) return;
    clock += dt;
    const status = guideStatus({ open: deps.open(), inVillage: deps.inVillage(), pos: pos(), spot: deps.spot, reach: deps.reach });
    if (status === 'arrive') { stop('arrive'); return; }
    if (status !== 'go') { stop('cancel', status); return; }
    const here = pos();
    route = nextPoint(route, here, GUIDE_TUNING.reach).route;
    if (clock >= replanAt) {
      if (legBlocked(here)) replan();
      else replanAt = clock + GUIDE_TUNING.replan;
    }
    point = route[0];
    if (!deps.visible() || document.hidden) { hide(); return; }
    const feet = deps.project(deps.player.position, 0);
    if (!feet) { hide(); return; }
    compass.style.left = feet.x + 'px';
    compass.style.top = (feet.y - 22) + 'px';
    compass.style.setProperty('--ag-angle', angleTo(point) + 'rad');
    compass.style.display = 'block';
    ring.visible = true;
    ring.material.opacity = 0.6 + 0.3 * Math.sin(clock * 4);
    drawTarget(pathLength(here, route));
  }

  return {
    start, update,
    cancel: reason => stop('cancel', reason),
    get active() { return active; },
    get target() { return point; },
    get route() { return route.map(p => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2) })); },
  };
}
