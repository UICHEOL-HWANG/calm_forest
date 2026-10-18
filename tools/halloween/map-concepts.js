import { kit, makeCtx, buildHalloween } from '/js/spaces/halloween-art.js';
import { buildJack, buildGhostKid, buildCandyStall } from '/js/spaces/halloween-event-art.js';

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function base(T, g, ctx, ground, rim) {
  const k = kit(T);
  const disc = new T.Mesh(new T.CircleGeometry(21, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: ground, roughness: 1 }));
  disc.position.y = 0.02; g.add(disc);
  const out = new T.Mesh(new T.RingGeometry(21, 60, 48).rotateX(-Math.PI / 2), new T.MeshStandardMaterial({ color: rim, roughness: 1 }));
  out.position.y = 0.01; g.add(out);
  const path = [];
  for (let i = 0; i < 7; i++) path.push(k.cyl(0.55 + rnd() * 0.2, 0.6, 0.06, (rnd() - 0.5) * 0.6, 0.04, 12 - i * 1.6, 0x8a8478, 7));
  g.add(new T.Mesh(k.merge(path), ctx.vtxMat()));
  const gate = buildHalloween(T, 'webarch', 'tree', ctx); gate.position.set(0, 0, 12.5); gate.scale.setScalar(1.3); g.add(gate);
  const stall = buildCandyStall(T, ctx); stall.position.set(0.5, 0, 2.5); stall.scale.setScalar(1.15); g.add(stall);
  return k;
}

function pine(k, parts, x, z, s, leaf = 0x1f3a33) {
  parts.push(k.cyl(0.14 * s, 0.2 * s, 0.8 * s, x, 0.4 * s, z, 0x4a3426, 6));
  [[1.3, 1.6, 1.2], [1.0, 1.4, 2.1], [0.65, 1.1, 2.9]].forEach(([r, h, y]) => parts.push(k.cone(r * s, h * s, x, y * s, z, leaf, 7)));
}

function deadTree(k, parts, x, z, s) {
  const c = 0x3a2e2a;
  parts.push(k.tilt(0.22 * s, 2.6 * s, 0.22 * s, x, 1.3 * s, z, c, 0.06));
  parts.push(k.tilt(0.1 * s, 1.2 * s, 0.1 * s, x - 0.45 * s, 2.3 * s, z, c, 0.9), k.tilt(0.09 * s, 1.0 * s, 0.09 * s, x + 0.4 * s, 2.0 * s, z, c, -1.0));
  parts.push(k.tilt(0.06 * s, 0.6 * s, 0.06 * s, x - 0.85 * s, 2.75 * s, z, c, 0.2), k.tilt(0.06 * s, 0.5 * s, 0.06 * s, x + 0.75 * s, 2.45 * s, z, c, -0.3));
}

function ghosts(T, g, ctx, spots) {
  for (const [x, y, z, rz] of spots) { const gh = buildGhostKid(T, ctx); gh.position.set(x, y, z); gh.rotation.z = rz; gh.scale.setScalar(1.25); g.add(gh); }
}

function ring(n, r0, r1, fn) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.2, r = r0 + rnd() * (r1 - r0), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 9 && Math.abs(x) < 3.2) continue;
    fn(x, z);
  }
}

