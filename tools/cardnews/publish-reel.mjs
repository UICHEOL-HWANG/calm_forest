// =============================================================
//  calm forest · 🎬 인스타그램 릴스 발행
//  ------------------------------------------------------------
//  node publish-reel.mjs reel-01              ← 리허설(기본). 아무것도 안 나간다
//  node publish-reel.mjs reel-01 --publish    ← 지금 당장 발행
//
//  발행은 되돌릴 수 없다(삭제해도 팔로워 타임라인엔 이미 떴다).
//  그래서 기본값을 리허설로 두고, 실제 발행은 플래그를 명시해야만 한다.
//  — publish.mjs(캐러셀)와 같은 원칙이다.
//
//  절차(Meta 규격):
//    1. media_type=REELS + video_url 로 컨테이너 생성 (+캡션)
//    2. FINISHED 될 때까지 폴링 — ⚠️ 영상은 이미지보다 훨씬 오래 걸린다
//    3. media_publish
//
//  ⚠️ 캐러셀과 달리 자식 컨테이너가 없다. 컨테이너 하나가 곧 게시물이다.
// =============================================================
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ig, me, quota, sleep } from './ig.mjs';
import { hostReel, BASE_URL } from './host.mjs';
import { threadsToken, publishThreadsVideo, toThreadsText, THREADS_TEXT_MAX } from './threads.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
const DO_PUBLISH = process.argv.includes('--publish');
// 인스타는 나갔는데 Threads 만 실패했을 때 Threads 만 다시 올린다
const THREADS_ONLY = process.argv.includes('--threads-only');

if (!slug) {
  console.error('사용: node publish-reel.mjs <이름> [--publish]');
  process.exit(1);
}

const specPath = resolve(HERE, 'decks', `${slug}.json`);
const spec = JSON.parse(await readFile(specPath, 'utf-8'));

// 🚫 이미 발행된 건 다시 올리지 않는다. 사람 기억이 아니라 JSON 이 판단한다.
if (THREADS_ONLY) {
  if (!spec.publishedAt) { console.error(`⛔ ${slug} 는 인스타에 아직 안 나갔다. --threads-only 는 인스타 발행 뒤에만 쓴다.`); process.exit(1); }
  if (spec.threadsPublishedAt) {
    console.error(`⛔ ${slug} 는 Threads 에 이미 발행됨 (${spec.threadsPublishedAt})\n   ${spec.threadsPermalink || ''}`);
    process.exit(1);
  }
} else if (spec.publishedAt) {
  console.error(`⛔ ${slug} 는 이미 발행됨 (${spec.publishedAt})` +
    `\n   정말 다시 올리려면 decks/${slug}.json 의 publishedAt 을 지울 것.` +
    (spec.threadsPublishedAt ? '' : `\n   Threads 만 빠졌다면: node publish-reel.mjs ${slug} --threads-only`));
  process.exit(1);
}

const caption = (spec.caption || '').trim();
if (!caption) { console.error(`decks/${slug}.json 에 caption 이 없다.`); process.exit(1); }
if (caption.length > 2200) {
  console.error(`캡션이 ${caption.length}자 — 인스타 상한 2200자 초과`); process.exit(1);
}
if (!spec.file) { console.error(`decks/${slug}.json 에 file 이 없다.`); process.exit(1); }

// Threads 본문은 500자 상한 — decks/<slug>.json 의 threadsText 가 있으면 그걸, 없으면 캡션을 줄인다.
const threadsText = (spec.threadsText || toThreadsText(caption)).trim();
if (threadsText.length > THREADS_TEXT_MAX) {
  console.error(`threadsText 가 ${threadsText.length}자 — Threads 상한 ${THREADS_TEXT_MAX}자 초과`);
  process.exit(1);
}

/**
 * 같은 영상을 Threads 에도 올리고 재발행 방지 표시를 남긴다.
 * 실패해도 던지지 않는다 — 인스타는 이미 나갔고, 재시도는 --threads-only 로 Threads 만 한다.
 */
async function postToThreads(videoUrl) {
  if (!(await threadsToken())) {
    console.log(`\n🧵 Threads 건너뜀 — 토큰 없음 (~/.config/calmforest/threads_token)`);
    return;
  }
  try {
    console.log(`\n🧵 Threads 업로드 (인코딩 대기, 최대 5분)`);
    // 게임 링크는 프로필이 아니라 첫 댓글로 단다 — 덱에 threadsReply 가 있으면 그 문구, 없으면 기본 문구
    const link = await publishThreadsVideo({ videoUrl, text: threadsText, replyText: spec.threadsReply });
    console.log(`🧵 Threads 발행 완료\n   ${link}`);
    spec.threadsPublishedAt = new Date().toISOString().slice(0, 10);
    spec.threadsPermalink = link;
    await writeFile(specPath, JSON.stringify(spec, null, 2) + '\n');
    console.log(`   decks/${slug}.json 에 threadsPublishedAt 기록`);
  } catch (e) {
    console.error(`\n⚠️ Threads 발행 실패 (인스타는 나갔다): ${e.message}\n   Threads 만 재시도: node publish-reel.mjs ${slug} --threads-only`);
    process.exitCode = 1;
  }
}

