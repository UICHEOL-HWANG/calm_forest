// =============================================================
//  NPC (마을 주민 다중) + 퀘스트 체인
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, IS_MOBILE, churnTrigger, clayMat, clock, currentQuest, dateHash, dexDiscover, dist2D, farmActionFirst,
  gameState, lerpAngle, makeNameTag, mode, nearNPC, npcDialogState, npcObjs, obstacles, onPlotArea, player,
  questCtx, questEvent, refreshInventoryUI, roundRect, scene, solidCircle, spawnFloatText, syncBadges, todayStr,
  ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { NPC_R, PLAYER_R } from '../data/character.js';
import { DAILY_COUNT, NPCS, QUEST_HOW } from '../data/npcs.js';
import { SHOP } from '../data/places.js';
import { welcomeOffer } from '../first-loop.js';
import { logEcon } from '../metrics.js';
import { activeQuestList, pickGated, questIdFor } from '../quests.js';
import { Sound } from '../sound.js';
import { inVillage2 } from '../spaces/doors.js';
import * as THREE from 'three';

// id별 퀘스트 진행 상태(없으면 생성)
export function npcState(id) {
  // ⚠️ allDone 은 더 이상 읽지 않는다(세이브 포맷 호환용으로만 계속 쓴다).
  //    "지금 내줄 의뢰가 있는가" 는 currentQuest(), "체인을 끝냈는가" 는 idx >= quests.length 로 본다.
  //    🔁반복 의뢰가 열리면 allDone 은 false 로 돌아가므로, 이 값으로 분기하면 바로 버그다.
  if (!gameState.npcs[id]) gameState.npcs[id] = { idx: 0, progress: 0, given: false, allDone: false };
  return gameState.npcs[id];
}

// 🏷️ 주민 이름표 — 몸 색과 같은 배지라 "이 색 = 이 사람" 이 한 번에 붙는다.
export const NAMETAG_NEAR = 11;

export const NAMETAG_FAR = 18;

// 이름표 색 — 이 게임의 캔버스 UI 규칙을 그대로 따른다(상점 말풍선·집 간판과 같은 규칙):
//   UnrealBloomPass 임계값 0.85 를 넘는 색은 후광이 번져 글자를 삼킨다.
//   그래서 **밝은 바탕(휘도 0.62~0.78) + 같은 색의 진한 글자·테두리** 로 간다.
//   흰 글자·흰 테두리(휘도 1.0)는 바탕이 어두워도 그 자체가 블룸에 걸려 번진다 — 쓰지 말 것.
export const BADGE_LUM_MIN = 0.62, BADGE_LUM_MAX = 0.78;

export function shadeToLum(hex, want) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const k = lum > 1e-3 ? want / lum : 1;
  const cl = (v) => Math.round(Math.min(255, Math.max(0, v * k)));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}

export function badgeColor(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  return shadeToLum(hex, Math.min(BADGE_LUM_MAX, Math.max(BADGE_LUM_MIN, lum)));
}

