# 모바일 의뢰·친해지기 아이콘 · 맥락

Last Updated: 2026-11-14 (착수)

- 워크트리 `.claude/worktrees/quest-chips`, 브랜치 `feat/quest-chips`, main `43b90c5d`에서 갈라짐.
- 관련 코드: index.html `#quest-panel` CSS·숨김 규칙(199, 304, 330, 933, 960, 1354, 1415-1418, 1841, 1937, 2006, 2056), js/hud/hud-shell.js(27-30, 68, 90 layoutLeft), js/pond/yard-guide.js:9, js/mountain/sled-hud.js:23, js/neighbors/ui.js:46, js/game.js `setQuest`·`refreshQuestPanel`·`questBarLast`, js/affinity/index.js `affinityTracker`·`renderAffTrack`, tests/quest-panel-view.test.mjs.
- 시작 상태 카드("주민과 친해지면 선물이 와요")는 수첩이 아니라 소개 카드를 연다. 시트에서도 두 경우를 처리.
- 금색 화살표는 CSS로 그린다(화살표 이모지 금지). 월드 말풍선에 글자 금지, 안내는 HUD 한 줄.
- 온보딩 순서는 온보딩 전수 조사(코드 인벤토리 + 실제 플레이) 결과를 보고 확정한다.
