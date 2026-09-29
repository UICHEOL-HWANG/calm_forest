// =============================================================
//  🍲 자유 냄비 한 줄 평 줄이기 — 결과 카드 한 줄(16자)에 맞게 기존 평만 다듬는다
//  ------------------------------------------------------------
//  ▶ 사용자 "설명이 너무 장황해 짧고 컴팩트하게"(2026-09-29) → JUDGE_MAX 28 → 16, 영어 48.
//  ▶ 이름·맛·태그는 그대로 두고 judge·judge_en 만 바꾼다(다시 생성하면 검수한 이름까지 흔들린다).
//  ▶ 게임 크론과 무료 한도를 공유 — generate.mjs 와 같은 규칙: KST 17~20시, 6.5초 간격, 429 즉시 중단.
//  사용: node tools/free-pot/shorten.mjs [--dry]
// =============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BANNED_JUDGE, JUDGE_EN_MAX, JUDGE_MAX, validateEntry } from '../../js/free-pot/rules.js';
import { renderTableModule } from './generate.mjs';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('js/free-pot/table.js', ROOT);
const MODEL = 'gemini-flash-lite-latest';
const BATCH = 40, PACE_MS = 6500, ROUNDS = 3;

export const needsShorten = (e) => String(e.judge || '').length > JUDGE_MAX || String(e.judge_en || '').length > JUDGE_EN_MAX;

export function buildShortenPrompt(entries) {
  const list = entries.map(([k, e], i) => `${i + 1}. key=${k} · 요리="${e.name}" · 평="${e.judge}" · en="${e.judge_en}"`).join('\n');
  return `너는 아늑한 숲속 동물 마을 힐링 게임 "calm forest"의 요리 심사위원이야.
아래 요리 한 줄 평을 게임 결과 카드 한 줄에 들어가게 **짧게 다듬어**. 뜻과 따뜻한 톤은 그대로.
규칙:
- key: 입력의 key 를 그대로.
- judge: 한국어, 해요체, **${JUDGE_MAX}자 이내(공백 포함)**. 요리 이름을 반복하지 말고 핵심 인상 하나만.
  따뜻하고 다정하게, 괴요리도 비난하지 말고 귀엽게. 시큰둥하거나 심드렁한 말투 금지 — ${BANNED_JUDGE.map(w => `"${w}"`).join(' ')} 같은 말을 쓰지 마.
- judge_en: 같은 뜻의 영어 한 줄, **${JUDGE_EN_MAX}자 이내**.
예: "달콤한 꿀을 발라 구워내어 단짠의 정석을 보여줘요." → "단짠의 정석이에요!"
목록:
${list}`;
}

const SCHEMA = {
  type: 'ARRAY',
  items: { type: 'OBJECT', properties: { key: { type: 'STRING' }, judge: { type: 'STRING' }, judge_en: { type: 'STRING' } }, required: ['key', 'judge', 'judge_en'] },
};

function readKey() {
  const line = readFileSync(new URL('.env', ROOT), 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
  if (!line) throw new Error('.env 에 GEMINI_API_KEY 가 없다');
  return line.slice('GEMINI_API_KEY='.length).trim();
}

async function callGemini(apiKey, entries) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildShortenPrompt(entries) }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  if (res.status === 429) { const e = new Error('429 — 한도. 멈춘다'); e.stop = true; throw e; }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const dry = process.argv.includes('--dry');
  const table = { ...(await import(`${pathToFileURL(fileURLToPath(OUT)).href}?t=${Date.now()}`)).FREE_POT_TABLE };
  const apiKey = dry ? null : readKey();
  let calls = 0;
  for (let round = 1; round <= ROUNDS; round++) {
    const todo = Object.entries(table).filter(([, e]) => needsShorten(e));
    console.log(`round ${round}: 줄일 평 ${todo.length}`);
    if (!todo.length) break;
    if (dry) { console.log(buildShortenPrompt(todo.slice(0, 3))); return; }
    for (let i = 0; i < todo.length; i += BATCH) {
      const batch = todo.slice(i, i + BATCH), keys = new Set(batch.map(([k]) => k));
      let rows;
      try { rows = await callGemini(apiKey, batch); calls++; }
      catch (e) { console.error(e.message); if (e.stop) { writeFileSync(OUT, renderTableModule(table)); return; } await sleep(PACE_MS); continue; }
      for (const r of rows) {
        if (!keys.has(r.key)) continue;
        const next = { ...table[r.key], judge: r.judge.trim(), judge_en: r.judge_en.trim() };
        // 이름은 그대로라 중복 검사는 해당 없다 — 빈 seenNames 로 나머지 규칙만 본다
        const bad = validateEntry(r.key, next, { recipeNames: new Set(), seenNames: new Set() });
        if (bad.length) { console.log(`  ✗ ${r.key}: ${bad.join(' / ')}`); continue; }
        table[r.key] = next;
      }
      writeFileSync(OUT, renderTableModule(table));
      console.log(`  저장 · Gemini ${calls}회`);
      await sleep(PACE_MS);
    }
  }
  const left = Object.values(table).filter(needsShorten).length;
  console.log(`남은 긴 평 ${left} · Gemini ${calls}회`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