// 주민 실루엣 — 색만 다른 같은 블롭이라 "누가 누군지 모르겠다"(베타)는 피드백을 받아,
//   def.look 별로 모자·소품을 다르게 얹는다. 몸/머리 좌표는 공용과 같아
//   bob·말풍선·이름표·충돌 반경이 그대로 맞는다(여기서 바꾸는 건 장식뿐).
export function buildNPCLook(g, def) {
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  // 몸통(body)은 숨쉬느라 y 가 ±0.04 흔들린다. 몸통 표면에 얹히는 장식을 고정해 두면
  //   몸통이 장식을 뚫었다 말았다 하며 깜빡인다(보고: "올빼미 앞 털이 튀어나왔다 보였다 함").
  //   여기 담아 반환하면 buildNPCs 가 o.bobParts 로 들고, updateNPC 가 같은 폭으로 함께 움직인다.
  const bob = [];
  const bobbing = (m) => { m.userData.y0 = m.position.y; bob.push(m); return m; };
  if (def.look === 'peddler') {
    // 🧙 방랑 상인 = 보따리 장수 — 삿갓 · 등의 큰 봇짐 · 지팡이 · 수염
    add(new THREE.Mesh(new THREE.ConeGeometry(0.66, 0.34, 14), clayMat(0xd9b46a)), 0, 1.52, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), clayMat(0xb8923f)), 0, 1.7, 0);
    const sash = bobbing(add(new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.06, 8, 18), clayMat(def.hat, false)), 0, 0.48, 0));  // 허리띠
    sash.rotation.x = Math.PI / 2;
    const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 18), clayMat(def.color, false)), 0, 1.5, 0);   // 삿갓 띠 — 위에서도 고유색이 보이게
    band.rotation.x = Math.PI / 2;
    const pack = bobbing(add(new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 10), clayMat(def.color, false)), 0, 0.95, -0.46)); // 보라 봇짐
    pack.scale.set(1, 0.85, 0.8); pack.castShadow = true;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.14), clayMat(0xc9b070, false)), 0, 1.28, -0.34);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.55, 6), clayMat(0x6b4a34)), 0.5, 0.78, 0.12).rotation.z = -0.12; // 지팡이
    const beard = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), clayMat(0xdcd3c8, false)), 0, 0.98, 0.26);
    beard.scale.set(1, 0.7, 0.6);
    return { bob };
  } else if (def.look === 'curator') {
    // 🧑‍🦳 박물관 큐레이터 — 흰머리 · 체인 달린 둥근 금테 안경 · 정장(조끼·나비넥타이).
    //   마을 주민은 전부 밀짚모자·안전모·앞치마 계열이라, 차려입은 사람 하나면 멀리서도 구분된다.
    const GOLD = 0xc9a227, WHITE = 0xeae6de;   // ⚠️ 금은 색으로만(블룸 임계 0.85 — 🪓도구 등급과 같은 규칙)
    // 흰머리 — 뒤로 넘긴 볼륨 + 옆머리
    const hair = add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), clayMat(WHITE, false)), 0, 1.3, -0.03);
    hair.scale.set(1.04, 0.78, 1.0); hair.castShadow = true;
    [-0.34, 0.34].forEach(ex => add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), clayMat(WHITE, false)), ex, 1.12, 0.02).scale.set(0.7, 1.1, 0.9));
    // 둥근 금테 안경 — 렌즈 두 개 + 브리지 + 귀 다리
    [-0.17, 0.17].forEach(ex => {
      const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.022, 7, 16), clayMat(GOLD, false)), ex, 1.13, 0.3);
      r.rotation.x = 0.06;
    });
    add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.022), clayMat(GOLD, false)), 0, 1.15, 0.31);
    [-0.3, 0.3].forEach(ex => add(new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.2), clayMat(GOLD, false)), ex, 1.14, 0.2));
    // 안경 체인 — 귀 옆에서 턱 아래로 늘어진다(참고 이미지). 짧은 마디를 호를 그리며 잇는다
    [-1, 1].forEach(sx => {
      for (let i = 0; i < 6; i++) {
        const t = i / 5, ang = Math.PI * (0.12 + t * 0.5);
        const bead = add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), clayMat(GOLD, false)),
          sx * (0.3 - Math.sin(ang) * 0.07), 1.12 - t * 0.3, 0.2 - t * 0.06);
        bead.castShadow = false;
      }
    });
    // 정장 — 조끼(몸통 앞판) + 나비넥타이 + 회중시계 줄
    const vest = bobbing(add(new THREE.Mesh(new THREE.SphereGeometry(0.47, 14, 10), clayMat(def.color, false)), 0, 0.62, 0.06));
    vest.scale.set(0.92, 1.0, 0.78);
    const collar = bobbing(add(new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 8, 16), clayMat(0xf4f1ea, false)), 0, 0.9, 0.12));
    collar.rotation.x = Math.PI / 2 - 0.25;
    [-1, 1].forEach(sx => {
      const w = bobbing(add(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 6), clayMat(def.hat, false)), sx * 0.09, 0.84, 0.3));
      w.rotation.z = sx * Math.PI / 2;
    });
    bobbing(add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), clayMat(def.hat, false)), 0, 0.84, 0.32));
    return { bob };
  } else if (def.look === 'farmer') {
    // 🧑‍🌾 넓은 밀짚모자(공용 챙보다 크고 얇다) + 정수리 매듭 + 입에 문 풀잎
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.05, 16), clayMat(def.hat)), 0, 1.42, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), clayMat(def.hat)), 0, 1.45, 0).scale.set(1, 0.62, 1);
    add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 6, 14), clayMat(0x8e6b3a, false)), 0, 1.46, 0).rotation.x = Math.PI / 2; // 밀짚 끈
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 5), clayMat(0x86c05f)), 0.09, 1.03, 0.3).rotation.set(0.5, 0, -0.45); // 물고 있는 풀잎
  } else if (def.look === 'builder') {
    // 👷 노란 안전모(반구 + 앞챙) + 어깨에 멘 각목
    add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), clayMat(def.hat, false)), 0, 1.32, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.22), clayMat(def.hat, false)), 0, 1.34, 0.34);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.5), clayMat(0xd9a520, false)), 0, 1.55, 0);   // 안전모 능선
    const plank = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 1.5), clayMat(0xc79a63, false)), -0.34, 1.02, -0.05); // 각목
    plank.rotation.set(0, 0.35, 0.22); plank.castShadow = true;
  } else if (def.look === 'angler') {
    // 🎣 버킷햇(챙이 아래로) + 등 뒤로 넘긴 낚싯대 + 흰 수염
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.1, 14), clayMat(def.hat, false)), 0, 1.38, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.26, 14), clayMat(def.hat, false)), 0, 1.53, 0);
    const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.035, 1.8, 6), clayMat(0x7a5334)), 0.46, 1.0, -0.2); // 낚싯대
    rod.rotation.set(0.42, 0, -0.3);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), clayMat(0xff8f6b, false)), 0.92, 1.72, -0.55);   // 찌
    const beard = add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), clayMat(0xf2f0ea, false)), 0, 0.99, 0.24);
    beard.scale.set(1, 0.75, 0.6);
  } else if (def.look === 'chef') {
    // 🐼 판다 — 검은 귀 · 검은 눈 패치 · 흰 요리사 토크
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 14), clayMat(def.hat, false)), 0, 1.5, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), clayMat(def.hat, false)), 0, 1.72, 0).scale.set(1.05, 0.8, 1.05); // 부푼 윗부분
    [-0.3, 0.3].forEach(ex => add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), clayMat(0x2f2b28, false)), ex, 1.36, -0.02));  // 귀
    [-0.13, 0.13].forEach(ex => {
      const patch = add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), clayMat(0x2f2b28, false)), ex, 1.18, 0.26);   // 눈 패치
      patch.scale.set(1, 1.15, 0.55);
    });
  } else if (def.look === 'owl') {
    // 🦉 원숭이올빼미(barn owl) — 귀깃 없는 종. 머리는 def.skin 으로 이미 크림색이라
    //    얼굴판은 그 위에 "확실히 내민" 하트만 얹으면 된다(전엔 머리 구 안에 파묻혀 조각만 보였다).
    const CREAM = 0xfdfaf3, RIM = 0xc9973f, SPECK = 0x8a6a34;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.37, 14, 10), clayMat(def.color, false)), 0, 1.3, -0.08).scale.set(1.02, 0.8, 1);  // 황금 정수리(머리를 확실히 덮게 크게)
    const breast = bobbing(add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10), clayMat(CREAM, false)), 0, 0.62, 0.19));       // 흰 가슴
    breast.scale.set(0.9, 1.0, 0.66); breast.castShadow = true;
    // 하트형 얼굴판 — 위쪽 두 볼록 + 아래로 뾰족한 턱. 황금 테를 뒤에 한 겹 깔아 윤곽을 낸다.
    const heart = (r, ch, col, z, y2) => {
      [-0.145, 0.145].forEach(ex => add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), clayMat(col, false)), ex, 1.25, z).scale.set(1, 1.04, 0.66));
      const chin = add(new THREE.Mesh(new THREE.ConeGeometry(ch, 0.38, 14), clayMat(col, false)), 0, y2, z);
      chin.rotation.x = Math.PI; chin.scale.set(1, 1, 0.66);   // 원뿔을 뒤집어 아래로 뾰족하게
    };
    heart(0.215, 0.275, RIM, 0.30, 0.985);    // 황금 테(살짝 크게, 뒤)
    heart(0.185, 0.24, CREAM, 0.35, 1.0);     // 크림 얼굴판(앞)
    [-0.115, 0.115].forEach(ex => add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), clayMat(0x241f1c, false)), ex, 1.26, 0.47).scale.set(1, 1, 0.7)); // 큰 검은 눈
    add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.17, 7), clayMat(0xf0d9a8, false)), 0, 1.12, 0.5).rotation.x = 2.55;   // 아래로 향한 작은 부리
    const wings = [-1, 1].map(sx => {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.3, 0.88, -0.03); g.add(pivot);   // 어깨 축 — 여기서 회전해야 퍼덕여 보인다
      bobbing(pivot);
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 9), clayMat(def.color, false));
      wing.scale.set(0.26, 1.05, 0.66); wing.position.set(sx * 0.16, -0.2, 0); wing.castShadow = true;
      pivot.add(wing);
      [0.1, -0.1, -0.3].forEach((wy, i) => {   // 등의 얼룩(원숭이올빼미 특징)
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), clayMat(SPECK, false));
        sp.position.set(sx * 0.24, wy, 0.02 - i * 0.02); pivot.add(sp);
      });
      return pivot;
    });
    return { eyes: true, wings, bob };
  } else if (def.look === 'badger') {
    // 🦡 오소리 — 🐼요리사 판다와 헷갈리지 않는 게 제일 중요하다(둘 다 흑백 얼굴).
    //    판다는 "흰 얼굴에 검은 눈 패치", 오소리는 정반대로 "짙은 얼굴에 흰 줄" 로 간다.
    //    머리 구(def.skin)는 짙게 두고 그 위에 흰 줄을 얹는다 — 실루엣이 아니라 명암이 뒤집혀 한눈에 갈린다.
    const WHITE = 0xf5f2ea;
    const cap = add(new THREE.Mesh(new THREE.SphereGeometry(0.395, 14, 10), clayMat(0x3a342e, false)), 0, 1.15, 0);   // 짙은 얼굴 바탕
    cap.castShadow = true;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.52, 0.12), clayMat(WHITE, false)), 0, 1.26, 0.27).rotation.x = -0.3;   // 콧등 흰 줄(가운데)
    [-0.235, 0.235].forEach(ex => {                                   // 눈 위를 지나는 흰 줄 두 개
      const st = add(new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.46, 0.11), clayMat(WHITE, false)), ex, 1.24, 0.21);
      st.rotation.set(-0.3, 0, ex > 0 ? -0.16 : 0.16);
    });
    [-0.28, 0.28].forEach(ex => {                                     // 짧고 둥근 귀 — 흰 테두리로 한 번 더 오소리 표시
      add(new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 6), clayMat(0x3a342e, false)), ex, 1.4, -0.02).scale.set(1, 0.85, 0.6);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), clayMat(WHITE, false)), ex, 1.41, 0.02).scale.set(1, 0.85, 0.6);
    });
    const snout = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), clayMat(WHITE, false)), 0, 1.07, 0.33);
    snout.scale.set(0.85, 0.7, 1.15);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), clayMat(0x2a2320, false)), 0, 1.08, 0.46);   // 코
    // 🧺 채집 바구니 — 뒤에 메면 위에서 내려다보는 기본 카메라에 안 걸린다. 앞으로 안고 있게 한다
    const basket = bobbing(add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.19, 0.26, 12), clayMat(0xc79a63, false)), 0.02, 0.74, 0.44));
    basket.rotation.x = -0.18; basket.castShadow = true;
    add(new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.03, 6, 14), clayMat(0x8e6b3a, false)), 0.02, 0.86, 0.46).rotation.set(Math.PI / 2 - 0.18, 0, 0);
    [[-0.08, 0], [0.07, 0.04]].forEach(([dx, dz]) => add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), clayMat(0xd9524a, false)), 0.02 + dx, 0.86, 0.46 + dz));  // 담긴 열매
    return { bob };
  } else if (def.look === 'duck') {
    // 🦆 오리 사공 — 몸·머리가 둘 다 희면 눈사람이 된다. 몸에 물빛 조끼를 입혀 흰 머리와 나눈다.
    //    소품(노)은 옆으로 크게 빼야 위에서 내려다보는 기본 카메라의 실루엣에 걸린다.
    const vest = bobbing(add(new THREE.Mesh(new THREE.SphereGeometry(0.512, 16, 12, 0, Math.PI * 2, Math.PI / 2.8, Math.PI), clayMat(0x4f7f9c, false)), 0, 0.55, 0));
    vest.scale.set(1.01, 1.05, 1.01);
    const bill = add(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.28), clayMat(0xe8912c, false)), 0, 1.09, 0.34);
    bill.rotation.x = 0.14; bill.castShadow = true;
    // ⚠️ 챙이 크면 위에서 내려다보는 기본 카메라에서 얼굴을 통째로 가린다 — 눈·부리가 보이는 크기까지 줄이고 뒤로 젖혀 쓴다
    const brimD = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.045, 16), clayMat(def.hat)), 0, 1.47, -0.12);
    brimD.rotation.x = -0.3; brimD.castShadow = true;
    const coneD = add(new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.28, 16), clayMat(def.hat)), 0, 1.58, -0.15);
    coneD.rotation.x = -0.3;
    const oar = add(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.9, 6), clayMat(0x9b7247, false)), 0.6, 1.0, 0.3);
    oar.rotation.set(0.34, 0, -0.42); oar.castShadow = true;
    const blade = add(new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.06), clayMat(0xd9b077, false)), 0.98, 0.24, 0.62);
    blade.rotation.set(0.34, 0, -0.42); blade.castShadow = true;
    return { bob };
  } else if (def.look === 'rancher') {
    // 🐔 목장 아주머니 — 머릿수건이 머리를 통째로 덮으면 대머리로 보인다.
    //    정수리만 덮고 앞머리·옆머리를 남겨 "수건을 쓴 사람" 으로 읽히게 한다.
    // 💇‍♀️ 쪽진 머리 + 🪡비녀 — 머릿수건은 머리를 통째로 덮어 대머리로 보였다.
    //    위에서 내려다보는 기본 카메라에선 정수리가 가장 잘 보이므로, 정수리에 얹는 쪽과 비녀가 제일 또렷하다.
    //    ⚠️ 머리 덮개는 위쪽 캡까지만 — 머리 전체를 덮으면 공용 눈(y1.18·z0.32)이 묻힌다.
    const HAIR = 0x4a382a;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.405, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), clayMat(HAIR, false)), 0, 1.15, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI / 2.6, 0.5), clayMat(HAIR, false)), 0, 1.14, -0.08);   // 뒤통수
    const bun = add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), clayMat(HAIR, false)), 0, 1.44, -0.14);   // 정수리 뒤에 얹은 쪽
    bun.scale.set(1.15, 0.9, 1.05); bun.castShadow = true;
    // 🪡 비녀 — 쪽 속에 묻히면 구슬만 떠 있는 꼴이 된다. 쪽보다 위로 올려 막대가 드러나게 꽂는다
    const pin = add(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.62, 6), clayMat(0xe4c26a, false)), 0, 1.5, -0.12);
    pin.rotation.set(0, 0, Math.PI / 2 - 0.16); pin.castShadow = true;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 8), clayMat(0xd9524a, false)), 0.305, 1.55, -0.12);   // 비녀 머리(붉은 구슬)
    // 앞치마 — 판자처럼 붙지 않게 몸통 곡면을 따라가는 얇은 구 조각 + 어깨끈
    const apron = bobbing(add(new THREE.Mesh(new THREE.SphereGeometry(0.514, 16, 12, Math.PI / 2 - 0.62, 1.24, Math.PI / 2.4, 1.15), clayMat(0xfaf3e2, false)), 0, 0.55, 0));
    apron.scale.set(1.02, 1.02, 1.02);   // ⚠️ rotation.y 를 주면 앞면이 뒤로 돌아간다 — phi 가 이미 +z(앞) 중심이다
    [-0.16, 0.16].forEach(ex => add(new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.26, 0.04), clayMat(0xfaf3e2, false)), ex, 0.85, 0.45).rotation.x = -0.22);
    // 🥚 달걀 바구니 — 몸에 파묻히지 않게 앞으로 안고, 달걀이 위로 보이게 담는다
    const basket = bobbing(add(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.18, 0.2, 12), clayMat(0xc79a63, false)), 0.06, 0.72, 0.46));
    basket.rotation.x = -0.16; basket.castShadow = true;
    add(new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.028, 6, 14), clayMat(0x8e6b3a, false)), 0.06, 0.81, 0.47).rotation.set(Math.PI / 2 - 0.16, 0, 0);
    [[-0.09, -0.02], [0.02, 0.03], [0.1, -0.01]].forEach(([dx, dz]) => {
      add(new THREE.Mesh(new THREE.SphereGeometry(0.058, 8, 6), clayMat(0xfdf6e6, false)), 0.06 + dx, 0.83, 0.47 + dz).scale.set(1, 1.3, 1);
    });
    return { bob };
  } else if (def.look === 'stargazer') {
    // ⭐ 별 보는 아이 — 어른들보다 작고(scale), 별 머리띠 + 옆으로 든 포충망.
    //    소품을 뒤에 두면 위에서 내려다보는 기본 카메라에선 통째로 가려 몸통만 남는다 → 옆·위로 뺀다.
    g.scale.setScalar(0.84);
    // ⚠️ 머리카락은 위쪽 반구로만 — 머리 전체를 덮으면 공용 눈(y1.18·z0.32)이 묻혀 검은 헬멧이 된다
    add(new THREE.Mesh(new THREE.SphereGeometry(0.405, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2.5), clayMat(0x3b2f2a, false)), 0, 1.16, 0).castShadow = true;
    add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 10, 0, Math.PI * 2, Math.PI / 2.6, 0.5), clayMat(0x3b2f2a, false)), 0, 1.15, -0.07);   // 뒤통수 단발
    const band = add(new THREE.Mesh(new THREE.TorusGeometry(0.375, 0.038, 6, 18), clayMat(0xf5f0e4, false)), 0, 1.3, 0);        // 머리띠
    band.rotation.x = 1.42;
    const star = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), clayMat(def.hat, false)), 0, 1.56, 0.06);           // 머리 위 별(정면에서 바로 보이게)
    star.rotation.set(0.25, 0.5, 0.1); star.castShadow = true;
    // 🦋 포충망 — 몸 옆으로 들어 올려 실루엣에 확실히 걸리게
    const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1.25, 6), clayMat(0x9b7247, false)), 0.5, 1.05, 0.16);
    pole.rotation.set(0.22, 0, -0.42); pole.castShadow = true;
    const hoop = add(new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.028, 6, 16), clayMat(0xdfe7f2, false)), 0.76, 1.57, 0.28);
    hoop.rotation.set(1.35, 0, -0.42);
    const net = add(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.32, 12, 1, true), clayMat(0xeef3fa, false)), 0.78, 1.42, 0.29);
    net.rotation.set(-0.2, 0, -0.42); net.material.transparent = true; net.material.opacity = 0.5;
    return {};
  } else {
    const brim = add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 12), clayMat(def.hat)), 0, 1.4, 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), clayMat(def.hat)), 0, 1.5, 0);
  }
}

