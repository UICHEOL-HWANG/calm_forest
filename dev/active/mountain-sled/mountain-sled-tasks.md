# mountain-sled tasks

## 설계
- [x] 브레인스토밍·결정 9건
- [x] 외관 시안 3종 + 앞면 틈 반영
- [x] 스펙 작성·정정(카메라, firstDay, 기록판)
- [x] 1단계 구현 계획

## 1단계 구현(계획 Task 번호)
- [x] T1 해금 규칙·firstDay
- [x] T2 코스·물리
- [x] T3 수치 시뮬레이션
- [x] T4 난이도 등록
- [x] T5 판 정산·GA4 한도
- [x] T6 sled_runs 테이블(운영 DB 적용)
- [x] T7 카메라 훅·장소 상수
- [x] T8 원경·입구·해금 연출 빌더
- [x] T9 공간 뼈대·배선
- [x] T10 썰매 런타임
- [ ] T11 기록판(운영 DB 적용)
- [ ] T12 통합 검증·리뷰·배포 점검표

## 내일 이어서(2026-10-16~)
- [x] T10b 리뷰
- [x] 조향 좌우 반전 수정
- [x] 브라우저 재확인
- [x] 입구 = 설산 자체(자락 강하게·구름 2.2배·(−15,−36)), 아치 제거
- [x] T11 기록판 · T12 통합 검증·최종 리뷰
- 운영 DB 적용(T6·T11)은 배포 때

## 착수 전 사용자 확인
- [x] 새 UI 문구 후보 검수(T9·T10·T11 문구) — 후보대로 승인(2026-10-15)

## 이후
- [ ] 2단계 계획(정상 전망대)
- [ ] 3단계 계획(얼음 낚시, fishing.js 일반화)
- [ ] Airflow sled_features_daily 마트(출시 1주 뒤)

## 1단계 마무리(2026-10-16)
- [x] 내부 테마(낮 A·노을 B·눈 C·밤 달밤 A), 노을 색보정·눈발 이음새
- [x] 최종 리뷰 수정 11건(세이브 복원·입력 해제·search_path·EN 키·복귀 위치 등)
- [ ] 사용자 확인: 입구 배너 🏔️ 세 번 반복 문구 유지 여부
- [ ] 배포(사용자 승인 후)

## 배포 점검표
1. 운영 DB: `to_regclass('public.sled_runs')` 가 null 인지 확인 → migrate_sled_runs.sql 적용 → migrate_leaderboard_sled.sql 적용 → boat/sea 보드 출력이 전과 같은지 확인, `leaderboard('sled')` 빈 top
2. Worker 배포(functions/api/leaderboard.js BOARDS 에 sled)
3. 4곳 동시 배포: 웹·토스(bundle_upload memo)·Play(프로덕션 포함)·iOS — 새 세이브 키 firstDay·mountain
4. 푸시 전 키 스캔(git grep AIza|GOCSPX- 등), 푸시는 main + feat/capacitor-app
5. 배포 다음 날 BigQuery: sled_start·sled_result·mountain_enter·mountain_reveal 적재, ga_param_overflow 0건, sled_runs 행 수 대조
6. 공지는 토스 출시 후
