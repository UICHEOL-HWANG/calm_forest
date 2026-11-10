# line-pool context

Last Updated: 2026-11-11

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

## 운영 풀 (2026-11-11)
- 시드 1회: 요청 660 · 적재 656 · 호출 69 · 실패 0 · 약 10분. 22칸 모두 28~30줄.
- 어색한 줄 26개(한국어 17·영어 9) 숨김 → 보이는 줄 630, 칸당 최소 26. 목록 `hide-candidates.md`. 되돌리기: `update public.line_pool set hidden=false where id in (...)`.
- EXAONE 한도: 초당 1·분당 60·하루 86,400 (응답 헤더). 문구 풀은 2초 간격, 429는 3초 쉬고 재시도(빛 공방은 1.1초 그대로).
- `line_pool_runs.rate_limited` 는 "한 번이라도 429가 났다"는 뜻(멈춤 아님).

## 실게임 확인 (2026-11-11, 워크트리 서버 8874)
- 로컬 serve.py 에는 /api/lines 미러가 없다(의도). 로컬 게임은 기본 문구로 동작 → 기본 문구 경로 확인.
- 풀 경로: 운영 DB 에 대해 functions/api/lines.js 를 Node 로 호출(line_picks 기록 막음)한 응답을 임시 정적 파일로 내려 확인 → 소개·시작·주민 입찰·내 입찰·막판·주민 낙찰 모두 풀 문구, {who} 채움 정상.
- 배치 A: PC side 정상, 가로 폰 844×390 창 아래 301/390·버튼 보임·스크롤 없음, 세로 폰 시트 563~832/844. 캡처 shots/.
- 앱 창이 화면에 없으면 게임 루프가 멈춰 진행이 안 보인다(검증 시 창을 띄울 것).

## 남은 것
- 배포: 경매와 함께 5곳 동시(웹·토스·Play·iOS·itch). Worker 시크릿 EXAONE_API_KEY 등록돼 있음.
- 배포 뒤 첫 일요일 21:30 UTC 크론 1회 후 line_pool_runs 확인, 다음 날 BQ 에서 auction_open.line_src 값 확인.
- 포구 반복 의뢰는 포구 섬 1단계 병합 뒤 별도 계획.
