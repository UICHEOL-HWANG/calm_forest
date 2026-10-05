#!/usr/bin/env node
// =============================================================
//  🧑‍🤝‍🧑 페르소나 플레이 러너 — Aside 가 페르소나 지령대로 calmforest.cloud 를 플레이
//  ------------------------------------------------------------
//  한 판: 계정 확인 → 세션 발급 → Aside 탭 localStorage 에 주입 → aside exec(지령) → 기록
//  데이터는 게임의 기존 계측(game_logs·session_logs·econ_logs·GA4)으로 쌓이고,
//  이 러너는 라벨(persona_id·user_id·시각·그만둔 이유)만 runs/YYYY-MM-DD.jsonl 에 남긴다.
//
//  사용법:
//    node --env-file=.env tools/persona-sim/run.mjs --persona p03-fisher-skilled
//    node --env-file=.env tools/persona-sim/run.mjs --persona all --rounds 30 --minutes 20 --slots 4
//    node --env-file=.env tools/persona-sim/run.mjs --persona all --dry-run   # 계정·Aside 안 건드림
//
//  ⚡ 병렬(--slots N): 슬롯마다 다른 오리진(simN.calmforest.cloud)을 맡는다.
//     같은 오리진이면 Aside 탭끼리 localStorage(로그인 토큰·cf_client_id·세이브)를 공유해 계정이 섞인다(실측 2026-10-04).
//     에이전트 탭은 백그라운드여도 visible 이라 렌더가 멈추지 않는다(같은 실측).
//  ⚠️ 매 판 그 오리진의 localStorage 를 비운다(Aside 브라우저에 로그인해 둔 본인 세션도 지워진다).
// =============================================================
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, appendFileSync, rmdirSync, statSync, utimesSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureUser, mintSession, personaEmail, storageKey } from './supabase-admin.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = join(HERE, 'runs');
const LOCK_DIR = join(process.env.HOME, 'Library/Application Support/calmforest/aside.lock');  // 카드뉴스 크론과 공유
const LOCK_STALE_MS = 30 * 60_000;    // cron-lib.sh 와 같은 기준 — 실행 중엔 주기적으로 touch 해 스테일 판정을 피한다
const DEFAULT_MODEL = 'claude-code/claude-sonnet-5-5';
const OPUS_MODEL = 'claude-code/claude-opus-5';
// 🧪 모델 보정(2026-10-04): Sonnet 판의 55% 가 2분 안에 그만뒀다(Opus 0%) — 사람의 이탈이 아니라 모델이 게임을 못 다룬 것.
//   ① Sonnet 엔 '최소 N분 시도' 를 지령에 넣는다 ② 정상 페르소나 판의 일부(OPUS_EVERY 판마다 1판)는 Opus 로 섞는다
//   ③ 그 전에 돈 Sonnet 2분 미만 판은 할당에 세지 않는다(그만큼 다시 돈다 — 기록은 지우지 않고 분석에서 거른다)
const SONNET_MIN_TRY_MIN = 5;
const OPUS_EVERY = 3;
const SHORT_SONNET_MS = 2 * 60_000;
const ACCOUNT_SUFFIXES = ['a', 'b', 'c', 'd', 'e'];   // 페르소나당 계정 5개 — 유저 단위 표본을 13명이 아니라 65명으로
const SLOT_STAGGER_MS = 20_000;       // 슬롯 시작을 엇갈린다 — 탭 열기·세션 주입이 한꺼번에 몰리지 않게
const BACKOFF_BASE_MS = 30_000;          // 실패 1번 30초 → 1분 → 2분 … 최대 15분
const BACKOFF_MAX_MS = 15 * 60_000;
const MAX_REQUEUE = 2000;                 // 영원히 안 풀리는 고장에 대비한 상한(판 수 × 여유)

