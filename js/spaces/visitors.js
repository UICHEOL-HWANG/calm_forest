// =============================================================
//  🦋 텃밭 방문객 안내 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, atFarm, dexDiscover, farmGroup, farmHalf, firstHint, gameState, habitatCells, habitatCtx, habitatEnvAt,
  nearDoor, player, playerInYard, plots, roundRect, setSpaceVisible, snapCamera, ui,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { FARM, FARM_GATE } from '../data/places.js';
import { CELL as FARM_CELL } from '../farm-building.js';
import { animateBubble, makeRing, onTop } from '../bubble-fx.js';
import { createVisitors } from '../farm-visitors.js';
import { matchVisitors, visitorOf } from '../habitat.js';
import { Sound } from '../sound.js';
import { makeVisitor } from '../visitor-art.js';
import * as THREE from 'three';

export let visitors = null;

// 막는 요인별 안내 — 앞에 동물 아이콘이 붙는다("🦋 허수아비를 무서워해요").
// ⚠️ 은유를 쓰지 않는다. "무언가 맴돌다 갔어요" 는 무슨 말인지 모르겠다는 지적을 받았다(2026-09-18).
//    원인이 되는 **오브젝트 이름**을 그대로 쓴다.
// ⚠️ 여기 문구가 i18n 키다. 조각을 이어 붙이지 말고 통째로 사전에 넣는다(" · " 글루 함정).
// ⚠️ **한 줄을 넘기지 말 것.** 두 줄이 되면 미터가 높아져 소형폰+토스에서 #door-prompt 와 겹친다
//    (320×568 실측: 여유 93px, 두 줄이면 103px). "어디서 찾나"는 도감의 hint 가 말한다.
export const HABITAT_BLOCK_LINE = {
  fear:    '허수아비를 무서워해요',
  nectar:  '꽃이 더 필요해요',
  food:    '다 자란 작물이 더 필요해요',
  shelter: '숨을 데가 더 필요해요',
  shade:   '그늘이 더 필요해요',
  damp:    '물기가 더 필요해요',
  light:   '빛이 더 필요해요',
};

// 🔍 "살펴볼 수 있어요" 말풍선 — 글자 없이 이모지 하나(사용자 결정 2026-09-28). 흔적의 '🐾 조사!' 와 같은 말풍선 문법.
//   바탕은 흔적 말풍선과 같은 베이지 — 🔍 는 회색 이모지라 흰 바탕에선 거의 안 보였다(실측).
//   안개·톤매핑(ACES)은 끄고 텍스처는 sRGB 로 지정 — 셋이 겹쳐 작은 말풍선이 하얗게 날아가 🔍 가 안 보였다(실측).
//   텍스처는 공유하고 재질은 마리마다 복제한다 — createVisitors 의 페이드가 재질 opacity 를 직접 쓰므로
//   공유하면 한 마리가 떠날 때 다른 마리 말풍선까지 같이 흐려진다.
let _lookTex = null;
function lookTexture() {
  if (_lookTex) return _lookTex;
  const cv = document.createElement('canvas'); cv.width = 104; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(226,196,158,0.96)'; roundRect(c, 8, 8, 88, 64, 18); c.fill();
  c.beginPath(); c.moveTo(42, 72); c.lineTo(62, 72); c.lineTo(48, 94); c.closePath(); c.fill();
  c.font = '50px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('🔍', 52, 41);
  _lookTex = new THREE.CanvasTexture(cv);
  _lookTex.colorSpace = THREE.SRGBColorSpace;
  return _lookTex;
}

const VBUBBLE = { w: 0.85, h: 0.85, y: 1.35 };
const VALERT_R = 5;   // 살펴보기 반경(CATCH_R 2.5)의 두 배 — 다가가는 동안 눈에 띄게

/** 매 프레임 — 🔍 말풍선 연출(모든 방문객 공통: 참새·나비 같은 히든 손님 전부) */
export function updateVisitorBubbles(dt, time) {
  if (!atFarm || !visitors) return;
  for (const v of visitors.live) {
    const bubble = v.mesh.userData.lookBubble, ring = v.mesh.userData.lookRing;
    if (!bubble || !ring) continue;
    animateBubble({ bubble, ring, base: VBUBBLE, dist: Math.hypot(v.wx - player.position.x, v.wz - player.position.z), alertR: VALERT_R, time, dt });
  }
}

