// =============================================================
//  calm forest · 🗄️ 미리 만든 AI 콘텐츠 저장소 (ai_daily_content)
//  ------------------------------------------------------------
//  ▶ 쓰는 곳: functions/ai-pregen-cron.js(크론이 채움) · daily-quests.js / cafe-guests.js(읽기 + 폴백 적재)
//  ▶ ⚠️ service_role 로만 읽고 쓴다. 게임 화면에 그대로 뜨는 문장이라 anon 쓰기가 열리면
//     누구나 아무 문장이나 띄울 수 있다(npc_dialogues 와 같은 규칙, sql/migrations/migrate_ai_daily_content.sql).
//  ▶ 저장소가 죽어도 게임은 안 멈춘다 — 읽기 실패는 빈 배열로 보고 즉석 생성 폴백으로 넘어간다.
// =============================================================

import { LANGS, PHASE_IDS, CAFE_SLOTS, VARIANT_BUCKETS } from './_game-day.js';

export const STORE_TABLE = 'ai_daily_content';

// ── 💰 변형 정책 — 크론(채우기)과 API(고르기)가 같은 값을 봐야 해서 여기 둔다.
//   ⚠️ ai-pregen-cron.js 에 두면 API 가 크론을 import 하게 되고, 크론은 API 를 import 하므로 순환이 된다.
export const CRON_SHARE = 0.5;                  // 하루 한도 중 크론 몫 — 나머지는 라이브·수동 작업
export const DEFAULT_RPD = 500;                 // gemini-3.5-flash-lite 무료 등급(AI Studio 대시보드, 2026-09-25)
export const MAX_VARIANTS = VARIANT_BUCKETS;    // 클라이언트 버킷 수보다 많이 만들어 봐야 아무도 못 받는다
const COMBOS_PER_DAY = LANGS.length * PHASE_IDS.length * (1 + CAFE_SLOTS.length);   // 6 + 18 = 24
const FAIL_MARGIN = 1.2;                        // 거절·실패로 다시 부를 여유

export const rpdOf = (env) => Number.parseInt(env?.GEMINI_RPD, 10) || DEFAULT_RPD;
export const cronBudget = (rpd) => Math.floor(rpd * CRON_SHARE);

// 크론 몫 안에서 하루에 채울 수 있는 변형 수(최소 1, 최대 버킷 수)
export function variantsFor(rpd) {
  return Math.max(1, Math.min(MAX_VARIANTS, Math.floor(cronBudget(rpd) / COMBOS_PER_DAY / FAIL_MARGIN)));
}

const READ_TIMEOUT_MS = 3000;   // 저장소가 느리면 기다리지 않고 폴백 — 입장 흐름을 막지 않는다

export function storeHeaders(env, prefer) {
  return {
    apikey: env.SUPABASE_SERVICE_KEY,
    authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export function storeReady(env) {
  return Boolean(env?.SUPABASE_URL && env?.SUPABASE_SERVICE_KEY);
}

// 한 조합의 변형 전부(변형 번호순) — 없거나 실패하면 []
export async function readVariants(env, { kind, date, lang, phase, slot }, { fetch = globalThis.fetch } = {}) {
  if (!storeReady(env)) return [];
  const q = new URLSearchParams({
    select: 'variant,payload',
    kind: `eq.${kind}`, date: `eq.${date}`, lang: `eq.${lang}`, phase: `eq.${phase}`, slot: `eq.${slot}`,
    order: 'variant.asc',
  });
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${STORE_TABLE}?${q}`, {
      headers: storeHeaders(env), signal: AbortSignal.timeout(READ_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows.filter(r => Array.isArray(r?.payload) && r.payload.length) : [];
  } catch (e) {
    console.error(JSON.stringify({ message: 'ai-store read failed', kind, date, lang, phase, slot, error: e.message }));
    return [];
  }
}

// 기기 버킷 → 변형 하나. **배열 위치가 아니라 variant 번호로** 고른다.
//   위치로 고르면(rows[bucket % rows.length]) 크론이 변형을 더 채울 때마다 같은 기기가 받는 변형이 바뀐다
//   (코드 리뷰 2026-09-25). 번호로 고르면 바뀌는 건 "내 변형이 처음 생길 때" 한 번뿐이고,
//   국내 이용자는 그날이 시작되기 전(전날 밤)에 채워지므로 하루 종일 같다.
//   variants = 그날 채우기로 한 변형 수(variantsFor) — 버킷을 여기로 접어 변형 0 에 몰리지 않게 한다.
export function pickVariant(rows, bucket, variants = MAX_VARIANTS) {
  if (!rows.length) return null;
  const b = Number.isInteger(bucket) && bucket >= 0 ? bucket : 0;
  const target = b % Math.max(1, variants);
  const row = rows.find(r => r.variant === target) || rows.find(r => r.variant === 0) || rows[0];
  return row.payload;
}

// 행 일괄 저장 — 이미 있는 (조합, 변형)은 건드리지 않는다(ignore-duplicates).
//   크론과 API 폴백이 같은 칸을 동시에 채워도 먼저 들어간 쪽이 남는다.
export async function insertRows(env, rows, { fetch = globalThis.fetch } = {}) {
  if (!storeReady(env) || !rows.length) return;
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${STORE_TABLE}?on_conflict=kind,date,lang,phase,slot,variant`, {
    method: 'POST',
    headers: storeHeaders(env, 'resolution=ignore-duplicates,return=minimal'),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`supabase ${res.status} insert: ${(await res.text()).slice(0, 200)}`);
}
