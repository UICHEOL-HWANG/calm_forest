# 미니게임 유니크 꾸미기 세트 · 스펙

작성 2026-10-18 · 근거: [plan](minigame-decor-drops-plan.md) · 시안 `sims/kitchen-set-sim.html`, `banner/banner-mockup.html`

## 1. 무엇을 만드나
활동 한 판이 끝날 때마다 일정 확률로 실내 꾸미기 유니크 아이템이 나온다. 아이템은 2개가 한 세트이고, 둘 다 모으면 세트 보너스 가구가 하나 더 생긴다. 활동에 들어갈 때 작은 배너로 알리고, 배너나 ☰ 메뉴에서 세트 앨범을 연다.

## 2. 세트·아이템

| 세트 | 아이템 id | 이름 | 나오는 곳 (한 판) | 확률 | 확정 |
|---|---|---|---|---|---|
| 오후의 피크닉 세트 `picnic` | `picnicBasket` | 소복 과일 바구니 | 🍎 과수원 `harvestTree` | 1/6 | 12번째 |
| | `picnicPies` | 갓 구운 파이 탑 | 🍲 요리 `kitchenFinish` (포기 제외) | 1/10 | 20번째 |
| | `picnicTable` (보너스) | 체크 식탁보 둥근 식탁 | 세트 완성 시 | | |
| 별빛 티타임 세트 `teatime` | `teaBowl` | 텃밭 한 그릇 | 🌾 텃밭 수확 `tryHarvest` (낫으로 딸려 온 칸은 제외) | 1/10 | 20번째 |
| | `teaCake` | 꿈결 별 케이크 | 🌙 꿈 조각 `dream collect` | 1/14 | 28번째 |
| | `teaCupboard` (보너스) | 깃발 민트 찬장 | 세트 완성 시 | | |
| 눈 오는 밤 세트 `winter` | `winterSled` | 목도리 두른 썰매 | 🏔️ 설산 `sled_result` (sled-run.js:104) | 1/9 (임시) | 18번째 |
| | `winterLamp` | 별 헤는 무드등 | 🔭 천문대 `star_result` (star-run.js:84, 성공한 판만) | 1/4 | 8번째 |
| | `winterSofa` (보너스) | 눈 내리는 창가 소파 | 세트 완성 시 | | |
| 반짝 돌 공방 세트 `stone` | `stoneGems` | 반짝반짝 원석함 | ⛏️ 광산 `mine_ore` (mine.js:178) | 1/64 | 128번째 |
| | `stoneBear` | 꼬마 곰 석상 | 🗿 조각 `carve_result` (carving.js:273, 포기 제외) | 1/4 | 8번째 |
| | `stoneHearth` (보너스) | 타닥타닥 벽난로 | 세트 완성 시 | | |
| 달빛 연못 세트 `lantern` | `lanternBoat` | 등불 켠 나룻배 | 🛶 나룻배 `boat_end`·`ferry_quiz_end` (river.js:492, ferry-quiz-run.js:85) | 1/4 | 8번째 |
| | `lanternMist` | 푸른 불 석등 | 🌫️ 안개숲 `mist_end`·`mist_practice_end` (mist.js:410, 323) | 1/4 | 8번째 |
| | `lanternRug` (보너스) | 연꽃 연못 러그 (연잎·연꽃·갈대, 배가 살짝 흔들림) | 세트 완성 시 | | |
| 한밤의 텃밭 세트 `guard` | `guardFlag` | 이겼다! 깃발 | 🐗 밤손님 `duel_result` (duel/index.js:110) | 1/4 | 8번째 |
| | `guardJar` | 반딧불 한 병 | 🦋 반딧불 `firefly_catch` (glade.js:187) | 1/28 | 56번째 |
| | `guardScarecrow` (보너스) | 금빛 허수아비 | 세트 완성 시 | | |

