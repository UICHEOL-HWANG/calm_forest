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
- [ ] Task 0 문구 선검수
- [ ] js/restaurant (영업·설비·별점·평판·DDA) + 테스트
- [ ] 첫 영업 길 안내
- [ ] GA4 restaurant_service·restaurant_star_up
