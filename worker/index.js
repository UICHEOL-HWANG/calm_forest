// =============================================================
//  calm forest · Cloudflare Worker 진입점
//  ------------------------------------------------------------
//  이 프로젝트는 Pages 가 아니라 Workers(정적 자산) 로 배포됩니다.
//  Pages 전용인 functions/ 자동 라우팅이 동작하지 않으므로,
//  여기서 /api/* 만 직접 처리하고 나머지는 정적 자산으로 넘깁니다.
//
//  ▶ 로직은 functions/api/cafe-guests.js 를 그대로 재사용합니다(중복 구현 X).
//    그 파일은 dist/ 에 복사되지 않으므로 소스가 공개되지 않습니다.
//  ▶ GEMINI_API_KEY 는 Cloudflare 환경변수로만 전달됩니다(코드에 없음).
//  ▶ 🔵 /api/* 는 CORS 를 여기서 일괄 처리합니다. 앱인토스 번들은 토스가 서빙해
//    게임 API 가 항상 교차 오리진이 되는데, 엔드포인트마다 헤더를 붙이면
//    새 API 를 추가할 때마다 빠뜨리게 되므로 진입점 한 곳에서 씌웁니다.
// =============================================================
import { onRequestGet as cafeGuests } from '../functions/api/cafe-guests.js';
import { onRequestPost as nightVisit } from '../functions/api/night-visit.js';
import { onRequestGet as nightNote } from '../functions/api/night-note.js';
import { onRequestPost as photoUpload, onRequestDelete as photoDelete } from '../functions/api/photo.js';
import { onRequestPost as photoUrls } from '../functions/api/photo-urls.js';
import { onRequestGet as leaderboard } from '../functions/api/leaderboard.js';
import { onRequestGet as dexNotes } from '../functions/api/dex-notes.js';
import { onRequestGet as dailyQuests } from '../functions/api/daily-quests.js';
import { onRequestGet as npcTalk } from '../functions/api/npc-talk.js';
import { runNpcGenCron } from '../functions/npc-gen-cron.js';
import { onRequestGet as cardnewsImg } from '../functions/cardnews-img.js';
import { runCardnewsCron } from '../functions/cardnews-cron.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname } = url;

      // 🌐 www → apex 301 — 오리진을 하나로(OAuth 리다이렉트·OG·분석이 이원화되지 않게)
      if (url.hostname === 'www.calmforest.cloud') {
        url.hostname = 'calmforest.cloud';
        return Response.redirect(url.toString(), 301);
      }

      // 🔵 /api/* — 프리플라이트 응답 후 라우팅, 결과에 CORS 헤더를 씌워 내보낸다
      if (pathname.startsWith('/api/')) {
        if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
        const res = await routeApi(pathname, { request, env, ctx });
        if (res) return withCors(res);
      }

      // 🗂️ /cardnews/* — 인스타 발행용 카드 JPEG(KV). 정적 자산보다 먼저 가로챈다.
      //    /api/* 게이트 밖이라 CORS 를 안 씌운다 — 브라우저가 아니라 Meta 서버가 가져간다.
      if (pathname.startsWith('/cardnews/')) {
        if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
        return await cardnewsImg({ request, env });
      }

      // 그 외는 정적 자산(dist/) — 없으면 자산 핸들러가 404 를 돌려줍니다.
      return await env.ASSETS.fetch(request);
    } catch (err) {
      // 여기까지 온 예외는 게임을 하얗게 만들 수 있으므로 구조화 로그로 남기고 500 을 명시 반환
      console.error(JSON.stringify({
        message: 'worker unhandled error',
        url: request.url,
        error: err instanceof Error ? err.message : String(err),
      }));
      // /api/* 의 500 에도 CORS 를 붙인다 — 안 붙이면 브라우저가 CORS 오류로 가려
      // 진짜 원인(500)이 콘솔에 안 보인다.
      const res = Response.json({ error: 'Internal server error' }, { status: 500 });
      return new URL(request.url).pathname.startsWith('/api/') ? withCors(res) : res;
    }
  },

  // ⏰ Cron Trigger — 매일 깨어나 "사흘 지났나"를 판단한다.
  //    날짜식(*/3)으로 주기를 잡으면 월말에 간격이 어긋나므로 판단을 코드가 한다.
  //    ⚠️ 크론이 둘이므로 event.cron 으로 갈라야 한다. 분기 없이 두면
  //       일요일마다 카드뉴스가 한 번 더 도는 꼴이 된다.
  //    ⚠️ 매칭 방향에 이유가 있다 — **카드뉴스를 명시 매칭하고 나머지를 npc-gen 으로** 보낸다.
  //       반대로 하면(npc 크론을 명시 매칭) wrangler.jsonc 의 npc 크론 시각만 바꾸고
  //       여기를 안 고쳤을 때 npc-gen 이 **조용히 영원히 안 돈다**(실패 로그조차 없다).
  //       이 방향이면 같은 실수가 npc_gen_runs 에 매일 한 줄씩 남아 바로 눈에 띈다.
  async scheduled(event, env, ctx) {
    // 🗂️ 카드뉴스 — 매일 02:00 UTC (wrangler.jsonc 의 "0 2 * * *")
    if (event.cron === '0 2 * * *') {
      ctx.waitUntil(runCardnewsCron(env).then(r => {
        console.log(JSON.stringify({ message: 'cardnews cron', cron: event.cron, ...r }));
      }));
      return;
    }
    // 💬 NPC 대사 풀 보충 — 그 외(현재는 "0 19 * * 0" = KST 월요일 04:00)
    ctx.waitUntil(runNpcGenCron(env).then(r => {
      console.log(JSON.stringify({ message: 'npc-gen cron', cron: event.cron, ...r }));
    }));
  },
};

