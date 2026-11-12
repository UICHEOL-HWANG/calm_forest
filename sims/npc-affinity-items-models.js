const mat = (THREE, color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, flatShading: true, ...opts });
const glowMat = (THREE, color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, roughness: 0.6, flatShading: true });

function kit(THREE, g, night) {
  const add = (geo, m, x, y, z, rot, sc) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    if (rot) mesh.rotation.set(...rot);
    if (sc) mesh.scale.set(...sc);
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const glow = (color) => { const m = glowMat(THREE, color); night.push(m); return m; };
  return { add, glow, box: (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl: (rt, rb, h, s = 10) => new THREE.CylinderGeometry(rt, rb, h, s), sph: (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h) };
}

function rockers(THREE, add, m, w, r = 0.55) {
  for (const x of [-w / 2, w / 2]) {
    add(new THREE.TorusGeometry(r, 0.035, 5, 16, Math.PI * 0.42), m, x, r + 0.02, 0, [0, Math.PI / 2, Math.PI * 1.29]);
  }
}

function chair(THREE, style, night) {
  const g = new THREE.Group();
  const { add, glow, box, cyl, sph } = kit(THREE, g, night);
  const wood = mat(THREE, 0x9a6a3e), dark = mat(THREE, 0x7a5232), light = mat(THREE, 0xb88a58);
  if (style === 'A') {
    rockers(THREE, add, dark, 0.56);
    add(box(0.62, 0.07, 0.56), wood, 0, 0.42, 0);
    for (let i = 0; i < 4; i++) add(box(0.08, 0.6, 0.04), light, -0.21 + i * 0.14, 0.75, -0.26, [-0.15, 0, 0]);
    add(box(0.64, 0.07, 0.06), wood, 0, 1.05, -0.3, [-0.15, 0, 0]);
    for (const x of [-0.3, 0.3]) { add(box(0.06, 0.32, 0.06), dark, x, 0.58, 0.18); add(box(0.08, 0.05, 0.46), wood, x, 0.75, 0.0); }
    return g;
  }
  const terra = mat(THREE, 0xe0663c), terraD = mat(THREE, 0xb8492a), yellow = mat(THREE, 0xffd23f), cream = mat(THREE, 0xf6ead2);
  if (style === 'B') {
    rockers(THREE, add, terraD, 0.56);
    add(box(0.62, 0.07, 0.56), terra, 0, 0.42, 0);
    add(box(0.56, 0.08, 0.5), cream, 0, 0.48, 0.01);
    for (let i = 0; i < 4; i++) add(box(0.08, 0.6, 0.04), terra, -0.21 + i * 0.14, 0.75, -0.26, [-0.15, 0, 0]);
    add(box(0.64, 0.07, 0.06), terraD, 0, 1.05, -0.3, [-0.15, 0, 0]);
    add(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), yellow, 0, 1.08, -0.31, [-0.15, 0, 0], [1.2, 0.8, 1]);
    add(cyl(0.24, 0.24, 0.03, 14), yellow, 0, 1.08, -0.31, [-0.15, 0, 0], [1.2, 1, 1]);
    for (const x of [-0.3, 0.3]) { add(box(0.06, 0.32, 0.06), terraD, x, 0.58, 0.18); add(box(0.08, 0.05, 0.46), terra, x, 0.75, 0.0); }
    add(box(0.05, 0.22, 0.05), dark, 0.36, 0.6, 0.1, [0, 0, 0.3]);
    add(box(0.16, 0.08, 0.08), mat(THREE, 0x5a5f68), 0.4, 0.71, 0.1, [0, 0, 0.3]);
    return g;
  }
  add(box(1.9, 0.12, 1.3), light, 0, 0.06, 0);
  for (let i = -3; i <= 3; i++) add(box(0.02, 0.125, 1.3), dark, i * 0.27, 0.065, 0);
  const s = new THREE.Group(); s.scale.setScalar(1.3); s.position.set(-0.35, 0.12, 0); g.add(s);
  const k2 = kit(THREE, s, night);
  rockers(THREE, k2.add, terraD, 0.56);
  k2.add(box(0.62, 0.07, 0.56), terra, 0, 0.42, 0);
  k2.add(box(0.56, 0.08, 0.5), cream, 0, 0.48, 0.01);
  for (let i = 0; i < 4; i++) k2.add(box(0.08, 0.6, 0.04), terra, -0.21 + i * 0.14, 0.75, -0.26, [-0.15, 0, 0]);
  k2.add(box(0.64, 0.07, 0.06), terraD, 0, 1.05, -0.3, [-0.15, 0, 0]);
  for (const x of [-0.3, 0.3]) { k2.add(box(0.06, 0.32, 0.06), terraD, x, 0.58, 0.18); k2.add(box(0.08, 0.05, 0.46), terra, x, 0.75, 0.0); }
  add(cyl(0.22, 0.22, 0.05, 14), wood, 0.6, 0.62, 0.05);
  add(cyl(0.04, 0.05, 0.5, 6), dark, 0.6, 0.37, 0.05);
  add(cyl(0.18, 0.2, 0.04, 10), dark, 0.6, 0.14, 0.05);
  add(cyl(0.07, 0.08, 0.16, 6), mat(THREE, 0x4c4f58), 0.6, 0.73, 0.05);
  add(sph(0.06, 8, 6), glow(0xffc864), 0.6, 0.75, 0.05);
  add(box(0.34, 0.12, 0.02), yellow, 0, 0.13, 0.66);
  return g;
}

function mailbox(THREE, style, night) {
  const g = new THREE.Group();
  const { add, glow, box, cyl, sph } = kit(THREE, g, night);
  const wood = mat(THREE, 0x9a6a3e), dark = mat(THREE, 0x7a5232);
  const gold = mat(THREE, 0xe0a52e), goldD = mat(THREE, 0xb07e18), cream = mat(THREE, 0xfdfaf3), black = mat(THREE, 0x2a2420), beak = mat(THREE, 0xd9822e);
  if (style === 'A') {
    add(box(0.12, 1.0, 0.12), dark, 0, 0.5, 0);
    add(box(0.5, 0.36, 0.34), wood, 0, 1.12, 0);
    add(cyl(0.17, 0.17, 0.5, 10, 1), wood, 0, 1.3, 0, [0, 0, Math.PI / 2], [1, 1, 1]);
    add(box(0.03, 0.22, 0.03), mat(THREE, 0xc0412c), 0.27, 1.25, 0.1);
    add(box(0.12, 0.08, 0.02), mat(THREE, 0xc0412c), 0.31, 1.34, 0.1);
    add(box(0.26, 0.03, 0.01), black, 0, 1.18, 0.176);
    return g;
  }
  if (style === 'B') {
    add(box(0.12, 0.9, 0.12), dark, 0, 0.45, 0);
    add(cyl(0.3, 0.32, 0.55, 10), gold, 0, 1.15, 0);
    add(sph(0.3, 12, 8), gold, 0, 1.42, 0, null, [1, 0.8, 1]);
    add(cyl(0.22, 0.22, 0.03, 14), cream, 0, 1.36, 0.25, [Math.PI / 2, 0, 0], [1.25, 1, 1]);
    for (const x of [-0.1, 0.1]) { add(sph(0.075, 8, 6), cream, x, 1.38, 0.27); add(sph(0.04, 6, 5), black, x, 1.38, 0.33); }
    add(new THREE.ConeGeometry(0.035, 0.09, 4), beak, 0, 1.3, 0.3, [Math.PI / 2, 0, 0]);
    add(box(0.24, 0.03, 0.02), black, 0, 1.08, 0.31);
    for (const x of [-0.31, 0.31]) add(box(0.06, 0.38, 0.22), goldD, x, 1.12, 0, [0, 0, x > 0 ? -0.12 : 0.12]);
    return g;
  }
  add(cyl(0.38, 0.42, 0.14, 10), mat(THREE, 0x8f8b86), 0, 0.07, 0);
  add(box(0.16, 1.4, 0.16), dark, 0, 0.84, 0);
  add(box(0.7, 0.48, 0.44), gold, 0, 1.68, 0);
  add(cyl(0.22, 0.22, 0.7, 10, 1), gold, 0, 1.92, 0, [0, 0, Math.PI / 2]);
  add(box(0.34, 0.035, 0.02), black, 0, 1.74, 0.23);
  const owl = new THREE.Group(); owl.position.set(0, 2.17, 0); g.add(owl);
  const k = kit(THREE, owl, night);
  k.add(sph(0.2, 10, 8), cream, 0, 0.18, 0, null, [1, 1.15, 0.9]);
  k.add(sph(0.2, 10, 8), gold, 0, 0.16, -0.05, null, [1.05, 1.1, 0.85]);
  for (const x of [-0.07, 0.07]) k.add(sph(0.035, 6, 5), black, x, 0.22, 0.17);
  k.add(new THREE.ConeGeometry(0.03, 0.07, 4), beak, 0, 0.16, 0.19, [Math.PI / 2, 0, 0]);
  add(box(0.04, 0.04, 0.4), dark, 0.38, 1.55, 0.12, [0, 0.6, 0]);
  add(cyl(0.07, 0.08, 0.18, 6), mat(THREE, 0x4c4f58), 0.48, 1.42, 0.28);
  add(sph(0.065, 8, 6), glow(0xffc864), 0.48, 1.42, 0.28);
  return g;
}

