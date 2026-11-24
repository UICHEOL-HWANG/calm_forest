import * as THREE from 'three';
import { mat, flat, glow, M, G, pair, teardrop, crystalCluster, face, setEyes, browPose, wing, baitInto, MOVING, PEST_SCALE } from './pest-art-kit.js';

const HOVER = (v) => v * PEST_SCALE / 1.6;

export function axolotl({ submerged = false } = {}) {
  const K = { SKIN: 0xf0b3bd, GILL: 0xd9546e, BELLY: 0xf7d4d8, MOUTH: 0x7a2a3a, BROW: 0xc0607a };
  const g = new THREE.Group(), body = G(g);
  M(teardrop(0.17, 0.6, 0.35, 0.45), mat(K.SKIN), body, [0, 0.13, -0.04]);
  M(teardrop(0.14, 0.48, 0.4, 0.5), mat(K.BELLY), body, [0, 0.09, -0.02], [0, 0, 0], [0.92, 0.55, 1], false);
  const head = G(body, [0, 0.16, 0.3]);
  M(new THREE.SphereGeometry(0.16, 16, 10), mat(K.SKIN), head, [0, 0, 0], [0, 0, 0], [1.45, 0.75, 1.05]);
  const mouth = M(new THREE.TorusGeometry(0.11, 0.013, 5, 14, Math.PI * 0.9), mat(K.MOUTH), head, [0, -0.035, 0.125], [0.35, 0, Math.PI * 1.05], [1, 0.55, 1], false);
  const cheeks = pair(sd => M(new THREE.SphereGeometry(0.085, 10, 8), mat(K.SKIN), head, [sd * 0.17, -0.03, 0.05]));
  const F = pair(sd => face(head, sd, [sd * 0.105, 0.075, 0.1], 0.032, K.SKIN, K.BROW));
  const eyes = F.map(f => f.e), brows = F.map(f => f.brow);
  const tail = G(body, [0, 0.13, -0.3]);
  M(teardrop(0.1, 0.5, 0.05, 0), mat(K.SKIN), tail, [0, 0, -0.2], [0, 0, 0], [0.35, 1, 1]);
  const gills = [];
  pair(sd => {
    [0.45, 0, -0.45].forEach((a, i) => {
      const gl = G(head, [sd * 0.2, 0.05, -0.02 + (1 - i) * 0.05]);
      M(new THREE.ConeGeometry(0.055, 0.36, 6), mat(K.GILL), gl, [0, 0.16, 0]);
      pair(f => M(new THREE.ConeGeometry(0.03, 0.13, 5), mat(K.GILL), gl, [f * 0.04, 0.18, 0], [0, 0, -f * 0.9], [1, 1, 1], false));
      gills.push({ gl, sd, a, i });
    });
    const arm = G(body, [sd * 0.15, 0.06, 0.2], [0, sd * 0.9, 0]);
    M(teardrop(0.04, 0.15, 0.6, 0), mat(K.SKIN), arm, [0, 0, 0.05]);
    M(teardrop(0.035, 0.13, 0.6, 0), mat(K.SKIN), body, [sd * 0.17, 0.05, -0.15], [0, sd * 1.1, 0]);
  });
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.12, 0.47),
    pose(s, t = 0) {
      const sunk = submerged && (s === 'idle' || s === 'hide' || s === 'sleep' || s === 'gone');
      body.position.y = sunk ? (s === 'hide' ? -0.26 : -0.2) : 0;
      body.rotation.set(0, 0, MOVING.has(s) ? Math.sin(t * 12) * 0.06 : 0);
      head.rotation.set(0, 0, 0);
      tail.rotation.set(0, 0.25 + (MOVING.has(s) ? Math.sin(t * 10) * 0.45 : Math.sin(t * 1.5) * 0.12), 0);
      cheeks.forEach(c => c.scale.setScalar(1)); mouth.scale.set(1, 0.55, 1);
      const sway = Math.sin(t * 2) * 0.08;
      gills.forEach(({ gl, sd, a, i }) => { gl.rotation.set(a, 0, -sd * (0.7 + i * 0.35) + sway * sd); gl.scale.setScalar(1); });
      let eyeMode = 'open', mood = 'none';
      if (s === 'lurk' || s === 'approach') { head.rotation.x = -0.2; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'carry') { cheeks.forEach(c => c.scale.setScalar(1.65)); eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'flee') { head.rotation.x = -0.35; mouth.scale.set(0.45, 0.9, 1); eyeMode = 'wide'; mood = 'shock'; gills.forEach(({ gl, sd, i }) => { gl.scale.setScalar(1.25); gl.rotation.z = -sd * (0.4 + i * 0.3); }); }
      if (s === 'eat') eyeMode = 'closed';
      if (s === 'hide') eyeMode = 'half';
      if (s === 'sleep') { eyeMode = 'closed'; gills.forEach(({ gl, sd, i }) => gl.rotation.z = -sd * (1.3 + i * 0.25)); tail.rotation.y = 1.1; }
      setEyes(eyes, eyeMode); browPose(brows, mood);
    },
  };
}

