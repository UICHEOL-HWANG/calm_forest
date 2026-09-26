// =============================================================
//  🚪 침대·문 근접·구역 안내 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  $w, DIG_WINDOW, WEATHER, atCafe, atFarm, atMine, atMist, atMuseum, atOrchard, atRiver, atSea, boat, clock,
  currentTool, decorNearRing, dist2D, farmActionFirst, farmHalf, fertTarget, firstHintBanner, gameState,
  houseFloor, indoor, isNight, lastDoorPrompt, lastFloorChoiceKey, lastNearHouse, lastZoneHint, mapLocked,
  nearBench, nearBoat, nearBoatShop, nearCafeGuest, nearCoop, nearCosShop, nearDecorMesh, nearDoor, nearDoorFloor,
  nearForest, nearGlade, nearKitchen, nearMarket, nearNPC, nearOutdoorMesh, nearRank, nearShop, nearStation,
  petChoresNear, pickedOutdoor, placingDecor, placingOutdoor, player, plots, requestSave, scene, seaMG, setFogExempt,
  setSpaceVisible, snapCamera, stopOutdoorPlacing, toolPage, ui, updateToolPageAuto, workerCap,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { DECOR, DECOR_SCALE, OUTDOOR, STATION_IDS, stationLabel } from '../data/catalog.js';
import { BENCH, CAFE, CAFE_GATE, CAFE_HALF, COOP, DOCK_GATE, FARM, FARM_GATE, FOREST, FOREST_R, GLADE, GLADE_R, HOUSE_POS, INT, KITCHEN, MARKET, MINE, MINE_GATE, MINE_HALF, MIST, MIST_GATE, MIST_HALF, MUSEUM, MUSEUM_GATE, ORCHARD, ORCHARD_GATE, ORCHARD_HALF, ORCHARD_PROMPT_R, RANK, RIVER, RIVER_DOCK_HALF, ROOF_Y, SEA, SEA_DECK_Z0, SEA_GATE, SHOP, SHOP_DOOR } from '../data/places.js';
import { TOOLS } from '../data/tools.js';
import { storageTotal } from '../farm-building.js';
import { farmStageInfo } from '../farm-stage.js';
import { fertBlockedByWatering } from '../first-loop.js';
import { floorAt, rooftopFreeDecor } from '../house-floors.js';
import { MUSEUM_FLOORS } from '../museum.js';
import { OUTDOOR_MOVE_REACH, canPromptOutdoorMove } from '../outdoor-move.js';
import { Sound } from '../sound.js';
import { MUSEUM_HALF_D, _museumNear, museumFloor, museumFloorItems, museumPlateText, museumStairs, updateCafeInteract } from '../spaces/cafe.js';
import { surveyBenchWorld, surveyDeskWorld } from '../spaces/farm-field.js';
import { forageTarget } from '../spaces/forest.js';
import { houseSolidR } from '../spaces/house.js';
import { INT_HALF, STAIR_PROMPT_R, curHalf, nearestDecor, placeDecor, stairLayout, stopDecorPlacing } from '../spaces/indoor.js';
import { updateMistInteract } from '../spaces/mist.js';
import { nearestOutdoor, outdoorZone } from '../spaces/outdoor-decor.js';
import { updateRiverInteract } from '../spaces/river.js';
import { seaPrompt } from '../spaces/sea.js';
import { state as authState } from '../supabase-client.js';
import { lockLine, mapOpenDay } from '../tuning.js';
import * as THREE from 'three';

// 🛏️ 기본 침대 — 집에 처음 들어오면 하나 놓아 준다.
//   밤낮 수동 조절을 없앤 뒤로 침대가 유일한 시간 조작 수단인데, 작물 8개짜리 구매 가구로
//   두면 "집 완성 → 작물 8개" 를 통과할 때까지 잘 수가 없다.
//   이미 사서 놓았거나 창고에 넣어 둔 사람에겐 주지 않는다(공짜 두 번째 침대 방지).
export const BED_SPOTS = [   // 방 네 귀퉁이 — 앞의 자리가 다른 가구와 겹치면 다음 후보로(전부 rot 0)
  { x: -4.4, z: 4.4, rot: 0 }, { x: 4.4, z: 4.4, rot: 0 },
  { x: -4.4, z: -3.2, rot: 0 }, { x: 4.4, z: -3.2, rot: 0 },
];

