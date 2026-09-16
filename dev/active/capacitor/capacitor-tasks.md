# 체크리스트 — TWA → Capacitor 전환

**상태**: 계획 수립 완료 · 구현 미착수 (사용자가 "계획만 먼저" 선택, 2026-09-16)

## 0. 착수 전
- [ ] 업체에 구체적 구성 확인 (Capacitor 버전 · OAuth 처리 방식 · 제출 전 점검 항목)
- [ ] 현재 TWA AAB 로 내부 테스트에 한 번 올려볼지 결정 (지문·assetlinks 검증용, 손해 없음)

## 1. CDN 자체 호스팅 ⭐ 선행
- [ ] `js/` 전체에서 `three/addons/` 실제 import 전수 조사
- [ ] `vendor/three/` 에 three.module.js + 필요한 addons 만 배치
- [ ] `vendor/supabase/` 에 supabase-js 배치
- [ ] `index.html` importmap 을 상대경로로 (⚠️ build-ait 치환 앵커 확인)
- [ ] `js/supabase-client.js:101` 동적 import 경로 교체
- [ ] `scripts/build-web.mjs` INCLUDE 에 `vendor` 추가
- [ ] 검증: 웹·토스·itch 3종 빌드 + 테스트 615건 + 네트워크 탭에 외부 CDN 요청 0건

## 2. Capacitor 도입
- [ ] `@capacitor/cli` · `core` · `android` 설치
- [ ] `capacitor.config.json` — appId `com.cheorish.lab.calmforest`, webDir `dist`
- [ ] `npx cap add android` → `android-cap/` (기존 `android/` 는 남긴다)
- [ ] 기존 업로드 키로 서명 설정
- [ ] 앱 번들 화이트리스트 결정 — `dashboards/`·`beta/` 제외 여부, 안내서는 웹 오리진 유지
- [ ] `.gitignore` 정리 (`android-cap/` 산출물)

## 3. 구글 OAuth
- [ ] A안(App Links) 검토 — `https://calmforest.cloud/auth-callback` 을 앱이 가로채기
- [ ] `@capacitor/browser` 로 시스템 브라우저 열기
- [ ] Supabase Auth 리다이렉트 허용 목록에 추가
- [ ] 기존 팝업 경로(`auth-popup.html`)와 분기 정리 — 웹·토스·itch·앱 4개 경로
- [ ] 게스트 로그인 동작 확인(영향 없을 것으로 예상)

## 4. 검증
- [ ] 실기기 설치 — `npx cap run android`
- [ ] **비행기 모드에서 게임이 뜨는지** (CDN 자체 호스팅 효과 확인)
- [ ] 구글 로그인 → 저장 → 재실행 이어짐
- [ ] **포그라운드 사용 시간이 우리 앱에 기록되는지** ← 이번 전환의 목적
- [ ] 웹·토스·itch 무영향 재확인

## 5. 출시
- [ ] AAB 빌드 · 내부 테스트 업로드
- [ ] 비공개 테스트 12명 · 연속 14일
- [ ] 프로덕션 접근 신청