function mushroomOne(add, THREE, x, z, h, r, capM, stemM, dots, underM) {
  add(new THREE.CylinderGeometry(r * 0.32, r * 0.42, h, 8), stemM, x, h / 2, z);
  add(new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, x, h - 0.02, z, null, [1, 0.75, 1]);
  if (underM) add(new THREE.CylinderGeometry(r * 0.96, r * 0.96, 0.02, 12), underM, x, h - 0.03, z);
  if (dots) for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + 0.3, rr = r * 0.6;
    add(new THREE.SphereGeometry(r * 0.12, 6, 4), dots, x + Math.cos(a) * rr, h + r * 0.38, z + Math.sin(a) * rr);
  }
}

function lamp(THREE, style, night) {
  const g = new THREE.Group();
  const { add, glow, sph, cyl } = kit(THREE, g, night);
  const stem = mat(THREE, 0xf2ead8), white = mat(THREE, 0xffffff);
  if (style === 'A') {
    mushroomOne(add, THREE, 0, 0, 0.55, 0.32, mat(THREE, 0xc8413a), stem, white, glow(0xffd98a));
    return g;
  }
  const grey = mat(THREE, 0x6b6157), greyL = mat(THREE, 0x8a8076), stripe = mat(THREE, 0xf2efe8);
  if (style === 'B') {
    mushroomOne(add, THREE, 0, 0, 0.62, 0.34, grey, stem, null, glow(0xffd98a));
    add(new THREE.SphereGeometry(0.345, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stripe, 0, 0.6, 0, null, [0.26, 0.76, 1.01]);
    mushroomOne(add, THREE, 0.32, 0.12, 0.36, 0.2, greyL, stem, null, glow(0xffd98a));
    mushroomOne(add, THREE, -0.26, 0.18, 0.28, 0.16, grey, stem, null, glow(0xffd98a));
    add(cyl(0.5, 0.55, 0.06, 12), mat(THREE, 0x6f9a4a), 0, 0.03, 0.05);
    return g;
  }
  add(cyl(0.48, 0.58, 0.42, 12), mat(THREE, 0x7a5232), 0, 0.21, 0);
  add(cyl(0.47, 0.47, 0.03, 12), mat(THREE, 0xc49a68), 0, 0.43, 0);
  add(cyl(0.5, 0.52, 0.06, 12), mat(THREE, 0x6f9a4a), 0, 0.46, 0);
  const s = new THREE.Group(); s.position.y = 0.46; s.scale.setScalar(1.35); g.add(s);
  const k = kit(THREE, s, night);
  mushroomOne(k.add, THREE, 0, 0, 0.62, 0.34, grey, stem, null, k.glow(0xffd98a));
  k.add(new THREE.SphereGeometry(0.345, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stripe, 0, 0.6, 0, null, [0.26, 0.76, 1.01]);
  mushroomOne(k.add, THREE, 0.3, 0.1, 0.36, 0.2, greyL, stem, null, k.glow(0xffd98a));
  mushroomOne(k.add, THREE, -0.24, 0.16, 0.28, 0.16, grey, stem, null, k.glow(0xffd98a));
  for (const [x, y, z] of [[0.5, 1.3, 0.2], [-0.45, 1.55, -0.1], [0.15, 1.75, 0.3]]) add(sph(0.035, 6, 5), glow(0xfff2a0), x, y, z);
  return g;
}

function portraitTexture(THREE, kind, face, bg, head, hat) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 256, 320);
  if (kind === 'emoji') {
    x.font = '170px "Apple Color Emoji","Segoe UI Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(face, 128, 170);
  } else {
    x.fillStyle = head; x.beginPath(); x.arc(128, 190, 78, 0, Math.PI * 2); x.fill();
    x.fillStyle = hat; x.beginPath(); x.ellipse(128, 128, 84, 52, 0, Math.PI, 0); x.fill(); x.fillRect(36, 124, 184, 14);
    x.fillStyle = '#2a2420'; x.beginPath(); x.arc(102, 196, 8, 0, 7); x.arc(154, 196, 8, 0, 7); x.fill();
    x.strokeStyle = '#2a2420'; x.lineWidth = 5; x.beginPath(); x.arc(128, 214, 18, 0.2, Math.PI - 0.2); x.stroke();
    x.fillStyle = 'rgba(232,120,140,.45)'; x.beginPath(); x.arc(84, 220, 12, 0, 7); x.arc(172, 220, 12, 0, 7); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function frame(THREE, style, night) {
  const g = new THREE.Group();
  const { add, box, cyl } = kit(THREE, g, night);
  const P = { face: '👷', bg: '#fbe4da', head: '#f5d2b0', hat: '#ffd23f' };
  const photo = (kind) => new THREE.MeshBasicMaterial({ map: portraitTexture(THREE, kind, P.face, P.bg, P.head, P.hat), toneMapped: false });
  if (style === 'F1') {
    const t = new THREE.Group(); t.rotation.x = -0.16; t.position.set(0, 0.03, 0); g.add(t);
    const k = kit(THREE, t, night);
    k.add(box(0.34, 0.42, 0.04), mat(THREE, 0x9a6a3e), 0, 0.23, 0);
    k.add(new THREE.PlaneGeometry(0.26, 0.33), photo('emoji'), 0, 0.23, 0.021);
    add(box(0.04, 0.3, 0.03), mat(THREE, 0x7a5232), 0, 0.15, -0.09, [0.45, 0, 0]);
    return g;
  }
  if (style === 'F2') {
    const t = new THREE.Group(); t.rotation.x = -0.12; t.position.y = 0.06; g.add(t);
    const k = kit(THREE, t, night);
    const goldM = mat(THREE, 0xd8b04a, { metalness: 0.2, roughness: 0.5 });
    k.add(new THREE.TorusGeometry(0.17, 0.03, 6, 20), goldM, 0, 0.22, 0, null, [1, 1.2, 1]);
    const ph = k.add(new THREE.CircleGeometry(0.16, 20), photo('illust'), 0, 0.22, 0.005, null, [1, 1.2, 1]);
    ph.castShadow = false;
    for (const [x, y, c] of [[-0.15, 0.04, 0xf29bb4], [0.15, 0.04, 0xffd86b], [0, 0.0, 0xa7d7ff]]) k.add(new THREE.SphereGeometry(0.045, 8, 6), mat(THREE, c), x, y, 0.02);
    add(cyl(0.12, 0.14, 0.05, 12), goldM, 0, 0.025, 0);
    return g;
  }
  const t = new THREE.Group(); t.rotation.set(-0.35, 0.18, 0.05); t.position.set(0, 0.02, 0); g.add(t);
  const k = kit(THREE, t, night);
  k.add(box(0.3, 0.36, 0.015), mat(THREE, 0xfdfaf3), 0, 0.18, 0);
  k.add(new THREE.PlaneGeometry(0.25, 0.25), photo('emoji'), 0, 0.21, 0.009);
  add(box(0.12, 0.012, 0.04), mat(THREE, 0xf29bb4), 0.07, 0.38, 0.06, [0, 0, 0.4]);
  return g;
}

export const ITEMS = [
  { id: 'chair', name: '🪑 목수의 흔들의자', build: chair },
  { id: 'mailbox', name: '📮 올빼미 우체통', build: mailbox },
  { id: 'lamp', name: '🍄 버섯 등불', build: lamp },
];
export const FRAMES = [
  { id: 'F1', name: '나무 액자 + 이모지 얼굴' },
  { id: 'F2', name: '둥근 금테 + 그린 얼굴 + 꽃' },
  { id: 'F3', name: '즉석 사진 + 이모지 얼굴' },
];
export const buildItem = (THREE, id, style, night) => ITEMS.find(i => i.id === id).build(THREE, style, night);
export const buildFrame = (THREE, style, night) => frame(THREE, style, night);

const C2 = {
  stone: 0x9a958c, stoneL: 0xb7b2a8, stoneD: 0x7a766e, moss: 0x7fae58, mossD: 0x5f8f42,
  plank: [0xc49a68, 0xb88a58, 0xcfa774], plankD: 0x8a6440, brass: 0xd8b04a,
};
const petals = [0xf29bb4, 0xffd86b, 0xa7d7ff, 0xffffff, 0xf7b267];

function plinth(THREE, add, r, h, ribbon) {
  add(new THREE.CylinderGeometry(r, r * 1.06, h * 0.55, 14), mat(THREE, C2.stoneD), 0, h * 0.275, 0);
  add(new THREE.CylinderGeometry(r * 0.94, r, h * 0.45, 14), mat(THREE, C2.stone), 0, h * 0.55 + h * 0.225, 0);
  add(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.04, 14), mat(THREE, C2.moss), 0, h + 0.01, 0);
  for (let i = 0; i < 9; i++) {
    const a = i * 0.71 + 0.2, rr = r * (0.98 + (i % 3) * 0.02);
    add(new THREE.SphereGeometry(0.07 + (i % 3) * 0.02, 7, 5), mat(THREE, i % 2 ? C2.moss : C2.mossD), Math.cos(a) * rr, h * (0.2 + (i % 4) * 0.18), Math.sin(a) * rr, null, [1, 0.7, 1]);
  }
  add(new THREE.BoxGeometry(r * 0.62, 0.11, 0.03), mat(THREE, C2.brass, { metalness: 0.3, roughness: 0.45 }), 0, h * 0.42, r * 1.03);
  add(new THREE.BoxGeometry(r * 0.5, 0.05, 0.035), mat(THREE, ribbon), 0, h * 0.42, r * 1.04);
}

function flowers(THREE, add, pts) {
  pts.forEach(([x, z], i) => {
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4), mat(THREE, 0x5f8f42), x, 0.08, z);
    add(new THREE.SphereGeometry(0.05, 7, 5), mat(THREE, petals[i % petals.length]), x, 0.17, z, null, [1, 0.6, 1]);
    add(new THREE.SphereGeometry(0.018, 5, 4), mat(THREE, 0xffe08a), x, 0.19, z);
  });
}

