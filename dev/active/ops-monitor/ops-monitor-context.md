# 운영 관제 페이지 · 스텁 (착수 전)

**Last Updated:** 2026-09-15
**상태:** ⏸️ 대기 — `npc-talk` 완료 후 착수 (2026-09-15 사용자 결정)

## 왜 만드나
기존 대시보드 4개는 전부 "사람이 뭘 했나"를 본다. **"기계가 돌았나"를 보는 화면이 없다.**
이 공백에서 실제로 난 사고: 라우트 등록 누락 404 · mTLS 인증서 만료 8일 장애 ·
quest_id 트래킹 누락. 셋 다 "돌아야 할 게 안 돌고 있다"를 아무도 못 본 사고다.

## 방침
- **새 페이지를 만들지 않는다.** `dashboards/beta_monitor.html` 이 베타 종료(~2026-09-15)로
  용도를 다하므로 그 자리를 전환한다. `_dash.css` 토큰 · `?k=` 관리자 인증 · noindex 재사용.

## 담을 것 (데이터 소스가 확실한 것만)
- 크론 실행 이력 — `npc_gen_runs` (마지막 성공 시각 · 적재 수 · 실패)
- 대화 풀 잔량 — `npc_dialogues` 카운트 / 100세트 상한 게이지
- Supabase 적재 신선도
- 배포 버전 정합 — 웹 배포 vs 토스 라이브 번들

## 지금은 못 만드는 것
`/api/*` 에러율·응답시간 — worker 가 요청 로그를 안 남긴다.
Workers observability + Analytics Engine 적재가 선행돼야 함(별개 공사).

## 인수인계 — npc-talk 리뷰에서 넘어온 항목 (2026-09-15)

### H1. 주 1회 크론이 `npc_openers` 를 채우지 않는다
`functions/npc-gen-cron.js` 는 `generateDialogues` 만 부르고, `planGeneration` 은 npc×lang
만 계획한다(weather 축 없음). 첫인사 insert 경로가 크론에 **아예 없다**.
지금은 시딩으로 132/132 를 채워 뒀지만, 주민이 늘거나 행이 지워지면 **자가 치유되지 않는다.**

더 나쁜 건 **관제가 이걸 못 본다**는 점 — `npc_pool_counts()` 도 `npc_gen_runs.inserted` 도
본문 세트만 센다. "크론이 살아 있나"는 보이는데 "첫인사가 절반 비었다"는 영원히 안 보인다.

관제 페이지에 넣을 것:
- [ ] 첫인사 조합 커버리지 (npc × lang × weather = 88 중 몇 개) — 게이지
- [ ] `npc_opener_counts()` rpc 신설 또는 `npc_pool_counts()` 확장
- [ ] (선택) 크론에 "빈 조합만 3줄씩" 보충 루프 — ⚠️ 서브리퀘스트 예산 재계산 필요
      (현재 MAX_COMBOS=15 로 15×2+3=33, 무료 플랜 상한 50)

### 그 밖에 관제가 보여야 할 것
- [ ] `npc_talk_empty` 이벤트 추이 — 빈 풀·통신 실패가 유저에게 보인 횟수
      (기능 구현 때 GA4 이벤트는 넣어 뒀다: `reason: empty_pool | fetch_failed`)
