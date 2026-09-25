// =============================================================
//  calm forest · ☕ 카페 손님 생성 API (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  GET /api/cafe-guests?date=YYYY-MM-DD&weather=clear&count=4
//    → [{ id, recipeId, line, thanks }, ...]
//
//  ▶ 왜 서버를 거치나: Gemini API 키는 절대 브라우저로 내려가면 안 됩니다.
//    키는 Cloudflare Pages 환경변수(GEMINI_API_KEY)에만 두고, 이 함수가 대신 호출합니다.
//  ▶ 프롬프트에 들어가는 주민/메뉴 목록은 여기(서버)에 고정합니다.
//    클라이언트가 보낸 값을 그대로 프롬프트에 넣으면 프롬프트 인젝션 통로가 되기 때문.
//  ▶ 손님은 크론이 전날 밤 (날짜·시간대·언어·단계) × 변형으로 미리 만들어 Supabase 에 둡니다.
//    이 API 는 읽기만 하고, 없을 때만 즉석 생성합니다(functions/ai-pregen-cron.js).
//  ▶ 실패하면 빈 배열을 주고, 게임은 로컬 기본 손님으로 조용히 진행합니다.
// =============================================================

import { weatherForDate, slotOfHour, kstHour, parseBucket, CAFE_SLOTS } from './_game-day.js';
import { readVariants, pickVariant, insertRows, variantsFor, rpdOf } from './_ai-store.js';

// 게임의 CAFE_GUESTS / RECIPES 와 id 가 일치해야 합니다(js/game.js).
// 이름·색·모자 같은 외형은 게임이 id 로 채우므로 여기선 id 와 표시용 이름만 둡니다.
//   ⚠️ 이 목록이 마을 주민(farmer·builder…)이던 시절이 있었다. 요리 코스 개편에서 손님을
//      별도 캐스트로 가른 뒤에도 서버가 옛 목록을 들고 있어, 생성된 손님이 클라이언트
//      화이트리스트(js/cafe-guests.js normalize)에 전부 걸러져 **하루도 빠짐없이 기본
//      손님으로 조용히 폴백**했다. 예외가 안 나므로 콘솔에도 안 잡힌다.
//      게임 쪽 캐스트·레시피를 건드리면 이 두 표와 CAST_REV 를 같이 고칠 것.
const GUESTS = [
  { id: 'guest_deer',     name: '숲길 사슴',       name_en: 'Trailside Deer' },
  { id: 'guest_otter',    name: '강가 수달',       name_en: 'Riverside Otter' },
  { id: 'guest_hedgehog', name: '가시 고슴도치',   name_en: 'Prickly Hedgehog' },
  { id: 'guest_squirrel', name: '부지런한 다람쥐', name_en: 'Busy Squirrel' },
  { id: 'guest_raccoon',  name: '야행성 너구리',   name_en: 'Night-Owl Raccoon' },
  { id: 'guest_frog',     name: '빗소리 개구리',   name_en: 'Rainsong Frog' },
  { id: 'guest_turtle',   name: '느긋한 거북',     name_en: 'Easygoing Tortoise' },
  { id: 'guest_beaver',   name: '댐 짓는 비버',    name_en: 'Dam-Building Beaver' },
];
const MENU = [
  { id: 'veg_stew',      name: '든든한 채소죽',  name_en: 'Hearty Veggie Porridge', hint: '작물로 끓인 따뜻한 죽',        hint_en: 'warm porridge made from crops' },
  { id: 'mushroom_soup', name: '숲의 버섯 스프', name_en: 'Forest Mushroom Soup',   hint: '채집 숲 버섯으로 끓인 스프',   hint_en: 'soup of foraged forest mushrooms' },
  { id: 'rice_ball',     name: '소금 주먹밥',    name_en: 'Salted Rice Ball',       hint: '작물을 뭉쳐 소금 간을 한 밥',  hint_en: 'rice pressed by hand and lightly salted' },
  { id: 'baked_yam',     name: '군고구마',       name_en: 'Roasted Sweet Potato',   hint: '불에 천천히 구운 고구마',      hint_en: 'sweet potato roasted slowly over coals' },
  { id: 'herb_salad',    name: '들나물 무침',    name_en: 'Wild Herb Salad',        hint: '채집한 들나물을 무친 반찬',    hint_en: 'foraged wild herbs tossed fresh' },
  { id: 'grilled_fish',  name: '생선 구이',      name_en: 'Grilled Fish',           hint: '호수에서 잡은 물고기 구이',    hint_en: 'fish grilled fresh from the lake' },
  { id: 'omelette',      name: '푸짐한 오믈렛',  name_en: 'Fluffy Omelette',        hint: '닭장 달걀로 만든 오믈렛',      hint_en: 'omelette from coop-fresh eggs' },
  { id: 'lunchbox',      name: '모둠 도시락',    name_en: 'Picnic Lunchbox',        hint: '작물과 물고기를 담은 도시락',  hint_en: 'lunchbox of crops and fish' },
  { id: 'forest_feast',  name: '숲의 한상차림',  name_en: 'Forest Feast',           hint: '숲 재료를 모아 차린 한상',     hint_en: 'a full spread gathered from the forest' },
  { id: 'bread',         name: '갓 구운 빵',     name_en: 'Fresh Bread',            hint: '화덕에서 빻은 밀가루로 구운 빵', hint_en: 'bread baked from kiln-milled flour' },
  { id: 'grape_juice',   name: '포도주스',       name_en: 'Grape Cooler',           hint: '발효통에서 밤새 익은 포도즙', hint_en: 'grape must aged overnight in the vat' },
];
// 🪣 플레이어 상태 버킷 — js/game.js 의 playerPhase() 와 값이 일치해야 한다.
//   사람마다 다른 값을 그대로 받으면 캐시 키가 갈라져 호출이 폭증하므로, 3칸으로만 받는다.
const PHASES = {
  settling: { ko: '아직 빈터에 집을 짓는 중이다 — 마을에 갓 자리 잡는 참',
              en: 'still building a house on the empty lot — just settling into the village' },
  settled:  { ko: '집을 완성하고 마을에 자리를 잡았다',
              en: 'has finished their house and settled into the village' },
  thriving: { ko: '집을 저택까지 넓힌, 마을의 오랜 이웃이다',
              en: 'has grown their house into a manor and is a long-time neighbour' },
};
const PHASE_RULE_KO = '- 플레이어의 처지를 알고 있지만 매번 들먹이지 않는다. 어울릴 때 한 조각만 스치듯 담는다.';
const PHASE_RULE_EN = '- You know where the player stands, but do not bring it up every time. Let it show in one passing detail when it fits.';

