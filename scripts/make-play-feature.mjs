// =============================================================
//  🤖 구글 플레이 피처 그래픽 생성
//   sims/thumbnail-sim.html?v=A → assets/social/play-feature.png (1024×500)
//  ------------------------------------------------------------
//  콘솔 규격: 정확히 1024×500 PNG 또는 JPEG, 15MB 이하.
//  2026-10-06 썸네일 리디자인 A안(게임 안 렌더 · 정면 캐스트 · 로고 패널)을 토스·OG·itch 와
//  같은 렌더러로 굽는다. 렌더러가 뷰포트 크기 = 출력 크기라 크롭이 필요 없다.
//  ⚠️ 2026-10-11 까지는 9/11 원화(title-source.jpg) 크롭을 쓰고 있어 스토어만 옛 캐릭터였다 —
//     썸네일을 바꿀 땐 토스·OG·itch·Play 4곳을 같이 굽는다.
//
//  사용: python3 scripts/serve.py 8797 &   (프로젝트 루트 서빙 · 다른 포트면 FEATURE_PORT=)
//        node scripts/make-play-feature.mjs
//  업로드: Play Console > 스토어 등록정보 > 그래픽 > 그래픽 이미지
//          (또는 Play API featureGraphic — 검토 중엔 changesInReviewBehavior=ERROR_IF_IN_REVIEW)
//  ※ 웹 배포물이 아니다 — build-web.mjs 의 INCLUDE 에 넣지 말 것.
// =============================================================
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../tools/store-shots/cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'social', 'play-feature.png');
const URL = `http://127.0.0.1:${process.env.FEATURE_PORT || 8797}/sims/thumbnail-sim.html?v=A`;
const [W, H] = [1024, 500];                    // 플레이 피처 그래픽 규격
const MAX_BYTES = 15 * 1024 * 1024;

const b = await launch(9346);
try {
  await b.viewport(W, H, { dsf: 1 });
  await b.goto(URL, 1500);
  let ok = false;
  for (let i = 0; i < 60 && !ok; i++) { ok = await b.evaluate(`document.title==='READY'`); if (!ok) await b.sleep(500); }
  if (!ok) throw new Error(`렌더러가 READY 가 안 됨(${URL}) — 서버를 띄웠는지 확인: ${b.logs.slice(-3).join(' | ')}`);
  await b.sleep(600);
  await b.shot(OUT);
  const size = statSync(OUT).size;
  if (size > MAX_BYTES) throw new Error(`${(size / 1048576).toFixed(2)}MB — 콘솔 상한 15MB 초과`);
  console.log(`[make-play-feature] assets/social/play-feature.png (${W}×${H}, ${(size / 1024).toFixed(0)}KB)`);
} finally {
  await b.close();
}
