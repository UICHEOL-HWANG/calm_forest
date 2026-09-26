// =============================================================
//  calm forest · 3D 게임 코어 (Three.js / WebGL)
//  ------------------------------------------------------------
//  2단계 범위: 걷기 + 벌목 + 농사(밭갈기/심기/물주기/수확)
//             + 건축(정해진 터 단계 건설) + 파티클 + 블룸 + 낮/밤
//             + 모바일(아날로그) 입력 지원
//
//  ▷ 아트 디렉션: 로우폴리 + 점토/장난감 느낌, 파스텔 톤,
//    소프트 매트(툰) 셰이딩, 부드러운 그림자/안개, 은은한 블룸
//  ▷ 외부 이미지/모델/사운드 파일 미사용 — 모든 형상은 코드 생성
//
//  ▷ [연동 지점] 주석 태그:
//     · [Supabase] 저장 / [센서] 로깅 스냅샷 / [GA4] 이벤트
//     · [셰이더] 커스텀 머티리얼/포스트프로세싱
//     · [파티클] 벌목/밭갈기/물주기/수확/건축완성 연출
// =============================================================

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { sampleFrame, startLogging } from './logger.js';         // [센서] 로깅
import { saveGame, loadGame, sendBoatRun, sendSeaRecord, fetchNotices, upsertRetentionGuidanceScore, state as authState } from './supabase-client.js';  // [Supabase] 저장 + 🛶 런 기록 + 🌊 대어 기록 + 📮 소식
import { pickSeaTarget } from './sea-aim.js';   // 🎣 바다터 조준 — 바라보는 쪽의 물고기가 걸린다
import { retryDelay, offerReload } from './save-guard.js';   // 🛡️ 세이브를 읽을 때까지 기다리는 재시도 간격 + 오래 끌 때 탈출구
import { unreadNotices, maxId } from './notices.js';   // 📮 소식함 순수 로직(안 읽은 것 거르기·읽음 id)
import { NIGHT_MIN, WAKE_TIME, daylightAt, isNightAt } from './daynight.js';
import { BOAT_LAMP, BOAT_LAMP_POST } from './boat-lamp.js';   // 🏮 등불이 앞 장애물을 안 가리는 배치(순수 기하 규칙)   // 🌞🌙 햇빛 곡선·밤 판정·기상 시각(순수 규칙)
import { TUNING, rewardBoostMult, isMapLocked, mapOpenDay, betaDay, lockLine, openLine } from './tuning.js';   // 🧪 [베타 A/B] 보상 부스트 + 2차 맵 계단식 (난이도는 difficulty.js 로 옮겼다)
import { easeFor, nextDda, defaultDifficulty, mergeDifficulty } from './difficulty.js';   // 🎚️ 미니게임 난이도 — probe 지터 + 유저별 DDA
import { trackChop, trackEvent, onTrack } from './analytics.js';          // [GA4] 이벤트
import { IS_ANDROID } from './platform.js';
import { createPerfSampler, perfContext } from './perf-sample.js';   // 📱 플레이 앱 기기별 FPS(세션당 1회 perf_sample)
import { createKeyState, isEditableTarget } from './keys.js';      // ⌨️ 키 눌림 상태(입력칸 무시·포커스 손실 리셋) + 우클릭 메뉴 예외 판정
import { tierOf, paletteOf, GEM_COLOR, mineHitPower, expandWoodOf, seedSaved, digIsOneShot, sickleReach } from './tool-tiers.js';
import { BLUEPRINTS, blueprintOfTool, hiddenQuestFor, tier2Status, sanitizeToolFlags } from './tool-blueprints.js';   // 🔨 도구 2단계(도면·히든 의뢰·제작)
import { BUILD_STAGES, buildInfo, STAGE_NAMES, EXPANSIONS, MAX_HOUSE_STAGE } from './house-cost.js';   // 🏠 집 수치(건축·증축)는 전부 거기 한 곳
import { VISITORS, ENV_TAG, TAG_LABEL, envAt, matchVisitors, nearMiss, spotInfo, visitorOf } from './habitat.js';   // 🦋 텃밭 방문객 서식 규칙(판정의 단일 출처)
import { createVisitors } from './farm-visitors.js';                                                      // 🦋 스폰·근접 등록
import { DEX_GATES, gateOf, gateOpen, weatherOpen, rollKind } from './dex-gates.js';                      // 📖 희귀종 해금 게이트(판정의 단일 출처)
import { makeVisitor } from './visitor-art.js';                                                           // 🦋 방문객 조형 4종
import { truceUntil } from './duel/truce.js';                                                        // 🤝 발길 끊기 만료일
import { makeRaidScar } from './duel/raid-art.js';                                                   // 🐾 털린 밭 조형(흔적·대결 무대 공용)
import { MUSEUM_FLOORS, floorEntries, floorProgress, openFloors, nextFloorNeed, pickMissingDex, viewFrame, exhibitCenterY,
  SPECIAL_EXHIBITS, specialFor, noteSpecial, sanitizeSpecial, bestAfterCatch, sanitizeBest } from './museum.js';
import { buildMuseumExtras } from './museum/extras.js';   // 🏛️ 1층 ✨조건부 전시(조형)   // 🏛️ 증축은 수집률로 열린다   // 🪓 도구 등급(0 기본 / 1 업그레이드 / 2 히든) — 색·판정은 이 모듈이 단일 출처
import { logEcon, startMetrics } from './metrics.js';            // [계측] 경제 원장 + 세션 요약
import { Sound, initSound, startRainSound, stopRainSound, setBGMTheme } from './sound.js'; // 🔊 절차적 사운드 + 🌧️ 빗소리 + 🎵 BGM 테마
import { t, LANG, aiBucket } from './i18n.js';   // 🌐 i18n — DOM 은 옵저버가 처리, 캔버스(간판·말풍선)만 직접 번역
import { welcomeOffer, topPriceLine, fertBlockedByWatering } from './first-loop.js';   // 🪙 코인 첫 루프 규칙
import { farmToolFor, farmActionIsNoop, FARM_AUTO_TOOLS } from './farm-auto.js';   // 🌾 농사 도구 자동 전환 규칙(밭 상태→도구)
import { questAvailable, pickGated, repeatNPCsFor, repeatQuestFor, questIdFor, pickCurrent, activeQuestList, dailyExtendPlan, pickDailyExtra, renumberDailyLine } from './quests.js';   // 🦉 의뢰 공급 규칙(전제조건 게이트·시드 추첨·주민 반복 의뢰)
import { buildAnimalHead, plushMat } from './animal-faces.js';   // 🎭 플러시 스타일 머리(sims/face-style-sim.html 검수값)
import { PLOT_CAP, popScale, poppingPlots } from './farm-render.js';   // 🌾 밭 인스턴싱 규칙
import { CELL, CELL_SEG, SPRIG_PER_PLOT, mottleAt, reliefAt, mottleMix, nextSunk, seamAt, soilSignature, soilSink, sprigOffsets, vertsPerCell, indicesPerCell } from './farm-soil.js';   // 🌾 A안 이어진 얼룩 흙 + 포기
import { FARM_STAGES, MAX_FARM_STAGE, farmHalfOf, farmStageInfo, fencePosts, perimeterTrees, YARD_D, YARD_HZ, surveyOfficePos, surveyDeskPos, surveyBenchPos, surveyYard, clampFarmPos } from './farm-stage.js';   // 🌾 밭 단계 증축 규칙(텃밭 6 → 넓은 밭 9 → 대농장 11)
import { ADV_CROPS, MATURE, isAdv, growthPerWater, stageIndex, renderStage, wiltTimeFor, weedRoll, pestChance, harvestYield, nextSeedSel, seedKeyOf } from './farm-crops.js';   // 🌾 고급 작물 공정(밀·옥수수·포도 · 비료/잡초/해충)
import { JOBS, GRADES, HIRE_COST, HAUL_N, MASTER_YIELD, MASTER_SPEED, STEP_SEC, jobOf, gradeInfo, gradeOf, toNextGrade, skillsOf, hasPerk, workSecOf, dailyWage, settleWages, pickTask, catchUpSteps, worksPerStep, candidatesFor, releaseCandidate } from './farm-worker.js';   // 🧑‍🌾 노동자 규칙(직군·등급·우선순위·월급·오프라인 스텝)
import { FARM_BUILDINGS, CELL as FARM_CELL, snapCenter, buildingCells, rotatedFp, canPlaceBuilding, inRadiusOf, warehouseCap, storageTotal, compostLeft, HONEY_PER_HIVE, COMPOST_PER_DAY, WELL_WET_MUL, HIVE_GROWTH_MUL, STORAGE_KEYS } from './farm-building.js';   // 🏗️ 밭 시설(게시판·창고·지지대·우물·퇴비통·쉼터·벌통)
import { takeStored, canPromptOutdoorMove, outdoorDistance, OUTDOOR_MOVE_REACH, OUTDOOR_TAP_REACH } from './outdoor-move.js';   // 🪵 야외 장식 보관·옮기기 규칙
import { makeChickenState, stepChickens } from './coop-chickens.js';   // 🐔 닭 배회·오두막 출입(벽 통과 금지)
import { ORCHARD_AUTO_TOOLS, orchardToolFor, FRUITS, TREE_SLOTS, YIELD_PER_DAY, ORCHARD_STREAM_LOCAL, ORCHARD_SLOTS_LOCAL, fruitOf, fruitKeyOf, sapKeyOf, nearStream, harvestable, settleTrees, chopHit, freeSlots, daysBetween } from './orchard.js';   // 🍎 과수원 규칙(과일 표·물·수확·베기·빈 자리·정산)
import { logOrchardEvent } from './orchard-log.js';   // 🍎 과수원 이벤트 원장(Supabase, fire-and-forget) — GA4 유실·지연 대비
import { CONFIG, IS_DEV_SESSION } from './config.js';  // 🔵 API_BASE — 앱인토스 번들에서 API 를 절대 URL 로 호출 / 🧪 dev 세션
import { createPredictor, buildGameStateSnapshot } from './predict.js';   // [🎯 이탈 예측] 트리거 → 점수 → 개입
import { createRetentionGuidance, buildRetentionGameStateSnapshot } from './retention-guidance.js';   // [🌿 리텐션 안내] 룰+모델 rescue 자리
import { getWindow } from './window-buffer.js';   // [🎯 이탈 예측] 롤링 윈도(logger.js 의 전송 버퍼와 별개)
import { buildHouseModel, mountHouseAddons, makeHouseHelpers } from './house/index.js';   // 🏠 집 외관 모델(3 코티지·4 브릭 로프트·5 펜트하우스·6 루프탑 빌라) + 🧩 구성품 얹기 + 재질 도우미(루프탑 유리 난간)
import { HOUSE_ADDONS, addonState } from './house/addons.js';          // 🧩 집 구성품 카탈로그(코인 장식 12종)
import { shadowActiveFor } from './shadow-scope.js';   // 🌓 그림자 상자가 닿는 공간인지 판정(서브 공간에선 섀도맵 정지)
import { floorAt, normalizeFloor, decorUnlocked, canPlaceOn, rooftopFreeDecor } from './house-floors.js';   // 🏠 집 실내 층 규칙(순수 모듈)
import { STATIONS, stationDef, CRAFT_RECIPES, recipesOf, recipeOf as craftRecipeOf, yieldOf, lackOf, canAfford } from './craft/recipes.js';   // 🔥🫙 가공 레시피 표(순수 모듈) — recipeOf 는 요리(:9813)가 이미 쓰는 이름이라 별칭
import { millScore, fireScore, knead2Score, crushScore, gradeOfScore } from './craft/minigame.js';   // 🔥🫙 가공 미니게임 판정(순수 모듈)
import { SLOTS_PER_STATION, MAX_UNITS, capacityOf, isReady, setSlot, claimAll, waitedDays, sanitizeSlots, stationOf, slotsOf, unitState } from './craft/slots.js';   // 🔥🫙 가공 슬롯 규칙(순수 모듈)
import { build as buildVatModel, VAT_SCALE, VAT_BOX } from './craft/vat-model.js';   // 🫙 발효통 조형(sims/vat-sim.html B안)
import { headAnchor, neckAnchor, neckR, sideAnchor, backAnchor } from './cosmetics/anchors.js';
import { buildCosmetic } from './cosmetics/art.js';
import { itemsOf } from './cosmetics/catalog.js';
import { equippedItems, sanitize as sanitizeCosmetics, buy as buyCos, equip as equipCos, unequip as unequipCos } from './cosmetics/equip.js';
import { buildTrailMark, TRAIL_CAP, TRAIL_STEP, TRAIL_FADE, TRAIL_SIDE } from './cosmetics/trail.js';   // 👣 발자국 자취(월드 이펙트)
import { buildShop, updateShopOwner } from './shop/building.js';   // 🏪 꾸미기 가게 조형(sims/shop-sim.html B안 — 정면 +Z)
import { PET_RADIUS, CHAIN_MAX, PET_PRICE, PET_KINDS, petKindOf, emptyPet, stageOf, toNextStage, canCommand, pickPetTask, afterWork } from './pet/rules.js';   // 🐾 지시형 펫 규칙(순수 모듈 — 오프라인 정산 없음)
import { spawnPet, snapIfFar, followPlayer, walkTo } from './pet/render.js';   // 🐾 펫 움직임(따라다니기·이동)
import { updatePetAnim, PET_KIND } from './pet/art.js';             // 🐾 펫 조형 애니메이션 규약 + 확정 종
// 📦 데이터 표 — 원문 그대로 옮겼다(분리 1단계, 2026-09-24). 값만 있고 상태는 없다
import {
  CROP_TYPES, BASIC_CROPS, TOOLS, TOOL_PAGES, CHOP_WOOD, TREE_RESPAWN_SEC, WET_TIME, WILT_TIME, ZONE_PAGE, ZONE_TOOL,
} from './data/tools.js';
import {
  FORECAST_MSG, SEVERE_INFO, WEATHER_MSG, DAY_SPEED, PAL,
} from './data/world.js';
import {
  DECOR_SCALE, DECOR, FISH_KINDS, COOK_MG, COURSE_MULT, COURSE_WEIGHT, RECIPES, recipeDiff, CAFE_PAY, BUFF_META, stationLabel,
  SELL_PRICE, SHOP_BUY, UPGRADES, OUTDOOR, KILN_SPOTS, KILN_HOME, KILN_CLEAR_R, kilnAvoidPoints, KILN_SCALE, STATION_IDS,
  VAT_HOME_LOCAL, FARM_PLACE_MSG, isFarmBuilding, OUTDOOR_REACH,
} from './data/catalog.js';
import {
  INT, ROOF_Y, LAKE_R, BENCH, KITCHEN, SHOP, MARKET, RANK, SELL_ICO_G, FARM, FARM_GATE, MINE, MINE_HALF, MINE_GATE,
  PIER, onPier, COOP_STREAK, COOP, PARK_BENCHES, COOP_COST, COOP_FEED, GLADE, GLADE_R, BUG_KINDS, CAFE_GATE, MUSEUM_GATE,
  MUSEUM, CAFE, CAFE_HALF, CAFE_ORDERS, CAFE_BONUS, CAFE_SEATS, CAFE_BOARD, CAFE_GUESTS, cafeGuestDef, FOREST, FOREST_R,
  FOREST_LOGS, FOREST_LOG_R, FOREST_LOG_SPOTS, FORAGE_RESPAWN, FORAGE_KINDS, DOCK_GATE, DOCK_POND, DOCK_POND_R, RIVER,
  RIVER_DOCK_HALF, RIVER_W, RIVER_LEN, BOAT_RUNS_PER_DAY, BOAT_LAMPS, BOAT_BASE_SPEED, BOAT_BOOST_CD, RIVER_OBS, RIVER_PICKS,
  BOAT_UPGRADES, SHOP_POS, SHOP_DOOR, MIST_GATE, MIST, MIST_HALF, MIST_WAVES, TREE_LIGHT_MAX, MIST_DRAIN, SOOTHE_GLOW,
  PURIFY_GLOW, SPIRITS, MIST_LANTERN_POS, LANTERN_CALM_R, MIST_PRACTICE_STEPS, SEA_GATE, SEA_COVE, SEA, ORCHARD_GATE,
  ORCHARD_PROMPT_R, ORCHARD, ORCHARD_HALF, SEA_DECK_W, SEA_DECK_Z0, SEA_DECK_Z1, SEA_EDGE, SEA_SPECIES, ROOF_COLORS,
  WALL_COLORS, DOOR_COLORS, PART_NAME, HOUSE_POS,
} from './data/places.js';
import {
  GIFTS, QUEST_HOW, TALK_PER_DAY, NPCS, DAILY_COUNT, QUEST_COINS, QUEST_LUCKY, DAILY_POOL, validDailyQuests, validQuest,
  AI_QUEST_TIMEOUT,
} from './data/npcs.js';
import {
  DEX, DEX_TOTAL, BADGES, STORY, NICK_ADJS, DAILY_COINS,
} from './data/dex.js';
import {
  _dgUp, _dgQ, _dgW, _dgPQ, _dgP, _dgS, _axX, ARM_AIM_R, ARM_AIM_L, SLASH, WRIST_MAX, TOOL_QREST, TOOL_QSWING, TOOL_QREST_WING,
  TOOL_QREST_HOLD, TOOL_GRIP, slashPhase, PLAYER_R, NPC_R,
} from './data/character.js';
import {
  buildGlade, tryNet, updateFireflyBugs,
} from './spaces/glade.js';   // 📦 🌟 반딧불이 계곡 — 밤에만 열리는 남쪽 숲 (새 동사: 잡기)
import {
  buildForest, forageTarget, tryForage, updateForage,
} from './spaces/forest.js';   // 📦 🍄 채집 숲 — 새 동사: 줍기 (도구 없이, 시간이 지나면 다시 돋음)
import {
  MUSEUM_HALF_D, MUSEUM_HALF_W, MUSEUM_LIGHT, _museumNear, buildCafeHall, cafeCookDone, cafeView, closeCosPreview,
  closeMuseumView, enterCafe, enterMuseum, exitCafe, exitMuseum, josa, museumFloor, museumFloorItems, museumGoFloor,
  museumPlateText, museumStairs, museumView, museumViewFrame, openCosPreview, openMuseumView, playerPhase,
  refreshCafeGuests, refreshMuseumGate, serveCafeGuest, spawnCafeGate, spawnCosmeticShop, updateCafeGuests,
  updateCafeInteract, updateMuseumView,
} from './spaces/cafe.js';   // 📦 ☕ 카페 — 채굴장처럼 처음부터 있는 장소. 홀에 앉은 손님에게 서빙
import {
  boatRunsLeft, boatShopView, buildDockGate, buildRiverSpace, buyBoatUpgrade, endBoatRun, enterRiver, exitRiver,
  startBoatRun, updateBoatCamera, updateBoatRun, updateRiverInteract,
} from './spaces/river.js';   // 📦 🛶 나루터 & 강 내려가기 — 마을 북쪽(12시) 선착장 → 강 인스턴스 공간
import {
  buildMistGate, buildMistSpace, buildOrchardGate, enterMist, enterOrchard, exitMist, exitOrchard, makeBench,
  makeFlower, makeLamp, mistAction, mistDaily, orchardGateBar, orchardGateSolid, syncOrchardGateLock, updateMist,
  updateMistInteract,
} from './spaces/mist.js';   // 📦 🌫️ 안개 낀 숲 — 그림자 정령을 등불·♪음악으로 달래는 무폭력 웨이브
import {
  buildHouseGhost, buildHouseStage, buyHouseAddon, doExpand, expandInfo, houseAddonAnims, houseAddonInfo,
  houseSolidR, unregisterWindows, updateHouseSign, woodTexture,
} from './spaces/house.js';   // 📦 집(건축) — 정해진 터, 단계별 건설
import {
  buildSea, enterSea, exitSea, seaAction, seaPrompt, spawnSeaGate, updateSea, updateSeaVisuals,
} from './spaces/sea.js';   // 📦 🌊 바다터 — 대형 낚시 (docs/design/SEA_FISHING_PLAN.md · 프로토타입 sims/sea-sim.html)
import {
  INT_HALF, STAIR_PROMPT_R, buildDecorGhost, buildInterior, commitDecor, curFloorDef, curHalf, decorClampX,
  decorClampZ, decorMesh, floorHitFromEvent, ghostFarmDef, ghostOk, groundHitFromEvent, nearestDecor, onDecorFloorTap,
  onOutdoorGroundTap, pickDecor, placeDecor, refreshStairsLandmarks, removeDecorGhost, stairLayout, startDecorPlacing,
  stopDecorPlacing, storeDecor, tryPickDecor, updateDecorGhost,
} from './spaces/indoor.js';   // 📦 🏠 집 실내 — 방·계단·가구 배치 (구역 머리말 — 분리 2단계)
import {
  craftFlame, craftFlameBurst, craftFocus, craftStomp, emojiSprite, mgChopFrame, mgChopHit, mgGrillFlip,
  mgPotHit, mgSceneEnd, mgSceneStart, mgSeasonDone, mgSeasonPour, spawnKitchen, spawnRankBoard, spawnWorkbench,
  stationCamDist, updateMgScene,
} from './spaces/kitchen-stage.js';   // 📦 🍳 작업대·자유주방·가공 클로즈업 무대 (구역 머리말 — 분리 2단계)
import {
  applyCarveCamera, carveAbandon, carveDebug, carveSceneEnd, carveStart, workshopView, wset,
} from './spaces/carving.js';   // 📦 🗿 조각 공방 — 깎기 미니게임 (구역 머리말 — 분리 2단계)
import {
  intro, introEnd, introStart, updateIntro,
} from './spaces/prologue.js';   // 📦 🎬 프롤로그 컷신 (구역 머리말 — 분리 2단계)
import {
  buyShop, marketData, sellItem, spawnMarketBoard, spawnShop,
} from './spaces/shop.js';   // 📦 🛒 상점 좌판·시세판·사고팔기 (구역 머리말 — 분리 2단계)
import {
  COOK_TIERS, PANTRY_MAX, buffDur, cookResolve, courseOf, craftTier2, craftUpgrade, emitBuffs, kitchenView,
  pantryEat, pantryView, recipeOf, tier2List,
} from './spaces/cooking.js';   // 📦 🍳 요리 코스·찬장·도구 제작·버프 (구역 머리말 — 분리 2단계)
import {
  addAffinity, craftGift, giveGift, nearestOutdoor, outdoorZone, pickOutdoor, storeOutdoor, tryPickOutdoor,
  withdrawWarehouse,
} from './spaces/outdoor-decor.js';   // 📦 🪵 야외 장식·창고·선물 (구역 머리말 — 분리 2단계)
import {
  rebuildFarm, spawnFarmGate, surveyBenchWorld, surveyDeskWorld,
} from './spaces/farm-field.js';   // 📦 🪧 표지판·텃밭 게이트·측량소·텃밭 필드 (구역 머리말 — 분리 2단계)
import {
  HABITAT_BLOCK_LINE, enterFarm, exitFarm, visitors,
} from './spaces/visitors.js';   // 📦 🦋 텃밭 방문객 안내 (구역 머리말 — 분리 2단계)
import {
  buildMine, enterMine, exitMine, spawnMineGate, tryMine, updateOreRocks,
} from './spaces/mine.js';   // 📦 ⛏️ 채굴 동굴 (구역 머리말 — 분리 2단계)
import {
  enterHouse, exitHouse, goFloor, inVillage2, updateDoorInteract,
} from './spaces/doors.js';   // 📦 🚪 침대·문 근접·구역 안내 (구역 머리말 — 분리 2단계)
import {
  duelActive, investigateTrace, resolveNightVisit, spawnTrace, traceObjs,
} from './spaces/night-visit.js';   // 📦 🦝 밤손님 — 자리를 비운 밤사이 너구리·멧돼지가 작물을 훔쳐간다
import {
  craftCover, refreshCovers, resolveWeatherEvent, weatherPrepView,
} from './spaces/weather.js';   // 📦 🌡️ 날씨 이벤트 — 서리·태풍 예고를 보고 하루 안에 대비하는 재방문 훅
import {
  tryChop, tryFish, updateFishing,
} from './spaces/fishing.js';   // 📦 낚시: 호수 물가에서 던지기 → 물면 낚아채기(반응 미니게임)
import {
  _fmM, buildFarmInstances, createPlot, cycleSeedSel, farmHintMeshes, seedSelCrop, syncFarmCrops, syncFarmSoil,
  syncSeedToolIcon, trellisAdjacent, updateFarmPops,
} from './spaces/farm.js';   // 📦 🌾 밭 인스턴싱 — 흙 121칸이 121드로우콜이던 걸 1콜로
import {
  orchardAction, plantSeed, tryHoe,
} from './spaces/orchard-actions.js';   // 📦 🍎 과수원 액션 — 묘목 심기 · 물주기 · 수확 · 베기 (규칙은 js/orchard.js)
import {
  DIG_ANIM_DUR, DIG_HIT_AT, DIG_RESTORE, applyFert, digHit, digTarget, expireDig, pullWeed, resolveFarmPests,
  setPlotDug, traceTarget, tryDig, trySeed, tryWater, updateDigFx, weedTarget,
} from './spaces/shovel.js';   // 📦 🪏 삽: 빈 밭 메우기(두 번 파기) — 설계 docs/superpowers/specs/2026-09-08-shovel-untill-design.md
import {
  catchUpCraft, catchUpWorkers, commandPet, farmAutoAction, farmAutoPlot, farmCellCount, fireWorker, hireBoardInteract,
  hireView, hireWorker, petWorld, setWorkersVisible, spawnWorkers, updatePet, updatePlots, updateWorkers,
  workerObjs, workerSteps,
} from './spaces/farm-auto.js';   // 📦 🌾 농사 도구 자동 전환 — 규칙은 js/farm-auto.js(farmToolFor), 여기는 게임 상태와 잇는 층
// 🔁 js/spaces/* 가 game.js 의 let 에 쓸 때 거치는 접근자(읽기는 import 한 live binding) — tools/refactor/extract-module.mjs 가 만든다
export const $w = {
  get _hintAnyPrev() { return _hintAnyPrev; }, set _hintAnyPrev(v) { _hintAnyPrev = v; },
  get _seaPrevTool() { return _seaPrevTool; }, set _seaPrevTool(v) { _seaPrevTool = v; },
  get armWristK() { return armWristK; }, set armWristK(v) { armWristK = v; },
  get atCafe() { return atCafe; }, set atCafe(v) { atCafe = v; },
  get atFarm() { return atFarm; }, set atFarm(v) { atFarm = v; },
  get atMine() { return atMine; }, set atMine(v) { atMine = v; },
  get atMist() { return atMist; }, set atMist(v) { atMist = v; },
  get atMuseum() { return atMuseum; }, set atMuseum(v) { atMuseum = v; },
  get atOrchard() { return atOrchard; }, set atOrchard(v) { atOrchard = v; },
  get atRiver() { return atRiver; }, set atRiver(v) { atRiver = v; },
  get atSea() { return atSea; }, set atSea(v) { atSea = v; },
  get baitActive() { return baitActive; }, set baitActive(v) { baitActive = v; },
  get biteAt() { return biteAt; }, set biteAt(v) { biteAt = v; },
  get biteEnd() { return biteEnd; }, set biteEnd(v) { biteEnd = v; },
  get bobber() { return bobber; }, set bobber(v) { bobber = v; },
  get bugRespawnAt() { return bugRespawnAt; }, set bugRespawnAt(v) { bugRespawnAt = v; },
  get cafeGuestCache() { return cafeGuestCache; }, set cafeGuestCache(v) { cafeGuestCache = v; },
  get cafeInGroup() { return cafeInGroup; }, set cafeInGroup(v) { cafeInGroup = v; },
  get cosmeticShop() { return cosmeticShop; }, set cosmeticShop(v) { cosmeticShop = v; },
  get decorGhost() { return decorGhost; }, set decorGhost(v) { decorGhost = v; },
  get decorNearRing() { return decorNearRing; }, set decorNearRing(v) { decorNearRing = v; },
  get decorRot() { return decorRot; }, set decorRot(v) { decorRot = v; },
  get decorTapHintShown() { return decorTapHintShown; }, set decorTapHintShown(v) { decorTapHintShown = v; },
  get decorTarget() { return decorTarget; }, set decorTarget(v) { decorTarget = v; },
  get dockGroup() { return dockGroup; }, set dockGroup(v) { dockGroup = v; },
  get farmCropMeshes() { return farmCropMeshes; }, set farmCropMeshes(v) { farmCropMeshes = v; },
  get farmGroup() { return farmGroup; }, set farmGroup(v) { farmGroup = v; },
  get farmSoilMesh() { return farmSoilMesh; }, set farmSoilMesh(v) { farmSoilMesh = v; },
  get fishDiff() { return fishDiff; }, set fishDiff(v) { fishDiff = v; },
  get fishState() { return fishState; }, set fishState(v) { fishState = v; },
  get forestGroup() { return forestGroup; }, set forestGroup(v) { forestGroup = v; },
  get ghostOutdoor() { return ghostOutdoor; }, set ghostOutdoor(v) { ghostOutdoor = v; },
  get gladeGroup() { return gladeGroup; }, set gladeGroup(v) { gladeGroup = v; },
  get heldToolMesh() { return heldToolMesh; }, set heldToolMesh(v) { heldToolMesh = v; },
  get houseCollider() { return houseCollider; }, set houseCollider(v) { houseCollider = v; },
  get houseFloor() { return houseFloor; }, set houseFloor(v) { houseFloor = v; },
  get houseGhost() { return houseGhost; }, set houseGhost(v) { houseGhost = v; },
  get houseGroup() { return houseGroup; }, set houseGroup(v) { houseGroup = v; },
  get houseSign() { return houseSign; }, set houseSign(v) { houseSign = v; },
  get houseSignCtx() { return houseSignCtx; }, set houseSignCtx(v) { houseSignCtx = v; },
  get houseSignTex() { return houseSignTex; }, set houseSignTex(v) { houseSignTex = v; },
  get indoor() { return indoor; }, set indoor(v) { indoor = v; },
  get interiorFloor() { return interiorFloor; }, set interiorFloor(v) { interiorFloor = v; },
  get interiorFloors() { return interiorFloors; }, set interiorFloors(v) { interiorFloors = v; },
  get interiorGroup() { return interiorGroup; }, set interiorGroup(v) { interiorGroup = v; },
  get interiorLamp() { return interiorLamp; }, set interiorLamp(v) { interiorLamp = v; },
  get lastDoorPrompt() { return lastDoorPrompt; }, set lastDoorPrompt(v) { lastDoorPrompt = v; },
  get lastFloorChoiceKey() { return lastFloorChoiceKey; }, set lastFloorChoiceKey(v) { lastFloorChoiceKey = v; },
  get lastNearHouse() { return lastNearHouse; }, set lastNearHouse(v) { lastNearHouse = v; },
  get lastNearMiss() { return lastNearMiss; }, set lastNearMiss(v) { lastNearMiss = v; },
  get lastZoneHint() { return lastZoneHint; }, set lastZoneHint(v) { lastZoneHint = v; },
  get mgView() { return mgView; }, set mgView(v) { mgView = v; },
  get mineGroup() { return mineGroup; }, set mineGroup(v) { mineGroup = v; },
  get mistGroup() { return mistGroup; }, set mistGroup(v) { mistGroup = v; },
  get mistTree() { return mistTree; }, set mistTree(v) { mistTree = v; },
  get museumGroup() { return museumGroup; }, set museumGroup(v) { museumGroup = v; },
  get nearBench() { return nearBench; }, set nearBench(v) { nearBench = v; },
  get nearBoat() { return nearBoat; }, set nearBoat(v) { nearBoat = v; },
  get nearBoatShop() { return nearBoatShop; }, set nearBoatShop(v) { nearBoatShop = v; },
  get nearCafeBoard() { return nearCafeBoard; }, set nearCafeBoard(v) { nearCafeBoard = v; },
  get nearCafeGuest() { return nearCafeGuest; }, set nearCafeGuest(v) { nearCafeGuest = v; },
  get nearCoop() { return nearCoop; }, set nearCoop(v) { nearCoop = v; },
  get nearCosShop() { return nearCosShop; }, set nearCosShop(v) { nearCosShop = v; },
  get nearDecorMesh() { return nearDecorMesh; }, set nearDecorMesh(v) { nearDecorMesh = v; },
  get nearDoor() { return nearDoor; }, set nearDoor(v) { nearDoor = v; },
  get nearDoorFloor() { return nearDoorFloor; }, set nearDoorFloor(v) { nearDoorFloor = v; },
  get nearForest() { return nearForest; }, set nearForest(v) { nearForest = v; },
  get nearGlade() { return nearGlade; }, set nearGlade(v) { nearGlade = v; },
  get nearKitchen() { return nearKitchen; }, set nearKitchen(v) { nearKitchen = v; },
  get nearMarket() { return nearMarket; }, set nearMarket(v) { nearMarket = v; },
  get nearOutdoorMesh() { return nearOutdoorMesh; }, set nearOutdoorMesh(v) { nearOutdoorMesh = v; },
  get nearRank() { return nearRank; }, set nearRank(v) { nearRank = v; },
  get nearShop() { return nearShop; }, set nearShop(v) { nearShop = v; },
  get nearStation() { return nearStation; }, set nearStation(v) { nearStation = v; },
  get outdoorTarget() { return outdoorTarget; }, set outdoorTarget(v) { outdoorTarget = v; },
  get pendingDig() { return pendingDig; }, set pendingDig(v) { pendingDig = v; },
  get pendingDish() { return pendingDish; }, set pendingDish(v) { pendingDish = v; },
  get petJob() { return petJob; }, set petJob(v) { petJob = v; },
  get pickedDecor() { return pickedDecor; }, set pickedDecor(v) { pickedDecor = v; },
  get pickedOutdoor() { return pickedOutdoor; }, set pickedOutdoor(v) { pickedOutdoor = v; },
  get placingDecor() { return placingDecor; }, set placingDecor(v) { placingDecor = v; },
  get placingOutdoor() { return placingOutdoor; }, set placingOutdoor(v) { placingOutdoor = v; },
  get playerInYard() { return playerInYard; }, set playerInYard(v) { playerInYard = v; },
  get riverGroup() { return riverGroup; }, set riverGroup(v) { riverGroup = v; },
  get seaBuoy() { return seaBuoy; }, set seaBuoy(v) { seaBuoy = v; },
  get seaFishes() { return seaFishes; }, set seaFishes(v) { seaFishes = v; },
  get seaGroup() { return seaGroup; }, set seaGroup(v) { seaGroup = v; },
  get seaLine() { return seaLine; }, set seaLine(v) { seaLine = v; },
  get seaRodMesh() { return seaRodMesh; }, set seaRodMesh(v) { seaRodMesh = v; },
  get sitting() { return sitting; }, set sitting(v) { sitting = v; },
  get wantAction() { return wantAction; }, set wantAction(v) { wantAction = v; },
};

// 모바일 여부 — 렌더 품질/디테일을 낮춰 성능 확보
const IS_MOBILE = /Mobi|Android|iP(hone|od|ad)/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);

// ── 작물 종류(다양화) — 심을 때 랜덤 배정, 열매 색이 달라짐 ─────

// ── 도구 하트바 (선택 도구에 따라 상호작용이 달라짐) ─────────────
//   grp = 하단바 페이지. 🌾농사(밭에서 연달아 쓰는 4종) / 🏕️야외도구(장소마다 단독으로 쓰는 4종).
//   ⛏️괭이는 밭갈기 겸 채굴이라 농사 쪽 — 동굴에서도 농사 페이지가 뜬다.
// ── ✍️ 도구 아이콘(인라인 SVG) — 낫·포충망 ─────────────────────

let currentTool = 1;   // ⛏️괭이 — 시작 페이지(🌾농사)에 있는 도구여야 한다(아래 toolPage 와 짝)

// ── 🎒 도구 페이지 ────────────────────────────────────────────
let toolPage = 'farm';                    // 현재 페이지(첫 시작 = 농사)
let lastPageTool = { farm: 1, out: 0 };   // 페이지별 마지막으로 들었던 도구(돌아올 때 복원)
let lastAutoZone = null;                  // 자동 전환을 이미 적용한 구역(같은 구역에선 수동 선택 유지)
let pageBeforeAuto = null;                // 자동으로 맨손이 되기 직전 페이지(구역을 벗어나면 되돌린다)
let toolBeforeAuto = null;                // 구역이 도구를 정해 주기 직전에 들고 있던 도구(⛏️광산 — 나가면 되돌린다)
let lastOpenPage = 'farm';                // 마지막으로 펼쳐 둔 세트(맨손에서 숫자키를 누르면 여기로 돌아온다)

// ── 날짜 유틸(출석·데일리 퀘스트·날씨 — 로컬 날짜 기준) ─────────
function dayStr(ms) {   // 에포크 ms → 로컬 날짜 키(고용일 비교에도 쓴다)
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr(offsetDays = 0) { return dayStr(Date.now() + offsetDays * 86400000); }
function dateHash(salt, offsetDays = 0) {   // offsetDays: 0=오늘, 1=내일(예보용)
  const s = todayStr(offsetDays) + ':' + salt;
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7fffffff;
  return h;
}
// 🌦️ 오늘의 날씨 — 날짜 시드라 모든 유저에게 동일. 맑음 55% / 비 20% / 눈 12% / 안개 13%
//    테스트: ?weather=rain|snow|fog (?rain=1 도 호환)
function weatherOf(offsetDays = 0) {
  const r = dateHash('weather', offsetDays) % 100;
  return r < 20 ? 'rain' : r < 32 ? 'snow' : r < 45 ? 'fog' : 'clear';
}
const _wq = new URLSearchParams(location.search);
const WEATHER = ['rain', 'snow', 'fog', 'clear'].includes(_wq.get('weather')) ? _wq.get('weather')
  : _wq.has('rain') ? 'rain'
  : weatherOf(0);
// 🔮 내일 예보 — 재방문 유도(출석 모달·데일리 올빼미 대사에 노출)
const FORECAST = weatherOf(1);
// 🌡️ 궂은 날씨 이벤트(서리·태풍) — 날짜 시드라 전 유저 동일. 약 14%의 날에 발생.
//    예보(내일)를 보고 "오늘 수확하거나 덮개를 설치"하게 만드는 재방문 훅.
//    ※ 밤손님과 달리 서버 판정이 없다: 예보가 공개 결정값이라 리롤할 유인이 없기 때문.
//    테스트: ?severe=frost|storm (오늘을 그 이벤트 날로 간주)
function severeOf(offsetDays = 0) {
  const r = dateHash('severe', offsetDays) % 100;
  return r < 7 ? 'frost' : r < 14 ? 'storm' : null;
}
const SEVERE_TODAY = ['frost', 'storm'].includes(_wq?.get?.('severe')) ? _wq.get('severe') : severeOf(0);
const SEVERE_TOMORROW = ['frost', 'storm'].includes(_wq?.get?.('severe2')) ? _wq.get('severe2') : severeOf(1); // ?severe2= 내일 예보 강제(테스트)
// 내일 예보 한 줄 — 궂은 이벤트가 있으면 일반 날씨 예보를 덮어쓴다(우선 안내)
function forecastLine() {
  if (SEVERE_TOMORROW) {
    const s = SEVERE_INFO[SEVERE_TOMORROW];
    return `내일은 ${s.ico} ${s.name} 예보! 오늘 수확하거나 작업대에서 덮개를 준비하세요!`;
  }
  return FORECAST_MSG[FORECAST];
}
const RAIN_DAY = WEATHER === 'rain';   // 비 전용 효과(밭 자동 성장·낚시 행운·빗소리)에 사용
let rainLines = null;  // 날씨 파티클(빗줄기/눈송이 LineSegments)

// ── 집 꾸미기 가구 카탈로그 (작물 💰 로 구매해 실내에 배치) ──────
//   다른 실내 층(1층·다락·2층)은 전부 y=0 그대로 — 벽으로 막힌 방이라 높이가 안 보여도 상관없다.

// ── 낚시 ─────────────────────────────────────────────────────
// ── 🍳 요리 미니게임 4종 ─────────────────────────────────────────────
// ── 요리 레시피(자유주방) — 작물/물고기 → 일시 버프 ──
const buffs = { speed: 0, luck: 0, chop: 0, mine: 0 };   // 각 버프 만료 시각(clock.elapsedTime 기준)
function buffOn(k) { return clock.elapsedTime < buffs[k]; }
let nearBench = false;
let nearStation = null;           // 🔥🫙 가까운 가공 시설 레코드(배치형이라 좌표가 여럿 — 가장 가까운 것)
let nearKitchen = false;
let nearShop = false;
let nearMarket = false;
let nearRank = false;
function farmHalf() { return farmHalfOf(gameState.farm?.stage || 1); }
let playerInYard = false;   // 📐 측량소 마당(울타리 밖)에 있나 — 문을 지날 때만 바뀐다(clampFarmPos)   // 텃밭 반경(정사각 한 변의 절반) — 단계 표는 js/farm-stage.js
let atFarm = false;                             // 텃밭 안에 있는지
let lastMini = 0;                               // 미니맵 갱신 throttle
let atMine = false;
let atOrchard = false;                          // 🍎 과수원 언덕 안에 있는지
let nearCoop = false, coopGroup = null, coopSign = null;
const chickens = [];                            // 닭 메시
const chickenStates = [];                       // 같은 순서의 행동 상태(js/coop-chickens.js)
const oreRocks = [];                            // 동굴 광석 바위들
const mineTorches = [];                         // 동굴 벽 횃불(깜빡임)
let farmGroup, mineGroup;                        // 텃밭/동굴 그룹(가시성 토글용)

// ── 🌟 반딧불이 계곡(남쪽 숲) — 🌙 밤에만 나타나고 🦋포충망으로 잡는 "새 동사" ──
const GLADE_MAX = IS_MOBILE ? 5 : 7;            // 동시 개체 수
const gladeBugs = [];                           // 살아있는 반딧불이 개체
let gladeGroup = null, nearGlade = false;
let bugRespawnAt = 0;                           // 다음 개체 보충 시각(clock.elapsedTime)
let nightLevel = 0;                             // updateDayNight 이 매 프레임 갱신(0=한낮 1=한밤)
function isNight() { return isNightAt(timeOfDay); }   // 판정은 js/daynight.js 가 단일 출처(테스트가 잠근다)

// ── ☕ 카페 — 채굴장처럼 처음부터 마을에 있는 장소. 새 동사: 접객/서빙 ──
let atCafe = false, nearCafeBoard = false;
let atMuseum = false, museumGroup = null;   // 🏛️ 박물관 전시실
let cafeInGroup = null, cafeGuestObjs = [];     // 홀 그룹 / 앉은 손님 런타임 { order, group, sprite, phase }
let nearCafeGuest = null;

// ── ☕ 카페 손님 캐스트 — **마을 주민이 아닌 "이웃 마을에서 찾아오는 손님들"** ──

// ── 🍄 채집 숲(남서쪽) — 새 동사: 채집(심지 않고 줍기). 시간이 지나면 다시 돋아남 ──
const FORAGE_NODES = IS_MOBILE ? 8 : 11;        // 동시에 돋아 있는 채집물 수
const forageNodes = [];                          // { mesh, kind, x, z, ready, respawnAt, phase }
let forestGroup = null, nearForest = false;

// ── 🛶 나루터 & 강 내려가기(마을 북쪽 12시) — 새 동사: 노 젓기 ──────────
let riverGroup = null, dockGroup = null;          // 강 공간 / 마을 선착장 그룹
let atRiver = false;                              // 강 공간에 있는지(나루터 데크 포함)
let nearBoat = false, nearBoatShop = false;       // 데크 위 근접 대상
let boatView = 'first';                           // 'first'(1인칭) | 'third' — 멀미 대비 토글
const riverCourse = [];                           // 이번 런의 코스 데이터(시드 생성, 진행거리 오름차순)
const riverActive = [];                           // 화면에 떠 있는 오브젝트 { mesh, item }
const riverPool = {};                             // 종류별 메시 재사용 풀(모바일 부담 감소) { kind: [mesh] }
// 진행 중인 런 상태 — active=false 면 데크에서 대기 중
const boat = {
  active: false, group: null, dist: 0, speed: 0, vx: 0, lamps: 0, stars: 0,
  hits: 0, hitLog: [], picks: {}, boostUntil: 0, boostReadyAt: 0, boostUsed: 0,
  invUntil: 0, stunUntil: 0, wreckAt: 0, shake: 0, next: 0, runNo: 0, seed: 0, startedAt: 0, night: false, t: 0,
};

let cosmeticShop = null;          // buildShop 이 돌려준 { group, owner, lamp } — 프레임 루프가 주인을 움직인다
let nearCosShop = false;

// ── 🌫️ 안개 낀 숲(마을 북서) — 새 동사: 등불 점화 + ♪연주로 달래기(무폭력 웨이브) ──
let mistGroup = null, atMist = false;
let mistTree = null;                                 // 수호목 { group, foliage[], light }
const mistLanterns = [];                             // { group, headMat, light, lit }
// 진행 중인 정화 상태 — active=false 면 웨이브 전(수호목에서 시작)
const mist = { active: false, wave: 0, spirits: [], treeLight: TREE_LIGHT_MAX, soothe: null, t: 0, warned: false,
               practice: false, step: -1, choiceOpen: false };   // practice=연습 중 · step=연습 단계(3=완료 카드 표시 중) · choiceOpen=갈림길 카드

// ── 🌊 바다터(대형 낚시) — 기획: docs/design/SEA_FISHING_PLAN.md ──────────────

// ── 🍎 과수원 언덕 — 기획: docs/superpowers/specs/2026-09-17-orchard-design.md ──────────────
let orchardGroup = null;                            // 과수원 그룹(가시성 토글용) — rebuildOrchard() 가 채운다
let orchardTreeObstacles = [];   // 밭 금지 표시 — syncOrchardTrees() 가 obstacles 에 등록한 항목. 다시 부르기 전에 지운다(시설 obstacle 정리와 같은 방식)
let orchardTreeSolids = [];      // 나무 몸 충돌체 — 다시 그릴 때 removeSolid 로 치운다
let orchardStreamSolids = [];    // 시냇물 충돌체 — 물 위를 걸을 수 없게
let seaGroup = null, atSea = false;
let seaFishes = [];                                   // 배회 물고기 { g, sp, ang, des, spd, tTurn } (seaGroup 로컬 좌표)
let seaBuoy = null, seaLine = null, seaRodMesh = null, _seaPrevTool = null;
// 진행 상태 머신 — idle(배회 관찰) → cast(비행·입질 대기) → fight(버둥/당기기) → catch/miss
const seaMG = { st: 'idle', t: 0, phase: 'struggle', phaseLen: 0, progress: 0, sp: null,
  pz: 0, fishDir: 1, landed: false, good: 0, bad: 0, t0: 0, fmesh: null, doneT: 0 };

// 현재 있는 공간만 보이게 — 다른 인스턴스 공간은 숨김
function setSpaceVisible() {
  // 🏠 층은 한 번에 하나만 — interiorGroup 하나가 아니라 층별 그룹(id 로 키)을 토글한다.
  const showId = (floorAt(gameState.houseStage, houseFloor) || { id: 'ground' }).id;
  for (const id in interiorFloors) interiorFloors[id].visible = indoor && id === showId;
  refreshStairsLandmarks();   // 증축으로 houseStage 가 바뀌었을 수도 있으니 전환마다 다시 계산(스펙 §3 위반 A)
  interiorGroup = interiorFloors[showId] || interiorFloors.ground;   // 레이캐스트(interiorFloor)·미니맵 등이 참조하는 "지금 방"
  interiorFloor = interiorGroup ? interiorGroup.userData.floorGroup : interiorFloor;   // 🌀 방마다 바닥 메시를 담은 floorGroup — floorHitFromEvent 가 재귀 레이캐스트로 받는다
  // 🛋️ 가구 메시는 scene 직속(interiorGroup 자식이 아님) — 방과 같이 따로 꺼야 한다.
  //    방은 월드 (0,0,52)에 실제로 서 있고 마을 이동 한계는 반경 42다. 그래서 북쪽 끝에 서면
  //    벽·바닥이 숨은 자리에 가구만 들판 위에 떠 보였다(제보 2026-09-15 "맵 끝에 피아노·장롱").
  //    ⚠️ 층이 생긴 뒤로는 다른 층 가구도 같은 이유로 떠 보인다 — indoor && 같은 층(f) 두 조건을 모두 본다.
  // 🚧 발자국 콜라이더도 층별로 꺼야 한다 — solidBox 는 off:false 로 시작해 층과 무관하게 항상 막고 있었다.
  //   1층 침대가 2층 같은 로컬 좌표에 안 보이는 벽으로 남는 신규 회귀(오레·그루터기와 같은 off 관용구로 고침).
  for (const m of decorMeshes) {
    m.visible = indoor && (m.userData.rec?.f || 0) === houseFloor;
    if (m.userData.collider) m.userData.collider.off = !m.visible;
  }
  if (farmGroup) farmGroup.visible = atFarm;
  setWorkersVisible(atFarm);   // 🧑‍🌾 일꾼은 텃밭에서만 보인다(밖에선 규칙만 돌아간다)
  // 🌾 밭 흙·이랑·작물·배지 InstancedMesh 는 scene 직속(farmGroup 자식이 아님) — 따로 토글해야 한다.
  //   plots 배열엔 마을 밭과 텃밭 밭이 함께 들어있고 두 곳이 같은 InstancedMesh 를 공유하므로
  //   atFarm 이 아니라 "실외인가"(outdoorZone) 기준으로 켜야 마을 안 밭도 보인다.
  const farmVisible = outdoorZone();
  if (farmSoilMesh) farmSoilMesh.visible = farmVisible;
  if (farmCropMeshes) for (const k of ['sprout', 'stem', 'leaf', 'bush', 'fruit']) farmCropMeshes[k].visible = farmVisible;
  if (farmHintMeshes) for (const k of ['warn', 'harvest', 'seedHint', 'weed', 'pest']) farmHintMeshes[k].visible = farmVisible;
  if (mineGroup) mineGroup.visible = atMine;
  if (cafeInGroup) cafeInGroup.visible = atCafe;
  if (museumGroup) museumGroup.visible = atMuseum;
  if (riverGroup) riverGroup.visible = atRiver;
  if (mistGroup) mistGroup.visible = atMist;
  if (seaGroup) seaGroup.visible = atSea;
  if (orchardGroup) orchardGroup.visible = atOrchard;
  // 🌓 그림자: 마을에서만 섀도맵을 갱신한다. 어떤 공간을 멈출지는 js/shadow-scope.js(SUBSPACE_FLAGS).
  //   텃밭은 실외라 outdoorZone() 에는 들어가지만 z=84 로 그림자 상자 밖이라 여기선 함께 멈춘다.
  setShadowActive(shadowActiveFor(spaceFlags()));
  // 🌧️ 빗소리: 비 오는 날 야외(마을·텃밭·강)에서만 — 실내·동굴·카페에선 정지
  if (RAIN_DAY && mode === 'play' && !indoor && !atMine && !atCafe && !atMuseum) startRainSound();
  else stopRainSound();
}
// ── 🪙 오늘의 시세 — 품목별 판매가가 날짜 시드로 매일 0.7~1.3배 변동(전원 동일) ──
//    팔 타이밍 전략이 생기고, econ_logs 에 시세 반응 데이터가 쌓임(분석용)
function priceRate(k) { return 0.7 + (dateHash('price:' + k) % 61) / 100; }     // 0.70 ~ 1.30
function priceOf(k) { return Math.max(1, Math.round(SELL_PRICE[k] * priceRate(k))); }

// ── 도구 업그레이드(작업대) — 영구 강화, 재료 소비 ──

// ── 야외 장식(작업대) — 마당에 설치, 재료 소비 ──

/** 후보 점수 — 나무에서 멀고 **기존 시설·주민에서도 떨어진** 자리.
 *  나무만 보고 고르니 화덕이 ⛏️채굴장 옆에 붙었다(2026-09-20 실측).
 *  나무는 일정 거리만 벌면 충분하지만(3 에서 포화), 시설은 멀수록 좋으므로 가중치를 크게 둔다. */
function pickKilnSpot() {
  const avoid = kilnAvoidPoints();
  let best = KILN_HOME, bestScore = -1;
  for (const [x, z] of KILN_SPOTS) {
    let treeD = 99, lmD = 99;
    for (const t of trees) treeD = Math.min(treeD, Math.hypot(t.position.x - x, t.position.z - z));
    for (const a of avoid) lmD = Math.min(lmD, Math.hypot(a.x - x, a.z - z));
    const score = Math.min(treeD, 3) * 0.8 + lmD;      // 나무는 3 이면 충분, 시설 거리가 주도한다
    if (score > bestScore) { bestScore = score; best = [x, z]; }
  }
  return best;
}
/** 화덕 자리와 **앞 통로**를 비운다.
 *  주변만 치우면 다가갈 때 카메라가 앞 나무를 뚫어 화면이 잎으로 덮인다(사용자 실측 2026-09-20).
 *  카메라는 플레이어 뒤 남쪽에 있으므로 화덕 앞(z+) 좁은 길만 낸다 — 마을이 휑해지지 않게 폭은 조인다. */
function clearTreesForKiln(x, z) {
  for (let i = trees.length - 1; i >= 0; i--) {
    const t = trees[i];
    const dx = t.position.x - x, dz = t.position.z - z;
    const near = Math.hypot(dx, dz) < KILN_CLEAR_R;
    const front = dz > 0 && dz < 5.5 && Math.abs(dx) < 2.7;     // 접근 통로(1.9 로는 팻말 쪽 나무가 남았다)
    if (near || front) {
      scene.remove(t); trees.splice(i, 1);
      const oi = obstacles.findIndex(o => Math.abs(o.x - t.position.x) < 0.01 && Math.abs(o.z - t.position.z) < 0.01);
      if (oi >= 0) obstacles.splice(oi, 1);      // 밭 금지 원도 같이 치운다
      // 🚧 충돌체도 반드시 같이 —— 안 치우면 **안 보이는 나무**가 그대로 서서
      //    화덕 앞을 지날 때마다 걸린다(사용자 지적 2026-09-21). spawnTree 가 userData.collider 에 달아 둔다.
      if (t.userData?.collider) removeSolid(t.userData.collider);
    }
  }
}
function stationCount(id) { return gameState.outdoor.filter(r => r.id === id).length; }
function canBuildStation(id) { return stationCount(id) < MAX_UNITS; }
function kilnCount() { return stationCount('kiln'); }


// 🔥 화덕 불꽃 — 서로 다른 박자로 늘었다 줄고 비틀린다. updateDayNight 가 매 프레임 돌린다
const kilnFlames = [];

// 가공 시설의 겉모습을 슬롯 상태에 맞춘다. 슬롯은 특정 채에 묶여 있지 않고
// 'i 번째 = 그 시설 칸의 2i·2i+1' 로 파생한다(배치 장식엔 고유 id 가 없다 — js/craft/slots.js 참고).
// 안 보이는 부분은 드로우콜도 잡히지 않으므로 visible 토글로 끝낸다.
function refreshStations() {
  const today = todayStr();
  const seq = { kiln: 0, vat: 0 };
  for (const m of outdoorMeshes) {
    const id = m.userData.rec?.id;
    if (id !== 'kiln' && id !== 'vat') continue;
    const parts = m.userData.station;
    if (!parts) { seq[id]++; continue; }
    const st = unitState(gameState.craft.slots, id, seq[id], today);
    if (id === 'kiln') {
      parts.fire.visible = st === 'firing';
      parts.load.visible = st === 'done';
      parts.logs.visible = st !== 'done';   // 다 구우면 장작을 썼다
    } else {
      parts.firing.visible = st === 'firing';   // 마개 + 포도 바구니
      parts.done.visible = st === 'done';       // 꼭지 아래 잔 + 채운 병
    }
    seq[id]++;
  }
}

function farmBuildingRecs(except = null) { return gameState.outdoor.filter(r => r !== except && isFarmBuilding(r.id)); }   // 시설 레코드만(옮기는 중인 자기 자신 제외)

// ── 🦋 텃밭 방문객 — 환경 점수 입력 ──────────────────────────────
//   js/habitat.js 는 순수 모듈이라 좌표·상태를 여기서 모아 넘긴다.
//   ⚠️ gameState.outdoor 와 plots 는 월드 좌표, perimeterTrees() 는 **밭 로컬**이다(FARM 을 더한다).
//   ⚠️ 여기에 물 준 상태를 넣지 않는다 — WET_TIME=9 라 9초짜리인 데다 세이브에도 안 남는다.
//      스폰 지연이 6~14초라 🐸 가 영원히 안 온다(habitat.js 주석·테스트가 잠근다).
let habitatSrc = null, habitatSrcAt = -1e9;   // 1초 스로틀 캐시
let habitatDirty = true;

function markHabitatDirty() { habitatDirty = true; }

/** 밭 주변만 본다 — 마을 장식은 80 이상 떨어져 있어 가장 넓은 반경(8) 안에 들어올 수 없다 */
function habitatSources() {
  const H = farmHalf(), reach = H + 12;
  const nearFarm = (x, z) => Math.hypot(x - FARM.x, z - FARM.z) <= reach;
  return {
    decor: gameState.outdoor.filter(o => ENV_TAG[o.id] && nearFarm(o.x, o.z)),
    mature: plots.filter(p => p.state === 'mature').map(p => ({ x: p.x, z: p.z })),
    trees: perimeterTrees(H).map(t => ({ x: FARM.x + t.x, z: FARM.z + t.z })),
    rain: RAIN_DAY,
  };
}

function habitatCtx() { return { night: isNight(), rain: RAIN_DAY }; }

// 📖 게이트 판정 입력 — 획득 판정은 날씨와 밤낮을 **둘 다** 본다.
//   ⚠️ 🧑‍🦳큐레이터 의뢰는 weatherOpen(날씨만) 을 쓴다. 의뢰는 하루치 시드로 고정되는데
//      밤낮은 하루 안에 바뀌므로, 밤 종을 낮에 걸러내면 그날 의뢰가 사라진다(스펙 참고).
function situation() { return { weather: WEATHER, night: isNight() }; }

// 📖 [GA4] 게이트가 닫혀 못 얻은 순간 — 게이트가 너무 조이는지 보는 축.
//   예: 🌈무지개 물고기 획득률이 한 달 뒤에도 안 오르면 확률 22%를 올린다.
//   ⚠️ 굴림마다 쏘면 이벤트가 폭주한다. 카테고리별로 **하루 한 번**만 쏜다
//      (🦋visitor_nearmiss 에서 실제로 겪었다 — 조건 안팎 10번 오가니 이벤트 10개).
//   ⚠️ 굴림 함수 안이 아니라 **플레이어가 그 활동을 실제로 한 지점**에서 부른다.
//      반딧불이는 스폰마다 rollBugKind 가 돌지만 플레이어가 잡은 건 아니다.
const _gateBlockedToday = {};
function trackGateBlocked(cat, id) {
  if (gameState.dex[cat]?.[id]) return;                 // 이미 가진 사람은 관심 없다
  if (gateOpen(gateOf(cat, id), situation())) return;   // 열려 있으면 막힌 게 아니다
  const key = cat + ':' + todayStr();
  if (_gateBlockedToday[key]) return;
  _gateBlockedToday[key] = 1;
  const s = situation();
  trackEvent('dex_gate_blocked', { category: cat, entry: id, weather: s.weather, night: s.night ? 1 : 0 });
}

/** 스로틀된 소스로 한 지점 판정 — 매 프레임 불러도 초당 1회만 다시 모은다 */
function habitatEnvAt(x, z) {
  const now = clock.elapsedTime;
  if (habitatDirty || !habitatSrc || now - habitatSrcAt >= 1) {
    habitatSrc = habitatSources(); habitatSrcAt = now; habitatDirty = false;
  }
  return envAt(habitatSrc, x, z);
}

/** 밭 안을 한 칸 간격으로 훑은 후보 지점(월드) — 3단계(half 11)에서 최대 약 120칸 */
function habitatCells() {
  const H = farmHalf(), out = [];
  for (let x = -H; x <= H; x += FARM_CELL) {
    for (let z = -H; z <= H; z += FARM_CELL) {
      if (Math.hypot(x, z) > H) continue;
      out.push({ x: FARM.x + x, z: FARM.z + z });
    }
  }
  return out;
}
let placingOutdoor = null;      // 배치 중인 야외 장식 id
const outdoorMeshes = [];
let pickedOutdoor = null;       // 🪵 들어 올린 기존 야외 장식 {id, x, z, farm} — 취소·구역 이탈 시 제자리로(값 없이 다시 놓기)
let nearOutdoorMesh = null;     // 🪵 근접 프롬프트 대상 야외 장식(옮기기)

// ── 주민 선물(작업대) — 제작해서 주민에게 주면 친밀도↑ ──

let fishState = 'idle';   // 'idle' | 'wait' | 'bite'
let baitActive = false;   // 🪱 이번 캐스트에 미끼 사용 중(회당 소모, 희귀 확률 이중 굴림)
let biteAt = 0, biteEnd = 0;
let fishDiff = { ease: 1, arm: null, dda: 1 };   // 🎚️ 이번 캐스트의 난이도 — 입질 여유 배율 + 로깅용 팔·DDA
let bobber = null;        // 찌(3D)
const castPos = new THREE.Vector3();
const _v = new THREE.Vector3(); // 임시 벡터

// ── 📜 퀘스트 "어떻게 하나요" 한 줄 — 유형별 단일 출처 ───────────────

// ── 마을 주민(NPC) 정의 — 각자 이름/색/퀘스트 체인 ───────────────


//   📜 일일 의뢰 개수(DAILY_COUNT·QUEST_COINS 는 js/data/npcs.js) — 2026-09-24 3→5.
//      바꿀 땐 셋을 함께: DAILY_COUNT · functions/api/daily-quests.js 의 NEED · scripts/serve.py 의 QUEST_NEED
//      (어긋나면 AI 의뢰가 개수 검증에 걸려 통째로 버려진다 — tests/quests.test.mjs 가 잠근다)
//      배포한 날 진행 중인 목록은 다시 뽑지 않고 뒤에 덧붙인다 — refreshDailyQuests 의 dailyExtendPlan.


// ── 데일리 퀘스트 풀 — 매일 DAILY_COUNT(5)개 뽑기(완료 시 코인 + 앞 3건은 🎁럭키박스 확률 보상) ──

// 🔒 지금 이 세이브에서 깰 수 있는 의뢰인지 판정하는 데 필요한 상태 — js/quests.js 의 게이트가 본다.
//   ⚠️ 베타 A/B 가 끝나 맵 잠금이 항상 false 가 되어도 닭장·집 단계 조건은 계속 일한다.
function questCtx() {
  return {
    coopBuilt: !!gameState.coop.built,
    houseStage: gameState.houseStage,
    locked: { river: mapLocked('river'), sea: mapLocked('sea'), mist: mapLocked('mist') },
    // 📖 오늘 날씨에 닫힌 희귀종은 의뢰로 나오지 않게(js/dex-gates.js).
    //   ⚠️ 밤낮은 안 넘긴다 — 의뢰는 하루치 시드로 고정되는데 밤낮은 하루 안에 바뀐다.
    weather: WEATHER,
  };
}


// ── 🔁 주민 반복 의뢰 ─────────────────────────────────────────
//   베타 건의: "올빼미 의뢰랑 미션들 깨다보면 미션이 없어지는 지점이 있는데 그때는 뭘 해야할지 모르겠어요".
//   체인을 다 깬 주민이 영원히 doneLine 만 하던 것을 없앤다.
//   ⚠️ st.idx(체인 포인터)는 절대 건드리지 않는다 — 체인 길이는 배포로 바뀌고,
//      포인터가 범위를 벗어나면 그 주민의 대화가 통째로 깨진다.
//      그래서 올빼미 ✨특별 의뢰와 같이 별도 슬롯(st.repeat)에 보관한다.
//   ⚠️ 주민 전원이 매일 의뢰를 내면 코인 발행이 3배가 된다 → 하루 REPEAT_OPEN 명만 열린다.
function refreshRepeatQuests() {
  const today = todayStr();
  const open = new Set(repeatNPCsFor(NPCS.map(n => n.id), dateHash('repeat')));
  const ctx = questCtx();
  for (const def of NPCS) {
    const st = npcState(def.id);
    if (st.repeat && st.repeat.date !== today) st.repeat = null;   // 어제 부탁은 소멸
    if (!open.has(def.id)) continue;
    if (st.idx < def.quests.length) continue;   // 아직 체인이 남았다 — 반복 의뢰는 그다음 차례
    if (st.repeat) continue;                    // 오늘 것은 이미 정해졌다(진행 중일 수 있다)
    let q = repeatQuestFor(def.id, dateHash('repeat'), ctx);
    if (def.id === 'curator') {
      // 🏛️ "아직 🌈무지개 물고기가 없군요" — 남은 종을 콕 집어 준다.
      //   베타 피드백 "미션이 없어지는 지점에서 뭘 해야 할지 모르겠다" 를 직접 푸는 자리.
      //   다 모았으면 집을 게 없으니 일반 반복 의뢰(채집·채굴)로 폴백한다.
      const miss = pickMissingDex(gameState.dex, DEX, dateHash('repeat'), ctx);
      //   ⚠️ 문구는 사전 패턴으로 — 템플릿 리터럴 그대로면 영어에서 한국어가 그대로 남는다
      if (miss) q = { type: 'dex_one', cat: miss.cat, dexId: miss.id, target: 1,
        title: '빈 진열장', desc: `${miss.ico} ${miss.name} 도감 등록`, reward: { coins: 14 },
        line: `아직 ${miss.ico}${miss.name}이(가) 없군요. 구해다 주시겠어요?` };
    }
    if (!q || !validQuest(q)) continue;         // 전문 분야가 전부 막혔다 → 오늘은 열지 않는다
    st.repeat = { date: today, done: false, q: { ...q, line: `오늘은 이것 좀 도와줄래요? ${q.desc}!` } };
    st.allDone = false; st.given = false; st.progress = 0; st.readyToasted = false;
  }
}

// 지금 이 주민이 내주고 있는 의뢰 — 체인이 남았으면 체인, 다 깼으면 오늘의 반복 의뢰.
//   둘 다 없으면 null(= 대화는 'done').
//   ⚠️ 판정은 js/quests.js 의 pickCurrent 한 곳에만 둔다. 체인 길이는 배포로 바뀌므로
//      "idx >= quests.length" 로 반복 의뢰를 가려내면, 체인이 길어지는 순간 수행 중이던
//      반복 의뢰가 새 체인 의뢰로 바꿔치기된다(진행도·보상 증발 + 이미 만족된 의뢰 공짜 수령).
//   🦉 올빼미의 idx 는 체인 포인터가 아니라 그날 일일 의뢰 포인터라 스킵 대상이 아니다.
// 🔨 히든 의뢰(📜 도면) — 친밀도 문턱을 넘은 주민이 전문 도구 도면을 건다(js/tool-blueprints.js).
//   ⚠️ 체인 의뢰가 남아 있으면 그걸 먼저 — 비밀 의뢰가 이야기 진행을 가로막으면 원치 않는 사람이 멈춘다.
//      수락해 둔 히든 의뢰는 언제나 최우선(진행도 포인터를 이 의뢰가 쥐고 있다). 반복 의뢰보다는 앞선다.
function hiddenCurrent(def, st) {
  if (def.daily) return null;
  const q = hiddenQuestFor(def.id, { affinity: gameState.affinity[def.id] || 0, blueprints: gameState.blueprints });
  if (!q) {   // 도면을 이미 받았거나 표가 바뀌었다 — 수락 표시가 남아 있으면 포인터째 정리
    if (st.hidden) { st.hidden = false; st.given = false; st.progress = 0; }
    return null;
  }
  if (st.hidden) return q;
  if (st.given) return null;                       // 다른 의뢰 수행 중 — 끝나면 연다
  const r = pickCurrent(def.quests, st, questCtx(), todayStr(), { skip: !def.daily });
  if (r.q && !r.repeat) return null;               // 체인이 남아 있다 — 먼저
  return q;
}

function currentQuest(def, st) {
  const h = hiddenCurrent(def, st); if (h) return h;
  const r = pickCurrent(def.quests, st, questCtx(), todayStr(), { skip: !def.daily });
  if (r.idx !== st.idx) {
    // [GA4] 마이그레이션으로 건너뛴 의뢰 — 없으면 "아직 도달 못 함" 과 구분되지 않아 체인 퍼널이 왜곡된다
    trackEvent('quest_autoskip', { npc: def.id, from: st.idx, to: r.idx, house_stage: gameState.houseStage });
    st.idx = r.idx;
  }
  return r.q;
}

// 지금 진행 중인 게 반복 의뢰인가 — 보상 처리(친밀도·포인터)가 갈린다
function onRepeatQuest(def, st) {
  if (hiddenCurrent(def, st)) return false;
  return pickCurrent(def.quests, st, questCtx(), todayStr(), { skip: !def.daily }).repeat;
}

// 퍼널 분석용 표준 퀘스트 id. 반복 의뢰는 순번이 없으니 목표 종류로 구분한다
//   (날짜를 넣으면 GA4 에서 매일 다른 id 가 되어 집계가 갈린다).
function questId(def, st) {
  const h = hiddenCurrent(def, st);
  if (h) return questIdFor({ npcId: def.id, hiddenTool: h.tool });   // 🔨 npc:hidden:도구
  //   ✨특별 의뢰는 오늘 일일 목록 바로 뒤에 붙는다 — 판정은 상수(DAILY_COUNT)가 아니라 **오늘 목록의 실제 길이**로.
  //   3→5 배포 날 특별 의뢰를 이미 받은 사람은 목록이 3건이라, 상수와 비교하면 courier:3 으로 찍혀 4번째 일일 의뢰와 겹친다.
  const dailyLen = Array.isArray(st.quests) ? st.quests.length : DAILY_COUNT;
  const special = def.daily && st.special && st.idx >= dailyLen && !onRepeatQuest(def, st) ? st.special.type : undefined;
  return questIdFor({ npcId: def.id, idx: st.idx, repeat: onRepeatQuest(def, st), repeatType: st.repeat?.q?.type, specialType: special });
}

// 매일 접속 시 호출 — 날짜가 바뀌면 의뢰 리셋, 아니면 그날 확정된 의뢰를 그대로 쓴다.
//   ⚠️ 진행도는 "몇 번째(st.idx) 를 몇 개(st.progress)" 라는 순번 포인터로만 저장된다.
//      의뢰 목록을 하루 중에 다시 뽑으면 그 포인터가 엉뚱한 의뢰를 가리켜,
//      손도 안 댄 의뢰가 절반 차 있고 하던 진행도는 증발한다.
//      그래서 뽑은 DAILY_COUNT 개를 st.quests 에 통째로 저장해 두고 날짜가 바뀔 때까지 재생성하지 않는다.
//      (지금은 날짜 시드라 결과가 같아 드러나지 않지만, DAILY_POOL 을 낮에 배포로 바꾸면
//       풀 길이가 달라져 곧바로 어긋난다. 나중에 의뢰를 동적 생성하면 상시 문제가 된다.)
function refreshDailyQuests() {
  const def = NPCS.find(n => n.daily); if (!def) return;
  const st = npcState(def.id);
  const today = todayStr();
  if (st.date !== today) {   // 새 날 → 진행 상태 리셋(어제 의뢰는 소멸)
    st.date = today; st.idx = 0; st.progress = 0; st.given = false; st.allDone = false; st.acceptedAt = null;
    st.quests = null; st.qsrc = null;   // 어제 의뢰도 함께 버린다(AI 표시도 리셋)
    st.special = null;                  // ✨어제 특별 의뢰도 소멸(하루 1건)
  }
  def.doneLine = `오늘 의뢰는 전부 끝! ${forecastLine()}${forecastDexNudge()} 내일 새 의뢰 들고 올게요 🦉`; // 예보로 재방문 유도(+날씨 도감 훅)

  //   ✨특별 의뢰는 st.special 에 따로 보관한다 — 일일 배열에 섞어 저장하면
  //   validDailyQuests 의 개수(DAILY_COUNT) 검증에 걸려 다음 접속 때 의뢰가 통째로 다시 뽑히고 진행도가 어긋난다.
  if (st.special && !validQuest(st.special)) st.special = null;   // 옛 세이브·바뀐 풀에서 온 못 깨는 의뢰는 버린다
  const withSpecial = (daily) => (st.special ? [...daily, st.special] : daily);
  if (validDailyQuests(st.quests)) { def.quests = withSpecial(st.quests); return; }   // 오늘 의뢰는 이미 확정됨

  // 📜 개수를 늘린 날(3→5 배포 등) — 오늘 받은 목록과 포인터는 그대로 두고 모자란 만큼만 붙인다.
  //    다시 뽑으면 다 깬 사람이 보상을 또 받고 진행 중이던 사람은 진행도를 잃는다(js/quests.js).
  const started = st.idx > 0 || st.progress > 0 || !!st.given;   // 잃을 진행도가 있는가
  const plan = dailyExtendPlan(st.quests, DAILY_COUNT, { valid: validQuest, started, hasSpecial: !!st.special });
  if (plan === 'keep') { def.quests = withSpecial(st.quests); return; }   // ✨특별 의뢰를 받은 날 — 오늘은 그대로, 내일부터 새 개수
  if (plan === 'extend') {
    //   덧붙인 날은 앞 건들이 옛 보상표(10·15·20)를 그대로 가져 합계가 80🪙 — 하루뿐이고, 이미 받은 보상을
    //   되돌릴 수는 없으니 그대로 둔다(시작 전인 사람은 위 판정에서 새로 뽑혀 70🪙).
    const base = st.quests.length;
    const extra = pickDailyExtra(DAILY_POOL, st.quests, DAILY_COUNT - base, dateHash('daily-extra'), questCtx());
    //   못 채우면(게이트에 다 막힘) 다시 뽑지 않고 오늘은 있는 만큼만 — 진행도를 지키는 쪽이 낫다
    if (extra.length === DAILY_COUNT - base) {
      st.quests = [
        ...st.quests.map(q => ({ ...q, line: renumberDailyLine(q.line, DAILY_COUNT) })),
        ...extra.map((q, k) => dailyEntry(q, base + k)),
      ];
    }
    def.quests = st.quests;
    return;
  }

  // ⚠️ 여기까지 왔다는 건 오늘 목록을 새로 뽑는다는 뜻이다. 그런데 st.date 가 오늘이면
  //    위쪽 리셋을 건너뛰어 포인터(idx·progress·given)가 옛 목록 기준으로 남아 있다.
  //    DAILY_COUNT 를 3→5 로 바꾼 배포처럼 개수가 달라지면 validDailyQuests 가 false 가 되어
  //    "진행 중인 사람 전원" 이 이 경로를 탄다 — 포인터를 안 맞추면 손도 안 댄 의뢰가
  //    절반 차 있고 하던 진행도는 엉뚱한 의뢰로 옮겨간다.
  st.idx = 0; st.progress = 0; st.given = false; st.readyToasted = false; st.acceptedAt = null;
  st.special = null;   // ✨특별 의뢰도 버린다 — 개수 검증(DAILY_COUNT)의 기준 자체가 바뀌었다

  // 🔒 깰 수 있는 의뢰만 뽑는다 — 닭장을 안 지었는데 🥚가 나오면 진행도가 영원히 0 이고,
  //    그러면 st.idx 가 못 올라가 그날 의뢰 전체가 잠긴다.
  const picked = pickGated(DAILY_POOL, DAILY_COUNT, dateHash('daily'), questCtx());
  // 풀 17종 중 전제조건이 걸린 건 5종뿐이라 실제로는 도달하지 않는다.
  //   그래도 남겨 둔다 — 풀이 줄거나 게이트가 늘면 조용히 어긋나느니 오늘 건너뛰는 편이 낫다.
  if (picked.length < DAILY_COUNT) return;
  def.quests = picked.map((q, i) => dailyEntry(q, i));
  st.quests = def.quests;    // 세이브에 고정 — 오늘은 이 다섯으로 간다
  def.quests = withSpecial(def.quests);
}

// i 번째 일일 의뢰 한 건 — 보상·럭키박스·대사 접두사가 순번에서 정해진다(새로 뽑을 때·덧붙일 때 같은 규칙)
function dailyEntry(q, i) {
  return {
    ...q, reward: { coins: QUEST_COINS[i] ?? 10 }, lucky: i < QUEST_LUCKY,
    line: `[오늘의 의뢰 ${i + 1}/${DAILY_COUNT}] ${q.desc}!` + (i < QUEST_LUCKY ? ' 완료하면 🎁럭키박스도 준다구.' : ''),
  };
}

// ── 🦉 AI 의뢰 — 서버(/api/daily-quests)가 만든 오늘의 의뢰로 조용히 갈아끼운다 ──
//   8~10초(2026-09-14: fog 8.63s · rain 10.10s)라 6초로는 그날 첫 접속이 거의 다 놓쳤다.
//   upgradeDailyQuestsAI() 는 로컬 의뢰를 채운 뒤 백그라운드로 도는 데다, 진행이 시작됐으면
//   교체를 포기하므로 오래 기다려도 플레이가 밀리지 않는다.
async function upgradeDailyQuestsAI() {
  const def = NPCS.find(n => n.daily); if (!def) return;
  const st = npcState(def.id);
  if (st.qsrc === 'ai') return;                                   // 오늘은 이미 AI 의뢰
  if (st.given || st.idx > 0 || st.progress > 0) return;          // 진행이 시작됨 → 건드리지 않는다
  let raw;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), AI_QUEST_TIMEOUT);
    const res = await fetch(`${CONFIG.API_BASE}/api/daily-quests?date=${st.date}&weather=${WEATHER}&lang=${LANG}&phase=${playerPhase()}&v=${aiBucket()}`, { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    raw = await res.json();
  } catch (e) { return; }                                          // 오프라인·타임아웃 → 로컬 의뢰 유지
  if (!Array.isArray(raw) || raw.length < DAILY_COUNT) return;
  // 서버가 이미 걸렀지만 한 번 더 — 게임이 아는 목표만 통과시킨다(방어적 이중 검증).
  //   ⚠️ 서버는 이 세이브의 닭장·집 단계·맵 잠금을 모른다. 게이트는 여기서만 걸 수 있다.
  const ctx = questCtx();
  if (raw.slice(0, DAILY_COUNT).some(q => !questAvailable(String(q?.type || ''), ctx))) return;
  const built = raw.slice(0, DAILY_COUNT).map((q, i) => ({
    type: String(q.type || ''), target: Math.round(Number(q.target)),
    title: String(q.title || '').trim(), desc: String(q.desc || '').trim(),
    reward: { coins: QUEST_COINS[i] ?? 10 }, lucky: i < QUEST_LUCKY,
    // 접두사는 사전을 타지 않는다 — 뒤에 붙는 AI 문장이 매번 달라 키가 성립하지 않는다.
    // 서버가 lang 에 맞춰 생성하므로 접두사도 같은 언어로 직접 만든다.
    line: `[${LANG === 'en' ? `Request ${i + 1}/${DAILY_COUNT}` : `오늘의 의뢰 ${i + 1}/${DAILY_COUNT}`}] ${String(q.line || '').trim()}`,
  }));
  if (!validDailyQuests(built) || built.some(q => !q.title || !q.line)) return;
  if (st.given || st.idx > 0 || st.progress > 0) return;           // 받아오는 사이에 시작했을 수 있다
  st.quests = built; st.qsrc = 'ai';                               // 세이브에 고정
  def.quests = st.special ? [...built, st.special] : built;        // ✨특별 의뢰가 붙어 있으면 유지(지금은 idx>0 에서 빠져나가 도달 못 하지만, 조건이 바뀌어도 안 사라지게)
  const owl = npcObjs.find(o => o.def.id === def.id);
  if (owl) updateNPCGlyph(owl);
  refreshQuestPanel();
  requestSave();
}

// 🎁 럭키박스 — 데일리 의뢰 완료 확률 보상(60% 코인 / 25% 씨앗 / 10% 보석 / 5% 대박)
function rollLuckyBox(qid) {
  const r = Math.random();
  const box = r < 0.60 ? { tier: 'coin',    ico: '🪙', reward: { coins: 5 + Math.floor(Math.random() * 11) } }
            : r < 0.85 ? { tier: 'seed',    ico: '🌰', reward: { seed: 4 } }
            : r < 0.95 ? { tier: 'gem',     ico: '💎', reward: { gem: 1 } }
            :            { tier: 'jackpot', ico: '🎉', reward: { coins: 50 } };
  giveReward(box.reward, 'lucky_box', qid);   // [원장] 확률 보상도 출처 기록
  ui.toast?.(`🎁 럭키박스! ${box.ico} ${rewardText(box.reward)}`, 2400);
  if (box.tier !== 'coin') spawnConfetti(player.position.x, 1.4, player.position.z);
  trackEvent('lucky_box', { tier: box.tier, quest_id: qid }); // [GA4] 확률 분포 검증용
}

// ── 게임 상태(저장/불러오기 대상) ────────────────────────────
const gameState = {
  inventory: { wood: 0, seed: 8, crop: 0, fish: 0, coins: 0, coal: 0, stone: 0, gem: 0, egg: 0, bug: 0, forage: 0, star: 0, glow: 0, fert: 0, bait: 0,
    wheat: 0, corn: 0, grape: 0, seed_wheat: 0, seed_corn: 0, seed_grape: 0, honey: 0,
    apple: 0, pear: 0, peach: 0, persimmon: 0, chestnut: 0,
    sap_apple: 0, sap_pear: 0, sap_peach: 0, sap_persimmon: 0, sap_chestnut: 0,
    charcoal: 0, flour: 0, brick: 0, bread: 0, juice: 0 },   // 🔥 화덕 가공물 + 🫙 발효통 🍷포도즙 + 🥐 밀가루로 굽는 빵 // 🍎 과수원(js/orchard.js) + 석탄/돌/보석(채굴) + 달걀(닭장) + 반딧불이(밤) + 채집물(숲) + ⭐별조각(강) + ✨정령빛(안개 숲, 장식 교환 화폐) + 🌾고급 작물·씨앗(js/farm-crops.js) + 🍯꿀(벌통)
  playerPos: { x: 0, z: 0 },
  houseStage: 0,                            // 0=없음 1=기초 2=벽 3=완성
  plots: [],                                // [{x,z,state,growth}] 저장용 스냅샷
  npcs: {},                                 // id별 {idx,progress,given,allDone}
  tutorialSeen: false,                      // 신규 유저 튜토리얼 표시 여부
  guideNudgeSeen: false,                    // 📖 튜토리얼 직후 "안내서 있어요" 배너를 이미 보여줬는지(1회)
  craft: { slots: [], noticedDay: null },   // 🔥 화덕에 걸어 둔 것 [{item,qty,grade,day}] · 완성 알림을 띄운 날 — 규칙은 js/craft/slots.js
  house: { decor: [], stored: {}, addons: [], bedGiven: false, grantedDecor: [] },   // 실내 배치 가구 [{id,x,z,rot}] · 창고 { id: 개수 } · 🧩 산 구성품 id 목록 · 🛏️ 기본 침대 지급 여부 · 🏖️ 승계 가구(rooftopFreeDecor)를 이미 준 id 목록(옮기거나 창고에 넣어도 다시 안 준다)
  upgrades: { axe: false, water: false, rod: false, pot: false, net: false,   // 도구 업그레이드(영구) + 🍲 큰 냄비 + 🦋 촘촘한 포충망
              hoe: false, seed: false, sickle: false, shovel: false, hammer: false }, // 🔧 신설 5종
  blueprints: {},                           // 🔨 히든 의뢰로 받은 📜 도면 { sickle: true } — js/tool-blueprints.js
  tier2: {},                                // 🔨 제작한 금빛 도구(2단계) { sickle: true } — tierOf 가 2 를 준다
  outdoor: [],                              // 야외 장식 [{id,x,z}]
  outdoorStored: {},                        // 🧺 보관한 야외 장식 { id: 개수 } — 작업대에서 값 없이 다시 꺼냄
  gifts: {},                                // 보유 선물 { id: count }
  affinity: {},                             // 주민 친밀도 { npcId: level }
  // 💬 오늘 주민별 대화 횟수 { npcId: n }. date 가 오늘이 아니면 전부 리셋한다.
  //    ⚠️ 서버에 두지 않는다 — 대화는 보상이 0이라 조작해도 얻을 게 없고,
  //    유저 테이블을 만들면 RLS·인증·동기화 비용만 는다.
  talk: { date: '', used: {} },
  hintsSeen: {},                            // 첫 접근 안내 표시 여부 { key: true }
  noticeSeenId: 0,                          // 📮 마지막으로 본 소식(notices.id) — 서버 세이브라 기기 바꿔도 두 번 안 뜬다
  character: null,                          // 선택한 동물 캐릭터 id
  houseStyle: { roof: 0, wall: 0, door: 0 }, // 집 외관 색(팔레트 인덱스)
  unlocked: { roof: [0], wall: [0], door: [0] }, // 획득한 외관 색(0=기본 항상 보유)
  daily: { lastDate: null, streak: 0 },     // 출석 보상 { 마지막 수령일(YYYY-MM-DD), 연속 일수 }
  dex: { fish: {}, crop: {}, ore: {}, cook: {}, npc: {}, weather: {}, bug: {}, forage: {}, track: {}, river: {}, spirit: {}, dig: {}, visitor: {} }, // 📖 도감 — 카테고리별 { 종id: 첫발견시각(ms) }
  badges: {},                               // 🏅 업적 배지 { id: 획득시각(ms) }
  // 🎀 꾸미기 — 산 것(영구) + 슬롯별 장착. 규칙은 js/cosmetics/equip.js
  cosmetics: { owned: [], equipped: { head: null, neck: null, back: null, trail: null } },
  // 🐾 펫 — 규칙은 js/pet/rules.js. **종마다 따로 산다**(2026-09-23, 4종 확장).
  //    pets  : 산 종 { kind: {kind, name, works, restUntil} } — works 누적 작업 횟수(→ 성장 단계)
  //    pet   : 그중 **지금 데리고 다니는 한 마리**. pets[kind] 와 **같은 객체**를 가리킨다(usePet 이 유지).
  //            null 이면 아직 아무것도 안 샀거나 아무도 안 데리고 나왔다.
  pets: {},
  pet: null,
  workers: [],                              // 🧑‍🌾 고용한 일꾼 [{id, job, grade, works, name, hiredAt, restingSince}] — 규칙은 js/farm-worker.js
  coop: { built: false, fed: null, collected: null }, // 🐔 닭장 { 건설 여부, 모이 준 날, 달걀 걷은 날(YYYY-MM-DD) }
  farm: { stage: 1, seedSel: 'basic', pestDate: null, storage: {}, pending: {}, compostDate: null, compostN: 0, lastSettleAt: 0, wageDate: null, hireDate: null, hireTaken: [] },   // 🌾 밭 { 단계(1 텃밭 · 2 넓은 밭 · 3 대농장, js/farm-stage.js) · 고른 씨앗(basic|wheat|corn|grape) · 해충·꿀 정산일(YYYY-MM-DD) · 🧺창고 내용물(일꾼 수확분) · 🌱퇴비통 오늘 만든 비료 }
  cafe: { date: null, done: [], bonus: false, served: 0, doneOrders: {} }, // ☕ 카페 { 주문 날짜, 완료 주문 index, 완주 보너스 수령, 누적 서빙, 서빙한 자리 스냅숏 }
  // 🦝 밤손님 { 마지막 판정일(YYYY-MM-DD), 조사 안 한 흔적 [{x,z,animal,loot,crop}],
  //            🤝 발길 끊기 만료일, 오늘 대결한 동물 }
  night: { lastDate: null, traces: [], truce: { boar: null, raccoon: null }, duelDate: null, duelDone: [] },
  frost: { coveredFor: null, lastDate: null }, // 🌡️ 날씨 이벤트 { 덮개를 설치해 둔 대상 날짜, 마지막 정산일(YYYY-MM-DD) }
  boat: { date: null, count: 0, clearsToday: 0, best: 0, clears: 0, up: { oar: 0, hull: 0, lamp: 0 } }, // 🛶 나룻배 { 오늘 날짜, 오늘 탄 횟수, 오늘 완주 수(의뢰 판정용), 최고 점수, 누적 완주, 배 업그레이드 }
  mist: { date: null, purified: false, soothedTotal: 0, purifyTotal: 0, practiced: false }, // 🌫️ 안개 숲 { 정화 판정일(YYYY-MM-DD), 오늘 정화 여부, 누적 달래기, 누적 정화, 연습 완료 여부 }
  beta: { tries: {} },   // 🧪 미니게임별 시도 횟수 — 관대 판정은 js/difficulty.js 로 옮겼다(이 카운터는 옛 세이브 호환용)
  difficulty: defaultDifficulty(),   // 🎚️ 미니게임별 난이도 상태 { dda: 유저 보정, n: probe 순회용 누적 시도 }
  sea: { tunaDay: null, caught: 0, best: {} },   // 🌊 바다터 { 오늘의 대어(참치) 잡은 날짜, 누적 어획, 어종별 최고 무게(kg) — 경신 토스트 }
  museum: { special: {} },             // 🏛️ ✨조건부 전시 { rain_fish: { id, at } } — 규칙은 js/museum.js SPECIAL_EXHIBITS
  orchard: { trees: [], sapSel: 'apple', settleDate: null },   // 🍎 과수원(js/orchard.js)
  progress: { advHarvest: 0 },   // 🔒 진행도 해금 카운터 — 고급 작물 수확 횟수(js/tuning.js PROGRESS_GATE)
  kitchen: { cooked: 0, best: {}, tiers: {} }, // 🍳 자유주방 { 누적 요리 수, 레시피별 최고 점수(0~100), 등급별 획득 수 }
  pantry: [],   // 🍱 찬장 — 보관한 음식 [{ id: 레시피id, score }]. 등급은 score 에서 파생. 최대 PANTRY_MAX 칸
  workshop: { carved: 0, carvedToday: 0, best: {}, tiers: {}, date: null, done: [] }, // 🗿 조각 공방 { 누적 완성 수, 오늘 완성 수(의뢰 판정용), 도안별 최고 점수, 등급별 획득 수, 주문 날짜, 오늘 완료 주문 id }
  story: { ch: 0, q: 0, started: {} }, // 📖 메인 퀘스트 { 현재 장(0=1장 진행중), 누적 의뢰 완료 수, 장별 시작 기록 }
  nickname: null,                      // 🏷️ 리더보드 표시명(2~16자) — 신규는 캐릭터 선택 때, 기존 유저는 접속 시 자동 부여
};

// ── 📖 도감 — 물고기·작물·광물 첫 발견을 수집. 완성 시 보상 ──
function dexCount() { return Object.keys(DEX).reduce((n, cat) => n + Object.keys(gameState.dex[cat] || {}).length, 0); }

// 첫 발견 시 도감 등록 — 낚시/수확/채굴 성공 지점에서 호출
function dexDiscover(cat, id) {
  if (!gameState.dex[cat] || gameState.dex[cat][id]) return;   // 이미 등록됨
  gameState.dex[cat][id] = Date.now();
  const entry = DEX[cat].find(e => e.id === id);
  const total = dexCount();
  ui.toast?.(`📖 도감 등록! ${entry?.ico || ''} ${entry?.name || id} (${total}/${DEX_TOTAL})`, 2400);
  refreshMuseumGate(true);   // 🏛️ 이번 등록으로 층이 열렸으면 건물이 자란다
  refreshCollectQuests();    // 📖 도감 목표(collect_dex·dex_one) 진행 — 🪏땅속은 인벤이 안 늘어 이 경로가 없었다
  spawnSparkle(player.position.x, 1.6, player.position.z, 14);
  trackEvent('dex_discover', { category: cat, entry: id, total });   // [GA4] 수집 퍼널
  if (total === DEX_TOTAL && !gameState.badges.dex_master) {   // ⚠️ 총계가 늘면 옛 완성자에게 보상이 다시 나간다 — 배지로 막는다                                         // 🎉 도감 완성
    giveReward({ coins: 150 }, 'dex_complete', 'all');               // [원장] 완성 보상
    spawnConfetti(player.position.x, 1.6, player.position.z);
    Sound.complete();
    ui.showHintModal?.({ ico: '📖', title: '도감 완성!', body: `마을의 모든 것 ${DEX_TOTAL}종을 발견했어요! 축하 보상 🪙150을 받았어요.` });
    trackEvent('dex_complete');                                      // [GA4]
  } else if (total === 5 || total === 12) {
    ui.loginNudge?.('dex' + total);   // 게스트면 "로그인하면 영구 보존" 넛지(index.html 이 판단)
  }
  syncBadges();   // 🏅 날씨 4종·도감 완성 배지 즉시 반영
}

// 🏛️ ✨조건부 전시 — 그날 날씨에서 처음 얻은 것 하나를 박물관 1층 특별 진열대에 남긴다(js/museum.js).
//   ⚠️ 플레이어가 직접 한 경로(낚시·수확·채집)에서만 부른다. dexDiscover 안에 두면 일꾼 수확까지 센다.
function noteSpecialExhibit(cat, id) {
  const next = noteSpecial(gameState.museum.special, cat, id, WEATHER, Date.now());
  if (next === gameState.museum.special) return;   // 조건이 아니거나 이미 있다
  gameState.museum.special = next;
  const def = specialFor(cat, WEATHER);
  ui.toast?.(`🏛️ 박물관 특별 전시! ${def.ico} ${def.name}`, 2800);
  trackEvent('museum_special', { exhibit: def.id, cat, entry: id });   // [GA4] 조건부 전시 획득(날씨별 도달)
  requestSave();
}

// ── 🏅 업적 배지 — 도감 모달 하단에 전시. 달성 시 1회 기념 보상 ──
function badgeCount() { return Object.keys(gameState.badges).length; }

function awardBadge(id) {
  if (gameState.badges[id]) return;                       // 이미 획득
  const b = BADGES.find(x => x.id === id); if (!b) return;
  gameState.badges[id] = Date.now();
  giveReward(b.reward, 'badge', id);                      // [원장] 배지 기념 코인
  Sound.complete();
  spawnConfetti(player.position.x, 1.6, player.position.z);
  ui.toast?.(`🏅 배지 획득! ${b.ico} ${b.name} (+${b.reward.coins}🪙)`, 3200);
  trackEvent('badge_earn', { badge: id, total: badgeCount() });   // [GA4] 업적 퍼널
}

// 배지 조건 일괄 판정 — 접속·퀘스트 완료·집 완성·도감 등록 시점에 호출(멱등)
function syncBadges() {
  if (gameState.houseStage >= 3) awardBadge('house');
  if (gameState.houseStage >= MAX_HOUSE_STAGE) awardBadge('modern');   // 🏙️ 모던 하우스 증축
  const chains = NPCS.filter(n => !n.daily);   // 데일리(올빼미) 제외 상시 의뢰 체인
  //   ⚠️ allDone 은 🔁반복 의뢰가 열리면 false 로 돌아간다(지금 내줄 의뢰가 있다는 뜻).
  //   체인을 끝까지 깼는지는 포인터로 봐야 배지가 들쭉날쭉하지 않는다.
  const done = chains.filter(n => (gameState.npcs[n.id]?.idx || 0) >= n.quests.length).length;
  if (done >= 1) awardBadge('first_chain');
  if (done === chains.length) awardBadge('all_chains');
  if (gameState.daily.streak >= 7) awardBadge('streak7');
  if (DEX.weather.every(w => gameState.dex.weather?.[w.id])) awardBadge('weather_all');
  if (DEX.bug.every(b => gameState.dex.bug?.[b.id])) awardBadge('night_owl');   // 🌟 반딧불이 4종
  if ((gameState.cafe.served || 0) >= 15) awardBadge('barista');                // ☕ 누적 15잔 서빙
  if (DEX.forage.every(f => gameState.dex.forage?.[f.id])) awardBadge('forager'); // 🍄 채집 4종
  if ((gameState.boat?.clears || 0) >= 1) awardBadge('ferryman');                 // 🛶 강 완주
  if ((gameState.boat?.perfect || 0) >= 1) awardBadge('river_master');            // 🌊 무피해 완주
  if ((gameState.mist?.purifyTotal || 0) >= 1) awardBadge('purifier');             // 🌫️ 첫 정화
  if ((gameState.mist?.soothedTotal || 0) >= 20) awardBadge('spirit_friend');      // ✨ 정령 20마리
  if (dexCount() === DEX_TOTAL) awardBadge('dex_master');
}

// ═══════════════ 📖 메인 퀘스트(이야기) — 기존 콘텐츠를 챕터로 묶는 서사 축 ═══════════════

let storyBooted = false;   // 첫 syncStory(세이브 소급)는 조용히, 이후엔 축하 연출

// 챕터 달성 여부 — 전부 기존 상태에서 파생(새 카운터는 의뢰 수 q 하나뿐)
function storyDone(i) {
  const s = gameState;
  if (i === 0) return s.houseStage >= 3;
  if (i === 1) return (s.story.q || 0) >= 3;
  if (i === 2) return (s.kitchen.cooked || 0) >= 1 && (s.cafe.served || 0) >= 1;
  if (i === 3) return (s.mist?.purifyTotal || 0) >= 1;
  return false;
}
function storyProgressText(i) {
  const s = gameState;
  if (i === 0) return `공사 ${Math.min(s.houseStage, 3)}/3`;
  if (i === 1) return `의뢰 ${Math.min(s.story.q || 0, 3)}/3`;
  if (i === 2) return `요리 ${Math.min(s.kitchen.cooked || 0, 1)}/1 · 서빙 ${Math.min(s.cafe.served || 0, 1)}/1`;
  if (i === 3) return `정화 ${Math.min(s.mist?.purifyTotal || 0, 1)}/1`;
  return '';
}
// index.html(스토리 칩·모달)이 렌더할 뷰
function storyView() {
  const ch = gameState.story.ch;
  return {
    ch,
    allDone: ch >= STORY.length,
    chapters: STORY.map((c, i) => ({
      n: i + 1, ico: c.ico, title: c.title, goal: c.goal,
      line: i < ch ? c.done : c.start,
      state: i < ch ? 'done' : i === ch ? 'now' : 'lock',
      progress: i === ch ? storyProgressText(i) : null,
    })),
  };
}

// 진행 판정(멱등) — 접속 소급 + 각 마일스톤 훅에서 호출
function syncStory() {
  const st = gameState.story;
  let retro = 0;
  while (st.ch < STORY.length && storyDone(st.ch)) {
    const c = STORY[st.ch];
    giveReward(c.reward, 'story', c.id);                       // [원장] 챕터 보상 출처 기록
    trackEvent('story_chapter_complete', { chapter: c.id, n: st.ch + 1, retro: storyBooted ? 0 : 1 }); // [GA4] 온보딩→후반 진행 퍼널
    st.ch++;
    if (storyBooted) {
      const next = STORY[st.ch];
      Sound.complete(); spawnConfetti(player.position.x, 2.6, player.position.z);
      ui.showHintModal?.({
        ico: c.ico, title: `${st.ch}장 완료 — ${c.title}`,
        body: `${c.done}\n\n🦉 의뢰 올빼미가 당신의 이야기를 기록했어요. 보상 🪙${c.reward.coins}${c.reward.seed ? ` · 🌰${c.reward.seed}` : ''}`
          + (next ? `\n\n다음 이야기 — ${next.ico} ${st.ch + 1}장 「${next.title}」: ${next.goal}` : ''),
      });
    } else retro++;
  }
  // 현재 장의 시작을 1회만 기록(퍼널 시작점)
  const cur = STORY[gameState.story.ch];
  if (cur && !st.started[cur.id]) {
    st.started[cur.id] = 1;
    trackEvent('story_chapter_start', { chapter: cur.id, n: st.ch + 1 });
  }
  if (retro) ui.toast?.(`📖 지난 이야기 ${st.ch}장까지의 기록이 정리됐어요 (+보상)`, 3000);
  ui.setStory?.(storyView());
}

// ── 🏷️ 닉네임 — 리더보드 표시명. 게임 톤의 "형용사+동물 #태그" 자동 생성 ──
function genNickname(animal) {
  const adj = NICK_ADJS[Math.floor(Math.random() * NICK_ADJS.length)];
  const a = ANIMALS.find(x => x.id === (animal || gameState.character));
  // [i18n] 영어 모드면 형용사·동물명을 번역해 생성(닉네임은 유저 데이터라 사후 번역 없음)
  return `${t(adj)} ${t(a ? a.name : '여행자')} #${1000 + Math.floor(Math.random() * 9000)}`;
}
// source: 'new'(첫 캐릭터 선택) | 'auto'(기존 유저 소급 부여) | 'change'(직접 변경)
function setNickname(name, source = 'change') {
  const nick = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  if (nick.length < 2) return { ok: false, msg: '닉네임은 2~16자로 지어주세요' };
  gameState.nickname = nick;
  trackEvent('nickname_set', { source, len: nick.length });   // [GA4] 값 자체는 보내지 않음
  return { ok: true, nick };
}

// 예보 날씨가 아직 도감에 없으면 재방문 훅 문구 — 출석 모달·올빼미 대사에 붙임
function forecastDexNudge() { return gameState.dex.weather?.[FORECAST] ? '' : ' 아직 도감에 없는 날씨예요! 📖'; }

// ── 출석 보상 — 하루 1회, 연속 출석(streak)일수록 커짐. 7일마다 보석 보너스 ──
function checkDailyBonus() {
  const d = gameState.daily;
  const today = todayStr();
  if (d.lastDate === today) return;                              // 오늘 이미 받음
  d.streak = (d.lastDate === todayStr(-1)) ? d.streak + 1 : 1;   // 어제 접속했으면 연속, 아니면 1일차
  d.lastDate = today;
  const coins = DAILY_COINS[Math.min(d.streak, 7) - 1];
  const reward = { coins };
  if (d.streak > 0 && d.streak % 7 === 0) reward.gem = 1;        // 7일 연속마다 💎
  giveReward(reward, 'daily_bonus', 'day' + d.streak);           // [원장] 출석 코인
  trackEvent('daily_bonus', { streak: d.streak, coins });         // [GA4] 리텐션 KPI
  // 한 줄에 하나씩(#hint-body 는 pre-line) — 베타 피드백 "한 문단으로 붙어 있어 안 읽힌다"
  let body = `연속 ${d.streak}일째 방문! ${rewardText(reward)} 받았어요.` +
    (reward.gem ? '\n7일 연속 보너스 💎!' : '\n내일 또 오면 보상이 더 커져요!');
  if (WEATHER !== 'clear') body += '\n' + WEATHER_MSG[WEATHER]; // 모달이 토스트를 가리므로 날씨 안내를 합쳐서 표시
  body += '\n🔮 ' + forecastLine() + forecastDexNudge(); // 내일 예보 — 재방문 유도(+날씨 도감 훅)
  if (gameState.character && gameState.tutorialSeen) {
    // [알겠어요] 를 누르면 그 자리에서 📮 새 소식(안 읽은 공지·답장)을 이어서 띄운다 — 출석은 하루 한 번이라 "그날 첫 접속" 조건과 같다
    ui.showHintModal?.({ ico: '🎁', title: `출석 ${d.streak}일차`, body,
                         ok: { onClick: () => { if (pendingNotices.length) ui.showNotices?.(pendingNotices, 'new'); } } });
    return true;
  }
  ui.toast?.(`🎁 출석 보상 +${coins}🪙`);                         // 신규 유저: 캐릭터 선택/튜토리얼과 안 겹치게 토스트만
  return false;
}

// ── 📮 소식함 — 접속 시 안 읽은 소식을 미리 받아 두고, 창을 닫으면 본 id 를 세이브에 기록 ──
//   전체 공지는 게스트도 받지만, 1:1 답장은 고정 uuid(구글·토스 로그인)에게만 간다(RLS).
let pendingNotices = [];   // 안 읽은 소식(오래된 순). 아직 안 왔으면 빈 배열 → 이번엔 안 띄우고 다음 접속에
async function prefetchNotices() {
  const since = gameState.noticeSeenId || 0;
  const rows = await fetchNotices(since, { ascending: true });   // 오래된 순 — 20건 넘게 밀려도 읽음 id 가 건너뛰지 않게
  pendingNotices = unreadNotices(rows, since);
}
export function markNoticesSeen(list) {
  const id = maxId(list);
  pendingNotices = pendingNotices.filter(n => n.id > id);
  if (id <= (gameState.noticeSeenId || 0)) return;
  gameState.noticeSeenId = id;
  requestSave();
}

// 스테이션 첫 접근 시 1회만 뜨는 카드 모달 안내(초보 온보딩)
let firstHintRetries = {};   // key → 미룬 횟수(무한 재시도 방지)
function firstHint(key, ico, title, body) {
  if (gameState.hintsSeen[key]) return;
  // 🍳 미니게임(조리·조각) 무대 위에 모달을 띄우면 판을 통째로 덮어 버린다 —
  //   버프 안내는 요리를 끝내고 먹은 뒤에 오는데, 바로 "🍳 한 번 더" 로 다음 판을 시작하면
  //   800ms 뒤 도착한 안내가 새 판을 가렸다. 소진하지 말고 미룬다(announceMapOpens 와 같은 규칙).
  if (mgView || ui.coachActive?.()) {
    if ((firstHintRetries[key] = (firstHintRetries[key] || 0) + 1) <= 20) setTimeout(() => firstHint(key, ico, title, body), 2500);
    return;
  }
  gameState.hintsSeen[key] = true;
  ui.showHintModal?.({ ico, title, body });
}

// 근접(지나가기) 안내 — 이동을 끊지 않는 비차단 배너(1회). 상세 규칙은 입장 후 모달/존 힌트 담당.
// 튜토리얼(코치) 진행 중엔 억제하고 '본 것' 처리도 안 함 — 코치 지시와 겹치지 않게, 졸업 후 첫 접근 때 보여준다.
/** 띄웠으면 true — 호출부가 "처음 도달"을 계측할 수 있게(🌊 sea_gate_hint). */
function firstHintBanner(key, ico, title, line) {
  if (gameState.hintsSeen[key]) return false;
  if (ui.coachActive?.()) return false;
  gameState.hintsSeen[key] = true;
  // 발동 지점을 기억해 "표시 차례가 왔을 때 아직 그 앞에 있는지"를 UI 가 판정할 수 있게 —
  // 여러 시설을 연달아 지나치면 이미 떠난 곳의 배너는 짧게 흘려보낸다(큐 적체 방지)
  const at = { x: player.position.x, z: player.position.z };
  ui.showHintBanner?.({ ico, title, line, near: () => dist2D(at, player.position) < 3.5 });
  return true;
}

let indoor = false;        // 실내(집 안) 여부
let nearDoor = null;       // 'enter' | 'exit' | null
let lastDoorPrompt = null; // 도어/빌드 프롬프트 중복 갱신 방지
let lastNearHouse = false; // 🎨 집 근처 여부(외관 꾸미기 버튼 표시) 변화 감지
let placingDecor = null;   // 배치 중인 가구 id
let nearDecorMesh = null, decorNearRing = null;   // 🛋️ 근접 프롬프트 대상 가구 / 그 밑 호박색 링
let decorRot = 0;          // 배치 방향(0~3 → 90°씩) — 가로/세로 전환
let decorGhost = null;     // 🫥 바닥 미리보기(반투명 가구 + 초록 링) — 놓일 자리·방향을 미리 보여준다
let ghostOutdoor = false;  // 그 고스트가 🪵야외 장식인가(실내 가구와 자리 잡는 규칙이 다르다)
let decorTarget = { x: 0, z: 0, pinned: false }; // 놓일 자리. pinned=false 면 캐릭터 발 앞을 따라다닌다
// 🪵🏗️ 야외(울타리·밭 시설)도 실내 가구와 같은 손맛으로 — 바닥을 탭/클릭한 자리에 고스트가 서고, 한 번 더 누르면 놓인다
//   (사용자 지시 2026-09-13: "집에서 배치하는 것처럼"). pinned=false 면 예전처럼 발밑을 따라간다.
let outdoorTarget = { x: 0, z: 0, pinned: false };
let pickedDecor = null;    // 들어 올린 기존 가구 {id, wx, wz, rot, f} — 취소·퇴장 시 제자리(원래 층)로
let decorTapHintShown = false; // "여기 놓을까요?" 안내는 배치 1회당 한 번만
let interiorGroup, interiorFloor, interiorLamp;
let interiorFloors = {};   // { [id]: THREE.Group } — 층 id('ground'|'attic'|'upper'|'roof')별 방. 항상 넷 다 짓는다
let houseFloor = 0;   // 🏠 지금 서 있는 실내 층 인덱스(f) — 0=1층 · 1=다락/2층 · 2=루프탑
let nearDoorFloor = 0;   // nearDoor === 'floor' 일 때 갈 층(f)
let lastFloorChoiceKey = null;   // 🪜 양방향(6단계 2층) 선택 UI 중복 갱신 방지 — null 이면 닫힘
const decorMeshes = [];    // 배치된 가구 메시

let mode = 'attract';   // 'attract'(로그인 배경) | 'play'(플레이)
let dayPaused = false;  // 낮/밤 자동 순환 정지 여부 — ?time= 로 시간대를 고정하는 스토어 촬영용
const npcObjs = [];     // 런타임 NPC 객체들
let nearNPC = null;     // 현재 근접한 NPC(런타임 객체) 또는 null

// 씬 전역 참조
let renderer, scene, camera, composer, bloomPass, gradePass;
let player, playerAnchor, playerLight;
let playerArm = null;                                    // (미사용 — 팔 막대 없이 도구만 표시)
let charGroup = null, tailPivot = null, tailPhase = 0;   // 캐릭터 메시 그룹 / 꼬리 피벗(흔들기)
// ── 선택 가능한 동물 캐릭터 7종 ────────────────────────────────
//   ⚠️ "색만 다르고 다 똑같이 생겼다"는 피드백 반영 —
//   색뿐 아니라 체형(몸/머리 크기·비율)·귀·꼬리·얼굴까지 동물마다 다르게 정의합니다.
//
//   bodyR/bodyScale/headR/headY : 실루엣의 8할. 곰·판다는 크고 육중, 토끼·병아리는
//        작고 동글, 여우·고양이는 날씬 — 멀리서 봐도 구분되도록 비율을 벌림.
//   얼굴(눈·코·입·귀·주둥이·무늬)은 js/animal-faces.js 가 종별로 전담 — 여기엔 체형·색·꼬리·팔만 둔다.
//   tail   : 종류별 실루엣 + 흔들기 속도/진폭(강아지는 신나게, 고양이는 느긋하게).
//   extras : 몸통에 붙는 포인트만 남김 — 'collar'(강아지 목줄) 'band'(판다 어깨 띠) 'wings'(병아리 날개=팔).
//   armX   : 도구 든 손의 좌우 위치 — 몸집에 맞춰야 도구가 붕 뜨지 않음.
export const ANIMALS = [
  { id: 'fox', name: '여우', emoji: '🦊', body: 0xf0883a, belly: 0xf9ecd8, ear: 0x8a4a24,
    bodyR: 0.52, bodyScale: [0.90, 1.08, 0.90], headR: 0.37, headY: 1.26, armX: 0.74,
    tail: { type: 'bushy', color: 0xf0883a, tip: 0xf9ecd8, wagSpeed: 2.2, wagAmp: 0.16 } },

  { id: 'dog', name: '강아지', emoji: '🐶', body: 0xf0913a, belly: 0xfaf3e8, ear: 0x8a6038,
    bodyR: 0.56, bodyScale: [1.03, 0.99, 1.00], headR: 0.40, headY: 1.24, armX: 0.80,
    tail: { type: 'curl', color: 0xf0913a, wagSpeed: 6.5, wagAmp: 0.55 },   // 신나게 살랑살랑
    extras: ['collar'] },

  { id: 'rabbit', name: '토끼', emoji: '🐰', body: 0xf3eeea, belly: 0xffffff, ear: 0xf0c0c8,
    bodyR: 0.46, bodyScale: [1.00, 0.96, 1.00], headR: 0.39, headY: 1.12, armX: 0.66,
    tail: { type: 'puff', color: 0xffffff, wagSpeed: 1.6, wagAmp: 0.10 } },

  { id: 'cat', name: '고양이', emoji: '🐱', body: 0x9fa0c2, belly: 0xf2f2f8, ear: 0xf0b0b8,
    bodyR: 0.50, bodyScale: [0.88, 1.10, 0.88], headR: 0.36, headY: 1.25, armX: 0.72,
    tail: { type: 'long', color: 0x9fa0c2, wagSpeed: 1.5, wagAmp: 0.30 } },   // 느긋하게 살랑

  { id: 'bear', name: '곰', emoji: '🐻', body: 0x936a44, belly: 0xd2b38a, ear: 0x6a4828,
    bodyR: 0.63, bodyScale: [1.08, 1.00, 1.06], headR: 0.44, headY: 1.34, armX: 0.88,
    tail: { type: 'stub', color: 0x936a44, wagSpeed: 1.2, wagAmp: 0.08 } },

  { id: 'panda', name: '판다', emoji: '🐼', body: 0xf6f6f6, belly: 0xffffff, ear: 0x2a2a2a, armColor: 0x262626,   // 실제 판다처럼 팔은 검게(흰 몸에 묻히지 않게)
    bodyR: 0.63, bodyScale: [1.08, 1.00, 1.06], headR: 0.45, headY: 1.34, armX: 0.88,
    tail: { type: 'stub', color: 0xffffff, wagSpeed: 1.2, wagAmp: 0.08 },
    extras: ['band'] },   // 검은 어깨 띠 = 판다의 정체성(눈 패치는 animal-faces.js)

  { id: 'chick', name: '병아리', emoji: '🐤', body: 0xffe05a, belly: 0xfff0a0, ear: 0xffb020,
    bodyR: 0.50, bodyScale: [1.02, 0.94, 1.02], headR: 0.35, headY: 1.06, armX: 0.62,
    tail: { type: 'feather', color: 0xffd23a, wagSpeed: 2.6, wagAmp: 0.14 },
    extras: ['wings'] },   // 부리·볏은 animal-faces.js, 날개만 여기(팔 역할)
];
let heldGroup, handAnchor, heldToolMesh; // 도구 캐리어(손 따라가기/등 수납) / 손 / 든 도구
let heldToolId = null;                   // 🪓 지금 든 도구 id — 업그레이드 직후 같은 도구를 다시 만들 때 쓴다
let playerArms = null;    // { R:{pivot,hand}, L:{pivot,hand} } — 🐤병아리는 날개가 팔 역할(같은 구조)
let armWristK = 0;        // 손목 펴짐 0(자루 세움)~1(팔의 연장) — 스윙 중에만 커짐
let toolPourTilt = 0;     // 💧🌰 붓기/뿌리기 전용 자루 기울임(rad)
// 🪏 삽질 전용 — 자루를 팔 각도에 종속시키지 않고 "캐릭터 기준 월드 방향"(손→날)으로 직접 세운다(sims/shovel-sim.html aimTool).
//   toolDigK 0 이면 평소 쥔 자세, 1 이면 toolDigDir 그대로. updatePlayer 의 'dig' 제스처가 매 프레임 갱신한다.
let toolDigK = 0;
const toolDigDir = new THREE.Vector3(0, -0.92, 0.40);

// ── 팔 상수 — sims/arm-sim.html 시뮬레이션으로 검증한 값 ──
let toolQRest = TOOL_QREST;   // 현재 캐릭터의 쥐는 자세 — applyCharacter 가 갱신
let wingArms = false;         // 🐤 날개-팔 캐릭터 — 쥐는 점 보정을 적용하지 않는다(원본 유지)
let toolGripFade = 0;         // 0 = 새 쥐는 점 · 1 = 원본 쥐는 점. 옆베기 동안만 올라간다(스윙 궤적을 원본과 똑같이)
let curAnimal = ANIMALS[0];   // 현재 캐릭터 정의 — 등 수납 위치 계산(updateStowPose)에 사용
let restArmX = 0.78;      // 손에 들었을 때의 좌우 위치(캐릭터 몸집마다 다름 — applyCharacter 가 갱신)
let toolStow = 0;         // 🎒 도구 수납 진행 0(손 옆)~1(등 뒤). ✋맨손이면 1로 보간된다
let sunLight, hemiLight, ambient;
let fireflies, stars;
const trees = [];
const swayables = [];
const grassClumps = [];   // 🌿 InstancedMesh 로 묶은 풀 [{ mesh, items:[{x,y,z,ph}] }] — updateSway 가 행렬을 갱신
const particles = [];
const plots = [];                 // 밭 목록 (런타임 객체)
const obstacles = [];             // 밭 만들기 금지 구역 {x,z,r} (나무·호수·벤치·가로등·집)
// ── 🚧 플레이어가 통과할 수 없는 것들 ──────────────────────────
//   obstacles 와 분리한 이유: obstacles 엔 "밭만 금지"인 넓은 구역(반딧불이 계곡 r7,
//   채집 숲 r9)이 들어 있어서, 그대로 막으면 그 구역에 들어갈 수가 없다.
//   형태 두 가지 — 원기둥 {x,z,r} / 축정렬 사각 {x1,z1,x2,z2}(월드 XZ).
//   문이 있는 건물은 원으로 막으면 문 앞에 설 수 없어 사각을 쓴다.
const colliders = [];
//   off=true 면 잠시 통과 가능(베어진 나무·캔 광맥처럼 안 보이는 동안)
function solidCircle(x, z, r) { const c = { x, z, r, off: false }; colliders.push(c); return c; }
function solidBox(x1, z1, x2, z2) { const c = { x1, z1, x2, z2, off: false }; colliders.push(c); return c; }
//   손님처럼 사라지는 대상은 콜라이더도 같이 치운다(안 그러면 안 보이는 벽이 남음)
function removeSolid(c) { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); }

// 이동 후 밀어내기 — "가장 얕게 빠져나가는 방향"으로만 밀어 벽을 따라 미끄러지게 한다
function resolveColliders(p) {
  for (const c of colliders) {
    if (c.off) continue;
    if (c.r !== undefined) {
      const dx = p.x - c.x, dz = p.z - c.z;
      const min = c.r + PLAYER_R;
      const d = Math.hypot(dx, dz);
      if (d >= min) continue;
      if (d < 1e-4) { p.x = c.x + min; continue; }   // 정중앙에 겹치면 임의 방향으로 탈출
      const k = min / d;
      p.x = c.x + dx * k; p.z = c.z + dz * k;
    } else {
      const x1 = c.x1 - PLAYER_R, x2 = c.x2 + PLAYER_R;
      const z1 = c.z1 - PLAYER_R, z2 = c.z2 + PLAYER_R;
      if (p.x <= x1 || p.x >= x2 || p.z <= z1 || p.z >= z2) continue;
      const dl = p.x - x1, dr = x2 - p.x, dn = p.z - z1, df = z2 - p.z;
      const m = Math.min(dl, dr, dn, df);
      if (m === dl) p.x = x1; else if (m === dr) p.x = x2;
      else if (m === dn) p.z = z1; else p.z = z2;
    }
  }
}
const houseWindows = [];          // 밤에 빛나는 창문 머티리얼
let houseGroup, houseGhost;       // 집 그룹 / 미완성 터 표시
let houseCollider = null;         // 🚧 집 충돌(짓는 동안 off, 완성되면 단계별 크기로 on)
let houseSign, houseSignTex, houseSignCtx; // 집 터 안내판(멀리서도 보임)

// ── 집 외관 커스터마이징 팔레트(지붕/벽/문 색) ──
// 0번 스와치 = 지금 집 모델의 기본색(모델마다 다르다: 코티지 샌드 지붕, 빌라 흰 슬래브…), 1~4 = 공용 팔레트
function houseBaseColor(role, fallback) {
  let hex = null;
  houseGroup?.traverse(o => { if (hex == null && o.isMesh && o.userData.role === role && o.userData.baseColor != null) hex = o.userData.baseColor; });
  return hex ?? fallback;
}
const PART_COLORS = () => ({
  roof: [houseBaseColor('roof', ROOF_COLORS[0]), ...ROOF_COLORS.slice(1)],
  wall: [houseBaseColor('wall', WALL_COLORS[0]), ...WALL_COLORS.slice(1)],
  door: [houseBaseColor('door', DOOR_COLORS[0]), ...DOOR_COLORS.slice(1)],
});
// 확률(chance)로 잠긴 외관 색 하나를 랜덤 언락 → "오늘 뭐 나올까" 리텐션 훅
function tryUnlockDrop(chance) {
  if (Math.random() > chance) return;
  const cols = PART_COLORS(); const pool = [];
  for (const p in cols) for (let i = 0; i < cols[p].length; i++) if (!gameState.unlocked[p].includes(i)) pool.push([p, i]);
  if (!pool.length) return;                       // 이미 다 열림
  const [part, idx] = pool[(Math.random() * pool.length) | 0];
  gameState.unlocked[part].push(idx);
  Sound.harvest();
  spawnSparkle(player.position.x, 1.2, player.position.z, 20);
  if (!gameState.hintsSeen.colorUnlock) {          // 첫 획득 → 시스템 안내 모달(온보딩)
    firstHint('colorUnlock', '🎨', '새 집 색을 얻었어요!',
      '낚시·수확·퀘스트·집 완성으로 집 색을 모아요\n집 앞 🎨 꾸미기에서 지붕·벽·문에 적용!');
  } else {
    ui.toast?.(`🎨 새 ${PART_NAME[part]} 색을 얻었어요! 집 앞 🎨 버튼에서 적용해보세요`, 4200);
  }
  trackEvent('color_unlock', { part, idx });      // [GA4]
}
function applyHouseStyle() {
  if (!houseGroup) return;
  const cols = PART_COLORS();
  houseGroup.traverse(o => {
    const role = o.userData.role;
    if (!o.isMesh || !o.material || !cols[role]) return;
    const list = cols[role];
    o.material.color.setHex(list[gameState.houseStyle[role] % list.length]);
  });
}
const clock = new THREE.Clock();

// 입력 상태
const keys = createKeyState();   // ⌨️ js/keys.js — 입력칸에서 친 키 무시·blur 리셋·모달 중 이동 0
const analog = { x: 0, z: 0 };    // 모바일 조이스틱 아날로그 이동(-1~1)
let wantAction = false;
let timeOfDay = 0.30;
let ui = {};


// 🎒 도구 페이지 전환. auto=true 면 구역 이동이 부른 것(효과음 없이 조용히 바뀜)
//   'none'(✋맨손)으로 갈 땐 currentTool 을 그대로 둔다 → 들고 있던 그 도구를 등에 멘다.
function setToolPage(id, auto = false) {
  if (toolPage === id) return;
  if (toolPage !== 'none') lastPageTool[toolPage] = currentTool;   // 떠나는 페이지의 도구를 기억
  toolPage = id;
  if (id !== 'none') lastOpenPage = id;
  if (id !== 'none') {
    const back = lastPageTool[id];
    currentTool = (TOOLS[back] && TOOLS[back].grp === id) ? back : TOOLS.findIndex(x => x.grp === id);
    setHeldTool(TOOLS[currentTool].id);
  }
  ui.setTool?.(currentTool, TOOLS, toolPage);
  if (!auto) Sound.blip();
}

function toolZoneKey() {
  if (indoor) return 'indoor';
  if (atCafe) return 'cafe';
  if (atMuseum) return 'museum';
  if (atMist) return 'mist';
  if (atRiver) return 'river';
  if (atFarm) return 'farm';
  if (atMine) return 'mine';
  if (atOrchard) return 'orchard';
  if (nearForest) return 'forest';
  if (nearGlade && isNight()) return 'glade';
  return null;                       // 마을 — 자동 전환 없음
}
// 구역이 정해 주는 도구를 조용히 집어 든다 — Input.selectTool 과 달리 효과음·배치 취소가 없다(자동 전환 전용).
//   lastPageTool(그 세트에서 직접 고른 도구 기억)은 일부러 건드리지 않는다 —
//   광산과 밭이 같은 🌾농사 세트를 쓰는데, 광산이 써 버리면 밭에서 고른 🌰씨앗이 영영 사라진다.
function selectToolAuto(id) {
  const i = TOOLS.findIndex(t => t.id === id);
  if (i < 0 || currentTool === i) return;
  currentTool = i;
  setHeldTool(id);
  ui.setTool?.(currentTool, TOOLS, toolPage);
}
// 구역이 도구를 정해 주기 직전에 들고 있던 도구로 되돌린다(pageBeforeAuto 와 같은 문법).
//   구역 안에서 직접 도구를 바꿨으면 Input.selectTool 이 이 기억을 지우므로 되돌리지 않는다.
function restoreToolBeforeAuto() {
  if (toolBeforeAuto === null) return;
  const t = TOOLS[toolBeforeAuto]; toolBeforeAuto = null;
  if (t && t.grp === toolPage) selectToolAuto(t.id);
}
// 구역이 바뀐 그 순간에만 한 번 적용 → 같은 구역 안에서 직접 바꾼 선택은 그대로 지켜진다
function updateToolPageAuto() {
  const key = toolZoneKey();
  if (key === lastAutoZone) return;
  lastAutoZone = key;
  const forced = key ? ZONE_TOOL[key] : null;
  if (!forced) restoreToolBeforeAuto();   // 도구를 정해 주던 구역을 벗어남 → 원래 들던 도구로
  const want = key ? ZONE_PAGE[key] : null;
  if (want) {
    if (want === 'none' && toolPage !== 'none') {
      pageBeforeAuto = toolPage;                                           // 돌아올 자리를 기억해 두고
      // 바가 저절로 접히는 첫 순간 — 왜 접혔고 어떻게 되돌리는지 한 번만 알려 준다
      if (!gameState.hintsSeen.toolStow) {
        gameState.hintsSeen.toolStow = true;
        ui.toast?.('🎒 도구를 등에 멨어요. 하단 왼쪽 버튼(숫자 1)으로 다시 꺼낼 수 있어요', 3200);
      }
    }
    setToolPage(want, true);
    if (forced) {                                        // ⛏️ 광산 = 괭이까지 손에
      if (toolBeforeAuto === null) toolBeforeAuto = currentTool;   // 나갈 때 되돌릴 자리
      selectToolAuto(forced);
    }
  } else if (toolPage === 'none' && pageBeforeAuto) {
    setToolPage(pageBeforeAuto, true); pageBeforeAuto = null;               // 구역을 벗어나면 도로 꺼내 든다
  }
}

// =============================================================
//  입력 API (키보드 + 모바일 터치 컨트롤이 함께 사용)
// =============================================================
// 🔥🫙 가공 창에 넘길 데이터. 표시용 문자열은 여기서 만들고 index.html 은 그리기만 한다.
//    시설마다 칸도 레시피도 따로다 — 화덕 창에 포도주스가 뜨면 안 된다.
function craftPanelData(station = 'kiln') {
  const today = todayStr(), inv = gameState.inventory;
  const def = stationDef(station);
  return {
    station: def.id, title: `${def.ico} ${def.name}`, ico: def.ico,
    ask: def.ask, claimAll: def.claim, hint: def.hint,
    cap: capacityOf(stationCount(def.id)),
    slots: slotsOf(gameState.craft.slots, def.id).map(s => {
      const r = craftRecipeOf(s.item);
      return { item: s.item, ico: r.ico, name: r.name, qty: s.qty, ready: isReady(s, today) };
    }),
    recipes: recipesOf(def.id).map(r => ({
      id: r.id, ico: r.ico, name: r.name,
      lack: lackOf(r.id, inv),
      cost: Object.entries(r.cost).map(([k, v]) => {
        // RES_LABEL 은 항목에 따라 이모지를 이미 품고 있다('🌾밀' · '⚫숯' …).
        //   그대로 아이콘을 덧붙이면 '🌾🌾밀' 이 된다(340px 실측에서 발견).
        const label = RES_LABEL[k] || k;
        const ico = /^[\p{Extended_Pictographic}]/u.test(label) ? '' : (SELL_ICO_G[k] || '📦');
        return { k, ico, label, need: v, have: inv[k] || 0 };
      }),
    })),
  };
}

// 걸기 — 등급은 미니게임(가공 창 오버레이)이 정한다. 완성 여부는 등급과 무관하다.
function craftSet(itemId, grade = 1) {
  const r = craftRecipeOf(itemId); if (!r) return null;
  const station = stationOf(itemId);
  if (slotsOf(gameState.craft.slots, station).length >= capacityOf(stationCount(station))) {
    trackEvent('craft_blocked', { reason: 'full', item: itemId, station }); return null;
  }
  if (!canAfford(itemId, gameState.inventory)) {
    trackEvent('craft_blocked', { reason: 'no_material', item: itemId, station }); return null;
  }
  for (const [k, v] of Object.entries(r.cost)) gameState.inventory[k] -= v;
  gameState.craft.slots = setSlot(gameState.craft.slots, { item: itemId, grade, day: todayStr() });
  settleDifficulty('craft', (grade || 0) / 3);   // 🎚️ 등급 0~3 → 0~1. 1주 차엔 ddaOn:false 라 값이 안 움직인다
  trackEvent('craft_set', { item: itemId, grade, qty: yieldOf(itemId, grade), station,
                            slot_idx: slotsOf(gameState.craft.slots, station).length - 1, station_seq: stationCount(station),
                            ...diffParams(craftDiffCur) });   // [GA4] 🎚️ 난이도 동봉 (맷돌은 craftDiffCur 가 null → ease 1 / arm null)
  requestSave(); refreshStations(); refreshInventoryUI();
  return craftPanelData(station);
}

// 받기 — 다 구워진 칸만 거둔다. waited_days 가 이 기능의 핵심 지표다.
function craftClaim(station = 'kiln') {
  const today = todayStr();
  const { rest, gained, claimed } = claimAll(gameState.craft.slots, today, station);
  if (!claimed.length) return craftPanelData(station);
  gameState.craft.slots = rest;
  for (const [k, v] of Object.entries(gained)) gameState.inventory[k] = (gameState.inventory[k] || 0) + v;
  for (const c of claimed) trackEvent('craft_claim', { item: c.item, qty: c.qty, grade: c.grade, station, waited_days: c.waitedDays });
  requestSave(); refreshStations(); refreshInventoryUI();
  const ico = stationDef(station).ico;
  ui.toast?.(ico + ' ' + claimed.map(c => `${craftRecipeOf(c.item).ico}${craftRecipeOf(c.item).name} ${c.qty}`).join(' · '));
  return craftPanelData(station);
}

let craftDiffCur = null;   // 🎚️ 이번 가공 판의 난이도 — craftDiff 가 채우고 craftScore·craftSet 이 읽는다

export const Input = {
  setAnalog(x, z) { analog.x = x; analog.z = z; },      // 조이스틱 벡터
  doAction() { wantAction = true; },                    // 액션 버튼/클릭/Space (도구질)
  doTalk() { if (!indoor && nearNPC) talkToNPC(); },    // 전용 "대화하기" 버튼(모바일) — 도구질과 분리
  // 슬롯 탭 / 숫자키 1~8 — 페이지와 무관한 절대 선택. 다른 페이지 도구를 고르면 페이지가 따라오고, ✋맨손도 풀린다
  selectTool(i) {
    if (placingOutdoor) { stopOutdoorPlacing(true); ui.onDecorPlaced?.(); }   // 🪵 들었던 장식은 제자리로
    // 🌾 이미 든 🌰씨앗을 다시 고르면(숫자키·슬롯 탭) 씨앗 종류 순환 — 기본 → 밀 → 옥수수 → 포도(보유분만)
    if (TOOLS[i]?.id === 'seed' && currentTool === i && toolPage === 'farm') return cycleSeedSel();
    currentTool = (i + TOOLS.length) % TOOLS.length;
    toolPage = TOOLS[currentTool].grp; lastPageTool[toolPage] = currentTool; pageBeforeAuto = null; toolBeforeAuto = null;
    ui.setTool?.(currentTool, TOOLS, toolPage);
    setHeldTool(TOOLS[currentTool].id); Sound.blip();
  },
  // 숫자키 2~6 — 지금 펼친 세트의 n번째(0~4) 도구. 1번이 전환이라 도구는 2번부터 시작한다.
  selectPageSlot(n) {
    if (toolPage === 'none') { pageBeforeAuto = null; setToolPage(lastOpenPage, true); }  // 맨손이면 세트부터 편다
    const pick = TOOLS.map((tool, i) => ({ tool, i })).filter(x => x.tool.grp === toolPage)[n];
    if (pick) Input.selectTool(pick.i);
  },
  // 🎒 하단바 칩 / 숫자키 1 — 🌾농사 → 🏕️야외도구 → ✋맨손 순환(자동 전환을 덮어쓴다)
  cycleToolPage() {
    const order = TOOL_PAGES.map(x => x.id);
    pageBeforeAuto = null;
    setToolPage(order[(order.indexOf(toolPage) + 1) % order.length]);
    ui.act?.('toolpage');   // 🎓 튜토리얼: "세트 바꿔 보기" 단계 통과
    return toolPage;
  },
  // 🎓 튜토리얼이 "🪓도끼(1)" 처럼 특정 도구를 지시할 때, 그 도구가 있는 페이지를 펴 준다.
  //   고르지는 않는다 — 고르는 건 플레이어가 배워야 할 동작이라 칸만 보이게 한다.
  revealTool(id) {
    const t = TOOLS.find(x => x.id === id);
    if (t && toolPage !== t.grp) { pageBeforeAuto = null; setToolPage(t.grp, true); }
  },
  getTools() { return TOOLS; },
  getToolPage() { return toolPage; },
  getToolPages() { return TOOL_PAGES; },
  // 낮/밤 수동 조절(setTimeOfDay·toggleDayFlow)은 제거됐다 — 시간은 늘 자동으로 흐르고,
  // 플레이어가 만질 수 있는 건 🛏️ 침대뿐(밤에 누우면 아침). dayPaused 는 ?time= dev 파라미터 전용.
  armTutorialMove() { movedOnce = false; },  // 튜토리얼 시작 시 이동 스텝 재감지
  getDecor() {   // 🏠 층별 해금 — 잠긴 것도 목록엔 보이되 locked 로 흐리게(살 목표가 보여야 싱크가 된다)
    const st = gameState.houseStage;
    return DECOR.filter(d => !d.hidden).map(d => ({ ...d, locked: !decorUnlocked(d, st) }));
  },
  getKitchen() { return kitchenView(); },               // 🍳 자유주방 메뉴판(레시피+코스+최고점수)
  kitchenStart(id, where) { return kitchenStart(id, where); },  // 🍳 요리 시작(재료 소비, 코스 개시)
  kitchenFinish(id, res) { return kitchenFinish(id, res); },    // 🍳 코스 결과 → 등급·기록·트래킹(버프는 아직)
  cookResolve(how) { return cookResolve(how); },        // 🍽️ 결과 화면: 'eat' 먹기 | 'store' 🧺 찬장 보관
  getPantry() { return pantryView(); },                 // 🍱 찬장(보관한 음식) 목록
  pantryEat(i) { return pantryEat(i); },                // 🍱 찬장에서 꺼내 먹기(버프 발동)
  craftSet(itemId, grade) { return craftSet(itemId, grade); },   // 🔥 화덕에 걸기(다음 날 완성)
  // 🎚️ 가공 미니게임 난이도 — index.html 이 오버레이를 열 때 부른다. 판정 경계만 흔든다(조작·길이는 고정).
  //    🌾 맷돌(flour)은 변동계수 기반이라 흔들 상수가 없다 — 팔을 돌리지 않고 기본값을 준다.
  craftDiff(itemId) {
    if (itemId === 'flour') { craftDiffCur = null; return { half: 0.12, targetMs: 1200, tol: 400, tolRatio: 0.5 }; }
    craftDiffCur = rollDifficulty('craft');
    const e = craftDiffCur.ease;
    return { half: 0.12 * e, targetMs: 1200, tol: 400 * e, tolRatio: 0.5 * e };
  },
  // 🔥 미니게임 판정 — 조작은 index.html 이 받고 판정은 순수 모듈이 한다
  craftScore(itemId, input) {
    if (itemId === 'flour') return millScore(input);
    if (itemId === 'charcoal') return fireScore(input.pos, input.target, input.half);
    // 🍷 포도는 index.html 이 박자만 모으고 허용 오차를 안 넘긴다 — 여기서 먹인다
    if (itemId === 'juice') return crushScore(input, 520, 0.5 * (craftDiffCur?.ease ?? 1));
    return knead2Score(input.heldMs, input.targetMs, input.tol);
  },
  craftGrade(score) { return gradeOfScore(score); },
  craftFocus(on) { return craftFocus(on); },            // 🔥 걸 때 화면을 화덕으로 옮긴다
  craftFlame(v) { craftFlame(v); },                     // ⚫ 불 조절 — 바늘을 따라 실제 불이 반응
  craftFlameBurst(good) { craftFlameBurst(good); },     // ⚫ 멈춘 순간 연출
  craftStomp() { craftStomp(); },                       // 🍷 밟을 때마다 통에서 즙이 튄다
  craftYield(itemId, grade) { return yieldOf(itemId, grade); },
  craftClaim(station) { return craftClaim(station); },  // 🔥🫙 다 된 것 받기(그 시설 칸만)
  craftData(station) { return craftPanelData(station); },
  cafeCookDone(res) { return cafeCookDone(res); },      // ☕ 카페 조리 완료 → 그 손님에게 바로 서빙
  getWorkshop() { return workshopView(); },             // 🗿 조각 공방 주문판(오늘의 주문 + 기록)
  carveStart(id) { return carveStart(id); },            // 🗿 조각 시작(재료 소비, 클로즈업 무대 입장)
  carveAbandon() { carveAbandon(); },                   // 🗿 그만두기(낮은 등급으로 강제 완성)
  carveSceneEnd() { carveSceneEnd(); },                 // 🗿 무대 종료(결과 닫기 → 마을 카메라 복귀)
  carveDebug(a, n) { return carveDebug(a, n); },        // 🗿 로컬 검증 훅(localhost 전용, 실서비스 no-op)
  mgSceneStart(type, icos, n, dishIco) { mgSceneStart(type, icos, n, dishIco); }, // 🍳 클로즈업 조리 무대 입장(카메라 전환)
  mgSceneEnd() { mgSceneEnd(); },                       // 🍳 무대 종료(마을 카메라 복귀)
  getStory() { return storyView(); },                   // 📖 메인 퀘스트 현황(칩·모달 렌더용)
  introStart() { return introStart(); },                // 🎬 프롤로그 시작(이미 봤으면 false 반환)
  introSkip() { if (intro) introEnd(true); },           // 🎬 건너뛰기
  introActive() { return !!intro; },
  mgChopFrame(ps) { mgChopFrame(ps); },                 // 🔪 리듬 노트 위치 동기화(매 프레임)
  mgChopHit(i, judge) { mgChopHit(i, judge); },         // 🔪 칼질 명중 연출
  mgPotHit(step, judge, ico) { mgPotHit(step, judge, ico); }, // 🍲 끓이기 탭 연출
  mgGrillFlip(judge, over) { mgGrillFlip(judge, over); },     // 🔥 뒤집기 연출(over=태움)
  mgSeasonPour(on) { mgSeasonPour(on); },                     // 🧂 누르는 동안 소금 쏟기
  mgSeasonDone(judge) { mgSeasonDone(judge); },               // 🧂 손 뗐을 때 마무리 연출
  getUpgrades() { return UPGRADES; },                   // 도구 업그레이드 목록
  getSeaSpecies() { return SEA_SPECIES.map(s => ({ id: s.id, name: s.name, ico: s.ico })); },   // 🌊 리더보드 행의 어종 표시(sp → 아이콘·이름)
  ownedUpgrades() { return { ...gameState.upgrades }; }, // 보유 업그레이드
  craftUpgrade(id) { return craftUpgrade(id); },        // 업그레이드 제작
  getTier2() { return tier2List(); },                   // 🔨 금빛 도구(2단계) 목록 — 도면 상태·비용
  craftTier2(tool) { return craftTier2(tool); },        // 🔨 금빛 도구 제작
  getOutdoor() { return OUTDOOR; },                     // 야외 장식 목록(+🏗️ 밭 시설 farm:true — UI 가 텃밭 안에서만 보여 준다)
  isAtFarm() { return atFarm; },
  selectOutdoor(id) { if (pickedOutdoor) stopOutdoorPlacing(true); placingOutdoor = id; outdoorTarget.pinned = false; buildDecorGhost(id, true); },   // 야외 장식 선택(설치 대기 — 발밑에 🫥미리보기). 들고 있던 장식은 제자리로(안 그러면 새 장식이 "옮김"으로 공짜 설치됨)
  hireWorker(i) { return hireWorker(i); },              // 🧑‍🌾 일꾼 고용(📋 게시판 창)
  fireWorker(id) { return fireWorker(id); },            // 일꾼 내보내기
  hireView() { return hireView(); },
  getWeatherPrep() { return weatherPrepView(); },       // 🌡️ 내일 궂은 날씨·덮개 상태
  craftCover() { return craftCover(); },                // 🛡️ 덮개 설치(예고일 한정)
  cancelOutdoor() { stopOutdoorPlacing(true); },        // 야외 배치 취소(들었던 장식은 제자리로)
  getOutdoorStored() { return gameState.outdoorStored || {}; },   // 🧺 보관한 야외 장식 { id: 개수 }
  getSellPrice() { const p = {}; for (const k in SELL_PRICE) p[k] = priceOf(k); return p; }, // 오늘의 시세 반영가
  getPriceRates() { const r = {}; for (const k in SELL_PRICE) r[k] = Math.round(priceRate(k) * 100); return r; }, // 시세 %(100=기본가)
  // 📖 도감 — 카탈로그 + 발견 여부 + 🏅 배지(도감 모달 렌더용)
  getDex() {
    const cats = {};
    for (const cat in DEX) cats[cat] = DEX[cat].map(e => ({ ...e, found: !!gameState.dex[cat]?.[e.id] }));
    const badges = BADGES.map(b => ({ id: b.id, name: b.name, ico: b.ico, desc: b.desc, earned: !!gameState.badges[b.id] }));
    return { cats, count: dexCount(), total: DEX_TOTAL, badges, badgeCount: badgeCount(), badgeTotal: BADGES.length };
  },
  getCafe() { return cafeView(); },                     // ☕ 주문판(현황 확인용 — 서빙은 손님에게 직접)
  // 🛶 나룻배 — 창고(업그레이드) / 다시 타기 / 중도 포기 / 시점 토글
  getBoatShop() { return boatShopView(); },
  buyBoatUpgrade(id) { return buyBoatUpgrade(id); },
  boatRunsLeft() { return boatRunsLeft(); },
  startBoatRun() { startBoatRun(); },
  quitBoatRun() { if (boat.active) endBoatRun('quit'); },
  toggleBoatView() { boatView = boatView === 'first' ? 'third' : 'first'; if (boat.active) playerAnchor.visible = (boatView === 'third'); return boatView; },
  boatViewMode() { return boatView; },
  getShopBuy() { return SHOP_BUY; },                    // 구매 목록
  sellItem(k, all) { return sellItem(k, all); },        // 자원 판매
  buyShop(id) { return buyShop(id); },                  // 아이템 구매
  getGifts() { return GIFTS; },                         // 선물 종류
  ownedGifts() { return { ...gameState.gifts }; },      // 보유 선물 수
  craftGift(id) { return craftGift(id); },              // 선물 제작
  giveGift(id) { return giveGift(id); },                // 근처 주민에게 선물
  affinityOf(npcId) { return gameState.affinity[npcId] || 0; }, // 친밀도
  // ── 💬 잡담 ────────────────────────────────────────────────
  //  보상이 없다. 친밀도도 코인도 안 준다 — 선물(재료를 쓴다)·접객의 가치를 희석하지 않기 위해서다.
  //  하루 주민당 TALK_PER_DAY 번. 다 쓰면 그 주민은 작별 문구만 남긴다.
  //  ⚠️ TALK_PER_DAY 는 functions/api/npc-talk.js 의 SETS_PER_DAY 와 같아야 한다.
  getTalkNpcs() {
    const t = gameState.talk?.date === todayStr() ? gameState.talk : { used: {} };
    return NPCS.map(n => ({
      id: n.id, name: n.name, emoji: n.emoji,
      left: Math.max(0, TALK_PER_DAY - (t.used[n.id] || 0)),
    }));
  },
  // 대화를 한 번 소비한다. 반환값은 "오늘 이 주민과 몇 번째 대화인가"(1부터), 소진이면 0.
  //  ⚠️ 호출부는 대사를 **실제로 받은 뒤에** 부를 것. 먼저 부르면 통신이 실패한 날
  //     아무 대화도 못 보고 횟수만 날아간다.
  useTalk(npcId) {
    if (!NPCS.some(n => n.id === npcId)) return 0;
    if (gameState.talk?.date !== todayStr()) gameState.talk = { date: todayStr(), used: {} };
    const used = gameState.talk.used[npcId] || 0;
    if (used >= TALK_PER_DAY) return 0;
    gameState.talk.used[npcId] = used + 1;
    requestSave();
    return used + 1;
  },
  talkWeather() { return WEATHER; },             // 첫인사를 고를 때 쓴다
  capturePhoto() { try { return renderer.domElement.toDataURL('image/png'); } catch (e) { return null; } }, // 사진 캡처(현재 화면 그대로)
  captureActionShot() { return startActionShot(); },  // 📷 밀착 액션샷(포즈 정점 캡처, Promise<dataURL>)
  toggleSit() { if (intro) return; sitting = !sitting; if (sitting) Sound.blip(); },   // 앉기 토글(컷신 중엔 포즈 보호)
  // 캐릭터(동물) 선택
  getAnimals() { return ANIMALS.map(a => ({ id: a.id, name: a.name, emoji: a.emoji })); },
  // 🏷️ 닉네임(리더보드 표시명) — 생성/조회/변경
  getNickname() { return gameState.nickname; },
  genNickname(animal) { return genNickname(animal); },
  setNickname(name, source) { return setNickname(name, source); },
  createCharacterPreview(canvas) { return makeCharacterPreview(canvas); }, // 선택화면 3D 프리뷰
  // 🎀 꾸미기 상점 — 패널 내용·프리뷰는 게임 쪽이 그린다(show/hide 만 UI 가 한다)
  openCosMenu(canvas) { openCosPreview(canvas); },
  closeCosMenu() { closeCosPreview(); },
  hasCharacter() { return !!gameState.character; },
  getCharacter() { return gameState.character; },        // 🐾 바꾸기 모달에서 현재 캐릭터 미리 선택용
  // change=true 면 플레이 도중 교체(진행 상황은 그대로) — 첫 선택과 이벤트를 구분해 기록
  setCharacter(id, change = false) {
    const prev = gameState.character;
    if (change && prev === id) return;                   // 같은 동물이면 아무것도 하지 않음
    gameState.character = id; applyCharacter(id); Sound.blip();
    if (change) {
      spawnSparkle(player.position.x, 1.4, player.position.z, 20);
      trackEvent('character_change', { animal: id, from: prev || 'none' });   // [GA4] 교체 빈도·선호 동물
    } else {
      trackEvent('character_select', { animal: id });     // [GA4] 최초 선택
    }
  },
  needsTutorial() { return !gameState.tutorialSeen; },
  guideNudgeSeen() { return !!gameState.guideNudgeSeen; },
  markGuideNudgeSeen() { gameState.guideNudgeSeen = true; },
  markTutorialSeen() { gameState.tutorialSeen = true; },
  // 코치가 이미 설명한 시설은 졸업 후 배너를 또 띄우지 않게 '본 것' 처리(튜토리얼 완주 시 호출)
  markHintsSeen(keys) { for (const k of keys) gameState.hintsSeen[k] = true; },
  // 집 외관 커스터마이징
  getHouseStyle() { return { style: { ...gameState.houseStyle }, unlocked: { roof: [...gameState.unlocked.roof], wall: [...gameState.unlocked.wall], door: [...gameState.unlocked.door] }, ...PART_COLORS() }; },   // 0번 스와치는 현재 모델 기본색
  setHousePart(part, idx) {
    if (!(part in gameState.houseStyle)) return { ok: false };
    if (!gameState.unlocked[part].includes(idx)) return { ok: false, locked: true };
    gameState.houseStyle[part] = idx; applyHouseStyle(); Sound.blip(); return { ok: true };
  },
  houseBuilt() { return gameState.houseStage >= 3; },
  setExtView(on) { extView = !!on; },            // 🏠 외관 메뉴 열림/닫힘 — 열린 동안 카메라가 집을 화면 위쪽에 둔다
  getExpansion() { return expandInfo(); },       // 🏗️ 증축 정보(외관 메뉴 렌더용)
  expandHouse() { return doExpand(); },          // 🏗️ 증축 실행(외관 메뉴 버튼)
  getHouseAddons() { return houseAddonInfo(); },  // 🧩 구성품 상점 정보(외관 메뉴 렌더용)
  buyHouseAddon(id) { return buyHouseAddon(id); }, // 🧩 구성품 구매(코인 → 집에 바로 설치)
  emote(e) {   // 머리 위 이모지 + 기분에 맞는 캐릭터 모션(춤·점프·하트·인사)
    spawnFloatText(player.position.x, 2.7, player.position.z, e, '#4a5a40');
    const m = EMOTE_MOTION[e];
    if (m) startEmote(m[0], m[1]);
    if (e === '❤️' || e === '🎵') Sound.harvest(); else Sound.blip();
  },
  selectDecor(id) { startDecorPlacing(id); },     // 가구 선택 → 손에 들고 + 바닥 고스트 미리보기
  cancelDecor() { stopDecorPlacing(true); },      // 들어 올린 가구였다면 제자리로
  rotateDecor() { decorRot = (decorRot + 1) % 4; if (placingDecor) setHeldDecor(placingDecor); updateDecorGhost(); return decorRot; }, // 가로/세로 회전(고스트도 같이)
  getDecorRot() { return decorRot; },
  storeDecor() { return pickedOutdoor ? storeOutdoor() : storeDecor(); },   // 🧺 들고 있는(바닥에서 든) 가구·야외 장식을 창고로
  isPickedDecor() { return !!pickedDecor || !!pickedOutdoor; },   // 지금 든 게 바닥에서 든 것인지(보관 버튼 노출 조건) — 🪵 야외 장식 포함
  getStored() { return gameState.house.stored || {}; },
  isIndoor() { return indoor; },
  hintSeen(key) { return !!gameState.hintsSeen[key]; },   // 첫 안내 1회 판정(🎨 가구 배치 단계 안내 등)
};

// ── 🧪 [베타 2차] 맵 계단식 열기 — 판정은 tuning.js, 여기선 상태만 넘긴다 ──────────
//    로컬 검증: ?betaDay=3 (localhost 전용, DEV_PARAMS 라 로깅 꺼짐)
const BETA_DAY_FORCED = (() => {          // 매 프레임 파싱하지 않게 한 번만(프롬프트가 mapLocked 를 프레임마다 부른다)
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return null;
  const n = Number(_wq.get('betaDay'));
  return (Number.isFinite(n) && n >= 1) ? n : null;
})();
function betaNowMs() {
  const now = Date.now();
  // 지금이 forced 일차가 되도록 시계를 통째로 옮긴다 — D1(=max(시작일, 가입일)) 판정은 tuning.js 그대로
  if (BETA_DAY_FORCED && authState.createdAt) return now + (BETA_DAY_FORCED - betaDay(authState.createdAt, now)) * 86400000;
  return now;
}
function mapLocked(map) {
  return isMapLocked({ variant: authState.variant, mapOrder: authState.mapOrder,
                       createdAtIso: authState.createdAt, progress: gameState.progress,
                       nowMs: betaNowMs() }, map);
}
/** 잠긴 입구에서 액션했을 때 — 토스트 + GA4. true 면 입장을 막는다. */
function blockIfLocked(map) {
  if (!mapLocked(map)) return false;
  const openDay = mapOpenDay(authState.mapOrder, map);
  ui.toast?.(lockLine(map, openDay));
  trackEvent('map_locked', { map, day: betaDay(authState.createdAt, betaNowMs()), open_day: openDay });
  return true;
}
let announceMapOpensRetries = 0;   // 🧪 [베타 2차] 코치/모달 위에서는 미루고 8초 간격 최대 15번까지만 재시도(다음 세션이 이어받음)
/** 열린 날 첫 접속 배너 — 세이브 hintsSeen 으로 1회. 베타가 아니면 아무것도 안 한다. */
function announceMapOpens() {
  gameState.hintsSeen ||= {};          // 오래된 세이브 방어
  if (!/^beta_/.test(authState.variant || '') || !authState.mapOrder) return;
  if (ui.coachActive?.() || ui.anyModalOpen?.()) {   // 튜토리얼 코치·모달 위에서는 아무것도 소진하지 않고 미룬다
    if (announceMapOpensRetries++ < 15) setTimeout(announceMapOpens, 8000);
    return;                            // 15번 넘으면 이번 세션은 조용히 포기 — hintsSeen 미기록이라 다음 세션이 다시 시도
  }
  for (const map of ['sea', 'mist']) {
    const key = 'mapOpen_' + map;
    if (gameState.hintsSeen[key] || mapLocked(map)) continue;
    const openDay = mapOpenDay(authState.mapOrder, map);
    const day = betaDay(authState.createdAt, betaNowMs());
    if (day < openDay) continue;       // 방어
    const s = openLine(map);
    const i = s.indexOf(' — ');        // split(' — ') 는 문구에 ' — ' 가 두 번 나오면 뒷부분을 버렸다 — indexOf 로 첫 등장만 기준삼는다
    const head = i < 0 ? s : s.slice(0, i);
    const line = i < 0 ? '' : s.slice(i + 3);
    const sp = head.indexOf(' ');
    const ico = sp < 0 ? '' : head.slice(0, sp);
    const title = sp < 0 ? head : head.slice(sp + 1);
    gameState.hintsSeen[key] = true;   // 실제로 배너를 띄우는 순간에만 소진
    ui.showHintBanner?.({ ico, title, line, near: () => true });
    trackEvent('map_opened', { map, day });
  }
}

// =============================================================
//  [🎯 이탈 예측] 트리거 시점에 점수를 받아 treat 군에만 배너를 띄운다
//  설계서 §6~§8. 실패는 전부 조용히 넘어간다(fail-open) — 배너 하나 못 띄우는 게 손해의 전부다.
// =============================================================
let churnPredictor = null;
let retentionGuidance = null;
let retentionGuidanceHooked = false;

// 다음 집 단계를 지금 지을 수 있는가 — 0~2단계는 🔨망치(건축 비용표), 3단계부터는 증축(EXPANSIONS 비용).
//   tryBuild()/expandInfo() 가 쓰는 판정과 같은 기준을 읽기 전용으로 다시 물어본 것.
function churnHouseReady() {
  if (gameState.houseStage < 3) return buildInfo(gameState).affordable;
  const info = expandInfo();
  return !info.maxed && !!info.affordable;
}

function initChurnPredictor() {
  churnPredictor = createPredictor({
    getWindow,
    fetchImpl: (...a) => fetch(...a),
    endpoint: TUNING.churn.endpoint,
    timeoutMs: TUNING.churn.timeoutMs,
    maxPerSession: TUNING.churn.maxPerSession,
    session: {
      id: authState.sessionId,
      clientId: authState.clientId,
      // ⚠️ getter — resolveBetaGroup() 이 loadGame() 과 경주하며 authState.variant 를
      //    나중에(첫 await 뒤) 다시 대입할 수 있다. 값으로 굳히면 베타 테스터가 control 로 잘못 기록된다.
      get variant() { return authState.variant; },   // 🧪 베타 번들 A/B — arm 과 독립
      // 개입 배정은 세션 단위로 여기서 한 번만 정한다. treatRate 가 0 이면 개입 전면 off.
      arm: Math.random() < TUNING.churn.treatRate ? 'treat' : 'control',
      // 첫 세션 판정 — 세이브에 흔적이 없으면 첫 세션으로 본다
      isFirstSession: !gameState.houseStage && !Object.keys(gameState.dex?.fish || {}).length,
    },
    // ⚠️ getter 로 넘긴다 — createPredictor 는 트리거마다 deps.gameState 를 다시 읽는다.
    //    값으로 넘기면 게임 시작 시점 상태로 굳어 배너가 엉뚱한 걸 권한다.
    get gameState() {
      return buildGameStateSnapshot({
        plots,
        questStates: NPCS.map(n => gameState.npcs[n.id]),   // 읽기 전용 — npcState() 는 없으면 세이브에 항목을 만든다
        houseStage: gameState.houseStage,
        maxHouseStage: MAX_HOUSE_STAGE,
        houseReady: churnHouseReady(),
        dex: gameState.dex,
      });
    },
    showBanner: (b) => {
      // 🎯 주목 신호 — 짧은 "띠링"(효과음 토글 존중) + 안드로이드 진동 30ms. 실패해도 배너는 뜬다.
      if (b.attention) { try { Sound.nudge?.(); navigator.vibrate?.(30); } catch (e) { /* 무시 */ } }
      ui.showHintBanner?.({ ico: b.ico, title: b.title, line: b.line, near: () => true, attention: !!b.attention });
    },
    track: (n, p) => trackEvent(n, p),
  });

  // 트리거 ① 접속 후 15초 — 한 번만. 설계서 §3-1(커버리지 84%)
  setTimeout(() => churnTrigger('time15'), TUNING.churn.timeTriggerSec * 1000);
}

// onTrigger 는 async 이지만 await 하지 않는다 — 이 헬퍼 한 곳에서 뜬 프라미스를 처리해
// 호출부마다 .catch() 를 반복하지 않는다.
function churnTrigger(kind) {
  churnPredictor?.onTrigger(kind).catch(() => {});
}

// =============================================================
//  [🌿 리텐션 안내] 초반 행동 룰로 실제 배너를 띄우고, 결과를 계측한다.
//  모델 점수는 나중에 공급되면 rule-low 구간 rescue 로만 쓰도록 모듈에 자리를 열어둔다.
// =============================================================
function retentionGuidanceSuppressed() {
  try {
    if (ui.coachActive?.()) return 'coach';
    const b = document.body;
    if (b.classList.contains('mg-open')) return 'minigame';
    if (b.classList.contains('guide-open')) return 'guide';
    if (b.classList.contains('intro-open')) return 'intro';
    if (document.querySelector('#tutorial-modal.show, #chat-modal.show, #story-modal.show, #npc-modal.show, #market-modal.show, #hire-modal.show, #dex-modal.show, #notice-modal.show, #char-modal.show, #feedback-modal.show')) return 'modal';
    // ⚠️ 아래는 **CSS 가 #hint-banner 를 display:none 으로 숨기는 상태**다(index.html 524·580·595·937·1005).
    //    JS 가 이걸 모르면 안 보이는 배너를 "띄웠다"고 치고 세션당 1회 예산을 날린 뒤,
    //    shown 이벤트까지 찍어 10분 성과창이 아무도 못 본 배너를 잰다.
    //    CSS 에 #hint-banner 숨김 규칙을 추가하면 여기도 같이 추가할 것.
    if (b.classList.contains('menu-open')) return 'menu';
    if (b.classList.contains('sea-mode')) return 'sea';
    if (b.classList.contains('decor-guide')) return 'decor_guide';
    if (b.classList.contains('mist-guide')) return 'mist_guide';
    const meter = document.getElementById('habitat-meter');
    if (meter && !meter.hasAttribute('hidden')) return 'habitat_meter';
  } catch (e) {
    return 'unknown';
  }
  return null;
}

function retentionGuidanceState() {
  const snap = buildGameStateSnapshot({
    plots,
    questStates: NPCS.map(n => gameState.npcs[n.id]),
    houseStage: gameState.houseStage,
    maxHouseStage: MAX_HOUSE_STAGE,
    houseReady: churnHouseReady(),
    dex: gameState.dex,
  });
  // ⌨️ 조작 안내를 PC/터치로 나누기 위한 플래그 — index.html 의 TOUCH 와 같은 판정식.
  //    retention-guidance.js 는 브라우저 전역을 안 쓰는 순수 모듈이라 여기서 재서 넘긴다.
  let touch = false;
  try { touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0; } catch (e) { touch = false; }
  return { ...buildRetentionGameStateSnapshot(snap), touch };
}

function initRetentionGuidance() {
  retentionGuidance = createRetentionGuidance({
    config: TUNING.retentionGuidance,
    platform: () => authState.provider === 'toss' ? 'toss' : undefined,
    identity: () => ({
      sessionId: authState.sessionId,
      clientId: authState.clientId,
      variant: authState.variant || 'control',
      platform: authState.provider === 'toss' ? 'toss' : 'web',
    }),
    gameState: retentionGuidanceState,
    suppress: retentionGuidanceSuppressed,
    persistScore: row => upsertRetentionGuidanceScore(row),
    showBanner: (b) => {
      if (b.attention) { try { Sound.nudge?.(); navigator.vibrate?.(30); } catch (e) { /* 무시 */ } }
      ui.showHintBanner?.({
        ico: b.ico, title: b.title, line: b.line, near: () => true, attention: !!b.attention,
        // 🌿 상단 슬롯은 캔버스에 그려지는 월드 라벨(NPC 이름표·간판)을 가린다.
        //    좁은 화면에선 프롬프트 줄 위로 내린다(#hint-banner.slot-bottom).
        //    🪧 시설 배너는 "이 앞에 뭐가 있다"는 안내라 대상 근처인 상단이 맞아서 안 내린다.
        slotBottom: true,
        onShow: b.onShow,
        onDismiss: b.onDismiss,
        onTap: b.onTap,
      });
    },
    track: (n, p) => trackEvent(n, p),
  });

  if (!retentionGuidanceHooked) {
    onTrack((name, params) => retentionGuidance?.recordEvent(name, params));
    retentionGuidanceHooked = true;
  }
  retentionGuidance.start();
}

// =============================================================
//  진입점
// =============================================================
// ① 로그인 화면 뒤에서 도는 "어트랙트" 씬 부팅 (플레이어 조작 X)
export async function bootWorld(uiCallbacks) {
  ui = uiCallbacks || {};
  ui.setHabitatLabels?.(TAG_LABEL, HABITAT_BLOCK_LINE);   // 🦋 미터 라벨·안내 문구는 js/habitat.js 가 단일 출처
  initRenderer();
  initScene();
  initLights();
  buildWorld();
  buildHouseGhost();
  buildInterior();          // 집 실내 방(꾸미기 공간)
  buildNPCs();              // 마을 주민들
  initPostProcessing();
  initInput();
  initSound();
  ui.setTool?.(currentTool, TOOLS, toolPage);
  window.addEventListener('resize', onResize);
  player.visible = false;   // 로그인 중엔 캐릭터 숨김(카메라 자동 오빗)
  mode = 'attract';
  animate();
}

// ② 로그인 완료 후 실제 플레이 시작 (저장 로드 + 로깅 + 조작 on)
export async function enterGame() {
  // [Supabase] 저장 불러오기 — 🛡️ 읽을 때까지 기다린다.
  //   읽기에 실패했는데 그냥 들여보내면 새 마을이 만들어지고, 30초 뒤 자동저장이
  //   서버의 멀쩡한 마을을 덮어쓴다(2026-09-14·09-11 사고 2건). 판정은 js/save-guard.js.
  let load = await loadGame();
  if (!load.canPlay) ui.setLoadWait?.(true);     // 🌙 "잠시만요, 마을을 찾는 중이에요" — 루프 밖에서 한 번만
  for (let tries = 0; !load.canPlay; tries++) {
    // [GA4] 갇힌 사람을 셀 분모. recovered 만 쏘면 영영 못 들어온 사람이 통계에서 사라진다.
    //   매 시도마다 보내면 한 세션이 지표를 삼키므로 1회차 + 매 10회차만.
    if (tries === 0 || (tries + 1) % 10 === 0) trackEvent('save_load_failed', { attempt: tries + 1, code: load.code || 'unknown' });
    // 🚪 오래 끌면 "다시 들어가기"를 띄운다 — 토큰 만료처럼 스스로 낫지 않는 실패의 유일한 출구
    if (offerReload(tries)) ui.setLoadWait?.(true, true);
    await new Promise(r => setTimeout(r, retryDelay(tries)));
    load = await loadGame();
    if (load.canPlay) trackEvent('save_load_recovered', { tries: tries + 1 });   // [GA4] 사고 재발 감시 — 몇 번 만에 붙었나
  }
  ui.setLoadWait?.(false);
  // [GA4] 읽기는 됐는데 행이 없는 경우. RLS 거부·유저 id 재매핑도 여기로 들어오므로(둘 다 data·error 가 null),
  //   "신규 유저 급증"이 사실은 복귀 유저인 상황을 이 이벤트로 가려낸다.
  if (load.kind === 'empty') trackEvent('save_load_empty', { provider: authState.provider || 'unknown' });
  if (load.kind === 'failed_fresh') {
    trackEvent('save_load_failed', { attempt: 1, code: load.code || 'unknown', fresh_guest: 1 });   // 🚪 입장은 시켰지만 저장은 잠긴 세션
    //  게스트는 위 루프를 돌지 않으므로(바로 입장) 아무도 다시 읽지 않는다 → 저장이 세션 내내 잠긴 채로 남는다.
    //  뒤에서 조용히 다시 읽어 본다. 성공하면 잠금이 풀려 이 게스트의 진행도 저장되기 시작한다.
    (async () => {
      for (let i = 0; i < 12; i++) {                       // 약 1분간. 그 뒤에도 안 되면 이 세션은 저장을 포기한다
        await new Promise(r => setTimeout(r, retryDelay(i)));
        if ((await loadGame()).canSave) { trackEvent('save_load_recovered', { tries: i + 1, fresh_guest: 1 }); return; }
      }
    })();
  }
  if (load.state) applySave(load.state);
  // 🔥 첫 화덕 — 세이브가 있든 없든 한 채는 서 있어야 한다. applySave 안에 두면 신규 유저가 못 받는다.
  //    스토리 보상으로 주려던 원안은 1장 완료가 25명(진입 109명의 23%)뿐이라 폐기했다.
  //    이미 지어 두거나 옮겨 둔 사람의 자리는 건드리지 않는다.
  if (!kilnCount()) {
    const [kx, kz] = pickKilnSpot();
    clearTreesForKiln(kx, kz);                   // 나무에 파묻히지 않게 자리를 낸다
    placeOutdoor(kx, kz, true, 'kiln', 0);
  }
  // 🫙 첫 발효통 — 텃밭 마당에 한 채. 화덕과 같은 이유로 기본 지급한다.
  //    🍇포도는 씨앗을 사서 심어야 나오는 고급 작물이라, 통이 먼저 서 있는 편이 '심을 이유' 가 된다.
  if (!stationCount('vat')) placeOutdoor(FARM.x + VAT_HOME_LOCAL[0], FARM.z + VAT_HOME_LOCAL[1], true, 'vat', 0);
  refreshStations();
  catchUpCraft();                      // 🔥 자는 사이 다 구워진 게 있으면 알린다
  prefetchNotices();                   // 📮 안 읽은 소식을 미리 받아 둔다(await 안 함 — 출석 모달을 닫을 때 준비돼 있으면 이어서 띄운다)
  // 테스트: ?house=4|5|6 — 증축 단계 미리보기(?weather= 와 같은 개발용 파라미터)
  const _hq = parseInt(_wq.get('house') || '', 10);
  if (_hq >= 1 && _hq <= MAX_HOUSE_STAGE) for (let s = gameState.houseStage + 1; s <= _hq; s++) buildHouseStage(s, true);
  if (_wq.get('coop') === '1' && !gameState.coop.built) buildCoop(true);   // 테스트: ?coop=1 — 닭장 미리보기
  if (_wq.get('farm') === '1') setTimeout(() => enterFarm(), 60); // 테스트: ?farm=1 — 개인 텃밭 바로 입장(?give=seed:9 와 조합)
  // 테스트: ?farmstage=2|3 — 밭 증축 미리보기 / ?farmmax=1 — 3단계 만땅(121칸 심음, 스펙 §5-4 드로우콜 최악 상태)
  const _fs = parseInt(_wq.get('farmstage') || '', 10);
  if (_fs >= 1 && _fs <= MAX_FARM_STAGE && _fs !== gameState.farm.stage) { gameState.farm.stage = _fs; rebuildFarm(true); }
  if (_wq.get('farmmax') === '1') { gameState.farm.stage = MAX_FARM_STAGE; rebuildFarm(true); setTimeout(() => window.__farmMax?.(), 120); }
  // 테스트: ?daily3=1 — "오늘 3건을 받아 다 끝낸 사람"(3→5 배포 당일)을 흉내 낸다 → 아래 refresh 가 5건으로 덧붙이는지 본다
  //        ?daily3=fresh — 3건을 받았지만 아직 시작 전 → 잃을 게 없으니 새로 5건을 뽑는지 본다
  if (_wq.has('daily3')) {
    const _d = NPCS.find(n => n.daily), _s = _d && npcState(_d.id);
    if (_s) {
      _s.date = todayStr(); _s.idx = _wq.get('daily3') === 'fresh' ? 0 : 3; _s.progress = 0; _s.given = false; _s.special = null; _s.qsrc = null;
      _s.quests = pickGated(DAILY_POOL, 3, dateHash('daily'), questCtx()).map((q, i) => { const e = dailyEntry(q, i); return { ...e, line: renumberDailyLine(e.line, 3) }; });
    }
  }
  refreshDailyQuests();                // [데일리] 오늘 의뢰 준비 — 글리프 갱신 전에(빈 quests 접근 방지)
  refreshRepeatQuests();               // [반복] 체인을 다 깬 주민 중 오늘 열리는 3명
  // 테스트: ?owl=1 — 오늘 일일 의뢰를 전부 끝낸 상태로 만들어 ✨특별 의뢰 배달을 바로 본다
  //   (전부 깨려면 한참 걸려 검수 때마다 막힌다 — ?coop=1·?sea=1 과 같은 개발용 파라미터)
  //   ⚠️ idx 는 DAILY_COUNT 를 따라가야 한다. 숫자를 박아 두면 개수를 바꿀 때 조건(idx >= DAILY_COUNT)이 어긋나 배달이 안 온다.
  if (_wq.get('owl') === '1') {
    const _od = NPCS.find(n => n.daily);
    if (_od) { const _os = npcState(_od.id); _os.idx = DAILY_COUNT; _os.given = false; _os.progress = 0; _os.allDone = true; }
  }
  // 테스트: ?repeat=1 — 주민 체인을 전부 끝낸 상태로 만들어 🔁반복 의뢰를 바로 본다
  if (_wq.get('repeat') === '1') {
    for (const _d of NPCS) {
      if (_d.daily) continue;
      const _s = npcState(_d.id);
      _s.idx = _d.quests.length; _s.given = false; _s.progress = 0; _s.allDone = true; _s.repeat = null;
    }
    refreshRepeatQuests();   // 체인을 소진시킨 뒤 다시 — 위쪽 호출은 아직 체인이 남아 있어 아무것도 열지 않았다
  }
  upgradeDailyQuestsAI();              // 🦉 AI 의뢰는 백그라운드로 — 도착하면 조용히 교체(await 하지 않는다)
  refreshInventoryUI();
  ui.setTool?.(currentTool, TOOLS, toolPage);
  refreshQuestPanel();                  // 📜 복원 직후에도 수락해 둔 의뢰가 그대로 보이게(빈 패널로 시작하지 않는다)
  npcObjs.forEach(updateNPCGlyph);     // 저장 복원 후 말풍선 상태 반영
  ui.setPlaces?.(villagePlaces());     // 🗺️ 실내·서브공간에서 시작해도 지도가 열리게(미니맵 틱은 마을에서만 돈다)
  player.visible = true;
  player.position.set(gameState.playerPos.x || 0, 0, gameState.playerPos.z || 0);
  // 테스트: ?spawn=x,z — 시작 위치 지정(?weather=/?house= 와 같은 개발용)
  const _sp = (_wq.get('spawn') || '').split(',').map(Number);
  if (_sp.length === 2 && _sp.every(Number.isFinite)) player.position.set(_sp[0], 0, _sp[1]);
  // 테스트: ?time=0~1 — 시간대 고정(0.75≈한밤). 🌟 반딧불이 등 밤 콘텐츠 확인용
  const _tq = parseFloat(_wq.get('time') || '');
  if (Number.isFinite(_tq)) { timeOfDay = ((_tq % 1) + 1) % 1; dayPaused = true; }
  // 테스트: ?give=crop:5,fish:2 — 재료 지급. 로컬 개발 서버에서만 동작(실서비스 경제·지표 오염 방지)
  if (_wq.has('give') && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    for (const pair of _wq.get('give').split(',')) {
      const [k, v] = pair.split(':');
      if (k in gameState.inventory) gameState.inventory[k] += parseInt(v, 10) || 0;
    }
  }
  // 테스트: 콘솔에서 __nightTest() — 어젯밤이 지난 셈 치고 밤손님 판정을 다시 받는다.
  // ?give 와 같은 로컬 전용(실서비스에서 임의 습격 유발·경제 오염 방지)
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
    window.__nightTest = () => { gameState.night.lastDate = todayStr(-1); return resolveNightVisit(); };
    // 🐗🦝 대결 검수 — 서버 판정을 건너뛰고 흔적을 직접 심는다.
    //   판정이 HMAC(uid:date) 결정값이라 __nightTest 를 반복해도 오늘 결과는 안 바뀐다.
    //   animal: 'boar' | 'raccoon'
    window.__nightForce = (animal = 'boar') => {
      const p = plots.find(x => x.state === 'growing' || x.state === 'mature') || plots[0];
      if (!p) return '밭이 없다';
      // 실제 습격(resolveNightVisit)처럼 작물을 치운다 — 안 치우면 털린 밭에 새싹이 그대로 남아 검수 화면이 실제와 달랐다
      clearCrop(p); p.state = 'empty'; p.growth = 0; p.stage = -1; p.watered = false; updatePlotVisual(p);
      const t = { x: p.x, z: p.z, animal, loot: animal === 'boar' ? 'acorn_drop' : 'fur_tuft', crop: p.cropType?.id || '' };
      gameState.night.traces.push(t); spawnTrace(t);
      gameState.night.duelDate = null; gameState.night.duelDone = [];   // 오늘 이미 붙었어도 다시 볼 수 있게
      return `${animal} 흔적을 (${p.x}, ${p.z}) 에 심었다 — 가서 조사하세요`;
    };
    // ?severe=frost 와 조합: 어제 정산한 셈 치고 오늘의 궂은 날씨를 다시 정산
    window.__frostTest = () => { gameState.frost.lastDate = todayStr(-1); return resolveWeatherEvent(); };
    // 🛶 __boatTest() — 오늘 탄 횟수를 초기화(코스 반복 테스트용). 코스 시드는 그대로라 같은 물길이 나온다
    window.__boatTest = () => { gameState.boat.date = null; return boatRunsLeft(); };
    // 🛶 __boat — 나룻배 검수용. up('lamp',1) 로 업그레이드를 채우고 start() 로 즉시 출항(🏮등불·물보라 시야 확인)
    window.__boat = {
      start: startBoatRun, quit: () => endBoatRun('quit'), state: boat,
      up: (id, lv = 1) => { if (id in gameState.boat.up) gameState.boat.up[id] = lv; return { ...gameState.boat.up }; },
      course: riverCourse,                                  // 코스 데이터(장애물이 몇 m 앞인지 — 같은 지점 비교 촬영용)
      seek: (d) => { boat.dist = Math.max(0, d); return Math.round(boat.dist); },
    };
    // 🔥 __craftNotice() — 완성 알림을 다시 띄운다(하루 1회 제한을 풀고 재실행, 검증용)
    window.__craftNotice = () => { gameState.craft.noticedDay = null; catchUpCraft(); return gameState.craft.slots.length; };
    // 📷 __fadeN() — 지금 몇 그루가 비쳐지고 있는지(카메라 가림 처리 검증용, 로컬 전용)
    window.__fadeN = () => _faded.length;
    // ⚡ __stationDC(id) — 🔥🫙 시설이 드로우콜을 얼마나 쓰는지 + 지금 어떤 상태인지(로컬 전용).
    //    그 시설 메시만 껐다 켜서 차이를 본다.
    window.__stationDC = (id = 'kiln') => {
      const ms = outdoorMeshes.filter(m => m.userData.rec?.id === id);
      // renderer.info 가 정확하다 — gl 호출을 직접 세면 섀도맵 갱신이 겹쳐 과대 측정된다
      const count = () => { renderer.render(scene, camera); return renderer.info.render.calls; };
      const on = count();
      ms.forEach(m => m.visible = false); const off = count(); ms.forEach(m => m.visible = true);
      const shown = (p) => p ? Object.fromEntries(Object.entries(p).map(([k, v]) => [k, !!v.visible])) : null;
      return { id, n: ms.length, at: ms.map(m => [+m.position.x.toFixed(1), +m.position.z.toFixed(1)]),
               parts: ms.map(m => shown(m.userData.station)),
               withIt: on, without: off, per: ms.length ? +((on - off) / ms.length).toFixed(1) : 0 };
    };
    window.__kilnDC = () => window.__stationDC('kiln');   // 옛 이름(화덕 검수 기록이 이걸 쓴다)
    // 🔥 __craftAge(days) — 걸어 둔 것을 days 일 전에 건 셈 친다(완성·정산 검증용, 로컬 전용).
    //    시스템 시계를 못 바꾸니 슬롯의 날짜를 뒤로 민다.
    window.__craftAge = (days = 1) => {
      const key = dayStr(Date.now() - days * 86400000);   // 형식을 손으로 조립하면 어긋난다(2026-09-20 사고)
      gameState.craft.slots = gameState.craft.slots.map(s => ({ ...s, day: key }));
      refreshStations(); requestSave();
      return gameState.craft.slots.map(s => `${s.item}:${s.day}`);
    };
    // 🌫️ __mistTest() — 오늘 정화를 무른 셈 치고 다시(코스 아님이라 리롤 유인 없음)
    window.__mistTest = () => { gameState.mist.date = null; gameState.mist.purified = false; return mistDaily(); };
    window.__mist = mist;   // 🎓 연습 모드·갈림길 검수용(로컬 전용) — 정령 좌표·♪ phase 를 콘솔에서 본다
    // 🎬 __introTest() — 프롤로그 강제 재생(이미 본 세이브에서도) / __introJump(s) — 타임라인 점프(검증용)
    window.__introTest = () => introStart(true);
    window.__introJump = (s) => { if (intro) intro.t = s; return !!intro; };
    // 🏠 __buildTest(n) — 집 터로 순간이동해 재료를 채우고 n 단계까지 지어 본다(간판·토스트·원장 검수용).
    //   비용표(js/house-cost.js)를 만질 때마다 3단계 간판과 부족 토스트를 눈으로 확인하려고 둔다. 로컬 전용.
    window.__buildTest = (n = 1, fill = true) => {
      if (fill && !IS_DEV_SESSION) return '자원 주입은 dev 세션에서만 — ?dbg 로 여세요';   // econ_logs 에 999 잔액이 남지 않게
      window.__tp(HOUSE_POS.x, HOUSE_POS.z + 2.5);
      if (fill) for (const k of ['wood', 'stone', 'coins']) gameState.inventory[k] = 999;
      refreshInventoryUI();
      for (let i = 0; i < n; i++) tryBuild();
      return { stage: gameState.houseStage, inv: { wood: gameState.inventory.wood, stone: gameState.inventory.stone, coins: gameState.inventory.coins } };
    };
    // 🚧 __pos() / __tp(x,z) — 충돌·배치 검증용 위치 조회·텔레포트
    window.__pos = () => [Math.round(player.position.x * 100) / 100, Math.round(player.position.z * 100) / 100];
    window.__tp = (x, z) => { player.position.set(x, 0, z); snapCamera(); return window.__pos(); };
    // 🌾 __farmMax() — 텃밭을 밭으로 가득 채워 최악 상태를 재현(드로우콜 측정용). 로컬 전용.
    //   ⚠️ tryHoe 는 Math.round(x/2)*2 로 **짝수 세계좌표** 격자에만 밭을 만든다. FARM 도 (0,84) 로 짝수라
    //     오프셋이 홀수면 실제로는 생길 수 없는 배치가 되고 중복 검사(p.x === …)도 무의미해진다.
    //   half 인자는 PLOT_CAP(160) 재할당 분기를 실제로 밟아보기 위한 것 — __farmMax(14) 면 13×13=169칸.
    //   기본값은 실제 텃밭 크기라 드로우콜 측정은 인자 없이 부른다.
    window.__farmMax = (half = farmHalf()) => {
      const M = 2 * Math.floor((half - 1) / 2);   // 짝수 격자(farmCellMax 와 같은 규칙)
      for (let x = -M; x <= M; x += 2) for (let z = -M; z <= M; z += 2) {
        if (!plots.some(p => p.x === FARM.x + x && p.z === FARM.z + z)) createPlot(FARM.x + x, FARM.z + z, true);
      }
      for (const p of plots) { p.state = 'growing'; p.growth = 0.9; p.stage = -1; p.cropType = CROP_TYPES[Math.abs(p.x + p.z) & 3]; refreshCropStage(p); }
      syncFarmSoil(true); syncFarmCrops(true);
      return plots.length;
    };
    window.__gs = () => gameState; window.__plots = () => plots;   // 🌾 검수용 상태 열람(dev 세션 전용)
    window.__spawnWorkers = () => { spawnWorkers(); setWorkersVisible(atFarm); return workerObjs.length; };   // 🧑‍🌾 세이브 없이 일꾼 3D 재생성(드로우콜 측정용)
    // 🍎 과수원 검수용 — 해금·자리 채우기·비우기·드로우콜 측정(__spawnWorkers 와 같은 용도)
    window.__orchardOpen = () => { gameState.progress.advHarvest = Math.max(1, gameState.progress.advHarvest || 0); syncOrchardGateLock(); return '🍎 해금 — 마을 동쪽 ' + ORCHARD_GATE.x + ',' + ORCHARD_GATE.z + ' (__tp 로 이동)'; };
    window.__orchardFill = (fruit = 6) => {   // 자리 10개를 5종으로 꽉 채운다(최악 조건)
      gameState.orchard.trees = ORCHARD_SLOTS_LOCAL.map(([x, z], i) => ({
        x: ORCHARD.x + x, z: ORCHARD.z + z, kind: FRUITS[i % FRUITS.length].id,
        stage: 'mature', age: 9, watered: false, fruit,
      }));
      rebuildOrchard();
      return { trees: gameState.orchard.trees.length, calls: __perf().calls };   // __perf 가 컴포저까지 한 프레임 돌려 정확히 센다
    };
    window.__orchardDbg = () => {            // 🍎 진단 한 방 — 입구가 실제로 섰는지·어디 있는지·왜 안 열리는지
      const gate = scene.children.find(o => o.isGroup && o.position.distanceTo(ORCHARD_GATE) < 0.01);
      const p = player.position;
      return {
        gate위치: [ORCHARD_GATE.x, ORCHARD_GATE.z],
        입구세워짐: !!gate, 입구부품수: gate ? gate.children.length : 0, 입구보임: gate ? gate.visible : null,
        내위치: [Math.round(p.x * 10) / 10, Math.round(p.z * 10) / 10],
        문까지거리: Math.round(dist2D(p, ORCHARD_GATE) * 10) / 10,
        프롬프트반경: ORCHARD_PROMPT_R,
        잠김: mapLocked('orchard'), advHarvest: gameState.progress?.advHarvest,
        가로대보임: orchardGateBar ? orchardGateBar.visible : null,
        문충돌체켜짐: orchardGateSolid ? !orchardGateSolid.off : null,
        과수원안: atOrchard, 나무수: (gameState.orchard?.trees || []).length,
        드로우콜: __perf().calls,
      };
    };
    window.__orchardClear = () => { gameState.orchard.trees = []; rebuildOrchard(); return { trees: 0, calls: __perf().calls }; };
    window.__orchardCalls = () => __perf().calls;   // 블룸 컴포저 탓에 renderer.info 를 그냥 읽으면 마지막 패스(1)만 보인다
    window.__workSteps = (n = 1) => { const t = {}; workerSteps(n, t); return t; };   // 🧑‍🌾 오프라인 스텝 강제 실행(검수용 — 접속 중 60초 스텝과 같은 함수)
    window.__workers = () => workerObjs.map(o => ({ name: o.rec.name, job: o.rec.job, works: o.rec.works, phase: o.phase, t: +o.t.toFixed(2), task: o.task?.type || null, vis: o.group.visible, x: +o.group.position.x.toFixed(1), z: +o.group.position.z.toFixed(1) }));   // 🧑‍🌾 일꾼 상태 열람(검수용)
    // 🐾 펫 검수용 — 성장 단계 실루엣 비교(works 를 바꾸고 respawn)·맡기기 강제·상태 열람
    window.__pet = {
      give: (kind = 'leaf') => { gameState.pets[kind] = emptyPet(kind); usePet(kind); respawnPet(); return gameState.pet; },
      use: (kind) => { usePet(kind); respawnPet(); return gameState.pet; },
      owned: () => Object.keys(gameState.pets),
      //  🔁 세이브 왕복 검사 — pets(소유)와 pet(동행)이 **같은 객체**로 다시 물리는지 본다.
      //     JSON 을 거치면 참조가 끊긴다. 끊긴 채로 두면 일을 시켜도 소유 쪽 works 가 안 자라
      //     불러오기 직후 성장이 되돌아간 것처럼 보인다(usePet 머리주석).
      roundTrip: () => {
        const before = gameState.pet && { kind: gameState.pet.kind, works: gameState.pet.works };
        applySave(JSON.parse(JSON.stringify(getGameState())));
        respawnPet();
        return { before, after: gameState.pet && { kind: gameState.pet.kind, works: gameState.pet.works },
                 linked: !!gameState.pet && gameState.pet === gameState.pets[gameState.pet.kind],
                 owned: Object.keys(gameState.pets) };
      },
      works: (n) => { if (gameState.pet) gameState.pet.works = n; respawnPet(); return stageOf(gameState.pet?.works || 0); },
      respawn: respawnPet,
      cmd: commandPet,
      state: () => gameState.pet && { ...gameState.pet, stage: stageOf(gameState.pet.works), rest: Math.max(0, gameState.pet.restUntil - Date.now()) },
      job: () => petJob && { done: petJob.done, task: petJob.task?.type || null, i: petJob.task?.i ?? null },
      obj: () => pet3d && { vis: pet3d.visible, x: +pet3d.position.x.toFixed(2), z: +pet3d.position.z.toFixed(2) },
      box: () => pet3d && { pet: new THREE.Box3().setFromObject(pet3d).max.y, player: new THREE.Box3().setFromObject(player).max.y },   // 무릎 높이 실측
      world: () => petWorld(),
      remove: () => { if (pet3d) { scene.remove(pet3d); pet3d = null; } gameState.pets = {}; gameState.pet = null; return null; },
    };
    // 📜 의뢰 패널 검수용 — __gs().npcs 를 손으로 고친 뒤 이걸 부르면 패널·말풍선·지도가 같이 갱신된다
    window.__questPanel = () => { refreshCollectQuests(); npcObjs.forEach(updateNPCGlyph); refreshQuestPanel(); return npcObjs.map(questView).filter(Boolean); };
    window.__solids = () => colliders.map(c => c.r != null ? ['c', +c.x.toFixed(1), +c.z.toFixed(1), c.r] : ['b', +c.x1.toFixed(1), +c.z1.toFixed(1), +c.x2.toFixed(1), +c.z2.toFixed(1)]);   // 🚧 충돌체 목록 — 재빌드 뒤 고아 벽이 남았는지 세는 용(밭 증축 검수)
    window.__place = (id, x, z, rot = 0) => placeOutdoor(x, z, false, id, rot);
    window.__select = (id) => { if (pickedOutdoor) stopOutdoorPlacing(true); placingOutdoor = id; outdoorTarget.pinned = false; buildDecorGhost(id, true); return id; };   // 🏗️ 검수용 배치 모드 진입(작업대 메뉴 대신)
    window.__ghost = () => decorGhost ? { x: +decorGhost.position.x.toFixed(2), z: +decorGhost.position.z.toFixed(2), pinned: outdoorTarget.pinned, ok: ghostOk } : null;   // 🏗️ 검수용 시설·장식 즉시 배치(검사·비용 포함)
    window.__gates = { sit: situation, open: (c, i) => gateOpen(gateOf(c, i), situation()),
      blocked: trackGateBlocked };   // 📖 게이트 검수용 — trackGateBlocked 는 실제 발사 확인에 쓴다
    window.__habitat = { env: habitatEnvAt, ctx: habitatCtx, cells: habitatCells, src: habitatSources, dirty: markHabitatDirty,
      alive: () => visitors?.alive || [],                                   // 🦋 지금 떠 있는 종
      tick: (s) => { for (let i = 0; i < s * 60; i++) visitors?.update(1 / 60); return visitors?.alive || []; } };   // 시간을 앞당겨 스폰을 확인(검수용)
    window.__house = { enter: enterHouse, exit: exitHouse };   // 실내 검수용 즉시 입퇴장
    window.__mine = { enter: enterMine, exit: exitMine, ores: () => oreRocks.filter(r => !r.userData.depleted).map(r => [Math.round(r.position.x * 10) / 10, Math.round(r.position.z * 10) / 10, r.userData.ore.id]) };   // ⛏️ 채굴 검수용 즉시 입퇴장 + 광맥 좌표
    window.__perf = () => ({ calls: (() => { renderer.info.autoReset = false; renderer.info.reset(); composer.render(); const c = renderer.info.render.calls; renderer.info.autoReset = true; return c; })(), tris: renderer.info.render.triangles, geoms: renderer.info.memory.geometries, tex: renderer.info.memory.textures, dpr: renderer.getPixelRatio(), shadow: renderer.shadowMap.enabled, shadowAuto: renderer.shadowMap.autoUpdate, objs: (() => { let n = 0, v = 0; scene.traverse(o => { if (o.isMesh) { n++; if (o.visible) v++; } }); return [n, v]; })() });   // 성능 조사
    // 🌓 그림자·드로우콜 검수용 즉시 입퇴장 — __house·__mine 과 같은 패턴(마을 밖 공간 전부)
    window.__space = { farm: [enterFarm, exitFarm], cafe: [enterCafe, exitCafe], river: [enterRiver, exitRiver],
      mist: [enterMist, exitMist], sea: [enterSea, exitSea], house: [enterHouse, exitHouse], mine: [enterMine, exitMine],
      museum: [enterMuseum, exitMuseum] };
    // 🏛️ 전시 관람 검수용 — 진열장 앞까지 걸어가지 않고 바로 확대 화면을 띄운다(프레이밍 비교)
    window.__museumView = { open: openMuseumView, close: closeMuseumView, state: () => museumView && { ...museumView.frame, visible: museumView.group.visible, meshChildren: museumView.mesh.children.length, look: _camLook.toArray().map(v => +v.toFixed(2)), pos: museumView.group.position.toArray().map(v => +v.toFixed(2)), cam: camera.position.toArray().map(v => +v.toFixed(2)) }, items: () => museumFloorItems().map((it, i) => ({ i, ico: it.ico, name: it.name, cat: it.cat, id: it.id, has: !!gameState.dex[it.cat]?.[it.id] })) };
    window.__museumLight = MUSEUM_LIGHT;              // 🏛️ 전시실 조명 검수(값을 바꿔 보며 비교)
    window.__camIn = camOffsetIndoor;                 // 실내 카메라 각도 검수(값을 바꿔 보며 비교)
    window.__floor = () => interiorFloor;             // 실내 바닥 재질 검수
    window.__decor = (id, x, z, rot = 0) => placeDecor(id, INT.x + x, INT.z + z, true, rot, true);   // 가구 무료 배치(검수용)
    window.__goFloor = goFloor;                       // 🪜 실내 층 이동(검수용) — goFloor 는 모듈 지역 함수라 여기서만 노출
  }
  // 테스트: ?river=1 — 나루터(강 공간)에서 시작. ?time=0.8 과 조합하면 밤 물길 확인
  if (_wq.get('river') === '1') setTimeout(() => enterRiver(), 60);
  // 테스트: ?mist=1 — 안개 낀 숲에서 시작. ?weather=fog 와 조합하면 🌟황금 정령 확인
  if (_wq.get('mist') === '1') setTimeout(() => enterMist(), 60);
  if (_wq.get('sea') === '1') setTimeout(() => enterSea(), 60);   // 테스트: ?sea=1 — 바다터 바로 입장
  if (_wq.get('seadebug') === '1') window.__sea = { mg: seaMG, action: seaAction };   // 테스트: 상태 점검용(연출 검수)
  mode = 'play';
  movedOnce = false;
  startLogging();                      // [센서] 배치 전송 시작
  // [🎯 이탈 예측] dev 세션은 만들지 않는다 — 센서 샘플이 없어 윈도가 안 차고, API 로그도 더럽힌다
  if (!IS_DEV_SESSION) {
    try { initChurnPredictor(); } catch (e) { console.warn('[churn] init skipped', e); }
    try { initRetentionGuidance(); } catch (e) { console.warn('[retention-guidance] init skipped', e); }
  }
  setTimeout(announceMapOpens, 4000);   // 🧪 [베타 2차] 열린 맵 안내 — 시작 직후 코치·환영 배너와 겹치지 않게 4초 뒤
  startMetrics(() => ({                // [계측] 세션 요약(60초/이탈 시 upsert)용 스냅샷
    coins: gameState.inventory.coins || 0,
    place: indoor ? 'house' : atFarm ? 'farm' : atOrchard ? 'orchard' : atMine ? 'mine' : atCafe ? 'cafe' : atMuseum ? 'museum' : atRiver ? 'river' : atMist ? 'mist' : atSea ? 'sea' : 'village',
    x: player.position.x, z: player.position.z,
  }));
  const bonusModal = checkDailyBonus(); // [출석] 오늘 첫 접속이면 보상 지급(모달 표시 여부 반환)
  if (WEATHER !== 'clear') {            // [날씨] 궂은 날 안내 + 세션 태깅
    if (!bonusModal) ui.toast?.(WEATHER_MSG[WEATHER], 2800);   // 출석 모달에 이미 합쳐 안내했으면 생략
    if (RAIN_DAY) startRainSound();
    trackEvent('weather_day', { type: WEATHER }); // [GA4] 세션 요약 counts 에 자동 집계 → 날씨별 행동 비교
  }
  dexDiscover('weather', WEATHER);      // 🌦️ 날씨 도감 — 오늘 날씨를 겪어야 등록(재방문 훅)
  syncBadges();                         // 🏅 옛 세이브 소급 지급(집·체인·스트릭 등)
  syncStory(); storyBooted = true;      // 📖 메인 퀘스트 소급(조용히) — 이후부터는 축하 연출
  // 🏷️ 기존 유저 닉네임 소급 부여 — 리더보드에 오를 이름. 신규는 캐릭터 선택에서 직접 짓는다
  if (gameState.character && !gameState.nickname) {
    setNickname(genNickname(), 'auto');
    setTimeout(() => ui.toast?.(`🏷️ 당신의 이름: ${gameState.nickname} — ☰메뉴 > 캐릭터·이름에서 바꿀 수 있어요`, 4200), 5200);
  }
  resolveWeatherEvent();                // 🌡️ 날씨 이벤트 정산(동기) — 시든 작물은 밤손님 후보에서 빠짐
  resolveNightVisit();                  // 🦝 밤손님 — 밤이 지났으면 서버 판정(await 안 함, 실패해도 입장 안 막음)
  resolveFarmPests();                   // 🐛 고급 작물 해충 — 하루 1회, 비 온 다음 날 확률↑(서버 불필요)
  spawnWorkers();                       // 🧑‍🌾 고용한 일꾼 3D — 세이브 복원 뒤(밭 단계가 정해진 다음)
  catchUpWorkers();                     // 🧑‍🌾 오프라인 정산 — 월급 + 60초 스텝(최대 12시간) + 요약 모달
  respawnPet();                         // 🐾 펫 3D — 세이브 복원 뒤. ⚠️ 여기에 정산은 없다(펫은 오프라인에 아무것도 안 한다)
  if (SEVERE_TOMORROW) {                // 🔮 내일 궂은 날씨 예고 — 다른 안내와 안 겹치게 늦게
    const s = SEVERE_INFO[SEVERE_TOMORROW];
    setTimeout(() => ui.toast?.(`${s.ico} 내일 ${s.name} 예보! 오늘 수확하거나 작업대에서 🛡️ 덮개를 준비하세요`, 3600), 3000);
  }

  // 신규: 캐릭터(동물) 미선택이면 선택 화면 → 그 뒤 튜토리얼. 이미 선택했으면 튜토리얼만.
  if (!gameState.character) ui.showCharacterSelect?.();
  else if (!gameState.tutorialSeen) { gameState.tutorialSeen = true; ui.showTutorial?.(); }
}

function applySave(saved) {
  //  🛡️ loadGame() 의 판정 객체가 통째로 들어오는 사고 방어(옛 브랜치와 섞여 병합될 때).
  //    그 객체는 항상 truthy 라 `if (saved) applySave(saved)` 를 통과하고, 안의 필드는 죄다
  //    undefined 라 조용히 빈 마을이 된다 — 정확히 2026-09-14 사고의 형태다. 터뜨리지 말고 교정한다.
  if (saved && typeof saved === 'object' && 'canPlay' in saved) {
    console.error('[치명] applySave 에 loadGame() 결과가 통째로 들어왔다 — load.state 를 넘겨야 한다. 교정하고 진행');
    trackEvent('save_apply_misuse', { kind: String(saved.kind || 'unknown') });   // [GA4] 병합 사고 즉시 감지
    saved = saved.state;
  }
  if (!saved || typeof saved !== 'object') return;   // 빈 세이브를 덮어쓰지 않는다
  if (saved.inventory) Object.assign(gameState.inventory, saved.inventory);
  // 🎀 꾸미기 — 낯선 id·안 산 것의 장착을 걸러 낸다(세이브는 클라이언트 권위다)
  if (saved.cosmetics) gameState.cosmetics = sanitizeCosmetics(saved.cosmetics);
  // 🐾 펫 — saved 가 왔다는 것 자체가 읽기 성공이라는 뜻이므로, 필드가 없으면 신규가 맞다.
  //    (읽기 실패를 신규로 오인해 마을을 덮어쓴 사고는 js/save-guard.js 가 앞단에서 막는다)
  //    ⚠️ 낯선 kind 는 버린다 — 조형이 없으면 상점엔 뜨는데 안 그려지는 종이 생긴다.
  const cleanPet = (v) => (v && typeof v === 'object' && petKindOf(v.kind)) ? {
    kind: v.kind,
    name: typeof v.name === 'string' ? v.name : '',
    works: Number.isFinite(v.works) ? Math.max(0, Math.floor(v.works)) : 0,
    restUntil: Number.isFinite(v.restUntil) ? v.restUntil : 0,
  } : null;
  gameState.pets = {};
  if (saved.pets && typeof saved.pets === 'object') {
    for (const v of Object.values(saved.pets)) { const p = cleanPet(v); if (p) gameState.pets[p.kind] = p; }
  }
  //    ⬆️ 옛 세이브 — pets 가 없던 시절엔 pet 한 마리가 전부였다. 그 한 마리를 소유 목록으로 옮긴다.
  const activeSaved = cleanPet(saved.pet);
  if (activeSaved && !gameState.pets[activeSaved.kind]) gameState.pets[activeSaved.kind] = activeSaved;
  //    ⚠️ JSON 왕복에서 pet↔pets[kind] 참조가 끊긴다 — 반드시 usePet 으로 **다시 물린다**.
  //    ⚠️ pets 가 있는(= 새 포맷) 세이브에서 pet 이 null 이면 **일부러** 아무도 안 데리고 나간 것이다.
  //       무조건 첫 종을 꺼내면 그 상태가 왕복에서 사라진다. 옛 세이브에서만 한 마리를 꺼낸다.
  const hadPetsField = !!(saved.pets && typeof saved.pets === 'object');
  usePet(activeSaved ? activeSaved.kind : (hadPetsField ? null : Object.keys(gameState.pets)[0] || null));
  if (typeof saved.timeOfDay === 'number') timeOfDay = saved.timeOfDay; // 시간대 복원
  if (saved.tutorialSeen) gameState.tutorialSeen = true;                 // 튜토리얼 이미 봄
  if (saved.guideNudgeSeen) gameState.guideNudgeSeen = true;             // 📖 안내서 배너 이미 봄
  if (saved.house && saved.house.stored && typeof saved.house.stored === 'object') {   // 🧺 창고 복원(개수만, 음수·비숫자 버림)
    gameState.house.stored = {};
    for (const [k, v] of Object.entries(saved.house.stored)) if (DECOR.some(d => d.id === k) && Number.isFinite(v) && v > 0) gameState.house.stored[k] = Math.floor(v);
  }
  if (saved.house && Array.isArray(saved.house.addons))                  // 🧩 구성품 복원(카탈로그에 있는 id 만, 중복 제거) — 집 복원(buildHouseStage) 전에
    gameState.house.addons = [...new Set(saved.house.addons.filter(id => HOUSE_ADDONS.some(a => a.id === id)))];
  if (saved.house && saved.house.bedGiven) gameState.house.bedGiven = true;   // 🛏️ 기본 침대를 이미 받았는지(두 번 주지 않게)
  if (saved.house && Array.isArray(saved.house.grantedDecor))                // 🏖️ 승계 가구를 이미 줬는지(옮기거나 창고에 넣어도 다시 안 주게)
    gameState.house.grantedDecor = [...new Set(saved.house.grantedDecor.filter(id => typeof id === 'string'))];
  if (saved.farm && Number.isFinite(saved.farm.stage)) {                     // 🌾 밭 단계 복원 — 밭(plots) 복원보다 먼저 울타리를 맞춘다. 없으면 1단계
    gameState.farm.stage = Math.max(1, Math.min(MAX_FARM_STAGE, Math.floor(saved.farm.stage)));
    if (gameState.farm.stage > 1) rebuildFarm(true);
  }
  if (saved.farm) {   // 🌾 고른 씨앗·해충 정산일 — 없는 값(옛 세이브)은 기본값 유지
    if (['basic', 'wheat', 'corn', 'grape'].includes(saved.farm.seedSel)) gameState.farm.seedSel = saved.farm.seedSel;
    if (typeof saved.farm.pestDate === 'string') gameState.farm.pestDate = saved.farm.pestDate;
    if (saved.farm.storage && typeof saved.farm.storage === 'object') for (const k of STORAGE_KEYS) gameState.farm.storage[k] = Math.max(0, Math.floor(saved.farm.storage[k] || 0));   // 🧺 창고(품목 목록은 js/farm-building.js)
    if (typeof saved.farm.compostDate === 'string') { gameState.farm.compostDate = saved.farm.compostDate; gameState.farm.compostN = Math.max(0, Math.floor(saved.farm.compostN || 0)); }
    if (saved.farm.pending && typeof saved.farm.pending === 'object') for (const k of STORAGE_KEYS) gameState.farm.pending[k] = Math.max(0, Math.floor(saved.farm.pending[k] || 0));   // 📦 아직 창고로 안 옮긴 더미
    gameState.farm.lastSettleAt = Math.max(0, Math.floor(saved.farm.lastSettleAt || 0));
    if (typeof saved.farm.wageDate === 'string') gameState.farm.wageDate = saved.farm.wageDate;
    if (typeof saved.farm.hireDate === 'string') { gameState.farm.hireDate = saved.farm.hireDate; gameState.farm.hireTaken = Array.isArray(saved.farm.hireTaken) ? saved.farm.hireTaken.filter(n => Number.isInteger(n)) : []; }
    syncSeedToolIcon();
  }
  if (saved.orchard) {   // 🍎 과수원 나무 복원 — 모르는 종류·상한 초과·음수 열매는 걸러낸다(옛/조작 세이브 방어)
    if (Array.isArray(saved.orchard.trees)) {
      gameState.orchard.trees = saved.orchard.trees
        .filter(t => t && FRUITS.some(f => f.id === t.kind))       // null/undefined 항목·모르는 종류는 버린다
        .slice(0, TREE_SLOTS)                                       // 상한 방어
        .map(t => ({ x: t.x, z: t.z, kind: t.kind, stage: t.stage || 'sapling',
                     age: t.age || 0, watered: !!t.watered, fruit: Math.max(0, t.fruit || 0) }));
    }
    if (FRUITS.some(f => f.id === saved.orchard.sapSel)) gameState.orchard.sapSel = saved.orchard.sapSel;
    if (typeof saved.orchard.settleDate === 'string') gameState.orchard.settleDate = saved.orchard.settleDate;
  }
  if (saved.progress && typeof saved.progress.advHarvest === 'number') {   // 🔒 과수원 해금 카운터 복원
    gameState.progress.advHarvest = Math.max(0, Math.floor(saved.progress.advHarvest));
  }
  syncOrchardGateLock();   // 🔒 복원된 진행도로 가로대를 다시 계산 — 입구를 세울 땐 progress 가 아직 기본값 0 이라 항상 잠긴 것으로 보인다
  // 🍎 복원된 나무를 그린다. buildWorld() 의 rebuildOrchard() 는 **로그인 전**이라 나무 목록이
  //    항상 비어 있었다 — 그 뒤 여기서 trees 를 채워 놓고 다시 그리지 않으면, 같은 날 새로고침한
  //    유저의 과수원이 통째로 빈 언덕으로 보인다(나무 안 보임 · 몸 충돌체 없음 · 자리는 "심을 수 있는 흙"
  //    으로 그려지는데 orchardSlotNear() 는 이미 찼다며 거부 → "내 과수원이 날아갔다").
  //    settleOrchard() 의 rebuildOrchard() 는 날짜 게이트(settleDate === today)에 막혀 안 돈다.
  //    밭이 바로 위에서 rebuildFarm(true) 로 복원하는 것과 같은 자리·같은 이유다.
  rebuildOrchard();
  if (Array.isArray(saved.workers)) {   // 🧑‍🌾 일꾼 — 직군·등급은 표 밖 값을 받지 않는다(옛/조작 세이브 방어)
    gameState.workers = saved.workers.filter(w => w && typeof w.id === 'string' && JOBS.some(j => j.id === w.job)).slice(0, 6).map(w => ({
      id: w.id, job: w.job, name: String(w.name || '일꾼').slice(0, 12),
      works: Math.max(0, Math.floor(w.works || 0)), grade: gradeOf(Math.max(0, Math.floor(w.works || 0))),   // 등급은 누적 횟수에서 다시 계산
      hiredAt: Math.max(0, Math.floor(w.hiredAt || 0)), restingSince: Math.max(0, Math.floor(w.restingSince || 0)),
    }));
  }
  if (saved.house && Array.isArray(saved.house.decor)) {                 // 실내 가구 복원
    gameState.house.decor = [];
    // ⚠️ f 부재(옛 세이브)는 1층으로 읽는다 — house 부재(저장 없음)와 절대 섞지 않는다.
    saved.house.decor.forEach(d => placeDecor(d.id, INT.x + d.x, INT.z + d.z, true, d.rot || 0, false,
                                              normalizeFloor(d.f, saved.houseStage || 0)));
  }
  if (saved.npcs) gameState.npcs = { ...gameState.npcs, ...saved.npcs }; // NPC 퀘스트 복원
  if (saved.daily) gameState.daily = { ...gameState.daily, ...saved.daily }; // 출석 스트릭 복원
  if (saved.noticeSeenId) gameState.noticeSeenId = Number(saved.noticeSeenId) || 0; // 📮 읽은 소식 복원
  if (saved.dex) {
    // ⚠️ 기본 객체(gameState 선언부)와 **반드시 같은 키 목록**이어야 한다. 한쪽만 고치면
    //    세이브가 있는 유저에게 그 카테고리가 undefined 가 되고, dexDiscover 첫 줄에서 조용히 반환해 등록이 안 된다.
    gameState.dex = { fish: {}, crop: {}, ore: {}, cook: {}, npc: {}, weather: {}, bug: {}, forage: {}, track: {}, river: {}, spirit: {}, dig: {}, visitor: {}, ...saved.dex }; // 📖 도감 복원
    refreshMuseumGate();   // 🏛️ 열어 둔 층만큼 건물을 세운다 — 안 하면 접속할 때마다 1층으로 보인다
  }
  if (saved.night) {
    gameState.night = { lastDate: null, traces: [], duelDate: null, duelDone: [], ...saved.night,
                        truce: { boar: null, raccoon: null, ...(saved.night.truce || {}) } };
  } // 🦝 밤손님 판정일·미조사 흔적·🤝 발길 끊기 복원(truce 는 중첩 객체라 전개만으로는 안 채워진다)
  if (saved.beta) gameState.beta = { tries: {}, ...saved.beta };   // 🧪 관대 판정 카운터 복원
  gameState.difficulty = mergeDifficulty(saved.difficulty);   // 🎚️ 난이도 상태 복원 — 필드가 없는 옛 세이브는 기본값으로 뜬다
  if (saved.frost) gameState.frost = { coveredFor: null, lastDate: null, ...saved.frost }; // 🌡️ 날씨 이벤트 상태 복원
  if (saved.boat) gameState.boat = { ...gameState.boat, ...saved.boat, up: { oar: 0, hull: 0, lamp: 0, ...(saved.boat.up || {}) } }; // 🛶 나룻배 횟수·기록·업그레이드 복원
  if (saved.mist) gameState.mist = { ...gameState.mist, ...saved.mist };  // 🌫️ 안개 숲 정화 상태 복원
  if (saved.sea) gameState.sea = { ...gameState.sea, ...saved.sea };      // 🌊 바다터(오늘의 대어) 복원
  //   🏛️ 최고 무게·조건부 전시는 세이브를 믿지 않고 정제한다(모르는 어종·깨진 값은 버린다). 필드가 없는 옛 세이브는 빈 값.
  gameState.sea.best = sanitizeBest(saved.sea?.best, SEA_SPECIES.map(sp => sp.id));
  gameState.museum = { special: sanitizeSpecial(saved.museum?.special) };
  if (saved.kitchen) gameState.kitchen = { cooked: saved.kitchen.cooked || 0, best: { ...(saved.kitchen.best || {}) }, tiers: { ...(saved.kitchen.tiers || {}) } }; // 🍳 자유주방 기록 복원
  // 🍱 찬장 복원 — 세이브가 손상되거나 레시피/등급이 개편으로 사라졌으면 그 칸만 버린다(전체를 날리지 않게)
  //   등급은 저장하지 않고 score 로 다시 계산한다 — 두 벌로 들고 있으면 등급 컷을 손볼 때 어긋난다
  if (Array.isArray(saved.pantry)) {
    gameState.pantry = saved.pantry
      .filter(f => f && RECIPES.some(r => r.id === f.id) && Number.isFinite(+f.score))
      .slice(0, PANTRY_MAX)
      .map(f => ({ id: f.id, score: Math.max(0, Math.min(100, Math.round(+f.score) || 0)) }));
  }
  if (saved.workshop) gameState.workshop = { carved: saved.workshop.carved || 0, carvedToday: saved.workshop.carvedToday || 0, best: { ...(saved.workshop.best || {}) }, tiers: { ...(saved.workshop.tiers || {}) }, date: saved.workshop.date || null, done: [...(saved.workshop.done || [])] }; // 🗿 조각 공방 기록 복원
  if (saved.story) gameState.story = { ch: 0, q: 0, started: {}, ...saved.story }; // 📖 메인 퀘스트 진행 복원
  if (saved.nickname) gameState.nickname = saved.nickname;                          // 🏷️ 닉네임 복원
  else if (saved.npcs) gameState.story.q = Object.values(gameState.npcs).reduce((a, n) => a + (n.idx || 0), 0); // 옛 세이브: 의뢰 수 소급 추정
  if (saved.badges) gameState.badges = { ...saved.badges };              // 🏅 배지 복원
  if (saved.coop) { gameState.coop = { ...gameState.coop, ...saved.coop }; if (gameState.coop.built) buildCoop(true); } // 🐔 닭장 복원
  if (saved.cafe) { gameState.cafe = { ...gameState.cafe, ...saved.cafe }; refreshCafeGuests(); } // ☕ 카페 진행(오늘 서빙한 손님) 복원
  // 🔨 도면·금빛 도구 — 아래 upgrades 복원이 손에 든 도구를 다시 만들기(refreshHeldTool) **전에** 채워야 금빛으로 나온다
  gameState.blueprints = sanitizeToolFlags(saved.blueprints);
  gameState.tier2 = sanitizeToolFlags(saved.tier2);
  if (saved.upgrades) {
    gameState.upgrades = { ...gameState.upgrades, ...saved.upgrades }; // 도구 업그레이드 복원
    // 🪓 ⚠️ buildPlayer() → setHeldTool() 은 bootWorld 안에서 이미 돌았다(세이브를 읽기 전).
    //    그때는 upgrades 가 비어 있어 0단계로 만들어진다 — 여기서 다시 만들지 않으면
    //    "이미 산 사람은 접속할 때마다 옛 모습" 이 되어, 이 기능이 구매한 그 세션에서만 동작한다.
    refreshHeldTool();
    updateHouseSign();   // 🔨 묵직한 망치를 산 뒤 아직 한 단계도 안 지었으면 건축 루프가 0바퀴라 간판이 옛 숫자로 남는다
  }
  if (Array.isArray(saved.outdoor)) saved.outdoor.forEach(o => placeOutdoor(o.x, o.z, true, o.id, o.rot || 0)); // 야외 장식 복원(방향 포함)
  // 🔥 화덕에 걸어 둔 것 — 세이브를 믿지 않고 정제한다(표에 없는 품목·깨진 날짜는 버린다).
  //    필드가 없는 옛 세이브도 빈 배열로 떨어질 뿐, 신규로 오인해 덮어쓰지 않는다.
  gameState.craft.slots = sanitizeSlots(saved.craft?.slots);
  gameState.craft.noticedDay = typeof saved.craft?.noticedDay === 'string' ? saved.craft.noticedDay : null;
  if (saved.outdoorStored && typeof saved.outdoorStored === 'object') {   // 🧺 보관한 야외 장식 복원(개수만, 음수·비숫자 버림)
    gameState.outdoorStored = {};
    for (const [k, v] of Object.entries(saved.outdoorStored)) if (OUTDOOR.some(d => d.id === k) && Number.isFinite(v) && v > 0) gameState.outdoorStored[k] = Math.floor(v);
  }
  if (saved.gifts) gameState.gifts = { ...saved.gifts };             // 보유 선물 복원
  if (saved.affinity) gameState.affinity = { ...saved.affinity };    // 친밀도 복원
  // 💬 대화 횟수 복원 — 날짜가 오늘이 아니면 버린다(어제 소진이 오늘까지 남지 않게).
  //    ⚠️ 없으면 기본값 그대로 둔다. 옛 세이브에 이 필드가 없다고 새 세이브로 취급하면 안 된다.
  if (saved.talk && typeof saved.talk === 'object') {
    gameState.talk = saved.talk.date === todayStr()
      ? { date: saved.talk.date, used: { ...(saved.talk.used || {}) } }
      : { date: todayStr(), used: {} };
  }
  if (saved.hintsSeen) gameState.hintsSeen = { ...saved.hintsSeen }; // 안내 표시 이력 복원
  if (saved.character) { gameState.character = saved.character; applyCharacter(saved.character); } // 캐릭터 복원
  if (saved.houseStyle) { gameState.houseStyle = { ...gameState.houseStyle, ...saved.houseStyle }; applyHouseStyle(); } // 집 외관 복원
  if (saved.unlocked) { for (const p of ['roof', 'wall', 'door']) if (Array.isArray(saved.unlocked[p])) gameState.unlocked[p] = [...new Set([0, ...saved.unlocked[p]])]; } // 획득 색 복원
  if (typeof saved.houseStage === 'number') {
    for (let s = 1; s <= saved.houseStage; s++) buildHouseStage(s, true); // 조용히 복원
  }
  if (Array.isArray(saved.plots)) {
    saved.plots.forEach(p => {
      if (dist2D({ x: p.x, z: p.z }, INT) < 6) return; // 실내에 잘못 생긴 밭 제거
      const plot = createPlot(p.x, p.z, true);
      plot.state = p.state; plot.growth = p.growth || 0; plot.stage = -1;
      if (p.state === 'growing' || p.state === 'mature') {
        // 저장된 작물 종류 복원 — 없으면(옛 세이브) 랜덤. 밤손님이 "뭘 훔쳐갔는지" 말하려면 종류가 보존돼야 한다
        plot.cropType = CROP_TYPES.find(c => c.id === p.crop) || BASIC_CROPS[Math.floor(Math.random() * BASIC_CROPS.length)];
        plot.fert = !!p.fert; plot.weed = !!p.weed; plot.pest = !!p.pest;   // 🌾 고급 작물 공정 상태(기존 작물은 전부 false)
        refreshCropStage(plot);   // growth에 맞는 단계 메시 복원
      }
      updatePlotVisual(plot);
    });
    syncFarmSoil(true);    // 🌾 복원된 밭을 인스턴스 버퍼에 반영
    syncFarmCrops(true);   // 🌱 복원된 작물을 인스턴스 버퍼에 반영
  }
}

export function getGameState() {
  gameState.playerPos = { x: player.position.x, z: player.position.z };
  gameState.plots = plots.map(p => ({ x: p.x, z: p.z, state: p.state, growth: p.growth, crop: p.cropType?.id,   // crop: 밤손님 판정·복원용 작물 종류
    ...(p.fert ? { fert: 1 } : {}), ...(p.weed ? { weed: 1 } : {}), ...(p.pest ? { pest: 1 } : {}) }));   // 🌾 고급 작물 공정 — 켜진 것만 기록(옛 스키마와 호환), claimedBy 는 런타임 전용
  gameState.timeOfDay = timeOfDay;   // 시간대 저장
  // 🍎 tree.hp 는 런타임 전용(반쯤 팬 밭의 digAt 과 같은 취급) — plots 처럼 별도 사본이 없으니
  //   저장용 스냅샷에서만 걸러낸다. gameState.orchard.trees 자체를 바꾸면 진행 중인 도끼질 타수가
  //   저장할 때마다 사라지므로, 살아 있는 배열은 그대로 두고 반환값만 사본을 준다.
  return { ...gameState, orchard: { ...gameState.orchard, trees: (gameState.orchard?.trees || []).map(({ hp, ...rest }) => rest) } };
}
//  🔌 저장이 실패하면 스스로 다시 시도한다 — 읽기 실패와 같은 backoff(js/save-guard.js).
//    딸꾹질이면 조용히 낫는다. 낫지 않으면(세션 만료·RLS 사고) 화면을 덮어 알린다:
//    저장이 죽은 채로 계속 놀게 두면 그 시간이 통째로 날아가기 때문이다(입장 때 지키는 빗장의 뒷면).
let saveRetrying = false;
export async function requestSave() {
  //  🔌 세션이 죽었다 — 빗장은 새로고침 전엔 안 풀린다. 더 두드려 봐야 서버도 GA4 도 때릴 뿐이다.
  if (authState.lost) { ui.setSaveStuck?.(true); return { ok: false, locked: true }; }
  //  재시도가 도는 동안엔 새 쓰기를 내보내지 않는다. 불안정한 네트워크에서 두 요청이 역순으로
  //  도착하면 **오래된 스냅샷이 새 스냅샷을 덮는다** — 이 저장소가 두 번 겪은 사고의 모양이다.
  if (saveRetrying) return { ok: false, retrying: true };
  const r = await saveGame(getGameState());
  if (r.ok) { ui.setSaveStuck?.(false); return r; }
  retrySaveUntilOk().catch(() => {});   // 기다리지 않는다 — 호출부는 저장을 기다리며 멈출 이유가 없다
  return r;
}

async function retrySaveUntilOk() {
  if (saveRetrying) return;    // 재시도는 한 줄기만. 액션마다 루프가 늘면 서버를 때린다
  saveRetrying = true;
  //  ⚠️ finally 가 없으면 trackEvent·DOM 이 한 번 던졌을 때 깃발이 선 채로 굳어
  //     이후 모든 저장 실패가 재시도 없이 버려진다(= 고치기 전의 조용한 실패로 되돌아간다).
  try {
    for (let tries = 0; ; tries++) {
      if (authState.lost) { ui.setSaveStuck?.(true); return; }   // 스스로 낫지 않는다 — 출구는 새로고침뿐
      // [GA4] 저장이 끊긴 사람을 셀 분모. 매번 보내면 한 세션이 지표를 삼키므로 1회차 + 매 10회차만.
      if (tries === 0 || (tries + 1) % 10 === 0) trackEvent('save_failed', { attempt: tries + 1 });
      if (offerReload(tries)) ui.setSaveStuck?.(true);   // 오래 끌면 "다시 들어가기" — 유일한 출구
      await new Promise(r => setTimeout(r, retryDelay(tries)));
      if ((await saveGame(getGameState())).ok) {
        ui.setSaveStuck?.(false);
        trackEvent('save_recovered', { tries: tries + 1 });   // [GA4] 몇 번 만에 되살아났나
        return;
      }
    }
  } finally { saveRetrying = false; }
}

// =============================================================
//  렌더러 / 씬 / 조명
// =============================================================
function initRenderer() {
  // 모바일은 안티앨리어싱 off + 픽셀비율 상한을 낮춰 GPU 부담 감소
  renderer = new THREE.WebGLRenderer({ antialias: !IS_MOBILE, powerPreference: 'high-performance', preserveDrawingBuffer: true }); // preserveDrawingBuffer: 사진 캡처용
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, IS_MOBILE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = IS_MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  document.getElementById('app').appendChild(renderer.domElement);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(PAL.sky);
  scene.fog = new THREE.Fog(PAL.sky, 18, 74); // 옅고 넓게 퍼지는 거리 안개(부드러운 거리감)

  camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 14, 16);
  camera.lookAt(0, 0, 0);
}

function initLights() {
  hemiLight = new THREE.HemisphereLight(0xffffff, 0xbfe8c9, 0.9);
  scene.add(hemiLight);
  ambient = new THREE.AmbientLight(0xfff0dd, 0.25);
  scene.add(ambient);

  sunLight = new THREE.DirectionalLight(0xffe9c4, 1.1);
  sunLight.position.set(10, 18, 8);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(IS_MOBILE ? 1024 : 2048, IS_MOBILE ? 1024 : 2048); // 모바일 그림자 해상도 ↓
  sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 60;
  // 그림자 상자는 40m — 화면에 드는 범위는 다 담기고, 밖의 소품은 그림자 패스에서 빠진다(드로우콜 ↓).
  // 같은 2048 맵을 60m 대신 40m 에 쓰므로 그림자 윤곽도 더 또렷해진다.
  sunLight.shadow.camera.left = -20; sunLight.shadow.camera.right = 20;
  sunLight.shadow.camera.top = 20; sunLight.shadow.camera.bottom = -20;
  sunLight.shadow.bias = -0.0005; sunLight.shadow.radius = 6;
  scene.add(sunLight); scene.add(sunLight.target);
}

// 🌓 섀도맵 갱신 스위치 — 마을 밖 인스턴스 공간에서는 보이는 그림자가 없는데도 마을 캐스터
//   180여 개가 매 프레임 섀도맵에 계속 렌더된다. 그 공간에 있는 동안 갱신을 멈추면 화면은
//   그대로인 채 그림자 패스가 빠진다(실측 2026-09-12: 실내 −132~153콜 · 동굴 −184~205콜 ·
//   텃밭 −132~154콜, 태양 각도 5개 전부에서 바뀐 픽셀 0 — 같은 절차로 마을은 5~44% 가
//   틀어지는 대조군 조건에서). 어떤 공간이 해당되는지와 그 근거(기하 5곳 + 실측 예외인
//   실내·텃밭)는 js/shadow-scope.js 참고.
//   ⚠️ shadowMap.enabled 를 끄면 머티리얼 셰이더가 전부 재컴파일돼 진입할 때 프레임이 튄다.
//   autoUpdate 만 끊으면 셰이더는 그대로 두고 그림자 패스만 건너뛴다.
function setShadowActive(on) {
  if (!renderer) return;                             // 부팅 전(어트랙트 씬 준비 중) 호출 방어
  if (renderer.shadowMap.autoUpdate === on) return;
  renderer.shadowMap.autoUpdate = on;
  if (on) renderer.shadowMap.needsUpdate = true;     // 마을로 돌아오면 그 프레임에 한 번 갱신
}

// 현재 공간 플래그 묶음 — updateDayNight 가 매 프레임 부르므로 객체를 재사용한다(프레임당 할당 0).
const _spaceFlags = { indoor: false, atFarm: false, atMine: false, atCafe: false, atRiver: false, atMist: false, atSea: false, atMuseum: false, atOrchard: false };
function spaceFlags() {
  _spaceFlags.indoor = indoor; _spaceFlags.atFarm = atFarm; _spaceFlags.atMine = atMine;
  _spaceFlags.atCafe = atCafe; _spaceFlags.atRiver = atRiver; _spaceFlags.atMist = atMist;
  _spaceFlags.atSea = atSea; _spaceFlags.atMuseum = atMuseum; _spaceFlags.atOrchard = atOrchard;
  return _spaceFlags;
}

function clayMat(color, flat = true) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0.0, flatShading: flat });
}

// -------------------------------------------------------------
//  정적 소품용 공유 리소스 / 지오메트리 합치기 (드로우콜 절감)
//  ------------------------------------------------------------
//  같은 모양·같은 색 소품이 수십 개씩 생기는데(나무 40그루, 풀 80포기)
//  전부 제 지오메트리·제 재질을 들고 있어 GPU 상태 전환이 그 수만큼 났다.
//  ⚠️ 개별적으로 dispose 하는 오브젝트에는 쓰지 말 것 —
//     공유 자원이 함께 해제돼 다른 소품이 사라진다.
// -------------------------------------------------------------
const _shared = new Map();
function shared(key, make) {
  let v = _shared.get(key);
  if (v === undefined) { v = make(); _shared.set(key, v); }
  return v;
}

// 여러 지오메트리를 위치·법선·uv 만 남겨 하나로 합침(인덱스는 풀어서 붙인다)
// 색을 정점에 실어 둔다 — mergeGeos 가 color 속성을 합치므로 색이 달라도 한 재질로 묶인다.
//   재질을 색마다 만들면 그 수가 곧 드로우콜이다(🏛️전시물 13종에서 쓴 수법).
function paintGeo(geo, hex) {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}
const vtxMat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: true });

function mergeGeos(geos) {
  const flat = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) {   // color — 정점색을 쓰면 색이 달라도 한 재질로 합쳐진다(🏛️전시물)
    if (!flat[0].attributes[name]) continue;
    const size = flat[0].attributes[name].itemSize;
    let total = 0;
    for (const g of flat) total += g.attributes[name].count;
    const arr = new Float32Array(total * size);
    let off = 0;
    for (const g of flat) { arr.set(g.attributes[name].array, off); off += g.attributes[name].count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  return out;
}

// 테이퍼 튜브 — 곡선(pts)을 따라 관을 뽑되 굵기를 radiusFn(t∈0..1)로 바꿈(끝으로 갈수록 가늘게).
// 구를 이어 붙이던 꼬리가 💩처럼 보인다는 피드백 → 마디 없는 한 덩어리로. colorFn 이 있으면 정점색(🦊 흰 꼬리끝).
// 반환: { geo, end } · end 는 곡선 끝점(둥근 캡을 얹는 자리)
function taperedTube(pts, radiusFn, colorFn = null, segs = 32, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], col = [], idx = [];
  const c = new THREE.Color();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, P = curve.getPointAt(t), r = radiusFn(t);
    const N = frames.normals[i], B = frames.binormals[i];
    if (colorFn) c.copy(colorFn(t));
    for (let j = 0; j <= radial; j++) {
      const a = j / radial * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a);
      const nx = cx * N.x + sy * B.x, ny = cx * N.y + sy * B.y, nz = cx * N.z + sy * B.z;
      pos.push(P.x + r * nx, P.y + r * ny, P.z + r * nz); nor.push(nx, ny, nz);
      if (colorFn) col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (colorFn) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return { geo, end: curve.getPointAt(1) };
}

// =============================================================
//  월드 구성
// =============================================================
let worldGround = null, worldGroundPatches = null;   // 🥊 대결 무대가 남길 땅(duelKeep)
function buildWorld() {
  const groundGeo = new THREE.CircleGeometry(60, 64);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, clayMat(PAL.ground, false));
  ground.receiveShadow = true;
  scene.add(ground);
  worldGround = ground;

  // 바닥 얼룩 — 한 번 깔면 끝까지 안 건드리는 정적 소품이라 지오메트리 하나로 합쳐 1드로우콜로
  const patchGeos = [];
  for (let i = 0; i < 40; i++) {
    const r = 6 + Math.random() * 26, a = Math.random() * Math.PI * 2;
    if (dist2D({ x: Math.cos(a) * r, z: Math.sin(a) * r }, SEA_COVE) < SEA_COVE.r + 1) continue;  // 🌊 후미 물 위 제외
    patchGeos.push(new THREE.CircleGeometry(1 + Math.random() * 2.5, 12)
      .rotateX(-Math.PI / 2).translate(Math.cos(a) * r, 0.01, Math.sin(a) * r));
  }
  if (patchGeos.length) {
    const patches = new THREE.Mesh(mergeGeos(patchGeos), clayMat(PAL.groundDark, false));
    patches.receiveShadow = true;
    scene.add(patches);
    worldGroundPatches = patches;
  }

  for (let i = 0; i < 14; i++) {
    let x, z, ok = false;
    for (let tries = 0; tries < 60 && !ok; tries++) { // 호수·집터·시설 위에 안 생기게 재시도
      const r = 8 + Math.random() * 22, a = Math.random() * Math.PI * 2;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      ok = !(dist2D({ x, z }, LAKE) < LAKE_R + 2.5 || dist2D({ x, z }, HOUSE_POS) < 4.6 || dist2D({ x, z }, BENCH) < 2.5 || dist2D({ x, z }, KITCHEN) < 3 || dist2D({ x, z }, SHOP) < 2.5 || dist2D({ x, z }, FARM_GATE) < 2.5 || dist2D({ x, z }, MINE_GATE) < 2.5 || dist2D({ x, z }, COOP) < 6 || dist2D({ x, z }, GLADE) < GLADE_R + 1 || dist2D({ x, z }, CAFE_GATE) < 5.5 || dist2D({ x, z }, FOREST) < FOREST_R + 1
      || dist2D({ x, z }, DOCK_POND) < DOCK_POND_R + 2 || dist2D({ x, z }, DOCK_GATE) < 4   // 🛶 나루터 연못·데크 위엔 나무 금지
      || dist2D({ x, z }, MIST_GATE) < 5   // 🌫️ 안개 숲 입구 앞은 비워둠(자체 고목 연출이 있음)
      || dist2D({ x, z }, SHOP_POS) < 4   // 🏪 꾸미기 가게 — 반치수 2.56 + 걸어다닐 틈. 없으면 나무가 가게 안에 박힌다
      || dist2D({ x, z }, SEA_GATE) < 4.5  // 🌊 바다터 포구(등대·방파제)가 나무에 가리지 않게
      || dist2D({ x, z }, SEA_COVE) < SEA_COVE.r + 1.5   // 🌊 포구 후미(바닷물) 위엔 나무 금지
      || dist2D({ x, z }, MUSEUM_GATE) < 5.5   // 🏛️ 박물관 — 정면 아치 입구가 나무에 가리지 않게
      || dist2D({ x, z }, { x: MUSEUM_GATE.x, z: MUSEUM_GATE.z + 5 }) < 3.5   //    계단 앞 진입로도 틔운다
      || dist2D({ x, z }, ORCHARD_GATE) < 5   // 🍎 과수원 문 앞은 비워 둔다
      || dist2D({ x, z }, { x: ORCHARD_GATE.x, z: ORCHARD_GATE.z - 4 }) < 6.5   //    온실 몸통(북쪽으로 뻗음)에 나무가 박히지 않게
      || dist2D({ x, z }, RANK) < 3.5   // 🏆 랭킹 게시판이 나무에 가리지 않게
      || dist2D({ x, z }, MARKET) < 2.5 // 📊 시세판도(새 자리는 호숫가 잔디라 나무 링 안)
      || PARK_BENCHES.some(([bx, bz]) => dist2D({ x, z }, { x: bx, z: bz }) < 3)   // 공원 벤치가 나무에 가리지 않게
      || NPCS.some(n => dist2D({ x, z }, { x: n.pos[0], z: n.pos[2] }) < 2.6));    // 주민 자리에 나무가 박혀 갇히지 않게
    }
    if (ok) spawnTree(x, z);   // 빈 자리를 못 찾으면 그 나무는 생략 — 시설을 가리며 억지로 심지 않는다
  }

  spawnWorkbench();   // 작업대(도구·장식·선물)
  spawnKitchen();     // 🍳 자유주방(요리 미니게임)
  spawnShop();        // 상점 좌판
  spawnRankBoard();   // 🏆 랭킹 게시판(리더보드)
  spawnMarketBoard(); // 📊 시세 전광판(상점 옆)
  spawnFarmGate();    // 텃밭 입구 게이트
  rebuildFarm(true);  // 개인 텃밭 필드(1단계) — 세이브에 단계가 있으면 applySave 가 다시 짓는다
  buildFarmInstances();   // 🌾 밭 흙 인스턴스 버퍼
  spawnMineGate();    // 채굴 동굴 입구
  buildMine();        // 채굴 동굴
  spawnSeaGate();     // 🌊 바다터 포구(마을 북동)
  buildSea();         // 🌊 바다 인스턴스(부두+대형 낚시)
  rebuildOrchard();   // 🍎 과수원 언덕(지형·시냇물·나무)

  // 🌿 풀 — 포기마다 메시였던 것을 색깔별 InstancedMesh 3개로(드로우콜 76→3, 그림자 포함 152→6).
  //    바람에 흔들리는 건 그대로 — updateSway 가 포기별 인스턴스 행렬을 다시 쓴다.
  const grassBuckets = [[], [], []];
  for (let i = 0; i < (IS_MOBILE ? 40 : 80); i++) {   // 모바일 풀 개수 ↓
    const r = 4 + Math.random() * 30, a = Math.random() * Math.PI * 2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (dist2D({ x, z }, SEA_COVE) < SEA_COVE.r + 0.5) continue;  // 🌊 후미 물 위 제외
    if (dist2D({ x, z }, SHOP_POS) < 3.2) continue;               // 🏪 가게 바닥은 두께 0.09 라 풀(높이 0.7)이 마루를 뚫고 올라온다
    grassBuckets[i % 3].push({ x, y: 0.35, z, ph: Math.random() * Math.PI * 2 });
  }
  grassBuckets.forEach((items, k) => {
    if (!items.length) return;
    const im = new THREE.InstancedMesh(
      shared('grass.geo', () => new THREE.ConeGeometry(0.18, 0.7, 5)),
      clayMat([PAL.leaf1, PAL.leaf2, PAL.leaf3][k]), items.length);
    im.castShadow = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
    grassClumps.push({ mesh: im, items });
  });

  buildPlayer();
  buildFireflies();
  buildStars();
  buildRain();              // 🌧️ 빗줄기(비 오는 날에만 표시)
  buildEnvironment();
}

function spawnTree(x, z) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  const trunk = new THREE.Mesh(
    shared('tree.trunk.geo', () => new THREE.CylinderGeometry(0.35, 0.5, 1.6, 7)),
    shared('tree.trunk.mat', () => clayMat(PAL.trunk)));
  trunk.position.y = 0.8; trunk.castShadow = true; tree.add(trunk);

  const leafColor = [PAL.leaf1, PAL.leaf2, PAL.leaf3][Math.floor(Math.random() * 3)];
  // 잎 덩이 4개는 늘 한 몸으로 움직인다(따로 만질 일이 없음) → 지오메트리 하나로 합쳐
  // 그루당 5개였던 메시를 2개로. 40그루 기준 드로우콜 −240(본 패스+그림자 패스).
  const canopy = new THREE.Mesh(
    shared('tree.canopy.geo', () => mergeGeos(
      [[0, 0.4, 0, 1.2], [0.7, 0, 0.2, 0.85], [-0.6, 0.05, -0.3, 0.9], [0.1, 0.9, -0.2, 0.7]]
        .map(([bx, by, bz, s]) => new THREE.IcosahedronGeometry(s, 0).translate(bx, by, bz)))),
    shared(`tree.leaf.mat.${leafColor}`, () => clayMat(leafColor)));
  canopy.position.y = 2.0; canopy.castShadow = true;
  tree.add(canopy);
  canopy.userData.swayPhase = Math.random() * Math.PI * 2; swayables.push(canopy);

  // 🚧 줄기는 통과 못 함(벌목 사거리 2.6 은 그대로 확보). 베어져 사라진 동안엔 꺼둔다.
  tree.userData = { hp: 3, canopy, trunk, squash: 0, fallen: false, respawnAt: 0, leafColor, collider: solidCircle(x, z, 0.8) };
  scene.add(tree); trees.push(tree);
  obstacles.push({ x, z, r: 1.3 }); // 나무 밑엔 밭 금지
}

// =============================================================
//  🍎 과수원 언덕 — 지형·시냇물·나무(js/orchard.js 규칙을 그린다)
//  ------------------------------------------------------------
//  드로우콜 예산: 나무 10그루 다 찬 과수원에서 본 패스 ≤14
//  (풀 최적화 — 위 "🌿 풀" 주석 — 와 같은 방식: 그루당 Mesh 대신 종류별 InstancedMesh)
// =============================================================
function orchardStreamWorld() { return ORCHARD_STREAM_LOCAL.map(([x, z]) => ({ x: ORCHARD.x + x, z: ORCHARD.z + z })); }
function orchardSlotsWorld()  { return ORCHARD_SLOTS_LOCAL.map(([x, z]) => ({ x: ORCHARD.x + x, z: ORCHARD.z + z })); }

// 단계별 크기 — 묘목은 작고 다 자라면 1
const ORCHARD_SCALE = { sapling: 0.35, growing: 0.7, mature: 1 };
// 열매가 달리는 자리(나무 국소 좌표) — 최대 6개
// 열매 자리 — **캐노피 표면**에 건다. 전에는 잎 덩어리 안쪽 좌표라 통째로 파묻혀 안 보였다.
//   캐노피는 y≈2.0 에 반경 약 1.2 이므로, 중심에서 1.25 만큼 바깥으로 밀어 표면에 걸친다.
const CANOPY_Y = 2.0, FRUIT_R = 1.25;
const FRUIT_SPOTS = [[-0.75, 0.15, 0.45], [0.8, -0.05, -0.3], [0.2, 0.5, 0.75], [-0.35, -0.3, -0.8], [0.65, 0.45, 0.2], [-0.85, 0.35, -0.35]]
  .map(([dx, dy, dz]) => {
    const L = Math.hypot(dx, dy, dz) || 1;
    return [dx / L * FRUIT_R, CANOPY_Y + dy / L * FRUIT_R, dz / L * FRUIT_R];
  });

// 언덕 지면 + 시냇물 — 둘 다 정적. 시냇물은 점 5개를 한 지오메트리로 합쳐 드로우콜 1
function buildOrchardGround() {
  const ground = new THREE.Mesh(
    // 걸을 수 있는 범위(ORCHARD_HALF-0.8)보다 훨씬 넓게 깐다 — 원판 끝이 보이면 허공이 드러난다
    shared('orchard.ground.geo', () => new THREE.CircleGeometry(ORCHARD_HALF + 16, 40).rotateX(-Math.PI / 2)),
    shared('orchard.ground.mat', () => clayMat(0xc0cf9e)));
  ground.position.set(ORCHARD.x, 0.01, ORCHARD.z); ground.receiveShadow = true; orchardGroup.add(ground);

  // 시냇물 — 원반을 겹치면 저지형 원(9각)이 서로 씹혀 가장자리가 톱니가 된다.
  //   중심선을 따라 좌우 정점을 뽑아 **띠(ribbon)** 로 잇는다 — 모서리가 매끈하고 폭도 정확히 제어된다.
  //   규칙(nearStream)은 ORCHARD_STREAM_LOCAL 그대로 쓰고 여기선 그림만 만든다.
  const streamPath = (() => {
    const pts = [];
    for (let i = 0; i < ORCHARD_STREAM_LOCAL.length - 1; i++) {
      const [x0, z0] = ORCHARD_STREAM_LOCAL[i], [x1, z1] = ORCHARD_STREAM_LOCAL[i + 1];
      for (let k = 0; k < 12; k++) {
        const u = k / 12, t = (i + u) / (ORCHARD_STREAM_LOCAL.length - 1);
        pts.push([x0 + (x1 - x0) * u + Math.sin(t * Math.PI * 2.4) * 0.9, z0 + (z1 - z0) * u, t]);
      }
    }
    const [lx, lz] = ORCHARD_STREAM_LOCAL[ORCHARD_STREAM_LOCAL.length - 1];
    pts.push([lx + Math.sin(Math.PI * 2.4) * 0.9, lz, 1]);
    // 걸을 수 있는 범위 밖으로 더 흘려 보낸다 — 땅 끝에서 물이 뚝 끊기면 판때기처럼 보인다
    const [fx, fz] = ORCHARD_STREAM_LOCAL[0];
    pts.unshift([fx - 0.6, fz - 8, 0], [fx - 1.1, fz - 16, 0]);
    pts.push([lx + 0.4, lz + 8, 1], [lx + 0.9, lz + 16, 1]);
    return pts;
  })();
  // 폭 — 시냇물답게 좁게(0.8~1.3). 전에는 3 이 넘어 운하처럼 보였다
  const streamW = t => 1.05 + Math.sin(t * Math.PI * 2.1 + 0.6) * 0.25;

  const shallow = new THREE.Mesh(                       // 얕은 여울 — 물보다 조금 넓게
    shared('orchard.shallow.geo', () => ribbonGeo(streamPath, t => streamW(t) + 0.42, (t, side) => Math.sin(t * Math.PI * (side > 0 ? 6.7 : 5.3)) * 0.12)),
    shared('orchard.shallow.mat', () => new THREE.MeshStandardMaterial({ color: 0xa8c4c0, roughness: 0.95, metalness: 0, side: THREE.DoubleSide })));
  shallow.position.set(ORCHARD.x, 0.022, ORCHARD.z); orchardGroup.add(shallow);

  const water = new THREE.Mesh(
    shared('orchard.water.geo', () => ribbonGeo(streamPath, streamW, (t, side) => Math.sin(t * Math.PI * (side > 0 ? 8.1 : 6.2)) * 0.1)),
    shared('orchard.water.mat', () => new THREE.MeshStandardMaterial({ color: 0x8fb9d6, roughness: 0.6, metalness: 0, side: THREE.DoubleSide })));
  water.position.set(ORCHARD.x, 0.035, ORCHARD.z); orchardGroup.add(water);

  const pebbles = new THREE.Mesh(                       // 양 기슭 조약돌
    shared('orchard.pebble.geo', () => mergeGeos(streamPath.filter((_, i) => i % 5 === 0).flatMap(([x, z, t], i) => {
      const w = streamW(t) + 0.5, r = 0.12 + (i % 3) * 0.04;
      return [1, -1].map(side => new THREE.IcosahedronGeometry(r, 0).translate(x + side * w, 0.02, z + (i % 2 ? 0.2 : -0.2)));
    }))),
    shared('orchard.pebble.mat', () => clayMat(0x9aa1ad)));
  pebbles.position.set(ORCHARD.x, 0.03, ORCHARD.z); orchardGroup.add(pebbles);

  // 🚧 물 위를 걸어 다니던 문제 — 시냇물에 충돌체를 깐다. 자리는 전부 물 동쪽이라 갇히지 않는다.
  for (const c of orchardStreamSolids) removeSolid(c);
  orchardStreamSolids = streamPath.filter((_, i) => i % 3 === 0)
    .map(([x, z, t]) => solidCircle(ORCHARD.x + x, ORCHARD.z + z, streamW(t) + 0.15));
}

// 🍎 나무를 전부 InstancedMesh 로 묶어 그린다 — 풀(js/game.js:2576 근처)과 같은 방식.
//   그루마다 Mesh 를 만들면 열매까지 76 드로우콜이 된다. 여기선 ≤11 이다.
//   🚫 sway 는 넣지 않는다 — 인스턴스 행렬을 매 프레임 다시 쓰는 비용이 효과보다 크다.
function syncOrchardTrees() {
  const trees = gameState.orchard?.trees || [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
  const put = (im, i, x, y, z, s) => { m.compose(v.set(x, y, z), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m); };

  // 1) 줄기 — 전부 같은 재질이라 한 덩이
  if (trees.length) {
    const im = new THREE.InstancedMesh(
      shared('tree.trunk.geo', () => new THREE.CylinderGeometry(0.35, 0.5, 1.6, 7)),
      shared('tree.trunk.mat', () => clayMat(PAL.trunk)), trees.length);
    trees.forEach((t, i) => { const s = ORCHARD_SCALE[t.stage] ?? 1; put(im, i, t.x, 0.8 * s, t.z, s); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; orchardGroup.add(im);
  }

  // 2) 잎 — 과일 종류별로 색이 다르니 종류마다 한 덩이(최대 5)
  for (const def of FRUITS) {
    const mine = trees.filter(t => t.kind === def.id);
    if (!mine.length) continue;
    const im = new THREE.InstancedMesh(
      shared('tree.canopy.geo', () => mergeGeos(
        [[0, 0.4, 0, 1.2], [0.7, 0, 0.2, 0.85], [-0.6, 0.05, -0.3, 0.9], [0.1, 0.9, -0.2, 0.7]]
          .map(([bx, by, bz, cs]) => new THREE.IcosahedronGeometry(cs, 0).translate(bx, by, bz)))),
      shared(`orchard.leaf.mat.${def.leafColor}`, () => clayMat(def.leafColor)), mine.length);
    mine.forEach((t, i) => { const s = ORCHARD_SCALE[t.stage] ?? 1; put(im, i, t.x, 2.0 * s, t.z, s); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = true; orchardGroup.add(im);
  }

  // 3) 열매 — 나무별이 아니라 과수원 전체를 종류별 한 덩이로(최대 5)
  for (const def of FRUITS) {
    const spots = [];
    for (const t of trees) {
      if (t.kind !== def.id || t.stage !== 'mature') continue;
      for (let i = 0; i < Math.min(t.fruit || 0, FRUIT_SPOTS.length); i++) {
        spots.push([t.x + FRUIT_SPOTS[i][0], FRUIT_SPOTS[i][1], t.z + FRUIT_SPOTS[i][2]]);
      }
    }
    if (!spots.length) continue;
    const im = new THREE.InstancedMesh(
      shared('orchard.fruit.geo', () => new THREE.IcosahedronGeometry(0.23, 0)),
      shared(`orchard.fruit.mat.${def.fruitColor}`, () => clayMat(def.fruitColor)), spots.length);
    spots.forEach(([x, y, z], i) => put(im, i, x, y, z, 1));
    im.instanceMatrix.needsUpdate = true; orchardGroup.add(im);
  }

  // 🚧 충돌체는 그리기와 무관하다 — 나무마다 하나씩 등록한다.
  //   rebuildOrchard() 는 심기·정산(Task 8)이 상태를 바꿀 때마다 반복 호출된다 — 지난 항목을
  //   먼저 안 지우면 부를 때마다 obstacles 에 나무 수만큼 중복이 쌓여(rebuildFarm() 의 둘레
  //   나무는 애초에 obstacles 에 안 넣어서 이 문제를 피한다) obstacles 를 순회하는 모든 충돌
  //   검사(밭 일꾼 이동·주민 배회 자리 판정 등)가 영원히 느려진다. 9158행 시설 obstacle 정리와
  //   같은 방식(참조를 들고 있다가 indexOf 로 지움) — 나무는 메시가 하나로 합쳐져 userData 를
  //   걸어 둘 개별 메시가 없으므로 모듈 변수(orchardTreeObstacles)에 참조를 보관한다.
  for (const ob of orchardTreeObstacles) { const oi = obstacles.indexOf(ob); if (oi >= 0) obstacles.splice(oi, 1); }
  orchardTreeObstacles = trees.map(t => ({ x: t.x, z: t.z, r: 0.8 }));
  obstacles.push(...orchardTreeObstacles);
  // 🚧 몸 충돌 — obstacles 는 "여기 밭 금지" 일 뿐이라 캐릭터가 나무를 그냥 통과했다(입구 장식 나무와 같은 실수).
  //    실제로 막으려면 colliders 다. 다시 그릴 때 이전 것을 치우고 새로 건다.
  for (const c of orchardTreeSolids) removeSolid(c);
  orchardTreeSolids = trees.map(t => solidCircle(t.x, t.z, 0.55 * (ORCHARD_SCALE[t.stage] ?? 1) + 0.25));
}

// 🎗️ 중심선 + 폭 함수 → 이어진 띠(ribbon) 지오메트리. XZ 평면, y=0.
//   원반을 겹쳐 깔면 저지형 원이 씹혀 톱니가 되고, 작은 원을 줄줄이 찍으면 점박이가 된다.
//   띠는 가장자리가 매끈하고 한 줄로 이어진다. path 는 [x, z, t] 배열(t 는 0~1 진행도).
function ribbonGeo(path, halfWidth, edge = () => 0) {
  const pos = [], idx = [];
  for (let i = 0; i < path.length; i++) {
    const x = path[i][0], z = path[i][1], t = path[i][2];
    const pPrev = path[Math.max(0, i - 1)], pNext = path[Math.min(path.length - 1, i + 1)];
    let dx = pNext[0] - pPrev[0], dz = pNext[1] - pPrev[1];
    const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const nx = -dz, nz = dx, w = halfWidth(t);
    const wl = w + edge(t, 1), wr = w + edge(t, -1);   // 좌우를 따로 — 평행한 두 선은 자연물처럼 안 보인다
    pos.push(x + nx * wl, 0, z + nz * wl, x - nx * wr, 0, z - nz * wr);
    if (i < path.length - 1) { const a2 = i * 2; idx.push(a2, a2 + 1, a2 + 2, a2 + 1, a2 + 3, a2 + 2); }
  }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g2.setIndex(idx); g2.computeVertexNormals();
  return g2;   // 평면이라 winding 에 따라 법선이 아래를 볼 수 있다 → 재질은 DoubleSide 로 쓴다
}

// 🍎 경계 나무 — 걸을 수 있는 범위 바깥을 나무로 둘러 공간을 닫는다.
//   울타리 대신 숲으로 막는 건 텃밭의 perimeterTrees 와 같은 생각이다.
//   줄기·잎을 각각 InstancedMesh 하나로 묶어 드로우콜은 2 만 쓴다.
function buildOrchardRim() {
  const N = 26, m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3();
  const put = (im, i, x, y, z, sc) => { m.compose(v.set(x, y, z), q, new THREE.Vector3(sc, sc, sc)); im.setMatrixAt(i, m); };
  const spots = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = ORCHARD_HALF + 2.2 + ((i * 7) % 5) * 1.3;          // 들쭉날쭉한 링(난수 없이)
    const sc = 0.9 + ((i * 11) % 4) * 0.12;
    spots.push([ORCHARD.x + Math.cos(a) * r, ORCHARD.z + Math.sin(a) * r, sc]);
  }
  const trunks = new THREE.InstancedMesh(
    shared('tree.trunk.geo', () => new THREE.CylinderGeometry(0.35, 0.5, 1.6, 7)),
    shared('tree.trunk.mat', () => clayMat(PAL.trunk)), spots.length);
  spots.forEach(([x, z, sc], i) => put(trunks, i, x, 0.8 * sc, z, sc));
  trunks.instanceMatrix.needsUpdate = true; trunks.castShadow = true; orchardGroup.add(trunks);

  const canopies = new THREE.InstancedMesh(
    shared('tree.canopy.geo', () => mergeGeos(
      [[0, 0.4, 0, 1.2], [0.7, 0, 0.2, 0.85], [-0.6, 0.05, -0.3, 0.9], [0.1, 0.9, -0.2, 0.7]]
        .map(([bx, by, bz, cs]) => new THREE.IcosahedronGeometry(cs, 0).translate(bx, by, bz)))),
    shared('orchard.rimleaf.mat', () => clayMat(0x5a8f4e)), spots.length);
  spots.forEach(([x, z, sc], i) => put(canopies, i, x, 2.0 * sc, z, sc));
  canopies.instanceMatrix.needsUpdate = true; canopies.castShadow = true; orchardGroup.add(canopies);
}

// 🍎 오솔길 — 입구(남쪽)에서 자리들을 훑고 지나가는 흙길. 띠 1 + 잔모래 1 로 드로우콜 2.
//   자리를 잇는 게 아니라 '자리 옆을 스쳐 가게' 둔다 — 길 위에 나무가 서면 이상하다.
function buildOrchardPaths() {
  // 참고: 실제 흙길은 ① 꺾이지 않고 완만한 S 자로 휘고 ② 양 가장자리가 제각각이고 ③ 모래빛으로 밝다.
  //   직선 보간은 웨이포인트마다 각이 지므로 Catmull-Rom 곡선으로 샘플링한다.
  const way = [[-1.5, 30], [0, 19], [2.2, 12], [-0.6, 5], [1.4, -2], [-0.8, -9], [2.4, -14], [1.2, -19], [2.6, -30]];   // 양 끝은 걸을 수 있는 범위 밖
  const curve = new THREE.CatmullRomCurve3(way.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
  const N = 70, path = [];
  for (let i = 0; i <= N; i++) { const t = i / N, v = curve.getPoint(t); path.push([v.x, v.z, t]); }

  const w = t => 0.66 + Math.sin(t * Math.PI) * 0.16;                       // 가운데가 넓고 양 끝이 좁게
  const edge = (t, side) => Math.sin(t * Math.PI * (side > 0 ? 9.3 : 7.1) + (side > 0 ? 0 : 1.9)) * 0.13;   // 좌우 따로 흔든다

  const mesh = new THREE.Mesh(
    shared('orchard.path.geo', () => ribbonGeo(path, w, edge)),
    shared('orchard.path.mat', () => new THREE.MeshStandardMaterial({ color: 0xded0b4, roughness: 1, metalness: 0, side: THREE.DoubleSide })));
  mesh.position.set(ORCHARD.x, 0.018, ORCHARD.z); mesh.receiveShadow = true; orchardGroup.add(mesh);

  // 길가에 흩어진 잔모래·작은 돌 — 길과 풀의 경계를 흐린다(한 덩이로 합쳐 드로우콜 1)
  const grit = new THREE.Mesh(
    shared('orchard.grit.geo', () => mergeGeos(path.filter((_, i) => i % 3 === 0).flatMap(([x, z, t], i) => {
      const off = w(t) + 0.12 + (i % 4) * 0.07, r = 0.055 + (i % 3) * 0.022;
      return [1, -1].map(side => new THREE.IcosahedronGeometry(r, 0).translate(x + side * off, 0.015, z + (i % 2 ? 0.22 : -0.24)));
    }))),
    shared('orchard.grit.mat', () => clayMat(0xcdbf9e)));
  grit.position.set(ORCHARD.x, 0.02, ORCHARD.z); orchardGroup.add(grit);
}

// 빈 자리 표시 — 나무 없는 흙 자리에만. 개수가 변하니 InstancedMesh 하나로 묶는다
function syncOrchardSlotHints() {
  const free = freeSlots(gameState.orchard?.trees || [], orchardSlotsWorld());
  if (!free.length) return;
  // 흙바닥과 색이 비슷해 "여기 심어라" 가 안 읽혔다 — 밝은 테두리를 깔고 그 위에 어두운 흙을 얹어 대비를 준다
  const m = new THREE.Matrix4();
  const ring = new THREE.InstancedMesh(
    shared('orchard.slotring.geo', () => new THREE.CircleGeometry(1.05, 14).rotateX(-Math.PI / 2)),
    shared('orchard.slotring.mat', () => clayMat(0xe8dcc0, false)), free.length);
  free.forEach((s, i) => { m.makeTranslation(s.x, 0.042, s.z); ring.setMatrixAt(i, m); });
  ring.instanceMatrix.needsUpdate = true; orchardGroup.add(ring);

  const im = new THREE.InstancedMesh(
    shared('orchard.slot.geo', () => new THREE.CircleGeometry(0.82, 12).rotateX(-Math.PI / 2)),
    shared('orchard.slot.mat', () => clayMat(0x6f4a2a, false)), free.length);
  free.forEach((s, i) => { m.makeTranslation(s.x, 0.05, s.z); im.setMatrixAt(i, m); });
  im.instanceMatrix.needsUpdate = true; orchardGroup.add(im);
}

// 밭의 rebuildFarm() 과 같은 꼴 — 상태가 바뀌면 통째로 다시 그린다
function rebuildOrchard() {
  if (!orchardGroup) { orchardGroup = new THREE.Group(); scene.add(orchardGroup); }
  // ♻️ 이 그룹의 지오메트리·재질은 **전부 shared() 캐시**다 — 다음 rebuild 가 그대로 다시 쓰고,
  //    줄기·잎 지오메트리는 마을 숲 나무와도 공유한다. 그래서 rebuildFarm 처럼
  //    geometry/material.dispose() 를 부르면 안 된다(주석 2538행 경고 그대로).
  //    반면 InstancedMesh 는 인스턴스 행렬 버퍼(instanceMatrix)를 **자기 것으로** 갖는데,
  //    심기·물주기·수확·베기·정산마다 8~15개가 새로 만들어져 버려졌다. GPU 버퍼가 그만큼 샌다.
  //    InstancedMesh.dispose() 는 instanceMatrix(·instanceColor) 만 해제하고 공유 지오메트리·재질은
  //    건드리지 않는다(three 0.160 WebGLObjects.onInstancedMeshDispose) — 여기서 부를 수 있는 유일한 dispose 다.
  while (orchardGroup.children.length) {
    const c = orchardGroup.children[0];
    orchardGroup.remove(c);
    if (c.isInstancedMesh) c.dispose();
  }
  buildOrchardGround();     // 지면 1 + 시냇물 1(합침)
  buildOrchardPaths();      // 오솔길 1 + 잔모래 1
  buildOrchardRim();        // 경계 나무(줄기 1 + 잎 1)
  syncOrchardTrees();       // 줄기 1 + 잎 ≤5 + 열매 ≤5
  syncOrchardSlotHints();   // 빈 자리 1(인스턴스)
}

function buildPlayer() {
  playerAnchor = new THREE.Group();
  player = new THREE.Group();
  player.add(playerAnchor);

  // 밤/새벽에 켜지는 캐릭터 주변 횃불 조명(따뜻한 원형 빛)
  playerLight = new THREE.PointLight(0xffb95e, 0, 16, 1.3); // (색, 강도, 거리, 감쇠) — 넓은 반경
  playerLight.position.set(0, 1.5, 0);
  player.add(playerLight);

  // 캐릭터 몸체는 applyCharacter() 가 buildAnimalMesh() 로 통째로 만들어 붙입니다
  // (동물마다 체형·꼬리·얼굴이 달라 색만 갈아끼우는 방식으론 표현이 안 됨)

  // 오른팔 + 손 — 팔을 옆으로 벌려 도구가 몸 밖에 보이게(원래 보이던 자세 + 바깥으로 이동)
  heldGroup = new THREE.Group();
  heldGroup.position.set(0.78, 0.9, 0.06);   // 오른쪽으로 더 벌림
  heldGroup.rotation.set(-0.1, 0, -0.55);
  playerAnchor.add(heldGroup);
  playerArm = null;  // 팔(막대) 제거 — 도구만 옆에 보이게
  handAnchor = new THREE.Group(); handAnchor.position.set(0, -0.3, 0.08); heldGroup.add(handAnchor);
  setHeldTool(TOOLS[currentTool].id);
  applyCharacter(gameState.character || 'fox');   // 기본 여우(선택 전)

  player.position.set(gameState.playerPos.x, 0, gameState.playerPos.z);
  scene.add(player);
}

// ── 동물 파츠 조립기 ────────────────────────────────────────────
//   플레이어와 선택화면 프리뷰가 이 함수 하나를 공유합니다.
//   (예전엔 buildPlayer/buildEars 와 buildCharacterMesh 에 같은 코드가 중복돼 있어
//    한쪽만 고치면 인게임과 프리뷰 생김새가 어긋날 위험이 있었음 → 단일 소스로 통합)
//   모든 좌표는 머리 크기(HR)·몸 반지름(R) 기준 상대값 — 체형을 바꿔도 비율이 유지됨.
//   반환: { group, tail } · tail 은 흔들 피벗(꼬리 없으면 null)
export function buildAnimalMesh(id) {
  const a = ANIMALS.find(x => x.id === id) || ANIMALS[0];
  const g = new THREE.Group();
  const R = a.bodyR ?? 0.55, HR = a.headR ?? 0.40, HY = a.headY ?? 1.25;
  const bs = a.bodyScale || [1, 1.05, 1];
  const ex = a.extras || [];
  const skin = () => plushMat(a.body);   // 🎭 플러시 재질(머리와 같은 톤)

  // ── 몸통 — 바닥에 딱 닿게 배치(동물마다 키가 달라짐) ──
  //   Icosahedron(R,1) 의 각진 면 → 매끈한 구(머리와 같은 세분화). 정점 수는 늘지만 드로우콜은 동일.
  const bodyY = R * bs[1] + 0.02;
  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), skin());
  body.position.y = bodyY; body.scale.set(bs[0], bs[1], bs[2]); body.castShadow = true; g.add(body);

  // 배(밝은 색)
  const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.62, 24, 18), plushMat(a.belly));
  belly.position.set(0, bodyY - R * 0.16, R * 0.55); belly.scale.set(1, 1.1, 0.6); g.add(belly);

  // ── 머리 — 🎭 얼굴 생김새는 animal-faces.js 가 전담(눈·코·입·귀·무늬 전부) ──
  //   체형 수치(HR/HY)와 몸·배 색만 넘긴다. 예전엔 여기서 눈·주둥이·귀·부리·볏을 종별로 분기했지만
  //   (Icosahedron 머리 + 원뿔 귀) 플러시 스타일로 바꾸며 sims/face-style-sim.html 검수값을 모듈로 옮김.
  g.add(buildAnimalHead(a.id, { HR, HY, body: a.body, belly: a.belly }));

  // 🐤 날개는 아래 팔 조립부에서 어깨 피벗에 매달아 만든다(팔처럼 스윙 — sims/chick-wing-sim.html 검증)
  if (ex.includes('band')) {        // 🐼 검은 어깨 무늬 — 팔처럼 안 보이게 몸에 밀착(진짜 팔은 armColor 로 검게)
    [-1, 1].forEach(s => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(R * 0.34, 10, 8), clayMat(0x2a2a2a, false));
      b.scale.set(0.5, 0.8, 0.78);
      b.position.set(s * R * 0.78, bodyY + R * 0.22, 0);
      b.castShadow = true; g.add(b);
    });
  }
  if (ex.includes('collar')) {      // 🐶 빨간 목줄
    // ※ 머리가 몸통에 깊이 박히는 체형이라 목 위치를 낮게 잡으면 몸 안에 파묻힘.
    //   머리·몸통 실루엣이 만나는 지점(HY - HR*0.55)에 걸치고, 반지름을 그 단면보다
    //   살짝 크게(HR*0.92) 잡아야 밖으로 드러납니다.
    const c = new THREE.Mesh(new THREE.TorusGeometry(HR * 0.92, HR * 0.11, 6, 18), clayMat(0xd9534f, false));
    c.position.set(0, HY - HR * 0.55, 0); c.rotation.x = Math.PI / 2; c.castShadow = true; g.add(c);
    const tag = new THREE.Mesh(new THREE.SphereGeometry(HR * 0.13, 8, 8), clayMat(0xf0c040, false));
    tag.position.set(0, HY - HR * 0.72, HR * 0.86); tag.scale.set(1, 1, 0.55); g.add(tag);
  }

  // ── 꼬리 ── (피벗을 반환해 애니메이션에서 흔듦)
  let tail = null;
  if (a.tail) {
    const t = a.tail;
    tail = new THREE.Group();
    tail.position.set(0, bodyY + R * 0.10, -R * bs[2] * 0.86);
    const tm = clayMat(t.color, false);
    const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); mesh.castShadow = true; tail.add(mesh); };

    // 🦊🐶🐱 는 테이퍼 튜브 한 덩어리(sims/tail-sim.html 에서 모양 검수). 곡선 좌표는 몸 반지름 R 비례.
    const V = (x, y, z) => new THREE.Vector3(R * x, R * y, R * z);
    const tube = (pts, radiusFn, mat, colorFn = null, segs = 32) => {
      const { geo, end } = taperedTube(pts, radiusFn, colorFn, segs);
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; tail.add(m);
      return end;
    };
    if (t.type === 'bushy') {            // 🦊 짧고 통통하게 위로 솟음 + 끝 1/3 흰색(정점색)
      const pts = [V(0, -0.05, 0.10), V(0, 0.06, -0.30), V(0, 0.30, -0.50), V(0, 0.60, -0.58), V(0, 0.88, -0.54)];
      const rad = u => R * (0.29 + 0.05 * Math.sin(Math.PI * u)) * (1 - 0.38 * Math.max(0, u - 0.70) / 0.30);
      const base = new THREE.Color(t.color), tip = new THREE.Color(t.tip);
      const colF = u => u < 0.60 ? base : u < 0.68 ? base.clone().lerp(tip, (u - 0.60) / 0.08) : tip;
      const end = tube(pts, rad, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), colF, 40);
      put(new THREE.Mesh(new THREE.SphereGeometry(rad(1) * 0.98, 10, 8), clayMat(t.tip, false)), end.x, end.y, end.z);
    } else if (t.type === 'curl') {      // 🐶 짧게 위로 말린 곡선
      const pts = [V(0, -0.05, 0.10), V(0, 0.05, -0.22), V(0, 0.30, -0.40), V(0, 0.58, -0.36), V(0, 0.72, -0.14)];
      const rad = u => R * (0.15 * (1 - u) + 0.05);
      const end = tube(pts, rad, tm);
      put(new THREE.Mesh(new THREE.SphereGeometry(rad(1) * 0.98, 10, 8), tm), end.x, end.y, end.z);
    } else if (t.type === 'puff') {      // 🐰 동그란 솜뭉치
      put(new THREE.Mesh(new THREE.SphereGeometry(R * 0.30, 12, 10), tm), 0, R * 0.04, -R * 0.06);
    } else if (t.type === 'long') {      // 🐱 밑동 굵게 위로 쭉 뻗고 끝이 살짝 뒤로 휘며 둥글게
      const pts = [V(0, -0.05, 0.10), V(0, 0.08, -0.36), V(0, 0.45, -0.60), V(0, 0.90, -0.58), V(0, 1.22, -0.36)];
      const rad = u => R * (0.17 * (1 - u * 0.62) + 0.02) * (1 - 0.30 * Math.max(0, u - 0.85) / 0.15);
      const end = tube(pts, rad, tm, null, 40);
      put(new THREE.Mesh(new THREE.SphereGeometry(rad(1) * 0.98, 10, 8), tm), end.x, end.y, end.z);
    } else if (t.type === 'stub') {      // 🐻🐼 뭉툭한 짧은 꼬리
      put(new THREE.Mesh(new THREE.SphereGeometry(R * 0.17, 10, 8), tm), 0, R * 0.06, -R * 0.02);
    } else if (t.type === 'feather') {   // 🐤 뾰족한 꽁지깃
      [-1, 0, 1].forEach(s => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(R * 0.13, R * 0.46, 4), tm);
        f.position.set(s * R * 0.14, R * (0.16 + Math.abs(s) * -0.04), -R * 0.14);
        f.rotation.set(-0.9, 0, s * 0.35); f.castShadow = true; tail.add(f);
      });
    }
    tail.userData = { wagSpeed: t.wagSpeed ?? 2, wagAmp: t.wagAmp ?? 0.15 };
    g.add(tail);
  }

  // ── 팔 — 어깨 피벗(스윙축 YXZ) → 조준(고정) → 팔뚝·발바닥·손 ──
  //   🐤병아리는 별도 팔 대신 날개 자체를 어깨 피벗에 매달아 팔처럼 쓴다(sims/chick-wing-sim.html 검수값)
  let armR = null, armL = null;
  if (ex.includes('wings')) {
    const WLEN = 1.15;                       // 원본 날개보다 15% 길게 — 그립까지 리치 확보
    const halfH = R * 0.34 * 0.85;           // 날개 세로 반높이
    const mkWing = (side) => {
      const pivot = new THREE.Group();
      pivot.rotation.order = 'YXZ';
      pivot.position.set(side * R * 0.90, bodyY + R * 0.28, R * 0.05);
      const aim = new THREE.Group();
      aim.rotation.z = -side * 0.20;         // 원본 날개의 바깥 기울임을 조준 그룹에 흡수
      pivot.add(aim);
      const w = new THREE.Mesh(new THREE.SphereGeometry(R * 0.34, 10, 8), clayMat(0xffd23a, false));
      w.scale.set(0.30, 0.85 * WLEN, 0.75);
      w.position.set(side * R * 0.02, -(halfH * WLEN) + R * 0.08, 0);  // 윗단을 어깨에 살짝 파묻기
      w.castShadow = true; aim.add(w);
      const hand = new THREE.Group();
      hand.position.set(0, -(halfH * 2 * WLEN) + R * 0.12, R * 0.04);  // 날개 끝 = 손
      aim.add(hand);
      return { pivot, hand };
    };
    armR = mkWing(1); armL = mkWing(-1);
    g.add(armR.pivot, armL.pivot);
  } else {
    const mkArm = (side) => {
      const pivot = new THREE.Group();
      pivot.rotation.order = 'YXZ';         // 옆베기: 팔을 든(X) 채 수직축(Y) 스윕
      // 어깨는 몸 가로폭(bs[0]) 비례 — 고정 0.87론 곰·판다(bs[0]=1.08)에서 팔·도구가
      // 몸에 파묻혔다. 팔도 0.22→0.32로 길게. (sims/tool-visibility-sim.html 검수)
      pivot.position.set(side * R * 0.85 * bs[0], bodyY + R * 0.54, R * 0.20);
      const aim = new THREE.Group();
      aim.quaternion.copy(side > 0 ? ARM_AIM_R : ARM_AIM_L);
      pivot.add(aim);
      const ar = R * 0.23, al = R * 0.32;
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(ar, al, 4, 8), a.armColor ? clayMat(a.armColor, false) : skin());
      upper.position.y = -(al / 2 + ar * 0.4); upper.castShadow = true; aim.add(upper);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(ar * 1.06, 10, 8), clayMat(a.ear, false));
      paw.position.y = -(al + ar * 0.9); paw.castShadow = true; aim.add(paw);
      const hand = new THREE.Group(); hand.position.y = -(al + ar * 0.9); aim.add(hand);
      return { pivot, hand };
    };
    armR = mkArm(1); armL = mkArm(-1);
    g.add(armR.pivot, armL.pivot);
  }

  // ── 🎀 꾸미기 앵커 ── (스펙 §3)
  //  ⚠️ 장식을 여기서 만들지 않는다. **빈 Group 만** 달아 두고 js/cosmetics 가 자식을 갈아끼운다.
  //     그래야 장착을 바꿀 때 캐릭터를 통째로 다시 만들지 않는다.
  //  tail — 🦸 망토가 등 한가운데 **뒤트임을 얼마나 열지**를 정하는 데 쓴다.
  //  🦊bushy·🐱long 은 등 한가운데를 크게 차지해 트임이 없으면 천을 뚫고, 꼬리가 작은 종에
  //  같은 폭을 열면 등이 통째로 드러난다(실측: 곰에서 커튼 두 장이 됐다).
  const kk = { R, HR, HY, bs, bodyY, tail: a.tail, side: sideAnchor(bs, R, bodyY), neckR: neckR(HR) };
  const anchors = {};
  for (const [name, p] of Object.entries({
    head: headAnchor(HY), neck: neckAnchor(HR, HY),
    back: backAnchor(bs, R, bodyY), side: kk.side,
  })) {
    const a = new THREE.Group();
    a.position.set(p.x, p.y, p.z);
    g.add(a); anchors[name] = a;
  }
  return { group: g, tail, armR, armL, anchors, k: kk };
}

// 선택한 동물로 캐릭터 외형 적용 — 체형이 다르므로 몸체를 통째로 교체
function applyCharacter(id) {
  const a = ANIMALS.find(x => x.id === id) || ANIMALS[0];
  if (!playerAnchor) return;
  if (charGroup) { playerAnchor.remove(charGroup); charGroup = null; tailPivot = null; }
  const built = buildAnimalMesh(a.id);
  charGroup = built.group; tailPivot = built.tail;
  playerArms = (built.armR && built.armL) ? { R: built.armR, L: built.armL } : null;
  wingArms = (a.extras || []).includes('wings');
  toolQRest = wingArms ? TOOL_QREST_WING : TOOL_QREST;
  armWristK = 0; toolPourTilt = 0;
  playerAnchor.add(charGroup);
  charAnchors = built.anchors; charK = built.k;
  applyCosmetics(gameState.cosmetics);
  restArmX = a.armX ?? 0.78;              // 몸집에 맞춰 도구 위치 보정(poseHeldTool 이 매 프레임 적용)
  curAnimal = a; updateStowPose();        // 등 수납 위치도 몸 크기에 맞춰 갱신
  poseHeldTool(toolStow);                 // 캐릭터를 바꾼 즉시 반영(다음 프레임까지 기다리지 않게)
}

// ── 🎀 장착 반영 — 앵커의 **자식만** 교체한다 ──
//   ⚠️ 공유 재질/지오메트리를 dispose 하지 않는다. 다른 곳에서 쓰던 것까지 검게 만든다(§14).
//      인스턴스만 버린다.
let charAnchors = null, charK = null;
function applyCosmetics(cos) {
  if (!charAnchors) return;
  for (const a of Object.values(charAnchors)) a.clear();
  for (const it of equippedItems(cos)) {
    if (it.slot === 'trail') continue;                 // 발자국은 월드 이펙트라 앵커가 아니다
    const m = buildCosmetic(THREE, it.id, charK);
    if (m) charAnchors[it.anchor || it.slot].add(m);   // 아이템이 붙을 면을 고른다
  }
}

// ── 👣 발자국 ── (스펙 §4-4)
//  ⚠️ 매번 생성·파괴하면 드로우콜과 GC 가 튄다. 풀에서 재사용한다.
//  ⚠️ 실내·클로즈업·미니게임에서는 끈다 — 바닥이 없거나 카메라가 붙는다.
const trailPool = [], trailLive = [];
const trailLastPos = new THREE.Vector3();
let trailItem = null, trailSide = 1;

function clearTrail() {
  for (const e of trailLive) { scene.remove(e.mesh); trailPool.push(e.mesh); }
  trailLive.length = 0;
}

function updateTrail(dt) {
  const id = gameState.cosmetics.equipped.trail;
  if (id !== trailItem) { clearTrail(); trailPool.length = 0; trailItem = id; }
  const off = indoor || atCafe || atMuseum || atMine;
  if (!id || off) { if (trailLive.length) clearTrail(); return; }

  if (player.position.distanceTo(trailLastPos) >= TRAIL_STEP) {
    trailLastPos.copy(player.position);
    trailSide = -trailSide;                               // 좌우 번갈아 — 한 줄이면 점선이다
    const m = trailPool.pop() || buildTrailMark(THREE, id, 1, gameState.character);
    m.position.set(player.position.x + trailSide * TRAIL_SIDE, 0, player.position.z);
    m.rotation.y = trailSide * 0.2;
    scene.add(m); trailLive.push({ mesh: m, t: 0 });
    while (trailLive.length > TRAIL_CAP) {
      const old = trailLive.shift(); scene.remove(old.mesh); trailPool.push(old.mesh);
    }
  }
  for (let i = trailLive.length - 1; i >= 0; i--) {
    const e = trailLive[i]; e.t += dt;
    const k = Math.max(0, 1 - e.t / TRAIL_FADE);
    e.mesh.traverse(o => { if (o.material) o.material.opacity = k; });
    if (k <= 0) { scene.remove(e.mesh); trailPool.push(e.mesh); trailLive.splice(i, 1); }
  }
}

// ── 캐릭터 선택 화면용: 독립 메시(도구/팔 없음) — 인게임과 같은 빌더 사용 ──
//   cos 는 **가상 장착**을 받기 위한 인자다(🎀 꾸미기 상점의 "입어보기"). 기본값은 실제 장착이라
//   캐릭터 선택 화면은 예전과 똑같이 동작한다.
function buildCharacterMesh(id, cos = gameState.cosmetics) {
  const built = buildAnimalMesh(id);
  for (const it of equippedItems(cos)) {
    if (it.slot === 'trail') continue;
    const m = buildCosmetic(THREE, it.id, built.k);
    if (m) built.anchors[it.anchor || it.slot].add(m);
  }
  return built.group;
}

// ── 선택 화면 3D 프리뷰(드래그로 회전 + 살짝 자동 스핀) ──
function makeCharacterPreview(canvas) {
  const rend = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  rend.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  cam.position.set(0, 1.05, 4.6); cam.lookAt(0, 0.95, 0);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x9ab0a0, 1.05));
  const key = new THREE.DirectionalLight(0xfff2d8, 1.15); key.position.set(2.5, 4, 3); sc.add(key);
  const rim = new THREE.DirectionalLight(0xbfe8ff, 0.45); rim.position.set(-3, 2, -2); sc.add(rim);
  const pivot = new THREE.Group(); sc.add(pivot);
  let mesh = null, rotY = 0.5, rotX = 0, dragging = false, lx = 0, ly = 0, autoSpin = true, raf = 0;
  let animal = null, marks = null, cosView = null;   // cosView = null 이면 실제 장착을 본다
  let petStage = null, petKind = PET_KIND;           // petStage = 숫자면 캐릭터 대신 🐾 펫을 본다(petKind = 어느 종을)
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  //  ⚠️ **disposeTree 를 부르지 않는다.** 꾸미기 재질·plushMat 은 월드의 내 캐릭터와 **공유**라
  //     여기서 버리면 플레이어가 입고 있는 것까지 검게 된다(§14). 인스턴스만 떼어 낸다.
  //     🐾 펫 재질도 같다 — 월드의 펫과 공유라 여기서 버리면 따라다니는 펫이 검게 된다.
  function rebuild() {
    const cos = cosView || gameState.cosmetics;
    if (mesh) pivot.remove(mesh);
    if (marks) { pivot.remove(marks); marks = null; }
    if (petStage !== null) {
      //  🐾 펫은 무릎 높이라(캐릭터의 1/3) 캐릭터 프레임에 그냥 놓으면 바닥에 점처럼 남는다.
      //     조형 수치를 여기 베껴 두면 js/pet/art.js 가 바뀔 때 같이 틀어지니 **실측 바운딩**으로
      //     키를 맞추고(1.4) 카메라가 보는 높이(0.95)에 중심을 둔다.
      mesh = spawnPet(THREE, petKind, petStage);
      if (!mesh) return;
      const b = new THREE.Box3().setFromObject(mesh), sz = b.getSize(new THREE.Vector3());
      const k = 1.4 / Math.max(0.2, sz.y);
      mesh.scale.setScalar(k);
      mesh.position.y = 0.95 - (b.min.y + sz.y / 2) * k;
      pivot.add(mesh);
      return;
    }
    mesh = buildCharacterMesh(animal, cos); pivot.add(mesh);
    const tid = cos?.equipped?.trail;      // 👣 발자국은 앵커가 아니라 월드 이펙트 — 발밑에 두 개만 깔아 보여 준다
    if (tid) {
      marks = new THREE.Group();
      for (const s of [-1, 1]) {
        const m = buildTrailMark(THREE, tid, 1, animal);
        m.position.set(s * 0.26, 0.012, s * 0.20 + 0.1); m.rotation.y = s * 0.2;
        marks.add(m);
      }
      pivot.add(marks);
    }
  }
  function setAnimal(id) { animal = id; rebuild(); autoSpin = true; }
  /** 🎀 가상 장착으로 다시 그린다(회전·자동스핀은 그대로). cos 없으면 실제 장착으로 되돌린다 */
  function refresh(cos = null) { cosView = cos; if (animal) rebuild(); }
  /** 🐾 펫 탭 — 단계(0·1·2)를 주면 펫을, null 이면 캐릭터를 본다. kind 로 종을 고른다 */
  function showPet(stage = null, kind = petKind) {
    const next = stage === null ? null : (stage | 0);
    if (next === petStage && kind === petKind) return;   // 같은 종·단계면 다시 짓지 않는다(재그리기마다 호출된다)
    petStage = next; petKind = kind; if (animal) rebuild();
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }   // 패널을 닫으면 두 번째 렌더러를 세운다
  function start() { if (!raf) loop(); }
  function resize() {
    const w = canvas.clientWidth || 220, h = canvas.clientHeight || 240;
    rend.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function loop() { raf = requestAnimationFrame(loop); if (autoSpin && !dragging) rotY += 0.006; pivot.rotation.y = rotY; pivot.rotation.x = rotX; rend.render(sc, cam); }
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', e => { dragging = true; autoSpin = false; lx = e.clientX; ly = e.clientY; try { canvas.setPointerCapture(e.pointerId); } catch (_) {} });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; rotY += (e.clientX - lx) * 0.011; rotX = clamp(rotX + (e.clientY - ly) * 0.008, -0.5, 0.5); lx = e.clientX; ly = e.clientY; });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  resize(); loop();
  return { setAnimal, resize, refresh, showPet, stop, start };
}

// 손에 든 도구 메시(도구 전환 시 교체)
// 🪓 도구 조형. tier: 0 기본 / 1 업그레이드(강철·큰·튼튼한) / 2 히든(금 + 각인 + 보석).
//   ⚠️ 기본값이 0 인 이유 — 🧑‍🌾일꾼(makeWorkerMesh)과 🌊바다 릴대도 이 함수를 쓴다.
//      등급을 넘기면 고용한 일꾼들까지 금빛 도구를 들게 된다.
//   ⚠️ 1단계는 성능을 실루엣으로 번역한다(크기·부품). 멀리서 읽히는 건 굵기가 아니라 크기와 색 대비다.
//   조형 검수: sims/tool-tier-sim.html · 색: js/tool-tiers.js
// 메시 트리의 지오메트리·재질을 버린다(제거만 하면 GPU 자원이 남는다)
function disposeTree(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.geometry?.dispose();
    const m = o.material;
    if (Array.isArray(m)) m.forEach(x => x?.dispose()); else m?.dispose();
  });
}

function toolMesh(id, tier = 0) {
  const g = new THREE.Group();
  const T = paletteOf(tier);
  const up = tier >= 1;                   // 업그레이드 이상 — 크기·부품이 붙는다
  const wood = (l) => new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, l, 6), clayMat(T.wood));
  // ── 새 4종(도끼·곡괭이·망치·낫) 공용 — sims/arm-sim.html 에서 검수받은 조형 ──
  const GRIP = T.grip, STEEL = T.metal, EDGE = T.edge;
  const handle = (l, r = 0.030) => {   // 테이퍼 자루 + 그립 밴드 + 끝 혹. 반환: 자루 꼭대기 y
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, l, 7), clayMat(T.wood));
    h.position.y = l / 2 - 0.08;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.18, r * 1.18, 0.07, 7), clayMat(GRIP));
    band.position.y = -0.02;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(r * 1.35, 7, 6), clayMat(GRIP));
    knob.position.y = -0.08;
    g.add(h, band, knob);
    if (up) {   // 자루 금속 보강 밴드 — 멀리서도 "달라졌다" 가 읽히는 가장 싼 신호
      const rein = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.1, 0.045, 7), clayMat(T.accent));
      rein.position.y = l * 0.52 - 0.08; g.add(rein);
    }
    if (tier === 2) {   // 각인 무늬 3줄이 자루를 타고 오른다
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.05, 0.008, 5, 10), clayMat(T.accent));
        ring.rotation.x = Math.PI / 2; ring.position.y = l * (0.18 + i * 0.12) - 0.08; g.add(ring);
      }
    }
    return l - 0.08;
  };
  // 2단계 포인트 보석 — 몸체에 묻히지 않게 앞면(z+)으로 띄운다.
  //   ⚠️ tierOf 는 아직 2 를 돌려주지 않는다(친밀도 도면 제작이 붙을 때 열린다).
  //      그때 블룸·드로우콜을 다시 실측할 것 — 지금 2단계 조형은 검수되지 않은 채 잠들어 있다.
  const gem = (x, y, sc = 1) => {
    if (tier !== 2) return;
    const j = new THREE.Mesh(new THREE.OctahedronGeometry(0.032 * sc, 0), clayMat(GEM_COLOR));
    j.position.set(x, y, 0.055); g.add(j);
  };
  if (id === 'axe') {
    const top = handle(0.52);
    // 쐐기형 머리: 강철 몸체 + 밝은 날 + 뒤통수 망치면
    const ak = up ? 1.22 : 1;   // 강철 도끼 — 머리가 커진다("2번에 벌목" 이 실루엣으로 보이게)
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.17 * ak, 0.13 * ak, 0.06), clayMat(STEEL));
    head.position.set(0.075, top - 0.05, 0); g.add(head);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07 * ak, 0.155 * ak, 0.028), clayMat(EDGE));
    blade.position.set(0.175 * ak, top - 0.05, 0); blade.rotation.z = 0.06; g.add(blade);
    const poll = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09 * ak, 0.07), clayMat(STEEL));
    poll.position.set(-0.035, top - 0.05, 0); g.add(poll);
    gem(0, top - 0.16, 1.15);
    g.scale.setScalar(1.18);
  } else if (id === 'hoe') {
    const top = handle(0.52);
    // 곡괭이 — 소켓에서 양팔이 대칭으로 뻗고 끝으로 갈수록 처지며 뾰족해진다. 검은 무쇠 톤
    const IRON = tier === 2 ? T.metal : (up ? 0x3f4348 : 0x4d5156);   // 무쇠 괭이 — 더 검은 무쇠
    const hk = up ? 1.20 : 1;
    const hd = new THREE.Group(); hd.position.y = top + 0.01; g.add(hd);
    const boss = new THREE.Mesh(new THREE.BoxGeometry(0.085 * hk, 0.095 * hk, 0.075), clayMat(IRON));
    hd.add(boss);
    [-1, 1].forEach(sx => {
      const TH = [0.14, 0.32], LEN = [0.13 * hk, 0.12 * hk];
      let px = sx * 0.042, py = 0.012;
      for (let i = 0; i < 2; i++) {
        const dx = Math.cos(TH[i]) * sx, dy = -Math.sin(TH[i]);
        const seg = new THREE.Mesh(new THREE.BoxGeometry(LEN[i], (0.048 - i * 0.012) * hk, 0.05 - i * 0.012), clayMat(IRON));
        seg.position.set(px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0);
        seg.rotation.z = -sx * TH[i];
        hd.add(seg);
        px += dx * LEN[i]; py += dy * LEN[i];
      }
      // 끝만 밝은 강철로 — "한 번 덜 친다" 가 날 끝에서 읽힌다
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.020 * hk, 0.085 * hk, 6), clayMat(up ? EDGE : IRON));
      const t3 = 0.48, dx = Math.cos(t3) * sx, dy = -Math.sin(t3);
      tip.position.set(px + dx * 0.042, py + dy * 0.042, 0);
      tip.rotation.z = -sx * (Math.PI / 2 + t3);
      hd.add(tip);
    });
    gem(0, top + 0.01, 1);
    g.scale.setScalar(1.18);
  } else if (id === 'seed') {
    const sk = up ? 1.30 : 1;   // 넉넉한 = 주머니가 커진다
    const cloth = tier === 2 ? 0x8a6a3a : (up ? 0xb8873f : 0xcaa06a);
    const bag = new THREE.Mesh(new THREE.SphereGeometry(0.12 * sk, 8, 8), clayMat(cloth)); bag.position.y = 0.08; bag.scale.set(1, 1.15, 1); g.add(bag);
    if (up) {   // 목 끈 + 매듭 — "안 새어 나간다" 를 닫힌 주머니로 보여준다
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * sk, 0.075 * sk, 0.06, 8), clayMat(cloth));
      neck.position.y = 0.20 * sk; g.add(neck);
      const cord = new THREE.Mesh(new THREE.TorusGeometry(0.062 * sk, 0.012, 5, 12), clayMat(T.accent));
      cord.rotation.x = Math.PI / 2; cord.position.y = 0.20 * sk; g.add(cord);
      [-1, 1].forEach(sx => {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 5), clayMat(T.accent));
        knot.position.set(sx * 0.07 * sk, 0.21 * sk, 0); g.add(knot);
      });
    }
    if (tier === 2) for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry((0.118 - i * 0.022) * sk, 0.007, 5, 12), clayMat(T.accent));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.03 + i * 0.055; g.add(ring);
    }
    gem(0, 0.10, 1.1);
    g.scale.setScalar(1.25);   // 소형 도구 확대 — 원 크기론 41° 카메라에서 몸에 묻혀 안 보임(도구 가시성 시뮬)
  } else if (id === 'water') {
    const wk = up ? 1.28 : 1;   // 큰 물조리개 — 통이 실제로 커진다
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * wk, 0.12 * wk, 0.2 * wk, 10), clayMat(T.can)); body.position.y = 0.18; g.add(body);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.035, 0.22 * wk, 6), clayMat(T.can)); spout.position.set(0.15 * wk, 0.26, 0); spout.rotation.z = -0.9; g.add(spout);
    if (up) {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.115 * wk, 0.115 * wk, 0.028, 10), clayMat(T.accent));
      rim.position.y = 0.18 + 0.1 * wk; g.add(rim);
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 5, 10), clayMat(T.accent));
      hoop.position.set(-0.06 * wk, 0.30, 0); hoop.rotation.y = Math.PI / 2; g.add(hoop);
      // 장미꼭지 — 물이 넓게 퍼진다는 성능의 시각화
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.032, 0.04, 8), clayMat(T.accent));
      rose.position.set(0.265 * wk, 0.40, 0); rose.rotation.z = -0.9; g.add(rose);
    }
    if (tier === 2) for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.118 * wk, 0.007, 5, 12), clayMat(T.accent));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.11 + i * 0.06; g.add(ring);
    }
    gem(0, 0.30, 1.15);
    g.scale.setScalar(1.25);
  } else if (id === 'sickle') {
    const top = handle(0.30, 0.034);
    // 전투낫 — 날이 자루의 연장선으로 길게 서고, 끝으로 갈수록 뒤로 완만하게 휜다.
    //   완만한 곡선은 각도가 조금씩 커지는 3개 세그먼트로 — 급하게 꺾으면 갈고리가 된다.
    const bl = new THREE.Group();
    bl.position.y = top + 0.01; bl.rotation.y = 0.10; g.add(bl);
    const ck = up ? 1.24 : 1;   // 잘 드는 낫 — 날이 길어진다(옆 칸까지 닿는다)
    const TH = [0.06, 0.28, 0.60], LEN = [0.15 * ck, 0.12 * ck, 0.10 * ck], W = [0.055, 0.045, 0.030];
    let px = 0, py = 0;
    for (let i = 0; i < 3; i++) {
      const dx = Math.sin(TH[i]), dy = Math.cos(TH[i]);
      const seg = new THREE.Mesh(new THREE.BoxGeometry(W[i], LEN[i], 0.016), clayMat(STEEL));
      seg.position.set(px + dx * LEN[i] / 2, py + dy * LEN[i] / 2, 0);
      seg.rotation.z = -TH[i];
      bl.add(seg);
      // 밝은 날을 1단계부터 두껍게 — "잘 든다" 는 날에서 읽혀야 한다
      const edge = new THREE.Mesh(new THREE.BoxGeometry(up ? 0.020 : 0.013, LEN[i] * 0.94, 0.012), clayMat(EDGE));
      edge.position.set(px + dx * LEN[i] / 2 + dy * (W[i] / 2), py + dy * LEN[i] / 2 - dx * (W[i] / 2), 0);
      edge.rotation.z = -TH[i];
      bl.add(edge);
      px += dx * LEN[i]; py += dy * LEN[i];
    }
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.036, 0.06, 7), clayMat(up ? T.accent : STEEL));
    ferrule.position.y = top - 0.01; g.add(ferrule);
    gem(0, top - 0.01, 0.95);
    g.scale.setScalar(1.18);
  } else if (id === 'shovel') {
    // 🪏 삽 — sims/shovel-sim.html 검수판. 긴 자루 위에 목 이음쇠 + 넓적한 날(위가 넓고 끝이 좁아짐)
    const top = handle(0.58);
    const vk = up ? 1.26 : 1;   // 넓은 삽 — 날이 넓어진다(한 번에 메운다)
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.07, 7), clayMat(up ? T.accent : STEEL));
    collar.position.y = top + 0.01; g.add(collar);
    // 날: 둥근 삽날 윤곽(어깨 직선 + 반원 끝)을 얇게 뽑고 모서리를 둥글게 깎아 매끈한 한 덩어리로(참고 이미지 피드백 2026-09-08).
    //   날끝 밝은 막대·발판 턱은 게임 시점에서 점처럼 따로 떠 보여 없앴다.
    const bw = 0.105 * vk, bh = 0.13 * vk;
    const sh = new THREE.Shape();
    sh.moveTo(-bw, 0); sh.lineTo(-bw, bh); sh.absarc(0, bh, bw, Math.PI, 0, true); sh.lineTo(bw, 0); sh.closePath();
    const bladeGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 14 });
    bladeGeo.translate(0, 0, -0.015);
    const blade = new THREE.Mesh(bladeGeo, clayMat(STEEL, false));
    blade.position.y = top + 0.03; g.add(blade);
    if (up) [-1, 1].forEach(sx => {   // 발판 턱 — 발로 밟아 한 번에 박는다
      const step = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.022, 0.045), clayMat(T.accent));
      step.position.set(sx * bw * 0.75, top + 0.045, 0.02); g.add(step);
    });
    gem(0, top + 0.10, 1.1);
    g.scale.setScalar(1.18);
  } else if (id === 'hammer') {
    const top = handle(0.50);
    // 원통형 머리(가로) + 양끝 밝은 캡 + 자루 고정핀
    const mk = up ? 1.24 : 1;   // 묵직한 = 머리가 크다(목재를 덜 먹는다)
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * mk, 0.055 * mk, 0.20 * mk, 8), clayMat(STEEL));
    head.position.y = top - 0.04; head.rotation.z = Math.PI / 2; g.add(head);
    [-1, 1].forEach(sx => {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.062 * mk, 0.058 * mk, up ? 0.045 : 0.03, 8), clayMat(EDGE));
      cap.position.set(sx * 0.105 * mk, top - 0.04, 0); cap.rotation.z = Math.PI / 2; g.add(cap);
    });
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), clayMat(up ? T.accent : GRIP));
    pin.position.y = top + 0.022; g.add(pin);
    gem(0, top - 0.16, 1.05);
    g.scale.setScalar(1.18);
  } else if (id === 'rod') {
    // 🎣 민낚싯대 — 도구 가시성 시뮬 검수판. 이전 버전은 찌(흰 공)가 장대 끝 옆에
    //   낚싯줄 없이 떠 있어 가까이서 보면 부러진 막대처럼 읽혔다.
    //   주먹 아래 그립(혹+밴드) + 장대 끝에서 줄로 내려오는 빨간 찌.
    //   튼튼한 낚싯대(1단계)는 릴을 달지 않는다 — 🌊바다터 대물 릴대와 실루엣이 겹친다.
    //   멀리서 읽히는 건 ① 밝은 코르크 그립 ② 2색 이음 장대 ③ 길이다.
    const rk = up ? 1.18 : 1, CORK = 0xd9b98a, UPPER = 0xb8975e;
    const rknob = new THREE.Mesh(new THREE.SphereGeometry(0.040, 7, 6), clayMat(up ? T.accent : GRIP));
    rknob.position.y = -0.09; g.add(rknob);
    const rear = new THREE.Mesh(new THREE.CylinderGeometry(up ? 0.030 : 0.026, up ? 0.034 : 0.030, up ? 0.26 : 0.20, 7), clayMat(up ? CORK : GRIP));   // 0단계는 원래 값 그대로
    rear.position.y = up ? 0.02 : -0.01; g.add(rear);
    const poleG = new THREE.Group(); poleG.position.y = 0.08; poleG.rotation.z = -0.12; g.add(poleG);
    const RL = up ? 1.06 : 0.92;
    if (up) {
      const lowH = RL * 0.58, upH = RL * 0.42;
      const low = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * rk, 0.030 * rk, lowH, 6), clayMat(T.pole));
      low.position.y = lowH / 2; poleG.add(low);
      const upSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * rk, 0.022 * rk, upH, 6), clayMat(tier === 2 ? EDGE : UPPER));
      upSeg.position.y = lowH + upH / 2; poleG.add(upSeg);
      const ferr = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.055, 7), clayMat(T.accent));
      ferr.position.y = lowH; poleG.add(ferr);
      [[0.26, 0.046], [0.62, 0.036], [0.92, 0.028]].forEach(([f, r]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 5, 10), clayMat(T.accent));
        ring.rotation.x = Math.PI / 2; ring.position.set(0.02, RL * f, 0); poleG.add(ring);
      });
    } else {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.026, RL, 6), clayMat(T.pole));
      pole.position.y = RL / 2; poleG.add(pole);
    }
    if (tier === 2) for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.007, 5, 10), clayMat(T.accent));
      ring.rotation.x = Math.PI / 2; ring.position.y = -0.04 + i * 0.05; g.add(ring);
    }
    const lineG = new THREE.Group(); lineG.position.y = RL; lineG.rotation.z = 0.12; poleG.add(lineG);  // 줄은 수직으로
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), clayMat(0xe8e4d8));
    line.position.y = -0.17; lineG.add(line);
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.042 * rk, 8, 7), clayMat(tier === 2 ? EDGE : 0xd94f4f));   // 빨간 찌
    bob.position.y = -0.38; bob.scale.set(1, up ? 1.5 : 1.25, 1); lineG.add(bob);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(up ? 0.041 : 0.040, up ? 0.041 : 0.040, 0.022, 9), clayMat(0xf4efe6));
    stripe.position.y = -0.38; lineG.add(stripe);
    gem(0, 0.10, 0.9);
    g.scale.setScalar(1.25);
  } else if (id === 'reel') {
    // 🌊 대물 릴대 — sims/arm-sim.html 검수 v2. 민대와 실루엣이 확실히 다르게:
    //   짧고 굵은 보트 로드 + 윈치급 오버사이즈 드럼 릴 + 굵은 가이드 링 + 밝은 팁.
    const NAVY = 0x2e4a66, KNOB = 0xd94f4f, ROPE = 0xe8d9a8;
    const rknob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 7, 6), clayMat(GRIP)); rknob.position.y = -0.08; g.add(rknob);
    const rear = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.046, 0.22, 7), clayMat(GRIP)); rear.position.y = 0.04; g.add(rear);
    const reel = new THREE.Group(); reel.position.set(0.1, 0.24, 0); g.add(reel);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.075, 12), clayMat(STEEL));
    spool.rotation.z = Math.PI / 2; reel.add(spool);
    [-1, 1].forEach(sx => {
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), clayMat(EDGE));
      rim.rotation.z = Math.PI / 2; rim.position.x = sx * 0.04; reel.add(rim);
    });
    const wound = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.022, 6, 12), clayMat(ROPE));
    wound.rotation.y = Math.PI / 2; reel.add(wound);
    const crank = new THREE.Group(); crank.position.x = 0.065; reel.add(crank);
    const armC = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.11, 0.018), clayMat(EDGE)); armC.position.y = 0.048; crank.add(armC);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.03, 7, 6), clayMat(KNOB)); kn.position.y = 0.105; crank.add(kn);
    const blank = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.048, 0.52, 7), clayMat(NAVY)); blank.position.y = 0.56; g.add(blank);
    [[0.52, 0.04], [0.7, 0.032]].forEach(([y, r]) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.013, 5, 10), clayMat(EDGE));
      ring.rotation.x = Math.PI / 2; ring.position.set(0.03 + r, y, 0); g.add(ring);
    });
    const rtip = new THREE.Group(); rtip.position.y = 0.8; g.add(rtip);
    const tipRod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.026, 0.2, 6), clayMat(EDGE));
    tipRod.position.y = 0.09; rtip.add(tipRod);
    rtip.rotation.z = 0.34;
    const tipEnd = new THREE.Group(); tipEnd.position.y = 0.19; rtip.add(tipEnd);   // 낚싯줄 시작점
    g.scale.setScalar(1.25);   // 대물 장비 — 카메라 클로즈업(0.45)에서도 또렷하게
    g.userData.sea = { crank, tip: rtip, tipEnd };
  } else if (id === 'net') {
    // 🦋 포충망 — 긴 손잡이 + 테 + 반투명 망(밤에 실루엣이 또렷하게 보이도록 밝은 색)
    const nk = up ? 1.22 : 1;   // 촘촘한 = 테가 커지고 망이 덜 비친다(잡을 확률↑)
    const h = wood(0.62); h.position.y = 0.2; g.add(h);
    if (up) {
      const rein = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.05, 7), clayMat(T.accent));
      rein.position.y = 0.34; g.add(rein);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17 * nk, up ? 0.024 : 0.018, 6, 14), clayMat(tier === 2 ? T.metal : 0xdfe6ea));
    ring.position.y = 0.6; ring.rotation.x = Math.PI / 2; g.add(ring);
    const bag = new THREE.Mesh(new THREE.ConeGeometry(0.16 * nk, 0.3 * nk, 10, 1, true),
      new THREE.MeshStandardMaterial({ color: tier === 2 ? 0xf2e8c8 : 0xfaffff, transparent: true, opacity: up ? 0.58 : 0.45, roughness: 1, side: THREE.DoubleSide }));
    bag.position.y = 0.74; g.add(bag);
    if (tier === 2) for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.033, 0.007, 5, 10), clayMat(T.accent));
      r.rotation.x = Math.PI / 2; r.position.y = 0.06 + i * 0.06; g.add(r);
    }
    gem(0, 0.44, 1.05);
    g.scale.setScalar(1.25);
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  g.userData.toolId = id; g.userData.tier = tier;   // refreshHeldTool 이 "지금 든 게 이 도구의 이 등급인가" 를 본다
  return g;
}
// 🏗️ 밭 시설 조형 — 🚜 빨간 헛간 세트(사용자 레퍼런스 2026-09-13: 갬브럴 지붕 + 빨간 판자 + 흰 트림 + X 브레이스).
//   ▶ 지붕은 슬레이트 회색, 벽은 헛간 빨강, 문·모서리·창은 흰 트림 — 일곱 채가 한 세트로 읽히게 색을 공유한다.
//   ▶ **재질별로 지오메트리를 합쳐** 동당 4~5콜. 갬브럴 옆면은 ExtrudeGeometry 로 한 번에 뽑는다(계단식 박스보다 깔끔).
const BARN = { wall: 0xb5462f, roof: 0x8a8f96, trim: 0xf2ece0, dark: 0x6f3a2a, base: 0x9a9086, wood: 0xa9773f, straw: 0xe0c05a, stone: 0x8d8578, crate: 0xb98a4e, iron: 0x5d5b57 };
// 갬브럴 단면(폭 w, 처마 e, 꺾임 k, 용마루 r) → 깊이 d 로 뽑은 입체. 옆면(박공)이 그대로 생긴다
function gambrelSolid(w, e, k, r, d) {
  const hw = w / 2, sh = new THREE.Shape();
  sh.moveTo(-hw, 0); sh.lineTo(-hw, e); sh.lineTo(-hw * 0.62, k); sh.lineTo(0, r); sh.lineTo(hw * 0.62, k); sh.lineTo(hw, e); sh.lineTo(hw, 0); sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false }).translate(0, 0, -d / 2);
}
// 갬브럴 지붕널 4장(아래 급경사 · 위 완경사) — 처마가 벽보다 살짝 나온다
function gambrelRoofSlabs(w, e, k, r, d, t = 0.14) {
  const hw = w / 2, out = [];
  for (const sgn of [1, -1]) {
    const x0 = sgn * (hw + 0.15), y0 = e - 0.07, x1 = sgn * hw * 0.62, y1 = k, x2 = 0, y2 = r + 0.07;
    for (const [ax, ay, bx, by] of [[x0, y0, x1, y1], [x1, y1, x2, y2]]) {
      const len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
      out.push(new THREE.BoxGeometry(len, t, d).rotateZ(ang).translate((ax + bx) / 2, (ay + by) / 2, 0));
    }
  }
  return out;
}
// 갬브럴 박공판 — 보(capY) 위쪽 삼각만 메운다. 아래를 트면 쉼터가 쉼터로 읽힌다
function gambrelGable(w, capY, k, r, t = 0.1) {
  const hw = w / 2, sh = new THREE.Shape();
  sh.moveTo(-hw, capY); sh.lineTo(-hw * 0.62, k); sh.lineTo(0, r); sh.lineTo(hw * 0.62, k); sh.lineTo(hw, capY); sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }).translate(0, 0, -t / 2);
}
// 한쪽으로 기운 외쪽지붕 널 — 부속채처럼 본채와 다른 방향으로 흐르는 지붕
function shedSlab(w, d, x, y, z, ang, t = 0.13) { return new THREE.BoxGeometry(w, t, d).rotateZ(ang).translate(x, y, z); }
// 세로 판자 결 — 벽면에서 살짝 띄운다(면이 겹치면 줄무늬가 생긴다)
function plankRibs(n, spanW, h, y, z, w = 0.07, t = 0.035) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(new THREE.BoxGeometry(w, h, t).translate(-spanW / 2 + spanW * (i / (n - 1)), y, z));
  return out;
}
function farmBuildingMesh(id, g) {
  const M = (geos, mat, shadow = true) => { const m = new THREE.Mesh(geos.length > 1 ? mergeGeos(geos) : geos[0], mat); m.castShadow = shadow; g.add(m); return m; };
  const B = (w, h, d, x, y, z, rz = 0, ry = 0) => { const q = new THREE.BoxGeometry(w, h, d); if (rz) q.rotateZ(rz); if (ry) q.rotateY(ry); return q.translate(x, y, z); };
  const CY = (rt, rb, h, seg, x, y, z, rot = null) => { const q = new THREE.CylinderGeometry(rt, rb, h, seg); if (rot === 'x') q.rotateX(Math.PI / 2); if (rot === 'z') q.rotateZ(Math.PI / 2); return q.translate(x, y, z); };
  const SP = (r, x, y, z, sy = 1) => { const q = new THREE.SphereGeometry(r, 8, 7); if (sy !== 1) q.scale(1, sy, 1); return q.translate(x, y, z); };
  const CO = (r, h, seg, x, y, z) => new THREE.ConeGeometry(r, h, seg).rotateY(Math.PI / 4).translate(x, y, z);
  // 🎨 색을 정점에 실어 두 덩어리(그림자 O/X)로만 그린다 — 조형이 복잡해져도 채당 2~3 콜
  const VS = [], VN = [];
  const P = (geos, hex, shadow = true) => { const a = shadow ? VS : VN; for (const q of geos) a.push(paintGeo(q.index ? q.toNonIndexed() : q, hex)); };
  const flushP = () => {
    const mat = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
    if (VS.length) { const m = new THREE.Mesh(mergeGeos(VS), mat()); m.castShadow = true; m.receiveShadow = true; g.add(m); }
    if (VN.length) g.add(new THREE.Mesh(mergeGeos(VN), mat()));
  };

  if (id === 'board') {                    // 📋 일꾼 게시판 — 흰 기둥 + 회색 차양 + 빨간 판 + 쪽지
    M([CY(0.08, 0.09, 1.75, 6, -0.45, 0.87, 0), CY(0.08, 0.09, 1.75, 6, 0.45, 0.87, 0), B(1.2, 0.1, 0.12, 0, 1.66, 0),
       B(1.34, 0.08, 0.1, 0, 0.66, 0.06), B(1.34, 0.08, 0.1, 0, 1.5, 0.06)], clayMat(BARN.trim, false), false);
    M([B(1.26, 0.82, 0.09, 0, 1.08, 0)], clayMat(BARN.wall, false));
    M([B(1.6, 0.08, 0.5, 0, 1.82, 0.14, -0.3)], clayMat(BARN.roof));                                  // 비 가리개
    M([B(0.34, 0.26, 0.02, -0.28, 1.2, 0.07), B(0.3, 0.22, 0.02, 0.26, 1.02, 0.07), B(0.26, 0.2, 0.02, 0.2, 1.32, 0.07)], clayMat(0xfff6e0, false), false);
  } else if (id === 'warehouse') {         // 🧺 작물 창고 2×2 — 빨간 헛간 본채 + 나무 부속채가 붙은 ㄱ자
    //   본채와 부속채는 **재료도 지붕 방향도 다르다** — 한 덩어리로 안 읽히게 형태로 갈라 놓는다
    const W = 2.6, E = 1.9, K = 2.75, R = 3.25, D = 3.1, f = D / 2, bx = -0.65;
    P([gambrelSolid(W, E, K, R, D).translate(bx, 0, 0)], BARN.wall);
    P(gambrelRoofSlabs(W, E, K, R, D + 0.3).map(q => q.translate(bx, 0, 0)), BARN.roof);
    P([B(3.0, 0.3, 3.5, bx, 0.15, 0)], BARN.stone);                                            // 돌 기초
    P(plankRibs(7, W - 0.3, E - 0.14, (E - 0.14) / 2 + 0.07, f + 0.02).map(q => q.translate(bx, 0, 0)), BARN.dark, false);   // 정면 판자 결
    P([B(1.4, 1.3, 2.5, 1.25, 0.65, -0.2)], BARN.wood);                                        // 부속채 — 연장·사료 칸
    P([shedSlab(1.66, 2.75, 1.3, 1.62, -0.2, -0.3)], BARN.roof);                               // 본채 쪽이 높아 물이 바깥으로 흐른다
    P([B(0.62, 1.0, 0.06, 1.25, 0.5, 1.02)], BARN.dark, false);                                // 부속채 쪽문
    P([B(0.05, 0.4, 0.44, 1.96, 1.0, -0.5)], BARN.iron, false);                                // 부속채 옆창
    P([B(1.3, 1.62, 0.06, bx, 0.81, f - 0.02)], BARN.dark, false);                             // 본채 대문
    P([B(0.09, 1.1, 0.09, 0.9, 0.55, 1.06), B(0.09, 1.1, 0.09, 1.6, 0.55, 1.06), B(0.8, 0.09, 0.09, 1.25, 1.1, 1.06),       // 부속채 문틀
       B(0.07, 0.5, 0.08, 1.98, 1.0, -0.74), B(0.07, 0.5, 0.08, 1.98, 1.0, -0.26), B(0.07, 0.08, 0.54, 1.98, 1.22, -0.5),   // 옆창 틀
       B(0.12, 1.7, 0.1, bx - 0.69, 0.85, f + 0.04), B(0.12, 1.7, 0.1, bx + 0.69, 0.85, f + 0.04), B(1.5, 0.12, 0.1, bx, 1.68, f + 0.04),
       B(1.36, 0.1, 0.06, bx, 0.81, f + 0.05, 0.85), B(1.36, 0.1, 0.06, bx, 0.81, f + 0.05, -0.85),                          // ✕ 브레이스
       B(0.14, E, 0.14, bx - W / 2 + 0.07, E / 2, f - 0.07), B(0.14, E, 0.14, bx + W / 2 - 0.07, E / 2, f - 0.07),           // 모서리 트림
       B(0.14, E, 0.14, bx - W / 2 + 0.07, E / 2, -f + 0.07), B(0.14, E, 0.14, bx + W / 2 - 0.07, E / 2, -f + 0.07),
       B(0.58, 0.62, 0.08, bx, 2.6, f - 0.04)], BARN.trim, false);                             // 다락 창틀
    P([B(0.24, 0.54, 0.05, bx - 0.13, 2.6, f + 0.02), B(0.24, 0.54, 0.05, bx + 0.13, 2.6, f + 0.02)], BARN.dark, false);     // 다락 양여닫이 문짝
    P([B(0.44, 0.28, 0.06, bx, 3.0, f - 0.02)], BARN.iron, false);                             // 지붕 환기창
    P([B(0.5, 0.42, 0.42, 0.4, 0.51, 1.72), B(0.48, 0.4, 0.4, 0.42, 0.92, 1.74, 0, 0.45)], BARN.crate);                      // 앞 궤짝
    P([SP(0.32, -1.7, 0.34, 1.5, 0.9), CY(0.3, 0.3, 0.56, 10, -1.7, 0.34, 1.5, 'z')], BARN.straw, false);                    // 건초 더미
  } else if (id === 'trellis') {           // 🍇 포도 지지대 1×3 — 흰 기둥 + 덩굴 + 포도
    M([CY(0.07, 0.08, 1.75, 6, 0, 0.87, -2), CY(0.07, 0.08, 1.75, 6, 0, 0.87, 0), CY(0.07, 0.08, 1.75, 6, 0, 0.87, 2),
       B(0.09, 0.09, 5.4, 0, 1.66, 0), B(0.09, 0.09, 5.4, 0, 1.12, 0)], clayMat(BARN.trim, false));
    const leaves = []; for (let i = -5; i <= 5; i++) leaves.push(SP(0.17, (i % 2 ? 0.08 : -0.08), 1.38 + (i % 3) * 0.09, i * 0.5));
    M(leaves, clayMat(0x6da35a, false));
    M([SP(0.13, 0.05, 0.95, -1.4, 1.25), SP(0.12, -0.05, 0.98, 0.6, 1.25), SP(0.12, 0.04, 0.92, 1.9, 1.25)], clayMat(0x8c6bb1, false));
  } else if (id === 'well') {              // 💧 우물 — 돌 원통 + 흰 기둥 + 회색 지붕 + 두레박
    M([CY(0.64, 0.7, 0.68, 12, 0, 0.34, 0), new THREE.TorusGeometry(0.66, 0.06, 6, 14).rotateX(Math.PI / 2).translate(0, 0.68, 0)], clayMat(BARN.base));
    M([CY(0.52, 0.52, 0.04, 12, 0, 0.62, 0)], clayMat(0x6fb6dd, false), false);
    M([CY(0.07, 0.07, 1.5, 6, -0.56, 1.12, 0), CY(0.07, 0.07, 1.5, 6, 0.56, 1.12, 0), CY(0.05, 0.05, 1.2, 8, 0, 1.74, 0, 'z')], clayMat(BARN.trim, false), false);
    M([B(0.28, 0.26, 0.26, 0.12, 1.34, 0)], clayMat(BARN.wood));                                       // 두레박
    M([CO(1.0, 0.54, 4, 0, 2.08, 0)], clayMat(BARN.roof));
  } else if (id === 'compost') {           // 🌱 퇴비통 — 빨간 판자 + 흰 테두리 + 흙·새싹
    M([B(1.26, 0.72, 0.1, 0, 0.36, 0.58), B(1.26, 0.72, 0.1, 0, 0.36, -0.58), B(0.1, 0.72, 1.26, 0.58, 0.36, 0), B(0.1, 0.72, 1.26, -0.58, 0.36, 0)], clayMat(BARN.wall, false));
    M([B(1.4, 0.09, 0.09, 0, 0.74, 0.58), B(1.4, 0.09, 0.09, 0, 0.74, -0.58), B(0.09, 0.09, 1.4, 0.58, 0.74, 0), B(0.09, 0.09, 1.4, -0.58, 0.74, 0),
       B(1.34, 0.08, 0.4, 0, 0.86, -0.74)], clayMat(BARN.trim, false), false);                                // 테두리 + 열린 뚜껑
    M([SP(0.5, 0, 0.6, 0, 0.4)], clayMat(0x4a3526, false), false);
    M([CO(0.1, 0.26, 5, 0.2, 0.84, -0.12), CO(0.08, 0.2, 5, -0.16, 0.8, 0.14)], clayMat(0x7fce7f, false), false);
  } else if (id === 'shelter') {           // 🏚️ 일꾼 쉼터 2×2 — 주춧돌 위로 들어올린 원두막
    //   마루를 F 만큼 띄워 옆의 🧺창고와 실루엣이 갈린다. 사방이 트여 일꾼이 드나드는 게 보인다
    const W = 3.2, D = 3.2, F = 0.72;
    P([CY(0.24, 0.28, F, 7, -1.3, F / 2, -1.3), CY(0.24, 0.28, F, 7, 1.3, F / 2, -1.3),
       CY(0.24, 0.28, F, 7, -1.3, F / 2, 1.3), CY(0.24, 0.28, F, 7, 1.3, F / 2, 1.3)], BARN.stone);                          // 주춧돌
    P([B(3.2, 0.2, 3.0, 0, F + 0.1, -0.1), B(3.3, 0.1, 0.14, 0, F + 0.2, 1.44)], BARN.wood);                                 // 들린 마루 + 앞 귀틀
    P([B(1.2, 0.18, 0.36, 0, 0.18, 1.78), B(1.2, 0.16, 0.34, 0, 0.46, 1.5)], BARN.wood);                                     // 오름 계단
    { const deck = [];
      for (let i = 0; i < 6; i++) deck.push(B(3.1, 0.04, 0.05, 0, F + 0.2, -1.3 + i * 0.5));
      P(deck, 0x94693c, false); }                                                              // 마루널 결
    { const rail = [];
      for (const [x, z] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.3], [1.5, 1.3], [-1.5, -0.1], [1.5, -0.1], [0, -1.5]])
        rail.push(CY(0.07, 0.07, 0.62, 5, x, F + 0.52, z));
      rail.push(B(3.1, 0.1, 0.1, 0, F + 0.82, -1.5), B(0.1, 0.1, 2.9, -1.5, F + 0.82, -0.1), B(0.1, 0.1, 2.9, 1.5, F + 0.82, -0.1));
      rail.push(CY(0.11, 0.12, 1.9, 6, -1.4, F + 1.15, -1.4), CY(0.11, 0.12, 1.9, 6, 1.4, F + 1.15, -1.4),
                CY(0.11, 0.12, 1.9, 6, -1.4, F + 1.15, 1.25), CY(0.11, 0.12, 1.9, 6, 1.4, F + 1.15, 1.25),
                B(3.3, 0.12, 0.12, 0, F + 2.1, -1.4), B(3.3, 0.12, 0.12, 0, F + 2.1, 1.25));
      P(rail, BARN.trim, false); }                                                             // 난간 + 기둥 + 보
    P(gambrelRoofSlabs(W, 2.16, 2.76, 3.1, D + 0.4).map(q => q.translate(0, F, -0.08)), BARN.roof);
    P([gambrelGable(W - 0.08, 2.06, 2.72, 3.06).translate(0, F, -D / 2 - 0.13),
       gambrelGable(W - 0.08, 2.06, 2.72, 3.06).translate(0, F, D / 2 - 0.03)], BARN.wall, false);                           // 박공판(보 위쪽만)
    P([B(0.86, 0.12, 0.86, 0, F + 0.52, -0.35), CY(0.06, 0.06, 0.32, 5, -0.3, F + 0.32, -0.62), CY(0.06, 0.06, 0.32, 5, 0.3, F + 0.32, -0.62),
       CY(0.06, 0.06, 0.32, 5, -0.3, F + 0.32, -0.08), CY(0.06, 0.06, 0.32, 5, 0.3, F + 0.32, -0.08)], BARN.wood);           // 낮은 탁자
    P([B(0.42, 0.1, 0.42, -0.85, F + 0.25, 0.45), B(0.42, 0.1, 0.42, 0.85, F + 0.25, 0.45)], BARN.wall, false);              // 방석
    P([CY(0.02, 0.02, 0.42, 4, 0, F + 2.06, -0.1), B(0.26, 0.1, 0.26, 0, F + 1.84, -0.1)], BARN.iron, false);                // 매단 줄 + 갓
    { const lampMat = clayMat(0xffd98a, false); houseWindows.push(lampMat);
      g.add(new THREE.Mesh(SP(0.16, 0, F + 1.72, -0.1, 1.1), lampMat)); }                      // 🏮 밤에 켜지는 램프
  } else if (id === 'beehive') {           // 🐝 벌통 — 흰 상자 3단 + 회색 뚜껑 + 벌
    M([B(0.8, 0.32, 0.68, 0, 0.36, 0), B(0.8, 0.32, 0.68, 0, 0.68, 0), B(0.8, 0.32, 0.68, 0, 1.0, 0), B(0.74, 0.05, 0.26, 0, 0.2, 0.44)], clayMat(BARN.trim, false));
    M([B(0.92, 0.11, 0.8, 0, 1.21, 0)], clayMat(BARN.roof));
    M([B(0.58, 0.2, 0.58, 0, 0.1, 0)], clayMat(BARN.wood));
    M([SP(0.05, 0.5, 0.95, 0.4), SP(0.045, -0.42, 1.12, 0.3), SP(0.04, 0.26, 1.3, -0.42)], clayMat(0xf5c44a, false), false);
  }
  flushP();
}

// 🎒 손에 든 도구 자세 — 손 옆(rest) ↔ 등 뒤(stow) 보간.
//   ✋맨손은 도구를 지우는 게 아니라 "등에 메는" 상태다. 이 캐릭터는 팔 메시가 없어서
//   (buildPlayer 의 playerArm = null) 도구 그룹 위치만 옮기면 그대로 등에 걸린 그림이 된다.
const HELD_REST = { py: 0.9,  pz: 0.06,  rx: -0.1, rz: -0.55 };
const HELD_STOW = { px: 0.06, py: 1.02, pz: -0.46, rx: 0.28, rz: 2.25 };  // 등 한가운데 대각선(회전·레거시 무팔 경로용)
const _hfM = new THREE.Matrix4(), _hfP = new THREE.Vector3(), _hfQ = new THREE.Quaternion(), _hfS = new THREE.Vector3();
const _hfOff = new THREE.Vector3(), _hfTQ = new THREE.Quaternion(), _hfTilt = new THREE.Quaternion(), _hfGQ = new THREE.Quaternion(), _hfRQ = new THREE.Quaternion();
const _stowP = new THREE.Vector3(HELD_STOW.px, HELD_STOW.py, HELD_STOW.pz);
const _stowQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(HELD_STOW.rx, 0, HELD_STOW.rz));
// 등 수납 위치 — 고정 상수(z=-.46)는 몸 큰 곰(등 표면 ≈ -.67)에서 도구가 파묻혔다.
//   등 표면을 몸 크기(bodyR·bodyScale)로 계산하고, 낚싯대처럼 긴 도구는 중점을
//   등 중앙에 맞춰 대각선으로 둘러멘 그림이 되게 한다. (도구 가시성 시뮬 검수)
//   캐릭터 교체(applyCharacter)·도구 교체(setHeldTool 류)마다 갱신.
function updateStowPose() {
  const a = curAnimal, R = a.bodyR ?? 0.55, bs = a.bodyScale || [1, 1.05, 1];
  const bodyY = R * bs[1] + 0.02;
  const hl = Math.max(0, (heldToolMesh?.userData.stowLen ?? 0) / 2 - 0.12);
  _stowP.set(0.06 + Math.sin(HELD_STOW.rz) * hl,          // 도구 +y축은 rz 회전 뒤 (-sin,cos) 방향
             bodyY + R * 0.60 - Math.cos(HELD_STOW.rz) * hl,
             -(0.8 * R * bs[2] + 0.05));                  // y=bodyY+.6R 높이의 몸 뒷면 + 여유
}
// 도구 길이 측정 — 생성 직후(부모·회전 없음)에 재야 정확하다
const _stowBox = new THREE.Box3(), _stowSize = new THREE.Vector3();
function measureStowLen(m) { m.userData.stowLen = _stowBox.setFromObject(m).getSize(_stowSize).y; }
const _idQ = new THREE.Quaternion();
function poseHeldTool(stow, swingX, swingZ) {
  if (!heldGroup) return;
  const k = stow, j = 1 - k;
  if (playerArms) {
    // 팔이 있으면 도구는 오른손을 따라간다(스윙의 주체는 팔). 등 수납 자세는 그대로 보간.
    const hand = playerArms.R.hand;
    hand.updateWorldMatrix(true, false);
    _hfM.copy(playerAnchor.matrixWorld).invert().multiply(hand.matrixWorld);
    _hfM.decompose(_hfP, _hfQ, _hfS);
    _hfOff.copy(handAnchor.position).applyQuaternion(_hfQ);   // 기존 handAnchor 오프셋 상쇄
    _hfP.sub(_hfOff);
    heldGroup.position.lerpVectors(_hfP, _stowP, k);
    heldGroup.quaternion.slerpQuaternions(_hfQ, _stowQ, k);
    // 손목: 자루 세워 쥠 ↔ 스윙 중 팔의 연장 · 등에 멜 땐 예전 그대로(identity)
    const grip = wingArms ? null : TOOL_GRIP[heldToolMesh?.userData.toolId];
    if (grip) _hfRQ.slerpQuaternions(TOOL_QREST_HOLD, toolQRest, toolGripFade);
    _hfTQ.slerpQuaternions(grip ? _hfRQ : toolQRest, TOOL_QSWING, armWristK);
    if (toolPourTilt) _hfTQ.multiply(_hfTilt.setFromAxisAngle(_axX, toolPourTilt));
    if (toolDigK > 0) {
      // 🪏 목표 = player(yaw) 기준 toolDigDir 로 자루(+y)를 세운 월드 회전. 손 월드 회전을 상쇄해 도구 로컬로 옮긴다
      hand.matrixWorld.decompose(_dgP, _dgW, _dgS);
      player.getWorldQuaternion(_dgPQ);
      _dgQ.setFromUnitVectors(_dgUp, toolDigDir).premultiply(_dgPQ).premultiply(_dgW.invert());
      _hfTQ.slerp(_dgQ, toolDigK);
    }
    if (heldToolMesh) {
      if (grip) {
        // 쥐는 점은 손목 회전을 따라 돈다 · 등에 멜수록(k→1) 0 으로 — 수납 위치는 도구 원점 기준
        heldToolMesh.position.copy(grip.p).applyQuaternion(_hfTQ).multiplyScalar((1 - k) * (1 - toolGripFade));
        _hfTQ.multiply(_hfGQ.slerpQuaternions(grip.q, _idQ, toolGripFade));
      } else if (TOOL_GRIP[heldToolMesh.userData.toolId]) {
        heldToolMesh.position.set(0, 0, 0);   // 도구를 든 채 🐤로 바꾸면 이전 쥐는 점이 남는다
      }
      heldToolMesh.quaternion.slerpQuaternions(_hfTQ, _idQ, k);
    }
    return;
  }
  const rx = (swingX === undefined ? HELD_REST.rx : swingX);
  const rz = (swingZ === undefined ? HELD_REST.rz : swingZ);
  heldGroup.position.set(restArmX * j + HELD_STOW.px * k,
                         HELD_REST.py * j + HELD_STOW.py * k,
                         HELD_REST.pz * j + HELD_STOW.pz * k);
  heldGroup.rotation.set(rx * j + HELD_STOW.rx * k, 0, rz * j + HELD_STOW.rz * k);
}

// 🪓 업그레이드를 얻은 직후 손에 든 도구를 다시 만든다.
//   안 하면 코인을 쓴 그 순간엔 아무 일도 안 일어나고, 다음 도구 전환까지 옛 모습이 남는다.
//   ⚠️ 지금 손에 든 게 도구가 아닐 수 있다 — 꾸미기 가구(setHeldDecor)·🌊바다 릴대는
//      heldToolMesh 만 바꾸고 heldToolId 는 그대로 둔다. 그때 다시 만들면 손의 가구가 도구로 바뀐다.
//   ⚠️ 등급이 그대로면 다시 만들지 않는다 — 🍲큰 냄비처럼 도구와 무관한 업그레이드에서도
//      불리므로, 무조건 재생성하면 setHeldTool 의 부작용(🪏삽 첫 사용 안내)을 공짜로 다시 태운다.
function refreshHeldTool() {
  if (!heldToolId || !heldToolMesh) return;
  if (heldToolMesh.userData.toolId !== heldToolId) return;
  if (heldToolMesh.userData.tier === tierOf(heldToolId, gameState)) return;
  setHeldTool(heldToolId);
}

function setHeldTool(id) {
  if (!handAnchor) return;
  if (atSea && seaRodMesh) return;   // 🌊 바다터에선 릴대 고정 — 숫자키 도구 전환을 무시(팔레트도 숨김)
  if (heldToolMesh) { handAnchor.remove(heldToolMesh); disposeTree(heldToolMesh); }   // clayMat 은 캐시가 없다 — 안 버리면 도구를 바꿀 때마다 샌다
  heldToolId = id;
  heldToolMesh = toolMesh(id, tierOf(id, gameState));   // 지금 등급으로 — 업그레이드를 샀으면 모습이 다르다
  measureStowLen(heldToolMesh); updateStowPose();
  handAnchor.add(heldToolMesh);
  if (indoor || atCafe) setFogExempt(heldToolMesh, true);   // 실내에서 바꿔 든 도구도 안개 밖
  // 🪏 처음 삽을 들면 쓰는 법 1회 안내(모달) — 밭을 지우고 싶은 사람이 정확히 이 순간 답을 얻는다
  if (id === 'shovel' && gameState.character) {
    const A = IS_MOBILE ? '(액션)' : '(Space)';   // index.html TUT_STEPS 와 같은 표기로 통일
    firstHint('shovel', '🪏', '삽 — 빈 밭을 풀밭으로 되돌려요',
      digIsOneShot(gameState)
        ? `① 삽을 들고 빈 밭 앞에서 ${A} → 밭이 사라져요\n· 🪏넓은 삽이라 한 번에 메워져요. 되돌릴 수 없으니 조심!\n· 작물이 있는 밭은 안 돼요. 수확하거나 괭이로 정리한 뒤에요.\n· 가끔 땅속에서 도감 수집품이 나와요 📖`
        : `① 삽을 들고 빈 밭 앞에서 ${A}\n② ${DIG_WINDOW}초 안에 한 번 더 ${A} → 밭이 사라져요\n· 작물이 있는 밭은 안 돼요. 수확하거나 괭이로 정리한 뒤에요.\n· 가끔 땅속에서 도감 수집품이 나와요 📖`);
  }
}
// 꾸미기: 선택한 가구를 손에 작게 들기
function setHeldDecor(id) {
  if (!handAnchor) return;
  if (heldToolMesh) handAnchor.remove(heldToolMesh);
  const m = decorMesh(id); m.scale.setScalar(0.5 / DECOR_SCALE); m.position.y = 0.05;   // 손에 든 미니어처는 배율 상쇄(전과 같은 크기)
  m.rotation.y = decorRot * Math.PI / 2;   // 현재 회전 상태 미리보기
  heldToolMesh = m; measureStowLen(m); updateStowPose(); handAnchor.add(m);
  if (indoor || atCafe) setFogExempt(m, true);
}

// ── 🌦️ 날씨 파티클 — 비: 빠른 빗줄기 / 눈: 천천히 흩날리는 눈송이 ──
function buildRain() {
  if (WEATHER !== 'rain' && WEATHER !== 'snow') return;   // 맑음·안개는 파티클 없음
  const snow = WEATHER === 'snow';
  const N = snow ? 220 : 260, LEN = snow ? 0.13 : 0.5;    // 눈은 짧은 점 느낌
  const pos = new Float32Array(N * 6), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const o = i * 6, x = (Math.random() - 0.5) * 36, z = (Math.random() - 0.5) * 36, y = Math.random() * 14;
    pos[o] = x; pos[o + 1] = y + LEN; pos[o + 2] = z;      // 윗점
    pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z;        // 아랫점
    vel[i] = snow ? 1.3 + Math.random() * 1.4 : 14 + Math.random() * 6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  rainLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: snow ? 0xffffff : 0xaac4dc, transparent: true, opacity: snow ? 0.85 : 0.4,
  }));
  rainLines.userData = { vel, snow, len: LEN };
  rainLines.visible = false; rainLines.frustumCulled = false;
  scene.add(rainLines);
}

function updateRain(dt) {
  if (!rainLines) return;
  const show = mode === 'play' && !indoor && !atMine && !atCafe && !atMuseum;   // 실내·동굴·카페 홀·박물관에선 숨김(텃밭은 야외)
  rainLines.visible = show;
  if (!show) return;
  const { vel, snow, len } = rainLines.userData;
  const pos = rainLines.geometry.attributes.position.array;
  const px = player.position.x, pz = player.position.z, t = clock.elapsedTime;
  for (let i = 0; i < vel.length; i++) {
    const o = i * 6;
    pos[o + 1] -= vel[i] * dt; pos[o + 4] -= vel[i] * dt;
    if (snow) { const sway = Math.sin(t * 1.3 + i * 1.7) * dt * 0.7; pos[o] += sway; pos[o + 3] += sway; } // ❄️ 좌우로 흩날림
    if (pos[o + 4] < 0) {   // 바닥 도달 → 플레이어 주변 상공에서 재시작
      const x = px + (Math.random() - 0.5) * 36, z = pz + (Math.random() - 0.5) * 36, y = 9 + Math.random() * 6;
      pos[o] = x; pos[o + 1] = y + len; pos[o + 2] = z;
      pos[o + 3] = x; pos[o + 4] = y; pos[o + 5] = z;
    }
  }
  rainLines.geometry.attributes.position.needsUpdate = true;
}

function buildFireflies() {
  const N = IS_MOBILE ? 60 : 120;   // 모바일 반딧불이 ↓
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = Math.random() * 34, a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 0.5 + Math.random() * 4; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xfff2a8, size: 0.22, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  fireflies = new THREE.Points(geo, mat);
  fireflies.userData.base = pos.slice();
  scene.add(fireflies);
}

// 밤하늘 별 (상반구 돔 위 점들, 밤에 페이드인 + 반짝임)
function buildStars() {
  const N = IS_MOBILE ? 140 : 260;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(1 - Math.random() * 0.55);  // 위쪽 하늘 위주
    const r = 85;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi) + 8;
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending });
  stars = new THREE.Points(geo, mat);
  scene.add(stars);
}

// ── 주변 환경: 호수 · 벤치 · 가로등 · 꽃밭 ──────────────────────
const LAKE = new THREE.Vector3(16, 0, 9);
function buildEnvironment() {
  // 호수(잔잔한 수면 + 물가 돌 + 수련잎)
  const lake = new THREE.Mesh(
    new THREE.CircleGeometry(6, 40),
    new THREE.MeshStandardMaterial({ color: 0x8fd0ea, roughness: 0.25, metalness: 0.15, transparent: true, opacity: 0.92 })
  );
  lake.geometry.rotateX(-Math.PI / 2); lake.position.set(LAKE.x, 0.06, LAKE.z); lake.receiveShadow = true;
  scene.add(lake);
  obstacles.push({ x: LAKE.x, z: LAKE.z, r: 6.4 }); // 호수 위엔 밭 금지
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2, r = 5.7 + Math.random() * 0.9;
    const rx = LAKE.x + Math.cos(a) * r, rz = LAKE.z + Math.sin(a) * r;
    if (rx < 10.9 && Math.abs(rz - 9) < 1.4) continue;   // 🌉 부두 입구 자리는 비움
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28 + Math.random() * 0.3, 0), clayMat(0xb9c0c4));
    rock.position.set(rx, 0.14, rz); rock.castShadow = true; scene.add(rock);
  }
  buildPier();       // 🌉 낚시 부두(호수 안쪽으로)
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 4;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.4, 7), clayMat(0x7fc98a, false));
    pad.geometry.rotateX(-Math.PI / 2); pad.position.set(LAKE.x + Math.cos(a) * r, 0.12, LAKE.z + Math.sin(a) * r); scene.add(pad);
  }

  // 공원: 벤치 2개 + 가로등 2개(밤에 빛남) + 꽃밭
  PARK_BENCHES.forEach(([x, z, ry]) => makeBench(x, z, ry));
  [[-1, 7], [15, 3]].forEach(([x, z]) => makeLamp(x, z));
  const flowerCols = [0xff8fab, 0xffd36e, 0xa78bfa, 0xff9e5e, 0x8fd0ff];
  for (let i = 0; i < 28; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 26;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (dist2D({ x, z }, LAKE) < 6.5) continue;       // 호수 위 제외
    if (dist2D({ x, z }, HOUSE_POS) < 3.6) continue;  // 집 터 제외(빌라 발자국 5.4)
    if (dist2D({ x, z }, COOP) < 2.8) continue;       // 🐔 닭장 터 제외
    if (dist2D({ x, z }, DOCK_POND) < DOCK_POND_R + 0.5) continue;   // 🛶 나루터 연못 위 제외
    if (dist2D({ x, z }, MIST_GATE) < 4.5) continue;                 // 🌫️ 안개 숲 입구 제외
    if (dist2D({ x, z }, SHOP_POS) < 3.2) continue;                  // 🏪 꾸미기 가게 터 제외(반치수 2.56 + 여유)
    makeFlower(x, z, flowerCols[i % flowerCols.length]);
  }
  buildCoopSite();   // 🐔 닭장 터 표지(남쪽 필드)
  buildGlade();      // 🌟 반딧불이 계곡(남쪽 숲) — 밤 콘텐츠
  spawnCafeGate();   // ☕ 카페 건물(마을 남쪽) — 처음부터 있음
  spawnCosmeticShop();  // 🏪 꾸미기 가게(마을 서쪽) — 처음부터 있음
  refreshMuseumGate(); // 🏛️ 박물관(마을 서쪽) — 처음부터 있음. 층은 수집률로 자란다
  buildCafeHall();   // ☕ 카페 홀(별도 공간)
  buildForest();     // 🍄 채집 숲(남서쪽) — 줍기
  buildDockGate();   // 🛶 나루터(마을 북쪽 12시) — 처음부터 있음
  buildRiverSpace(); // 🛶 강(별도 공간) — 나룻배 러너
  buildMistGate();   // 🌫️ 안개 낀 숲 입구(북서) — 처음부터 있음
  buildOrchardGate();   // 🍎 과수원 언덕길 입구(정동) — 잠겨 있어도 보인다(잠금은 가로대로 표시)
  buildMistSpace();  // 🌫️ 숲(별도 공간) — 정령 달래기 웨이브
}

// 🌉 낚시 부두 — 데크 + 지지 기둥 + 볼라드 + 양동이 소품. PIER 사각 영역만 걷기 허용
function buildPier() {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(PIER.x2 - PIER.x1 + 0.2, 0.14, 1.4), woodMat(4, 1));
  deck.position.set((PIER.x1 + PIER.x2) / 2, 0.3, 9); deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  [[9.9, 8.45], [9.9, 9.55], [11.5, 8.45], [11.5, 9.55], [13.1, 8.45], [13.1, 9.55]].forEach(([px, pz]) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.75, 8), woodMat(1, 1, 0xa9743f));
    post.position.set(px, 0, pz); g.add(post);
  });
  [[13.28, 8.4], [13.28, 9.6]].forEach(([px, pz]) => {   // 끝단 볼라드(말뚝)
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 8), woodMat(1, 1, 0x8a5a3a));
    b.position.set(px, 0.5, pz); b.castShadow = true; g.add(b);
  });
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0xb8bec4, roughness: 0.5, metalness: 0.4 }));
  bucket.position.set(12.9, 0.52, 8.62); bucket.castShadow = true; g.add(bucket);
  scene.add(g);
}

// 🐔 닭장 터 표지(미건설 시) — 배지·재료 조건 안내판
function buildCoopSite() {
  coopSign = new THREE.Group(); coopSign.position.copy(COOP);
  // 집 터와 같은 문법(민트 패드 + 초록 링) — 베이지 원판이 "땅에 얼룩진 자국"처럼 보였음
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.7, 28), new THREE.MeshStandardMaterial({ color: 0xbfe8c9, transparent: true, opacity: 0.5, roughness: 1 }));
  pad.geometry.rotateX(-Math.PI / 2); pad.position.y = 0.03; coopSign.add(pad);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.65, 1.9, 36), new THREE.MeshBasicMaterial({ color: 0x5fc07c, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; coopSign.add(ring);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192;
  const c = cv.getContext('2d');
  c.fillStyle = '#b8d2ba'; roundRect(c, 10, 10, 492, 172, 28); c.fill();
  c.fillStyle = '#3a4a40'; c.textAlign = 'center';
  c.font = 'bold 46px sans-serif'; c.fillText(t('🐔 닭장 터'), 256, 74);
  c.font = 'bold 30px sans-serif'; c.fillText(t('🔥 2일 연속 출석 + 🪵25 🪨10 🪙60'), 256, 134);
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.7, 1.0, 1); sp.position.y = 2.1; coopSign.add(sp);   // 머리 위로 — 캐릭터가 밑에 서도 배너가 얼굴을 안 가림
  scene.add(coopSign);
  solidCircle(COOP.x, COOP.z, 0.55);   // 🚧 배너 바로 밑까지 파고들지 않게(건설 상호작용 2.4 는 그대로 닿음)
  if (gameState.coop.built) coopSign.visible = false;   // 복원 순서 대비
}

// 🐔 닭장 건설 — 오두막 + 울타리 펜 + 모이통 + 닭 3마리
function buildCoop(silent = false) {
  if (coopGroup) return;
  gameState.coop.built = true;
  if (coopSign) coopSign.visible = false;
  coopGroup = new THREE.Group(); coopGroup.position.copy(COOP);
  const hut = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.15, 1.4), woodMat(2, 1, 0xd98a6a));
  hut.position.set(-0.85, 0.72, -0.55); hut.castShadow = true; coopGroup.add(hut);
  const roofGeo = new THREE.ConeGeometry(1.35, 0.85, 4); roofGeo.rotateY(Math.PI / 4);
  const roof = new THREE.Mesh(roofGeo, woodMat(2, 1, 0xa9564a));
  roof.position.set(-0.85, 1.68, -0.55); roof.scale.set(1.1, 1, 0.95); roof.castShadow = true; coopGroup.add(roof);
  // 🚪 닭이 드나드는 문 — 오두막 바닥(y 0.145)까지 내려와야 "들어간다" 가 말이 된다
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.63, 0.06), new THREE.MeshStandardMaterial({ color: 0x3a2c24, roughness: 1 }));
  hole.position.set(-0.85, 0.46, 0.17); coopGroup.add(hole);
  // 울타리 — 남쪽 중앙 입구 개방
  const postMat = woodMat(1, 1, 0xc9a06a);
  const posts = [];
  for (let x = -1.6; x <= 1.61; x += 0.8) { posts.push([x, -1.3]); posts.push([x, 1.3]); }
  for (let z = -0.65; z <= 0.66; z += 0.65) { posts.push([-1.6, z]); posts.push([1.6, z]); }
  posts.forEach(([px, pz]) => {
    if (pz > 1.0 && px > -0.5 && px < 0.5) return;   // 입구
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.1), postMat);
    p.position.set(px, 0.31, pz); coopGroup.add(p);
  });
  const rail = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), postMat); m.position.set(x, 0.52, z); coopGroup.add(m); };
  rail(3.3, 0.07, 0, -1.3); rail(0.07, 2.7, -1.6, 0); rail(0.07, 2.7, 1.6, 0);
  rail(1.1, 0.07, -1.05, 1.3); rail(1.1, 0.07, 1.05, 1.3);
  const trough = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.3), woodMat(1, 1, 0x8a5a3a));
  trough.position.set(0.7, 0.12, -0.9); coopGroup.add(trough);
  for (let i = 0; i < 3; i++) {
    const ch = makeChicken();
    const s = makeChickenState(i);            // 행동 규칙은 js/coop-chickens.js (첫 자리도 거기서)
    ch.position.set(s.x, 0, s.z);
    chickens.push(ch); chickenStates.push(s); coopGroup.add(ch);
  }
  scene.add(coopGroup);
  obstacles.push({ x: COOP.x, z: COOP.z, r: 2.0 });   // 밭 금지
  solidCircle(COOP.x, COOP.z, 1.75);                  // 🚧 오두막·펜 (모이 상호작용 2.4 확보)
  if (!silent) { spawnConfetti(COOP.x, 2.2, COOP.z); spawnSparkle(COOP.x, 1.4, COOP.z, 24); Sound.complete(); }
}

// 닭 한 마리(흰 몸통 + 빨간 볏 + 주황 부리) — 펜 안을 종종거리며 돌아다님
function makeChicken() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), clayMat(0xf5f2ea));
  body.position.y = 0.22; body.scale.set(1, 0.9, 1.15); body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), clayMat(0xf5f2ea));
  head.position.set(0, 0.44, 0.14); g.add(head);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.12), clayMat(0xe05a4a, false));
  comb.position.set(0, 0.56, 0.12); g.add(comb);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 6), clayMat(0xf0a050, false));
  beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.43, 0.26); g.add(beak);
  return g;
}

// 닭 배회 — 규칙은 js/coop-chickens.js(오두막·모이통 통과 금지 + 앞문으로 드나들기).
//   여기선 계산된 상태를 메시에 옮기기만 한다.
function updateChickens(dt) {
  if (!chickenStates.length) return;
  stepChickens(chickenStates, dt);
  for (let i = 0; i < chickens.length; i++) {
    const ch = chickens[i], s = chickenStates[i];
    ch.visible = s.visible;
    if (!s.visible) continue;                    // 🏠 오두막 안 — 벽을 뚫는 대신 안 보인다
    ch.position.set(s.x, s.bob, s.z);
    ch.rotation.y = s.ry;
    ch.scale.setScalar(s.scale);
  }
}

// 📐 측량소 — 밭 단계 증축(텃밭 → 넓은 밭 → 대농장). 닭장과 같은 문법: 부족하면 토스트, 충분하면 즉시 차감·재빌드.
//   비용은 프롬프트에 이미 보이므로 확인 모달은 없다. 확장은 바깥으로만 — 심어둔 밭·장식 좌표는 그대로.
//   창구는 울타리 밖(서쪽 문 앞 마당)에 있다 — 밭 안은 심는 공간이 제일 귀해서(사용자 결정 2026-09-13).
function surveyOfficeInteract() {
  const info = farmStageInfo(gameState.farm.stage, gameState.inventory);
  if (info.maxed) { ui.toast?.('📐 이미 가장 넓은 밭이에요', 2400); return; }
  const lack = info.items.filter(i => i.have < i.need);
  if (lack.length) {
    ui.toast?.('📐 넓히기 재료 부족 — ' + lack.map(i => `${RES_LABEL[i.k] || i.k} ${i.have}/${i.need}`).join(' · '), 3000);
    return;
  }
  const next = info.next;
  for (const k in next.cost) gameState.inventory[k] -= next.cost[k];
  if (next.cost.coins) logEcon('farm_expand', 'stage' + next.stage, -next.cost.coins, gameState.inventory.coins);   // [원장] 코인 소비 — 집 증축 'house_expand'/'stageN' 과 같은 축
  refreshInventoryUI();
  const sp = surveyDeskWorld(); doPlayerAction(sp.x, sp.z);   // 건축 제스처는 제도 탁자 앞에서
  const beforeCells = farmCellCount(farmHalf()), beforeWorkers = workerCap();
  gameState.farm.stage = next.stage;
  rebuildFarm();                                            // 조망샷 포함 — 울타리·나무·팻말·측량소가 새 반경으로
  ui.toast?.(`🌾 ${next.name} 완성! 울타리가 더 멀리 나갔어요 🎉`, 3200);
  // 숫자로도 남긴다 — 조망샷이 끝난 뒤 "뭐가 늘었는지" 한 장(사용자 지적 2026-09-13)
  const afterCells = farmCellCount(farmHalf()), afterWorkers = workerCap();
  setTimeout(() => ui.showHintModal?.({ ico: next.ico, title: next.name + ' 완성!', body:
    `🌱 심을 수 있는 칸 ${beforeCells} → ${afterCells}칸\n🧑‍🌾 일꾼 ${beforeWorkers} → ${afterWorkers}명\n심어둔 밭과 시설은 그대로예요` }), SURVEY_HOLD * 1000);
  trackEvent('farm_expand', { stage: next.stage, wood: next.cost.wood, stone: next.cost.stone, coins: next.cost.coins });   // [GA4] 증축 퍼널(집 house_expand 와 같은 축: stage)
  nearDoor = null; ui.setDoorPrompt?.(null);               // 측량소가 새 울타리 밖으로 옮겨갔다 — 옛 프롬프트를 지우고 다음 프레임에 다시 판정
  requestSave();
}

// 🐔 닭장 상호작용 — 미건설: 배지+재료로 건설 / 건설 후: 달걀 걷기 → 모이 주기(하루 루프)
function coopInteract() {
  const c = gameState.coop;
  if (!c.built) {
    if ((gameState.daily.streak || 0) < COOP_STREAK) {
      ui.showHintModal?.({ ico: '🐔', title: '닭장 터', body: `🔥 ${COOP_STREAK}일 연속 출석하면 여기에 닭장을 지을 수 있어요. 내일 또 만나요!` });
      return;
    }
    const lack = Object.entries(COOP_COST).filter(([k, v]) => (gameState.inventory[k] || 0) < v);
    if (lack.length) {
      ui.toast?.('🐔 재료 부족 — ' + lack.map(([k, v]) => `${RES_LABEL[k] || k} ${gameState.inventory[k] || 0}/${v}`).join(' · '), 3000);
      return;
    }
    for (const k in COOP_COST) gameState.inventory[k] -= COOP_COST[k];
    logEcon('coop_build', 'coop', -COOP_COST.coins, gameState.inventory.coins);   // [원장] 코인 소비
    refreshInventoryUI();
    doPlayerAction(COOP.x, COOP.z);
    buildCoop();
    ui.toast?.('🐔 닭장 완성! 모이를 주면 다음날 🥚 달걀을 낳아요', 3200);
    trackEvent('coop_build');                                                     // [GA4]
    return;
  }
  const today = todayStr(), yesterday = todayStr(-1);
  if (c.fed && c.fed !== today && c.collected !== today) {
    const eggs = c.fed === yesterday ? 2 : 1;   // 하루 걸렀으면 1개(닭이 시무룩)
    giveReward({ egg: eggs }, 'coop_collect', today);
    c.collected = today; c.fed = null;
    Sound.harvest(); spawnSparkle(player.position.x, 1.2, player.position.z, 12);
    ui.toast?.(`🥚 달걀 ${eggs}개를 얻었어요!` + (eggs === 1 ? ' (모이를 걸렀더니 시무룩…)' : ' 모이를 또 주면 내일도 낳아요'), 3000);
    trackEvent('coop_collect', { eggs });                                         // [GA4] 데일리 루프 KPI
    return;
  }
  if (c.fed !== today) {
    if ((gameState.inventory.seed || 0) < COOP_FEED) { ui.toast?.(`🌰 모이(씨앗)가 부족해요 — ${gameState.inventory.seed || 0}/${COOP_FEED}`); return; }
    gameState.inventory.seed -= COOP_FEED; refreshInventoryUI();
    c.fed = today;
    Sound.blip(); spawnFloatText(COOP.x, 1.6, COOP.z, '🐔 냠냠!', '#c9682a');
    ui.toast?.('🌰 모이를 줬어요! 내일 🥚 달걀을 낳을 거예요', 3000);
    trackEvent('coop_feed');                                                      // [GA4] 데일리 루프 KPI
    return;
  }
  ui.toast?.('🐔 오늘 할 일은 끝! 내일 달걀 걷으러 오세요');
}
// =============================================================
//  🌟 반딧불이 계곡 — 밤에만 열리는 남쪽 숲 (새 동사: 잡기)
//  낮엔 텅 빈 공터, 해가 지면 반딧불이가 피어오름 → "밤에 다시 올 이유"
// =============================================================


// =============================================================
//  🍄 채집 숲 — 새 동사: 줍기 (도구 없이, 시간이 지나면 다시 돋음)
// =============================================================


// =============================================================
//  ☕ 카페 — 채굴장처럼 처음부터 있는 장소. 홀에 앉은 손님에게 서빙
// =============================================================

// ── 손님 "공급자" — 오늘의 손님·주문·대사를 만드는 곳 ─────────────

let cafeGuestCache = null;     // { date, guests: [...] } — 외부 생성기 결과

let cafeGuestFetcher = null;   // async (ctx) => guests[]

// [확장 지점] 외부 손님 생성기 등록. fn 은 async (ctx) => [{...}] 를 반환.
//   ctx = { date, count, weather, phase, recipes:[{id,name,ico,cost}], npcs:[{id,name,emoji}] }
export function setCafeGuestSource(fn) { cafeGuestFetcher = fn || null; cafeGuestCache = null; }


// ── 마을 안 카페 건물(입구) — 채굴장 입구처럼 처음부터 서 있음 ────
//    흰 큐브 + 평지붕 파라펫 + 아치문/아치창의 모던 카페.
//    ⚠️ 벽 footprint(가로 5.2 · 세로 4.0 · 중심 z-1.2)와 문 위치(x0, 앞면 z+0.8)는
//       충돌 박스·입장 판정(z+1.3 반경 2.2)이 그대로 쓰므로 바꾸지 말 것.
// ── 🏛️ 박물관 건물(마을 서쪽) — 처음부터 서 있다 ─────────────
//   조형 검수: sims/museum-sim.html · ⚡ 재질별 병합으로 **메시 수 = 재질 수**.
//   증축(2·3층)은 수집률로 열린다 — 지금은 1층만 세운다.
// ── 🏛️ 전시실(실내) ───────────────────────────────────────────


// ── 🪞 입어보기(미리보기 전용) ───────────────────────────────


// ── 카페 홀(별도 공간) — 넓은 실내. 카운터 + 테이블 4세트 + 주문판 ──

// ── ☕ 카페 손님 3D — 캐스트 8명을 **한 번만 만들어 두고 계속 재사용**한다 ──


// =============================================================
//  🛶 나루터 & 강 내려가기 — 마을 북쪽(12시) 선착장 → 강 인스턴스 공간
//  ------------------------------------------------------------
//  ▶ 카페·채굴장과 같은 "처음부터 있는 장소" 문법: 마을 게이트 → 별도 공간 이동
//  ▶ 강 공간은 2단계 — ① 나루터 데크(걸어 다니며 배 타기/업그레이드) ② 런(1인칭 배)
//  ▶ 코스는 날짜+회차 시드로 결정 → 리롤 불가 + 전원 동일 코스(실력 비교 가능)
// =============================================================

// ── 마을 북쪽 선착장(게이트) — 여기서 액션을 누르면 강 공간으로 ──


// ── 강 공간 — 상류 나루터 데크 + 긴 강물 + 강둑 ──

// ── 하루 횟수 / 업그레이드 ──────────────────────────────────

// ── 입장 / 퇴장 ────────────────────────────────────────────

// ── 코스 생성(시드) ────────────────────────────────────────

// ── 코스 오브젝트 메시(풀 재사용) ───────────────────────────

// ── 런 시작 / 종료 ─────────────────────────────────────────


// ── 런 물리 — updatePlayer 대신 매 프레임 호출 ───────────────


// ── 1인칭 카메라 — 뱃머리 시점(멀미 대비: 흔들림 최소, 3인칭 토글 가능) ──

// ── 나루터 데크 위 근접 판정(배 타기 / 창고) — updateDoorInteract 에서 호출 ──

// =============================================================
//  🌫️ 안개 낀 숲 — 그림자 정령을 등불·♪음악으로 달래는 무폭력 웨이브
//  ------------------------------------------------------------
//  ▶ 마을 북서 게이트(처음부터 있음) → 별도 인스턴스. 숲 안은 항상 어둑+짙은 안개.
//  ▶ 하루 1회 정화(데일리): 웨이브 3회를 버티면 그날은 안개가 걷힌 밝은 숲.
//  ▶ 실패는 부드럽게 — 수호목 빛이 다 꺼지면 정령이 흩어질 뿐, 주운 ✨는 유지되고
//    켜둔 등불도 그날 내내 남아 재도전이 점점 쉬워진다(뱃놀이 문법).
// =============================================================

// ── 마을 북서 게이트 — 고목 두 그루가 만드는 어두운 입구 ──

/** 가로대 표시 갱신. 입구를 세울 때·공간이 바뀔 때·해금된 순간에 부른다(매 프레임 아님). */


// ── 숲 인스턴스 — 어두운 빈터 + 중앙 수호목 + 둘레 등불 6개 ──

// ── 하루 판정 + 상태 반영 ───────────────────────────────────

// ── 입장 / 퇴장 ────────────────────────────────────────────

// ── 🍎 과수원 언덕 — 입장 / 퇴장 ─────────────────────────────

// ── 정화 시작 / 웨이브 ──────────────────────────────────────
// ── 🎓 연습 모드 — 수줍은 정령 1마리, 빛 안 줄어듦, 컨텍스트 슬롯 4단계 안내 ──


// ── 정화 종료 — purified(성공) / faded(빛 소진) / quit(중도 퇴장) ──

// ── 매 프레임 갱신 — animate(play) 에서 호출 ─────────────────

// ── ♪ 달래기 세션 ───────────────────────────────────────────

// ── 숲 안 근접 프롬프트/액션 — updateDoorInteract / handleAction 에서 호출 ──


// =============================================================
//  집(건축) — 정해진 터, 단계별 건설
// =============================================================


// ── 따뜻한 우드 머티리얼(판자 결) — 절차 텍스처, 외부 파일 없음 ──
function woodMat(rx = 1, ry = 1, tint = 0xffffff) {
  const t = woodTexture().clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, color: tint, roughness: 0.82, metalness: 0 });
}


// =============================================================
//  집 실내(입장) + 꾸미기
// =============================================================
// =============================================================
//  🌊 바다터 — 대형 낚시 (docs/design/SEA_FISHING_PLAN.md · 프로토타입 sims/sea-sim.html)
//  포구 게이트(마을 북동) → 부두 인스턴스. 수면의 물고기를 노려 던지고,
//  버둥칠 땐 버티고(부두 끝까지 끌려가면 놓침) "당기세요!!"에 연타로 감는다.
//  참치 = "오늘의 대어"(날짜 시드 급수) → sea_records → 🏆 'sea' 리더보드.
// =============================================================

// ── 🌊 일렁이는 수면 — 정점 웨이브(사인 3겹 합성) + 깊이 그라데이션 ──


// =============================================================
//  🏠 집 실내 — 방·계단·가구 배치 (구역 머리말 — 분리 2단계)
// =============================================================

// 🌫️ 실내 메시를 날씨 안개에서 뺀다 — scene.fog 는 전역이라 안개 낀 날(near 8) 방 안까지 뿌옇게 잠겼다.
//    fog.near 를 전역으로 미는 방법은 벽 너머로 보이는 바깥 풍경까지 맑게 만들어 버린다(바깥은 안개여야 한다).
//    그래서 방·가구·손님·(들어와 있는 동안의)캐릭터 재질만 material.fog=false 로 두고 바깥은 그대로 안개에 둔다.
//    fog 는 셰이더 define 이라 바꾸면 needsUpdate 가 필요하다 — 출입 순간 한 번뿐이라 부담 없다.
function setFogExempt(obj, on) {
  obj.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) if (m.fog !== !on) { m.fog = !on; m.needsUpdate = true; }
  });
}


// 🏠 증축하면 실내 마감(바닥·계단)도 그 단계로 다시 짓는다 — 방 안에서 증축해도 즉시 반영된다.
//   방마다 등록된 창 재질을 먼저 빼고(unregisterWindows, 안 빼면 houseWindows 누수) 지오메트리·재질도 버린 뒤
//   scene 에서 떼고 다시 짓는다. 가구(decorMeshes)는 room 그룹의 자식이 아니라 손대지 않는다.
function rebuildInteriorFinish() {
  for (const id in interiorFloors) {
    const grp = interiorFloors[id];
    unregisterWindows(grp);      // 창 재질이 houseWindows 에 남지 않게(누수 방지)
    // 🚧 계단 콜라이더는 scene 그래프가 아니라 별도 colliders 배열에 산다 — scene.remove() 로는 안 빠진다.
    //    안 빼면 증축(재건축)할 때마다 안 보이는 벽이 쌓인다.
    if (grp.userData.st?.userData.collider) removeSolid(grp.userData.st.userData.collider);
    disposeTree(grp);            // 옛 방의 지오메트리·재질 GPU 자원 반환
    scene.remove(grp);
  }
  interiorFloors = {};
  buildInterior();
  setSpaceVisible();
}


// ── 🫥 가구 배치 미리보기(고스트) + 놓은 가구 옮기기 ──────────────


// =============================================================
//  🍳 작업대·자유주방·가공 클로즈업 무대 (구역 머리말 — 분리 2단계)
// =============================================================

// ── 작업대(요리) ─────────────────────────────────────────────

// ── 🍳 자유주방 — 요리 미니게임 작업장(작업대 동쪽 옆 노점형 주방) ──

// ── 🏆 랭킹 게시판 — 축제 안내판 스타일(민트 프레임 + 크림 면 + 꿀색 지붕). 나무판자 아님 ──

// ── 🍳 자유주방 클로즈업 조리 무대 — 요리 미니게임 동안 카메라가 이 세트로 넘어간다 ──
let mgView = null;    // { type: 'pot'|'chop' } — 활성이면 카메라가 조리대 클로즈업 고정


/** 멈춘 순간 — 잘 맞으면 확 타오르며 불티가 뜬다 */

/** 🍷 밟는 순간 — 통 언저리에서 포도색 알갱이가 튄다(불 조절의 craftFlameBurst 와 같은 자리) */

/** 그 시설의 🪧 팻말 — 클로즈업에선 카메라 앞으로 튀어나와 글자가 시설만큼 커 보인다 */


// =============================================================
//  🗿 조각 공방 — 깎기 미니게임 (구역 머리말 — 분리 2단계)
// =============================================================

// ── 🗿 조각 공방 — 작업대 미니게임(깎기) ─────────────────────────
const raycaster = new THREE.Raycaster();              // (기존 tryPlaceDecor 미선언 참조도 이 선언으로 해결)
const pointer = new THREE.Vector2();


function updateCarveScene(dt, t) {
  if (!wset) return;
  applyCarveCamera();
  if (wset.trauma > 0) wset.trauma = Math.max(0, wset.trauma - 2.4 * dt);   // 셰이크는 스스로 잦아든다
  if (wset.strikeT >= 0) {                                // 끌 콕(0~0.07 파고듦 → 0.2 복귀)
    wset.strikeT += dt;
    const k = wset.strikeT;
    wset.chisel.position.z = 0.62 - (k < 0.07 ? (k / 0.07) * 0.2 : k < 0.2 ? 0.2 - ((k - 0.07) / 0.13) * 0.2 : 0);
    if (k >= 0.2) { wset.strikeT = -1; wset.chisel.visible = false; }
  }
  if (wset.popT >= 0) {                                   // 오버슈트 팝(1→1.14→1, back-ease 근사)
    wset.popT += dt;
    const k = Math.min(1, wset.popT / 0.5);
    wset.blockGroup.scale.setScalar(1 + 0.14 * Math.sin(k * Math.PI) * (1 - k * 0.4));
    if (k >= 1) { wset.popT = -1; wset.blockGroup.scale.setScalar(1); }
  }
  if (wset.spinT >= 0) {                                  // 턴테이블 한 바퀴(ease-out settle)
    wset.spinT += dt;
    const k = Math.min(1, wset.spinT / 1.3);
    wset.blockGroup.rotation.y = Math.PI * 2 * (1 - Math.pow(1 - k, 3));
    if (k >= 1) { wset.spinT = -1; wset.blockGroup.rotation.y = 0; }
  }
  for (let i = wset.debris.length - 1; i >= 0; i--) {     // 파편 포물선 + 축소 소멸
    const f = wset.debris[i];
    f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt;
    f.vy -= 8 * dt; f.m.rotation.x += f.rx * dt; f.life -= dt;
    f.m.scale.setScalar(Math.max(0.001, f.life / 0.55));
    if (f.life <= 0) { f.m.parent?.remove(f.m); f.m.geometry.dispose(); wset.debris.splice(i, 1); }
  }
  wset.light.intensity = 1.15 + 0.05 * Math.sin(t * 9);
}

// =============================================================
//  🎬 프롤로그 컷신 (구역 머리말 — 분리 2단계)
// =============================================================

// ── 🎬 프롤로그 컷신 — 회색 도시의 지친 밤 → calm forest 도착 ──


// =============================================================
//  🛒 상점 좌판·시세판·사고팔기 (구역 머리말 — 분리 2단계)
// =============================================================


// ── 📊 시세 전광판 — 상점 옆. 보드에 오늘의 최고/최저 품목이 직접 표시되고,
//    가까이 가서 상호작용하면 전체 시세판 모달이 열림(초보자 발견용) ──


// =============================================================
//  🍳 요리 코스·찬장·도구 제작·버프 (구역 머리말 — 분리 2단계)
// =============================================================

// ── 🍳 자유주방 — 요리 미니게임(코스). 결과 점수(0~100)가 요리 등급 → 버프 지속 배율을 정한다 ──
function cookTier(score) { return COOK_TIERS.find(t => score >= t.min) || COOK_TIERS[COOK_TIERS.length - 1]; }


function pantryHas(recipeId) { return (gameState.pantry || []).findIndex(f => f.id === recipeId); }   // 없으면 -1

// 요리 시작 — 재료를 먼저 소비(중도 포기해도 요리는 낮은 등급으로 완성 → 재시도 악용 방지)
//   where: 'kitchen'(자유주방) | 'cafe'(카페에서 손님 앞 조리)
function kitchenStart(id, where = 'kitchen') {
  const r = recipeOf(id); if (!r) return { ok: false };
  for (const k in r.cost) {
    if ((gameState.inventory[k] || 0) < r.cost[k]) return { ok: false, msg: `${RES_LABEL[k] || k}이(가) 부족해요` };
  }
  for (const k in r.cost) gameState.inventory[k] -= r.cost[k];
  refreshInventoryUI();
  // 🎚️ 스테이지마다 팔이 갈린다 — 한 판(★3이면 3스테이지)에서 표본이 세 개 나온다.
  //    courseOf 는 메뉴판(kitchenView)도 부르므로 여기서만 뽑는다. 거기서 뽑으면 메뉴를 열 때마다 순회가 돈다.
  const base = courseOf(r);
  cookDiffs = base.map(() => rollDifficulty('cook'));
  const course = base.map((s, i) => ({ ...s, mult: s.mult * cookDiffs[i].ease }));
  trackEvent('cooking_start', { recipe: id, mg_type: course.map(s => s.mg).join('>'), diff: recipeDiff(r), where });   // [GA4] 미니게임 퍼널: 시작
  return { ok: true, id, where, name: r.name, ico: r.ico, diff: recipeDiff(r), course,
    icos: Object.keys(r.cost).map(k => SELL_ICO_G[k] || '📦') };   // icos: 조리 장면 연출용 재료 아이콘
}

let cookDiffs = [];   // 🎚️ 이번 코스의 스테이지별 난이도 — kitchenStart 가 채우고 kitchenFinish 가 로깅한다
let pendingDish = null;   // 🍽️ 결과 화면에서 "먹기/보관"을 고르기 전의 요리 { id, tier, score }

// 요리 완성 — 코스 결과를 받아 등급 판정 + 기록/트래킹. **버프는 여기서 걸지 않는다**
//   (음식이 아이템이 된 뒤로 "만들기"와 "먹기"가 분리됐다 → cookResolve 가 마무리)
// res: { score(0~100), offsets[], maxCombo, judges:{perfect,good,miss}, durationMs, abandoned, step, stageScores[] }
function kitchenFinish(id, res = {}) {
  const r = recipeOf(id); if (!r) return { ok: false };
  const score = Math.max(0, Math.min(100, Math.round(res.score || 0)));
  const tier = cookTier(score);
  const st = gameState.kitchen;
  st.cooked = (st.cooked || 0) + 1;
  st.tiers[tier.id] = (st.tiers[tier.id] || 0) + 1;
  const isBest = score > (st.best[id] || 0);
  if (isBest) st.best[id] = score;
  Sound.harvest();
  if (tier.id === 'perfect') { Sound.complete(); spawnConfetti(player.position.x, 2.2, player.position.z); }
  spawnFloatText(player.position.x, 1.4, player.position.z, `${r.ico} ${tier.ico} ${tier.name}!`, '#c9682a');
  spawnSparkle(player.position.x, 0.9, player.position.z, tier.id === 'perfect' ? 26 : 14);
  dexDiscover('cook', id);                                   // 📖 도감(첫 요리)
  questEvent('cook');                                        // 요리사 퀘스트/데일리 진행
  triggerMoment();                                           // 📷 순간 줌인
  syncStory();                                               // 📖 3장(마을의 맛) 진행
  // [GA4] 게임업계식 미니게임 결과 지표 — 탭별 타이밍(ms)·정확도·콤보·등급·누적 진행도까지 한 행에
  const offsets = (res.offsets || []).map(v => Math.round(v));
  const j = res.judges || {};
  settleDifficulty('cook', score / 100);   // 🎚️ 점수 게임 — 0~1 로 정규화. 1주 차엔 ddaOn:false 라 값이 안 움직인다
  trackEvent(res.abandoned ? 'cooking_abandon' : 'cooking_result', {
    recipe: id, mg_type: r.stages.join('>'), diff: recipeDiff(r), quality: tier.id, score,
    stage_scores: (res.stageScores || []).map(v => Math.round(v)).join(','),   // 단계별 점수(어느 판에서 무너지는지)
    avg_offset_ms: offsets.length ? Math.round(offsets.reduce((a, b) => a + Math.abs(b), 0) / offsets.length) : null, // 평균 절대 오차(정밀도)
    offsets: offsets.join(','),                              // 탭별 원본 타이밍(부호=빠름/늦음)
    max_combo: res.maxCombo || 0,
    n_perfect: j.perfect || 0, n_good: j.good || 0, n_miss: j.miss || 0,
    duration_ms: Math.round(res.durationMs || 0),
    step: res.step ?? null,                                  // 포기 시 어느 단계까지 갔는지(퍼널 이탈 지점)
    is_best: isBest ? 1 : 0, total_cooked: st.cooked,        // 유저 진행도(누적 요리 수)
    // 🎚️ 스테이지마다 팔이 다르므로 배열로 싣는다. 탭별 offsets 와 맞물려 탭 단위 분석이 된다.
    arms:  cookDiffs.map(d => d.arm).join(','),
    eases: cookDiffs.map(d => Math.round(d.ease * 100) / 100).join(','),
    dda:   Math.round((cookDiffs[0]?.dda ?? 1) * 100) / 100,
  });
  pendingDish = { id, tier: tier.id, score };
  return {
    ok: true, name: r.name, ico: r.ico, score, isBest, cooked: st.cooked,
    tier: { id: tier.id, ico: tier.ico, name: tier.name, mult: tier.mult },
    buff: { ...BUFF_META[r.buff], dur: buffDur(r, tier) },
    canStore: (gameState.pantry || []).length < PANTRY_MAX,
    pantryFull: (gameState.pantry || []).length >= PANTRY_MAX,
  };
}


// 🍱 찬장에서 한 칸 빼기(카페 서빙용) — 있으면 그 음식을, 없으면 null
function pantryTake(recipeId) {
  const i = pantryHas(recipeId); if (i < 0) return null;
  return gameState.pantry.splice(i, 1)[0];
}


// =============================================================
//  🪵 야외 장식·창고·선물 (구역 머리말 — 분리 2단계)
// =============================================================

// 야외 장식 메시(절차적)
function outdoorMesh(id) {
  const g = new THREE.Group();
  if (isFarmBuilding(id)) {   // 🏗️ 밭 시설 7종 — 배치·고스트 둘 다 이 함수를 쓴다(여기 없으면 투명하게 놓인다)
    farmBuildingMesh(id, g);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return g;
  }
  if (id === 'fence') {
    for (const x of [-0.5, 0.5]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), woodMat(1, 1)); p.position.set(x, 0.3, 0); g.add(p); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.08), woodMat(2, 1)); rail.position.y = 0.42; g.add(rail);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.08), woodMat(2, 1)); rail2.position.y = 0.22; g.add(rail2);
  } else if (id === 'scarecrow') {
    // 🧙 마법사 허수아비 — 삼베 자루 머리 + 파란 고깔모자 + 널빤지 십자 뼈대(사용자 지시 2026-09-15).
    //   호박 머리 시절엔 실루엣이 밋밋했다. 모자의 파랑 하나만 강한 색으로 두고 나머지는 나무·삼베·짚의
    //   흙색으로 묶어, 멀리서도 "밭을 지키는 사람 형상"으로 읽히게 한다.
    const WOOD = clayMat(0x7b5a36), ARM = clayMat(0x8a6a3a), CLOTH = clayMat(0xb9b6ae), STRAW = clayMat(0xd9b25f), FACE = clayMat(0x4a3a2a, false);
    // 뼈대 — 쪼갠 널빤지 기둥에 팔 두 짝을 바깥쪽이 들리게 붙인다(양팔을 벌린 자세)
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.5, 0.12), WOOD); post.position.y = 0.75; g.add(post);
    for (const sx of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.13), ARM);
      arm.position.set(sx * 0.34, 1.13, 0); arm.rotation.z = sx * 0.13; g.add(arm);
    }
    // 어깨를 동인 천 — 팔과 기둥이 만나는 이음매를 가린다
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.16), CLOTH); wrap.position.y = 1.14; g.add(wrap);
    // 목덜미로 삐져나온 짚
    for (const sx of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 5), STRAW);
      t.position.set(sx * 0.11, 1.3, 0.02); t.rotation.z = sx * 0.9; g.add(t);
    }
    // 삼베 자루 머리 + 꿰맨 × 눈 두 짝, 축 처진 입
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), clayMat(0xe6d7b8, false));
    head.position.y = 1.45; head.scale.set(1, 1.12, 0.95); g.add(head);
    for (const sx of [-1, 1]) for (const d of [1, -1]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.016, 0.016), FACE);
      st.position.set(sx * 0.075, 1.47, 0.165); st.rotation.z = d * 0.78; g.add(st);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.018, 0.018), FACE); mouth.position.set(0, 1.36, 0.17); g.add(mouth);
    // 🔮 파란 고깔모자 — 넓은 챙 + 띠 + 살짝 기운 뿔(이 장식의 유일한 강한 색)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.05, 12), clayMat(0x2f4a7a)); brim.position.y = 1.6; g.add(brim);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.07, 12), clayMat(0x1e3252)); band.position.y = 1.655; g.add(band);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 12), clayMat(0x35538a));
    cone.position.set(0.03, 1.93, 0); cone.rotation.z = -0.1; g.add(cone);
  } else if (id === 'path') {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 8), clayMat(0xbfae95, false)); s.position.y = 0.04; s.scale.z = 0.8; g.add(s);
  } else if (id === 'flowerbed') {
    const soil = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.16, 0.7), clayMat(0x7a5230)); soil.position.y = 0.08; g.add(soil);
    [0xff8fab, 0xffd36e, 0xa78bfa, 0xff9e5e].forEach((c, i) => {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), clayMat(0x7fbf6a)); st.position.set(-0.3 + i * 0.2, 0.18, 0); g.add(st);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), clayMat(c, false)); b.position.set(-0.3 + i * 0.2, 0.3, 0); g.add(b);
    });
  } else if (id === 'postlamp') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.4, 6), clayMat(0x5a5148)); pole.position.y = 0.7; g.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfff2a8, emissive: 0xffca70, emissiveIntensity: 0, roughness: 0.6 });
    houseWindows.push(headMat);   // 밤에 창문/가로등과 함께 점등
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), headMat); head.position.y = 1.5; g.add(head);
  } else if (id === 'stonewall') {
    const smat = clayMat(0x9a9a92, false);
    [[-0.35, 0.18, 0], [0.35, 0.18, 0], [0, 0.5, 0]].forEach(([x, y, z]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.4), smat); b.position.set(x, y, z); g.add(b);
    });
  } else if (id === 'brazier') {
    const legMat = clayMat(0x5a5148);
    for (const a of [0, 2.1, 4.2]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 5), legMat); l.position.set(Math.cos(a) * 0.18, 0.25, Math.sin(a) * 0.18); g.add(l); }
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.2, 0.22, 10), clayMat(0x4a4844, false)); bowl.position.y = 0.55; g.add(bowl);
    const fireMat = new THREE.MeshStandardMaterial({ color: 0xff8a3a, emissive: 0xff6a1a, emissiveIntensity: 0, roughness: 0.5 });
    houseWindows.push(fireMat);   // 밤에 점등
    const fire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), fireMat); fire.position.y = 0.68; g.add(fire);
  } else if (id === 'spiritlamp') {
    // ✨ 정령 등불 — 굽은 가지 모양 기둥 + 정령빛(청록) 구슬. 밤에 houseWindows 와 함께 점등
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.3, 6), clayMat(0x4a5a58)); pole.position.y = 0.65; pole.rotation.z = 0.12; g.add(pole);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xbef3ea, emissive: 0x5fe8d0, emissiveIntensity: 0, roughness: 0.5 });
    houseWindows.push(headMat);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.19, 0), headMat); head.position.set(0.16, 1.36, 0); g.add(head);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 5, 12), clayMat(0x4a5a58)); ring.position.set(0.16, 1.36, 0); g.add(ring);
  } else if (id === 'kiln') {
    // 🔥 화덕 — sims/kiln-sim.html 에서 확정한 C안(낮은 아궁이). 상판이 표시 면이라
    //    완성물이 쌓이면 가까이 가지 않아도 "다 구워졌다" 가 읽힌다.
    //    상태별 부분을 미리 만들어 두고 visible 로 토글한다(refreshStations) — 안 보이면 드로우콜도 안 잡힌다.
    const KC = { body: 0x9a7358, ledge: 0x7d5c46, top: 0xcfc7b0, hole: 0x4a4844 };   // 시안 확정색. body 를 0x5a5148 로 두면 낮에 검게 읽힌다
    // 마을에서 너무 작게 읽혔다 — 시안 비례는 그대로 두고 안쪽 그룹만 키운다.
    // 바깥 g 에 걸면 설치 애니메이션(m.scale.setScalar(0.01))이 덮어쓴다.
    const kg = new THREE.Group(); kg.scale.setScalar(KILN_SCALE); g.add(kg);
    // ⚡ 몸통·상판·아궁이·장작단은 색만 다르다 → 정점색으로 한 덩이(4 → 1 드로우콜).
    //    아궁이 입은 **하나**. 둘이면 눈이 되어 얼굴로 읽힌다(시안 1차 실패)
    kg.add(new THREE.Mesh(mergeGeos([
      paintGeo(new THREE.BoxGeometry(1.5, 0.98, 0.86).translate(0, 0.49, 0), KC.body),
      paintGeo(new THREE.BoxGeometry(1.64, 0.14, 1.0).translate(0, 1.05, 0), KC.top),
      paintGeo(new THREE.CylinderGeometry(0.29, 0.29, 0.5, 10, 1, false, 0, Math.PI)
        .rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(-0.3, 0.42, 0.26), KC.hole),
      paintGeo(new THREE.BoxGeometry(0.52, 0.22, 0.34).translate(0.44, 0.25, 0.58), KC.ledge),
    ]), vtxMat()));

    // 장작 — 빈 화덕·굽는 중에만. 2개를 한 덩어리로(1 드로우콜)
    const logs = new THREE.Mesh(mergeGeos([[0.42, 0.42, 0.04], [0.46, 0.51, -0.05]].map(([lx, ly, rz]) =>
      new THREE.CylinderGeometry(0.055, 0.055, 0.44, 6).rotateZ(Math.PI / 2 + rz).rotateY(0.22).translate(lx, ly, 0.58))), clayMat(0x6b4a34));
    kg.add(logs);

    // 불꽃 — 원뿔은 "고깔"로 읽혔다(시안 1차 실패). 옆모습 프로필을 LatheGeometry 로 돌린다.
    //    밑동이 불룩하고 중간이 잘록해지다 끝이 가늘게 빠진다. 떠오르는 불똥은 쓰지 않는다.
    const fire = new THREE.Group(); fire.position.set(-0.3, 0.3, 0.52); kg.add(fire);
    const flameProfile = (sc, tall) => [[0.002, 0], [0.085, 0.035], [0.108, 0.10], [0.088, 0.185], [0.048, 0.278], [0.013, 0.355], [0.001, 0.44]]
      .map(([x, yy]) => new THREE.Vector2(x * sc, yy * tall));
    for (const f of [{ c: 0xff7320, e: 0xff3d00, sc: 1.0, t: 1.0, sp: 6.8, ph: 0, spin: 0.9 },
                     { c: 0xffd44e, e: 0xffab10, sc: 0.52, t: 0.66, sp: 10.6, ph: 2.3, spin: -1.5 }]) {
      const m = new THREE.MeshStandardMaterial({ color: f.c, emissive: f.e, emissiveIntensity: 0.95, roughness: 0.55 });
      houseWindows.push(m);                                   // 밤에 더 밝게
      const mesh = new THREE.Mesh(new THREE.LatheGeometry(flameProfile(f.sc, f.t), 6), m);
      fire.add(mesh); kilnFlames.push({ mesh, sp: f.sp, ph: f.ph, spin: f.spin });
    }

    // 상판 산출물 — 다 구워졌을 때만. 숯 3덩이·포대 2개가 각각 1 드로우콜
    const load = new THREE.Group(); kg.add(load);
    const ly0 = 1.12;
    // ⚡ 숯(검정)과 포대(베이지)도 색만 다르다 → 정점색으로 한 덩이(2 → 1 드로우콜).
    //    포대는 **눕혀 쌓는다**. 세우면 목·매듭이 생겨 도자기·등대로 읽혔다(시안 2회 실패)
    load.add(new THREE.Mesh(mergeGeos([
      ...[[-0.42, -0.1, 0.11], [-0.28, 0.08, 0.09], [-0.46, 0.14, 0.075]].map(([x, z, r]) =>
        paintGeo(new THREE.IcosahedronGeometry(r, 0).rotateX(0.4).rotateY(0.8).translate(x, ly0 + r * 0.7, z), 0x2f2b28)),
      paintGeo(new THREE.CapsuleGeometry(0.1, 0.18, 2, 5).scale(1, 0.82, 1).rotateZ(Math.PI / 2).translate(0.3, ly0 + 0.085, 0.02), 0xf2ead6),
      paintGeo(new THREE.CapsuleGeometry(0.088, 0.14, 2, 5).scale(1, 0.82, 1).rotateZ(Math.PI / 2).rotateY(0.42).translate(0.315, ly0 + 0.23, -0.015), 0xf2ead6),
    ]), vtxMat()));

    // 🪧 팻말 — 채굴장·측량소와 같은 문법. kg(1.35배) 밖에 둬야 다른 팻말과 크기가 같다.
    //    makeSignpost 가 기둥 충돌체까지 등록한다.
    //    z 0.35 는 상판(±0.68) 안쪽이라 천장에 박혀 보였다 — 앞으로 당긴다(2026-09-20 실측)
    g.userData.sign = makeSignpost('🔥 화덕', 1.38, 0.8); g.add(g.userData.sign);

    g.userData.station = { fire, load, logs };
  } else if (id === 'vat') {
    // 🫙 발효통 — 조형은 js/craft/vat-model.js(sims/vat-sim.html B안). 색만 다른 부품을
    //    정점색으로 한 덩이씩 묶어 정적 1 + 익는 중 1 + 다 됨 1 = 3 드로우콜로 끝낸다.
    const { group, parts } = buildVatModel(THREE, { paint: paintGeo, vtx: vtxMat, merge: mergeGeos });
    g.add(group);
    // 팻말은 통 **옆**으로 물린다. 클로즈업 동안엔 아예 숨긴다(stationSign) —
    //   카메라 앞으로 튀어나와 글자가 통만큼 커 보였다(사용자 지적 2026-09-21)
    g.userData.sign = makeSignpost('🫙 발효통', 1.62, 0.2); g.add(g.userData.sign);
    g.userData.station = parts;
  }
  // 그림자는 기본으로 켜되, noShadow 를 단 가지는 통째로 뺀다 —
  //   섀도맵 텍셀보다 작은 소품은 카메라가 움직일 때마다 그림자가 지글거린다(사용자 지적 2026-09-21).
  //   traverse 는 형제로 넘어가도 상태가 남으니 플래그를 들고 다니지 말고 **부모 사슬**을 본다
  const noShadowUnder = (o) => { for (let p = o; p; p = p.parent) if (p.userData?.noShadow) return true; return false; };
  g.traverse(o => { if (o.isMesh) o.castShadow = !noShadowUnder(o); });
  return g;
}

// 야외 장식 설치 (플레이어 위치에). silent=true 면 저장 복원 · 들어 올린 걸 다시 놓으면(pickedOutdoor) 값 없음 · 🧺 보관분이 있으면 값 없이 꺼내 놓는다
function placeOutdoor(wx, wz, silent = false, id = placingOutdoor, rot = null) {
  const def = OUTDOOR.find(d => d.id === id); if (!def) return false;
  const ry = (((rot == null ? decorRot : rot) % 4) + 4) % 4;   // ↻ 90° 4방향 — 실내 가구와 같은 규칙
  if (def.farm) {   // 🏗️ 밭 시설 — 밭 격자에 스냅 + 텃밭 안·울타리 안·밭 위 아님·시설 겹침 없음(규칙 js/farm-building.js). 복원(silent)은 검사 없이
    [wx, wz] = snapCenter(wx, wz, def.fp, ry);
    if (!silent) {
      const v = canPlaceBuilding({ def, x: wx, z: wz, rot: ry, atFarm, center: FARM, half: farmHalf(), plots, buildings: farmBuildingRecs(pickedOutdoor?.rec || null), yard: surveyYard(farmHalf()) });
      if (!v.ok) { ui.toast?.(FARM_PLACE_MSG[v.reason], 2400); return false; }   // 배치 모드는 유지 — 자리를 옮겨 다시
    }
  }
  // 📐측량소 마당 — 밭 시설이든 장식이든 새로 놓지 못하게 막는다(사용자 지시 2026-09-21).
  //   🔥🫙 가공 시설만 예외: 게임이 기본으로 놓아 주고, 플레이어는 마당 안에서 자리만 고친다.
  if (!silent && !def.farm && !STATION_IDS.includes(id) && atFarm) {
    const y = surveyYard(farmHalf()), lx = wx - FARM.x, lz = wz - FARM.z;
    if (lx >= y.x0 && lx <= y.x1 && lz >= y.z0 && lz <= y.z1) { ui.toast?.(FARM_PLACE_MSG.yard, 2400); return false; }
  }
  const moved = !silent && !!pickedOutdoor;                                   // 🪵 옮겨 놓기(비용 없음)
  const taken = (!silent && !moved) ? takeStored(gameState.outdoorStored, id) : null;   // 🧺 보관분 우선
  if (taken) gameState.outdoorStored = taken;
  if (!silent && !moved && !taken) {
    for (const k in def.cost) {
      if ((gameState.inventory[k] || 0) < def.cost[k]) { ui.toast?.((RES_LABEL[k] || k) + '이(가) 부족해요'); return false; }
    }
    for (const k in def.cost) gameState.inventory[k] -= def.cost[k];
    refreshInventoryUI();
  }
  const m = outdoorMesh(id); m.position.set(wx, 0, wz); m.rotation.y = ry * Math.PI / 2; scene.add(m); outdoorMeshes.push(m);
  // 들고 있던 장식은 저장 레코드를 그대로 쓴다(들고 있는 동안 세이브가 나가도 분실되지 않게 목록에 남겨 둔다) — 옮겨 놓기·제자리 복귀 모두
  const carried = pickedOutdoor && pickedOutdoor.id === id ? pickedOutdoor.rec : null;
  const rec = carried ? Object.assign(carried, { x: wx, z: wz, rot: ry }) : { id, x: wx, z: wz, rot: ry };
  if (!gameState.outdoor.includes(rec)) gameState.outdoor.push(rec);
  markHabitatDirty();   // 🦋 환경 점수 즉시 반영 — 1초 스로틀을 기다리면 미터가 한 박자 늦는다
  let ob, solid;
  if (def.farm) {   // 🏗️ 시설: 덮는 칸마다 밭 금지 원(r 0.1 + isBlocked 의 0.95 = 그 칸만) + 발자국 사각 충돌체(칸 경계 0.35 안쪽)
    ob = buildingCells(def.fp, wx, wz, ry).map(([cx, cz]) => ({ x: cx, z: cz, r: 0.1 })); obstacles.push(...ob);
    const [w, d] = rotatedFp(def.fp, ry), hw = w * FARM_CELL / 2 - 0.35, hd = d * FARM_CELL / 2 - 0.35;
    solid = solidBox(wx - hw, wz - hd, wx + hw, wz + hd);
  } else {
    ob = { x: wx, z: wz, r: 0.8 }; obstacles.push(ob);   // 그 위엔 밭 금지
    // 🚧 울타리·돌담·정원등·화로·허수아비는 막고, 디딤돌·꽃밭은 밟고 지나갈 수 있게
    if (id === 'kiln') {
      // 🔥 화덕 — 목록에 없어서 캐릭터가 통과했다(2026-09-20 실측). 옆으로 긴 덩어리라 원이 아니라 박스,
      //    회전(ry 0~3)에 따라 가로·세로를 바꾼다. 반치수는 몸통 1.5×0.86 에 KILN_SCALE 을 곱한 값.
      const [hw, hd] = (ry % 2) ? [0.58, 1.01] : [1.01, 0.58];
      solid = solidBox(wx - hw, wz - hd, wx + hw, wz + hd);
      obstacles.pop(); ob = { x: wx, z: wz, r: 1.2 }; obstacles.push(ob);   // 밭·나무 금지 반경도 몸집에 맞춘다
    } else if (id === 'vat') {
      // 🫙 발효통 — 화덕과 같은 문법. 반치수는 조형 모듈이 준 발자국(VAT_BOX)의 절반
      const [hw, hd] = (ry % 2) ? [VAT_BOX.d / 2, VAT_BOX.w / 2] : [VAT_BOX.w / 2, VAT_BOX.d / 2];
      solid = solidBox(wx - hw, wz - hd, wx + hw, wz + hd);
      obstacles.pop(); ob = { x: wx, z: wz, r: 1.2 }; obstacles.push(ob);
    } else solid = ['fence', 'stonewall', 'postlamp', 'brazier', 'scarecrow', 'spiritlamp'].includes(id) ? solidCircle(wx, wz, ['postlamp', 'scarecrow', 'spiritlamp'].includes(id) ? 0.22 : 0.5) : null;
  }
  m.userData.rec = rec; m.userData.obstacle = ob; m.userData.solid = solid;   // 🪵 들어 올릴 때 레코드·밭 금지 구역·충돌체를 같이 뺀다(시설은 obstacle 이 배열)
  if (STATION_IDS.includes(id)) {
    refreshStations();                     // 🔥🫙 방금 놓은 시설의 겉모습을 슬롯 상태에 맞춘다
    // [GA4] 몇 채째를 짓는가 — 2·3채를 짓는다는 건 슬롯이 모자랄 만큼 쓰고 있다는 뜻이다.
    //   silent(세이브 복원·기본 지급)는 제외해야 '지은 것' 만 잡힌다.
    if (!silent) trackEvent('craft_station_build', { station: id, seq: stationCount(id) });
  }
  if (!silent) {
    m.userData.pop = 1; m.scale.setScalar(0.01);
    Sound.blip(); spawnFloatText(wx, 1.0, wz, def.ico + ' 설치!', '#2fa564');
    if (moved) trackEvent('move_outdoor', { item: id });                                   // [GA4] 옮겨 놓기
    else trackEvent('craft_item', { category: def.farm ? 'farm_building' : 'outdoor', item: id, from: taken ? 'store' : 'craft' });  // [GA4] 시설은 category 로 구분
    if (def.farm && !moved && !taken && def.cost.coins) logEcon('farm_building', id, -def.cost.coins, gameState.inventory.coins);   // [원장] 코인 든 시설만
    // 🦉 의뢰(야외 장식 놓기) — 새로 만들어 놓은 것만 센다.
    //   옮겨 놓기(moved)·🧺보관분 꺼내기(taken)까지 세면 같은 장식을 넣었다 뺐다 하며 무한히 채울 수 있다.
    if (!moved && !taken) questEvent('decor');
    if (ghostFarmDef) ui.setZoneHint?.(null);   // 🏗️ 배치 안내 줄 정리
    outdoorTarget.pinned = false;
    pickedOutdoor = null; placingOutdoor = null; removeDecorGhost(); ui.onDecorPlaced?.();   // 배치 모드 종료(1회) — 들었던 장식은 새 자리에 놓였다
    requestSave();
  }
  return true;
}
// 🪵 배치 모드 종료 — 들어 올린 장식이면(putBack) 원래 자리에 값 없이 되돌린다(실내 stopDecorPlacing 과 같은 규칙)
function stopOutdoorPlacing(putBack) {
  if (ghostFarmDef) ui.setZoneHint?.(null);   // 🏗️ 배치 안내 줄 정리
  outdoorTarget.pinned = false;
  if (pickedOutdoor && putBack) placeOutdoor(pickedOutdoor.x, pickedOutdoor.z, true, pickedOutdoor.id, pickedOutdoor.rot);
  pickedOutdoor = null; placingOutdoor = null; removeDecorGhost();
}


// =============================================================
//  🪧 표지판·텃밭 게이트·측량소·텃밭 필드 (구역 머리말 — 분리 2단계)
// =============================================================

// 캔버스 글자 표지판(persistent)
function makeSignBoard(text) {
  const W = 640, H = 260;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  // 나무판 + 위/아래 테두리
  c.fillStyle = '#e8d3a8'; c.fillRect(0, 0, W, H);
  c.fillStyle = '#c9a86e'; c.fillRect(0, 0, W, 22); c.fillRect(0, H - 22, W, 22);
  c.fillStyle = '#8a6a3a'; c.fillRect(0, 0, W, 9); c.fillRect(0, H - 9, W, 9);
  // 이모지는 캔버스에서 기기(iOS 등)마다 폭 측정/렌더가 달라 글자가 삐져나감 → 판엔 한글만
  const label = t(text).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
  // 글자 폭을 재서 판 안에 딱 맞게 폰트 자동 축소(넉넉한 양옆 여백 → 잘림 방지)
  const maxW = W - 130;
  const fontFor = (s) => `bold ${s}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  let fs = 128;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = fontFor(fs);
  while (fs > 40 && c.measureText(label).width > maxW) { fs -= 4; c.font = fontFor(fs); }
  c.fillStyle = '#4a3a24';
  c.fillText(label, W / 2, H / 2 + 2);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter; tex.anisotropy = 4;
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });   // 글자 면(앞뒤)
  const side = new THREE.MeshStandardMaterial({ color: 0xcdb083, roughness: 0.85 }); // 옆·위·아래(나무색)
  // BoxGeometry 면 순서: [+X, -X, +Y(위), -Y(아래), +Z(앞), -Z(뒤)] → 글자는 앞뒤만
  const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2 * H / W, 0.1), [side, side, side, side, face, face]);
  return m;
}

// 서 있는 팻말(나무 기둥 + 판) — 로컬 (x,z)에 세움
function makeSignpost(text, x = 0, z = 1.3) {
  const grp = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.5, 6), woodMat(1, 1)); post.position.set(x, 0.75, z); post.castShadow = true; grp.add(post);
  const sign = makeSignBoard(text); sign.scale.setScalar(0.55); sign.position.set(x, 1.45, z + 0.04); grp.add(sign);
  // 🚧 기둥 충돌 — 캐릭터가 팻말을 뚫고 들어가 판이 머리를 가리던 문제.
  //    월드 좌표는 부모 그룹 배치 뒤에야 확정되므로 다음 프레임에 등록한다.
  //    (출입 판정은 반경 1.9 근접이라 r0.3 기둥이 문을 막지 않음)
  //    콜라이더는 grp.userData.solid 에 보관 — 팻말이 든 그룹을 다시 지을 때(rebuildFarm) removeSolid 로 같이 치운다.
  //    같은 틱에 두 번 다시 지으면(세이브 복원 직후 ?farmstage=) 첫 팻말의 rAF 가 철거 뒤에 도는데, 그때 등록하면
  //    아무도 못 치우는 고아 벽이 된다 → 철거된 그룹(userData.dead)은 등록을 건너뛴다.
  requestAnimationFrame(() => { if (grp.userData.dead) return; const wp = new THREE.Vector3(); post.getWorldPosition(wp); grp.userData.solid = solidCircle(wp.x, wp.z, 0.3); });
  return grp;
}


// =============================================================
//  🦋 텃밭 방문객 안내 (구역 머리말 — 분리 2단계)
// =============================================================

// ── 🦋 텃밭 방문객 — 스폰·등록은 js/farm-visitors.js, 판정은 js/habitat.js ──

let lastNearMiss = {};   // 🦋 이번 배치 세션에 이미 쏜 근접 신호 { 종id: 1 } — 폭주 방지(updateHabitatMeter 주석)


// =============================================================
//  ⛏️ 채굴 동굴 (구역 머리말 — 분리 2단계)
// =============================================================

// ── 채굴 동굴 ─────────────────────────────────────────────────
const ORES = [
  { id: 'stone', name: '돌',   color: 0x9a9a92 },
  { id: 'coal',  name: '석탄', color: 0x2a2a2a },
  { id: 'gem',   name: '보석', color: 0x5ad0e0 },
];


// =============================================================
//  🚪 침대·문 근접·구역 안내 (구역 머리말 — 분리 2단계)
// =============================================================


/** 🪜 층 이동 — 계단을 걸어 올라가지 않는다(스펙 §4.2). 같은 자리에 서서 층만 바뀐다. */


// 🌟🍄 존(구역) 안내 — 도구로 상호작용하는 넓은 구역용.
//   setDoorPrompt 와 달리 액션 버튼 아이콘을 뺏지 않아, 구역 안에서도 도구질이 그대로 됨.
let lastZoneHint = null;

// =============================================================
//  포스트 프로세싱
// =============================================================
function initPostProcessing() {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // 모바일은 블룸 해상도를 절반으로 낮춰 부담 감소
  const bloomRes = IS_MOBILE ? new THREE.Vector2(window.innerWidth / 3, window.innerHeight / 3) : new THREE.Vector2(window.innerWidth, window.innerHeight);   // 모바일은 1/3 — 어차피 번지는 효과라 눈에 안 띄고 필레이트가 크게 준다
  bloomPass = new UnrealBloomPass(bloomRes, 0.55, 0.9, 0.85); // 세기는 낮/밤에 따라 조절
  composer.addPass(bloomPass);

  // [셰이더] 비네팅 + 따뜻한 컬러 그레이딩 + 밤 푸른 톤(uNight)
  gradePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null }, uVignette: { value: 1.15 },
      uWarm: { value: new THREE.Color(1.06, 1.005, 0.9) }, uNight: { value: 0 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uVignette; uniform vec3 uWarm; uniform float uNight; varying vec2 vUv;
      void main(){
        vec4 col = texture2D(tDiffuse, vUv);
        col.rgb *= uWarm;
        // 밤: 푸른 틴트로 섞고 전체적으로 어둡게
        vec3 night = col.rgb * vec3(0.62, 0.74, 1.08);
        col.rgb = mix(col.rgb, night, uNight);
        col.rgb *= (1.0 - uNight * 0.30);
        vec2 d = vUv - 0.5;
        float vig = smoothstep(0.9, 0.28, length(d) * uVignette); // 더 부드러운 감쇠
        col.rgb *= mix(mix(0.84, 0.7, uNight), 1.0, vig);          // 낮엔 은은, 밤엔 약간 강하게
        gl_FragColor = col;
      }`,
  });
  composer.addPass(gradePass);
  composer.addPass(new OutputPass());
}

// =============================================================
//  입력
// =============================================================
function initInput() {
  const MOVE_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  window.addEventListener('keydown', (e) => {
    // 닉네임 칸 등 글자 입력 중이면 게임 조작으로 안 잡는다(W/A/S/D 로 걷기·C 앉기·숫자 도구 전환·방향키 preventDefault 전부 스킵)
    if (!keys.down(e)) return;
    // 🛏️ 자는 동안엔 어떤 조작도 받지 않는다 — #sleep-fade 는 포인터만 막고 키는 여기로 들어온다.
    //   루프의 sleeping 분기가 이동·액션은 이미 막지만, 앉기·도구 전환은 이 핸들러가 직접 처리해
    //   암전 아래에서 앉은 채로 깨거나 도구가 바뀌어 있었다. 스크롤 방지만 남기고 전부 무시한다.
    if (sleeping) { if (MOVE_KEYS.includes(e.code)) e.preventDefault(); return; }
    if (e.code === 'Space') wantAction = true;
    if (e.code === 'KeyC') Input.toggleSit();   // C: 앉기
    // 1 = 도구 세트 전환, 2~6 = 지금 세트의 도구 (하단바에 적힌 번호와 1:1 · 🌾농사는 5칸, 🏕️야외도구는 4칸)
    if (e.code === 'Digit1') Input.cycleToolPage();
    else if (/^Digit[2-6]$/.test(e.code)) Input.selectPageSlot(parseInt(e.code.slice(5)) - 2);
    // 방향키/스페이스는 브라우저 페이지 스크롤 방지(플레이 중 화면 밀림 방지)
    if (MOVE_KEYS.includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys.up(e); });
  // 창 포커스가 빠지면(Cmd+Tab·다른 탭·새 창·앱 전환) keyup 이 안 온다 → 전부 뗀 것으로 — 키 하나가 계속 눌려 걷던 버그
  const releaseAll = () => { keys.reset(); analog.x = 0; analog.z = 0; };
  window.addEventListener('blur', releaseAll);
  window.addEventListener('pagehide', releaseAll);
  document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
  // 🖱️ 우클릭 — 브라우저 기본 컨텍스트 메뉴가 뜨면 그동안 keyup 이 페이지에 안 오는데 blur 도 안 나서
  //    W 가 눌린 채 남아 손을 떼도 계속 걷던 버그(2026-09-11). 게임은 우클릭 메뉴를 안 쓰므로 막고,
  //    막아도 메뉴가 뜨는 브라우저(파이어폭스 Shift+우클릭)를 대비해 이 시점에 키를 전부 뗀다
  //    (키를 계속 누르고 있으면 OS 키 반복 keydown 이 곧바로 다시 눌러 주므로 체감 끊김 없음).
  //    글자 입력칸(닉네임·문의)은 붙여넣기 메뉴가 필요하니 예외.
  window.addEventListener('contextmenu', (e) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
    releaseAll();
  });
  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (indoor && placingDecor) { onDecorFloorTap(e); return; } // 실내 가구 배치 중: 탭 = 자리 잡기 / 클릭 = 놓기
    if (!indoor && placingOutdoor) { onOutdoorGroundTap(e); return; }   // 🪵 야외(울타리·밭 시설)도 같은 손맛 — 탭한 자리에 놓는다
    // 🛑 월드가 멈춘 동안엔 집기도 멈춘다 — 🗿조각·🍳요리 무대는 같은 캔버스에 자기 pointerdown 을 걸어 두어서(bindCarvePointer),
    //    이 가드가 없으면 깎는 탭마다 옆에 놓인 울타리를 조용히 집어 든다. handleAction 의 정지 가드와 같은 목록.
    if (intro || sleeping || mgView || museumView || ui.anyModalOpen?.()) return;
    if (indoor && tryPickDecor(e)) return;                      // 놓아 둔 가구 탭 → 들어 올려 옮기기
    if (outdoorZone() && tryPickOutdoor(e)) return;              // 🪵 놓아 둔 야외 장식 탭 → 들어 올려 옮기기(밭일에 가려져도 이 길은 열려 있다)
    wantAction = true;
  });
  // 마우스 호버 → 고스트가 커서를 따라간다(호버가 곧 미리보기). 터치는 탭으로 자리 잡기
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (!indoor && placingOutdoor && e.pointerType === 'mouse') {   // 야외: 호버가 곧 미리보기
      const p = groundHitFromEvent(e); if (p) { outdoorTarget = { x: p.x, z: p.z, pinned: true }; }
      return;
    }
    if (!indoor || !placingDecor || e.pointerType !== 'mouse') return;
    const p = floorHitFromEvent(e); if (!p) return;
    decorTarget = { x: decorClampX(p.x), z: decorClampZ(p.z), pinned: true };
    ui.onDecorAimed?.();
  });
}

// =============================================================
//  메인 루프
// =============================================================
// 서브 공간(실내/텃밭/동굴) 미니맵에 찍을 랜드마크(월드좌표) 목록
const PLOT_MINI = { empty: '#7a5230', growing: '#8fd18a', mature: '#ff8a5c', wilted: '#8a8378' };
const ORE_MINI = { stone: '#c3c3b8', coal: '#5f5f5f', gem: '#5ad0e0' };
// 🗺️ 마을 지명 — 미니맵 아이콘과 전체 지도 라벨이 함께 쓰는 단일 출처.
//   "지도를 봐도 어디가 어딘지 모르겠다"(베타) → 색점 대신 이모지 + 한글 지명을 붙인다.
//   pri 1 = 미니맵에도 그림(작은 캔버스에 다 넣으면 겹쳐서 못 읽는다) · pri 2 = 전체 지도에만.
const VILLAGE_PLACES = [
  { ico: '🏠', name: '나의 집',       x: HOUSE_POS.x,   z: HOUSE_POS.z,   pri: 1 },
  { ico: '🔧', name: '작업대',        x: BENCH.x,       z: BENCH.z,       pri: 1 },
  { ico: '🍳', name: '자유주방',      x: KITCHEN.x,     z: KITCHEN.z,     pri: 2 },
  { ico: '🏪', name: '상점',          x: SHOP.x,        z: SHOP.z,        pri: 1 },
  { ico: '📊', name: '시세판',        x: MARKET.x,      z: MARKET.z,      pri: 2 },
  { ico: '🏆', name: '리더보드',      x: RANK.x,        z: RANK.z,        pri: 2 },
  { ico: '🏞️', name: '호수',          x: LAKE.x,        z: LAKE.z,        pri: 2 },
  { ico: '🌾', name: '텃밭',          x: FARM_GATE.x,   z: FARM_GATE.z,   pri: 1 },
  { ico: '⛏️', name: '채굴 동굴',     x: MINE_GATE.x,   z: MINE_GATE.z,   pri: 1 },
  { ico: '🐔', name: '닭장',          x: COOP.x,        z: COOP.z,        pri: 2, need: 'coop' },
  { ico: '☕', name: '카페',          x: CAFE_GATE.x,   z: CAFE_GATE.z,   pri: 1 },
  { ico: '🌟', name: '반딧불이 계곡', x: GLADE.x,       z: GLADE.z,       pri: 1 },
  { ico: '🍄', name: '채집 숲',       x: FOREST.x,      z: FOREST.z,      pri: 1 },
  { ico: '🏛️', name: '박물관',        x: MUSEUM_GATE.x, z: MUSEUM_GATE.z, pri: 1 },
  { ico: '🛶', name: '나루터',        x: DOCK_GATE.x,   z: DOCK_GATE.z,   pri: 1, map: 'river' },
  { ico: '🌫️', name: '안개 숲',       x: MIST_GATE.x,   z: MIST_GATE.z,   pri: 1, map: 'mist' },
  { ico: '🌊', name: '바다터',        x: SEA_GATE.x,    z: SEA_GATE.z,    pri: 1, map: 'sea' },
  { ico: '🍎', name: '과수원',        x: ORCHARD_GATE.x, z: ORCHARD_GATE.z, pri: 1, map: 'orchard' },
];

// 지금 이 세이브 기준의 지명 목록 — 아직 못 가는 곳은 locked 로 내려보내 지도에서 흐리게 그린다.
//   잠금은 날짜·닭장 건설에서만 바뀌므로 매 틱(8Hz) 다시 만들지 않고 캐시한다
//   (mapLocked 가 틱마다 날짜 산술을 세 번 돌던 것을 줄인다).
let _placesCache = null, _placesAt = -1e9;
function villagePlaces() {
  const now = performance.now();
  if (_placesCache && now - _placesAt < 5000) return _placesCache;
  _placesAt = now;
  _placesCache = VILLAGE_PLACES.map(p => ({
    ico: p.ico, name: p.name, x: p.x, z: p.z, pri: p.pri,
    locked: p.need === 'coop' ? !gameState.coop.built : p.map ? mapLocked(p.map) : false,
  }));
  return _placesCache;
}

function minimapMarks(place) {
  const marks = [];
  if (place === 'farm') {
    const H = farmHalf();
    marks.push({ x: FARM.x, z: FARM.z + H, c: '#c8905a', kind: 'exit' });            // 나가는 문(남쪽)
    { const d = surveyDeskWorld(); marks.push({ x: d.x, z: d.z, c: '#7f8d9e', r: 3.2 }); }   // 📐 측량소(서쪽 문 밖 마당)
    // (허수아비 마크는 제거 — 고정 장식이 없어진 뒤로 빈 모서리를 가리키던 죽은 표시였다)
    for (const p of plots) {   // 텃밭 안 밭만(경계로 필터)
      if (Math.abs(p.x - FARM.x) > H + 1 || Math.abs(p.z - FARM.z) > H + 1) continue;
      marks.push({ x: p.x, z: p.z, c: PLOT_MINI[p.state] || '#7a5230', r: 2.4 });
    }
  } else if (place === 'orchard') {   // 🍎 과수원 — 나가는 문(남쪽) · 시냇물 · 나무(익으면 열매색) · 빈 자리
    marks.push({ x: ORCHARD.x, z: ORCHARD.z + ORCHARD_HALF, c: '#c8905a', kind: 'exit' });
    for (const [lx, lz] of ORCHARD_STREAM_LOCAL) marks.push({ x: ORCHARD.x + lx, z: ORCHARD.z + lz, c: '#8fb9d6', r: 3.4 });
    // 빈 자리 — 그리기(syncOrchardSlotHints)·심기 판정(orchardSlotNear)과 같은 함수로 뽑는다
    for (const s of freeSlots(gameState.orchard?.trees || [], orchardSlotsWorld())) marks.push({ x: s.x, z: s.z, c: '#8a6440', r: 2.0 });
    for (const t of (gameState.orchard?.trees || [])) {
      const def = FRUITS.find(f => f.id === t.kind);
      const col = t.stage === 'mature' && t.fruit > 0 && def ? '#' + def.fruitColor.toString(16).padStart(6, '0') : '#5f9e52';
      marks.push({ x: t.x, z: t.z, c: col, r: 2.6 });
    }
  } else if (place === 'mine') {
    marks.push({ x: MINE.x, z: MINE.z - MINE_HALF, c: '#c8905a', kind: 'exit' });             // 나가는 문(남쪽)
    for (const rock of oreRocks) {
      if (rock.userData.depleted) continue;
      marks.push({ x: rock.position.x, z: rock.position.z, c: ORE_MINI[rock.userData.ore.id] || '#c3c3b8', r: 2.2 });
    }
  } else if (place === 'house') {
    if (houseFloor === 0) marks.push({ x: INT.x, z: INT.z - INT_HALF, c: '#c8905a', kind: 'exit' });   // 나가는 문(1층에만)
    for (const d of gameState.house.decor) {
      if ((d.f || 0) !== houseFloor) continue;                                                  // 🏠 지금 층만 — 다른 층 가구가 겹쳐 찍히면 빈 자리를 못 읽는다
      marks.push({ x: INT.x + d.x, z: INT.z + d.z, c: '#e0b483', r: 2.2 });                     // 배치한 가구
    }
  } else if (place === 'river') {
    if (boat.active) {   // 🛶 런 중엔 "앞을 보는 레이더" — 다가오는 장애물·수집물을 미리 알려줌
      for (const a of riverActive) {
        if (a.taken) continue;
        const c = a.item.kind === 'star' ? '#ffd95e' : a.item.kind === 'pick' ? '#ff9ecb'
          : a.item.kind === 'whirl' ? '#9fdcf5' : '#9aa3a8';
        marks.push({ x: RIVER.x + a.x, z: RIVER.z - RIVER_DOCK_HALF - 2 - a.item.d, c, r: a.item.kind === 'log' ? 4 : 2.6 });
      }
    } else {
      marks.push({ x: RIVER.x, z: RIVER.z + RIVER_DOCK_HALF, c: '#c8905a', kind: 'exit' });     // 마을로 나가는 길(남쪽)
      marks.push({ x: RIVER.x, z: RIVER.z - RIVER_DOCK_HALF - 1.4, c: '#c08d5a', r: 3.4 });     // 🛶 정박한 배
      marks.push({ x: RIVER.x - RIVER_DOCK_HALF + 2, z: RIVER.z + 1.6, c: '#e2c79a', r: 3 });   // 🧰 창고
    }
  } else if (place === 'mist') {
    marks.push({ x: MIST.x, z: MIST.z + MIST_HALF, c: '#c8905a', kind: 'exit' });             // 마을로(남쪽)
    marks.push({ x: MIST.x, z: MIST.z - 3, c: '#7fe8cf', r: 3.4 });                            // 🌳 수호목
    mistLanterns.forEach(l => marks.push({ x: MIST.x + l.x, z: MIST.z + l.z, c: l.lit ? '#9fe8ff' : '#5a626e', r: 2.2 })); // 🏮 등불(켜짐/꺼짐)
    mist.spirits.forEach(s => { if (!s.gone) marks.push({ x: MIST.x + s.group.position.x, z: MIST.z + s.group.position.z, c: '#b08ae0', r: 2 }); }); // 정령
  } else if (place === 'sea') {
    marks.push({ x: SEA.x, z: SEA.z + SEA_DECK_Z0 - 0.6, c: '#c8905a', kind: 'exit' });       // 뭍으로(남쪽)
    seaFishes.forEach(f => marks.push({ x: SEA.x + f.g.position.x, z: SEA.z + f.g.position.z, c: '#5a86b8', r: 2.6 }));   // 배회 물고기
    if (seaMG.st === 'fight' && seaMG.fmesh) marks.push({ x: SEA.x + seaMG.fmesh.position.x, z: SEA.z + seaMG.fmesh.position.z, c: '#ffb04d', r: 3 });   // 낚인 대어
  } else if (place === 'cafe') {
    marks.push({ x: CAFE.x, z: CAFE.z + CAFE_HALF, c: '#c8905a', kind: 'exit' });             // 나가는 문(남쪽)
    marks.push({ x: CAFE.x + CAFE_BOARD[0], z: CAFE.z + CAFE_BOARD[1], c: '#8a7a5f', r: 2.4 }); // 📋 주문판
    for (const g of cafeGuestObjs) marks.push({ x: CAFE.x + g.group.position.x, z: CAFE.z + g.group.position.z, c: '#e8907a', r: 3 }); // 대기 중인 손님
  }
  return marks;
}

const perfSampler = IS_ANDROID ? createPerfSampler() : null;   // 📱 플레이 중 60초분 프레임 → perf_sample 1회
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  // ?dbg=1 — 루프 상태 스냅샷(로컬 조사용): 모드·위치·눌린 키·현재 공간
  // ?dbg=1 — 주민별 키·이름표 높이(이름표가 모자에 가리는지 눈금으로 확인)
  if (_wq.has('dbg')) window.__npcDbg = npcObjs.map(o => ({
    id: o.def.id, glyph: o.lastGlyph, top: +o.topY.toFixed(3), tag: +o.tag.position.y.toFixed(3),
    gap: +(o.tag.position.y - 0.26 - o.topY).toFixed(3),   // 0 보다 커야 이름표 아래가 모자 위에 뜬다
    x: +o.group.position.x.toFixed(2), z: +o.group.position.z.toFixed(2), y: +o.group.position.y.toFixed(2),
  }));
  if (_wq.has('dbg')) window.__dbg = { mode, atMist, atRiver, px: +player.position.x.toFixed(2), pz: +player.position.z.toFixed(2), keys: keys.list(), nearKitchen, nearBench, nearNPC: !!nearNPC, nearDoor, wantAction };

  if (mode === 'play') {
    if (intro) { updateIntro(dt, t); wantAction = false; }   // 🎬 프롤로그 컷신이 카메라·연출을 가짐
    // 🛏️ 자는 동안엔 조작을 멈춘다 — #sleep-fade 는 포인터만 막아서, 이게 없으면
    //    데스크톱에서 암전 아래로 걸어가 문에 Space 를 눌러 집을 나가 버린다(키는 window 에서 받는다).
    else if (sleeping) { wantAction = false; }
    else if (!mgView && !duelActive) { updatePlayer(dt, t); updateMuseumView(dt); updateCamera(dt); updateCameraFade(); }
    else { updateMgScene(dt, t); wantAction = false; }  // 🍳 요리 미니게임 중엔 클로즈업 무대가 카메라를 가짐 — 마을 상호작용(프롬프트·힌트·액션)은 정지
    if (museumView) {                       // 🔍 관람 중: 액션은 '돌아가기' 하나뿐
      if (wantAction) { wantAction = false; closeMuseumView(); }
    } else if (!mgView && !duelActive && !intro) {
      handleAction();
      updateNPCInteract();
      updateDoorInteract();
    }
    updateFishing();
    updateSea(dt, t);     // 🌊 바다터(배회 물고기 + 줄다리기 미니게임)
    emitBuffs();          // 활성 버프 HUD 갱신(만료 처리 포함)
    if (t - lastMini > 0.12) {   // 미니맵(캐릭터 위치) 갱신
      lastMini = t;
      const place = indoor ? 'house' : atFarm ? 'farm' : atOrchard ? 'orchard' : atMine ? 'mine' : atCafe ? 'cafe' : atMuseum ? 'museum' : atRiver ? 'river' : atMist ? 'mist' : atSea ? 'sea' : 'village';
      const md = { place, x: player.position.x, z: player.position.z, yaw: player.rotation.y };
      if (place === 'village') {
        md.places = villagePlaces();   // 🗺️ 미니맵 아이콘 + 전체 지도 라벨의 출처
        // 주민 위치 — 배회·비행하니 실시간이어야 한다. 색은 이름표 배지와 같은 고유색이라
        //   지도의 점만 보고도 누구인지 알 수 있다(예전 보라 점 6개를 대신한다).
        //   q = 머리 위 말풍선과 같은 글자('!' 받을 수 있음 / '…' 진행 중 / '✓' 완료) —
        //   베타 r5 — 의뢰 있는 주민이 어디 있는지 지도에서 찾고 싶다는 요청에 대한 답이다.
        md.npcs = npcObjs.map(o => ({
          x: o.group.position.x, z: o.group.position.z, ico: o.def.emoji, name: o.def.name,
          c: '#' + o.def.color.toString(16).padStart(6, '0'),
          air: !!(o.fly && o.fly.st !== 'perch'),
          q: o.lastGlyph || '',   // ⚠️ npcGlyph() 를 직접 부르지 않는다 — currentQuest 가 st.idx 를 고치고 GA4 를 쏘는 부작용 함수다.
                                  //    말풍선(updateNPCGlyph)이 캐시해 둔 같은 값이라 머리 위 표시와 지도가 자동으로 일치한다.
        }));
      }
      if (place !== 'village') {   // 서브 공간: 중심·반경·랜드마크를 함께 전달
        const C = place === 'house' ? INT : place === 'farm' ? { x: FARM.x - YARD_D / 2, z: FARM.z } :  place === 'cafe' ? CAFE : place === 'river' ? RIVER : place === 'mist' ? MIST : place === 'sea' ? SEA : MINE;
        md.cx = C.x; md.cz = C.z;
        md.half = place === 'house' ? curHalf() : place === 'farm' ? farmHalf() + YARD_D / 2 : place === 'cafe' ? CAFE_HALF : place === 'river' ? RIVER_DOCK_HALF : place === 'mist' ? MIST_HALF : place === 'sea' ? 14 : MINE_HALF;
        // 🛶 런 중엔 배를 중심으로 앞뒤를 보는 레이더(고정 데크 지도 대신)
        if (place === 'river' && boat.active) { md.cx = player.position.x; md.cz = player.position.z - 14; md.half = 22; }
        md.marks = minimapMarks(place);
      }
      ui.setMinimap?.(md);
    }
    // [센서] 매 프레임 스냅샷 → logger throttle 후 배치 전송
    sampleFrame(() => ({
      char: { x: player.position.x, y: 0, z: player.position.z },
      cam: { yaw: camera.rotation.y, pitch: camera.rotation.x },
    }));
  } else {
    updateAttractCamera(t);   // 로그인 배경: 카메라 천천히 회전
  }

  updateDayNight(dt);
  updateRain(dt);       // 🌧️ 빗줄기(비 오는 날 + 야외에서만)
  updateSway(t);
  updateSeaVisuals(t);  // 🌊 일렁이는 수면(후미·바다터) + 등대 야간 빔
  updateTrees(dt);
  updateOreRocks();
  updateChickens(dt);   // 🐔 닭 배회(닭장 건설 후)
  updateFireflyBugs(dt, t); // 🌟 반딧불이(밤에만 계곡에 출현)
  updateMist(dt, t);        // 🌫️ 안개 숲(정령 웨이브·수호목 빛)
  updateCafeGuests(dt, t);  // ☕ 카페 손님(숨쉬기·주문 말풍선)
  updateForage(dt, t);      // 🍄 채집물(돋아나기·재생성)
  updatePlots(dt);
  updateWorkers(dt);        // 🧑‍🌾 일꾼 — 밭 안이면 걸어서, 밖이면 60초 스텝으로
  updatePet(dt, t);         // 🐾 펫 — 따라다니기 / 맡긴 잡일 연쇄(접속 중에만 — 오프라인 정산 없음)
  if (atFarm && visitors) visitors.update(dt);   // 🦋 방문객 — 텃밭 체류 중에만
  updatePops(dt);
  updateTrail(dt);      // 👣 발자국 자취(꾸미기 trail 슬롯)
  if (cosmeticShop) updateShopOwner(cosmeticShop, t);   // 🏪 가게 주인 배회(가게 안을 못 벗어난다)
  updateDecorGhost();   // 🫥 가구 배치 미리보기
  updateParticles(dt);
  updateCatchItem(dt);   // 🎁 캐치 아이템(수확물/물고기 들어올리기)
  updateFloatTexts(dt);
  updateNPC(dt, t);
  updateMerchantVisit(dt);   // 🧙 상인 방문 이벤트(1회)
  updateOwlVisit(dt);        // 🦉 일일 3건 완료 → 특별 의뢰를 물고 날아옴
  updateShopCue(t);          // 🛒 좌판 안내 스프라이트
  // 집 터 안내판/마커: 플레이 중 + 미완성일 때만 (로그인 화면에선 숨김)
  const showHouseCue = (mode === 'play' && gameState.houseStage < 3);
  if (houseSign) { houseSign.visible = showHouseCue; if (showHouseCue) houseSign.position.y = 3.3 + Math.sin(t * 2) * 0.12; }
  if (houseGhost) { houseGhost.visible = showHouseCue; if (showHouseCue) houseGhost.scale.setScalar(1 + Math.sin(t * 2) * 0.03); }
  composer.render();
  if (perfSampler && mode === 'play') { const ps = perfSampler.frame(performance.now()); if (ps) trackEvent('perf_sample', { ...ps, ...perfContext(renderer) }); }

  // 📷 액션샷 정점 캡처 — 렌더 직후 캡처해 항상 온전한 프레임을 얻음
  if (photoResolve && photoT >= photoPeakT) {
    const cb = photoResolve; photoResolve = null;
    let data = null;
    try { data = renderer.domElement.toDataURL('image/png'); } catch (e) {}
    cb(data);
  }
}

// 로그인 배경용 부드러운 오빗 카메라
function updateAttractCamera(t) {
  const r = 19, y = 12;
  camera.position.set(Math.cos(t * 0.11) * r, y + Math.sin(t * 0.3) * 0.6, Math.sin(t * 0.11) * r);
  camera.lookAt(0, 1.6, 0);
}

let walkPhase = 0;
let movedOnce = false;   // 튜토리얼: 첫 이동 감지
let actAnim = 0;         // 액션 제스처 진행(1→0)
let actKind = 'swing';   // 액션 제스처 종류 — 'swing'(도구질) | 'pick'(맨손 줍기)
let sitting = false;     // 앉기 상태

// ── 이모트 모션 — 기분에 따라 캐릭터가 실제로 움직임(춤·점프·하트·인사) ──
let emoteAnim = null;    // { type, t0, dur, fx, baseRot }
const EMOTE_MOTION = { '👋': ['wave', 1.4], '❤️': ['heart', 1.6], '😄': ['jump', 1.2], '🎵': ['dance', 2.4] };
function startEmote(type, dur, opts = {}) {
  sitting = false;
  // noSpin: 📷 액션샷 전용 — 하트/댄스의 회전을 끈다(정점에서 등을 보여 "뒷모습만 찍힌다"는 피드백)
  emoteAnim = { type, el: 0, dur, fx: false, baseRot: player.rotation.y, noSpin: !!opts.noSpin }; // el: 프레임 누적 경과(탭 전환 점프에 안전)
}
// updatePlayer 의 idle 분기에서 호출 — 활성 중이면 true(기본 idle 애니 스킵)
function updateEmote(dt) {
  if (!emoteAnim) return false;
  emoteAnim.el += dt;
  const p = emoteAnim.el / emoteAnim.dur;
  const A = playerAnchor;
  if (p >= 1) {   // 종료 → 원래 자세/방향 복원
    A.position.y = 0; A.rotation.z = 0; A.scale.set(1, 1, 1);
    player.rotation.y = emoteAnim.baseRot;
    emoteAnim = null; return false;
  }
  if (emoteAnim.type === 'wave') {          // 👋 좌우로 까딱까딱 인사
    A.rotation.z = Math.sin(p * Math.PI * 5) * 0.28;
    A.position.y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.08;
  } else if (emoteAnim.type === 'jump') {   // 😄 신나서 두 번 폴짝(착지 스쿼시)
    const b = Math.abs(Math.sin(p * Math.PI * 2));
    A.position.y = b * 0.55;
    A.scale.set(1 + (1 - b) * 0.09, 1 - (1 - b) * 0.11, 1 + (1 - b) * 0.09);
  } else if (emoteAnim.type === 'heart') {  // ❤️ 폴짝 뛰며 한 바퀴 + 반짝
    if (!emoteAnim.noSpin) player.rotation.y = emoteAnim.baseRot + p * Math.PI * 2;
    A.position.y = Math.sin(p * Math.PI) * 0.4;
    if (!emoteAnim.fx && p > 0.4) { emoteAnim.fx = true; spawnSparkle(player.position.x, 1.7, player.position.z, 18); }
  } else if (emoteAnim.type === 'dance') {  // 🎵 빙글빙글 스텝 댄스(두 바퀴)
    if (!emoteAnim.noSpin) player.rotation.y = emoteAnim.baseRot + p * Math.PI * 4;
    A.position.y = Math.abs(Math.sin(p * Math.PI * 6)) * 0.22;
    A.rotation.z = Math.sin(p * Math.PI * 8) * 0.18;
    A.scale.setScalar(1 + Math.sin(p * Math.PI * 6) * 0.04);
    if (!emoteAnim.fx && p > 0.5) { emoteAnim.fx = true; spawnFloatText(player.position.x, 2.5, player.position.z, '🎵♪', '#4a5a40'); }
  }
  return true;
}

// 액션 제스처 트리거: 대상(tx,tz) 방향으로 돌고 몸을 휙 숙였다 폄
//   kind='pick' 이면 도구를 휘두르지 않고 허리만 접는다(🍄채집·🐾흔적처럼 도구가 필요 없는 동작)
function doPlayerAction(tx, tz, kind) {
  if (typeof tx === 'number') player.rotation.y = Math.atan2(tx - player.position.x, tz - player.position.z);
  actAnim = 1; actKind = kind || 'swing';
}
function updatePlayer(dt, t) {
  if (boat.active) return updateBoatRun(dt, t);    // 🛶 런 중엔 걷기 대신 배 물리
  const speed = 6 * (buffOn('speed') ? 1.4 : 1);   // 🥘 채소죽 버프: 이동속도 +40%
  // 모달(캐릭터 선택·튜토리얼·상인 등)·메뉴가 떠 있으면 키보드 이동 0 — 선택창 뒤에서 캐릭터가 걷던 버그
  // 🎉 캐치 세리머니(첫 낚시·수확·반딧불이·바다 대어)·📸 액션샷 밀착 중엔 이동 입력을 무시 —
  //    카메라가 정면 고정인데 걸으면 폴짝 모션이 끊기고 구도가 깨진다(2026-09-11 요청)
  const closeUp = momentT >= 0 || photoT >= 0 || !!museumView;   // 🔍 전시물 관람 중엔 이동 차단(좌우는 회전에 쓴다)
  let { mx, mz } = keys.moveAxes(!!ui.anyModalOpen?.() || closeUp);
  // 모바일 조이스틱 아날로그 합산
  if (!closeUp) { mx += analog.x; mz += analog.z; }

  const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05;
  if (moving && sitting) sitting = false;   // 움직이면 일어남
  if (moving && emoteAnim) { playerAnchor.scale.set(1, 1, 1); emoteAnim = null; } // 움직이면 이모트 취소
  if (moving && !movedOnce) { movedOnce = true; ui.act?.('move'); } // 튜토리얼: 첫 이동
  if (sitting) {
    playerAnchor.position.y = -0.3;         // 앉기: 몸을 낮춤
    playerAnchor.rotation.z *= 0.9;
  } else if (moving) {
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;
    player.position.x += mx * speed * dt;
    player.position.z += mz * speed * dt;
    player.rotation.y = lerpAngle(player.rotation.y, Math.atan2(mx, mz), 0.2);
    walkPhase += dt * 12;
    playerAnchor.position.y = Math.abs(Math.sin(walkPhase)) * 0.18;
    playerAnchor.rotation.z = Math.sin(walkPhase) * 0.05;
  } else if (!updateEmote(dt)) {  // 이모트 모션 중이면 기본 idle 숨쉬기 대신 모션 재생
    playerAnchor.position.y = Math.sin(t * 2) * 0.03;
    playerAnchor.rotation.z *= 0.9;
  }

  // 🐾 꼬리 흔들기 — 동물별 속도·진폭(강아지는 신나게, 고양이는 느긋하게).
  //    움직일 때 더 크고 빠르게 흔들려 "살아있는" 느낌을 줌.
  if (tailPivot) {
    const u = tailPivot.userData;
    tailPhase += dt * u.wagSpeed * (moving ? 1.8 : 1);
    tailPivot.rotation.y = Math.sin(tailPhase) * u.wagAmp * (moving ? 1.6 : 1);
    tailPivot.rotation.x = Math.sin(tailPhase * 0.5) * u.wagAmp * 0.3;
  }

  if (indoor) { // 실내: 지금 층의 방 벽 안쪽으로 제한(층마다 반경이 다르다)
    const h = curHalf();
    player.position.x = Math.max(INT.x - h + 0.6, Math.min(INT.x + h - 0.6, player.position.x));
    player.position.z = Math.max(INT.z - h + 0.5, Math.min(INT.z + h - 0.6, player.position.z));
  } else if (atFarm) { // 텃밭: 울타리 안쪽 + 📐측량소 마당(서쪽 문 밖) — 규칙은 js/farm-stage.js clampFarmPos
    const c = clampFarmPos(player.position.x - FARM.x, player.position.z - FARM.z, farmHalf(), playerInYard);
    player.position.x = FARM.x + c.x; player.position.z = FARM.z + c.z; playerInYard = c.inYard;
  } else if (atMine) { // 동굴: 벽 안쪽으로 제한
    player.position.x = Math.max(MINE.x - MINE_HALF + 0.7, Math.min(MINE.x + MINE_HALF - 0.7, player.position.x));
    player.position.z = Math.max(MINE.z - MINE_HALF + 0.6, Math.min(MINE.z + MINE_HALF - 0.7, player.position.z));
  } else if (atCafe) { // ☕ 카페 홀: 벽 안쪽으로 제한
    player.position.x = Math.max(CAFE.x - CAFE_HALF + 0.8, Math.min(CAFE.x + CAFE_HALF - 0.8, player.position.x));
    player.position.z = Math.max(CAFE.z - CAFE_HALF + 0.8, Math.min(CAFE.z + CAFE_HALF - 0.7, player.position.z));
  } else if (atMuseum) { // 🏛️ 전시실: 벽 안쪽으로 제한
    player.position.x = Math.max(MUSEUM.x - MUSEUM_HALF_W + 0.8, Math.min(MUSEUM.x + MUSEUM_HALF_W - 0.8, player.position.x));
    player.position.z = Math.max(MUSEUM.z - MUSEUM_HALF_D + 0.8, Math.min(MUSEUM.z + MUSEUM_HALF_D - 0.7, player.position.z));
  } else if (atRiver) { // 🛶 나루터 데크: 물에 빠지지 않게 데크 안쪽으로 제한
    player.position.x = Math.max(RIVER.x - RIVER_DOCK_HALF + 0.7, Math.min(RIVER.x + RIVER_DOCK_HALF - 0.7, player.position.x));
    player.position.z = Math.max(RIVER.z - RIVER_DOCK_HALF + 0.7, Math.min(RIVER.z + RIVER_DOCK_HALF - 0.5, player.position.z));
  } else if (atMist) {  // 🌫️ 안개 숲: 바닥이 원(반지름 MIST_HALF+1.5)이라 원형으로 제한 — 모서리 허공 방지. 남쪽 출구(반지름 13)는 닿는다
    const R = MIST_HALF + 0.6, dx = player.position.x - MIST.x, dz = player.position.z - MIST.z, dd = Math.hypot(dx, dz);
    if (dd > R) { player.position.x = MIST.x + dx / dd * R; player.position.z = MIST.z + dz / dd * R; }
  } else if (atSea) {
    // 🌊 부두 위만 걷기 — 좌우는 널판 안, 앞뒤는 뭍끝~부두끝(싸움 중 끌려가는 건 updateSea 의 pz 가 제어)
    player.position.x = Math.max(SEA.x - SEA_DECK_W / 2 + 0.45, Math.min(SEA.x + SEA_DECK_W / 2 - 0.45, player.position.x));
    player.position.z = Math.max(SEA.z + SEA_EDGE - 0.1, Math.min(SEA.z + SEA_DECK_Z0 - 0.2, player.position.z));
  } else if (atOrchard) {  // 🍎 과수원: 원형 언덕 안쪽으로 제한(안개 숲과 같은 문법)
    //   이 분기가 없으면 아래 else 가 원점 반경 42 로 끌어당겨, 입장하자마자 (0,42) 로 튕겨 나간다.
    const R = ORCHARD_HALF - 0.8, dx = player.position.x - ORCHARD.x, dz = player.position.z - ORCHARD.z, dd = Math.hypot(dx, dz);
    if (dd > R) { player.position.x = ORCHARD.x + dx / dd * R; player.position.z = ORCHARD.z + dz / dd * R; }
  } else {
    const maxR = 42, pr = Math.hypot(player.position.x, player.position.z);
    if (pr > maxR) { player.position.x *= maxR / pr; player.position.z *= maxR / pr; }
    // 🌊 호수는 못 들어감 — 🌉 부두 위만 허용(데크 밖으로 떨어지지 않게 클램프)
    const dl = dist2D(player.position, LAKE);
    if (dl < LAKE_R + 0.3) {
      if (onPier(player.position)) {
        player.position.x = Math.min(player.position.x, PIER.x2 - 0.25);
        player.position.z = Math.max(PIER.z1 + 0.18, Math.min(PIER.z2 - 0.18, player.position.z));
      } else {
        const k = (LAKE_R + 0.3) / (dl || 0.001);   // 물가 밖으로 방사형 밀어냄
        player.position.x = LAKE.x + (player.position.x - LAKE.x) * k;
        player.position.z = LAKE.z + (player.position.z - LAKE.z) * k;
      }
    }
  }

  // 🚧 건물·바위·가구 밀어내기 — 공간 클램프 뒤에 마지막으로(벽 모서리에 끼지 않게)
  //    실내(집)는 가구를 직접 배치하는 공간이라 제외 — 잘못 놓으면 갇힐 수 있음
  resolveColliders(player.position);   // 실내에서도 — 놓은 가구(solidBox)가 막아야 한다(전엔 실내를 통째로 건너뛰어 가구를 그냥 통과했다)
  // 테스트: ?dbg=1 — 현재 좌표·카메라·콜라이더 수를 <body data-dbg> 에 기록(충돌 디버깅용)
  if (_wq.has('dbg')) {
    document.body.dataset.dbg = `${player.position.x.toFixed(2)},${player.position.z.toFixed(2)} cam ${camera.position.x.toFixed(1)},${camera.position.z.toFixed(1)} col ${colliders.length}`;
    window.__scene = scene;   // 씬 그래프 콘솔 조사용(로컬 ?dbg=1 전용)
    window.__act = doPlayerAction;   // 제스처 강제 발동(스윙 육안 검증용)
  }

  // 🎒 도구 수납 — ✋맨손이면 등으로, 아니면 손으로. 툭 사라지지 않게 0.25초쯤 걸려 옮긴다
  const stowWant = (toolPage === 'none' && !placingDecor) ? 1 : 0;   // 가구를 고른 동안은 손에 들어 보이게
  if (toolStow !== stowWant) toolStow = Math.max(0, Math.min(1, toolStow + (stowWant ? dt * 4 : -dt * 4)));

  // 액션 제스처: 도구질 = 백스윙 → 휙 내려침 → 팔로스루 / 맨손 줍기 = 허리를 접었다 편다
  if (actAnim > 0) {
    actAnim = Math.max(0, actAnim - dt * (actKind === 'pick' ? 3.0 : actKind === 'dig' ? 1 / DIG_ANIM_DUR : 2.4));  // 도구질 ~0.42초 / 줍기 ~0.33초 / 🪏삽질 0.6초
    const p = 1 - actAnim;                       // 진행도 0→1
    const s = Math.sin(p * Math.PI);             // 몸 스쿼시용 0→1→0
    // 등에 멘 상태(맨손)면 무엇을 하든 휘두를 게 없다 → 안개숲 등불처럼 kind 를 안 준 곳도 자연스럽게
    if (actKind === 'pick' || toolStow > 0.5) {
      // 🍄 줍기: 휘두를 도구가 없다 — 허리를 깊게 접어 손을 땅으로 가져가는 동작만
      playerAnchor.rotation.x = s * 0.85;
      playerAnchor.rotation.y = 0;
      playerAnchor.position.y -= s * 0.12;
      playerAnchor.scale.set(1 + s * 0.04, 1 - s * 0.05, 1 + s * 0.04);
      toolGripFade = 0;
      poseHeldTool(toolStow);                    // 도구는 등에 멘 채 몸을 따라 기울 뿐
    } else if (playerArms && actKind === 'dig') {
      // ── 🪏 삽질(sims/shovel-sim.html ① "밟아 꽂고 퍼 던지기" 검수) ──
      //   0~.22 양팔 앞으로 뻗어 자루를 세움 → .22~.32 밟아 꽂기(몸이 툭 내려앉음) → .32~.62 젖혀 퍼 올리기(몸 뒤로)
      //   → .62~.82 왼쪽 앞으로 휙 던지기(몸 회전) → 복귀. 자루 방향은 toolDigDir(캐릭터 기준)로 직접 지정
      const eo = q => 1 - (1 - q) * (1 - q);
      const seg = (a, b) => Math.max(0, Math.min(1, (p - a) / (b - a)));
      const lp = (a, b, q) => a + (b - a) * q;
      const a = eo(seg(0, .22)), lv = eo(seg(.32, .62)), th = eo(seg(.62, .82)), k = 1 - eo(seg(.82, 1));
      const stomp = Math.sin(seg(.22, .32) * Math.PI);
      const Rp = playerArms.R.pivot, Lp = playerArms.L.pivot;
      const armX = lp(lp(-1.25 * a, -.55, lv), -.35, th);
      Rp.rotation.set(armX * k, -.9 * th * k, .12 * a * k);
      Lp.rotation.set(armX * .92 * k, -.6 * th * k, -.32 * a * k);
      playerAnchor.rotation.x = lp(lp(.30 * a, -.26, lv), -.10, th) * k + stomp * .12;
      playerAnchor.rotation.y = -.60 * th * k;
      playerAnchor.position.y -= stomp * .16 + .05 * a * k;
      playerAnchor.scale.set(1 + stomp * .08, 1 - stomp * .10, 1 + stomp * .08);
      // 자루(손→날): 세워 꽂기(아래·살짝 앞) → 젖혀 퍼 올리기(앞으로 눕힘) → 왼쪽 앞으로 던지기
      toolDigDir.set(lp(lp(0, 0, lv), -.75, th), lp(lp(-.92, -.30, lv), .05, th), lp(lp(.40, .95, lv), .66, th)).normalize();
      toolDigK = a * k; armWristK = 0; toolPourTilt = 0; toolGripFade = 0;
      poseHeldTool(toolStow);
    } else if (playerArms) {
      // ── 옆베기(sims/arm-sim.html 검증) — 몸을 감았다 풀며 팔이 가로로 쓸고 지나감 ──
      const toolId = TOOLS[currentTool].id;
      const Rp = playerArms.R.pivot, Lp = playerArms.L.pivot;
      let k;
      if (toolId === 'water' || toolId === 'seed') {
        // 💧🌰 붓기/뿌리기: 휘두르지 않고 팔을 앞으로 들어 자루만 기울인다
        Rp.rotation.set(-0.9 * s, 0, 0);
        k = 0; armWristK = 0; toolPourTilt = s * 1.1; toolGripFade = 0;
      } else {
        const yaw = slashPhase(p, SLASH.back, SLASH.strike);
        Rp.rotation.set(SLASH.lift * s, yaw, 0);
        k = yaw / SLASH.back;
        armWristK = Math.min(1, Math.abs(k) * 1.25) * WRIST_MAX;
        toolPourTilt = 0; toolGripFade = s;
      }
      // 왼팔 카운터 — 오른팔 정규화 각에서 유도(타이밍이 저절로 맞음)
      Lp.rotation.set(-Math.abs(k) * 0.35, -k * 0.50, Math.max(0, -k) * 0.40);
      // ── 몸: 와인드업 때 오른쪽으로 감았다가 왼쪽으로 풀며 벰 — 비틀림이 파워 ──
      playerAnchor.rotation.x = 0.18 * s;
      playerAnchor.rotation.y = p < 0.32 ? 0.42 * (p / 0.32) : -0.55 * s;
      playerAnchor.position.y -= s * 0.1;
      playerAnchor.scale.set(1 + s * 0.06, 1 - s * 0.07, 1 + s * 0.06);
      poseHeldTool(toolStow);                    // 도구가 손을 따라 스윕
    } else {
      // ── 🐤 팔 없는 캐릭터 폴백: 구식 도구 스윙(어깨 피벗 X축 3단 곡선) ──
      const REST = HELD_REST.rx;                 // 평상시 각도
      let swing;
      if (p < 0.32) {        // ① 백스윙: 뒤로 크게 들어올림(ease-out — 천천히 멈춤)
        const q = p / 0.32; swing = REST - 1.3 * (1 - (1 - q) * (1 - q));
      } else if (p < 0.58) { // ② 내려침: 휙! (ease-in — 가속하며 190° 호)
        const q = (p - 0.32) / 0.26; swing = (REST - 1.3) + 3.3 * q * q;
      } else {               // ③ 팔로스루: 관성 지나쳤다가 부드럽게 복귀
        const q = (p - 0.58) / 0.42; swing = (REST + 2.0) - 2.0 * (1 - (1 - q) * (1 - q));
      }
      const toolId = TOOLS[currentTool].id;
      // 물조리개·씨앗주머니는 내려치는 게 아니라 앞으로 기울여 붓기/뿌리기
      poseHeldTool(toolStow,
        (toolId === 'water' || toolId === 'seed') ? REST + s * 1.0 : swing,
        HELD_REST.rz + s * 0.4);                 // 스윙 중 도구를 정면으로 살짝 세워 호가 또렷하게
      // ── 몸: 백스윙 때 살짝 젖혔다가, 내려칠 때 상체 비틀며 앞으로 숙임(파워 느낌) ──
      playerAnchor.rotation.x = p < 0.32 ? -0.12 * (p / 0.32) : 0.5 * s;
      playerAnchor.rotation.y = p < 0.32 ? -0.22 * (p / 0.32) : 0.3 * s * (1 - p);
      playerAnchor.position.y -= s * 0.1;
      playerAnchor.scale.set(1 + s * 0.1, 1 - s * 0.12, 1 + s * 0.1);
    }
  } else {
    if (playerAnchor.rotation.x !== 0 || playerAnchor.rotation.y !== 0) {
      playerAnchor.rotation.x = 0; playerAnchor.rotation.y = 0; playerAnchor.scale.set(1, 1, 1);
    }
    if (playerArms) {
      playerArms.R.pivot.rotation.set(0, 0, 0);
      playerArms.L.pivot.rotation.set(0, 0, 0);
      armWristK = 0; toolPourTilt = 0; toolDigK = 0; toolGripFade = 0;
    }
    poseHeldTool(toolStow);                      // 수납 보간이 끝날 때까지 매 프레임 갱신
  }
}

const camOffset = new THREE.Vector3(0, 14, 16);
const camOffsetIndoor = new THREE.Vector3(0, 17, 10);   // 🏠 실내 전용 ≈60°(마을 41°) — 방 전체가 한 화면에 들어오고 벽 너머 바깥이 안 보인다(2026-09-10 비교 후 확정)
// ☀️ 루프탑 전용 — camOffsetIndoor 를 그대로 쓰면 피치가 너무 가팔라(≈58°, 시야 위쪽 경계가 수평선보다
//   36° 아래) 마을 전체가 프러스텀 위로 잘려 나간다(진단: Frustum.containsPoint 로 마을 중심 NDC.y=2.39,
//   화면 밖). 루프탑은 벽이 없어 "밖이 안 보이게" 가리는 게 오히려 결함이 된다 — 피치를 완만하게
//   낮춰(≈29°) 마을이 프레임 안에 들어오게 하면서도, camOffset(마을 시점)보다 더 위에서 내려다봐
//   "지붕 위에서 마을을 내려다보는" 높이감은 유지한다.
const camOffsetRoof = new THREE.Vector3(0, 10, 18);
const _camTarget = new THREE.Vector3();
const _camAux = new THREE.Vector3();   // 🔍 관람 시선 보정용
const _camLook = new THREE.Vector3(0, 1.2, 0);
const _camOff = new THREE.Vector3();
let momentUntil = 0;   // 이벤트 순간 줌인 종료 시각(clock.elapsedTime)

// ── 📷 액션샷 — 카메라를 캐릭터 정면에 밀착시키고, 포즈의 정점 프레임에서 캡처 ──
//    ※ clock.elapsedTime 은 탭이 백그라운드였다 돌아오면 한 번에 점프하므로
//      프레임 누적 시간(photoT += clamped dt)으로 진행 — 탭 전환에도 안전.
let photoT = -1;             // 액션샷 경과(초). 0 미만 = 비활성
let photoPeakT = 0;          // 포즈 정점(캡처) 시점
let photoResolve = null;     // 정점 캡처 콜백(animate 렌더 직후 실행 → 빈 프레임 방지)
const PHOTO_HOLD = 1.7;      // 밀착 카메라 유지 시간(초) — 가장 늦은 포즈 정점(댄스 1.49s)보다 길게
const _photoPos = new THREE.Vector3();
// 세로 화면(모바일)은 가로 시야가 좁아 같은 거리면 과하게 확대돼 보임 → 종횡비로 밀착 거리 보정
//   데스크톱(가로)=1배, 폰 세로(≈0.46)=최대 2.3배까지 뒤로.
//   ※ 상한 2.0 + 기준거리 3.2 조합은 세로 화면에서 캐릭터가 프레임을 꽉 채워
//     "뭘 했는지" 안 보인다는 피드백이 있어 한 단계 더 물렸습니다.
function closeUpDist(base) {
  return base * Math.min(2.3, Math.max(1, 1.35 / camera.aspect));
}
function startActionShot() {
  return new Promise((resolve) => {
    const poses = [['jump', 1.2, 0.30], ['dance', 2.4, 0.62], ['heart', 1.6, 0.55], ['wave', 1.4, 0.42]];
    const [pose, dur, peak] = poses[Math.floor(Math.random() * poses.length)];
    startEmote(pose, dur, { noSpin: true });     // 역동적 포즈 발동 — 회전은 끈다(카메라가 정면 고정이라 돌면 등이 찍힌다)
    // 밀착 위치는 시작 시점에 고정 — 정면 어깨높이
    const fy = player.rotation.y;
    const pd = closeUpDist(4.0);
    _photoPos.set(player.position.x + Math.sin(fy) * pd, 1.70 + (pd - 4.0) * 0.14, player.position.z + Math.cos(fy) * pd);
    photoT = 0;
    photoPeakT = dur * peak;                     // 포즈 정점 프레임
    photoResolve = resolve;
    Sound.blip();
  });
}
// ── 🎉 캐치 세리머니 — 수확·낚시 성공 순간: 액션샷처럼 정면 밀착 + 폴짝 모션 ──
//    (프레임 누적 진행이라 탭 전환 점프에 안전 — photoT 와 동일 메커니즘)
let surveyT = -1;                 // 📐 증축 조망샷 경과(초). 0 미만 = 비활성
const SURVEY_HOLD = 3.4;          // 넓어진 밭 전체를 보여 주는 시간
const _surveyPos = new THREE.Vector3(), _surveyLook = new THREE.Vector3();
// 증축 직후 "뭐가 좋아졌는지" 를 눈으로 보여 준다 — 밀착(triggerMoment)은 울타리가 안 보여 의미가 없었다
function triggerFarmReveal() {
  const d = Math.max(17, farmHalf() * 2.6);
  _surveyPos.set(FARM.x, d * 0.86, FARM.z + d);
  _surveyLook.set(FARM.x, 0.6, FARM.z);
  surveyT = 0;
}
let momentT = -1;                 // 세리머니 경과(초). 0 미만 = 비활성
const MOMENT_HOLD = 1.5;          // 밀착 유지 시간(액션샷보다 짧게 — 게임 흐름 안 끊게)
                                  //   베타 피드백 "빠르게 지나가서 잘 안 보여요" → 1.15 → 1.5s.
                                  //   ※ updateCatchItem() 의 "머리 위에 들고 있는" 시간도 이 값이 정한다
                                  //     → 수확·반딧불이 등 밀착 줌이 없는 2회차 이후 연출도 같이 길어진다(의도)
const _momentPos = new THREE.Vector3();
// ── 🏠 외관 꾸미기 뷰 — 패널이 화면 아래 절반을 덮는 동안 집을 화면 위쪽에 두고 바라본다 ──
//    (베타 피드백: "외관 꾸미기 창이 집을 가려서 어떻게 변하는지 안 보인다")
//    시선 목표를 집 중심보다 아래(땅 밑)로 두면 집이 화면 위쪽으로 밀려 올라간다.
//    세로 화면(폰)은 가로 시야가 좁아 집이 잘리므로 종횡비만큼 뒤로 물린다(closeUpDist 와 같은 보정, 완만하게).
let extView = false;
const EXT_CAM_OFF = new THREE.Vector3(0, 16, 27);   // 집 기준 카메라 오프셋(가로 화면) — 저택(높이 ≈5.2)도 화면 위쪽 1/3(6~33%) 안에
const EXT_LOOK_Y = -7;                               // 시선 목표 높이(집 중심보다 훨씬 아래 → 집이 위쪽에, 720px 창에서도 패널(상단 39%) 위)
const _extPos = new THREE.Vector3();

// 🎉 반복 획득(수확·낚시·반딧불이)의 캐치 세리머니 — 밀착 줌은 종류별 첫 1회만(베타: 매번 확대되면 답답하고 멀미)
//   이후엔 폴짝 + 사진 넛지만. 바다터 대어처럼 드문 큰 이벤트는 이 함수를 안 쓰고 triggerMoment(true) 그대로.
function catchCeremony(key) {
  if (!gameState.hintsSeen[key]) { gameState.hintsSeen[key] = true; triggerMoment(true); return; }
  ui.photoNudge?.(); startEmote('jump', 1.0);
}
// 이벤트 순간 연출 + 사진 버튼 넛지
//   close=true  : 수확·낚시 — 캐릭터 정면 밀착 + 캐치 세리머니(폴짝)
//   close=false : 집 완성·요리 — 기존 가벼운 줌(집/UI가 주인공이므로)
function triggerMoment(close = false) {
  ui.photoNudge?.();
  if (!close) { momentUntil = clock.elapsedTime + 1.3; return; }
  // doPlayerAction 이 방금 대상(밭/호수) 방향으로 몸을 돌려둔 상태 → 그 정면에서 밀착 촬영
  // 세로 화면에선 closeUpDist 가 거리를 늘려 캐릭터+수확물+주변이 함께 보이는 미디엄 샷이 됨
  const fy = player.rotation.y;
  const md = closeUpDist(4.2);
  _momentPos.set(player.position.x + Math.sin(fy) * md, 1.80 + (md - 4.2) * 0.14, player.position.z + Math.cos(fy) * md);
  momentT = 0;
  startEmote('jump', 1.0);        // 수확물 캐치 세리머니 — 신나서 폴짝
}

// ── 🎁 캐치 아이템 — 수확물/물고기가 튀어올라 캐릭터 머리 위에 들리는 연출 ──
let catchItem = null;             // { mesh, t, from }
const CATCH_ARC = 0.4;            // 포물선 비행 시간(초)

// 로우폴리 물고기(등급별 색, 무지개는 은은한 발광) — 머리 위에서 파닥파닥
function fishMesh(rarity) {
  const g = new THREE.Group();
  const col = rarity === 'rare' ? 0x7ae0ff : rarity === 'uncommon' ? 0xe06a5a : 0x9fb4c8;
  const mat = rarity === 'rare'
    ? new THREE.MeshStandardMaterial({ color: col, emissive: 0x3ac0e0, emissiveIntensity: 0.4, roughness: 0.4 })
    : clayMat(col, false);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), mat);
  body.scale.set(1.6, 0.9, 0.7); body.castShadow = true; g.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 6), mat);
  tail.rotation.z = Math.PI / 2; tail.position.x = -0.52; g.add(tail);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.5 });
  [0.14, -0.14].forEach(ez => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat); e.position.set(0.3, 0.07, ez); g.add(e); });
  g.userData.flap = true;         // 살아있는 물고기 — 파닥임
  return g;
}

// 🫙 반딧불이 유리병 — 잡은 순간 머리 위로 들어올리는 전리품.
//   개체 메시를 그대로 쓰면 밀착 카메라 + 블룸에 하얗게 번지므로, 작고 또렷한 병으로 표현
function bugJarMesh(kind) {
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.34, 12),
    new THREE.MeshStandardMaterial({ color: 0xdff2f5, transparent: true, opacity: 0.32, roughness: 0.15, metalness: 0.1 }));
  glass.position.y = 0.17; g.add(glass);
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.07, 12), clayMat(0xc9a06a, false));
  lid.position.y = 0.37; g.add(lid);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8),
    new THREE.MeshBasicMaterial({ color: kind.color }));
  glow.position.y = 0.16; g.add(glow);
  return g;
}

// 수확 열매 미니(작물 색 + 잎 꼭지) — 머리 위로 번쩍
function cropMini(type) {
  const g = new THREE.Group();
  const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.24, 0), clayMat(type?.fruit ?? 0xff9e5e, false));
  fruit.castShadow = true; g.add(fruit);
  const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 5), clayMat(0x7fc57f));
  leaf.position.y = 0.28; g.add(leaf);
  return g;
}

function showCatchItem(mesh, fx, fy, fz) {
  if (catchItem) scene.remove(catchItem.mesh);   // 연타 시 이전 것 정리
  mesh.position.set(fx, fy, fz);
  scene.add(mesh);
  catchItem = { mesh, t: 0, from: new THREE.Vector3(fx, fy, fz) };
}

// animate 에서 매 프레임 — 포물선 비행 → 머리 위 들림(파닥) → 팟 하고 가방으로
function updateCatchItem(dt) {
  if (!catchItem) return;
  catchItem.t += dt;
  const m = catchItem.mesh, T = catchItem.t;
  const headY = 2.3 + playerAnchor.position.y;   // 캐릭터가 폴짝 뛰면 같이 들썩
  if (T < CATCH_ARC) {                            // ① 물/밭에서 머리 위로 포물선 점프
    const p = T / CATCH_ARC;
    m.position.x = THREE.MathUtils.lerp(catchItem.from.x, player.position.x, p);
    m.position.z = THREE.MathUtils.lerp(catchItem.from.z, player.position.z, p);
    m.position.y = THREE.MathUtils.lerp(catchItem.from.y, headY, p) + Math.sin(p * Math.PI) * 1.2; // 아크 궤적
    m.rotation.y += dt * 10;                      // 빙글 돌며 날아옴
  } else if (T < MOMENT_HOLD + 0.2) {             // ② 머리 위에 들림 — 세리머니 동안 유지
    m.position.set(player.position.x, headY + Math.sin(T * 9) * 0.04, player.position.z);
    if (m.userData.flap) { m.rotation.z = Math.sin(T * 22) * 0.35; m.rotation.x = Math.sin(T * 17) * 0.15; } // 🐟 파닥파닥
    else m.rotation.y += dt * 2.5;                // 🥕 천천히 돌며 자랑
  } else {                                        // ③ 팟! 줄어들며 가방으로
    const s = Math.max(0.01, m.scale.x - dt * 6);
    m.scale.setScalar(s);
    if (s <= 0.02) { scene.remove(m); catchItem = null; }
  }
}
// 순간이동(집/텃밭 입퇴장) 시 카메라를 즉시 맞춰 긴 스윕 방지
// 📷 카메라와 캐릭터 사이에 들어온 나무를 비춰 준다 — 다가가면 화면이 잎으로 덮이던 문제.
//    나무는 재질을 공유하므로(shared('tree.trunk.mat') 등) 재질 자체를 건드리면 마을 전체가 투명해진다.
//    가려진 그루의 메시만 **반투명 사본**으로 바꿔 끼우고, 벗어나면 원본으로 되돌린다.
//    사본은 원본 재질당 하나만 만들어 캐시한다(재질 종류 = 줄기 1 + 잎 3).
const _fadeCache = new Map();
const _fadeRay = new THREE.Raycaster();
const _fadeTo = new THREE.Vector3(), _fadeDir = new THREE.Vector3();
let _faded = [], _fadeTick = 0;

function fadeMatOf(mat) {
  let f = _fadeCache.get(mat);
  if (!f) {
    f = mat.clone(); f.transparent = true; f.opacity = 0.2; f.depthWrite = false;
    _fadeCache.set(mat, f);
  }
  return f;
}
function updateCameraFade() {
  if ((_fadeTick = (_fadeTick + 1) % 3) !== 0) return;      // 3프레임에 한 번이면 눈에 안 띈다
  for (const f of _faded) f.mesh.material = f.mat;          // 먼저 전부 되돌린다
  _faded.length = 0;
  if (indoor || atMine || atFarm || atSea || atRiver || mgView || boat.active) return;
  _fadeTo.set(player.position.x, player.position.y + 1.0, player.position.z);
  _fadeDir.subVectors(_fadeTo, camera.position);
  const dist = _fadeDir.length();
  if (!(dist > 0.5)) return;
  _fadeDir.normalize();
  _fadeRay.set(camera.position, _fadeDir);
  _fadeRay.far = dist;
  for (const h of _fadeRay.intersectObjects(trees, true)) {
    const m = h.object;
    if (!m.isMesh || _faded.some(f => f.mesh === m)) continue;
    _faded.push({ mesh: m, mat: m.material });
    m.material = fadeMatOf(m.material);
  }
}

function snapCamera() {
  _camTarget.copy(player.position).add(indoor && curFloorDef().outdoor ? camOffsetRoof : indoor || atMuseum ? camOffsetIndoor : camOffset);   // 🏛️ 전시실도 실내 각도(≈60°) · ☀️ 루프탑만 완만한 피치
  camera.position.copy(_camTarget);
  _camLook.set(player.position.x, player.position.y + 1.2, player.position.z);   // ☀️ 루프탑처럼 발밑이 0이 아닐 때도 눈높이를 따라간다
  camera.lookAt(_camLook);
}
function updateCamera(dt) {
  if (boat.active) return updateBoatCamera(dt);   // 🛶 런 중: 1인칭 뱃머리 시점
  if (museumView) {                               // 🔍 전시물 관람: 띄워 둔 것을 정면 가까이서
    const p = museumView.group.position, iw = museumView.inward;
    const f = museumView.frame || (museumView.frame = museumViewFrame(museumView.mesh));
    const oy = p.y + f.cy;                                             // 전시물의 **시각** 중심 높이(메시 원점이 아니라)
    _camTarget.set(p.x + iw[0] * f.dist, oy, p.z + iw[1] * f.dist);    // 거리는 전시물 크기에서 — 돌도 포도송이도 같은 크기로 보인다
    camera.position.lerp(_camTarget, 1 - Math.pow(0.002, dt));
    // 빈 영역 한복판에 오도록 시선을 올린다(전시물은 그만큼 내려온다) — 그 아래가 명판 자리
    _camLook.lerp(_camAux.set(p.x, oy + f.dy, p.z), 1 - Math.pow(0.002, dt));
    camera.lookAt(_camLook);
    return;
  }
  // 📷 액션샷 중: 캐릭터 정면 어깨높이로 빠르게 밀착(끝나면 아래 기본 추적이 부드럽게 복귀)
  if (photoT >= 0) {
    photoT += dt;                          // 프레임 누적 진행(탭 전환 점프에 안전)
    if (photoT >= PHOTO_HOLD && !photoResolve) { photoT = -1; }   // ★캡처가 끝난 뒤에만 복귀(정점 미도달 시 밀착 유지)
    else {
      const k = 1 - Math.pow(0.0004, dt);  // 밀착은 빠르게
      camera.position.lerp(_photoPos, k);
      _camLook.lerp(_camTarget.set(player.position.x, 1.05, player.position.z), k);
      camera.lookAt(_camLook);
      return;
    }
  }
  // 📐 증축 조망샷: 밭 전체가 화면에 들어오게 높이 물러난다(끝나면 기본 추적이 부드럽게 복귀)
  if (surveyT >= 0) {
    surveyT += dt;
    if (surveyT >= SURVEY_HOLD) { surveyT = -1; }
    else {
      const k = 1 - Math.pow(0.06, dt);   // 천천히 물러나 새 울타리가 지나가는 게 보이게
      camera.position.lerp(_surveyPos, k);
      _camLook.lerp(_surveyLook, k);
      camera.lookAt(_camLook);
      return;
    }
  }
  // 🎉 캐치 세리머니 중: 수확물을 낚아채는 정면을 밀착으로(끝나면 기본 추적이 부드럽게 복귀)
  if (momentT >= 0) {
    momentT += dt;                         // 프레임 누적 진행(탭 전환 점프에 안전)
    if (momentT >= MOMENT_HOLD) { momentT = -1; }
    else {
      const k = 1 - Math.pow(0.0008, dt);  // 빠르게 밀착(액션샷보다 아주 살짝 느긋)
      camera.position.lerp(_momentPos, k);
      _camLook.lerp(_camTarget.set(player.position.x, 1.05, player.position.z), k);
      camera.lookAt(_camLook);
      return;
    }
  }
  // 🏠 외관 꾸미기 중: 집을 화면 위쪽에 두고 바라본다(닫으면 아래 기본 추적이 부드럽게 복귀)
  if (extView && !mgView && !indoor) {   // 실내면 무시(방어) — 플래그가 남아도 카메라가 마을 집에 묶이지 않게
    const s = 1 + (Math.min(2.3, Math.max(1, 1.35 / camera.aspect)) - 1) * 0.25;   // 가로 1 ~ 폰 세로 1.33
    _extPos.copy(EXT_CAM_OFF).multiplyScalar(s).add(HOUSE_POS);
    const k = 1 - Math.pow(0.002, dt);   // 액션샷보다 살짝 느긋하게
    camera.position.lerp(_extPos, k);
    _camLook.lerp(_camTarget.set(HOUSE_POS.x, EXT_LOOK_Y - (s - 1) * 2, HOUSE_POS.z), k);
    camera.lookAt(_camLook);
    return;
  }
  // 이벤트 순간엔 오프셋을 줄여 캐릭터로 줌인(감쇠 보간이라 부드럽게 당겨졌다 복귀)
  // 🌊 바다터: 평상시 0.86(트인 수평선 보정) → 던지면 0.55 → 줄다리기·포획 0.45 로
  //    단계별 줌인 — sea-sim 검수 때의 클로즈업 구도를 그대로 가져온다(가로 화면 기준).
  //    세로 화면(폰)은 가로 시야가 좁아 같은 줌이면 캐릭터 등짝만 꽉 차서 부두·수면·물고기가
  //    하나도 안 보인다는 피드백 → 액션샷 closeUpDist 와 같은 종횡비 보정(가로 1배 → 폰 세로
  //    최대 2.3배)으로 폰 세로에선 줌을 풀어 준다(2026-09-05 사용자 피드백 "여전히 너무 가깝다").
  //    폰 세로 결과: 던지기·싸움은 줌인 없음(1.0 — 긴장감은 게이지·경고·버튼 색이 전달), 낚았을 때만
  //    절반(0.90)으로 살짝 당긴다. 가로 화면은 원래 값 그대로, 태블릿은 그 사이를 보간.
  const seaAct = atSea && seaMG.st !== 'idle';
  const pk = Math.min(2.3, Math.max(1, 1.35 / camera.aspect));     // 1(가로) ~ 2.3(폰 세로)
  const phoneT = (pk - 1) / 1.3;                                   // 0(가로) ~ 1(폰 세로)
  const seaBase = seaMG.st === 'fight' || seaMG.st === 'catch' || seaMG.st === 'miss' ? 0.45
                : seaMG.st === 'cast' ? 0.55 : 0.86;
  const seaPhone = seaMG.st === 'catch' || seaMG.st === 'miss' ? 0.90 : 1.0;   // 폰 세로 목표 줌
  const zoom = atSea ? (seaAct ? seaBase + (seaPhone - seaBase) * phoneT : 0.86)
             : clock.elapsedTime < momentUntil ? 0.58 : 1;
  const lookAhead = seaAct ? (pk - 1) * 1.6 : 0;                    // 폰 세로에서 최대 2.1 앞(−z)
  _camOff.copy(indoor && curFloorDef().outdoor ? camOffsetRoof : indoor ? camOffsetIndoor : camOffset).multiplyScalar(zoom);   // ☀️ 루프탑만 완만한 피치(마을이 보이게)
  _camTarget.copy(player.position).add(_camOff);
  const k = 1 - Math.pow(0.025, dt);          // 값↓ = 더 부드럽게(느긋하게) 추적
  camera.position.lerp(_camTarget, k);
  _camLook.lerp(_camTarget.set(player.position.x, player.position.y + 1.2, player.position.z - lookAhead), k);   // ☀️ 루프탑처럼 발밑이 0이 아닐 때도 눈높이를 따라간다
  camera.lookAt(_camLook);
}

// 하늘색/햇빛 색 키프레임 (t: 0=자정 0.25=일출 0.5=정오 0.75=일몰)
const SKY_STOPS = [
  { t: 0.00, sky: 0x1b2145, sun: 0x3b4a86 }, // 깊은 밤
  { t: 0.20, sky: 0x394073, sun: 0x8a7bb0 }, // 여명
  { t: 0.28, sky: 0xffd9b3, sun: 0xffb072 }, // 아침(일출) 따뜻
  { t: 0.50, sky: 0xdff3ff, sun: 0xffe9c4 }, // 정오 밝고 파랑
  { t: 0.72, sky: 0xffc79c, sun: 0xffa65e }, // 노을(일몰) 주황
  { t: 0.82, sky: 0x4a3f70, sun: 0x6a5e98 }, // 초저녁 보라
  { t: 1.00, sky: 0x1b2145, sun: 0x3b4a86 }, // 밤
];
const _cA = new THREE.Color(), _cB = new THREE.Color();
const _rainGray = new THREE.Color(0x8a94a0);   // 🌧️ 비/안개 낀 날 하늘 잿빛
const _snowWhite = new THREE.Color(0xe3e9f0);  // ❄️ 눈 오는 날 밝은 회백
function skyAt(t) {
  let i = 0; while (i < SKY_STOPS.length - 1 && t > SKY_STOPS[i + 1].t) i++;
  const a = SKY_STOPS[i], b = SKY_STOPS[Math.min(i + 1, SKY_STOPS.length - 1)];
  const span = (b.t - a.t) || 1, f = (t - a.t) / span;
  const e = f * f * (3 - 2 * f); // smoothstep → 부드러운 전환
  return {
    sky: _cA.setHex(a.sky).lerp(_cB.setHex(b.sky), e).clone(),
    sun: _cA.setHex(a.sun).lerp(_cB.setHex(b.sun), e).clone(),
  };
}

// 🛏️ 자기 — 밤에 침대에 누우면 아침(WAKE_TIME)까지 건너뛴다.
//   시간만 옮길 뿐 정산은 없다: 🦝밤손님·🌡️날씨·🛶나룻배·🌫️안개·출석은 전부
//   실제 날짜(todayStr) 기준이라 게임 내 시간과 무관하다 — 자서 얻거나 잃는 게 없다.
let sleeping = false;   // 암전 중 재입력 차단
function doSleep() {
  if (sleeping) return;
  if (!isNight()) { ui.toast?.('🛏️ 밤에 누우면 아침까지 잘 수 있어요'); return; }
  sleeping = true;
  Sound.blip();
  trackEvent('sleep', { from: Math.round(timeOfDay * 100) / 100 });   // [GA4] 자기 사용률
  ui.sleepFade?.(1);
  setTimeout(() => {
    timeOfDay = WAKE_TIME; gameState.timeOfDay = timeOfDay;
    dayPaused = false;   // ?time= 로 멈춰 둔 시계도 자고 나면 다시 흐른다(0.30 에 고착 방지).
                         // 촬영은 자기 전까지의 고정만 쓰므로 손해가 없고, 검수 때 ?time= 로 밤을 만들 수 있다.
    requestSave();
    ui.sleepFade?.(0);
    ui.toast?.('☀️ 잘 잤어요. 아침이에요', 2600);
    setTimeout(() => { sleeping = false; }, 700);   // 암전이 걷힌 뒤에 풀어 연타 방지
  }, 750);
}

function updateDayNight(dt) {
  if (!dayPaused) timeOfDay = (timeOfDay + DAY_SPEED * dt) % 1; // 일시정지 아니면 자동 순환
  gameState.timeOfDay = timeOfDay;
  const daylight = daylightAt(timeOfDay);   // 식은 js/daynight.js 한 곳에만 (isNight 과 반드시 같아야 한다)
  const nightAmt = 1 - daylight;
  nightLevel = nightAmt;   // 🌟 반딧불이 등 "밤 전용" 콘텐츠가 참조
  const t = clock.elapsedTime;

  // 하늘·안개·햇빛 색을 키프레임 그라데이션으로 부드럽게
  const { sky, sun } = skyAt(timeOfDay);
  if (WEATHER === 'rain') { sky.lerp(_rainGray, 0.45); sun.lerp(_rainGray, 0.5); }        // 🌧️ 잿빛 톤 다운
  else if (WEATHER === 'snow') { sky.lerp(_snowWhite, 0.42); sun.lerp(_snowWhite, 0.35); } // ❄️ 밝은 회백 톤
  else if (WEATHER === 'fog') { sky.lerp(_rainGray, 0.55); sun.lerp(_rainGray, 0.5); }     // 🌫️ 뿌연 잿빛
  scene.background = sky; scene.fog.color = sky;
  sunLight.color = sun;
  const wDim = WEATHER === 'rain' ? 0.55 : WEATHER === 'fog' ? 0.6 : WEATHER === 'snow' ? 0.8 : 1;
  sunLight.intensity = (0.1 + daylight * 1.2) * wDim;   // 궂은 날 햇빛 약하게
  hemiLight.intensity = 0.2 + daylight * 0.75;
  ambient.color.setHex(0xfff0dd).lerp(new THREE.Color(0x33406e), nightAmt); // 밤엔 푸른 앰비언트
  ambient.intensity = 0.2 + nightAmt * 0.12;
  const ang = timeOfDay * Math.PI * 2;
  // 40m 상자가 늘 플레이어를 감싸도록 해 뜬 자리를 함께 옮긴다.
  // 클램프는 마을 범위(±18) — 텃밭·동굴 등 먼 공간에 들어가도 상자가 따라가지 않아 조명 연출이 그대로다.
  const shx = THREE.MathUtils.clamp(player.position.x, -18, 18);
  const shz = THREE.MathUtils.clamp(player.position.z, -18, 18);
  sunLight.position.set(shx + Math.cos(ang) * 18, Math.sin(ang) * 18 + 2, shz + 8);
  sunLight.target.position.set(shx, 0, shz);
  sunLight.target.updateMatrixWorld();

  // 반딧불이 점멸(트윙클) — 🌫️ 안개 낀 날엔 낮에도 은은하게 떠다님(신비로운 분위기)
  const twinkle = 0.7 + Math.sin(t * 6) * 0.3;
  const ffAmt = WEATHER === 'fog' ? Math.max(nightAmt, 0.6) : nightAmt;
  fireflies.material.opacity = Math.max(0, ffAmt - 0.3) * 1.5 * twinkle;
  // 별 하늘(밤에 페이드인 + 반짝임)
  if (stars) stars.material.opacity = Math.max(0, nightAmt - 0.35) * 1.5 * (0.8 + Math.sin(t * 3.3) * 0.2);
  // 집 창문 따뜻한 불빛
  houseWindows.forEach(m => { m.emissiveIntensity = nightAmt * 2.1 * (m.userData.nightScale ?? 1); });   // nightScale: 통유리 집은 약하게
  for (const anim of houseAddonAnims) anim(t);   // 🧩 굴뚝 연기 등 움직이는 구성품
  // 🔥 화덕 불꽃 — 세로로 늘 때 가로가 눌리고(부피 보존 인상), 두 겹이 반대로 비틀린다
  for (const f of kilnFlames) {
    const k = Math.sin(t * f.sp + f.ph), k2 = Math.sin(t * f.sp * 0.37 + f.ph * 1.7);
    f.mesh.scale.set(1 - k * 0.16, 1 + k * 0.3, 1 - k * 0.16);
    f.mesh.rotation.y = t * f.spin; f.mesh.rotation.z = k2 * 0.16; f.mesh.position.x = k2 * 0.02;
  }
  // 실내 조명: 안에 있을 때만 켜고, 밤일수록 더 밝게(저녁·밤엔 방 안이 포근하게 은은한 온기)
  // ☀️ 루프탑엔 벽도 천장도 없다 — 실내용 따뜻한 점광이 허공에 뜬 것처럼 보여 끈다.
  //   밤엔 대신 파이어핏·자쿠지 같은 층 전용 가구(houseWindows 점등)와 기본 밤 앰비언트로 밝힌다.
  if (interiorLamp) interiorLamp.intensity = indoor && !curFloorDef().outdoor ? (1.8 + nightAmt * 2.6) : 0;
  // 캐릭터 주변 횃불: 저녁부터 서서히 밝아져 밤에 가장 밝음(낮엔 꺼짐)
  if (playerLight) playerLight.intensity = Math.max(0, nightAmt - 0.15) * 4.4;
  scene.fog.near = 18; scene.fog.far = 74;   // 기본 안개(동굴에선 아래서 걷음)
  if (!atMine) {                             // 날씨별 대기 농도(동굴은 자체 설정 유지)
    if (WEATHER === 'rain') { scene.fog.near = 14; scene.fog.far = 58; }
    else if (WEATHER === 'fog') { scene.fog.near = 12; scene.fog.far = 50; }   // 🌫️ 뿌옇되 주변 오브젝트는 읽히게(8/36 은 화면 전체가 하얘졌다 — 베타)
    else if (WEATHER === 'snow') { scene.fog.near = 16; scene.fog.far = 62; }
  }
  // 🌊 바다터: 먼바다·물고기가 보여야 하는 공간 — 날씨와 무관하게 시야를 멀리(하늘색 톤은 유지)
  if (atSea) { scene.fog.near = 34; scene.fog.far = 130; }
  if (mgView?.type === 'carve') { scene.fog.near = 40; scene.fog.far = 140; }   // 🗿 공방 무대는 원거리 카메라(모바일 ~12.5) — 날씨 안개에 잠기지 않게
  // 🔥 화덕은 반대다 — 마을 한복판이라 채굴장·팻말·나무가 다 보여 산만했다.
  //    안개를 바짝 당겨 화덕 뒤를 지우고 무대처럼 만든다(카메라 거리 3.8 기준).
  // 무대 안개는 **카메라 거리에 맞춰** 민다 — 고정값(5.2/11)으로 두니 뒤로 뺀 🫙 가 뿌옇게 묻혔다(실측 2026-09-21)
  if (mgView?.type === 'station') { scene.fog.near = stationCamDist + 1.4; scene.fog.far = stationCamDist + 6.2; }
  if (extView && !mgView && !indoor) { scene.fog.near = Math.max(scene.fog.near, 30); scene.fog.far = Math.max(scene.fog.far, 90); }   // 🏠 외관 뷰도 원거리(≈26~34) — 색이 안개에 묻히지 않게
  // 🏛️ 전시실: 시간대 무관 밝게 — 밤에 들어가도 전시물과 크림 벽이 읽혀야 한다(☕카페 홀과 같은 규칙).
  //    밤엔 야외 조명 그대로라 홀이 캄캄했다(제보 2026-09-21: "저녁때 들어가면 어두움").
  if (atMuseum) {
    hemiLight.intensity = MUSEUM_LIGHT.hemi; ambient.intensity = MUSEUM_LIGHT.amb; sunLight.intensity = MUSEUM_LIGHT.sun;
    ambient.color.setHex(MUSEUM_LIGHT.tint);       // 전시 조명색(ambient 는 매 프레임 리셋되므로 안전)
    sunLight.color.setHex(MUSEUM_LIGHT.sunTint);   // ⚠️ 색도 같이 — 세기만 올리면 밤의 남색 햇빛이 전시물을 파랗게 물들인다
    // ⚠️ **자리도** 고정한다. 세기만 잡으면 헛일이다 — 광원은 시간대를 따라 도느라 저녁엔 바닥
    //    아래(y<0)로 내려가, 같은 0.95 인데도 전시물 윗면이 캄캄해진다(시간대별 밝기 출렁임).
    sunLight.position.set(MUSEUM.x + 7, 15, MUSEUM.z + 11);
    sunLight.target.position.set(MUSEUM.x, 1.6, MUSEUM.z);
    sunLight.target.updateMatrixWorld();
    if (playerLight) playerLight.intensity = MUSEUM_LIGHT.player;
    scene.fog.color.setHex(MUSEUM_LIGHT.fog); scene.fog.near = MUSEUM_LIGHT.near; scene.fog.far = MUSEUM_LIGHT.far;
  }
  // ☕ 카페 홀: 시간대 무관 따뜻하고 밝게(펜던트 등이 켜져 있는 실내)
  if (atCafe) {
    hemiLight.intensity = 0.55; ambient.intensity = 0.62; sunLight.intensity = 0.3;
    ambient.color.setHex(0xffe6c8);   // 전구색(ambient 는 매 프레임 리셋되므로 안전)
    if (playerLight) playerLight.intensity = 0.5;
    scene.fog.color.setHex(0xe8d6b8); scene.fog.near = 26; scene.fog.far = 70;
  }
  // 🌫️ 안개 숲: 시간대 무관 어둑 + 짙은 안개(정화한 날은 맑고 환하게)
  if (atMist) {
    const clear2 = gameState.mist.purified;
    hemiLight.intensity = clear2 ? 0.8 : 0.3; ambient.intensity = clear2 ? 0.5 : 0.42; sunLight.intensity = clear2 ? 0.8 : 0.1;
    ambient.color.setHex(clear2 ? 0xd8f0e4 : 0x46508a);   // 정화 전: 푸른 어스름
    if (playerLight) playerLight.intensity = clear2 ? 0.4 : 2.6;
    scene.fog.color.setHex(clear2 ? 0xcfe8dc : 0x8a92aa);
    // ⚠️ 카메라가 캐릭터 뒤 ~21유닛에 있어 near 는 그보다 길어야 함(짧으면 화면 전체가 화이트아웃)
    scene.fog.near = clear2 ? 24 : 21; scene.fog.far = clear2 ? 70 : 40;   // 정화 전: 캐릭터 너머는 금세 뿌옇게
    scene.background = scene.fog.color;   // 숲은 사방이 트여 배경이 보임 — 하늘도 안개색으로
  }
  // 채굴 동굴: 시간대 무관 밝게(잘 보이게) + 차가운 톤 + 벽 횃불
  if (atMine) {
    hemiLight.intensity = 0.5; ambient.intensity = 0.72; sunLight.intensity = 0.12;  // 잘 보이게(무드는 블루톤+횃불로)
    ambient.color.setHex(0x4a5878);   // 동굴 블루(ambient는 매 프레임 리셋되므로 안전)
    if (playerLight) playerLight.intensity = 3.0;
    scene.fog.color.setHex(0x141a26); scene.fog.near = 26; scene.fog.far = 64;   // 동굴 벽은 보이되 먼 다른 공간은 어둠에 묻힘
    // 벽 횃불 깜빡임
    const tt = clock.elapsedTime;
    for (const t of mineTorches) { const f = 0.85 + Math.sin(tt * 7 + t.phase) * 0.15; t.light.intensity = t.base * f; t.fm.emissiveIntensity = 1.4 * f + 0.4; }
  }
  // 집 안내판: 낮엔 매트(후광X), 밤엔 주변에 맞춰 감광 — 밝기를 키우면 밤 블룸(0.85 임계)에
  // 걸려 판 전체가 형광등처럼 번지므로, 닭장 터 배너처럼 어둡게 가라앉힌다
  if (houseSign && houseSign.visible) houseSign.material.color.setScalar(1 - nightAmt * 0.35);
  // 블룸 밤에 살짝 더 강하게 — 단 🛶 1인칭 나룻배에선 화면 전체가 코앞이라 같은 세기도 훨씬 부시다.
  //   (피드백: "물보라 발광이 과해 계속 보면 눈이 피로해요") 주행 중엔 절반 아래로 낮춘다.
  if (bloomPass) bloomPass.strength = (0.5 + nightAmt * 0.5) * (boat.active && boatView === 'first' ? 0.4 : 1);
  // 밤 푸른 톤 그레이딩
  if (gradePass) gradePass.uniforms.uNight.value = nightAmt;

  // 밤낮 판정은 js/daynight.js 단일 출처 — 아이콘과 🛏️자기 프롬프트가 같은 순간에 바뀌어야 한다
  //   (예전 daylight > 0.4 는 NIGHT_MIN 0.45 와 달라 하루 두 번 20여 초씩 어긋났다)
  ui.setTime?.(isNight() ? 'night' : 'day', WEATHER === 'clear' ? null : WEATHER);

  // 🌓 그림자 화해 — 공간 전환은 setSpaceVisible() 이 처리하지만, exit 함수 몇 곳은 플래그를
  //   내린 뒤 setSpaceVisible() 전에 다른 호출이 끼어 있다(exitHouse·exitMine·exitCafe).
  //   거기서 예외가 나면 마을인데 섀도맵이 얼어붙은 채 복구 경로가 없다. 여기서 매 프레임 맞춘다.
  //   setShadowActive 는 값이 같으면 즉시 반환하므로 평소 비용은 불리언 비교 하나다.
  setShadowActive(shadowActiveFor(spaceFlags()));
}

const _swayDummy = new THREE.Object3D();   // 인스턴스 행렬 계산용(프레임마다 새로 만들지 않게 재사용)
function updateSway(t) {
  for (const s of swayables) {
    const ph = s.userData.swayPhase || 0;
    s.rotation.z = Math.sin(t * 1.3 + ph) * 0.08;
    s.rotation.x = Math.cos(t * 1.1 + ph) * 0.05;
  }
  for (const clump of grassClumps) {   // 🌿 포기별 흔들림을 인스턴스 행렬로(회전 순서는 개별 메시 때와 같은 XYZ)
    const items = clump.items;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      _swayDummy.position.set(it.x, it.y, it.z);
      _swayDummy.rotation.set(Math.cos(t * 1.1 + it.ph) * 0.05, 0, Math.sin(t * 1.3 + it.ph) * 0.08);
      _swayDummy.updateMatrix();
      clump.mesh.setMatrixAt(i, _swayDummy.matrix);
    }
    clump.mesh.instanceMatrix.needsUpdate = true;
  }
  if (fireflies) {
    const base = fireflies.userData.base, pos = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) pos[i + 1] = base[i + 1] + Math.sin(t * 1.5 + i) * 0.25;
    fireflies.geometry.attributes.position.needsUpdate = true;
  }
}

function updateTrees(dt) {
  const now = clock.elapsedTime;
  for (const tree of trees) {
    const ud = tree.userData;
    if (ud.squash > 0) {
      ud.squash = Math.max(0, ud.squash - dt * 4);
      const sq = ud.squash;
      tree.scale.set(1 + Math.sin(sq * Math.PI) * 0.14, 1 - Math.sin(sq * Math.PI) * 0.18, 1 + Math.sin(sq * Math.PI) * 0.14);
      tree.rotation.z = Math.sin(sq * 22) * 0.06 * sq;
    }
    if (ud.fallen && now > ud.respawnAt) { ud.fallen = false; ud.hp = 3; tree.visible = true; tree.scale.set(0.01, 0.01, 0.01); ud.growing = true; }
    if (ud.collider) ud.collider.off = ud.fallen;   // 🚧 안 보이는 그루터기에 막히지 않게
    if (ud.growing) {
      const s = THREE.MathUtils.lerp(tree.scale.x, 1, dt * 5);
      tree.scale.set(s, s, s);
      if (s > 0.98) { tree.scale.set(1, 1, 1); ud.growing = false; }
    }
  }
}

// =============================================================
//  🦝 밤손님 — 자리를 비운 밤사이 너구리·멧돼지가 작물을 훔쳐간다
//  ------------------------------------------------------------
//  ▶ 판정은 서버(/api/night-visit)가 한다: HMAC(uid:날짜) 시드의 결정적
//    난수라 새로고침으로 결과를 다시 굴릴 수 없다. 서버 실패 시엔
//    lastDate 를 넘기지 않아 다음 접속에서 다시 판정한다(결정적이라 리롤 아님).
//  ▶ 방어: 밭 근처(9칸)의 허수아비 1개·울타리 4개가 확률과 도난 개수를 깎는다.
//  ▶ 손실만 주면 접속이 벌이 된다 — 흔적(파헤쳐진 흙+발자국)을 조사하면
//    수집품(도감 신규 카테고리 '흔적')과 씨앗을 돌려받는다.
// =============================================================
let nightFetcher = null;      // async (ctx) => verdict — js/night-visit.js 가 등록
let nightNoteFetcher = null;  // async ({date,animal,crop}) => {author,text}
export function setNightVisitSource(fn) { nightFetcher = fn || null; }
export function setNightNoteSource(fn) { nightNoteFetcher = fn || null; }

let duelFetcher = null;   // async (ctx) => boolean — js/duel/index.js 가 등록. true 면 이겼다
/** 🐗🦝 대결 등록 — 안 끼우면 흔적 조사는 지금까지처럼 조사 보상만 주고 끝난다(기능 플래그 겸용) */
export function setDuelSource(fn) { duelFetcher = fn || null; }


// =============================================================
//  🌡️ 날씨 이벤트 — 서리·태풍 예고를 보고 하루 안에 대비하는 재방문 훅
//  ------------------------------------------------------------
//  ▶ 예고: severeOf()는 날짜 시드 공개 결정값(전 유저 동일). 서버 판정이
//    필요 없다 — 결과가 이미 공개라 리롤할 유인이 없기 때문(밤손님과 대비).
//  ▶ 대비: 오늘 수확하거나, 작업대에서 🛡️ 덮개(목재 3)를 설치.
//  ▶ 정산: 밤손님과 같은 "접속 시 정산" 패턴 — 미보호 작물은 시들 뿐(wilted),
//    괭이로 다시 갈면 복구되는 부드러운 손실.
// =============================================================


// =============================================================
//  상호작용: 선택 도구에 따라 분기
// =============================================================
function handleAction() {
  if (!wantAction) return;
  wantAction = false;
  // ⚠️ 모달이 떠 있으면 월드 액션을 삼킨다. 이동은 이미 moveAxes 가 막고 있었는데(:10056)
  //    액션은 안 막혀서, 대화창을 띄운 채 Space 를 누르면 나무를 베거나 — NPC 옆이면
  //    퀘스트 모달이 대화창 **위에 겹쳐** 떴다. 모달 위에서는 아무 일도 일어나지 않아야 한다.
  if (ui.anyModalOpen?.()) return;
  // 문/게이트(입장/퇴장) 우선
  if (nearDoor === 'enter') return enterHouse();
  if (nearDoor === 'exit') return exitHouse();
  if (nearDoor === 'floor') return goFloor(nearDoorFloor);   // 🪜 계단 옆에서 액션 = 층 이동
  if (nearDoor === 'sleep') return doSleep();   // 🛏️ 밤에 침대 옆에서 액션 = 자기
  if (nearDoor === 'decor') { if (nearDecorMesh) pickDecor(nearDecorMesh); return; }   // 🛋️ 가구 옆에서 액션 = 들기
  if (nearDoor === 'outdoor') { if (nearOutdoorMesh) pickOutdoor(nearOutdoorMesh); return; }   // 🪵 야외 장식 옆에서 액션 = 들기
  if (nearDoor === 'farm') return enterFarm();
  if (nearDoor === 'farmexit') return exitFarm();
  if (nearDoor === 'survey') return surveyOfficeInteract();   // 📐 측량소 탁자 앞에서 액션 = 밭 증축
  if (nearDoor === 'farmbench') return ui.openCook?.('out');   // 🔧 자재 작업대 → 제작 메뉴(🌷야외 탭 = 밭 시설)
  if (nearDoor === 'warehouse') return withdrawWarehouse();
  if (nearDoor === 'hireboard') return hireBoardInteract();   // 📋 일꾼 게시판 → 고용 창   // 🧺 작물 창고 옆에서 액션 = 내용물 꺼내기
  if (nearDoor === 'pet') return commandPet();   // 🐾 밭 근처에서 액션 = 맡기기(물·잡초·해충 최대 5칸)
  if (nearDoor === 'mine') return enterMine();
  if (nearDoor === 'mineexit') return exitMine();
  if (nearDoor === 'orchard') return enterOrchard();
  if (nearDoor === 'orchardexit') return exitOrchard();
  if (nearDoor === 'cafe') return enterCafe();
  if (nearDoor === 'cafeexit') return exitCafe();
  if (nearDoor === 'museum') return enterMuseum();
  if (nearDoor === 'museumexit') return exitMuseum();
  if (nearDoor === 'museumview') return openMuseumView(_museumNear);
  if (nearDoor === 'museumup') return museumGoFloor(true);
  if (nearDoor === 'museumdown') return museumGoFloor(false);
  // 🏛️ 전시실에선 문·전시 말고는 아무 액션도 없다 — 안 막으면 여기서 밭이 갈린다(실제로 겪었다)
  if (atMuseum) return;
  if (nearDoor === 'river') return enterRiver();
  if (nearDoor === 'riverexit') return exitRiver();
  if (nearDoor === 'mist') return enterMist();
  if (nearDoor === 'mistexit') return exitMist();
  if (nearDoor === 'sea') return enterSea();
  if (nearDoor === 'seaexit') return exitSea();
  if (atSea) { seaAction(); return; }   // 🌊 바다터: 액션 = 던지기/버티기/감기
  if (atMist) { mistAction(); return; }
  if (atOrchard) return orchardAction();   // 🍎 과수원: 심기·물주기·수확·베기(js/game.js orchardAction)
  if (atRiver) {                  // 🛶 나루터 데크: 배 타기 / 창고 열기
    if (nearBoat) return startBoatRun();
    if (nearBoatShop) { trackEvent('boat_shop_open'); return ui.openBoatShop?.(boatShopView()); }
    ui.toast?.('🛶 정박한 배로 가면 강을 내려갈 수 있어요');
    return;
  }
  if (atMine) {                   // 동굴: 괭이로만 채굴 가능
    // 🌾농사 세트의 다른 도구(씨앗·물조리개·낫·삽)를 들었으면 ⛏️괭이로 바꿔 그대로 캔다 —
    // 입장 시 자동 선택(ZONE_TOOL)을 덮어쓰고 도구를 바꾼 경우의 안전망(밭 자동 전환과 같은 문법).
    if (toolPage !== 'none') {
      if (TOOLS[currentTool].grp === 'farm' && TOOLS[currentTool].id !== 'hoe') selectToolAuto('hoe');
      if (TOOLS[currentTool].id === 'hoe') return tryMine();
    }
    ui.toast?.('⛏️ 🌾농사 세트의 괭이(2)로 캐야 해요');
    return;
  }
  if (atCafe) {                   // ☕ 홀: 손님에게 서빙 / 주문판 열기
    if (nearCafeGuest) return serveCafeGuest(nearCafeGuest);
    if (nearCafeBoard) { trackEvent('cafe_open'); return ui.openCafe?.(cafeView()); }
    ui.toast?.('☕ 손님에게 다가가 액션을 누르면 서빙해요');
    return;
  }
  // 실내에선 도구질(밭갈기·낚시 등) 금지 — 가구 배치만(선택 중이면 발 앞에 놓기)
  if (indoor) {
    if (placingDecor) commitDecor(decorTarget.x, decorTarget.z);   // 고스트 자리(탭한 곳 또는 발 앞)에 놓기
    else ui.toast?.('🎨 꾸미기 버튼으로 가구를 골라 배치하세요');
    return;
  }
  if (placingOutdoor) {   // 🪵 야외 장식·밭 시설 — 탭으로 조준한 자리(없으면 발밑)에 놓는다
    const ax = outdoorTarget.pinned ? outdoorTarget.x : player.position.x;
    const az = outdoorTarget.pinned ? outdoorTarget.z : player.position.z;
    return placeOutdoor(ax, az);
  }
  if (nearKitchen) { trackEvent('kitchen_open'); return ui.openKitchen?.(kitchenView()); } // 🍳 자유주방 → 요리 미니게임 메뉴판
  if (nearStation) return ui.openCraft?.(craftPanelData(nearStation.id));   // 🔥🫙 가공 시설 근처 → 가공 창
  if (nearBench) return ui.openCook?.();   // 작업대 근처 → 제작 메뉴(도구·야외·선물)
  if (nearShop) return ui.openShop?.();    // 상점 근처 → 상점 메뉴
  if (nearMarket) { ui.act?.('market'); return ui.openMarket?.(marketData()); } // 📊 전광판 → 시세판 모달(튜토리얼: 시세 확인)
  if (nearRank) return ui.openLeaderboard?.();  // 🏆 랭킹 게시판 → 리더보드 모달
  if (nearCoop) return coopInteract();     // 🐔 닭장 → 건설/모이/달걀
  if (nearCosShop) {                       // 🏪 꾸미기 가게 → 🎀 꾸미기 패널
    trackEvent('shop_enter', { from: 'walk' });
    trackEvent('shop_open', { tab: 'cosmetics' });
    return ui.openCosShop?.();
  }
  // 🍄 채집 — 도구가 필요 없는 "줍기". 단, 도끼를 들고 더 가까운 나무가 있으면 벌목에 양보
  const fg = forageTarget();
  if (fg) {
    let treeD = Infinity;
    if (TOOLS[currentTool].id === 'axe') {
      for (const tr of trees) if (!tr.userData.fallen) treeD = Math.min(treeD, dist2D(tr.position, player.position));
    }
    if (treeD >= fg.d) return tryForage(fg.node);
  }
  // 🐾 밤손님 흔적 조사 — 도구가 필요 없는 "줍기"류. 모바일 액션 버튼으로도 동일 동작
  const tr = traceTarget();
  if (tr) return investigateTrace(tr);
  // 🌿 김매기 — 도구가 필요 없는 "줍기"류(🍄채집과 같은 문법). 어떤 도구를 들었든 잡초 밭 앞이면 뽑는다
  const wd = weedTarget();
  if (wd) return pullWeed(wd);
  // 데스크톱(Space)만 근접 시 대화로 분기. 모바일은 전용 "대화하기" 버튼으로만
  // 대화 → 수확·벌목 중 NPC가 겹쳐도 액션 버튼이 대화로 새지 않음
  // 단, 밭 위에서 농사 도구를 들고 있으면 밭일이 먼저다(farmActionFirst 주석 참고)
  if (nearNPC && !IS_MOBILE && !farmActionFirst()) return talkToNPC();
  // 🐛 포충망을 들고 해충 밭 앞이면 쫓기부터 — 비료 판정보다 먼저(비료 안 준 고급 작물에 해충이 붙었을 때)
  if (TOOLS[currentTool].id === 'net') { const pp = pestTarget(); if (pp) return clearPest(pp); }
  // 🌱 비료 — 자라는 밭 앞 + 비료 보유. 💧물조리개를 들고 흙이 말라 있으면 평소대로 물주기가 우선
  const fp = fertTarget();
  if (fp && !fertBlockedByWatering(TOOLS[currentTool].id, toolPage, clock.elapsedTime < (fp.wetUntil || 0))) return applyFert(fp);
  // ✋ 맨손 — 도구를 등에 메고 있으니 도구질은 안 된다(줍기·대화·문은 위에서 이미 처리됨)
  if (toolPage === 'none') { ui.toast?.('✋ 맨손이에요 — 하단 왼쪽 버튼(숫자 1)으로 도구를 꺼내세요'); return; }
  // 🌾 농사 도구(괭이·씨앗·물조리개·낫)는 밭 상태에 맞는 도구로 바꿔 바로 실행 — 🪏삽은 명시적으로만
  if (FARM_AUTO_TOOLS.includes(TOOLS[currentTool].id)) return farmAutoAction();
  switch (TOOLS[currentTool].id) {
    case 'axe': return tryChop();
    case 'shovel': return tryDig();
    case 'hammer': return tryBuild();
    case 'rod': return tryFish();
    case 'net': return tryNet();
  }
}

// =============================================================
//  낚시: 호수 물가에서 던지기 → 물면 낚아채기(반응 미니게임)
// =============================================================


// ── 벌목 ─────────────────────────────────────────────────────

// =============================================================
//  🌾 밭 인스턴싱 — 흙 121칸이 121드로우콜이던 걸 1콜로
//  ⚠️ plot.group 은 없애지 않는다. 빈 Group 은 드로우콜 0이고,
//     plot.group.position 을 읽는 코드가 여러 곳 있다(tryHoe·tryWater·
//     tryHarvest·digTarget·nearestPlot·updatePlots·주민 비켜서기).
//  ⚠️ 공유 지오메트리·재질이므로 dispose 하지 않는다(공유 자원 규칙).
// =============================================================
let farmSoilMesh = null;        // InstancedMesh — 흙
let farmCropMeshes = null;      // { sprout, stem, leaf, bush, fruit } — 단계별 InstancedMesh


// =============================================================
//  농사: 밭 타일 상태머신
//  state: 'empty'(갈아둔 이랑) → 'growing'(3단계 성장) → 'mature'(수확가능)
//  stage: 0 새싹 → 1 자람 → 2 수확가능
// =============================================================

// ── 🌾 고급 작물 — 씨앗 선택 · 지지대 · 잡초 · 해충 (규칙은 js/farm-crops.js) ──────────

// =============================================================
//  🍎 과수원 액션 — 묘목 심기 · 물주기 · 수확 · 베기 (규칙은 js/orchard.js)
//  ------------------------------------------------------------
//  판정 반경은 밭 자동 전환(FARM_AUTO_R = 1.8)과 같은 값을 쓴다.
// =============================================================
function cycleSapSel() {
  const owned = FRUITS.filter(f => (gameState.inventory[sapKeyOf(f.id)] || 0) > 0);
  if (!owned.length) { ui.toast?.('🌰 묘목이 없어요. 상점에서 🍎사과·🍐배·🍑복숭아·🍊감·🌰밤 묘목을 팔아요', 2800); return; }
  const i = owned.findIndex(f => f.id === gameState.orchard.sapSel);
  const next = owned[(i + 1) % owned.length];
  gameState.orchard.sapSel = next.id; Sound.blip();
  ui.toast?.(`${next.ico} ${next.name}나무 묘목 (${gameState.inventory[sapKeyOf(next.id)]}개) — 다시 누르면 바꿔요`, 2200);
  trackEvent('sap_select', { kind: next.id });   // [GA4] 묘목 종류 채택
}


// =============================================================
//  🪏 삽: 빈 밭 메우기(두 번 파기) — 설계 docs/superpowers/specs/2026-09-08-shovel-untill-design.md
//  1타: plot.digAt 기록 + 이랑 흐트러짐·흙더미. DIG_WINDOW 안에 2타면 밭 제거, 아니면 원상 복구.
//  반쯤 판 상태(digAt)는 런타임 전용 — 저장하지 않는다(getGameState 가 직렬화하는 필드에 없음).
// =============================================================
const DIG_WINDOW = 6;          // 1타 후 2타 유예(초)
let pendingDig = null;         // { plot, second } — 제스처가 타격 시점에 닿으면 digHit


// ── 🌱 비료 — 자라는 밭 한 칸을 즉시 수확 가능 상태로(코인 전용 소모품, 상점 20🪙) ──
function fertTarget() {
  if (indoor || atMine || atCafe || (gameState.inventory.fert || 0) <= 0) return null;
  // 🌾 고급 작물에 이미 비료를 줬으면 대상이 아니다 — 안 그러면 포충망·낫 액션이 "이미 줬어요"에 막힌다
  return plots.find(p => p.state === 'growing' && !(p.fert && isAdv(p.cropType)) && dist2D(p.group.position, player.position) < 1.8) || null;
}
// 🍎 과수원 일일 정산 — 🐝벌통과 같은 날짜 게이트(입장 시 한 번). 여러 날치가 쌓여 있으면 한 번에 돌린다.
function settleOrchard() {
  const st = gameState.orchard; if (!st) return;
  const today = todayStr();                         // js/game.js:139 — 저장소의 KST 날짜 헬퍼(kstDate 아님)
  if (st.settleDate === today) return;
  const days = daysBetween(st.settleDate, today);   // 규칙은 js/orchard.js — 며칠 만에 들어온 유저의 복귀 경로가 여기 달렸다
  st.settleDate = today;
  const out = settleTrees(st.trees || [], orchardStreamWorld(), days);
  st.trees = out.trees;
  for (const m of out.matured) trackEvent('tree_mature', m);     // [GA4] kind·grew_days (원장 없음 — 생애주기 이벤트 아님)
  for (const f of out.fruited) { trackEvent('fruit_ready', f); logOrchardEvent('fruit_ready', { kind: f.kind, n: f.n }); }     // [GA4]/[원장] kind·n·watered
  for (const c of out.capped)  { trackEvent('fruit_capped', c); logOrchardEvent('fruit_capped', { kind: c.kind }); }          // [GA4]/[원장] kind
  const total = out.fruited.reduce((s, f) => s + f.n, 0);
  if (total) setTimeout(() => ui.toast?.(`🍎 과수원에 열매 ${total}개가 열렸어요`, 2600), 1400);
  rebuildOrchard(); requestSave();
}
function pestTarget() {
  if (!outdoorZone()) return null;
  return plots.find(p => p.pest && dist2D(p.group.position, player.position) < 1.8) || null;
}
function clearPest(plot) {
  plot.pest = false;
  doPlayerAction(plot.x, plot.z);   // 휘두르기
  Sound.blip(); spawnSparkle(plot.x, 0.6, plot.z, 10);
  spawnFloatText(plot.x, 1.0, plot.z, '🐛💨', '#6b4a20');
  ui.toast?.(`🦋 해충을 쫓았어요 — ${plot.cropType?.name || '작물'} 수확량이 돌아와요`, 2200);
  trackEvent('pest_clear', { kind: plot.cropType?.id });   // [GA4] 공정 수행
}


// =============================================================
//  🌾 농사 도구 자동 전환 — 규칙은 js/farm-auto.js(farmToolFor), 여기는 게임 상태와 잇는 층
//  ------------------------------------------------------------
//  농사 도구(괭이·씨앗·물조리개·낫) 중 아무거나 들고 밭 앞에서 액션 → 밭 상태에 맞는 도구로 바꾸고 그 동작 실행.
//  · 도구 전환은 Input.selectTool 로 → 하단바 하이라이트·손 모델·효과음이 평소 선택과 똑같이 갱신된다.
//  · 밭이 없으면 들고 있던 도구의 원래 동작(괭이=새 밭 갈기, 나머지=안내 토스트) — 씨앗을 들고 실수로 밭이 생기지 않게.
//  · 판정 반경 1.8(물주기·수확과 동일) 안에서 가장 가까운 밭 하나. 판정한 그 밭을 tryX 에 넘겨 다른 밭을 건드리지 않는다.
// =============================================================
// 🌾 밭일이 대화보다 먼저인가 — 밭 작업 사거리(1.8) 안에 밭이 있고 농사 도구를 들었을 때만.
//   대화 사거리(2.6)가 밭 사거리보다 넓어서, 주민이 밭 옆에 서 있기만 해도 데스크톱 Space 가
//   전부 대화로 샜다(베타 피드백: "밭에 NPC가 겹치면 행동하기가 어려워요").
//   빠져나갈 길은 둘 — 밭에서 한 발 물러나거나(밭이 1.8 밖) 도구를 접으면(✋) 평소대로 대화.
//   🪏삽은 제외 — 밭을 없애는 파괴 동작이라 명시적으로만 쓴다(farm-auto.js 와 같은 기준).
//   ※ 밭이 없는 맨땅에서는 적용 안 함 — 괭이를 든 채 돌아다닐 때 대화가 막히면 안 된다.
function farmActionFirst() {
  if (toolPage === 'none') return false;                    // ✋ 맨손 — 언제든 대화(탈출로)
  // handleAction 에서 이 분기보다 먼저 처리되는 것들 — 여기서 true 를 내면 프롬프트가 거짓말이 된다
  //   (예: 시세판 옆 밭 위 → Space 는 시세판을 연다. 밭일도 대화도 아니다)
  if (nearDoor || nearKitchen || nearBench || nearShop || nearMarket || nearRank || nearCoop || nearCosShop) return false;
  // 🍄채집·🐾흔적 조사도 위에서 먼저 처리된다. 특히 밤손님 흔적은 작물을 빼앗긴 밭 좌표 위에 그대로
  //   생기므로(그 밭은 empty 가 된다) 이걸 빼면 "밭일이 먼저"라고 해놓고 흔적 조사가 나가는 조합이 생긴다.
  if (forageTarget() || traceTarget()) return false;
  const held = TOOLS[currentTool].id;
  if (FARM_AUTO_TOOLS.includes(held)) {
    const plot = farmAutoPlot(held);
    if (!plot) return false;
    const want = farmToolFor(plot, clock.elapsedTime < (plot.wetUntil || 0));
    // 밭이 있어도 밭일이 안내 토스트뿐인 순간들(흙이 촉촉 · 반쯤 판 밭 · 씨앗 0)엔 대화에 양보한다.
    //   아무것도 안 일어나는데 말까지 못 걸면 "눌러도 반응이 없고 대화도 안 된다"가 된다(베타 피드백).
    if (!farmActionIsNoop(want, { seeds: gameState.inventory.seed, hasGrowing: plots.some(p => p.state === 'growing' || p.state === 'mature') })) return true;
    // 단 🌱비료를 줄 수 있으면 그건 의미 있는 밭일이라 그대로 우선 — handleAction 의 비료 분기와 같은 조건을 쓴다.
    const fp = fertTarget();
    return !!(fp && !fertBlockedByWatering(held, toolPage, clock.elapsedTime < (fp.wetUntil || 0)));
  }
  // 🪏삽 — 빈 밭 위면 밭일 우선. "digAt 이 살아 있을 때만"으로 좁히면 1타부터 대화에 뺏겨 2타에 영영 못 닿는다.
  //   삽을 자동 전환 대상에서 뺀 이유는 "다른 농사 도구를 들었는데 삽질이 되면 안 된다"는 것이지,
  //   삽을 손에 쥔 명시적 의도까지 막자는 게 아니다. 1타는 6초 뒤 저절로 복구되고 제거엔 2타가 필요해 되돌릴 수 있다.
  if (held === 'shovel') return !!digTarget();
  return false;
}


// ── 🧑‍🌾 노동자 — 고용 · 일감 · 월급 · 오프라인 정산 (규칙은 js/farm-worker.js) ───────────

function workerCap() { return (FARM_STAGES.find(s => s.stage === (gameState.farm.stage || 1)) || FARM_STAGES[0]).workers; }


// ── 조형 — 주민 블롭 몸 + 플레이어 문법 팔 + 등급 모자(견습 두건 · 숙련 밀짚 · 장인 넓은 챙) ──


// ── 🐾 펫 — 따라다니기 · 맡기기 ──────────────────────────────
//  🐾 맡기기 — 반경 안 잡일을 최대 CHAIN_MAX 칸. 끝나면 따라오기로 돌아간다.
//  ⚠️ 오프라인 정산이 **없다**. 펫은 지시받아야 움직이고, updatePet 은 접속 중에만 돈다 —
//     그게 🧑‍🌾일꾼(접속을 끊어도 12시간 일한다)과 갈라서는 경계다(js/pet/rules.js 머리말).
let pet3d = null, petJob = null;

/** 🐾 데리고 나갈 종을 바꿔 끼운다 — pets(소유)와 pet(동행)이 **한 객체**를 가리키게 유지한다.
 *  ⚠️ `gameState.pet = ...` 를 직접 쓰지 마라. 세이브는 둘 다 직렬화하는데 JSON 왕복에서
 *     참조가 끊겨, 한쪽만 자라는 유령 펫이 생긴다(불러오기 직후 성장이 되돌아간 것처럼 보인다).
 *  kind 가 null 이거나 안 산 종이면 아무도 안 데리고 나간 상태가 된다. */
function usePet(kind) {
  gameState.pet = (kind && gameState.pets[kind]) || null;
  return gameState.pet;
}

function respawnPet() {
  if (pet3d) { scene.remove(pet3d); pet3d = null; }
  if (!gameState.pet) return;
  pet3d = spawnPet(THREE, gameState.pet.kind, stageOf(gameState.pet.works));
  if (!pet3d) return;                                   // 모르는 종이면 아무것도 안 세운다
  pet3d.position.set(player.position.x, 0, player.position.z);
  scene.add(pet3d);
}

// 🐾 프롬프트 조건 — 반경 안에 **실제로 할 잡일이 있을 때만** 띄운다.
//   없을 때도 띄우면, 눌러 봐야 0칸으로 끝나면서 20초 쿨다운만 먹는다(한 일이 없는데 쉰다).
//   ⚠️ 먼저 좌표만으로 거른다 — petWorld() 는 밭 121칸을 매 프레임 새로 만든다.
function petChoresNear() {
  if (!pet3d || !pet3d.visible || petJob || !canCommand(gameState.pet, Date.now())) return false;
  const r2 = PET_RADIUS * PET_RADIUS, c = player.position;
  let near = false;
  for (const p of plots) { const dx = p.x - c.x, dz = p.z - c.z; if (dx * dx + dz * dz <= r2) { near = true; break; } }
  return near && !!pickPetTask(petWorld(), c, PET_RADIUS);
}


function finishPetJob() {
  //  ⚠️ afterWork 는 **새 객체**를 준다(불변) — pets 에도 같이 물려야 참조가 안 갈린다
  gameState.pets[gameState.pet.kind] = gameState.pet = afterWork(gameState.pet, petJob.done, Date.now());
  trackEvent('pet_command', {
    pet_kind: gameState.pet.kind, stage: stageOf(gameState.pet.works),
    task: 'chores', plots_done: petJob.done,
  });
  const after = stageOf(gameState.pet.works);
  if (after > petJob.before) {
    trackEvent('pet_stage_up', { pet_kind: gameState.pet.kind, stage: after, works: gameState.pet.works });
    respawnPet();                      // 실루엣이 바뀐다
  }
  petJob = null;
  requestSave();
}


// ── 📋 일꾼 게시판 — 고용 ────────────────────────────────────


// 시들기: 누런 색으로(괭이로 다시 심어야 함)
//   ⚠️ 인스턴스 전환으로 기울어짐(rotation.z)·눌림(scale.y)은 버렸다 — 시든 상태는 색만으로도
//   충분히 읽히고, 회전까지 넣으면 syncFarmCrops 가 복잡해진다(의도적 연출 축소, task-4-brief §Step4).
function wiltPlot(plot) {
  plot.wilted = true; plot.state = 'wilted';
  syncFarmCrops(true);              // 🥀 시든 색(0x9a844f)은 인스턴스 색으로
  setPlotWarn(plot, false);
  ui.toast?.('🥀 작물이 시들었어요… 괭이로 다시 심어요');
}

// 단계별 작물 — 메시는 farmCropMeshes(InstancedMesh)가 그린다. 여기선 상태만 바꾸고 버퍼를 갱신한다.
function clearCrop(plot) {
  plot.crop = null; plot.cropPop = 0;
  syncFarmCrops(true);
}

// =============================================================
//  🌾 밭 알림 배지 — '물!'·'수확!'·'씨앗을 넣어요' 세 배지를 종류별 텍스처 + InstancedMesh 로.
//  Sprite 는 객체마다 1드로우콜이라 121칸이면 121콜이었다 → 종류당 InstancedMesh 1개(총 3콜)로.
//  ⚠️ 아틀라스 1장 + onBeforeCompile 커스텀 셰이더는 쓰지 않는다(컨트롤러 판정, task-5-report 참고):
//     스펙이 이 항목을 3콜로 잡아뒀고, map_fragment 치환은 three 버전마다 깨지기 쉬운 코드다.
//  ⚠️ t() 로 번역한 문구를 캔버스에 굽는다 — 그러나 setLang() 이 location.reload() 를 하므로
//     언어 전환 시 모듈이 통째로 다시 로드되어 텍스처도 새로 그려진다(별도 무효화 불필요).
// =============================================================
const HINT_W = 256, HINT_H = 112;
// 🌾 배지 종류별 월드 스케일 — 옛 Sprite 는 종류마다 **캔버스 크기도 scale 도 달랐다**(126293e 원본 확인):
//     warn     캔버스 176×104 → sprite.scale.set(1.15, 0.68, 1)
//     harvest  캔버스 200×104 → sprite.scale.set(1.28, 0.70, 1)
//     seedHint 캔버스 248×104 → sprite.scale.set(1.55, 0.65, 1)
//   지금은 셋이 256×112 캔버스 하나(+ PlaneGeometry(1.5, 1.5*HINT_H/HINT_W))를 공유한다.
//   ⚠️ 옛 scale 을 지오메트리 크기로 나눈 값(warn 0.767/1.037 등)을 그대로 쓰면 **안 된다** —
//     쿼드 겉넓이만 옛것과 같아질 뿐, 캔버스 종횡비(2.286)와 쿼드 종횡비(1.69)가 어긋나 글자가
//     가로로 26% 찌그러지고 그려진 알약·글자는 오히려 더 작아진다. 플레이어가 보는 건 쿼드가 아니라
//     쿼드에 그려진 내용이므로, 맞춰야 하는 건 **"옛 캔버스 1px = 월드 몇" 비율**이다:
//       scale = (옛 월드크기 / 옛 캔버스크기) × (새 캔버스크기 / 지오메트리크기)
//     지오메트리가 1.5 × 1.5*HINT_H/HINT_W 라 가로·세로 모두 (HINT_W / 1.5) 배가 된다.
const _HINT_K = HINT_W / 1.5;
//   plot.hint 값 순서와 같다: 0 물! · 1 수확! · 2 씨앗을 넣어요
const _HINT_SCALE = [
  new THREE.Vector3(1.15 / 176 * _HINT_K, 0.68 / 104 * _HINT_K, 1),
  new THREE.Vector3(1.28 / 200 * _HINT_K, 0.70 / 104 * _HINT_K, 1),
  new THREE.Vector3(1.55 / 248 * _HINT_K, 0.65 / 104 * _HINT_K, 1),
  new THREE.Vector3(1.28 / 200 * _HINT_K, 0.70 / 104 * _HINT_K, 1),   // 3 🌿 잡초! — 수확! 과 같은 크기
  new THREE.Vector3(1.55 / 248 * _HINT_K, 0.65 / 104 * _HINT_K, 1),   // 4 🐛 해충! 포충망 — 씨앗 배지와 같은 긴 알약
];
let _warnTex = null, _harvestTex = null, _seedHintTex = null, _weedTex = null, _pestTex = null;
function _hintCanvas() {
  const cv = document.createElement('canvas'); cv.width = HINT_W; cv.height = HINT_H;
  return [cv, cv.getContext('2d')];
}
// 알약 폭은 **그릴 문자열을 직접 재서** 정한다.
//   ⚠️ padX 를 한국어 폭에서 뽑은 상수로 넘기면 t() 가 돌려준 다른 언어에서 글자가 알약 밖으로 넘친다
//     (영어 '🌾 Harvest!' 는 bold 28px 에서 140.5px — padX 60 이 만드는 136px 알약을 4.5px 삐져나갔다).
//   캔버스는 언어당 한 번만 그리므로 measureText 비용은 없고, 어떤 언어가 와도 자가치유된다.
//   ⚠️ measureText 전에 c.font 를 먼저 설정해야 폭이 맞는다.
function _drawHintBadge(c, bg, ink, text, fontPx) {
  c.font = `bold ${fontPx}px sans-serif`;
  const w = c.measureText(text).width;
  const padX = Math.max(8, (HINT_W - (w + 44)) / 2);   // 글자 좌우 22px 여백
  c.fillStyle = bg; roundRect(c, padX, 8, HINT_W - padX * 2, 64, 18); c.fill();
  c.beginPath(); c.moveTo(HINT_W / 2 - 10, 72); c.lineTo(HINT_W / 2 + 10, 72); c.lineTo(HINT_W / 2 - 4, 94); c.closePath(); c.fill();
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(text, HINT_W / 2, 40);
}
function _hintTexFromCanvas(cv) {
  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  return tex;
}
function warnTexture() {
  if (_warnTex) return _warnTex;
  const [cv, c] = _hintCanvas();
  //   ⚠️ 브리프 Step1 은 '물을 줘야해요!' 로 적었지만 이는 계획서 작성 중 코드 주석("'물을 줘야해요!' 알림: ...")과
  //     실제 fillText 문자열을 착각해 옮긴 것 — i18n-en.js 사전 키는 원래 문구 '💧 물 줘요!' 그대로다(리뷰 fix round 1).
  //     기능 변화 0 원칙에 따라 원래 문구로 되돌린다.
  //   폰트 30px·잉크 #164a6a 는 옛 warnMaterial(126293e) 그대로다.
  _drawHintBadge(c, 'rgba(140,200,255,0.96)', '#164a6a', t('💧 물 줘요!'), 30);
  return (_warnTex = _hintTexFromCanvas(cv));
}
function harvestTexture() {
  if (_harvestTex) return _harvestTex;
  const [cv, c] = _hintCanvas();
  _drawHintBadge(c, 'rgba(150,220,150,0.96)', '#245a2a', t('🌾 수확!'), 30);   // 옛 harvestMaterial 도 bold 30px
  return (_harvestTex = _hintTexFromCanvas(cv));
}
function seedHintTexture() {
  if (_seedHintTex) return _seedHintTex;
  const [cv, c] = _hintCanvas();
  _drawHintBadge(c, 'rgba(233,206,150,0.97)', '#6b4a20', t('🌰 씨앗을 넣어요'), 28);   // ⚠️ 이것만 옛 값이 bold 28px
  return (_seedHintTex = _hintTexFromCanvas(cv));
}
function weedTexture() {   // 🌿 고급 작물 — 잡초가 성장을 막고 있다(맨손 액션으로 뽑기)
  if (_weedTex) return _weedTex;
  const [cv, c] = _hintCanvas();
  _drawHintBadge(c, 'rgba(190,225,160,0.96)', '#2f5a24', t('🌿 잡초 뽑기'), 30);
  return (_weedTex = _hintTexFromCanvas(cv));
}
function pestTexture() {   // 🐛 고급 작물 — 해충(포충망으로 쫓기, 안 쫓으면 수확 절반)
  if (_pestTex) return _pestTex;
  const [cv, c] = _hintCanvas();
  _drawHintBadge(c, 'rgba(245,200,170,0.97)', '#7a3a1a', t('🐛 해충! 포충망'), 28);
  return (_pestTex = _hintTexFromCanvas(cv));
}

// 세 종류가 동시에 뜨지 않으므로 칸당 하나의 값(plot.hint)으로 관리한다.
//   -1 없음 · 0 물! · 1 수확! · 2 씨앗을 넣어요  (런타임 전용 — 세이브 스키마에 없음)
function setPlotWarn(plot, show)     { if (show) plot.hint = 0; else if (plot.hint === 0) plot.hint = -1; }
function setPlotHarvest(plot, show)  { if (show) plot.hint = 1; else if (plot.hint === 1) plot.hint = -1; }
function setPlotSeedHint(plot, show) { if (show) plot.hint = 2; else if (plot.hint === 2) plot.hint = -1; }

// 배지 빌보드 갱신 — 카메라를 향해 돌리고 살짝 둥실거린다(기존 연출 유지).
//   떠 있는 배지가 하나도 없고(now) 이전 프레임에도 없었다면(prev) 버퍼를 건드리지 않는다.
const _hintQ = new THREE.Quaternion(), _hintP = new THREE.Vector3();
let _hintAnyPrev = false;
function syncFarmHints(now) {
  if (!farmHintMeshes) return;
  // 실내·동굴·카페·강·안개숲·바다에선 배지 메시가 visible=false 라 GPU 업로드는 안 일어나지만
  //   JS 는 매 프레임 밭 전체를 돌았다 → 실외에서만 돈다.
  //   ⚠️ 여기선 _hintAnyPrev 를 건드리지 않는다. 실외로 돌아왔을 때 뜬 배지가 있으면 any=true 로 다시 채우고,
  //     들어가기 전에 떠 있었는데(prev=true) 그 사이 사라졌으면 any=false 라도 통과해 카운트를 0 으로 되돌린다.
  if (!outdoorZone()) return;
  let any = false;
  for (const p of plots) if ((p.hint ?? -1) >= 0) { any = true; break; }
  if (!any && !_hintAnyPrev) return;   // 인스턴싱 이득 보존 — 아무도 안 떠 있으면 매 프레임 스킵
  camera.getWorldQuaternion(_hintQ);
  let nWarn = 0, nHarvest = 0, nSeed = 0, nWeed = 0, nPest = 0;
  const M = farmHintMeshes;
  for (const p of plots) {
    const h = p.hint ?? -1;
    if (h < 0) continue;
    _hintP.set(p.x, 1.4 + Math.sin(now * 3 + h) * 0.06, p.z);
    _fmM.compose(_hintP, _hintQ, _HINT_SCALE[h]);   // 종류마다 크기가 다르다 — 옛 Sprite 와 같게
    if (h === 0) M.warn.setMatrixAt(nWarn++, _fmM);
    else if (h === 1) M.harvest.setMatrixAt(nHarvest++, _fmM);
    else if (h === 2) M.seedHint.setMatrixAt(nSeed++, _fmM);
    else if (h === 3) M.weed.setMatrixAt(nWeed++, _fmM);
    else if (h === 4) M.pest.setMatrixAt(nPest++, _fmM);
  }
  M.warn.count = nWarn; M.harvest.count = nHarvest; M.seedHint.count = nSeed; M.weed.count = nWeed; M.pest.count = nPest;
  // 빈 메시엔 needsUpdate 를 걸지 않는다 — 올릴 게 없는데 버퍼를 다시 올리는 건 낭비다.
  //   (직전 프레임에 인스턴스가 있었다면 count 만 줄이면 되므로 역시 업로드가 필요 없다)
  if (nWarn) M.warn.instanceMatrix.needsUpdate = true;
  if (nHarvest) M.harvest.instanceMatrix.needsUpdate = true;
  if (nSeed) M.seedHint.instanceMatrix.needsUpdate = true;
  if (nWeed) M.weed.instanceMatrix.needsUpdate = true;
  if (nPest) M.pest.instanceMatrix.needsUpdate = true;
  _hintAnyPrev = any;
}

function updatePlotVisual(plot) {
  syncFarmSoil();   // 🌾 젖은 흙 색은 인스턴스 색으로 — 시그니처가 바뀌었을 때만 실제로 쓴다
}

// 성장 단계(0 새싹 → 1 자람 → 2 수확가능)를 growth로 판정, 변할 때 메시 재생성 + 팝
function refreshCropStage(plot) {
  // 기존 작물은 0.4/0.8 그대로 · 고급은 4~5단계를 그림 0/1/2 로 접는다(js/farm-crops.js). 익는 기준은 둘 다 MATURE(0.8)
  const idx = stageIndex(plot.cropType, plot.growth);
  const desired = renderStage(plot.cropType, idx);
  const ripe = plot.growth >= MATURE;
  if (desired === plot.stage && !(ripe && plot.state === 'growing')) return;
  plot.stage = desired;
  buildCropStage(plot);        // 새 단계 메시 생성 + 톡 튀는 팝
  if (ripe && plot.state === 'growing') {   // 수확 준비 완료
    plot.state = 'mature';
    spawnSparkle(plot.x, 0.7, plot.z, 8);
    { const nm = plot.cropType?.name || '작물'; ui.toast?.(`🌾 ${nm}${josa(nm, '이', '가')} 다 자랐어요! 낫으로 수확하세요`); }   // 밀→'밀이' · 당근→'당근이' · 토마토→'토마토가'
  }
  syncFarmCrops(true);   // 🌱 단계 전환을 인스턴스 버퍼에 반영(buildCropStage 안에서도 부르지만, 여기서도 명시)
}

// 단계별 작물 — 메시는 farmCropMeshes(InstancedMesh)가 그린다. 여기선 상태만 바꾸고 팝을 건다.
function buildCropStage(plot) {
  plot.crop = true;          // "작물이 있다" 플래그 — 기존 코드가 truthy 검사만 한다
  plot.cropPop = 1;          // 단계 전환 시 톡 튀는 팝
  syncFarmCrops(true);
}

// =============================================================
//  건축: 망치로 집 터에서 단계 건설
// =============================================================
function tryBuild() {
  if (dist2D(HOUSE_POS, player.position) > 3.2) { ui.toast?.('집 터(반투명 자리)로 가세요 🏠'); return; }
  if (gameState.houseStage >= 3) { const r = doExpand(); ui.toast?.(r.msg, 3200); return; }   // 🏗️ 완성 후엔 망치=증축
  const next = gameState.houseStage + 1;
  // 🏠 2026-09-21: 목재 단일에서 목재·돌·코인으로 — 부족분은 증축(doExpand)과 같은 문구로 알린다
  const info = buildInfo(gameState, RES_LABEL);
  if (!info.affordable) {
    const lack = info.items.filter(i => i.have < i.need).map(i => `${i.label} ${i.have}/${i.need}`).join(' · ');
    ui.toast?.(`🔨 ${STAGE_NAMES[next]} 재료 부족 — ${lack}`, 3200); return;
  }
  for (const it of info.items) gameState.inventory[it.k] -= it.need;   // buildInfo 가 계산한 그 값으로 소비
  const coinCost = info.items.find(i => i.k === 'coins')?.need || 0;
  if (coinCost) logEcon('house_build', 'stage' + next, -coinCost, gameState.inventory.coins);   // [원장] 증축 'house_expand' 와 같은 축
  doPlayerAction(HOUSE_POS.x, HOUSE_POS.z); // 건축 제스처
  buildHouseStage(next);
  trackEvent('house_build', { stage: next, ...Object.fromEntries(info.items.map(i => [i.k, i.need])) });   // [GA4] 건축 퍼널(증축 house_expand 와 같은 축: stage)
  if (next < 3) ui.toast?.(`🪵 ${STAGE_NAMES[next]} 완성!`);
  refreshInventoryUI();
  if (coinCost) requestSave();   // 🪙 코인을 쓴 자리는 바로 저장(새로고침으로 잃지 않게) — 구성품 구매와 같은 규칙
}

// =============================================================
//  팝 애니메이션(밭/작물/집 부재 톡 튀어오름)
// =============================================================
// ── 획득 표시: "+3 🪵" 처럼 위로 떠오르며 사라지는 텍스트(스프라이트) ──
const floatTexts = [];
// scale: 좁은 화면·가까운 카메라(🛶 뱃놀이 등)에서 줄여 그리기 위한 배율(기본 1)
function spawnFloatText(x, y, z, text, color = '#3a4a40', scale = 1) {
  // 🐗🦝 승부 중엔 띄우지 않는다 — 흔적 조사 보상(+씨앗)이 승부 시작과 겹쳐 무대를 덮었다.
  //   토스트·배너는 CSS(body.duel-open)로 걷었지만 이건 3D 월드 스프라이트라 CSS 가 못 닿는다.
  if (duelActive) return;
  const cv = document.createElement('canvas');
  text = t(text);   // [i18n] 캔버스 스프라이트는 옵저버 밖 — 폭 측정 전에 번역
  let c = cv.getContext('2d');
  c.font = 'bold 52px sans-serif';
  // 캔버스 폭을 텍스트 길이에 맞춤 — 고정 256px 이던 시절 긴 한글("배가 가라앉아요…")이 잘렸음
  const w = Math.ceil(Math.min(1024, Math.max(256, c.measureText(text).width + 48)));
  cv.width = w; cv.height = 96;                       // width 대입 → 컨텍스트 상태 리셋됨
  c = cv.getContext('2d');
  c.font = 'bold 52px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = 8; c.strokeStyle = 'rgba(255,255,255,0.92)'; c.strokeText(text, w / 2, 48);
  c.fillStyle = color; c.fillText(text, w / 2, 48);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
  sp.scale.set(0.72 * (w / 96) * scale, 0.72 * scale, 1);   // 캔버스 비율 유지(w=256, scale=1 → 기존 1.9와 동일)
  sp.position.set(x, y, z);
  sp.userData = { life: 1.4, vy: 1.5 };
  scene.add(sp); floatTexts.push(sp);
}
function updateFloatTexts(dt) {
  for (let i = floatTexts.length - 1; i >= 0; i--) {
    const s = floatTexts[i], u = s.userData;
    u.life -= dt; s.position.y += u.vy * dt; u.vy *= 0.95;
    s.material.opacity = Math.min(1, u.life * 1.6);
    if (u.life <= 0) { scene.remove(s); s.material.map.dispose(); s.material.dispose(); floatTexts.splice(i, 1); }
  }
}

function updatePops(dt) {
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
function easeOutBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

// =============================================================
//  [파티클] 공용 파티클 풀
// =============================================================
const _leafGeo = new THREE.PlaneGeometry(0.22, 0.22);
const _chipGeo = new THREE.TetrahedronGeometry(0.12);
const _dropGeo = new THREE.SphereGeometry(0.07, 6, 6);
const _confGeo = new THREE.PlaneGeometry(0.16, 0.24);

function makeParticle(geo, color, additive = false) {
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: 0.9, side: THREE.DoubleSide, transparent: true,
    emissive: additive ? color : 0x000000, emissiveIntensity: additive ? 0.55 : 0, // 가산 합성이 겹치면 하얗게 타서 광도를 낮춤
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive,
  });
  const m = new THREE.Mesh(geo, mat); scene.add(m); return m;
}

function spawnLeafBurst(tree, count = 14) {
  const c = new THREE.Color(tree.userData.leafColor);
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_leafGeo, c);
    p.position.set(tree.position.x + (Math.random() - 0.5), 2 + Math.random() * 1.2, tree.position.z + (Math.random() - 0.5));
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3), spin: rndSpin(6), life: 1.4, gravity: -4, flutter: true };
    particles.push(p);
  }
}
function spawnWoodChips(tree) {
  const c = new THREE.Color(PAL.wood);
  for (let i = 0; i < 8; i++) {
    const p = makeParticle(_chipGeo, c);
    p.position.set(tree.position.x + (Math.random() - 0.5) * 0.4, 0.9, tree.position.z + (Math.random() - 0.5) * 0.4);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 4, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 4), spin: rndSpin(10), life: 1.0, gravity: -9, flutter: false };
    particles.push(p);
  }
}
// 밭갈기/건축: 흙먼지가 살짝 피어오름
function spawnDust(x, z, count = 12) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_chipGeo, new THREE.Color(0xc9a988));
    p.position.set(x + (Math.random() - 0.5) * 1.4, 0.2, z + (Math.random() - 0.5) * 1.4);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.6 + Math.random(), (Math.random() - 0.5) * 1.2), spin: rndSpin(4), life: 0.9, gravity: -1.2, flutter: false, grow: 2 };
    particles.push(p);
  }
}
// 물주기: 물방울 + 무지개 반짝임
function spawnWater(x, z) {
  for (let i = 0; i < 12; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(0x8fd0ff), true);
    p.position.set(x + (Math.random() - 0.5) * 0.8, 1.6, z + (Math.random() - 0.5) * 0.8);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.5, (Math.random() - 0.5) * 0.8), spin: rndSpin(2), life: 1.0, gravity: -6, flutter: false };
    particles.push(p);
  }
  // 작은 무지개 반짝임(색색의 발광 점)
  const rainbow = [0xff8a8a, 0xffd28a, 0xfff58a, 0x8affa0, 0x8ad2ff, 0xc08aff];
  for (let i = 0; i < 6; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(rainbow[i]), true);
    p.position.set(x + (Math.random() - 0.5) * 1.0, 1.2 + Math.random() * 0.6, z + (Math.random() - 0.5) * 1.0);
    p.userData = { vel: new THREE.Vector3(0, 0.4, 0), spin: rndSpin(1), life: 0.9, gravity: 0.5, flutter: false };
    particles.push(p);
  }
}
// 수확: 별/스파클(발광)
function spawnSparkle(x, y, z, count = 16) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_chipGeo, new THREE.Color(0xfff2a0), true);
    p.position.set(x + (Math.random() - 0.5) * 0.6, y, z + (Math.random() - 0.5) * 0.6);
    // maxO: 반짝이 농도 캡 — 클로즈업(요리 무대 등)에서 화면을 하얗게 덮지 않게 은은하게
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2), spin: rndSpin(8), life: 1.0, gravity: -3, flutter: false, maxO: 0.55 };
    particles.push(p);
  }
}
// 🛶 물보라·물거품 — 뱃머리·노 주위로 튀는 물.
//   반짝이(spawnSparkle)를 돌려 쓰다가 눈이 부시다는 피드백을 받았다. 반짝이는
//   ① 가산 합성 ② emissive ③ 노란 고휘도라 UnrealBloomPass(임계 0.85)에 그대로 걸려
//   1인칭 화면 아래쪽이 통째로 하얗게 타 버렸다(장애물도 그 뒤에 묻힘).
//   → 여기선 가산 합성·발광을 쓰지 않고, 블룸 임계 아래의 옅은 물색으로만 튄다.
//   → 좌우로 뿌려 정면(장애물이 보이는 자리)을 비운다.
function spawnSplash(x, y, z, count = 3, spread = 1) {
  for (let i = 0; i < count; i++) {
    const p = makeParticle(_dropGeo, new THREE.Color(0x9ec6dc));      // 휘도 0.75 — 블룸 임계(0.85) 아래
    const side = Math.random() < 0.5 ? -1 : 1;                        // 뱃머리 좌우로 갈라지는 물살
    p.position.set(x + side * (0.4 + Math.random() * 0.5) * spread, y + Math.random() * 0.12, z + (Math.random() - 0.5) * 0.9);
    p.userData = {
      vel: new THREE.Vector3(side * (0.7 + Math.random() * 0.9) * spread, 1.1 + Math.random() * 0.8, (Math.random() - 0.5) * 1.2),
      spin: rndSpin(3), life: 0.5, gravity: -7, flutter: false, maxO: 0.3,   // 짧게 튀고 옅게 — 잔상이 쌓이지 않게
    };
    particles.push(p);
  }
}
// 집 완성: 색종이(색색의 평면 조각)
function spawnConfetti(x, y, z) {
  const cols = [0xff8a8a, 0xffd28a, 0x8affa0, 0x8ad2ff, 0xc08aff, 0xfff58a];
  for (let i = 0; i < 40; i++) {
    const p = makeParticle(_confGeo, new THREE.Color(cols[i % cols.length]));
    p.position.set(x + (Math.random() - 0.5) * 1.5, y + Math.random() * 1.5, z + (Math.random() - 0.5) * 1.5);
    p.userData = { vel: new THREE.Vector3((Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3), spin: rndSpin(12), life: 2.2, gravity: -3.5, flutter: true };
    particles.push(p);
  }
}
function rndSpin(m) { return new THREE.Vector3(Math.random() * m, Math.random() * m, Math.random() * m); }

function updateParticles(dt) {
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

// =============================================================
//  NPC (마을 주민 다중) + 퀘스트 체인
// =============================================================
// 🪧 간판·좁은 자리용 아이콘만(라벨 없이). RES_LABEL 은 이모지가 붙은 것과 안 붙은 것이 섞여 있어 따로 둔다.
const RES_ICON = { wood: '🪵', stone: '🪨', coal: '⚫', gem: '💎', coins: '🪙' };
const RES_LABEL = { charcoal: '⚫숯', flour: '🌾밀가루', brick: '🧱벽돌', bread: '🥐빵', juice: '🍷포도즙', wood: '목재', seed: '씨앗', crop: '작물', fish: '물고기', coins: '🪙코인', stone: '돌', coal: '석탄', gem: '보석', egg: '달걀', bug: '반딧불이', forage: '채집물', star: '⭐별조각', glow: '✨정령빛', fert: '🌱비료', bait: '🪱미끼',
  wheat: '🌾밀', corn: '🌽옥수수', grape: '🍇포도', seed_wheat: '🌾밀 씨앗', seed_corn: '🌽옥수수 씨앗', seed_grape: '🍇포도 씨앗', honey: '🍯꿀',
  apple: '🍎사과', pear: '🍐배', peach: '🍑복숭아', persimmon: '🍊감', chestnut: '🌰밤',
  sap_apple: '🍎사과나무 묘목', sap_pear: '🍐배나무 묘목', sap_peach: '🍑복숭아나무 묘목',
  sap_persimmon: '🍊감나무 묘목', sap_chestnut: '🌰밤나무 묘목' };   // 🌾 고급 작물·씨앗 · 🍯꿀(벌통) · 🍎 과수원(js/orchard.js)

// id별 퀘스트 진행 상태(없으면 생성)
function npcState(id) {
  // ⚠️ allDone 은 더 이상 읽지 않는다(세이브 포맷 호환용으로만 계속 쓴다).
  //    "지금 내줄 의뢰가 있는가" 는 currentQuest(), "체인을 끝냈는가" 는 idx >= quests.length 로 본다.
  //    🔁반복 의뢰가 열리면 allDone 은 false 로 돌아가므로, 이 값으로 분기하면 바로 버그다.
  if (!gameState.npcs[id]) gameState.npcs[id] = { idx: 0, progress: 0, given: false, allDone: false };
  return gameState.npcs[id];
}

// 🏷️ 주민 이름표 — 몸 색과 같은 배지라 "이 색 = 이 사람" 이 한 번에 붙는다.
const NAMETAG_NEAR = 11;   // 이 거리 안이면 완전히 보임
const NAMETAG_FAR = 18;    // 이 거리 밖이면 감춤(그 사이는 페이드)
// 이름표 색 — 이 게임의 캔버스 UI 규칙을 그대로 따른다(상점 말풍선·집 간판과 같은 규칙):
//   UnrealBloomPass 임계값 0.85 를 넘는 색은 후광이 번져 글자를 삼킨다.
//   그래서 **밝은 바탕(휘도 0.62~0.78) + 같은 색의 진한 글자·테두리** 로 간다.
//   흰 글자·흰 테두리(휘도 1.0)는 바탕이 어두워도 그 자체가 블룸에 걸려 번진다 — 쓰지 말 것.
const BADGE_LUM_MIN = 0.62, BADGE_LUM_MAX = 0.78;
function shadeToLum(hex, want) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  const k = lum > 1e-3 ? want / lum : 1;
  const cl = (v) => Math.round(Math.min(255, Math.max(0, v * k)));
  return `rgb(${cl(r)},${cl(g)},${cl(b)})`;
}
function badgeColor(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  return shadeToLum(hex, Math.min(BADGE_LUM_MAX, Math.max(BADGE_LUM_MIN, lum)));
}

function makeNameTag(def) {
  // 캔버스는 가장 긴 이름(낚시꾼 할아버지)까지 여유 있게. 스프라이트 배율은 이 비율에 맞춘다.
  const W = 384, H = 96;
  const FONT = (px) => `bold ${px}px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const label = `${def.emoji} ${t(def.name)}`;

  // ⚠️ textAlign='center' 에 기대지 않는다 — 토스 웹뷰에서 가운데 정렬이 안 먹어 글자가
  //    배지 밖으로 밀려 나갔다(2026-09-09 실기기 보고). 왼쪽 기준으로 x 를 직접 계산한다.
  //    폭도 advance 와 실제 잉크 범위 중 큰 쪽을 쓴다(ZWJ 결합 이모지가 더 넓게 그려지는 환경 대비).
  c.textAlign = 'left'; c.textBaseline = 'middle';
  // 🧑‍🌾 처럼 ZWJ 로 결합된 이모지는 iOS 웹뷰에서 🧑 + 🌾 두 글자로 그려지는데
  //   measureText 는 합쳐진 한 글자 폭을 돌려준다 → 배지보다 글자가 넓어져 밖으로 밀려 나갔다
  //   (2026-09-09 토스 실기기 보고, 농부 삼촌만 해당). 결합 조각 수만큼 여유를 미리 준다.
  const zwjParts = (def.emoji.match(/\u200D/g) || []).length;
  const PAD = 28, MAX_TEXT = W - 12 - PAD * 2;
  let px = 34, textW = 0;
  for (;;) {
    c.font = FONT(px);
    const m = c.measureText(label);
    textW = Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0)) + zwjParts * px * 1.2;
    if (textW <= MAX_TEXT || px <= 22) break;
    px -= 2;                                   // 그래도 넘치면 글자를 줄여 배지 안에 넣는다
  }
  const w = Math.min(W - 12, textW + PAD * 2);
  const x = (W - w) / 2, y = (H - 56) / 2;

  c.fillStyle = badgeColor(def.color);
  roundRect(c, x, y, w, 56, 28); c.fill();
  c.strokeStyle = shadeToLum(def.color, 0.34); c.lineWidth = 4; c.stroke();

  c.save();                                     // 측정이 어긋나도 글자가 배지를 벗어나지 못하게
  roundRect(c, x, y, w, 56, 28); c.clip();
  c.fillStyle = shadeToLum(def.color, 0.14);    // 낮춘 바탕에 맞춰 글자도 진하게
  c.fillText(label, x + (w - textW) / 2, y + 29);
  c.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
  sp.scale.set(2.27, 2.27 * H / W, 1); sp.visible = false;   // 캔버스 비율 그대로 — 배지가 찌그러지지 않게
  return sp;
}

// 주민 실루엣 — 색만 다른 같은 블롭이라 "누가 누군지 모르겠다"(베타)는 피드백을 받아,
//   def.look 별로 모자·소품을 다르게 얹는다. 몸/머리 좌표는 공용과 같아
//   bob·말풍선·이름표·충돌 반경이 그대로 맞는다(여기서 바꾸는 건 장식뿐).
function buildNPCLook(g, def) {
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
function buildNPCs() {
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

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

// 상태 글리프: ! 수락가능 / … 진행중 / ✓ 완료 / (없음) 전부완료
function npcGlyph(o) {
  const st = npcState(o.def.id);
  const q = currentQuest(o.def, st);
  if (!q) return '';                 // 체인도 끝나고 오늘 반복 의뢰도 없다
  if (!st.given) return '!';
  return st.progress >= q.target ? '✓' : '…';
}
function updateNPCGlyph(o) {
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

// 주민 애니메이션: 숨쉬기 + 말풍선 부유 + 근접 시 바라보기 / 아니면 배회
// ── 🦉 올빼미 비행 ──────────────────────────────────────────────
//   "날아다니는 올빼미" 요청. 다만 의뢰를 주는 주민이라 계속 날면 말을 걸 수가 없다 →
//   평소엔 앉아 있다가 가끔 짧게 한 바퀴 돌고 다시 내려앉고, 특별 의뢰가 있을 때만
//   플레이어 앞으로 날아와 착지한다. 대화·충돌은 'perch' 일 때만 산다.
const OWL_REST_MIN = 30, OWL_REST_VAR = 20;   // 앉아 있는 시간 30~50초(전엔 12~22초 — 너무 자주 날았다)
const OWL_STAY_R = 6;                          // 플레이어가 이 안에 있으면 날지 않는다
const OWL_CRUISE = 2.7;     // 순회 고도
const OWL_SPEED = 3.6;      // 공중 이동 속도(유닛/초)
const OWL_CLIMB = 0.9;      // 이·착륙에 쓰는 시간(초)

function setOwlWings(o, spread, t) {
  if (!o.wings) return;
  const flap = spread ? Math.sin(t * 7.5) * 0.42 : 0;
  o.wings.forEach((pivot, i) => {
    const sx = i === 0 ? -1 : 1;
    pivot.rotation.z = sx * (0.1 + spread * (1.05 + flap));
  });
}

// 내려앉을 만한 빈자리 — 주민·플레이어·나무·건물과 안 겹치는 곳. 못 찾으면 null.
//   (안 고르고 내려앉으면 다른 주민 위나 건물 안에 착지한다)
function owlLandingSpot(o, cx, cz, minR, maxR) {
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2, r = minR + Math.random() * (maxR - minR);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    if (!npcBlocked(x, z, o)) return { x, z };
  }
  return null;
}

// tx,tz 로 날아가 내려앉는다. deliver 면 착지할 때 특별 의뢰를 건넨다.
function startOwlFlight(o, tx, tz, deliver = false) {
  o.fly.st = 'up'; o.fly.t = 0; o.fly.tx = tx; o.fly.tz = tz; o.fly.deliver = deliver;
  o.fly.legs = deliver ? 0 : 1 + (Math.random() < 0.5 ? 1 : 0);   // 순찰은 1~2 다리를 돌고 내려앉는다
}

// true 를 반환하면 "지금 하늘에 있다" — 호출자는 배회·시선 처리를 건너뛴다
function updateOwlFly(o, dt, t) {
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

// ── ✨ 올빼미 특별 의뢰 ─────────────────────────────────────────
//   오늘 일일 의뢰(DAILY_COUNT건)를 다 끝내면 올빼미가 특별 의뢰를 물고 날아온다.
//   기존 일일 루프는 그대로 두고 오늘의 의뢰 목록에 4번째를 얹는 방식이라,
//   수락·진행·보상 코드는 손대지 않아도 그대로 굴러간다.
const OWL_SPECIAL_POOL = [
  { type: 'chop',    target: 12, title: '달빛 장작',   desc: '나무 12번 베기' },
  { type: 'fish',    target: 8,  title: '은빛 물결',   desc: '물고기 8마리 낚기' },
  { type: 'mine',    target: 10, title: '깊은 광맥',   desc: '광석 10개 캐기' },
  { type: 'harvest', target: 8,  title: '풍요의 밤',   desc: '작물 8개 수확하기' },
  { type: 'forage',  target: 10, title: '숲의 선물',   desc: '🍄 채집물 10개 줍기' },
  { type: 'sell',    target: 12, title: '별빛 장터',   desc: '상점에서 12개 팔기' },
];

// 오늘 일일 3건을 끝냈고 아직 특별 의뢰를 못 받았으면 true
function owlSpecialPending() {
  const def = NPCS.find(n => n.daily); if (!def) return false;
  const st = npcState(def.id);
  return st.date === todayStr() && st.idx >= DAILY_COUNT
    && Array.isArray(st.quests) && st.quests.length === DAILY_COUNT && !st.special;
}

function deliverOwlSpecial(o) {
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
let owlVisitCooldown = 0;
function updateOwlVisit(dt) {
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

function updateNPC(dt, t) {
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
function npcBlocked(x, z, self = null) {
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
const PLOT_KEEP_OUT = 1.7 / 2 + 0.4;
function onPlotArea(x, z) {
  for (const p of plots) if (Math.abs(x - p.x) < PLOT_KEEP_OUT && Math.abs(z - p.z) < PLOT_KEEP_OUT) return true;
  return false;
}

function wanderNPC(o, dt) {
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

// ── 🧙 상인 방문 이벤트(1회, 강제) — 첫 판매 경험을 상인이 직접 가져다준다 ──
//    발동: 마을 안 + 목재5 또는 물고기1 + 모달 없음 + hintsSeen.merchantVisit 없음
//    walk(플레이어에게 걸어옴, 12초 상한) → talk(모달) → return(좌판 홈으로)
let merchantVisit = null;   // null | { state:'walk'|'talk'|'return', t, offer }
function merchantObj() { return npcObjs.find(o => o.def.id === 'merchant') || null; }

// NPC 를 target 쪽으로 speed 만큼 전진(막히면 좌우 45° 우회). 남은 거리 반환
function stepNpcToward(o, target, speed, dt) {
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

function updateMerchantVisit(dt) {
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

function openMerchantOffer(offer) {
  const wood = offer.item === 'wood';
  ui.openMerchantModal?.({
    title: '방랑 상인',
    body: wood ? '오, 그 🪵 목재 좋구먼! 처음 보는 얼굴이니 후하게 쳐주지.' : '오, 그 🐟 물고기 싱싱하구먼! 처음 보는 얼굴이니 후하게 쳐주지.',
    primary: { label: wood ? '🪵 목재 5개 팔기 (+30🪙)' : '🐟 물고기 팔기 (+25🪙)', onClick: () => merchantWelcomeSell(offer) },
    secondary: { label: '다음에', onClick: () => merchantDismiss() },
  });
}

function merchantWelcomeSell(offer) {
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

function merchantDismiss() {
  ui.closeMerchantModal?.();
  if (merchantVisit) { merchantVisit.state = 'return'; merchantVisit.t = 0; }
  showShopCue(60);
  if (!gameState.hintsSeen.merchantShop) {   // 코치 진행 중에도 1회 표시(firstHintBanner 는 코치 중 억제라 새 유저에겐 영영 안 뜸)
    gameState.hintsSeen.merchantShop = true;
    ui.showHintBanner?.({ ico: '🛒', title: '상점 좌판', line: '동쪽 좌판에서 언제든 팔 수 있어요', near: () => true });
  }
}

// 좌판 위 🛒 안내 스프라이트 — sec 초 동안 둥실거리며 위치를 알려준다
let shopCue = null, shopCueUntil = 0;
function showShopCue(sec) {
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
function updateShopCue(t) {
  if (!shopCue || !shopCue.visible) return;
  if (clock.elapsedTime > shopCueUntil) { shopCue.visible = false; return; }
  shopCue.position.y = 3.2 + Math.sin(t * 2.4) * 0.15;
}

// 근접 시 가장 가까운 주민 선택 → 프롬프트 + 퀘스트 패널
let npcPromptFarm = false;   // 지금 뜬 프롬프트가 "밭일 먼저" 문구인지(주민이 안 바뀌어도 다시 그려야 해서)
function updateNPCInteract() {
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
    nearNPC = near; npcPromptFarm = farmFirst;
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
function talkToNPC() {
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

// 근접 주민의 현재 대화/퀘스트 상태를 뷰 객체로 반환
//   mode: 'offer'(수락 전) | 'progress'(진행 중) | 'claim'(보상 대기) | 'done'(전부 완료)
export function npcDialogState() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  const q = currentQuest(o.def, st);
  if (!q) return { npc: o.def, mode: 'done', line: o.def.doneLine || '덕분에 마을이 살아났어요. 정말 고마워요! 🌼' };
  const bp = q.hidden ? blueprintOfTool(q.tool) : null;   // 🔨 히든 의뢰 — 보상에 📜 도면을 붙여 보인다
  const reward = rewardText(q.reward) + (bp ? ` + 📜 ${bp.name} 도면` : '');
  const base = { npc: o.def, title: q.title, desc: q.desc, how: QUEST_HOW[q.type] || '', target: q.target, reward, qid: questId(o.def, st), qtype: q.type }; // qid: 퍼널 분석용 표준 퀘스트 ID · qtype: 종류(GA4 축)
  if (bp && !st.given && !st.hiddenOpened) {   // [GA4] 히든 의뢰가 처음 눈앞에 뜬 순간(친밀도 문턱 도달 대비 실제 발견)
    st.hiddenOpened = true;
    trackEvent('hidden_quest_open', { npc: o.def.id, tool: q.tool, affinity: gameState.affinity[o.def.id] || 0 });
  }
  if (!st.given) return { ...base, mode: 'offer', line: q.line, progress: 0 };
  if (st.progress < q.target) return { ...base, mode: 'progress', line: '조금만 더 부탁해요!', progress: st.progress };
  return { ...base, mode: 'claim', line: '다 해냈네요! 보상을 받아요 🎁', progress: st.progress };
}

// 퀘스트 수락(모달 "수락하기" 버튼) → 갱신된 상태 반환
export function npcAccept() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  const pending = currentQuest(o.def, st);
  if (!st.given && pending) {
    st.given = true; st.progress = 0; st.readyToasted = false;
    st.acceptedAt = Date.now();         // [퍼널②] 수락 시각(epoch ms) — 저장돼 세션 넘어도 유지
    const q = pending;
    const qid = questId(o.def, st);
    if (q.grant) giveReward(q.grant, 'quest_grant', qid);   // 수행에 필요한 자원 지급(예: 씨앗 3개)
    if (q.hidden) st.hidden = true;                         // 🔨 히든 의뢰가 진행도 포인터를 쥔다
    refreshCollectQuests(); refreshQuestPanel(); updateNPCGlyph(o);
    trackEvent('quest_accept', { quest: q.title, npc: o.def.id, quest_id: qid, quest_type: q.type }); // [GA4]
    churnTrigger('quest');   // [🎯 이탈 예측] 대화·수락·완료는 신뢰구간이 겹쳐 한 트리거로 묶었다
  }
  return npcDialogState();
}

// 보상 수령(모달 "보상 받기" 버튼) → 갱신된 상태 반환
export function npcClaim() {
  const o = nearNPC; if (!o) return null;
  const st = npcState(o.def.id);
  const q = currentQuest(o.def, st);
  if (!q) return npcDialogState();
  const repeating = onRepeatQuest(o.def, st);
  if (st.given && st.progress >= q.target) {
    const qid = questId(o.def, st);
    giveReward(q.reward, 'quest_reward', qid); Sound.harvest();      // [원장] 퀘스트 코인 보상 출처 기록
    // 🔁 반복 의뢰는 코인을 억제한 대신 친밀도로 갚는다 — 선물과 같은 경로라 3단계 답례도 그대로 걸린다
    //    ("주민들한테 선물줘서 친밀도 올리면 뭐가 좋나요" — 베타 건의)
    if (repeating) addAffinity(o.def.id, 1);
    if (o.def.daily && q.lucky) rollLuckyBox(qid);                   // 🎁 데일리 의뢰: 럭키박스 확률 보상
    ui.act?.('quest');                                               // 튜토리얼: 퀘스트 보상까지 완료
    tryUnlockDrop(0.5);                                              // 🎨 랜덤 색(퀘스트 보상, 높은 확률)
    // [퍼널③] 완료 — 수락→완료 소요시간(초). acceptedAt 없는 옛 세이브는 null.
    const elapsed = st.acceptedAt ? Math.round((Date.now() - st.acceptedAt) / 1000) : null;
    trackEvent('quest_complete', { quest: q.title, npc: o.def.id, quest_id: qid, elapsed_sec: elapsed, reward_coins: q.reward.coins || 0, quest_type: q.type }); // [GA4]
    churnTrigger('quest');   // [🎯 이탈 예측]
    // ⚠️ 반복 의뢰에서는 st.idx 를 올리지 않는다 — 체인 길이를 넘어가면 그 주민 대화가 깨진다
    if (q.hidden) {   // 🔨 📜 도면 — 체인 포인터는 건드리지 않는다
      const bp = blueprintOfTool(q.tool);
      gameState.blueprints = { ...gameState.blueprints, [q.tool]: true };
      st.hidden = false;
      ui.toast?.(`📜 ${bp.name} 도면을 받았어요! 작업대 🔧 도구 탭에서 만들 수 있어요`, 3200);
      trackEvent('hidden_quest_clear', { npc: o.def.id, tool: q.tool });   // [GA4] 문턱 도달 → 발견 → 완료 퍼널
    } else if (repeating) st.repeat.done = true; else st.idx++;
    st.given = false; st.progress = 0; st.readyToasted = false; st.acceptedAt = null;
    gameState.story.q = (gameState.story.q || 0) + 1; syncStory();   // 📖 2장(이웃들) 진행
    if (!currentQuest(o.def, st)) { st.allDone = true; syncBadges(); } // 🏅 체인 완료 배지(패널은 아래 refreshQuestPanel 이 다시 그린다)
    refreshCollectQuests(); refreshQuestPanel(); updateNPCGlyph(o);
  }
  return npcDialogState();
}

// 이벤트형 퀘스트 진행(벌목/수확/물주기/심기/건축) — 모든 주민 검사
function questEvent(type, amount = 1) {
  for (const o of npcObjs) {
    const st = npcState(o.def.id);
    if (!st.given) continue;
    const q = currentQuest(o.def, st);
    if (!q || q.type !== type) continue;
    st.progress = Math.min(q.target, st.progress + amount);
    if (st.progress >= q.target) ui.toast?.(`✅ ${o.def.name}의 목표 달성!`);
    updateNPCGlyph(o);
  }
  refreshQuestPanel();
}

// 상태형 퀘스트(collect_wood/collect_crop/house/serve) — 인벤토리·집 단계·서빙 기록에서 재계산
//   ⚠️ house 는 "집 완성"이라는 되돌릴 수 없는 1회성 상태다. 이벤트로만 진행시키면
//      집을 먼저 짓고 나중에 의뢰를 수락한 사람은 다시 완성할 방법이 없어 영원히 0/1 에 갇힌다.
//      그래서 매번 houseStage 를 읽어 진행도를 맞춘다(이미 갇힌 세이브도 접속하면 저절로 풀린다).
function refreshCollectQuests() {
  for (const o of npcObjs) {
    const st = npcState(o.def.id);
    if (!st.given) continue;
    const q = currentQuest(o.def, st);
    if (!q) continue;
    if (q.type === 'collect_wood') st.progress = Math.min(q.target, gameState.inventory.wood);
    else if (q.type === 'collect_crop') st.progress = Math.min(q.target, gameState.inventory.crop);
    else if (q.type === 'house') st.progress = gameState.houseStage >= 3 ? q.target : 0;
    // 🏗️ 증축도 되돌릴 수 없다 — 이벤트가 아니라 지금 집 단계를 읽는다(수락 전에 지어버린 사람도 통과).
    else if (q.type === 'expand') st.progress = gameState.houseStage >= q.stage ? q.target : 0;
    // 📖 도감도 되돌릴 수 없다 — 수락 전에 이미 모은 사람이 영원히 못 깨면 안 된다
    else if (q.type === 'collect_dex') st.progress = Math.min(q.target, dexCount());
    else if (q.type === 'dex_one') st.progress = gameState.dex[q.cat]?.[q.dexId] ? q.target : 0;   // 🏛️ 콕 집은 그 종
    // ☕ 서빙도 같은 함정 — 손님은 하루 CAFE_ORDERS 명뿐이고 다시 서빙할 수 없다.
    //   먼저 서빙하고 나중에 의뢰를 받으면 남은 손님이 모자라 그날은 완료가 불가능해진다.
    //   그래서 "오늘 서빙한 손님 수"를 읽는다. 날짜가 지난 기록(cafeOrders() 가 아직 안 비운 어제치)은 0.
    else if (q.type === 'serve') st.progress = Math.min(q.target, gameState.cafe.date === todayStr() ? gameState.cafe.done.length : 0);
    // 🥚🌫️🛶 도 같은 함정 — 하루 1회뿐이라 "수락 전에 이미 해버린" 사람은 다시 할 방법이 없다.
    //   이벤트가 아니라 오늘의 상태를 읽는다(이미 갇힌 세이브도 접속하면 저절로 풀린다).
    else if (q.type === 'egg')  st.progress = gameState.coop.collected === todayStr() ? q.target : 0;
    else if (q.type === 'mist') st.progress = (gameState.mist.date === todayStr() && gameState.mist.purified) ? q.target : 0;
    else if (q.type === 'boat') st.progress = Math.min(q.target, gameState.boat.date === todayStr() ? (gameState.boat.clearsToday || 0) : 0);
    // 🗿 조각도 같다 — 일일 주문 3건은 포기·실패로도 소진되므로, 수락 전에 다 써버리면 다시 할 방법이 없다
    else if (q.type === 'carve') st.progress = Math.min(q.target, gameState.workshop.date === todayStr() ? (gameState.workshop.carvedToday || 0) : 0);
    else continue;
    if (st.progress >= q.target && !st.readyToasted) { st.readyToasted = true; ui.toast?.(`✅ ${o.def.name}의 목표 달성!`); }
    updateNPCGlyph(o);
  }
  refreshQuestPanel();
}

function questView(o) {
  const st = npcState(o.def.id);
  if (!st.given) return null;
  const q = currentQuest(o.def, st);
  if (!q) return null;
  return { id: o.def.id, name: o.def.name, title: q.title, desc: q.desc, how: QUEST_HOW[q.type] || '', progress: st.progress, target: q.target, ready: st.progress >= q.target };
}
// 📱 화면이 좁으면 HUD 3단 레이아웃이라, 짧으면(폰 가로·분할 화면) 패널 아래가 잘려
//    줄 자리가 없다 — 담는 건수를 줄인다(나머지는 "+ N건 더" 로 알린다).
function questPanelTop() {
  if (window.innerHeight < 560) return 1;                                  // 폰 가로·분할 화면
  return window.matchMedia?.('(max-width: 640px)').matches ? 2 : 3;
}
// 📜 패널은 "수락된 의뢰 전부" 를 받는다 — 한 명만 그리면 다른 의뢰를 완료했을 때
//    살아 있는 의뢰가 화면에서 사라진다(규칙·회귀 테스트는 js/quests.js activeQuestList).
//    pin(nearNPC)은 "지금 눈앞에 있는 사람을 맨 위로" 라는 힌트일 뿐 — 멀어지면 저절로 풀린다.
function refreshQuestPanel() {
  const views = npcObjs.map(questView).filter(Boolean);
  ui.setQuest?.(activeQuestList(views, { top: questPanelTop(), pinId: nearNPC?.def.id || null }));
}
function rewardText(r) { return Object.entries(r).map(([k, v]) => `${t(RES_LABEL[k] || k)}+${v}`).join(', '); }   // [i18n] 라벨을 원천에서 번역 — 플로트/토스트/퀘스트 어디서든 조합돼도 영어 유지

// 🎚️ 이 판의 난이도를 뽑고 순회 카운터를 올린다. 돌려준 { ease, arm, dda } 를 그대로 결과 이벤트에 싣는다.
//    id 는 clientId(기기 영구 식별자) — 게스트도 세션을 넘어 같은 팔 순서를 이어 간다.
function rollDifficulty(game) {
  const st = gameState.difficulty[game] || (gameState.difficulty[game] = { dda: 1, n: 0 });
  const r = easeFor(game, authState.clientId || authState.userId || '', st.n, st.dda);
  st.n += 1;
  return r;
}

// 🎚️ 판이 끝나면 결과를 먹인다. outcome 은 0~1 — 이진은 성공 1 / 실패 0, 점수 게임은 점수/만점.
//    ddaOn:false 인 게임에선 nextDda 가 그대로 돌려주므로 호출해도 안전하다(1주 차 요리·가공).
function settleDifficulty(game, outcome) {
  const st = gameState.difficulty[game]; if (!st) return;
  st.dda = nextDda(game, st.dda, outcome);
}

// 🎚️ 결과 이벤트에 펼칠 세 필드. GA4 예약 파라미터(source·medium·campaign·term·content)와 겹치지 않는다.
const diffParams = r => ({
  ease: Math.round((r?.ease ?? 1) * 100) / 100,
  dda:  Math.round((r?.dda  ?? 1) * 100) / 100,
  arm:  r?.arm ?? null,
});

function giveReward(r, source = 'reward', item = null) {
  // 🧪 [베타 A군] 가입 3일 부스트 — 출석·퀘스트·럭키박스 코인 ×1.5, 원장 item에 |boost 마커(원값=÷1.5 복원 가능)
  if (r.coins && TUNING.rewardBoost.sources.includes(source)) {
    const bm = rewardBoostMult(authState.variant, authState.createdAt);
    if (bm > 1) { r = { ...r, coins: Math.round(r.coins * bm) }; item = (item ?? source) + '|boost'; }
  }
  for (const k in r) gameState.inventory[k] = (gameState.inventory[k] || 0) + r[k];
  if (r.coins) logEcon(source, item, r.coins, gameState.inventory.coins); // [원장] 코인 보상 유입(출처 명시)
  refreshInventoryUI();
  if (player) spawnFloatText(player.position.x, 1.9, player.position.z, '+' + rewardText(r), '#2fa564'); // 보상 표시
}

// =============================================================
//  UI / 유틸
// =============================================================
function refreshInventoryUI() {
  ui.setInventory?.(gameState.inventory);
  refreshCollectQuests();   // 보유량형 퀘스트 진행 갱신
}
function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
// 해당 위치가 장애물(나무·호수·벤치·가로등·집)과 겹치는지 — 밭 크기 여유(0.95) 포함
function isBlocked(x, z) { return obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.95); }
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
function onResize() {
  refreshQuestPanel();   // 📜 가로/세로 전환으로 폭이 바뀌면 패널에 담기는 건수도 달라진다
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  if (museumView) museumView.frame = museumViewFrame(museumView.mesh);   // 🔍 관람 중 화면이 돌면 무대도 다시 잰다
}

// 🔁 js/spaces/* 가 가져다 쓰는 이름 — 선언 원문은 그대로 두고 여기서만 내보낸다(tools/refactor/extract-module.mjs)
export {
  BARN, DIG_WINDOW, FORAGE_NODES, GLADE_MAX, HINT_H, HINT_W, IS_MOBILE, LAKE, ORES, RAIN_DAY, RES_ICON, RES_LABEL,
  SEVERE_TODAY, SEVERE_TOMORROW, WEATHER, _camLook, _camTarget, _hintAnyPrev, _seaPrevTool, _v, actAnim,
  analog, applyCosmetics, applyHouseStyle, armWristK, atCafe, atFarm, atMine, atMist, atMuseum, atOrchard,
  atRiver, atSea, awardBadge, baitActive, biteAt, biteEnd, blockIfLocked, boat, boatView, bobber, buffOn,
  buffs, bugJarMesh, bugRespawnAt, cafeGuestCache, cafeGuestFetcher, cafeGuestObjs, cafeInGroup, camera,
  castPos, catchCeremony, clayMat, clearCrop, clearPest, clock, colliders, cookTier, cosmeticShop, cropMini,
  currentTool, cycleSapSel, dateHash, dayStr, decorGhost, decorMeshes, decorNearRing, decorRot, decorTapHintShown,
  decorTarget, dexDiscover, diffParams, disposeTree, dist2D, doPlayerAction, dockGroup, duelFetcher, easeOutBack,
  farmActionFirst, farmBuildingRecs, farmCropMeshes, farmGroup, farmHalf, farmSoilMesh, fertTarget, finishPetJob,
  firstHint, firstHintBanner, fishDiff, fishMesh, fishState, floatTexts, forageNodes, forecastLine, forestGroup,
  gambrelRoofSlabs, gambrelSolid, gameState, ghostOutdoor, giveReward, gladeBugs, gladeGroup, habitatCells,
  habitatCtx, habitatEnvAt, handAnchor, harvestTexture, heldGroup, heldToolMesh, houseCollider, houseFloor,
  houseGhost, houseGroup, houseSign, houseSignCtx, houseSignTex, houseWindows, indoor, interiorFloor, interiorFloors,
  interiorGroup, interiorLamp, isBlocked, isNight, keys, kitchenFinish, kitchenStart, lastDoorPrompt, lastFloorChoiceKey,
  lastNearHouse, lastNearMiss, lastZoneHint, lerpAngle, makeCharacterPreview, makeNameTag, makeSignBoard,
  makeSignpost, mapLocked, markHabitatDirty, measureStowLen, mergeGeos, mgView, mineGroup, mineTorches, mist,
  mistGroup, mistLanterns, mistTree, mode, museumGroup, nearBench, nearBoat, nearBoatShop, nearCafeBoard,
  nearCafeGuest, nearCoop, nearCosShop, nearDecorMesh, nearDoor, nearDoorFloor, nearForest, nearGlade, nearKitchen,
  nearMarket, nearNPC, nearOutdoorMesh, nearRank, nearShop, nearStation, nightFetcher, nightLevel, nightNoteFetcher,
  noteSpecialExhibit, npcObjs, obstacles, onPlotArea, orchardSlotsWorld, orchardStreamWorld, oreRocks, outdoorMesh,
  outdoorMeshes, outdoorTarget, paintGeo, pantryHas, pantryTake, pendingDig, pendingDish, pestTarget, pestTexture,
  pet3d, petChoresNear, petJob, pickedDecor, pickedOutdoor, placeOutdoor, placingDecor, placingOutdoor, player,
  playerAnchor, playerArms, playerInYard, plots, pointer, poseHeldTool, priceOf, priceRate, questEvent, raycaster,
  rebuildInteriorFinish, rebuildOrchard, refreshCollectQuests, refreshCropStage, refreshHeldTool, refreshInventoryUI,
  refreshStations, removeSolid, renderer, respawnPet, rewardText, riverActive, riverCourse, riverGroup, riverPool,
  rollDifficulty, roundRect, scene, seaBuoy, seaFishes, seaGroup, seaLine, seaMG, seaRodMesh, seedHintTexture,
  setFogExempt, setHeldDecor, setHeldTool, setPlotHarvest, setPlotSeedHint, setPlotWarn, setSpaceVisible,
  settleDifficulty, settleOrchard, severeOf, shared, showCatchItem, sitting, situation, snapCamera, solidBox,
  solidCircle, spawnConfetti, spawnDust, spawnFloatText, spawnLeafBurst, spawnSparkle, spawnSplash, spawnTree,
  spawnWater, spawnWoodChips, stopOutdoorPlacing, swayables, syncBadges, syncFarmHints, syncStory, todayStr,
  toolMesh, toolPage, trackGateBlocked, trees, triggerFarmReveal, triggerMoment, tryUnlockDrop, ui, updateCarveScene,
  updatePlotVisual, updateStowPose, updateToolPageAuto, usePet, vtxMat, wantAction, warnTexture, weatherOf,
  weedTexture, wiltPlot, woodMat, workerCap, worldGround, worldGroundPatches,
};
