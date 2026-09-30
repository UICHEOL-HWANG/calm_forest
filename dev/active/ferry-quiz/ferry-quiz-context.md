# 🦆 사공 오리 퀴즈 — Context

**Last Updated:** 2026-09-30

## 결정
- 세 기능 중 **마지막**(콘텐츠·UI 검수가 가장 무겁다). 디자인·문구는 사용자 검토 필수, 트래킹은 체크리스트 전 항목.
- **문제 = 게임 데이터 템플릿**(처음 말한 Supabase 문제 풀에서 변경). 이유: 정답이 게임 수치와 어긋날 위험 0, 수치를 바꾸면 문제도 따라감, 서버·배포 불필요.
- 템플릿 6종 초안: `fruit_days`·`recipe_buff`·`npc_name`·`river_night`·`boat_runs`·`farm_building`. 검수에서 추가·삭제.
- 하루 1회·3문제·4지선다, 날짜 시드(모두 같은 세트). 시작하는 순간 그날은 끝(닫고 다시 열어 정답 캐기 방지).
- 사공 말투 하오체("~구먼", "~보시게") — `js/data/npcs.js:127` 퀘스트 대사와 같은 톤.

## 승인 (2026-09-30)
- 화면: **C 나루터 팻말** (시안 sims/ferry-quiz/quiz-options.html) — ⚠️ 보기 글자가 길면(주민 이름 등) 한 줄 4표찰에 안 들어간다 → 긴 보기는 2×2 표찰로
- 보상: **(b) 코인** — 정답당 🪙8 · 3/3 이면 🪙15 더 (하루 최대 39). 사용자 "보상은 B 최대안". econ_logs source='ferry_quiz'
- 사공 대사: 시안 표 그대로(수정 요청 없음)
- 문제 목록(review.html) → **미정** (Task 2 뒤 검수)

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

## 구현·검증 (2026-09-30, feat/ferry-quiz 8f22e2f, 미병합)
- 검수 반영: npc_name → **npc_quest**(퀘스트 제목으로 묻고 보기는 이름만, qid = npcId-제목해시) · farm_building → FARM_PLAIN 쉬운 말 질문. 문제 54개(과일 5·버프 4·퀘스트 36·강 1·뱃길 1·시설 7)
- 보상은 **맞힐 때마다 바로 지급**(리뷰 MEDIUM: quizEnd 에서만 주면 결과 전 앱 종료 시 증발) — 8·8·8+15
- 트래킹 실측(Playwright, dev 파라미터 없이 GA 차단·dataLayer): offer(ok)→start→answer×3→end(coins 39) · 도중 닫기 end quit=1 reached=1 · 같은 날 재방문 offer reason=done·버튼 비활성
- 함정: data-node 의 en() 이 큰따옴표 값("A Neighbour's Share")을 못 읽어 영어 검사 실패 → 두 따옴표 모두 파싱
- 남은 것: 사용자 최종 확인(캡처) → 병합·4곳 배포 → 다음 날 BQ(quiz_date 조인·qid 정답률·econ_logs ferry_quiz)
