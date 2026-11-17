import * as THREE from 'three';
import { POND_R } from '../data/pond.js';
import { POND_SEA_SCALE } from './rules.js';
import { pondLayout, rimPieces, swimLane, keepOff } from './shape.js';

const FISH_SCALE = 0.62;
const BED = 0x3f7f96, ROCK_A = 0xb8b0a4, ROCK_B = 0xa39a8e, PAD = 0x5fbf7a, REED = 0x6aa84f, LOTUS = 0xf5a9c4;
const ISLE_TOP = 0x8fbf5a, ISLE_TREE = 0x4f9a5a, STEP = 0xd9cfc0;
const GROW_FROM = 0.6;

const RIM_GEO = {
  pebble: p => new THREE.IcosahedronGeometry(p.size, 1).scale(1, 0.6, 1),
  brick: p => new THREE.BoxGeometry(p.len, 0.2, 0.3),
  sand: p => new THREE.RingGeometry(p.inner, p.outer, 28).rotateX(-Math.PI / 2),
  chip: p => new THREE.IcosahedronGeometry(p.size, 0).scale(1, 0.6, 1),
  clam: p => new THREE.SphereGeometry(p.size, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.55, 0.8),
  coral: p => new THREE.CylinderGeometry(0.045, 0.07, p.h, 5).rotateZ(p.lean),
  conch: () => new THREE.ConeGeometry(0.13, 0.34, 6).rotateZ(Math.PI / 2),
};

function shoreGeometry({ mergeGeos, paintGeo }, r, layout, rim) {
  const parts = [paintGeo(new THREE.CylinderGeometry(r - 0.1, r - 0.1, 0.06, 20).translate(0, -0.18, 0), BED)];
  for (const s of rimPieces(r, rim)) {
    if (s.shape) { parts.push(paintGeo(RIM_GEO[s.shape](s).rotateY(s.ry).translate(s.x, s.y, s.z), s.color)); continue; }
    const g = new THREE.DodecahedronGeometry(s.size, 0).scale(1, 0.6, 1).translate(s.x, 0.08, s.z);
    parts.push(paintGeo(g, s.alt ? ROCK_A : ROCK_B));
  }
  for (const [x, z] of layout.pads) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10, 1, false, 0.4, Math.PI * 1.75).translate(x, 0.07, z), PAD));
  }
  parts.push(paintGeo(new THREE.SphereGeometry(0.09, 6, 5).translate(layout.lotus[0], 0.12, layout.lotus[1]), LOTUS));
  for (const [x, z] of layout.reeds) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 4).translate(x, 0.45, z), REED));
  }
  if (layout.isle) {
    const { x, z } = layout.isle;
    parts.push(paintGeo(new THREE.CylinderGeometry(0.8, 1.0, 0.3, 12).translate(x, 0.05, z), ISLE_TOP));
    parts.push(paintGeo(new THREE.ConeGeometry(0.45, 1.2, 7).translate(x, 0.85, z), ISLE_TREE));
  }
  for (const [x, z] of layout.stones) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.26, 0.28, 0.12, 8).translate(x, 0.08, z), STEP));
  }
  return mergeGeos(parts);
}

export function buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite, r = POND_R, stage = 1, rim = 'rock' }) {
  const layout = pondLayout(r, stage);
  const k = layout.k;
  const group = new THREE.Group(); group.name = 'pond';
  const shore = new THREE.Mesh(shoreGeometry({ mergeGeos, paintGeo }, r, layout, rim),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  shore.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.05, r - 0.05, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: 0x4aa6d0, transparent: true, opacity: 0.3, roughness: 0.25, emissive: 0x184a63, emissiveIntensity: 0.35, depthWrite: false }));
  water.position.y = 0.04; water.renderOrder = 2;
  group.add(shore, water);

  let swimmers = [];
  const pops = [];
  let t = 0;
  let gatherT = 0;
  let growLeft = 0, growSec = 1;

  const addFish = (mesh, i, scale) => {
    mesh.scale.setScalar(scale);
    mesh.traverse(o => { o.castShadow = false; });
    group.add(mesh);
    swimmers.push({ mesh, ...swimLane(i, k) });
  };

  const clearFish = () => {
    for (const s of swimmers) { group.remove(s.mesh); s.mesh.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }
    swimmers = [];
  };

  return {
    group,
    setContents(view, seaColorOf, limits) {
      clearFish();
      const river = Array.from({ length: Math.max(1, limits?.riverDup ?? 1) }, () => view.fish).flat();
      const seas = view.seas ?? (view.sea ? [view.sea] : []);
      river.forEach((id, i) => addFish(fishMesh(id), i, FISH_SCALE));
      seas.forEach((s, j) => addFish(fishMesh('common', seaColorOf(s.sp)), river.length + j, FISH_SCALE * POND_SEA_SCALE));
    },
    setRim(next) {
      shore.geometry.dispose();
      shore.geometry = shoreGeometry({ mergeGeos, paintGeo }, r, layout, next);
    },
    pop(emoji) {
      const sp = emojiSprite(emoji, 0.7);
      sp.position.set(0, 1.2, 0); group.add(sp); pops.push({ sp, age: 0 });
    },
    gather(sec) {
      gatherT = Math.max(gatherT, sec);
    },
    grow(sec) {
      growSec = sec; growLeft = sec;
      group.scale.setScalar(GROW_FROM);
    },
    growing: () => growLeft > 0,
    update(dt) {
      t += dt;
      if (growLeft > 0) {
        growLeft = Math.max(0, growLeft - dt);
        const p = 1 - growLeft / growSec;
        group.scale.setScalar(GROW_FROM + (1 - GROW_FROM) * p * (2 - p));
      }
      const g = Math.min(1, gatherT / 0.6);
      gatherT = Math.max(0, gatherT - dt);
      swimmers.forEach((f, i) => {
        const a = t * f.speed + f.phase;
        const sx = f.cx + Math.cos(a) * f.rx, sz = f.cz + Math.sin(a) * f.rz;
        const gx = Math.cos(i * 2.1) * 0.35 * k, gz = layout.gatherZ + Math.sin(i * 2.1) * 0.2 * k;
        const [x, z] = keepOff(sx + (gx - sx) * g, sz + (gz - sz) * g, layout.isle);
        f.mesh.position.set(x, -0.05 + Math.sin(a * 2) * 0.03 + g * 0.06, z);
        f.mesh.rotation.y = -a - (Math.PI / 2) * Math.sign(f.speed);
      });
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i]; p.age += dt;
        p.sp.position.y = 1.2 + p.age * 0.6; p.sp.material.opacity = Math.max(0, 1 - p.age / 1.6);
        if (p.age > 1.6) { group.remove(p.sp); p.sp.material.dispose(); pops.splice(i, 1); }
      }
    },
    dispose() {
      clearFish();
      for (const p of pops) { group.remove(p.sp); p.sp.material.dispose(); }
      shore.geometry.dispose(); shore.material.dispose(); water.geometry.dispose(); water.material.dispose();
    },
  };
}
