# 🔔 FCM 푸시 알림 (안드로이드 1차)

## Context
Google Play 프로덕션 출시(2026-10-12, v66)로 9/8 에 세워 두고 멈춘 푸시 계획을 실행한다. 목표는 돌아올 이유가 있는 날에만 하루 1통을 보내는 것(힐링 톤 유지, 이유가 없는 날엔 보내지 않음).
- 범위: **안드로이드 Capacitor 앱만** 대상(웹·토스·itch 는 코드 가드로 무동작)
- 알림 3종: 🦝 밤손님 예고 · 🔥🫙 밤사이 가공 완료 · 🌱 3일 이상 미접속 복귀
- 권한 요청: **첫 수확 직후 안내 카드 → 시스템 팝업**, ⚙️ 설정에 🔔 켜기/끄기 토글

현재 상태: Firebase `calmforest-app` 있음 · `google-services.json` 은 capacitor 워크트리에만 있음(gitignore) · build.gradle 의 google-services 플러그인 연결은 이미 됨 · 푸시 코드·토큰 테이블·서비스 계정 서명·cron 자리 모두 없음.

## 핵심 설계 결정
1. **발송 시각: 하루 1회, KST 20:00**. cron 자리 5개가 모두 차 있어서 기존 ai-pregen 트리거 `0,20,40 11-13 * * *`(UTC 11:00 = KST 20:00)에 얹는다. 11:00·11:20·11:40 세 번의 tick 이 발송을 이어받는다. 무료 플랜의 subrequest 50개 한도 때문에 tick 마다 최대 20통까지만 보내고, 보낸 사람은 `last_sent_on` 으로 표시해 다음 tick 에서 이어서 처리한다(하루 약 60통, 초기 Android 규모에 충분). 안드로이드 유저가 늘면 유료 전환이나 Queues 를 검토한다.
2. **유저당 하루 최대 1통**, 우선순위는 🦝 > 🔥🫙 > 🌱.
   - 🦝: 내일 날짜(KST)로 기존 HMAC 판정을 미리 돌려 **오늘 밤 실제로 오는 경우에만** 보낸다. 예: "오늘 밤 밭에 손님이 올 것 같아요 🦝". 그 뒤 허수아비를 세우면 결과가 바뀌는데, 이것도 게임 플레이의 일부로 본다.
   - 🔥🫙: `state.craft.slots` 중 `day < 오늘` 인 칸이 있고, 오늘 아직 접속하지 않은 경우(`game_saves.updated_at < 오늘 00:00 KST`).
   - 🌱: `updated_at` 이 3일 이상 지났고 자라는 작물이 있는 경우. 7일 동안 최대 2회까지(그 이상은 스팸).
3. **서버 판정 로직 재사용**: `functions/api/night-visit.js` 의 판정 부분을 순수 함수 `judgeNight()` 로 꺼내 API 와 cron 이 함께 쓴다. `computeNightDefense` (`js/spaces/night-visit.js:203`)는 `gameState` 에 묶여 있으므로 순수 함수 `js/duel/night-defense.js` 로 옮기고, 기존 `js/spaces/night-visit.js` 는 이 함수를 호출하도록 바꾼다. 가공 완료 판정은 `js/craft/slots.js` 의 `isReady` 를 그대로 import 한다.
4. **토큰 저장**: 새 API `POST /api/push-register` 를 만든다. 인증은 `functions/api/orchard-events.js:31` 의 `verifyAnyUser` 와 같은 방식으로 하고, 서비스 키로 upsert 한다. 기기 하나가 계정을 바꿔 쓰는 경우를 위해 token 을 PK 로 두고 user_id 를 다시 연결한다.
5. **FCM 인증**: Worker 에서 WebCrypto(RS256)로 서비스 계정 JWT 를 직접 서명해 access token 을 받는다(저장소에 재사용할 코드가 없음). 토큰은 `CARDNEWS` KV 에 55분 동안 캐시한다. 새 시크릿은 `FCM_SA_KEY` 이고, `404 UNREGISTERED` 응답이 오면 그 토큰을 삭제한다.

## 단계 (TDD, `feat/push-fcm` 워크트리를 main 에서 새로 생성)
0. **dev docs**: `dev/archive/push-fcm/` 에 plan·context·tasks 3개 파일. 🔑 PUBLIC 저장소이므로 `google-services.json`·SA 키는 절대 커밋하지 않는다.
1. **DB** `sql/migrations/migrate_push_tokens.sql` (pg8000 풀러로 직접 실행):
   - `push_tokens(token text pk, user_id uuid → auth.users on delete cascade, platform check ('android'), enabled, lang, tz, created_at, updated_at, last_sent_on date, last_kind, return_sent_count)`. RLS 켜고 정책은 두지 않는다(서비스 키 전용).
   - `push_logs(id, user_id, kind, sent_at, status)`: 발송 원장. GA4 의 `push_open` 과 kind·send_id 로 이어 붙인다.
   - RPC `push_candidates(p_today, p_limit)` security definer: enabled 이고 `last_sent_on < p_today` 인 토큰을 game_saves 와 조인해 필요한 jsonb 조각(plots·outdoor·night.truce·craft)과 updated_at 만 반환한다. 실행 권한은 서비스 롤에만 준다.