// 모든 주민 생성 (데이터 기반)
export function buildNPCs() {
  // ⚠️ 여기서 의뢰를 뽑지 않는다. buildNPCs 는 bootWorld(로그인·loadGame 전)에서 돌기 때문에
  //    authState.variant 가 아직 없어 mapLocked() 가 전부 false 로 판정된다 —
  //    그 상태로 뽑으면 베타 1일차에게 🌊바다·🌫️안개처럼 아직 못 가는 목표가 확정돼
  //    진행도가 영원히 0 이고 그날 의뢰 전체가 잠긴다.
  //    의뢰는 enterGame(세이브 로드 후)에서만 뽑고, 그 전까지 def.quests 는 비어 있다
  //    (currentQuest 가 빈 배열을 null 로 돌려주므로 글리프·대화 모두 안전하다).
  for (const def of NPCS) {
    const g = new THREE.Group();
    g.position.set(def.pos[0], 0, def.pos[2]);
    const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 1), clayMat(def.color, false));
    body.position.y = 0.55; body.castShadow = true; body.scale.set(1, 1.05, 1); g.add(body);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.38, 1), clayMat(def.skin || 0xffe0c0, false));
    head.position.y = 1.15; head.castShadow = true; g.add(head);
    const look = buildNPCLook(g, def) || {};
    if (!look.eyes) {   // 🦉 올빼미처럼 제 눈을 직접 그린 외형은 공용 눈을 얹지 않는다
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x3a2f2a, roughness: 0.6 });
      [-0.13, 0.13].forEach(ex => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat); e.position.set(ex, 1.18, 0.32); g.add(e); });
    }
    scene.add(g);

    // 머리 위 상태 말풍선(캔버스 텍스처 — 외부 파일 없음)
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const ctx = cv.getContext('2d');
    const tex = new THREE.CanvasTexture(cv);
    // 이름표·말풍선 높이는 "그 주민의 실제 키" 에서 잡는다.
    //   고정값(1.74)을 쓰면 모자가 큰 주민(🐼 요리사 토크 ~2.0 · 👷 안전모 ~1.74)의 머리가
    //   이름표를 앞에서 뚫고 나와 글자를 가린다(보고: "판다·목수 이름표가 아직 그대로").
    const topY = new THREE.Box3().setFromObject(g).max.y;
    const tagY = topY + 0.30;

    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    sprite.scale.set(0.9, 0.9, 0.9); sprite.position.y = tagY + 0.76; g.add(sprite);   // 이름표 바로 위

    // 🏷️ 이름표 — "누가 누군지 모르겠다"(베타)의 직접 해법. 항상 띄우면 시끄러워서
    //    NAMETAG_FAR 밖에선 감추고 가까워질수록 서서히 나타난다(updateNPC 가 opacity 갱신).
    const tag = makeNameTag(def);
    tag.position.y = tagY; g.add(tag);

    const o = {
      def, group: g, body, sprite, ctx, tex, tag, lastGlyph: null,
      spriteY0: tagY + 0.76,          // 말풍선 살랑임의 기준 높이(주민마다 키가 다르다)
      topY,                           // 모자까지 포함한 실제 키 — ?dbg=1 로 이름표 여유를 눈금으로 확인한다
      wings: look.wings || null,
      bobParts: look.bob && look.bob.length ? look.bob : null,   // 몸통 숨쉬기를 따라가야 하는 장식(안 그러면 몸통이 뚫고 나온다)
      // 🦉 비행 상태 — 'perch'(앉음, 대화 가능) 외에는 하늘에 있다
      fly: def.look === 'owl' ? { st: 'perch', t: 0, next: OWL_REST_MIN + Math.random() * OWL_REST_VAR, tx: 0, tz: 0, deliver: false, legs: 0 } : null,
      home: new THREE.Vector3(def.pos[0], 0, def.pos[2]),
      target: new THREE.Vector3(def.pos[0], 0, def.pos[2]),
      wanderTimer: Math.random() * 3, phase: Math.random() * 6,
      // 🚧 주민도 통과 못 함. 배회하니 콜라이더 좌표를 매 프레임 따라가게 한다(updateNPC)
      collider: solidCircle(def.pos[0], def.pos[2], NPC_R),
    };
    npcObjs.push(o);
    updateNPCGlyph(o);
  }
}

