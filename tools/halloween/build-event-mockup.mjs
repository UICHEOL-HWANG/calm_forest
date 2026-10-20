import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const b64 = (p) => 'data:text/javascript;base64,' + Buffer.from(readFileSync(new URL(p, root))).toString('base64');
const importmap = { imports: { three: b64('vendor/three/three.module.js'), art: b64('js/spaces/halloween-art.js') } };

const CONCEPTS = [
  {
    key: 'A', title: 'A · 주민 집 돌기',
    names: ['똑똑, 사탕 주세요', '사탕 받으러 가요'],
    loop: '하루 한 번, 주민 5명에게 말을 걸면 🍬를 하나씩 줘요. 사탕을 줄 수 있는 주민 머리 위에 🍬가 떠요.',
    hud: '🍬 2/5', prompt: '사탕 받기', perDay: '하루 5개(접속만 하면 다 받음)',
    pros: '구조가 가장 단순하다(기존 주민 대화에 붙인다) · 매일 주민을 만나는 이유가 생긴다',
    cons: '탐색 재미는 적다 · 주민이 멀리 있으면 이동이 지루할 수 있다',
  },
  {
    key: 'B', title: 'B · 호박 등불 밝히기',
    names: ['호박 등불 밝히기', '마을에 불 켜기'],
    loop: '밭일·낚시·요리 같은 평소 활동에서 🍬가 가끔 나와요. 사탕 1개로 길가 호박 등불 하나를 켜고, 8개를 다 켜면 마을 전체가 밝아져요.',
    hud: '🎃 3/8', prompt: '사탕 1개로 불 켜기', perDay: '활동량에 비례(하루 약 3~6개)',
    pros: '마을이 눈에 띄게 변해 진행이 보인다 · 평소 루프를 그대로 돌게 한다',
    cons: '드롭 확률 조정이 필요하다 · 다 켠 뒤에는 할 일이 줄어든다',
  },
  {
    key: 'C', title: 'C · 꼬마 유령 숨바꼭질',
    names: ['꼬마 유령 숨바꼭질', '유령을 찾아라'],
    loop: '매일 꼬마 유령 3마리가 마을 곳곳(나무 뒤, 집 모퉁이, 울타리 옆)에 숨어요. 찾아서 누르면 🍬 2개를 주고 날아가요. 숨는 자리는 날마다 바뀌어요.',
    hud: '👻 1/3', prompt: '유령 찾기', perDay: '하루 6개(3마리 × 2)',
    pros: '탐색 재미가 가장 크다 · 릴스·카드뉴스 소재로 쓰기 좋다',
    cons: '숨는 자리를 손으로 정해야 한다(날짜 시드) · 모바일에서 작은 유령이 안 보일 수 있다',
  },
];

const REWARDS = [
  { ico: '🦇', name: '박쥐 깃발 줄', cost: 10 },
  { ico: '🍭', name: '사탕 바구니', cost: 20 },
  { ico: '🎃', name: '웃는 호박', cost: 30 },
];

