# boat-lineup 체크리스트

## 설계
- [x] 데이터 조회·문제 정의
- [x] 시안(1차 업그레이드안 → 라인업 → 조형 3안 → 9척 확정)
- [x] 획득 조건·기간 확정
- [x] 설계 문서
- [x] 1차 구현 계획 문서 docs/superpowers/plans/2026-10-27-boat-lineup-stage1.md (Task 0~12)

## 1차
- [x] 마이그레이션: boat_runs 새 컬럼 · course CHECK · econ_logs.source 추가 · 리더보드 코스 필터 + boat_rapid 보드
- [x] js/boat/ 모듈 뼈대(boats·parts·course·abilities·economy)
- [x] 코스: 앞 구간 완화 · 급류(별 수 ±10%·재료 ×1.5) · 갈림길 · 폭포
- [x] 별 콤보 · 아슬아슬 보너스
- [x] 재료 적립(shell·moon_fish 변환 중단)
- [x] 배 4척(ferry·lotus·raft·koi) 능력 + 조형 이식
- [x] 기존 강화 이전 + applySave 하위 객체 복원
- [x] 배 고르기 화면(코스 선택 포함)
- [x] 트래킹(boat_runs·GA4 3종)
- [x] 공정성·획득 기간 시뮬레이션 테스트
- [x] 모바일 실측(시야·드로우콜·스킬 버튼)
- [x] 결과 카드 A안(승선권) 리디자인
- [ ] 운영 DB 마이그레이션 적용(사용자 승인 필요, 클라이언트 배포 전)
- [ ] 화면 문구 검수(사용자)
- [ ] 5곳 배포 · 토스 출시 후 공지

## 2차
- [ ] 부품 3칸 UI·강화 · 돛배 3척 · 바람 줄기

## 3차
- [ ] 등불 배 2척 · 반딧불이 · 친구 3명 · 숙련도·색칠
