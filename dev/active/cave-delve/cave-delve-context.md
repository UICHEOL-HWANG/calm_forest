# cave-delve · context

Last Updated: 2026-10-25 (KST)

## 한 줄

지금 동굴을 0층으로 두고 지하 1~20층 탐험 + 순한 방해꾼 4종 + ⛏️ 광부 아저씨 별도 퀘스트 트랙을 붙인다. 전투 없음.

## 스펙

- `docs/superpowers/specs/2026-10-25-cave-delve-design.md` (설계 확정, 구현 전)

## 확정된 결정

- 방해꾼↔대응: 🦎 동굴 도롱뇽 = 놀래키기(웅덩이 아가미 톡) · 💎 수정집게 = 미끼(🍄 채집물 1개, 낚시 미끼와 별개) · 🦇 잎귀박쥐 = 빨리 줍기(노란 원) · 🐛 등불벌레 = 굴 되찾기(빛 자국, 덤 1).
- 갓도롱뇽(버섯 갓) 기각 → v1 동굴 도롱뇽 생김새 + 웅덩이 숨기.
- 층: 1~10 흙(도롱뇽·수정집게) / 11~20 수정(박쥐·등불벌레). 정류장 5·10·15·20.
- 내려가는 곳: 도착점 반대편 절반 + 대각선 60% 이상 + 다섯 번째 바위 안 보장. 생김새는 나무 틀+사다리(굴과 구분).
- 광부: A안 헤드램프(몸 `0x6b7448`, 헬멧 `0x41556b`). `NPCS`에 넣지 않음.
- 광부 라인은 별도 트랙: `gameState.delve`, `story.q` 안 올림, `mine` 타입 안 씀, 카드는 동굴 안에서만, 반복 로테이션 밖, 튜토리얼 뒤 시작.
- 안내 문구 확정(스펙 §4). 배너 한 줄 16자 이내, 엠대시 금지, 월드 말풍선은 이모지만.
- 경제(시뮬 S3 확정): 광맥 층당 2·광석 1개 고정·그날 첫 방문 층만. 보석 1~10층 4→8%(안개 날만), 11~20층 10→18%(날씨 무관). 수정 10%(25코인). 보통 플레이어 하루 ≈78(올빼미 1.11배). 실데이터: 0층 채굴자 하루 중앙값 55개(≈229코인).
- 트래킹 7종(스펙 §8), 파라미터 ≤5.

## 핵심 파일(기존)

- `js/spaces/mine.js` — 0층(buildMine·enterMine·tryMine·weightedOre). `questEvent('mine')`은 여기서만.
- `js/data/places.js` — `MINE`(0,0,250)·`MINE_HALF` 12·`MINE_GATE`(-14,0,3).
- `js/spaces/npc.js` — `buildNPCLook`, `refreshQuestPanel`(785~), `questPanelTop`(777).
- `js/orchard-onboard.js` — 별도 트랙 카드 선례(`onboardView`).
- `js/game.js` — `questEvent`(~7347), `syncStory`(1117), `story.q` 증가(~7340), 로드 복원(2490~, 아는 칸만), `getGameState`(2621), `firstHintBanner`(1249).
- `index.html` — `setDoorPrompt`/`doorIcon`(3541), `nextHintBanner`(2713), `setQuest`(~3075).
- `js/data/catalog.js:144` — `SELL_PRICE`(돌 3·석탄 6·보석 40).

## 시안·목업

- `sims/cave-pest-compare-v2.html`, `sims/cave-pest-compare.html`, `sims/miner-npc-compare.html`
- `sims/cave-pest-art.mjs` — 방해꾼 조형 모듈(구현 때 `js/delve/pest-art.js`로 이전)
- `dev/active/cave-delve/mockup/` — 실제 게임 HUD 위 안내 캡처 10장 + `capture.mjs`(오프라인 게스트·Supabase/GA 차단) + `index.html`

## 함정·의존성

- 🚨 저장: 옛 클라이언트가 `delve`를 지운다 → 웹·토스·Play·itch 4곳 동시 배포(+iOS 같은 날 심사).
- 동굴 바닥 윗면 y=0.15(목업에서 y=0에 놓아 묻힌 적 있음).
- 실제 곰 캐릭터 키 ≈1.79. 방해꾼 크기는 이 기준.
- 헤드리스 캡처는 게임 진입 완료(`__gs`) 대기 필요, 배너는 게임 큐가 내릴 수 있으니 셔터 직전 다시 `show`.
- 새 문구는 `js/i18n-en.js` + `scripts/i18n_check.mjs` 통과.
- GA4 25개 한도(코드 키 23개), 이벤트당 ≤5.

## 다음

1. 실행 방식 선택 후 `cave-delve-plan.md` Task 0(워크트리 `feat/cave-delve`)부터
2. 지하 층 새로고침 → 마을 동굴 입구 앞 복귀(`getGameState` playerPos, Task 8)
