const g = await import('/js/game.js');
const cam = g.camera;
const V = cam.position.constructor;
const NOOP = ['set', 'copy', 'lerp', 'add', 'sub', 'addScaledVector', 'setX', 'setY', 'setZ', 'lerpVectors', 'multiplyScalar', 'applyQuaternion'];

export function lockCam(p, l) {
  const v = new V(p.x, p.y, p.z);
  NOOP.forEach(m => { v[m] = function () { return this; }; });
  Object.defineProperty(cam, 'position', { value: v, configurable: true, enumerable: true, writable: true });
  delete cam.lookAt; delete cam.quaternion.copy; delete cam.quaternion.slerp;
  cam.lookAt(l.x, l.y, l.z);
  cam.lookAt = () => {};
  cam.quaternion.copy = function () { return this; };
  cam.quaternion.slerp = function () { return this; };
}

export function unlockCam() {
  const v = new V(cam.position.x, cam.position.y, cam.position.z);
  Object.defineProperty(cam, 'position', { value: v, configurable: true, enumerable: true, writable: true });
  delete cam.lookAt; delete cam.quaternion.copy; delete cam.quaternion.slerp;
}

export const CAVE = { x: -14, z: 4.2 };
export const ROUTE = [{ x: 4, z: 13 }, { x: 0, z: 11.5 }, { x: -5, z: 9.5 }, { x: -9.5, z: 7 }, { x: -12.5, z: 5.2 }];

const CSS = `
#mk{position:fixed;inset:0;z-index:70;pointer-events:none;font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo",sans-serif}
#mk .bar{position:absolute;left:0;right:0;height:clamp(48px,9vh,90px);background:#0d0f0e}
#mk .top{top:0}#mk .bot{bottom:0}
#mk .cap{position:absolute;left:0;right:0;bottom:0;height:clamp(48px,9vh,90px);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;text-align:center}
#mk .cap small{font-size:clamp(11px,1.5vh,14px);font-weight:700;letter-spacing:.06em;opacity:.8}
#mk .cap b{font-size:clamp(16px,2.8vh,24px);font-weight:800;margin-top:2px}
#mk .skip{position:absolute;top:calc(clamp(48px,9vh,90px) / 2 - 8px);right:16px;color:#fff;font-size:12px;opacity:.75}
#mk .pin{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px}
#mk .pin .lb{padding:5px 10px;border-radius:999px;background:rgba(255,253,246,.96);color:#2f5a3a;font-weight:800;font-size:13px;box-shadow:0 3px 10px rgba(30,60,40,.25);white-space:nowrap}
#mk .pin .dn{font-size:26px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}
#mk .edge{position:absolute;transform:translate(-50%,-50%);display:flex;align-items:center;gap:6px;padding:6px 12px 6px 8px;border-radius:999px;background:rgba(255,253,246,.96);color:#2f5a3a;font-weight:800;font-size:13px;box-shadow:0 3px 12px rgba(30,60,40,.28);white-space:nowrap}
#mk .edge .ar{width:26px;height:26px;border-radius:50%;background:#7fcf95;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px}
#mk svg{position:absolute;inset:0;width:100%;height:100%}
#mk .pip{position:absolute;right:16px;top:86px;width:min(46vw,300px);aspect-ratio:16/10;border-radius:16px;overflow:hidden;border:3px solid #fffdf6;box-shadow:0 8px 24px rgba(20,40,30,.35);background:#cfe3c8}
#mk .pip img{width:100%;height:100%;object-fit:cover;display:block}
#mk .pip .pl{position:absolute;left:0;right:0;bottom:0;padding:6px 10px;background:linear-gradient(transparent,rgba(10,20,15,.75));color:#fff;font-weight:800;font-size:13px}
#mk .pip .pl small{display:block;font-size:11px;opacity:.85;font-weight:700}
#mk .comp{position:absolute;width:96px;height:96px;transform:translate(-50%,-50%)}
#mk .comp .rg{position:absolute;inset:0;border-radius:50%;border:3px solid rgba(255,249,210,.9)}
#mk .comp .nd{position:absolute;left:50%;top:50%;width:0;height:0;transform:translate(-50%,-50%) rotate(var(--a)) translateY(-52px)}
#mk .comp .nd::after{content:'';position:absolute;left:-13px;top:-14px;width:26px;height:24px;background:#8fe0a2;clip-path:polygon(50% 0,100% 100%,50% 76%,0 100%);filter:drop-shadow(0 0 4px #fff)}
#mk .dist{position:absolute;transform:translate(-50%,0);padding:4px 10px;border-radius:999px;background:rgba(255,253,246,.96);color:#2f5a3a;font-weight:800;font-size:12px;box-shadow:0 2px 8px rgba(30,60,40,.25);white-space:nowrap}
`;

function root() {
  document.getElementById('mk')?.remove();
  if (!document.getElementById('mk-css')) {
    const s = document.createElement('style'); s.id = 'mk-css'; s.textContent = CSS + '#spot-layer,.spot-card{display:none!important}';
    document.head.appendChild(s);
  }
  const el = document.createElement('div'); el.id = 'mk'; document.body.appendChild(el);
  return el;
}

