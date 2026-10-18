import * as T from 'three';
import { makeCtx, buildHalloween } from '/js/spaces/halloween-art.js';
import { buildJack, buildGhostKid, buildCandyBasket } from '/js/spaces/halloween-event-art.js';

const REWARDS = [
  { id: 'ghostDoll', ico: '👻', name: '꼬마 유령 인형', cost: 8, desc: '바닥에 두는 소품' },
  { id: 'candyBasket', ico: '🍭', name: '사탕 바구니', cost: 14, desc: '탁자 위에 올려요' },
  { id: 'jackLamp', ico: '🎃', name: '웃는 호박 등', cost: 20, desc: '밤이면 얼굴이 빛나요' },
];

let thumbs = null;
export function renderThumbs() {
  if (thumbs) return thumbs;
  const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(2); r.setSize(160, 160); r.outputColorSpace = T.SRGBColorSpace;
  const ctx = makeCtx(T, m => { m.emissiveIntensity = 1.4; });
  const make = { ghostDoll: () => buildGhostKid(T, ctx), candyBasket: () => { const g = buildCandyBasket(T, ctx); g.scale.setScalar(2.4); return g; }, jackLamp: () => buildJack(T, ctx) };
  thumbs = {};
  for (const it of REWARDS) {
    const sc = new T.Scene();
    sc.add(new T.HemisphereLight(0xfff4e8, 0x6a5a7a, 1.4));
    const d = new T.DirectionalLight(0xffffff, 1.2); d.position.set(2, 4, 3); sc.add(d);
    const m = make[it.id](); sc.add(m);
    const box = new T.Box3().setFromObject(m), c = box.getCenter(new T.Vector3()), s = box.getSize(new T.Vector3()).length();
    const cam = new T.PerspectiveCamera(30, 1, 0.01, 50); cam.position.set(c.x + s * 0.9, c.y + s * 0.7, c.z + s * 1.6); cam.lookAt(c);
    r.render(sc, cam); thumbs[it.id] = r.domElement.toDataURL('image/png');
  }
  return thumbs;
}

const CSS = `
#hwm{position:fixed;inset:0;z-index:60;pointer-events:none;font-family:inherit}
#hwm .veil{position:absolute;inset:0;background:rgba(30,20,60,.5);display:grid;place-items:center;pointer-events:auto}
#hwm .card{width:min(380px,92vw);background:#fffaf2;border-radius:18px;padding:22px 18px 16px;box-shadow:0 10px 30px rgba(20,10,40,.35);color:#4a3f55}
#hwm .card h2{margin:0 0 4px;font-size:19px;text-align:center}
#hwm .sub{margin:0 0 12px;font-size:13px;opacity:.75;text-align:center;line-height:1.45}
#hwm ul{list-style:none;margin:0 0 12px;padding:0;display:grid;gap:8px}
#hwm li{background:#f3eefb;border-radius:12px;padding:9px 12px;font-size:14px}
#hwm .gift{background:#fff1d6;border-radius:12px;padding:10px 12px;font-weight:700;text-align:center;margin-bottom:12px;color:#8a4a10}
#hwm .ok{display:block;width:100%;border:0;border-radius:12px;padding:12px;font-weight:700;font-size:15px;background:#6b4a9a;color:#fff}
#hwm .bal{display:inline-block;background:#2e2440;color:#fff;border-radius:999px;padding:5px 12px;font-weight:700;font-size:13px}
#hwm .row{display:grid;grid-template-columns:64px 1fr auto;gap:10px;align-items:center;background:#f7f2fb;border-radius:14px;padding:8px 10px;margin-top:8px}
#hwm .row img,#hwm .tile img{width:64px;height:64px;border-radius:12px;background:radial-gradient(#fff,#ece3f6)}
#hwm .row b{display:block;font-size:14px}#hwm .row small{font-size:12px;opacity:.7}
#hwm .buy{border:0;border-radius:10px;padding:9px 12px;font-weight:700;font-size:13px;background:#e8822e;color:#fff;white-space:nowrap}
#hwm .buy.off{background:#e7e0ec;color:#8a7f95}
#hwm .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0 12px}
#hwm .tile{border-radius:14px;background:#f7f2fb;padding:10px 6px 8px;text-align:center;position:relative;border:2px solid transparent}
#hwm .tile.sel{border-color:#e8822e;background:#fff3e6}
#hwm .tile img{width:72px;height:72px;margin:0 auto 4px}
#hwm .tile b{display:block;font-size:12px}#hwm .tile .c{font-size:13px;font-weight:700;color:#c4631b}
#hwm .tile .own{position:absolute;top:6px;right:6px;font-size:10px;background:#6b4a9a;color:#fff;border-radius:999px;padding:1px 6px}
#hwm .sheet{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);width:min(560px,94vw);background:rgba(255,250,242,.96);border-radius:18px;padding:12px 14px;box-shadow:0 8px 24px rgba(20,10,40,.35);pointer-events:auto;color:#4a3f55}
#hwm .sheet .hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
#hwm .sheet .hd b{font-size:15px}
#hwm .strip{display:flex;gap:8px}
#hwm .strip .it{flex:1;display:flex;gap:8px;align-items:center;background:#f3eefb;border-radius:12px;padding:6px 8px}
#hwm .strip .it.sel{outline:2px solid #e8822e;background:#fff3e6}
#hwm .strip img{width:46px;height:46px;border-radius:10px;background:radial-gradient(#fff,#ece3f6)}
#hwm .strip b{font-size:12px;display:block}#hwm .strip .c{font-size:12px;font-weight:700;color:#c4631b}
#hwm .chip{position:absolute;left:12px;top:162px;background:rgba(255,255,255,.78);border-radius:14px;padding:7px 12px;box-shadow:0 6px 18px rgba(90,120,100,.18);color:#4a3f55}
#hwm .chip small{display:block;font-size:11px;opacity:.7}#hwm .chip b{font-size:15px}
#hwm .toast{position:absolute;top:96px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.9);border-radius:14px;padding:10px 18px;font-weight:700;font-size:15px;box-shadow:0 6px 18px rgba(40,20,60,.25);color:#4a3f55;white-space:nowrap}
#hwm .prompt{position:absolute;left:50%;bottom:110px;transform:translateX(-50%);background:rgba(255,255,255,.85);border-radius:999px;padding:8px 16px;font-size:14px;box-shadow:0 6px 18px rgba(40,20,60,.2);color:#4a3f55;white-space:nowrap}
`;