function rockingChair(THREE, add, P) {
  for (const x of [-0.29, 0.29]) add(new THREE.TorusGeometry(0.58, 0.035, 6, 28, Math.PI * 0.44), mat(THREE, P.dark), x, 0.6, 0.02, [0, Math.PI / 2, Math.PI * 1.28]);
  add(new THREE.BoxGeometry(0.6, 0.06, 0.54), mat(THREE, P.main), 0, 0.42, 0);
  add(new THREE.BoxGeometry(0.54, 0.09, 0.48), mat(THREE, P.cushion), 0, 0.49, 0.01, null, [1, 1, 1]);
  for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6), mat(THREE, P.main), -0.2 + i * 0.1, 0.77, -0.27, [-0.16, 0, 0]);
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.66, 8), mat(THREE, P.dark), 0, 1.08, -0.32, [0, 0, Math.PI / 2]);
  for (const x of [-0.3, 0.3]) {
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6), mat(THREE, P.dark), x, 0.6, 0.2);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), mat(THREE, P.main), x, 0.77, -0.02, [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 6), mat(THREE, P.dark), x, 0.76, -0.27, [-0.16, 0, 0]);
  }
  add(new THREE.SphereGeometry(0.17, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, P.accent), 0, 0.98, -0.25, [-0.16, 0, 0], [1.2, 0.85, 0.75]);
  add(new THREE.CylinderGeometry(0.22, 0.22, 0.025, 16), mat(THREE, P.accent), 0, 0.98, -0.25, [-0.16, 0, 0], [1.15, 1, 0.75]);
}

function chairC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  const W = 2.0, D = 1.4;
  for (const [x, z] of [[-W / 2 + 0.1, -D / 2 + 0.1], [W / 2 - 0.1, -D / 2 + 0.1], [-W / 2 + 0.1, D / 2 - 0.1], [W / 2 - 0.1, D / 2 - 0.1]]) add(new THREE.BoxGeometry(0.12, 0.14, 0.12), mat(THREE, C2.plankD), x, 0.07, z);
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(W / 7 - 0.02, 0.06, D), mat(THREE, C2.plank[i % 3]), -W / 2 + (i + 0.5) * W / 7, 0.17, 0);
  add(new THREE.BoxGeometry(W, 0.06, 0.08), mat(THREE, C2.plankD), 0, 0.17, D / 2 + 0.02);
  add(new THREE.BoxGeometry(0.7, 0.05, 0.3), mat(THREE, C2.plank[1]), 0.1, 0.07, D / 2 + 0.22);
  for (const x of [-W / 2 + 0.06, -0.3, 0.4, W / 2 - 0.06]) add(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 6), mat(THREE, C2.plankD), x, 0.41, -D / 2 + 0.06);
  add(new THREE.BoxGeometry(W, 0.05, 0.06), mat(THREE, C2.plankD), 0, 0.6, -D / 2 + 0.06);
  const rug = [0xe0663c, 0xf6ead2, 0xffd23f, 0xf6ead2, 0xe0663c];
  rug.forEach((c, i) => add(new THREE.BoxGeometry(0.9, 0.012, 0.16), mat(THREE, c), -0.3, 0.205, -0.32 + i * 0.16));
  const s = new THREE.Group(); s.scale.setScalar(1.2); s.position.set(-0.3, 0.2, -0.05); s.rotation.y = 0.25; g.add(s);
  rockingChair(THREE, kit(THREE, s, night).add, { main: 0xe0663c, dark: 0xb8492a, cushion: 0xf6ead2, accent: 0xffd23f });
  add(new THREE.CylinderGeometry(0.21, 0.21, 0.045, 16), mat(THREE, C2.plank[2]), 0.6, 0.66, 0.08);
  add(new THREE.CylinderGeometry(0.035, 0.05, 0.44, 8), mat(THREE, C2.plankD), 0.6, 0.42, 0.08);
  add(new THREE.CylinderGeometry(0.15, 0.17, 0.035, 12), mat(THREE, C2.plankD), 0.6, 0.215, 0.08);
  add(new THREE.CylinderGeometry(0.06, 0.075, 0.03, 8), mat(THREE, 0x4c4f58), 0.55, 0.695, 0.06);
  add(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8, 1, true), glow(0xffc864), 0.55, 0.77, 0.06);
  add(new THREE.ConeGeometry(0.075, 0.07, 8), mat(THREE, 0x4c4f58), 0.55, 0.865, 0.06);
  add(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 10), mat(THREE, 0xffffff), 0.7, 0.72, 0.16);
  add(new THREE.CylinderGeometry(0.13, 0.1, 0.22, 10), mat(THREE, 0xc8653e), 0.78, 0.31, -0.45);
  for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.05, 0.32, 5), mat(THREE, i % 2 ? 0x6fae4a : 0x5a9a3a), 0.78 + Math.cos(i) * 0.06, 0.55, -0.45 + Math.sin(i) * 0.06, [Math.cos(i) * 0.4, 0, Math.sin(i) * 0.4]);
  add(new THREE.BoxGeometry(0.05, 0.26, 0.05), mat(THREE, C2.plankD), -0.95, 0.33, 0.45, [0, 0, -0.35]);
  add(new THREE.BoxGeometry(0.18, 0.08, 0.08), mat(THREE, 0x5a5f68), -1.0, 0.45, 0.45, [0, 0, -0.35]);
  add(new THREE.BoxGeometry(0.42, 0.11, 0.03), mat(THREE, C2.brass, { metalness: 0.3, roughness: 0.45 }), 0.55, 0.12, D / 2 + 0.07);
  add(new THREE.BoxGeometry(0.34, 0.05, 0.035), mat(THREE, 0xe0663c), 0.55, 0.12, D / 2 + 0.08);
  flowers(THREE, add, [[-1.08, 0.55], [-1.12, 0.2], [1.08, 0.6], [1.12, -0.1]]);
  return g;
}

function barnOwl(THREE, add) {
  const gold = mat(THREE, 0xe0a52e), goldD = mat(THREE, 0xb07e18), cream = mat(THREE, 0xfdfaf3), black = mat(THREE, 0x2a2420);
  add(new THREE.SphereGeometry(0.2, 14, 10), gold, 0, 0.2, -0.02, null, [1, 1.2, 0.95]);
  add(new THREE.SphereGeometry(0.17, 14, 10), cream, 0, 0.16, 0.05, null, [0.95, 1.05, 0.8]);
  for (const x of [-1, 1]) add(new THREE.SphereGeometry(0.12, 10, 8), goldD, x * 0.17, 0.19, -0.02, [0, 0, x * 0.3], [0.45, 1.1, 0.9]);
  add(new THREE.SphereGeometry(0.17, 14, 10), gold, 0, 0.47, -0.01, null, [1.05, 0.95, 0.95]);
  for (const x of [-1, 1]) add(new THREE.SphereGeometry(0.085, 10, 8), cream, x * 0.06, 0.47, 0.11, null, [1, 1.2, 0.5]);
  for (const x of [-1, 1]) add(new THREE.SphereGeometry(0.03, 8, 6), black, x * 0.062, 0.49, 0.15);
  add(new THREE.ConeGeometry(0.022, 0.06, 5), mat(THREE, 0xd9822e), 0, 0.44, 0.16, [Math.PI / 2 + 0.3, 0, 0]);
  for (const x of [-1, 1]) add(new THREE.SphereGeometry(0.035, 6, 5), mat(THREE, 0xd9822e), x * 0.07, 0.02, 0.08, null, [1, 0.5, 1.3]);
}

