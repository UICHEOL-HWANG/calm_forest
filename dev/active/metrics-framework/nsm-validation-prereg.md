# 북극성 검증 V1~V3 — 사전 기준 (결과 보기 전 고정)

**고정 시각** 2026-10-08 · 결과가 나와도 아래 기준은 고치지 않는다 (ANALYSIS_PROTOCOL 규칙 2).

## 검증 대상 (잠정 정의)
하루 평균 가꾼 주민 수 = 7일간 (주민 × 가꾼 날) ÷ 7
- 주민 = 로그인 세션(`is_guest=false` & `user_id` 있음)은 `u:`+user_id, 그 외 `c:`+client_id
- 하루 = KST 자정, 세션 `started_at` 기준
- 가꾼 날 = 결과물 행동 16종 중 1회 이상
  `harvest_crop coop_collect honey_collect fishing_catch sea_catch firefly_catch forage_pick mine_ore craft_item craft_claim cooking_result cafe_serve carve_result quest_complete star_result duel_result`
- 원천 = `calm_forest_raw.session_logs` (session_id 별 최신 행), `counts` JSON

## 모집단 (두 벌 모두 보고)
- **원본**: 필터 없음
- **잠정 필터**: 페르소나 규칙 P1 = user_id 중 client_id 4개 이상 & 첫 등장 ≥ 2026-09-28 → 해당 user_id 세션 제외
- 개발자 기기: 식별 규칙 미확정 → 이번엔 제외하지 않음 (한계로 기록)
- 베타: V1 민감도 분석으로 첫날이 9/9~9/15 인 코호트를 뺀 결과도 같이 보고

## V1 선행성
- 코호트: 첫 활동일이 2026-08-06 ~ 2026-09-16 인 주민 (21일 관찰 확보)
- 라벨: 8~21일차에 1일 이상 활동
- 피처(0~6일차): ① 가꾼 날 수 ② 접속일 수 ③ 플레이 시간(세션당 60분 상한) ④ 결과물 행동 횟수
- 지표: 피처별 단변량 AUC, 부트스트랩 1,000회 95% CI, ①−② 차이의 CI
- **통과: AUC① 점추정 ≥ AUC② 점추정.** 미달이면 북극성 정의를 다시 연다

## V2 꾸미기·잡담 누락
- 꾸미기·잡담만 한 날 = 결과물 0 & 다음 중 1회 이상: `place_decor color_unlock store_decor store_outdoor npc_chat_open npc_chat_done gift_give photo_capture`
- 측정: 전체 활동 (주민×날) 중 비율, 그런 날 vs 가꾼 날의 7일 내 재방문율
- **통과(현 정의 유지): 비율 < 10% 또는 꾸미기·잡담만 한 날의 재방문율 < 가꾼 날의 재방문율.** 아니면 꾸미기·잡담을 결과물 목록에 추가

## V3 안정성
- 이중 계수: 게스트 키(`c:`)로 센 가꾼 날 중, 그 client_id 가 이후 로그인 세션에서 `u:` 키로도 나타나는 비율
- **통과: 이중 계수 < 5%**
- 주간 값 부트스트랩(주민 단위 재표본 1,000회) 95% CI → CI 반폭을 "의미 있는 변화" 최소 크기로 정의서에 기록 (통과/실패 없음)
- 플랫폼별(web·toss·itch) 주간 분해 (통과/실패 없음)
