#!/usr/bin/env node
// =============================================================
//  💬 NPC 대화 풀 시딩 — 수동 실행
//  ------------------------------------------------------------
//  생성 로직은 functions/api/_npc-gen.js 한 곳에만 있다. 이 스크립트는
//  "얼마나·어디에" 만 정하고 실제 생성·검증은 전부 그 모듈에 맡긴다
//  (주 1회 크론도 같은 모듈을 쓴다 — 중복 구현 금지).
//
//  쓰기는 service_role 이라 RLS 를 우회한다. ⚠️ 넣는 내용이 곧 게임 화면이다.
//
//  사용법:
//    node --env-file=.env tools/seed-npc-dialogues.mjs --dry-run
//    node --env-file=.env tools/seed-npc-dialogues.mjs --sets 30 --openers
//
//  옵션:
//    --sets N      조합(npc×lang)당 목표 세트 수          기본 30
//    --openers     날씨 첫인사도 생성(조합×날씨당 3줄)     기본 끔
//    --npc <id>    특정 주민만
//    --lang ko|en  특정 언어만
//    --batch N     Gemini 호출 1회가 만드는 세트 수        기본 5
//    --delay MS    호출 사이 간격(레이트리밋)              기본 1500
//    --dry-run     DB 를 건드리지 않고 샘플만 출력 (테이블·service key 없어도 됨)
//
//  ⚠️ --dry-run 이 아니면 .env 에 SUPABASE_SERVICE_KEY 가 있어야 한다.
//     worker 시크릿은 로컬에서 못 읽는다 — .env 에 같은 값을 한 줄 넣을 것.
// =============================================================
import {
  NPC_IDS, NPC_SHEET, LANGS, WEATHERS, POOL_CAP,
  planGeneration, generateDialogues, generateOpeners,
} from '../functions/api/_npc-gen.js';

// ── 인자 ─────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};

const DRY = flag('dry-run');
const WANT_OPENERS = flag('openers');
const TARGET = Math.min(Number(opt('sets', 30)) || 30, POOL_CAP);
const BATCH = Math.max(1, Math.min(Number(opt('batch', 5)) || 5, 10));
const DELAY = Math.max(0, Number(opt('delay', 1500)) || 0);
const ONLY_NPC = opt('npc', null);
const ONLY_LANG = opt('lang', null);

if (ONLY_NPC && !NPC_SHEET[ONLY_NPC]) {
  console.error(`✘ 모르는 주민: ${ONLY_NPC}\n   가능한 값: ${NPC_IDS.join(', ')}`);
  process.exit(1);
}
if (ONLY_LANG && !LANGS.includes(ONLY_LANG)) {
  console.error(`✘ 모르는 언어: ${ONLY_LANG} (ko | en)`);
  process.exit(1);
}

