# npc-affinity 맥락

Last Updated: 2026-11-13 (P1 구현·검증 완료, 미커밋, 워크트리 feat/npc-affinity-p1)

## 문서·시안
- 설계: `docs/superpowers/specs/2026-11-12-npc-affinity-design.md`
- 방향 시안: `sims/npc-affinity-directions.html` (A 관계 단계 / B 선물 취향 / C 편지·방문)
- 세부 시안: `sims/npc-affinity-details.html` (표시 위치 / 편지 전달 / 아이템 개수, 각 3안 PC·모바일)
- 기준 커밋: main `a12fd337`. `feat/space-link-p1` 은 별개 작업(미병합), 건드리지 않음

## 지금 코드 (2026-11-12)
| 무엇 | 어디 |
|---|---|
| 호감도 저장 | `js/game.js:1095` `affinity: {}` (최상위), 복원 `:3236` |
| 오르기 + ❤️3마다 답례 | `js/spaces/outdoor-decor.js:144` `addAffinity` |
| 선물 | `outdoor-decor.js` `giveGift` (giftLove: 목걸이·별빛 유리병 +2), 하루 제한 없음 |
| 카페 접객 | `js/spaces/cafe.js:1624` (손님 `guest_*` 8종만, `js/data/places.js:116`) |
| 반복 의뢰 | `js/game.js:8443` 완료 시 +1, 풀은 `js/quests.js` `REPEAT_POOL` |
| ❤️6 히든 의뢰 | `js/tool-blueprints.js` `HIDDEN_AFFINITY=6`, `js/game.js:902` `hiddenCurrent` |
| 대화창 하트 | `index.html:4720` (5개 상한 + ×n) |
| 보상 꾸미기 지급 | `js/game.js:3294` `grantDecor`: 실내 `DECOR` → `house.stored`, `quest` 있는 야외 → `outdoorStored` |
| 숨은 보상 장식 예 | `js/data/catalog.js` `mine_cart`(quest:'delve'), 꾸미기 세트 드롭(`hidden`, `sm`, `top`) |
| 소식함 | `js/notices.js`, `index.html` `showNotices(list, kind, seenId)` (`:5078`), 우편함 B안(목록+상세) |
| 주민 명단 | `js/data/npcs.js` `NPCS` (10명 + 🦉 courier) |

## 데이터 (조사 2026-11-12)
- Supabase `game_saves` 3,062개, 30일 활성 1,545, 집 3단계↑ 463
- 주민(올빼미·손님 제외) 호감도 ≥1: 63명 (집 3단계↑ 중 59명 = 13%)
- ❤️6↑ 9명, 도면 보유 6명(34장), 금빛 도구 5명(18개)
- GA4(9/4~11/11): 선물 제작 55명, 선물 52명·526번(10번↑ 11명), 올빼미가 선물 1위 35명·145번
- 카페 서빙 425번 → 손님 호감도로만
- npc_talk mode=done(할 말 없음) 본 사람: 상인 68, 큐레이터 56, 판다 37
- 히든 의뢰 완료 34번/8명 (계측 10/25부터)
- 공유 노트: `~/Library/Application Support/Claude/side-session-notes/local_062036a3-.../npc-affinity-findings.md`

## 결정과 이유
- 깊이(선물 취향)보다 "다음이 보이게 + 쌓은 게 쓸모 있게"가 먼저: 진입 13%, 쓸 데 없는 호감도(올빼미·손님)
- 편지는 소식함: 사용자 선택. 약점(하루 늦게 봄)은 HUD 알림 + 빨간 점으로 보완
- 가족 액자는 벽걸이 대신 탁상(`sm`): 벽걸이 배치 기능이 없음
- 선물 하트 하루 +2: 꽃다발(작물 2) 15번이면 한 시간에 끝나서 "다시 들를 이유"가 사라짐
- 손님 8종·방문 연출·선물 취향은 범위 밖
- 잡담에는 호감도를 주지 않음(2026-09-15 결정 유지)
- A/B 안 함: 보상 진행형이라 무리 간 박탈감. 배포 전후 비교

## 보상 수량 확정 (2026-11-13, 판매가·상점가 환산 35~50코인 상당, 테스트로 고정)
- 이웃: 농부 씨앗8·작물4 / 목수 목재15 / 상인 🪙40 / 낚시꾼 미끼3·물고기3 / 판다 밀가루2·꿀1 / 오소리 채집물6 / 별 아이 반딧불이3 / 사공 물고기3·목재8 / 목장 달걀5·작물2 / 큐레이터 돌8·석탄2 / 올빼미 🪙40
- 친구(도면 없는 둘): 판다 💎1·밀가루2 / 올빼미 💎1·🪙40
- 비교: 기존 답례는 ❤️3마다 씨앗3·작물1(약 14코인), ❤️15까지 5번 = 약 70

## 구현 위치 (워크트리)
- 워크트리 `.claude/worktrees/npc-affinity`, 브랜치 `feat/npc-affinity-p1`(main a12fd337 기준), 미커밋
- `js/affinity/stages.js` + `tests/affinity-stages.test.mjs` (14개 통과)
- `js/data/npc-letters.js`(확정 문구에서 생성) + `tests/npc-letters.test.mjs` (5개 통과)

## 의존·제약
- 새 상태는 전부 `hintsSeen` 안 (`affStage`·`affClaim`·`affRead`·`affGift`·`affOwlDay`)
- 새 꾸미기 id(P2 22개) → 5곳 동시 배포
- i18n: 한국어 원문 키 + `js/i18n-en.js`
- 새 전체화면(📒 수첩)은 `anyModalOpen()` 셀렉터에 직접 추가
- 월드 말풍선은 이모지만. 문구 금지어: 엠대시, "놀다"
- 코드 주석 금지
- E3·E6: 첫날 구간에 호감도 안내 넣지 않기, 배포일을 E3 사전등록에 기록