export function grantStarterBed() {
  if (gameState.house.bedGiven) return;
  gameState.house.bedGiven = true;
  const stored = gameState.house.stored || {};
  if (gameState.house.decor.some(d => d.id === 'bed') || (stored.bed || 0) > 0) { requestSave(); return; }

  const def = DECOR.find(d => d.id === 'bed');
  const free = (spot) => {
    const hw = def.foot[spot.rot % 2 ? 1 : 0] / 2 * DECOR_SCALE, hd = def.foot[spot.rot % 2 ? 0 : 1] / 2 * DECOR_SCALE;
    return !gameState.house.decor.some(rec => {
      const o = DECOR.find(d => d.id === rec.id); if (!o?.foot) return false;   // 러그류는 밟고 지나가니 겹쳐도 된다
      const ohw = o.foot[rec.rot % 2 ? 1 : 0] / 2 * DECOR_SCALE, ohd = o.foot[rec.rot % 2 ? 0 : 1] / 2 * DECOR_SCALE;
      return Math.abs(rec.x - spot.x) < hw + ohw && Math.abs(rec.z - spot.z) < hd + ohd;
    });
  };
  const spot = BED_SPOTS.find(free);
  if (spot) placeDecor('bed', INT.x + spot.x, INT.z + spot.z, true, spot.rot);
  else { gameState.house.stored = stored; stored.bed = (stored.bed || 0) + 1; }   // 방이 꽉 찼으면 🧺 창고로
  trackEvent('starter_bed', { to: spot ? 'floor' : 'store' });   // [GA4] sleep 이벤트의 분모
  requestSave();
  setTimeout(() => ui.toast?.(spot ? '🛏️ 침대를 놓아뒀어요. 밤에 누우면 아침까지 자요'
                                   : '🛏️ 침대를 창고에 넣어뒀어요. 🎨꾸미기에서 꺼내 놓아요', 3200), 700);
}

export function enterHouse() {
  $w.indoor = true; $w.houseFloor = 0; setFogExempt(player, true);   // 항상 1층에서 시작 · 방 안에선 캐릭터도 안개 밖
  grantStarterBed();
  player.position.set(INT.x, 0, INT.z - 3); player.rotation.y = 0;
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setIndoor?.(true); snapCamera(); setSpaceVisible();
  Sound.blip(); ui.act?.('enter'); trackEvent('enter_house'); // [GA4]
}

export function exitHouse() {
  $w.indoor = false; setFogExempt(player, false); stopDecorPlacing(true);   // 들고 있던 가구는 제자리로(원래 층으로)
  player.position.set(HOUSE_POS.x, 0, HOUSE_POS.z + 3);
  $w.nearDoor = null; ui.setDoorPrompt?.(null); ui.setIndoor?.(false); snapCamera(); setSpaceVisible();
  Sound.blip(); trackEvent('exit_house'); // [GA4]
}

export function goFloor(f) {
  const def = floorAt(gameState.houseStage, f); if (!def) return;
  $w.houseFloor = f;
  player.position.y = def.outdoor ? ROOF_Y : 0;   // ☀️ 루프탑만 층 높이만큼 띄운다 — 카메라·시선은 player.position 을 그대로 따라간다
  // 🏖️ 루프탑에 처음 올라갈 때, 이미 산 구성품(예: rooftop_set)을 값 없이 실물로 놓아 준다.
  // "줬는지"는 gameState.house.grantedDecor 로 영구히 기억한다 — 지금 바닥에 놓여 있는지로만 보면,
  // 옮기려고 든 순간(pickDecor 가 decor 배열에서 즉시 빼낸다)이나 창고에 넣은 뒤 재방문했을 때
  // "안 보이니 다시 준다"고 오판해 무한 복제된다. 한 번 줬으면 그 뒤로는 평범한 가구라 옮기거나 창고에 넣을 수 있다.
  if (def.outdoor) {
    const granted = gameState.house.grantedDecor || (gameState.house.grantedDecor = []);
    for (const id of rooftopFreeDecor(gameState.house.addons)) {
      // 🏖️ 계단 구멍(stairLayout 기준 -x·z≈0 쪽)에서 대각선으로 먼 +x·+z 구석에 놓는다 —
      //   원 자리(INT.x, INT.z+half-2)는 구멍 위에 겹쳐 있었다(2026-09-18 리뷰: 세트가 구멍 위에 떠 보임).
      if (!granted.includes(id)) { granted.push(id); placeDecor(id, INT.x + def.half - 2, INT.z + def.half - 2, true, 0, true, f); }
    }
  }
  const h = def.half;
  player.position.x = Math.max(INT.x - h + 1.5, Math.min(INT.x + h - 1.5, player.position.x));
  player.position.z = Math.max(INT.z - h + 1.5, Math.min(INT.z + h - 1.5, player.position.z));
  $w.nearDoor = null; ui.setDoorPrompt?.(null);
  $w.lastFloorChoiceKey = null; ui.setFloorChoice?.(null);   // 🪜 양방향 선택 UI도 즉시 닫는다(다음 프레임에 필요하면 다시 뜬다)
  setSpaceVisible();
  Sound.blip();
  // 🏠 지금 어디로 왔는지 잠깐 확인 — 프롬프트(🪜)는 "이동" 동작이라 도착 확인엔 다른 아이콘을 쓴다.
  //   실외 층(루프탑)은 ☀️, 실내 층은 🏠(정착 느낌) — def.outdoor 로 갈린다.
  ui.toast?.(def.outdoor ? `☀️ ${def.name}` : `🏠 ${def.name}`, 1200);
  trackEvent('house_floor', { to: def.id, stage: gameState.houseStage });   // [GA4] 층 사용률
}

