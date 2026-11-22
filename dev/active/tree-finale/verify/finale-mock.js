import * as THREE from 'three';
import { scene, setCameraRig, npcObjs, player } from '/js/game.js';
import { setNpcGlyphsHidden } from '/js/spaces/npc.js';

const TREE = new THREE.Vector3(4, 0, -35);
const GATE = new THREE.Vector3(-4, 0, 25);
let built = null;

function rnd(seed) { let s = seed >>> 0; return () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)) >>> 0) / 4294967296; }

function treeBox() {
  const g = scene.children.find(c => Math.abs(c.position.x - TREE.x) < 0.01 && Math.abs(c.position.z - TREE.z) < 0.01);
  return new THREE.Box3().setFromObject(g);
}

function build() {
  if (built) return built;
  const r = rnd(7), box = treeBox(), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const crown = new THREE.Group();
  const pinks = [0xffb7d5, 0xffd1e3, 0xff9cc4, 0xfff0f6];
  const bloomGeo = new THREE.IcosahedronGeometry(1, 1);
  for (let i = 0; i < 240; i++) {
    const th = r() * Math.PI * 2, ph = r() * 1.35, rr = 0.86 + r() * 0.1;
    const m = new THREE.Mesh(bloomGeo, new THREE.MeshBasicMaterial({ color: pinks[i % 4], toneMapped: false, fog: false }));
    m.scale.setScalar(0.16 + r() * 0.16);
    m.position.set(c.x + Math.cos(th) * Math.sin(ph) * s.x * 0.5 * rr, box.max.y - s.y * 0.3 + Math.cos(ph) * s.y * 0.3 * rr, c.z + Math.sin(th) * Math.sin(ph) * s.z * 0.5 * rr);
    crown.add(m);
  }
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g2 = cv.getContext('2d'), gr = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,230,240,0.9)'); gr.addColorStop(1, 'rgba(255,200,225,0)'); g2.fillStyle = gr; g2.fillRect(0, 0, 128, 128);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  glow.position.set(c.x, box.max.y - s.y * 0.25, c.z); glow.scale.set(s.x * 1.2, s.y * 0.7, 1); glow.material.opacity = 0.55;
  crown.add(glow);
  const petals = new THREE.Group();
  for (let i = 0; i < 160; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshBasicMaterial({ color: pinks[i % 4], side: THREE.DoubleSide, toneMapped: false, fog: false }));
    p.position.set(c.x + (r() - 0.5) * s.x * 2.2, r() * box.max.y, c.z + (r() - 0.5) * s.z * 2.2 + 4);
    p.rotation.set(r() * 6, r() * 6, r() * 6);
    petals.add(p);
  }
  const pts = [];
  for (let i = 0; i <= 9; i++) {
    const k = i / 9;
    pts.push(new THREE.Vector3(TREE.x + (GATE.x - TREE.x) * k + Math.sin(k * 7) * 2.2 * (1 - Math.abs(k - 0.5) * 1.4), 0.08, TREE.z + 2.6 + (GATE.z - TREE.z - 2.6) * k));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = new THREE.TubeGeometry(curve, 240, 0.22, 6, false);
  const haloGeo = new THREE.TubeGeometry(curve, 240, 0.55, 6, false);
  const rootG = new THREE.Group();
  rootG.add(new THREE.Mesh(tube, new THREE.MeshBasicMaterial({ color: 0xffd36b, toneMapped: false, fog: false })),
    new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false, fog: false })));
  scene.add(crown, petals, rootG);
  built = { crown, petals, rootG, tubes: [tube, haloGeo], curve, box, c, s };
  return built;
}

function overlay(v, k) {
  let o = document.getElementById('fin-ov');
  if (!o) {
    o = document.createElement('div'); o.id = 'fin-ov';
    o.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:-apple-system,"Apple SD Gothic Neo",sans-serif';
    document.body.appendChild(o);
  }
  const bar = 'clamp(40px,9vh,86px)';
  const cap = k >= 0.34 && k < 0.67 ? '끊겼던 뿌리가 다시 이어졌어요' : '';
  const card = k >= 0.67;
  o.innerHTML = `<div style="position:absolute;left:0;right:0;top:0;height:${bar};background:#000"></div><div style="position:absolute;left:0;right:0;bottom:0;height:${bar};background:#000"></div>`
    + (cap ? `<div style="position:absolute;left:0;right:0;bottom:calc(${bar} + 18px);text-align:center;color:#fff;font-size:clamp(15px,2vw,22px);font-weight:700;text-shadow:0 2px 12px rgba(0,0,0,.6)">${cap}</div>` : '')
    + (v === 'C' && card ? '<div style="position:absolute;inset:0;background:rgba(255,255,255,.35)"></div>' : '')
    + (card ? `<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(255,253,246,.96);border-radius:18px;padding:18px 26px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.25);width:min(86vw,360px)">
        ${v === 'C' ? '<div style="height:clamp(70px,16vh,120px);border-radius:10px;background:linear-gradient(#ffd9e8,#cfe9c9);margin-bottom:12px;display:flex;align-items:center;justify-content:center;font-size:38px">📸</div>' : ''}
        <div style="font-size:30px">🌸</div><div style="font-size:clamp(16px,2.2vw,20px);font-weight:800;color:#2c3e4a;margin:6px 0 4px">세계수가 다시 숨을 쉬어요</div>
        <div style="font-size:14px;color:#6b7b86;line-height:1.5">칭호 「세계수지기」를 받았어요<br>빛나는 뿌리 길이 이웃 마을까지 이어져요</div></div>` : '');
}