function mailboxC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  plinth(THREE, add, 0.5, 0.28, 0xe0a52e);
  flowers(THREE, add, [[-0.62, 0.3], [0.64, 0.24], [-0.4, -0.55], [0.5, -0.5]]);
  add(new THREE.CylinderGeometry(0.08, 0.09, 1.25, 8), mat(THREE, 0x7a5232), 0, 0.9, 0);
  for (const y of [0.55, 1.2]) add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), mat(THREE, C2.brass, { metalness: 0.3, roughness: 0.45 }), 0, y, 0);
  add(new THREE.BoxGeometry(0.66, 0.4, 0.46), mat(THREE, 0xe0a52e), 0, 1.68, 0);
  add(new THREE.CylinderGeometry(0.23, 0.23, 0.66, 14, 1, false, 0, Math.PI), mat(THREE, 0xe0a52e), 0, 1.88, 0, [0, 0, Math.PI / 2]);
  add(new THREE.BoxGeometry(0.7, 0.04, 0.5), mat(THREE, 0xb07e18), 0, 1.48, 0);
  add(new THREE.BoxGeometry(0.5, 0.3, 0.02), mat(THREE, 0xfdfaf3), 0, 1.7, 0.235);
  add(new THREE.BoxGeometry(0.3, 0.035, 0.02), mat(THREE, 0x2a2420), 0, 1.76, 0.25);
  add(new THREE.BoxGeometry(0.2, 0.13, 0.012), mat(THREE, 0xffffff), 0.02, 1.8, 0.255, [0, 0, 0.12]);
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 10), mat(THREE, 0xc0412c), 0.03, 1.79, 0.263, [Math.PI / 2, 0, 0]);
  add(new THREE.BoxGeometry(0.03, 0.3, 0.03), mat(THREE, 0x7a5232), 0.36, 1.75, 0.1);
  add(new THREE.BoxGeometry(0.16, 0.1, 0.02), mat(THREE, 0xc0412c), 0.44, 1.86, 0.1);
  const owl = new THREE.Group(); owl.position.set(0, 2.08, 0); owl.scale.setScalar(0.95); g.add(owl);
  barnOwl(THREE, kit(THREE, owl, night).add);
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 6), mat(THREE, 0x4c4f58), -0.22, 1.35, 0.06, [0, 0, Math.PI / 2]);
  add(new THREE.TorusGeometry(0.06, 0.012, 5, 10, Math.PI), mat(THREE, 0x4c4f58), -0.43, 1.3, 0.06);
  add(new THREE.CylinderGeometry(0.06, 0.075, 0.03, 8), mat(THREE, 0x4c4f58), -0.43, 1.2, 0.06);
  add(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 8, 1, true), glow(0xffc864), -0.43, 1.12, 0.06);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 8), mat(THREE, 0x4c4f58), -0.43, 1.05, 0.06);
  return g;
}

function badgerShroom(THREE, add, glowFn, x, z, h, r) {
  add(new THREE.CylinderGeometry(r * 0.3, r * 0.42, h, 10), mat(THREE, 0xf2ead8), x, h / 2, z);
  add(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, 0x6b6157), x, h - 0.02, z, null, [1, 0.72, 1]);
  add(new THREE.SphereGeometry(r * 1.005, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, 0xf2efe8), x, h - 0.02, z, null, [0.3, 0.73, 1.005]);
  add(new THREE.CylinderGeometry(r * 0.95, r * 0.5, 0.05, 14), glowFn(0xffd98a), x, h - 0.045, z);
}

function lampC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  const bark = mat(THREE, 0x6e4a2e), barkD = mat(THREE, 0x5a3c25);
  add(new THREE.CylinderGeometry(0.52, 0.64, 0.5, 12), bark, 0, 0.25, 0);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; add(new THREE.BoxGeometry(0.06, 0.48, 0.06), barkD, Math.cos(a) * 0.58, 0.24, Math.sin(a) * 0.58, [0, -a, Math.sin(a) * 0.12]); }
  for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.4; add(new THREE.BoxGeometry(0.3, 0.12, 0.14), bark, Math.cos(a) * 0.62, 0.06, Math.sin(a) * 0.62, [0, -a, 0]); }
  add(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 16), mat(THREE, 0xd6b07e), 0, 0.505, 0);
  for (const r of [0.18, 0.32, 0.44]) add(new THREE.TorusGeometry(r, 0.008, 4, 20), mat(THREE, 0xb08a5a), 0, 0.522, 0, [Math.PI / 2, 0, 0]);
  add(new THREE.SphereGeometry(0.3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, C2.moss), -0.22, 0.5, -0.12, null, [1.2, 0.35, 1]);
  const s = new THREE.Group(); s.position.y = 0.52; g.add(s);
  const k = kit(THREE, s, night);
  badgerShroom(THREE, k.add, k.glow, 0.02, -0.04, 0.82, 0.4);
  badgerShroom(THREE, k.add, k.glow, 0.3, 0.2, 0.46, 0.22);
  badgerShroom(THREE, k.add, k.glow, -0.28, 0.18, 0.34, 0.16);
  for (const [x, z, h, r] of [[0.75, 0.35, 0.2, 0.1], [-0.72, 0.4, 0.16, 0.08], [0.62, -0.5, 0.18, 0.09]]) badgerShroom(THREE, add, glow, x, z, h, r);
  for (let i = 0; i < 5; i++) { const a = i * 1.25 + 2.2; add(new THREE.ConeGeometry(0.07, 0.42, 4), mat(THREE, i % 2 ? 0x6fae4a : 0x5a9a3a), Math.cos(a) * 0.7, 0.18, Math.sin(a) * 0.7, [Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5], [1, 1, 0.35]); }
  for (const [x, z] of [[0.15, 0.85], [-0.2, 1.1], [0.25, 1.32]]) add(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 9), mat(THREE, C2.stoneL), x, 0.025, z);
  for (const [x, y, z] of [[0.55, 1.45, 0.2], [-0.5, 1.7, -0.1], [0.12, 1.95, 0.32], [-0.25, 1.25, 0.45]]) add(new THREE.SphereGeometry(0.03, 6, 5), glow(0xfff2a0), x, y, z);
  add(new THREE.BoxGeometry(0.36, 0.1, 0.03), mat(THREE, C2.brass, { metalness: 0.3, roughness: 0.45 }), 0, 0.3, 0.63);
  add(new THREE.BoxGeometry(0.28, 0.045, 0.035), mat(THREE, 0x6b6157), 0, 0.3, 0.64);
  return g;
}

const PORTRAIT = {
  farmer: { bg: ['#e4f4dc', '#bfe3b0'], body: '#5fbf62', skin: '#f5d2b0', draw: 'farmer' },
  builder: { bg: ['#fde8de', '#f6c2ad'], body: '#e0663c', skin: '#f5d2b0', draw: 'builder' },
  merchant: { bg: ['#eee4fb', '#cdb7f0'], body: '#8a5cd0', skin: '#f5d2b0', draw: 'merchant' },
  angler: { bg: ['#e0eefb', '#b4d3f2'], body: '#3f8fd6', skin: '#f0cfae', draw: 'angler' },
  chef: { bg: ['#f4f2ec', '#dcd8cc'], body: '#ffffff', skin: '#f7f4ee', draw: 'chef' },
  forager: { bg: ['#ece8e0', '#cfc6b8'], body: '#6b6157', skin: '#6b6157', draw: 'badger' },
  stargazer: { bg: ['#e4e8fb', '#bcc6f2'], body: '#5b6fd0', skin: '#fde3c8', draw: 'stargazer' },
  ferryman: { bg: ['#fbf1de', '#f2d7a8'], body: '#f0ede4', skin: '#f5f2ea', draw: 'duck' },
  rancher: { bg: ['#fbe6dc', '#f2c0aa'], body: '#d9694f', skin: '#fbe0c4', draw: 'rancher' },
  curator: { bg: ['#e2e6ef', '#b9c1d4'], body: '#4a5a7a', skin: '#f0ddc8', draw: 'curator' },
  courier: { bg: ['#fbf0d4', '#f2d58e'], body: '#e0a52e', skin: '#fdfaf3', draw: 'owl' },
};

export const PORTRAIT_IDS = Object.keys(PORTRAIT);

