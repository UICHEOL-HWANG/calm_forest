// 🦉☕ AI 콘텐츠 사전 생성 크론 — 계획·예산·게임과의 동일성
//  즉석 생성은 날짜가 바뀌는 순간 여러 API 가 한꺼번에 Gemini 를 불러
//  분당 15회 무료 한도(프로젝트·모델 공유)에 걸렸다(2026-09-25 429 실측).
//  크론이 전날 밤 천천히 만들어 Supabase 에 두고, API 는 읽기만 한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';
import { weatherForDate, slotOfHour, CAFE_SLOTS, PHASE_IDS, LANGS, kstDate } from '../functions/api/_game-day.js';
import { planPregen, runAiPregen, variantsFor, MAX_CALLS, PACE_MS, MAX_VARIANTS } from '../functions/ai-pregen-cron.js';

const SRC = gameSource();

// ── 게임과 같은 날씨 ────────────────────────────────────────────
//   서버가 날씨를 직접 계산하므로 조합에서 날씨 축이 빠진다(24 → 6).
//   게임의 weatherOf 와 한 글자라도 어긋나면 비 오는 날 "맑은 날" 의뢰가 나간다.
test('서버 weatherForDate 는 게임 weatherOf 와 같은 값을 낸다', () => {
  const dateHash = SRC.match(/^function dateHash\([\s\S]*?\n\}/m)[0];
  const weatherOf = SRC.match(/^function weatherOf\([\s\S]*?\n\}/m)[0];
  const gameWeather = (date) => new Function('todayStr', `${dateHash}\n${weatherOf}\nreturn weatherOf(0);`)(() => date);
  const seen = new Set();
  for (let d = 0; d < 120; d++) {
    const date = new Date(Date.UTC(2026, 8, 1) + d * 86400000).toISOString().slice(0, 10);
    assert.equal(weatherForDate(date), gameWeather(date), date);
    seen.add(weatherForDate(date));
  }
  assert.equal(seen.size, 4, '120일 동안 네 날씨가 다 나와야 한다');
});

// ── 카페 시간대 ────────────────────────────────────────────────
test('시간대 경계: ~11시 아침 · ~17시 낮 · 그 뒤 저녁', () => {
  assert.equal(slotOfHour(0), 'morning');
  assert.equal(slotOfHour(10), 'morning');
  assert.equal(slotOfHour(11), 'noon');
  assert.equal(slotOfHour(16), 'noon');
  assert.equal(slotOfHour(17), 'evening');
  assert.equal(slotOfHour(23), 'evening');
  assert.deepEqual(CAFE_SLOTS, ['morning', 'noon', 'evening']);
});

test('게임의 cafeSlot 경계가 서버와 같다', () => {
  const fn = SRC.match(/^function cafeSlot\([\s\S]*?\n\}/m)?.[0];
  assert.ok(fn, 'cafe.js 에 cafeSlot 이 없다');
  const cafeSlot = new Function(`${fn}\nreturn cafeSlot;`)();
  for (let h = 0; h < 24; h++) assert.equal(cafeSlot(h), slotOfHour(h), `${h}시`);
});

test('phase 목록이 게임 playerPhase 와 같다', () => {
  const fn = SRC.match(/^function playerPhase\([\s\S]*?\n\}/m)[0];
  const phases = [...fn.matchAll(/'([a-z]+)'/g)].map(m => m[1]);
  assert.deepEqual([...PHASE_IDS].sort(), [...new Set(phases)].sort());
});

test('kstDate 는 UTC 15시에 날짜가 넘어간다', () => {
  assert.equal(kstDate(Date.UTC(2026, 8, 25, 14, 59)), '2026-09-25');
  assert.equal(kstDate(Date.UTC(2026, 8, 25, 15, 0)), '2026-09-26');
  assert.equal(kstDate(Date.UTC(2026, 8, 25, 15, 0), 1), '2026-09-27');
});

// ── 계획 ───────────────────────────────────────────────────────
const D1 = '2026-09-25', D2 = '2026-09-26';

