import { SLOTS, ANY, POOL_CAP, EN_RATIO, cells, cellId, lineProblem } from '../../js/lines/slots.js';
import { NPC_SHEET } from './_npc-gen.js';
import { callExaone, failKind, parseJsonObject, mapLimit, CONCURRENCY, EXAONE_MODEL } from './_exaone.js';

export const PER_CALL = 10;
export const RETRIES = 2;
const MAX_TOKENS = 4096;

const ITEMS = {
  moonswing: {
    ko: '달빛 그네. 큰 초승달 모양 그네로, 밤에 달과 별 장식이 은은하게 빛난다.',
    en: 'Moon Swing. A large crescent-moon swing whose moon and star ornaments glow softly at night.',
  },
  lanternarch: {
    ko: '등불 아치. 빨간 지붕을 얹은 마당 문에 경매 무대와 같은 종이 등불이 달려 있다.',
    en: 'Lantern Arch. A red-roofed garden gate hung with paper lanterns like the ones on the auction stage.',
  },
  starvane: {
    ko: '별 풍향계. 바람이 불면 금빛 별이 빙글 도는 풍향계.',
    en: 'Star Vane. A weather vane with a golden star that spins in the wind.',
  },
};

const SLOT_BRIEF = {
  intro: { ko: '경매 창을 열면 경매품 이름 아래 뜨는 소개 한두 문장. 무엇인지와 어디에 두면 좋은지.', en: 'One or two sentences under the lot name when the auction window opens. What it is and where it would look good.' },
  open: { ko: '시작 종이 울릴 때 경매인이 외치는 첫마디. 오늘의 경매품을 띄운다.', en: "The auctioneer's opening call as the bell rings, hyping today's lot." },
  raise_npc: { ko: '마을 주민이 값을 올려 부를 때 경매인의 짧은 반응.', en: 'The auctioneer reacting briefly when a villager raises the bid.' },
  raise_me: { ko: '플레이어(손님)가 값을 올려 부를 때 경매인의 짧은 반응.', en: 'The auctioneer reacting briefly when the player (the guest) raises the bid.' },
  last: { ko: '남은 시간이 거의 없을 때 망치를 들며 하는 말. 더 부를 사람이 없는지 묻는다.', en: 'Said while lifting the gavel with almost no time left, asking if anyone will bid more.' },
  sold_me: { ko: '플레이어가 낙찰받았을 때 축하하는 말.', en: 'Congratulating the player on winning the lot.' },
  sold_npc: { ko: '마을 주민이 낙찰받았을 때 하는 말.', en: 'Announcing that a villager won the lot.' },
};

function systemPrompt(lang) {
  const m = NPC_SHEET.merchant;
  if (lang === 'en') {
    return [
      'You write lines for calm forest, a cozy low-poly farming village game.',
      `Speaker: ${m.nameEn}. ${m.personaEn}`,
      'Setting: every evening he runs a small auction on the lantern stage in the village square.',
      'Output exactly one JSON object {"lines": [string, ...]} and nothing else. No explanations, no code fences.',
      'Never write digits; prices and timers are shown separately on screen. Never use an em dash.',
      'Keep it warm and playful, suitable for all ages.',
    ].join('\n');
  }
  return [
    '너는 calm forest(포근한 저폴리 농사 마을 게임)의 대사 작가다.',
    `화자: ${m.name}. ${m.persona}`,
    '상황: 마을 광장 등불 무대에서 저녁마다 작은 경매를 연다.',
    '출력은 {"lines": [문자열, ...]} JSON 객체 하나뿐이다. 설명·코드펜스·다른 글자는 쓰지 않는다.',
    '숫자를 쓰지 않는다(가격·남은 시간은 화면이 따로 보여 준다). 줄표(—)를 쓰지 않는다. "놀다"를 쓰지 않는다.',
    '따뜻하고 장난스럽게, 모든 연령이 보는 게임에 맞게.',
  ].join('\n');
}

