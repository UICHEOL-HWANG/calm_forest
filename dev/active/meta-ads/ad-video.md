# Meta 광고 영상 (halloween_v1 · cozy_v1)

Last Updated: 2026-10-21

## 만드는 법 (로컬)

```bash
python3 scripts/serve.py            # 다른 터미널 — localhost:8000 (dev 훅 __tp 등은 localhost 에서만 열린다)
cd tools/cardnews
node ad-record.mjs --scenario halloween --out out/ad/halloween_raw.mp4     # 13초, 1080x1920, 30fps (수 분)
node music.mjs --style halloween --secs 14 --out out/music/halloween.wav
node ad-compose.mjs --scenario halloween --raw out/ad/halloween_raw.mp4 --music out/music/halloween.wav --out out/ad/halloween_v1.mp4

node ad-record.mjs --scenario cozy --out out/ad/cozy_raw.mp4
node music.mjs --style lofi --secs 14 --out out/music/cozy.wav
node ad-compose.mjs --scenario cozy --raw out/ad/cozy_raw.mp4 --music out/music/cozy.wav --out out/ad/cozy_v1.mp4
```

빠른 검수: `ad-record.mjs ... --scale 1 --secs 4` (540x960, 앞 4초만).

## 구조

| 파일 | 하는 일 |
|---|---|
| `tools/cardnews/ad-scenes.mjs` | 대본 — 프레임마다 카메라(플레이어 기준 오프셋)·키 입력·게임 함수 호출 |
| `tools/cardnews/ad-record.mjs` | 가상 시계로 1/30초씩 넘기며 캔버스를 떠 ffmpeg 로 잇는다(끊김 없음). 카메라는 `setCameraRig` |
| `tools/cardnews/ad-compose.mjs` | 자막(투명 PNG)·엔드카드·음악 합성. 문구·시각은 `CAPTIONS` |
| `tools/cardnews/music.mjs --style halloween` | 할로윈 왈츠(자체 합성 — 저작권 문제 없음). 마디가 컷에 맞춰 있다 |

게임 코드는 고치지 않는다. 녹화 때만: HUD 숨김 · 마당 앞 나무 숨김(충돌체도 끔) · NPC 숨김 · 카메라 보조광(밤).

## 콘티

**halloween_v1** (겨울 밤·눈 · 곰 · 별밤 견습 마녀 + 박쥐 망토 + 꼬마 호박등 자국)
| 초 | 화면 | 자막 |
|---|---|---|
| 0~2.4 | 밤 마당으로 푸시인 | 숲에 할로윈이 찾아왔어요 |
| 2.4~5.2 | 유령 등·묘비 울타리·거미줄 아치가 하나씩(딸깍 벨) | 딸깍, 딸깍 / 마당에 유령 등이 하나씩 |
| 5.2~8.6 | 둘레를 도는 카메라(의상) | 마녀 모자 쓰고 밤 산책 |
| 8.6~11 | 산책 | 11월 2일까지만 열리는 할로윈 숲 |
| 11~13 | 위로 빠지며 마을 + 엔드카드 | 고요한 숲 · 설치 없이 웹에서 바로 · 할로윈 이벤트 11/2까지 |

**cozy_v1** (겨울 낮·눈)
| 초 | 화면 | 자막 |
|---|---|---|
| 0~2.8 | 옆에서 본 도끼질(나무 조각) | 오늘은 천천히 해도 돼요 |
| 2.8~6.2 | 꽃밭·가로등·건초·울타리가 하나씩 | 마당을 하나씩 채우고 |
| 6.2~9.8 | 둘레를 도는 카메라 | 눈 오는 숲에서 잠깐 쉬어 가요 |
| 9.8~13 | 위로 빠지며 마을 + 엔드카드 | 고요한 숲 · 설치 없이 웹에서 바로 플레이 |

## 레퍼런스 (2026-10-21 조사)

- 첫 2~3초 안에 실제 게임플레이(코지·캐주얼 광고 훅의 다수) — https://mobile-game-creative-insights-report-q4-2025.segwise.ai/
- 빈 공간 → 하나씩 채우기, "딸깍" 만족감, 덜 끝난 채 CTA — https://segwise.ai/blog/dreamy-room-mobile-game-creative-strategies , https://segwise.ai/blog/cookingdom-user-acquisition-strategy
- 시즌 한정 마감(Dreamlight Valley·Hello Kitty Island Adventure 할로윈 이벤트) — https://www.pocketgamer.com/disney-dreamlight-valley/season-of-scares-2026-out-now/
- 릴스 안전 영역 위 14%·아래 35%·좌우 6% — https://blog.adnabu.com/meta-ads/meta-safe-zones/
- 할로윈 음악: 3/4 왈츠·피치카토·첼레스타·하프시코드·단조 — https://www.melodyloops.com/tracks/pumpkins-waltz/ , https://monsterone.com/stock-music/haunted-waltz-halloween-music-o545478/

## 남은 것

- [ ] 실제 폰으로 보고 자막 크기·속도 검수(Meta 광고 관리자 미리보기에서 안전 영역 확인)
- [ ] cozy 의 "앉기"(KeyC)가 녹화에서 안 먹는다 — 서 있는 채로 둘레를 돈다. 앉는 장면이 필요하면 원인 확인
- [ ] v2: 카메라 무빙 다듬기, Flow 훅(1~2초) 테스트는 예산 늘린 뒤
