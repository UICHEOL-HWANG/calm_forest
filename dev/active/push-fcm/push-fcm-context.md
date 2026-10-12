# push-fcm context
Last Updated: 2026-10-12

## 결정
- 안드로이드(Capacitor)만. 웹·토스·itch 는 IS_ANDROID 가드로 무동작.
- 발송: KST 20:10~22:50. cron 표현식을 `0,10,20,30,40,50 11-13 * * *` 로 넓히고 worker 가 scheduledTime 분으로 가름(0·20·40 ai-pregen 그대로 9회, 10·30·50 push 9회). ⚠️ 같은 실행에 얹지 않은 이유: ai-pregen 혼자 subrequest 44/50. push tick 당 발송 40통(후보1+토큰1+40+원장1+표시1=44).
- 판정 표시: last_checked_on(보냈든 안 보냈든) — 5xx 만 재시도. 🦝 판정 날짜 = 내일(KST) — 클라는 다음 접속일로 판정.
- 유저당 하루 1통, 우선순위 night > craft > return. return 은 7일 2회 상한.
- 토큰 등록은 /api/push-register(서비스 키 upsert, token PK). FCM HTTP v1 은 Worker WebCrypto RS256 JWT, CARDNEWS KV 캐시. 시크릿 FCM_SA_KEY.

## 핵심 파일
- functions/api/night-visit.js (HMAC 판정 → _night-judge.js 로 추출)
- js/spaces/night-visit.js:203 computeNightDefense (gameState 의존 → js/duel/night-defense.js)
- js/craft/slots.js isReady (slot.day < today)
- functions/api/orchard-events.js:31 verifyAnyUser (JWT 검증 패턴)
- functions/npc-gen-cron.js sb() / functions/api/_ai-store.js storeHeaders (PostgREST 서비스 키)
- worker/index.js routeApi·scheduled (새 cron 은 명시 분기 필수, 기본값이 npc-gen)
- js/cap-bridge.js capPlugin (이벤트 리스너 없음 → capListen 추가)
- js/spaces/farm-auto.js tryHarvest · js/game.js firstHint/catchCeremony · index.html endCoach·#settings-modal
- js/i18n-en.js, js/analytics.js trackEvent

## 함정
- 세이브 날짜는 기기 로컬(dayStr). 서버는 KST 가정.
- google-services.json 은 gitignore, PUBLIC 저장소 — 절대 커밋 금지.
- 워크트리 node_modules 는 npm ci 로 별도 설치(루트엔 @anthropic-ai/sdk 없음).