// ── 인자 ─────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const DRY = argv.includes('--dry-run');
const MINUTES = Number(opt('minutes', 20));
const ROUNDS = Number(opt('rounds', 1));
const SLOTS = Math.max(1, Number(opt('slots', 1)));
const PICK = opt('persona', '');
// 슬롯 1개면 본 도메인 그대로(지금까지와 같음), 여러 개면 sim1~simN
const HOSTS = SLOTS === 1 ? ['calmforest.cloud'] : Array.from({ length: SLOTS }, (_, i) => `sim${i + 1}.calmforest.cloud`);

const ALL = JSON.parse(readFileSync(join(HERE, 'personas.json'), 'utf8'));
const personas = PICK === 'all' ? ALL : ALL.filter(p => PICK.split(',').includes(p.id));
if (!personas.length) {
  console.error(`--persona <id[,id]|all> 필요. 목록: ${ALL.map(p => p.id).join(' ')}`);
  process.exit(1);
}

// ── aside ────────────────────────────────────────────────────
function findAside() {
  if (process.env.ASIDE_BIN) return process.env.ASIDE_BIN;
  for (const p of [`${process.env.HOME}/.local/bin/aside`, '/usr/local/bin/aside', '/opt/homebrew/bin/aside']) {
    if (existsSync(p)) return p;
  }
  throw new Error('aside 실행 파일을 못 찾았다 — ASIDE_BIN 으로 지정할 것');
}

function sh(bin, args, timeoutMs) {
  return new Promise(res => {
    execFile(bin, args, { maxBuffer: 32 * 1024 * 1024, timeout: timeoutMs }, (err, stdout, stderr) => {
      res({ code: err ? (err.killed ? 'timeout' : err.code ?? 1) : 0, out: `${stdout}${stderr}` });
    });
  });
}

async function repl(code) {
  const r = await sh(findAside(), ['repl', code], 120_000);
  if (r.code !== 0 || /\[error \|/.test(r.out)) throw new Error(`aside repl 실패:\n${r.out}`);
  return r.out;
}

/** 그 오리진의 게임 탭 targetId. 없으면 `aside <url>` 로 연다 — repl 의 openTab 탭은 세션이 끝나면 닫힌다. */
async function gameTab(host) {
  const find = async () => (await repl(`
    const t = (await listBrowserTabs()).find(x => { try { return new URL(x.url).hostname === '${host}'; } catch { return false; } });
    if (t) console.log('TAB=' + t.targetId);
  `)).match(/^TAB=(.+)$/m)?.[1]?.trim();
  let id = await find();
  if (!id) { await sh(findAside(), [`https://${host}/`], 180_000); await new Promise(r => setTimeout(r, 4000)); id = await find(); }
  if (!id) throw new Error(`${host} 탭을 못 열었다`);
  return id;
}

/** localStorage 를 비우고 페르소나 세션을 넣은 뒤 새로고침 — 판마다 client_id·로컬 세이브도 새로 시작 */
async function injectSession(tab, session, host) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64');
  const out = await repl(`
    await attachBrowserTab('${tab}');
    await page.goto('https://${host}/');
    await page.evaluate(([k, b64]) => { localStorage.clear(); localStorage.setItem(k, atob(b64)); }, ['${storageKey()}', '${payload}']);
    await page.reload();
    await sleep(5000);
    console.log('UID=' + await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').user?.id || '', '${storageKey()}'));
  `);
  const uid = out.match(/^UID=(.*)$/m)?.[1]?.trim();
  if (uid !== session.user.id) throw new Error(`세션 주입 확인 실패(${host}): 기대 ${session.user.id}, 실제 ${uid || '(없음)'}`);
}