function root() {
  let el = document.getElementById('hwm');
  if (!el) { el = document.createElement('div'); el.id = 'hwm'; document.body.append(el); }
  if (!document.getElementById('hwm-css')) { const st = document.createElement('style'); st.id = 'hwm-css'; st.textContent = CSS; document.head.append(st); }
  el.innerHTML = ''; return el;
}

export function show(screen, candy = 6) {
  const off = screen === 'off';
  for (const id of ['story-chip', 'npc-prompt']) { const e = document.getElementById(id); if (e) e.style.visibility = off ? '' : 'hidden'; }
  if (off) { document.getElementById('hwm')?.remove(); return 'off'; }
  const el = root(), th = renderThumbs();
  const chip = (n) => `<div class="chip"><small>🎃 달빛 안개 정원</small><b>👻 ${n}/3 · 🍬 ${candy}</b></div>`;
  const header = `<h2>🍬 사탕 좌판</h2><p class="sub">모은 사탕을 할로윈 장식으로 바꿔 가요. 11/2까지 열려요.</p><div style="text-align:center"><span class="bal">내 사탕 🍬 ${candy}</span></div>`;
  if (screen === 'arrive') {
    el.innerHTML = `<div class="veil"><div class="card"><h2>👻 꼬마 유령 숨바꼭질</h2><p class="sub">정원 곳곳에 꼬마 유령 3마리가 숨었어요.<br>찾으면 🍬 사탕을 줘요. 숨는 자리는 매일 바뀌어요.</p>
      <ul><li>🪦 묘비 뒤, 울타리 옆, 나무 밑을 살펴봐요</li><li>🍬 가운데 좌판에서 사탕을 장식으로 바꿔요</li><li>🎃 11/2까지 열려요</li></ul>
      <div class="gift">🎁 첫 방문 선물 · 🍬 4</div><button class="ok">알겠어요</button></div></div>`;
  } else if (screen === 'play') {
    el.innerHTML = chip(1) + `<div class="toast">찾았다! 🍬 +2</div><div class="prompt">👻 유령 찾기 · Space</div>`;
  } else if (screen === 'done') {
    el.innerHTML = chip(3) + `<div class="toast">오늘 유령을 다 찾았어요. 내일 다른 곳에 또 숨어요</div><div class="prompt">🍬 사탕 좌판 보기 · Space</div>`;
  } else if (screen === 'stallA') {
    const rows = REWARDS.map(r => { const need = r.cost - candy; return `<div class="row"><img src="${th[r.id]}"><div><b>${r.ico} ${r.name}</b><small>${r.desc}</small></div>${need > 0 ? `<button class="buy off">사탕이 ${need}개 더 필요해요</button>` : `<button class="buy">🍬 ${r.cost}개로 바꾸기</button>`}</div>`; }).join('');
    el.innerHTML = `<div class="veil"><div class="card">${header}${rows}<button class="ok" style="margin-top:12px;background:#eef2ee;color:#4a5a4f">닫기</button></div></div>`;
  } else if (screen === 'stallB') {
    const tiles = REWARDS.map((r, i) => `<div class="tile ${i === 0 ? 'sel' : ''}">${i === 0 ? '<span class="own">1개 있음</span>' : ''}<img src="${th[r.id]}"><b>${r.name}</b><span class="c">🍬 ${r.cost}</span></div>`).join('');
    el.innerHTML = `<div class="veil"><div class="card">${header}<div class="tiles">${tiles}</div><button class="ok" style="background:#e8822e">👻 꼬마 유령 인형 · 🍬 8개로 바꾸기</button></div></div>`;
  } else if (screen === 'stallC') {
    const items = REWARDS.map((r, i) => `<div class="it ${i === 0 ? 'sel' : ''}"><img src="${th[r.id]}"><div><b>${r.name}</b><span class="c">🍬 ${r.cost}</span></div></div>`).join('');
    el.innerHTML = chip(1) + `<div class="sheet"><div class="hd"><b>🍬 사탕 좌판 <small style="font-weight:400;opacity:.7">· 11/2까지</small></b><span class="bal">🍬 ${candy}</span></div><div class="strip">${items}</div><div style="display:flex;gap:8px;margin-top:10px"><button class="buy" style="flex:1">👻 꼬마 유령 인형 · 🍬 8개로 바꾸기</button><button class="buy off">닫기</button></div></div>`;
  }
  return screen;
}

