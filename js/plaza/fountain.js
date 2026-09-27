// js/plaza/fountain.js
// =============================================================
//  ❄️ 겨울 시즌 분수 — 수확제(C안)에서 비워 둔 광장 앞 오른쪽(좌판이 빠지는 자리)에 선다.
//  🧪 시안 단계(2026-09-27): a 얼어붙은 원형 · b 2단+등불 · c 눈꽃 조각. localhost `window.__fountain('a'|'b'|'c')` 로만 띄운다.
//  build.js 처럼 색을 정점에 실어(paintGeo) 묶음마다 메시 1개 — solid / lamp ≤ 2~3콜.
//  ⚠️ shared() 자원 금지 — dispose() 가 전부 해제한다.
// =============================================================
import * as THREE from 'three';
import { mergeGeos, houseWindows, paintGeo, vtxMat, scene } from '../game.js';
import { PLAZA } from '../data/plaza.js';

// 광장 로컬 좌표 — 명판(-1.6, 3.1)과 짝을 이루는 앞쪽 오른편
export const FOUNTAIN_LOCAL = { x: 1.6, z: 2.8 };
const FOUNTAIN_SCALE = 1.3;                                        // 캐릭터와 키가 같으면 랜드마크로 약하다(B 캡처)

const PAL = {
  stone: 0xdcd5c3, stoneDark: 0xb3a994, snow: 0xf2f5f8, ice: 0xc4e6f2, iceDeep: 0x94cde3,
  woodDark: 0x5e3b22, lamp: 0xffd98a,
};

const cyl = (rt, rb, h, x, y, z, seg = 16) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);
const cone = (r, h, x, y, z, seg = 5) => new THREE.ConeGeometry(r, h, seg).rotateX(Math.PI).translate(x, y, z);   // 아래로 뾰족(고드름)
const rim = (r, y, t = 0.07) => new THREE.TorusGeometry(r, t, 6, 24).rotateX(Math.PI / 2).translate(0, y, 0);   // 수반 테두리 — 원판이면 얼음을 덮는다(B 캡처에서 확인)
const shard = (r, len, rotZ, rotY, y) => new THREE.OctahedronGeometry(r, 0).scale(1, len, 1).rotateZ(rotZ).rotateY(rotY).translate(0, y, 0);

// 수반 테두리 위 눈덩이 — 촘촘히 두르지 않고 몇 군데만(반복이 촘촘하면 거슬린다)
function snowOnRim(add, r, y, n, phase = 0.4) {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    add('snow', ball(0.16 + (i % 2) * 0.04, Math.cos(a) * r, y, Math.sin(a) * r, 0.45));
  }
}

function icicles(add, r, y, n, phase = 0.2) {
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * Math.PI * 2;
    add('ice', cone(0.045, 0.18 + (i % 3) * 0.06, Math.cos(a) * r, y, Math.sin(a) * r));
  }
}

function roundFrozen(add) {                          // a. 얼어붙은 원형 분수
  add('stone', cyl(1.0, 1.08, 0.36, 0, 0.18, 0, 20));
  add('stoneDark', rim(0.98, 0.37));
  add('ice', cyl(0.92, 0.92, 0.04, 0, 0.38, 0, 20));                // 언 수면(몸통 위로 살짝)
  add('stone', cyl(0.14, 0.2, 0.7, 0, 0.7, 0, 10));                 // 가운데 기둥
  add('stoneDark', cyl(0.42, 0.22, 0.16, 0, 1.1, 0, 12));           // 작은 물받이
  add('snow', ball(0.36, 0, 1.2, 0, 0.35));                        // 물받이에 쌓인 눈
  icicles(add, 0.4, 0.97, 7);
  snowOnRim(add, 0.98, 0.44, 4);
}

