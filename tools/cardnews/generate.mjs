// 카드 묶음의 gen/* 이미지를 생성한다. 이미 있는 파일은 건너뛴다.
//
// 회사·일상 컷에는 게임 스크린샷을 레퍼런스로 넣지 않는다.
// 게임 화풍이 묻으면 표지가 "게임 광고"로 읽혀 스크롤에서 걸러진다.
//
// 사용: node generate.mjs decks/deck-01.json [--provider gemini|gti] [--force] [--only 01,02]
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

// ── Gemini ────────────────────────────────────────────────
// 4:5 가 지원 비율이라 카드(1080x1350)와 정확히 같다 — 크롭이 필요 없다.
const GEMINI = {
  url:   process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models',
  model: process.env.GEMINI_MODEL   || 'gemini-3-pro-image-preview',
  key:   process.env.GEMINI_API_KEY || '',
};

async function viaGemini(prompt, outPath) {
  if (!GEMINI.key) throw new Error('GEMINI_API_KEY 가 비어 있다. 셸에 넣고 다시 실행할 것');
  const res = await fetch(`${GEMINI.url}/${GEMINI.model}:generateContent`, {
    method: 'POST',
    // 키는 헤더로 보낸다. 쿼리스트링에 넣으면 셸 히스토리·서버 로그에 남는다.
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI.key },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '4:5', imageSize: '2K' },
      },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.data);
  if (!img) {
    // 안전필터에 걸리면 이미지 없이 텍스트만 온다. 그 사유를 그대로 보여준다.
    const why = json?.candidates?.[0]?.finishReason || json?.promptFeedback?.blockReason || '';
    const txt = parts.map(p => p.text).filter(Boolean).join(' ').slice(0, 200);
    throw new Error(`이미지 없음 ${why} ${txt}`.trim());
  }
  await writeFile(outPath, Buffer.from(img.inlineData.data, 'base64'));
}

// ── gti (god-tibo-imagen) ─────────────────────────────────
// 모델을 반드시 넘긴다. gti 기본값 gpt-5.4 는 ChatGPT 계정으로 400 이 난다
// ("The 'gpt-5.4' model is not supported when using Codex with a ChatGPT account").
// 계정이 받는 이름은 `codex exec` 가 쓰는 것과 같다 — 바뀌면 ~/.codex/config.toml 의 model 을 본다.
const GTI_MODEL = process.env.GTI_MODEL || 'gpt-5.6-sol';

async function viaGti(prompt, outPath) {
  await run('gti', ['--prompt', prompt, '--model', GTI_MODEL,
                    '--size', '1024x1536', '--output', outPath],
            { maxBuffer: 16 * 1024 * 1024 });
}

// ── 실행 ──────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : fallback; };
const deckPath = resolve(argv.find(a => a.endsWith('.json')) || 'decks/deck-01.json');
const force = argv.includes('--force');
const only = (arg('--only', '') || '').split(',').filter(Boolean);
const provider = arg('--provider', GEMINI.key ? 'gemini' : 'gti');
const generate = provider === 'gemini' ? viaGemini : viaGti;

const deck = JSON.parse(await readFile(deckPath, 'utf-8'));
const todo = [];
for (const c of deck.cards) {
  if (!c.img.startsWith('gen/')) continue;
  if (only.length && !only.some(o => c.img.includes(o))) continue;
  if (!c.imgPrompt) { console.warn('imgPrompt 없음:', c.img); continue; }
  const out = resolve(HERE, c.img);
  if (!force) { try { await access(out); continue; } catch {} }
  todo.push({ out, prompt: c.imgPrompt, img: c.img });
}

if (!todo.length) { console.log('생성할 이미지 없음 (--force 로 재생성)'); process.exit(0); }
await mkdir(resolve(HERE, 'gen'), { recursive: true });
console.log(`provider=${provider} model=${provider === 'gemini' ? GEMINI.model : GTI_MODEL} · ${todo.length}장`);

for (const t of todo) {
  process.stdout.write(`  ${t.img} … `);
  try { await generate(t.prompt, t.out); console.log('ok'); }
  catch (e) { console.log('FAIL'); console.error('   ', (e.message || '').split('\n')[0]); process.exitCode = 1; }
}
