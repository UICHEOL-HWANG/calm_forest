// js/plaza/decor.js
// =============================================================
//  🌾 수확제 광장 장식 4종 — 좌판(볏단·호박 더미)·완공 보상(호박 등불 🥈·수확제 허수아비 🥇).
//  game.js outdoorMesh() 첫 줄이 여기로 묻고, null 이면 기존 분기로 간다.
//  build.js 처럼 색을 정점에 실어(paintGeo) 묶음마다 메시 1개 — 모델당 ≤ 3콜:
//    body: 몸통(그림자) / fine: 끈·꼭지·얼굴 같은 작은 부속(그림자 끔 — 섀도맵 텍셀보다 작으면 지글거린다)
//    lamp: 밤에 켜지는 발광부(houseWindows — 고스트는 indoor.js buildDecorGhost 가 목록을 도로 잘라 낸다)
//  🎨 디자인 게이트 D(검수 대기): ?plazaDecor=a|b|c 로 시안 전환 — 확정 뒤 이 스위치를 지운다.
//  크기 기준: 기존 scarecrow 높이 ≈ 2.2·팔 폭 ≈ 1.3, postlamp 높이 ≈ 1.7
// =============================================================
import * as THREE from 'three';
import { houseWindows, mergeGeos, paintGeo, vtxMat } from '../game.js';

const VARIANT = (() => {
  const v = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('plazaDecor') : null;
  return v === 'b' || v === 'c' ? v : 'a';
})();

// build.js PAL 과 같은 계열(straw·pumpkin·wood·woodDark·leaf 는 같은 값) — 광장과 한 벌로 읽히게
const PAL = {
  straw: 0xe8bf4a, strawLight: 0xf2d27a, twine: 0xa8683c, pumpkin: 0xe8742a, pumpkinDeep: 0xd9642a,
  pumpkinPale: 0xf0dcb0, pumpkinGreen: 0x8fa552, stem: 0x6b7a35, leafGreen: 0x7fa04a,
  wood: 0xa8683c, woodDark: 0x5e3b22, leaf: 0xc8452e, check: 0xf2c14e, sack: 0xd8c29a,
  face: 0x4a2e1a, apple: 0xd8503a,
};
// 발광부 낮 색: 얼굴 구멍은 어두운 속(낮엔 새긴 얼굴로 읽힌다), 종이 초롱(c)은 호박 주황 — 밤엔 둘 다 emissive 로 빛난다
const LAMP = { face: 0x5a2e14, lantern: 0xe0702a, emissive: 0xffb45a };

const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
const cyl = (rt, rb, h, x, y, z, seg = 10) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);
const cone = (r, h, x, y, z, seg = 6) => new THREE.ConeGeometry(r, h, seg).translate(x, y, z);
const ball = (r, x, y, z, sy = 1) => new THREE.IcosahedronGeometry(r, 1).scale(1, sy, 1).translate(x, y, z);

// 🎃 골 진 호박 — 구의 가로 반지름을 8골로 오목하게(세로는 눌러 납작하게). 골이 있어야 토마토·버섯 갓과 갈린다
//   정면(+Z)에 마루가 오도록 골 위상을 맞춘다(얼굴 판이 마루에 붙는다). 중심이 원점, 높이 ±r·sy
function pumpkinGeo(r, sy = 0.78, depth = 0.1, ribs = 8) {
  const g = new THREE.SphereGeometry(r, ribs * 2, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const th = Math.atan2(z, x) - Math.PI / 2;
    const s = 1 - depth * (0.5 - 0.5 * Math.cos(ribs * th));
    p.setXYZ(i, x * s, y * sy, z * s);
  }
  g.computeVertexNormals();
  return g;
}
// 땅(또는 받침 y)에 앉힌 호박 + 꼭지
const pumpkin = (add, r, x, y, z, color = 'pumpkin', sy = 0.78, ry = 0) => {
  add('body', color, pumpkinGeo(r, sy).rotateY(ry).translate(x, y + r * sy, z));
  add('fine', 'stem', cyl(r * 0.1, r * 0.14, r * 0.35, x, y + r * sy * 2 + r * 0.1, z, 6));
};

