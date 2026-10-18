# app-link-guide · plan (2026-10-18)

사용자 지시: "1,2,3 다하는데 초보자 안내서 좀 구형일거야 그것도 좀 업데이트"

## 1. 스마트 링크 /app
- 워커가 UA 로 분기: 안드로이드 → Play(referrer utm), 아이폰·아이패드 → App Store(pt·ct), 그 외 → /app 안내 페이지(배지 2개 + QR 하나)
- ?os=ios|android 로 강제 가능 · utm_source/campaign/content 전달, utm_medium 기본 app_link
- 302 + Cache-Control no-store + Vary User-Agent
- 문구는 이미 승인된 것 재사용: "📱 폰에서도 만나요" · "폰 카메라로 QR을 비춰 주세요" · "🌿 게임 하러 가기"
- QR 은 https://calmforest.cloud/app?utm_source=app_page&utm_medium=qr 하나(폰이 알아서 분기)

## 2. 초보자 안내서
- 공개 /guide/ ·/guide/en/ 페이지(guide-page.mjs)에만 스토어 배지 블록. 게임 안 안내서(토스·앱에서도 열림)엔 넣지 않음
- 내용 갱신 범위는 감사 결과 보고 확정(사용자 확인)

## 3. 검색엔진·크롬
- index.html VideoGame JSON-LD 에 sameAs(스토어 2곳)
- manifest related_applications(play, itunes) · prefer_related_applications false
