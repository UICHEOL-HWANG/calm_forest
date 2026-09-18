# npc-talk · 컨텍스트

**Last Updated:** 2026-09-15

## 스펙 원문
`docs/superpowers/specs/2026-09-15-npc-talk-design.md` — 결정의 단일 출처.
이 파일은 "어디를 건드리나"만 짧게 둔다.

## 핵심 파일

| 파일 | 역할 | 비고 |
|---|---|---|
| `functions/api/_npc-gen.js` | 🆕 생성 로직 단일 출처 | 크론·시딩 스크립트가 공유 |
| `functions/api/npc-talk.js` | 🆕 읽기 API | `cafe-guests` 규칙 그대로 |
| `worker/index.js` | 라우트 등록 + `scheduled` 핸들러 | ⚠️ 등록 누락 = 404 |
| `tools/seed-npc-dialogues.mjs` | 🆕 최초 시딩(수동 1회) | |
| `scripts/serve.py` | 로컬 미러 | ⚠️ 한쪽만 고치면 갈라짐 |
| `js/game.js:665` | `NPCS` 11명 — 캐릭터 시트·few-shot 재료 | |
| `index.html:1342` | `#quest-panel` — 버튼 붙일 자리 | `questPanelTop()` 계산 같이 수정 |
| `wrangler.jsonc` | `triggers.crons` + `observability` | |

## 의사결정 (근거는 스펙 2절)
- 진입점 = 퀘스트 창 옆 버튼 (NPC 앞 프롬프트 안은 기각)
- 3턴 **수렴형** — 분기 살리면 27갈래로 터짐
- 보상 **없음** — 친밀도 주면 선물 루프가 희석됨
- 본문 evergreen, **날씨는 첫인사 한 줄만**
- 주 1회 크론, NPC·언어당 **100세트 상한**
- 실패 로깅은 **성공도 기록**(안 돈 경우를 잡으려고). 슬랙 알림은 안 함

## 의존성
- `GEMINI_API_KEY` — 이미 있음
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — 이미 있음
- 새 시크릿 **없음** (rpc `security definer` 로 service key 회피)

## 열린 항목
- NPC 11명의 `farewell` 한국어 문구 — 구현 전 사용자 검수 필요
- 캐릭터 보이스 시트(말투 규칙) — `NPCS[].quests[].line` 에서 추출
