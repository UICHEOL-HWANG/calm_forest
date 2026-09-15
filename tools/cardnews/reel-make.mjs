// =============================================================
//  calm forest · 🎬 쇼츠 한 편 만들기 (생성 → 녹화 → 조립)
//  ------------------------------------------------------------
//  node reel-make.mjs reel-02 [--force]
//
//  역할 분담:
//    사람  — decks/<이름>.json 에 주제·컷 수·프롬프트·자막·캡션을 쓴다
//    도구  — 그걸 읽어 Flow 생성·게임 녹화·조립까지 한다
//    사람  — 결과를 보고 node publish-reel.mjs <이름> --publish
//
//  ⚠️ 발행은 자동화하지 않는다. 두 번 데었다 —
//     (1) AI 영상이 엉뚱한 동물을 그렸고(다람쥐↔여우)
//     (2) 인스타 토큰이 막혀 있는 걸 발행 직전에야 알았다.
//     사람이 한 번은 봐야 한다.
//
//  ⚠️ 이미 만든 컷은 건너뛴다. Flow 크레딧이 하루 50개(편당 10)뿐이라
//     중간에 멈췄을 때 처음부터 다시 태우면 하루치가 날아간다.
//     다시 만들려면 --force.
// =============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
let slug = argv.find(a => !a.startsWith('--'));
const FORCE = argv.includes('--force');

/** 아직 발행되지 않은 reel deck 중 가장 앞선 것을 고른다.
 *  4일 주기 루틴이 쓴다 — 사람이 미리 써 둔 deck 을 집어다 만든다.
 *  준비된 게 없으면 만들 것도 없다(주제·프롬프트는 사람이 쓴다). */
async function pickNext() {
  const dir = resolve(HERE, 'decks');
  const names = (await readdir(dir))
    .filter(f => /^reel-.*\.json$/.test(f))
    .sort();
  for (const f of names) {
    const spec = JSON.parse(await readFile(resolve(dir, f), 'utf-8'));
    if (spec.publishedAt) continue;                 // 이미 나간 것
    if (!Array.isArray(spec.cuts) || !spec.cuts.length) continue;
    return f.replace(/\.json$/, '');
  }
  return null;
}

if (!slug && argv.includes('--next')) {
  slug = await pickNext();
  if (!slug) {
    console.log('준비된 쇼츠 deck 이 없다 — decks/reel-NN.json 에 cuts 를 먼저 쓸 것');
    process.exit(0);                                 // 실패가 아니다. 할 일이 없을 뿐
  }
  console.log(`다음 deck: ${slug}`);
}

if (!slug) {
  console.error('사용: node reel-make.mjs <이름> [--force]');
  console.error('      node reel-make.mjs --next        (발행 안 된 deck 자동 선택)');
  process.exit(1);
}

const spec = JSON.parse(await readFile(resolve(HERE, 'decks', `${slug}.json`), 'utf-8'));
if (!Array.isArray(spec.cuts) || !spec.cuts.length) {
  throw new Error(`decks/${slug}.json 에 cuts 배열이 없다`);
}

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

await mkdir(resolve(HERE, 'clips', slug), { recursive: true });

// ── 컷마다 생성 또는 녹화 ─────────────────────────────────────
for (const [i, cut] of spec.cuts.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const rel = cut.file || `clips/${slug}/${n}.mp4`;
  const abs = resolve(HERE, rel);

  if (!FORCE && await exists(abs)) {
    console.log(`\n[${n}] 이미 있음 — 건너뜀 (${rel})`);
    continue;
  }

  if (cut.record !== undefined) {
    // 게임 플레이 실물 컷. ⚠️ 창을 띄워야 GPU 합성이 돌아 프레임이 나온다
    console.log(`\n[${n}] 게임 녹화`);
    await step('record.mjs', ['--out', rel, '--secs', String(cut.secs ?? 6),
                              '--q', cut.record || 'weather=clear&time=0.46']);
  } else {
    if (!cut.prompt) throw new Error(`cuts[${i}] 에 prompt 도 record 도 없다`);
    console.log(`\n[${n}] Flow 생성 (크레딧 10)`);
    await step('flow.mjs', ['--ref', cut.ref || 'shots/_ref_fox.png',
                            '--prompt', cut.prompt, '--out', rel]);
  }
}

// ── 조립 ─────────────────────────────────────────────────────
const outRel = spec.file || `out/${slug}/reel.mp4`;
console.log(`\n조립`);
await step('reel.mjs', ['--deck', slug, '--out', outRel]);

console.log(`\n✅ ${outRel}`);
console.log(`   확인한 뒤 발행: node publish-reel.mjs ${slug} --publish`);