export function buildPatch(T, ctx) {
  seed = 7;
  const g = new T.Group(), k = base(T, g, ctx, 0x4a3a2c, 0x1e2a24), parts = [];
  for (let row = -3; row <= 3; row++) {
    if (row === 0) continue;
    for (let i = 0; i < 5; i++) {
      const x = row * 2.2 + (rnd() - 0.5) * 0.4, z = -9 + i * 2.6 + (rnd() - 0.5) * 0.6;
      parts.push(k.box(0.9, 0.12, 0.6, x, 0.08, z, 0x3a2c20), k.tilt(1.2, 0.05, 0.05, x + 0.5, 0.15, z + 0.35, 0x4f6b2e, 0.1));
      const j = buildJack(T, ctx, { lit: rnd() < 0.35, size: 0.8 + rnd() * 0.5 }); j.position.set(x, 0.1, z); j.rotation.y = (rnd() - 0.5) * 1.2; g.add(j);
    }
  }
  for (const [x, z] of [[-5.5, 5], [6, 4.5], [-7, -6], [7.5, -7.5]]) parts.push(k.cyl(0.6, 0.6, 0.9, x, 0.45, z, 0xd9b45a, 10), k.cyl(0.61, 0.61, 0.08, x, 0.65, z, 0xb08a3a, 10), k.cyl(0.61, 0.61, 0.08, x, 0.25, z, 0xb08a3a, 10));
  parts.push(k.box(0.12, 2.4, 0.12, 3.5, 1.2, -2, 0x6b4a2e), k.box(1.8, 0.1, 0.1, 3.5, 1.8, -2, 0x6b4a2e), k.box(0.8, 0.9, 0.4, 3.5, 1.5, -2, 0x8a5a9a), k.cone(0.55, 0.5, 3.5, 2.95, -2, 0x3a2a3a, 8));
  const sh = buildJack(T, ctx, { size: 0.9 }); sh.position.set(3.5, 2.0, -1.85); g.add(sh);
  ring(26, 11.8, 12.2, (x, z) => parts.push(k.box(0.12, 0.9, 0.12, x, 0.45, z, 0x7a5a3e)));
  ring(44, 13.5, 19, (x, z) => pine(k, parts, x, z, 1.1 + rnd() * 0.7, 0x2c4a3c));
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  ghosts(T, g, ctx, [[-5.9, 0.35, 5.6, 0.3], [-2.2, 0.15, -6.3, -0.2], [7.9, 0.5, -7.0, -0.35]]);
  return g;
}

export function buildGraveGarden(T, ctx) {
  seed = 11;
  const g = new T.Group(), k = base(T, g, ctx, 0x3e4a48, 0x1a2224), parts = [];
  for (const [x, z, s] of [[-6, -3, 2.2], [-4, -5.5, 2], [-7.5, -7, 1.8], [6, -4, 2.2], [4.5, -7, 2], [7.5, -1.5, 1.9], [-3, -9, 2], [3, -10, 2.2]]) { const m = buildHalloween(T, 'miniGrave', 'gable', ctx); m.position.set(x, 0, z); m.scale.setScalar(s); m.rotation.y = (rnd() - 0.5) * 0.6; g.add(m); }
  for (let i = 0; i < 12; i++) { const a = -Math.PI * 0.95 + i * 0.16, f = buildHalloween(T, 'gravefence', 'iron', ctx); f.position.set(Math.cos(a) * 11, 0, Math.sin(a) * 11 - 1); f.rotation.y = -a + Math.PI / 2; f.scale.setScalar(1.4); g.add(f); }
  for (const [x, z] of [[-3, 6], [3.5, 6.5], [-8, 2], [8.5, 2.5]]) { const l = buildHalloween(T, 'ghostlamp', 'lantern', ctx); l.position.set(x, 0, z); l.scale.setScalar(1.2); g.add(l); }
  for (const [x, z, s] of [[-9, -10, 1.4], [9.5, -9, 1.6], [0, -13, 1.8], [-12, 4, 1.3], [12, 5, 1.2]]) deadTree(k, parts, x, z, s);
  const mist = new T.MeshBasicMaterial({ color: 0x9a8acc, transparent: true, opacity: 0.18, depthWrite: false });
  for (let i = 0; i < 9; i++) { const m = new T.Mesh(new T.CircleGeometry(2.5 + rnd() * 2, 20).rotateX(-Math.PI / 2), mist); m.position.set((rnd() - 0.5) * 22, 0.15 + i * 0.01, (rnd() - 0.6) * 20); g.add(m); }
  for (let i = 0; i < 6; i++) { const j = buildJack(T, ctx, { size: 0.7 }), a = rnd() * 6.28; j.position.set(Math.cos(a) * 5, 0, Math.sin(a) * 5 - 3); g.add(j); }
  ring(44, 13.5, 19, (x, z) => pine(k, parts, x, z, 1.1 + rnd() * 0.6, 0x2e3e3c));
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  ghosts(T, g, ctx, [[-6.6, 0.4, -3.6, 0.35], [4.0, 0.3, -7.6, -0.3], [-12.4, 0.6, 3.4, 0.2]]);
  return g;
}

