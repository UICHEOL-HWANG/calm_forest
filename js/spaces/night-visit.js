// =============================================================
//  🦝 밤손님 — 자리를 비운 밤사이 너구리·멧돼지가 작물을 훔쳐간다
//  ------------------------------------------------------------
//  js/game.js 에서 원문 그대로 옮겨 온 구역(분리 2단계, 2026-09-26).
//  ⚠️ game.js 와 서로 import 한다(순환). 로딩 시점엔 game.js 값을 읽지 않는다 — 함수 안에서만.
//     game.js 에 남은 let 에 쓸 때는 `$w.x = …` (읽기는 그냥 x). 도구·증명: tools/refactor/
// =============================================================
import {
  camera, clearCrop, dexDiscover, doPlayerAction, duelFetcher, farmCropMeshes, farmSoilMesh, firstHint, floatTexts,
  gameState, giveReward, nightFetcher, nightNoteFetcher, player, plots, refreshInventoryUI, requestSave,
  roundRect, scene, spawnDust, spawnSparkle, todayStr, ui, updatePlotVisual, worldGround, worldGroundPatches,
} from '../game.js';   // 🔁 순환 import — 함수 안에서만 쓴다(로딩 시점엔 안 읽는다: verify-extract (d))
import { trackEvent } from '../analytics.js';
import { DEX } from '../data/dex.js';
import { makeRaidScar } from '../duel/raid-art.js';
import { truceUntil } from '../duel/truce.js';
import { ADV_CROPS } from '../farm-crops.js';
import { t } from '../i18n.js';
import { Sound } from '../sound.js';
import * as THREE from 'three';

// 🐗🦝 승부 중 — 카메라·조작을 무대(js/duel/stage.js)에 넘긴다.
//   ⚠️ 이 플래그가 없으면 updateCamera 가 **매 프레임 카메라를 되돌려** 클로즈업이 안 걸린다
//      (🍳 요리가 mgView 로 막는 것과 같은 자리). 무대만 만들고 이걸 빠뜨려 한 번 겪었다.
export let duelActive = false;

export const NIGHT_ANIMAL = {
  raccoon: { ico: '🦝', name: '너구리' },
  boar:    { ico: '🐗', name: '멧돼지' },
};

export const traceObjs = [];

// 흔적 위 '🐾 조사' 말풍선(공유 텍스처) — 밭의 '물 줘요!' 와 같은 문법
export let _traceMat = null;

export function traceMaterial() {
  if (_traceMat) return _traceMat;
  const cv = document.createElement('canvas'); cv.width = 200; cv.height = 104;
  const c = cv.getContext('2d');
  c.fillStyle = 'rgba(226,196,158,0.96)'; roundRect(c, 8, 8, 184, 64, 18); c.fill();
  c.beginPath(); c.moveTo(90, 72); c.lineTo(110, 72); c.lineTo(96, 94); c.closePath(); c.fill();
  c.fillStyle = '#5a4126'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(t('🐾 조사!'), 100, 40);
  const tex = new THREE.CanvasTexture(cv);
  _traceMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  return _traceMat;
}

// 파헤쳐진 흙 + 도망간 방향 발자국 — "눈으로 봐야 사건으로 느껴진다"
export function traceMesh(animal, x = 0, z = 0) {
  // 🐾 밤사이 털린 밭 — 대결 무대 발밑과 같은 조형(js/duel/raid-art.js). 예전엔 흙무더기 구 둘 +
  //   원판 발자국이라 "밤티" 였고, 구가 캐릭터 발밑을 뚫고 솟아 통과하는 것처럼 보였다(제보 2026-09-24).
  //   달아난 방향은 좌표 시드로 정한다 — 같은 흔적은 새로고침해도 같은 모양.
  const seed = x * 31 + z * 17, a = ((seed * 0.6180339) % 1) * Math.PI * 2;
  const g = makeRaidScar(THREE, { animal, seed, away: [Math.cos(a), Math.sin(a)] });
  const bubble = new THREE.Sprite(traceMaterial());
  bubble.scale.set(1.28, 0.7, 1); bubble.position.set(0, 1.35, 0);
  g.add(bubble);
  return g;
}