const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>할로윈 이벤트 시안</title>
<style>
:root{--bg:#f4efe6;--ink:#3b3328;--card:#fff;--mute:#7a6f60;--accent:#e8822e}
body{margin:0;font:14px/1.5 system-ui,-apple-system,'Apple SD Gothic Neo',sans-serif;background:var(--bg);color:var(--ink)}
.bar{position:sticky;top:0;z-index:5;background:var(--bg);padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px solid #0001}
button{font:inherit;padding:6px 12px;border-radius:8px;border:0;background:var(--ink);color:#fff;cursor:pointer}
button.off{background:#cbbfae;color:var(--ink)}
h1{font-size:18px;margin:16px 16px 4px}
.sub{margin:0 16px 12px;color:var(--mute)}
.concept{background:var(--card);border-radius:14px;margin:12px 16px;padding:14px;box-shadow:0 2px 10px #0001}
.concept h2{margin:0 0 6px;font-size:17px}
.names{color:var(--mute);margin-bottom:8px}.names b{color:var(--ink);background:#fbe7d3;border-radius:6px;padding:1px 6px;margin-right:4px}
.shots{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}
.shot{position:relative;border-radius:10px;overflow:hidden;line-height:0}
.shot img{display:block}
.lbl{font-size:11px;color:var(--mute);margin:4px 0 0}
.pill{position:absolute;line-height:1;background:#1e1a2ecc;color:#fff;border-radius:999px;font-weight:600;white-space:nowrap}
.prompt{position:absolute;line-height:1;left:50%;transform:translateX(-50%);background:#fffbf3ee;color:#3b3328;border-radius:999px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px #0003}
.prompt kbd{background:#3b3328;color:#fff;border-radius:4px;padding:1px 5px;margin-right:6px;font:inherit}
.mbtn{position:absolute;line-height:1;background:#e8822e;color:#fff;border-radius:999px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px #0004}
.meta{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin-top:10px;font-size:13px}
.meta dt{color:var(--mute)}.meta dd{margin:0}
.panel{background:var(--card);border-radius:14px;margin:12px 16px 32px;padding:14px;box-shadow:0 2px 10px #0001}
.rw{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
.rw div{border:1px solid #0001;border-radius:12px;padding:10px 14px;text-align:center;min-width:110px}
.rw .i{font-size:28px;line-height:1.2}.rw .c{color:var(--accent);font-weight:700}
@media (max-width:700px){.shot img{max-width:100%;height:auto}}
</style>
<div class="bar"><button id="night">🌙 밤</button><button id="day" class="off">☀️ 낮</button><span style="width:12px"></span><button id="winter">❄️ 겨울(10/23~)</button><button id="autumn" class="off">🍂 가을</button></div>
<h1>🎃 할로윈 이벤트 시안 3개</h1>
<p class="sub">세 안 모두 같은 마을 장식(호박 등불·박쥐 깃발·거미줄 아치)과 같은 교환 보상을 씁니다. 다른 건 사탕을 모으는 방식입니다. 왼쪽 PC, 오른쪽 가로 폰.</p>
<div id="root"></div>
<div class="panel"><h2 style="margin:0;font-size:17px">🍬 사탕 교환 (세 안 공통)</h2>
<p class="sub" style="margin:4px 0 0">의뢰 올빼미 옆 호박 좌판에서 바꿔요. 기간 안에 꾸준히 하면 셋 다 받을 수 있게 맞춥니다(합계 60개).</p>
<div class="rw">${REWARDS.map(r => `<div><div class="i">${r.ico}</div>${r.name}<div class="c">🍬 ${r.cost}</div></div>`).join('')}</div></div>
<script type="importmap">${JSON.stringify(importmap)}</script>
<script type="module">
import * as THREE from 'three';
import { makeCtx, buildHalloween } from 'art';
const CONCEPTS = ${JSON.stringify(CONCEPTS)};
const state = { night: true, winter: true };
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(2);
const views = [];
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...o });

function emojiSprite(ch, scale = 1.3) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fffdf7'; g.beginPath(); g.arc(64, 58, 50, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(52, 100); g.lineTo(64, 122); g.lineTo(76, 100); g.fill();
  g.font = "64px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 62);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  s.scale.setScalar(scale); s.renderOrder = 10; return s;
}

function build(concept) {
  const sc = new THREE.Scene();
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 0.9); sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.1); sun.position.set(4, 8, 5); sc.add(sun);
  const nightMats = [], lights = [], seasonal = [];
  const ctx = makeCtx(THREE, m => nightMats.push(m));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 30).rotateX(-Math.PI / 2), std(0xf4f9f8));
  seasonal.push({ m: ground.material, w: 0xf4f9f8, a: 0xc9a86a }); sc.add(ground);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(26, 2.2).rotateX(-Math.PI / 2), std(0xd9cdb8)); path.position.set(0, 0.01, 1.5);
  seasonal.push({ m: path.material, w: 0xe6ecea, a: 0xb89a6a }); sc.add(path);

  const glow = (color, k) => { const m = std(color, { emissive: color, emissiveIntensity: 0 }); nightMats.push(m); m.userData.k = k; return m; };
  function house(x, z, roof) {
    const g = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.8, 2.2), std(0xf3e6cf)); wall.position.y = 0.9; g.add(wall);
    const r = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1.3, 4, 1).rotateY(Math.PI / 4), std(roof)); r.position.y = 2.45; r.scale.set(1, 1, 0.85); g.add(r);
    const snow = new THREE.Mesh(new THREE.ConeGeometry(2.25, 0.5, 4, 1).rotateY(Math.PI / 4), std(0xffffff)); snow.position.y = 2.9; snow.scale.set(0.6, 1, 0.5); g.add(snow); seasonal.push({ snow });
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1, 0.05), std(0x6b4a2e)); door.position.set(0, 0.5, 1.11); g.add(door);
    for (const wx of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.05), glow(0xffd27a, 1)); w.position.set(wx, 1.1, 1.11); g.add(w); }
    g.position.set(x, 0, z); sc.add(g); return g;
  }
  function tree(x, z, s = 1) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 6), std(0x7a5636)); t.position.y = 0.35; g.add(t);
    [[0.9, 1.2, 0.95], [0.7, 1, 1.6], [0.45, 0.8, 2.15]].forEach(([r, h, y]) => {
      const leaf = std(0x5f9f72); seasonal.push({ m: leaf, w: 0x7fbf9e, a: 0xd9862e });
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), leaf); c.position.y = y; g.add(c);
    });
    g.position.set(x, 0, z); g.scale.setScalar(s); sc.add(g); return g;
  }
  function npc(x, z, color, head = 0xfde3c8) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.7, 10), std(color)); b.position.y = 0.35; g.add(b);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), std(head)); h.position.y = 0.95; g.add(h);
    g.position.set(x, 0, z); sc.add(g); return g;
  }
  function player(x, z) {
    const g = npc(x, z, 0xffffff, 0xffffff);
    for (const ex of [-0.12, 0.12]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.35, 4, 8), std(0xffffff)); e.position.set(ex, 1.4, 0); g.add(e); }
    const cape = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 10, 1, true), std(0x5b3a8a, { side: THREE.DoubleSide })); cape.position.y = 0.45; g.add(cape);
    return g;
  }
  function jack(x, z, lit, s = 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lit ? std(0xe8822e, { emissive: 0xe8822e, emissiveIntensity: 0 }) : std(0x9a6a3e));
    if (lit) { body.material.userData.k = 0.35; nightMats.push(body.material); }
    body.scale.set(1, 0.8, 1); body.position.y = 0.26; g.add(body);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 5), std(0x4f7a3a)); stem.position.y = 0.56; g.add(stem);
    const faceMat = lit ? glow(0xffe08a, 1.4) : std(0x3a2a1e);
    for (const ex of [-0.11, 0.11]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.09, 3), faceMat); e.rotation.x = Math.PI / 2; e.position.set(ex, 0.32, 0.3); g.add(e); }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.03), faceMat); mouth.position.set(0, 0.18, 0.31); g.add(mouth);
    if (lit) { const L = new THREE.PointLight(0xffa040, 0, 4, 2); L.position.y = 0.6; g.add(L); lights.push(L); }
    g.position.set(x, 0, z); g.scale.setScalar(s); sc.add(g); return g;
  }
  function bunting(x1, x2, z, y) {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x1 + (x2 - x1) * t, sag = Math.sin(Math.PI * t) * 0.35;
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 3), std(i % 2 ? 0x5b3a8a : 0xe8822e)); f.rotation.x = Math.PI; f.position.set(x, y - sag, z); sc.add(f);
    }
    for (const x of [x1, x2]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, y + 0.2, 6), std(0x6b4a2e)); p.position.set(x, (y + 0.2) / 2, z); sc.add(p); }
  }
  function ghost(x, y, z, s = 1, peek = 0) {
    const pts = [[0, 0.55], [0.18, 0.5], [0.24, 0.32], [0.26, 0.08], [0.3, -0.12], [0.0001, -0.12]].map(([a, b]) => new THREE.Vector2(a, b));
    const m = std(0xf6f4ff, { emissive: 0xc8c0ff, emissiveIntensity: 0, flatShading: false }); m.userData.k = 0.35; nightMats.push(m);
    const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), m));
    for (const ex of [-0.08, 0.08]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), std(0x1e1a2e)); e.position.set(ex, 0.36, 0.2); g.add(e); }
    g.position.set(x, y, z); g.rotation.z = peek; g.scale.setScalar(s); sc.add(g); return g;
  }
  const art = (id, style, x, z, ry = 0, s = 1) => { const m = buildHalloween(THREE, id, style, ctx); m.position.set(x, 0, z); m.rotation.y = ry; m.scale.setScalar(s); sc.add(m); return m; };

  house(-6, -3, 0xb85c4a); house(0, -4, 0x5b7fb0); house(6, -3, 0x6e9a5a);
  tree(-10, -1, 1.1); tree(-9, 4, 0.9); tree(10, 0, 1.2); tree(9.5, 5, 0.8); tree(-3, -7, 1); tree(3.5, -7.5, 1.1); tree(-12, -5, 1);
  bunting(-3, 3, -1.2, 2.2);
  art('webarch', 'tree', -11.5, 1.6, Math.PI / 2, 0.8);
  const me = player(-1.2, 2);
  const bubbles = [];

  if (concept === 'A') {
    for (const [x, z] of [[-6, -1.4], [0, -2.4], [6, -1.4]]) { jack(x - 0.9, z + 0.3, true); jack(x + 0.9, z + 0.3, true, 0.8); }
    const r1 = npc(-5, -0.6, 0xd9694f), r2 = npc(1.1, -1.5, 0xf7f4ee), r3 = npc(6.8, -0.5, 0x5fbf62, 0xf0cd6a);
    for (const r of [r1, r2]) { const s = emojiSprite('🍬'); s.position.set(r.position.x, 1.75, r.position.z); sc.add(s); bubbles.push(s); }
    me.position.set(0.2, 0, -0.5);
  } else if (concept === 'B') {
    const xs = [-9, -6.5, -4, -1.5, 1.5, 4, 6.5, 9];
    xs.forEach((x, i) => jack(x, 2.9, i < 3));
    npc(-6, -0.8, 0xd9694f); npc(5.5, -0.8, 0x5fbf62, 0xf0cd6a);
    me.position.set(-1.5, 0, 1.9);
  } else {
    sc.fog = new THREE.Fog(0x2a2440, 14, 34);
    art('ghostlamp', 'lantern', -4, 2.9); art('ghostlamp', 'lantern', 4, 2.9);
    art('gravefence', 'iron', 6.2, 2.4, 0, 1);
    for (const [x, z] of [[-6, -1.4], [6, -1.4]]) jack(x - 0.9, z + 0.3, true, 0.8);
    ghost(-4.55, 0.45, -1.7, 0.9, 0.35); ghost(3.35, 0.25, -0.9, 0.75, -0.45); ghost(7.4, 0.15, 2.5, 0.7, 0.2);
    npc(-5, -0.6, 0xd9694f); me.position.set(-7.8, 0, 0.6);
  }
  return { sc, sun, hemi, nightMats, lights, seasonal, bubbles };
}

