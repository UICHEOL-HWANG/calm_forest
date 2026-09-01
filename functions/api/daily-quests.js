// =============================================================
//  calm forest · 🦉 오늘의 의뢰 생성 API (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  GET /api/daily-quests?date=YYYY-MM-DD&weather=clear&lang=ko
//    → [{ type, target, title, desc, line }, ...] (3개)
//
//  ▶ cafe-guests 와 같은 규칙: 키는 서버 환경변수에만, 입력은 화이트리스트로만
//    프롬프트에 넣고(인젝션 차단), (날짜·날씨·언어) 조합당 엣지 캐시 1회 생성.
//  ▶ ⚠️ type 은 게임이 실제로 쏘는 이벤트여야 한다. 목록 밖 값이 통과하면
//    "무지개 물고기 3마리" 같은 영원히 완료 못 하는 의뢰가 되어 그날 보상이 통째로 막힌다.
//    그래서 모델 응답을 믿지 않고 QUEST_SPEC 으로 걸러낸다(js/game.js 의 QUEST_TYPES 와 짝).
//  ▶ ⚠️ desc("나무 5번 베기")는 모델에게 맡기지 않고 서버가 type+target 으로 만든다.
//    모델이 desc 에 "5번"이라 쓰고 target 을 7로 주면 표시와 실제 목표가 어긋나기 때문.
//  ▶ 실패하면 빈 배열 — 게임은 로컬 DAILY_POOL 의뢰로 조용히 진행한다.
//  ⚠️ scripts/serve.py 에 같은 규칙의 로컬 미러가 있다. 한쪽만 고치지 마세요.
// =============================================================

// 의뢰로 낼 수 있는 목표 — id 는 js/game.js 의 questEvent() 가 쏘는 이벤트와 일치해야 한다.
// min/max 는 기존 DAILY_POOL 의 값을 가운데 두고 잡은 안전 범위(난이도 폭주 방지).
const QUEST_SPEC = {
  chop:    { min: 3, max: 8, ko: n => `나무 ${n}번 베기`,              en: n => `Chop ${n} trees` , where: '마을 숲', whereEn: 'the village woods' },
  plant:   { min: 2, max: 6, ko: n => `씨앗 ${n}번 심기`,              en: n => `Plant ${n} seeds` , where: '밭·텃밭', whereEn: 'the field or your garden' },
  water:   { min: 3, max: 8, ko: n => `물 ${n}번 주기`,                en: n => `Water ${n} times` , where: '밭·텃밭', whereEn: 'the field or your garden' },
  harvest: { min: 2, max: 6, ko: n => `작물 ${n}개 수확하기`,          en: n => `Harvest ${n} crops` , where: '밭·텃밭', whereEn: 'the field or your garden' },
  fish:    { min: 2, max: 5, ko: n => `물고기 ${n}마리 낚기`,          en: n => `Catch ${n} fish` , where: '호수 부두', whereEn: 'the lake pier' },
  mine:    { min: 3, max: 7, ko: n => `광석 ${n}개 캐기`,              en: n => `Mine ${n} ore` , where: '서쪽 동굴', whereEn: 'the west cave' },
  sell:    { min: 3, max: 8, ko: n => `상점에서 ${n}개 팔기`,          en: n => `Sell ${n} items at the shop` , where: '상점', whereEn: 'the shop' },
  cook:    { min: 1, max: 3, ko: n => `요리 ${n}번 하기`,              en: n => `Cook ${n} times` , where: '자유주방', whereEn: 'the open kitchen' },
  serve:   { min: 2, max: 4, ko: n => `☕ 카페 손님 ${n}명 서빙하기`,   en: n => `Serve ${n} café guests` , where: '카페', whereEn: 'the café' },
  catch:   { min: 2, max: 5, ko: n => `🌟 반딧불이 ${n}마리 잡기(밤)`, en: n => `Catch ${n} fireflies (night)` , where: '반딧불이 계곡(밤)', whereEn: 'Firefly Glade (at night)' },
  forage:  { min: 3, max: 8, ko: n => `🍄 채집물 ${n}개 줍기`,         en: n => `Forage ${n} finds` , where: '채집 숲', whereEn: 'the foraging woods' },
};
const TYPES = Object.keys(QUEST_SPEC);
const NEED = 3;

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

const TITLE_MAX = 12;      // 퀘스트 패널 제목 줄
const LINE_MAX = 48;       // 올빼미 대사 한 줄(카페 손님 대사와 같은 폭)
const TITLE_MAX_EN = 24;
const LINE_MAX_EN = 88;

const CACHE_TTL = 60 * 60 * 12;   // 12시간(날짜가 바뀌면 캐시 키 자체가 달라짐)

