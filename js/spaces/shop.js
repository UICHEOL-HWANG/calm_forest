// =============================================================
//  🛒 상점 좌판·시세판·사고팔기 (구역 머리말 — 분리 2단계)
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  RES_LABEL, clayMat, forecastLine, gameState, giveReward, makeSignpost, obstacles, player, priceOf, priceRate,
  questEvent, refreshHeldTool, refreshInventoryUI, roundRect, scene, solidCircle, spawnFloatText, ui, woodMat,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { SELL_PRICE, SHOP_BUY } from '../data/catalog.js';
import { MARKET, SELL_ICO_G, SHOP } from '../data/places.js';
import { topPriceLine } from '../first-loop.js';
import { t } from '../i18n.js';
import { logEcon } from '../metrics.js';
import { FRUITS, sapKeyOf } from '../orchard.js';
import { Sound } from '../sound.js';
import { updateHouseSign } from '../spaces/house.js';
import { state as authState } from '../supabase-client.js';
import { rewardBoostMult } from '../tuning.js';
import * as THREE from 'three';

// 상점 좌판(절차적)
export function spawnShop() {
  const g = new THREE.Group(); g.position.copy(SHOP);
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.7), woodMat(2, 1)); counter.position.y = 0.45; counter.castShadow = true; g.add(counter);
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.9), woodMat(1, 1)); top.position.y = 0.95; g.add(top);
  // 차양(줄무늬 두 칸)
  for (let i = 0; i < 4; i++) {
    const c = i % 2 ? 0xff8f8f : 0xfff2e0;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.7), clayMat(c, false));
    s.position.set(-0.75 + i * 0.5, 1.9, 0.1); s.rotation.x = -0.35; g.add(s);
  }
  for (const x of [-0.9, 0.9]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2, 6), clayMat(0x6b4a34)); p.position.set(x, 1, -0.2); g.add(p); }
  g.add(makeSignpost('🛒 상점', 1.4, 0.7));   // 팻말
  // 💬 오늘 시세 최고 품목 말풍선 — 멀리서도 "여기서 판다"가 읽히게(자정 시세 갱신은 새로고침 시 반영)
  const rates = {}; for (const k in SELL_PRICE) rates[k] = Math.round(priceRate(k) * 100);
  const topLine = topPriceLine(rates, SELL_ICO_G);
  const bcv = document.createElement('canvas'); bcv.width = 512; bcv.height = 160;
  const bc = bcv.getContext('2d');
  // 블룸(후광)에 안 걸리게 낮춘 크림 톤 — updateHouseSign 의 #b8d2ba 와 같은 규칙.
  // UnrealBloomPass 임계값 0.85 를 넘으면 말풍선 전체가 빛나 글자가 날아간다(#f5efe0 은 휘도 0.94였음).
  bc.fillStyle = '#d8ccae'; roundRect(bc, 12, 12, 488, 116, 30); bc.fill();
  bc.beginPath(); bc.moveTo(236, 126); bc.lineTo(276, 126); bc.lineTo(256, 152); bc.closePath(); bc.fill();   // 꼬리
  bc.lineWidth = 5; bc.strokeStyle = '#a89a6e'; roundRect(bc, 12, 12, 488, 116, 30); bc.stroke();   // 진한 테두리
  bc.fillStyle = '#1f7a48'; bc.textAlign = 'center'; bc.font = 'bold 52px sans-serif';   // 낮춘 바탕에 맞춰 글자도 진하게
  bc.fillText(t(topLine.text), 256, 88);
  const btex = new THREE.CanvasTexture(bcv); btex.minFilter = THREE.LinearFilter; btex.magFilter = THREE.LinearFilter; btex.generateMipmaps = false;
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: btex, transparent: true, depthWrite: false }));
  bubble.scale.set(2.4, 0.75, 1); bubble.position.set(0, 2.55, 0.2); g.add(bubble);
  scene.add(g);
  obstacles.push({ x: SHOP.x, z: SHOP.z, r: 1.6 });
  solidCircle(SHOP.x, SHOP.z, 1.15);   // 🚧 좌판 (상점 상호작용 2.0 확보)
}

