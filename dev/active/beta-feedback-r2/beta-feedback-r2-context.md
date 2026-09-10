# 컨텍스트 — beta-feedback-r2
Last Updated: 2026-09-10

## 핵심 파일 (조사 결과, 줄번호는 0ace891 기준)
- game.js:990 checkDailyBonus (출석 본문 1001-1004)
- index.html:1807 openWorldMap, 2289/2219 lastPlaces 대입, game.js:7780 place 판정
- index.html:69-130 #topleft/#util-btns/#emote-pop, 486 #minimap, 88 `#topleft.open ~ #minimap` 숨김, 3653 emote-btn, 2649 menu-btn
- game.js:8110 startActionShot poses, 7885-7895 heart/dance 회전
- game.js:9739 updateOwlFly, 9748 perch→순찰 조건, 9663 fly 초기화(next 12+rand*10)
- game.js:8338-8342 날씨 fog near/far
- game.js:5623 바닥 woodMat(7,7), 5700 테이블, 5697 책장, 4772 woodMat(rx,ry,tint)
- game.js:8758 tryFish (8761 호수 거리), 8691 강 데크 분기, 나루터 연못 DOCK_POND 321
- game.js:8134 triggerMoment, 9098 tryHarvest 호출
- index.html:3735 ext-btn 열기, game.js:8089 camOffset, 8226 updateCamera, 8230 photo override
- game.js:8741 도구 switch, tryHoe 8898/trySeed 9023/tryWater 9059/tryHarvest 9080, Input.selectTool 1318
- 실내: INT=(0,0,52) HALF 7, updateCamera에 indoor 분기 없음

## 의사결정
- 바다터/나루터 낚시 허용 X (별도 콘텐츠)
- 연출 토글 안 만듦 (YAGNI)
- 수확 줌 첫 1회만 (사용자 제안)

## 검증
- .claude/launch.json `python3 scripts/serve.py` 8000. 브라우저 페인 document.hidden → rAF 1fps 주의(메모리 mobile-hud-layout)
- 안개: `?weather=fog`, 실내: enterHouse