// 상태 글리프: ! 수락가능 / … 진행중 / ✓ 완료 / (없음) 전부완료
export function npcGlyph(o) {
  const st = npcState(o.def.id);
  const q = currentQuest(o.def, st);
  if (!q) return '';                 // 체인도 끝나고 오늘 반복 의뢰도 없다
  if (!st.given) return '!';
  return st.progress >= q.target ? '✓' : '…';
}

export function updateNPCGlyph(o) {
  if (!o || !o.ctx) return;
  const g = npcGlyph(o);
  if (g === o.lastGlyph) return; o.lastGlyph = g;
  const c = o.ctx; c.clearRect(0, 0, 128, 128);
  if (!g) { o.sprite.visible = false; o.tex.needsUpdate = true; return; }
  o.sprite.visible = true;
  c.fillStyle = g === '✓' ? '#8fd6a0' : g === '!' ? '#ffd27a' : '#cfe3ff';
  roundRect(c, 18, 14, 92, 82, 22); c.fill();
  c.beginPath(); c.moveTo(54, 94); c.lineTo(74, 94); c.lineTo(60, 118); c.closePath(); c.fill();
  c.fillStyle = '#3a4a40'; c.font = 'bold 60px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(g, 64, 55);
  o.tex.needsUpdate = true;
}

