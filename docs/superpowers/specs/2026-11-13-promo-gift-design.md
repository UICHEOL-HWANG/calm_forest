# 홍보 링크 선물 (promo gift) 설계

작성 2026-11-13 · 시안 `sims/promo-gift/modal.png`(창) · `sims/promo-gift/decor.png`(꾸미기)

## 1. 목표
홍보 링크(광고·인스타·스레드·리틀리·카톡 등)로 들어온 사람에게 선물을 줘서 첫날 참여를 높이고 로그인으로 이어지게 한다. 캠페인마다 앱을 다시 배포하지 않고 DB에 코드 한 줄만 넣어 운영한다.

## 2. 사용자 결정 (2026-11-13)
| 항목 | 결정 |
|---|---|
| 받는 사람 | 선물 코드가 붙은 링크로 온 사람. 앱 설치자는 같은 코드를 직접 입력 |
| 게스트 | 2단계: 들어오자마자 1단계(세이브에 들어가는 선물), 로그인하면 2단계(전용 꾸미기) |
| 1단계 내용 | 첫날 가속: 코인 200 · 고급 씨앗 3종 각 3개 · 비료 5 · 미끼 5 |
| 2단계 내용 | 모든 코드 공통 세트 하나: 🎈 꼬마 열기구 + 🧳 여행 가방 더미 (decor.png C안) |
| 창 | 초대장 봉투 (modal.png B안). 머리 줄에 코드별 문구 |
| 방식 | A안: 코드 표를 DB에 두고 서버가 판정 |
| 선행 | 인앱 게스트 이메일 로그인 버그 수정을 같이 출시 |

## 3. 선행 작업 (이 기능 전에 main 에 들어가야 함)
둘 다 main 작업 트리에 **미커밋**으로 있다. 구현 워크트리는 이 둘이 커밋된 뒤에 main 에서 딴다(미커밋은 워크트리에 안 따라감).
1. `guest-login-conversion`: `js/auth/email-handoff.js`·`index.html` 부팅 수정. 구현·테스트·리뷰 끝, 커밋 승인 대기. 이게 없으면 인앱 게스트의 2단계 도달이 0이다.
2. `app-invite-links`: `/i/CODE` 링크·유니버설/앱 링크·Play referrer `invite=`·코드 입력 칸. 선물 코드는 같은 길을 `/g/CODE`·`gift=`로 복제한다. 남은 일: App ID Associated Domains 켜기(사용자).

## 4. 흐름
1. **코드 도착** → 기기에 `cf_gift_code` 저장(새 코드가 오면 덮어씀). 경로:
   - 웹·itch: `?gift=CODE` 또는 `calmforest.cloud/g/CODE`(302 → `/?gift=CODE`)
   - 안드 앱: `/g/CODE` 앱 링크(설치돼 있으면 바로 열림). 미설치면 Play referrer `gift=CODE`(웹 배너의 playReferrer 가 실어 줌, 첫 귀속 읽기 때만)
   - iOS 앱: `/g/CODE` 유니버설 링크. 미설치 설치 경로는 끊기므로 수동 입력
   - 토스: `intoss://calmforest?gift=CODE` (Environment.initialURL)
   - 수동: ☰ 메뉴 "🎁 선물 코드 입력"
2. **게임 진입 뒤 대기**: 캐릭터 선택·프롤로그·코치 투어·다른 모달이 끝날 때까지 기다림(가입 선물과 같은 대기 함수 재사용). 2분 지나면 그래도 띄움.
3. **1단계**: `claim stage 1` 성공 → 봉투 창(B안). 머리 = 코드 문구(예: "인스타그램에서 온 초대장"), 목록 4줄, 추신 = 로그인 안내.
   - 버튼: `받기`(인벤토리 지급 후 닫기) · `✉️ 로그인하고 더 받기`(지급 후 로그인 화면, email-handoff 경로)
   - 이미 로그인한 계정은 추신 대신 2단계를 바로 이어서 줌(창 두 장 연속)
