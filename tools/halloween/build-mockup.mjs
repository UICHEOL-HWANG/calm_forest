// tools/halloween/build-mockup.mjs — 단독 HTML 하나로 만든다. 워크트리 preview 가 루트를 띄우는 함정 때문에
// three·조형 모듈을 data URL 로 인라인해 외부 경로가 없게 한다. WebGL 컨텍스트는 하나만 쓰고 <img> 로 굳힌다(컨텍스트 수 제한 회피).
// 사용: node tools/halloween/build-mockup.mjs  →  dev/active/halloween-coin-decor/look/mockups.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const b64 = (p) => 'data:text/javascript;base64,' + Buffer.from(readFileSync(new URL(p, root))).toString('base64');
const importmap = { imports: { three: b64('vendor/three/three.module.js'), art: b64('js/spaces/halloween-art.js') } };
const names = { ghostCandle: '👻 유령 촛불 150', miniGrave: '🪦 미니 묘비 200', witchCauldron: '🧙 마녀 솥 450', ghostlamp: '👻 유령 정원등 200', gravefence: '🪦 묘비 울타리 280', webarch: '🕸️ 거미줄 아치 500' };
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>할로윈 코인 장식 시안</title>
<style>body{margin:0;font:14px system-ui;background:#f4efe6;color:#3b3328}h2{margin:18px 12px 6px}.row{display:flex;gap:12px;padding:0 12px;flex-wrap:wrap}
.card{background:#fff;border-radius:12px;padding:8px;box-shadow:0 2px 8px #0002}.card b{display:block;margin-bottom:4px}.card small{opacity:.6}img{display:block;border-radius:8px}
.bar{position:sticky;top:0;background:#f4efe6;padding:8px 12px;z-index:2}button{font:inherit;padding:6px 12px;border-radius:8px;border:0;background:#3b3328;color:#fff}</style>
<div class="bar"><button id="tgl">낮/밤 전환</button> <small>각 안: 왼쪽 PC 근접 · 오른쪽 모바일 거리(게임 시점 축소)</small></div><div id="root"></div>
<script type="importmap">${JSON.stringify(importmap)}</script>
<script type="module">
import * as THREE from 'three';
import { HALLOWEEN_STYLES, HALLOWEEN_INDOOR_IDS, makeCtx, buildHalloween } from 'art';
const NAMES = ${JSON.stringify(names)}; let night = false; const nightMats = [], views = [];
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
function addView(id, style, w, h, dist) {
  const img = new Image(); img.width = w; img.height = h;
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(35, w / h, 0.1, 50);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 0.9)); const sun = new THREE.DirectionalLight(0xfff0d0, 1.1); sun.position.set(3, 5, 4); sc.add(sun);
  sc.add(new THREE.Mesh(new THREE.CircleGeometry(3, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9bbf7a })));
  const indoor = HALLOWEEN_INDOOR_IDS.includes(id);
  const m = buildHalloween(THREE, id, style, makeCtx(THREE, mat => nightMats.push(mat))); if (indoor) m.scale.setScalar(1.5); sc.add(m);
  cam.position.set(dist * 0.6, dist * 0.5, dist); cam.lookAt(0, indoor ? 0.5 : 0.8, 0);
  views.push({ img, w, h, sc, cam, sun }); return img;
}
function draw() {
  nightMats.forEach(mm => { mm.emissiveIntensity = night ? 1 : 0; });
  for (const v of views) { renderer.setPixelRatio(2); renderer.setSize(v.w, v.h); v.sc.background = new THREE.Color(night ? 0x141a2e : 0xcfe6f5); v.sun.intensity = night ? 0.15 : 1.1; renderer.render(v.sc, v.cam); v.img.src = renderer.domElement.toDataURL('image/png'); }
}
const rootEl = document.getElementById('root');
for (const [id, styles] of Object.entries(HALLOWEEN_STYLES)) {
  const indoor = HALLOWEEN_INDOOR_IDS.includes(id), dist = id === 'webarch' ? 8 : id === 'ghostCandle' ? 1.2 : id === 'miniGrave' ? 1.6 : indoor ? 2.2 : id === 'gravefence' ? 3 : 4.2;
  rootEl.insertAdjacentHTML('beforeend', '<h2>' + NAMES[id] + '</h2><div class="row" id="r-' + id + '"></div>');
  const row = document.getElementById('r-' + id);
  styles.forEach((s, i) => { const c = document.createElement('div'); c.className = 'card'; c.innerHTML = '<b>' + 'ABC'[i] + '안 <small>' + s + '</small></b>';
    const wrap = document.createElement('div'); wrap.style.cssText = 'display:flex;gap:8px;align-items:flex-end';
    wrap.append(addView(id, s, 240, 240, dist), addView(id, s, 110, 110, dist * 1.6)); c.append(wrap); row.append(c); });
}
document.getElementById('tgl').onclick = () => { night = !night; draw(); }; draw();
</script>`;
mkdirSync(new URL('dev/active/halloween-coin-decor/look/', root), { recursive: true });
writeFileSync(new URL('dev/active/halloween-coin-decor/look/mockups.html', root), html);
console.log('wrote mockups.html');