async function clearSession(tab) {
  // about:blank 로 이동하면 Aside 가 '인터랙티브 대기' 30초 타임아웃을 낸다(파일럿 실측) → 탭을 닫는다.
  // ⚠️ 비우기만 하면 게임은 메모리 세션으로 계속 돌아 다음 판 주입까지 하트비트·play_sec 이 붙는다
  //    (p02: 에이전트 19분인데 play_sec 38분). 탭이 이미 닫혔으면(에이전트가 닫음) 그대로 둔다.
  await repl(`await attachBrowserTab('${tab}'); await page.evaluate(() => localStorage.clear()); await closeTab(page);`)
    .catch(e => console.warn('[persona-sim] 세션 정리 실패(다음 판 주입 때 다시 비움):', e.message));
}

function prompt(p, host, model) {
  const minTry = /sonnet/.test(model)
    ? [`- 그만두더라도 **최소 ${SONNET_MIN_TRY_MIN}분은** 이것저것 시도해 본 뒤에만 그만둘 수 있다. 막히면 지도·안내·주민 대화·다른 장소를 먼저 찾아봐라.`]
    : [];
  return [
    `지금 Aside 브라우저에 열린 ${host} 탭은 '고요한 숲'이라는 3D 힐링 게임이고, 이미 로그인돼 있다.`,
    `반드시 ${host} 탭에서만 플레이하고 다른 탭은 건드리지 마라(다른 탭은 다른 사람이 쓰는 중이다).`,
    `아래 인물이 되어 그 사람처럼 이 게임을 직접 플레이해라. 사람처럼 키보드(WASD·스페이스·E)와 클릭으로 조작한다.`,
    ``,
    `[인물] ${p.directive}`,
    ``,
    `규칙:`,
    `- 최대 ${MINUTES}분. 로그인·로그아웃·계정·설정·결제·현금 상점은 절대 건드리지 마라.`,
    ...minTry,
    `- 인물이 그만두고 싶어지는 순간이 오면 바로 멈추고 마지막 줄에 "QUIT: <그만둔 이유 한 문장>" 이라고 답해라.`,
    `- 시간이 다 될 때까지 계속했다면 마지막 줄에 "TIMEUP" 이라고 답해라.`,
  ].join('\n');
}

// ── 락 ───────────────────────────────────────────────────────
function lock() {
  if (existsSync(LOCK_DIR) && Date.now() - statSync(LOCK_DIR).mtimeMs > LOCK_STALE_MS) rmdirSync(LOCK_DIR);
  mkdirSync(dirname(LOCK_DIR), { recursive: true });
  try { mkdirSync(LOCK_DIR); } catch { throw new Error(`Aside 사용 중(락 ${LOCK_DIR}) — 카드뉴스 크론이 끝난 뒤 다시 실행`); }
  const beat = setInterval(() => { const t = new Date(); try { utimesSync(LOCK_DIR, t, t); } catch {} }, 5 * 60_000);
  const release = () => { clearInterval(beat); try { rmdirSync(LOCK_DIR); } catch {} };
  // ⚠️ 'exit' 만 걸면 SIGTERM(kill) 에선 안 불린다 — 파일럿에서 락이 남았다
  process.on('exit', release);
  process.on('SIGINT', () => process.exit(130));
  process.on('SIGTERM', () => process.exit(143));
  return release;
}

// ── 할당 ─────────────────────────────────────────────────────
/** runs/*.jsonl 에서 끝까지 돈 판(outcome 있음)을 계정별로 센다 — 실패 기록은 세지 않는다 */
function loadDone() {
  const done = new Map();
  if (!existsSync(RUNS_DIR)) return done;
  for (const f of readdirSync(RUNS_DIR).filter(f => f.endsWith('.jsonl'))) {
    for (const line of readFileSync(join(RUNS_DIR, f), 'utf8').split('\n').filter(Boolean)) {
      const r = JSON.parse(line);
      if (!r.outcome || !r.account_id) continue;
      if (isShortSonnet(r) || isHaiku(r)) continue;   // ③ 모델이 못 다뤄 바로 그만둔 판·Haiku 판 — 다시 돌린다
      done.set(r.account_id, (done.get(r.account_id) || 0) + 1);
    }
  }
  return done;
}

