// =============================================================
//  🦉☕ AI 콘텐츠 사전 생성 — 매일 밤 Cron (KST 20:00~22:40, 20분 간격)
//  ------------------------------------------------------------
//  ▶ 왜: 즉석 생성은 날짜가 바뀌는 순간 여러 API 가 한꺼번에 Gemini 를 불러
//     무료 분당 15회(프로젝트·모델 공유)에 걸렸다(2026-09-25 429 실측). 크론이 천천히
//     만들어 ai_daily_content 에 두고, daily-quests / cafe-guests 는 읽기만 한다.
//  ▶ 💰 예산 — 무료 하루 한도(GEMINI_RPD, 2026-09-25 대시보드 500)의 **절반만** 크론이 쓴다.
//     나머지 절반은 즉석 호출(밤 쪽지·도감 메모·폴백)과 수동 작업 몫 → 다음 날 한도 부족을 막는다.
//     한도는 태평양 자정(KST 16~17시)에 초기화되므로 그 뒤(KST 20시~)에 돌린다.
//     사용량은 ai_pregen_runs.gemini_calls 를 마지막 태평양 자정 이후로 합산해 센다.
//  ▶ ⚠️ 시간대 — Cloudflare 크론 표현식은 UTC 다. wrangler.jsonc 의 "11-13시" = KST 20~22시.
//     "오늘/내일"은 kstDate()(UTC+9)로 정한다. UTC 날짜를 쓰면 KST 00~09시에 하루가 밀린다.
//  ▶ ⚠️ 분당 — 6.5초 간격(≈9회/분). 15 중 6 은 라이브 몫. 429 를 받으면 즉시 멈춘다(쿼터를 더 태우지 않음).
//  ▶ ⚠️ 서브리퀘스트 예산 — Workers 무료 플랜은 실행당 50개.
//     사용량 조회 1 + 기존 행 조회 1 + Gemini ≤MAX_CALLS + 일괄 저장 1 + 정리 1 + 실행 기록 1 + 메일 1.
//     MAX_CALLS 38 이면 44. 모자란 건 20분 뒤 다음 실행이 이어 채운다.
//  ▶ 채우는 순서 — 오늘 빠진 조합(변형 0) → 내일 전 조합 변형 0 → 내일 변형 1 … 중간에 끊겨도
//     모든 조합은 최소 한 벌이 있다. 오늘은 반쯤 지난 날이라 변형을 더 만들지 않는다.
//  ▶ ⚠️ 성공도 기록한다 — 실패만 남기면 "크론이 아예 안 떴다"를 못 잡는다(npc-gen 과 같은 규칙).
// =============================================================
import { generateQuests, NEED } from './api/daily-quests.js';
import { generateCafe, PREGEN_COUNT } from './api/cafe-guests.js';
import {
  LANGS, PHASE_IDS, CAFE_SLOTS, VARIANT_BUCKETS,
  weatherForDate, kstDate, lastPacificMidnight,
} from './api/_game-day.js';
import { insertRows, storeHeaders, storeReady, STORE_TABLE } from './api/_ai-store.js';
// 📧 notify.js 는 Workers 전용 모듈(cloudflare:email)을 import 해 Node 테스트에서 못 읽는다 →
//    필요할 때만 불러오고, 테스트는 notify 를 주입한다.
const defaultNotify = async (...args) => (await import('./notify.js')).notify(...args);

export const MAX_CALLS = 38;          // 실행당 Gemini 상한(서브리퀘스트 예산, 위 주석)
export const PACE_MS = 6500;          // 호출 간격 — 분당 약 9회
export const CRON_SHARE = 0.5;        // 하루 한도 중 크론 몫
export const MAX_VARIANTS = VARIANT_BUCKETS;   // 클라이언트 버킷 수보다 많이 만들어 봐야 아무도 못 받는다
export const KEEP_DAYS = 30;          // 지난 콘텐츠 보관 기간
const DEFAULT_RPD = 500;              // gemini-3.5-flash-lite 무료 등급(AI Studio 대시보드, 2026-09-25)
const COMBOS_PER_DAY = LANGS.length * PHASE_IDS.length * (1 + CAFE_SLOTS.length);   // 6 + 18 = 24
const FAIL_MARGIN = 1.2;              // 거절·실패로 다시 부를 여유

export const cronBudget = (rpd) => Math.floor(rpd * CRON_SHARE);

// 크론 몫 안에서 하루에 채울 수 있는 변형 수(최소 1, 최대 버킷 수)
export function variantsFor(rpd) {
  return Math.max(1, Math.min(MAX_VARIANTS, Math.floor(cronBudget(rpd) / COMBOS_PER_DAY / FAIL_MARGIN)));
}

const keyOf = (r) => `${r.kind}|${r.date}|${r.lang}|${r.phase}|${r.slot}|${r.variant ?? 0}`;

function combosFor(date, variant) {
  const out = [];
  for (const lang of LANGS) {
    for (const phase of PHASE_IDS) {
      out.push({ kind: 'quests', date, lang, phase, slot: 'day', variant });
      for (const slot of CAFE_SLOTS) out.push({ kind: 'cafe', date, lang, phase, slot, variant });
    }
  }
  return out;
}