export function spawnTrace(t, silent = false) {
  const m = traceMesh(t.animal, t.x, t.z); m.position.set(t.x, 0, t.z);
  scene.add(m); traceObjs.push({ mesh: m, data: t });
  if (!silent) { m.userData.pop = 1; m.scale.setScalar(0.01); spawnDust(t.x, t.z, 10); }
}

// 조사(도구 불필요·모바일 액션 버튼 동일): 흔적 제거 + 수집품 도감 + 씨앗 위로
export function investigateTrace(tr) {
  const t = tr.data;
  scene.remove(tr.mesh);
  traceObjs.splice(traceObjs.indexOf(tr), 1);
  gameState.night.traces = gameState.night.traces.filter(x => !(x.x === t.x && x.z === t.z));
  const entry = DEX.track.find(e => e.id === t.loot);
  doPlayerAction(t.x, t.z, 'pick');   // 🐾 흔적도 도구 없이 살피는 동작
  Sound.blip();
  spawnDust(t.x, t.z, 12);
  spawnSparkle(t.x, 0.7, t.z, 18);
  giveReward({ seed: 2 }, 'night_trace', t.loot);        // [원장] 위로 보상 — 손실이 벌이 되지 않게
  ui.toast?.(`🔍 ${NIGHT_ANIMAL[t.animal]?.ico || '🐾'} 흔적에서 ${entry?.ico || ''} ${entry?.name || '수집품'}을 찾았어요!`, 2600);
  dexDiscover('track', t.loot);                          // 📖 도감 신규 카테고리 '흔적'
  trackEvent('night_trace', { animal: t.animal });       // [GA4] 조사 전환율
  requestSave();       // ← 대결 전에 저장한다(리롤 방지의 핵심: 흔적은 이미 지워졌고 보상은 이미 줬다)
  maybeDuel(t);
}

// 🐗🦝 대결 — 하루에 동물당 한 번. 이기면 그 동물이 가져간 작물을 전부 되찾는다.
//   ▶ 흔적 보상을 먼저 주고 흔적을 지운 **뒤**에 연다. 새로고침해도 흔적이 없어
//     다시 못 하고(리롤 방지), 중간에 창을 닫아도 손해가 없다.
export async function maybeDuel(t) {
  if (!duelFetcher) return;                              // 등록 전이면 지금까지 동작 그대로
  const st = gameState.night, today = todayStr();
  if (st.duelDate !== today) { st.duelDate = today; st.duelDone = []; }   // 날이 바뀌면 비운다
  if (st.duelDone.includes(t.animal)) return;            // 오늘 이 동물과는 이미 붙었다
  st.duelDone = [...st.duelDone, t.animal];
  // 그 동물이 오늘 가져간 작물 전부 — 방금 조사한 것 + 아직 조사 안 한 흔적
  const crops = [t.crop || '', ...st.traces.filter(x => x.animal === t.animal).map(x => x.crop || '')];
  // ⚠️ 리롤 방지의 핵심은 "흔적이 지워진 상태가 **저장됐다**"는 것이다. fire-and-forget 으로
  //    두면 오프라인·저장 실패 때 흔적과 duelDone 이 안 남아 새로고침 재도전이 열린다.
  //    저장이 실패하면 승부를 **열지 않는다** — 흔적이 남아 다음에 다시 조사하면 된다.
  //    ⚠️ saveGame 은 실패를 **던지지 않고** { ok:false } 로 돌려준다(supabase-client.js:310).
  //       try/catch 만으로는 실패가 절대 안 잡힌다 — 반환값을 봐야 한다.
  //    ⚠️ offline:true 는 막지 않는다. 게스트·오프라인은 세이브 자체가 없어 새로고침하면
  //       밭도 작물도 다 사라진다 — 리롤을 걱정할 진행이 애초에 남지 않는다.
  let saved = null;
  try {
    saved = await requestSave();
  } catch (e) {
    saved = { ok: false, error: e };
  }
  if (saved && saved.ok === false) {
    st.duelDone = st.duelDone.filter(a => a !== t.animal);   // 되돌린다(다음 기회를 뺏지 않게)
    st.traces = [...st.traces, t];                           // 흔적도 되살린다 — 다음에 다시 조사하면 된다
    spawnTrace(t);
    console.warn('[승부] 저장 실패 — 이번엔 열지 않는다(흔적은 다시 살려둔다)', saved.error?.message || saved.locked || '');
    return;
  }
  duelActive = true;                                     // 카메라를 무대에 넘긴다(위 주석 참고)
  // 흔적 보상(+씨앗)이 **승부 직전에** 띄운 월드 텍스트를 치운다 — spawnFloatText 의 duelActive
  //   가드는 이후 호출만 막는다. 이미 떠 있는 건 무대 위에 남아 화면을 덮는다(실측).
  for (const sp of floatTexts) scene.remove(sp);
  floatTexts.length = 0;
  // 🥕 그릇에 넣어 보여줄 작물 아이콘 — 고급 작물만 제 아이콘이 있고 나머지는 🥕(tryHarvest 와 같은 규칙)
  const firstId = crops.find(c => c) || '';
  const cropIco = (firstId && ADV_CROPS.find(c => c.id === firstId)?.ico) || '🥕';
  duelFetcher({ animal: t.animal, x: t.x, z: t.z, crops, cropIco, stage: { THREE, scene, camera, player, keep: duelKeep() } })
    .then(won => { if (won) winDuel(t.animal, crops); requestSave(); })
    .catch(e => console.warn('[승부] 진행 실패 — 오늘은 넘어간다', e?.message || e))
    .finally(() => { duelActive = false; });
}

