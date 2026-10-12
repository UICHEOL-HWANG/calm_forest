// =============================================================
//  calm forest · 🔔 푸시 cron — KST 20:10~22:50, 20분 간격 tick
//  ------------------------------------------------------------
//  wrangler.jsonc 의 "0,10,20,30,40,50 11-13 * * *" 를 ai-pregen 과 함께 쓴다(cron 슬롯 5/5).
//  worker/index.js 가 분(10·30·50)으로 갈라 이 함수를 부른다 — 별도 실행이라 subrequest 예산이 따로다.
//
//  ▶ 흐름: 후보(push_candidates RPC) → 유저별 판정(pick-kind) → 발송(≤PUSH_BUDGET)
//          → 원장(push_logs) 일괄 insert → 판정 표시·죽은 토큰 삭제(push_mark) 한 번.
//  ▶ subrequest 예산(무료 50): 후보 1 + 토큰 교환 ≤1 + 발송 ≤40 + 원장 1 + 표시 1 = 44.
//    예산이 차면 남은 사람은 표시하지 않고 다음 tick(20분 뒤)이 이어 보낸다.
//  ▶ 하루 한 번: 판정한 토큰은 보냈든 안 보냈든 last_checked_on=오늘. 일시 장애(5xx)만 재시도.
//  (테스트: node --test tests/push-cron.test.mjs)
// =============================================================
import { storeHeaders, storeReady } from './api/_ai-store.js';
import { judgeNight } from './api/_night-judge.js';
import { getAccessToken, readServiceAccount, sendFcm } from './push/fcm.js';
import { kstDates, nightInput, pickPush, messageFor } from './push/pick-kind.js';

export const PUSH_BUDGET = 40;

/** 같은 cron 표현식 안에서 분이 10·30·50 이면 푸시, 0·20·40 이면 ai-pregen(worker/index.js) */
export function isPushTick(scheduledTime) {
  return new Date(scheduledTime).getUTCMinutes() % 20 === 10;
}
const CANDIDATE_LIMIT = 100;   // 무료 플랜 CPU 한도 — 행마다 HMAC 판정·JSON 파싱. 모자라면 다음 tick 이 잇는다

async function judgeFor(env, row, dates) {
  if (!env.NIGHT_SEED_SECRET) return null;
  const input = nightInput(row, dates.tomorrow, dates);   // 오늘 접속한 사람의 다음 판정은 내일 날짜
  if (!input) return null;
  return judgeNight({ secret: env.NIGHT_SEED_SECRET, uid: row.user_id, date: dates.tomorrow, ...input });
}

export async function runPush(env, { now = Date.now(), fetch: fetchFn = fetch } = {}) {
  const sa = readServiceAccount(env);
  if (!storeReady(env) || !sa) return { skipped: 'not-configured' };
  const dates = kstDates(now);
  const rest = path => `${env.SUPABASE_URL}/rest/v1/${path}`;

  let rows;
  try {
    const res = await fetchFn(rest('rpc/push_candidates'), {
      method: 'POST', headers: storeHeaders(env),
      body: JSON.stringify({ p_today: dates.today, p_limit: CANDIDATE_LIMIT }),
    });
    if (!res.ok) return { error: `candidates ${res.status}` };
    rows = await res.json();
  } catch (e) { return { error: `candidates ${e?.message}` }; }
  if (!Array.isArray(rows) || !rows.length) return { candidates: 0, sent: 0, checked: 0 };

  let accessToken = null, stop = null;
  const checked = [], dead = [], logs = [];
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      const pick = pickPush(row, dates, await judgeFor(env, row, dates));
      if (!pick) { checked.push(row.token); continue; }
      if (sent + failed + dead.length >= PUSH_BUDGET) break;   // 남은 사람은 다음 tick
      accessToken ??= await getAccessToken(env, { fetch: fetchFn, now });
      if (!accessToken) { stop = 'fcm-auth'; break; }          // 이 사람부터는 표시 안 함 → 다음 tick 재시도

      const id = crypto.randomUUID();
      const { title, body } = messageFor(pick, row.lang);
      const r = await sendFcm({ projectId: sa.project_id, accessToken, token: row.token, title, body,
        data: { kind: pick.kind, send_id: id } }, { fetch: fetchFn });
      // 401·403 = 서비스 계정·프로젝트 설정 문제 — 모두에게 똑같이 실패하므로 여기서 멈춘다(표시 안 함)
      if (r.status === 401 || r.status === 403) { stop = 'fcm-auth'; break; }
      logs.push({ id, user_id: row.user_id, kind: pick.kind, status: r.ok ? 'sent' : r.dead ? 'dead' : 'failed',
        http: r.status, sent_on: dates.today });
      if (r.ok) { sent++; checked.push(row.token); }
      else if (r.dead) { dead.push(row.token); checked.push(row.token); }
      else if (r.status >= 400 && r.status < 500) { failed++; checked.push(row.token); }   // 영구 실패(400 등) — 재시도 안 함
      else { failed++; }                                                                 // 5xx·네트워크 — 다음 tick 재시도
    } catch (e) {
      // 세이브가 이상한 한 사람 때문에 전체가 멈추면 앞서 보낸 사람이 표시 안 돼 매 tick 다시 받는다
      console.warn('[push] row failed', e?.message);
      checked.push(row.token);
    }
  }

  try {
    if (logs.length) {
      await fetchFn(rest('push_logs'), { method: 'POST', headers: storeHeaders(env, 'return=minimal'), body: JSON.stringify(logs) });
    }
    const m = await fetchFn(rest('rpc/push_mark'), { method: 'POST', headers: storeHeaders(env),
      body: JSON.stringify({ p_today: dates.today, p_checked: checked, p_dead: dead }) });
    if (!m.ok) throw new Error(`push_mark ${m.status}`);
  } catch (e) {
    // 표시가 실패하면 다음 tick 에 같은 사람을 다시 판정한다 → 하루 2통 위험. 로그로 남겨 바로 보이게.
    console.warn('[push] mark failed', e?.message);
    return { candidates: rows.length, sent, failed, dead: dead.length, checked: checked.length, error: 'mark' };
  }
  return { candidates: rows.length, sent, failed, dead: dead.length, checked: checked.length, ...(stop ? { error: stop } : {}) };
}