// ── /api/* 라우팅 — 매칭되는 경로가 없으면 null(정적 자산으로 넘어감) ──
async function routeApi(pathname, { request, env, ctx }) {
  if (pathname === '/api/cafe-guests') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    // ctx 를 구조분해하면 this 바인딩이 끊겨 "Illegal invocation" 이 납니다 → bind 로 넘김
    return await cafeGuests({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }

  if (pathname === '/api/night-visit') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    return await nightVisit({ request, env });
  }

  if (pathname === '/api/night-note') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await nightNote({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }

  // 📸 사진첩 — OCI Object Storage 프록시(업로드/삭제/표시 URL 발급)
  if (pathname === '/api/photo') {
    if (request.method === 'POST') return await photoUpload({ request, env });
    if (request.method === 'DELETE') return await photoDelete({ request, env });
    return new Response('Method Not Allowed', { status: 405 });
  }
  if (pathname === '/api/photo-urls') {
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    return await photoUrls({ request, env });
  }

  // 📖 도감 설명문 — 카테고리·언어 조합당 1회 생성 후 엣지 캐시(실패 시 {} 폴백)
  if (pathname === '/api/dex-notes') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await dexNotes({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }

  // 🦉 오늘의 의뢰 — (날짜·날씨·언어·단계) 조합당 1회 생성 후 엣지 캐시(실패 시 [] 폴백)
  if (pathname === '/api/daily-quests') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await dailyQuests({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }

  // 💬 NPC 대화 — 미리 채워 둔 Supabase 풀에서 날짜 시드로 2세트(엣지 캐시 12시간)
  //    Gemini 를 부르지 않는다. 생성은 주 1회 크론과 시딩 스크립트가 맡는다.
  if (pathname === '/api/npc-talk') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await npcTalk({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }

  // 🏆 리더보드 — Supabase RPC 프록시(엣지 캐시 5분)
  if (pathname === '/api/leaderboard') {
    if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
    return await leaderboard({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
  }

  return null;
}

// ── CORS ─────────────────────────────────────────────────────
//  Authorization 을 허용해야 사진첩(토큰 인증)이 교차 오리진에서 동작한다.
//  쿠키를 쓰지 않으므로 Allow-Origin: * 와 충돌하지 않는다.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 캐시에서 나온 응답은 헤더가 불변일 수 있어 복제한 뒤 씌운다
function withCors(res) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(CORS)) out.headers.set(k, v);
  return out;
}