export function placeGate(scene, x = 22, z = -22) {
  const old = scene.getObjectByName('hw-gate'); if (old) scene.remove(old);
  const g = new T.Group(); g.name = 'hw-gate'; g.position.set(x, 0, z);
  const ctx = makeCtx(T, m => { m.emissiveIntensity = 1.4; });
  const arch = buildHalloween(T, 'webarch', 'tree', ctx); arch.rotation.y = Math.PI / 4; g.add(arch);
  for (const [dx, dz] of [[-1.5, 1.3], [1.4, -1.6]]) { const j = buildJack(T, ctx, { size: 0.9 }); j.position.set(dx, 0, dz); g.add(j); }
  const lamp = buildHalloween(T, 'ghostlamp', 'lantern', ctx); lamp.position.set(-2.2, 0, -0.6); g.add(lamp);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const c = cv.getContext('2d');
  c.fillStyle = '#5e4630'; c.beginPath(); c.roundRect(6, 6, 500, 148, 22); c.fill(); c.fillStyle = '#fff4e0'; c.beginPath(); c.roundRect(18, 18, 476, 124, 16); c.fill();
  c.fillStyle = '#4a3f55'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = "bold 46px 'Apple SD Gothic Neo',sans-serif"; c.fillText('🎃 달빛 안개 정원', 256, 62); c.font = "30px 'Apple SD Gothic Neo',sans-serif"; c.fillText('11/2까지', 256, 112);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace;
  const sign = new T.Mesh(new T.PlaneGeometry(1.9, 0.6), new T.MeshBasicMaterial({ map: tex, toneMapped: false }));
  sign.position.set(1.9, 1.3, 1.2); sign.rotation.y = Math.PI / 4 - 0.4; g.add(sign);
  const post = new T.Mesh(new T.BoxGeometry(0.1, 1.2, 0.1), new T.MeshStandardMaterial({ color: 0x5e4630 })); post.position.set(1.9, 0.6, 1.15); g.add(post);
  scene.add(g); return g;
}
