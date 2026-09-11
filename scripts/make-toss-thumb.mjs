// =============================================================
//  🎮 앱인토스 가로 썸네일 생성
//   assets/social/title-source.jpg → assets/social/toss-thumbnail.png (1932×828)
//  ------------------------------------------------------------
//  콘솔 규격: 정확히 1932×828 PNG, 5MB 이하. 콘솔은 리사이즈·크롭을 해주지
//  않고 1px 만 달라도 거부하므로 여기서 정확히 맞춰 굽는다.
//
//  OG 커버(preview.jpg)와 같은 그림이지만 비율이 달라 크롭이 따로 간다 —
//  OG 1200×630 = 1.905:1 / 토스 1932×828 = 2.333:1.
//
//  CROP 을 이렇게 잡은 이유 (원본 1363×768 기준):
//   · 창 높이 584 = 1363 / 2.3333 — 가로를 다 쓰고 세로만 줄인다.
//   · y 30..614 — 타이틀(y75~) 위에 45px 여백을 두고, 곰 하단(y613)을
//     간신히 담고, 반짝이(✦ y689~735)는 프레임 밖으로 보낸다.
//   · 세 조건이 동시에 만족되는 구간이 좁다. 원본이 바뀌면 다시 잴 것.
//
//  ⚠️ 화질: 원본 폭 1363 → 1932 이라 1.42배 확대가 불가피하다. 원본이
//     얕은 심도의 부드러운 렌더라 견디지만, 1932px 이상으로 다시 렌더한
//     원본이 생기면 그걸 쓰는 편이 낫다.
//
//  사용: node scripts/make-toss-thumb.mjs
//  업로드: 콘솔 MCP image_upload_url → miniapp_update_screenshots
//          (images 의 THUMBNAIL·HORIZONTAL 과 gameInfo.horizontalThumbnailUri
//           양쪽에 같은 주소를 넣어야 한다 — 한쪽만 넣으면 자동검수에서 빠진다)
//  ※ 웹 배포물이 아니다 — build-web.mjs 의 INCLUDE 에 넣지 말 것.
// =============================================================
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = path.join(ROOT, 'assets', 'social', 'title-source.jpg');
const OUT = path.join(ROOT, 'assets', 'social', 'toss-thumbnail.png');
const TMP_HTML = path.join(ROOT, 'assets', 'social', '_toss.html');

const [W, H] = [1932, 828];                    // 앱인토스 가로 썸네일 규격
const [SRC_W, SRC_H] = [1363, 768];            // 전제하는 원본 크기
const CROP = { x: 0, y: 30, w: 1363, h: 584 };
const MAX_BYTES = 5 * 1024 * 1024;

function jpegSize(buf) {                       // SOF 마커에서 크기 읽기
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m))
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('JPEG SOF 마커를 못 찾음');
}

const got = jpegSize(readFileSync(SRC));
if (got.w !== SRC_W || got.h !== SRC_H) {
  console.error(`❌ 원본 크기가 다릅니다: ${got.w}×${got.h} (스크립트 전제 ${SRC_W}×${SRC_H})`);
  console.error('   타이틀·곰·반짝이 위치를 다시 재고 CROP 을 맞춘 뒤 실행하세요.');
  process.exit(1);
}
if (Math.abs(CROP.w / CROP.h - W / H) > 0.005)
  throw new Error(`CROP 비율 ${(CROP.w / CROP.h).toFixed(4)} ≠ 목표 ${(W / H).toFixed(4)} — 그림이 눌립니다`);

const scale = W / CROP.w;
writeFileSync(TMP_HTML, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden}
 .b{width:${W}px;height:${H}px;overflow:hidden;position:relative}
 .b img{position:absolute;width:${(SRC_W * scale).toFixed(2)}px;
   left:${(-CROP.x * scale).toFixed(2)}px;top:${(-CROP.y * scale).toFixed(2)}px}</style>
<div class="b"><img src="file://${SRC}"></div>`);

try {
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', `--window-size=${W},${H}`,
    `--screenshot=${OUT}`, 'file://' + TMP_HTML,
  ], { stdio: 'ignore' });
  const size = statSync(OUT).size;
  if (size > MAX_BYTES) throw new Error(`${(size / 1048576).toFixed(2)}MB — 콘솔 상한 5MB 초과`);
  console.log(`[make-toss-thumb] assets/social/toss-thumbnail.png (${W}×${H}, ${(size / 1024).toFixed(0)}KB)`);
  console.log(`   원본 ${SRC_W}×${SRC_H} 에서 x${CROP.x} y${CROP.y} ${CROP.w}×${CROP.h} → ${(scale).toFixed(3)}배 확대`);
} finally {
  rmSync(TMP_HTML, { force: true });
}