export function paintPortrait(x, id, W = 256, H = 320) {
  const P = PORTRAIT[id];
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, P.bg[0]); gr.addColorStop(1, P.bg[1]);
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  const cx = W / 2, hy = 150, hr = 66;
  const circ = (px, py, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); };
  const ell = (px, py, rx, ry, c, rot = 0) => { x.fillStyle = c; x.beginPath(); x.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); x.fill(); };
  x.fillStyle = P.body; x.beginPath(); x.ellipse(cx, H + 30, 110, 110, 0, Math.PI, 0); x.fill();
  const d = P.draw;
  if (d === 'chef') { circ(cx - 52, hy - 50, 22, '#2a2420'); circ(cx + 52, hy - 50, 22, '#2a2420'); }
  if (d === 'badger') { circ(cx - 50, hy - 48, 16, '#4a4239'); circ(cx + 50, hy - 48, 16, '#4a4239'); }
  if (d === 'curator') { ell(cx - 58, hy - 6, 18, 30, '#f2f0ea'); ell(cx + 58, hy - 6, 18, 30, '#f2f0ea'); }
  if (d === 'rancher') circ(cx, hy - 66, 24, '#3a2a22');
  if (d === 'stargazer') { ell(cx, hy - 8, hr + 10, hr + 6, '#2f3f8f'); }
  circ(cx, hy, hr, P.skin);
  if (d === 'badger') { ell(cx, hy - 18, 16, 54, '#f2efe8'); ell(cx - 34, hy + 20, 22, 18, '#f2efe8'); ell(cx + 34, hy + 20, 22, 18, '#f2efe8'); }
  if (d === 'owl') { x.fillStyle = '#e0a52e'; x.beginPath(); x.arc(cx, hy, hr + 6, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fdfaf3'; x.beginPath(); x.moveTo(cx, hy - 34); x.bezierCurveTo(cx - 70, hy - 70, cx - 76, hy + 34, cx, hy + 58); x.bezierCurveTo(cx + 76, hy + 34, cx + 70, hy - 70, cx, hy - 34); x.fill(); }
  if (d === 'chef') { ell(cx - 26, hy + 2, 15, 20, '#2a2420', -0.4); ell(cx + 26, hy + 2, 15, 20, '#2a2420', 0.4); }
  const eyeY = hy + 4, eyeX = d === 'owl' ? 22 : 24;
  const eyeC = d === 'chef' ? '#ffffff' : '#2a2420';
  circ(cx - eyeX, eyeY, d === 'owl' ? 10 : 7, eyeC); circ(cx + eyeX, eyeY, d === 'owl' ? 10 : 7, eyeC);
  if (d === 'chef') { circ(cx - eyeX, eyeY, 4, '#2a2420'); circ(cx + eyeX, eyeY, 4, '#2a2420'); }
  circ(cx - eyeX + 2, eyeY - 2, 2.2, '#ffffff'); circ(cx + eyeX + 2, eyeY - 2, 2.2, '#ffffff');
  if (d === 'duck') { ell(cx, hy + 26, 30, 14, '#e8a33c'); }
  else if (d === 'owl') { x.fillStyle = '#d9822e'; x.beginPath(); x.moveTo(cx - 7, hy + 16); x.lineTo(cx + 7, hy + 16); x.lineTo(cx, hy + 32); x.fill(); }
  else if (d === 'chef' || d === 'badger') { ell(cx, hy + 22, 9, 6, '#2a2420'); }
  if (d !== 'duck' && d !== 'owl') { x.strokeStyle = '#2a2420'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.arc(cx, hy + 26, 12, 0.25, Math.PI - 0.25); x.stroke(); }
  if (d !== 'badger' && d !== 'owl') { x.fillStyle = 'rgba(232,110,130,.38)'; circ(cx - 42, hy + 26, 10, 'rgba(232,110,130,.38)'); circ(cx + 42, hy + 26, 10, 'rgba(232,110,130,.38)'); }
  if (d === 'angler') { x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx, hy + 50, 44, 30, 0, 0, Math.PI); x.fill(); x.strokeStyle = '#2a2420'; x.lineWidth = 4; x.beginPath(); x.arc(cx, hy + 26, 10, 0.3, Math.PI - 0.3); x.stroke(); }
  if (d === 'farmer') { ell(cx, hy - 46, 100, 22, '#f0cd6a'); x.fillStyle = '#e6bd52'; x.beginPath(); x.ellipse(cx, hy - 58, 50, 34, 0, Math.PI, 0); x.fill(); x.fillStyle = '#c0412c'; x.fillRect(cx - 50, hy - 62, 100, 9); }
  if (d === 'builder') { x.fillStyle = '#ffd23f'; x.beginPath(); x.ellipse(cx, hy - 40, 72, 58, 0, Math.PI, 0); x.fill(); ell(cx, hy - 40, 84, 11, '#f0c020'); x.fillStyle = '#f0c020'; x.fillRect(cx - 7, hy - 96, 14, 56); }
  if (d === 'merchant') { x.fillStyle = '#8a5cd0'; x.beginPath(); x.moveTo(cx - 70, hy - 38); x.quadraticCurveTo(cx - 6, hy - 150, cx + 26, hy - 140); x.lineTo(cx + 70, hy - 38); x.fill(); ell(cx, hy - 38, 82, 13, '#7044b0'); x.fillStyle = '#f0c04a'; x.fillRect(cx - 62, hy - 56, 124, 11); }
  if (d === 'angler') { x.fillStyle = '#27506f'; x.beginPath(); x.ellipse(cx, hy - 44, 58, 40, 0, Math.PI, 0); x.fill(); ell(cx, hy - 42, 80, 14, '#1f415a'); }
  if (d === 'chef') { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx - 26, hy - 84, 28, 0, Math.PI * 2); x.arc(cx + 26, hy - 84, 28, 0, Math.PI * 2); x.arc(cx, hy - 100, 30, 0, Math.PI * 2); x.fill(); x.fillRect(cx - 44, hy - 76, 88, 30); }
  if (d === 'stargazer') { x.fillStyle = '#2f3f8f'; x.beginPath(); x.ellipse(cx, hy - 34, 70, 44, 0, Math.PI, 0); x.fill(); star(x, cx + 44, hy - 46, 16, '#ffd86b'); }
  if (d === 'duck') { x.fillStyle = '#e8a33c'; x.beginPath(); x.moveTo(cx - 92, hy - 44); x.lineTo(cx, hy - 106); x.lineTo(cx + 92, hy - 44); x.fill(); x.fillStyle = '#c98a2a'; x.fillRect(cx - 92, hy - 48, 184, 6); }
  if (d === 'rancher') { x.fillStyle = '#3a2a22'; x.beginPath(); x.ellipse(cx, hy - 30, 68, 44, 0, Math.PI, 0); x.fill(); x.fillStyle = '#d8b04a'; x.fillRect(cx - 52, hy - 70, 104, 7); }
  if (d === 'curator') { x.strokeStyle = '#4a3a2a'; x.lineWidth = 3; x.beginPath(); x.arc(cx - 24, eyeY, 14, 0, Math.PI * 2); x.arc(cx + 24, eyeY, 14, 0, Math.PI * 2); x.stroke(); ell(cx, H - 18, 22, 12, '#8a2f3a'); circ(cx, H - 18, 6, '#6a2030'); }
}

function star(x, cx, cy, r, c) {
  x.fillStyle = c; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
}

export function buildFrameF2(THREE, id) {
  const g = new THREE.Group();
  const { add } = kit(THREE, g, []);
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  paintPortrait(c.getContext('2d'), id);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const t = new THREE.Group(); t.rotation.x = -0.12; t.position.y = 0.06; g.add(t);
  const k = kit(THREE, t, []);
  const goldM = mat(THREE, 0xd8b04a, { metalness: 0.25, roughness: 0.45 });
  k.add(new THREE.TorusGeometry(0.17, 0.028, 8, 28), goldM, 0, 0.23, 0, null, [1, 1.22, 1]);
  k.add(new THREE.TorusGeometry(0.145, 0.008, 4, 28), mat(THREE, 0xf2dc8a, { metalness: 0.2 }), 0, 0.23, 0.012, null, [1, 1.22, 1]);
  const ph = k.add(new THREE.CircleGeometry(0.15, 28), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 0, 0.23, 0.006, null, [1, 1.22, 1]);
  ph.castShadow = false;
  k.add(new THREE.SphereGeometry(0.03, 8, 6), goldM, 0, 0.445, 0.0);
  [[-0.15, 0.05, 0xf29bb4], [-0.1, 0.02, 0xffd86b], [0.12, 0.03, 0xa7d7ff], [0.16, 0.07, 0xf29bb4]].forEach(([x, y, col]) => {
    k.add(new THREE.SphereGeometry(0.04, 8, 6), mat(THREE, col), x, y, 0.03, null, [1, 0.7, 1]);
    k.add(new THREE.SphereGeometry(0.014, 5, 4), mat(THREE, 0xffe08a), x, y + 0.02, 0.05);
  });
  for (const x of [-0.06, 0.07]) k.add(new THREE.ConeGeometry(0.025, 0.09, 4), mat(THREE, 0x6fae4a), x, 0.03, 0.02, [0, 0, x > 0 ? -0.9 : 0.9], [1, 1, 0.4]);
  add(new THREE.CylinderGeometry(0.11, 0.14, 0.05, 16), goldM, 0, 0.025, 0);
  return g;
}

export const ITEMS_C2 = [
  { id: 'chair', name: '🪑 목수의 흔들의자', build: chairC2 },
  { id: 'mailbox', name: '📮 올빼미 우체통', build: mailboxC2 },
  { id: 'lamp', name: '🍄 버섯 등불', build: lampC2 },
];

const brassM = (THREE) => mat(THREE, C2.brass, { metalness: 0.3, roughness: 0.45 });

function plate(THREE, add, x, y, z, ribbon, ry = 0) {
  add(new THREE.BoxGeometry(0.34, 0.1, 0.03), brassM(THREE), x, y, z, [0, ry, 0]);
  add(new THREE.BoxGeometry(0.27, 0.045, 0.035), mat(THREE, ribbon), x, y, z + 0.005, [0, ry, 0]);
}

function grassPad(THREE, add, rx, rz) {
  add(new THREE.CylinderGeometry(1, 1.04, 0.08, 18), mat(THREE, C2.mossD), 0, 0.04, 0, null, [rx, 1, rz]);
  add(new THREE.CylinderGeometry(0.97, 0.97, 0.03, 18), mat(THREE, C2.moss), 0, 0.09, 0, null, [rx, 1, rz]);
}