if (THREADS_ONLY) {
  // 영상은 인스타 발행 때 이미 KV 에 올라가 있다(TTL 30일). 다시 올리지 않고 같은 URL 을 쓴다.
  await postToThreads(`${BASE_URL}/cardnews/${slug}/${basename(spec.file)}`);
  process.exit(process.exitCode ?? 0);
}

// ── 1. 계정·한도 ─────────────────────────────────────────────
const acct = await me();
console.log(`계정  @${acct.username} (${acct.account_type}) · 게시물 ${acct.media_count}개`);
try {
  const q = await quota();
  const used = q?.data?.[0]?.quota_usage ?? 0;
  const cap = q?.data?.[0]?.config?.quota_total ?? 100;
  console.log(`한도  24시간 ${used}/${cap}건 사용`);
  if (used >= cap) { console.error('발행 한도 소진 — 24시간 뒤에 다시'); process.exit(1); }
} catch (e) {
  console.log(`한도  확인 실패(무시하고 진행): ${e.message}`);
}

// ── 2. 영상 호스팅 ───────────────────────────────────────────
console.log(`\n영상 업로드 → KV`);
const video_url = await hostReel(slug, spec.file);

// ── 3. 도달 확인 ─────────────────────────────────────────────
//  KV 는 최종적 일관성이라 방금 쓴 키가 퍼지는 데 시간이 걸린다.
//  Meta 가 404 를 받으면 컨테이너가 ERROR 로 죽으므로 우리가 먼저 확인한다.
//  ⚠️ 영상 페처는 Range 를 쓴다 — 206 이 오는지까지 본다.
console.log(`\nURL 도달 확인`);
let ok = false;
for (let i = 0; i < 12 && !ok; i++) {
  const r = await fetch(video_url, { headers: { range: 'bytes=0-1023' } });
  ok = r.status === 206;
  if (ok) {
    console.log(`  ✓ ${r.status} ${r.headers.get('content-type')} · ` +
                `range ${r.headers.get('content-range')}`);
  } else {
    if (i === 0) console.log(`  … ${r.status} (전파 대기)`);
    await sleep(3000);
  }
}
if (!ok) {
  console.error(`  ✗ ${video_url} — Range 응답(206)이 안 온다.\n` +
                `    워커가 배포됐는지 확인할 것 (functions/cardnews-img.js 의 mp4·Range 지원)`);
  process.exit(1);
}

// ── 4. 리허설이면 여기서 멈춘다 ───────────────────────────────
console.log(`\n─── 캡션 (${caption.length}자) ───\n${caption}\n──────────────────`);
console.log(`\n─── Threads 본문 (${threadsText.length}/${THREADS_TEXT_MAX}자) ───\n${threadsText}\n──────────────────`);
if (!DO_PUBLISH) {
  console.log(`\n✋ 리허설이라 아무것도 안 나갔다.\n` +
    `   지금 발행 : node publish-reel.mjs ${slug} --publish`);
  process.exit(0);
}

// ── 5. 컨테이너 생성 ─────────────────────────────────────────
console.log(`\n컨테이너 생성 (REELS)`);
const { id: container } = await ig('/me/media', {
  media_type: 'REELS', video_url, caption,
}, 'POST');
console.log(`  ${container}`);

// ── 6. 준비될 때까지 폴링 ────────────────────────────────────
//  ⚠️ 영상 인코딩이 있어 캐러셀(2분)보다 훨씬 오래 걸린다. 5분 준다.
console.log(`인코딩 대기`);
for (let i = 0; ; i++) {
  const s = await ig(`/${container}`, { fields: 'status_code,status' });
  if (s.status_code === 'FINISHED') break;
  if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
    console.error(`\n컨테이너 ${s.status_code}: ${s.status || ''}`);
    process.exit(1);
  }
  if (i >= 100) { console.error('\n5분 넘게 IN_PROGRESS — 중단'); process.exit(1); }
  process.stdout.write('.');
  await sleep(3000);
}
console.log('\n준비 완료');

// ── 7. 발행 ──────────────────────────────────────────────────
const { id: mediaId } = await ig('/me/media_publish', { creation_id: container }, 'POST');
const { permalink } = await ig(`/${mediaId}`, { fields: 'permalink' });
console.log(`\n🎉 발행 완료\n   ${permalink}`);

// 재발행 방지 표시를 남긴다 — 사람 기억에 맡기지 않는다
spec.publishedAt = new Date().toISOString().slice(0, 10);
spec.permalink = permalink;
await writeFile(specPath, JSON.stringify(spec, null, 2) + '\n');
console.log(`   decks/${slug}.json 에 publishedAt 기록`);

// ── 8. Threads — 같은 영상 URL 을 그대로 쓴다 ─────────────────
await postToThreads(video_url);
