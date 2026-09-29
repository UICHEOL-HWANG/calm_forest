# 🦆 사공 오리 퀴즈 — Context

**Last Updated:** 2026-09-29

## 결정
- 세 기능 중 **마지막**(콘텐츠·UI 검수가 가장 무겁다). 디자인·문구는 사용자 검토 필수, 트래킹은 체크리스트 전 항목.
- **문제 = 게임 데이터 템플릿**(처음 말한 Supabase 문제 풀에서 변경). 이유: 정답이 게임 수치와 어긋날 위험 0, 수치를 바꾸면 문제도 따라감, 서버·배포 불필요.
- 템플릿 6종 초안: `fruit_days`·`recipe_buff`·`npc_name`·`river_night`·`boat_runs`·`farm_building`. 검수에서 추가·삭제.
- 하루 1회·3문제·4지선다, 날짜 시드(모두 같은 세트). 시작하는 순간 그날은 끝(닫고 다시 열어 정답 캐기 방지).
- 사공 말투 하오체("~구먼", "~보시게") — `js/data/npcs.js:127` 퀘스트 대사와 같은 톤.

## 승인 대기 (Task 1 에서 채움)
- 화면: A 대화창 / B 퀴즈 카드 / C 나루터 팻말 → **미정**
- 사공 대사 → **미정**
- 보상: (a) ⭐2/정답 + 3/3 🪱2 / (b) 🪙5/정답 + 3/3 🪙10 / (c) (a)+호감도 → **미정**
- 문제 목록(review.html) → **미정**

## 핵심 파일 (조사 결과)
- `js/data/npcs.js:127` ferryman(마을 (2.5,0,-13.5), 강 공간 아님)
- `js/spaces/npc.js:747` `talkToNPC` → `ui.openNPCModal(view)`(index.html:2835, `addBtn`)
- `index.html:1682` `#chat-modal` · `renderTalkTurn`(~3553) 선택지 버튼 · `talkSay/talkClear/talkCloseBtn/closeTalk`
- `js/game.js` 세이브 기본값 `talk`(945) 옆에 `quiz`, `todayStr/dateHash`(354~358), `giveReward`(코인만 econ_logs)
- 데이터: `js/orchard.js` FRUITS · `js/data/npcs.js` NPCS · `js/farm-building.js` FARM_BUILDINGS(Node import 가능) / `js/data/catalog.js` RECIPES·BUFF_META · `js/data/places.js` RIVER_PICKS·BOAT_RUNS_PER_DAY(three 때문에 **Node import 불가 → 원문 파싱**)

## 실측 (2026-09-29)
- 파서 검증: 버프 4종·강 수집물 4종(밤 1)·밭 시설 7종·주민 11명·과일 5종 모두 읽힘. i18n 사전에 주민·과일·버프 이름·밭 시설 설명 영어 **전부 있음**.
- 첫 파서 버그 2건(파일 전체 정규식 → COOK_MG 섞임·두 칸 들여쓰기 키 누락, `night: true` 미검출) → **표 블록 안에서만** 찾도록 수정해 계획에 반영.

## 함정
- 결과·퀴즈 화면을 닫는 **모든 길**이 `quizEnd` 를 거쳐야 한다(요리 결과 카드의 `cookResolve` 함정과 같은 구조).
- 트래킹에 문제 문장·이름(표시 문자열) 금지 — `qid`·엔티티 id 만.
