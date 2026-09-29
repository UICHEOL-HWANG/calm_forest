# 🍲 자유 냄비 — Context

**Last Updated:** 2026-09-29

## 왜 / 어떻게 여기까지 왔나
- 시작은 TypeSafe **Jev**(System One 판정 모델)를 게임에 넣을 수 있느냐는 질문이었다. 후보 4개(일꾼 분배·부두 인카운터·상인 시세·요리 심사) 중 **요리 심사만** 남겼다.
  - 일꾼: `pickTask` 규칙과 오프라인 `catchUpSteps` 가 있어 실시간 API 와 맞지 않는다.
  - 시세: 날짜 시드로 **전원 동일**(game.js:521). 유저마다 다르게 하면 공정성·econ_logs 분석이 깨진다.
- Jev: 무료 등급 없음(입력 100만 토큰당 $0.042, early access, 한국어 언급 없음, Score 보정 약함). Laya(오픈소스)는 학습 없이 쓰면 0.362로 약하다 → **둘 다 안 쓰고 Gemini 하나로 표를 만든다.**
- 할당량: 게임 크론이 하루 190~230회(`ai_pregen_runs` 실측 9/25~9/28)를 쓴다. 한도 500. 표 생성은 **한 번에 약 20회**라 여유 있다.

## 샘플 결과 (scratchpad, 커밋 안 함)
- 1차: ★5 과다(8/20), 기존 레시피 이름 불일치, 재료 없는 파이, 꿀×3 ★5, ★1인데 맛있어 보이는 이름.
- 2차(규칙 반영): 분포 ★5 1 / ★4 7 / ★3 8 / ★1~2 5 로 개선. 남은 문제는 이모지 누락(`persimmon` 글자), 레시피 이름 충돌("포도주스"), 길이 초과, 띄어쓰기 없음 → `validateEntry` 로 거른다.
- 사용자 결정: **시큰둥한 톤("그냥 복숭아 맛이에요") 제외** → 금지어 목록.

## 핵심 결정
| 결정 | 이유 |
|---|---|
| 런타임 LLM 0, 표를 커밋 | 비용 0·오프라인·토스·Play 동일 동작·공개 저장소 키 노출 없음 (NPC 잡담과 같은 원칙) |
| Gemini 는 글+맛만, 경제 수치는 규칙 | LLM 이 버프·가격을 정하면 밸런스를 못 잡는다 |
| 합성 레시피 + `dishOf` | 코스·DDA·트래킹·찬장·먹기를 전부 재사용. 새 save 필드 없음(발견 기록 = `kitchen.best` 의 `free:` 키) |
| 레시피와 같은 재료 조합은 막음 | 같은 재료로 이름이 두 개가 되는 혼란 방지. baked_yam·herb_salad 는 원래 재료가 같다(기존 충돌) |
| 반복 조합 ★3 상한 | 싼 재료 하나로 최고점 공략 방지 |
| 지속 20/30/45/60/90초 | ★3 자유 요리가 ★1 레시피(60초)보다 짧게 — 레시피 가치 유지 |
| 표는 `js/free-pot/` (not `js/data/`) | `tests/helpers/game-source.mjs` 가 `js/data/*.js` 를 전부 이어 붙인다 |
| 표 지연 로드(dynamic import) | 약 130KB. 첫 로딩(64모듈)에 얹지 않는다. fetch 대신 import 라 토스·itch·cap 빌드에서도 같은 경로 |
| 카페 취향 주문은 **2단계**(이 계획 밖) | 카페 주문·찬장·서빙이 레시피 id 전제 → 한 번에 묶으면 범위가 커진다. 태그는 지금 같이 생성해 둔다 |

## 핵심 파일
- `js/data/catalog.js:84` RECIPES(11종), `COURSE_MULT`, `CAFE_PAY`, `SELL_PRICE`
- `js/spaces/cooking.js` — `COOK_TIERS`, `recipeOf`, `courseOf`, `kitchenView`, `pantryView`, `cookResolve`, `eatDish`, `pantryEat`
- `js/game.js:4578~4660` — `cookTier`, `pantryHas`, `kitchenStart`, `kitchenFinish`, `pantryTake`
- `index.html:4276` `renderKitchen`, `:4606` `startCookCourse`, `:4690` `endCourse`, `:4726` `showCookResult`, `:4812` 검증 훅 `__kitchenOpen/__mgStart`
- `js/spaces/cafe.js:1274` `serveCafeGuest`(찬장은 레시피 id 로만 꺼낸다 → 자유 요리는 카페에 안 섞인다)
- `functions/ai-pregen-cron.js` — 크론 예산 규칙(한도 절반, 6.5초, 429 즉시 중단)
- `tests/helpers/game-source.mjs` — 소스 검사 테스트 도우미

## 의존성·주의
- `SELL_ICO_G`·`RES_LABEL` 에 과일 5종 있음(확인). `catalog.js` 는 three 때문에 Node import 불가 → 소스 파싱(`tools/free-pot/recipes-src.mjs`).
- i18n 옵저버: 사전에 없는 한국어는 영어 모드에서도 한국어로 남는다 → 생성 문구는 `_en` 을 직접 쓴다.
- GA4 파라미터 새로 2개(`taste`, `is_new`).
- 현재 브랜치 `feat/orchard-look` 에 과수원 외관 작업이 **미커밋**. 이 기능은 그 작업을 마무리한 뒤 **새 브랜치**(`feat/free-pot`)에서 한다.
- 수확제 광장 10/9 시작 — 그 전에 끝낼 수 있으면 좋지만 필수 아님.
