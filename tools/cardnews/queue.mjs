// =============================================================
//  calm forest · 📥 발행 큐 (Workers KV 의 state 키 하나)
//  ------------------------------------------------------------
//  크론이 읽는 것과 **같은 키**를 로컬에서 쓴다. 두 구현이 어긋나면
//  큐가 조용히 비어 보이므로 형태를 여기 한 곳에 적어 둔다:
//
//    { lastPublishedAt: "2026-09-11" | null,
//      lastSlug:        "deck-02"    | null,
//      queue: [ { slug, caption, urls: [ ...7개 ] } ] }
//
//  wrangler 로그인을 그대로 쓴다 — 새 자격증명이 없다.
// =============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

const run = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const KEY = 'state';
const EMPTY = { lastPublishedAt: null, lastSlug: null, queue: [] };

const kv = (args) => run('npx', ['wrangler', 'kv', 'key', ...args, '--binding', 'CARDNEWS', '--remote'],
                         { cwd: ROOT, maxBuffer: 8 * 1024 * 1024 });

export async function loadState() {
  try {
    const { stdout } = await kv(['get', KEY]);
    return JSON.parse(stdout);
  } catch {
    // 키가 없으면 wrangler 가 실패한다. 첫 실행이라는 뜻이지 오류가 아니다.
    return { ...EMPTY };
  }
}

export async function saveState(state) {
  // --path 로 넘긴다. 인자로 주면 캡션(줄바꿈·해시태그)이 셸을 타면서 깨진다.
  const dir = await mkdtemp(resolve(tmpdir(), 'cardnews-'));
  const file = resolve(dir, 'state.json');
  await writeFile(file, JSON.stringify(state), 'utf-8');
  try { await kv(['put', KEY, '--path', file]); }
  finally { await unlink(file).catch(() => {}); }
}

/** 같은 카드 묶음을 두 번 넣지 않는다. 두 번 넣으면 사흘 간격으로 같은 글이 두 번 뜬다. */
export async function enqueue(deck) {
  const state = await loadState();
  state.queue = state.queue || [];
  if (state.queue.some(d => d.slug === deck.slug)) {
    throw new Error(`${deck.slug} 는 이미 큐에 있다. 빼려면 KV 의 state 키를 직접 고칠 것.`);
  }
  if (state.lastSlug === deck.slug) {
    throw new Error(`${deck.slug} 는 이미 발행됐다(${state.lastPublishedAt}).`);
  }
  state.queue.push(deck);
  await saveState(state);
  return state.queue.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const s = await loadState();
  console.log(`마지막 발행 : ${s.lastSlug || '(없음)'} · ${s.lastPublishedAt || '(없음)'}`);
  console.log(`대기 중     : ${s.queue?.length || 0}개`);
  for (const [i, d] of (s.queue || []).entries()) {
    console.log(`  ${i + 1}. ${d.slug} · 카드 ${d.urls?.length || 0}장 · 캡션 ${d.caption?.length || 0}자`);
  }
}
