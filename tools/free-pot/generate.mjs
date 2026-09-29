// =============================================================
//  🍲 자유 냄비 조합 표 생성기 — Gemini 로 한 번 만들어 js/free-pot/table.js 에 커밋한다
//  ------------------------------------------------------------
//  ▶ 무료 한도(500 RPD·15 RPM)를 게임 크론(KST 20:00~22:40)과 공유 → KST 17:00~20:00 에만 돌린다.
//  ▶ 6.5초 간격, 429 면 즉시 멈춘다. 다시 돌리면 빠진 키만 이어서 만든다.
//  ▶ 검증(validateEntry) 실패 항목은 버리고 다음 라운드에 다시 만든다(최대 3라운드).
//  사용: node tools/free-pot/generate.mjs [--limit N] [--dry]
// =============================================================
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { TAGS, BANNED_JUDGE, capTaste, freeCombos, parseKey, validateEntry } from '../../js/free-pot/rules.js';
import { recipesFromSource } from './recipes-src.mjs';

const ROOT = new URL('../../', import.meta.url);
const OUT = new URL('js/free-pot/table.js', ROOT);
const MODEL = 'gemini-flash-lite-latest';
const BATCH = 40, PACE_MS = 6500, ROUNDS = 3;

const LABEL = { crop: '당근·채소', forage: '숲 버섯·나물', fish: '물고기', egg: '달걀', flour: '밀가루', wheat: '밀',
  corn: '옥수수', grape: '포도', honey: '꿀', apple: '사과', pear: '배', peach: '복숭아', persimmon: '감', chestnut: '밤' };

export function buildPrompt(keys) {
  const list = keys.map((k, i) => `${i + 1}. key=${k} → ${parseKey(k).map(x => LABEL[x]).join(', ')}`).join('\n');
  return `너는 아늑한 숲속 동물 마을 힐링 게임 "calm forest"의 요리 심사위원이야.
플레이어가 냄비에 재료 1~3개를 넣으면, 그 조합으로 나올 법한 요리를 판정해.
규칙:
- key: 입력의 key 를 그대로.
- name: 한국어 요리 이름(2~9자, 귀엽고 소박하게). 자연스러운 띄어쓰기(예: "달콤 사과파이", "꿀 배숙").
- name_en: 자연스러운 영어 이름.
- ⚠️ 넣은 재료만으로 만들 수 있는 요리여야 해. 밀가루·밀이 없으면 빵·파이·케이크·팬케이크·전 금지, 달걀이 없으면 달걀 요리 금지.
- ico: 요리를 나타내는 이모지 1개(글자 금지).
- taste: 1~5 정수. 실제 맛 궁합으로 엄격하게. 전체 분포 목표: ★5 약 10%, ★4 약 25%, ★3 약 30%, ★1~2 약 35%. ★5 는 누구나 인정할 조합만.
- 같은 재료만 반복한 조합은 최대 ★3. 그래도 평은 그 재료의 매력을 칭찬해.
- taste 1~2(괴요리)는 이름에서도 이상한 요리라는 게 드러나게("수상한", "모험", "정체불명" 느낌). 맛있어 보이는 이름 금지. tags 에 weird 포함.
- judge: 한국어 한 줄 평, 해요체, 16자 이내(공백 포함), 따뜻하고 다정하게. 괴요리도 비난하지 말고 귀엽게.
  시큰둥하거나 심드렁한 말투 금지 — ${BANNED_JUDGE.map(w => `"${w}"`).join(' ')} 같은 말을 쓰지 마.
- judge_en: 같은 뜻의 짧은 영어 한 줄(48자 이내).
- tags: 다음 중 1~3개 ${JSON.stringify(TAGS)}
- 같은 재료가 반복되면 그 재료가 주재료인 요리로.
조합 목록:
${list}`;
}

export const SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      key: { type: 'STRING' }, name: { type: 'STRING' }, name_en: { type: 'STRING' }, ico: { type: 'STRING' },
      taste: { type: 'INTEGER' }, judge: { type: 'STRING' }, judge_en: { type: 'STRING' },
      tags: { type: 'ARRAY', items: { type: 'STRING', enum: TAGS } },
    },
    required: ['key', 'name', 'name_en', 'ico', 'taste', 'judge', 'judge_en', 'tags'],
  },
};

export function renderTableModule(table) {
  const body = Object.keys(table).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(table[k])},`).join('\n');
  return `// ⚠️ 생성물 — tools/free-pot/generate.mjs 가 쓴다. 손으로 고칠 땐 validateEntry 규칙을 지킬 것.\n` +
    `//    검수: node tools/free-pot/review.mjs → dev/active/free-pot/review.html\n` +
    `export const FREE_POT_TABLE = {\n${body}\n};\n`;
}

async function loadTable() {
  if (!existsSync(OUT)) return {};
  return { ...(await import(`${pathToFileURL(fileURLToPath(OUT)).href}?t=${Date.now()}`)).FREE_POT_TABLE };
}

function readKey() {
  const line = readFileSync(new URL('.env', ROOT), 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
  if (!line) throw new Error('.env 에 GEMINI_API_KEY 가 없다');
  return line.slice('GEMINI_API_KEY='.length).trim();
}

async function callGemini(apiKey, keys) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(keys) }] }],
      generationConfig: { temperature: 0.4, responseMimeType: 'application/json', responseSchema: SCHEMA },
    }),
  });
  if (res.status === 429) { const e = new Error('429 — 한도. 멈춘다'); e.stop = true; throw e; }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return JSON.parse(data.candidates[0].content.parts[0].text);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function save(table, calls) {
  writeFileSync(OUT, renderTableModule(table));
  console.log(`  저장 ${Object.keys(table).length}개 · Gemini ${calls}회`);
}

async function main() {
  const args = process.argv.slice(2);
  const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;
  const dry = args.includes('--dry');
  const table = await loadTable();
  const recipeNames = new Set(recipesFromSource().map(r => r.name));
  const seenNames = new Set(Object.values(table).map(e => e.name));
  const apiKey = dry ? null : readKey();
  let calls = 0;
  for (let round = 1; round <= ROUNDS; round++) {
    const missing = freeCombos().filter(k => !table[k]).slice(0, limit);
    console.log(`round ${round}: 빠진 조합 ${missing.length}`);
    if (!missing.length) break;
    if (dry) { console.log(buildPrompt(missing.slice(0, BATCH))); return; }
    for (let i = 0; i < missing.length; i += BATCH) {
      const keys = missing.slice(i, i + BATCH);
      let rows;
      try { rows = await callGemini(apiKey, keys); calls++; }
      catch (e) { console.error(e.message); if (e.stop) { save(table, calls); return; } await sleep(PACE_MS); continue; }
      for (const r of rows) {
        if (!keys.includes(r.key)) continue;
        const e = { name: r.name.trim(), name_en: r.name_en.trim(), ico: r.ico.trim(), taste: capTaste(r.key, r.taste),
          judge: r.judge.trim(), judge_en: r.judge_en.trim(), tags: r.tags };
        const bad = validateEntry(r.key, e, { recipeNames, seenNames });
        if (bad.length) { console.log(`  ✗ ${r.key}: ${bad.join(' / ')}`); continue; }
        table[r.key] = e;
      }
      save(table, calls);
      await sleep(PACE_MS);
    }
  }
  save(table, calls);
  const hist = [1, 2, 3, 4, 5].map(t => Object.values(table).filter(e => e.taste === t).length);
  console.log(`★ 분포 1~5: ${hist.join(' / ')} · 채움 ${Object.keys(table).length}/${freeCombos().length}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