const WEATHER_KO = { clear: '맑음', rain: '비', snow: '눈', fog: '안개' };
const WEATHER_EN = { clear: 'sunny', rain: 'rainy', snow: 'snowy', fog: 'foggy' };
// ☕ 시간대 — 아침 손님은 아침 이야기를, 저녁 손님은 하루를 마친 이야기를 한다(_game-day.js CAFE_SLOTS)
const SLOT_KO = { morning: '아침', noon: '한낮', evening: '저녁' };
const SLOT_EN = { morning: 'morning', noon: 'midday', evening: 'evening' };

const MAX_COUNT = 6;
const LINE_MAX = 48;      // 주문판·근접 프롬프트 한 줄에 들어가는 길이(하드 캡 — 넘으면 …로 잘림)
const THANKS_MAX = 28;
const LINE_ASK = 42;      // 모델에겐 조금 낮게 일러 둔다 — 살짝 넘겨도 …로 잘리지 않게
const THANKS_ASK = 24;

// 길이 초과 시 글자 중간을 뚝 자르면 "…버섯 스프 한 그릇을 비우고" 처럼 어색해진다.
// 마지막 공백까지만 남기고 말줄임표를 붙인다.
function trim(s, max) {
  const t = String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut) + '…';
}
const CACHE_TTL = 60 * 60 * 12;   // 12시간(날짜가 바뀌면 캐시 키 자체가 달라짐)
// 손님 캐스트·메뉴가 바뀌면 이 숫자를 올린다 — 안 올리면 옛 명단으로 만든 응답이
// 엣지 캐시에 최대 12시간 남아, 배포 직후에도 클라이언트가 계속 걸러 낸다.
const CAST_REV = 2;

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING', description: '손님 id' },
      recipeId: { type: 'STRING', description: '주문한 메뉴 id' },
      line: { type: 'STRING', description: '주문 대사' },
      thanks: { type: 'STRING', description: '서빙 받은 뒤 한마디' },
    },
    required: ['id', 'recipeId', 'line', 'thanks'],
  },
};

const SYSTEM = `너는 코지 힐링 게임 "calm forest"의 마을 카페 손님을 쓰는 작가야.
규칙:
- 한국어. 손님의 성격을 살리되 따뜻하고 담백하게. 과장·이모지·따옴표 금지.
- line 은 ${LINE_ASK}자 이내 한 문장. "오늘 무슨 일이 있었는지" 를 한 조각 곁들여 그 메뉴가 당기는 이유를 만든다.
- thanks 는 ${THANKS_ASK}자 이내 한마디.
- id 와 recipeId 는 반드시 주어진 목록의 값만 쓴다.
- 같은 손님이 두 번 오지 않는다. 메뉴는 되도록 겹치지 않게 고른다.
${PHASE_RULE_KO}`;