function twoTierLanterns(add) {                      // b. 2단 분수 + 둘레 등불
  add('stone', cyl(1.0, 1.08, 0.32, 0, 0.16, 0, 20));
  add('stoneDark', rim(0.98, 0.33, 0.06));
  add('ice', cyl(0.92, 0.92, 0.04, 0, 0.34, 0, 20));
  add('stone', cyl(0.16, 0.22, 0.6, 0, 0.62, 0, 10));
  add('stone', cyl(0.56, 0.36, 0.18, 0, 0.98, 0, 16));              // 윗단 그릇
  add('ice', cyl(0.48, 0.48, 0.03, 0, 1.06, 0, 16));
  add('stone', cyl(0.07, 0.1, 0.36, 0, 1.24, 0, 8));
  add('snow', ball(0.14, 0, 1.46, 0, 0.8));                        // 꼭대기 눈 모자
  icicles(add, 0.54, 0.86, 8, 0.5);
  snowOnRim(add, 0.98, 0.38, 3, 1.1);
  for (let i = 0; i < 4; i++) {                                    // 둘레 등불 — 대각선 네 곳(정면을 비워 둔다)
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2, x = Math.cos(a) * 1.32, z = Math.sin(a) * 1.32;
    add('woodDark', box(0.07, 0.62, 0.07, x, 0.31, z));
    add('woodDark', box(0.2, 0.04, 0.2, x, 0.66, z));
    add('lamp', ball(0.1, x, 0.76, z, 1.1));
    add('snow', ball(0.1, x, 0.7, z, 0.4));
  }
}

function snowflakeSculpture(add) {                   // c. 육각 수반 + 눈꽃 얼음 조각
  add('stone', cyl(1.02, 1.1, 0.34, 0, 0.17, 0, 6));
  add('stoneDark', new THREE.TorusGeometry(1.0, 0.07, 4, 6).rotateX(Math.PI / 2).rotateY(Math.PI / 6).translate(0, 0.36, 0));
  add('ice', cyl(0.94, 0.94, 0.04, 0, 0.37, 0, 6));
  add('stone', cyl(0.24, 0.3, 0.3, 0, 0.5, 0, 6));                  // 받침
  for (let i = 0; i < 3; i++) add(i === 1 ? 'iceDeep' : 'ice', shard(0.13, 3.6, Math.PI / 2, (i / 3) * Math.PI, 1.05));   // 가로 세 갈래
  add('iceDeep', shard(0.14, 4.2, 0, 0, 1.05));                    // 세로 기둥
  add('ice', new THREE.OctahedronGeometry(0.2, 0).translate(0, 1.05, 0));   // 가운데 결정
  snowOnRim(add, 1.0, 0.43, 3, 0.9);
  add('snow', ball(0.3, -1.25, 0.1, 0.55, 0.45)); add('snow', ball(0.22, 1.2, 0.08, -0.7, 0.45));   // 발치 눈 더미
}

const VARIANTS = { a: roundFrozen, b: twoTierLanterns, c: snowflakeSculpture };
const BUCKET_OF = (k) => (k === 'lamp' ? 'lamp' : 'solid');

export function buildFountain(variant = 'a') {
  const group = new THREE.Group();
  group.name = 'plazaFountain';
  group.position.set(PLAZA.x + FOUNTAIN_LOCAL.x, 0, PLAZA.z + FOUNTAIN_LOCAL.z);
  group.scale.setScalar(FOUNTAIN_SCALE);
  const buckets = new Map();
  const add = (k, geo) => {
    const b = BUCKET_OF(k), g = paintGeo(geo, PAL[k]);
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  (VARIANTS[variant] || roundFrozen)(add);
  const mats = [];
  for (const [b, geos] of buckets) {
    const mat = b === 'lamp'
      ? new THREE.MeshStandardMaterial({ color: PAL.lamp, emissive: PAL.lamp, emissiveIntensity: 0, roughness: 0.6 })
      : vtxMat();
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'solid'; m.receiveShadow = true;
    group.add(m); mats.push(mat);
    if (b === 'lamp') houseWindows.push(mat);
  }
  return {
    group,
    dispose() {
      for (const m of group.children) m.geometry.dispose();
      for (const mat of mats) { const i = houseWindows.indexOf(mat); if (i >= 0) houseWindows.splice(i, 1); mat.dispose(); }
    },
  };
}

// 🧪 시안 미리보기(localhost 전용) — 게이트 통과 후 시즌 연결 때 삭제
if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  let cur = null;
  window.__fountain = (v = 'a') => {
    if (cur) { scene.remove(cur.group); cur.dispose(); }
    cur = buildFountain(v);
    scene.add(cur.group);
    return v;
  };
}
