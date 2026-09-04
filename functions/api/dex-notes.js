// =============================================================
//  calm forest · 📖 도감 설명문 API (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  GET /api/dex-notes?cat=fish&lang=ko
//    → { "<종 id>": "한 줄 설명", ... }
//
//  ▶ cafe-guests 와 같은 규칙: 키는 서버 환경변수에만, 종 목록은 서버에 고정(인젝션 차단).
//  ▶ 종 목록은 배포마다 고정이라 응답이 사람·날짜에 따라 달라지지 않는다.
//    → 카테고리당 한 번만 만들면 끝. 캐시를 길게 잡아 호출이 사실상 0으로 수렴한다.
//    (CACHE_VER 를 올리면 종 목록을 바꾼 뒤 캐시를 버릴 수 있다)
//  ▶ 실패하면 {} — 도감은 지금처럼 아이콘·이름만 보여준다.
//  ⚠️ scripts/serve.py 에 같은 규칙의 로컬 미러가 있다. 한쪽만 고치지 마세요.
// =============================================================

// js/game.js 의 DEX 와 id 가 일치해야 한다(설명을 붙일 자리를 못 찾으면 조용히 비어 보인다).
// about = 그 카테고리가 게임에서 무엇인지 — 모델이 엉뚱한 설명을 쓰지 않게 하는 최소 문맥.
const DEX_CATS = {
  fish:    { about: '호수 부두에서 낚싯대로 잡는 물고기', aboutEn: 'fish caught with a rod at the lake pier',
    items: [['common', '피라미', 'Minnow'], ['uncommon', '붉은 물고기', 'Red Fish'], ['rare', '무지개 물고기', 'Rainbow Fish']] },
  crop:    { about: '밭에 씨앗을 심고 물을 줘 거두는 작물', aboutEn: 'crops sown, watered and harvested in the field',
    items: [['carrot', '당근', 'Carrot'], ['tomato', '토마토', 'Tomato'], ['blueberry', '블루베리', 'Blueberry'], ['pumpkin', '호박', 'Pumpkin']] },
  ore:     { about: '서쪽 동굴에서 괭이로 캐는 광물', aboutEn: 'ore mined with a hoe in the west cave',
    items: [['stone', '돌', 'Stone'], ['coal', '석탄', 'Coal'], ['gem', '보석', 'Gem']] },
  cook:    { about: '자유주방에서 재료로 만드는 요리', aboutEn: 'dishes made from ingredients in the open kitchen',
    items: [['veg_stew', '든든한 채소죽', 'Hearty Veggie Porridge'], ['grilled_fish', '생선 구이', 'Grilled Fish'], ['lunchbox', '모둠 도시락', 'Picnic Lunchbox'], ['omelette', '푸짐한 오믈렛', 'Fluffy Omelette'], ['mushroom_soup', '숲의 버섯 스프', 'Forest Mushroom Soup']] },
  npc:     { about: '마을에 사는 이웃들', aboutEn: 'the neighbours who live in the village',
    items: [['farmer', '농부 삼촌', 'Farmer'], ['builder', '목수 아저씨', 'Carpenter'], ['merchant', '방랑 상인', 'Wandering Merchant'], ['angler', '낚시꾼 할아버지', 'Old Fisherman'], ['courier', '의뢰 올빼미', 'Request Owl'], ['chef', '요리사 판다', 'Chef Panda']] },
  forage:  { about: '채집 숲을 걷다 도구 없이 줍는 것들', aboutEn: 'things picked bare-handed while walking the foraging woods',
    items: [['mushroom', '숲 버섯', 'Forest Mushroom'], ['berry', '산딸기', 'Wild Berry'], ['acorn', '도토리', 'Acorn'], ['herb', '숲 약초', 'Forest Herb']] },
  bug:     { about: '밤에 반딧불이 계곡에서 포충망으로 잡는 반딧불이', aboutEn: 'fireflies netted at night in Firefly Glade',
    items: [['yellow', '노랑반디', 'Yellow Firefly'], ['blue', '푸른반디', 'Blue Firefly'], ['green', '초록반디', 'Green Firefly'], ['rainbow', '무지개반디', 'Rainbow Firefly']] },
  track:   { about: '밤사이 밭에 다녀간 동물이 남긴 흔적', aboutEn: 'traces left in the field by animals that came overnight',
    items: [['fur_tuft', '털뭉치', 'Tuft of Fur'], ['acorn_drop', '주운 도토리', 'Dropped Acorn']] },
  river:   { about: '나룻배를 타고 강을 내려가며 줍는 것들', aboutEn: 'things scooped up while drifting down the river by boat',
    items: [['lotus', '물 위 연꽃', 'Floating Lotus'], ['driftwood', '떠내려온 나무', 'Driftwood'], ['shell', '강 조개', 'River Shell'], ['moon_fish', '달빛 물고기', 'Moonlight Fish']] },
  spirit:  { about: '안개 낀 숲에서 노래로 달래면 나타나는 정령', aboutEn: 'spirits that appear when soothed with song in the misty grove',
    items: [['shy', '수줍은 정령', 'Shy Spirit'], ['sleepy', '졸린 정령', 'Sleepy Spirit'], ['mischief', '장난꾸러기 정령', 'Mischievous Spirit'], ['golden', '황금 정령', 'Golden Spirit']] },
  weather: { about: '그 날씨인 날 마을에 접속하면 채워지는 하루의 날씨', aboutEn: "the day's weather, filled in by visiting the village on such a day",
    items: [['clear', '맑은 날', 'Clear Day'], ['rain', '비 오는 날', 'Rainy Day'], ['snow', '눈 오는 날', 'Snowy Day'], ['fog', '안개 낀 날', 'Foggy Day']] },
};