2. **서버 순수 모듈 + 테스트**
   - `functions/api/_night-judge.js`: `judgeNight(...)`. `night-visit.js` 가 이 함수를 쓰도록 바꾸고 기존 테스트는 그대로 통과해야 한다.
   - `js/duel/night-defense.js`: `computeNightDefense(cands, outdoor)`.
   - `functions/push/pick-kind.js`: 후보 한 행과 오늘 날짜를 받아 `{kind,title,body}|null` 을 돌려준다(우선순위·상한 포함).
   - `functions/push/fcm.js`: `getAccessToken(env)`(JWT 서명·KV 캐시)와 `sendFcm(env, token, msg)`.
   - `functions/push-cron.js`: `runPush(env, {budget:20})`.
3. **Worker 연결**: `worker/index.js` 에 `/api/push-register` 라우트를 등록하고, `scheduled` 의 ai-pregen 분기에 11시대 tick 일 때만 `runPush` 를 waitUntil 로 연결한다. `wrangler.jsonc` 주석에 cron 공유 사실을 적는다.
4. **안드로이드**
   - `@capacitor/push-notifications` 설치
   - `AndroidManifest.xml` 에 `POST_NOTIFICATIONS` 추가
   - 상태바용 흰색 실루엣 아이콘 + `capacitor.config.json` 의 `PushNotifications.presentationOptions`
   - 루트 `android/app/` 에 `google-services.json` 복사(gitignore 확인, 키 교체 후 파일인지 확인)
5. **클라이언트**
   - `js/cap-bridge.js` 에 `capListen()` 추가(이벤트 리스너, +테스트)
   - `js/push-native.js`(순수, 플러그인 주입): 권한 요청 → register → 토큰 → `/api/push-register`. 그 밖에 `setEnabled`, 알림 탭 시 `push_open{kind}` 기록
   - 카드: `js/spaces/farm-auto.js` 의 `tryHarvest` 안에서 첫 수확(`!hintsSeen.harvestZoom`)일 때 `firstHint`(`js/game.js:1232`)와 같은 방식으로 지연 표시한다. 튜토리얼 중이면 `endCoach` 다음으로 미룬다. `hintsSeen.pushAsk` 로 1회만 띄우고, 이미 수확한 기존 유저에게는 다음 접속 때 1회 띄운다. `IS_ANDROID` 가드를 건다.
   - ⚙️ `#settings-modal`(index.html:2530) 에 🔔 알림 토글 추가. Android 에서만 보이고, `cf_push` 를 localStorage 와 서버 `enabled` 에 함께 저장한다.
   - i18n: `js/i18n-en.js` 에 통문장 추가, 서버 문구는 lang 별 ko/en 두 벌.
   - 트래킹: `push_prompt_shown/accept/later`, `push_permission`, `push_open`, `push_toggle`. 파라미터는 5개 이하.
6. **디자인·문구 검수 (구현 전 컨펌)**: 안내 카드 시안 3개를 모바일로 캡처해 나란히 비교받는다. 알림 문구 3종 × 후보 2~3개도 먼저 검수받는다.
7. **리뷰**: code-reviewer + security-reviewer(JWT 서명·시크릿·RPC 권한). 푸시 전에 키 패턴을 스캔한다.

## 사용자 몫
- GCP `calmforest-app` → Firebase Admin SDK 서비스 계정 키(JSON) 발급 → 키체인 저장(`calmforest-fcm-sa`). 그 뒤 `wrangler secret put FCM_SA_KEY` 는 내가 실행한다.
- 실기기 확인: 권한 팝업·알림 수신·탭으로 앱 열기.

## 검증
- `npm test` 전체 통과(새 테스트: night-judge 동치성, night-defense, pick-kind 우선순위·상한·KST 날짜, JWT 서명 형식(테스트 키), capListen, push-native 흐름, 라우트 등록, i18n_check)
- `wrangler dev --test-scheduled` 로 cron 을 호출하고, 내 토큰 1개만 넣은 상태에서 실제 FCM 발송 → 폰 수신과 push_logs 기록 확인
- Play internal 빌드 실기기에서 카드 → 권한 → 토큰 행 생성 → 수신 → 탭 → GA4 `push_open` 확인. 다음 날 BQ 재검증
- 배포는 4곳 체크리스트를 따르고 main + feat/capacitor-app 둘 다에 푸시