//   "날아다니는 올빼미" 요청. 다만 의뢰를 주는 주민이라 계속 날면 말을 걸 수가 없다 →
//   평소엔 앉아 있다가 가끔 짧게 한 바퀴 돌고 다시 내려앉고, 특별 의뢰가 있을 때만
//   플레이어 앞으로 날아와 착지한다. 대화·충돌은 'perch' 일 때만 산다.
export const OWL_REST_MIN = 30, OWL_REST_VAR = 20;

export const OWL_STAY_R = 6;

export const OWL_CRUISE = 2.7;

export const OWL_SPEED = 3.6;

export const OWL_CLIMB = 0.9;

export function setOwlWings(o, spread, t) {
  if (!o.wings) return;
  const flap = spread ? Math.sin(t * 7.5) * 0.42 : 0;
  o.wings.forEach((pivot, i) => {
    const sx = i === 0 ? -1 : 1;
    pivot.rotation.z = sx * (0.1 + spread * (1.05 + flap));
  });
}

// 내려앉을 만한 빈자리 — 주민·플레이어·나무·건물과 안 겹치는 곳. 못 찾으면 null.
//   (안 고르고 내려앉으면 다른 주민 위나 건물 안에 착지한다)
export function owlLandingSpot(o, cx, cz, minR, maxR) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, r = minR + Math.random() * (maxR - minR);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (!npcBlocked(x, z, o)) return { x, z };
  }
  return null;
}

// tx,tz 로 날아가 내려앉는다. deliver 면 착지할 때 특별 의뢰를 건넨다.
export function startOwlFlight(o, tx, tz, deliver = false) {
  o.fly.st = 'up'; o.fly.t = 0; o.fly.tx = tx; o.fly.tz = tz; o.fly.deliver = deliver;
  o.fly.legs = deliver ? 0 : 1 + (Math.random() < 0.5 ? 1 : 0);   // 순찰은 1~2 다리를 돌고 내려앉는다
}

// true 를 반환하면 "지금 하늘에 있다" — 호출자는 배회·시선 처리를 건너뛴다
export function updateOwlFly(o, dt, t) {
  const f = o.fly; if (!f) return false;
  const g = o.group;
  f.t += dt;
  if (f.st === 'perch') {
    g.position.y = 0; o.collider.off = false;
    setOwlWings(o, 0, t);
    // 튜토리얼이 "🦉올빼미는 매일 새 의뢰" 라며 올빼미를 가리키는 단계가 있다 —
    //   그때 날아가 버리면 신규 유저가 목적지를 잃는다. 코치 중엔 앉아 있는다.
    //   플레이어가 말 걸러 다가오는 중에도 날아가면 안 된다(베타: "자꾸 날아다닌다") — 가까이 있으면 앉아서 기다린다.
    const playerNear = dist2D(player.position, g.position) < OWL_STAY_R;
    if (f.t > f.next && !playerNear && mode === 'play' && !ui.anyModalOpen?.() && !ui.coachActive?.()) {   // 이따금 홈 주변을 한 바퀴
      const spot = owlLandingSpot(o, o.home.x, o.home.z, 2.5, 5.5);
      if (spot) startOwlFlight(o, spot.x, spot.z);
      else f.t = 0;                              // 내려앉을 자리가 없으면 이번엔 쉰다
    }
    return false;
  }
  o.collider.off = true;                          // 하늘엔 벽이 없다
  setOwlWings(o, 1, t);
  if (f.st === 'up') {
    g.position.y = OWL_CRUISE * Math.min(1, f.t / OWL_CLIMB);
    if (f.t >= OWL_CLIMB) { f.st = 'cruise'; f.t = 0; }
  } else if (f.st === 'cruise') {
    g.position.y = OWL_CRUISE + Math.sin(t * 2.2) * 0.14;
    const dx = f.tx - g.position.x, dz = f.tz - g.position.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.2) {
      const k = Math.min(1, OWL_SPEED * dt / d);
      g.position.x += dx * k; g.position.z += dz * k;
      g.rotation.y = lerpAngle(g.rotation.y, Math.atan2(dx, dz), 0.12);
    }
    if (d <= 0.4 || f.t > 14) {
      // 순찰 비행은 한 다리 더 돌 때가 있다 — 한 번에 내려앉으면 "잠깐 뛴" 느낌이라 나는 것처럼 안 보인다
      const nextLeg = (!f.deliver && f.legs > 0 && f.t <= 14) ? owlLandingSpot(o, o.home.x, o.home.z, 2.5, 5.5) : null;
      if (nextLeg) { f.legs--; f.t = 0; f.tx = nextLeg.x; f.tz = nextLeg.z; }
      else { f.st = 'down'; f.t = 0; }
    }   // 14초 안전핀 — 목적지가 막혀도 반드시 내려온다
  } else if (f.st === 'down') {
    g.position.y = OWL_CRUISE * Math.max(0, 1 - f.t / OWL_CLIMB);
    if (f.t >= OWL_CLIMB && npcBlocked(g.position.x, g.position.z, o)) {
      const spot = owlLandingSpot(o, g.position.x, g.position.z, 1.2, 3);   // 내려오는 사이 누가 그 자리에 왔다
      if (spot) { f.st = 'cruise'; f.t = 0; f.tx = spot.x; f.tz = spot.z; return true; }
    }
    if (f.t >= OWL_CLIMB) {
      g.position.y = 0; f.st = 'perch'; f.t = 0; f.next = OWL_REST_MIN + Math.random() * OWL_REST_VAR;
      o.collider.x = g.position.x; o.collider.z = g.position.z; o.collider.off = false;
      if (f.deliver) {
        f.deliver = false;
        o.home.set(g.position.x, 0, g.position.z);   // 내려앉은 곳이 새 홈 — 맵 반대편에서 0.5u/s 로 걸어 돌아오지 않게
        deliverOwlSpecial(o);
      }
    }
  }
  return true;
}

//   오늘 일일 의뢰(DAILY_COUNT건)를 다 끝내면 올빼미가 특별 의뢰를 물고 날아온다.
//   기존 일일 루프는 그대로 두고 오늘의 의뢰 목록에 4번째를 얹는 방식이라,
//   수락·진행·보상 코드는 손대지 않아도 그대로 굴러간다.
export const OWL_SPECIAL_POOL = [
  { type: 'chop',    target: 12, title: '달빛 장작',   desc: '나무 12번 베기' },
  { type: 'fish',    target: 8,  title: '은빛 물결',   desc: '물고기 8마리 낚기' },
  { type: 'mine',    target: 10, title: '깊은 광맥',   desc: '광석 10개 캐기' },
  { type: 'harvest', target: 8,  title: '풍요의 밤',   desc: '작물 8개 수확하기' },
  { type: 'forage',  target: 10, title: '숲의 선물',   desc: '🍄 채집물 10개 줍기' },
  { type: 'sell',    target: 12, title: '별빛 장터',   desc: '상점에서 12개 팔기' },
];

