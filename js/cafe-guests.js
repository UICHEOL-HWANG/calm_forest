// =============================================================
//  calm forest · ☕ 카페 손님 동적 생성 (클라이언트 어댑터)
//  ------------------------------------------------------------
//  game.js 의 setCafeGuestSource() 확장 지점에 "서버 프록시 호출"을 끼웁니다.
//
//  ▶ Gemini API 키는 이 파일에 없습니다. 브라우저는 같은 오리진의
//    /api/cafe-guests (Cloudflare Pages Function) 만 호출하고,
//    키를 쥔 서버가 대신 Gemini 를 부릅니다. (functions/api/cafe-guests.js)
//  ▶ 실패·지연·미설정 시엔 아무 일도 없었던 것처럼 게임의 기본(날짜 시드) 손님이 나옵니다.
//    → 오프라인이거나 무료 티어 한도를 넘겨도 카페는 그대로 돌아갑니다.
// =============================================================

import { CONFIG } from './config.js';
import { LANG } from './i18n.js';
import { setCafeGuestSource } from './game.js';
import { sendCafeGuests } from './supabase-client.js';

const TIMEOUT_MS = 6000;   // 이 안에 안 오면 포기하고 기본 손님으로(입장 흐름을 막지 않음)

// 서버 응답을 한 번 더 검증 — 게임이 아는 주민/메뉴만 통과시킨다(방어적 이중 검증)
function normalize(raw, ctx) {
  if (!Array.isArray(raw)) return [];
  const okNpc = new Set(ctx.npcs.map(n => n.id));
  const okRecipe = new Set(ctx.recipes.map(r => r.id));
  const seen = new Set();
  const out = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const id = String(g.id || '').trim();
    if (!okNpc.has(id) || seen.has(id)) continue;
    // 아직 못 만드는 메뉴(예: 닭장 전 오믈렛)를 주문했으면 recipeId 를 비워 game.js 가 대체하게 둔다
    const recipeId = okRecipe.has(g.recipeId) ? g.recipeId : '';
    const line = String(g.line || '').trim().slice(0, 60);
    const thanks = String(g.thanks || '').trim().slice(0, 40);
    if (!line || !thanks) continue;
    seen.add(id);
    out.push({ id, recipeId, line, thanks });
    if (out.length >= ctx.count) break;
  }
  return out;
}

// 게임 시작 시 1회 호출 — 엔드포인트가 설정돼 있을 때만 생성기를 등록
export function initCafeGuests() {
  const endpoint = CONFIG.CAFE_GUEST_API;
  if (!endpoint) return;                      // 미설정 = 기본 손님만 사용

  setCafeGuestSource(async (ctx) => {
    const url = `${endpoint}?date=${encodeURIComponent(ctx.date)}`
      + `&weather=${encodeURIComponent(ctx.weather || 'clear')}&count=${ctx.count}`
      + `&lang=${LANG}`      // [i18n] 표시 언어로 손님 대사 생성(서버가 ko/en 화이트리스트)
      + `&phase=${encodeURIComponent(ctx.phase || 'settled')}`;   // 🪣 집 단계 버킷 — 손님이 지금 상황에 맞게 말 붙인다
    // cache: 'no-store' — 브라우저 캐시를 타지 않는다.
    //   서버가 성공 응답에 max-age=43200 을 붙이는데, 키 설정 전에 받은 빈 응답([])이
    //   그대로 12시간 박혀 계속 재사용되는 일이 실제로 있었다.
    //   엣지 캐시가 이미 "Gemini 호출은 하루 한 번"을 보장하므로 브라우저 캐시는 불필요.
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`cafe-guests ${res.status}`);
    const guests = normalize(await res.json(), ctx);
    if (guests.length) {
      console.log(`[cafe] 오늘의 손님 ${guests.length}명을 새로 받아왔어요`);
      // 📊 그날의 생성 콘텐츠 아카이브 — (날짜, 날씨, 인원)당 1행이라 먼저 온 사람만 실제로 기록되고
      //    나머지는 unique 제약에 걸려 무시된다. await 하지 않는다: 저장이 늦거나 실패해도
      //    카페 입장이 밀리면 안 되기 때문(함수 안에서 예외를 전부 삼킨다).
      sendCafeGuests({ date: ctx.date, weather: ctx.weather || 'clear', count: guests.length, guests });
    }
    return guests;                            // 빈 배열이면 game.js 가 기본 손님 유지
  });
}
