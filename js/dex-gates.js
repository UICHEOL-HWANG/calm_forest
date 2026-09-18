// =============================================================
//  calm forest · 📖 도감 희귀종 해금 게이트 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-18-dex-gates-design.md
//  ▶ 희귀종은 "많이 하면 언젠가 나오는 것" 이었다. 상황이 맞는 날에만 나오게 하고
//    그 안에서는 확률을 크게 올린다 — **조건을 알면 더 빨라진다.**
//    🌈무지개 물고기: 평균 14회 → 비 오는 날 4.5회. 기다리는 대가로 확실해진다.
//  ▶ 게이트마다 근거가 **코드**에 있다(기존 날씨 보정). 문구를 근거로 삼지 않는다:
//    초안은 "비 온 뒤 약초가 돋는다" 였는데 실제 코드는 비 오는 날 **버섯**을 밀어준다.
//  ▶ ⚠️ 게이트가 없는 종(gateOf → null)은 **항상 열림**이다. 이걸 뒤집으면 흔한 종까지 막힌다.
//  ▶ 테스트: npm test (tests/dex-gates.test.mjs)
// =============================================================

/**
 * 희귀종 게이트.
 *   weather — 열리는 날씨 **배열**. 없으면 날씨를 안 본다
 *   night   — true 면 밤에만. 없으면 시간대를 안 본다
 *   p       — 게이트가 열렸을 때의 확률(원래 확률보다 커야 한다 — 테스트가 잠근다)
 */
export const DEX_GATES = {
  // 🌈 무지개 물고기 — RAIN_DAY 에서 이미 희귀↑ 였다(catchFish)
  fish:   { rare:    { weather: ['rain'], p: 0.22 } },
  // 💎 보석 — WEATHER==='fog' 에서 이미 gemP 0.1 → 0.2 였다(weightedOre)
  ore:    { gem:     { weather: ['fog'], p: 0.28 } },
  // 🌈 무지개반디 — rain||fog 에서 이미 희귀↑ 였다(rollBugKind). 반딧불이는 원래 밤 전용
  bug:    { rainbow: { weather: ['rain', 'fog'], night: true, p: 0.18 } },
  // 🌿 숲 약초 — 이슬 맺힌 밤에 캔다. 🌙달빛 물고기(night:true) 선례.
  //   ⚠️ 날씨를 안 본다. 비 오는 날은 기존 보정이 **버섯**을 밀어주므로 근거가 반대다.
  forage: { herb:    { night: true, p: 0.30 } },
};

export function gateOf(cat, id) {
  return DEX_GATES[cat]?.[id] || null;
}

/**
 * 날씨만 본다 — 🧑‍🦳큐레이터 의뢰 전용.
 * ⚠️ 의뢰는 하루치 시드로 고정되는데 밤낮은 하루 안에 바뀐다. 밤 종을 낮에 걸러내면
 *    그날 의뢰가 아예 사라지므로, 의뢰 선택은 밤 조건을 무시하고 플레이어가 밤까지 기다리게 한다.
 */
export function weatherOpen(gate, weather) {
  if (!gate) return true;
  return !gate.weather || gate.weather.includes(weather);
}

/** 획득 판정용 — 날씨와 밤낮을 둘 다 본다. @param {{weather:string, night:boolean}} situation */
export function gateOpen(gate, situation) {
  if (!gate) return true;                                    // ⚠️ 게이트 없는 종은 항상 열림
  if (!weatherOpen(gate, situation.weather)) return false;
  if (gate.night && !situation.night) return false;
  return true;
}

const keyOf = (k) => k.id ?? k.rarity;   // fish 만 rarity, 나머지는 id

/**
 * 누적 확률 목록에서 한 종을 굴린다.
 *   ① 누적 → 개별 가중치로 풀고
 *   ② 게이트가 닫힌 종은 빼고
 *   ③ 열린 종은 표의 p 로 갈아끼우고
 *   ④ 남은 가중치를 (1 - 갈아끼운 합) 안에서 정규화한다
 * @param {{id?:string, rarity?:string, p:number}[]} kinds p 는 **누적**(마지막이 1.00)
 * @param {() => number} rnd 테스트에서 고정 가능. 호출부가 "두 번 굴려 작은 값" 보정을 넣어 쓴다
 */
export function rollKind(kinds, cat, situation, rnd = Math.random) {
  // ① 누적 → 개별
  let prev = 0;
  const items = kinds.map(k => { const w = k.p - prev; prev = k.p; return { k, w }; });

  // ②③ 게이트 적용
  let fixed = 0, freeSum = 0;
  for (const it of items) {
    const gate = gateOf(cat, keyOf(it.k));
    if (!gate) { freeSum += it.w; continue; }
    if (!gateOpen(gate, situation)) { it.w = 0; continue; }   // 닫힘 → 제외
    it.w = gate.p; fixed += gate.p;                            // 열림 → 표의 p
  }

  // ④ 나머지를 남은 몫에 맞춰 정규화 — 합이 1 이라야 항상 뭔가 나온다
  const room = Math.max(0, 1 - fixed);
  for (const it of items) {
    if (gateOf(cat, keyOf(it.k))) continue;                    // 갈아끼운 것은 그대로
    it.w = freeSum > 0 ? (it.w / freeSum) * room : 0;
  }

  // 굴림
  const total = items.reduce((s, it) => s + it.w, 0);
  const r = rnd() * (total || 1);
  let acc = 0;
  for (const it of items) { acc += it.w; if (r < acc) return it.k; }
  // 폴백 — 부동소수 오차나 전부 닫힌 경우. 게이트 없는 것 중 마지막, 없으면 목록 마지막
  return items.filter(it => !gateOf(cat, keyOf(it.k))).pop()?.k ?? kinds[kinds.length - 1];
}