/** 최소 시도 규칙 전에 돈 Sonnet 판 중 2분 안에 끝난 것 */
function isShortSonnet(r) {
  return /sonnet/.test(r.model || '') && !r.min_try_min && r.started_at && r.ended_at
    && new Date(r.ended_at) - new Date(r.started_at) < SHORT_SONNET_MS;
}

/** Haiku 판 — 지령(반복 파밍 등)을 수행하지 못해 학습용 행동이 안 나온다(2026-10-05 사용자 결정: Sonnet·Opus 만).
 *  기록은 지우지 않고 할당에서만 뺀다 → 그만큼 Sonnet·Opus 로 다시 돈다. 분석에서도 거를 것. */
function isHaiku(r) { return /haiku/.test(r.model || ''); }

/** 이번 판의 모델 — 모든 페르소나가 OPUS_EVERY 판마다 1판 Opus, 나머지는 지정 모델(Sonnet) */
let runCount = 0;
function pickModel(p) {
  const m = p.model || DEFAULT_MODEL;
  return (runCount++ % OPUS_EVERY === OPUS_EVERY - 1) ? OPUS_MODEL : m;
}

/** 할당을 채웠거나 쉬는 계정이 없으면 null, 아니면 판이 가장 적은 계정(동률이면 a→e 순).
 *  busy — 다른 슬롯이 지금 쓰는 계정. 같은 계정을 두 슬롯이 동시에 쓰면 서버 세이브가 서로 덮인다. */
function nextAccount(p, done, busy = new Set()) {
  const ids = ACCOUNT_SUFFIXES.map(s => `${p.id}-${s}`);
  const total = ids.reduce((n, id) => n + (done.get(id) || 0), 0);
  if (total >= p.quota) return null;
  const free = ids.filter(id => !busy.has(id));
  if (!free.length) return null;
  return free.reduce((best, id) => ((done.get(id) || 0) < (done.get(best) || 0) ? id : best));
}

// ── 한 판 ────────────────────────────────────────────────────
async function playOnce(p, accountId, round, host, slot) {
  const rec = { run_id: `${accountId}-${Date.now()}`, persona_id: p.id, account_id: accountId, traits: p.traits,
                email: personaEmail(accountId), round, minutes_budget: MINUTES, host, slot };
  // 모델: 페르소나별(personas.json model) — 정상=Sonnet·이상=Haiku(2026-10-04 전환, 그 전 155판은 Opus 기본값).
  //       모델이 행동을 바꾸므로 판마다 기록해 분석에서 공변량으로 쓴다.
  rec.model = pickModel(p);
  if (/sonnet/.test(rec.model)) rec.min_try_min = SONNET_MIN_TRY_MIN;
  if (DRY) { await new Promise(r => setTimeout(r, 30)); return rec; }   // 짧게 쉬어 슬롯 분배를 드라이런에서도 확인한다

  const acct = await ensureUser(accountId, p.id);
  const session = await mintSession(accountId);
  const tab = await gameTab(host);
  await injectSession(tab, session, host);

  rec.user_id = session.user.id;
  rec.account_created = acct.created;
  rec.started_at = new Date().toISOString();
  // --speed fast: 스크린샷→판단 지연을 줄여 같은 시간에 더 많이 조작한다(사용자 "빨리", 2026-10-03)
  const r = await sh(findAside(), ['exec', '-m', rec.model, '--effort', 'low', '--speed', 'fast', prompt(p, host, rec.model)], (MINUTES + 10) * 60_000);
  rec.ended_at = new Date().toISOString();
  rec.exit = r.code;
  const last = r.out.trim().split('\n').filter(Boolean).slice(-5).join('\n');
  rec.outcome = /TIMEUP/.test(last) ? 'timeup' : /QUIT:/.test(last) ? 'quit' : r.code === 'timeout' ? 'killed' : 'unknown';
  rec.quit_reason = last.match(/QUIT:\s*(.+)/)?.[1]?.trim() ?? null;
  rec.aside_tail = last.slice(-500);

  await clearSession(tab);
  return rec;
}

