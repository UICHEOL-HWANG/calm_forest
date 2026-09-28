// =============================================================
//  💬 NPC 대사 풀 보충 — 주 1회 Cron
//  ------------------------------------------------------------
//  ▶ 생성 로직은 api/_npc-gen.js 한 곳에만 있다(시딩 스크립트와 공유).
//     여기서는 "이번 주에 어느 조합을 얼마나 채울지"만 정한다.
//  ▶ ⚠️ 서브리퀘스트 예산. Workers 무료 플랜은 요청당 50개다.
//     조합 하나당 Gemini 1 + insert 1 = 2개를 쓰므로, 카운트 조회 2(본문·첫인사)·
//     실행 기록·메일까지 더해 MAX_COMBOS 를 15로 묶는다(15×2 + 4 = 34). 22조합을
//     한 번에 돌리면 46~50 에 닿아 조용히 잘린다.
//     남은 조합은 다음 주 차례가 된다 — 세트가 적은 조합부터 채우므로 균등해진다.
//  ▶ 첫인사(npc_openers)도 여기서 보충한다. 빈 조합이 본문보다 먼저 예산을 받는다
//     (planCronWork). 예전엔 시딩 뒤 주민이 늘면 첫인사가 영원히 비어 있었다.
//  ▶ ⚠️ 실패해도 재시도하지 않는다. 풀에 대사가 이미 있어 게임은 멀쩡하고,
//     다음 주에 다시 온다. 재시도 루프는 쿼터만 태운다.
//  ▶ ⚠️ 성공도 npc_gen_runs 에 남긴다. 실패만 남기면 "크론이 아예 안 떴다"를
//     못 잡는다(트리거 미등록·배포 누락은 실패 로그조차 안 남긴다).
// =============================================================
import {
  POOL_CAP,
  planCronWork, generateDialogues, generateOpeners,
} from './api/_npc-gen.js';
// 📧 메일은 notify.js 가 맡는다 — 한글 제목 base64 인코딩·발신 주소·실패 처리가
//    거기 다 들어 있다. 여기서 EmailMessage 를 직접 쓰면 제목이 깨진다.
import { notify } from './notify.js';

const MAX_COMBOS = 15;   // 서브리퀘스트 예산(위 주석) — 늘리려면 한도부터 확인할 것

async function sb(env, path, { method = 'POST', body, prefer } = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`supabase ${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function runNpcGenCron(env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) return { skipped: 'supabase 설정 없음' };
  if (!env.GEMINI_API_KEY) return { skipped: 'GEMINI_API_KEY 없음' };

  const t0 = Date.now();
  let counts, openerRows;
  try {
    counts = await sb(env, 'rpc/npc_pool_counts', { body: {} });
    // 한 줄 = 한 행이라 행 수가 곧 줄 수다(주민 11 × 8조합 × 3줄 = 264행 — PostgREST 1000행 상한 안)
    openerRows = await sb(env, 'npc_openers?select=npc_id,lang,weather', { method: 'GET' });
  } catch (e) {
    await notify(env, '🔴 npc-gen 크론 실패', `풀 카운트 조회 실패: ${e.message}`);
    return { failed: true, error: e.message };
  }

  const { openers, dialogues: plan } = planCronWork({ dialogueCounts: counts, openerRows, max: MAX_COMBOS });

  if (!plan.length && !openers.length) {
    // 풀이 다 찼다 = 성공적으로 할 일이 없는 상태. 기록은 남긴다.
    const row = { source: 'cron', requested: 0, inserted: 0, failed: 0,
                  error: null, duration_ms: Date.now() - t0 };
    await sb(env, 'npc_gen_runs', { body: [row], prefer: 'return=minimal' }).catch(() => {});
    return { skipped: `풀이 상한(${POOL_CAP})까지 찼음` };
  }

  let inserted = 0, failed = 0, dropped = 0, firstError = null, openerLines = 0;

  for (const { npc_id, lang, weather, want } of openers) {
    try {
      const { lines, rejected } = await generateOpeners(env, npc_id, lang, weather, want);
      dropped += rejected;
      if (lines.length) {
        await sb(env, 'npc_openers', {
          body: lines.map(line => ({ npc_id, lang, weather, line })),
          prefer: 'return=minimal',
        });
        openerLines += lines.length;
      }
    } catch (e) {
      failed += 1;
      firstError ||= `${npc_id}/${lang}/${weather}: ${e.message}`;
      console.error(JSON.stringify({ message: 'npc-gen opener failed', npc_id, lang, weather, error: e.message }));
    }
  }

  for (const { npc_id, lang, want } of plan) {
    try {
      const { sets, rejected } = await generateDialogues(env, npc_id, lang, want);
      dropped += rejected;
      if (sets.length) {
        await sb(env, 'npc_dialogues', {
          body: sets.map(s => ({ npc_id, lang, turns: s.turns })),
          prefer: 'return=minimal',
        });
        inserted += sets.length;
      }
    } catch (e) {
      failed += 1;
      firstError ||= `${npc_id}/${lang}: ${e.message}`;
      console.error(JSON.stringify({ message: 'npc-gen combo failed', npc_id, lang, error: e.message }));
    }
  }

  const duration_ms = Date.now() - t0;
  // requested = 조합 수, inserted = 적재 행 수(본문 세트 + 첫인사 줄). source 는 check 제약상 'cron' 하나뿐
  const requested = plan.length + openers.length;
  const row = { source: 'cron', requested, inserted: inserted + openerLines, failed,
                error: firstError ? String(firstError).slice(0, 400) : null, duration_ms };
  // 기록 적재가 실패해도 본 작업은 끝난 것으로 본다 — 여기서 throw 하면 성공분이 묻힌다
  await sb(env, 'npc_gen_runs', { body: [row], prefer: 'return=minimal' }).catch(e =>
    console.error(JSON.stringify({ message: 'npc-gen log failed', error: e.message })));

  if (failed) {
    await notify(env, `🔴 npc-gen 실패 ${failed}/${requested}`,
      `적재 ${inserted}세트 · 첫인사 ${openerLines}줄 · 폐기 ${dropped}\n첫 오류: ${firstError}`);
  } else if (openers.length) {
    // 첫인사 빈칸은 평소엔 없다 — 생겼다는 것 자체가 알릴 일(주민 추가·행 삭제)
    await notify(env, `🟡 npc-gen 첫인사 보충 ${openers.length}조합`,
      `첫인사 ${openerLines}줄 · 본문 ${inserted}세트 · 폐기 ${dropped}`);
  }

  return { requested, inserted, openerLines, failed, dropped, duration_ms };
}
