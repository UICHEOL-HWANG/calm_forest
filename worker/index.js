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
// =============================================================
import { onRequestGet as cafeGuests } from '../functions/api/cafe-guests.js';
import { onRequestPost as nightVisit } from '../functions/api/night-visit.js';
import { onRequestGet as nightNote } from '../functions/api/night-note.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const { pathname } = new URL(request.url);

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

      // 그 외는 정적 자산(dist/) — 없으면 자산 핸들러가 404 를 돌려줍니다.
      return await env.ASSETS.fetch(request);
    } catch (err) {
      // 여기까지 온 예외는 게임을 하얗게 만들 수 있으므로 구조화 로그로 남기고 500 을 명시 반환
      console.error(JSON.stringify({
        message: 'worker unhandled error',
        url: request.url,
        error: err instanceof Error ? err.message : String(err),
      }));
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  },
};
