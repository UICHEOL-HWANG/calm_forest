# 인스타 카드뉴스 자동화 — 컨텍스트

**Last Updated:** 2026-09-09

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

## 미해결
- 게임 월드 간판·`!` 말풍선이 캔버스 안 3D 오브젝트라 CSS 로 못 숨긴다.
  `?spawn=` 으로 구도를 피하는 중. 깨끗한 촬영 좌표 목록이 필요하다.
- Meta 앱·토큰 미발급
- 이미지 호스팅 경로 미정(OCI Object Storage 기존 사진첩 버킷 재사용 유력)
