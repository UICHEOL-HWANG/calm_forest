import { AUCTION_SPOTS, AUCTION_BIDDERS } from '../data/auction.js';

const LO = { y: 0.05, x: 0.62, rz: -0.45, rx: 0.25 };
const HI = { y: 1.0, x: 0.8, rz: -0.1, rx: 0 };
const CONFETTI_COLORS = [0xff8f8f, 0xffd45a, 0x8fd3a0, 0x8fb8ff, 0xfff2e0];
const BEAR_RIM = 0x6fae7f;
const STAGE_TOP = 0.5;
const HOP_LEN = 0.42;

export function paddlePose(r, side, scale) {
  return {
    x: side * scale * (LO.x + (HI.x - LO.x) * r),
    y: LO.y + (HI.y - LO.y) * r,
    z: 0.16,
    rx: LO.rx * (1 - r),
    rz: side * (LO.rz + (HI.rz - LO.rz) * r),
  };
}

export function hopHeight(t) { return t < HOP_LEN ? Math.sin(Math.PI * t / HOP_LEN) * 0.26 : 0; }

export function faceStage(dx, dz) { return Math.atan2(-0.2 - dx, 0.2 - dz); }

export function createActors(THREE, { buildFigure, npcDefs, parent }) {
  const owned = new Set();
  const own = (res) => { owned.add(res); return res; };
  const freeTree = (root, seen) => {
    root.traverse((o) => {
      if (o.geometry && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
      for (const m of [].concat(o.material || [])) {
        if (!seen.has(m)) { seen.add(m); m.dispose(); }
      }
    });
  };
  const clay = (c) => own(new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0 }));
  const part = (group, geo, mat, x, y, z) => {
    const m = new THREE.Mesh(own(geo), mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  const buildPaddle = (rim, s) => {
    const p = new THREE.Group();
    part(p, new THREE.CylinderGeometry(0.035, 0.042, 0.55, 6), clay(0x9b7247), 0, 0.27, 0);
    part(p, new THREE.CylinderGeometry(0.21, 0.21, 0.05, 18), clay(0xf6efe0), 0, 0.7, 0).rotation.x = Math.PI / 2;
    const rimMat = clay(rim);
    part(p, new THREE.TorusGeometry(0.21, 0.035, 6, 20), rimMat, 0, 0.7, 0);
    part(p, new THREE.CylinderGeometry(0.085, 0.085, 0.065, 14), rimMat, 0, 0.7, 0).rotation.x = Math.PI / 2;
    p.scale.setScalar(s);
    return p;
  };

  const actors = new Map();
  const mount = (id, { withPaddle }) => {
    const def = npcDefs.find((n) => n.id === id);
    const fig = buildFigure(def);
    const [dx, dz] = AUCTION_SPOTS[id];
    const root = new THREE.Group();
    const lift = new THREE.Group();
    root.position.set(dx, id === 'merchant' ? STAGE_TOP : 0, dz);
    root.rotation.y = id === 'merchant' ? -0.25 : faceStage(dx, dz);
    lift.add(fig.group);
    root.add(lift);
    parent.add(root);
    const actor = {
      id, root, lift, scale: fig.group.scale.x, side: dx < 0 ? -1 : 1,
      phase: (actors.size * 1.7) % 6.28, hopT: 9, hop2: false, raise: 0, raiseUntil: 0,
      paddle: null,
    };
    if (withPaddle) {
      actor.paddle = buildPaddle(def.color, 1.25);
      lift.add(actor.paddle);
    }
    actors.set(id, actor);
  };
  mount('merchant', { withPaddle: false });
  AUCTION_BIDDERS.forEach((b) => mount(b.id, { withPaddle: true }));

  const me = { raise: 0, raiseUntil: 0, arms: null, paddle: null };

  const ring = new THREE.Mesh(
    own(new THREE.TorusGeometry(0.72, 0.05, 8, 36)),
    own(new THREE.MeshStandardMaterial({ color: 0xffd45a, emissive: 0xffd45a, emissiveIntensity: 0.35, roughness: 0.6 })),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  ring.visible = false;
  parent.add(ring);
  const ringGoal = { x: 0, z: 0 };

  const confettiGeo = own(new THREE.PlaneGeometry(0.09, 0.14));
  const confetti = [];
  const dropConfetti = (m) => { parent.remove(m); m.material.dispose(); };

  const spotOf = (id) => AUCTION_SPOTS[id];

  const updateRing = (dt) => {
    if (!ring.visible) return;
    const k = Math.min(1, dt * 10);
    ring.position.x += (ringGoal.x - ring.position.x) * k;
    ring.position.z += (ringGoal.z - ring.position.z) * k;
    ring.rotation.z += dt * 0.8;
  };

  const updateConfetti = (dt) => {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const m = confetti[i];
      const u = m.userData;
      u.v.y -= 6.5 * dt;
      u.v.multiplyScalar(0.985);
      m.position.addScaledVector(u.v, dt);
      m.rotation.x += u.w.x * dt;
      m.rotation.y += u.w.y * dt;
      u.life -= dt;
      m.material.opacity = Math.min(1, u.life * 2);
      if (u.life <= 0 || m.position.y < 0.02) {
        dropConfetti(m);
        confetti.splice(i, 1);
      }
    }
  };

  const approach = (cur, want, dt) => cur + (want - cur) * (1 - Math.exp(-dt * 14));

  const detachPlayer = () => {
    if (me.arms) me.arms.R.pivot.rotation.x = 0;
    if (me.paddle) {
      if (me.paddle.parent) me.paddle.parent.remove(me.paddle);
      const seen = new Set();
      freeTree(me.paddle, seen);
      seen.forEach((r) => owned.delete(r));
    }
    me.paddle = null;
    me.arms = null;
  };

  const attachPlayer = (arms) => {
    if (me.arms) detachPlayer();
    me.arms = arms;
    me.paddle = buildPaddle(BEAR_RIM, 0.95);
    me.paddle.rotation.x = Math.PI;
    arms.R.hand.add(me.paddle);
  };

  const dispose = () => {
    detachPlayer();
    const seen = new Set();
    actors.forEach((a) => { parent.remove(a.root); freeTree(a.root, seen); });
    actors.clear();
    parent.remove(ring);
    confetti.forEach(dropConfetti);
    confetti.length = 0;
    owned.forEach((r) => { if (!seen.has(r)) { seen.add(r); r.dispose(); } });
    owned.clear();
  };

  return {
    raise(id, until) {
      if (id === 'me') me.raiseUntil = until;
      else if (actors.get(id)) actors.get(id).raiseUntil = until;
    },
    hop(id, twice) {
      const a = actors.get(id);
      if (!a) return;
      a.hopT = 0;
      a.hop2 = Boolean(twice);
    },
    lead(id) {
      if (id === null || id === undefined || !AUCTION_SPOTS[id]) {
        ring.visible = false;
        return;
      }
      const [x, z] = AUCTION_SPOTS[id];
      if (!ring.visible) { ring.position.x = x; ring.position.z = z; }
      ringGoal.x = x;
      ringGoal.z = z;
      ring.visible = true;
    },
    burst(id) {
      const spot = AUCTION_SPOTS[id];
      if (!spot) return;
      const base = id === 'merchant' ? STAGE_TOP : 0;
      for (let i = 0; i < 46; i++) {
        const m = new THREE.Mesh(
          confettiGeo,
          new THREE.MeshBasicMaterial({ color: CONFETTI_COLORS[i % CONFETTI_COLORS.length], side: THREE.DoubleSide, transparent: true }),
        );
        m.position.set(spot[0], base + 1.2, spot[1]);
        m.userData = {
          v: new THREE.Vector3((Math.random() - 0.5) * 3.2, 2.4 + Math.random() * 2.4, (Math.random() - 0.5) * 3.2),
          w: new THREE.Vector3(Math.random() * 9, Math.random() * 9, 0),
          life: 1.8,
        };
        parent.add(m);
        confetti.push(m);
      }
    },
    update(dt, now, t) {
      actors.forEach((a) => {
        a.hopT += dt;
        const h = hopHeight(a.hopT);
        if (a.hopT >= HOP_LEN && a.hop2) { a.hop2 = false; a.hopT = 0; }
        a.lift.position.y = h;
        a.lift.scale.y = 1 + Math.sin(t * 2.2 + a.phase) * 0.012;
        if (!a.paddle) return;
        a.raise = approach(a.raise, now < a.raiseUntil ? 1 : 0, dt);
        const pose = paddlePose(a.raise, a.side, a.scale);
        a.paddle.position.set(pose.x, pose.y, pose.z);
        a.paddle.rotation.set(pose.rx, 0, pose.rz);
      });
      me.raise = approach(me.raise, now < me.raiseUntil ? 1 : 0, dt);
      if (me.arms) me.arms.R.pivot.rotation.x = -0.9 - 2.0 * me.raise;
      updateRing(dt);
      updateConfetti(dt);
    },
    attachPlayer,
    detachPlayer,
    spotOf,
    dispose,
  };
}
