# 컨텍스트 — PWA

**Last Updated:** 2026-09-10 (검증 완료·지문 대기)

## 핵심 파일
| 파일 | 무엇 |
|------|------|
| `assets/pwa/manifest.webmanifest` | 매니페스트 원본 → 공개 URL `/manifest.webmanifest` |
| `assets/pwa/icon-*.png` | 192/512/maskable-512 → 공개 URL `/icon-*.png` |
| `assets/pwa/assetlinks.json` | → `/.well-known/assetlinks.json` (지문 대기) |
| `assets/brand/icon-maskable.svg` | maskable 원본(안전영역 80% 안에 나무·해) |
| `scripts/make-pwa-icons.mjs` | 헤드리스 Chrome 으로 PNG 렌더(make-icon.mjs 와 같은 방식) |
| `sw.js` · `offline.html` | 루트(스코프 `/`) |
| `index.html` head | `<link rel="manifest">` + SW 등록(web 플랫폼만) |
| `scripts/build-web.mjs` INCLUDE | 배포 화이트리스트 — 여기 없으면 안 올라간다 |
| `scripts/build-ait.mjs` / `build-itch.mjs` | manifest 링크 제거 |
| `tests/pwa.test.mjs` | 매니페스트·아이콘 치수·링크·빌드 포함 검증 |

## 의사결정
- **SW 는 offline.html 만 캐시** — 게임 JS 를 캐시하면 배포 후 옛 코드가 남는 함정(cache-version-cleanup 기록). `_headers` 의 no-cache 정책과 충돌하지 않게 네트워크 우선.
- **SW 등록은 web 플랫폼만** — 토스 웹뷰·itch iframe 은 `window.__APPS_IN_TOSS__`/`__ITCH__` 플래그로 제외.
- **maskable 은 별도 SVG** — 원본 아이콘의 해가 안전영역(중앙 80% 원) 밖에 걸려 원형 마스크에서 잘림.
- **assetlinks 지문은 빈 배열로 두고 배포** — 콘솔에서 키가 나와야 채울 수 있음. 채우기 전엔 TWA 상단에 주소창이 뜨는 게 정상.
- 패키지명 후보: `cloud.calmforest.app`
