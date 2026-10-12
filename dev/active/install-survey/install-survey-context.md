# install-survey context
Last Updated: 2026-10-12

## 결정
- 시안 A(로딩 위 가운데 카드·2열 12개·건너뛰기·친구 초대만 코드칸) · 보기 12개 확정
- 첫 실행(로딩 중) — 튜토리얼 뒤는 생존자 편향
- iOS 첫 실행 전원 / 안드로이드는 이번 실행에 referrer 새로 읽고 organic·unknown 일 때만 / 웹·토스·itch 없음
- iOS 1.0.0(승인)은 출시하지 않고 설문 빌드로 교체 재심사
- 새 테이블 install_survey (install_attribution 과 분리 — unique+ignoreDuplicates 라 섞으면 버려짐)
- GA4 사용자 속성 heard_from + 이벤트 install_survey{action, answer, has_code}

## 핵심 파일
- js/install-referrer.js · js/install-referrer-boot.js(bootInstallReferrer: 캐시면 조기 반환 → fresh 플래그 추가)
- js/analytics.js installProps()(:26) · setInstallUserProps(:90)
- js/supabase-client.js insertInstallAttribution(:870)
- js/referral/rules.js CODE_RE /^[A-HJ-NP-Z2-9]{8}$/ · readInviteParam · INVITE_STORE_KEY cf_invite
- index.html 부팅 :6435~ (bootInstallReferrer 비대기 → bootWorld → loading 숨김 → initAuth)
- tests/install-referrer-wiring.test.mjs — await bootInstallReferrer 금지

## 함정
- #loading 안에 넣으면 setLoadWait/setSaveStuck 이 textContent 로 덮어씀 → 형제 요소
- cf_first_touch 는 오늘 생겨 기존 유저도 비어 있음 → 첫 실행 판정에 못 씀