export function makeVisitorMesh(id) {
  const g = makeVisitor(THREE, id);
  const bubble = onTop(new THREE.Sprite(new THREE.SpriteMaterial({ map: lookTexture(), transparent: true, depthWrite: false, fog: false, toneMapped: false })));
  bubble.scale.set(VBUBBLE.w, VBUBBLE.h, 1); bubble.position.set(0, VBUBBLE.y, 0);
  const ring = makeRing(VBUBBLE.y);
  g.add(ring, bubble); g.userData.lookBubble = bubble; g.userData.lookRing = ring;
  return g;
}

// 🔍 액션(Space·모바일 액션 버튼) 대상 — 텃밭에서 CATCH_R 안의 아직 안 살펴본 손님
export function visitorTarget() { return atFarm ? visitors?.target() || null : null; }
export function observeVisitor() { return visitors?.observe() || null; }

// 🌱 방문객 발밑 높이 — 밭 칸 위면 흙 윗면(≈0.2, js/duel/raid-art.js 실측), 아니면 텃밭 마당 윗면(0.15, 실측).
//   ⚠️ 2차 조형은 원점이 발바닥이라 이게 없으면 바닥에 묻힌다 — 날개를 눕힌 🦋 는 더듬이만 남았다(2026-09-29).
export function visitorGroundY(x, z) {
  const SOIL_TOP = 0.2, YARD_TOP = 0.15;
  return plots.some(p => Math.abs(p.x - x) < FARM_CELL / 2 && Math.abs(p.z - z) < FARM_CELL / 2) ? SOIL_TOP : YARD_TOP;
}

export function startVisitors() {
  visitors = createVisitors({
    group: farmGroup,
    origin: FARM,   // ⚠️ farmGroup 은 FARM(0,0,84) 에 놓여 있다 — 월드 좌표를 그대로 넣으면 z=168 허공에 뜬다
    makeMesh: makeVisitorMesh,
    cells: habitatCells,
    envAt: habitatEnvAt,
    matchVisitors,
    ctx: habitatCtx,
    playerPos: () => player.position,
    groundAt: visitorGroundY,
    onSpawn: (id) => trackEvent('visitor_spawn', { visitor: id, farm_stage: gameState.farm.stage }),   // [GA4] 퍼널 3단
    onDiscover: (id, mesh) => {
      if (mesh?.userData.lookBubble) mesh.userData.lookBubble.visible = false;   // 살펴봤다 — 말풍선을 거둔다
      Sound.blip();
      if (!gameState.dex.visitor?.[id]) {
        dexDiscover('visitor', id);   // 📖 등록 + 토스트 + 박물관 게이트 + 퀘스트 + GA4 를 한 번에
      } else {
        const v = visitorOf(id);      // 재방문 — "정원이 살아있다" 는 신호. 보상은 없다.
        ui.toast?.(`${v.ico} ${v.name}가 다시 찾아왔어요`, 1800);
      }
    },
  });
}

export function enterFarm() {
  $w.atFarm = true; $w.playerInYard = false;
  player.position.set(FARM.x, 0, FARM.z + farmHalf() - 1.5); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  firstHint('farmInside', '🌾', '내 텃밭', '⛏️괭이로 갈고 🌰씨앗 심고 💧물 주기\n심은 작물은 저장돼요. 나갈 땐 남쪽 문');
  startVisitors();   // 🦋 텃밭 체류 중에만 방문객이 뜬다
  Sound.blip(); trackEvent('enter_farm', { stage: gameState.farm.stage }); // [GA4] 밭 단계별 방문 분포
}

export function exitFarm() {
  visitors?.clear(); visitors = null;   // 🦋 ⚠️ setSpaceVisible 이 farmGroup 을 정리하기 전에 메시를 빼야 한다
  $w.atFarm = false;
  player.position.set(FARM_GATE.x, 0, FARM_GATE.z + 2);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('exit_farm'); // [GA4]
}
