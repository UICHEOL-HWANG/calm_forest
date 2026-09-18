# PWA 갖추기 — 구글 플레이(TWA) 출시 준비

## 목표
calmforest.cloud 를 "설치 가능한 PWA" 기준(manifest + service worker + HTTPS)에 맞춰
PWABuilder/Bubblewrap 이 TWA(Trusted Web Activity) AAB 를 만들 수 있게 한다.

## 범위
1. `manifest.webmanifest` — 이름·standalone·192/512·maskable 아이콘·색
2. 최소 service worker(`/sw.js`) — 오프라인 안내 페이지만 캐시, 게임 자산은 네트워크 그대로
3. `/.well-known/assetlinks.json` 자리 — 지문(SHA-256)은 플레이 콘솔 앱 서명 키 생성 후 채움
4. 빌드 3종(web/toss/itch) 영향 없음 확인 — toss/itch 번들에는 manifest 링크·SW 등록 제외

## 범위 밖
- 스크린샷(manifest.screenshots) — 스토어 등록 단계에서 추가
- 게임 자산 오프라인 캐시 — 코드 캐시 함정(과거 ?v=NN 사고) 재발 방지 위해 하지 않음
