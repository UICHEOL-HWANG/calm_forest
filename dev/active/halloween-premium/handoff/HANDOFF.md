# 🎃 할로윈 프리미엄 — 클라우드 세션 인계 (2026-10-06)

사용자 지시로 **중간에 중단**하고 병합·푸시했다. 이어서 할 일만 아래에 적는다.

## 읽을 것 (순서대로)
1. `docs/superpowers/specs/2026-10-06-halloween-premium-design.md` — 확정 설계(금액·상품·한정 규칙)
2. `docs/superpowers/plans/2026-10-06-halloween-premium.md` — 구현 계획 Task 0~14 + 추가 Task 15 + Release Runbook
3. `dev/active/halloween-premium/handoff/sdd-ledger.md` — 진행 장부(판정 R1~R12, 이월 minor, 확인할 것 목록)
4. `dev/active/halloween-premium/handoff/reports/` — 태스크별 구현 보고

## 완료 (리뷰 통과, 전부 main 에 병합됨)
Task 0~6, 8~12, 15 + Task 13(실제 게임 스모크) + Task 9 후속 수정(나이트캡 후드 윗면 막기).
- Task 7(자국 2종)은 수정 라운드 1 통과, **밤 호박 밝기 후속 수정만 미완**.
- Paddle 라이브에 신규 10개 가격 **등록 완료**(활성 상품 17, 중복 없음) — `js/shop/price-ids.js` 에 pri_ 기입됨.

## 클라우드 세션 진행 (2026-10-06)
- ✅ 1번 호박등 밤 밝기: wip 패치 적용·검증 후 커밋(9260271). `npm test` 1889/1889. 전/후 `look/verify-trail-pumpkin-{lit-night-before,unlit-night}.png`.
- ✅ 드로우콜 실측(실제 빌더로 그려지는 객체 수 카운트):
  - 자국: 모든 자국이 마크당 1(굽기). 걷기 속도 6 → 동시 마크 ≈ 12(TRAIL_CAP 상한, 기존 자국과 동일) + 입자 Points 2(점·박쥐, 전체 공용). 호박등은 기존 자국 대비 추가 0.
  - 도구(쥔 1개): batnight 3~5(물뿌리개 5 최대), harvest 1~3, 참고 moon 3~5. 우산 batnight 3·harvest 2.
  - 스킨(맨몸 대비 증가): 나이트캡 +5, 구름 +3, 클래식 마녀 +6, **별밤 마녀 +10**(최대), 참고 forest_spirit +4.
  - 등: bat_wing +2, bat_cape +3(기존 망토 +2).
- ✅ 비밀 스캔(코드 파일): 0건.
- ✅ 코드 리뷰: 재질·dispose·i18n·XSS·판매기간 날짜 로직 이상 없음. 지적 3건:
  - MEDIUM(미조치, 운영 결정 필요): 판매 시작 전 차단이 클라이언트 시계(`SALE_WINDOWS.from`)뿐 — 기기 날짜를 바꾸거나 devtools 로 `Paddle.Checkout.open(pri_…)` 하면 지금도 결제·지급된다(웹훅은 날짜 확인 안 함). 해결: 10개 Price 를 지금 보관했다가 10/24 에 해제, 또는 웹훅/서버에서 기간 확인. 종료일 보관도 수동 대신 예약 작업 권장. ⚠️ 보관 후 `scripts/paddle-seed.mjs` 재실행 금지(보관품을 못 보고 새로 만든다).
  - LOW(조치): 가게를 열어 둔 채 기간이 끝나도 결제 버튼이 살아 있던 문제 → `cashButton` 클릭 때 `saleOpen` 재확인.
  - LOW(미조치, 기존 문제): 구매 연출이 장착 꾸미기 GPU 자원을 해제 안 함(구매 1회당 소량).

## 남은 일
1. **호박등(pumpkin_glow) 밤에 어두운 문제** (Task 13 FAIL A)
   - 증거: `look/game-trails.png`(game-night-trail-pumpkin), `look/verify-trail-close-pumpkin-night.png` vs 시안 `look/trail-pc-night.png`
   - 원인: 자국 마크가 lit 재질(`trail.js film()` → `bake()`)이라 밤에 어둡다. 시안은 unlit + 후광.
   - 미완성 시도: `handoff/wip-pumpkin-unlit.patch`(검증 안 됨, 참고용 — `git apply --check` 먼저). 방침: pumpkin_glow 마크만 unlit(MeshBasicMaterial 정점색) 단일 메시로 굽고 다른 자국은 불변(테스트로 잠금).
2. **Task 14**: 드로우콜 실측(호박불≈9·달밤 보라 도구≈5·마녀 별밤·망토 C), 전체 `npm test`, 코드 리뷰(code-reviewer/security-reviewer), 비밀 스캔(공개 저장소!), 최종 whole-branch 리뷰.
3. **사용자 확인 대기**: 우산 2종 모양(`look/umbrella-batnight.png`, `umbrella-harvest.png`), 달밤 보라 우산 앞면이 이마로 처지는 점(시안과 동일), 이름 `달밤 세트` vs `달밤 보라 세트` 혼동 가능.
4. **배포는 별도**(Release Runbook): 웹·토스·Play·itch 4곳 동시 → 승인 후 `SALE_WINDOWS` 날짜 확정 → 종료일 Paddle Price 보관. ⚠️ 라이브 가격이 이미 들어가 있어서 `SALE_WINDOWS.halloween.from`(기본 2026-10-24)이 되면 로그인한 웹 유저에게 구매 버튼이 보인다. Paddle 도메인 승인이 아직이면 결제창이 안 열리므로 **승인 전에는 from 날짜를 미루거나 배포하지 말 것.**

## 알려진 수용 사항 (판정 기록은 ledger)
- 낮은 머리 꾸미기를 쓰면 나이트캡 후드 안에 거의 가려진다(R12).
- 귀가 나이트캡 후드 옆·클래식 마녀 챙을 뚫는 건 시안과 동일.
- 박쥐 망토 눈 발광 없음·브로치 flat shading(드로우콜 예산).
- 도끼 방향은 정상(검증: `look/axe-orientation-check.png`).

## 별도 작업으로 분리됨
- 기존 🦸 망토가 여우·고양이 꼬리를 못 비키는 코드 문제(`k.tail` 이 객체인데 문자열 비교) — 별도 로컬 세션에서 진행 중.

## 작업 환경 메모
- 서브에이전트 실행 시 워크트리에서 `python3 scripts/serve.py <port>` 로 확인(preview_start 금지: 루트를 띄움).
- `git commit` 과 `-n` 플래그(grep -n)를 한 Bash 명령에 섞지 말 것(ECC pre-bash 훅 오탐).