export function crab() {
  const K = { SKIN: 0xe0795a, SKIN2: 0xf2b08f, ROCK: 0x6b6e78, XA: 0x9be3ee, XB: 0xc7a6f0, BROW: 0x8a3a2a };
  const g = new THREE.Group(), body = G(g);
  M(new THREE.IcosahedronGeometry(0.3, 0), flat(K.ROCK), body, [0, 0.28, -0.08], [0.3, 0.4, 0], [1.05, 0.65, 0.95]);
  crystalCluster(body, [0, 0.42, -0.1], [[0, 0, 0, 0.07, 0.28, 0, 0, K.XA], [0.11, -0.02, 0.05, 0.05, 0.18, -0.5, 0.2, K.XB], [-0.12, -0.03, -0.02, 0.055, 0.2, 0.55, -0.1, K.XA]]);
  M(teardrop(0.17, 0.34, 0.5, 0.4), mat(K.SKIN), body, [0, 0.15, 0.14], [0.15, 0, 0], [1.25, 0.8, 1]);
  const F = pair(sd => {
    M(new THREE.CylinderGeometry(0.016, 0.02, 0.2, 6), mat(K.SKIN), body, [sd * 0.07, 0.31, 0.24], [0.25, 0, -sd * 0.15]);
    return face(body, sd, [sd * 0.085, 0.42, 0.28], 0.045, K.SKIN, K.BROW);
  });
  const eyes = F.map(f => f.e), brows = F.map(f => f.brow);
  const arm = G(body, [0.22, 0.16, 0.28]);
  M(teardrop(0.08, 0.24, 0.5, 0.2), mat(K.SKIN), arm, [0, 0, 0.04]);
  const bowl = G(arm, [0, 0.02, 0.24]);
  M(new THREE.SphereGeometry(0.15, 14, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat(K.SKIN2, { side: THREE.DoubleSide }), bowl, [0, 0, 0], [0, 0, 0], [1, 0.75, 1]);
  M(new THREE.TorusGeometry(0.15, 0.022, 6, 18), mat(K.SKIN), bowl, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const lidG = G(bowl, [0, 0.01, -0.15]);
  M(new THREE.SphereGeometry(0.13, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat(K.SKIN), lidG, [0, 0, 0.15], [0, 0, 0], [1, 0.45, 1]);
  const snack = baitInto(G(bowl, [0, -0.03, 0])); snack.scale.setScalar(0.55);
  const small = G(body, [-0.18, 0.15, 0.3], [0, 0.35, 0]);
  M(teardrop(0.065, 0.18, 0.5, 0.2), mat(K.SKIN), small, [0, 0, 0.05]);
  M(new THREE.ConeGeometry(0.032, 0.11, 6), mat(K.SKIN2), small, [0, 0.03, 0.16], [Math.PI / 2, 0, 0], [1, 1, 0.6]);
  const legs = [];
  pair(sd => { for (let k = 0; k < 3; k++) {
    const leg = G(body, [sd * 0.14, 0.14, 0.1 - k * 0.11]);
    M(new THREE.CylinderGeometry(0.02, 0.017, 0.17, 5), mat(K.SKIN), leg, [sd * 0.07, 0.03, 0], [0, 0, sd * 1.15]);
    M(new THREE.CylinderGeometry(0.017, 0.008, 0.17, 5), mat(K.SKIN2), leg, [sd * 0.16, -0.06, 0], [0, 0, sd * 0.35]);
    legs.push({ leg, sd, k });
  } });
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0.22, 0.24, 0.52),
    pose(s, t = 0) {
      const walk = MOVING.has(s);
      body.position.y = 0; body.rotation.set(0, 0, walk ? Math.sin(t * 16) * 0.05 : 0);
      arm.rotation.set(0, 0, 0); small.rotation.set(0, 0.35, 0); lidG.rotation.set(-0.6, 0, 0);
      legs.forEach(({ leg, sd, k }) => leg.rotation.z = walk ? Math.sin(t * 16 + k * 2 + sd) * 0.25 : 0);
      snack.visible = false;
      let eyeMode = 'open', mood = 'none';
      if (s === 'lurk' || s === 'approach') { arm.rotation.x = -0.3; lidG.rotation.x = -1.3; small.rotation.x = -0.6; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'carry') { lidG.rotation.x = -0.35; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'flee') { lidG.rotation.x = -1.3; eyeMode = 'wide'; mood = 'shock'; }
      if (s === 'eat') { snack.visible = true; lidG.rotation.x = -1.3; arm.rotation.set(-0.35, -0.5, 0); eyeMode = 'closed'; }
      if (s === 'hide') { body.position.y = -0.06; lidG.rotation.x = 0; eyeMode = 'half'; }
      if (s === 'sleep') { body.position.y = -0.08; legs.forEach(({ leg, sd }) => leg.rotation.z = sd * 0.5); arm.rotation.x = 0.2; lidG.rotation.x = 0; eyeMode = 'closed'; }
      setEyes(eyes, eyeMode); browPose(brows, mood);
    },
  };
}

export function bat() {
  const K = { FUR: 0x8a6fa8, BELLY: 0xd8c4e0, EARIN: 0xf0a8b8, WING: 0x5c4878, BONE: 0x463660, CLAW: 0xf2c46a };
  const g = new THREE.Group(), body = G(g);
  M(teardrop(0.17, 0.4, 0.5, 0.1), mat(K.FUR), body, [0, 0, 0], [Math.PI / 2, 0, 0]);
  M(teardrop(0.12, 0.3, 0.5, 0.1), mat(K.BELLY), body, [0, -0.02, 0.07], [Math.PI / 2, 0, 0], [0.9, 1, 0.8], false);
  const head = G(body, [0, 0.2, 0.04]);
  M(new THREE.SphereGeometry(0.12, 12, 10), mat(K.FUR), head, [0, 0, 0], [0, 0, 0], [1, 0.9, 0.95]);
  M(new THREE.ConeGeometry(0.045, 0.09, 8), mat(K.BELLY), head, [0, -0.03, 0.11], [Math.PI / 2, 0, 0], [1.3, 1, 0.8]);
  const F = pair(sd => face(head, sd, [sd * 0.055, 0.025, 0.1], 0.028, K.FUR, K.BONE));
  const eyes = F.map(f => f.e), brows = F.map(f => f.brow);
  pair(sd => {
    const ear = G(head, [sd * 0.08, 0.05, 0], [-0.15, 0, -sd * 0.8]);
    M(teardrop(0.21, 0.42, 0.12, 0), mat(K.FUR), ear, [0, 0.19, 0], [-Math.PI / 2, 0, 0], [1.3, 0.2, 1]);
    M(teardrop(0.155, 0.32, 0.12, 0), mat(K.EARIN), ear, [0, 0.17, 0.02], [-Math.PI / 2, 0, 0], [1.3, 0.14, 1], false);
  });
  const ws = new THREE.Shape();
  ws.moveTo(0, 0.1); ws.bezierCurveTo(0.2, 0.22, 0.45, 0.3, 0.7, 0.26);
  ws.quadraticCurveTo(0.6, 0.1, 0.62, -0.08); ws.quadraticCurveTo(0.5, 0, 0.42, -0.14);
  ws.quadraticCurveTo(0.3, -0.04, 0.22, -0.18); ws.quadraticCurveTo(0.12, -0.08, 0, -0.16);
  const wg = new THREE.ShapeGeometry(ws, 8);
  const wings = pair(sd => {
    const pv = G(body, [sd * 0.1, 0.05, -0.02]);
    M(wg, mat(K.WING, { side: THREE.DoubleSide }), pv, [0, 0, 0], [0, 0, 0], [sd * 1.2, 1.2, 1]);
    [[0.7, 0.26], [0.62, -0.08], [0.42, -0.14]].forEach(([x, y]) => M(new THREE.CylinderGeometry(0.011, 0.013, Math.hypot(x, y) * 1.2, 4), mat(K.BONE), pv, [sd * x * 0.6, y * 0.6, 0.006], [0, 0, -Math.atan2(sd * x, y)]));
    return { pv, sd };
  });
  const toes = [];
  const grab = G(body, [0, -0.24, 0.03]);
  M(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 6), mat(K.BONE), grab, [0, 0.02, 0]);
  M(new THREE.SphereGeometry(0.035, 8, 6), mat(K.BONE), grab, [0, -0.03, 0]);
  [0, 2.1, 4.2].forEach(a => {
    const seg = G(G(grab, [0, -0.04, 0], [0, a, 0]), [0, 0, 0.02]);
    M(new THREE.CylinderGeometry(0.014, 0.012, 0.1, 5), mat(K.CLAW), seg, [0, -0.05, 0]);
    M(new THREE.ConeGeometry(0.016, 0.06, 5), mat(K.CLAW), seg, [0, -0.1, -0.02], [Math.PI * 0.75, 0, 0]);
    toes.push(seg);
  });
  return {
    g, hover: HOVER(0.8), holdAt: new THREE.Vector3(0, -0.4, 0.04),
    pose(s, t = 0) {
      body.rotation.set(-0.35, 0, 0); head.rotation.set(0, 0, 0); this.hover = HOVER(0.8);
      const flap = (k, base, sweep = 0, tilt = 1.0) => wings.forEach(({ pv, sd }) => wing(pv, sd, tilt, sweep, base + Math.sin(t * k) * 0.35));
      let splay = 0.35, eyeMode = 'open', mood = 'none';
      flap(8, 0.3);
      if (s === 'lurk') { this.hover = HOVER(1.05); body.rotation.x = -0.1; wings.forEach(({ pv, sd }) => wing(pv, sd, 0.75, -0.15, 1.15 + Math.sin(t * 3) * 0.08)); splay = 1.0; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'approach') { body.rotation.x = 0.2; flap(10, 0.4); splay = 0.8; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'carry') { body.rotation.x = 0.55; wings.forEach(({ pv, sd }) => wing(pv, sd, 1.3, 0.8, 0.1 + Math.sin(t * 12) * 0.15)); splay = 0.15; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'flee') { this.hover = HOVER(0.65); head.rotation.z = 0.3; flap(16, 0.1); splay = 0.9; eyeMode = 'wide'; mood = 'sad'; }
      if (s === 'eat') eyeMode = 'closed';
      if (s === 'sleep' || s === 'hide') { this.hover = HOVER(0.45); body.rotation.x = 0; wings.forEach(({ pv, sd }) => { pv.rotation.order = 'XYZ'; pv.rotation.set(0, sd * 1.15, -sd * 1.3); }); eyeMode = s === 'sleep' ? 'closed' : 'half'; }
      toes.forEach(tt => tt.rotation.x = -splay);
      setEyes(eyes, eyeMode); browPose(brows, mood);
    },
  };
}

