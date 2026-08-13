// =============================================================
//  calm forest · 📜 밤손님 주민 쪽지 API (Gemini · 날짜 캐시)
//  ------------------------------------------------------------
//  GET /api/night-note?date=YYYY-MM-DD&animal=raccoon|boar&crop=carrot
//    → { author, text }
//
//  밤손님이 작물을 훔쳐간 다음날, 주민이 밭에 남겨둔 쪽지 —
//  "훔쳐간 뒤 어떻게 됐는지"(숲에서 잘 먹더라, 새끼들이 있더라 …)를
//  따뜻하게 전해 손실이 이야기로 남게 합니다.
//
//  ▶ cafe-guests 와 같은 규칙: 키는 서버 환경변수에만, 입력은 화이트리스트로만
//    프롬프트에 넣고(인젝션 차단), (날짜·동물·작물) 조합당 엣지 캐시 1회 생성.
//    조합 가짓수가 2×5라 자정 이후 유저들이 나눠 맞아도 Gemini 호출은 소량.
//  ▶ 실패하면 {} — 클라이언트가 쪽지 표시를 조용히 생략합니다.
// =============================================================

const ANIMAL_KO = { raccoon: '너구리', boar: '멧돼지' };
const CROP_KO = { carrot: '당근', tomato: '토마토', blueberry: '블루베리', pumpkin: '호박', '': '작물' };
const AUTHOR = '농부 삼촌';
const TEXT_MAX = 140;
const CACHE_TTL = 60 * 60 * 12;   // 12시간(날짜가 바뀌면 캐시 키가 달라짐)

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { text: { type: 'STRING', description: '쪽지 본문' } },
  required: ['text'],
};

const SYSTEM = `너는 코지 힐링 게임 "calm forest"의 농부 삼촌이야. 밤사이 숲 동물이 밭에서 작물을 조금 가져간 다음날 아침, 플레이어의 밭에 남겨둔 짧은 쪽지를 쓴다.
규칙:
- 한국어, 존댓말 섞인 다정한 시골 말투. 이모지·따옴표 금지.
- ${TEXT_MAX}자 이내 2~3문장. 동물을 탓하거나 해치자는 말은 절대 없음.
- 핵심은 "가져간 뒤 어떻게 됐는지" 한 장면: 숲에서 나눠 먹더라, 새끼들이 기다리더라, 겨울 준비더라 같은 따뜻한 뒷이야기.
- 마지막에 허수아비나 울타리를 살짝 권해도 좋다(강요 말고 한마디).`;

async function generate(env, date, animal, crop) {
  const model = env.GEMINI_MODEL || 'gemini-flash-lite-latest';
  const prompt = `날짜: ${date}\n다녀간 동물: ${ANIMAL_KO[animal]}\n가져간 작물: ${CROP_KO[crop]}\n\n오늘 아침의 쪽지를 써줘.`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
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
  const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  const text = String(JSON.parse(raw)?.text || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX);
  if (!text) throw new Error('빈 쪽지');
  return { author: AUTHOR, text };
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  // 화이트리스트 정규화 — 목록 밖 값은 기본값으로(클라이언트발 프롬프트 인젝션 차단)
  const rawDate = url.searchParams.get('date') || '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : new Date().toISOString().slice(0, 10);
  const animal = url.searchParams.get('animal') === 'boar' ? 'boar' : 'raccoon';
  const crop = (url.searchParams.get('crop') || '') in CROP_KO ? (url.searchParams.get('crop') || '') : '';

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  if (!env.GEMINI_API_KEY) {
    // 미설정 = 기능 끔. 캐시 금지(키를 나중에 넣어도 빈 응답이 박히지 않게)
    return new Response('{}', { headers: { ...headers, 'Cache-Control': 'no-store' } });
  }

  // (날짜·동물·작물)이 같으면 엣지 캐시 재사용 — 같은 사건을 겪은 유저는 같은 쪽지
  const cache = caches.default;
  const cacheKey = new Request(`${url.origin}/api/night-note?date=${date}&animal=${animal}&crop=${crop}`, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    const note = await generate(env, date, animal, crop);
    const out = new Response(JSON.stringify(note), { headers });
    waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    console.error(JSON.stringify({ message: 'night-note failed', date, animal, crop, error: e.message }));
    // 실패는 캐시하지 않는다 — 다음 요청에서 재시도. 클라이언트는 쪽지를 생략할 뿐.
    return new Response('{}', {
      headers: {
        ...headers,
        'Cache-Control': 'no-store',
        'X-Night-Note-Error': String(e.message || 'unknown').replace(/[^\x20-\x7E]/g, ' ').slice(0, 160),
      },
    });
  }
}
