// =============================================================
//  🍎 iOS 앱 아이콘 — App Store 규격 1024×1024, PNG, 정사각·불투명(알파 금지 — 있으면 업로드 거절)
//  그림 정의는 scripts/lib/icon-art.mjs (앱인토스·favicon·PWA 와 같은 소스). iOS 가 모서리를 깎으므로 pad 로 안쪽에.
//  Xcode 단일 크기 AppIcon(AppIcon-512@2x.png, Contents.json 은 cap add ios 기본값 그대로)을 덮어쓴다.
//  사용: node scripts/make-ios-icon.mjs
// =============================================================
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, iconPNG } from './lib/icon-art.mjs';

const OUT = path.join(ROOT, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
writeFileSync(OUT, iconPNG(1024, { round: false, pad: 0.88 }));
console.log('[make-ios-icon] ' + path.relative(ROOT, OUT) + ' 생성 완료 (1024×1024)');