// 오늘 일일 3건을 끝냈고 아직 특별 의뢰를 못 받았으면 true
export function owlSpecialPending() {
  const def = NPCS.find(n => n.daily); if (!def) return false;
  const st = npcState(def.id);
  return st.date === todayStr() && st.idx >= DAILY_COUNT
    && Array.isArray(st.quests) && st.quests.length === DAILY_COUNT && !st.special;
}

export function deliverOwlSpecial(o) {
  const def = o.def, st = npcState(def.id);
  if (!owlSpecialPending()) return;   // 나는 사이에 자정이 지났거나 이미 받았다 — 판정은 한 곳에서만
  const pick = pickGated(OWL_SPECIAL_POOL, 1, dateHash('owl:special'), questCtx())[0];
  if (!pick) return;   // 전부 막혀 있으면 오늘은 특별 의뢰를 내지 않는다
  // 보상 조정: 코인 80 + 💎1(판매가 40) = 120 코인어치는 일일 3건 전부(45 + 럭키박스 기대값 ~37)
  //   보다 컸다 — 하루 발행량이 두 배가 되어 베타 경제 지표가 흔들린다.
  //   30 + 💎1 = 70 코인어치로 낮춘다(가장 큰 일일 의뢰 20 의 1.5배 + 특별함은 💎 가 맡는다).
  const sp = { ...pick, title: `✨ ${pick.title}`, reward: { coins: 30, gem: 1 },
               line: `오늘 의뢰를 전부 해냈구나! 그럼 이건 자네 몫이지 — ✨특별 의뢰야. ${pick.desc}!` };
  st.special = sp;                     // 세이브엔 일일 3개와 따로 보관(배열에 섞으면 다음 접속에 재추첨된다)
  st.readyToasted = false;             // 상태형 목표를 풀에 넣어도 달성 토스트가 뜨게
  def.quests = [...st.quests, sp];     // 불변 — 새 배열로 갈아끼운다
  st.allDone = false; st.given = false; st.progress = 0;
  updateNPCGlyph(o); refreshQuestPanel(); syncBadges();
  Sound.complete?.();
  ui.toast?.('✨ 의뢰 올빼미가 특별 의뢰를 물고 날아왔어요!', 3200);
  trackEvent('owl_special_deliver', { quest: sp.title, target: sp.target, quest_id: questIdFor({ npcId: def.id, specialType: sp.type }), quest_type: sp.type });   // [GA4] 수락·완료의 quest_id 와 같은 값
}

// 조건이 맞으면 올빼미를 플레이어 앞으로 날려 보낸다.
//   ⚠️ 매 프레임 돌리면 안 된다 — owlLandingSpot 이 최대 12회 × npcBlocked(나무 수백 개)라
//   플레이어가 나무·건물에 붙어 서서 빈자리가 안 나오는 동안 프레임이 눈에 띄게 떨어진다.
export let owlVisitCooldown = 0;

export function updateOwlVisit(dt) {
  owlVisitCooldown -= dt;
  if (owlVisitCooldown > 0) return;
  owlVisitCooldown = 0.5;
  if (mode !== 'play' || !inVillage2() || ui.anyModalOpen?.()) return;
  if (!owlSpecialPending()) return;
  const o = npcObjs.find(n => n.def.daily); if (!o || !o.fly) return;
  if (o.fly.st !== 'perch' || o.fly.deliver) return;
  if (dist2D(o.group.position, player.position) < 2.2) { deliverOwlSpecial(o); return; }   // 이미 옆에 있으면 바로
  const spot = owlLandingSpot(o, player.position.x, player.position.z, 1.6, 2.4);
  if (spot) startOwlFlight(o, spot.x, spot.z, true);   // 자리가 없으면 다음 프레임에 다시 본다
}

export function updateNPC(dt, t) {
  for (const o of npcObjs) {
    const bodyY = 0.55 + Math.sin(t * 2 + o.phase) * 0.04;
    o.body.position.y = bodyY;
    if (o.bobParts) for (const m of o.bobParts) m.position.y = m.userData.y0 + (bodyY - 0.55);   // 가슴털·허리띠는 몸통과 같이 움직여야 안 깜빡인다
    if (o.sprite) o.sprite.position.y = o.spriteY0 + Math.sin(t * 2.5 + o.phase) * 0.08;
    if (o.tag) {   // 🏷️ 이름표 — 가까워질수록 서서히 나타남(멀리선 감춰 화면을 비워 둔다)
      const d = dist2D(o.group.position, player.position);
      const a = d <= NAMETAG_NEAR ? 1 : d >= NAMETAG_FAR ? 0 : (NAMETAG_FAR - d) / (NAMETAG_FAR - NAMETAG_NEAR);
      o.tag.visible = a > 0.02; o.tag.material.opacity = a;
    }
    if (o.fly && updateOwlFly(o, dt, t)) {
      // 🦉 하늘에 있는 동안엔 updateOwlFly 가 이동·고도·날개를 담당
    } else if (merchantVisit && o.def.id === 'merchant') {
      // 방문 이벤트 중엔 updateMerchantVisit 가 이동·시선을 담당
    } else if (mode === 'play' && nearNPC === o) {
      const dx = player.position.x - o.group.position.x, dz = player.position.z - o.group.position.z;
      o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.2); // 플레이어 바라보기
    } else {
      wanderNPC(o, dt);                                                            // 홈 주변 배회
    }
    if (!o.fly || o.fly.st === 'perch') { o.collider.x = o.group.position.x; o.collider.z = o.group.position.z; }  // 🚧 콜라이더 동기화(땅에 있을 때만)
    updateNPCGlyph(o);
  }
}

// 주민이 들어가면 안 되는 자리(건물·호수·나무 등) — 밭 금지 구역보다 여유를 적게 둬 벽에 바짝 설 수 있게
export function npcBlocked(x, z, self = null) {
  // 플레이어 자리도 피한다 — 안 그러면 배회하다 플레이어를 밀고 지나간다
  if (player && Math.hypot(x - player.position.x, z - player.position.z) < NPC_R + PLAYER_R + 0.2) return true;
  // 다른 주민 자리도 피한다 — 콜라이더는 "플레이어를" 막을 뿐 주민끼리는 안 막아서,
  //   배회하다 서로 몸이 겹쳐 한 덩어리로 보였다(보고: "캐릭터들끼리 겹친다").
  //   하늘에 있는 올빼미는 셈에서 뺀다.
  for (const o of npcObjs) {
    if (o === self || (o.fly && o.fly.st !== 'perch')) continue;
    if (Math.hypot(x - o.group.position.x, z - o.group.position.z) < NPC_R * 2 + 0.15) return true;
  }
  return obstacles.some(ob => Math.hypot(x - ob.x, z - ob.z) < ob.r + 0.35);
}

