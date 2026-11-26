import { UI_FONT } from '../fonts.js';
import { fillIconText, measureIconText } from '../icons/canvas-text.js';
const DARK = 0x6e4a2c;
const COLS = [0.3, 0.75];
const ROWS = 4;
const TOP = 2.9;

export function tagSlots(n) {
  return Array.from({ length: Math.min(n, COLS.length * ROWS) }, (_, i) => ({ x: COLS[Math.floor(i / ROWS)], y: TOP - (i % ROWS) * 0.42 }));
}

const svgUrl = (ICON_ALL, e) => {
  const raw = ICON_ALL[e.replace(/️/g, '')] || '';
  const m = raw.match(/<svg[\s\S]*<\/svg>/);
  if (m) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m[0].replace('<svg', `<svg width="96" height="96"${m[0].includes('xmlns') ? '' : ' xmlns="http://www.w3.org/2000/svg"'}`));
  const src = raw.match(/src="([^"]+)"/);
  return src ? '/' + src[1] : null;
};
const loadImg = url => new Promise(res => { if (!url) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });

async function tagTex(THREE, ICON_ALL, { face, name, menu }) {
  const w = 256, h = 300;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#f6e7c8'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#2f5e47'; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  const [fi, mi] = await Promise.all([loadImg(svgUrl(ICON_ALL, face)), loadImg(svgUrl(ICON_ALL, menu))]);
  if (fi) g.drawImage(fi, w * 0.2, h * 0.08, w * 0.6, w * 0.6);
  g.fillStyle = '#2f3a33'; g.textAlign = 'center';
  let size = Math.round(w * 0.13);
  const font = s => `800 ${s}px ${UI_FONT}`;
  g.font = font(size);
  const maxW = w - 36;
  const tw = measureIconText(g, name).width;
  if (tw > maxW) { size = Math.floor(size * maxW / tw); g.font = font(size); }
  fillIconText(g, name, w / 2, h * 0.68);
  if (mi) g.drawImage(mi, w / 2 - w * 0.12, h * 0.74, w * 0.24, w * 0.24);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function signTex(THREE, label) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#2f5e47'; g.fillRect(0, 0, 384, 128); g.fillStyle = '#fff8e8';
  g.font = `800 52px ${UI_FONT}`; g.textAlign = 'center'; fillIconText(g, label, 192, 128 * 0.68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const box = (THREE, w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
const plane = (THREE, tex, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));

export async function buildRegularBoard(THREE, regs, label = '단골') {
  const { ICON_ALL } = await import('../icons/toss-icons-all.js');
  const g = new THREE.Group();
  const post = box(THREE, 0.1, TOP + 0.6, 0.1, DARK); post.position.y = (TOP + 0.6) / 2; g.add(post);
  const arm = box(THREE, 1.2, 0.07, 0.07, DARK); arm.position.set(0.55, TOP + 0.5, 0); g.add(arm);
  const sm = plane(THREE, signTex(THREE, label), 0.5, 0.17); sm.position.set(0.55, TOP + 0.34, 0.04); g.add(sm);
  const slots = tagSlots(regs.length);
  for (let i = 0; i < slots.length; i++) {
    const { x, y } = slots[i];
    const cord = box(THREE, 0.015, 0.08, 0.015, 0x4b3a2a); cord.position.set(x, y + 0.2, 0.03); g.add(cord);
    const p = plane(THREE, await tagTex(THREE, ICON_ALL, regs[i]), 0.32, 0.37);
    p.position.set(x, y, 0.07); p.rotation.z = (i % 2 ? 1 : -1) * 0.05; g.add(p);
  }
  return g;
}