test('하루 조합 = 의뢰 6 + 카페 18, 변형마다 반복', () => {
  const plan = planPregen([], { today: D1, tomorrow: D2, variants: 2 });
  const tmr = plan.filter(p => p.date === D2);
  assert.equal(tmr.filter(p => p.kind === 'quests').length, LANGS.length * PHASE_IDS.length * 2);
  assert.equal(tmr.filter(p => p.kind === 'cafe').length, LANGS.length * PHASE_IDS.length * CAFE_SLOTS.length * 2);
  assert.ok(plan.filter(p => p.kind === 'quests').every(p => p.slot === 'day'));
});

test('오늘은 변형 0 만 — 이미 반쯤 지난 날에 예산을 쓰지 않는다', () => {
  const plan = planPregen([], { today: D1, tomorrow: D2, variants: 8 });
  const today = plan.filter(p => p.date === D1);
  assert.equal(today.length, 24);
  assert.ok(today.every(p => p.variant === 0));
});

test('채우는 순서: 오늘 → 내일 변형0 전부 → 내일 변형1 … (중간에 끊겨도 모든 조합은 한 벌)', () => {
  const plan = planPregen([], { today: D1, tomorrow: D2, variants: 3 });
  assert.deepEqual(plan.slice(0, 24).map(p => p.date), Array(24).fill(D1));
  assert.ok(plan.slice(24, 48).every(p => p.date === D2 && p.variant === 0));
  assert.ok(plan.slice(48, 72).every(p => p.variant === 1));
});

test('이미 있는 행은 다시 만들지 않는다', () => {
  const have = [{ kind: 'quests', date: D1, lang: 'ko', phase: 'settled', slot: 'day', variant: 0 }];
  const plan = planPregen(have, { today: D1, tomorrow: D2, variants: 1 });
  assert.ok(!plan.some(p => p.kind === 'quests' && p.date === D1 && p.lang === 'ko' && p.phase === 'settled'));
  assert.equal(plan.length, 24 * 2 - 1);
});

test('변형 수는 크론 몫(RPD 절반) 안에서 최대 — RPD 500 이면 8벌', () => {
  assert.equal(variantsFor(500), MAX_VARIANTS);
  assert.ok(variantsFor(500) * 24 <= 500 * 0.5, '하루 크론 호출이 RPD 절반을 넘지 않는다');
  assert.equal(variantsFor(20), 1, '한도가 작아도 최소 한 벌');
});

// ── 실행: 예산·페이싱·기록 ─────────────────────────────────────
const QUEST = (i) => ({ type: ['chop', 'plant', 'water', 'harvest', 'fish'][i], target: 3, title: '제목', line: '오늘 마을에 일이 있어요' });
const GUEST = (i) => ({ id: ['guest_deer', 'guest_otter', 'guest_frog', 'guest_turtle'][i], recipeId: 'veg_stew', line: '오늘 따뜻한 죽이 당기네요', thanks: '잘 먹을게요' });

function mockWorld({ have = [], gemini = () => 200, used = 0 } = {}) {
  const calls = { gemini: 0, upsert: [], runs: [], deletes: 0, selects: 0, sleeps: [] };
  const fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('generativelanguage')) {
      calls.gemini++;
      const status = gemini(calls.gemini);
      if (status !== 200) return new Response('{"error":{"code":429}}', { status });
      const body = JSON.parse(init.body);
      const sys = body.systemInstruction.parts[0].text;
      const isQuest = sys.includes('올빼미') || sys.includes('Owl');
      const arr = isQuest ? [0, 1, 2, 3, 4].map(QUEST) : [0, 1, 2, 3].map(GUEST);
      return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(arr) }] } }] });
    }
    const method = init.method || 'GET';
    if (u.includes('/rest/v1/ai_daily_content') && method === 'GET') { calls.selects++; return Response.json(have); }
    if (u.includes('/rest/v1/ai_daily_content') && method === 'POST') { calls.upsert.push(JSON.parse(init.body)); return new Response('', { status: 201 }); }
    if (u.includes('/rest/v1/ai_daily_content') && method === 'DELETE') { calls.deletes++; return new Response('', { status: 204 }); }
    if (u.includes('/rest/v1/ai_pregen_runs') && method === 'GET') { calls.selects++; return Response.json(used ? [{ gemini_calls: used }] : []); }
    if (u.includes('/rest/v1/ai_pregen_runs')) { calls.runs.push(JSON.parse(init.body)); return new Response('', { status: 201 }); }
    throw new Error(`예상 밖 fetch: ${u}`);
  };
  const env = { GEMINI_API_KEY: 'k', GEMINI_RPD: '500', SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 's' };
  const sleep = async (ms) => { calls.sleeps.push(ms); };
  const notify = async (_env, subject) => { calls.mails = [...(calls.mails || []), subject]; };
  return { env, fetch, calls, sleep, notify };
}

