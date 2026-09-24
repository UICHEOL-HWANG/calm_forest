// =============================================================
//  📦 날씨 문구·하루 속도·팔레트
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
export const FORECAST_MSG = {
  clear: '내일은 ☀️ 맑을 예정이에요!',
  rain:  '내일은 🌧️ 비 소식 — 밭이 저절로 자라는 날!',
  snow:  '내일은 ❄️ 눈 소식 — 목재가 잘 나오는 날!',
  fog:   '내일은 🌫️ 안개 예보 — 보석 캐기 좋은 날!',
};

export const SEVERE_INFO = {
  frost: { ico: '❄️', name: '서리',  hit: '서리가 내려' },
  storm: { ico: '🌀', name: '태풍',  hit: '거센 바람이 지나가' },
};

export const WEATHER_MSG = {
  rain: '🌧️ 오늘은 비 오는 날! 밭이 저절로 자라고 물고기가 잘 물어요',
  snow: '❄️ 오늘은 눈 오는 날! 나뭇가지가 잘 부러져 목재가 더 나와요',
  fog:  '🌫️ 오늘은 안개 낀 날… 동굴에서 보석이 더 자주 반짝여요',
};

export const DAY_SPEED = 0.002;   // 전체 낮/밤 주기 ≈ 8분(기존 ~2분에서 완만하게)

// 파스텔 팔레트
export const PAL = {
  ground: 0xbfe8c9, groundDark: 0xa9dcb6,
  trunk: 0xd8a679, leaf1: 0x8fd6a0, leaf2: 0xb7e6a8, leaf3: 0xa0e0d0,
  body: 0xfff2d6, belly: 0xffd9a8, hat: 0xff9e9e,
  wood: 0xd9a066, sky: 0xdff3ff,
  soil: 0x9c6b4a, soilWet: 0x7c5236,
  //  🌾 밭 얼룩의 양 끝 — soilDark < soil < soilLight 순서를 지켜야 한다.
  //     soilLight 를 soil 과 같게 두면 얼룩의 밝은 쪽 보간이 통째로 무효가 된다.
  soilDark: 0x6f4128, soilLight: 0xc08a5f,
  sprout: 0x7fce7f, crop: 0xff9e5e, cropLeaf: 0x86d18a,
  wall: 0xffe3c4, roof: 0xff9e9e, window: 0xfff2a8,
};
