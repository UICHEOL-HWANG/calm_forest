// =============================================================
//  앱 아이콘 생성 — assets/brand/bear-25deg-1024.png → assets/brand/icon-600.png
//  앱인토스 콘솔 규격: 600×600, PNG, 정사각(라운딩 불가), 배경 불투명.
//  그림 정의는 scripts/lib/icon-art.mjs (favicon·PWA 아이콘과 같은 소스).
//  콘솔·런처가 아이콘 모서리를 스스로 깎으므로 곰을 pad 만큼 안쪽에 둔다.
//  사용: node scripts/make-icon.mjs
// =============================================================
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, iconPNG } from './lib/icon-art.mjs';

const OUT = path.join(ROOT, 'assets', 'brand', 'icon-600.png');
writeFileSync(OUT, iconPNG(600, { round: false, pad: 0.88 }));
console.log('[make-icon] assets/brand/icon-600.png 생성 완료 (600×600, 정사각·불투명)');
