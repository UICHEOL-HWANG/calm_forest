// =============================================================
//  ☕ 카페 — 채굴장처럼 처음부터 있는 장소. 홀에 앉은 손님에게 서빙
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-24).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, ANIMALS, ORES, RES_LABEL, WEATHER, analog, applyCosmetics, atCafe, atMuseum, cafeGuestCache, cafeGuestFetcher,
  cafeGuestObjs, cafeInGroup, camera, clayMat, colliders, cookTier, cosmeticShop, cropMini, dateHash, dexDiscover,
  disposeTree, dist2D, doPlayerAction, finishPetJob, firstHint, fishMesh, gameState, giveReward, houseWindows,
  keys, kitchenFinish, kitchenStart, lastZoneHint, makeCharacterPreview, makeNameTag, makeSignBoard, makeSignpost,
  mergeGeos, museumGroup, nearCafeBoard, nearCafeGuest, nearDoor, obstacles, pantryHas, pantryTake, pendingDish,
  petJob, player, refreshCollectQuests, refreshInventoryUI, removeSolid, renderer, requestSave, respawnPet,
  roundRect, scene, setFogExempt, setSpaceVisible, snapCamera, solidBox, solidCircle, spawnConfetti, spawnFloatText,
  spawnSparkle, syncBadges, syncStory, todayStr, triggerMoment, ui, usePet, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { buildAnimalHead } from '../animal-faces.js';
import { itemsOf } from '../cosmetics/catalog.js';
import { buy as buyCos, equip as equipCos, unequip as unequipCos } from '../cosmetics/equip.js';
import { CAFE_PAY, RECIPES } from '../data/catalog.js';
import { NPC_R } from '../data/character.js';
import { DEX } from '../data/dex.js';
import { CAFE, CAFE_BOARD, CAFE_BONUS, CAFE_GATE, CAFE_GUESTS, CAFE_HALF, CAFE_ORDERS, CAFE_SEATS, MUSEUM, MUSEUM_GATE, SELL_ICO_G, SHOP_POS, cafeGuestDef } from '../data/places.js';
import { CROP_TYPES } from '../data/tools.js';
import { PAL } from '../data/world.js';
import { MAX_HOUSE_STAGE } from '../house-cost.js';
import { MUSEUM_FLOORS, SPECIAL_EXHIBITS, exhibitCenterY, floorEntries, floorProgress, openFloors, viewFrame } from '../museum.js';
import { buildMuseumExtras } from '../museum/extras.js';
import { PET_KINDS, PET_PRICE, emptyPet, stageOf, toNextStage } from '../pet/rules.js';
import { buildShop } from '../shop/building.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

//   기본은 날짜 시드 로컬 생성. setCafeGuestSource() 로 외부 생성기
//   (예: Gemini API)를 끼우면 매일 다른 손님과 대사를 그대로 쓸 수 있다.
//   외부 생성기는 async 라서 결과가 올 때까지 로컬 손님으로 플레이가 이어지고,
//   도착하면 캐시에 담고 홀을 다시 그린다.
//   형식: [{ id, name, emoji, color, hat, recipeId, line, thanks }]
// 받침 유무로 조사를 고른다 — 요리 이름이 늘어날 때마다 "채소죽가 당기네요" 같은 문장이 나오던 걸 막는다.
//   한글 음절(가~힣)의 코드에서 (code-0xAC00)%28 이 0 이면 받침이 없다.
export function josa(word, withJong, noJong) {
  const c = (word || '').charCodeAt((word || '').length - 1);
  const hasJong = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return hasJong ? withJong : noJong;
}

export const CAFE_LINES = [
  (d) => `${d} 한 그릇 부탁드려요!`,
  (d) => josa(d, `오늘은 ${d}이 당기네요 😋`, `오늘은 ${d}가 당기네요 😋`),   // 문장을 통째로 갈라야 영어 번역에 조사가 안 남는다
  (d) => `${d}, 여기 향이 제일 좋더라고요.`,
  (d) => `기다렸어요! ${d} 주세요.`,
];

export const CAFE_THANKS = ['잘 먹을게요, 고마워요 ☕', '역시 이 맛이야! 또 올게요', '오늘 하루가 좋아졌어요 😊', '마을 최고의 카페예요!'];

// 🪣 플레이어 상태 버킷 — 대사를 사람에 맞추되 캐시가 터지지 않게 '유한한 칸' 으로 압축한다.
//   코인·도감 수 같은 값을 그대로 넘기면 사람마다 캐시 키가 달라져 Gemini 호출이 폭증한다.
//   집 단계를 고른 이유: 마을에서 가장 눈에 띄게 변하는 것이라 이웃이 말 붙이기 자연스럽다.
//   3칸뿐이라 (날짜×날씨×언어) 조합이 3배로 늘 뿐이다.
//   ⚠️ 값을 늘리거나 이름을 바꾸면 서버 화이트리스트도 같이 고쳐야 한다
//      (functions/api/cafe-guests.js · daily-quests.js · scripts/serve.py).
export function playerPhase() {
  const st = gameState.houseStage || 0;
  return st < 3 ? 'settling'                       // 아직 빈터에 집을 짓는 중
       : st < MAX_HOUSE_STAGE ? 'settled'          // 집을 완성하고 자리 잡음(증축 중 포함)
       : 'thriving';                               // 증축까지 마친 후반
}

export async function ensureCafeGuests() {
  const today = todayStr();
  if (!cafeGuestFetcher || cafeGuestCache?.date === today) return;
  try {
    const guests = await cafeGuestFetcher({
      date: today, count: CAFE_ORDERS, weather: WEATHER, phase: playerPhase(),
      recipes: cafeMenu().map(r => ({ id: r.id, name: r.name, ico: r.ico, cost: { ...r.cost } })),
      npcs: CAFE_GUESTS.map(n => ({ id: n.id, name: n.name, emoji: n.emoji })),   // ☕ 손님은 마을 주민이 아니라 별도 캐스트
    });
    if (Array.isArray(guests) && guests.length) {
      $w.cafeGuestCache = { date: today, guests };
      refreshCafeGuests();
      trackEvent('cafe_guests_generated', { count: guests.length });   // [GA4] 외부 생성 성공률
    }
  } catch (e) {
    console.warn('[cafe] 손님 생성기 실패 — 기본 손님으로 진행', e);   // 실패해도 플레이는 계속
  }
}

// 🥚 달걀 요리는 닭장을 지어야 만들 수 있으므로, 미보유 시 메뉴에서 제외(막히는 주문 방지)
export function cafeMenu() { return RECIPES.filter(r => !r.cost.egg || gameState.coop.built); }

// 로컬 기본 손님 — 날짜 시드라 하루 종일 고정, 자정에 새 손님.
//   캐스트 8명 > 하루 손님 4명이라 splice 만으로 **같은 손님이 두 자리에 앉는 일이 없다**.
export function localCafeGuests() {
  const menu = cafeMenu();
  const avail = [...CAFE_GUESTS];
  return Array.from({ length: CAFE_ORDERS }, (_, i) => {
    // 주문마다 독립된 날짜 해시 — LCG를 이어 돌리면 하위 비트 주기가 짧아 전부 같은 요리가 뽑혔었음
    const n = avail.splice(dateHash('cafe:npc:' + i) % avail.length, 1)[0];
    const r = menu[dateHash('cafe:menu:' + i) % menu.length];
    return {
      id: n.id, name: n.name, emoji: n.emoji, color: n.color, hat: n.hat, recipeId: r.id,
      line: CAFE_LINES[dateHash('cafe:line:' + i) % CAFE_LINES.length](r.name),
      thanks: CAFE_THANKS[dateHash('cafe:thx:' + i) % CAFE_THANKS.length],
    };
  });
}

// 오늘의 주문 — 외부 생성 손님이 있으면 그걸, 없으면 로컬 손님을 정규화해 반환
export function cafeOrders() {
  const st = gameState.cafe;
  const today = todayStr();
  if (st.date !== today) { st.date = today; st.done = []; st.bonus = false; }   // 새 날 → 주문 리셋
  const menu = cafeMenu();
  const raw = (cafeGuestCache?.date === today ? cafeGuestCache.guests : localCafeGuests()).slice(0, CAFE_ORDERS);
  const used = new Set();                                   // 같은 손님이 두 자리에 앉지 않게(외부 생성기가 중복을 줄 수 있다)
  return raw.map((g, i) => {
    // 🥚 오믈렛처럼 아직 못 만드는 메뉴를 주문했으면 만들 수 있는 메뉴로 대체
    const recipe = menu.find(r => r.id === g.recipeId) || menu[i % menu.length];
    // 외형(이름·이모지·색·귀·소품)은 항상 게임의 손님 캐스트가 기준.
    // 외부 생성기(Gemini)는 id·주문·대사만 주면 되고, 나머지는 여기서 채운다.
    let base = cafeGuestDef(g.id);
    if (!base || used.has(base.id)) base = CAFE_GUESTS.find(c => !used.has(c.id)) || CAFE_GUESTS[i % CAFE_GUESTS.length];
    used.add(base.id);
    return {
      i, id: base.id, name: base.name, emoji: base.emoji,
      color: base.color, hat: base.hat, ear: base.ear, acc: base.acc, recipe,
      line: g.line || CAFE_LINES[0](recipe.name), thanks: g.thanks || CAFE_THANKS[0],
      done: st.done.includes(i),
    };
  });
}

// 아치(직사각형 + 반원) 를 +z 로 depth 만큼 돌출 — 카페 문·창.
//   js/house/cottage.js 의 arch() 와 같은 문법(폭 w, 사각 높이 hRect, 위는 반지름 w/2 반원).
export function archGeo(w, hRect, depth) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, hRect);
  s.absarc(0, hRect, w / 2, 0, Math.PI, false); s.lineTo(-w / 2, 0);
  return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
}

