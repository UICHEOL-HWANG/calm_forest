# 인스타 카드뉴스 자동화 — 태스크

## Phase 1. 촬영 (거의 완료)
- [x] 포토모드 캡처 스크립트 `tools/cardnews/shoot.mjs`
- [x] HUD 숨김 (body 직계 규칙)
- [x] 한국어 고정 `?lang=ko` (헤드리스 크롬 로케일이 en 이라 필요)
- [x] `?weather=clear` 허용 (game.js 1단어)
- [x] 인트로 도시 컷 캡처 (`__introTest` + `__introJump`)
- [x] 두 번째 촬영부터 인트로/튜토리얼이 안 뜨는 문제 (보이면 누르기로 처리)
- [ ] 간판·말풍선 없는 깨끗한 촬영 좌표 목록 확정
- [ ] 계절/시간대/장소 프리셋 확장 (바다·안개·강·카페·광산)

## Phase 2. 카드 렌더 (진행 중)
- [x] 렌더러 `tools/cardnews/render.mjs` (HTML → 1080×1350 PNG)
- [x] 디자인 토큰 `_base.css`
- [x] 시안 3종 비교 → A(풀블리드) 채택
- [x] 밝은 씬 반전 규칙
- [x] HTML 하드코딩 → **덱 JSON 1개로 N장 생성** (`deck.mjs`)
- [x] 표지/본문/전환/게임/CTA 역할 분리 (kind)
- [x] 밝은/어두운 씬 theme 분기
- [x] 이미지 누락 시 렌더 중단 (빈 칸이 발행까지 흘러가지 않게)

## Phase 3. 카피
- [x] deck-01 7장 카피 (humanizer 기준 적용 — 쉼표 1개, 번역투 0, ~적 N 0, 가능표현 0)
- [ ] 캡션 + 해시태그 생성
- [ ] 덱 2~5 소재 확장

## Phase 3.5. 이미지 생성 → **손으로 그린 SVG 로 대체 (2026-09-09)**
- [x] `generate.mjs` — gemini/gti 두 경로 지원
- [x] 프롬프트 4장 작성 (얼굴 없음·평면 벡터·게임 팔레트)
- [x] Gemini 경로 검증 → **결제 없이는 불가**. 키는 정상(텍스트 모델 호출 성공)인데
      이미지 모델만 `free_tier ... limit: 0`. `gemini-3-pro-image` · `gemini-2.5-flash-image` 동일.
      → Gemini 이미지 생성은 결제 등록된 프로젝트 전용.
- [x] gti 경로 여전히 막힘 — `~/.codex/auth.json` 없음 (GPT Plus 결제 후 `codex login` 예정)
- [x] **1~4장을 SVG 로 직접 작성** — `art/02_meeting.svg` `03_subway.svg` `04_resume.svg`
      (기존 `01_desk_night.svg` 와 같은 방식·같은 팔레트). deck-01 의 img 경로를 art/* 로 교체.
      프롬프트가 이미 "평면 벡터·하드 엣지·그라디언트 없음·hex 지정"이라 그대로 옮겨 그릴 수 있었다.
      → **생성 API 의존이 사라졌다.** 결제해도 1~4장은 SVG 유지 권장(재현성·수정 가능).

## Phase 3.6. 게임 컷 재촬영 — ✅ 완료 (2026-09-10)
- [x] 05 `city_leaf` — 인트로 도시 컷, 손 안 댐
- [x] 06 `farm_watered` — **원인 두 겹이었다(systematic-debugging)**
      · `?farm=1` 은 정상 동작했다. 실제 범인은 `enterFarm()` 이 띄우는 첫 안내 모달을
        index.html:3239 의 capture 리스너가 잡아 **Space 를 stopPropagation** 하는 것 —
        첫 Space 가 도구질이 아니라 "알겠어요" 클릭이 된다.
      · 그리고 스폰 지점(FARM.z+FARM_HALF-1.5)이 남쪽 출구 판정(1.8) 안이라 nearDoor='farmexit' →
        다음 Space 가 exitFarm() 을 때려 마을로 나가고, 루틴이 마을 화분에 찍혔다.
      → shoot.mjs 의 farmRoutine 에서 모달을 먼저 닫고 KeyW 로 출구를 벗어난 뒤 시작한다.
- [x] 밭 격자는 `Math.round(x/2)*2` = 2 유닛(tryHoe). 시간으로 걸으면 같은 칸을 두 번 때린다
      → `__pos()` 로 실제 이동량을 보고 멈추는 walk() 로 교체.
- [x] `WET_TIME=5초`(js/game.js:105) — 칸마다 물을 섞어 주면 먼저 준 칸이 촬영 전에 말라
      💧'물 줘요!' 말풍선이 뜬 채 찍힌다 → 물주기는 맨 끝에 몰아치고, 예산 초과 시 **throw**.
- [x] 07 CTA — `shots/cta_ne.png`(spawn=18,-12 노을 바다·등대) 로 교체.
      마을 시설은 전부 z ≥ -8 에 몰려 있고 카메라가 -Z 를 보므로 북쪽으로 넘어가면 깨끗하다.
- [x] 해상도 분기: 정지 샷 DSF 2 / 조작 샷 DSF 1.
      헤드리스에서 2배로 그리면 10fps → 4fps 라 같은 900ms 에 2.40유닛 → 0.60유닛만 간다(실측).
- [x] deck.mjs 에 `zoom` 필드 — 게임 카메라(camOffset)를 못 당기는 대신 focus 중심으로 크롭.
      07 은 이 크롭으로 '바다터' 팻말을 잘라냈다.

### ❗ HUD 는 원래부터 정상이었다
`body > *:not(#app)` 로 DOM 은 완전히 숨겨진다(프로브로 확인: #app + canvas 만 남음).
남아 보이던 "집 짓기 · 🪵10" 은 HUD 가 아니라 **3D 빌보드**다(js/game.js:4747 `c.fillText`).
NPC 이름표·`!`·간판·시세판·랭킹보드도 전부 월드 오브젝트다 → CSS 로 못 없앤다. 구도로만 피한다.

## Phase 4. 호스팅
- [ ] PNG → 공개 URL (OCI Object Storage 기존 버킷 재사용)
- [ ] 만료 정책 (발행 후 며칠 뒤 정리)

## Phase 5. 발행
- [ ] Instagram 프로페셔널 전환 + FB 페이지 연결 ← **사용자 작업**
- [ ] Meta 앱 생성 · `instagram_content_publish` 권한 신청 ← **사용자 작업**
- [ ] 장기 토큰 발급 + Worker Secret 등록 ← **사용자 작업(토큰은 내가 못 다룸)**
- [ ] 캐러셀 발행 모듈 (컨테이너 N개 → 부모 → publish)
- [ ] 토큰 자동 갱신 (50일)

## Phase 6. 스케줄
- [ ] Cloudflare Cron Trigger (worker/index.js 에 scheduled 핸들러)
- [ ] 소재 큐 (다음에 뭘 올릴지) — Supabase 테이블
- [ ] 발행 로그 · 실패 알림
