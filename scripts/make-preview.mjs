// =============================================================
//  🖼️ 링크 미리보기(OG) 커버 생성
//   assets/social/title-source.jpg → assets/social/preview.jpg (1200×630)
//  ------------------------------------------------------------
//  og:image 규격은 1.91:1 (1200×630). 원본(1363×768 = 1.78:1)에서
//  아래 CROP 사각형을 오려낸 뒤 규격으로 줄인다.
//
//  CROP 을 이렇게 잡은 이유:
//   · 우하단 구석에 반짝이(✦) 워터마크가 있다 — 원본 기준 x 1284..1330,
//     y 688..734. 아래를 y<680 에서 끊어 프레임 밖으로 내보낸다.
//   · 가로는 가운데 정렬로 좁힌다(좌우 34px 씩) — 타이틀이 중앙에 남아야 한다.
//     오른쪽만 잘라 반짝이를 빼면 구도가 왼쪽으로 쏠린다.
//
//  포맷이 PNG 가 아니라 JPEG 인 이유: 사진성 3D 렌더라 PNG 는 ~960KB,
//  JPEG q90 은 ~205KB 인데 3배 확대해도 차이가 없다.
//  (더 낮추면 부제 작은 글자에 링잉이 보이기 시작한다)
//
//  사용: node scripts/make-preview.mjs
//  ⚠️ 원본을 새 그림으로 갈면 SRC_W/SRC_H 검사에 걸린다 — 그때 반짝이
//     위치를 다시 재고 CROP 을 고칠 것. 결과는 브라우저에서 우하단에
//     밝은 픽셀이 남았는지 확인해 검증한다.
//  ⚠️ 파일명을 바꾸면 index.html·dashboards 의 og:image/twitter:image,
//     build-web.mjs 의 INCLUDE, serve.py 의 ROOT_ASSET_ALIASES 를 같이 고칠 것.
// =============================================================
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = path.join(ROOT, 'assets', 'social', 'title-source.jpg');
const OUT = path.join(ROOT, 'assets', 'social', 'preview.jpg');
const TMP_HTML = path.join(ROOT, 'assets', 'social', '_render.html');
const TMP_PNG = path.join(ROOT, 'assets', 'social', '_render.png');

const [W, H, QUALITY] = [1200, 630, 90];      // og:image 규격
const [SRC_W, SRC_H] = [1363, 768];           // 전제하는 원본 크기
const CROP = { x: 34, y: 0, w: 1295, h: 680 };// 원본에서 오려낼 사각형

// ── JPEG 머리말에서 크기 읽기 (SOF 마커) ───────────────────────
// 원본이 바뀐 걸 모른 채 엉뚱하게 자르는 사고를 막으려는 안전장치.
function jpegSize(buf) {
  let i = 2;                                   // SOI 건너뜀
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
      return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error('JPEG SOF 마커를 못 찾음');
}

const got = jpegSize(readFileSync(SRC));
if (got.w !== SRC_W || got.h !== SRC_H) {
  console.error(`❌ 원본 크기가 다릅니다: ${got.w}×${got.h} (스크립트 전제 ${SRC_W}×${SRC_H})`);
  console.error('   반짝이 워터마크 위치를 다시 재고 CROP 을 맞춘 뒤 실행하세요.');
  process.exit(1);
}

const ratio = (CROP.w / CROP.h).toFixed(4), want = (W / H).toFixed(4);
if (Math.abs(CROP.w / CROP.h - W / H) > 0.005)
  throw new Error(`CROP 비율 ${ratio} 가 목표 ${want} 와 다릅니다 — 그림이 눌립니다`);

// 오려낸 영역이 정확히 W×H 로 놓이도록 이미지를 확대·이동
const scale = W / CROP.w;
writeFileSync(TMP_HTML, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;overflow:hidden}
 .og{width:${W}px;height:${H}px;overflow:hidden;position:relative}
 .og img{position:absolute;width:${(SRC_W * scale).toFixed(2)}px;
   left:${(-CROP.x * scale).toFixed(2)}px;top:${(-CROP.y * scale).toFixed(2)}px}</style>
<div class="og"><img src="file://${SRC}"></div>`);

try {
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', `--window-size=${W},${H}`,
    `--screenshot=${TMP_PNG}`, 'file://' + TMP_HTML,
  ], { stdio: 'ignore' });
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', String(QUALITY),
    TMP_PNG, '--out', OUT], { stdio: 'ignore' });
  console.log(`[make-preview] assets/social/preview.jpg (${W}×${H}, q${QUALITY}, ${(statSync(OUT).size / 1024).toFixed(0)}KB)`);
  console.log(`   원본 ${SRC_W}×${SRC_H} 에서 x${CROP.x} y${CROP.y} ${CROP.w}×${CROP.h} 를 오려냄 (반짝이 제외)`);
} finally {
  rmSync(TMP_HTML, { force: true });
  rmSync(TMP_PNG, { force: true });
}