function lanternOnPole(THREE, add, glow, x, z, h = 1.0) {
  add(new THREE.CylinderGeometry(0.03, 0.035, h, 6), mat(THREE, 0x7a5232), x, h / 2, z);
  add(new THREE.BoxGeometry(0.2, 0.03, 0.03), mat(THREE, 0x7a5232), x + 0.08, h - 0.02, z);
  add(new THREE.CylinderGeometry(0.055, 0.07, 0.03, 8), mat(THREE, 0x4c4f58), x + 0.16, h - 0.1, z);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 8, 1, true), glow(0xffc864), x + 0.16, h - 0.17, z);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 8), mat(THREE, 0x4c4f58), x + 0.16, h - 0.235, z);
}

function wheel(THREE, add, x, y, z) {
  add(new THREE.TorusGeometry(0.2, 0.03, 6, 18), mat(THREE, 0x7a5232), x, y, z, [0, Math.PI / 2, 0]);
  for (let i = 0; i < 6; i++) add(new THREE.BoxGeometry(0.02, 0.38, 0.02), mat(THREE, 0x9a6a3e), x, y, z, [i * Math.PI / 6, 0, 0]);
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 8), mat(THREE, 0x4c4f58), x, y, z, [0, 0, Math.PI / 2]);
}

function cartC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  grassPad(THREE, add, 0.75, 0.6);
  add(new THREE.BoxGeometry(0.9, 0.06, 0.58), mat(THREE, 0x9a6a3e), 0, 0.42, 0);
  for (const z of [-0.29, 0.29]) add(new THREE.BoxGeometry(0.92, 0.2, 0.04), mat(THREE, C2.plank[z > 0 ? 0 : 2]), 0, 0.53, z);
  for (const x of [-0.45, 0.45]) add(new THREE.BoxGeometry(0.04, 0.2, 0.6), mat(THREE, C2.plank[1]), x, 0.53, 0);
  add(new THREE.BoxGeometry(0.94, 0.04, 0.04), mat(THREE, 0x5fbf62), 0, 0.64, 0.3);
  for (const z of [-0.33, 0.33]) wheel(THREE, add, -0.1, 0.24, z * 1.05);
  for (const z of [-0.18, 0.18]) add(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), mat(THREE, 0x7a5232), 0.62, 0.45, z, [0, 0, 1.2]);
  add(new THREE.BoxGeometry(0.05, 0.3, 0.05), mat(THREE, 0x7a5232), -0.38, 0.2, 0);
  const veg = [[-0.25, 0.08, 'cab'], [0.05, -0.1, 'pump'], [0.28, 0.1, 'cab'], [-0.05, 0.14, 'car'], [0.2, -0.12, 'car'], [-0.3, -0.12, 'car'], [0.08, 0.05, 'corn']];
  veg.forEach(([x, z, k]) => {
    if (k === 'cab') { add(new THREE.SphereGeometry(0.13, 10, 8), mat(THREE, 0x8fcf5a), x, 0.63, z); add(new THREE.SphereGeometry(0.1, 10, 8), mat(THREE, 0xb8e07a), x, 0.66, z + 0.03); }
    if (k === 'pump') { add(new THREE.SphereGeometry(0.15, 12, 8), mat(THREE, 0xe8862e), x, 0.64, z, null, [1, 0.75, 1]); add(new THREE.CylinderGeometry(0.02, 0.025, 0.07, 5), mat(THREE, 0x5f8f42), x, 0.76, z); }
    if (k === 'car') { add(new THREE.ConeGeometry(0.045, 0.24, 6), mat(THREE, 0xf07a2a), x, 0.66, z, [0, 0, 1.1]); add(new THREE.ConeGeometry(0.05, 0.12, 4), mat(THREE, 0x6fae4a), x - 0.12, 0.72, z, [0, 0, -0.6]); }
    if (k === 'corn') { add(new THREE.CylinderGeometry(0.045, 0.035, 0.24, 8), mat(THREE, 0xf2d04a), x, 0.7, z, [0.9, 0, 0.3]); add(new THREE.ConeGeometry(0.05, 0.16, 4), mat(THREE, 0x8fbf5a), x, 0.66, z + 0.1, [1.2, 0, 0.3]); }
  });
  add(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 14), mat(THREE, 0xf0cd6a), -0.32, 0.12, 0.42, [0.25, 0, 0.1]);
  add(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, 0xe6bd52), -0.32, 0.13, 0.42, [0.25, 0, 0.1]);
  add(new THREE.CylinderGeometry(0.105, 0.105, 0.025, 12), mat(THREE, 0xc0412c), -0.32, 0.14, 0.42, [0.25, 0, 0.1]);
  lanternOnPole(THREE, add, glow, -0.62, -0.32, 1.05);
  plate(THREE, add, 0.0, 0.17, 0.6, 0x5fbf62);
  flowers(THREE, add, [[0.6, 0.45], [-0.66, 0.35], [0.7, -0.35]]);
  return g;
}

function tentC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  grassPad(THREE, add, 0.7, 0.62);
  const rug = [0x8a5cd0, 0xf0c04a, 0x8a5cd0];
  rug.forEach((c, i) => add(new THREE.BoxGeometry(1.0, 0.012, 0.18), mat(THREE, c), 0, 0.115, -0.15 + i * 0.18));
  for (const [x, z] of [[-0.5, -0.36], [0.5, -0.36], [-0.5, 0.36], [0.5, 0.36]]) add(new THREE.CylinderGeometry(0.03, 0.03, 1.15, 6), mat(THREE, 0x7a5232), x, 0.62, z);
  add(new THREE.ConeGeometry(0.82, 0.5, 4, 1), mat(THREE, 0x8a5cd0), 0, 1.44, 0, [0, Math.PI / 4, 0], [1, 1, 0.78]);
  for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.83, 0.12, 4, 1, true), mat(THREE, 0xf0c04a), 0, 1.24 + i * 0.001, 0, [0, Math.PI / 4, 0], [1, 1, 0.78]);
  for (let i = 0; i < 9; i++) for (const z of [-0.42, 0.42]) add(new THREE.SphereGeometry(0.065, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(THREE, i % 2 ? 0x7044b0 : 0xf0c04a), -0.56 + i * 0.14, 1.2, z);
  add(new THREE.SphereGeometry(0.06, 8, 6), brassM(THREE), 0, 1.72, 0);
  add(new THREE.BoxGeometry(0.9, 0.36, 0.34), mat(THREE, 0x9a6a3e), 0, 0.29, 0.06);
  add(new THREE.BoxGeometry(0.96, 0.04, 0.4), mat(THREE, 0x7044b0), 0, 0.49, 0.06);
  [[-0.32, 0x8fe0c0], [-0.18, 0xf29bb4], [0.3, 0x9ab8ff]].forEach(([x, c]) => {
    add(new THREE.SphereGeometry(0.06, 10, 8), glow(c), x, 0.57, 0.12);
    add(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 6), mat(THREE, 0xf2ead8), x, 0.65, 0.12);
  });
  add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 10), brassM(THREE), 0.08, 0.535, 0.1);
  add(new THREE.SphereGeometry(0.1, 14, 10), glow(0xc9b8ff), 0.08, 0.65, 0.1);
  add(new THREE.BoxGeometry(0.22, 0.14, 0.14), mat(THREE, 0xb07e18), -0.3, 0.2, 0.42);
  plate(THREE, add, 0.25, 0.23, 0.52, 0x8a5cd0);
  flowers(THREE, add, [[0.62, 0.42], [-0.62, 0.44]]);
  return g;
}

function nookC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  grassPad(THREE, add, 0.8, 0.62);
  add(new THREE.CylinderGeometry(0.46, 0.48, 0.03, 18), mat(THREE, 0x5aa6d8, { roughness: 0.25 }), 0.32, 0.1, 0.18, null, [1, 1, 0.8]);
  for (let i = 0; i < 7; i++) { const a = i * 0.9; add(new THREE.SphereGeometry(0.06, 6, 5), mat(THREE, C2.stoneL), 0.32 + Math.cos(a) * 0.47, 0.1, 0.18 + Math.sin(a) * 0.38, null, [1, 0.6, 1]); }
  for (const [x, z] of [[-0.62, -0.4], [-0.08, -0.4], [-0.62, 0.15], [-0.08, 0.15]]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), mat(THREE, 0x5a3c25), x, 0.15, z);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.6, 0.04, 0.11), mat(THREE, C2.plank[i % 3]), -0.35, 0.31, -0.38 + i * 0.12);
  add(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 12), mat(THREE, 0x3f8fd6), -0.45, 0.48, -0.15);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; add(new THREE.CylinderGeometry(0.018, 0.018, 0.17, 5), mat(THREE, 0x7a5232), -0.45 + Math.cos(a) * 0.09, 0.4, -0.15 + Math.sin(a) * 0.09); }
  add(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 10), mat(THREE, 0x8f9aa6), -0.2, 0.41, 0.05);
  add(new THREE.TorusGeometry(0.1, 0.008, 4, 12, Math.PI), mat(THREE, 0x5a5f68), -0.2, 0.49, 0.05);
  for (const [dx, c] of [[-0.03, 0x7ab0d8], [0.04, 0xf2a35a]]) add(new THREE.SphereGeometry(0.04, 8, 6), mat(THREE, c), -0.2 + dx, 0.5, 0.05, [0, 0, 0.4], [1.6, 0.6, 0.6]);
  add(new THREE.CylinderGeometry(0.012, 0.018, 1.2, 5), mat(THREE, 0x7a5232), -0.08, 0.78, -0.4, [0.0, 0, -0.75]);
  add(new THREE.CylinderGeometry(0.003, 0.003, 0.7, 3), mat(THREE, 0xffffff), 0.36, 0.86, -0.4, [0, 0, 0.12]);
  add(new THREE.SphereGeometry(0.035, 8, 6), mat(THREE, 0xe84a3a), 0.4, 0.5, -0.36);
  add(new THREE.BoxGeometry(0.2, 0.1, 0.12), mat(THREE, 0x27506f), -0.55, 0.38, 0.08);
  add(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 12), mat(THREE, 0x27506f), -0.6, 0.36, -0.28, null, [1, 1, 1]);
  add(new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, 0x1f415a), -0.6, 0.37, -0.28);
  lanternOnPole(THREE, add, glow, -0.62, 0.15, 1.05);
  for (const [x, z] of [[0.55, 0.3], [0.2, 0.05]]) add(new THREE.CircleGeometry(0.07, 10), mat(THREE, 0x6fae4a), x, 0.12, z, [-Math.PI / 2, 0, 0]);
  plate(THREE, add, 0.0, 0.1, 0.62, 0x3f8fd6);
  return g;
}