function userPrompt({ kind, key, slot, lang }, n) {
  const def = SLOTS[kind][slot];
  const max = lang === 'en' ? Math.round(def.max * EN_RATIO) : def.max;
  const brief = SLOT_BRIEF[slot][lang];
  const item = key === ANY ? '' : ITEMS[key]?.[lang] || '';
  if (lang === 'en') {
    return [
      `Situation: ${brief}`,
      item ? `Lot: ${item}` : 'This line must work for any lot, so do not name the lot.',
      def.vars.includes('who') ? 'Write the literal placeholder {who} where the villager name goes, exactly once per line.' : 'Do not use any {placeholder}.',
      `Write ${n} different lines in English, each at most ${max} characters.`,
    ].join('\n');
  }
  return [
    `상황: ${brief}`,
    item ? `경매품: ${item}` : '어느 경매품에도 맞아야 하므로 경매품 이름을 쓰지 않는다.',
    def.vars.includes('who')
      ? '주민 이름 자리에는 {who} 를 줄마다 정확히 한 번 그대로 쓴다. {who} 바로 뒤에 받침에 따라 바뀌는 조사(이/가, 을/를, 은/는, 와/과, 으로/로)를 붙이지 않는다. "께서", "의", "님" 이나 쉼표는 괜찮다.'
      : '{자리표시} 를 쓰지 않는다.',
    `서로 다른 표현으로 ${n}줄, 줄마다 ${max}자 이내 한국어.`,
  ].join('\n');
}

export function buildLineRequest(cell, n) {
  return {
    model: EXAONE_MODEL,
    max_tokens: MAX_TOKENS,
    reasoning_effort: 'low',
    messages: [
      { role: 'system', content: systemPrompt(cell.lang) },
      { role: 'user', content: userPrompt(cell, n) },
    ],
  };
}

const unquote = s => s.trim().replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '').trim();

export function parseLines(text) {
  const raw = parseJsonObject(text)?.lines;
  if (!Array.isArray(raw)) throw new Error('no_lines');
  return raw.filter(s => typeof s === 'string').map(unquote).filter(Boolean);
}

export function validateLines(lines, cell, seen = new Set()) {
  const ok = [], dropped = {};
  const drop = r => { dropped[r] = (dropped[r] || 0) + 1; };
  const local = new Set(seen);
  for (const text of lines) {
    if (local.has(text)) { drop('dup'); continue; }
    const why = lineProblem(text, cell);
    if (why) { drop(why); continue; }
    local.add(text);
    ok.push(text);
  }
  return { ok, dropped };
}

export function planLineWork(counts, { kinds, cap = POOL_CAP, maxCalls = Infinity }) {
  const have = new Map((counts || []).map(c => [cellId(c), Number(c.n) || 0]));
  const todo = kinds.flatMap(cells)
    .map(cell => ({ cell, n: have.get(cellId(cell)) || 0 }))
    .filter(x => x.n < cap)
    .sort((a, b) => a.n - b.n);
  const plan = [];
  for (const { cell, n } of todo) {
    for (let need = cap - n; need > 0; need -= PER_CALL) plan.push({ cell, want: Math.min(PER_CALL, need) });
  }
  return plan.slice(0, maxCalls);
}

export async function generateCell(env, cell, want, { fetch = globalThis.fetch, seen = new Set() } = {}) {
  const res = await callExaone(env, buildLineRequest(cell, PER_CALL), fetch);
  const fail = failKind(res);
  if (fail) return { lines: [], dropped: {}, failure: fail };
  if (res.finish === 'length') return { lines: [], dropped: {}, failure: 'length' };
  let parsed;
  try { parsed = parseLines(res.text); } catch { return { lines: [], dropped: {}, failure: 'parse' }; }
  const { ok, dropped } = validateLines(parsed, cell, seen);
  if (!ok.length) return { lines: [], dropped, failure: 'empty' };
  return { lines: ok.slice(0, want), dropped, failure: null };
}

export async function fillCells(env, plan, { fetch = globalThis.fetch, pace, existing = new Map(), maxCalls = Infinity, limit = CONCURRENCY } = {}) {
  let calls = 0, failed = 0, stopped = null, firstError = null;
  const seenOf = new Map();
  const seen = cell => {
    const id = cellId(cell);
    if (!seenOf.has(id)) seenOf.set(id, new Set(existing.get(id) || []));
    return seenOf.get(id);
  };
  const rows = [];
  await mapLimit(plan, limit, async ({ cell, want }) => {
    let last = null;
    for (let a = 0; a <= RETRIES; a++) {
      if (stopped || calls >= maxCalls) return;
      calls++;
      const got = await pace(() => generateCell(env, cell, want, { fetch, seen: seen(cell) }));
      if (!got.failure) {
        got.lines.forEach(text => { seen(cell).add(text); rows.push({ ...cell, text }); });
        return;
      }
      last = got.failure;
      if (last === 'rate_limited' || last === 'auth') { stopped ??= last; break; }
    }
    failed++;
    firstError ??= `${cellId(cell)}: ${last}`;
  }, () => stopped !== null || calls >= maxCalls);
  return { rows, calls, failed, stopped, firstError };
}
