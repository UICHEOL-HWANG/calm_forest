# 🏮 빛 공방 — Context

**Last Updated** 2026-10-08

## 작업 공간
- 워크트리 `.claude/worktrees/light-workshop`, 브랜치 `feat/light-workshop` (main f5a366f 에서 분기 — Task 0 에서 origin/main 병합)

## 핵심 파일 (조사 결과)
- 인증 API 기준: `functions/api/orchard-events.js` (GoTrue `/auth/v1/user` 로 토큰 확인, 게스트 허용). CORS 는 `worker/index.js` 가 일괄.
- 라우트 등록: `worker/index.js` import 블록 + `routeApi()` · 로컬 미러 `scripts/serve.py` (wiring 테스트가 둘 다 확인)
- 크론: `worker/index.js scheduled()` 는 `event.cron` 명시 분기, 미일치는 npc-gen 으로 떨어짐 · `wrangler.jsonc:80`
- 크론 패턴: `functions/ai-pregen-cron.js` (fetch·notify 주입, `ai_pregen_runs` 기록, notify 는 지연 import)
- 금칙어: `js/nickname-filter.js` `isNicknameBlocked` (브라우저·Node·functions 공용)
- 날짜: `functions/api/_game-day.js kstDate()` · 브라우저 `js/kst-date.js kstDate()`
- 트레일 렌더(오라의 원형): `js/cosmetics/trail-fx.js createTrailFx` · game.js `updateTrail` (~3449) · 루프 호출 ~5644
- 세이브: `gameState` (~962) · `applySave` (~2416) · `getGameState` 는 `{...gameState}` · 옛 클라는 모르는 필드를 다음 저장 때 지운다
- 옷장: `js/spaces/wardrobe.js` SLOT_TABS(19) · `drawWardrobe`(63) · 꾸미기 카탈로그 `js/cosmetics/catalog.js` 는 id 화이트리스트라 오라를 넣지 않는다
- 도어/액션: `js/spaces/doors.js` near* 판정(~315)·프롬프트(~338) · game.js `handleAction`(~6562)·억제 목록(~6799)
- 모달 패턴: `js/neighbors/ui.js` (id 끝 `-modal` → `anyModalOpen()` 이 이동 정지)
- i18n: `js/i18n-en.js` 한국어 원문 키 · 기능별 테스트가 `t()` 결과에 한글이 없는지 확인 · `' · '` 글루 조각마다 키 필요
- 마이그레이션: `sql/migrations/migrate_*.sql` · RLS `(select auth.uid())` · 크기 CHECK `octet_length(x::text)`

## 의사결정
- 2026-10-08 만드는 것=몸 주변 오라 · 목적=리텐션 · 요청=말+카드 · 장소=반딧불이 계곡 빛 공방 · 주문 후 다음 날 완성 · 생성=밤사이 일괄(A안) · 모델=Claude Haiku 5.5 배치
- 렌더러는 설계서의 InstancedMesh 대신 **Points 1개 + 모양별 캔버스 텍스처** — 장착 오라가 하나뿐이라 아틀라스가 필요 없고, 트레일과 같은 방식이라 드로우콜 +1 유지
- 서버는 밤 시간을 검사하지 않는다(게임 시간 ≠ KST). 하루 1회만 DB 유일키로 강제
- `functions/` 첫 npm 의존성 `@anthropic-ai/sdk` (wrangler 번들)
- 실패 요청은 pending 으로 되돌려 다음 틱 재제출, 3회째·07:00 마감은 카드 기반 대체 레시피

## 의존성·선행
- Task 1 승인(주인 외형·팔레트·문구) 전에는 Task 8·9·11 문구 확정 금지
- `ANTHROPIC_API_KEY` 키체인 `calmforest-anthropic-aura` → Worker 시크릿
- DDL 은 pooler 로 직접 실행(사용자에게 시키지 않음)