// 영어 손님 — 한글 대비 라틴 글자폭이 좁아 글자수 상한을 넉넉히 잡는다(주문판 폭 기준)
const LINE_MAX_EN = 88;
const THANKS_MAX_EN = 52;
const LINE_ASK_EN = 78;
const THANKS_ASK_EN = 46;
const SYSTEM_EN = `You write the village café guests for "calm forest", a cozy healing game.
Rules:
- English. Warm and understated, in each guest's voice. No exaggeration, no emoji, no quotation marks.
- "line" is one sentence, at most ${LINE_ASK_EN} characters, weaving in a small moment from their day that makes them crave that dish.
- "thanks" is a short remark, at most ${THANKS_ASK_EN} characters.
- Use only ids from the given lists for id and recipeId.
- No guest appears twice. Avoid repeating menus when possible.
${PHASE_RULE_EN}`;

// 🔒 날짜 범위 제한 — 임의의 날짜를 받으면 (날짜 × 나머지 조합)이 무한해져
//   캐시 미스마다 Gemini 가 실제로 호출된다. 인증도 레이트리밋도 없는 엔드포인트라
//   날짜만 바꿔가며 부르면 그대로 할당량 고갈·요금 통로가 된다.
//   게임 날짜는 KST 기준이고 엣지는 UTC 라 최대 9시간 어긋나므로 어제·오늘·내일만 허용한다.
function clampDate(raw) {
  const now = Date.now();
  for (let d = -1; d <= 1; d++) {
    if (raw === new Date(now + d * 86400000).toISOString().slice(0, 10)) return raw;
  }
  return new Date(now).toISOString().slice(0, 10);
}

// 🎲 목록 순서를 (날짜·시간대·변형)으로 섞는다 — 모델이 목록 앞쪽을 고르는 편향이 있어
//   순서가 고정이면 시간대·변형이 달라도 첫 손님이 늘 사슴+버섯스프였다(2026-09-25 실측).
function seededOrder(list, seed) {
  // ⚠️ `${seed}/${i}` 처럼 공통 접두사 뒤에 번호만 다르면 31진 해시는 접두사 몫이 전 항목에 똑같이 더해져
  //    원래 순서 그대로 정렬된다(실제로 그랬다). 번호를 앞에 두고 끝에 비트를 한 번 섞는다(murmur3 finalizer).
  const keyed = list.map((item, i) => {
    let h = 0; const s = `${i}:${seed}`;
    for (let k = 0; k < s.length; k++) h = (Math.imul(h, 31) + s.charCodeAt(k)) | 0;
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return { item, h: h >>> 0 };
  });
  return keyed.sort((a, b) => a.h - b.h).map(x => x.item);
}

export function buildCafePrompt(date, weather, count, lang, phase, slot, variant = 0) {
  const guests = seededOrder(GUESTS, `g:${date}:${slot}:${variant}`);
  const menu = seededOrder(MENU, `m:${date}:${slot}:${variant}`);
  if (lang === 'en') {
    return [
      `Date: ${date} (weather: ${WEATHER_EN[weather] || 'sunny'}, time: ${SLOT_EN[slot] || 'daytime'})`,
      `The player ${PHASES[phase].en}.`,
      '',
      'Guests:',
      ...guests.map(g => `- ${g.id}: ${g.name_en}`),
      '',
      'Menu:',
      ...menu.map(m => `- ${m.id}: ${m.name_en} (${m.hint_en})`),
      '',
      `Write today's ${count} café guests.`,
    ].join('\n');
  }
  return [
    `날짜: ${date} (날씨: ${WEATHER_KO[weather] || '맑음'}, 시간대: ${SLOT_KO[slot] || '한낮'})`,
    `플레이어는 ${PHASES[phase].ko}.`,
    '',
    '손님 목록:',
    ...guests.map(g => `- ${g.id}: ${g.name}`),
    '',
    '메뉴 목록:',
    ...menu.map(m => `- ${m.id}: ${m.name} (${m.hint})`),
    '',
    `오늘 카페에 올 손님 ${count}명을 만들어줘.`,
  ].join('\n');
}

// 모델 응답을 그대로 믿지 않고 화이트리스트로 정규화
function sanitize(raw, count, lang) {
  if (!Array.isArray(raw)) return [];
  const okId = new Set(GUESTS.map(g => g.id));
  const okRecipe = new Set(MENU.map(m => m.id));
  const seen = new Set();
  const out = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const id = String(g.id || '').trim();
    const recipeId = String(g.recipeId || '').trim();
    if (!okId.has(id) || !okRecipe.has(recipeId) || seen.has(id)) continue;   // 목록 밖 값·중복 손님 제거
    const line = trim(g.line, lang === 'en' ? LINE_MAX_EN : LINE_MAX);
    const thanks = trim(g.thanks, lang === 'en' ? THANKS_MAX_EN : THANKS_MAX);
    if (!line || !thanks) continue;
    seen.add(id);
    out.push({ id, recipeId, line, thanks });
    if (out.length >= count) break;
  }
  return out;
}

