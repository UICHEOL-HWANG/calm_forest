# 🍽️ 식당 오늘의 특선 기획

## 1. 목적

식당에 매일 들를 이유를 만든다. 하루 한 메뉴가 특선이 되어 코인을 두 배로 주고 손님이 그 메뉴를 더 자주 시킨다. 특선 재료를 포구에서 챙겨 오는 고리가 생긴다.

## 2. 사용자 결정 (2026-11-21)

| 항목 | 결정 |
|---|---|
| 순서 | 식당 디벨롭 3종 중 첫째(오늘의 특선 → 단골 특별 주문 → 새 메뉴·별 5·6) |
| 효과 | 코인 두 배 + 특선 주문 확률 절반 |
| 정하는 법 | 날짜 기준, 지금 별에서 열린 메뉴 중 창고 재료가 있는 것만 후보 |
| 표시 | 식당 안 칠판 + 영업 시작 안내. 시안 3개 이상 PC·모바일 비교 필수 |

## 3. 특선 정하기

- 그날 식당에 처음 들어갈 때 정한다. `pickSpecial(menus, pantry, date)`: 후보 = `menus` 중 `pantry[MENU[m].from] > 0`. 후보가 없으면 `null`. 후보가 있으면 날짜 문자열 해시로 하나.
- 정한 값은 `restaurant.special = { date: 'YYYY-MM-DD', menu }`로 저장. 같은 날이면 다시 고르지 않는다(재료가 나중에 떨어져도 바꾸지 않음). 날짜가 바뀌면 새로 고른다.
- 후보가 없어 `menu: null`로 정해진 날도 저장해 그날은 특선 없음.
- sanitize: `date`는 문자열, `menu`는 `MENU_KEYS` 중 하나 또는 null. 아니면 버린다.

## 4. 효과

- 코인: 특선 메뉴 대접은 `stars * COIN_PER_STAR * 2`. 직원이 대접한 것도 같다.
- 주문: `pickMenu(npc, menus, rng, special)`. 단골은 좋아하는 메뉴를 먼저 절반 확률로 고른다(지금과 같음). 고르지 않았거나 단골이 아니면, 특선이 재고 있는 메뉴일 때 절반 확률로 특선. 나머지는 지금처럼.
- 재고: 특선 재료가 떨어지면 기존 재고 필터대로 아무도 시키지 않는다.
- 연습판(첫 영업)에는 특선을 적용하지 않는다.

## 5. 화면 (시안 필수)

- 식당 안 칠판(`hall.js` 입구 칠판)에 특선 메뉴 아이콘. 조형 시안 3개 이상을 실제 식당에 놓고 PC·모바일 캡처로 비교해 고른다.
- 영업 시작 안내: 영업을 시작할 때 특선 메뉴와 코인 두 배를 잠깐 띄운다. 배치 시안 3개 이상, 문구 후보 검수 후 넣는다.
- 특선이 없는 날은 칠판에 그리지 않고 안내도 띄우지 않는다.
- 화면 이모지는 전역 변환기가 아이콘으로 바꾼다. 3D 칠판 아이콘은 `toss-icons-all.js` 아이콘을 캔버스에 그린다(단골 명패와 같은 방식).

## 6. 코드 구조

| 파일 | 내용 |
|---|---|
| `js/restaurant/special.js` (새) | `pickSpecial`, `todaySpecial(rest, menus, pantry, date) → { rest, menu }`, `sanitizeSpecial` |
| `js/restaurant/regulars.js` | `pickMenu`에 `special` 인자 |
| `js/restaurant/session.js` | `createSession({ special })`, 코인 두 배 |
| `js/restaurant/rules.js` | default·sanitize 에 `special` |
| 칠판 조형 (시안 결과로 정함) | 특선 아이콘 |
| `js/restaurant/hud.js` | 영업 시작 안내 |
| `js/spaces/restaurant.js` | 입장 때 `todaySpecial`, 세션·칠판에 전달 |

## 7. 트래킹

`restaurant_service`는 이미 파라미터 5개(star·served·avg_score·dda·regular_n)로 이벤트당 5개 상한에 닿았다. 이번에는 파라미터·이벤트를 더하지 않는다. 특선 효과 측정이 필요해지면 따로 정한다.

## 8. 테스트

- special.js: 후보 없음 → null, 재고 없는 메뉴 제외, 같은 날 같은 결과, 날짜가 바뀌면 다시 고름, 저장된 같은 날 값 유지, sanitize.
- pickMenu: 시드 고정으로 특선 비율이 절반 근처, 단골 좋아하는 메뉴 우선, 특선 재고 없으면 무시.
- session: 특선 코인 두 배, 연습판 미적용.
- 미리보기: 칠판·안내 PC·모바일 캡처.

## 9. 범위 밖

결과 카드 특선 줄, 마을 외관 간판, 특선 전용 보상, 단골 호감도 추가.
