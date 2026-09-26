// =============================================================
//  팝 애니메이션(밭/작물/집 부재 톡 튀어오름)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  clock, easeOutBack, floatTexts, particles, scene,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import * as THREE from 'three';

export function updateFloatTexts(dt) {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const s = floatTexts[i], u = s.userData;
    u.life -= dt; s.position.y += u.vy * dt; u.vy *= 0.95;
    s.material.opacity = Math.min(1, u.life * 1.6);
    if (u.life <= 0) { scene.remove(s); s.material.map.dispose(); s.material.dispose(); floatTexts.splice(i, 1); }
  }
}

export function updatePops(dt) {
  // scene 전체에서 pop(스케일) / rise(솟아오름) 표시 객체 처리
  scene.traverse(obj => {
    const u = obj.userData;
    if (!u) return;
    if (u.pop > 0) {
      u.pop = Math.max(0, u.pop - dt * 3);
      const p = 1 - u.pop;
      const s = p < 1 ? p + Math.sin(p * Math.PI) * 0.25 : 1; // 통통 튀는 오버슛
      obj.scale.set(s, s, s);
      if (u.pop === 0) obj.scale.set(1, 1, 1);
    }
    if (u.rise > 0) {
      u.rise = Math.max(0, u.rise - dt * 2.2);
      const e = easeOutBack(1 - u.rise);                     // 아래→위 오버슛
      obj.position.y = u.riseFrom + (u.riseTarget - u.riseFrom) * e;
      if (u.rise === 0) obj.position.y = u.riseTarget;
    }
    if (u.swim) {                                            // 어항 속 물고기: 좌우로 살랑살랑(큰 어항은 폭·높이·위상을 따로 준다)
      const t = clock.elapsedTime + (u.swimP || 0);
      obj.position.x = Math.sin(t * 1.6) * (u.swimW ?? 0.16);
      obj.rotation.y = Math.cos(t * 1.6) > 0 ? 0 : Math.PI;  // 방향 전환
      obj.position.y = (u.swimY ?? 0.4) + Math.sin(t * 2.3) * 0.03;
    }
    if (u.flicker) { obj.scale.y = 0.85 + Math.sin(clock.elapsedTime * 11 + obj.position.x) * 0.15; }   // 🔥 벽난로 불꽃
  });
}

export const _leafGeo = new THREE.PlaneGeometry(0.22, 0.22);

export const _chipGeo = new THREE.TetrahedronGeometry(0.12);

export const _dropGeo = new THREE.SphereGeometry(0.07, 6, 6);

export const _confGeo = new THREE.PlaneGeometry(0.16, 0.24);

export function makeParticle(geo, color, additive = false) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, side: THREE.DoubleSide, transparent: true,
    emissive: additive ? color : 0x000000, emissiveIntensity: additive ? 0.55 : 0, // 가산 합성이 겹치면 하얗게 타서 광도를 낮춤
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive,
  });
  const m = new THREE.Mesh(geo, mat); scene.add(m); return m;
}

export function rndSpin(m) { return new THREE.Vector3(Math.random() * m, Math.random() * m, Math.random() * m); }

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i], u = p.userData;
    u.life -= dt;
    u.vel.y += u.gravity * dt;
    if (u.flutter) u.vel.x += Math.sin(clock.elapsedTime * 8 + i) * dt * 1.5;
    p.position.addScaledVector(u.vel, dt);
    p.rotation.x += u.spin.x * dt; p.rotation.y += u.spin.y * dt; p.rotation.z += u.spin.z * dt;
    if (u.grow) p.scale.multiplyScalar(1 + u.grow * dt); // 먼지 퍼짐
    if (p.position.y < 0.05) { p.position.y = 0.05; u.vel.set(0, 0, 0); }
    p.material.opacity = Math.min(u.maxO || 1, u.life);   // maxO: 파티클별 농도 상한(반짝이 완화용)
    if (u.life <= 0) { scene.remove(p); p.material.dispose(); particles.splice(i, 1); }
  }
}
