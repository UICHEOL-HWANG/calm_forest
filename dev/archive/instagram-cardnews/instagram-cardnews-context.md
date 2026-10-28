# 인스타 카드뉴스 자동화 — 컨텍스트

**Last Updated:** 2026-09-11

## 목표
회사생활 ↔ calm forest 를 엮은 카드뉴스를 만들어 인스타그램에 **스케줄까지 완전 자동** 발행.
카드 이미지에 AI slop 이 없어야 한다.

## 핵심 결정

### 1. AI 이미지 생성기를 쓰지 않는다
게임 자체가 로우폴리 3D 렌더러다. 카드 이미지는 **게임을 Playwright 로 띄워 직접 렌더**한다.
- AI 생성 이미지 특유의 뭉개짐·스톡 느낌이 원천적으로 없다
- 화풍이 게임과 100% 일치한다(당연히 — 같은 엔진)

### 2. "회사생활" 소재도 게임 안에 있다
게임 인트로가 도시 컷신이다. `js/game.js:6607 INTRO_CAPTIONS`
| T | 장면 | 게임 캡션 |
|---|---|---|
| 0~5.5 | 도시 벤치에 축 처져 앉은 주인공 | 매일이 시끄럽고, 매일이 똑같았다. |
| 6~10.6 | 초록 잎사귀가 바람에 날아옴 | 그날, 바람이 초록 잎사귀 하나를 데려왔다. |
| 11.9~16 | 숲 도착 | …여기라면, 조금 쉬어가도 되지 않을까. |
회사 이미지를 따로 만들 필요가 없다. 3막 서사가 이미 완성돼 있다.

### 3. 게임 코드에 촬영 전용 훅을 만들지 않았다
`js/game.js:124~` 에 이미 있는 개발 파라미터를 그대로 쓴다:
`?lang=ko` `?time=0~1` `?weather=rain|snow|fog|clear` `?spawn=x,z` `?river=1` `?mist=1` `?sea=1`
콘솔 훅(localhost 전용, `js/game.js:1613~`): `__introTest()` `__introJump(s)` `__tp(x,z)`

**유일한 게임 코드 변경**: `js/game.js:125` — `?weather=clear` 를 허용 목록에 추가.
기존엔 rain/snow/fog 만 받아 맑은 날 고정이 불가능했다(개발 검수에도 필요했던 결함).

### 4. HUD 숨김은 id 나열이 아니라 한 줄 규칙
```css
body > *:not(#app):not(script){display:none!important}
```
`#app` 이 Three.js 캔버스고 body 직계 나머지는 전부 UI다. UI 가 추가돼도 안 깨진다.

### 5. playwright 는 게임 루트 package.json 에 넣지 않는다
`tools/cardnews/package.json` 으로 격리. Cloudflare Workers Builds 가 배포마다
playwright(~100MB 브라우저)를 받게 하면 안 된다.

## 디자인 토큰 출처
`tools/cardnews/templates/_base.css` — `js/game.js:1231-1234`(ground/wood/sky), `index.html:38`(cream/mint/ink)
- 폰트: Pretendard (jsdelivr CDN). 액센트 1개(#d4703c 노을 오렌지)
- taste-skill 지침 적용: 순수 검정 금지, 네온 글로우·그라디언트 텍스트 금지, 중앙정렬 편향 금지

## 밝은 씬 / 어두운 씬 규칙 (실측으로 확인)
- **어두운 씬**(도시 밤): 하단에 어두운 스크림 + 크림색 글자
- **밝은 씬**(낮 숲): 하단에 **크림색** 스크림 + 잉크 글자.
  밝은 잔디에 어두운 스크림을 씌우면 흙탕물처럼 탁해진다(a2 1차 렌더에서 확인).

## 인스타그램 발행 제약 (2026 확인)
- Instagram 프로페셔널(비즈니스/크리에이터) + FB 페이지 + Meta 앱 + `instagram_content_publish` 승인 필요. 전부 무료.
- 캐러셀: 컨테이너 생성 → `media_publish` 2단계. **이미지는 공개 URL 이어야 함**
- ⚠️ 캐러셀 첫 장 비율로 나머지가 잘린다 → 전 카드 1080×1350 고정
- 토큰 60일 만료(50일마다 갱신), 24시간 100건 제한

## 6. 발행 경로 확정 (2026-09-11)
**Instagram 로그인 직접**(`graph.instagram.com`). 페이스북 페이지도, OAuth 플로우도,
앱 시크릿도 안 쓴다. 대시보드 "토큰 생성" 버튼 → 60일 토큰 → 50일마다 refresh.

⚠️ **자격증명 두 쌍이 헷갈린다.** Meta 대시보드에는 이름이 비슷한 ID/시크릿이 두 벌 있다.
| 위치 | 값 | 쓰는 곳 |
|---|---|---|
| 앱 설정 > 기본 설정 | Facebook 앱 ID `1094546423328089` | 우리는 **안 씀** |
| Instagram 제품 페이지 | Instagram 앱 ID `1566803768460364` | (OAuth 쓸 때만) |
Instagram 자격증명을 `graph.facebook.com` 에 던지면 code 190 이 난다. 이걸로 한 번 헤맸다.

계정: `calm.forest.official` · IG user id `17841423915491885` · MEDIA_CREATOR

## 7. 호스팅은 "영구"가 아니라 "임시"다 (2026-09-11)
Meta 는 컨테이너 생성 시점에 `image_url` 을 한 번 긁어가 자기 복사본을 만든다.
**URL 은 발행 직전 몇 분만 살아 있으면 된다.** R2·OCI 를 붙일 이유가 없었고,
Workers KV + `--ttl` 로 호스팅과 만료 정책이 동시에 해결됐다. 새 시크릿 0개.

## 미해결
- 게임 월드 간판·`!` 말풍선이 캔버스 안 3D 오브젝트라 CSS 로 못 숨긴다.
  `?spawn=` 으로 구도를 피하는 중. 깨끗한 촬영 좌표 목록이 필요하다.
- **캡션 미작성** — deck-01 의 `caption` 키. 발행 유일 블로커
- **프로덕션 배포 대기** — game.js 에 다른 세션의 미완성 요리 개편이 섞여 있다
- deck-01 의 3·4번 카드가 `gen/*.png` 를 가리킨다. gen/ 은 gitignore 라 새로 클론하면
  렌더가 깨진다. `art/03_subway.svg`·`art/04_resume.svg` 가 이미 있으니 교체하면 된다.