async function main() {
  const release = DRY ? () => {} : lock();
  mkdirSync(RUNS_DIR, { recursive: true });
  const file = () => join(RUNS_DIR, `${new Date().toISOString().slice(0, 10)}.jsonl`);
  const done = loadDone();
  const busy = new Set();

  // 라운드로빈 큐 — 한 라운드에 페르소나마다 한 판씩. 시간대·날씨·배포가 페르소나에 고르게 섞인다.
  //   슬롯들이 이 큐를 앞에서부터 나눠 가진다. 할당은 '시작할 때' 예약(done +1)하고 실패하면 되돌린다.
  const queue = [];
  for (let round = 1; round <= ROUNDS; round++) for (const p of personas) queue.push({ p, round });
  let next = 0;
  const fails = HOSTS.map(() => 0);   // 슬롯별 연속 실패 수 — 성공하면 0

  async function worker(slot) {
    const host = HOSTS[slot];
    await new Promise(r => setTimeout(r, DRY ? 0 : slot * SLOT_STAGGER_MS));
    while (next < queue.length) {
      const { p, round } = queue[next++];
      const accountId = nextAccount(p, done, busy);
      if (!accountId) continue;                     // 할당 완료 또는 다섯 계정이 다 다른 슬롯에서 도는 중
      busy.add(accountId); done.set(accountId, (done.get(accountId) || 0) + 1);
      console.log(`[persona-sim] #${slot + 1} ${round}/${ROUNDS} ${accountId} 시작 (${host})`);
      try {
        const rec = await playOnce(p, accountId, round, host, slot + 1);
        if (!DRY) appendFileSync(file(), JSON.stringify(rec) + '\n');
        fails[slot] = 0;
        console.log(`[persona-sim] #${slot + 1} ${accountId} [${rec.model.split('/').pop()}] → ${rec.outcome ?? 'dry'} ${rec.quit_reason ?? ''}`);
      } catch (e) {
        done.set(accountId, done.get(accountId) - 1);   // 예약 되돌림 — 실패한 판은 세지 않는다
        // 🔁 Aside 쪽 실패(데몬 재시작·탭 못 엶)는 판을 버리지 않고 큐 뒤로 돌린 뒤 점점 길게 쉰다.
        //    2026-10-05 01:50 Aside 자동 업데이트 → 쉬지 않고 넘기다 10분 만에 102판 실패로 라운드를 다 태웠다.
        if (queue.length < MAX_REQUEUE) queue.push({ p, round });
        const wait = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2 ** Math.min(fails[slot]++, 6));
        console.error(`[persona-sim] #${slot + 1} ${Math.round(wait / 1000)}초 쉬고 다시 시도`);
        if (!DRY) await new Promise(r => setTimeout(r, wait));
        const fail = { persona_id: p.id, account_id: accountId, round, host, slot: slot + 1, failed_at: new Date().toISOString(), error: e.message };
        if (!DRY) appendFileSync(file(), JSON.stringify(fail) + '\n');
        console.error(`[persona-sim] #${slot + 1} ${p.id} 실패:`, e.message);
      } finally {
        busy.delete(accountId);
      }
    }
  }

  await Promise.all(HOSTS.map((_, i) => worker(i)));
  const skipped = personas.filter(p => !nextAccount(p, done)).map(p => p.id);
  if (skipped.length) console.log(`[persona-sim] 할당 완료: ${skipped.join(' ')}`);
  if (!DRY) console.log(`[persona-sim] 기록: ${resolve(file())}`);
  release();   // 락 갱신 타이머가 이벤트 루프를 붙잡아 프로세스가 안 끝나던 문제(파일럿 실측)
}

main().then(() => process.exit(0), e => { console.error(e); process.exit(1); });
