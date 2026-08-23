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
//  ▶ 손님은 "날짜 시드"라 하루 종일 같아야 하므로 날짜별로 캐시합니다.
//    → 접속자가 몇 명이든 Gemini 호출은 하루 한 번(엣지 PoP당). 무료 티어에서도 안전.
//  ▶ 실패하면 빈 배열을 주고, 게임은 로컬 기본 손님으로 조용히 진행합니다.
// =============================================================

// 게임의 NPCS / RECIPES 와 id 가 일치해야 합니다(js/game.js).
// 이름·색·모자 같은 외형은 게임이 id 로 채우므로 여기선 id 와 표시용 이름만 둡니다.
const RESIDENTS = [
  { id: 'farmer',   name: '농부 삼촌',       name_en: 'Farmer' },
  { id: 'builder',  name: '목수 아저씨',     name_en: 'Carpenter' },
  { id: 'merchant', name: '방랑 상인',       name_en: 'Wandering Merchant' },
  { id: 'angler',   name: '낚시꾼 할아버지', name_en: 'Old Fisherman' },
  { id: 'chef',     name: '요리사 판다',     name_en: 'Chef Panda' },
];
const MENU = [
  { id: 'veg_stew',      name: '든든한 채소죽',  name_en: 'Hearty Veggie Porridge', hint: '작물로 끓인 따뜻한 죽',        hint_en: 'warm porridge made from crops' },
  { id: 'grilled_fish',  name: '생선 구이',      name_en: 'Grilled Fish',           hint: '호수에서 잡은 물고기 구이',    hint_en: 'fish grilled fresh from the lake' },
  { id: 'lunchbox',      name: '모둠 도시락',    name_en: 'Picnic Lunchbox',        hint: '작물과 물고기를 담은 도시락',  hint_en: 'lunchbox of crops and fish' },
  { id: 'omelette',      name: '푸짐한 오믈렛',  name_en: 'Fluffy Omelette',        hint: '닭장 달걀로 만든 오믈렛',      hint_en: 'omelette from coop-fresh eggs' },
  { id: 'mushroom_soup', name: '숲의 버섯 스프', name_en: 'Forest Mushroom Soup',   hint: '채집 숲 버섯으로 끓인 스프',   hint_en: 'soup of foraged forest mushrooms' },
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

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING', description: '주민 id' },
      recipeId: { type: 'STRING', description: '주문한 메뉴 id' },
      line: { type: 'STRING', description: '주문 대사' },
      thanks: { type: 'STRING', description: '서빙 받은 뒤 한마디' },
    },
    required: ['id', 'recipeId', 'line', 'thanks'],
  },
};

const SYSTEM = `너는 코지 힐링 게임 "calm forest"의 마을 카페 손님을 쓰는 작가야.
규칙:
- 한국어. 주민의 말투를 살리되 따뜻하고 담백하게. 과장·이모지·따옴표 금지.
- line 은 ${LINE_ASK}자 이내 한 문장. "오늘 무슨 일이 있었는지" 를 한 조각 곁들여 그 메뉴가 당기는 이유를 만든다.
- thanks 는 ${THANKS_ASK}자 이내 한마디.
- id 와 recipeId 는 반드시 주어진 목록의 값만 쓴다.
- 같은 주민이 두 번 오지 않는다. 메뉴는 되도록 겹치지 않게 고른다.
${PHASE_RULE_KO}`;

