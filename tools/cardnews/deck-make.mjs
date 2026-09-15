// =============================================================
//  calm forest · 🃏 카드뉴스 한 묶음 만들기 (생성 → 촬영 → 합성 → 검사)
//  ------------------------------------------------------------
//  node deck-make.mjs deck-03 [--force] [--port 8000]
//
//  역할 분담:
//    사람   — 소재를 고른다 (topics.mjs 가 모아 둔 것 중에서)
//    사람+저 — decks/deck-03.json 에 카피·imgPrompt 를 쓴다 (STYLE.md 규칙)
//    도구   — 여기부터 끝까지. 사람이 더 할 게 없다
//    사람   — 카드를 보고 node publish.mjs deck-03 --queue
//
//  ⚠️ gti(Codex 기반)도 shoot.mjs 도 이 맥에서만 돈다.
//     gti 는 ~/.codex/auth.json 이, 촬영은 로컬 서버가 필요하다.
//     그래서 이 단계는 Cloudflare 크론에 못 올린다 — 맥에서 돌려야 한다.
//
//  ⚠️ 이미 만든 이미지·촬영분은 건너뛴다. gti 호출이 느리고, 다시 뽑으면
//     같은 프롬프트라도 그림이 달라져 이미 고른 컷이 바뀐다. --force 로 무시.
// =============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const slug = argv.find(a => !a.startsWith('--'));
const FORCE = argv.includes('--force');
const PORT = arg('--port', '8000');

if (!slug) {
  console.error('사용: node deck-make.mjs <묶음이름> [--force] [--port 8000]');
  process.exit(1);
}

const deckPath = resolve(HERE, 'decks', `${slug}.json`);
const deck = JSON.parse(await readFile(deckPath, 'utf-8'));
const cards = deck.cards || [];
if (!cards.length) throw new Error(`decks/${slug}.json 에 cards 가 없다`);

/** 하위 스크립트를 돌린다. 출력은 그대로 흘려보낸다 — 조용한 실패 금지 */
async function step(script, args) {
  console.log(`\n$ node ${script} ${args.join(' ')}`);
  const { stdout, stderr } = await run('node', [resolve(HERE, script), ...args], {
    cwd: HERE, maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60_000,
  });
  const out = (stdout + stderr).trim();
  if (out) console.log(out.split('\n').map(l => '  ' + l).join('\n'));
}

const exists = p => stat(p).then(s => s.size > 0).catch(() => false);

// ── 1. 생성 이미지 (gti / Gemini) ────────────────────────────
//  imgPrompt 가 있는 카드가 대상. generate.mjs 도 자체 건너뛰기를 하지만,
//  전부 있으면 호출 자체를 생략해 로그를 깨끗하게 둔다.
const genCards = cards.filter(c => c.imgPrompt);
const genMissing = [];
for (const c of genCards) {
  if (!c.img) continue;
  if (FORCE || !await exists(resolve(HERE, c.img))) genMissing.push(c.img);
}
if (genCards.length && (FORCE || genMissing.length)) {
  console.log(`\n[1/4] 이미지 생성 — ${genMissing.length || genCards.length}장`);
  await step('generate.mjs', [`decks/${slug}.json`, ...(FORCE ? ['--force'] : [])]);
} else {
  console.log(`\n[1/4] 이미지 생성 — 전부 있음, 건너뜀`);
}

// ── 2. 게임 촬영 ─────────────────────────────────────────────
//  img 가 shots/ 로 시작하는 카드가 대상. 파일명이 곧 샷 이름이다.
const shotNames = [...new Set(cards
  .map(c => c.img)
  .filter(p => p && p.startsWith('shots/'))
  .map(p => basename(p).replace(/\.png$/, '')))];
const shotMissing = [];
for (const n of shotNames) {
  if (FORCE || !await exists(resolve(HERE, 'shots', `${n}.png`))) shotMissing.push(n);
}
if (shotMissing.length) {
  console.log(`\n[2/4] 게임 촬영 — ${shotMissing.join(', ')}`);
  console.log(`      ⚠️ 로컬 서버가 떠 있어야 한다: python3 scripts/serve.py ${PORT}`);
  await step('shoot.mjs', [PORT, ...shotMissing]);
} else {
  console.log(`\n[2/4] 게임 촬영 — 전부 있음, 건너뜀 (${shotNames.length}컷)`);
}

// ── 3. 카드 합성 ─────────────────────────────────────────────
console.log(`\n[3/4] 카드 합성`);
await step('deck.mjs', [`decks/${slug}.json`]);

// ── 4. theme 실측 검사 ───────────────────────────────────────
//  밝은 잔디에 어두운 스크림을 씌우면 흙탕물처럼 탁해진다.
//  눈대중으로 고른 theme 이 실측과 맞는지 확인한다(임계 85).
console.log(`\n[4/4] theme 실측 검사`);
try {
  await step('theme.mjs', [slug]);
} catch (e) {
  console.log(`  ⚠️ theme 검사 실패(치명적이지 않음): ${e.message.split('\n')[0]}`);
}

console.log(`\n✅ out/${slug}/ 완성`);
console.log(`   카드를 확인한 뒤 큐에 넣기: node publish.mjs ${slug} --queue`);
