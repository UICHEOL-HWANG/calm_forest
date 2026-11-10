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

## 확정 배치 (2026-11-10 사용자)
- 시안 A: `.au-item` 과 `.au-body` 사이 한 줄 `.au-say`(🧙 + 대사, 연보라 배경), 경매품 소개는 `.au-item` 이름 아래 `.ds`. 시안 `sims/auction-say-compare.html`, 캡처 `say-compare-pc.png`·`say-compare-phone.png`.
- 가로 폰(844×390)에서 하단 여유 35px로 가장 빠듯함 → Task 11 실측 필수.

## 확정 기본 문구 (2026-11-10, 수정 요청 없음 → 후보 그대로)
- `fallback-copy-candidates.md` 표 전부.

## 문구 방향 (2026-11-10 사용자: 프롬프트 보강)
- 1차 샘플 문제: 하오체 어미 깨짐("풍향계가오", "소식이 오"), 문장부호 없는 줄, 영어 고어("hath", "Huzzah", "Hark").
- 보강 후 샘플을 다시 뽑아 승인받은 뒤 풀을 채운다.
