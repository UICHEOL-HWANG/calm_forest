# login-store-banner · plan

로그인 화면에 App Store·Google Play 안내 (A+C안, 2026-10-18 확정)

## 동작
- 웹·itch 에서만. 토스·안드로이드·iOS 앱 안에서는 안 보임
- PC: 카드 안 문구 + 스토어 버튼 2개, 카드 옆 QR 카드(넓은 화면만)
- 폰: 카드 안 문구 + 그 기기 스토어 버튼 1개, QR 없음
- 스토어가 안 열린 OS(TUNING.appBanner.storeLive)는 버튼·QR 모두 뺀다
- 이메일 단계로 넘어가면 QR 카드도 숨김

## 문구 (확정)
- 카드 안: 📱 앱으로도 만나요 / 📱 Also on mobile
- QR 제목: 📱 폰에서도 만나요 / 📱 Take it with you
- QR 설명: 폰 카메라로 QR을 비춰 주세요 / Point your phone camera at the QR

## 링크·귀속
- 버튼: storeUrl(os, cfg, touch, 'login_card') — 안드로이드 referrer utm_medium=login_card(+jid), iOS ct=login_card_*
- QR: 정적 SVG, utm_medium=login_qr / ct=login_qr_web (jid 없음)

## 트래킹
- login_store_view {device, qr} — 로그인 화면이 실제로 뜰 때 세션 1회
- login_store_click {os, device}
