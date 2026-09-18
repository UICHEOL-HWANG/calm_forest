# 컨텍스트 — 베타 피드백 r5
Last Updated: 2026-09-15

## 브랜치
`fix/feedback-r5` (main 993595e 에서 분기)

## 핵심 파일
| 파일 | 무엇이 바뀌었나 |
|------|----------------|
| `js/quests.js` | `activeQuestList(views, {top, pinId})` + `QUEST_PANEL_TOP` 추가(순수 함수) |
| `tests/quests.test.mjs` | 회귀 테스트 8건 — 특히 "A 수락 → B 수락 → B 완료 후 A 가 남는다" |
| `js/game.js` | `questView` 에 id 추가 · `refreshQuestPanel()` 이 전체 목록 전달 · `questPanelTop()` · `onResize` 에서 재렌더 · `md.npcs` 에 `name`·`q(npcGlyph)` · `window.__questPanel()` 검수 훅 |
| `index.html` | 퀘스트 패널 목록 렌더 · 작업대 창 height 고정 · 미니맵/전체지도 의뢰 배지 · `#wm-quests` 요약줄 |
| `js/i18n-en.js` | `+ {0}건 더` · `✅ {0}에게 가세요` · `❗ 새 의뢰` · `✅ 완료! 돌아가기` |

## 의사결정
- **펫(자동수확)은 이번 범위에서 제외** — 수익화 요소로 나중에. 🧑‍🌾일꾼(텃밭 전용)이 이미 같은 일을 한다.
- 패널 표시 건수: 데스크톱 3 / 모바일(≤640px) 2, 나머지는 `+ N건 더`.
- 정렬: 근처 주민(pin) → ✅완료 → 진행률 → 원래 순서.
- 미니맵은 82~108px 이라 이모지 배지가 뭉개짐 → **테두리 색·굵기만**. 전체 지도만 ❗/✅ 이모지.
- 작업대는 `min-height` 로는 부족(긴 탭이 더 자람) → `height: min(560px, --menu-room)` 으로 못 박음.

## 함정
- ⚠️ `setQuest` 를 null 로 부르던 옛 호출부 2곳을 지우고 `refreshQuestPanel()` 단일 출처로 통일했다. 다시 늘리지 말 것.
- ⚠️ 지도 요약줄은 이름마다 별도 텍스트 노드여야 한다(i18n 은 텍스트 노드 단위 — 한 줄로 이으면 영어 모드에서 한국어로 남는다).
- ⚠️ 검수 시 `mode: 'attract'` 면 미니맵 틱이 안 돌아 `lastNpcs` 가 비어 지도에 주민이 안 뜬다. 튜토리얼 카드까지 닫아 `mode:'play'` 를 확인하고 봐야 한다.

## 검증 완료
- `npm test` 465 pass
- 작업대 4탭: 데스크톱 560px/top 118 · 모바일 560px/top 174 — 전부 동일
- 퀘스트 버그 재현 경로 → 수정 확인(A 가 남음)
- 지도 배지·요약: 한국어·영어 · 데스크톱·모바일 스크린샷 확인

## 코드 리뷰 반영(2026-09-15)
| 건 | 내용 |
|----|------|
| H-1 | `#cook-hint { display:flex }` 가 `<b>` 를 별개 flex item 으로 쪼개 공백을 삼켰다("영구도구 강화") → flex 제거, `min-height` 만 |
| H-2 | 패널에 높이 가드 없어 폰 가로(844×390)에서 잘림 → `--qp-base/--qp-top` + `max-height`, `questPanelTop()` 이 `innerHeight<560` 이면 1건, 그 화면은 전부 요약형 렌더 + 📖스토리 칩 양보 |
| — | `layoutQuestPanel()` 이 `.show` 클래스만 보고 칩 위치를 읽어, CSS 로 숨긴 칩에서 `bottom=0` → 패널이 화면 맨 위로 튀었다. `chip.offsetParent` 도 확인하도록 수정 |
| M-1 | 짧은 화면 `#cook-hint` 하향이 뒤 규칙에 덮여 죽어 있었다 → 명시도 보정 |
| M-2 | pin 이 `trackedNPC`(해제 안 됨)라 마을 반대편에서도 고정 → 매 프레임 갱신되는 `nearNPC` 로 교체, `trackedNPC` 제거 |
| M-3 | 미니맵 틱(8Hz)에서 `npcGlyph()` 호출 = `currentQuest` 의 `st.idx` 변형 + GA4 발신 → 캐시된 `o.lastGlyph` 사용 |
| M-4 | `.q-fill` 전환이 첫 렌더에 안 걸림 → 삽입 후 rAF 에서 width 부여 |
| M-5 | `--menu-room` 음수 방어 `max(220px, …)` |
| L-2 | `+ {0#}건 더` 숫자 전용 슬롯 |
| L-3 | 제목 없는 유령 항목 필터 |
| M-7 | **오탐** — `openWorldMap()` 이 `lastPlace !== 'village'` 면 열지 않으므로 낡은 데이터가 나갈 수 없다 |
