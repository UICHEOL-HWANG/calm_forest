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

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/cafe-guests') {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      return cafeGuests({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
    }

    // 그 외는 정적 자산(dist/) — 없으면 자산 핸들러가 404 를 돌려줍니다.
    return env.ASSETS.fetch(request);
  },
};