- 미니게임마다 내 집에 남는 것이 생긴다 (게임 정체성: "나만의 작은 마을"). 🎣 낚시는 E3 이후 연못과 묶어 7번째 세트로
- 확률 = 1 / (2 × 그 활동의 하루 판 수 중앙값), **상한 1/4**. 보통 플레이어가 그 활동을 하는 두 번째 날쯤 하나를 받는다. 확정 = 1/p의 2배
- 하루 1판짜리(나룻배·밤손님)는 공식대로면 1/2라 유니크 느낌이 사라져서 상한을 둔다
- 설산은 10/16 출시라 데이터가 없다. 1/9는 임시, 배포 2주 뒤 `minigame_play_rate.py`로 다시 계산
- 🚨 구현 기준은 `origin/main` (로컬 main은 설산·조각 이벤트가 없는 옛 상태)
- 이미 가진 아이템은 다시 나오지 않는다. 그 활동의 아이템을 받으면 이후 그 활동에서는 굴리지 않는다
- 🎣 낚시·🌊 바다터는 E3가 끝날 때까지 넣지 않는다
- 무료 전용. 코인·💎로 사거나 확률을 올리는 수단을 만들지 않는다
- 화면에는 숫자를 쓰지 않는다. "일정 확률로 나와요!"

## 3. 카탈로그 (`js/data/catalog.js` DECOR)
기존 `parasol_set` 패턴: `cost: 0, pay: 'coins', hidden: true` + 새 필드 `set`.
```js
{ id: 'picnicBasket', name: '소복 과일 바구니', ico: '🧺', cost: 0, pay: 'coins', hidden: true, set: 'picnic', sm: true, h: 0.45 }
```
- 바구니·파이 탑·그릇·케이크는 `sm` (탁상에 올릴 수 있음). 식탁·찬장은 `top` 있는 큰 가구라 그 위에 올릴 수 있다
- 🚨 옛 클라이언트는 모르는 가구 id를 세이브에서 지운다 (`applySave` game.js:2481, indoor.js:668). 그래서 **웹·토스·itch·Android·iOS를 동시에 배포**해야 하고, 토스 승인 전에는 웹·Play도 보류한다

## 4. 상태 (세이브)
```js
gameState.drops = { tries: { orchard: 0, cook: 0, crop: 0, dream: 0, sled: 0, star: 0, mine: 0, carve: 0, ferry: 0, mist: 0, duel: 0, firefly: 0 }, banner: { picnic: 'YYYY-MM-DD' } }
```
- 받은 아이템은 `house.stored[id] += 1`과 `house.grantedDecor.push(id)`. 이미 가졌는지는 `grantedDecor`로 판정한다 (배치하거나 팔아도 유지)
- `tries`는 그 활동에서 아직 못 받은 동안의 누적 판 수. 받으면 그 키를 지운다
- 세트 완성은 `grantedDecor`에서 매번 계산한다 (따로 저장하지 않음)

## 5. 모듈 (game.js에는 연결 줄만)
| 파일 | 책임 |
|---|---|
| `js/data/decor-sets.js` | 세트 정의: id, 아이템 id, 활동(src), p, pity, 보너스 id, 썸네일 경로 |
| `js/decor-drops/rules.js` (순수, Node 테스트) | `rollDrop(state, src, rand)` → `{ hit, item, tries, pity }`, `setProgress(granted, set)`, `bannerDue(state, set, today)` |
| `js/decor-drops/art.js` (three) | 18개 메시 (세트당 3). 세트별 파일로 나눠도 됨 (`art-picnic.js` …). `sims/kitchen-set-sim.html`의 조형을 이식, 재질 공유(`shared()`) |
| `js/decor-drops/index.js` | `onPlay(src)` 굴림 → 지급·토스트·트래킹 / 세트 완성 처리 / 입장 배너 / 앨범 열기 |
| `js/decor-drops/album.js` | ③ 세트 앨범 시트 (`#guide-panel` 패턴) |
| `assets/decor-sets/{set}.jpg` 6장 | 세트 완성 캡처 (앨범·배너 썸네일) |
| `js/i18n-en.js` | 문구 영어판 |

연결 지점 12곳: `kitchenFinish` (game.js, `!res.abandoned`) · `harvestTree` (orchard-actions.js) · `tryHarvest` 수확 성공 (farm-auto.js) · `dream collect` (dream.js) · §2 표의 나머지 8곳. 줄 번호는 origin/main에서 다시 확인

