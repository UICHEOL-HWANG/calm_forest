// =============================================================
//  🏛️ 박물관 1층 — ✨조건부 전시 3칸 (2026-09-24)
//  ------------------------------------------------------------
//  규칙(무엇이 열렸나)은 js/museum.js, 여기는 **그리기만** 한다.
//  game.js 의 조형 헬퍼(clayMat·전시물 메시·충돌체)는 kit 으로 받는다 —
//  이 파일이 game.js 를 import 하면 순환이 된다.
//
//  배치: 2026-09-24 시안 3종(중앙 섬·입구 양옆·중앙 일렬)을 실제 화면으로 비교해 **중앙 섬** 확정.
//  🌊 최대어 기록판도 같이 시안을 만들었다가 뺐다 — 게임 카메라 거리에선 판 글자가 안 읽히고(정보는 어차피
//     명판 줄이 전한다), 바다 어종은 도감에 없어 박물관(수집)과 결이 달랐다. 최고 무게는 세이브와 경신 토스트로만.
// =============================================================
import * as THREE from 'three';
import { SPECIAL_EXHIBITS } from '../museum.js';

// 방 로컬 좌표. 방은 x ±7.5 · z ±6.5, 입구는 남쪽(z +6.5) 가운데 폭 2.8, 계단은 북동·북서 구석.
//   벽 13칸이 작물·물고기·광물로 꽉 차 빈 곳은 가운데뿐 — 들어오자마자 보이는 삼각형으로 둔다.
const LAYOUT = { specials: [[-1.9, 0.9], [0, -0.3], [1.9, 0.9]] };

// 날씨별 방석 색 — 블룸 임계(0.85)를 넘지 않게 채널을 0xd9 아래로
const CUSHION = { rain: 0x7fa6c8, snow: 0xd6dde6, fog: 0xb7aecf };

/**
 * @param {object} kit { clayMat, exhibitMesh(item), solidBox(x0,z0,x1,z1) }
 * @param {object} p   { origin:{x,z}, special }
 * @returns {{ group, spots:[{x,z,kind,id}], colliders:[] }}
 */
export function buildMuseumExtras(kit, { origin, special = {} }) {
  const L = LAYOUT;
  const g = new THREE.Group();
  const spots = [], colliders = [];
  const stone = kit.clayMat(0xcfc7b0, false), trim = kit.clayMat(0xc9a227, false), cloth = kit.clayMat(0xe4dccb, false);
  const glass = new THREE.MeshStandardMaterial({ color: 0xbfe3ea, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide });

  SPECIAL_EXHIBITS.forEach((def, i) => {
    const [x, z] = L.specials[i];
    const got = special[def.id];
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 0.9, 8), stone);
    plinth.position.set(x, 0.45, z); plinth.castShadow = true; plinth.receiveShadow = true; g.add(plinth);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.07, 8), trim);   // 금테 — 벽 진열장과 구분되는 '특별' 표시
    ring.position.set(x, 0.92, z); g.add(ring);
    const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.1, 8), kit.clayMat(CUSHION[def.weather], false));
    cushion.position.set(x, 1.0, z); g.add(cushion);
    if (got) {
      const dome = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.8, 10, 1, true), glass);
      dome.position.set(x, 1.45, z); g.add(dome);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 10), trim);
      cap.position.set(x, 1.86, z); g.add(cap);
      const ex = kit.exhibitMesh({ cat: def.cat, id: got.id });
      ex.position.set(x, 1.3, z); ex.rotation.y = 0.5; ex.scale.setScalar(0.72); g.add(ex);
    } else {   // 🎀 아직 — 천을 덮어 둔다("곧 열릴 전시")
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.36, 8), cloth);
      c.position.set(x, 1.2, z); g.add(c);
    }
    spots.push({ x, z, kind: 'special', id: def.id });
    colliders.push(kit.solidBox(origin.x + x - 0.5, origin.z + z - 0.5, origin.x + x + 0.5, origin.z + z + 0.5));
  });

  return { group: g, spots, colliders };
}
