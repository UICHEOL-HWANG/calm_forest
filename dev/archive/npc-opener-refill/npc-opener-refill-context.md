# 컨텍스트 — npc-opener-refill

**Last Updated:** 2026-09-28
**상태:** ✅ 수정·배포 완료(2026-09-28) — 크론이 빈 첫인사를 스스로 채운다

## 핵심 파일
| 경로 | 역할 |
|---|---|
| `functions/npc-gen-cron.js` | 주 1회 대사 생성 크론 — 첫인사 경로 없음 |
| `functions/api/_npc-gen.js` | `NPC_IDS`(11) · `planGeneration` · `generateOpeners`(미호출) |
| `worker/index.js` | 크론 라우팅 |

## 확인한 사실 (2026-09-28, Supabase 읽기)
- `npc_openers`: 11명 전원 combos 8 · lines 24 → 88/88 충족
- `npc_dialogues`: 주민당 72세트(farmer 75)
- 코드 `NPC_IDS` 11명과 DB 주민 일치

## 트리거
`NPC_SHEET` 에 주민을 추가하는 순간 그 주민의 첫인사는 0줄이 된다 → 잡담 첫 줄이 비거나 폴백.