4. **2단계**: 로그인한 계정이 부팅하면 `cf_gift_code` 가 있고 2단계 기록이 없을 때 `claim stage 2` → 두 번째 편지("약속한 꾸미기 세트예요") · `마당에 놓기`(작업대 🧺 보관함 열기) · `닫기`
5. **가입 선물과 순서**: 둘 다 뜰 때는 홍보 선물 편지 → 가입 선물 상자 순. 한 번에 창 하나.

## 5. 서버
### 테이블 (`sql/migrations/migrate_promo_gift.sql`)
```
promo_codes(
  code text primary key check (code ~ '^[A-Z0-9]{4,16}$'),
  label text not null,          -- 봉투 머리 문구 "인스타그램에서 온 초대장"
  label_en text not null,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,          -- null = 무기한
  max_uses int,                 -- 1단계 수령 수 상한, null = 무제한
  active boolean not null default true,
  created_at timestamptz not null default now()
)
promo_redemptions(
  user_id uuid not null references auth.users on delete cascade,
  stage smallint not null check (stage in (1, 2)),
  code text not null references promo_codes,
  created_at timestamptz not null default now(),
  primary key (user_id, stage)
)
```
- RLS 켜고 anon·authenticated 전부 revoke. 접근은 service_role RPC 만.
- 한 계정은 단계마다 1회, 코드는 하나만(먼저 받은 코드가 이김).
- `purchases_source_check` 에 `'promo'` 추가. `_reward_decor_ids()` 에 `promoballoon`·`promosuitcase` 추가(세이브 가드).

### RPC
- `promo_code_check(p_code)` → `{ok, label, label_en}` 또는 `{ok:false, reason: unknown|inactive|not_started|expired|full}`
- `promo_gift_claim(p_user, p_code, p_stage)`:
  - 공통: 코드 확인(위 reason). 이미 이 단계를 받았으면 `{ok:true, new:false}`
  - stage 1: 익명 허용. `max_uses` 는 이 코드의 stage 1 수로 판정
  - stage 2: 익명이면 `reason:'anonymous'`. stage 1 기록이 없어도 지급(로그인 계정이 처음 온 경우 클라가 1→2 순으로 부름). purchases 에 두 줄 `promo_gift:<uid>:promoballoon`·`promo_gift:<uid>:promosuitcase`, kind `'decor'`, source `'promo'`, amount 0
  - stage 2 는 `ends_at + 7일` 까지 유예(게스트가 로그인하면 계정 id 가 바뀌어 stage 1 기록으로는 판정 불가 → 기간으로 약속을 지킴). `max_uses`·`not_started` 는 stage 2 에 적용 안 함. `active=false`(수동 정지)는 즉시 막음

### API `/api/promo-gift` (`functions/api/promo-gift.js`, `worker/index.js` 라우트 등록)
- POST `{action:'check'|'claim', code, stage}`, 인증은 `verifiedUid`(referral.js 헬퍼, 익명 토큰 허용)
- stage 2 신규 지급 시 notices 에 편지 1건(signup-gift.js `sendNotice` 패턴, ko/en)
- 코드 정규화: 대문자, 영숫자만, 4~16자. 형식이 틀리면 서버 호출 없이 거절

### 링크
- `functions/invite-link.js` 에 `/g/CODE` 추가(302 `/?gift=CODE`), AASA paths 에 `/g/*`, AndroidManifest intent-filter 에 `/g/` 경로