export function spawnMarketBoard() {
  const g = new THREE.Group(); g.position.copy(MARKET);
  for (const x of [-0.8, 0.8]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 2.1, 6), woodMat(1, 1));
    p.position.set(x, 1.05, -0.12); p.castShadow = true; g.add(p);   // 판 뒤에서 받침(정면에서 판을 안 가로지르게 — 랭킹 게시판과 동일)
  }
  // 보드 캔버스 — 한글 "시세판" 크게 + 오늘의 최고/최저 등락(멀리서도 읽히게)
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320;
  const c = cv.getContext('2d');
  c.fillStyle = '#6a4c32'; c.fillRect(0, 0, 512, 320);                    // 나무 프레임
  c.fillStyle = '#f7f0dc'; c.fillRect(18, 18, 476, 284);                  // 종이판
  c.fillStyle = '#8a6a48';                                                 // 코너 못 장식
  [[34, 34], [478, 34], [34, 286], [478, 286]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill(); });
  c.textAlign = 'center';
  c.fillStyle = '#4a3b28'; c.font = 'bold 74px sans-serif';
  c.fillText(t('📊 시세판'), 256, 96);                                     // 한글 제목 큼직하게
  c.strokeStyle = '#d9cdb0'; c.lineWidth = 4;
  c.beginPath(); c.moveTo(50, 122); c.lineTo(462, 122); c.stroke();       // 구분선
  const ks = Object.keys(SELL_PRICE);
  const hi = ks.reduce((a, b) => (priceRate(a) >= priceRate(b) ? a : b));
  const lo = ks.reduce((a, b) => (priceRate(a) <= priceRate(b) ? a : b));
  const pct = (k) => Math.round(priceRate(k) * 100) - 100;
  c.font = 'bold 48px sans-serif';
  c.fillStyle = '#2fa564'; c.fillText(t(`${SELL_ICO_G[hi]} 비싸요  +${pct(hi)}%`), 256, 186);
  c.fillStyle = '#d05a4a'; c.fillText(t(`${SELL_ICO_G[lo]} 싸요  ${pct(lo)}%`), 256, 248);
  c.fillStyle = '#8a7a5f'; c.font = '26px sans-serif';
  c.fillText(t('가격은 매일 자정에 바뀌어요'), 256, 292);
  const tex = new THREE.CanvasTexture(cv);
  // 재질 배열: +z 앞면만 시세판 텍스처, 나머지는 나무 톤(옆면 스트레치 방지)
  const woodSide = new THREE.MeshStandardMaterial({ color: 0x9a7248, roughness: 0.9 });
  const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 0.08),
    [woodSide, woodSide, woodSide, woodSide, front, woodSide]);
  board.position.y = 1.45; board.castShadow = true; g.add(board);
  scene.add(g);   // 회전 없음 — 게임 카메라(남쪽에서 북쪽을 봄)를 향해 앞면(+z) 표시
  obstacles.push({ x: MARKET.x, z: MARKET.z, r: 0.9 });
  solidCircle(MARKET.x, MARKET.z, 0.8);   // 🚧 전광판 (시세 상호작용 2.0 확보)
}

// 시세판 모달 데이터 — index.html(ui.openMarket)이 렌더
export function marketData() {
  return {
    items: Object.keys(SELL_PRICE).map(k => ({
      k, ico: SELL_ICO_G[k] || '📦', label: RES_LABEL[k] || k,   // 파일의 다른 모든 호출부와 같은 폴백 — 빠진 키가 "undefined" 로 그려지지 않게
      price: priceOf(k), base: SELL_PRICE[k], rate: Math.round(priceRate(k) * 100) - 100, // 등락 %(0=기본가)
    })).sort((a, b) => b.rate - a.rate),       // 비싼 순 정렬(오늘 뭘 팔지 바로 보이게)
    forecast: forecastLine(),
  };
}

// 판매: 보유 자원 → 코인
export function sellItem(k, all) {
  const have = gameState.inventory[k] || 0;
  if (have <= 0) return { ok: false, msg: '팔 게 없어요' };
  const qty = all ? have : 1;
  gameState.inventory[k] -= qty;
  const bm = rewardBoostMult(authState.variant, authState.createdAt);   // 🧪 [베타 A군] 판매 부스트
  const gain = Math.round(priceOf(k) * qty * bm);
  const ledgerItem = bm > 1 ? k + '|boost' : k;
  gameState.inventory.coins = (gameState.inventory.coins || 0) + gain;
  refreshInventoryUI();
  Sound.blip();
  questEvent('sell', qty);                          // 데일리 의뢰(장사) 진행
  ui.act?.('sell');                                 // 튜토리얼: 첫 판매
  trackEvent('shop_sell', { item: k, qty, gain, rate: Math.round(priceRate(k) * 100) });  // [GA4] 금액+시세%(시세 반응 분석용)
  logEcon('shop_sell', ledgerItem, gain, gameState.inventory.coins);  // [원장] 코인 유입
  return { ok: true, gain, qty };
}

// 구매: 코인 → 아이템
export function buyShop(id) {
  const it = SHOP_BUY.find(x => x.id === id); if (!it) return { ok: false };
  if (it.upgrade && gameState.upgrades[it.upgrade]) return { ok: false, msg: '이미 보유한 도구예요' };
  if ((gameState.inventory.coins || 0) < it.coin) return { ok: false, msg: '코인이 부족해요' };
  gameState.inventory.coins -= it.coin;
  if (it.give) giveReward(it.give, 'shop_buy_bundle', id);
  if (it.upgrade) {                                   // 도구 업그레이드 코인 구매
    gameState.upgrades[it.upgrade] = true;
    refreshHeldTool();                                // 🪓 산 즉시 손에 든 도구가 달라진다
    if (it.upgrade === 'hammer') updateHouseSign();   // 🔨 집 간판의 🪵 숫자도 같이 내려간다
    spawnFloatText(player.position.x, 1.6, player.position.z, `${it.ico} ${it.name}!`, '#2f7a44');
    Sound.complete();
  } else {
    Sound.harvest();
  }
  refreshInventoryUI();
  trackEvent('shop_buy', { item: id, cost: it.coin });  // [GA4] 구매 금액 포함
  // 🍎 묘목 구매는 생애주기 1단계라 따로 보낸다(스펙 §6-2). shop_buy 만으로는
  //   ① item 이 상점 id('sap_apple')라 파종·수확의 kind('apple')와 join 이 안 되고
  //   ② §6-3 이 요구하는 trees(그 시점 보유 그루 수)가 나중에 복원 불가다 —
  //      "몇 그루째부터 이탈하는지"는 이 축 없이는 영영 못 묻는다.
  //   ⚠️ GA4 예약어(source/medium/campaign/campaign_id/term/content)는 쓰지 않는다.
  const sapFruit = FRUITS.find(f => sapKeyOf(f.id) === it.id);
  if (sapFruit) trackEvent('sapling_buy', { kind: sapFruit.id, coin: it.coin, trees: (gameState.orchard?.trees || []).length });   // [GA4]
  logEcon('shop_buy', id, -it.coin, gameState.inventory.coins);  // [원장] 코인 소비
  return { ok: true, name: it.name };
}
