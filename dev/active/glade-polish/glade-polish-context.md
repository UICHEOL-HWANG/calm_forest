# 반딧불이 계곡 다듬기 · context

Last Updated: 2026-11-22

- 기준: main 491e8783. 계곡 코드 `js/spaces/glade.js`, 규칙 `js/glade/*.js`, 기록 `dev/active/glade-develop/`
- 나무 베기는 `js/spaces/fishing.js` `tryChop`, 자동 도끼 잡기는 `js/game.js` `nearestTreeDist` → `js/spot-tool-auto.js`
- 구역 도구 표 `js/data/tools.js` `ZONE_PAGE`·`ZONE_TOOL`(테스트 `tests/mine-tool-kit.test.mjs`)
- 점검 캡처 도구: scratchpad `strip.mjs`(시간차 4장) + ffmpeg tile

## 결과 (2026-11-22)
- 6가지 모두 구현, npm test 6709 통과, build-web 성공, i18n_check 계곡 7/7(doors.js 118/119 는 main 과 같음, 밭 넓히기 문구)
- CDP 확인: 계곡 들어가면 포충망, 나가면 원래 도끼로. 줄등 나무 8그루는 안 베임(hp 3→3), 다른 나무는 베임. 큰 반디 지킴 중 휘두르면 다음 꼬마 자리에 반짝 14개
- 바닥 빛은 처음 납작한 원판으로 보여 정점색으로 가운데→가장자리 흐림 처리
- 코드 리뷰 반영: 나무 베기 목표 화살표·채집 판정도 줄등 나무 제외(goal-guide.js, game.js), 바닥 빛 fade 음수 방지, 한 줄기 속도 2.4(교차점에서 뒤처짐), 목표보다 멀리 가는 떨림 방지(step=min)
- 남긴 것: 매 프레임 작은 배열·객체 몇 개(지금 규모에선 무해), 줄등 나무 근처에서 자동 도끼가 잡힌 채 계곡에 들어가면 나갈 때 도끼로 돌아옴(광산과 같은 기존 방식)
- 캡처: `sims/glade-polish/before-after-gnight_{stream,low}.png`, `sims/glade-develop/impl/phone-gnight_low.png`
- 미확인: 실기기·fps·소리
