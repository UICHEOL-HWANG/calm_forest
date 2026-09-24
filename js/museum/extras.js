// =============================================================
//  🏛️ 박물관 1층 — ✨조건부 전시 3칸 + 🌊 나의 최대어 기록판 (2026-09-24)
//  ------------------------------------------------------------
//  규칙(무엇이 열렸나·최고 무게)은 js/museum.js, 여기는 **그리기만** 한다.
//  game.js 의 조형 헬퍼(clayMat·전시물 메시·충돌체·번역)는 kit 으로 받는다 —
//  이 파일이 game.js 를 import 하면 순환이 된다.
//
//  배치: 2026-09-24 시안 3종(중앙 섬·입구 양옆·중앙 일렬)을 실제 화면으로 비교해 **중앙 섬** 확정.
//  ⚠️ 카메라는 남쪽에서 41° 로 내려다본다 → 판은 +Z(카메라 쪽)를 향하게, 높이는 벽 진열장을 가리지 않게.
//  ⚠️ 캔버스 글자에는 이모지를 넣지 않는다(기기마다 폭이 달라 삐져나간다 — makeSignBoard 와 같은 규칙).
// =============================================================
import * as THREE from 'three';
import { SPECIAL_EXHIBITS } from '../museum.js';

// 방 로컬 좌표. 방은 x ±7.5 · z ±6.5, 입구는 남쪽(z +6.5) 가운데 폭 2.8, 계단은 북동·북서 구석.
//   특별 진열대 셋은 삼각형(들어오자마자 방 한가운데), 기록판은 그 뒤 가운데(벽 진열장보다 앞).
const LAYOUT = { specials: [[-1.9, 0.9], [0, -0.3], [1.9, 0.9]], board: [0, -2.7] };

// 날씨별 방석 색 — 블룸 임계(0.85)를 넘지 않게 채널을 0xd9 아래로
const CUSHION = { rain: 0x7fa6c8, snow: 0xd6dde6, fog: 0xb7aecf };

/**
 * @param {object} kit { clayMat, exhibitMesh(item), solidBox(x0,z0,x1,z1), t(text) }
 * @param {object} p   { origin:{x,z}, special, best, species:[{id,name}] }
 * @returns {{ group, spots:[{x,z,kind,id}], colliders:[] }}
 */
export function buildMuseumExtras(kit, { origin, special = {}, best = {}, species = [] }) {
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

  // 🌊 나의 최대어 — 나무 액자 기록판(두 다리). 판은 카메라 쪽(+Z)을 본다
  const [bx, bz] = L.board;
  const board = recordBoard(kit, best, species);
  board.position.set(bx, 1.25, bz); g.add(board);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.1), kit.clayMat(0x8a6a3a, false));
    leg.position.set(bx + s * 0.7, 0.5, bz - 0.02); leg.castShadow = true; g.add(leg);
  }
  spots.push({ x: bx, z: bz + 0.6, kind: 'record', id: 'sea' });
  colliders.push(kit.solidBox(origin.x + bx - 0.9, origin.z + bz - 0.25, origin.x + bx + 0.9, origin.z + bz + 0.25));
  return { group: g, spots, colliders };
}

// 캔버스 기록판 — 어종별 최고 무게. 없는 어종은 "—"
function recordBoard(kit, best, species) {
  const W = 512, H = 360;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#f1e2c2'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#8a6a3a'; c.fillRect(0, 0, W, 14); c.fillRect(0, H - 14, W, 14); c.fillRect(0, 0, 14, H); c.fillRect(W - 14, 0, 14, H);
  const font = (s, w = 'bold') => `${w} ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  c.textBaseline = 'middle';
  c.fillStyle = '#2e5a7d'; c.font = font(44); c.textAlign = 'center';
  c.fillText(kit.t('나의 최대어'), W / 2, 58);
  c.fillStyle = '#c9a227'; c.fillRect(70, 94, W - 140, 4);
  const rowH = (H - 130) / Math.max(1, species.length);
  species.forEach((sp, i) => {
    const y = 128 + rowH * (i + 0.5);
    c.textAlign = 'left'; c.fillStyle = '#4a3a24'; c.font = font(34, '600');
    c.fillText(kit.t(sp.name), 54, y);
    c.textAlign = 'right'; c.font = font(34);
    const w = best[sp.id];
    c.fillStyle = w ? '#2e5a7d' : '#b8a888';
    c.fillText(w ? `${w}kg` : '—', W - 54, y);
  });
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  const side = kit.clayMat(0x8a6a3a, false);
  // BoxGeometry 면 순서: [+X, -X, +Y, -Y, +Z(앞), -Z(뒤)] → 글자는 앞(+Z)만
  return new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6 * H / W, 0.08), [side, side, side, side, face, side]);
}