## 6. 화면
**획득 토스트** (`ui.toast`, 2.8초)
- `🎁 {아이템}을 찾았어요. {세트} 1/2` · en `🎁 Found a {item}! {set} 1/2`
- 두 번째 아이템이면 이어서 세트 완성 토스트: `✨ 오후의 피크닉 세트 완성! 식탁에 체크 식탁보가 깔렸어요` / `✨ 별빛 티타임 세트 완성! 벽에 알록달록 깃발이 걸렸어요`

**② 입장 배너** (`ui.showHintBanner`, 왼쪽 위 컨텍스트 슬롯 12,162)
- 활동 장소에 들어서면 그 활동의 세트: 과수원·주방 → 피크닉 · 텃밭·꿈의 숲 → 티타임 · 설산·천문대 → 눈 오는 밤 · 광산·조각 작업대 → 반짝 돌 공방 · 나루터·안개숲 → 달빛 연못 · 반딧불 숲·밤손님 대결 → 한밤의 텃밭
- 세트별 하루 한 번(로컬 날짜 `todayStr()`), 세트 완성 후엔 안 뜸, 6초 뒤 접힘
- `🎁 {세트}` / `{활동}에서 일정 확률로 나와요!` / `세트 보기 ›` → 탭하면 ③

**③ 세트 앨범** (☰ 메뉴 `🎁 꾸미기 세트` + 배너 탭)
- 세트마다 완성 캡처, `0/2` 배지, 아이템 칩(가진 것 금색), 나오는 곳 이모지
- 못 모은 세트는 사진을 흐리게. 숫자 확률 없음
- 6세트 + 🎣 "곧 만나요" 실루엣 카드 1장 (E3 이후 연못 세트 자리). 폰에서는 세로 스크롤, PC는 3열

## 7. 트래킹 (GA4, 파라미터 ≤5, 기존 키 재사용)
| 이벤트 | 파라미터 | 언제 |
|---|---|---|
| `decor_drop` | `item`, `set`, `src`, `tries`, `pity` (0/1) | 아이템 획득 |
| `decor_set_complete` | `set`, `days_since_first` | 세트 완성 (firstDay가 날짜라 일 단위) |
| `decor_banner` | `set`, `act` (`show`/`tap`/`dismiss`) | 입장 배너 |
| `decor_album_open` | `src` (`banner`/`menu`) | 앨범 열기 |

- 굴린 횟수는 기존 이벤트(`cooking_result`·`fruit_harvest`·`harvest_crop`·`dream_shard`)로 센다. 굴릴 때마다 이벤트를 따로 보내지 않는다
- 다음날 BQ에서 `decor_drop.tries` 분포가 확률과 맞는지, `pity=1` 비율을 재검증한다
- dev 파라미터 `?dbg&drop=force` (다음 판 무조건 당첨)는 GA4에 안 남게 dev 세션에서만 동작

## 8. 실험과의 관계
- E3 두 무리(on/off)에 똑같이 들어간다. 무리별 분기 없음
- `space-link-experiment-prereg.md`에 배포일과 한 줄 기록: "이 날부터 양쪽 모두 미니게임→꾸미기 보상이 있다. 연못 효과는 이 위에서 더해진 효과로 읽는다"

## 9. 테스트 (Node, TDD)
- `rules`: 확률 경계(rand=p-ε 당첨 / p 미당첨), 확정 판에서 반드시 당첨, 가진 아이템은 안 굴림, tries 증가·초기화, 세트 진행 0/1/2, 배너 하루 한 번·완성 후 안 뜸
- 카탈로그: 18개 id가 `hidden`·`set` 필드를 갖고, 상점 목록(`getDecor`)에 안 나옴
- 배선: 12개 연결 지점이 `onPlay`를 부르는지 소스 텍스트로 확인 (`gameSource()` 패턴)
- 문구: ko/en 키가 다 있고 엠대시 없음

## 10. 하지 않는 것
- 낚시·바다터 드롭 (E3 이후)
- 서버 검증 (무료 장식이라 세이브 조작 위험을 감수)
- 아이템 판매 (상점에서 되팔기 불가, `hidden`)
