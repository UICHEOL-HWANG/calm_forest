# game.js 분리 2·3단계 — 공간별 모듈 추출 (순환 import + $w 세터)

- 날짜: 2026-09-25 · 선행: [1단계](2026-09-24-gamejs-split-phase1-design.md)(데이터 표 → js/data/)
- 사용자 지시: "나머지 단계 설계 → 구현 바로 해" (자는 동안 진행). **배포·main 병합은 하지 않는다** — 브랜치 `refactor/gamejs-spaces` 에서 증명까지 끝내고 아침에 승인받는다.

## 1. 결정: 공유 상태 모듈(2단계)을 따로 만들지 않는다
측정(2026-09-24): 최상위 let 246개 중 164개는 한 곳에서만 대입(대부분 초기화), `ui`·`player`·`scene`·`camera` 는 88~158개 함수가 읽지만 대입은 한 번.
ES 모듈은 **순환 import 를 허용**한다 — 로딩 시점에 서로를 건드리지만 않으면 된다. 옮기는 코드는 대부분 함수라 실행은 부팅 뒤다.
→ 공간 코드를 `js/spaces/<공간>.js` 로 옮기고, 거기서 쓰는 game.js 이름은 **game.js 에서 import**(let 은 export 하면 live binding)한다.
공유 상태를 한 객체로 모으는 대수술(`scene` → `W.scene` 전면 치환)은 필요 없다.

유일한 제약: **다른 모듈은 game.js 의 let 에 대입할 수 없다.** 그런 let 만 game.js 의 `$w` 접근자
(`export const $w = { get x() { return x; }, set x(v) { x = v; } }`)를 통하게 하고, 옮긴 코드의 **쓰기만** `x = …` → `$w.x = …` 로 치환한다(`+=`·`++` 도 getter/setter 로 그대로 동작). 읽기는 그대로.

## 2. 무엇을 어디로 (규칙은 도구가 판정)
- 대상: game.js 의 구역(`// ===` 머리말) 단위 — 반딧불 계곡 · 채집 숲 · 카페 · 강 · 안개 숲 · 집(건축) · 집 실내·꾸미기 · 과수원 … 작은 것부터
- 옮기는 것: 그 구역의 최상위 **선언**(function·const·let). 
- 옮기지 않는 것: 최상위 실행문(로드 순서가 바뀐다) · game.js 가 export 하던 선언(바깥 API) · **로딩 시점에 game.js 값을 읽는 초기화**(순환 TDZ)
- let 의 집: 대입하는 문장이 전부 옮기는 쪽에 있으면 함께 옮긴다. 하나라도 game.js 에 남으면 let 은 game.js 에 두고 옮긴 쪽 쓰기를 `$w` 로.

## 3. 증명 (tools/refactor/verify-extract.mjs)
기준 커밋 대비:
- (a) 선언 이름 집합이 같고, 각 선언의 정규화 코드(주석·공백 제거, `export` 제거, `$w.x` 쓰기 → `x`)가 **같다**
- (b) game.js 에 남은 문장의 순서·내용이 같다(추가된 import·export 키워드·$w 선언 제외)
- (c) 옮긴 모듈은 import 와 export 선언만 가진다
- (d) 옮긴 모듈의 로딩 시점 코드(함수 몸체 밖)가 game.js 에서 가져온 이름을 안 읽는다
- (e) 모든 import 가 실제 export 를 가리키고, 외부 모듈 import 는 base 와 같은 파일의 같은 이름
- (f) `$w.x` 쓰기마다 game.js 에 let x 와 $w 의 get/set x 가 있다
- (g) game.js 가 base 에서 export 하던 이름은 전부 그대로 export 한다(sims·index.html·controls.js)
- (h) 바인딩 없는 전역 참조가 새로 생기지 않는다
실행 증명: 구역 하나 옮길 때마다 `npm test` + `smoke.mjs`(원본 N회 고정값 비교).

## 4. 되돌리기
구역마다 커밋 하나. 도구가 결정적이라 main 이 움직이면 `extract-module.mjs` 를 새 main 위에서 다시 돌리면 된다.
