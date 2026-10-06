# orchard-onboard — context
Last Updated: 2026-09-29

## 왜
- 9/18~9/29 활동 349명 중 과수원 해금 1명·심기 0명. 해금 조건(고급 작물 1회 수확)으로 가는 길을 알려주는 곳이 없었다.
- 과일은 팔기 외 용처 0, 묘목 90🪙 vs 사과 5🪙 → 본전 12~18일.
- 주민 의뢰 진행 유저 1~3%, 요리 2.6% → 말 걸어야 시작하는 의뢰·요리 재료화는 도달 못 함.

## 결정(사용자 승인)
- 해금 조건 유지(B안 중반 콘텐츠) + 고급 씨앗 온보딩
- 형태: 주민(농부 삼촌) 단계형 의뢰, **자동 수락**, 기본 작물 첫 수확 직후 발동
- 과일 용처: 경제 재조정(A) + 밤사이 가공(B)

## 구현
- js/orchard-onboard.js(순수) · tests/orchard-onboard.test.mjs
- 배선: spaces/orchard-actions.js(maybeOffer/finish/plant) · farm-auto.js(tryHarvest·bumpAdvHarvest) · npc.js(패널 카드) · game.js(복원)
- 원장: functions/api/orchard-events.js EVENTS 에 orchard_quest(step→method)
- 경제: 묘목 40/55/80/100/130 · 과일 8/10/13/16/20 (다 자란 뒤 2.5~3.3일 본전)
- 가공: 🥫apple_jam(화덕·season) · 🌰roast_chestnut(화덕·grill) · 🍡gotgam(발효통·crush), 1.3배. index.html 은 mgBaseOf 로 원조 조작 재사용
- 안내서 ko/en 갱신

## 배포 후 검증
- 다음 날 orchard_events 에 orchard_quest 행이 쌓이는지(원장 end-to-end 첫 증명)
- GA4 orchard_quest step 퍼널 offer→plant→done