function steamerC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  grassPad(THREE, add, 0.72, 0.62);
  add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20), mat(THREE, 0xf7f4ee), 0, 0.42, 0);
  add(new THREE.CylinderGeometry(0.43, 0.43, 0.03, 20), mat(THREE, 0x2a2420), 0, 0.39, 0);
  add(new THREE.CylinderGeometry(0.06, 0.09, 0.3, 8), mat(THREE, 0x2a2420), 0, 0.23, 0);
  add(new THREE.CylinderGeometry(0.22, 0.25, 0.04, 12), mat(THREE, 0x2a2420), 0, 0.1, 0);
  const bam = mat(THREE, 0xd9c08a), bamD = mat(THREE, 0xb89a62);
  for (let i = 0; i < 3; i++) {
    add(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 16), bam, -0.05, 0.49 + i * 0.085, 0.0);
    add(new THREE.TorusGeometry(0.17, 0.01, 4, 18), bamD, -0.05, 0.49 + i * 0.085 + 0.035, 0, [Math.PI / 2, 0, 0]);
  }
  add(new THREE.SphereGeometry(0.17, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), bam, -0.05, 0.73, 0, null, [1, 0.35, 1]);
  add(new THREE.SphereGeometry(0.03, 8, 6), bamD, -0.05, 0.8, 0);
  for (const [x, y, s] of [[-0.08, 0.92, 0.07], [-0.02, 1.02, 0.055], [-0.1, 1.1, 0.045]]) add(new THREE.SphereGeometry(s, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 1 }), x, y, 0.02);
  for (const [x, z] of [[0.25, 0.15], [0.22, -0.18]]) { add(new THREE.SphereGeometry(0.06, 10, 8), mat(THREE, 0xffffff), x, 0.48, z, null, [1, 0.7, 1]); add(new THREE.SphereGeometry(0.012, 5, 4), mat(THREE, 0x2a2420), x, 0.52, z); }
  for (const [x, z] of [[-0.55, 0.32], [0.55, 0.3]]) {
    add(new THREE.CylinderGeometry(0.15, 0.16, 0.2, 14), mat(THREE, 0xf7f4ee), x, 0.2, z);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.045, 8, 6), mat(THREE, 0x2a2420), x + s * 0.1, 0.31, z - 0.06);
  }
  add(new THREE.CylinderGeometry(0.14, 0.12, 0.2, 10), mat(THREE, 0x2a2420), 0.48, 0.2, -0.38);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) add(new THREE.CylinderGeometry(0.028, 0.028, 0.22, 6), mat(THREE, j % 2 ? 0x8fcf5a : 0x6fae4a), 0.43 + i * 0.05, 0.38 + j * 0.23, -0.4 + (i - 1) * 0.03);
  for (let i = 0; i < 4; i++) add(new THREE.ConeGeometry(0.04, 0.16, 4), mat(THREE, 0x6fae4a), 0.5 + (i % 2 ? 0.08 : -0.06), 1.1 - i * 0.12, -0.4, [0, 0, i % 2 ? -1.0 : 1.0], [1, 1, 0.35]);
  add(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 5), mat(THREE, 0x7a5232), -0.6, 0.5, -0.36);
  add(new THREE.SphereGeometry(0.11, 12, 10), glow(0xe8503a), -0.6, 1.0, -0.36, null, [1, 1.15, 1]);
  for (const y of [0.88, 1.12]) add(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 10), mat(THREE, 0x2a2420), -0.6, y, -0.36);
  plate(THREE, add, 0.0, 0.1, 0.62, 0x2a2420);
  return g;
}

function telescopeC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  plinth(THREE, add, 0.55, 0.26, 0x5b6fd0);
  for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.5; add(new THREE.CylinderGeometry(0.02, 0.025, 0.7, 5), mat(THREE, 0x7a5232), Math.cos(a) * 0.16, 0.58, Math.sin(a) * 0.16, [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]); }
  add(new THREE.SphereGeometry(0.05, 8, 6), brassM(THREE), 0, 0.92, 0);
  const t = new THREE.Group(); t.position.set(0, 0.95, 0); t.rotation.set(0, 0.6, 0.55); g.add(t);
  const k = kit(THREE, t, night);
  k.add(new THREE.CylinderGeometry(0.065, 0.085, 0.62, 12), brassM(THREE), 0, 0.06, 0, [0, 0, Math.PI / 2]);
  k.add(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 12), mat(THREE, 0x2f3f8f), 0.3, 0.06, 0, [0, 0, Math.PI / 2]);
  k.add(new THREE.CylinderGeometry(0.04, 0.05, 0.12, 8), mat(THREE, 0x2f3f8f), -0.33, 0.06, 0, [0, 0, Math.PI / 2]);
  for (const x of [-0.1, 0.12]) k.add(new THREE.TorusGeometry(0.078, 0.01, 4, 14), mat(THREE, 0x2f3f8f), x, 0.06, 0, [0, Math.PI / 2, 0]);
  const stool = new THREE.Group(); stool.position.set(-0.32, 0.28, 0.3); g.add(stool);
  const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.07 : 0.16; i ? st.lineTo(Math.cos(a) * r, Math.sin(a) * r) : st.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  kit(THREE, stool, night).add(new THREE.ExtrudeGeometry(st, { depth: 0.06, bevelEnabled: false }), mat(THREE, 0xffd86b), 0, 0.12, 0, [-Math.PI / 2, 0, 0]);
  kit(THREE, stool, night).add(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6), mat(THREE, 0x7a5232), 0, 0.06, 0);
  for (const [x, z, h] of [[0.42, -0.3, 0.7], [-0.45, -0.32, 0.9]]) {
    add(new THREE.CylinderGeometry(0.015, 0.015, h, 5), mat(THREE, 0x4c4f58), x, 0.26 + h / 2, z);
    const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.035 : 0.08; i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    add(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: false }), glow(0xffe27a), x, 0.3 + h, z - 0.015);
  }
  const moon = new THREE.Shape(); moon.absarc(0, 0, 0.12, Math.PI * 0.35, Math.PI * 1.65, false); moon.absarc(0.06, 0, 0.1, Math.PI * 1.55, Math.PI * 0.45, true);
  add(new THREE.ExtrudeGeometry(moon, { depth: 0.03, bevelEnabled: false }), glow(0xfff2b0), 0.42, 1.12, -0.3);
  return g;
}

