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

## 썰매지기의 산장·결승 연출(2026-10-16, f9fac2be)
- [x] C 등불 산장·광장 소품·충돌, 산장 도착 → 출발대 버튼 → 결승 정지, 결승 세리머니, 부스터 가운데

## 산장 카페·추위 지수(2026-10-16 구현 완료, 미병합·미배포)
- 스펙 docs/superpowers/specs/2026-10-16-hut-cafe-design.md · 계획 docs/superpowers/plans/2026-10-16-hut-cafe.md(Task 2→1→3→…→9)
- 결정: 시안 C 다락 카페 · 북극여우 솜눈 · 상품 11종(+기본 썰매 줄) · 부제 없음 · 추위 지수(낮0.6/노을0.8/밤·눈1.2, 60 떨림, 80 걷기×0.75, 모닥불−5·카페−8 무료, 음료 즉시0+3분)
- [x] Task 8 시작 전 추위 안내 문구 2개 검수 — 사용자 승인 완료
- [x] Task 1~8 구현(커밋 e0d419d5..HEAD) · 최종 리뷰 수정 반영(fix: hut cafe final review fixes)
- [x] Task 9 문서

## 배포 점검표
1. 운영 DB: `to_regclass('public.sled_runs')` 가 null 인지 확인 → migrate_sled_runs.sql 적용 → migrate_leaderboard_sled.sql 적용 → boat/sea 보드 출력이 전과 같은지 확인, `leaderboard('sled')` 빈 top
2. Worker 배포(functions/api/leaderboard.js BOARDS 에 sled)
3. 4곳 동시 배포: 웹·토스(bundle_upload memo)·Play(프로덕션 포함)·iOS — 새 세이브 키 firstDay·mountain
4. 푸시 전 키 스캔(git grep AIza|GOCSPX- 등), 푸시는 main + feat/capacitor-app
5. 배포 다음 날 BigQuery: sled_start·sled_result·mountain_enter·mountain_reveal 적재, ga_param_overflow 0건, sled_runs 행 수 대조
6. 공지는 토스 출시 후
7. 산장 카페(4곳 동시 배포 필수): 옛 클라이언트는 세이브의 모르는 꾸미기·장식 id(earmuff, snowflake, sled_pack, snowglobe, hutmodel, summitflag)를 지워버린다 → 웹·토스·Play·iOS 동시에
8. 배포 다음 날 BigQuery: hut_cafe_enter / hut_cafe_open / hut_cafe_buy, hut_sled_pick, mountain_cold(stage), mountain_hut.cold, sled_start.sled_skin 적재 확인 · ga_param_overflow 0건

## 🛷 썰매 라인업 (2026-10-16 구현 완료, 미병합·미배포)

- 스펙: docs/superpowers/specs/2026-10-16-sled-lineup-design.md
- 계획: docs/superpowers/plans/2026-10-16-sled-lineup.md (Task 1~7)
- 결정: C안 장단점(도토리 최대 6개·충돌 0 이상적 시간 동일) · F 투톤 아이스크림 · 능력 썰매 3종 코인 1,500 + 웹 ₩3,900 · 터보건 첫 완주 보상
- 시안: dev/active/mountain-sled/proto/sled-lineup.html?style=f · shots-sled/compare-mix.html
- [x] 터보건 문구 2개 확정 (2026-10-16)
- [x] Task 1~7 구현 (npm test 전체 통과, 브라우저 시각 확인은 컨트롤러 몫)
- 만든 것
  - 썰매 8종 데이터·이상적 시간 균형 테스트 (js/mountain/sled-lineup.js, 능력 썰매 wind·acorn·skiff)
  - 썰매별 물리, PHYS_V 2 (js/mountain/sled.js)
  - 곡선 썰매 모델 8종
  - 산장 카페 썰매 라인업 탭, 첫 완주 보상 터보건
  - 능력 썰매 3종 상점: 코인 1,500 + 웹 현금 ₩3,900 (entitlements kind 'sled', 현금 지급 대기 중 코인 구매 잠금)
  - 기록 서버: sled_runs.sled 열 + phys_v 1·2 허용, 리더보드 phys_v in (1, 2)
- [ ] 배포 순서
  1. 적용 전 운영 leaderboard 함수 본문을 pg_get_functiondef 로 migrate_leaderboard_sled.sql 과 비교
  2. 운영 DB(컨트롤러가 풀러로 직접 실행): `sql/migrations/migrate_sled_lineup.sql`(sled 열·CHECK·phys_v 1,2·leaderboard 재생성, 멱등) → `sql/migrations/migrate_purchases_sled_kind.sql`
  3. 웹·토스(bundle_upload memo)·itch·Android·iOS 5곳 동시 배포 — 옛 클라이언트는 세이브의 모르는 썰매 id 를 지워버린다
  4. ⚠️ Paddle production 시드는 웹·토스·itch·안드로이드·iOS 새 빌드가 모두 출시된 뒤에만 — 사용자 명시 확인 후에만 실행
  5. 시드가 채운 js/shop/price-ids.js 커밋 → 웹 재배포
  6. 푸시 전 키 스캔, 푸시는 main + feat/capacitor-app
- [ ] 2주 뒤 분석(2026-10-30 이후): 썰매별 평균 기록·충돌 수 비교. phys_v 2 이후 완주만, 이상적 시간은 도토리 최대(6개)일 때만 썰매끼리 같고 도토리가 적을수록 달라진다(0개: wind −2.10초·acorn +0.94초) → 썰매 간 직접 순위 비교 금지(같은 썰매 안 분포·도토리 수·충돌 수로 본다)

```sql
select sled,
       count(*) as runs,
       round(avg(time_ms) / 1000.0, 2) as avg_sec,
       round(avg(jsonb_array_length(coalesce(hits, '[]'::jsonb))), 2) as avg_hits
from public.sled_runs
where phys_v = 2 and outcome = 'finish' and is_guest is not true
group by sled
order by runs desc;
```