// 🥊 일대일 무대에 남길 것 — 땅과 밭(흙·작물)만. 나머지(주민·건물·나무·이름표·밭 배지)는
//   무대가 전부 숨겼다가 끝나면 되살린다(js/duel/stage.js). 밭 배지(farmHintMeshes)는 일부러 뺀다 —
//   "씨앗을 넣어요" 가 결투 한가운데 떠 있던 게 제보된 문제다(2026-09-24).
export function duelKeep() {
  return [worldGround, worldGroundPatches, farmSoilMesh, ...Object.values(farmCropMeshes || {})].filter(Boolean);
}

// 승리 — 작물 회수(tryHarvest 와 같은 지급 규칙) + 🤝 발길 끊기
//   밭은 되살리지 않는다: 성장 단계까지 복원하면 도난이 없던 일이 되고 다시 심을 이유가 사라진다.
export function winDuel(animal, crops) {
  for (const id of crops) {
    // 🌾 고급 작물(밀·옥수수·포도)은 종류별 인벤 키, 나머지는 crop — tryHarvest 와 같은 규칙.
    //    씨앗은 주지 않는다: 수확이 아니라 회수다. 옛 세이브의 빈 crop('')은 일반 작물로 본다.
    if (id && ADV_CROPS.some(c => c.id === id)) gameState.inventory[id] = (gameState.inventory[id] || 0) + 1;
    else gameState.inventory.crop = (gameState.inventory.crop || 0) + 1;
  }
  // ⚠️ 편차: truceUntil 은 잘못된 날짜에 null 을 돌려준다(하드닝됨) — null 을 세이브에 그대로 쓰면
  //   "영구 휴전"으로 읽혀 더 나쁘다. 못 받았으면 기존 휴전값을 그대로 둔다.
  const nextTruce = truceUntil(todayStr());
  if (nextTruce) gameState.night.truce = { ...gameState.night.truce, [animal]: nextTruce };
  refreshInventoryUI();
  const a = NIGHT_ANIMAL[animal] || NIGHT_ANIMAL.raccoon;
  // [i18n] 통문장 키 + 슬롯 — 조각을 이어 붙이면 영어에서 어순이 깨진다(저장소 규칙)
  ui.toast?.(t('{0} {1}에게서 작물 {2}개를 되찾았어요! 당분간 안 올 거예요')
    .replace('{0}', a.ico).replace('{1}', t(a.name)).replace('{2}', crops.length), 3600);
}

// 방어 판정 입력 — 심어둔 밭 9칸 안의 허수아비·울타리(4개 이상)만 인정
export function computeNightDefense(cands) {
  const near = (o, r) => cands.some(c => Math.hypot(o.x - c.p.x, o.z - c.p.z) < r);
  return {
    scarecrow: gameState.outdoor.some(o => o.id === 'scarecrow' && near(o, 9)),
    fence: gameState.outdoor.filter(o => o.id === 'fence' && near(o, 9)).length >= 4,
  };
}

