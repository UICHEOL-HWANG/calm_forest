// =============================================================
//  🤖 구글 플레이 피처 그래픽 생성
//   assets/social/title-source.jpg → assets/social/play-feature.png (1024×500)
//  ------------------------------------------------------------
//  콘솔 규격: 정확히 1024×500 PNG 또는 JPEG, 15MB 이하. 스토어 상단과
//  추천 영역에 깔리는 배너라 텍스트를 새로 얹지 않고 타이틀 렌더를 그대로 쓴다.
//
//  CROP 을 이렇게 잡은 이유 (원본 1363×768 기준):
//   · 가로를 다 쓰고(1363) 세로만 666 으로 줄인다 — 1363/666 = 2.047 ≈ 1024/500.
//   · y 20..686 — 타이틀(y75~) 위에 55px 여백을 두고, 곰 하단(y613)을 담고,
//     반짝이(✦ y689~735)는 프레임 밖으로 보낸다.
//   · 토스 썸네일(2.333:1)보다 세로가 길어 크롭 여유가 조금 더 있다.
//
//  화질: 원본 폭 1363 → 1024 이라 0.75배 축소다. 확대인 토스 썸네일과 달리
//  또렷하게 나온다. 원본이 바뀌면 곰·타이틀·반짝이 위치를 다시 재고 CROP 을 맞출 것.
//
//  사용: node scripts/make-play-feature.mjs
//  업로드: Play Console > 스토어 등록정보 > 그래픽 > 그래픽 이미지
//  ※ 웹 배포물이 아니다 — build-web.mjs 의 INCLUDE 에 넣지 말 것.
// =============================================================
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SRC = path.join(ROOT, 'assets', 'social', 'title-source.jpg');
const OUT = path.join(ROOT, 'assets', 'social', 'play-feature.png');
const TMP_HTML = path.join(ROOT, 'assets', 'social', '_play.html');

const [W, H] = [1024, 500];                    // 플레이 피처 그래픽 규격
const [SRC_W, SRC_H] = [1363, 768];            // 전제하는 원본 크기
const CROP = { x: 0, y: 20, w: 1363, h: 666 };
const MAX_BYTES = 15 * 1024 * 1024;

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
  if (size > MAX_BYTES) throw new Error(`${(size / 1048576).toFixed(2)}MB — 콘솔 상한 15MB 초과`);
  console.log(`[make-play-feature] assets/social/play-feature.png (${W}×${H}, ${(size / 1024).toFixed(0)}KB)`);
  console.log(`   원본 ${SRC_W}×${SRC_H} 에서 x${CROP.x} y${CROP.y} ${CROP.w}×${CROP.h} → ${(scale).toFixed(3)}배 축소`);
} finally {
  rmSync(TMP_HTML, { force: true });
}
