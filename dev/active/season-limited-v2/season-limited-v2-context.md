# season-limited-v2 컨텍스트

Last Updated: 2026-11-16 (Task 1~8 완료·로컬 커밋, 미푸시. 다음: Task 9 설계 승인)

## 위치

- 워크트리 `.claude/worktrees/season-limited`, 브랜치 `feat/season-limited-v2`, 기준 main `c7067238`
- 계획 `docs/superpowers/plans/2026-11-15-season-limited-v2.md`

## 왜 하는가

계절이 14일마다 바뀌는데 그 계절에만 할 수 있는 것이 물고기 1종뿐이다. 한정 종을 3종으로 늘려 도감을 채우러 올 이유를 만들고, 끝나기 전에 푸시로 알려 복귀 계기를 만든다.

## 조사에서 확인한 사실 (2026-11-15, main c7067238)

- 계절 한정 물고기 4종과 계절 게이트는 이미 있다. 커밋 `6838050c`. 이 커밋이 건드린 파일이 새 종 추가의 체크리스트다.
- 게임 내 "끝나기 3일 전" 안내도 이미 있다(`js/season.js` `seasonNotice`, 출석 카드). 단, 물고기 1종만 안다.
- 푸시에는 계절 종류가 없다. `functions/push/pick-kind.js` 우선순위는 night > craft > pond > return.
- 반디는 색만 다르다(`js/spaces/glade.js` `makeFirefly`). 채집물은 `js/spaces/forest.js` `forageMesh` 에 종별 분기가 있다.
- `BUG_KINDS`·`FORAGE_KINDS` 는 `js/data/places.js`(three 를 import 한다), `FISH_KINDS` 는 `js/data/catalog.js`.
- `push_logs_kind_check` 목록이 마이그레이션 파일마다 다르다(`migrate_push_weekly_market.sql` 에는 `pond` 가 없다). 운영 DB 의 실제 제약을 읽고 써야 한다.

## 핵심 파일

| 파일 | 역할 |
|---|---|
| `js/season.js` | 계절 판정, 안내 문구(순수 함수) |
| `js/dex-gates.js` | 게이트 표, `rollKind` |
| `js/data/places.js`, `js/data/catalog.js`, `js/data/dex.js` | 종 표, 도감 표 |
| `js/spaces/glade.js`, `js/spaces/forest.js` | 반디·채집물 굴림과 모양 |
| `js/game.js:1550-1577`, `:2362` | 출석 카드·HUD 계절 줄 연결 |
| `js/daily-card.js` | 출석 카드 뷰 |
| `functions/push/pick-kind.js`, `functions/push-cron.js` | 푸시 판정·발송 |
| `functions/api/_game-day.js` | 서버 계절 사본 |
| `sql/migrations/migrate_push_pond.sql` | `push_candidates` 최신 정의(추정, 확인 필요) |

## 의사결정

- 새 시스템 없음. 기존 게이트 표와 안내 함수에 얹는다.
- 한정 종 `p` 는 물고기 선례대로 0, 게이트 안 확률 0.14(사용자 확인 대기).
- 채집물 보상은 `{ forage: 1 }` 고정. 경제에 새 값 없음.
- 푸시 `season` 은 계절당 1통, `return` 보다 위, 오늘 접속한 사람에게는 안 보낸다.
- Worker 를 SQL 보다 먼저 배포하면 전원 발송 사고가 날 수 있다. `row.season_7d === 0` 엄격 비교로 코드에서도 막는다.
- 스탬프 카드는 이번에 구현하지 않는다(설계 게이트만).

## 확정 사항 (Task 1 에서 채운다)

확정 2026-11-15 (사용자 "추천안대로 확정").

- 반디: petal 꽃잎반디 · ember 불씨반디 · amber 단풍반디 · frost **눈꽃반디**(계획의 서리반디 대신)
- 채집물: mugwort **어린 쑥**(한 글자 i18n 키 위험 회피) · wildgrape 머루 · chestnut 알밤 · pinecone 솔방울
- 알밤 아이콘: 별도 선택 없음 → 계획대로 🌰 유지(도토리와 같음, 이름으로 구분)
- 게이트 안 확률: 반디·채집물 0.14, 물고기 0.12 유지
- 새 계절: `🌸 봄이 왔어요! 봄에만 나오는 물고기·반디·채집물 3종을 찾아보세요.`
- 끝 3일 전(못 만난 것 나열): `⏳ 봄이 3일 남았어요. 아직 못 만난 봄 한정: 🌸 꽃잎반디, 🌱 어린 쑥`
- HUD: `🌸 봄 · 3일 남음 · 한정 1/3`
- 푸시: 제목 `🌸 봄이 3일 남았어요` / 본문 `봄에만 나오는 물고기·반디·채집물, 도감에 아직 빈칸이 있어요`