// 길이 초과 시 글자 중간을 뚝 자르면 어색하므로 마지막 공백까지만 남기고 말줄임표
function trim(s, max) {
  const t = String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > max * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      type: { type: 'STRING', description: '목표 종류 id' },
      target: { type: 'INTEGER', description: '목표 횟수' },
      title: { type: 'STRING', description: '의뢰 이름' },
      line: { type: 'STRING', description: '올빼미가 건네는 한 문장' },
    },
    required: ['type', 'target', 'title', 'line'],
  },
};

const SYSTEM = `너는 코지 힐링 게임 "calm forest"의 의뢰 담당 올빼미야. 마을 사람들이 오늘 필요한 일을 모아 플레이어에게 세 가지 의뢰로 전한다.
규칙:
- 한국어. 다정하고 담백한 말투. 과장·이모지·따옴표 금지.
- 세 의뢰가 하나의 하루로 이어지게 짠다. 아래는 '결'의 예시일 뿐이니, 매일 다른 결을 고른다:
  · 숲에서 재료를 모으고 → 요리하고 → 카페 손님에게 낸다
  · 밭을 갈아 심고 → 물을 주고 → 거둔다
  · 나무를 베고 → 광석을 캐고 → 상점에 내다 판다
  · 낚시를 하고 → 저녁을 차리고 → 밤에 반딧불이를 보러 간다
- 예시를 그대로 베끼지 말고 오늘 날씨와 어울리는 결을 새로 고른다. 요리·서빙에만 치우치지 않는다.
- title 은 ${TITLE_MAX}자 이내 짧은 이름.
- line 은 ${LINE_MAX}자 이내 한 문장. 마을에 오늘 무슨 일이 있어서 이 일이 필요한지 이유를 담는다.
- type 은 반드시 주어진 목록의 값만 쓴다. target 은 주어진 범위 안의 정수.
- 같은 type 을 두 번 쓰지 않는다.
${PHASE_RULE_KO}
- 날씨를 자연스럽게 반영해도 좋다(비 오는 날엔 숲에 버섯이 잘 돋는다).
- 마을에 있는 것만 언급한다: 밭 · 집 · 카페 · 상점 · 작업대 · 자유주방 · 동굴 · 호수 · 채집 숲 · 닭장 · 나루터 · 안개 숲.
  게임에 없는 시설이나 물건(비닐하우스·시장 좌판 같은 것)을 지어내지 않는다.`;

const SYSTEM_EN = `You are the Owl who hands out requests in "calm forest", a cozy healing game. You gather what the villagers need today and pass it to the player as three requests.
Rules:
- English. Warm and understated. No exaggeration, no emoji, no quotation marks.
- The three requests should read as one connected day. These are only examples of a "shape" — pick a different one each day:
  · forage in the woods → cook → serve it to café guests
  · till and sow → water → harvest
  · chop wood → mine ore → sell it at the shop
  · fish → cook supper → go watch fireflies at night
- Do not copy the examples; pick a shape that suits today's weather. Don't lean on cooking and serving every time.
- "title" is a short name, at most ${TITLE_MAX_EN} characters.
- "line" is one sentence, at most ${LINE_MAX_EN} characters, giving the reason today's village needs this done.
- Use only "type" values from the given list. "target" must be an integer inside the given range.
- Never use the same type twice.
${PHASE_RULE_EN}
- You may weave in the weather (mushrooms come up in the woods after rain).
- Mention only what exists in the village: the field, the house, the café, the shop, the workbench,
  the open kitchen, the cave, the lake, the foraging woods, the coop, the river dock, the misty grove.
  Never invent places or objects the game does not have (no greenhouses, no market stalls).`;

// 날짜로 '오늘 문을 여는 일감' 을 하나 정해 프롬프트에 넣는다.
//   예시만 주면 모델이 그중 한 결에 고착된다 — 실제로 며칠을 뽑아 보니 전부 chop 으로 시작했다.
//   시작점을 날짜로 돌려 주면 결이 매일 확실히 갈리고, 나머지 둘은 모델이 이어 붙인다.
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

function openerFor(date) {
  let h = 0;
  for (let i = 0; i < date.length; i++) h = (h * 31 + date.charCodeAt(i)) & 0x7fffffff;
  return TYPES[h % TYPES.length];
}