// 🌾 밭 위는 주민이 배회하지 않는다 — 갈아둔 밭에 주민이 올라서면 작물을 가리고,
//   대화 사거리(2.6)가 밭 작업 사거리(1.8)를 덮어 밭일이 대화로 새는 원인이 된다(베타 피드백).
//   흙(1.7×1.7)에 몸통 반경(0.45)만큼 여유를 둔 사각 판정 — 붙어 있는 밭들은 한 덩어리로 묶여
//   주민이 밭 사이를 비집고 다니지 않는다. 상인 방문·올빼미 착지 같은 대본 이동에는 적용하지 않는다.
export const PLOT_KEEP_OUT = 1.7 / 2 + 0.4;

export function wanderNPC(o, dt) {
  const blocked = (x, z) => npcBlocked(x, z, o) || onPlotArea(x, z);
  o.wanderTimer -= dt;
  if (o.wanderTimer <= 0) {
    o.wanderTimer = 3 + Math.random() * 4;
    // 건물·호수 안쪽과 밭은 목적지로 고르지 않음(카페·닭장·집을 뚫고 지나가던 문제 + 밭 밟기)
    for (let i = 0; i < 9; i++) {
      // 6번 실패하면 반경을 넓혀 찾는다 — 집 둘레가 통째로 밭이 되면 원래 roam 안엔 설 자리가 없다
      const a = Math.random() * Math.PI * 2;
      const r = (o.def.roam ?? 1.6) * (i < 6 ? Math.random() : 1 + Math.random() * 2);
      const nx = o.home.x + Math.cos(a) * r, nz = o.home.z + Math.sin(a) * r;
      if (!blocked(nx, nz)) { o.target.set(nx, 0, nz); break; }
      if (i === 8) o.target.copy(o.home);   // 전부 막혔으면 제자리
    }
  }
  const dx = o.target.x - o.group.position.x, dz = o.target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.06) {
    const nx = o.group.position.x + (dx / d) * 0.5 * dt;
    const nz = o.group.position.z + (dz / d) * 0.5 * dt;
    // 이미 막힌 자리에 서 있다면(나무가 나중에 생긴 경우·발밑에 밭이 생긴 경우) 빠져나올 수 있게 이동을 허용
    if (blocked(nx, nz) && !blocked(o.group.position.x, o.group.position.z)) { o.wanderTimer = 0; return; }
    o.group.position.x = nx; o.group.position.z = nz;
    o.group.rotation.y = lerpAngle(o.group.rotation.y, Math.atan2(dx, dz), 0.1);
  }
}

//    발동: 마을 안 + 목재5 또는 물고기1 + 모달 없음 + hintsSeen.merchantVisit 없음
//    walk(플레이어에게 걸어옴, 12초 상한) → talk(모달) → return(좌판 홈으로)
export let merchantVisit = null;

export function merchantObj() { return npcObjs.find(o => o.def.id === 'merchant') || null; }

// NPC 를 target 쪽으로 speed 만큼 전진(막히면 좌우 45° 우회). 남은 거리 반환
export function stepNpcToward(o, target, speed, dt) {
  const dx = target.x - o.group.position.x, dz = target.z - o.group.position.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return d;
  const ang = Math.atan2(dx, dz);
  for (const off of [0, Math.PI / 4, -Math.PI / 4]) {
    const a = ang + off;
    const nx = o.group.position.x + Math.sin(a) * speed * dt, nz = o.group.position.z + Math.cos(a) * speed * dt;
    if (npcBlocked(nx, nz, o)) continue;
    o.group.position.x = nx; o.group.position.z = nz;
    break;
  }
  o.group.rotation.y = lerpAngle(o.group.rotation.y, ang, 0.2);
  return Math.hypot(target.x - o.group.position.x, target.z - o.group.position.z);
}

export function updateMerchantVisit(dt) {
  if (mode !== 'play') return;
  const m = merchantObj(); if (!m) return;
  if (!merchantVisit) {
    if (gameState.hintsSeen.merchantVisit) return;
    if (!inVillage2()) return;   // 마을(실외) 밖(텃밭·동굴·카페·강·바다·안개숲·실내)에선 발동 금지
    if (ui.anyModalOpen?.()) return;
    const offer = welcomeOffer(gameState.inventory);
    if (!offer) return;
    gameState.hintsSeen.merchantVisit = true;            // 즉시 소진(세이브에 남아 재발동 없음)
    merchantVisit = { state: 'walk', t: 0, offer };
    return;
  }
  const v = merchantVisit; v.t += dt;
  if (v.state === 'walk') {
    if (!inVillage2()) {   // 걸어오는 사이 집·텃밭 등으로 들어갔다 → 방문 무효, 1회권은 돌려줘 다음에 다시 온다(전엔 12초 뒤 실내에서 모달이 떴다)
      merchantVisit = { state: 'return', t: 0, offer: v.offer }; gameState.hintsSeen.merchantVisit = false; return;
    }
    const d = stepNpcToward(m, player.position, 2.0, dt);
    if (d <= 1.6) {
      if (ui.anyModalOpen?.()) { v.t = 0; return; }   // 튜토리얼 카드 등이 떠 있으면 옆에서 기다린다(뒤에 묻혀 1회권만 소진되던 것)
      v.state = 'talk'; openMerchantOffer(v.offer);
    } else if (v.t > 12) {                             // 못 왔다(벤치 등에 걸림) → 멀리서 모달 띄우지 말고 돌아가고, 다음 기회에 다시
      merchantVisit = { state: 'return', t: 0, offer: v.offer }; gameState.hintsSeen.merchantVisit = false;
    }
  } else if (v.state === 'talk') {
    const dx = player.position.x - m.group.position.x, dz = player.position.z - m.group.position.z;
    m.group.rotation.y = lerpAngle(m.group.rotation.y, Math.atan2(dx, dz), 0.2);   // 플레이어 바라보기
  } else if (v.state === 'return') {
    const d = stepNpcToward(m, m.home, 2.0, dt);
    if (d < 0.3 || v.t > 20) merchantVisit = null;      // 홈 도착 → 평소 배회로 복귀
  }
}

export function openMerchantOffer(offer) {
  const wood = offer.item === 'wood';
  ui.openMerchantModal?.({
    title: '방랑 상인',
    body: wood ? '오, 그 🪵 목재 좋구먼! 처음 보는 얼굴이니 후하게 쳐주지.' : '오, 그 🐟 물고기 싱싱하구먼! 처음 보는 얼굴이니 후하게 쳐주지.',
    primary: { label: wood ? '🪵 목재 5개 팔기 (+30🪙)' : '🐟 물고기 팔기 (+25🪙)', onClick: () => merchantWelcomeSell(offer) },
    secondary: { label: '다음에', onClick: () => merchantDismiss() },
  });
}