// 영어 손님 — 한글 대비 라틴 글자폭이 좁아 글자수 상한을 넉넉히 잡는다(주문판 폭 기준)
const LINE_MAX_EN = 88;
const THANKS_MAX_EN = 52;
const LINE_ASK_EN = 78;
const THANKS_ASK_EN = 46;
const SYSTEM_EN = `You write the village café guests for "calm forest", a cozy healing game.
Rules:
- English. Warm and understated, in each villager's voice. No exaggeration, no emoji, no quotation marks.
- "line" is one sentence, at most ${LINE_ASK_EN} characters, weaving in a small moment from their day that makes them crave that dish.
- "thanks" is a short remark, at most ${THANKS_ASK_EN} characters.
- Use only ids from the given lists for id and recipeId.
- No villager appears twice. Avoid repeating menus when possible.
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

function buildPrompt(date, weather, count, lang, phase) {
  if (lang === 'en') {
    return [
      `Date: ${date} (weather: ${WEATHER_EN[weather] || 'sunny'})`,
      `The player ${PHASES[phase].en}.`,
      '',
      'Villagers:',
      ...RESIDENTS.map(r => `- ${r.id}: ${r.name_en}`),
      '',
      'Menu:',
      ...MENU.map(m => `- ${m.id}: ${m.name_en} (${m.hint_en})`),
      '',
      `Write today's ${count} café guests.`,
    ].join('\n');
  }
  return [
    `날짜: ${date} (날씨: ${WEATHER_KO[weather] || '맑음'})`,
    `플레이어는 ${PHASES[phase].ko}.`,
    '',
    '주민 목록:',
    ...RESIDENTS.map(r => `- ${r.id}: ${r.name}`),
    '',
    '메뉴 목록:',
    ...MENU.map(m => `- ${m.id}: ${m.name} (${m.hint})`),
    '',
    `오늘 카페에 올 손님 ${count}명을 만들어줘.`,
  ].join('\n');
}

// 모델 응답을 그대로 믿지 않고 화이트리스트로 정규화
function sanitize(raw, count, lang) {
  if (!Array.isArray(raw)) return [];
  const okId = new Set(RESIDENTS.map(r => r.id));
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

async function generate(env, date, weather, count, lang, phase) {
  const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: lang === 'en' ? SYSTEM_EN : SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(date, weather, count, lang, phase) }] }],
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

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  // 입력 정규화 — 프롬프트에 들어가므로 형식을 엄격히 제한(클라이언트발 인젝션 차단)
  const date = clampDate(url.searchParams.get('date') || '');   // 🔒 어제·오늘·내일만
  const rawWeather = url.searchParams.get('weather') || '';
  const weather = ['clear', 'rain', 'snow', 'fog'].includes(rawWeather) ? rawWeather : 'clear';
  const count = Math.min(MAX_COUNT, Math.max(1, parseInt(url.searchParams.get('count') || '4', 10) || 4));
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ko';   // 화이트리스트(그 외 값은 ko)
  const rawPhase = url.searchParams.get('phase') || '';
  const phase = PHASES[rawPhase] ? rawPhase : 'settled';             // 화이트리스트(그 외 값은 settled)

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',        // 비밀·개인정보가 없는 응답(앱인토스 번들 등 타 오리진 대응)
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  if (!env.GEMINI_API_KEY) {
    // 미설정 = 기능 끔(게임은 기본 손님으로 진행). 캐시하면 안 된다 —
    // 키를 나중에 넣어도 12시간 동안 빈 응답이 계속 나가기 때문.
    return new Response('[]', { headers: { ...headers, 'Cache-Control': 'no-store' } });
  }

  // 날짜·날씨·인원이 같으면 엣지 캐시 재사용 → Gemini 호출은 하루 한 번
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/cafe-guests?date=${date}&weather=${weather}&count=${count}&lang=${lang}&phase=${phase}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const guests = await generate(env, date, weather, count, lang, phase);
    if (!guests.length) throw new Error('sanitize 후 남은 손님이 없음');
    const out = new Response(JSON.stringify(guests), { headers });
    waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    // 구조화 로그 — Cloudflare 대시보드에서 필터링·집계가 되게(유저에겐 조용히 폴백되므로 여기서만 보임)
    console.error(JSON.stringify({ message: 'cafe-guests failed', date, weather, count, lang, phase, error: e.message }));
    // 실패는 게임을 막지 않는다 — 빈 배열이면 클라이언트가 로컬 기본 손님을 쓴다.
    // 캐시하지 않으므로 다음 요청에서 다시 시도한다.
    // 실패 사유를 헤더로도 노출 — 대시보드 로그를 열지 않고 curl -sI 로 바로 원인 확인.
    //   (비밀값은 담기지 않는다. Gemini 가 돌려준 오류 문구 앞부분만)
    return new Response('[]', {
      headers: {
        ...headers,
        'Cache-Control': 'no-store',
        'X-Cafe-Guests-Error': String(e.message || 'unknown').replace(/[^\x20-\x7E]/g, ' ').slice(0, 160),
      },
    });
  }
}
