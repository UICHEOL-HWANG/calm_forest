# 남은 일 (2026-09-19 세션 종료 시점)

## 🌿 리텐션 안내 배너 — 켜기 전에 할 일
`js/tuning.js` 의 `retentionGuidance.enabled` 가 **false** 다. 켜기 전에:

1. **한국어 문구 10종 검수** — `js/retention-guidance.js` 126~179줄
   "작물이 기다리고 있어요" · "받아둔 부탁이 있어요" · "집을 손볼 수 있어요"
   "물가 쪽도 열려 있어요" · "안개 숲도 둘러볼까요" · "모은 것들을 확인해볼까요"
   "카페 일도 해볼까요" · "과수원도 살펴볼까요" · "이어서 하나만 더 해볼까요"
   "가까운 것부터 해볼까요" · "처음엔 한 가지만 해도 돼요"
2. **i18n 배선** — 모듈에 i18n import 도 t() 도 없다. 문구를 `i18n-en.js` 에 등재하고
   `t()` 로 감싸야 한다. itch 는 영어가 기본이라 안 하면 영어 유저에게 한국어가 뜬다.
3. 그다음 `enabled: true` → 웹·토스·itch 재배포.

## 📦 배포 대기
- **토스**: 라이브 20260919-58(APPROVED). 배너 정리 후 번들 빌드·업로드·검수 제출.
- **itch**: `dist-itch.zip`(0.64MB) 빌드돼 있으나 배너 정리 후 다시 만들 것.
  업로드는 대시보드 수동(butler 미설치).

## 🗂️ 정리 후속
- `dev/active` 에 11개 남음. 판정 기준은 "대응 브랜치가 main 에 병합됐는가".
  브랜치가 없는 것들(feedback-r4·google-play·indoor-decor-v2·instagram-cardnews·
  museum·ops-monitor·tool-tiers)은 사람 판단이 필요하다.
- `android/` 는 아직 미추적. 산출물은 ignore 했지만 twa-manifest.json·build.gradle·
  app/src 설정은 추적할지 결정이 남았다.
- `tools/cardnews/templates/` 3개가 ignore 대상 `docs/beginner-guide/img/` 를 참조한다
  (README 에 경고 기록함).
