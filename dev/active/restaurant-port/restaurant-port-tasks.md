# 식당 + 포구 섬 태스크

## 기획·시안
- [x] Codex 초안 검토, 카페와 역할 분리
- [x] 식당 홀+주방 영업 시뮬 (조리·평판·DDA)
- [x] 포구 섬 항해 3안 비교 → 자유 이동 + 바다 낚시로 확정
- [x] 통배 조형, 섬 가게 C안 3변형, 창틀 교정
- [x] 섬 확장 + 주민 의뢰 4개
- [x] 첫 방문 길 안내 10단계 + 화살표 추종 봇 완주 검증
- [x] 마을 단계 2개 추가(문구 1·b 확정) → 12단계 봇 완주
- [x] 기획서 개정, 연주회 초안 분리
- [x] 통배 아이콘 T2 확정 (sims/icon-set/tub-boat.svg)
- [x] 섬 가게 C2 확정
- [x] 섬 주민 4명 조형 확정 (sims/port-npc-models.js), 포구 섬 시안 적용·봇 완주
- [x] 부표 아이콘·월드 모양 통일, 주민 대화를 광부식 아래 대사 박스(#mirror-talk)로
- [x] 안내 5·6단계 이모지만(🎣 👆 / ❗ ➜ 🎣 👆)
- [x] 부엌 가지 도달률 조회 → 식당 해금 = 부엌 서식지 완성(카페와 같은 조건)
- [x] 포구 섬 진입 위치 3안 시안 (sims/port-entry-compare.html)
- [x] 포구 섬 진입 위치 결정 → A안 바다터 후미 부두
- [x] 문구 선검수 반영 (안내 카드·주민 대사 3줄·버튼, 오뎅→어묵)

## 구현 1단계: 포구 섬 + 길 안내 (계획 docs/superpowers/plans/2026-11-10-port-island-stage1.md)
- [x] 구현 계획서 작성 (섬 = 바다 공간 하위 모드 port.active, 마이그레이션 불필요)
- [x] js/guide (단계 데이터·화살표·경유점) + 순수 함수 테스트
- [x] js/port (항해·낚시터·섬·의뢰·창고) + 테스트
- [x] 저장·복원 정규화(sanitizePort), Supabase 마이그레이션은 불필요(game_saves jsonb)
- [x] GA4 guide_step·port_trip·port_quest
- [ ] 드로우콜 측정, 새 인스턴스 함정 점검
- [x] 섬 다듬기: 충돌·섬 바구니·의뢰 길 안내·건물 팻말·어부 집 생선 팔기(0f0c5305)
- [ ] 폰 실측(첫 진입 멈칫·바구니 크기)
- [ ] 5곳 배포 + 다음 날 BQ 재검증

## 구현 2단계: 식당 1차 (계획 docs/superpowers/plans/2026-11-10-restaurant-stage2.md)
- [x] 자리 A 카페 옆 (12, 20.5)·외관 R1 비스트로 확정 (sims/restaurant-site-compare.html, sims/restaurant-look-compare.html)
- [x] 구현 계획서 작성 (Task 0~9, 결정 R1~R8)
- [ ] Task 0 문구 선검수 (후보표 dev/active/restaurant-port/restaurant-copy.md, 사용자 확정 대기)
- [x] Task 1 순수 규칙(3e83d747) · Task 2 영업 상태 기계 + 손놀림(도마 탭 4번·팬 뒤집기, e867e865)
- [x] Task 3 공간 플래그·저장·잠금 배선(9c7a5b86)
- [x] Task 4 비스트로 외관(e6960e4e) · Task 6 실내 모형(295e50fb)
- [x] Task 5·7 문·진입·영업 런타임·HUD(b46233ed). 브라우저 봇 한 판: 7명 ★5.0 🪙175, 창고 차감·DDA 0.94·결과 카드 확인
- [ ] Task 8 첫 영업 길 안내 (문구 확정 뒤)
- [ ] Task 9 전체 테스트·코드 리뷰 반영·폰 실측
- [x] GA4 restaurant_service·restaurant_star_up (taxonomy 행 추가)