// 벽에 붙이는 캔버스 글자 명판(어두운 판 + 밝은 글자) — 카페 CAFE 사인.
//   ⚡ 판 테두리까지 캔버스에 그려서 평면 1장·재질 1개로 끝낸다(상자로 만들면 옆면 재질이 붙어 2드로우콜).
export function makeWallPlate(text, w, h) {
  const W = 384, H = Math.round(W * h / w);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#332f2b'; c.fillRect(0, 0, W, H);
  c.strokeStyle = '#6e675e'; c.lineWidth = 10; c.strokeRect(14, 14, W - 28, H - 28);
  c.fillStyle = '#f2ede3'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = `bold ${Math.round(H * 0.46)}px Georgia, "Times New Roman", serif`;
  c.fillText(text, W / 2, H / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
}

//   조형 검수: sims/museum-interior-sim.html
//   ▶ 1층 13칸 = 🌾작물7 · 🐟물고기3 · ⛏️광물3. 구역은 바닥 러그로 나눈다.
//   ▶ ⚡ 최적화 셋: ① 재질별 병합(메시 수 = 재질 수)
//      ② **미획득은 유리장도 전시물도 만들지 않는다** — 천만 덮어 둔다(그게 곧 목표 표시)
//      ③ 전시물은 종마다 색이 달라 재질을 따로 만들면 13종이 13콜이 된다 →
//         색을 **정점에 실어** 한 재질(vertexColors)로 묶는다
//   ▶ 명판 글자는 3D 텍스처가 아니라 HUD 패널이다(칸마다 캔버스를 만들면 그게 곧 드로우콜).
export const MUSEUM_HALF_W = 7.5, MUSEUM_HALF_D = 6.5, MUSEUM_H = 3.2;

// 구역 러그 — 카테고리마다 색을 달리해 경계가 읽히게. 층마다 카테고리가 다르므로 순서대로 돌려 쓴다
export const MUSEUM_ZONES = [
  { key: 'rugA', color: 0xb8cfa8 }, { key: 'rugB', color: 0xa8c4d8 },
  { key: 'rugC', color: 0xcbc0ad }, { key: 'rugD', color: 0xd8c0c8 },
];

// 전시물 기본색 — 아직 전용 조형이 없는 카테고리(임시). ORES·CROP_TYPES 에 없는 것들이 여기로 온다
export const MUSEUM_CAT_TINT = { forage: 0xc07a4a, bug: 0xd9c14a, dig: 0x8a6a4a, track: 0x9a8f80,
  river: 0x5f9ec8, spirit: 0xb8a8d8, weather: 0xa8c4d8, npc: 0xd9a06a, cook: 0xe0a05a, visitor: 0x8fbf6a };

export const DEX_CAT_LABEL = { crop: '🌾 작물', fish: '🐟 물고기', ore: '⛏️ 광물', forage: '🍄 채집물',
  bug: '🌟 반딧불이', dig: '🪏 땅속', track: '🐾 흔적', river: '🛶 강', spirit: '🌫️ 정령',
  weather: '🌦️ 날씨', npc: '🧑 주민', cook: '🍳 요리', visitor: '🦋 방문객' };

export let museumFloor = 1;

// 이 층에 전시할 목록 — 카테고리 순서대로 러그 구역이 갈린다
export function museumFloorItems(floor = museumFloor) {
  const def = MUSEUM_FLOORS.find(f => f.id === floor);
  if (!def) return [];
  return floorEntries(floor, DEX).map(e => ({ ...e, zone: def.cats.indexOf(e.cat) % MUSEUM_ZONES.length }));
}

// 🏛️ 전시물 메시 — **게임에서 실제로 쓰는 조형을 그대로 쓴다.**
//   🌾작물은 수확 때 머리 위로 드는 cropMini, 🐟물고기는 낚시 때의 fishMesh,
//   ⛏️광물은 광맥과 같은 다면체. 도감에 등록한 그것이 그대로 전시되어야 "내 것" 으로 읽힌다.
export function museumExhibitMesh(item) {
  if (item.cat === 'crop') return cropMini(CROP_TYPES.find(c => c.id === item.id));
  if (item.cat === 'fish') return fishMesh(item.id);   // common / uncommon / rare 가 곧 등급 키다
  // ⚠️ 2·3층 카테고리(🍄채집·🌟반딧불이·🪏땅속·🐾흔적·🛶강·🌫️정령·🌦️날씨·🧑주민)는
  //    ORES 에 없다. 폴백이 없으면 **2층에 들어가는 순간 undefined.color 로 터진다.**
  const ore = ORES.find(o => o.id === item.id);
  const tint = ore ? ore.color : (MUSEUM_CAT_TINT[item.cat] ?? 0xcfc8b8);
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(item.id === 'gem' ? 0.2 : 0.24, 0),
    item.id === 'gem'
      ? new THREE.MeshStandardMaterial({ color: tint, roughness: 0.25, metalness: 0.1, flatShading: true })
      : clayMat(tint));
  m.castShadow = true; g.add(m);
  return g;
}

// 진열장 자리 — 좌우 벽 5칸씩 + 안쪽 3칸. [x, z, 바라보는 방향]
export function museumSlots(count = 13) {
  const out = [];
  const side = Math.min(5, Math.ceil((count - 3) / 2));   // 안쪽 벽 3칸을 빼고 좌우로 나눈다
  //   ⚠️ 간격이 좁으면 진열장 다섯이 한 덩어리로 읽힌다 — 받침 폭 0.95 의 두 배 이상 띄운다.
  const step = side > 1 ? 8.8 / (side - 1) : 0, z0 = -4.4;
  for (let i = 0; i < side; i++) out.push([-MUSEUM_HALF_W + 1.2, z0 + i * step,  Math.PI / 2]);
  for (let i = 0; i < side; i++) out.push([ MUSEUM_HALF_W - 1.2, z0 + i * step, -Math.PI / 2]);
  const back = Math.min(3, count - out.length);
  for (let i = 0; i < back; i++) out.push([(i - (back - 1) / 2) * 2.6, -MUSEUM_HALF_D + 1.2, 0]);
  // 🏛️ 중앙 아일랜드 — 벽면(좌우 5+5 · 뒷벽 3 = 13)으로 모자라면 가운데 진열대가 받는다.
  //   ⚠️ 예전엔 남는 것을 뒷벽 한 줄에 계속 늘어놓아, 3층 31칸 중 16칸이 벽 밖 허공에 떴다.
  //      이동 제한 밖이라 명판도 못 읽는 "있지만 볼 수 없는" 전시물이 됐다.
  let rest = count - out.length;
  if (rest > 0) {
    const cols = Math.min(3, rest), rows = Math.ceil(rest / cols);
    const cw = 2.3, rh = rows > 1 ? Math.min(1.65, 8.4 / (rows - 1)) : 0;
    const z0i = -(rows - 1) * rh / 2 + 0.6;
    for (let r = 0; r < rows && rest > 0; r++) {
      for (let c = 0; c < cols && rest > 0; c++, rest--) {
        out.push([(c - (cols - 1) / 2) * cw, z0i + r * rh, r % 2 ? Math.PI : 0]);
      }
    }
  }
  return out.slice(0, count);
}

export let museumCases = [];

export let museumColliders = [];

export let museumStairs = [];

export let museumExtraSpots = [];

// 🏛️ 진열장 앞에 서면 뜨는 명판. dex 의 **첫 발견 시각**을 쓴다 —
//   그래야 남의 도감이 아니라 "내 기록" 이 된다(지금 그 값은 아무 데도 안 쓰이고 있었다).
export let _museumNear = -1;

export function museumPlateText() {
  let best = 9e9, hit = -1;
  for (const c of museumCases) {
    const d = dist2D({ x: MUSEUM.x + c.x, z: MUSEUM.z + c.z }, player.position);
    if (d < best) { best = d; hit = c.i; }
  }
  if (best > 1.9) hit = -1;
  // ✨ 특별 진열대가 더 가까우면 그쪽 명판(확대 관람은 벽 진열장만 — _museumNear 를 비운다)
  let bestX = 9e9, spot = null;
  for (const sp of museumExtraSpots) {
    const d = dist2D({ x: MUSEUM.x + sp.x, z: MUSEUM.z + sp.z }, player.position);
    if (d < bestX) { bestX = d; spot = sp; }
  }
  if (spot && bestX <= 1.6 && bestX < best) { _museumNear = -1; return museumExtraPlate(spot); }
  _museumNearExtra = null;
  if (hit < 0) { _museumNear = -1; return null; }
  const item = museumFloorItems()[hit]; if (!item) return null;
  const zone = DEX_CAT_LABEL[item.cat] || '';
  const at = gameState.dex[item.cat]?.[item.id];
  if (hit !== _museumNear) {   // 같은 진열장 앞에 서 있는 동안 이벤트를 쏟지 않는다
    _museumNear = hit;
    trackEvent('museum_exhibit_view', { item: item.id, cat: item.cat, got: at ? 1 : 0 });   // [GA4] 어떤 진열장 앞에 서는가
  }
  if (!at) return `🎀 ${zone} — 아직 덮여 있어요. 찾아오면 천을 걷을게요`;
  const d = new Date(at);
  return `${item.ico} ${item.name} — ${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일, 당신이 처음 발견했어요`;
}

// ✨ 특별 진열대 명판
export let _museumNearExtra = null;

