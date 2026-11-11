# 작업대 리디자인 · 컨텍스트
Last Updated: 2026-11-11 14:10

## 핵심 파일
- index.html: #cook-menu 마크업(~3031), CSS(~1564, ~2414), renderTools/renderOutdoor/renderGifts/renderCarve/showCookTab(~6347)
- js/hud/spotlight.js: 음영 안내 엔진(run(steps,{kind,skip,blocked})), 나무 창 안내(runTreeTour)가 같은 방식
- js/workbench/forge-ui.js·copy.js·forge.js: 별 강화 뷰(check.state ready/short/busy/pending/max)
- 상점 팔기 개편(sl-/ss- 클래스)은 main 체크아웃에 미커밋으로 있음 → 여기선 wb- 접두사로 따로 만든다

## 결정
- 상점 CSS 를 공유하지 않는다: 상점 개편이 아직 main 미커밋이라 브랜치끼리 엮지 않음
- 칸 선택 상태는 탭별로 기억, 기본은 첫 칸
- 재료 부족해도 칸은 고를 수 있고(흐리게), 상세에서 빨간 칩으로 무엇이 모자란지 보여 준다
- 이벤트: spotlight 엔진이 tutorial_spot*(kind 'bench')을 이미 보냄 → 새 GA4 이벤트 없음

## 실게임 확인에서 잡은 것
- 재료 줄 `.wb-inv span` 이 이모지 SVG 안쪽 span(.te/.te-t)까지 물어 아이콘이 안 보였다 → `> span`
- `ui.anyModalOpen()` 은 작업대 자신(body.menu-open)도 참이라 안내 멈춤 조건으로 못 쓴다 → `-modal`·#boat-shop·#worldmap·mg-open 만
- 안내 3단계가 가진 도구(재료 없음)를 가리켜 설명이 안 맞았다 → tourPick 으로 빨간 칩 있는 칸을 먼저 고름
- 가로 폰: 1fr 칸이 이름 길이에 밀려 가로 넘침 → minmax(0,1fr), 상세 버튼 sticky
- 메인 튜토리얼(스포트라이트 full)이 돌고 있으면 작업대 안내는 양보하고 seen 도 안 찍는다(다음 열 때 다시)

## 확인 스크립트
- 스크래치패드 wbr/live.mjs <pc|mob|land> [en] — 메인 튜토리얼은 .sp-next 로 넘기고 진행
