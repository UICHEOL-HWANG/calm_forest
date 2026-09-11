#!/usr/bin/env node
// =============================================================
//  calm forest · 파비콘 파일 생성기 (의존성 0)
//  ------------------------------------------------------------
//  왜 필요한가: index.html 에 파비콘을 data:image/svg+xml 인라인으로
//  넣어두면 브라우저 탭에는 보이지만, 구글 검색결과 파비콘은 뜨지 않습니다.
//  구글은 크롤러가 따로 GET 할 수 있는 "실제 파일 URL" 만 인정하기 때문.
//  → 여기서 같은 그림을 실제 파일(.svg/.ico/.png)로 굽습니다.
//
//  그림 정의는 scripts/lib/icon-art.mjs 한 곳에만 있습니다
//  (앱인토스 아이콘·PWA 아이콘과 같은 소스 — 마크가 갈라지지 않게).
//
//  사용: node scripts/make-favicon.mjs
//  산출: assets/favicon/ 아래 favicon.svg · favicon.ico(16/32/48) · favicon-96.png · apple-touch-icon.png(180)
//        (배포 시 scripts/build-web.mjs 가 dist 루트로 펴 준다 — 공개 URL 은 /favicon.ico 그대로)
//  (넷 다 build-web.mjs 의 INCLUDE 에 있어야 배포됩니다)
// =============================================================
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, iconPNG, encodeICO, ROUND_RATIO } from './lib/icon-art.mjs';

const ICONS = path.join(ROOT, 'assets', 'favicon');
await mkdir(ICONS, { recursive: true });

// ── favicon.svg ────────────────────────────────────────────────
// 곰은 3D 렌더 래스터라 벡터로 옮길 수 없다. 대신 아이콘 한 장을 192px 로
// 구워 data URI 로 박는다 — 파비콘은 실제로 64px 이하로만 그려지므로 충분.
const EMBED = 192;
const dataURI = 'data:image/png;base64,' + iconPNG(EMBED).toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <title>calm forest</title>
  <image width="64" height="64" href="${dataURI}"/>
</svg>
`;
await writeFile(path.join(ICONS, 'favicon.svg'), svg);

// ── favicon.ico ────────────────────────────────────────────────
// 구글 권장은 48px 의 배수 → 16/32/48 을 한 ico 에 담는다(탭·검색 모두 커버)
const sizes = [16, 32, 48];
await writeFile(path.join(ICONS, 'favicon.ico'),
  encodeICO(sizes.map(size => ({ size, buf: iconPNG(size) }))));

// ── 래스터 원본 + iOS 홈화면 아이콘 ────────────────────────────
// apple-touch 는 iOS 가 스스로 모서리를 깎으므로 정사각으로 굽고,
// 깎이는 만큼 곰을 안쪽으로 들여놓는다(pad).
await writeFile(path.join(ICONS, 'favicon-96.png'), iconPNG(96));
await writeFile(path.join(ICONS, 'apple-touch-icon.png'), iconPNG(180, { round: false, pad: 0.88 }));

console.log(`✅ assets/favicon/ — favicon.svg(${(svg.length / 1024).toFixed(0)}KB) · favicon.ico(${sizes.join('/')}) · favicon-96.png · apple-touch-icon.png 생성`);
console.log(`   라운드 반지름 ${(ROUND_RATIO * 100).toFixed(0)}% · 마크 원본 assets/brand/bear-25deg-1024.png`);
