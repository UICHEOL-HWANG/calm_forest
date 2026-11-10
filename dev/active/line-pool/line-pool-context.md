# line-pool context

Last Updated: 2026-11-10

브랜치 `feat/line-pool` (워크트리 `.claude/worktrees/line-pool`), `feat/evening-auction` 70fc427a 에서 분기.

## 핵심 파일
| 파일 | 책임 |
|---|---|
| js/lines/slots.js | slot 표·검증·자리표시 (서버·클라 공용) |
| js/lines/fallback.js | 손으로 쓴 기본 문구 |
| js/lines/client.js | /api/lines 받기·캐시·폴백 |
| functions/api/_exaone.js | EXAONE 호출 공용부 |
| functions/api/_line-gen.js | 프롬프트·파싱·검증·계획 |
| functions/line-pool-cron.js | runLinePool·isLinePoolTick |
| functions/api/lines.js | GET /api/lines |
| tools/seed-line-pool.mjs | 시드·샘플 표 |
| sql/migrations/migrate_line_pool.sql | 테이블·RPC |
| js/auction/{scene,ui,index}.js | 상인 대사·소개·line_src |

## 결정
- 문구 풀 + 날짜 시드 (매일 밤 생성 기각)
- EXAONE 은 대사만, 값은 코드
- 크론 슬롯 5/5 → 빛 공방 틱 중 UTC 일요일 21:30 한 번을 보충에 씀

## 기준선
- 2026-11-10 npm test: pass 4675 / fail 0