// 접속 시 1회 — 밤이 지났으면 서버 판정을 받아 손실·흔적을 적용
export async function resolveNightVisit() {
  const st = gameState.night;
  const today = todayStr();
  st.traces.forEach(t => spawnTrace(t, true));            // 지난 세션에 조사 안 한 흔적 복원
  if (!st.lastDate) { st.lastDate = today; return; }      // 첫 기록 — 오늘 밤부터 감시 시작
  if (st.lastDate === today) return;                      // 오늘 이미 판정함
  const cands = plots.map((p, i) => ({ p, i })).filter(c => c.p.state === 'growing' || c.p.state === 'mature');
  if (!cands.length || !nightFetcher) { st.lastDate = today; return; }   // 심은 게 없으면 훔칠 것도 없다

  const nights = Math.max(1, Math.round((new Date(today) - new Date(st.lastDate)) / 86400000));
  let v = null;
  try {
    v = await nightFetcher({
      date: today, nights,
      plots: cands.map(c => ({ crop: c.p.cropType?.id || '' })),
      defense: computeNightDefense(cands),
      truce: st.truce,                       // 🤝 대결에서 이긴 동물은 며칠 쉰다(상한은 서버가 잰다)
    });
  } catch (e) { console.warn('[밤손님] 판정 실패 — 다음 접속에 재시도', e?.message || e); }
  if (!v) return;                                         // 서버 실패 → lastDate 유지(재시도)
  st.lastDate = today;

  if (!v.visited) {
    // 🤝 휴전으로 조용한 밤은 방어 성공과 다르게 말한다 — 어제 이긴 보람이 보여야 한다
    if (v.truce) setTimeout(() => ui.toast?.('🤝 어제 승부에서 진 친구가 오지 않았어요', 2800), 900);
    else if (v.defended) setTimeout(() => ui.toast?.('🎃 허수아비와 울타리가 밤새 밭을 지켰어요!', 2800), 900);
    requestSave();
    return;
  }

  const stolen = [];   // 훔쳐간 작물 이름들(안내용)
  for (const i of (v.stolenIdx || [])) {
    const c = cands[i]; if (!c) continue;
    const cropId = c.p.cropType?.id || '';        // ⚠️ clearCrop 전에 잡아둔다 — 되찾을 때 이게 없으면 뭘 줄지 모른다
    stolen.push(c.p.cropType?.name || '작물');
    clearCrop(c.p);
    c.p.state = 'empty'; c.p.growth = 0; c.p.stage = -1; c.p.watered = false;
    updatePlotVisual(c.p);
    const t = { x: c.p.x, z: c.p.z, animal: v.animal, loot: v.loot, crop: cropId };
    st.traces.push(t); spawnTrace(t);
  }
  if (!stolen.length) return;

  const a = NIGHT_ANIMAL[v.animal] || NIGHT_ANIMAL.raccoon;
  trackEvent('night_visit', { animal: v.animal, stolen: stolen.length });   // [GA4] 밤손님 발생률
  setTimeout(() => {   // 출석 모달·날씨 토스트와 겹치지 않게 한 박자 늦게
    ui.toast?.(`${a.ico} 밤사이 ${a.name}가 ${stolen.join('·')} ${stolen.length}개를 가져갔어요… 🐾 흔적을 조사해보세요`, 3800);
    firstHint('night', a.ico, '밤손님이 다녀갔어요',
      '밤사이 숲 친구가 밭에 다녀갔어요\n🐾 파헤쳐진 흙을 조사하면 수집품!\n🎃허수아비·🪵울타리를 두면 피해가 줄어요');
  }, 1200);
  // 📜 주민 쪽지(Gemini·자정 캐시) — 도착하면 카드로. 실패하면 조용히 생략
  if (nightNoteFetcher) {
    const firstCrop = cands[(v.stolenIdx || [])[0]]?.p?.cropType?.id || '';
    nightNoteFetcher({ date: today, animal: v.animal, crop: firstCrop })
      .then(n => { if (n?.text) setTimeout(() => ui.showHintModal?.({ ico: '📜', title: n.author || '주민 쪽지', body: n.text }), 4600); })
      .catch(() => {});
  }
  requestSave();
}