const NOW = Date.UTC(2026, 8, 25, 11, 0);   // KST 20:00 — 크론 첫 실행 시각

test('한 번 실행에 Gemini 는 MAX_CALLS 를 넘지 않고, 호출 사이마다 쉰다', async () => {
  const w = mockWorld();
  const r = await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.equal(w.calls.gemini, MAX_CALLS);
  assert.equal(r.inserted, MAX_CALLS);
  assert.equal(w.calls.sleeps.length, MAX_CALLS - 1);
  assert.ok(w.calls.sleeps.every(ms => ms >= PACE_MS));
  assert.ok(60000 / PACE_MS <= 10, '분당 10회 이하 — 15 중 나머지는 라이브 몫');
});

test('저장은 한 번의 일괄 upsert — 서브리퀘스트 50 예산 안', async () => {
  const w = mockWorld();
  await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.equal(w.calls.upsert.length, 1);
  assert.equal(w.calls.upsert[0].length, MAX_CALLS);
  const subrequests = w.calls.gemini + w.calls.selects + w.calls.upsert.length + w.calls.deletes + w.calls.runs.length + 1 /* 메일 */;
  assert.ok(subrequests <= 46, `서브리퀘스트 ${subrequests} — 무료 플랜 50`);
});

test('저장 행에 날씨는 날짜로 계산한 값, 카페는 4명·의뢰는 5개', async () => {
  const w = mockWorld();
  await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  for (const row of w.calls.upsert[0]) {
    assert.equal(row.weather, weatherForDate(row.date));
    assert.equal(row.payload.length, row.kind === 'quests' ? 5 : 4);
  }
});

test('429 를 받으면 즉시 멈춘다 — 남은 건 다음 실행 몫(쿼터를 더 태우지 않는다)', async () => {
  const w = mockWorld({ gemini: (n) => (n >= 3 ? 429 : 200) });
  const r = await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.equal(w.calls.gemini, 3);
  assert.equal(r.inserted, 2);
  assert.equal(r.rateLimited, true);
  assert.equal(w.calls.upsert[0].length, 2, '성공분은 저장한다');
});

test('할 일이 없어도 실행 기록은 남긴다(크론이 안 떴는지 구분하려고)', async () => {
  const all = planPregen([], { today: kstDate(NOW), tomorrow: kstDate(NOW, 1), variants: MAX_VARIANTS });
  const w = mockWorld({ have: all });
  const r = await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.equal(w.calls.gemini, 0);
  assert.equal(r.requested, 0);
  assert.equal(w.calls.runs.length, 1);
});

test('오늘(태평양 자정 이후) 크론이 쓴 양이 예산에 닿으면 멈춘다 — 나머지 절반은 라이브 몫', async () => {
  const w = mockWorld({ used: 245 });   // RPD 500 × 0.5 = 250
  const r = await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.equal(w.calls.gemini, 5);
  assert.equal(r.budgetLeft, 0);
});

