// =============================================================
//  🏮 오라 렌더러 — THREE.Points 1개(드로우콜 +1), 입자 최대 24.
//  궤적은 순수 함수 auraPoints 로 분리(Node 테스트). 장착한 오라는 하나뿐이라
//  모양별 캔버스 텍스처를 그때그때 갈아 끼운다(아틀라스 불필요). 블룸 임계 0.85 를 넘지 않게 색을 0.8 배.
// =============================================================
import { hexOf } from './palette.js';
import { COUNT_MAX } from './recipe.js';

export const AURA_R = 0.62;
export const BAND_Y = Object.freeze({ feet: 0.12, body: 0.55, head: 1.15 });
const TAU = Math.PI * 2;

export function lookOf(slot) {
  const r = slot.recipe, t = slot.tune || {};
  return { ...r, count: t.count ?? r.count, speed: t.speed ?? r.speed, radius: t.radius ?? r.radius, colors: t.colors ?? r.colors };
}

export function auraPoints(look, t, out = []) {
  const n = look.count, R = AURA_R * look.radius, y0 = BAND_Y[look.band] ?? BAND_Y.body;
  const s = t * look.speed;
  out.length = n;
  for (let i = 0; i < n; i++) {
    const p = i / n, ph = p * TAU + i * 1.7;
    let x, y, z;
    switch (look.motion) {
      case 'orbit': { const a = ph + s; x = Math.cos(a) * R; z = Math.sin(a) * R; y = y0 + Math.sin(s * 2 + ph) * 0.06; break; }
      case 'spiral': { const k = (s * 0.35 + p) % 1, a = ph + s * 1.6; x = Math.cos(a) * R * (1 - k * 0.5); z = Math.sin(a) * R * (1 - k * 0.5); y = y0 - 0.3 + k * 0.9; break; }
      case 'rise': { const k = (s * 0.3 + p) % 1; x = Math.sin(ph * 3) * R * 0.8; z = Math.cos(ph * 3) * R * 0.8; y = y0 - 0.2 + k * 0.9; break; }
      case 'fall': { const k = (s * 0.25 + p) % 1; x = Math.sin(ph * 3 + s) * R * 0.9; z = Math.cos(ph * 2 + s) * R * 0.9; y = y0 + 0.7 - k * 0.8; break; }
      case 'drift': { x = Math.sin(s * 0.7 + ph * 2) * R * 0.95; z = Math.cos(s * 0.5 + ph * 3) * R * 0.95; y = y0 + Math.sin(s * 0.4 + ph) * 0.25; break; }
      default: { const k = (Math.sin(s * 2 + ph) + 1) / 2, rr = R * (0.6 + k * 0.4); x = Math.cos(ph) * rr; z = Math.sin(ph) * rr; y = y0 + k * 0.1; }   // pulse
    }
    const h = Math.hypot(x, z), lim = R * 1.05;
    if (h > lim) { x *= lim / h; z *= lim / h; }
    const o = out[i] || (out[i] = {});
    o.x = x; o.y = Math.max(0, y); o.z = z; o.k = 0.55 + 0.45 * ((Math.sin(s * 3 + ph * 5) + 1) / 2);
  }
  return out;
}

// 모양 텍스처 — 64px 캔버스에 흰색으로 그려 vertex color 로 물들인다
function drawShape(ctx, shape) {
  const S = 64, c = S / 2;
  ctx.clearRect(0, 0, S, S); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath();
  const star = (r1, r2, n) => { for (let i = 0; i < n * 2; i++) { const r = i % 2 ? r2 : r1, a = (i * Math.PI) / n - Math.PI / 2; ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } ctx.fill(); };
  switch (shape) {
    case 'petal': ctx.ellipse(c, c, 11, 24, 0.6, 0, TAU); ctx.fill(); break;
    case 'leaf': ctx.ellipse(c, c, 10, 25, -0.5, 0, TAU); ctx.fill(); break;
    case 'star': star(26, 11, 5); break;
    case 'drop': ctx.moveTo(c, 6); ctx.quadraticCurveTo(c + 22, c + 8, c, 56); ctx.quadraticCurveTo(c - 22, c + 8, c, 6); ctx.fill(); break;
    case 'firefly': { const g = ctx.createRadialGradient(c, c, 2, c, c, 30); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, S, S); break; }
    case 'snow': for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; ctx.moveTo(c - Math.cos(a) * 24, c - Math.sin(a) * 24); ctx.lineTo(c + Math.cos(a) * 24, c + Math.sin(a) * 24); } ctx.stroke(); break;
    case 'heart': ctx.moveTo(c, 52); ctx.bezierCurveTo(4, 30, 14, 6, c, 20); ctx.bezierCurveTo(50, 6, 60, 30, c, 52); ctx.fill(); break;
    case 'note': ctx.ellipse(c - 6, 46, 11, 8, -0.4, 0, TAU); ctx.fill(); ctx.fillRect(c + 3, 10, 5, 36); ctx.fillRect(c + 3, 10, 16, 6); break;
    case 'bubble': ctx.arc(c, c, 22, 0, TAU); ctx.stroke(); ctx.globalAlpha = 0.25; ctx.fill(); ctx.globalAlpha = 1; break;
    default: ctx.arc(c, c, 14, 0, TAU); ctx.fill();   // dot
  }
}

export function createAuraFx(THREE) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT_MAX * 3), col = new Float32Array(COUNT_MAX * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setDrawRange(0, 0);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.PointsMaterial({ size: 0.16, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false; points.visible = false;
  let look = null, t = 0;
  const buf = [], cA = new THREE.Color(), cB = new THREE.Color();
  return {
    points,
    setLook(next) {
      look = next;
      points.visible = !!look;
      if (!look) { geo.setDrawRange(0, 0); return; }
      drawShape(canvas.getContext('2d'), look.shape); tex.needsUpdate = true;
      cA.setHex(hexOf(look.colors[0])).multiplyScalar(0.8); cB.setHex(hexOf(look.colors[1])).multiplyScalar(0.8);
      geo.setDrawRange(0, look.count);
    },
    update(dt, origin, { nightLevel = 0 } = {}) {
      if (!look) return;
      t += dt;
      auraPoints(look, t, buf);
      for (let i = 0; i < look.count; i++) {
        const p = buf[i], c = i % 2 ? cB : cA, k = p.k * (0.65 + 0.35 * nightLevel);
        pos[i * 3] = origin.x + p.x; pos[i * 3 + 1] = origin.y + p.y; pos[i * 3 + 2] = origin.z + p.z;
        col[i * 3] = c.r * k; col[i * 3 + 1] = c.g * k; col[i * 3 + 2] = c.b * k;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose(); },
  };
}
