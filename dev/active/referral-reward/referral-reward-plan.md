# 🤝 친구 추천 보상 — 계획

## 목표
AARRR 의 R(Referral). 초대 링크로 들어와 **실제로 남은** 친구 수에 따라 추천 전용 꾸미기를 준다.
보상은 외형만, 판매 안 함, 서버 원장으로 판정. 지표 체계(포트폴리오)의 R 단계 측정이 가능해야 한다.

## 확정 사항 (2026-10-08)
| 단계 | 보상 | 종류 | 구현 위치 |
|---|---|---|---|
| 친구 1명 | ⭐ 별빛 도구 세트 (대표: 물뿌리개) | 도구 스킨 `tools_star` (세트 전체) | cosmetics catalog + tool-skins `star` 테마 전 도구 |
| 친구 3명 | 🌈 무지개 우정 아치 | 야외 장식 `friendarch` (hidden) | js/data/catalog.js OUTDOOR + 조형 |
| 친구 5명 | 🦋 별빛 우정 날개 | 등 슬롯 `friend_wing` | cosmetics catalog back + 조형 |
| 피초대자 | 💗 하트 머리핀(가칭) | 머리 슬롯 `friend_pin` | cosmetics catalog head |

- 상한 5명. 활성화 = 피초대자가 **로그인 계정**(익명 제외) + 가입 후 7일 안에 NSM 행동(수확·낚시·제작)을 **서로 다른 2일 이상**.

## 흐름
1. **링크 생성**: ☰ 메뉴 "친구 초대" → 서버가 내 초대 코드 발급(8자, `referral_codes`) → `https://calmforest.cloud/?invite=CODE` 공유(navigator.share / 복사 / Android 네이티브).
   - `?ref=`/`?from=` 은 GA 캠페인 소스로 이미 쓰임 → **`?invite=`** 사용.
2. **도착**: 부팅 시 `invite` 를 localStorage 에 저장(구글 OAuth redirect 가 쿼리를 지우므로). 웰컴 배너 "친구가 초대했어요".
3. **바인딩**: 로그인(비익명) 직후 `POST /api/referral/bind {code}` → 서버 검증: 비익명 · 계정 생성 72h 이내 · 자기 자신 아님 · 이미 바인딩 안 됨 · 초대자 상한 미초과 → `referrals` 행 생성 + 피초대자 웰컴 핀 원장 지급.
4. **활성화·지급**: 초대자가 게임을 켤 때 `POST /api/referral/claim` → 서버가 pending 피초대자들의 `session_logs` 를 보고 NSM 2일 충족 시 `activated_at` 기록 → 활성 인원 수가 1/3/5 를 넘은 단계 보상을 `purchases` 에 멱등 삽입(`event_id='referral:<inviter>:<tier>'`) + 개인 소식함(`notices.target_user_id`) 알림.
5. 클라이언트는 기존 `syncPurchases → applyPurchases` 로 소유 반영(꾸미기). 아치는 `outdoorStored` 에 넣는 경로 추가.

## 데이터
- `referral_codes(user_id pk, code unique, created_at)`
- `referrals(invitee_id pk, inviter_id, code, bound_at, activated_at, platform)` — invitee 1명당 1행(변경 불가)
- `purchases`: `source text default 'paddle'` 컬럼 추가, `kind` CHECK 에 `'decor'` 추가. 추천 행은 `source='referral'`, `transaction_id/price_id='referral'`, amount 0.
- 보안 트리거 `_premium_cosmetic_ids()` 에 friend_wing·friend_pin·tools_star 추가 + **야외 장식 friendarch 도 가드**(outdoor/outdoorStored 에서 원장 없으면 제거).
- RLS: 두 테이블 모두 본인 행 select 만, 쓰기는 service key(Worker) 전용.

## 트래킹 (구현과 동시) — ⚠️ 파라미터 다이어트 (사용자 지시 2026-10-08: "다 만들면 이벤트 파라미터 정리")
실측(BQ 30일, 2026-10-08): 커스텀 파라미터 키 **346종**(GA4 맞춤 측정기준 칸은 50) · `star_result`·`cooking_result` 는
이벤트당 커스텀 파라미터 **25개 상한에 도달**(넘는 건 조용히 버려짐). 추천 이벤트 원칙:
- 이벤트당 커스텀 파라미터 **≤ 5개**. 새 키 신설 최소화 — 기존 키(`item_id`·`via`·`platform`) 재사용.
- 서버가 진실인 값(활성화·지급)은 `referrals`/`purchases` 테이블로 분석 — GA4 에 중복 싣지 않는다.
- 최종 정리(마지막 단계): 이벤트·파라미터 표 확정 → 맞춤 측정기준 등록 필요분만 → 기존 과다 이벤트(star_result·cooking_result) 정리는 별도 제안.

(초안)
`invite_link_create` → `invite_share{channel}` → `invite_open{code_hash}` → `referral_bind{ok|reason}` → `referral_activated` → `referral_reward_grant{tier}`. 서버 테이블(`referrals`)이 진실, GA4 는 퍼널 보조. K-factor = 1인당 초대 수 × 활성 전환율.

## 리스크
- **활성화 판정 원천(session_logs)은 클라이언트가 쓴다** → 조작 가능. 보상이 외형뿐 + 상한 5 + 신규 계정 72h 조건이라 **수용 확정(2026-10-08 사용자 결정)**. 서버 단독 판정 원천이 생기면 교체.
- 옛 클라이언트가 새 id 를 세이브에서 지움 → **4곳 동시 배포 후 기능 ON**(features 플래그).
- 날개는 망토·박쥐날개와 같은 back 슬롯(택1). 별빛 도구 세트는 tools 세트 슬롯(다른 세트와 택1).
- 토스·안드로이드 유저가 받은 링크는 웹으로 열림(1차 범위). 토스 공유 리워드·앱 딥링크는 2차.

## 단계
1. DB 마이그레이션 + 셀프테스트 (풀러 직접 실행)
2. Worker API: code / bind / claim (+ 테스트)
3. 카탈로그·원장 반영: 4종 아이템, entitlements(decor), 트리거 목록 테스트
4. 조형 3종 + 핀 (시안 기반, 게임 안 캡처로 컨펌)
5. UI: 초대 시트(링크·진행 1/3/5), 도착 배너, 보상 소식
6. 트래킹 + 리뷰 + 4곳 배포 → 플래그 ON