test('변형 번호가 붙은 행을 저장한다', async () => {
  const w = mockWorld();
  await runAiPregen(w.env, { fetch: w.fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.ok(w.calls.upsert[0].every(r => Number.isInteger(r.variant) && r.variant >= 0 && r.variant < MAX_VARIANTS));
});

// ── 배선 ───────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('wrangler 크론 표현식과 worker 분기가 같다 — 어긋나면 npc-gen 으로 새서 하루 9번 한도를 태운다', () => {
  const crons = JSON.parse(read('wrangler.jsonc').match(/"crons":\s*(\[[^\]]*\])/)[1]);
  const worker = read('worker/index.js');
  const pregen = crons.find(c => /11-13/.test(c));
  assert.ok(pregen, 'ai-pregen 크론이 wrangler.jsonc 에 없다');
  assert.ok(worker.includes(`event.cron === '${pregen}'`), `worker 분기가 '${pregen}' 과 다르다`);
  // UTC 11~13시 = KST 20~22시. KST 로 착각해 20-22 로 쓰면 새벽에 돈다.
  assert.match(pregen, /^\S+ 11-13 \* \* \*$/);
});

test('클라이언트가 시간대와 버킷을 보낸다', () => {
  assert.match(read('js/cafe-guests.js'), /&slot=\$\{encodeURIComponent\(ctx\.slot/);
  assert.match(read('js/cafe-guests.js'), /&v=\$\{aiBucket\(\)\}/);
  assert.match(SRC, /\/api\/daily-quests\?[^`]*&v=\$\{aiBucket\(\)\}/);
});

test('버킷 범위가 클라이언트·서버에서 같다', () => {
  assert.match(read('js/i18n.js'), /export const AI_BUCKETS = 8;/);
  assert.match(read('functions/api/_game-day.js'), /export const VARIANT_BUCKETS = 8;/);
});

test('서빙한 자리는 스냅숏으로 고정된다 — 시간대가 바뀌어도 완료 줄의 손님이 안 바뀐다', () => {
  assert.match(SRC, /st\.doneOrders = \{ \.\.\.\(st\.doneOrders \|\| \{\}\), \[o\.i\]:/);
  assert.match(SRC, /st\.done\.includes\(i\) && snaps\[i\]\) \? snaps\[i\] : g/);
  assert.match(SRC, /st\.doneOrders = \{\}; \}\s*\/\/ 새 날/);
});

// ── 변형이 실제로 다르게 나오게 ────────────────────────────────
//   실측(2026-09-25): 세 시간대 모두 첫 손님이 사슴+버섯스프 — 모델이 목록 앞쪽을 고른다.
//   의뢰도 시작 일감이 날짜로만 정해져 변형 8벌이 전부 같은 일감으로 시작했다.
import { buildQuestPrompt } from '../functions/api/daily-quests.js';
import { buildCafePrompt } from '../functions/api/cafe-guests.js';

test('의뢰 변형마다 시작 일감이 갈린다(변형 0 은 예전과 같다)', () => {
  const openers = new Set();
  for (let v = 0; v < MAX_VARIANTS; v++) {
    const p = buildQuestPrompt('2026-09-26', 'clear', 'ko', 'settled', v);
    openers.add(p.match(/오늘은 '([a-z]+)' 로 문을 여는/)[1]);
  }
  assert.ok(openers.size >= 4, `변형 8벌의 시작 일감이 ${openers.size}종뿐`);
  assert.equal(buildQuestPrompt('2026-09-26', 'clear', 'ko', 'settled', 0), buildQuestPrompt('2026-09-26', 'clear', 'ko', 'settled'));
});

test('카페 변형·시간대마다 손님 목록 순서가 갈린다', () => {
  const firstGuest = (slot, v) => buildCafePrompt('2026-09-26', 'clear', 4, 'ko', 'settled', slot, v).match(/손님 목록:\n- ([a-z_]+)/)[1];
  const seen = new Set();
  for (const slot of CAFE_SLOTS) for (let v = 0; v < MAX_VARIANTS; v++) seen.add(firstGuest(slot, v));
  assert.ok(seen.size >= 4, `첫 손님이 ${seen.size}종뿐`);
  // 목록을 섞을 뿐 빠뜨리거나 늘리지 않는다
  const ids = [...buildCafePrompt('2026-09-26', 'clear', 4, 'ko', 'settled', 'noon', 3).matchAll(/^- (guest_[a-z]+):/gm)].map(m => m[1]);
  assert.equal(new Set(ids).size, 8);
});

test('로컬 폴백 손님도 시간대마다 메뉴가 실제로 바뀐다', () => {
  //   `cafe:menu:${slot}:${i}` 를 31진 dateHash 에 그냥 넣으면 아침·저녁 메뉴가 95% 같았다(2026-09-25 실측 228/240).
  const dateHash = SRC.match(/^function dateHash\([\s\S]*?\n\}/m)[0];
  const slotHash = SRC.match(/^function slotHash\([\s\S]*?\n\}/m)?.[0];
  assert.ok(slotHash, 'cafe.js 에 slotHash 가 없다');
  let same = 0, total = 0;
  for (let d = 0; d < 60; d++) {
    const date = new Date(Date.UTC(2026, 8, 1) + d * 86400000).toISOString().slice(0, 10);
    const sh = new Function('todayStr', `${dateHash}\n${slotHash}\nreturn slotHash;`)(() => date);
    for (let i = 0; i < 4; i++) {
      total++;
      if (sh(`cafe:menu:${i}`, 'morning') % 10 === sh(`cafe:menu:${i}`, 'evening') % 10) same++;
    }
  }
  assert.ok(same / total < 0.25, `아침·저녁 메뉴가 ${same}/${total} 같다`);
});

// ── 코드 리뷰 반영(2026-09-25) ─────────────────────────────────
import { pickVariant } from '../functions/api/_ai-store.js';
const rowsOf = (...vs) => vs.map(v => ({ variant: v, payload: [`v${v}`] }));

test('변형은 배열 위치가 아니라 variant 번호로 고른다 — 크론이 변형을 더 채워도 받던 게 안 바뀐다', () => {
  // 버킷 3: 배열 위치로 고르면 [0,1,2]→v0, [0..3]→v3, [0..4]→v3, [0..5]→v3 … 이지만
  //   [0,1,2,4] 처럼 빈칸이 있으면 위치가 밀려 v4 를 받는 식으로 계속 바뀐다.
  assert.deepEqual(pickVariant(rowsOf(0, 1, 2), 3, 8), ['v0'], '아직 없으면 변형 0');
  assert.deepEqual(pickVariant(rowsOf(0, 1, 2, 3), 3, 8), ['v3']);
  assert.deepEqual(pickVariant(rowsOf(0, 1, 2, 3, 4, 5), 3, 8), ['v3'], '더 채워져도 그대로');
  assert.deepEqual(pickVariant(rowsOf(0, 1, 2, 4), 3, 8), ['v0'], '빈칸이 있어도 남의 변형으로 새지 않는다');
});

test('변형 수가 버킷보다 적으면 버킷을 변형 수로 접는다 — 변형 0 에 몰리지 않게', () => {
  assert.deepEqual(pickVariant(rowsOf(0, 1, 2, 3), 5, 4), ['v1']);
  assert.deepEqual(pickVariant(rowsOf(0, 1, 2, 3), 7, 4), ['v3']);
});

test('변형 0 도 없으면 있는 것 중 첫 번째, 아무것도 없으면 null', () => {
  assert.deepEqual(pickVariant(rowsOf(2, 5), 3, 8), ['v2']);
  assert.equal(pickVariant([], 3, 8), null);
});

test('크론의 Supabase 조회에는 타임아웃이 걸린다 — 멈춘 저장소가 실행 전체를 붙잡지 않게', async () => {
  const w = mockWorld();
  const seen = [];
  const fetch = (url, init = {}) => {
    if (String(url).includes('/rest/v1/') && (init.method || 'GET') === 'GET') seen.push(init.signal);
    return w.fetch(url, init);
  };
  await runAiPregen(w.env, { fetch, sleep: w.sleep, now: NOW, notify: w.notify });
  assert.equal(seen.length, 2);
  assert.ok(seen.every(s => s instanceof AbortSignal), '조회에 AbortSignal 이 없다');
});