// 아직 없는 칸만, 채울 순서대로
export function planPregen(have, { today, tomorrow, variants }) {
  const exists = new Set((Array.isArray(have) ? have : []).map(keyOf));
  const order = [...combosFor(today, 0)];
  for (let v = 0; v < variants; v++) order.push(...combosFor(tomorrow, v));
  return order.filter(c => !exists.has(keyOf(c)));
}

async function generateOne(env, c, fetch) {
  const weather = weatherForDate(c.date);
  if (c.kind === 'quests') {
    const q = await generateQuests(env, { date: c.date, weather, lang: c.lang, phase: c.phase, variant: c.variant }, { fetch });
    return { weather, payload: q.length === NEED ? q : null, got: q.length };
  }
  const g = await generateCafe(env, { date: c.date, weather, count: PREGEN_COUNT, lang: c.lang, phase: c.phase, slot: c.slot, variant: c.variant }, { fetch });
  return { weather, payload: g.length >= PREGEN_COUNT ? g.slice(0, PREGEN_COUNT) : null, got: g.length };
}

export async function runAiPregen(env, {
  fetch = globalThis.fetch,
  sleep = (ms) => new Promise(r => setTimeout(r, ms)),
  now = Date.now(),
  notify = defaultNotify,
} = {}) {
  if (!storeReady(env)) return { skipped: 'supabase 설정 없음' };
  if (!env.GEMINI_API_KEY) return { skipped: 'GEMINI_API_KEY 없음' };

  const t0 = Date.now();
  const rpd = Number.parseInt(env.GEMINI_RPD, 10) || DEFAULT_RPD;
  const budget = cronBudget(rpd);
  const variants = variantsFor(rpd);
  const today = kstDate(now), tomorrow = kstDate(now, 1);
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const get = async (path) => {
    const res = await fetch(`${base}/${path}`, { headers: storeHeaders(env) });
    if (!res.ok) throw new Error(`supabase ${res.status} ${path.split('?')[0]}: ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };

  let used, have;
  try {
    const since = new Date(lastPacificMidnight(now)).toISOString();
    used = (await get(`ai_pregen_runs?select=gemini_calls&created_at=gte.${encodeURIComponent(since)}`))
      .reduce((s, r) => s + (Number(r.gemini_calls) || 0), 0);
    have = await get(`${STORE_TABLE}?select=kind,date,lang,phase,slot,variant&date=in.(${today},${tomorrow})`);
  } catch (e) {
    await notify(env, '🔴 ai-pregen 크론 실패', `조회 실패: ${e.message}`);
    return { failed: true, error: e.message };
  }

  const plan = planPregen(have, { today, tomorrow, variants });
  const allowance = Math.max(0, Math.min(MAX_CALLS, budget - used));
  const rows = [];
  let calls = 0, failed = 0, rateLimited = false, firstError = null;

  for (const c of plan) {
    if (calls >= allowance) break;
    if (calls > 0) await sleep(PACE_MS);
    calls += 1;
    try {
      const { weather, payload, got } = await generateOne(env, c, fetch);
      if (!payload) throw new Error(`검증 후 ${got}개`);
      rows.push({ ...c, weather, payload, model: env.GEMINI_MODEL || 'gemini-flash-lite-latest' });
    } catch (e) {
      failed += 1;
      firstError ||= `${keyOf(c)}: ${e.message}`;
      if (/^gemini 429/.test(e.message)) { rateLimited = true; break; }   // 한도 → 남은 건 다음 실행 몫
    }
  }

  let storeError = null;
  try {
    await insertRows(env, rows, { fetch });
  } catch (e) {
    storeError = e.message;
  }
  // 오래된 콘텐츠 정리 — 실패해도 본 작업과 무관하다
  const cutoff = kstDate(now, -KEEP_DAYS);
  await fetch(`${base}/${STORE_TABLE}?date=lt.${cutoff}`, { method: 'DELETE', headers: storeHeaders(env, 'return=minimal') })
    .catch(e => console.error(JSON.stringify({ message: 'ai-pregen cleanup failed', error: e.message })));

  const inserted = storeError ? 0 : rows.length;
  const summary = {
    requested: plan.length, inserted, failed, gemini_calls: calls, rate_limited: rateLimited, variants,
    error: (storeError || firstError) ? String(storeError || firstError).slice(0, 400) : null,
    duration_ms: Date.now() - t0,
  };
  // 기록 적재가 실패해도 본 작업은 끝난 것으로 본다 — 여기서 throw 하면 성공분이 묻힌다
  await fetch(`${base}/ai_pregen_runs`, {
    method: 'POST', headers: storeHeaders(env, 'return=minimal'), body: JSON.stringify(summary),
  }).catch(e => console.error(JSON.stringify({ message: 'ai-pregen log failed', error: e.message })));

  if (storeError || rateLimited || (failed && !inserted)) {
    await notify(env, `🔴 ai-pregen ${rateLimited ? '한도 도달' : '실패'} ${failed}/${calls}`,
      `적재 ${inserted} · 남은 계획 ${plan.length - inserted}\n오류: ${summary.error}`);
  }

  return { ...summary, rateLimited, budgetLeft: Math.max(0, budget - used - calls) };
}