export function coach(text, short, n) {
  const c = document.getElementById('coach'); if (!c) return;
  c.classList.add('show', 'open'); document.body.classList.add('coaching');
  document.getElementById('coach-text').textContent = text;
  document.getElementById('coach-short').textContent = short;
  document.getElementById('coach-count').textContent = n;
}

export function clear() { document.getElementById('mk')?.remove(); }

const P = (w, lift = 0) => g.projectToScreen(new V(w.x, 0, w.z), lift);
const dist = () => Math.round(Math.hypot(g.player.position.x - CAVE.x, g.player.position.z - CAVE.z));

export function cineLetterbox(sub, main) {
  const el = root();
  el.innerHTML = `<div class="bar top"></div><div class="bar bot"></div><div class="skip">탭하면 넘어가요</div><div class="cap"><small>${sub}</small><b>${main}</b></div>`;
}

export function cineRoute(sub, main) {
  const el = root();
  const pts = [{ x: g.player.position.x, z: g.player.position.z }, ...ROUTE, CAVE].map(w => P(w)).filter(Boolean);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const end = pts[pts.length - 1];
  el.innerHTML = `<div class="bar top"></div><div class="bar bot"></div><div class="skip">탭하면 넘어가요</div>
    <svg><path d="${d}" fill="none" stroke="#fff9d2" stroke-width="7" stroke-linecap="round" stroke-dasharray="2 16" opacity=".95"/></svg>
    <div class="pin" style="left:${end.x}px;top:${end.y - 40}px"><div class="lb">⛏️ 동굴</div><div class="dn">⬇️</div></div>
    <div class="cap"><small>${sub}</small><b>${main}</b></div>`;
}

export function pip(imgUrl, sub, main) {
  const el = root();
  el.innerHTML = `<div class="pip"><img src="${imgUrl}"><div class="pl"><small>${sub}</small>${main}</div></div>`;
}

function edgeHtml() {
  const W = innerWidth, H = innerHeight, m = 56;
  const me = P(g.player.position, 1.2);
  const tgt = g.projectToScreen(new V(CAVE.x, 0, CAVE.z)) || { x: -W, y: H / 2 };
  const ang = Math.atan2(tgt.y - me.y, tgt.x - me.x);
  const cx = W / 2, cy = H / 2, k = Math.min((W / 2 - m) / Math.abs(Math.cos(ang) || 1e-6), (H / 2 - m - 40) / Math.abs(Math.sin(ang) || 1e-6));
  const ex = Math.min(W - 90, Math.max(90, cx + Math.cos(ang) * k)), ey = Math.min(H - 70, Math.max(110, cy + Math.sin(ang) * k));
  return `<div class="edge" style="left:${ex}px;top:${ey}px"><span class="ar" style="transform:rotate(${ang}rad)">➜</span>⛏️ 동굴 ${dist()}m</div>`;
}

export function arrowPinOrEdge() {
  const el = root();
  const at = P(CAVE, 3.2);
  const W = innerWidth, H = innerHeight, m = 56;
  if (at && at.x > m && at.x < W - m && at.y > m + 60 && at.y < H - m) {
    el.innerHTML = `<div class="pin" style="left:${at.x}px;top:${at.y}px"><div class="lb">⛏️ 동굴 ${dist()}m</div><div class="dn">⬇️</div></div>`;
    return 'pin';
  }
  el.innerHTML = edgeHtml();
  return 'edge';
}

export function trail() {
  const el = root();
  const pts = [{ x: g.player.position.x, z: g.player.position.z }, ...ROUTE, CAVE];
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 1.1));
    for (let j = 0; j < n; j++) dense.push({ x: a.x + (b.x - a.x) * j / n, z: a.z + (b.z - a.z) * j / n });
  }
  const dots = dense.slice(1).map((w, i) => { const p = P(w); if (!p) return ''; const o = Math.max(.25, 1 - i * 0.045); return `<circle cx="${p.x}" cy="${p.y}" r="${6 - Math.min(3, i * 0.12)}" fill="#fff9d2" opacity="${o}"/>`; }).join('');
  const at = P(CAVE, 3.2);
  const inView = at && at.x > 40 && at.x < innerWidth - 40 && at.y > 100 && at.y < innerHeight - 40;
  el.innerHTML = `<svg>${dots}</svg>` + (inView ? `<div class="pin" style="left:${at.x}px;top:${at.y}px"><div class="lb">⛏️ 동굴 ${dist()}m</div><div class="dn">⬇️</div></div>` : edgeHtml());
}

export function compass() {
  const el = root();
  const me = P(g.player.position, 0.05);
  const tgt = g.projectToScreen(new V(CAVE.x, 0, CAVE.z)) || { x: -innerWidth, y: me.y };
  const ang = Math.atan2(tgt.x - me.x, -(tgt.y - me.y));
  el.innerHTML = `<div class="comp" style="left:${me.x}px;top:${me.y}px;--a:${ang}rad"><div class="rg"></div><div class="nd"></div></div>
    <div class="dist" style="left:${me.x}px;top:${me.y + 54}px">⛏️ 동굴까지 ${dist()}m</div>`;
}
