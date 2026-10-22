# 튜토리얼 1장 길 · 맥락

Last Updated: 2026-10-23 01:00

## 핵심 파일
| 파일 | 역할 |
|---|---|
| index.html TUT_STEPS·TUT_TOOL·TUT_OLD_KEYS·STEP_DONE | 11단계 정의·도구 펴기·옛 키 이어하기·자동 통과 |
| js/spaces/house.js buildHouseStage | act('house1'/'house2'/'build') + 지붕 때 maybeOfferCosQuest |
| js/spaces/bridge.js bridgeInteract | act('bridge') |
| js/spaces/npc.js talkToNPC | curator 대화 → act('curator') |
| js/spaces/cos-quest.js | 코치 중엔 배너 없이 의뢰만 · 구매 때 act('dress') |
| js/cos-onboard.js shouldOffer | houseStage >= 3 게이트 |
| js/game.js Input | cosOwnedCount·bridgeFixed |
| js/tuning.js TUT_ORDER_A | 새 키 순서(베타 A군 정렬이 키를 잃지 않게) |
| tests/tutorial-ch1-flow.test.mjs | 순서·신호·자동 통과·옛 키 |

## 결정
- ⑦ 밭은 갈기·심기·물·수확을 한 단계로(수확으로 통과).
- 졸업 때 배너 숨김은 shop·mineGate 만(시세판·작업대는 처음 갔을 때 배너가 뜨게).
- 옛 tutStep 키는 새 길의 가까운 자리로 옮기고, 이미 한 단계는 STEP_DONE 로 건너뛴다.

## 검증
- npm test 전부 통과 · 폰(iPhone 13) 11단계 연속 진행 실측(flow-*.png)

## 남은 것
- 튜토리얼 끝에 "1장 시작" 조망샷이 도는지(장 표 기준) 실기기 확인
- 상인 등장 연출(걸어 들어오기)은 기존 그대로, 코치 문구로 예고