// 문 근접 감지(입장/퇴장 프롬프트)
export function updateDoorInteract() {
  let nd = null, prompt = null, floorChoiceOpts = null;   // 🪜 floorChoiceOpts — 같은 자리에서 두 방향 다 갈 수 있을 때만(6단계 2층)
  $w.nearDecorMesh = null; $w.nearOutdoorMesh = null; if (decorNearRing) decorNearRing.visible = false;   // 🛋️🪵 옮기기 링은 대상이 있을 때만
  // 🪵 다른 구역으로 가면 배치 모드를 접는다 — 들고 있던 건 제자리로(분실 방지),
  //   작업대에서 막 고른 것도 접는다(아직 값을 안 치렀고, 실내·동굴에선 놓을 수 없는데 🫥미리보기와 ↻회전 버튼만 따라다닌다).
  if (placingOutdoor && (!outdoorZone() || (pickedOutdoor && pickedOutdoor.farm !== atFarm))) { stopOutdoorPlacing(true); ui.onDecorPlaced?.(); }
  if (boat.active) {   // 🛶 런 중엔 프롬프트를 전부 끔(액션 = 노 젓기)
    $w.nearDoor = null; $w.nearBoat = $w.nearBoatShop = false;
    if (lastDoorPrompt !== null) { $w.lastDoorPrompt = null; ui.setDoorPrompt?.(null); }
    if (lastZoneHint !== null) { $w.lastZoneHint = null; ui.setZoneHint?.(null); }
    return;
  }
  if (atMist) {        // 🌫️ 안개 숲: 남쪽으로 나가기 / 수호목·등불·정령 근접
    let prompt = null;
    if (dist2D({ x: MIST.x, z: MIST.z + MIST_HALF }, player.position) < 1.9) { nd = 'mistexit'; prompt = '🚪 마을로 나가기'; }
    else prompt = updateMistInteract();
    $w.nearDoor = nd;
    if (prompt !== lastDoorPrompt) { $w.lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
    return;   // 존 힌트는 updateMist 가 상태표시로 사용
  }
  if (atSea) {         // 🌊 바다터: 뭍(남쪽)으로 나가기 / 미니게임 상태 안내
    if (seaMG.st === 'idle' && dist2D({ x: SEA.x, z: SEA.z + SEA_DECK_Z0 - 0.6 }, player.position) < 1.9) { nd = 'seaexit'; prompt = '🚪 마을로 나가기'; }
    else prompt = seaPrompt();
    $w.nearDoor = nd;
    if (prompt !== lastDoorPrompt) { $w.lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
    if (lastZoneHint !== null) { $w.lastZoneHint = null; ui.setZoneHint?.(null); }
    return;
  }
  if (atRiver) {       // 🛶 나루터 데크: 남쪽으로 나가기 / 배·창고 근접
    if (dist2D({ x: RIVER.x, z: RIVER.z + RIVER_DOCK_HALF }, player.position) < 1.9) { nd = 'riverexit'; prompt = '🚪 마을로 나가기'; }
    else prompt = updateRiverInteract();
    $w.nearDoor = nd;
    if (prompt !== lastDoorPrompt) { $w.lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
    if (lastZoneHint !== null) { $w.lastZoneHint = null; ui.setZoneHint?.(null); }
    return;
  }
  if (indoor) {
    if (houseFloor === 0 && dist2D({ x: INT.x, z: INT.z - INT_HALF }, player.position) < 1.7) { nd = 'exit'; prompt = '🚪 나가기'; } // 1층 문 바로 앞에서만
    else {
      // 🌀 나선 계단 — buildRoom 의 st(단일 랜드마크)와 같은 stairLayout(h) 공식으로 자리를 잡는다
      //   (계단을 옮기면 이 판정 좌표도 반드시 같이 옮긴다 — 포팅 전 "아래로 못 내려간다" 제보의 원인).
      //   오르내림이 한 자리(원형 발자국 하나)라 근접 판정도 하나 — 반경 안이면 이웃 층(f±1) 둘 다
      //   후보에 올린다. 하나면 예전처럼 Space 로 바로, **둘 다면(6단계 2층) 버튼 두 개로 동시에
      //   제시**한다(우선순위로 하나만 주면 "원치 않는 층을 거쳐야" 하는 문제가 재발 — task 지시).
      const h = curHalf();
      const lay = stairLayout(h);
      const upDef = floorAt(gameState.houseStage, houseFloor + 1);
      const downDef = houseFloor > 0 ? floorAt(gameState.houseStage, houseFloor - 1) : null;
      const nearStair = dist2D({ x: INT.x + lay.cx, z: INT.z + lay.cz }, player.position) < STAIR_PROMPT_R;
      const opts = [];
      if (nearStair && upDef) opts.push({ f: houseFloor + 1, label: `🪜 ${upDef.name}으로` });
      if (nearStair && downDef) opts.push({ f: houseFloor - 1, label: `🪜 ${downDef.name}으로` });
      if (opts.length === 2) {
        nd = 'floorchoice'; floorChoiceOpts = opts;
      } else if (opts.length === 1) {
        nd = 'floor'; $w.nearDoorFloor = opts[0].f; prompt = opts[0].label;
      } else if (!placingDecor) {
        // 🛋️ 놓아둔 가구 옆에 서면 "옮기기" — NPC·문과 같은 근접 프롬프트+액션 문법(탭으로 드는 경로는 그대로)
        const near = nearestDecor(0.9);
        if (near) {
          $w.nearDecorMesh = near.root; const def = DECOR.find(d => d.id === near.root.userData.rec.id);
          if (def.id === 'bed' && isNight()) {
            // 🛏️ 밤엔 액션이 '자기' — 옮기기는 탭(레이캐스트) 경로로 밤낮 상관없이 그대로 된다
            nd = 'sleep'; prompt = `${def.ico} ${def.name} · 자기`;
            // 밤엔 액션이 '자기' 로 넘어가 침대를 들 수 없다 — 탭 경로가 있다는 걸 한 번 알려 준다
            firstHintBanner('bedMove', '🛏️', '침대 옮기기', '밤엔 침대를 직접 탭하면 옮겨요');
          } else {
            nd = 'decor'; prompt = `${def.ico} ${def.name} · 옮기기`;
            if (def.id === 'bed') firstHintBanner('bedSleep', '🛏️', '침대', '밤에 누우면 아침까지 자요');
          }
          const ring = ensureNearRing(); ring.position.set(near.root.position.x, near.root.position.y + 0.02, near.root.position.z); ring.visible = true;   // ☀️ 루프탑 가구는 ROOF_Y 만큼 높다 — 그 가구의 실제 y 를 그대로 따라간다
        }
      }
    }
  } else if (atFarm) {
    if (dist2D({ x: FARM.x, z: FARM.z + farmHalf() }, player.position) < 1.8) { nd = 'farmexit'; prompt = '🚪 나가기'; }
    else if (dist2D(surveyDeskWorld(), player.position) < 1.9) {   // 📐 측량소 제도 탁자 — 다음 단계 비용을 프롬프트에(닭장 문법: 액션 = 즉시 증축)
      nd = 'survey';
      const info = farmStageInfo(gameState.farm.stage, gameState.inventory);
      // 이모지와 숫자 사이 U+2060(WORD JOINER) — 모바일 폭에선 두 줄이 되는데, 없으면 "🪨" 와 "20" 사이에서 꺾인다(i18n 키도 같은 문자열)
      prompt = info.maxed ? '📐 더 넓힐 수 없어요'
        : `📐 ${info.next.name}으로 넓히기 🪵⁠${info.next.cost.wood} 🪨⁠${info.next.cost.stone} 🪙⁠${info.next.cost.coins}`;
      firstHintBanner('surveyOffice', '📐', '측량소', '재료를 모아 밭을 넓혀요. 심어둔 밭은 그대로예요');
    }
    else if (dist2D(surveyBenchWorld(), player.position) < 1.9) {   // 🔧 자재 작업대 — 밭 시설 주문(마을 작업대와 같은 메뉴, 🌷야외 탭)
      nd = 'farmbench'; prompt = '🔧 밭 시설 만들기';
      firstHintBanner('farmBench', '🔧', '자재 작업대', '🧺창고·💧우물·🐝벌통 같은 밭 시설을 여기서 만들어 울타리 안에 놓아요');
    }
  } else if (atMine) {
    if (dist2D({ x: MINE.x, z: MINE.z - MINE_HALF }, player.position) < 1.7) { nd = 'mineexit'; prompt = '🚪 나가기'; }
  } else if (atOrchard) {   // 🍎 과수원 언덕: 들어온 남쪽 경계로 나가기
    if (dist2D({ x: ORCHARD.x, z: ORCHARD.z + ORCHARD_HALF }, player.position) < 1.9) { nd = 'orchardexit'; prompt = '🚪 나가기'; }
  } else if (atCafe) {   // ☕ 홀: 남쪽 문으로 나가기 / 손님·주문판 근접 안내
    if (dist2D({ x: CAFE.x, z: CAFE.z + CAFE_HALF }, player.position) < 1.9) { nd = 'cafeexit'; prompt = '🚪 나가기'; }
    else prompt = updateCafeInteract();
  } else if (atMuseum) {   // 🏛️ 전시실: 남쪽 문으로 나가기 / 진열장 앞 자세히 보기
    if (dist2D({ x: MUSEUM.x, z: MUSEUM.z + MUSEUM_HALF_D }, player.position) < 1.9) { nd = 'museumexit'; prompt = '🚪 나가기'; }
    else {
      const st = museumStairs.find(t => dist2D({ x: MUSEUM.x + t.x, z: MUSEUM.z + t.z }, player.position) < 1.8);
      if (st) {
        const to = MUSEUM_FLOORS.find(f => f.id === museumFloor + (st.up ? 1 : -1));
        nd = st.up ? 'museumup' : 'museumdown'; prompt = `🪜 ${to?.name || ''}으로`;
      } else if (_museumNear >= 0) {
        const it = museumFloorItems()[_museumNear];
        if (it && gameState.dex[it.cat]?.[it.id]) { nd = 'museumview'; prompt = '🔍 자세히 보기'; }
      }
    }
  } else if (gameState.houseStage >= 3 && dist2D(HOUSE_POS, player.position) < houseSolidR() + 0.6) { // 증축 크기에 맞춰 문 사거리도 확장
    nd = 'enter'; prompt = '🚪 집에 들어가기';
  } else if (dist2D(FARM_GATE, player.position) < 2.0) {
    nd = 'farm'; prompt = '🌾 내 텃밭';
  } else if (dist2D(MINE_GATE, player.position) < 2.0) {
    nd = 'mine'; prompt = '⛏️ 채굴 동굴';
  } else if (dist2D({ x: MIST_GATE.x + 1.4, z: MIST_GATE.z + 1.4 }, player.position) < 2.4) {
    nd = 'mist';
    const locked = mapLocked('mist');   // 🧪 [베타 2차] 프레임당 한 번만 판정(프롬프트·배너 억제 공용)
    prompt = locked ? lockLine('mist', mapOpenDay(authState.mapOrder, 'mist')) : '🌫️ 안개 낀 숲에 들어가기';
    if (!locked) firstHintBanner('mistGate', '🌫️', '안개 낀 숲', '등불과 ♪음악으로 안개를 정화하는 숲');
  } else if (dist2D({ x: DOCK_GATE.x, z: DOCK_GATE.z + 1.2 }, player.position) < 2.4) {
    nd = 'river'; prompt = '🛶 나루터 (나룻배 타러 가기)';
    firstHintBanner('dockGate', '🛶', '나루터', '나룻배 타고 하루 3번 강을 내려가요');
  } else if (dist2D({ x: SEA_GATE.x - 0.4, z: SEA_GATE.z + 1 }, player.position) < 2.4) {
    nd = 'sea';
    const locked = mapLocked('sea');   // 🧪 [베타 2차] 프레임당 한 번만 판정(프롬프트·배너 억제 공용)
    prompt = locked ? lockLine('sea', mapOpenDay(authState.mapOrder, 'sea')) : '🌊 바다터 (먼 바다로 나가볼까요?)';
    // [GA4] 입구 첫 도달(세이브당 1회) — sea_enter 와 짝지어 "왔는데 안 들어갔나"를 본다
    if (!locked && firstHintBanner('seaGate', '🌊', '바다터', '먼 바다 대형 물고기와 줄다리기 낚시'))
      trackEvent('sea_gate_hint', { night: isNight(), weather: WEATHER });
  } else if (!indoor && dist2D(player.position, ORCHARD_GATE) < ORCHARD_PROMPT_R) {
    nd = 'orchard';
    const locked = mapLocked('orchard');
    // 🔒 잠금 문구는 다른 게이트(🌫️·🌊)와 같이 BETA_COPY.lock 한 곳에서만 나온다.
    //    진행도 게이트라 {N}(날짜)이 없어 openDay 를 넘기지 않는다 — replace 가 그대로 통과한다.
    prompt = locked ? lockLine('orchard') : '🍎 과수원에 들어가기';
    if (!locked) firstHintBanner('orchardGate', '🍎', '과수원', '묘목을 심어 매일 열매를 따는 곳');
  } else if (dist2D({ x: CAFE_GATE.x, z: CAFE_GATE.z + 1.3 }, player.position) < 2.2) {
    nd = 'cafe'; prompt = '☕ 카페에 들어가기';
    firstHintBanner('cafeGate', '☕', '카페', '모은 재료로 손님에게 요리를 서빙하는 곳');
  } else if (dist2D({ x: MUSEUM_GATE.x, z: MUSEUM_GATE.z + 3.0 }, player.position) < 2.4) {
    nd = 'museum'; prompt = '🏛️ 박물관에 들어가기';
    firstHintBanner('museumGate', '🏛️', '박물관', '📖도감에 등록한 것이 전시돼요. 빈 자리가 다음 목표예요');
  }
  $w.nearDoor = nd;
  if (nd === 'mine') firstHintBanner('mineGate', '⛏️', '채굴 동굴 입구', '⛏️괭이로 돌·석탄·💎보석을 캐는 곳');
  // 자유주방/작업대/상점 — 마을(실외)에서 다른 프롬프트가 없을 때만
  const inVillage = !indoor && !atFarm && !atMine && !atRiver && !nd;
  $w.nearKitchen = inVillage && dist2D(KITCHEN, player.position) < 2.2;               // 🍳 자유주방(요리 미니게임)
  $w.nearBench = inVillage && !nearKitchen && dist2D(BENCH, player.position) < 2.0;
  $w.nearShop = inVillage && !nearKitchen && !nearBench && dist2D(SHOP, player.position) < 2.0;
  $w.nearMarket = inVillage && !nearKitchen && !nearBench && !nearShop && dist2D(MARKET, player.position) < 2.0; // 📊 시세 전광판
  $w.nearRank = inVillage && !nearKitchen && !nearBench && !nearShop && !nearMarket && dist2D(RANK, player.position) < 1.8; // 🏆 랭킹 게시판(중앙 배치라 반경 타이트 — 스폰 1.9에서 안 뜸)
  $w.nearCoop = inVillage && !nearKitchen && !nearBench && !nearShop && !nearMarket && !nearRank && dist2D(COOP, player.position) < 2.4; // 🐔 닭장
  $w.nearCosShop = inVillage && !nearKitchen && !nearBench && !nearShop && !nearMarket && !nearRank && !nearCoop && dist2D(SHOP_DOOR, player.position) < 2.8; // 🏪 꾸미기 가게(마을 서쪽)
  // 🔥 화덕(마을) · 🫙 발효통(텃밭 마당) — 고정 시설과 달리 플레이어가 놓는다.
  //   가장 가까운 한 채를 잡는다(몸집이 커서 반경 2.6). 텃밭에선 밭일이 먼저다(허수아비와 같은 규칙).
  const stationZone = (inVillage && !nearKitchen && !nearBench && !nearShop && !nearMarket && !nearRank && !nearCoop)
    || (atFarm && !farmActionFirst());
  $w.nearStation = stationZone
    ? (gameState.outdoor.find(r => STATION_IDS.includes(r.id) && Math.hypot(r.x - player.position.x, r.z - player.position.z) < 2.6) || null)
    : null;
  if (nearKitchen) prompt = '🍳 요리하기 (자유주방)';
  else if (nearBench) prompt = '🔧 만들기 (작업대)';
  else if (nearStation) prompt = stationLabel(nearStation);
  else if (nearShop) prompt = '🛒 상점';
  else if (nearRank) { prompt = '🏆 이번 주 랭킹'; firstHintBanner('rank', '🏆', '랭킹 게시판', '이번 주 숲의 기록 5부문, 매주 리셋'); }
  else if (nearMarket) { prompt = '📊 오늘의 시세'; firstHintBanner('market', '📊', '시세 전광판', '판매가가 매일 바뀌니 비쌀 때 파세요'); }
  else if (nearCoop) {
    prompt = gameState.coop.built ? '🐔 닭장' : '🐔 닭장 터';
    firstHintBanner('coop', '🐔', '닭장 터', '재료 모아 닭장 짓고 매일 🥚달걀 받기');
  }
  else if (nearCosShop) {   // ⚠️ 안내는 프롬프트 줄에만 — 월드 라벨로 띄우면 다른 라벨을 가린다
    prompt = '🎀 꾸미기 가게';
    firstHintBanner('cosShop', '🎀', '꾸미기 가게', '모자·목도리·가방·이펙트로 내 캐릭터를 꾸며요');
  }
  if (!prompt) {   // 🪏 반쯤 판 밭 앞: 남은 유예를 프롬프트 줄로(모바일 규칙 — 안내는 컨텍스트 슬롯에만)
    const dp = plots.find(p => p.digAt && dist2D(p.group.position, player.position) < 1.6);
    if (dp) prompt = `🪏 한 번 더 파면 밭이 사라져요 (${Math.max(1, Math.ceil(DIG_WINDOW - (clock.elapsedTime - dp.digAt)))})`;
  }
  if (!prompt) {   // 다른 시설 프롬프트가 없을 때만 — 물조리개+마른 흙이면 물주기가 실행되므로 프롬프트도 숨긴다
    const fp = fertTarget();
    if (fp && !fertBlockedByWatering(TOOLS[currentTool].id, toolPage, clock.elapsedTime < (fp.wetUntil || 0))) prompt = '🌱 비료 주기';
  }
  // 🪵 놓아둔 야외 장식 옆 → "옮기기" — 문·시설·주민보다 낮은 우선순위(실내 가구와 같은 문법).
  //   🌾 밭일보다도 낮다: 밭에 세운 허수아비·정원등이 파종·물주기를 통째로 가로채던 문제(2026-09-15).
  //      옮기기 프롬프트가 잡히면 handleAction 맨 위에서 채가서 농사 분기까지 못 갔다 —
  //      주민(NPC)에 이미 쓰던 규칙 farmActionFirst 를 그대로 적용한다.
  //      겹쳐 놓은 장식은 액션 대신 **직접 탭**해서 옮긴다(tryPickOutdoor) — 조준이 명시적이라 밭일과 안 겹친다.
  //      🧺창고 꺼내기·📋게시판 고용도 같이 양보한다 — 밭 위에서 농사 도구를 들었으면 밭일이라는 한 가지 규칙으로 두는 게 맞고,
  //      밭일이 없으면(farmActionFirst 가 noop 을 양보) 그 자리에서 곧바로 다시 뜬다.
  //      farmActionFirst 는 밭·채집을 훑으므로(매 프레임) 근처에 장식이 있을 때만 본다.
  const outdoorNear = (!prompt && !placingOutdoor && !nearNPC && outdoorZone()) ? nearestOutdoor(OUTDOOR_MOVE_REACH) : null;
  const outdoorDef = outdoorNear && OUTDOOR.find(d => d.id === outdoorNear.mesh.userData.rec.id);
  const outdoorStock = outdoorDef?.id === 'warehouse' ? storageTotal(gameState.farm.storage) : 0;
  const outdoorFacility = outdoorStock > 0 || outdoorDef?.id === 'board';   // 🧺꺼내기·📋고용은 밭일에 양보하지 않는다
  const outdoorShow = !!outdoorNear && canPromptOutdoorMove({ hasPrompt: !!prompt, placing: !!placingOutdoor, nearNPC: !!nearNPC, outdoorZone: true, farmFirst: farmActionFirst(), isFacility: outdoorFacility });
  // 밭일에 가려 옮기기가 처음 숨는 순간 — 탭이라는 길이 있다는 걸 한 번만 알려 준다(🛏️침대 bedMove 와 같은 문법)
  if (outdoorNear && !outdoorShow) firstHintBanner('outdoorMoveTap', '🎃', '허수아비 옮기기', '밭 위에선 밭일이 먼저예요. 허수아비를 직접 탭하면 옮겨요');
  if (outdoorShow) {
    $w.nearOutdoorMesh = outdoorNear.mesh; const def = outdoorDef, stock = outdoorStock;
    if (stock > 0) { $w.nearDoor = 'warehouse'; prompt = `🧺 창고에서 꺼내기 ${stock}개`; }   // 🏗️ 내용물이 있으면 액션 = 꺼내기(비워야 옮긴다)
    else if (def.id === 'board') { $w.nearDoor = 'hireboard'; prompt = `📋 일꾼 구하기 (${gameState.workers.length}/${workerCap()})`; }   // 📋 게시판 액션 = 고용 창(옮기기는 탭)
    else { $w.nearDoor = 'outdoor'; prompt = `${def.ico} ${def.name} · 옮기기`; }
    const ring = ensureNearRing(); ring.position.set(outdoorNear.mesh.position.x, 0.04, outdoorNear.mesh.position.z); ring.visible = true;
  }
  // 🐾 맡기기 — 밭 근처 + 쿨다운이 끝났을 때만. 맨 마지막 순위다(시설·밭일·옮기기에 전부 양보).
  //   ⚠️ 안내는 **프롬프트 줄에만** — 월드 라벨로 띄우면 다른 라벨을 가린다(🎀가게와 같은 규칙).
  if (!prompt && !farmActionFirst() && petChoresNear()) { $w.nearDoor = 'pet'; prompt = '🐾 맡기기'; }
  if (prompt !== lastDoorPrompt) { $w.lastDoorPrompt = prompt; ui.setDoorPrompt?.(prompt); }
  // 🪜 양방향 선택 UI(6단계 2층 전용) — door-prompt 와 같은 중복 갱신 방지 패턴.
  //   opts 가 바뀔 때만 버튼을 다시 그린다(매 프레임 onclick 재바인딩 낭비 방지).
  const fcKey = floorChoiceOpts ? floorChoiceOpts.map(o => o.f).join(',') : null;
  if (fcKey !== lastFloorChoiceKey) {
    $w.lastFloorChoiceKey = fcKey;
    ui.setFloorChoice?.(floorChoiceOpts ? floorChoiceOpts.map(o => ({ label: o.label, onSelect: () => goFloor(o.f) })) : null);
  }
  // 첫 접근 안내(1회) — 초보가 각 시설 용도를 알게
  if (nearKitchen) firstHintBanner('kitchen', '🍳', '자유주방', '탭 타이밍 요리로 버프를 얻는 곳');
  else if (nearBench) firstHintBanner('bench', '🔧', '작업대', '재료로 도구 강화·장식·선물·🗿조각 만들기');
  else if (nearStation?.id === 'kiln') firstHintBanner('kiln', '🔥', '화덕', '재료를 걸어두면 다음 날 구워져 있어요');
  else if (nearStation?.id === 'vat') firstHintBanner('vat', '🫙', '발효통', '🍇포도를 밟아 걸어두면 다음 날 🍷포도즙이 돼요');
  else if (nearShop) firstHintBanner('shop', '🛒', '상점', '수확물을 팔고 씨앗을 사는 곳');
  else if (nd === 'farm') firstHintBanner('farmGate', '🌾', '내 텃밭 입구', '마음껏 농사짓는 나만의 넓은 밭');
  // 🎨 완성된 집 근처 → 외관 꾸미기 버튼(메뉴 대신 공간 기반 동선)
  const nearHouse = inVillage2() && gameState.houseStage >= 3 && dist2D(HOUSE_POS, player.position) < 4.2;
  if (nearHouse !== lastNearHouse) { $w.lastNearHouse = nearHouse; ui.setNearHouse?.(nearHouse); }
  if (nearHouse) firstHintBanner('extDecor', '🎨', '집 외관 꾸미기', '지붕·벽·문 색을 바꿔 나만의 집으로');
  updateZoneHint();
  updateToolPageAuto();   // 🎒 구역이 바뀌었으면 도구 페이지도 넘긴다
}

export function updateZoneHint() {
  let hint = null;
  if (atCafe) {   // ☕ 손님 옆에 서면 주문 대사를 띄움(액션 프롬프트와 별도 줄)
    if (nearCafeGuest) hint = `💬 ${nearCafeGuest.order.line}`;
    if (hint !== lastZoneHint) { $w.lastZoneHint = hint; ui.setZoneHint?.(hint); }
    return;
  }
  if (atMuseum) {   // 🏛️ 진열장 앞 명판 — 같은 자리(액션 버튼을 뺏지 않는다)
    hint = museumPlateText();
    if (hint !== lastZoneHint) { $w.lastZoneHint = hint; ui.setZoneHint?.(hint); }
    return;
  }
  const wasGlade = nearGlade;
  $w.nearGlade = inVillage2() && dist2D(GLADE, player.position) < GLADE_R + 0.5;
  if (nearGlade) {
    hint = isNight() ? '🌟 반딧불이 — 포충망(5)으로 반짝일 때 휘두르기' : '🌟 반딧불이 계곡 — 🌙 밤에 다시 오세요';
    if (!wasGlade) trackEvent('zone_enter', { zone: 'glade', night: isNight() });   // [GA4] 밤 콘텐츠 유입
    firstHintBanner('glade', '🌟', '반딧불이 계곡', '밤에 포충망으로 반딧불이 잡는 곳');
  }
  const wasForest = nearForest;
  $w.nearForest = inVillage2() && dist2D(FOREST, player.position) < FOREST_R + 0.5;
  if (nearForest && !hint) {
    hint = forageTarget() ? '🍄 채집물 발견! 액션(Space)으로 줍기 — 도구 필요 없어요' : '🍄 채집 숲 — 버섯·산딸기·도토리를 찾아보세요';
    if (!wasForest) trackEvent('zone_enter', { zone: 'forest', weather: WEATHER });   // [GA4] 채집 유입
    firstHintBanner('forest', '🍄', '채집 숲', '도구 없이 버섯·산딸기를 줍는 숲');
  }
  if (hint !== lastZoneHint) { $w.lastZoneHint = hint; ui.setZoneHint?.(hint); }
}

export function inVillage2() { return !indoor && !atFarm && !atMine && !atCafe && !atRiver && !atMist && !atSea && !atMuseum && !atOrchard; }

// 🛋️🪵 "옮기기" 대상 밑 호박색 링(가구·야외 장식 공용, 지연 생성) — 매 프레임 초반에 숨기고 대상이 있을 때만 켠다
export function ensureNearRing() {
  if (!decorNearRing) {
    $w.decorNearRing = new THREE.Mesh(new THREE.RingGeometry(0.55 * DECOR_SCALE, 0.72 * DECOR_SCALE, 28),
      new THREE.MeshBasicMaterial({ color: 0xf2b45a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, fog: false }));
    decorNearRing.rotation.x = -Math.PI / 2; scene.add(decorNearRing);
  }
  return decorNearRing;
}