function boatC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  grassPad(THREE, add, 0.8, 0.62);
  add(new THREE.CylinderGeometry(0.62, 0.64, 0.03, 20), mat(THREE, 0x5aa6d8, { roughness: 0.25 }), 0, 0.1, 0, null, [1, 1, 0.75]);
  for (let i = 0; i < 9; i++) { const a = i * 0.7; add(new THREE.SphereGeometry(0.055, 6, 5), mat(THREE, C2.stoneL), Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.47, null, [1, 0.6, 1]); }
  const boat = new THREE.Group(); boat.position.y = 0.09; g.add(boat);
  const bk = kit(THREE, boat, night);
  const hull = new THREE.CylinderGeometry(0.22, 0.22, 0.9, 14, 1, false, Math.PI, Math.PI);
  bk.add(hull, mat(THREE, 0xf0ede4), 0, 0.3, 0, [0, 0, Math.PI / 2], [1, 1, 1.15]);
  bk.add(new THREE.BoxGeometry(0.9, 0.04, 0.5), mat(THREE, 0xe8a33c), 0, 0.3, 0);
  bk.add(new THREE.BoxGeometry(0.82, 0.05, 0.42), mat(THREE, 0x6e4a2e), 0, 0.32, 0);
  for (const x of [-0.54, 0.54]) bk.add(new THREE.ConeGeometry(0.22, 0.18, 14, 1, false, x > 0 ? 0 : Math.PI, Math.PI), mat(THREE, 0xf0ede4), x, 0.3, 0, [0, 0, x > 0 ? -Math.PI / 2 : Math.PI / 2], [1, 1, 1.15]);
  bk.add(new THREE.BoxGeometry(0.04, 0.06, 0.5), mat(THREE, 0xe8a33c), 0.18, 0.36, 0);
  const fl = [[-0.3, -0.1], [-0.15, 0.1], [0.0, -0.08], [0.32, 0.08], [-0.05, 0.12], [0.3, -0.12], [-0.32, 0.12]];
  fl.forEach(([x, z], i) => {
    bk.add(new THREE.CylinderGeometry(0.01, 0.01, 0.18, 4), mat(THREE, 0x5f8f42), x, 0.43, z);
    bk.add(new THREE.SphereGeometry(0.055, 8, 6), mat(THREE, petals[i % petals.length]), x, 0.53, z, null, [1, 0.65, 1]);
    bk.add(new THREE.SphereGeometry(0.02, 5, 4), mat(THREE, 0xffe08a), x, 0.555, z);
  });
  for (let i = 0; i < 6; i++) bk.add(new THREE.ConeGeometry(0.035, 0.12, 4), mat(THREE, 0x6fae4a), -0.35 + i * 0.14, 0.4, (i % 2 ? 0.16 : -0.16), [0, 0, (i % 2 ? 0.4 : -0.4)], [1, 1, 0.4]);
  bk.add(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 5), mat(THREE, 0x9a6a3e), 0.05, 0.36, 0.3, [0.15, 0, 1.25]);
  bk.add(new THREE.BoxGeometry(0.05, 0.14, 0.02), mat(THREE, 0x9a6a3e), 0.42, 0.24, 0.33, [0.15, 0, 1.25]);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), mat(THREE, 0x7a5232), -0.55, 0.55, 0);
  add(new THREE.CylinderGeometry(0.055, 0.07, 0.03, 8), mat(THREE, 0x4c4f58), -0.55, 0.81, 0);
  add(new THREE.CylinderGeometry(0.05, 0.05, 0.11, 8, 1, true), glow(0xffc864), -0.55, 0.74, 0);
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 8), mat(THREE, 0x4c4f58), -0.55, 0.675, 0);
  plate(THREE, add, 0.0, 0.1, 0.62, 0xe8a33c);
  return g;
}

function nestC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  grassPad(THREE, add, 0.7, 0.62);
  const hay = mat(THREE, 0xe6c26a), hayD = mat(THREE, 0xc9a24a);
  add(new THREE.BoxGeometry(0.76, 0.34, 0.5), hay, 0, 0.26, 0);
  for (const y of [0.18, 0.34]) add(new THREE.BoxGeometry(0.78, 0.02, 0.52), mat(THREE, 0xd9694f), 0, y, 0);
  for (let i = 0; i < 10; i++) add(new THREE.BoxGeometry(0.02, 0.006, 0.12), hayD, -0.33 + i * 0.07, 0.435, (i % 3 - 1) * 0.12, [0, i * 0.4, 0]);
  add(new THREE.TorusGeometry(0.2, 0.08, 8, 18), hayD, 0, 0.48, 0, [Math.PI / 2, 0, 0], [1, 1, 0.8]);
  add(new THREE.CylinderGeometry(0.2, 0.18, 0.04, 14), hay, 0, 0.46, 0);
  for (let i = 0; i < 14; i++) { const a = i * 0.45; add(new THREE.BoxGeometry(0.008, 0.008, 0.14), hay, Math.cos(a) * 0.24, 0.55, Math.sin(a) * 0.24, [0.4, a, 0]); }
  for (const [x, z] of [[-0.06, -0.05], [0.07, -0.02], [0.0, 0.07]]) add(new THREE.SphereGeometry(0.055, 10, 8), mat(THREE, 0xfaf3e2), x, 0.53, z, null, [1, 1.25, 1]);
  const chick = (x, z, ry) => {
    add(new THREE.SphereGeometry(0.08, 12, 10), mat(THREE, 0xffd84a), x, 0.6, z);
    add(new THREE.SphereGeometry(0.055, 12, 10), mat(THREE, 0xffd84a), x, 0.71, z + 0.02);
    add(new THREE.ConeGeometry(0.018, 0.04, 4), mat(THREE, 0xf08a2a), x + Math.sin(ry) * 0.06, 0.71, z + Math.cos(ry) * 0.06, [Math.PI / 2, 0, -ry]);
    for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.01, 5, 4), mat(THREE, 0x2a2420), x + Math.sin(ry) * 0.045 + s * 0.022 * Math.cos(ry), 0.73, z + Math.cos(ry) * 0.045 - s * 0.022 * Math.sin(ry));
  };
  chick(0.13, 0.12, 0.4); chick(-0.14, 0.1, -0.3);
  add(new THREE.CylinderGeometry(0.12, 0.09, 0.06, 12), mat(THREE, 0xd9694f), 0.48, 0.13, 0.32);
  for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.015, 4, 3), mat(THREE, 0xe6c26a), 0.48 + Math.cos(i) * 0.06, 0.165, 0.32 + Math.sin(i) * 0.05);
  add(new THREE.BoxGeometry(0.04, 0.5, 0.04), mat(THREE, 0x7a5232), -0.5, 0.33, -0.25);
  add(new THREE.BoxGeometry(0.3, 0.17, 0.03), mat(THREE, 0xfaf3e2), -0.5, 0.58, -0.235);
  add(new THREE.SphereGeometry(0.04, 8, 6), mat(THREE, 0xffd84a), -0.5, 0.58, -0.215);
  lanternOnPole(THREE, add, glow, 0.55, -0.3, 0.95);
  plate(THREE, add, 0.0, 0.1, 0.62, 0xd9694f);
  flowers(THREE, add, [[-0.6, 0.35], [0.66, 0.05]]);
  return g;
}

function vitrineC2(THREE, night) {
  const g = new THREE.Group();
  const { add, glow } = kit(THREE, g, night);
  add(new THREE.CylinderGeometry(0.6, 0.62, 0.06, 18), mat(THREE, C2.stoneL), 0, 0.03, 0);
  add(new THREE.BoxGeometry(0.5, 0.6, 0.5), mat(THREE, 0x4a5a7a), 0, 0.36, 0);
  add(new THREE.BoxGeometry(0.56, 0.05, 0.56), mat(THREE, 0x3a4862), 0, 0.68, 0);
  add(new THREE.BoxGeometry(0.56, 0.05, 0.56), mat(THREE, 0x3a4862), 0, 0.08, 0);
  for (const [x, z] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) add(new THREE.BoxGeometry(0.03, 0.5, 0.03), brassM(THREE), x, 0.95, z);
  add(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: 0xdff0ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 }), 0, 0.95, 0);
  add(new THREE.BoxGeometry(0.54, 0.04, 0.54), brassM(THREE), 0, 1.22, 0);
  add(new THREE.SphereGeometry(0.04, 8, 6), brassM(THREE), 0, 1.26, 0);
  const pts = [[0.0, 0], [0.07, 0], [0.08, 0.02], [0.06, 0.05], [0.1, 0.12], [0.11, 0.18], [0.08, 0.25], [0.045, 0.29], [0.06, 0.32]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(pts, 14), mat(THREE, 0xc8653e), -0.08, 0.705, -0.02);
  add(new THREE.TorusGeometry(0.105, 0.008, 4, 16), mat(THREE, 0x2a2420), -0.08, 0.85, -0.02, [Math.PI / 2, 0, 0]);
  add(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 8), mat(THREE, 0x8a2f3a), 0.12, 0.725, 0.08);
  add(new THREE.OctahedronGeometry(0.06, 0), glow(0x8fe0ff), 0.12, 0.8, 0.08, [0.3, 0.5, 0], [0.8, 1.2, 0.8]);
  for (const x of [-0.5, 0.5]) {
    add(new THREE.CylinderGeometry(0.1, 0.12, 0.04, 10), brassM(THREE), x, 0.02, 0.48);
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), brassM(THREE), x, 0.27, 0.48);
    add(new THREE.SphereGeometry(0.04, 8, 6), brassM(THREE), x, 0.54, 0.48);
  }
  add(new THREE.TorusGeometry(0.5, 0.025, 5, 16, Math.PI), mat(THREE, 0x8a2f3a), 0, 0.5, 0.48, [0, 0, Math.PI], [1, 0.3, 1]);
  plate(THREE, add, 0, 0.36, 0.255, 0x8a2f3a);
  return g;
}

ITEMS_C2.push(
  { id: 'cart', name: '🥕 채소 수레', build: cartC2 },
  { id: 'tent', name: '⛺ 보라 천막', build: tentC2 },
  { id: 'nook', name: '🎣 낚시 쉼터', build: nookC2 },
  { id: 'steamer', name: '🎋 대나무 찜기 탁자', build: steamerC2 },
  { id: 'telescope', name: '🔭 꼬마 망원경', build: telescopeC2 },
  { id: 'boat', name: '🛶 꽃배 화분', build: boatC2 },
  { id: 'nest', name: '🐣 병아리 둥지', build: nestC2 },
  { id: 'vitrine', name: '🏺 유리 진열장', build: vitrineC2 },
);