const ease = (t) => t * t * (3 - 2 * t);

function npcPose(v, k) {
  const list = npcObjs.filter(o => o.group && o.def.id !== 'merchant');
  const n = list.length;
  return list.map((o, i) => {
    let x, z, face;
    if (v === 'A') {
      const a = (i / n) * Math.PI * 2, R = 9 - 2 * ease(Math.min(1, k * 1.6));
      x = TREE.x + Math.cos(a) * R; z = TREE.z + Math.sin(a) * R; face = Math.atan2(TREE.x - x, TREE.z - z);
    } else if (v === 'B') {
      const p = built.curve.getPoint(0.08 + (i / n) * 0.8), side = i % 2 ? 1.8 : -1.8;
      x = p.x + side; z = p.z; face = Math.atan2(-side, 0);
    } else {
      const row = i % 2, col = Math.floor(i / 2), cols = Math.ceil(n / 2);
      const tx = TREE.x + (col - (cols - 1) / 2) * 1.5 + (row ? 0.75 : 0), tz = TREE.z + 7.5 + row * 1.4;
      const sx = TREE.x + (i % 5 - 2) * 9, sz = TREE.z + 26, q = ease(Math.min(1, k * 1.8));
      x = sx + (tx - sx) * q; z = sz + (tz - sz) * q; face = q > 0.95 ? 0 : Math.atan2(tx - sx, tz - sz);
    }
    return [o, x, z, face];
  });
}

function cam(v, k, aspect) {
  const far = aspect < 0.8 ? 1.8 : 1, { c } = built;
  if (v === 'A') {
    const a = -0.9 + k * 1.5, d = (22 + k * 10) * far, h = 12 + k * 10;
    return { pos: [c.x + Math.sin(a) * d, h, c.z + Math.cos(a) * d], look: [c.x, 5 - k * 2, c.z + k * 8] };
  }
  if (v === 'B') {
    if (k > 0.66) return { pos: [TREE.x, 6, TREE.z + 22 * far], look: [TREE.x, 7, TREE.z] };
    const t = 1 - k, p = built.curve.getPoint(Math.max(0.02, t * 0.9)), q = built.curve.getPoint(Math.max(0, t * 0.9 - 0.18));
    return { pos: [p.x + 2, 5.5, p.z + 7 * far], look: [q.x, 2.5, q.z] };
  }
  return { pos: [TREE.x, 4.6, TREE.z + 24 * far], look: [TREE.x, 3.4 + k * 1.2, TREE.z + 3] };
}

export function pose(v, k) {
  build();
  const { crown, petals, rootG, tubes } = built;
  crown.visible = petals.visible = k >= 0.5;
  const rk = v === 'B' ? 1 : Math.min(1, Math.max(0, (k - 0.15) / 0.5));
  rootG.visible = rk > 0;
  for (const g of tubes) g.setDrawRange(0, Math.floor(g.index.count * rk / 3) * 3);
  const npcs = npcPose(v, k);
  player.position.set(TREE.x + 0.4, 0, TREE.z + (v === 'C' ? 6.2 : 6.5));
  player.rotation.y = 0;
  setCameraRig((camera) => {
    for (const [o, x, z, f] of npcs) { o.group.visible = true; o.group.traverse(ch => { if (ch.isSprite) ch.visible = false; }); o.group.position.set(x, 0, z); o.group.rotation.y = f; }
    const p = cam(v, k, camera.aspect);
    camera.position.set(...p.pos); camera.lookAt(...p.look);
    return true;
  });
  setNpcGlyphsHidden(true);
  document.body.classList.add('cine-open');
  overlay(v, k);
  return { npcs: npcs.length };
}
