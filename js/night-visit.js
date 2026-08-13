// =============================================================
//  calm forest · 🦝 밤손님 (클라이언트 어댑터)
//  ------------------------------------------------------------
//  game.js 의 setNightVisitSource() / setNightNoteSource() 확장 지점에
//  "서버 프록시 호출"을 끼웁니다. cafe-guests.js 와 같은 문법.
//
//  ▶ 판정은 서버(/api/night-visit)가 HMAC 시드 결정적 난수로 계산합니다.
//    클라이언트는 심은 작물 목록·방어 배치 여부만 보내고 결과를 적용할 뿐,
//    주사위를 굴리지 않습니다(새로고침 리롤 방지).
//  ▶ 실패·지연·미설정 시엔 "밤손님이 안 온 밤"일 뿐 — 게임은 그대로 진행.
// =============================================================

import { CONFIG } from './config.js?v=30';
import { setNightVisitSource, setNightNoteSource } from './game.js?v=30';
import { state as auth } from './supabase-client.js?v=30';

const TIMEOUT_MS = 6000;   // 이 안에 안 오면 포기(다음 접속에 재판정 — 결정적이라 결과는 같다)

// 서버 응답을 그대로 믿지 않고 형태를 좁혀서 통과시킨다(방어적 정규화)
function normalizeVerdict(v) {
  if (!v || typeof v !== 'object') return null;
  return {
    visited: v.visited === true,
    defended: v.defended === true,
    animal: v.animal === 'boar' ? 'boar' : 'raccoon',
    loot: v.loot === 'acorn_drop' ? 'acorn_drop' : 'fur_tuft',
    stolenIdx: Array.isArray(v.stolenIdx)
      ? [...new Set(v.stolenIdx.map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n >= 0))].slice(0, 3)
      : [],
  };
}

// 게임 시작 시 1회 호출 — 엔드포인트가 설정돼 있을 때만 등록
export function initNightVisit() {
  if (CONFIG.NIGHT_VISIT_API) {
    setNightVisitSource(async (ctx) => {
      // uid: 로그인 유저는 계정 id(기기 바뀌어도 동일 판정), 게스트는 기기 id
      const uid = auth.userId || auth.clientId;
      const res = await fetch(CONFIG.NIGHT_VISIT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        body: JSON.stringify({ uid, date: ctx.date, nights: ctx.nights, plots: ctx.plots, defense: ctx.defense }),
      });
      if (!res.ok) throw new Error(`night-visit ${res.status}`);
      return normalizeVerdict(await res.json());
    });
  }

  if (CONFIG.NIGHT_NOTE_API) {
    setNightNoteSource(async ({ date, animal, crop }) => {
      const url = `${CONFIG.NIGHT_NOTE_API}?date=${encodeURIComponent(date)}`
        + `&animal=${encodeURIComponent(animal)}&crop=${encodeURIComponent(crop || '')}`;
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return null;
      const n = await res.json();
      if (!n || typeof n.text !== 'string' || !n.text.trim()) return null;
      return { author: String(n.author || '').slice(0, 24), text: n.text.trim().slice(0, 160) };
    });
  }
}