function addShot(host, concept, w, h, mobile) {
  const v = build(concept.key);
  const cam = new THREE.PerspectiveCamera(mobile ? 46 : 40, w / h, 0.1, 80);
  cam.position.set(0, mobile ? 6.5 : 7, mobile ? 9 : 10); cam.lookAt(0, 0.6, -0.3);
  const wrap = document.createElement('div');
  const shot = document.createElement('div'); shot.className = 'shot'; shot.style.width = w + 'px'; shot.style.height = h + 'px';
  const img = new Image(); img.width = w; img.height = h; shot.append(img);
  const pill = document.createElement('div'); pill.className = 'pill'; pill.textContent = concept.hud;
  Object.assign(pill.style, mobile ? { left: '6px', top: '81px', fontSize: '10px', padding: '4px 8px' } : { left: '16px', top: '16px', fontSize: '15px', padding: '7px 12px' });
  shot.append(pill);
  if (mobile) {
    const b = document.createElement('div'); b.className = 'mbtn'; b.textContent = concept.key === 'C' ? '👻' : concept.key === 'B' ? '🎃' : '🍬';
    Object.assign(b.style, { right: '14px', bottom: '16px', width: '38px', height: '38px', fontSize: '18px' }); shot.append(b);
    const p = document.createElement('div'); p.className = 'prompt'; p.textContent = concept.prompt; Object.assign(p.style, { bottom: '10px', fontSize: '10px', padding: '5px 10px' }); shot.append(p);
  } else {
    const p = document.createElement('div'); p.className = 'prompt'; p.innerHTML = '<kbd>E</kbd>' + concept.prompt; Object.assign(p.style, { bottom: '22px', fontSize: '15px', padding: '8px 16px' }); shot.append(p);
  }
  const lbl = document.createElement('p'); lbl.className = 'lbl'; lbl.textContent = mobile ? '가로 폰(844×390 축소)' : 'PC 1280×720 축소';
  wrap.append(shot, lbl); host.append(wrap);
  views.push({ ...v, cam, img, w, h });
}