export function merchantWelcomeSell(offer) {
  if ((gameState.inventory[offer.item] || 0) < offer.qty) { merchantDismiss(); return; }   // 그새 써버렸으면 조용히 종료
  gameState.inventory[offer.item] -= offer.qty;
  gameState.inventory.coins = (gameState.inventory.coins || 0) + offer.gain;
  refreshInventoryUI(); Sound.complete();
  spawnFloatText(player.position.x, 1.9, player.position.z, `+${offer.gain}🪙`, '#2fa564');
  questEvent('sell', offer.qty);                          // 상인 퀘스트 '장사의 신' 진행
  ui.act?.('sell');                                       // 튜토리얼 ④ 팔기
  trackEvent('shop_sell', { item: offer.item, qty: offer.qty, gain: offer.gain, rate: 300, via: 'merchant' }); // [GA4] 기존 판매 이벤트 + via
  trackEvent('merchant_visit', { item: offer.item, gain: offer.gain });                                        // [GA4] 방문 퍼널
  logEcon('shop_sell', offer.item + '|welcome', offer.gain, gameState.inventory.coins);                        // [원장] 출처는 shop_sell, 품목 접미사로 구분
  ui.openMerchantModal?.({
    title: '방랑 상인',
    body: '더 팔 거면 동쪽 좌판으로 오게. 새로 들어온 🌱비료랑 🪱미끼도 보고 가고.',
    primary: { label: '🛒 좌판 구경', onClick: () => { merchantDismiss(); ui.openShop?.('buy'); } },
    secondary: { label: '다음에', onClick: () => merchantDismiss() },
  });
}

export function merchantDismiss() {
  ui.closeMerchantModal?.();
  if (merchantVisit) { merchantVisit.state = 'return'; merchantVisit.t = 0; }
  showShopCue(60);
  if (!gameState.hintsSeen.merchantShop) {   // 코치 진행 중에도 1회 표시(firstHintBanner 는 코치 중 억제라 새 유저에겐 영영 안 뜸)
    gameState.hintsSeen.merchantShop = true;
    ui.showHintBanner?.({ ico: '🛒', title: '상점 좌판', line: '동쪽 좌판에서 언제든 팔 수 있어요', near: () => true });
  }
}

// 좌판 위 🛒 안내 스프라이트 — sec 초 동안 둥실거리며 위치를 알려준다
export let shopCue = null, shopCueUntil = 0;

export function showShopCue(sec) {
  if (!shopCue) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const c = cv.getContext('2d'); c.font = '96px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🛒', 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    shopCue = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    shopCue.scale.set(1.1, 1.1, 1); shopCue.position.set(SHOP.x, 3.2, SHOP.z);
    scene.add(shopCue);
  }
  shopCue.visible = true; shopCueUntil = clock.elapsedTime + sec;
}

export function updateShopCue(t) {
  if (!shopCue || !shopCue.visible) return;
  if (clock.elapsedTime > shopCueUntil) { shopCue.visible = false; return; }
  shopCue.position.y = 3.2 + Math.sin(t * 2.4) * 0.15;
}

// 근접 시 가장 가까운 주민 선택 → 프롬프트 + 퀘스트 패널
export let npcPromptFarm = false;

export function updateNPCInteract() {
  let near = null, nd = 2.6;
  for (const o of npcObjs) {
    if (o.fly && o.fly.st !== 'perch') continue;    // 🦉 날고 있는 동안엔 말을 걸 수 없다
    const d = dist2D(o.group.position, player.position); if (d < nd) { nd = d; near = o; }
  }
  // 밭일이 먼저인 동안 "Space 로 대화"라고 띄우면 거짓말이 된다 → 문구를 바꿔 빠져나갈 길을 알려준다.
  //   (모바일은 전용 💬 버튼이 있어 언제든 대화되므로 해당 없음)
  const farmFirst = !!near && !IS_MOBILE && farmActionFirst();
  const npcChanged = near !== nearNPC;
  if (npcChanged || farmFirst !== npcPromptFarm) {
    $w.nearNPC = near; npcPromptFarm = farmFirst;
    ui.setInteractPrompt?.(!near ? null
      : farmFirst ? `🌾 ${near.def.name} · 밭일이 먼저예요. ✋맨손(숫자 1)으로 바꾸면 대화해요`
      : `💬 ${near.def.name} · Space 로 대화`);
    // 📜 근처 주민이 바뀌면 패널을 다시 그린다 — 그 사람 의뢰가 맨 위로 올라온다(pin).
    //    ⚠️ 멀어질 때(near === null)도 다시 그려야 핀이 풀린다. 안 그러면 마을 반대편에서도
    //       그 사람 의뢰가 맨 위에 붙들려 "펼친 자리" 를 계속 차지한다.
    if (npcChanged) refreshQuestPanel();
  }
}

// 대화 시작 = 현재 주민 상태를 담은 모달을 연다(수락/보상은 버튼으로)
export function talkToNPC() {
  const view = npcDialogState();
  if (view) {
    Sound.blip(); ui.openNPCModal?.(view); ui.act?.('talk'); // 튜토리얼
    dexDiscover('npc', view.npc.id);                         // 📖 도감(이웃 첫 대화)
    // [GA4] 대화 이벤트 — 주민별 대화 횟수 / mode(offer·progress·claim·done)로 대화→수락 전환 분석.
    //   ※ GA4 전용(스키마 자유). Supabase game_logs(고정 스키마)엔 넣지 않아 연동 충돌 없음.
    trackEvent('npc_talk', { npc: view.npc.id, mode: view.mode });
    churnTrigger('quest');   // [🎯 이탈 예측] await 안 함 — 게임 흐름을 막지 않는다
    // [퍼널①] 퀘스트 노출 — offer 화면을 봤다 = 퍼널의 시작점(노출→수락 전환율 측정)
    if (view.mode === 'offer') trackEvent('quest_offered', { quest_id: view.qid, npc: view.npc.id, quest: view.title, quest_type: view.qtype });
  }
}

export function questView(o) {
  const st = npcState(o.def.id);
  if (!st.given) return null;
  const q = currentQuest(o.def, st);
  if (!q) return null;
  return { id: o.def.id, name: o.def.name, title: q.title, desc: q.desc, how: QUEST_HOW[q.type] || '', progress: st.progress, target: q.target, ready: st.progress >= q.target };
}

// 📱 화면이 좁으면 HUD 3단 레이아웃이라, 짧으면(폰 가로·분할 화면) 패널 아래가 잘려
//    줄 자리가 없다 — 담는 건수를 줄인다(나머지는 "+ N건 더" 로 알린다).
export function questPanelTop() {
  if (window.innerHeight < 560) return 1;                                  // 폰 가로·분할 화면
  return window.matchMedia?.('(max-width: 640px)').matches ? 2 : 3;
}

// 📜 패널은 "수락된 의뢰 전부" 를 받는다 — 한 명만 그리면 다른 의뢰를 완료했을 때
//    살아 있는 의뢰가 화면에서 사라진다(규칙·회귀 테스트는 js/quests.js activeQuestList).
//    pin(nearNPC)은 "지금 눈앞에 있는 사람을 맨 위로" 라는 힌트일 뿐 — 멀어지면 저절로 풀린다.
export function refreshQuestPanel() {
  const views = npcObjs.map(questView).filter(Boolean);
  ui.setQuest?.(activeQuestList(views, { top: questPanelTop(), pinId: nearNPC?.def.id || null }));
}