## 6. 클라이언트 (새 파일은 `js/promo-gift/`)
| 파일 | 역할 |
|---|---|
| `rules.js` | 순수 함수: `normalizeGiftCode` · `readGiftParam(url)` · `giftFromReferrer` · `STAGE1_BUNDLE` · `shouldClaim(state)` |
| `flow.js` | 코드 보관(`cf_gift_code`·`cf_gift_stage1_device`)·claim 순서·대기·결과 처리 |
| `ui.js` | 봉투 창 DOM(1단계·2단계 두 모습), 메뉴 코드 입력 칸 |
| `index.js` | 부팅 연결(웹 URL·네이티브 launchUrl·appUrlOpen·토스 initialURL·referrer) |
| `js/spaces/promo-gift-art.js` | 열기구·가방 더미 3D(시안 decor.html C안 이식, 정지 모델) |
- `js/data/reward-decor.js` 에 두 품목 추가(`reward: 'promo'`, hidden). `tests/referral-items.test.mjs` 가 SQL 목록과 대조
- 1단계 지급: `gameState.inventory` 에 `STAGE1_BUNDLE` 더하고 저장. 기기 표시 `cf_gift_stage1_device` 를 남겨 같은 기기의 새 게스트·로그인 뒤 새 계정이 1단계를 또 받지 않게 함
- 오프라인 게스트(익명 로그인 실패)는 코드만 보관하고 대기
- i18n: 새 문구는 `js/i18n-en.js` 에 같이

### 문구 (시안 B안, 해요체·엠대시 없음)
- 머리: (코드 label) · 제목: 고요한 숲에 온 걸 환영해요 · 설명: 첫날 쓰라고 몇 가지 챙겨 넣었어요
- 추신: 로그인하면 전용 꾸미기 세트를 하나 더 보내 드려요
- 버튼: 받기 · ✉️ 로그인하고 더 받기
- 2단계: 두 번째 편지 · 약속한 꾸미기 세트예요 · 작업대 보관함에 넣어 뒀어요 · 마당에 놓기 · 닫기
- 메뉴: 🎁 선물 코드 입력 · 실패 문구는 reason 별(없는 코드예요 / 기간이 끝난 코드예요 / 선착순이 마감됐어요 / 이미 선물을 받았어요)
- 품목명: 꼬마 열기구 · 여행 가방 더미

## 7. 트래킹 (GA4 새 이벤트 3개, 파라미터 ≤3)
- `promo_gift_arrive{code, via: url|deeplink|referrer|toss|manual}`
- `promo_gift_claim{code, stage, result: new|dup|<reason>|net_fail}`
- `promo_gift_login_click{code}`
- 서버 원장 `promo_redemptions` 로 코드별 깔때기: 도착(GA4) → 1단계 → 로그인 → 2단계
- 실험 분석에서는 `cf_gift_code` 유입을 공변량으로 둔다(첫 5분 지표에 선물 영향)

## 8. 오류 처리
- 네트워크 실패: 코드 보관 유지, 다음 부팅에 재시도. 창은 안 띄움
- reason 이 unknown·expired·full: 코드 삭제, 수동 입력일 때만 문구로 알림(링크 도착은 조용히)
- 1단계 지급 뒤 저장 실패: 기존 save-guard 경로가 처리. 서버 기록은 남아 재지급 안 함(소모품이라 허용)

## 9. 테스트
- `tests/promo-gift.test.mjs`: rules 순수 함수, referrer·URL 파싱, 대기·순서, 기기 표시
- `sql/tests/promo_gift_selftest.py --live`(롤백): 코드 상태별 reason, 단계당 1회, 익명 stage 2 거절, max_uses, 만료 뒤 stage 2 지급, 가드 목록
- 브라우저: `?gift=TEST&dbg=1` 게스트 → 1단계 → 로그인 → 2단계 → 보관함에서 꺼내 놓기, PC·모바일 캡처
- 안드 에뮬레이터 `/g/CODE` 콜드 스타트, iOS 시뮬레이터 수동 입력

## 10. 배포
- DB 마이그레이션 먼저(운영 적용은 pg8000 풀러 직접), 그 뒤 5곳 **동시**(새 꾸미기 id)
- 첫 코드: 사용자가 캠페인 이름·문구·기간을 정하면 SQL 로 넣음

## 11. 이번에 안 하는 것
- UTM 생성기(/dashboards/utm)에 선물 코드 칸 추가
- 관리자 대시보드 코드별 깔때기 화면
- 열기구 흔들림 애니메이션
- 캠페인별 다른 꾸미기