// 납작한 판(얼굴 구멍·잎) — ShapeGeometry 는 +Z 를 본다
function flat(points) {
  const s = new THREE.Shape();
  points.forEach(([px, py], i) => (i ? s.lineTo(px, py) : s.moveTo(px, py)));
  return new THREE.ShapeGeometry(s);
}
// 호박 얼굴: 세모 눈 둘 + 톱니 없는 반달 입(톱니가 깊으면 표창처럼 읽힌다 — 아치 작업 교훈)
function jackFace(add, bucket, color, r, cx, cy, cz, k = 1) {
  const e = 0.2 * r * k, z = cz + r + 0.015;                       // 정면 마루에서 0.015 내민다(z-fighting 방지)
  for (const s of [-1, 1]) add(bucket, color, flat([[-e, -e * 0.6], [e, -e * 0.6], [0, e * 0.7]]).translate(cx + s * 0.34 * r, cy + 0.14 * r, z));
  const m = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI; m.push([Math.cos(a) * 0.46 * r * k, Math.sin(a) * 0.26 * r * k]); }
  add(bucket, color, flat(m).translate(cx, cy - 0.12 * r, z - 0.01));
}

// ---------- 🌾 볏단 ----------
const HAY = {
  // a: 네모 건초 뭉치 — 끈 두 줄. 광장 좌판 옆에 쌓아 두던 그 모양
  a(add) {
    add('body', 'straw', box(0.9, 0.46, 0.56, 0, 0.23, 0));
    add('body', 'strawLight', box(0.86, 0.06, 0.52, 0, 0.475, 0));  // 윗면 밝은 결(위에서 내려다보는 카메라용)
    for (const x of [-0.24, 0.24]) add('fine', 'twine', box(0.05, 0.5, 0.6, x, 0.245, 0));
  },
  // b: 둥근 볏짚 두루마리 — 단면이 카메라(+Z)를 본다. 나이테는 두 겹만(촘촘한 반복 금지)
  b(add) {
    add('body', 'straw', cyl(0.42, 0.42, 0.62, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(0, 0.42, 0));
    for (const zs of [1, -1]) {
      for (const [r1, r2] of [[0.26, 0.3], [0.1, 0.14]]) {
        add('fine', 'twine', new THREE.RingGeometry(r1, r2, 14).rotateY(zs > 0 ? 0 : Math.PI).translate(0, 0.42, zs * 0.326));
      }
    }
    add('fine', 'twine', cyl(0.435, 0.435, 0.05, 0, 0, 0, 14).rotateX(Math.PI / 2).translate(0, 0.42, 0));
  },
  // c: 세워 묶은 볏단 셋(볏가리) — 허리를 묶고 이삭 쪽이 벌어진다. 전통 논 풍경
  c(add) {
    const sheaf = (x, z, tz, tx) => {
      const place = (geo) => geo.rotateZ(tz).rotateX(tx).translate(x, 0, z);
      add('body', 'straw', place(new THREE.LatheGeometry([
        new THREE.Vector2(0.001, 0), new THREE.Vector2(0.17, 0), new THREE.Vector2(0.12, 0.34),
        new THREE.Vector2(0.2, 0.62), new THREE.Vector2(0.12, 0.84), new THREE.Vector2(0.001, 0.9),
      ], 8)));
      add('fine', 'twine', place(cyl(0.135, 0.135, 0.06, 0, 0.34, 0, 8)));
    };
    sheaf(-0.2, 0.05, 0.18, 0.05); sheaf(0.2, 0.05, -0.18, 0.05); sheaf(0, -0.2, 0, -0.18);
  },
};

// ---------- 🎃 호박 더미 ----------
const PILE = {
  // a: 크기·색이 다른 셋(주황 큰 것 + 짙은 주황 + 흰 호박) — 서로 기대 한 무더기
  a(add) {
    pumpkin(add, 0.36, -0.12, 0, -0.05);
    pumpkin(add, 0.24, 0.34, 0, 0.12, 'pumpkinDeep', 0.8, 0.3);
    pumpkin(add, 0.2, -0.28, 0, 0.36, 'pumpkinPale', 0.8, 0.6);
    add('fine', 'leafGreen', flat([[0, 0], [0.16, 0.06], [0.2, 0.16], [0.08, 0.14]]).rotateX(-Math.PI / 2).translate(0.05, 0.02, 0.36));
  },
  // b: 나무 상자에 담아 둔 호박 — 상자 앞에 하나 내려놓았다
  b(add) {
    add('body', 'wood', box(0.86, 0.36, 0.56, 0, 0.18, 0));
    add('body', 'woodDark', box(0.9, 0.06, 0.6, 0, 0.36, 0));             // 테두리
    add('fine', 'woodDark', box(0.88, 0.04, 0.02, 0, 0.18, 0.285));       // 앞 널 이음(0.005 내밀기)
    pumpkin(add, 0.24, -0.2, 0.3, 0);
    pumpkin(add, 0.22, 0.22, 0.3, 0.02, 'pumpkinDeep', 0.8, 0.5);
    pumpkin(add, 0.16, 0.02, 0.36, -0.14, 'pumpkinGreen', 0.8, 0.2);
    pumpkin(add, 0.22, 0.36, 0, 0.5, 'pumpkin', 0.78, 0.9);
  },
  // c: 네모 볏단 위에 호박 셋 — 볏단(좌판 다른 품목)과 한 벌로 읽힌다
  c(add) {
    add('body', 'straw', box(0.86, 0.34, 0.54, 0, 0.17, 0));
    for (const x of [-0.24, 0.24]) add('fine', 'twine', box(0.05, 0.38, 0.58, x, 0.18, 0));
    pumpkin(add, 0.26, -0.18, 0.34, 0);
    pumpkin(add, 0.2, 0.22, 0.34, 0.04, 'pumpkinPale', 0.8, 0.4);
    pumpkin(add, 0.24, 0.3, 0, 0.44, 'pumpkinDeep', 0.78, 0.9);
  },
};

// ---------- 🏮 호박 등불(🥈) — lamp 묶음만 밤에 빛난다 ----------
const LANTERN = {
  // a: 얼굴 새긴 호박 등(바닥) + 작은 흰 호박 — 얼굴이 밤에 빛난다
  a(add) {
    const r = 0.36;
    add('body', 'pumpkin', pumpkinGeo(r, 0.82).translate(0, r * 0.82, 0));
    add('fine', 'stem', cyl(0.035, 0.05, 0.14, 0, r * 1.64 + 0.04, 0, 6));
    jackFace(add, 'lamp', null, r, 0, r * 0.82, 0);
    pumpkin(add, 0.18, 0.42, 0, 0.18, 'pumpkinPale', 0.8, 0.5);
  },
  // b: 갈고리 기둥에 매단 호박 등 — 정원등 높이(≈1.75)
  b(add) {
    add('body', 'woodDark', box(0.1, 1.75, 0.1, 0, 0.875, 0));
    add('body', 'woodDark', box(0.5, 0.08, 0.08, 0.22, 1.7, 0));
    add('fine', 'woodDark', box(0.03, 0.16, 0.03, 0.42, 1.58, 0));
    const r = 0.22, cy = 1.5 - r * 0.82;
    add('body', 'pumpkin', pumpkinGeo(r, 0.82).translate(0.42, cy, 0));
    jackFace(add, 'lamp', null, r, 0.42, cy, 0);
    add('fine', 'woodDark', box(0.26, 0.05, 0.26, 0, 0.03, 0));          // 받침
  },
  // c: 호박 모양 종이 초롱 — 몸통 전체가 빛난다(낮엔 주황 호박, 밤엔 통째로 등). 짧은 말뚝 위
  c(add) {
    add('body', 'woodDark', box(0.09, 0.9, 0.09, 0, 0.45, 0));
    add('body', 'woodDark', box(0.34, 0.06, 0.34, 0, 0.92, 0));           // 받침판
    const r = 0.3, top = 0.95 + r * 1.6;
    add('lamp', null, pumpkinGeo(r, 0.8, 0.14).translate(0, 0.95 + r * 0.8, 0));
    add('fine', 'stem', cyl(0.03, 0.045, 0.12, 0, top + 0.05, 0, 6));
    add('fine', 'leafGreen', flat([[0, 0], [0.14, 0.05], [0.18, 0.14], [0.06, 0.12]]).rotateX(-0.5).translate(0.03, top + 0.02, 0));
  },
};

// ---------- 🧑‍🌾 수확제 허수아비(🥇) — 🧙 마법사 허수아비(파란 고깔·맨 널빤지)와 갈리게:
//   옷을 입히고(빨강·노랑 셔츠) 밀짚모자·어깨띠·바구니처럼 "잔치 복장" 을 형태로 준다
const SHOULDER = 1.38;                                                      // 셔츠 윗면
function scarecrowBody(add, shirt, trim) {
  add('body', 'wood', box(0.12, 0.9, 0.1, 0, 0.45, 0));                     // 기둥(셔츠 아래)
  add('body', shirt, box(0.44, 0.52, 0.26, 0, 1.12, 0));                    // 셔츠 몸통
  add('body', trim, box(0.46, 0.08, 0.28, 0, 0.88, 0));                     // 허리 끈(셔츠 아래 테)
  for (const s of [-1, 1]) {
    add('body', shirt, box(0.46, 0.17, 0.2, s * 0.44, 1.28, 0));           // 소매(팔 벌림)
    add('body', 'straw', new THREE.ConeGeometry(0.08, 0.2, 6).rotateZ(s * Math.PI / 2).translate(s * 0.76, 1.28, 0));   // 소매 끝 짚(바깥으로 벌어짐)
  }
  for (const x of [-0.12, 0.12]) add('fine', 'straw', new THREE.ConeGeometry(0.07, 0.18, 6).rotateX(Math.PI).translate(x, 0.79, 0.03));   // 밑단 짚
}
function strawHat(add, y, band) {
  add('body', 'straw', cyl(0.4, 0.42, 0.05, 0, y, 0, 14));                 // 챙(너무 넓으면 버섯 갓)
  add('body', 'straw', cyl(0.2, 0.24, 0.2, 0, y + 0.12, 0, 12));           // 모자 몸(챙과 턱이 있어야 모자로 읽힌다)
  add('fine', band, cyl(0.245, 0.245, 0.06, 0, y + 0.05, 0, 12));
}
function pumpkinHead(add, r) {
  const hy = SHOULDER + r * 0.85 - 0.02;
  add('body', 'pumpkin', pumpkinGeo(r, 0.85).translate(0, hy, 0));
  jackFace(add, 'fine', 'face', r, 0, hy, 0, 0.9);
  return hy + r * 0.85;                                                     // 머리 꼭대기
}
const SCARECROW = {
  // a: 호박 머리 + 밀짚모자(빨간 띠) + 빨강 셔츠·노랑 허리 끈
  a(add) {
    scarecrowBody(add, 'leaf', 'check');
    strawHat(add, pumpkinHead(add, 0.24) - 0.02, 'leaf');
  },
  // b: 삼베 머리 + 밀짚모자 + 노랑 어깨띠 + 한 팔에 과일 바구니
  b(add) {
    scarecrowBody(add, 'leaf', 'woodDark');
    add('body', 'sack', ball(0.21, 0, 1.58, 0, 1.08));
    for (const s of [-1, 1]) add('fine', 'face', box(0.05, 0.05, 0.02, s * 0.08, 1.61, 0.205));
    add('fine', 'face', box(0.1, 0.02, 0.02, 0, 1.51, 0.2));
    strawHat(add, 1.78, 'check');
    add('body', 'check', new THREE.BoxGeometry(0.1, 0.62, 0.03).rotateZ(0.62).translate(0, 1.12, 0.14));   // 어깨띠(셔츠 앞 0.01 밖)
    const bx = 0.56, by = 1.0;                                              // 바구니 — 오른 소매 아래에 걸었다
    add('body', 'wood', cyl(0.19, 0.14, 0.2, bx, by, 0.02, 10));
    add('fine', 'woodDark', new THREE.TorusGeometry(0.16, 0.02, 4, 10, Math.PI).translate(bx, by + 0.1, 0.02));
    add('fine', 'apple', ball(0.08, bx - 0.07, by + 0.13, 0.05));
    add('fine', 'apple', ball(0.07, bx + 0.07, by + 0.12, -0.03));
    add('fine', 'pumpkin', ball(0.07, bx + 0.02, by + 0.15, 0.09, 0.8));
  },
  // c: 호박 머리 + 단풍 화관 + 주황 조끼 + 양손에 볏단
  c(add) {
    scarecrowBody(add, 'check', 'leaf');
    add('body', 'pumpkinDeep', box(0.46, 0.4, 0.2, 0, 1.16, 0.04));        // 조끼(셔츠 앞으로 0.01)
    const top = pumpkinHead(add, 0.25);
    add('fine', 'stem', cyl(0.03, 0.04, 0.1, 0, top + 0.04, 0, 6));
    // 단풍 화관 — 초록 고리 + 앞쪽에만 빨강·주황 열매 셋(한 바퀴 두르면 호박에 돋은 혹처럼 읽혔다 — D1 캡처)
    add('body', 'leafGreen', new THREE.TorusGeometry(0.2, 0.045, 5, 12).rotateX(Math.PI / 2).translate(0, top - 0.05, 0));
    for (const [a, k] of [[1.1, 'leaf'], [Math.PI / 2, 'pumpkinDeep'], [2.04, 'leaf']]) {
      add('body', k, ball(0.07, Math.cos(a) * 0.21, top - 0.02, Math.sin(a) * 0.21));
    }
    for (const s of [-1, 1]) {                                              // 양손 볏단(세로로 쥐었다)
      const tilt = (g) => g.rotateZ(-s * 0.35).translate(s * 0.8, 1.28, 0.02);   // 바깥으로 기울여 쥐었다(곧추세우면 횃불로 읽힌다)
      add('body', 'straw', tilt(cyl(0.07, 0.05, 0.42, 0, 0.07, 0, 8)));
      add('body', 'strawLight', tilt(cone(0.1, 0.18, 0, 0.36, 0, 7)));
      add('fine', 'twine', tilt(cyl(0.075, 0.075, 0.04, 0, 0, 0, 8)));
    }
  },
};

const MODELS = { haybale: HAY, pumpkins: PILE, pumpkinlamp: LANTERN, harvestscarecrow: SCARECROW };

function assemble(build, lampColor = LAMP.face) {
  const buckets = new Map();
  const add = (b, key, geo) => {
    const g = b === 'lamp' ? geo : paintGeo(geo, PAL[key]);                 // 발광부는 한 색 재질이라 정점색 없음
    const a = buckets.get(b); a ? a.push(g) : buckets.set(b, [g]);
  };
  build(add);
  const group = new THREE.Group();
  for (const [b, geos] of buckets) {
    let mat;
    if (b === 'lamp') {
      mat = new THREE.MeshStandardMaterial({ color: lampColor, emissive: LAMP.emissive, emissiveIntensity: 0, roughness: 0.9, flatShading: true, side: THREE.DoubleSide });
      houseWindows.push(mat);                                               // 밤에 창문·가로등과 함께 점등
    } else {
      mat = vtxMat();
      if (b === 'fine') mat.side = THREE.DoubleSide;                        // 얼굴·잎 판은 한 장
    }
    const merged = mergeGeos(geos);
    for (const g of geos) g.dispose();
    const m = new THREE.Mesh(merged, mat);
    m.castShadow = b === 'body'; m.receiveShadow = b !== 'lamp';
    group.add(m);
  }
  return group;
}

// id 가 광장 장식이 아니면 null — outdoorMesh 가 기존 분기로 넘어간다
export function plazaDecorMesh(id) {
  const set = MODELS[id];
  if (!set) return null;
  return assemble(set[VARIANT], id === 'pumpkinlamp' && VARIANT === 'c' ? LAMP.lantern : LAMP.face);
}