export function buildWitchWood(T, ctx) {
  seed = 13;
  const g = new T.Group(), k = base(T, g, ctx, 0x2f3e30, 0x18221c), parts = [];
  const hx = -4.8, hz = -3.6;
  parts.push(k.box(4, 2.6, 3.4, hx, 1.3, hz, 0x6b5a4a), k.tilt(4.6, 0.2, 3.9, hx - 1.05, 3.05, hz, 0x4a3a5e, 0.62), k.tilt(4.6, 0.2, 3.9, hx + 1.05, 3.05, hz, 0x4a3a5e, -0.62));
  parts.push(k.tilt(0.6, 1.6, 0.6, hx + 1.2, 3.8, hz - 0.6, 0x5a4a44, -0.12), k.box(1.0, 1.6, 0.1, hx, 0.8, hz + 1.72, 0x3a2a22));
  g.add(new T.Mesh(k.merge([k.box(0.8, 0.7, 0.08, hx - 1.3, 1.6, hz + 1.74, 0xffffff), k.box(0.8, 0.7, 0.08, hx + 1.3, 1.6, hz + 1.74, 0xffffff)]), ctx.glowMat(0xffd27a, 0xffb040, 1.4, true)));
  const cauldron = buildHalloween(T, 'witchCauldron', 'bubble', ctx); cauldron.position.set(hx + 3.4, 0, hz + 3.2); cauldron.scale.setScalar(1.6); g.add(cauldron);
  const shroom = [];
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, x = 5 + Math.cos(a) * 2.6, z = -4 + Math.sin(a) * 2.6; parts.push(k.cyl(0.07, 0.09, 0.35, x, 0.17, z, 0xf2ead8, 6)); shroom.push(k.cone(0.28, 0.22, x, 0.42, z, 0xffffff, 9)); }
  g.add(new T.Mesh(k.merge(shroom), ctx.glowMat(0xff7a9a, 0xff4a8a, 0.9, true)));
  const bulbs = [];
  for (let i = 0; i < 14; i++) { const t = i / 13; bulbs.push(k.orb(0.1, -7 + 14 * t, 3.0 - Math.sin(Math.PI * t) * 0.7, 6.2, 0xffffff)); }
  g.add(new T.Mesh(k.merge(bulbs), ctx.glowMat(0xffc86a, 0xffa040, 1.6, true)));
  for (const x of [-7.2, 7.2]) parts.push(k.box(0.14, 3.1, 0.14, x, 1.55, 6.2, 0x4a3426));
  for (const [x, z] of [[-10.5, -7], [9.5, -8], [-1, -10.5], [4, -11]]) pine(k, parts, x, z, 1.3 + rnd() * 0.4, 0x24443a);
  ring(46, 14, 19, (x, z) => pine(k, parts, x, z, 1.2 + rnd() * 0.8, 0x24443a));
  for (let i = 0; i < 5; i++) { const j = buildJack(T, ctx, { size: 0.65 }); j.position.set(hx - 1.6 + i * 0.8, 0, hz + 2.2); g.add(j); }
  g.add(new T.Mesh(k.merge(parts), ctx.vtxMat()));
  ghosts(T, g, ctx, [[hx - 2.4, 0.4, hz - 0.4, 0.4], [7.5, 0.3, -2.6, -0.3], [-8.6, 0.5, 3.2, 0.25]]);
  return g;
}

export const CONCEPTS = { patch: buildPatch, grave: buildGraveGarden, witch: buildWitchWood };
export { makeCtx };