const env = process.env;
const need = DRY ? ['GEMINI_API_KEY'] : ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
const missing = need.filter(k => !env[k]);
if (missing.length) {
  console.error(`✘ .env 에 없는 값: ${missing.join(', ')}`);
  console.error(`   node --env-file=.env 로 실행했는지 확인하세요.`);
  process.exit(1);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const keep = (npc, lang) => (!ONLY_NPC || npc === ONLY_NPC) && (!ONLY_LANG || lang === ONLY_LANG);

// ── Supabase REST (service_role) ─────────────────────────────
async function sb(path, { method = 'POST', body, prefer } = {}) {
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
  if (!res.ok) throw new Error(`supabase ${res.status} ${path}: ${(await res.text()).slice(0, 300)}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const poolCounts = () => sb('rpc/npc_pool_counts', { body: {} });
const insertRows = (table, rows) => sb(table, { body: rows, prefer: 'return=minimal' });

// ── 본문 대사 ────────────────────────────────────────────────
async function seedDialogues(stats) {
  const counts = DRY ? [] : await poolCounts();
  // per 를 TARGET 으로 줘서 "목표치까지의 부족분"을 한 번에 받는다
  const plan = planGeneration(counts, { cap: TARGET, per: TARGET })
    .filter(p => keep(p.npc_id, p.lang))
    .map(p => DRY ? { ...p, want: Math.min(p.want, BATCH) } : p);   // dry-run 은 맛보기만

  if (!plan.length) { console.log('· 대사 풀이 이미 목표치를 채웠습니다 — 건너뜁니다.'); return; }

  const total = plan.reduce((a, p) => a + p.want, 0);
  console.log(`\n💬 대사 ${total}세트 (조합 ${plan.length}개, 목표 ${TARGET}세트/조합)`);

  for (const { npc_id, lang, want } of plan) {
    let done = 0;
    while (done < want) {
      const n = Math.min(BATCH, want - done);
      stats.requested += 1;
      let got = 0, dropped = 0;
      try {
        const { sets, rejected } = await generateDialogues(env, npc_id, lang, n);
        got = sets.length; dropped = rejected;
        stats.dropped += rejected;
        if (sets.length) {
          if (DRY) { if (!stats.sample) stats.sample = { npc_id, lang, set: sets[0] }; }
          else await insertRows('npc_dialogues', sets.map(s => ({ npc_id, lang, turns: s.turns })));
          stats.inserted += sets.length;
        }
        console.log(`  ✓ ${`${NPC_SHEET[npc_id].name}/${lang}`.padEnd(22)} +${String(got).padStart(2)}세트` +
                    (dropped ? `  (${dropped}개 폐기)` : ''));
      } catch (e) {
        stats.failed += 1;
        stats.firstError ||= `${npc_id}/${lang}: ${e.message}`;
        console.error(`  ✘ ${npc_id}/${lang}: ${e.message}`);
      }
      done += n;   // 성공이든 실패든 전진한다 — 한 조합에 발목 잡히지 않게
      if (DELAY) await sleep(DELAY);
    }
  }
}

// ── 날씨 첫인사 ──────────────────────────────────────────────
//  날짜가 안 들어가므로 1회 생성하고 영구 재사용한다.
//  이미 있으면 건너뛴다 — 두 번 돌려도 중복이 쌓이지 않게.
async function seedOpeners(stats) {
  const have = new Set();
  if (!DRY) {
    const rows = await sb('npc_openers?select=npc_id,lang,weather', { method: 'GET' });
    for (const r of rows || []) have.add(`${r.npc_id}/${r.lang}/${r.weather}`);
  }

  let combos = [];
  for (const npc_id of NPC_IDS)
    for (const lang of LANGS)
      for (const weather of WEATHERS)
        if (keep(npc_id, lang) && !have.has(`${npc_id}/${lang}/${weather}`))
          combos.push({ npc_id, lang, weather });

  if (DRY) combos = combos.slice(0, 1);   // dry-run 은 맛보기 1건만

  if (!combos.length) { console.log('· 첫인사가 이미 다 있습니다 — 건너뜁니다.'); return; }
  console.log(`\n🌤️  첫인사 ${combos.length}조합 × 3줄`);

  for (const { npc_id, lang, weather } of combos) {
    stats.requested += 1;
    try {
      const { lines, rejected } = await generateOpeners(env, npc_id, lang, weather, 3);
      stats.dropped += rejected;
      if (lines.length) {
        if (DRY) { if (!stats.openerSample) stats.openerSample = { npc_id, lang, weather, lines }; }
        else await insertRows('npc_openers', lines.map(line => ({ npc_id, lang, weather, line })));
        stats.inserted += lines.length;
      }
      console.log(`  ✓ ${NPC_SHEET[npc_id].name}/${lang}/${weather} +${lines.length}줄`);
    } catch (e) {
      stats.failed += 1;
      stats.firstError ||= `${npc_id}/${lang}/${weather}: ${e.message}`;
      console.error(`  ✘ ${npc_id}/${lang}/${weather}: ${e.message}`);
    }
    if (DELAY) await sleep(DELAY);
  }
}

// ── 실행 ─────────────────────────────────────────────────────
const t0 = Date.now();
const stats = { requested: 0, inserted: 0, failed: 0, dropped: 0,
                firstError: null, sample: null, openerSample: null };

console.log(DRY ? '🧪 dry-run — DB 를 건드리지 않습니다' : `📝 ${env.SUPABASE_URL}`);

try {
  await seedDialogues(stats);
  if (WANT_OPENERS) await seedOpeners(stats);
} catch (e) {
  stats.failed += 1;
  stats.firstError ||= e.message;
  console.error(`\n✘ 중단: ${e.message}`);
}

const ms = Date.now() - t0;
console.log(`\n── 결과 ──────────────────────────`);
console.log(`호출 ${stats.requested} · 적재 ${stats.inserted} · 실패 ${stats.failed} · 폐기 ${stats.dropped} · ${(ms / 1000).toFixed(1)}초`);

// dry-run 샘플 — 말투가 제대로 나왔는지 눈으로 본다
if (DRY && stats.sample) {
  const { npc_id, lang, set } = stats.sample;
  console.log(`\n── 샘플 대화 (${NPC_SHEET[npc_id].name} / ${lang}) ──`);
  set.turns.forEach((t, i) => {
    console.log(`\n[${i + 1}턴]`);
    t.choices.forEach((c, j) => console.log(`   ${j + 1}) 나: ${c}`));
    t.replies.forEach((r, j) => console.log(`      ↳ ${j + 1}: ${r}`));
  });
}
if (DRY && stats.openerSample) {
  const o = stats.openerSample;
  console.log(`\n── 샘플 첫인사 (${NPC_SHEET[o.npc_id].name} / ${o.lang} / ${o.weather}) ──`);
  o.lines.forEach(l => console.log(`   "${l}"`));
}

// 실행 기록 — ⚠️ 성공도 남긴다. 실패만 남기면 "아예 안 돌았다"를 못 잡는다.
if (!DRY) {
  try {
    await insertRows('npc_gen_runs', [{
      source: 'seed',
      requested: stats.requested,
      inserted: stats.inserted,
      failed: stats.failed,
      error: stats.firstError ? String(stats.firstError).slice(0, 400) : null,
      duration_ms: ms,
    }]);
  } catch (e) {
    console.error(`⚠️ 실행 기록 적재 실패(본 작업은 끝남): ${e.message}`);
  }
}

process.exit(stats.failed ? 1 : 0);
