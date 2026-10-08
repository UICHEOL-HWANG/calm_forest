# 🏮 빛 공방 — Context

**Last Updated** 2026-10-08 (외관 C안 구현)

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

## 🏠 공방 외관 리디자인 (2026-10-08 ✅ C안 승인·구현 — js/spaces/light-workshop-hut.js)
- 현재 오두막(상자+사각뿔 지붕)은 기각("너무 밋밋"). 레퍼런스: `mockups/hut-reference.webp`
- 레퍼런스 특징: 벽돌 쌓은 벽(분홍·베이지·회갈색 벽돌 엇갈림) · 박공지붕 + 기와판 겹침(테라코타) · 박공 삼각벽은 밝은 나무판
  · 빗살 무늬 나무 여닫이문(살짝 열림) + 문 앞 나무 디딤판 · 십자 격자 창 · 바닥 나무 받침 · 옆에 나무 손수레 소품
- 구현 시: 시안 3개 이상 렌더 비교 → 승인 후 이식 · mergeGeos 병합으로 드로우콜 ≤12 유지(벽돌은 정점색 병합)
- ✅ 시안 A(박공 정면)·B(30° 비틀기)·C(기와면 정면) 비교(`mockups/hut-variants.html`·`hut-variants-pc.png`) → 사용자 **C 선택**
- C안: 긴 벽+기와 경사면이 카메라(+z), 문(x -0.35)·십자창(x 0.55) 한 면, 박공 양옆 · 손수레 왼쪽 박공 뒤(-1.65,-0.5) · 팻말 왼쪽 앞(-1.85,1.2) · 연못(-2.3,2.3) · 주인(1.55,1.45)
  - 팻말을 창 앞·문 왼쪽에 두면 창/열린 문짝을 가렸다(실측 2회) → 왼쪽 앞 모서리로
- 메시 8개(오두막 1·불빛 1·주인 3·이름표·팻말 2) · 숨김 전후 렌더 호출 차이 16 = 옛 오두막과 동일(그림자·블룸 패스 포함 측정법)
- 함정: 문 불빛 평면이 속 벽 앞면 5mm 뒤면 가려진다 · 벽 모서리 기둥은 행마다 한쪽 면만 차지(겹치면 깜빡임)
- 실측 캡처: `mockups/hut-C-game-{pc-day,pc-night,phone-day}.png`
- 📍 2026-10-08 자리 이동: 계곡 입구(9.6,20.6) → **계곡·천문대 사이 빈터 (17, 21.6)** — 사용자 "카페·계곡 팻말·주민과 겹쳐 답답". 후보 3곳 실측(P2·P3 은 무작위 나무가 가림)
  - 무작위 배치 제외 구역 추가: 벌목 나무 <4 · 계곡 나무 링 <4(glade.js) · 꽃·풀 <3.2 — 없으면 나무가 오두막에 박힐 수 있다
  - 계곡 링(최대 반경 9.6)+반폭 1.3, 천문대 기단 5.7+반폭+틈 0.9 를 테스트가 검사
