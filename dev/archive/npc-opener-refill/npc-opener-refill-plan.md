# 계획 — 주간 크론이 첫인사(npc_openers)를 보충하지 않는 잠복 버그

출처: npc-talk 리뷰 H1 → ops-monitor 스텁에 인수인계됐던 것을 보류 전에 떼어 냄(2026-09-28).

## 문제
`functions/npc-gen-cron.js` 는 `generateDialogues`(본문 세트)만 부른다. `planGeneration` 은 npc×lang 만 계획하고
weather 축이 없어서, 첫인사 insert 경로가 크론에 **아예 없다**. `_npc-gen.js` 에 `generateOpeners` 는 구현돼 있지만 호출처가 없다.
지금은 9/15 시딩으로 88/88(주민 11 × lang 2 × weather 4, 조합당 3줄) 이 차 있다. **주민이 늘거나 행이 지워지면 자가 치유되지 않는다.**

## 방향(안)
1. 크론에 "빈 조합만 3줄씩" 보충 루프 추가 — `generateOpeners(env, npc, lang, weather, 3)`
2. ⚠️ 서브리퀘스트 예산 재계산: 현재 MAX_COMBOS=15 → 15×2+3=33, 무료 플랜 상한 50
3. 커버리지를 보이게: `npc_opener_counts()` rpc 신설 또는 `npc_pool_counts()` 확장
