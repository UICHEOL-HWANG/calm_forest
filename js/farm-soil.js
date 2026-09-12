// =============================================================
//  calm forest · 🌾 밭 외관 A안 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  예전 밭: 1.7 폭 흙 상자가 2.0 격자에 놓여 0.3 씩 떨어져 있고, 칸마다 이랑 3줄.
//  A안: 흙을 **하나의 이어진 면**으로 깔고 이랑 대신 **얼룩**(정점색)을 넣는다.
//
//  ⚠️ 얼룩을 인스턴싱으로 만들면 안 된다 — 지오메트리를 공유하니 121칸이 전부 같은 무늬가
//     되어 격자 타일링이 눈에 보인다. 무늬는 **월드 좌표**로 계산해야 칸 경계를 넘어 이어진다.
//     그래서 갈아둔 영역을 덮는 메시 하나를 동적으로 굽는다(드로우콜은 그대로 1).
//
//  ▶ 여기엔 "무늬 값"과 "포기 흩뿌리기 좌표"만 둔다. 굽고 그리는 건 game.js.
//  ▶ 테스트: npm test (tests/farm-soil.test.mjs)
// =============================================================

/** 밭 격자 간격 — 칸 중심 사이 거리. 흙 면은 이 폭으로 깔려야 옆 칸과 맞닿는다. */
export const CELL = 2.0;

/** 칸 한 변의 세그먼트 수. 높을수록 무늬가 곱지만 정점이 제곱으로 는다. */
export const CELL_SEG = 4;

/** 포기 개수·흩뿌림 반경 — 목업 A안 그대로(칸당 6개, ±0.78). */
export const SPRIG_PER_PLOT = 6;
export const SPRIG_SPAN = 0.78;

/**
 * 흙 얼룩 값 0~1 — **월드 좌표**로만 계산한다(칸 인덱스를 넣으면 무늬가 칸마다 반복된다).
 * 목업 farm-look-mockup.html 의 mottledSoil 과 같은 식이되, 난수 항은 좌표 해시로 바꿔
 * 같은 자리가 늘 같은 무늬가 되게 했다(버퍼를 다시 구워도 무늬가 안 흔들린다).
 */
export function mottleAt(x, z) {
  // ⚠️ 파장이 짧으면(목업의 1.7·2.1) 칸 하나 안에서 무늬가 몇 번씩 바뀌어, 멀리서 보면
  //    잡티가 서로 상쇄돼 그냥 균일한 갈색이 된다. 얼룩은 **여러 칸에 걸치는 크기**여야 보인다.
  //    정점 난수도 크면 블러 대신 노이즈가 된다 — 알갱이 느낌만 남기고 줄인다.
  const wave = Math.sin(x * 0.55 + z * 0.3) * 0.5 + Math.sin(x * 0.22 - z * 0.7) * 0.35;
  const n = wave + (hash2(x, z) - 0.5) * 0.18;
  return clamp01((n + 1) / 2);
}

/** 아주 얕은 기복 — 평평한 판이 아니라 갈아 놓은 흙처럼 보이게. 목업과 같은 식. */
export function reliefAt(x, z) {
  return (Math.sin(x * 0.7 + z * 0.4) + Math.sin(x * 0.3 - z * 0.6)) * 0.012;   // 얼룩과 같은 규모로
}

/**
 * 얼룩 값 → 세 흙색(어두움·기본·밝음) 사이의 보간 위치.
 * { from, to, t } 를 돌려주고 실제 색 섞기는 game.js(THREE.Color)가 한다.
 *   t < 0.45 는 어두운 쪽, 그 위는 밝은 쪽 — 목업과 같은 분기점.
 */
export function mottleMix(m) {
  return m < 0.45
    ? { from: 'dark', to: 'base', t: m / 0.45 }
    : { from: 'base', to: 'light', t: (m - 0.45) / 0.55 };
}

/**
 * 포기 흩뿌리기 — 칸 인덱스로 결정되는 고정 배치(매번 흔들리면 안 된다).
 * 반환: [{ dx, dz, rotY, scale, flower }] · dx/dz 는 칸 중심 기준 오프셋.
 */
export function sprigOffsets(seed, n = SPRIG_PER_PLOT, span = SPRIG_SPAN) {
  const r = rng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      dx: (r() - 0.5) * 2 * span,
      dz: (r() - 0.5) * 2 * span,
      rotY: r() * Math.PI * 2,
      scale: 0.9 + r() * 0.45,
      flower: r() < 0.78,      // 꽃은 일부 포기에만 — 다 달리면 단조롭다
    });
  }
  return out;
}

/**
 * 흙 면을 다시 구워야 하는지 판정하는 시그니처.
 * 흙 면에 실제로 반영되는 것만 넣는다 — 칸 위치 · 젖음(색) · 칸 수.
 * ⚠️ pop 은 넣지 않는다. 매 프레임 바뀌어서 넣으면 프레임마다 다시 굽는다
 *    (팝은 구워 둔 정점의 y 만 움직여 표현한다).
 */
export function soilSignature(plots) {
  let sig = plots.length | 0;
  for (const p of plots) {
    sig = (Math.imul(sig, 31) + (p.x | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.z | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.watered ? 1 : 0)) | 0;
  }
  return sig;
}

/** 칸 하나가 만드는 정점 수 — 버퍼 크기를 미리 잡을 때 쓴다. */
export function vertsPerCell(seg = CELL_SEG) {
  return (seg + 1) * (seg + 1);
}

/** 칸 하나가 만드는 삼각형 인덱스 수. */
export function indicesPerCell(seg = CELL_SEG) {
  return seg * seg * 6;
}

// ── 내부 ────────────────────────────────────────────────────
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** 좌표 해시 0~1 — 같은 자리는 늘 같은 값(재굽기에도 무늬가 안 흔들린다). */
function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 시드 고정 난수 — 포기 배치용(mulberry32). */
export function rng(seed) {
  let a = (seed | 0) + 0x6d2b79f5;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
