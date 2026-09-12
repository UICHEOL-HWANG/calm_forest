// =============================================================
//  calm forest · 📤 인스타그램 캐러셀 발행
//  ------------------------------------------------------------
//  node publish.mjs deck-01              ← 리허설(기본). 아무것도 안 나간다
//  node publish.mjs deck-01 --queue      ← 검수 통과 → 큐에 넣는다(크론이 사흘 간격으로 꺼내 씀)
//  node publish.mjs deck-01 --publish    ← 지금 당장 발행
//
//  발행은 되돌릴 수 없다(삭제해도 팔로워 타임라인엔 이미 떴다).
//  그래서 기본값을 리허설로 두고, 실제 발행은 플래그를 명시해야만 한다.
//
//  절차(Meta 규격):
//    1. 카드마다 컨테이너 생성 (is_carousel_item=true)
//    2. 자식들을 묶어 부모 캐러셀 컨테이너 생성 (+캡션)
//    3. 부모가 FINISHED 될 때까지 폴링
//    4. media_publish
// =============================================================
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ig, me, quota, sleep } from './ig.mjs';
import { hostDeck } from './host.mjs';
import { enqueue } from './queue.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const slug = process.argv[2];
const DO_PUBLISH = process.argv.includes('--publish');
const DO_QUEUE   = process.argv.includes('--queue');

if (!slug) {
  console.error('사용: node publish.mjs <묶음이름> [--queue | --publish]');
  process.exit(1);
}

const deck = JSON.parse(await readFile(resolve(HERE, 'decks', `${slug}.json`), 'utf-8'));

// 🚫 이미 발행된 카드 묶음은 다시 올리지 않는다.
//    deck-01 은 사용자가 인스타에 손으로 올린 카드 묶음이다. 파이프라인이 그걸 모르면
//    테스트 한 번에 같은 게시물이 두 번 뜬다 — 발행은 되돌릴 수 없다.
//    사람 기억이 아니라 카드 묶음 JSON 의 publishedAt 이 판단한다.
if (deck.publishedAt) {
  console.error(`⛔ ${slug} 는 이미 발행됨 (${deck.publishedAt})` +
    (deck.publishedNote ? `\n   ${deck.publishedNote}` : '') +
    `\n   정말 다시 올리려면 decks/${slug}.json 의 publishedAt 을 지울 것.`);
  process.exit(1);
}

// 캡션이 없으면 멈춘다. 빈 캡션으로 나가면 되돌릴 수 없다.
const caption = (deck.caption || '').trim();
if (!caption) {
  console.error(`decks/${slug}.json 에 "caption" 이 없다. 캡션 없이 발행하지 않는다.`);
  process.exit(1);
}
if (caption.length > 2200) {
  console.error(`캡션이 ${caption.length}자 — 인스타 상한 2200자 초과`);
  process.exit(1);
}

// ── 1. 계정·한도 확인 ────────────────────────────────────────
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

// ── 2. 이미지 호스팅 ─────────────────────────────────────────
console.log(`\n이미지 업로드 → KV`);
const urls = await hostDeck(slug);
if (urls.length < 2 || urls.length > 10) {
  console.error(`캐러셀은 2~10장이다. 현재 ${urls.length}장`);
  process.exit(1);
}

// KV 는 최종적 일관성이라 방금 쓴 키가 전 지역에 퍼지는 데 시간이 걸린다.
// Meta 가 404 를 받으면 컨테이너가 ERROR 로 죽으므로, 우리가 먼저 확인한다.
console.log(`\nURL 도달 확인`);
for (const url of urls) {
  let ok = false;
  for (let i = 0; i < 10 && !ok; i++) {
    const r = await fetch(url, { method: 'GET', headers: { range: 'bytes=0-0' } });
    ok = r.ok || r.status === 206;
    if (!ok) await sleep(3000);
  }
  if (!ok) { console.error(`  ✗ ${url} — 30초 동안 안 올라옴. 워커가 배포됐는지 확인할 것`); process.exit(1); }
  console.log(`  ✓ ${url}`);
}

// ── 3. 리허설이면 여기서 멈춘다 ───────────────────────────────
console.log(`\n─── 캡션 (${caption.length}자) ───\n${caption}\n──────────────────`);
// 큐에 넣기 — 검수를 통과한 카드 묶음만 여기로 온다. 크론은 큐에 있는 걸 묻지 않고 올린다.
if (DO_QUEUE) {
  const n = await enqueue({ slug, caption, urls });
  console.log(`\n📥 큐에 넣었다. 대기 ${n}개.\n   사흘 간격으로 크론이 하나씩 꺼내 올린다.`);
  process.exit(0);
}

if (!DO_PUBLISH) {
  console.log(`\n✋ 리허설이라 아무것도 안 나갔다.\n` +
    `   큐에 넣기 : node publish.mjs ${slug} --queue\n` +
    `   지금 발행 : node publish.mjs ${slug} --publish`);
  process.exit(0);
}

// ── 4. 자식 컨테이너 ─────────────────────────────────────────
console.log(`\n컨테이너 생성`);
const children = [];
for (const [i, image_url] of urls.entries()) {
  const { id } = await ig('/me/media', { image_url, is_carousel_item: true }, 'POST');
  console.log(`  ${String(i + 1).padStart(2, '0')}  ${id}`);
  children.push(id);
}

// ── 5. 부모 캐러셀 ───────────────────────────────────────────
const { id: parent } = await ig('/me/media', {
  media_type: 'CAROUSEL', children: children.join(','), caption,
}, 'POST');
console.log(`부모 캐러셀  ${parent}`);

// ── 6. 준비될 때까지 폴링 ────────────────────────────────────
for (let i = 0; ; i++) {
  const s = await ig(`/${parent}`, { fields: 'status_code,status' });
  if (s.status_code === 'FINISHED') break;
  if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
    console.error(`컨테이너 ${s.status_code}: ${s.status || ''}`);
    process.exit(1);
  }
  if (i >= 40) { console.error('2분 넘게 IN_PROGRESS — 중단'); process.exit(1); }
  process.stdout.write('.');
  await sleep(3000);
}
console.log('\n준비 완료');

// ── 7. 발행 ──────────────────────────────────────────────────
const { id: mediaId } = await ig('/me/media_publish', { creation_id: parent }, 'POST');
const { permalink } = await ig(`/${mediaId}`, { fields: 'permalink' });
console.log(`\n🎉 발행 완료\n   ${permalink}`);
