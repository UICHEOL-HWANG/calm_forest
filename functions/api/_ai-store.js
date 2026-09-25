// =============================================================
//  calm forest · 🗄️ 미리 만든 AI 콘텐츠 저장소 (ai_daily_content)
//  ------------------------------------------------------------
//  ▶ 쓰는 곳: functions/ai-pregen-cron.js(크론이 채움) · daily-quests.js / cafe-guests.js(읽기 + 폴백 적재)
//  ▶ ⚠️ service_role 로만 읽고 쓴다. 게임 화면에 그대로 뜨는 문장이라 anon 쓰기가 열리면
//     누구나 아무 문장이나 띄울 수 있다(npc_dialogues 와 같은 규칙, sql/migrations/migrate_ai_daily_content.sql).
//  ▶ 저장소가 죽어도 게임은 안 멈춘다 — 읽기 실패는 빈 배열로 보고 즉석 생성 폴백으로 넘어간다.
// =============================================================

export const STORE_TABLE = 'ai_daily_content';
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

// 기기 버킷 → 변형 하나. 변형이 몇 벌 있든 버킷이 같으면 하루 종일 같은 걸 받는다.
export function pickVariant(rows, bucket) {
  if (!rows.length) return null;
  const b = Number.isInteger(bucket) && bucket >= 0 ? bucket : 0;
  return rows[b % rows.length].payload;
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
