# delve-pests 맥락

Last Updated: 2026-11-24 23:55 KST

## 핵심 파일
- js/data/delve.js: PESTS(속도), PEST_COPY, MINER_STEPS(부탁 tap·bait·grab·reclaim)
- js/delve/pests.js: 몹 순수 규칙(stepPest·tapPest·baitPest·pushOffPlayer)
- js/delve/rules.js: 층 배치·저장 정리(sanitizeDelve)·부탁 진행
- js/spaces/delve.js: 연결(tryDelveMine·delvePrompt·handleDelveDoor·updateDelve·enterFloor)
- js/delve/pest-art.js: 몹 모형·emojiBubble
- tests/delve-pests.test.mjs, tests/delve-wiring.test.mjs, tests/delve-rules.test.mjs

## 결정
- 새 저장 칸 없음. counts 그대로, 버튼을 위협 상태에서만 동작시켜 "누름 = 지킴".
- 첫 만남 카드 키 hintsSeen.delve_meet_<kind>(firstHint).
- 기록: pest_meet(카드 순간) · pest_counter +state · delve_floor/delve_exit +kept,lost.
- 말풍선 흰 배경이 블룸에 타던 것이 "웃는 이모지" 원인 → 방문객 말풍선 베이지로.
- 실측 확인: 가만히 서 있으면 약 75% 뺏김, 한 걸음 가면 0%. 몹 시뮬레이션은 scratchpad simb.mjs(버림).

## 검증 도구
- 미리보기: 워크트리 .claude/launch.json 의 delve-pests(8796) 임시 항목(커밋 금지), .env 심링크.
- 앱 브라우저는 숨겨지면 초당 1.5프레임 → updateDelve 를 직접 호출해 시뮬레이션을 진행시킨다.

## 병행
- 몹 생김새·새 몹 시안은 백그라운드 에이전트가 sims/delve-mobs/ 에서 작업(게임 코드 안 건드림).