// 🗓️ 크론(functions/ai-pregen-cron.js)과 이 API 폴백이 함께 쓰는 단일 생성 경로.
//   fetch 를 주입받는 건 테스트용 — 기본은 전역 fetch.
export async function generateCafe(env, { date, weather, count, lang, phase, slot, variant = 0 }, { fetch = globalThis.fetch } = {}) {
  const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: lang === 'en' ? SYSTEM_EN : SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: buildCafePrompt(date, weather, count, lang, phase, slot, variant) }] }],
        generationConfig: {
          temperature: 1.1,                    // 매일 다른 조합이 나오게
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return sanitize(JSON.parse(text), count, lang);
}

// 크론이 미리 만드는 인원 — 게임의 CAFE_ORDERS(js/data/places.js)와 같아야 한다
export const PREGEN_COUNT = 4;

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  // 입력 정규화 — 프롬프트에 들어가므로 형식을 엄격히 제한(클라이언트발 인젝션 차단)
  const date = clampDate(url.searchParams.get('date') || '');   // 🔒 어제·오늘·내일만
  // 🌦️ 날씨는 날짜로 계산(_game-day.js) — 게임과 같은 해시라 값이 같고 조합 축이 하나 빠진다
  const weather = weatherForDate(date);
  const count = Math.min(MAX_COUNT, Math.max(1, parseInt(url.searchParams.get('count') || '4', 10) || 4));
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ko';   // 화이트리스트(그 외 값은 ko)
  const rawPhase = url.searchParams.get('phase') || '';
  const phase = PHASES[rawPhase] ? rawPhase : 'settled';             // 화이트리스트(그 외 값은 settled)
  // ☕ 시간대 — 옛 클라이언트(파라미터 없음)는 KST 지금 시각의 시간대를 받는다(토스 심사 기간에도 안 깨짐)
  const rawSlot = url.searchParams.get('slot') || '';
  const slot = CAFE_SLOTS.includes(rawSlot) ? rawSlot : slotOfHour(kstHour());
  const bucket = parseBucket(url.searchParams.get('v'));             // 🎲 기기 고정 버킷 → 사람마다 다른 변형

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',        // 비밀·개인정보가 없는 응답(앱인토스 번들 등 타 오리진 대응)
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  const empty = () => new Response('[]', { headers: { ...headers, 'Cache-Control': 'no-store' } });

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/cafe-guests?date=${date}&slot=${slot}&count=${count}&lang=${lang}&phase=${phase}&v=${bucket}&cast=${CAST_REV}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  const serve = (guests) => {
    const out = new Response(JSON.stringify(guests), { headers });
    waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  };

  // ① 크론이 전날 밤 만들어 둔 변형(functions/ai-pregen-cron.js) — 평소엔 여기서 끝난다
  const stored = pickVariant(await readVariants(env, { kind: 'cafe', date, lang, phase, slot }), bucket, variantsFor(rpdOf(env)));
  if (Array.isArray(stored) && stored.length >= count) return serve(stored.slice(0, count));

  // ② 폴백: 아직 없으면 즉석 생성. 크론과 같은 인원으로 만들어 변형 0 에 적재 → 다음 요청·다른 PoP 가 재사용.
  if (!env.GEMINI_API_KEY) return empty();   // 미설정 = 기능 끔. 캐시하면 키를 넣어도 12시간 빈 응답이 나간다
  try {
    const n = Math.max(count, PREGEN_COUNT);
    const guests = await generateCafe(env, { date, weather, count: n, lang, phase, slot });
    if (guests.length < count) throw new Error(`sanitize 후 손님 ${guests.length}명`);
    if (guests.length >= PREGEN_COUNT) {
      waitUntil(insertRows(env, [{ kind: 'cafe', date, lang, phase, slot, variant: 0, weather, payload: guests,
        model: env.GEMINI_MODEL || 'gemini-flash-lite-latest' }]).catch(e =>
        console.error(JSON.stringify({ message: 'cafe-guests store failed', date, slot, lang, phase, error: e.message }))));
    }
    return serve(guests.slice(0, count));
  } catch (e) {
    // 구조화 로그 — Cloudflare 대시보드에서 필터링·집계가 되게(유저에겐 조용히 폴백되므로 여기서만 보임)
    //   헤더로 노출하면 무인증·CORS * 엔드포인트라 상류(Gemini) 오류 문구가 공개된다.
    console.error(JSON.stringify({ message: 'cafe-guests failed', date, weather, slot, count, lang, phase, error: e.message }));
    // 실패는 게임을 막지 않는다 — 빈 배열이면 클라이언트가 로컬 기본 손님을 쓴다. 캐시하지 않는다.
    return empty();
  }
}
