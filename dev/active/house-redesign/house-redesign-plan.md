# 🏠 집 외관 리디자인 — 계획 (승인 2026-09-10)
브랜치 fix/beta-feedback-r2 위에 진행(같은 배포 묶음).

## 확정 배정
| 단계 | 이름 | 모델 | 코인 |
|---|---|---|---|
| 3 완성 | 코티지 | js/house/cottage.js | — |
| 4 | 브릭 로프트 🧱 | loft.js | 120 |
| 5 | 펜트하우스 🏢 | penthouse.js | 350 |
| 6 최종 | 루프탑 빌라 🏝️ | villa.js | 800 |
아파트(A안)는 기각 — sims/house-concepts/apartment.js 에만 보존.

## 이식 규칙
- 모델 정면 +z → houseGroup 이 π 회전이라 래퍼 그룹을 π 로 다시 돌려 카메라 쪽(-z 시선)에 정면.
- role roof/wall/door 는 스와치 대상. 스와치 0번 = 모델 기본색(userData.baseColor), 1~4 = 팔레트.
- role window 재질 → emissive 0xffcaa0 로 houseWindows 에 등록(밤 점등).
- 3단계부터는 1·2단계 부품(데크·통나무)을 지우고 통째로 교체.
- 충돌 반경 houseSolidR 2.2/2.4/2.55/2.7 유지(모델 발자국이 이 안에 맞춰 조형됨).

## 다음(별도 태스크)
- 단계별 코인 구성품 상점(우편함·정원등·천창·수영장 조명 …) — 외관 꾸미기 창에 섹션 추가.
