import { BOARD_ROW_Y, MENU } from './data.js';

const LEAN = -0.14;

const svgUrl = (ICON_ALL, e) => {
  const raw = ICON_ALL[e.replace(/️/g, '')] || '';
  const m = raw.match(/<svg[\s\S]*<\/svg>/);
  if (m) return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(m[0].replace('<svg', `<svg width="128" height="128"${m[0].includes('xmlns') ? '' : ' xmlns="http://www.w3.org/2000/svg"'}`));
  const src = raw.match(/src="([^"]+)"/);
  return src ? '/' + src[1] : null;
};
const loadImg = url => new Promise(res => { if (!url) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
const tex = (THREE, c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
const plane = (THREE, t, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.9 }));
const zOn = y => 0.1 - (y - 1.12) * 0.14;

function ringCanvas() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  x.strokeStyle = '#ffc94a'; x.lineWidth = 9; x.lineCap = 'round';
  x.beginPath(); x.ellipse(128, 64, 116, 48, -0.04, 0.15, Math.PI * 2 - 0.05); x.stroke();
  return c;
}

function bubbleCanvas(icon, spark) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#fffdf6'; x.strokeStyle = '#e2b54a'; x.lineWidth = 10;
  x.beginPath(); x.roundRect(14, 10, 228, 196, 46); x.fill(); x.stroke();
  x.beginPath(); x.moveTo(104, 204); x.lineTo(128, 246); x.lineTo(152, 204); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(104, 206); x.lineTo(128, 246); x.lineTo(152, 206); x.stroke();
  x.fillRect(100, 196, 56, 12);
  if (icon) x.drawImage(icon, 58, 30, 140, 140);
  if (spark) x.drawImage(spark, 176, 18, 56, 56);
  return c;
}

export async function buildSpecialMark(THREE, menu) {
  const y = BOARD_ROW_Y[menu];
  if (y == null) return null;
  const { ICON_ALL } = await import('../icons/toss-icons-all.js');
  const [icon, spark, star] = await Promise.all([MENU[menu].ico, '✨', '⭐'].map(e => loadImg(svgUrl(ICON_ALL, e))));
  const g = new THREE.Group();
  const ring = plane(THREE, tex(THREE, ringCanvas()), 0.86, 0.15);
  ring.position.set(-0.04, y, zOn(y)); ring.rotation.x = LEAN; g.add(ring);
  if (star) {
    const s = document.createElement('canvas'); s.width = 128; s.height = 128;
    s.getContext('2d').drawImage(star, 4, 4, 120, 120);
    const st = plane(THREE, tex(THREE, s), 0.2, 0.2);
    st.position.set(0.4, y + 0.08, zOn(y + 0.08) + 0.01); st.rotation.set(LEAN, 0, -0.2); g.add(st);
  }
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(THREE, bubbleCanvas(icon, spark)), transparent: true, depthWrite: false, color: 0xd8d2c4 }));
  bubble.scale.set(0.95, 0.95, 1); bubble.position.set(0, 2.3, 0);
  g.add(bubble);
  return g;
}