export function grub() {
  const K = { BODY: 0xe4dbef, BAND: 0x9a86b8, LAMP: 0xd9f27a, FEEL: 0x6e5c88, BASKET: 0x9a6a3a };
  const g = new THREE.Group(), body = G(g);
  const N = 6, segs = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), r = 0.12 + 0.06 * Math.sin(Math.min(1, u * 1.3) * Math.PI);
    const sg = G(body);
    M(new THREE.SphereGeometry(r, 14, 10), mat(K.BODY), sg, [0, 0, 0], [0, 0, 0], [1.05, 0.92, 0.9]);
    if (i > 0) M(new THREE.SphereGeometry(r * 1.01, 14, 4, 0, Math.PI * 2, 0, Math.PI * 0.32), mat(K.BAND), sg, [0, 0, 0], [0, 0, 0], [1.05, 0.92, 0.9], false);
    segs.push({ sg, r });
  }
  const head = segs[0].sg;
  const F = pair(sd => face(head, sd, [sd * 0.06, 0.045, 0.1], 0.028, K.BODY, K.FEEL));
  const eyes = F.map(f => f.e), brows = F.map(f => f.brow);
  const basket = G(segs[2].sg, [0, 0.16, 0]);
  M(new THREE.CylinderGeometry(0.12, 0.09, 0.08, 10, 1, true), mat(K.BASKET, { side: THREE.DoubleSide }), basket, [0, 0.03, 0]);
  M(new THREE.TorusGeometry(0.12, 0.014, 5, 12), mat(0xb88a52), basket, [0, 0.07, 0], [Math.PI / 2, 0, 0], [1, 1, 1], false);
  const lure = G(segs[N - 1].sg);
  const curve = new THREE.CatmullRomCurve3([[0, 0.05, 0], [0, 0.38, 0.02], [0, 0.6, 0.28], [0, 0.6, 0.62], [0, 0.48, 0.84]].map(q => new THREE.Vector3(...q)));
  M(new THREE.TubeGeometry(curve, 16, 0.018, 5), mat(K.FEEL), lure);
  const bulb = glow(K.LAMP, 1.3);
  M(new THREE.SphereGeometry(0.075, 12, 8), bulb, lure, [0, 0.42, 0.86]);
  M(new THREE.ConeGeometry(0.04, 0.05, 8), mat(K.FEEL), lure, [0, 0.5, 0.85]);
  const light = new THREE.PointLight(0xd9f27a, 1.5, 3.2, 1.6); light.position.set(0, 0.35, 0.86); lure.add(light);
  return {
    g, hover: 0, holdAt: new THREE.Vector3(0, 0.42, 0.06),
    pose(s, t = 0) {
      const walk = MOVING.has(s);
      segs.forEach(({ sg, r }, i) => {
        if (s === 'sleep' || s === 'hide') { const a = i * 0.95; sg.position.set(Math.sin(a) * 0.26, r, Math.cos(a) * 0.26); }
        else sg.position.set(walk ? Math.sin(t * 9 - i * 0.9) * 0.03 : 0, r + (i % 2 ? 0.03 : 0) + (walk ? Math.max(0, Math.sin(t * 9 - i * 0.9)) * 0.04 : 0), 0.38 - i * 0.15);
      });
      lure.rotation.set(Math.sin(t * 1.7) * 0.06, 0, 0);
      let eyeMode = 'open', mood = 'none';
      if (s === 'lurk' || s === 'approach') { head.position.y += 0.1; lure.rotation.x = 0.25; eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'carry') { eyeMode = 'half'; mood = 'scheme'; }
      if (s === 'flee') { lure.rotation.x = -0.3; eyeMode = 'wide'; mood = 'sad'; }
      if (s === 'eat') eyeMode = 'closed';
      if (s === 'sleep' || s === 'hide') { lure.rotation.set(1.5, 0.8, 0); eyeMode = s === 'sleep' ? 'closed' : 'half'; }
      const dim = s === 'sleep' || s === 'hide' || s === 'flee';
      bulb.emissiveIntensity = dim ? 0.4 : 1.3;
      light.intensity = dim ? 0.4 : 1.5;
      setEyes(eyes, eyeMode); browPose(brows, mood);
    },
  };
}