function buildPrompt(date, weather, lang, phase) {
  const opener = openerFor(date);
  const list = TYPES.map(t => {
    const s = QUEST_SPEC[t];
    return `- ${t}: ${(lang === 'en' ? s.en : s.ko)(s.min)} @ ${lang === 'en' ? s.whereEn : s.where} … (${s.min}~${s.max})`;
  });
  if (lang === 'en') {
    return [
      `Date: ${date} (weather: ${WEATHER_EN[weather] || 'sunny'})`,
      `The player ${PHASES[phase].en}.`,
      '', 'Goal types (id: what it means @ where it happens … allowed target range):', ...list,
      '', `Open today with "${opener}"; the other two are yours to choose so the day connects.`,
      `Write today's ${NEED} requests.`,
    ].join('\n');
  }
  return [
    `날짜: ${date} (날씨: ${WEATHER_KO[weather] || '맑음'})`,
    `플레이어는 ${PHASES[phase].ko}.`,
    '', '목표 종류 (id: 무슨 일인지 @ 어디서 … 허용 범위):', ...list,
    '', `오늘은 '${opener}' 로 문을 여는 하루야. 이어지는 나머지 둘은 네가 골라서 하루가 이어지게 해.`,
    `오늘의 의뢰 ${NEED}개를 만들어줘.`,
  ].join('\n');
}

// 모델 응답을 그대로 믿지 않는다 — type 은 화이트리스트, target 은 범위 클램프,
// desc 는 여기서 만든다(표시와 실제 목표가 어긋나지 않게).
function sanitize(raw, lang) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const q of raw) {
    if (!q || typeof q !== 'object') continue;
    const type = String(q.type || '').trim();
    const spec = QUEST_SPEC[type];
    if (!spec || seen.has(type)) continue;                       // 목록 밖·중복 목표 제거
    const n = Math.round(Number(q.target));
    if (!Number.isFinite(n)) continue;
    const target = Math.min(spec.max, Math.max(spec.min, n));    // 난이도 범위로 클램프
    const title = trim(q.title, lang === 'en' ? TITLE_MAX_EN : TITLE_MAX);
    const line = trim(q.line, lang === 'en' ? LINE_MAX_EN : LINE_MAX);
    if (!title || !line) continue;
    seen.add(type);
    out.push({ type, target, title, desc: (lang === 'en' ? spec.en : spec.ko)(target), line });
    if (out.length >= NEED) break;
  }
  return out;
}

async function generate(env, date, weather, lang, phase) {
  const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: lang === 'en' ? SYSTEM_EN : SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(date, weather, lang, phase) }] }],
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
  return sanitize(JSON.parse(text), lang);
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  // 입력 정규화 — 프롬프트에 들어가므로 형식을 엄격히 제한(클라이언트발 인젝션 차단)
  const date = clampDate(url.searchParams.get('date') || '');   // 🔒 어제·오늘·내일만
  const rawWeather = url.searchParams.get('weather') || '';
  const weather = ['clear', 'rain', 'snow', 'fog'].includes(rawWeather) ? rawWeather : 'clear';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ko';   // 화이트리스트(그 외 값은 ko)
  const rawPhase = url.searchParams.get('phase') || '';
  const phase = PHASES[rawPhase] ? rawPhase : 'settled';             // 화이트리스트(그 외 값은 settled)

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',        // 비밀·개인정보가 없는 응답(앱인토스 번들 등 타 오리진 대응)
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  if (!env.GEMINI_API_KEY) {
    // 미설정 = 기능 끔(게임은 로컬 의뢰로 진행). 캐시하면 안 된다 —
    // 키를 나중에 넣어도 12시간 동안 빈 응답이 계속 나가기 때문.
    return new Response('[]', { headers: { ...headers, 'Cache-Control': 'no-store' } });
  }

  // 날짜·날씨·언어가 같으면 엣지 캐시 재사용 → Gemini 호출은 하루 한 번(엣지 PoP당)
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/daily-quests?date=${date}&weather=${weather}&lang=${lang}&phase=${phase}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    // 중복 type·목록 밖 값이 걸러지면 3개가 안 될 수 있다 → 한 번만 다시 물어본다.
    let quests = await generate(env, date, weather, lang, phase);
    if (quests.length < NEED) quests = await generate(env, date, weather, lang, phase);
    if (quests.length < NEED) throw new Error(`sanitize 후 ${quests.length}개만 남음`);
    const out = new Response(JSON.stringify(quests), { headers });
    waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    // 구조화 로그 — Cloudflare 대시보드에서 필터링·집계가 되게(유저에겐 조용히 폴백되므로 여기서만 보임)
    console.error(JSON.stringify({ message: 'daily-quests failed', date, weather, lang, phase, error: e.message }));
    // 실패는 게임을 막지 않는다 — 빈 배열이면 클라이언트가 로컬 DAILY_POOL 을 쓴다.
    // 캐시하지 않으므로 다음 요청에서 다시 시도한다.
    return new Response('[]', {
      headers: { ...headers, 'Cache-Control': 'no-store' },
    });
  }
}
