// =============================================================
//  calm forest · 💬 NPC 대화 조회 API (Cloudflare Pages Function)
//  ------------------------------------------------------------
//  GET /api/npc-talk?date=YYYY-MM-DD&npc=farmer&lang=ko
//    → { openers: { clear, rain, snow, fog }, sets: [ {id, turns[3]} × 2 ] }
//
//  ▶ ⚠️ 이 API 는 Gemini 를 부르지 않는다. 대사는 미리 채워 둔 Supabase 풀에서
//     날짜를 시드로 뽑아 온다 — 매일 바뀌되 호출 비용이 0이다.
//     생성은 tools/seed-npc-dialogues.mjs(수동)와 주 1회 크론이 맡는다.
//  ▶ ⚠️ 캐시 키에 weather 를 넣지 않는다. 대신 첫인사를 **날씨 4종 모두** 내려준다.
//     응답이 날씨에 따라 갈리면 캐시 키가 4배(22→88)가 되는데, 첫인사는 겨우 네 줄이라
//     통째로 주는 편이 싸다. 덤으로 게임 중 날씨가 바뀌어도 재요청이 필요 없다.
//  ▶ 작별 문구(farewell)는 여기서 안 준다 — 고정 문구라 i18n 사전이 맡는다.
//  ▶ 입력은 화이트리스트로만 받는다(프롬프트에 안 들어가도 rpc 인자로는 들어간다).
//  ▶ 실패하면 빈 응답 — 게임은 로컬 기본 대사로 조용히 진행한다.
//  ⚠️ scripts/serve.py 에 같은 규칙의 로컬 미러가 있다. 한쪽만 고치지 마세요.
// =============================================================
import { NPC_SHEET, LANGS, WEATHERS } from './_npc-gen.js';

// ⚠️ js/game.js 의 TALK_PER_DAY · scripts/serve.py 의 SETS_PER_DAY 와 같아야 한다.
//    어긋나도 빈 대화가 열리지는 않는다(클라이언트가 setIdx 를 클램프한다) — 증상은
//    **같은 세트가 하루에 두 번 나오는 것**이다. tests/npc-talk.test.mjs 가 셋을 맞춰 본다.
const SETS_PER_DAY = 2;
const CACHE_TTL = 60 * 60 * 12;   // 12시간(날짜가 바뀌면 캐시 키 자체가 달라짐)

// 어제·오늘·내일만 허용 — 임의 날짜를 받으면 캐시 키가 무한히 갈라진다
function clampDate(raw) {
  const now = Date.now();
  for (let d = -1; d <= 1; d++) {
    if (raw === new Date(now + d * 86400000).toISOString().slice(0, 10)) return raw;
  }
  return new Date(now).toISOString().slice(0, 10);
}

async function rpc(env, name, body) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export async function onRequestGet({ request, env, waitUntil }) {
  const url = new URL(request.url);
  const date = clampDate(url.searchParams.get('date') || '');
  const rawNpc = url.searchParams.get('npc') || '';
  const npc = NPC_SHEET[rawNpc] ? rawNpc : '';                        // 화이트리스트
  const rawLang = url.searchParams.get('lang') || '';
  const lang = LANGS.includes(rawLang) ? rawLang : 'ko';              // 화이트리스트(그 외 ko)

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',      // 비밀·개인정보 없는 응답(앱인토스 번들 등 타 오리진 대응)
    'Cache-Control': `public, max-age=${CACHE_TTL}`,
  };
  const empty = (reason) => new Response(JSON.stringify({ openers: {}, sets: [] }), {
    // 캐시하지 않는다 — 풀·설정이 나중에 채워져도 12시간 동안 빈 응답이 계속 나가면 안 된다
    headers: { ...headers, 'Cache-Control': 'no-store', 'X-Npc-Talk': reason },
  });

  if (!npc) return empty('unknown-npc');
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return empty('no-supabase');

  // 날짜·주민·언어가 같으면 엣지 캐시 재사용 → 하루 22키(엣지 PoP당)
  const cache = caches.default;
  // ⚠️ 키에 n 을 넣는다 — 하루 세트 수를 바꿔 배포해도 옛 개수로 캐시된 응답이
  //    TTL 동안 계속 나가면 소진 판정이 어긋난다(daily-quests 의 NEED 와 같은 이유).
  const cacheKey = new Request(
    `${url.origin}/api/npc-talk?date=${date}&npc=${npc}&lang=${lang}&n=${SETS_PER_DAY}`,
    { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    // 같은 날짜·주민이면 모두가 같은 대사를 본다(엣지 캐시와 자동 일치).
    // 시드에 npc 를 섞어 주민마다 다른 세트가 뽑히게 한다.
    const seed = `${date}:${npc}`;
    // ⚠️ 첫인사는 **장식**이다. 실패해도 본문을 죽이면 안 된다 —
    //    Promise.all 에 그냥 묶으면 opener rpc 하나가 터졌을 때 성공한 본문까지 버려진다.
    //    본문만 throw 를 전파하고, 첫인사는 개별적으로 삼킨다.
    const [sets, ...openerLines] = await Promise.all([
      rpc(env, 'npc_dialogue_pick', { p_npc: npc, p_lang: lang, p_seed: seed, p_n: SETS_PER_DAY }),
      ...WEATHERS.map(w => rpc(env, 'npc_opener_pick',
        { p_npc: npc, p_lang: lang, p_weather: w, p_seed: seed }).catch(() => null)),
    ]);

    // 풀이 비었으면 캐시하지 않는다 — 시딩 직후 12시간 동안 빈 응답이 나가는 걸 막는다
    if (!Array.isArray(sets) || sets.length === 0) return empty('empty-pool');

    const openers = {};
    WEATHERS.forEach((w, i) => { if (openerLines[i]) openers[w] = openerLines[i]; });

    const out = new Response(JSON.stringify({ openers, sets }), { headers });
    waitUntil(cache.put(cacheKey, out.clone()));
    return out;
  } catch (e) {
    // 구조화 로그 — 유저에겐 조용히 폴백되므로 대시보드에서만 보인다
    console.error(JSON.stringify({ message: 'npc-talk failed', date, npc, lang, error: e.message }));
    return empty('error');
  }
}
