export const ARRIVE_SEC = 1.6;
const SPARKS = 22;

export function arriveCurve(t) {
  const k = Math.min(1, Math.max(0, t / ARRIVE_SEC));
  return {
    pillarY: Math.min(1, t / 0.25),
    pillarA: 0.6 * (1 - k),
    ringS: 0.4 + 2.4 * Math.min(1, t / 1.2),
    ringA: 0.85 * (1 - Math.min(1, t / 1.2)),
    sparkA: k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85,
    done: t >= ARRIVE_SEC,
  };
}

export function createArriveFx(THREE) {
  const live = [];
  const additive = (color, extra = {}) => ({ color, transparent: true, depthWrite: false, fog: false, toneMapped: false, blending: THREE.AdditiveBlending, ...extra });

  function spawn(group, at) {
    const root = new THREE.Group();
    root.position.set(at.x, 0, at.z);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 3.2, 20, 1, true), new THREE.MeshBasicMaterial(additive(0xfff1b8, { side: THREE.DoubleSide })));
    pillar.position.y = 1.6;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1.0, 40), new THREE.MeshBasicMaterial(additive(0xffd36b, { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.2;
    const pos = new Float32Array(SPARKS * 3), vel = [];
    for (let i = 0; i < SPARKS; i++) {
      const a = (i / SPARKS) * Math.PI * 2, r = 0.25 + (i % 3) * 0.12;
      pos.set([Math.cos(a) * r, 0.4 + (i % 5) * 0.15, Math.sin(a) * r], i * 3);
      vel.push([Math.cos(a) * (0.6 + (i % 4) * 0.2), 1.6 + (i % 5) * 0.35, Math.sin(a) * (0.6 + (i % 4) * 0.2)]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const sparks = new THREE.Points(geo, new THREE.PointsMaterial(additive(0xffe08a, { size: 0.2 })));
    root.add(pillar, ring, sparks);
    group.add(root);
    const fx = { root, pillar, ring, sparks, vel, t: 0, group };
    live.push(fx);
    apply(fx);
    return fx;
  }

  function apply(fx) {
    const c = arriveCurve(fx.t);
    fx.pillar.scale.set(1, c.pillarY, 1);
    fx.pillar.material.opacity = c.pillarA;
    fx.ring.scale.setScalar(c.ringS);
    fx.ring.material.opacity = c.ringA;
    fx.sparks.material.opacity = Math.max(0, c.sparkA);
  }

  function dispose(fx) {
    fx.group.remove(fx.root);
    fx.root.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
  }

  function update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const fx = live[i];
      fx.t += dt;
      const p = fx.sparks.geometry.attributes.position;
      for (let k = 0; k < SPARKS; k++) {
        const v = fx.vel[k];
        p.array[k * 3] += v[0] * dt;
        p.array[k * 3 + 1] += v[1] * dt;
        p.array[k * 3 + 2] += v[2] * dt;
        v[1] -= 1.2 * dt;
      }
      p.needsUpdate = true;
      apply(fx);
      if (arriveCurve(fx.t).done) { dispose(fx); live.splice(i, 1); }
    }
  }

  function clear() { while (live.length) dispose(live.pop()); }

  return { spawn, update, clear, get count() { return live.length; } };
}