const NOTE_MAX = 44;      // 도감 카드(88px)에 세 줄쯤. 프롬프트엔 38자로 일러 여유를 둔다
const NOTE_ASK = 38;      //   (모델이 살짝 넘겨도 …로 잘리지 않게)
const NOTE_MAX_EN = 88;
const NOTE_ASK_EN = 76;
const CACHE_VER = 1;      // 종 목록을 바꾸면 올린다(옛 캐시 버리기)
const CACHE_TTL = 60 * 60 * 24 * 7;   // 7일 — 내용이 고정이라 길게 잡는다

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
      id: { type: 'STRING', description: '종 id' },
      note: { type: 'STRING', description: '한 줄 설명' },
    },
    required: ['id', 'note'],
  },
};

const SYSTEM = `너는 코지 힐링 게임 "calm forest"의 도감을 쓰는 사람이야. 플레이어가 처음 발견한 것에 붙는 짧은 소개글을 쓴다.
규칙:
- 한국어. 따뜻하고 담백하게. 과장·이모지·따옴표 금지.
- note 는 ${NOTE_ASK}자 이내 한 문장. 도감 카드에 들어가는 짧은 글이라 길면 잘려 나간다.
- 모든 항목을 '~다' 로 끝맺는 평서형으로 통일하고 마침표를 찍는다(존댓말·물음표 섞지 않기).
- 게임 안내문이 아니라 "이 숲에 사는 것"에 대한 관찰처럼 쓴다.
  잡는 방법·조작법을 설명하지 말고, 생김새·성질·언제 보이는지 같은 한 조각을 담는다.
- 종마다 서로 다른 결로 쓴다. 같은 문장 틀을 반복하지 않는다.
- 주어진 id 전부에 대해 하나씩 쓴다.`;

const SYSTEM_EN = `You write the field guide for "calm forest", a cozy healing game — the short blurb shown when a player first discovers something.
Rules:
- English. Warm and understated. No exaggeration, no emoji, no quotation marks.
- "note" is one sentence, at most ${NOTE_ASK_EN} characters — it sits on a small card and longer text gets cut off.
- End every entry as a plain declarative sentence with a period; keep one consistent voice across the set.
- Write it as an observation about something living in this forest, not as game instructions.
  Never explain how to catch or use it; give one detail of how it looks, behaves, or when it shows up.
- Give each entry a different texture. Do not repeat one sentence pattern.
- Write exactly one note for every id given.`;

function buildPrompt(cat, lang) {
  const c = DEX_CATS[cat];
  const items = c.items.map(([id, ko, en]) => `- ${id}: ${lang === 'en' ? en : ko}`);
  if (lang === 'en') {
    return [`Category: ${cat} — ${c.aboutEn}`, '', 'Entries:', ...items,
      '', 'Write one note for each entry.'].join('\n');
  }
  return [`분류: ${cat} — ${c.about}`, '', '항목:', ...items,
    '', '각 항목에 설명을 하나씩 써줘.'].join('\n');
}

// 모델 응답을 그대로 믿지 않는다 — 목록에 있는 id 만, 길이도 잘라서
function sanitize(raw, cat, lang) {
  const ok = new Set(DEX_CATS[cat].items.map(([id]) => id));
  const out = {};
  for (const r of Array.isArray(raw) ? raw : []) {
    if (!r || typeof r !== 'object') continue;
    const id = String(r.id || '').trim();
    if (!ok.has(id) || out[id]) continue;
    const note = trim(r.note, lang === 'en' ? NOTE_MAX_EN : NOTE_MAX);
    if (note) out[id] = note;
  }
  return out;
}

async function generate(env, cat, lang) {
  const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: lang === 'en' ? SYSTEM_EN : SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: buildPrompt(cat, lang) }] }],
        generationConfig: {
          temperature: 1.0,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  return sanitize(JSON.parse(text), cat, lang);
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const cat = url.searchParams.get('cat') || '';
  const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'ko';   // 화이트리스트(그 외 값은 ko)

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  if (!DEX_CATS[cat]) return new Response('{}', { headers: { ...headers, 'Cache-Control': 'no-store' } });
  if (!env.GEMINI_API_KEY) {
    // 미설정 = 기능 끔(도감은 아이콘·이름만). 캐시하면 안 된다 — 키를 넣어도 계속 빈 응답이 나가므로.
    return new Response('{}', { headers: { ...headers, 'Cache-Control': 'no-store' } });
  }

  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/dex-notes?cat=${cat}&lang=${lang}&v=${CACHE_VER}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const need = DEX_CATS[cat].items.length;
    let notes = await generate(env, cat, lang);
    if (Object.keys(notes).length < need) notes = await generate(env, cat, lang);   // 빠진 게 있으면 1회 재시도
    if (Object.keys(notes).length < need) throw new Error(`${Object.keys(notes).length}/${need} 만 생성됨`);
    const out = new Response(JSON.stringify(notes), { headers });
    waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    console.error(JSON.stringify({ message: 'dex-notes failed', cat, lang, error: e.message }));
    // 실패는 도감을 막지 않는다 — 빈 객체면 클라이언트가 설명 줄을 생략한다.
    return new Response('{}', {
      headers: { ...headers, 'Cache-Control': 'no-store' },
    });
  }
}
