// =============================================================
//  calm forest · 🍂 4계절 순환 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-seasons-design.md
//  ▶ 계절은 날짜로만 정한다 — 날씨처럼 모든 유저에게 같고, 서버도 같은 식으로 안다.
//  ▶ 한 계절 14일 · 한 바퀴 56일. 한 번 만들고 계속 돈다(매 시즌 새로 만들지 않는다).
//  ▶ 기준일: 🍂가을 1일 = 2026-10-09 = 🌾수확제 광장 시즌 시작(sql/migrations/migrate_plaza.sql).
//  ▶ ⚠️ functions/api/_game-day.js 에 서버 사본이 있다. 여기를 고치면 거기도 고친다
//     (tests/season.test.mjs 가 두 쪽을 대조한다).
//  ▶ 테스트: npm test (tests/season.test.mjs) · 강제: ?season=spring|summer|autumn|winter
// =============================================================

export const SEASON_DAYS = 14;
export const SEASON_EPOCH = '2026-09-11';   // 🌸봄 1일 — 여기서 28일 뒤가 🍂가을 1일(10/9)

/**
 * 계절 표. weather 는 날씨 굴림(0~99)의 경계 — rain 미만 비 · snow 미만 눈 · fog 미만 안개 · 나머지 맑음.
 *   계절 전 평균이 예전 고정값(비 20 · 눈 12 · 안개 13 · 맑음 55)에서 크게 벗어나지 않게 잡았다.
 */
export const SEASONS = [
  { id: 'spring', name: '봄',   ico: '🌸', weather: { rain: 22, snow: 22, fog: 37 } },   // 비 22 · 눈 0  · 안개 15 · 맑음 63
  { id: 'summer', name: '여름', ico: '☀️', weather: { rain: 30, snow: 30, fog: 38 } },   // 비 30 · 눈 0  · 안개 8  · 맑음 62
  { id: 'autumn', name: '가을', ico: '🍂', weather: { rain: 18, snow: 24, fog: 42 } },   // 비 18 · 눈 6  · 안개 18 · 맑음 58
  { id: 'winter', name: '겨울', ico: '❄️', weather: { rain: 8,  snow: 43, fog: 53 } },   // 비 8  · 눈 35 · 안개 10 · 맑음 47
];
export const SEASON_IDS = SEASONS.map(s => s.id);

// 'YYYY-MM-DD' → 에포크 이후 날 수. UTC 로 읽어 기기 시간대·서머타임과 무관하게 정수가 된다
function dayIndex(date) {
  return Math.round((Date.parse(date + 'T00:00:00Z') - Date.parse(SEASON_EPOCH + 'T00:00:00Z')) / 86400000);
}

/** 그 날짜의 계절 정보 — { season, day(1~14), left(오늘 포함 남은 날), cycle } */
export function seasonInfo(date) {
  const d = dayIndex(date);
  const span = SEASON_DAYS * SEASONS.length;
  const inCycle = ((d % span) + span) % span;   // 기준일 이전 날짜도 음수 없이 돈다
  const idx = Math.floor(inCycle / SEASON_DAYS);
  const day = inCycle % SEASON_DAYS + 1;
  return { season: SEASONS[idx], day, left: SEASON_DAYS - day + 1, cycle: Math.floor(d / span) };
}

/** 그 날짜의 계절 id */
export function seasonOf(date) { return seasonInfo(date).season.id; }

export function seasonById(id) { return SEASONS.find(s => s.id === id) || null; }

/** 날씨 굴림(0~99) → 날씨. 계절마다 경계만 다르다 */
export function weatherFromRoll(r, seasonId) {
  const w = (seasonById(seasonId) || SEASONS[2]).weather;
  return r < w.rain ? 'rain' : r < w.snow ? 'snow' : r < w.fog ? 'fog' : 'clear';
}

