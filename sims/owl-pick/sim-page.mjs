import * as THREE from 'three';
import { buildAnimalHead, plushMat } from '../../js/animal-faces.js';
import { buildToolSkin } from '../../js/cosmetics/tool-skins.js';
import { extraKit } from '../../js/cosmetics/tool-skins-extra-kit.js';
import { simKit, baseTools, critterKit, buildTools, buildUmbrella } from './set-frame.mjs';

const BLOOM_LUMA = 0.85;
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const hex = h => '#' + h.toString(16).padStart(6, '0');

export function run(SETS) {
  const qs = new URLSearchParams(location.search);
  const setId = Object.keys(SETS)[0], SET = SETS[setId];
  const K = simKit(THREE), X = extraKit(THREE, K), C = critterKit(THREE, K, X);
  const BASE = baseTools(THREE, K, X), VARS = SET.variants(THREE, K, X);
  const TOOLS = Object.fromEntries(Object.entries(VARS).map(([L, D]) => [L, { ...buildTools(THREE, K, X, D, C), umbrella: g => { const u = buildUmbrella(THREE, K, X, D); u.scale.setScalar(0.3); g.add(u); } }]));
  const used = Object.entries(SET.pal), over = used.filter(([, c]) => luma(c) > BLOOM_LUMA);
  document.getElementById('head').innerHTML =
    `<h1>${SET.ico} ${SET.name}</h1><span class="sub">${setId} · 3,600코인 오늘의 픽 · 시안 ${SET.dirs.map(d => d[0]).join('/')}</span>` +
    (over.length ? `<span class="bad">블룸 초과 ${over.map(([k, c]) => `${k} ${luma(c).toFixed(2)}`).join(', ')}</span>`
                 : `<span class="ok">블룸 0.85 이하 ${used.length}색 통과 (최대 ${Math.max(...used.map(([, c]) => luma(c))).toFixed(2)})</span>`) +
    `<span>${used.map(([k, c]) => `<i class="sw" title="${k}" style="background:${hex(c)}"></i>`).join('')}</span>`;

  const fromFn = fn => () => { const g = new THREE.Group(); fn(g); return g; };
  const CLOSE = qs.get('view') === 'close', PICK = (qs.get('dirs') || '').split(',').filter(Boolean);
  const REFS = qs.get('refs') === '0' || CLOSE ? [] : [
    { L: '기준', ref: true, name: '기본 도구', note: '0단계 game.js toolMesh', make: t => fromFn(BASE[t])() },
    ...SET.refs.map(([id, name, note]) => ({ L: '기존', ref: true, name, note, make: t => buildToolSkin(THREE, id, t) })),
  ];
  const ROWS = [...REFS, ...SET.dirs.filter(([L]) => !PICK.length || PICK.includes(L)).map(([L, name, note]) => ({ L, name, note, make: t => fromFn(TOOLS[L][t])() }))];
  const COLS = CLOSE
    ? [{ t: 'axe', label: '🪓 도끼 앞', yaw: 28 }, { t: 'axe', label: '🪓 도끼 뒤', yaw: 205 }, { t: 'water', label: '💧 물조리개 앞', yaw: 28 }, { t: 'water', label: '💧 물조리개 옆', yaw: 110 }, { t: 'water', label: '🐱 게임 거리 물조리개', held: true }]
    : [{ t: 'axe', label: '🪓 도끼' }, { t: 'water', label: '💧 물조리개' }, { t: 'rod', label: '🎣 낚싯대' }, { t: 'axe', label: '🐱 게임 거리 (화면 높이 700px 실측)', held: true }, { t: 'water', label: '🐱 게임 거리 물조리개', held: true }];

  const CAT = { id: 'cat', body: 0x9fa0c2, belly: 0xf2f2f8, paw: 0xf0b0b8, R: 0.5, bs: [0.88, 1.1, 0.88], HR: 0.36, HY: 1.25 };
  function character(tool) {
    const g = new THREE.Group(), a = CAT, R = a.R, bodyY = R * a.bs[1] + 0.02;
    const body = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 20), plushMat(a.body)); body.position.y = bodyY; body.scale.set(...a.bs); g.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 20, 14), plushMat(a.belly)); belly.position.set(0, bodyY - R * 0.16, R * 0.55); belly.scale.set(1, 1.1, 0.6); g.add(belly);
    g.add(buildAnimalHead(a.id, { HR: a.HR, HY: a.HY, body: a.body, belly: a.belly }));
    const held = new THREE.Group(); held.position.set(0.78, 0.9, 0.06); held.rotation.set(-0.1, 0, -0.55); g.add(held);
    const hand = new THREE.Group(); hand.position.set(0, -0.3, 0.08); held.add(hand);
    hand.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), plushMat(a.paw)));
    hand.add(tool);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  function stage(held) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(held ? 0xa9c98a : 0xe3ebe6);
    scene.add(new THREE.HemisphereLight(0xeef6ff, 0x6f7f68, 0.9));
    const sun = new THREE.DirectionalLight(0xfff3df, 1.15); sun.position.set(4, 8, 6); scene.add(sun);
    const rim = new THREE.DirectionalLight(0xbfd8e8, 0.35); rim.position.set(-5, 3, -4); scene.add(rim);
    if (held) {
      sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
      Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.5, far: 20 });
      const ground = new THREE.Mesh(new THREE.CircleGeometry(20, 32), new THREE.MeshStandardMaterial({ color: 0x9cc47a, roughness: 1 }));
      ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
    }
    return scene;
  }
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true; renderer.setScissorTest(true);
  document.body.appendChild(renderer.domElement);
  const TOP = 64, COLH = 30, LEFTW = 240;
  const cw = (innerWidth - LEFTW) / COLS.length, ch = (innerHeight - TOP - COLH) / ROWS.length;
  const ov = document.getElementById('ov'), cells = [];
  COLS.forEach((c, ci) => {
    const el = document.createElement('div'); el.className = 'col'; el.textContent = c.label;
    Object.assign(el.style, { left: LEFTW + ci * cw + 'px', width: cw + 'px', top: TOP + 6 + 'px' }); ov.appendChild(el);
  });
  ROWS.forEach((r, ri) => {
    const re = document.createElement('div'); re.className = 'row';
    re.innerHTML = `<div class="L ${r.ref ? 'ref' : ''}">${r.L}</div><div class="n">${r.name}</div><div class="d">${r.note}</div>`;
    Object.assign(re.style, { left: 0, width: LEFTW + 'px', top: TOP + COLH + ri * ch + 'px', height: ch + 'px' }); ov.appendChild(re);
    COLS.forEach((c, ci) => {
      const scene = stage(c.held), tool = r.make(c.t);
      let cam;
      if (c.held) {
        const ch_ = character(tool); ch_.rotation.y = 0.25; scene.add(ch_);
        const D = Math.hypot(14, 16), V = 2 * D * Math.tan(THREE.MathUtils.degToRad(21)) * ch / 700;
        cam = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(2 * Math.atan(V / 2 / D)), cw / ch, 1, 80);
        const tgt = new THREE.Vector3(0.25, 0.85, 0); cam.position.set(tgt.x, tgt.y + 14, tgt.z + 16); cam.lookAt(tgt);
      } else {
        const holder = new THREE.Group(); holder.add(tool); scene.add(holder);
        const sph = new THREE.Box3().setFromObject(holder).getBoundingSphere(new THREE.Sphere());
        cam = new THREE.PerspectiveCamera(30, cw / ch, 0.02, 40);
        const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(15)) * Math.min(1, cw / ch));
        const dist = sph.radius / Math.sin(hf / 2) * 1.02, yaw = THREE.MathUtils.degToRad(c.yaw ?? 28), el = THREE.MathUtils.degToRad(12);
        cam.position.set(sph.center.x + Math.sin(yaw) * Math.cos(el) * dist, sph.center.y + Math.sin(el) * dist, sph.center.z + Math.cos(yaw) * Math.cos(el) * dist);
        cam.lookAt(sph.center);
      }
      const x = LEFTW + ci * cw, y = TOP + COLH + ri * ch;
      cells.push({ scene, cam, x, y });
      const ce = document.createElement('div'); ce.className = 'cell' + (r.ref ? ' refc' : '');
      Object.assign(ce.style, { left: x + 'px', top: y + 'px', width: cw + 'px', height: ch + 'px' }); ov.appendChild(ce);
    });
  });
  function draw() {
    const Hh = innerHeight;
    renderer.setScissor(0, 0, innerWidth, Hh); renderer.setViewport(0, 0, innerWidth, Hh);
    renderer.setClearColor(0xe9efe9); renderer.clear();
    cells.forEach(({ scene, cam, x, y }) => { const yb = Hh - y - ch; renderer.setViewport(x, yb, cw, ch); renderer.setScissor(x, yb, cw, ch); renderer.render(scene, cam); });
  }
  let frames = 0;
  (function tick() { draw(); if (++frames < 3) requestAnimationFrame(tick); else document.title = 'done'; })();
}
