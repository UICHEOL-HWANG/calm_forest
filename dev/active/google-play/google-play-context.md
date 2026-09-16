# 컨텍스트 — 구글 플레이 출시

**Last Updated:** 2026-09-11

## 확정 정보 (앱인토스 콘솔 miniapp_get 에서 가져옴 — 플레이에도 그대로 쓴다)
| 항목 | 값 |
|------|-----|
| 앱 이름(한) | 고요한 숲 |
| 앱 이름(영) | Calmforest |
| 패키지명 | `com.cheorish.lab.calmforest` |
| 카테고리 | 게임 > 인디 |
| 키워드 | 힐링 · 쉼터 · 동숲 · 동물의숲 |
| 게임물 등급분류 번호 | 제 GC-CC-NP260903-007호 (전체이용가 ALL) |
| 제작자 등록번호 | GC-DG-NP-26-00285 |
| 등급분류 사업자명 | 황의철 (증명서와 일치해야 함 — 바꾸지 말 것) |
| 짧은 설명(토스) | 나만의 공간을 통한 본격 힐링게임 |

## 툴체인 (이 맥에 설치 완료 2026-09-11)
| 항목 | 경로/버전 |
|------|-----------|
| Bubblewrap CLI | 1.25.0 (전역 npm) |
| JDK | Amazon Corretto 17.0.11 — `~/Library/Java/JavaVirtualMachines/corretto-17.0.11` |
| Android SDK | `~/Library/Android/sdk` (cmdline-tools 19.0 · build-tools 36 · platform 36 · platform-tools) |
| 설치 스크립트 | scratchpad `setup-sdk.sh` (롤백: `rm -rf ~/Library/Android/sdk`) |

## 함정·의사결정
- 🕳️ **jdkPath 는 Contents/Home 을 빼고 적는다** — JdkHelper.js:70 이 macOS 에서 `/Contents/Home/` 을
  직접 붙인다. 붙여서 적으면 경로가 겹쳐 JDK 를 못 찾는다.
- ⚠️ **targetSdk 36 필수** — 2026-08-31 부터 신규 앱은 Android 16 타겟이어야 업로드 통과.
  Bubblewrap 기본값이 낮으면 `twa-manifest.json` 에서 올린다.
- ⚠️ **기기 검증은 Android 10+ 실기기** — 8.0.1 공기계는 불가. 루팅 기기도 불가.
  기기 소유권은 불문(가족 폰 가능), 검증 후엔 기기 불필요.
- ⚠️ **서명 키(keystore)·비밀번호는 저장소 밖**. 커밋 금지. 분실하면 앱 업데이트 영구 불가.
- **지문 2개를 assetlinks 에 넣는다** — 업로드 키 + 플레이 앱 서명 키(콘솔이 재서명).
  앱 서명 키 지문은 AAB 를 콘솔에 올린 뒤에야 나온다 → assetlinks 는 그 뒤 갱신·재배포.
- Bubblewrap CLI 의 `init` 은 인터랙티브 프롬프트라 이 환경에서 막힌다 →
  `twa-manifest.json` 을 직접 쓰거나 @bubblewrap/core API 를 Node 로 호출.

## 참조
- [[google-play-pwa]] 메모 · `dev/active/pwa/` · `assets/pwa/assetlinks.json`
