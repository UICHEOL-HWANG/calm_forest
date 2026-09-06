// =============================================================
//  앱인토스 배포 설정 — `ait build`가 webBundleDir 를 .ait 번들로 포장
//  (webBundleDir 는 scripts/build-ait.mjs 가 생성 — 토스 플랫폼 플래그 주입본)
//  appName 은 앱인토스 콘솔의 앱 이름과 일치해야 합니다.
// =============================================================
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'calmforest',   // 앱인토스 콘솔의 앱 이름
  brand: {
    primaryColor: '#3182F6',   // 화면에 노출될 앱 기본 색상
  },
  permissions: [],
  webBundleDir: 'dist-toss',
});
