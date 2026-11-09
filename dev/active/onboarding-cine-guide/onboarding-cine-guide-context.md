# 맥락: 메인 퀘스트 온보딩 "다음 목적지 시네마틱 → 화살표"

Last Updated: 2026-11-09 23:10 KST

## 근거
- `ml/reports/prepass_stuck_20261109/README.md`, `step2_options.md` (루트 체크아웃에만 있음, 미추적)
- 집 기초 전 38대: ② 나무 베기 13 · ③ 상인 10 · ④ 돌 캐기 10(채굴 0회) · ⑤ 1 · 기록 없음 4
- 물→밭 16대: 판 다시 안 엶 6 · 물 가지만 6 · 조합 미달 4(3대 6칸 꽉 참)

## 핵심 파일
- 튜토리얼: `index.html` TUT_STEPS(~5522), STEP_DONE, renderCoach, act(type)(~5241). 순서 move→chop→sell→mine→house1→house2→harvest→build→dress→bridge→curator. A군 순서 `js/tuning.js` TUT_ORDER_A.
- 상인 방문: `js/spaces/npc.js` updateMerchantVisit(642~), welcomeOffer `js/first-loop.js`.
- 집 안내 실험(hguide, 11/3~ 진행 중, 50:50): `js/spaces/house-guide.js`, `js/house-guide-rules.js`, 목재 15 도달 시 집터 줌+나침반.
- 세계수: `js/spaces/world-tree.js` openWorldTree(199 기본 탭), 조망샷 큐 queueTreeShot/startShot/startRegion, `js/world/region-cine.js` REGIONS, `js/world/tree-shot.js`.

## ③ 상인 원인 조사 (2026-11-09)
- GA4: 상인 해금(unlock merchant·shop·market 3개)은 목재 5 직후 찍히는데 그 뒤 매입(merchant_visit) 없음.
- `merchant_offer_shown` 은 11/5부터만 있음. 11/5~11/9 상인 해금 32대 중 10대는 제안창을 한 번도 못 봄, 제안창을 보고 "다음에" 누른 기기는 0대.
- 결론(가설, 봇 실측으로 확정 예정): 방문은 시작되지만 상인이 플레이어 곁(1.6)까지 못 온다. walk 12초 상한(속도 2.0 → 최대 24칸), 막히면 ±45°만 우회, 나무 장애물 반경 1.3+0.35=1.65 > 도착 반경 1.6. 시간 초과 → 귀환 → 재시도 반복.
- 부수: STEP_DONE.sell = merchantArrived 는 방문 "시작" 때 켜져서, 재접속하면 팔지 않고도 ③이 자동 통과된다.

## 의사결정 대기
- hguide 실험과 겹침(⑤ 집 바닥 안내). 처리 방법은 사용자 결정.
- 시안 3안 중 선택, 문구 후보 선택, ④↔⑤ 순서.

## 규칙
- 새 코드 별도 파일, 주석 없음, 문구 엠대시·"놀다" 금지, 시안 PC+모바일 캡처, 커밋·푸시·배포는 승인 후.