## 금지

- 푸시·병합·배포·운영 SQL 적용 금지(사용자 승인 전).
- 새 코드에 주석 금지. game.js 에는 연결 줄만.
- 스윙 모션, 캐릭터 얼굴 등 이번 범위 밖의 것은 건드리지 않는다.

## 푸시 SQL 적용 순서 (Task 7, 2026-11-16 운영 DB 조회)

- 운영 `push_logs_kind_check` = night·craft·return 뿐. `migrate_push_pond.sql`·`migrate_push_weekly_market.sql` 은 미적용.
- 세 파일이 모두 kind 목록과(pond·season 은) `push_candidates` 를 통째로 덮어쓴다 → 사용자 결정 "합집합".
- `migrate_push_season.sql` = kind 6종(night·craft·return·pond·market·season) + `push_candidates` 에 pond_day·dex·season_7d.
- 순서: `migrate_push_weekly_market.sql`(market_week 열·market 함수 필요) → `migrate_push_season.sql` **마지막**. pond 파일은 season 파일이 포함하므로 따로 적용하지 않는다.
- 리뷰 반영(11/16): pond·market 파일의 kind 목록도 6종으로 맞춰 어느 순서로 돌려도 kind 가 빠지지 않는다. 단 season 뒤에 pond 파일을 다시 돌리면 push_candidates 에서 dex·season_7d 가 빠져 계절 푸시가 조용히 멈춘다(발송 사고는 아님).
- push-cron 이 push_logs 저장 실패를 `logs_failed` 로 돌려주고 경고를 남긴다(실패하면 season_7d·returns_7d 중복 방지가 꺼지므로).
- 중복 방지 창은 7일(`season_7d`). 14일이면 마지막 날 받은 사람의 다음 계절 푸시가 막힌다. 한 계절의 발송일은 3일 안에 모인다.
- SQL 먼저, Worker 나중. 옛 Worker 는 새 열을 무시한다. 새 Worker 가 옛 RPC 를 만나면 season_7d 가 undefined 라 보내지 않는다(엄격 비교).
- 함수 본문 SELECT 를 운영 DB 에서 읽기 전용으로 돌려 확인: 대상 14명, dex 14/14.

## 출시 때 사용자 몫 (미리 적어 둠)

- 새 도감 id 가 있으므로 웹·토스·Play·iOS·itch 5곳 동시 배포.
- SQL 적용 승인(먼저) → Worker 배포(나중).
- 공지·출시 노트.

## 계획과 달랐던 점 (구현 중 확인)

- `places.js` 는 three 를 import 해 Node 에서 못 읽는다 → 테스트는 기존처럼 원문 표를 잘라 읽는다.
- `forageMesh` 는 기본 분기가 숲 약초 모양이라 임시 분기 없이 Task 4 에서 바로 모양을 넣었다.
- `_game-day.js` 는 `js/season.js` 를 그대로 import → 서버 계절은 `seasonInfo` 를 쓴다.
- 도감 키 jsonb CHECK 없음(운영 `game_saves` 제약은 크기 제한뿐).
- 새 종을 표 맨 앞에 넣으면 비·안개 굴림 보정(min·max)이 무지개반디·숲 약초 확률을 바꾼다 → 희귀종 바로 뒤에 넣고 테스트로 잠갔다.
- `seasonNotice` 는 실제로 안 쓰이고 있었다(출석 카드가 자체 문구 함수 보유) → 출석 카드가 `seasonNotice` 를 쓰게 합쳤다.
- 박물관 2층 17칸 한도 초과 → 사용자 결정 A안(2층 회랑 배치, 25칸).
- 밤의 수집가·숲의 안내인 배지는 계절 한정 종을 빼고 판정한다(설명이 "4종").
- 위키 문서 8개·안내서 종수(77→85)도 같이 갱신했다.
- 비 오는 낮에는 채집 굴림이 뒤쪽(버섯)으로 치우쳐 계절 채집물이 약 2% 로 떨어진다(맑은 날 14%). 의도 확인 필요.
