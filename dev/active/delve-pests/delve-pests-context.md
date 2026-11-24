# delve-pests 맥락

Last Updated: 2026-11-25 (2차) KST

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

## 진행
- 커밋: 4cc08bac(설계) · a8e07fe0(구현) · c86f6990(리뷰 반영). npm test 6817/0, build-ait 성공.
- 플레이 캡처: 헤드리스(metal) 오프라인 게스트, PC·세로 폰·가로 폰. 카드가 안 뜨던 것은 하네스가 코치(튜토리얼) 진행 중이었기 때문(modalQueue 게이트), 실제 지하 플레이어는 해당 없음.
- 리뷰 남은 LOW: 바닥에 남긴 조각은 지킴·뺏김 어디에도 안 셈, 미끼 6초는 고정 문구, 같은 광맥에 미끼 반복 가능(버섯 소모).
- 몹 시안: sims/delve-mobs/(커밋 안 함). 추천 C안(생김새=훔치는 방식)+크기 1.6→2.2, 새 몹 달빛나방(불 끄기)·별코두더지(구멍 막기)·도둑쥐(살살 캐기), 수정공굴리는 보류.