function draw() {
  for (const v of views) {
    const n = state.night;
    v.sc.background = new THREE.Color(n ? 0x1b1d38 : 0xcfe6f5);
    if (v.sc.fog) v.sc.fog.color.set(n ? 0x2a2440 : 0xd9d4e6);
    v.sun.intensity = n ? 0.35 : 1.1; v.hemi.intensity = n ? 0.75 : 0.9;
    v.hemi.color.set(n ? 0x8a90d0 : 0xffffff);
    v.nightMats.forEach(m => { m.emissiveIntensity = n ? (m.userData.k ?? 1) : 0; });
    v.lights.forEach(L => { L.intensity = n ? 2.2 : 0; });
    v.seasonal.forEach(s => { if (s.snow) s.snow.visible = state.winter; else s.m.color.set(state.winter ? s.w : s.a); });
    renderer.setSize(v.w, v.h); renderer.render(v.sc, v.cam); v.img.src = renderer.domElement.toDataURL('image/png');
  }
}

const rootEl = document.getElementById('root');
for (const c of CONCEPTS) {
  const el = document.createElement('section'); el.className = 'concept';
  el.innerHTML = '<h2>' + c.title + '</h2><div class="names">이름 후보 ' + c.names.map(n => '<b>' + n + '</b>').join('') + '</div><div class="shots"></div>' +
    '<dl class="meta"><dt>하는 법</dt><dd>' + c.loop + '</dd><dt>사탕</dt><dd>' + c.perDay + '</dd><dt>좋은 점</dt><dd>' + c.pros + '</dd><dt>걱정</dt><dd>' + c.cons + '</dd></dl>';
  rootEl.append(el);
  const host = el.querySelector('.shots');
  addShot(host, c, 640, 360, false); addShot(host, c, 422, 195, true);
}
const sw = (on, off, key, val) => { document.getElementById(on).onclick = () => { state[key] = val; document.getElementById(on).classList.remove('off'); document.getElementById(off).classList.add('off'); draw(); }; };
sw('night', 'day', 'night', true); sw('day', 'night', 'night', false); sw('winter', 'autumn', 'winter', true); sw('autumn', 'winter', 'winter', false);
if (location.hash === '#day') document.getElementById('day').click(); else draw();
window.__ready = true;
</script>`;
mkdirSync(new URL('dev/active/halloween-event/look/', root), { recursive: true });
writeFileSync(new URL('dev/active/halloween-event/look/event-mockups.html', root), html);
console.log('wrote event-mockups.html');