export function museumExtraPlate(spot) {
  const key = spot.kind + ':' + spot.id;
  if (key !== _museumNearExtra) { _museumNearExtra = key; trackEvent('museum_exhibit_view', { item: spot.id, cat: 'special', got: gameState.museum.special[spot.id] ? 1 : 0 }); }
  const def = SPECIAL_EXHIBITS.find(d => d.id === spot.id); if (!def) return null;
  const rec = gameState.museum.special[def.id];
  if (!rec) return `🎀 ${def.ico} ${def.name} — 그런 날을 기다려 보세요`;   // 🌐 글루 패턴은 js/i18n-en.js 박물관 블록
  const e = DEX[def.cat]?.find(x => x.id === rec.id), d = new Date(rec.at);
  return `${def.ico} ${def.name} — ${e?.ico || ''} ${e?.name || rec.id}, ${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// 🔍 전시물 관람 — 진열장 앞에서 액션을 누르면 크게 띄워 돌려 본다.
//   ⚠️ 진열장 안 메시를 쓰지 않고 **새로 하나 만든다.** 원본을 옮기면 돌아올 때 자리·크기를
//      되돌려야 하고, 관람 중 전시실을 다시 지으면 참조가 끊긴다.
export let museumView = null;

export const MUSEUM_VIEW_FILL = 0.76;

// 🏛️ 전시실 조명 — 한 곳에서 (updateDayNight 이 시간대를 덮어쓴다). 검수는 window.__museumLight 로 값을 바꿔 가며 비교.
export const MUSEUM_LIGHT = { hemi: 0.7, amb: 0.55, sun: 0.95, tint: 0xfff2e2, sunTint: 0xfff4e4, player: 0.4, fog: 0xefe3ce, near: 26, far: 72 };

// 🔍 확대 프레이밍 — 화면에서 UI 를 뺀 빈 영역을 재어 museum.js 의 viewFrame 에 넘긴다(계산은 거기 순수 함수).
//   ⚠️ 거리 2.0 · 시선 -0.55 로 고정돼 있었는데, 폰 세로(특히 🔵 앱인토스: 위에 네이티브 ···✕
//      여백 52px 이 더 붙는다)에서는 그 자리가 상단 HUD 뒤였다 — 포도처럼 큰 전시물은 머리가
//      화면 밖으로 잘렸다(제보 2026-09-21).
export const _mvBox = new THREE.Box3(), _mvSize = new THREE.Vector3(), _mvCenter = new THREE.Vector3(), _mvOrigin = new THREE.Vector3();

export function museumViewFrame(mesh) {
  const H = renderer.domElement.clientHeight || window.innerHeight || 1;
  const bottomOf = (id, def) => { const el = document.getElementById(id); const r = el && el.getBoundingClientRect(); return r && r.height ? r.bottom : def; };
  // 위: 화면 폭을 가로지르는 상단 두 패널(🎒자원 HUD 가 있는 #topright 가 보통 더 깊다) 아래.
  //     토스 ···✕ 여백은 --top-inset 으로 이미 이 패널들에 반영돼 있다.
  const top = Math.max(bottomOf('topleft', H * 0.12), bottomOf('topright', H * 0.12)) + 10;
  // 아래: 명판(설명)·돌아가기 줄 위까지. 조이스틱은 좌우 구석이라 걸쳐도 읽힌다.
  //   ⚠️ #zone-prompt 는 bottom 이 .15s 트랜지션이라 rect 가 한 박자 늦다 — layoutPrompts 가 넣은
  //      **목표값**(인라인 style.bottom)이 있으면 그걸 쓴다. 없으면(혼자 뜬 경우) CSS 기본 자리.
  const promptTop = (id, def) => {
    const el = document.getElementById(id); if (!el || !el.offsetHeight) return def;
    const b = parseFloat(el.style.bottom);
    return Number.isFinite(b) ? H - b - el.offsetHeight : el.getBoundingClientRect().top;
  };
  const bot = H - Math.min(promptTop('zone-prompt', H * 0.74), promptTop('door-prompt', H * 0.78)) + 10;
  // 크기는 상자의 반치수로 — 바운딩 구(대각선의 절반)를 쓰면 네모난 전시물이 √3 배로 부풀어
  // 맞춘다고 한 것보다 한참 작게 그려진다. Y 축으로 도니 가로는 x·z 중 긴 쪽.
  //   ⚠️ 연 직후엔 월드 행렬이 갱신 전이라 로컬처럼, 220ms 뒤 재측정 땐 월드로 재져 값이 갈렸다 →
  //      먼저 갱신하고 받침(그룹) 높이를 빼 늘 상대값으로 쓴다(exhibitCenterY).
  mesh.updateWorldMatrix(true, true);
  _mvBox.setFromObject(mesh); _mvBox.getSize(_mvSize); _mvBox.getCenter(_mvCenter);
  const f = viewFrame({ h: H, top, bot, fov: camera.fov, aspect: camera.aspect,
    halfH: _mvSize.y / 2, halfW: Math.max(_mvSize.x, _mvSize.z) / 2, fill: MUSEUM_VIEW_FILL });
  f.cy = exhibitCenterY(_mvCenter.y, mesh.parent ? mesh.parent.getWorldPosition(_mvOrigin).y : 0);   // 원점이 시각 중심이 아닌 메시(잎이 위로 솟은 작물 등) 보정
  return f;
}

export function openMuseumView(i) {
  if (museumView) return;
  const item = museumFloorItems()[i];
  if (!item || !gameState.dex[item.cat]?.[item.id]) return;   // 천이 덮인 칸은 볼 게 없다
  const group = new THREE.Group();
  const mesh = museumExhibitMesh(item);
  mesh.scale.setScalar(1.25);                         // 손바닥만 한 것을 얼굴 크기로(화면 점유는 아래 museumViewFrame 이 거리로 맞춘다)
  group.add(mesh);
  // ⚠️ 캐릭터가 보는 쪽에 띄우면 벽을 뚫는다(진열장은 벽에 붙어 있다).
  //    **진열장에서 통로 쪽으로** 띄우고 카메라는 그보다 더 통로 안쪽에서 본다 — 방향과 무관하게 안전하다.
  // ⚠️ 층마다 칸 수가 다르다 — 13칸 기준으로 읽으면 3층에서 undefined 를 구조분해해 터진다
  const slot = museumSlots(museumFloorItems().length)[i];
  if (!slot) return;
  const [sx, sz, ry] = slot;
  const inward = ry === 0 ? [0, 1] : [ry > 0 ? 1 : -1, 0];
  group.position.set(MUSEUM.x + sx + inward[0] * 1.25, 1.75, MUSEUM.z + sz + inward[1] * 1.25);   // 명판(화면 중앙) 위로 띄운다
  scene.add(group);
  player.visible = false;   // 🔍 관람 중엔 캐릭터를 숨긴다 — 몸이 화면 절반을 가린다(1인칭처럼 물건만)
  museumView = { group, mesh, idx: i, spin: 0, inward, frame: null };
  const at = gameState.dex[item.cat][item.id], d = new Date(at);
  ui.setZoneHint?.(`${item.ico} ${item.name} — ${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일에 처음 발견`);
  ui.setDoorPrompt?.('🔙 돌아가기');
  museumView.frame = museumViewFrame(mesh);     // ⚠️ 프롬프트를 띄운 **뒤에** 재야 아래 여백이 실제 자리로 잡힌다
  setTimeout(() => { if (museumView && museumView.mesh === mesh) museumView.frame = museumViewFrame(mesh); }, 220);   // 프롬프트 줄이 앉은 뒤 한 번 더(트랜지션 .15s)
  Sound.blip();
  trackEvent('museum_view_open', { item: item.id, cat: item.cat });   // [GA4] 실제로 들여다보는가
}

export function closeMuseumView() {
  if (!museumView) return;
  scene.remove(museumView.group); disposeTree(museumView.group);
  museumView = null;
  player.visible = true;
  ui.setDoorPrompt?.(null); $w.lastZoneHint = null;
  Sound.blip();
}

// 좌우 입력으로 돌린다(모바일은 조이스틱 좌우). 손을 떼면 천천히 저절로 돈다 — 멈춰 있으면 사진 같다
export function updateMuseumView(dt) {
  if (!museumView) return;
  const { mx } = keys.moveAxes(false);
  const turn = mx + (analog.x || 0);
  museumView.spin = turn ? turn * 2.4 : museumView.spin * 0.92 + 0.35 * 0.08;
  museumView.mesh.rotation.y += museumView.spin * dt;
  museumView.mesh.rotation.x = Math.sin(museumView.mesh.rotation.y * 0.5) * 0.08;   // 살짝 기울여 입체감
}

export function buildMuseumHall() {
  const g = new THREE.Group(); g.position.copy(MUSEUM); g.visible = false;
  const MATS = {
    wall:  clayMat(0xf3e2c8, false), trim: clayMat(0xf2ece0, false),
    floor: woodMat(6, 6, 0xd9b98a),  stone: clayMat(0xcfc7b0, false),
    wood:  woodMat(4, 1, 0xb5834f),  dark: clayMat(0x6b5a46, false),
    cloth: clayMat(0xe4dccb, false),                       // 🎀 빈 칸을 덮은 천
    rugA:  clayMat(0xb8cfa8, false), rugB: clayMat(0xa8c4d8, false),
    rugC:  clayMat(0xcbc0ad, false), rugD: clayMat(0xd8c0c8, false),   // ⚠️ rugD 가 없으면 three 가 흰 MeshBasicMaterial 로 떨어진다(2층 🐾흔적·3층 🧑주민)
    glass: new THREE.MeshStandardMaterial({ color: 0xbfe3ea, roughness: 0.3, metalness: 0, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  };
  const parts = new Map();
  const exhibitMeshes = [];
  const add = (k, ...geos) => {
    const a = parts.get(k) || (parts.set(k, []), parts.get(k));
    for (const geo of geos) {
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      a.push(geo);
    }
  };
  const box = (w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); return b.translate(x, y, z); };
  const W = MUSEUM_HALF_W * 2, D = MUSEUM_HALF_D * 2, H = MUSEUM_H;

  add('floor', box(W, 0.2, D, 0, -0.1, 0));
  // ⚠️ 천장은 만들지 않는다 — 카메라가 41° 로 내려다보므로 천장을 덮으면 방 안이 통째로 가린다.
  //    집 실내(buildInterior)·☕카페 홀도 같은 이유로 천장이 없다(js/shadow-scope.js 주석 참고).
  add('trim',  box(W + 0.4, 0.18, 0.5, 0, H, -MUSEUM_HALF_D));   // 뒷벽 위 처마만 — 공간의 위쪽을 닫아 보이게
  add('wall',  box(W, H, 0.3, 0, H / 2, -MUSEUM_HALF_D));
  add('wall',  box(0.3, H, D, -MUSEUM_HALF_W, H / 2, 0));
  add('wall',  box(0.3, H, D,  MUSEUM_HALF_W, H / 2, 0));
  // 정면(입구 쪽) 벽 — 문 자리를 비우고 좌우만
  //   ⚠️ 정면(남쪽)은 낮은 난간만 — 카메라가 이쪽에서 41° 로 내려다보므로 벽을 세우면 방이 가린다
  const doorW = 2.8, side = (W - doorW) / 2, RAIL = 0.9;
  add('wall', box(side, RAIL, 0.3, -(doorW + side) / 2, RAIL / 2, MUSEUM_HALF_D));
  add('wall', box(side, RAIL, 0.3,  (doorW + side) / 2, RAIL / 2, MUSEUM_HALF_D));
  add('trim', box(side + 0.1, 0.12, 0.4, -(doorW + side) / 2, RAIL, MUSEUM_HALF_D));
  add('trim', box(side + 0.1, 0.12, 0.4,  (doorW + side) / 2, RAIL, MUSEUM_HALF_D));
  add('dark', box(doorW, 0.06, 1.1, 0, 0.02, MUSEUM_HALF_D - 0.2));   // 문턱(나가는 자리 표시)
  // 굽도리 + 벽 상단 띠
  for (const [x, z, w, d] of [[0, -MUSEUM_HALF_D + 0.2, W, 0.12], [-MUSEUM_HALF_W + 0.2, 0, 0.12, D], [MUSEUM_HALF_W - 0.2, 0, 0.12, D]]) {
    add('trim', box(w, 0.22, d, x, 0.11, z), box(w, 0.14, d, x, H - 0.45, z));
  }

  const items = museumFloorItems();
  const slots = museumSlots(items.length);
  // 구역 러그 — 벽을 세우면 방이 좁아 보인다. 바닥은 공간감을 안 해치면서 경계가 읽힌다
  slots.forEach(([x, z, ry], i) => {
    const zn = MUSEUM_ZONES[items[i].zone];
    const inward = ry === 0 ? [0, 1] : [ry > 0 ? 1 : -1, 0];
    add(zn.key, box(1.0, 0.03, 1.0, x + inward[0] * 0.95, 0.015, z + inward[1] * 0.95));
  });

  museumCases = [];
  // 🚧 이전 전시실의 충돌체를 걷어낸다 — 들어갈 때마다 다시 지으므로 안 지우면 계속 쌓인다
  for (const c of museumColliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
  museumColliders = [];
  slots.forEach(([x, z, ry], i) => {
    const item = items[i];
    const got = !!gameState.dex[item.cat]?.[item.id];
    museumCases.push({ x, z, i });
    add('stone', box(0.95, 0.12, 0.7, x, 0.9, z, ry));
    add('wood',  box(0.8, 0.85, 0.58, x, 0.46, z, ry));
    // 받침은 통과할 수 없다. 원으로 두면 모서리에 낄 수 있어 사각으로 — 명판 판정(1.9)은 그대로 닿는다.
    //   ⚠️ 벽 쪽으로 0.6 까지 덮어야 한다. 진열장은 벽에서 1.2, 이동 제한은 0.8 이라
    //      그냥 받침 크기(0.34)로 두면 그 사이 0.4 틈으로 진열장 뒤를 지나갈 수 있다.
    const hw = ry ? 0.6 : 0.5, hd = ry ? 0.5 : 0.6;
    museumColliders.push(solidBox(MUSEUM.x + x - hw, MUSEUM.z + z - hd, MUSEUM.x + x + hw, MUSEUM.z + z + hd));
    add('trim',  box(0.5, 0.14, 0.05, x + Math.sin(ry) * 0.32, 0.99, z + Math.cos(ry) * 0.32, ry));
    if (!got) {   // 🎀 "아직 없음" 이 아니라 "곧 열릴 전시" — 수집하면 천이 걷힌다
      add('cloth', box(0.9, 0.26, 0.66, x, 1.09, z, ry), box(0.78, 0.18, 0.54, x, 1.28, z, ry));
      return;
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const px = x + (ry ? sz * 0.25 : sx * 0.4), pz = z + (ry ? sx * 0.4 : sz * 0.25);
      add('trim', new THREE.CylinderGeometry(0.024, 0.024, 0.9, 5).translate(px, 1.41, pz));
    }
    add('glass', box(0.86, 0.88, 0.54, x, 1.41, z, ry));
    add('trim',  box(0.94, 0.07, 0.62, x, 1.88, z, ry));
    const ex = museumExhibitMesh(item);
    ex.position.set(x, 1.2, z); ex.rotation.y = ry + 0.5; ex.scale.setScalar(0.72);
    exhibitMeshes.push(ex); g.add(ex);   // 병합하지 않는다 — 실제 조형이라 재질이 제각각이고, 13개뿐이다
  });

  for (const [k, geos] of parts) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], MATS[k]);
    m.receiveShadow = true; g.add(m);
  }
  // 🪜 계단 — 열린 층이 둘 이상일 때만 놓는다. 위층은 북동, 아래층은 북서 구석
  const opened = openFloors(gameState.dex, DEX);
  museumStairs = [];
  const stair = (sx, up) => {
    const bx = sx * (MUSEUM_HALF_W - 1.5), bz = -MUSEUM_HALF_D + 1.6;
    for (let i = 0; i < 5; i++) add('stone', box(1.5, 0.22, 0.5, bx, 0.11 + i * 0.22, bz + i * 0.5));
    add('trim', box(1.7, 0.16, 0.2, bx, 0.11 + 5 * 0.22, bz + 5 * 0.5));
    museumStairs.push({ x: bx, z: bz + 1.2, up });
    museumColliders.push(solidBox(MUSEUM.x + bx - 0.85, MUSEUM.z + bz - 0.3, MUSEUM.x + bx + 0.85, MUSEUM.z + bz + 2.6));
  };
  if (museumFloor < opened) stair(1, true);
  if (museumFloor > 1) stair(-1, false);

  // ✨ 1층 가운데 — 조건부 전시 3칸. 조형은 js/museum/extras.js(규칙은 js/museum.js)
  museumExtraSpots = [];
  if (museumFloor === 1) {
    const ex = buildMuseumExtras({ clayMat, exhibitMesh: museumExhibitMesh, solidBox }, { origin: MUSEUM, special: gameState.museum.special });
    g.add(ex.group); museumExtraSpots = ex.spots; museumColliders.push(...ex.colliders);   // 충돌체는 다시 지을 때 같이 걷힌다
  }

  const lamp = new THREE.PointLight(0xfff3dc, 0.8, 26); lamp.position.set(0, H - 0.7, 0); g.add(lamp);
  scene.add(g);
  return g;
}

// 수집이 늘면 천이 걷힌다 — 전시실은 들어갈 때마다 다시 짓는다(13칸이라 싸다)
export function refreshMuseumHall() {
  if (museumGroup) { scene.remove(museumGroup); disposeTree(museumGroup); }
  $w.museumGroup = buildMuseumHall();
}

export function enterMuseum() {
  $w.atMuseum = true; setFogExempt(player, true);
  refreshMuseumHall();                                   // 그사이 채운 칸이 있으면 천이 걷혀 있다
  museumGroup.visible = true;
  player.position.set(MUSEUM.x, 0, MUSEUM.z + MUSEUM_HALF_D - 2.2); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  const { have, total } = floorProgress(museumFloor, gameState.dex, DEX);
  firstHint('museum', '🏛️', '박물관',
    `도감에 등록한 것이 전시돼요 (1층 ${have}/${total})\n🎀 천이 덮인 자리는 아직 못 찾은 것\n진열장 앞에 서면 설명이 떠요. 나갈 땐 남쪽 문`);
  Sound.blip();
  trackEvent('museum_enter', { floor: museumFloor, have, total, floors: openFloors(gameState.dex, DEX) });   // [GA4] 방문 빈도·수집률·열린 층
}

// 🪜 층을 옮긴다 — 방을 다시 짓고 반대편 계단 앞에 세운다
export function museumGoFloor(up) {
  const opened = openFloors(gameState.dex, DEX);
  const next = museumFloor + (up ? 1 : -1);
  if (next < 1 || next > opened) return;
  museumFloor = next;
  refreshMuseumHall(); museumGroup.visible = true;
  const back = museumStairs.find(st => st.up !== up) || { x: 0, z: 0 };
  player.position.set(MUSEUM.x + back.x, 0, MUSEUM.z + back.z + 1.4);
  _museumNear = -1; $w.lastZoneHint = null; snapCamera();
  const def = MUSEUM_FLOORS.find(f => f.id === museumFloor);
  const { have, total } = floorProgress(museumFloor, gameState.dex, DEX);
  ui.toast?.(`🏛️ ${def.name} — ${have}/${total}`);
  Sound.blip(); trackEvent('museum_floor', { floor: museumFloor, have, total });   // [GA4] 어느 층까지 올라가는가
}

export function exitMuseum() {
  closeMuseumView();
  museumFloor = 1;                 // 다음에 들어오면 1층부터
  $w.atMuseum = false; setFogExempt(player, false);
  if (museumGroup) museumGroup.visible = false;
  player.position.set(MUSEUM_GATE.x, 0, MUSEUM_GATE.z + 3.4);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null; _museumNear = -1;
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('museum_exit');
}

export let museumGateGroup = null, museumGateColliders = [], museumBuiltFloors = -1, museumAnnounced = 0;

// 🏗️ 층이 열리면 건물을 다시 세운다 — 밖에서 보고 "늘었다" 를 알 수 있어야 증축이 보상이 된다.
//   ⚠️ 충돌체도 같이 걷어내야 한다(colliders 는 전역이라 안 지우면 유령 벽이 쌓인다).
export function refreshMuseumGate(announce = false) {
  const opened = openFloors(gameState.dex, DEX);
  const f = Math.min(3, opened);   // 외관은 3층까지만 쌓는다(특별전은 별관 몫)
  // ⚠️ 알림·트래킹은 **원본 층수**로 본다 — min(3) 으로 보면 특별전이 열려도 조용히 지나간다
  if (opened > museumAnnounced) {
    const def = MUSEUM_FLOORS.find(d => d.id === opened);
    if (announce && museumAnnounced > 0) {
      ui.toast?.(`🏛️ 박물관이 ${def?.name || opened + '층'}까지 늘었어요! 가서 보세요`, 3600);
      trackEvent('museum_expand', { floor: opened });   // [GA4] 증축 퍼널 — 수집률 대비 실제 도달
    }
    museumAnnounced = opened;
  }
  if (f === museumBuiltFloors) return;
  museumBuiltFloors = f;
  if (museumGateGroup) {
    scene.remove(museumGateGroup); disposeTree(museumGateGroup);
    for (const c of museumGateColliders) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }
    const oi = obstacles.findIndex(o => o.x === MUSEUM_GATE.x && o.z === MUSEUM_GATE.z);
    if (oi >= 0) obstacles.splice(oi, 1);
  }
  museumGateColliders = [];
  museumGateGroup = spawnMuseumGate();
}

export function spawnMuseumGate() {
  const g = new THREE.Group(); g.position.copy(MUSEUM_GATE);
  const MATS = {
    wall:  clayMat(0xf3e2c8, false),   // 크림 벽 — ☕카페 실내와 같은 색
    trim:  clayMat(0xf2ece0, false),   // 흰 트림(아치·코니스·난간)
    roof:  clayMat(0x8a8f96, false),   // 슬레이트 지붕
    stone: clayMat(0xcfc7b0, false),   // 기단·계단
    dark:  clayMat(0x6b5a46, false),   // 아치 안쪽(입구 그늘)
    pot:   clayMat(0xc4764a, false),   // 화분
    leaf:  clayMat(0x5fa15f),          // 화분 잎(저폴리 느낌 유지)
  };
  const parts = new Map();
  const add = (k, ...geos) => { const a = parts.get(k); a ? a.push(...geos) : parts.set(k, [...geos]); };
  const box = (w, h, d, x, y, z, ry = 0) => { const b = new THREE.BoxGeometry(w, h, d); if (ry) b.rotateY(ry); return b.translate(x, y, z); };
  const archFrame = (w, h, d, t, x, y, z, ry = 0) => {
    const out = [], legH = h - w / 2, R = w / 2, seg = 10;
    const place = (geo, px, py) => { if (ry) geo.rotateY(ry); return geo.translate(ry ? x : px, py, ry ? py * 0 + z + (px - x) * Math.sign(ry) * 0 : z); };
    out.push(box(t, legH, d, x - w / 2 + t / 2, y + legH / 2, z, ry));
    out.push(box(t, legH, d, x + w / 2 - t / 2, y + legH / 2, z, ry));
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI * i / seg, a1 = Math.PI * (i + 1) / seg, am = (a0 + a1) / 2;
      const len = 2 * R * Math.sin((a1 - a0) / 2) * 1.06;
      const b = new THREE.BoxGeometry(t, len, d);
      b.rotateZ(am);
      b.translate(Math.cos(am) * (R - t / 2), y + legH + Math.sin(am) * (R - t / 2), 0);
      if (ry) b.rotateY(ry);
      out.push(b.translate(x, 0, z));
    }
    return out;
  };  const W = 7.2, D = 5.4, FH = 3.0;            // 마을 건물 크기에 맞춘 한 층(☕카페 5.2 와 나란히)
  //   🏗️ 밖에서 보고 "늘었다" 를 알 수 있어야 증축이 보상이 된다 — 열린 층만큼 쌓는다(특별전 별관 제외)
  const floors = Math.min(3, openFloors(gameState.dex, DEX));

  // 기단 + 정면 계단
  add('stone', box(W + 1.2, 0.4, D + 1.2, 0, 0.2, 0));
  for (let i = 0; i < 3; i++) add('stone', box(3.4, 0.14, 0.5, 0, 0.4 - 0.14 * (i + 0.5), D / 2 + 0.4 + i * 0.5));

  // 벽 — 정면은 개구부를 위해 좌우 + 위 인방으로 나눈다(구멍을 뚫지 않고 조립한다)
  const openW = 2.2, side = (W - openW) / 2;
  for (let f = 0; f < floors; f++) {
    const y0 = 0.4 + f * FH;
    add('wall', box(W, FH, 0.3, 0, y0 + FH / 2, -D / 2));
    add('wall', box(0.3, FH, D, -W / 2, y0 + FH / 2, 0));
    add('wall', box(0.3, FH, D,  W / 2, y0 + FH / 2, 0));
    if (f === 0) {
      add('wall', box(side, FH, 0.3, -(openW + side) / 2, y0 + FH / 2, D / 2));
      add('wall', box(side, FH, 0.3,  (openW + side) / 2, y0 + FH / 2, D / 2));
      add('wall', box(openW, FH - 2.4, 0.3, 0, y0 + FH - (FH - 2.4) / 2, D / 2));
    } else {   // 위층 정면은 아치창 둘
      add('wall', box(W, FH, 0.3, 0, y0 + FH / 2, D / 2));
      for (const sx of [-1, 1]) {
        add('trim', ...archFrame(1.1, 1.8, 0.32, 0.16, sx * 1.7, y0 + 0.5, D / 2 + 0.02));
        add('dark', box(0.9, 1.7, 0.12, sx * 1.7, y0 + 0.5 + 0.85, D / 2 + 0.06));
      }
      add('trim', box(W + 0.5, 0.22, D + 0.5, 0, y0, 0));   // 층 경계 코니스
    }
  }

  // 아치 — ⚠️ 막대의 길이축을 그 자리의 접선에 맞춰야 한다(rotateZ(am)).
  //   π/2-am 으로 두면 꼭대기에서 막대가 수직으로 서서 아치가 톱니처럼 벌어진다(시안에서 겪었다).

  add('trim', ...archFrame(openW + 0.45, 2.4, 0.4, 0.24, 0, 0.4, D / 2 + 0.02));
  add('dark', box(openW + 0.2, 2.3, 0.14, 0, 0.4 + 1.15, D / 2 + 0.06));
  for (const sx of [-1, 1]) {
    add('trim', ...archFrame(1.1, 1.8, 0.32, 0.16, sx * 2.35, 0.9, D / 2 + 0.02));
    add('dark', box(0.9, 1.7, 0.12, sx * 2.35, 0.9 + 0.85, D / 2 + 0.06));
  }
  // 코니스 + 평지붕 파라펫
  const TOP = 0.4 + floors * FH;
  add('trim', box(W + 0.6, 0.26, D + 0.6, 0, TOP, 0));
  add('roof', box(W + 0.9, 0.28, D + 0.9, 0, TOP + 0.27, 0));
  add('trim', box(W + 1.0, 0.4, 0.2, 0, TOP + 0.6, D / 2 + 0.45));

  // 입구 화분
  for (const sx of [-1, 1]) {
    add('pot', new THREE.CylinderGeometry(0.3, 0.26, 0.44, 8).translate(sx * 1.85, 0.62, D / 2 + 0.75));
    add('leaf', new THREE.IcosahedronGeometry(0.44, 0).translate(sx * 1.85, 1.16, D / 2 + 0.75));
  }

  for (const [k, geos] of parts) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], MATS[k]);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  const plate = makeWallPlate('MUSEUM', 1.5, 0.6);
  plate.position.set(0, 0.4 + FH - 0.36, D / 2 + 0.08); g.add(plate);   // 명판은 늘 1층 문 위
  g.add(makeSignpost('🏛️ 박물관', -4.3, 1.6));
  scene.add(g);
  obstacles.push({ x: MUSEUM_GATE.x, z: MUSEUM_GATE.z, r: 3.2 });
  // 🚧 벽은 사각으로 — 원으로 막으면 정면 문 앞에 설 수가 없다(카페와 같은 이유)
  museumGateColliders.push(solidBox(MUSEUM_GATE.x - W / 2 - 0.2, MUSEUM_GATE.z - D / 2 - 0.8, MUSEUM_GATE.x + W / 2 + 0.2, MUSEUM_GATE.z + D / 2));
  for (const sx of [-1, 1]) museumGateColliders.push(solidCircle(MUSEUM_GATE.x + sx * 1.85, MUSEUM_GATE.z + D / 2 + 0.75, 0.3));   // 화분
  return g;
}

export function spawnCafeGate() {
  const g = new THREE.Group(); g.position.copy(CAFE_GATE);
  // ⚡ 드로우콜 — 카페는 한 번 세우면 안 움직이는 정적 건물이라, 파츠를 따로 Mesh 로 두지 않고
  //    "같은 재질끼리 지오메트리를 합쳐" 재질 수 = 드로우콜 수가 되게 한다(합치기 전 30개 → 8개).
  //    그래서 색은 일부러 7가지로 묶었다(문틀·창턱·계단·옥상면·화분·손잡이는 모두 LIGHT 한 색).
  const MATS = {
    white: clayMat(0xfaf8f4, false),   // 회벽·처마·파라펫 (매끈하게 — 아치가 각지지 않도록)
    trim: clayMat(0x3c3936, false),    // 걸레받이·창틀·창살·차양·칠판의 짙은 회색
    stone: clayMat(0xd4cfc6, false),   // 포석·화단 석재
    light: clayMat(0xeceadf, false),   // 문틀·창턱·계단·옥상면·화분·손잡이
    green: clayMat(0x8fd6a0),          // 덤불·잎 (저폴리 느낌 유지 위해 flatShading)
    brown: clayMat(0x6f5b46, false),   // 화단 흙·나무 줄기
    door: clayMat(0x63503d, false),    // 문짝(유일하게 따뜻한 갈색 — 시선이 문으로 가게)
  };
  const parts = new Map();                                    // 재질키 → 지오메트리 목록
  const add = (k, geo) => { const a = parts.get(k); a ? a.push(geo) : parts.set(k, [geo]); };
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const WZ = -1.2, FRONT = 0.8;                // 본채 중심 z · 정면 벽 z
  const BASE = 0.16;                           // 포석 두께(= 건물 바닥 높이)

  // 포석 바닥 — 건물보다 한 뼘 넓게 깔아 마당처럼 보이게
  add('stone', box(7.6, BASE, 5.8, 0, BASE / 2, -1.0));

  // 본채 + 짙은 걸레받이
  add('white', box(5.2, 2.75, 4.0, 0, BASE + 1.375, WZ));
  add('trim', box(5.3, 0.34, 4.1, 0, BASE + 0.17, WZ));

  // 평지붕 — 처마 슬래브 + 한 단 낮은 옥상면 + 네 변 파라펫(위에서 봐도 심심하지 않게)
  const TOP = BASE + 2.75;                     // 벽 윗면
  add('white', box(5.76, 0.28, 4.56, 0, TOP + 0.14, WZ));
  add('light', box(5.1, 0.08, 3.9, 0, TOP + 0.32, WZ));
  const RIM = TOP + 0.4;                       // 파라펫 중심 높이(처마 윗면 + 반)
  for (const [sx, sz, px, pz] of [[5.76, 0.2, 0, WZ + 2.18], [5.76, 0.2, 0, WZ - 2.18], [0.2, 4.56, 2.78, WZ], [0.2, 4.56, -2.78, WZ]]) {
    add('white', box(sx, 0.24, sz, px, RIM, pz));
  }

  // 아치문(문틀 + 문짝 + 문살 + 손잡이 + 디딤돌) — 남쪽(+z)을 향해 열림.
  //   문틀을 문짝보다 넉넉히 키워야 밝은 테두리가 보인다(같으면 검은 구멍처럼 읽힌다).
  add('light', archGeo(1.72, 1.24, 0.1).translate(0, BASE, FRONT - 0.02));
  add('door', archGeo(1.32, 1.12, 0.1).translate(0, BASE, FRONT + 0.04));
  for (const dx of [-0.32, 0.32]) add('trim', box(0.05, 1.55, 0.04, dx, BASE + 0.82, FRONT + 0.15));   // 문짝 세로 홈
  add('light', new THREE.SphereGeometry(0.06, 8, 6).translate(0.47, BASE + 1.0, FRONT + 0.16));
  add('light', box(1.9, 0.12, 0.55, 0, BASE + 0.06, FRONT + 0.42));

  // 아치창(정면 왼쪽) — 밤에 따뜻하게 빛나는 창(집 창문 시스템 재사용).
  //   ⚠️ 유리는 emissiveIntensity 를 밤마다 바꾸므로 합치지 않고 제 재질·제 메시로 둔다.
  const winMat = new THREE.MeshStandardMaterial({ color: 0xfff2c8, emissive: 0xffcf7a, emissiveIntensity: 0, roughness: 0.6 });
  houseWindows.push(winMat);
  const SILL = 0.62;
  const glass = new THREE.Mesh(archGeo(1.22, 0.94, 0.05), winMat);
  glass.position.set(-1.75, BASE + SILL + 0.06, FRONT + 0.05); g.add(glass);
  add('trim', archGeo(1.46, 1.02, 0.1).translate(-1.75, BASE + SILL, FRONT - 0.02));
  add('trim', box(0.05, 1.5, 0.05, -1.75, BASE + SILL + 0.8, FRONT + 0.09));            // 세로 창살
  for (const dy of [0.5, 1.05]) add('trim', box(1.18, 0.045, 0.05, -1.75, BASE + SILL + dy, FRONT + 0.09));
  add('light', box(1.62, 0.1, 0.26, -1.75, BASE + SILL, FRONT + 0.06));                 // 창턱
  // 창 위 짙은 차양(줄무늬 천 → 각진 캐노피)
  add('trim', box(2.1, 0.12, 0.82, 0, 0, 0).rotateX(-0.22).translate(-1.75, BASE + 2.28, FRONT + 0.34));
  add('trim', box(2.1, 0.22, 0.1, -1.75, BASE + 2.16, FRONT + 0.72));

  // 정면 오른쪽 석재 화단 — 낮은 담 + 흙 + 둥근 덤불.
  //   벽에 딱 붙이면 정면에서 건물에 먹히므로 문 쪽(+z)으로 한 걸음 끌어냈다.
  const PX = 3.05, PZ = FRONT + 0.15;
  add('stone', box(1.7, 0.56, 1.7, PX, BASE + 0.28, PZ));
  add('brown', box(1.5, 0.08, 1.5, PX, BASE + 0.58, PZ));
  for (const [dx, r, dz] of [[-0.38, 0.34, -0.3], [0.3, 0.4, 0.1], [-0.05, 0.3, 0.45]]) {
    add('green', new THREE.IcosahedronGeometry(r, 0).translate(PX + dx, BASE + 0.68 + r * 0.5, PZ + dz));
  }

  // 문 왼쪽 화분(흰 화분 + 가는 나무) · 작은 세움 칠판
  add('light', new THREE.CylinderGeometry(0.3, 0.24, 0.5, 10).translate(-2.6, BASE + 0.25, FRONT + 0.45));
  add('brown', new THREE.CylinderGeometry(0.05, 0.06, 0.6, 6).translate(-2.6, BASE + 0.78, FRONT + 0.45));
  for (const [r, y, dx] of [[0.3, 1.06, -0.12], [0.24, 1.32, 0.1]]) {
    add('green', new THREE.IcosahedronGeometry(r, 0).translate(-2.6 + dx, BASE + y, FRONT + 0.45));
  }
  // 세움 칠판은 창(x -2.48~-1.02)과 문(x ±0.86) 사이 빈자리에 — 창에 겹치면 창살이 지저분해진다
  for (const s of [-1, 1]) {
    add('trim', box(0.52, 0.72, 0.05, 0, 0, 0).rotateX(s * 0.17)
      .translate(-0.96 + s * 0.06, BASE + 0.36, FRONT + 0.82 + s * 0.08));
  }

  // 재질별로 한 덩어리씩 — 여기서 나오는 메시 수가 곧 카페 건물의 드로우콜 수다
  for (const [k, geos] of parts) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], MATS[k]);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }

  // CAFE 명판 — 참고 이미지는 옆벽이지만, 이 게임 카메라는 건물 정면(+z)만 본다.
  //   옆벽에 달면 평생 안 보이므로 문 오른쪽 정면 벽에 건다. 벽면(z=0.8)엔 살짝 띄워 z-fighting 회피.
  const plate = makeWallPlate('CAFE', 1.15, 0.62);
  plate.position.set(1.62, BASE + 1.72, FRONT + 0.06); g.add(plate);

  // 간판은 팻말로 세워 문 옆에 — 지붕에 가리지 않고 멀리서도 보이게
  g.add(makeSignpost('☕ 카페', -3.85, 1.5));
  scene.add(g);
  obstacles.push({ x: CAFE_GATE.x, z: CAFE_GATE.z, r: 3.0 });
  // 🚧 건물 벽은 사각으로 — 원으로 막으면 남쪽 문 앞(z+1.3)에 설 수가 없다.
  //    벽 footprint: 가로 5.2, 세로 4.0, 중심 z-1.2 → 문이 있는 z+0.8 면까지만 막는다.
  solidBox(CAFE_GATE.x - 2.6, CAFE_GATE.z - 3.2, CAFE_GATE.x + 2.6, CAFE_GATE.z + 0.8);
  solidBox(CAFE_GATE.x + 2.2, CAFE_GATE.z + 0.1, CAFE_GATE.x + 3.9, CAFE_GATE.z + 1.8);   // 석재 화단
  solidCircle(CAFE_GATE.x - 2.6, CAFE_GATE.z + 1.25, 0.34);                                // 문 왼쪽 화분
  solidCircle(CAFE_GATE.x - 1.32, CAFE_GATE.z + 1.58, 0.3);                                // 세움 칠판
}

// 🏪 꾸미기 가게 — 조형은 js/shop/building.js(시뮬 검수값). 여기는 배치·충돌만 한다.
//   ⚠️ 정면이 +Z 라 **회전하지 않는다** — camOffset(0,14,16) 고정이라 시선이 늘 −Z 고,
//      돌리는 순간 플레이어에게 뒤통수나 옆구리를 보이게 된다(카페·안개숲 입구와 같은 규칙).
export function spawnCosmeticShop() {
  const shopObj = buildShop(THREE, buildAnimalHead);
  shopObj.group.position.set(SHOP_POS.x, 0, SHOP_POS.z);
  scene.add(shopObj.group);
  $w.cosmeticShop = shopObj;
  solidCircle(SHOP_POS.x, SHOP_POS.z, 2.4);                          // 🚧 통과 못 함
  obstacles.push({ x: SHOP_POS.x, z: SHOP_POS.z, r: 2.4 });          // 밭 금지 + 주민이 가게를 뚫고 배회하지 않게
}

// 🎀 꾸미기 상점 — 목록은 카탈로그 순서 그대로(정렬의 단일 출처)
export const COS_TABS = [['head', '🎩 머리'], ['neck', '🧣 목'], ['back', '🎒 가방'], ['trail', '✨ 이펙트'], ['pet', '🐾 펫']];

export let cosTab = 'head';

//  🐾 펫 탭에서 **지금 보고 있는 종**. 실제 동행(gameState.pet)과 별개다 — 줄을 누르면 여기만 바뀐다.
export let petView = PET_KINDS[0].id;

//  ▶ 줄을 누르면 **안 사고** 입어만 본다. 사는 건 줄 끝의 버튼이다.
//  ▶ 패널을 닫으면 버린다 — 실제 장착(gameState.cosmetics)은 한 글자도 안 건드린다.
//  ▶ 프리뷰는 두 번째 WebGLRenderer 다. 컨텍스트를 아끼려고 **한 번 만들고 재사용**하되,
//    닫을 땐 rAF 를 세운다(stop) — 안 세우면 패널 뒤에서 계속 그린다.
export let cosPreview = null, cosTryOn = null;

export const cosView = () => cosTryOn || gameState.cosmetics;

export function tryOnCos(it) {
  const cur = cosView();
  const on = cur.equipped[it.slot] === it.id;
  cosTryOn = {                                    // 안 산 것도 입어 볼 수 있게 owned 에 얹는다(미리보기 한정)
    owned: [...new Set([...gameState.cosmetics.owned, it.id])],
    equipped: { ...cur.equipped, [it.slot]: on ? null : it.id },
  };
  cosPreview?.refresh(cosTryOn);
  drawCosMenu();
}

export function openCosPreview(canvas) {
  cosTryOn = null;
  petView = gameState.pet ? gameState.pet.kind : PET_KINDS[0].id;   // 🐾 열 때마다 데리고 다니는 종부터 보여 준다
  try {
    if (!cosPreview) cosPreview = makeCharacterPreview(canvas);
    cosPreview.start();
    cosPreview.resize();
    cosPreview.setAnimal(gameState.character || ANIMALS[0].id);
    cosPreview.refresh(null);
  } catch (err) { console.error('[cos-preview]', err); cosPreview = null; }
  drawCosMenu();
}

export function closeCosPreview() {
  cosTryOn = null;                 // 입어보던 건 버린다 — 실제로 장착한 모습으로 돌아간다
  cosPreview?.refresh(null);
  cosPreview?.stop();
}

// 🐾 펫 탭 — **종마다 따로 산다**(2026-09-23). 이름이 곧 선택지다 — 줄을 누르면 프리뷰가 그 종으로 바뀐다.
//   ⚠️ 한 줄만 깔면 "나머지는 해금이냐"는 오해가 난다(4종 확장의 이유다).
//   ⚠️ 문구를 `<span>…</span>` 안에 innerHTML 로 꽂지 않는다 — 한국어가 태그 안에 갇혀
//      사전 키(= 화면에 보이는 한국어 그대로)와 어긋난다. 노드로 만들어 넣는다.
export function drawPetTab(box) {
  const active = gameState.pet ? gameState.pet.kind : null;
  for (const k of PET_KINDS) {
    const mine = gameState.pets[k.id];
    const on = active === k.id;
    const row = document.createElement('div');
    row.className = 'sh-row' + (petView === k.id ? ' try' : '');
    row.onclick = () => { petView = k.id; drawCosMenu(); };      // 줄 = 미리보기(구매 아님 — 꾸미기의 "입어보기"와 같은 결)

    //  ⚠️ 한 줄에 이름+설명+버튼을 다 넣으면 폰(390px)에서 "1단계 · 다음까…" 로 잘린다 —
    //     잘리는 게 하필 제일 중요한 진행 숫자다. 이름과 설명을 **두 줄로 쌓는다**.
    const col = document.createElement('div');
    col.className = 'sh-col';
    const name = document.createElement('span');
    name.className = 'sh-name';
    name.textContent = `${k.ico} ${k.name}`;
    const info = document.createElement('span');
    info.className = 'sh-sub';
    if (mine) {
      const left = toNextStage(mine.works);
      info.textContent = left === null ? `${stageOf(mine.works) + 1}단계 · 다 자랐어요` : `${stageOf(mine.works) + 1}단계 · 다음까지 ${left}번`;
    } else {
      info.textContent = k.blurb;
    }
    col.append(name, info);
    row.appendChild(col);

    const btn = document.createElement('button');
    btn.textContent = on ? '함께 있음' : mine ? '데려가기' : `${PET_PRICE.toLocaleString()}🪙`;
    btn.disabled = on;
    btn.onclick = (ev) => {
      ev.stopPropagation();                                       // 버튼은 사고/바꾸고, 줄은 미리보기 — 겹치지 않게
      if (on) return;
      //  ⚠️ 가게 패널은 오버레이라 **루프가 계속 돈다** — 맡긴 일이 끝나기 전에 종을 바꾸면
      //     finishPetJob 이 새로 데려온 펫에게 works 를 적립하고 쿨다운까지 건다(원래 일한 펫은 헛일).
      //     바꾸기 전에 지금까지 한 만큼을 **옛 펫에게** 정산하고 넘어간다.
      if (petJob) finishPetJob();
      if (!mine) {
        if (gameState.inventory.coins < PET_PRICE) { ui.toast?.('코인이 모자라요', 2000); return; }
        gameState.inventory.coins -= PET_PRICE;
        gameState.pets[k.id] = emptyPet(k.id);
        trackEvent('pet_buy', { pet_kind: k.id, price_coins: PET_PRICE, owned_n: Object.keys(gameState.pets).length });
      } else {
        trackEvent('pet_switch', { pet_kind: k.id, from_kind: active || 'none', stage: stageOf(mine.works) });
      }
      usePet(k.id); petView = k.id;
      respawnPet(); drawCosMenu(); requestSave();
    };
    row.appendChild(btn);
    box.appendChild(row);
  }
}

export function drawCosMenu() {
  document.getElementById('cos-coin').textContent = `🪙 ${gameState.inventory.coins.toLocaleString()}`;
  const tabs = document.getElementById('cos-tabs');
  tabs.innerHTML = '';
  for (const [id, label] of COS_TABS) {
    const b = document.createElement('button');
    b.className = 'sh-tab' + (cosTab === id ? ' active' : '');
    b.textContent = label;
    b.onclick = () => { cosTab = id; drawCosMenu(); };
    tabs.appendChild(b);
  }
  const box = document.getElementById('cos-items');
  box.innerHTML = '';
  //  🪞 프리뷰도 탭을 따라간다 — 펫 탭이면 펫을, 나머지 탭이면 내 캐릭터를 본다.
  //  ⚠️ 아직 안 샀으면 **다 자란 모습**을 건다(stageOf(Infinity) = 마지막 단계).
  //     1단계는 "씨앗 — 잎 1장" 이라 잎 하나 꽂힌 씨앗으로 읽히는데, 그걸 3,000🪙 짜리
  //     판매 화면에 걸어 두면 무엇을 사는지가 안 보인다. 사면 실제 내 펫 단계로 바뀐다.
  //  ⚠️ 안 산 종은 **다 자란 모습**을 건다(stageOf(Infinity) = 마지막 단계).
  //     1단계는 "씨앗 — 잎 1장" 이라, 그걸 3,000🪙 짜리 판매 화면에 걸어 두면 무엇을 사는지가 안 보인다.
  //     산 종이면 내 실제 단계를 건다.
  if (cosTab === 'pet') {
    const mine = gameState.pets[petView];
    cosPreview?.showPet(stageOf(mine ? mine.works : Infinity), petView);
  } else cosPreview?.showPet(null);
  if (cosTab === 'pet') { drawPetTab(box); return; }
  for (const it of itemsOf(cosTab)) {
    const owned = gameState.cosmetics.owned.includes(it.id);
    const on = gameState.cosmetics.equipped[it.slot] === it.id;
    const row = document.createElement('div');
    row.className = 'sh-row' + (cosView().equipped[it.slot] === it.id ? ' try' : '');
    row.innerHTML = `<span>${it.ico} ${it.name}</span>`;
    row.onclick = () => tryOnCos(it);                  // 🪞 줄 = 입어보기(구매 아님)
    const btn = document.createElement('button');
    btn.textContent = on ? '벗기' : owned ? '착용' : `${it.price.coins.toLocaleString()}🪙`;
    btn.onclick = (ev) => {
      ev.stopPropagation();                            // 버튼은 사고/입고, 줄은 입어보기 — 겹치지 않게
      if (on) gameState.cosmetics = unequipCos(gameState.cosmetics, it.slot);
      else if (owned) gameState.cosmetics = equipCos(gameState.cosmetics, it.id);
      else {
        const r = buyCos(gameState.cosmetics, gameState.inventory.coins, it.id);
        if (!r.bought) { ui.toast?.('코인이 모자라요', 2000); return; }
        gameState.cosmetics = equipCos(r.cos, it.id);      // 사면 바로 입힌다
        gameState.inventory.coins = r.coins;
        trackEvent('cosmetic_buy', { item_id: it.id, slot: it.slot, price_coins: it.price.coins, coins_after: r.coins });
      }
      trackEvent('cosmetic_equip', { item_id: it.id, slot: it.slot, action: on ? 'off' : 'on' });
      applyCosmetics(gameState.cosmetics);
      cosTryOn = null;                                 // 실제 장착이 바뀌었으니 입어보기는 버린다
      cosPreview?.refresh(null);
      drawCosMenu();
      requestSave();
    };
    row.appendChild(btn);
    box.appendChild(row);
  }
}

export function buildCafeHall() {
  const g = new THREE.Group(); g.position.copy(CAFE);
  const H = CAFE_HALF;
  // ⚡ 드로우콜 — 홀은 한 번 지으면 안 움직이는 정적 실내인데, 예전엔 파츠를 전부 따로 Mesh 로 뒀다
  //    (테이블 1세트가 14메시 × 4세트 + 컵 7 + 펜던트 9 …). ☕카페 외관과 같은 수법으로
  //    **색을 먼저 몇 가지로 묶고** 그 재질별로 지오메트리를 합친다 → 메시 수 = 재질 수.
  //    병합 예외는 둘 — 밤/낮으로 밝기가 바뀌는 창유리, 캔버스 글자 간판.
  const MATS = {
    floor:  woodMat(6, 6, 0xd9b98a),     // 바닥
    yard:   clayMat(PAL.ground, false),  // 앞마당 잔디
    stone:  clayMat(0xcfc7b0, false),    // 디딤돌
    wall:   clayMat(0xf3e2c8, false),    // 벽
    wood:   woodMat(4, 1, 0xb5834f),     // 카운터 몸체·선반
    light:  woodMat(4, 1, 0xe0c398),     // 카운터 상판
    table:  woodMat(1, 1, 0xe4c79c),     // 테이블 상판
    chair:  woodMat(1, 1, 0xc9a06a),     // 의자
    leg:    clayMat(0x8a6a4a),           // 다리(테이블·의자 공용)
    green:  clayMat(0x8fd6a0),           // 덤불·화초
    pot:    clayMat(0xc98a6a, false),    // 화분
    dark:   clayMat(0x5a4a40, false),    // 커피 머신·주전자·전등 코드
    rug:    clayMat(0xd08a7a, false),    // 러그(펜던트 갓과 색이 달라 합치지 않는다 — 합치면 바닥 색이 바뀐다)
    shade:  clayMat(0xe8a07a, false),    // 펜던트 갓
    cup:    clayMat(0xfff2e0, false),    // 컵
  };
  const parts = new Map();
  const add = (k, geo) => { const a = parts.get(k); a ? a.push(geo) : parts.set(k, [geo]); };
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  const cyl = (rt, rb, h, seg, x, y, z) => new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y, z);

  add('floor', box(H * 2, 0.2, H * 2, 0, 0.05, 0));
  add('rug', new THREE.CircleGeometry(3.4, 28).rotateX(-Math.PI / 2).translate(0, 0.16, 1.5));

  // ── 문 밖(카페 앞마당) ────────────────────────────────────
  //  장식이 아니라 카메라 때문에 반드시 있어야 하는 바닥이다. 카메라는 플레이어보다
  //  16 뒤·높이 14(세로 화각 42°)에 있어서, 남쪽 문 앞에 섰을 때 화면 맨 아래가
  //  벽 너머 7.1 유닛까지 비춘다. 바닥이 없으면 그만큼 안개색 허공이 뜬다.
  const YARD_D = 9;
  add('yard', box(H * 2 + 8, 0.14, YARD_D, 0, 0.03, H + YARD_D / 2));
  for (let i = 0; i < 5; i++) add('stone', cyl(0.5, 0.5, 0.08, 8, i % 2 ? 0.4 : -0.4, 0.12, H + 1.2 + i * 1.6));   // 현관 디딤돌
  for (const [bx, bz, s] of [[-4.2, 2.0, 0.6], [4.4, 2.4, 0.5], [-7.0, 5.2, 0.65], [6.6, 5.6, 0.55], [-2.0, 7.4, 0.45]])
    add('green', new THREE.IcosahedronGeometry(s, 0).translate(bx, s * 0.85, H + bz));             // 앞마당 덤불
  for (const px of [-2.4, 2.4]) {                                                                  // 문 옆 화분
    add('pot', cyl(0.34, 0.26, 0.5, 10, px, 0.37, H + 1.0));
    add('green', new THREE.IcosahedronGeometry(0.5, 0).translate(px, 0.95, H + 1.0));
  }

  // 벽 4면. 카메라가 있는 남쪽만 낮은 반벽 — 안쪽이 가려지지 않게(가운데는 출입구)
  const wall = (w, d, x, z, h = 3.4) => add('wall', box(w, h, d, x, h / 2, z));
  wall(H * 2, 0.4, 0, -H);
  wall(0.4, H * 2, -H, 0); wall(0.4, H * 2, H, 0);
  wall(H - 1.4, 0.4, -(H + 1.4) / 2, H, 1.0); wall(H - 1.4, 0.4, (H + 1.4) / 2, H, 1.0);

  // 카운터(북쪽) + 뒷선반 + 커피 머신 + 컵
  add('wood', box(9, 1.05, 1.0, 0, 0.55, -H + 2.2));
  add('light', box(9.4, 0.12, 1.3, 0, 1.14, -H + 2.2));
  add('wood', box(8, 0.14, 0.5, 0, 1.9, -H + 0.7));
  for (let i = 0; i < 7; i++) add('cup', cyl(0.14, 0.11, 0.26, 9, -3 + i, 2.1, -H + 0.7));
  add('dark', box(1.0, 0.8, 0.6, 3.2, 1.55, -H + 2.2));          // 커피 머신
  add('dark', cyl(0.22, 0.18, 0.3, 10, -3.2, 1.35, -H + 2.2));   // 주전자

  // 테이블 4세트(좌석 좌표와 짝) + 의자 두 개씩
  for (const [sx, sz] of CAFE_SEATS) {
    add('leg', cyl(0.11, 0.15, 0.68, 9, sx, 0.44, sz));
    add('table', cyl(0.85, 0.85, 0.12, 18, sx, 0.83, sz));
    for (const cz of [1.5, -1.5]) {
      add('chair', box(0.62, 0.1, 0.62, sx, 0.5, sz + cz));
      add('chair', box(0.62, 0.6, 0.09, sx, 0.8, sz + cz + (cz > 0 ? 0.28 : -0.28)));
      for (const ox of [-0.24, 0.24]) for (const oz of [-0.24, 0.24])
        add('leg', box(0.08, 0.5, 0.08, sx + ox, 0.25, sz + cz + oz));
    }
  }

  // 화분(홀 안)
  const POTS = [[-H + 1.4, H - 1.6], [H - 1.4, H - 1.6], [-H + 1.4, -H + 1.4]];
  for (const [px, pz] of POTS) {
    add('pot', cyl(0.34, 0.26, 0.5, 10, px, 0.3, pz));
    add('green', new THREE.IcosahedronGeometry(0.55, 0).translate(px, 0.95, pz));
  }

  // 📋 주문판(칠판) 기둥 · 펜던트 등의 코드와 갓
  add('leg', cyl(0.08, 0.1, 1.6, 6, CAFE_BOARD[0], 0.8, CAFE_BOARD[1]));
  const LAMPS = [[-5.5, 0], [0, -3], [5.5, 0]];
  for (const [lx, lz] of LAMPS) {
    add('dark', cyl(0.02, 0.02, 0.9, 5, lx, 3.0, lz));
    add('shade', new THREE.ConeGeometry(0.42, 0.4, 12).translate(lx, 2.45, lz));
  }

  // 재질별로 한 덩어리씩 — 여기서 나오는 메시 수가 곧 홀의 드로우콜 수다
  for (const [k, geos] of parts) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], MATS[k]);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }

  // ── 병합 예외 ──
  // 창문: 밤에 emissive 가 오르는 재질이라 한 재질에 묶되, 네 장은 지오메트리로 합친다(1콜)
  const winMat = new THREE.MeshStandardMaterial({ color: 0xdff0ff, emissive: 0xffd9a0, emissiveIntensity: 0.25, roughness: 0.4 });
  const wins = [[-H + 0.3, -4], [-H + 0.3, 4], [H - 0.3, -4], [H - 0.3, 4]]
    .map(([wx, wz]) => new THREE.BoxGeometry(0.12, 1.5, 2.2).translate(wx, 1.9, wz));
  g.add(new THREE.Mesh(mergeGeos(wins), winMat));
  // 전구: MeshBasic 이라 위 재질들과 못 섞인다. 셋을 합쳐 1콜로
  const bulbs = LAMPS.map(([lx, lz]) => new THREE.SphereGeometry(0.13, 8, 8).translate(lx, 2.25, lz));
  g.add(new THREE.Mesh(mergeGeos(bulbs), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })));
  // 💡 따뜻한 펜던트 빛 — 예전엔 등마다 PointLight 를 달았는데(3개), 실내 전체를 덮는 밝기라
  //    한 개로 줄여도 눈에 차이가 없고 모바일 셰이더 비용만 3분의 1이 된다.
  const hallLight = new THREE.PointLight(0xffd9a0, 5.2, 34, 1.2); hallLight.position.set(0, 2.6, -1); g.add(hallLight);
  // 캔버스 글자판(합치면 옆면 재질이 붙어 콜이 늘어난다)
  const board = makeSignBoard('📋 주문판'); board.scale.setScalar(0.6);
  board.position.set(CAFE_BOARD[0], 1.75, CAFE_BOARD[1] + 0.05); g.add(board);
  // 출구 팻말은 문 옆으로 — 문 가운데 띄우면(카메라가 남쪽이라) 문 앞에 선 캐릭터를 판이 가린다
  g.add(makeSignpost('🚪 나가기', 1.7, H - 0.55));

  // 🚧 홀 안 가구 충돌 — 카운터를 뚫고 들어가 서 있던 문제
  solidBox(CAFE.x - 4.75, CAFE.z - H + 1.5, CAFE.x + 4.75, CAFE.z - H + 2.9);   // 카운터
  CAFE_SEATS.forEach(([sx, sz]) => solidCircle(CAFE.x + sx, CAFE.z + sz, 0.9)); // 테이블
  POTS.forEach(([px, pz]) => solidCircle(CAFE.x + px, CAFE.z + pz, 0.4));       // 화분
  solidCircle(CAFE.x + CAFE_BOARD[0], CAFE.z + CAFE_BOARD[1], 0.3);             // 주문판 기둥(읽기 판정 2.2 는 그대로 닿음)
  scene.add(g); $w.cafeInGroup = g; cafeInGroup.visible = false;   // 홀에 있을 때만 표시
  setFogExempt(g, true);                                         // 홀은 안개 밖(바깥 풍경만 안개)
  refreshCafeGuests();
}

//    예전엔 서빙 1회마다 손님을 통째로 새로 만들고 disposeTree() 로 버렸는데,
//    그 때문에 손님에 공유 지오메트리·재질을 쓸 수 없었다(같이 해제돼 씬이 깨진다).
//    캐스트가 8명으로 고정이라 캐시가 무한정 커지지 않으니, 만들어 두고 visible 로만 여닫는다.
//    → dispose 가 사라져 **재질별 지오메트리 병합**을 손님에게도 쓸 수 있다(1명 15메시 → 4메시).
export const cafeGuestCastCache = new Map();

// 귀 모양 — 실루엣의 절반은 귀가 만든다(이름표를 못 읽는 거리에서 누군지 가르는 단서)
export function guestEarGeos(ear) {
  const g = [];
  const put = (geo, x, y, z, rz = 0) => { if (rz) geo.rotateZ(rz); g.push(geo.translate(x, y, z)); };
  for (const s of [-1, 1]) {
    if (ear === 'point')      put(new THREE.ConeGeometry(0.13, 0.3, 7),            s * 0.19, 1.52, 0, s * 0.22);
    else if (ear === 'round') put(new THREE.SphereGeometry(0.13, 9, 7),            s * 0.24, 1.44, 0);
    else if (ear === 'long')  put(new THREE.CapsuleGeometry(0.075, 0.34, 4, 8),    s * 0.15, 1.66, 0, s * 0.16);
    else                      put(new THREE.SphereGeometry(0.075, 8, 6),           s * 0.25, 1.38, 0);   // tiny
  }
  return g;
}

// 소품 — 귀와 짝지어 "이 색 + 이 실루엣 = 이 손님" 이 되게. 재질키(body/skin/accent/dark)별로 담는다
export function guestAccGeos(acc, add) {
  const box = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y, z);
  if (acc === 'scarf') {
    add('accent', new THREE.TorusGeometry(0.3, 0.075, 7, 14).rotateX(Math.PI / 2).translate(0, 1.02, 0));
    add('accent', box(0.16, 0.34, 0.1, 0.13, 0.85, 0.24));                        // 흘러내린 자락
  } else if (acc === 'beanie') {
    add('accent', new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.3, 0));
    add('accent', new THREE.TorusGeometry(0.34, 0.055, 7, 16).rotateX(Math.PI / 2).translate(0, 1.3, 0));
    add('accent', new THREE.SphereGeometry(0.08, 8, 6).translate(0, 1.68, 0));    // 방울
  } else if (acc === 'ribbon') {
    for (const s of [-1, 1]) add('accent', new THREE.SphereGeometry(0.11, 9, 7).scale(1, 0.72, 0.6).translate(s * 0.15, 1.56, 0));
    add('accent', new THREE.SphereGeometry(0.055, 8, 6).translate(0, 1.56, 0));
  } else if (acc === 'glasses') {
    for (const s of [-1, 1]) add('dark', new THREE.TorusGeometry(0.1, 0.022, 6, 14).translate(s * 0.12, 1.27, 0.29));
    add('dark', box(0.1, 0.02, 0.02, 0, 1.27, 0.3));
  } else if (acc === 'antler') {
    for (const s of [-1, 1]) {
      add('accent', new THREE.CylinderGeometry(0.03, 0.04, 0.34, 5).translate(s * 0.17, 1.6, -0.02));
      add('accent', new THREE.CylinderGeometry(0.024, 0.028, 0.2, 5).rotateZ(s * 0.7).translate(s * 0.27, 1.74, -0.02));
    }
  } else if (acc === 'cap') {
    add('accent', new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.32, 0));
    add('accent', box(0.44, 0.05, 0.3, 0, 1.33, 0.3));                            // 챙
  } else if (acc === 'spike') {
    for (let i = 0; i < 6; i++) {
      const a = -0.9 + i * 0.36;
      add('dark', new THREE.ConeGeometry(0.06, 0.22, 5).rotateX(-0.9).translate(Math.sin(a) * 0.3, 1.0 + Math.cos(a) * 0.12, -0.3));
    }
  } else {                                                                        // flower
    add('accent', new THREE.SphereGeometry(0.075, 8, 6).translate(0.2, 1.47, 0.12));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      add('accent', new THREE.SphereGeometry(0.055, 7, 6).translate(0.2 + Math.cos(a) * 0.1, 1.47 + Math.sin(a) * 0.1, 0.1));
    }
  }
}

// 손님 한 명 — 재질 4가지(몸·얼굴·소품·짙은색)로 병합해 메시 4개 + 눈 1개로 끝낸다
export function buildCafeGuestCast(def) {
  const g = new THREE.Group();
  const MATS = {
    body:   clayMat(def.color, false),
    skin:   clayMat(0xffe0c0, false),
    accent: clayMat(def.hat, false),
    dark:   clayMat(0x3a2f2a, false),
  };
  const parts = new Map();
  const add = (k, geo) => { const a = parts.get(k); a ? a.push(geo) : parts.set(k, [geo]); };
  add('body', new THREE.IcosahedronGeometry(0.44, 1).translate(0, 0.72, 0));       // 몸
  add('skin', new THREE.IcosahedronGeometry(0.33, 1).translate(0, 1.24, 0));       // 머리
  guestEarGeos(def.ear).forEach(geo => add('body', geo));                          // 귀는 몸 색(종 구분)
  guestAccGeos(def.acc, add);
  for (const ex of [-0.11, 0.11]) add('dark', new THREE.SphereGeometry(0.045, 8, 8).translate(ex, 1.27, 0.28));  // 눈
  for (const [k, geos] of parts) {
    const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], MATS[k]);
    m.castShadow = true; g.add(m);
  }
  const tag = makeNameTag(def);                       // 🏷️ 주문판의 이름 ↔ 자리 매칭(서빙은 사람을 맞혀야 한다)
  const tagY = new THREE.Box3().setFromObject(g).max.y + 0.28;
  tag.position.y = tagY; tag.visible = true; tag.material.opacity = 1;
  g.add(tag);
  return { group: g, tagY };
}

// 주문 말풍선 — 캔버스는 손님마다 하나만 두고 주문이 바뀔 때 **다시 그리기만** 한다(텍스처 재생성 없음)
export function paintOrderBubble(ctx, ico) {
  const c = ctx.c;
  c.clearRect(0, 0, 128, 128);
  c.fillStyle = 'rgba(255,255,255,0.94)'; roundRect(c, 10, 8, 108, 92, 22); c.fill();
  c.beginPath(); c.moveTo(54, 98); c.lineTo(74, 98); c.lineTo(62, 120); c.closePath(); c.fill();
  c.font = '58px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = '#000';
  c.fillText(ico, 64, 56);
  ctx.tex.needsUpdate = true;
}

export function cafeGuestCast(def) {
  let cached = cafeGuestCastCache.get(def.id);
  if (cached) return cached;
  const { group, tagY } = buildCafeGuestCast(def);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const ctx = { c: cv.getContext('2d') };
  ctx.tex = new THREE.CanvasTexture(cv);
  ctx.tex.minFilter = THREE.LinearFilter; ctx.tex.magFilter = THREE.LinearFilter; ctx.tex.generateMipmaps = false;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: ctx.tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.0, 1.0, 1.0);
  sprite.position.y = tagY + 0.76;                    // 🏷️ 이름표 위 — 주문 말풍선이 이름을 덮지 않게
  group.add(sprite);
  cached = { group, sprite, ctx, tagY };
  cafeGuestCastCache.set(def.id, cached);
  return cached;
}

// 오늘의 주문에 맞춰 홀의 손님을 다시 배치(입장·서빙·날짜 변경 후 호출).
//   캐스트는 버리지 않고 홀에서 떼어 두었다가 다시 붙인다 → GPU 자원이 쌓이지 않는다.
export function refreshCafeGuests() {
  if (!cafeInGroup) return;
  while (cafeGuestObjs.length) {
    const g = cafeGuestObjs.pop();
    cafeInGroup.remove(g.group);    // 버리지 않고 떼어만 둔다(캐스트 캐시가 계속 들고 있다)
    removeSolid(g.collider);        // 🚧 떠난 손님 자리에 안 보이는 벽이 남지 않게
  }
  cafeOrders().forEach((o, n) => {
    if (o.done) return;                                   // 서빙 끝난 손님은 이미 떠남
    const def = cafeGuestDef(o.id); if (!def) return;
    const [sx, sz] = CAFE_SEATS[n % CAFE_SEATS.length];
    const { group, sprite, ctx, tagY } = cafeGuestCast(def);
    paintOrderBubble(ctx, o.recipe.ico);                   // 주문이 바뀌면 말풍선만 다시 그린다
    group.position.set(sx, 0.16, sz + 1.5);               // 테이블 남쪽 의자에 앉음(의자 높이만큼 올림)
    group.rotation.y = Math.PI;                           // 테이블(북쪽)을 바라봄
    sprite.position.y = tagY + 0.76;
    cafeInGroup.add(group); setFogExempt(group, true);   // 손님도 홀과 같이 안개 밖
    // 🚧 손님도 통과 못 함(홀 좌표 → 월드 좌표). 서빙 사거리 2.4 엔 영향 없음
    const collider = solidCircle(CAFE.x + sx, CAFE.z + sz + 1.5, NPC_R);
    cafeGuestObjs.push({ order: o, group, sprite, collider, spriteY0: tagY + 0.76, phase: Math.random() * 6 });
  });
}

// 매 프레임 — 숨쉬기 + 말풍선 살랑임(홀에 있을 때만)
export function updateCafeGuests(dt, t) {
  if (!atCafe) return;
  for (const g of cafeGuestObjs) {
    g.group.position.y = 0.16 + Math.sin(t * 2 + g.phase) * 0.03;
    g.sprite.position.y = (g.spriteY0 ?? 2.62) + Math.sin(t * 2.6 + g.phase) * 0.08;
  }
}

// index.html(ui.openCafe)이 렌더할 주문판 데이터
export function cafeView() {
  const st = gameState.cafe;
  const inv = gameState.inventory;
  const orders = cafeOrders().map(o => ({
    i: o.i,
    npc: { id: o.id, name: o.name, emoji: o.emoji },
    recipe: { id: o.recipe.id, name: o.recipe.name, ico: o.recipe.ico },
    line: o.line,
    cost: Object.entries(o.recipe.cost).map(([k, v]) => ({ key: k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k, need: v, have: inv[k] || 0 })),
    pay: CAFE_PAY[o.recipe.id] || 30,
    done: o.done,
    ready: !o.done && Object.entries(o.recipe.cost).every(([k, v]) => (inv[k] || 0) >= v),
  }));
  return { orders, served: st.served || 0, allDone: orders.every(o => o.done), bonus: CAFE_BONUS };
}

export function enterCafe() {
  $w.atCafe = true; setFogExempt(player, true);   // 홀 안에선 캐릭터도 안개 밖
  refreshCafeGuests();                                   // 자정을 넘겼다면 새 손님으로
  ensureCafeGuests();                                    // 외부 생성기(등록됐다면) 비동기 갱신
  player.position.set(CAFE.x, 0, CAFE.z + CAFE_HALF - 3.2); player.rotation.y = Math.PI;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setZoneHint?.(null); $w.lastZoneHint = null;
  snapCamera(); setSpaceVisible();
  firstHint('cafeHall', '☕', '카페',
    '손님 머리 위 요리를 보고 재료 들고 다가가 액션\n📋 주문판에서 오늘 주문 확인\n나갈 땐 남쪽 문');
  Sound.blip(); trackEvent('enter_cafe');                // [GA4]
}

export function exitCafe() {
  $w.atCafe = false; setFogExempt(player, false);
  player.position.set(CAFE_GATE.x, 0, CAFE_GATE.z + 2.8);
  $w.nearDoor = null; ui.setDoorPrompt?.(null);
  snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('exit_cafe');                 // [GA4]
}

// ☕ 서빙 — 세 갈래로 갈린다:
//    ① 🧺 찬장에 그 요리가 있으면 → 미니게임 없이 즉시 서빙 (미리 만들어 둔 보람이 여기서 난다)
//    ② 재료가 있으면 → **손님 앞에서 코스 미니게임** → 끝나면 바로 서빙 (점수가 팁에 붙는다)
//    ③ 둘 다 없으면 → 부족 안내
export let cafeCooking = null;

export function serveCafeGuest(guest) {
  const o = guest?.order; if (!o) return;
  const st = gameState.cafe;
  if (st.done.includes(o.i)) { ui.toast?.('이미 서빙한 손님이에요'); return; }

  const stock = pantryTake(o.recipe.id);                          // ① 찬장에 있으면 꺼내서 바로
  if (stock) { finishCafeServe(guest, cookTier(stock.score), { fromPantry: true }); return; }

  const lack = Object.entries(o.recipe.cost).filter(([k, v]) => (gameState.inventory[k] || 0) < v);
  if (lack.length) {                                              // ③ 재료도 없음
    const need = Object.entries(o.recipe.cost).map(([k, v]) => `${SELL_ICO_G[k] || ''}${RES_LABEL[k] || k} ${gameState.inventory[k] || 0}/${v}`).join(' · ');
    ui.toast?.(`${o.recipe.ico} ${o.recipe.name} 재료가 부족해요 — ${need}`, 3200);
    return;
  }
  const started = kitchenStart(o.recipe.id, 'cafe');               // ② 그 자리에서 조리
  if (!started.ok) { ui.toast?.(started.msg || '재료가 부족해요'); return; }
  cafeCooking = { guest, recipeId: o.recipe.id };
  ui.startCookCourse?.(started);                                   // index.html 이 코스 미니게임을 연다
}

// ☕ 카페 조리 완료 — index.html 이 코스 결과를 넘겨준다. 등급을 그대로 서빙에 싣는다
export function cafeCookDone(res = {}) {
  const c = cafeCooking; cafeCooking = null;
  if (!c) return { ok: false };
  const fin = kitchenFinish(c.recipeId, res);                      // 등급·기록·트래킹(요리 도감도 여기서)
  $w.pendingDish = null;                                              // 손님에게 낸 요리라 먹기/보관 선택은 없다
  if (!fin.ok) return { ok: false };
  const tier = cookTier(fin.score);
  const served = finishCafeServe(c.guest, tier, { fromPantry: false, score: fin.score });
  return { ok: true, ...fin, cafe: served };
}

// ☕ 서빙 정산 — 코인·호감도·기록·연출. 등급이 좋을수록 팁이 붙는다
export function finishCafeServe(guest, tier, { fromPantry = false, score = null } = {}) {
  const o = guest.order;
  const st = gameState.cafe;
  const wx = guest.group.position.x + CAFE.x, wz = guest.group.position.z + CAFE.z;
  doPlayerAction(wx, wz);
  const base = CAFE_PAY[o.recipe.id] || 30;
  const pay = Math.round(base * tier.mult);                        // 💫 최고의 맛이면 1.5배 — "잘 만들면 더 받는다"
  giveReward({ coins: pay }, 'cafe_serve', o.recipe.id);           // [원장] 서빙 수입
  st.done.push(o.i);
  st.served = (st.served || 0) + 1;
  const aff = gameState.affinity[o.id] = (gameState.affinity[o.id] || 0) + (tier.id === 'perfect' ? 2 : 1);   // ❤️ 접객으로도 친해짐
  refreshInventoryUI();
  dexDiscover('cook', o.recipe.id);                               // 📖 요리 도감(만들어 낸 셈)
  dexDiscover('npc', o.id);                                       // 📖 손님 도감 — 대접한 손님이 채워짐
  refreshCollectQuests();                                         // 🦉 데일리 의뢰(진행도는 오늘 서빙한 손님 수에서 읽는다)
  Sound.harvest();
  spawnFloatText(wx, 2.6, wz, `${o.recipe.ico} ${o.thanks}`, '#c9682a');
  spawnSparkle(wx, 1.6, wz, tier.id === 'perfect' ? 26 : 16);
  triggerMoment();
  $w.nearCafeGuest = null;
  refreshCafeGuests();                                            // 만족한 손님은 자리를 뜸
  trackEvent('cafe_serve', { recipe: o.recipe.id, npc: o.id, pay, quality: tier.id, score,
    from_pantry: fromPantry ? 1 : 0, served_total: st.served, affinity: aff });   // [GA4] 접객 루프 KPI
  syncStory();                                                    // 📖 3장(마을의 맛) 진행
  const complete = st.done.length >= CAFE_ORDERS && !st.bonus;
  if (complete) {                                                 // 🎉 오늘 영업 완주
    st.bonus = true;
    giveReward({ coins: CAFE_BONUS }, 'cafe_bonus', st.date);
    spawnConfetti(player.position.x, 2.4, player.position.z); Sound.complete();
    ui.toast?.(`🎉 오늘 손님을 모두 대접했어요! 보너스 🪙+${CAFE_BONUS} — 내일 새 손님이 와요`, 3400);
    trackEvent('cafe_complete', { served_total: st.served });     // [GA4] 데일리 완주율
  } else {
    ui.toast?.(fromPantry
      ? `${o.recipe.ico} ${o.name}에게 🧺 찬장의 ${o.recipe.name} 서빙! ${tier.ico} 🪙+${pay} ❤️${aff}`
      : `${o.recipe.ico} ${o.name}에게 ${o.recipe.name} 서빙! ${tier.ico} 🪙+${pay} ❤️${aff}`, 2600);
  }
  syncBadges();                                                   // 🏅 바리스타 배지 판정
  return { pay, tier: tier.id, name: o.name, emoji: o.emoji, thanks: o.thanks, complete, bonus: CAFE_BONUS };
}

// 홀 안 손님/주문판 근접 판정 — updateDoorInteract 에서 호출. 프롬프트 문구를 돌려줌
export function updateCafeInteract() {
  $w.nearCafeGuest = null; $w.nearCafeBoard = false;
  if (!atCafe) return null;
  let nd = 2.4;
  for (const g of cafeGuestObjs) {
    const d = Math.hypot(g.group.position.x + CAFE.x - player.position.x, g.group.position.z + CAFE.z - player.position.z);
    if (d < nd) { nd = d; $w.nearCafeGuest = g; }
  }
  if (nearCafeGuest) {
    const o = nearCafeGuest.order;
    // 🧺 찬장에 있으면 바로 낼 수 있고, 없으면 재료로 그 자리에서 만든다 — 무엇이 일어날지 프롬프트가 미리 말해 준다
    const inPantry = pantryHas(o.recipe.id) >= 0;
    const ready = Object.entries(o.recipe.cost).every(([k, v]) => (gameState.inventory[k] || 0) >= v);
    if (inPantry) return `${o.emoji} ${o.name} — 🧺 ${o.recipe.ico} ${o.recipe.name} 바로 서빙`;
    if (ready)    return `${o.emoji} ${o.name} — ${o.recipe.ico} ${o.recipe.name} 만들어 서빙`;
    return `${o.emoji} ${o.name} — ${o.recipe.ico} ${o.recipe.name} (재료 부족)`;
  }
  if (Math.hypot(CAFE_BOARD[0] + CAFE.x - player.position.x, CAFE_BOARD[1] + CAFE.z - player.position.z) < 2.2) {
    $w.nearCafeBoard = true; return '📋 오늘의 주문판';
  }
  return null;
}
