# Context
Last Updated: 2026-09-25 (구현 완료·리뷰 중)

## 핵심 파일
- functions/api/daily-quests.js, functions/api/cafe-guests.js — 즉석 생성 API (폴백으로 유지)
- functions/npc-gen-cron.js, functions/api/_npc-gen.js — 따라갈 크론 패턴(서브리퀘스트 예산·실행기록·notify)
- worker/index.js scheduled — `event.cron` 분기 (카드뉴스 명시 매칭, 나머지 npc-gen → 새 크론도 명시 매칭 필요)
- wrangler.jsonc triggers.crons — 현재 2개 (무료 계정 한도 5)
- js/game.js:172-189 dayStr/dateHash/weatherOf — 기기 로컬 날짜 기반 날씨 해시
- js/data/places.js CAFE_ORDERS=4, js/spaces/cafe.js playerPhase()

## 결정
- 조합 축에서 날씨 제거(서버 계산). 의뢰는 하루 단위 유지(진행도 때문에 시간대 교체 불가).
- 페이싱 6.5s, MAX_CALLS 30, 크론 KST 20:00/23:00.

## 실측
- 429: GenerateRequestsPerMinutePerProjectPerModel-FreeTier = 15, model gemini-3.5-flash-lite. RPD 수치는 미확인(대시보드).
- 수정 후 Gemini 성공 16/16 조합 모두 5개.

## 구현 파일 (feat/ai-pregen-cron)
- functions/api/_game-day.js — 날씨·시간대·KST·태평양 자정·버킷 파싱
- functions/api/_ai-store.js — readVariants/pickVariant/insertRows(ignore-duplicates)
- functions/ai-pregen-cron.js — planPregen/variantsFor/runAiPregen (notify 주입: notify.js 가 cloudflare:email 이라 Node 테스트 불가)
- js/i18n.js aiBucket() (salt 'ai:', A/B 와 독립) · js/spaces/cafe.js cafeSlot()/doneOrders

## 함정 (발견)
- 31진 해시 `${seed}/${i}` 는 접두사 몫이 공통이라 순서가 안 섞인다 → 번호 앞 + murmur finalizer
- 기존 테스트가 cafe-guests.js 의 `const GUESTS = [` 원문을 읽는다 — 상수 이름 바꾸지 말 것
- worker 크론 분기는 명시 매칭 — 표현식이 어긋나면 npc-gen 으로 새서 하루 9번 돈다(테스트로 고정)
- RPD 대시보드: 28일 최대 354/500 (시딩 등 일회성 추정) → 크론 50% 로 보수적