// ── 🎨 풍경 — 색만 바꾼다(메시·재질 수는 그대로 → 드로우콜 0) ──
//   PAL(js/data/world.js)의 땅·잎 색을 부팅 때 한 번 덮어쓴다. 이 색을 쓰는 곳은 전부 야외다
//   (마을 땅·얼룩·나무·풀 · 텃밭 둘레 나무 · 강가 나무 · 카페 앞마당). 실내 화분은 PAL 을 안 쓴다.
//   여름은 기본 PAL 그대로(null) — 예전 화면이 곧 여름이다.
export const SEASON_PALETTE = {
  spring: { ground: 0xc4ebc6, groundDark: 0xaedfb4, leaf1: 0x9edca8, leaf2: 0xf7c5d5, leaf3: 0xb8e6b0 },   // 연두 + 벚꽃
  summer: null,
  autumn: { ground: 0xd3e2b0, groundDark: 0xc3d29a, leaf1: 0xf2a65e, leaf2: 0xf5cc6c, leaf3: 0xe08060 },   // 주황·노랑·붉은 잎, 마른 풀빛 땅
  winter: { ground: 0xf4f9f8, groundDark: 0xe0ecee, leaf1: 0x7fbf9e, leaf2: 0xf6faf9, leaf3: 0x9fd0b6 },   // 눈 쌓인 땅 · 상록 초록 + 눈 덮인 흰 잎
  //   ⚠️ 겨울 잎을 서리색(회녹색)으로만 두면 조명을 받아 회색으로 죽어 보였다(2026-10-01 캡처) — 초록을 남긴다
};

/** PAL 의 땅·잎 색을 계절 색으로 덮어쓴다. ⚠️ 월드를 짓기 **전에** 한 번만 부른다(지은 재질은 안 바뀐다) */
export function applySeasonPalette(pal, id) {
  const p = SEASON_PALETTE[id];
  if (p) Object.assign(pal, p);
  return pal;
}

// 🌸🍂 흩날림 — 봄 꽃잎 · 가을 낙엽. 여름·겨울은 없다(겨울은 ❄️눈 날씨가 맡는다).
//   colors: 인스턴스 색 · fall: 낙하 속도 범위(m/s) · size: 조각 가로·세로(m)
export const SEASON_DRIFT = {
  spring: { colors: [0xf7c5d5, 0xfbe0e8, 0xf2a9c0], fall: [0.45, 0.8], size: [0.14, 0.1] },
  autumn: { colors: [0xf2a65e, 0xe08060, 0xf5cc6c], fall: [0.7, 1.15], size: [0.18, 0.12] },
};

// ── 안내 문구 — game.js 는 상태만 넘기고 여기서 문장을 만든다(테스트 가능하게) ──
//   fish = { id, name, ico } 그 계절 한정 어종 · owned = 이미 도감에 있나
//   ⚠️ 문장 틀을 바꾸면 js/i18n-en.js 의 패턴 키도 같이 바꾼다.

// 받침 유무로 조사 고르기 — js/spaces/cafe.js josa 와 같은 규칙(그쪽은 three 를 끌고 와서 import 하지 않는다)
function josa(word, withJong, noJong) {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 ? withJong : noJong;
}

/** 출석 모달 한 줄 — 새 계절 첫 접속 · 끝나기 3일 전(아직 못 낚았을 때). 할 말이 없으면 '' */
export function seasonNotice({ season, left }, fish, owned, isNew) {
  if (!fish) return '';
  if (isNew) return `${season.ico} ${season.name}${josa(season.name, '이', '가')} 왔어요! ${left}일 동안 호수에서 ${fish.ico} ${fish.name}${josa(fish.name, '이', '가')} 낚여요.`;
  if (left <= 3 && !owned) return `⏳ ${season.name}${josa(season.name, '이', '가')} ${left}일 남았어요 — ${fish.ico} ${fish.name}${josa(fish.name, '은', '는')} 지금만 낚여요!`;
  return '';
}

/** HUD 계절 아이콘을 눌렀을 때 — 지금 계절·남은 날·한정 어종(낚았는지) */
export function seasonStatusLine({ season, left }, fish, owned) {
  const head = `${season.ico} ${season.name} · ${left}일 남음`;
  if (!fish) return head;
  return owned ? `${head} — 이번 계절 한정 ${fish.name}도 낚았어요 ✅` : `${head} — 이번 계절 한정: ${fish.name}`;
}
