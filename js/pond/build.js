import * as THREE from 'three';
import { POND_R } from '../data/pond.js';
import { POND_SEA_SCALE } from './rules.js';

const FISH_SCALE = 0.62;
const BED = 0x3f7f96, ROCK_A = 0xb8b0a4, ROCK_B = 0xa39a8e, PAD = 0x5fbf7a, REED = 0x6aa84f, LOTUS = 0xf5a9c4;

function shoreGeometry({ mergeGeos, paintGeo }) {
  const parts = [paintGeo(new THREE.CylinderGeometry(POND_R - 0.1, POND_R - 0.1, 0.06, 20).translate(0, -0.18, 0), BED)];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const g = new THREE.DodecahedronGeometry(0.26 + (i % 3) * 0.05, 0).scale(1, 0.6, 1)
      .translate(Math.cos(a) * (POND_R + 0.1), 0.08, Math.sin(a) * (POND_R + 0.1));
    parts.push(paintGeo(g, i % 2 ? ROCK_A : ROCK_B));
  }
  for (const [x, z] of [[-0.8, -0.6], [0.9, 0.7], [0.2, -1.1]]) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 10, 1, false, 0.4, Math.PI * 1.75).translate(x, 0.07, z), PAD));
  }
  parts.push(paintGeo(new THREE.SphereGeometry(0.09, 6, 5).translate(0.9, 0.12, 0.7), LOTUS));
  for (const [x, z] of [[-1.8, 0.7], [-1.6, 1.0], [1.5, -1.4]]) {
    parts.push(paintGeo(new THREE.CylinderGeometry(0.03, 0.04, 0.9, 4).translate(x, 0.45, z), REED));
  }
  return mergeGeos(parts);
}

export function buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite }) {
  const group = new THREE.Group(); group.name = 'pond';
  const shore = new THREE.Mesh(shoreGeometry({ mergeGeos, paintGeo }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true }));
  shore.receiveShadow = true;
  const water = new THREE.Mesh(new THREE.CylinderGeometry(POND_R - 0.05, POND_R - 0.05, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: 0x4aa6d0, transparent: true, opacity: 0.3, roughness: 0.25, emissive: 0x184a63, emissiveIntensity: 0.35, depthWrite: false }));
  water.position.y = 0.04; water.renderOrder = 2;
  group.add(shore, water);

  let swimmers = [];
  const pops = [];
  let t = 0;

  const addFish = (mesh, i, scale) => {
    mesh.scale.setScalar(scale);
    mesh.traverse(o => { o.castShadow = false; });
    group.add(mesh);
    swimmers.push({ mesh, rx: 1.15 - (i % 4) * 0.12, rz: 0.9 - (i % 4) * 0.1, cx: ((i % 4) - 1.5) * 0.15,
      cz: i % 2 ? 0.2 : -0.2, speed: (i % 2 ? -1 : 1) * (0.35 + (i % 5) * 0.05), phase: i * 1.5 });
  };

  const clearFish = () => {
    for (const s of swimmers) { group.remove(s.mesh); s.mesh.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }
    swimmers = [];
  };

  return {
    group,
    setContents(view, seaColorOf) {
      clearFish();
      view.fish.forEach((id, i) => addFish(fishMesh(id), i, FISH_SCALE));
      if (view.sea) addFish(fishMesh('common', seaColorOf(view.sea.sp)), view.fish.length, FISH_SCALE * POND_SEA_SCALE);
    },
    pop(emoji) {
      const sp = emojiSprite(emoji, 0.7);
      sp.position.set(0, 1.2, 0); group.add(sp); pops.push({ sp, age: 0 });
    },
    update(dt) {
      t += dt;
      for (const f of swimmers) {
        const a = t * f.speed + f.phase;
        f.mesh.position.set(f.cx + Math.cos(a) * f.rx, -0.05 + Math.sin(a * 2) * 0.03, f.cz + Math.sin(a) * f.rz);
        f.mesh.rotation.y = -a - (Math.PI / 2) * Math.sign(f.speed);
      }
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
