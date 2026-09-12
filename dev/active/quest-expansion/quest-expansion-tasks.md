# Tasks — quest-expansion

## 1단계 · 게이트 + 새 목표 7종 (TDD)

- [x] `tests/quests.test.mjs` 작성 (RED)
- [x] `js/quests.js` — `QUEST_GATES` · `questAvailable()` · `pickQuests()` (GREEN)
- [x] `js/game.js` — `QUEST_TYPES` 에 7종 추가
- [x] `js/game.js` — `QUEST_HOW` 에 7줄 추가 (`tests/quest-how.test.mjs` 가 잠금)
- [x] 훅 7곳에 `questEvent()` 추가 — carve · egg · gift · decor · boat · seafish · mist
- [x] `refreshDailyQuests` / `OWL_SPECIAL_POOL` 추첨에 게이트 연결

## 2단계 · 주민 반복 의뢰

- [x] 테스트: 날짜 시드로 매일 3명만 · 같은 날 결과 고정 · 게이트 통과분만
- [x] `js/quests.js` — `REPEAT_POOL`(주민별 전문 분야) · `openRepeatNPCs(date)`
- [x] `js/game.js` — `allDone` 주민이 반복 의뢰를 내주는 경로
- [x] 보상: 코인 5~8 + 재료 + 친밀도 +1
- [x] 진행 중 교체 금지 가드 확인

## 3단계 · 새 NPC 4명

- [x] 🐿️ 숲지기 다람쥐 (채집 숲) · ⭐ 별 보는 아이 (반딧불이 계곡)
- [x] 🦦 수달 사공 (나루터) · 🐔 목장 아주머니 (닭장터)
- [x] 외형(`buildNPCLook`) — 기존 look 재사용 가능한지 먼저 확인
- [x] 좌표가 장애물·건물과 안 겹치는지 (`npcBlocked`)
- [x] 체인 4종 정의 (잠금 콘텐츠 제외)

## 4단계 · 일일 3 → 5

- [x] `js/game.js` — `DAILY_COUNT = 5` · `DAILY_POOL` 확장 · 보상 곡선 10/10/15/15/20
- [x] 럭키박스는 3건에만
- [x] `functions/api/daily-quests.js` — `NEED = 5` · `QUEST_SPEC` 7종 추가
- [x] `scripts/serve.py` 로컬 미러 동기화
- [x] `validDailyQuests` 개수 검증 · `st.special` 분리 확인

## 5단계 · i18n + 검증

- [x] `js/i18n-en.js` — 새 문구 전부 (NPC 이름 · 퀘스트 제목 · desc · QUEST_HOW)
- [x] 서버 `SYSTEM_EN` · `QUEST_SPEC.en` 동기화
- [x] `npm test` 전체 통과 (272건)
- [x] 브라우저 실측 — 새 NPC 4명 배치·외형 · 일일 5건 · 반복 의뢰 수락·진행
- [ ] 모바일 실측 (퀘스트 패널 · 대화창 길이)
- [ ] code-reviewer 에이전트 결과 반영
- [ ] 새 목표 7종의 실제 플레이 발화 (훅 위치는 테스트로 잠금)
