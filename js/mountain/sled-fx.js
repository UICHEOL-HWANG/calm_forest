import * as THREE from 'three';
import { particles } from '../game.js';
import { _dropGeo, makeParticle, rndSpin } from '../spaces/fx.js';

export const SNOW_BURST = Object.freeze({ color: 0xf4f8fc, life: 0.7, gravity: -6, maxO: 0.85 });

export function spawnSnowBurst(x, y, z, count = 14) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(SNOW_BURST.color));
    const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 1.6;
    p.position.set(x + Math.cos(a) * 0.3, y + Math.random() * 0.4, z + Math.sin(a) * 0.3);
    p.scale.setScalar(1.6 + Math.random() * 1.6);
    p.userData = {
      vel: new THREE.Vector3(Math.cos(a) * sp, 1.6 + Math.random() * 1.6, Math.sin(a) * sp),
      spin: rndSpin(3), life: SNOW_BURST.life, gravity: SNOW_BURST.gravity, flutter: false, grow: 0.8, maxO: SNOW_BURST.maxO,
    };
    particles.push(p);
  }
}

export function spawnBoostTrail(x, y, z, count = 1) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(SNOW_BURST.color));
    p.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.15, z - 0.5);
    p.scale.setScalar(1.4 + Math.random() * 1.4);
    p.userData = {
      vel: new THREE.Vector3((Math.random() - 0.5) * 2.6, 1.4 + Math.random() * 1.4, -3.4 - Math.random() * 3.4),
      spin: rndSpin(3), life: SNOW_BURST.life, gravity: SNOW_BURST.gravity, flutter: false, grow: 0.8, maxO: SNOW_BURST.maxO,
    };
    particles.push(p);
  }
}
