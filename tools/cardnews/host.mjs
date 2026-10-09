// =============================================================
//  calm forest · 🗂️ 카드 JPEG → 공개 URL (Cloudflare Workers KV)
//  ------------------------------------------------------------
//  왜 KV 인가:
//    Meta 는 컨테이너 생성 시점에 image_url 을 한 번 긁어가 자기 복사본을 만든다.
//    URL 은 발행 직전 몇 분만 살아 있으면 되므로 영구 스토리지가 필요 없다.
//    KV 는 (1) 활성화 절차가 없고 (2) 업로드가 기존 wrangler 로그인을 그대로 쓰며
//    (3) --ttl 로 발행 뒤 알아서 지워진다 — 새 시크릿이 0개다.
//
//  사용: node host.mjs deck-01
// =============================================================
import { execFile } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');          // wrangler.jsonc 가 있는 저장소 루트
export const BASE_URL = process.env.CARDNEWS_BASE || 'https://calmforest.cloud';
// 30일. 발행 주기가 3일이라 큐에 N개 쌓이면 마지막 카드 묶음은 3N일 뒤에 나간다 —
// 7일로 두면 큐 3번째(9일 뒤)부터 이미지가 먼저 사라진다.
// 카드 묶음 하나가 ~600KB 라 10개를 물고 있어도 6MB(KV 무료 1GB)라 넉넉히 잡는다.
const TTL = Number(process.env.CARDNEWS_TTL || 2592000);

/** 캐러셀 영상 카드인가(파일·URL 둘 다) — 인스타·Threads 둘 다 VIDEO 컨테이너로 따로 만든다 */
export const isVideo = (p) => /\.mp4$/i.test(p);

/** out/<slug>/NN.jpg · NN.mp4 를 번호순으로. 렌더 결과가 없으면 멈춘다
 *  영상 카드(NN.mp4)는 레코들리 녹화처럼 deck.mjs 밖에서 만든 걸 번호에 맞춰 넣는다(deck-03). */
export async function deckFiles(slug) {
  const dir = resolve(HERE, 'out', slug);
  let names;
  try { names = await readdir(dir); }
  catch { throw new Error(`렌더 결과가 없다: ${dir}\n  → node deck.mjs decks/${slug}.json`); }
  const cards = names.filter(n => /^\d{2}\.(jpg|mp4)$/.test(n)).sort();
  if (!cards.length) throw new Error(`${dir} 에 NN.jpg·NN.mp4 가 없다(PNG 만 있으면 deck.mjs 를 다시 돌릴 것)`);
  const nums = cards.map(n => n.slice(0, 2));
  const dup = nums.find((n, i) => nums.indexOf(n) !== i);
  if (dup) throw new Error(`${dir} 에 ${dup} 번 카드가 두 개다(jpg·mp4 중 하나만 둘 것)`);
  return cards.map(n => resolve(dir, n));
}

/** KV 에 올리고 공개 URL 을 돌려준다. 하나라도 실패하면 즉시 throw */
export async function hostDeck(slug, { ttl = TTL } = {}) {
  const files = await deckFiles(slug);
  const urls = [];
  for (const file of files) {
    const key = `${slug}/${basename(file)}`;
    const { size } = await stat(file);
    // 인스타 이미지 상한 8MB · 영상은 KV 값 상한 25MiB 가 더 빡빡하다. 넘으면 발행 단계에서야 터지므로 여기서 막는다.
    const cap = isVideo(file) ? 25 : 8;
    if (size > cap * 1024 * 1024) throw new Error(`${key} 가 ${(size / 1048576).toFixed(1)}MB — 상한 ${cap}MB 초과`);
    await run('npx', [
      'wrangler', 'kv', 'key', 'put', key,
      '--binding', 'CARDNEWS',
      '--path', file,
      '--ttl', String(ttl),
      '--remote',
    ], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
    const url = `${BASE_URL}/cardnews/${key}`;
    console.log(`  ↑ ${key}  ${(size / 1024).toFixed(0)}KB  →  ${url}`);
    urls.push(url);
  }
  return urls;
}

/** 릴스 mp4 한 편을 KV 에 올리고 공개 URL 을 돌려준다.
 *  ⚠️ KV 값 상한이 25MiB 다. 넘으면 wrangler 가 애매한 오류를 뱉으므로 여기서 막는다.
 *     (30초 720p 가 7~8MB 라 여유가 있지만, 길이를 늘리면 금방 닿는다) */
export async function hostReel(slug, file, { ttl = TTL } = {}) {
  const abs = resolve(HERE, file);
  const { size } = await stat(abs);
  if (size > 25 * 1024 * 1024) {
    throw new Error(`${basename(abs)} 가 ${(size / 1048576).toFixed(1)}MB — KV 값 상한 25MiB 초과`);
  }
  const key = `${slug}/${basename(abs)}`;
  await run('npx', [
    'wrangler', 'kv', 'key', 'put', key,
    '--binding', 'CARDNEWS',
    '--path', abs,
    '--ttl', String(ttl),
    '--remote',
  ], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
  const url = `${BASE_URL}/cardnews/${key}`;
  console.log(`  ↑ ${key}  ${(size / 1048576).toFixed(1)}MB  →  ${url}`);
  return url;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slug = process.argv[2];
  if (!slug) { console.error('사용: node host.mjs <묶음이름>   예) node host.mjs deck-01'); process.exit(1); }
  const urls = await hostDeck(slug);
  console.log(`\n${urls.length}장 업로드 완료 (TTL ${TTL}초)`);
}
