# ❄️ 눈의 가지 · 메인 스토리 5장 「얼어붙은 가지」 · 썰매지기 대화

Date: 2026-10-28 · Branch: `feat/snow-branch` · Status: 설계 승인(사용자) → 스펙 검토 대기

## 1. 왜

- 설산 정상의 🛷 썰매지기는 말풍선(☕ → 🛷)만 띄우고 말을 걸 수 없다. 사용자 지적: "대화도 안 되고 저 창만 띄우고 있는 거냐"(2026-10-28).
- 설산은 세계수 서사(시든 세계수를 되살려 떠난 이웃을 돌아오게 한다)와 연결이 없다. 둘째 날 자동으로 열리는 별도 미니게임이다.
- 사용자 결정(2026-10-28):
  1. 세계수 판에 **❄️ 눈의 가지**를 추가하고 썰매지기를 그 가지의 이웃으로 둔다.
  2. 메인 스토리에 엮는다. 4장 「세계수의 심장」(안개숲) **바로 다음 5장**으로 넣는다.
  3. 설산·산장 카페는 지금처럼 둘째 날 열린 채로 둔다. 가지를 완성하면 **보상과 연출**을 준다(잠그지 않는다).
  4. 썰매지기 대화는 **고정 대사 + 거울 마을 대화 박스 재사용**(A안).

## 2. 범위 밖

- 설산·산장 카페 입장 조건 변경. `isMountainOpen` 은 그대로 둔다.
- Supabase 대사 풀(npc-talk) 연결. 썰매지기는 `js/data/npcs.js` 마을 주민이 아니다.
- 눈의 가지가 새 시설을 여는 것. `UNLOCKS` 에 새 행을 추가하지 않는다.

## 3. 세계수 판 데이터 (js/world/tree-board.js)

`BRANCHES` 에서 `forest` 와 `mine` 사이에 추가한다. 배열 순서는 판에 보이는 순서다. 세이브는 id 키라 순서를 바꿔도 안전하다.

```js
{ id: 'snow', ico: '❄️', name: '눈의 가지', short: '눈', npc: 'sledkeeper', npcIco: '🛷', npcName: '썰매지기',
  habitat: { shelter: 4, light: 3 },
  bundles: [
    { id: 'firewood', name: '땔감 꾸러미',  need: { wood: 30, coal: 8 },   reward: { coins: 60 } },
    { id: 'cocoa',    name: '코코아 꾸러미', need: { crop: 15, forage: 5 }, reward: { coins: 70 } },
  ] },
```

- 빈터 조건: 기존 장식 🛖 오두막(쉼터 3) + 🏮 등불(불빛 2) + 🔥 화롯불(불빛 3·쉼터 1)로 6칸 안에서 채울 수 있다. 테스트로 도달 가능성을 고정한다.
- 재료 규칙(기존 스펙 §2): 숲 가지 뒤에 이미 얻을 수 있는 것만 쓴다. 🍄 채집물(forage)은 숲 가지에서 열리므로 쓸 수 있다.
- `TREE_DECOR` 에 꽃 장식 1종을 추가한다. 초안은 `{ id: 'snowman', ico: '☃️', name: '눈사람', tags: { shelter: 2, shade: 2 }, cost: { stone: 3, wood: 1 }, bloom: 'snow' }`. 이름과 아이콘은 검수받는다.
- `js/story/rules.js` `BRANCH_NAME` 에 `snow: '눈의 가지'` 를 추가한다.

## 4. 꽃피우기·돌봄·손님 (js/world/tree-bloom.js)

다른 가지와 같은 형식으로 `STAGES.snow`(3단계)·`CARE_NEEDS.snow`(2종)·`GUESTS.snow`(5종, 낮 3·밤 2)를 채운다.

- STAGES 초안: `{ wood: 50, coal: 15 } → { bait: 5 }`, `{ forage: 15, stone: 30 } → { fert: 3 }`, `{ charcoal: 4, crop: 30 } → { seed: 15 }`.
- CARE_NEEDS 초안: `[{ coal: 4 }, { wood: 10 }]`.
- GUESTS 후보(검수 필요): 낮 🐧 펭귄(shelter 3) · 🦭 물범(shelter 2, light 2) · 🐇 눈토끼(shade 2, shelter 2) / 밤 🐺 늑대(shelter 4) · 🦉 흰올빼미(light 3, shade 2). 🐇·🦉 는 다른 가지 아이콘과 겹치므로 대체를 검토한다. ZWJ 이모지(🐻‍❄️)는 쓰지 않는다.
- 손님 id 는 다른 가지와 겹치면 안 된다(도감 키 충돌). 테스트로 고정한다.

## 5. 귀환 연출 (js/world/region-cine.js)

```js
'snow:habitat': { id: 'snowpeak', npc: 'sledkeeper', place: null, at: { x: -15, z: -29.5 }, fx: 'snow', sub: '❄️ 눈의 가지', main: '정상 산장에 불이 켜졌어요' },
```

- `at` 은 마을의 설산 입구(`MOUNTAIN_GATE`)다. 연출은 마을에서 일어난다.
- `fx: 'snow'` 는 js/world/region-fx.js 에 새 이펙트를 추가한다(눈송이 파티클, 기존 fx 구조를 따른다).
- `npc: 'sledkeeper'` 는 마을 NPC 가 아니다. 연출이 npc 를 마을에서 찾는 코드가 있으면 null 을 허용하도록 고친다(구현 때 확인).

## 6. 세계수 3D (js/world/tree-art.js)

`LIMBS` 는 5개 가지를 72° 간격으로 둔다. 6번째를 넣는 방법은 둘이다.

- (a) 60° 간격으로 6개를 다시 나눈다. 기존 가지 각도가 바뀐다.
- (b) 기존 5개는 두고 빈 자리(kitchen ↔ mine 사이, 오른쪽 뒤)에 짧은 가지를 하나 더 둔다.

**시안 3개(a, b, b 의 높이 변형)를 렌더해 PC·모바일로 나란히 비교받은 뒤 정한다**(design-compare-before-ship 규칙). 잎·꽃 진행은 다른 가지와 같은 `state.branches.snow` 를 쓴다.

## 7. 메인 스토리 5장 (js/story/chapters.js · rules.js · game.js)

### 7-1. 장 표

`STORY` 에서 `secret` 다음(인덱스 4)에 추가한다. STORY 와 REWORLD 둘 다 같은 자리에 들어간다(REWORLD 는 STORY.map 으로 만든다).

```js
{ id: 'snowbranch', ico: '❄️', title: '얼어붙은 가지', goal: '눈의 가지 빈터 꾸미기',
  start: '🛷 설산 정상의 썰매지기를 찾아가 보자. 얼어붙은 가지 이야기를 들려줄 거예요.',
  done: '눈의 가지에 온기가 돌아요. 산장 창에 불이 켜졌어요.',
  reward: { coins: 90 } },
```

- 4장 `secret.done` 문구에 다음 장 연결을 넣는다. 초안: `안개가 걷혔어요. "와 줘서 고마워. 그런데 정상의 가지 하나가 아직 얼어 있단다."`
- 규칙: `snowbranch: { done: s => branchHab(s, 'snow'), progress: s => \`❄️ 눈의 가지 빈터 ${branchHab(s, 'snow') ? 1 : 0}/1\` }`
- 모든 문구는 검수받는다. 엠대시는 쓰지 않는다.

### 7-2. 세이브 이전 (한 번만)

`gameState.story.ch` 는 "끝낸 장 수"다. 인덱스 4에 장이 끼면 기존 세이브의 의미가 한 칸 어긋난다.

- `story.v` 필드를 추가한다(없으면 1, 새 표는 2).
- 복원할 때 `v < 2` 이고 `ch >= 5` 이면 `ch += 1` 하고 `v = 2` 로 둔다. 그 세이브는 5장(새 장)을 건너뛴 것으로 본다. 보상은 주지 않는다. 눈의 가지는 판에서 자유롭게 할 수 있다.
- `ch <= 4` 는 그대로 둔다. `ch === 4`(지금 「마을의 살림」 진행 중)는 다음 부팅부터 칩이 5장 「얼어붙은 가지」를 보여 준다. `started.living` 기록은 남아 있어서 6장이 됐을 때 이어진다.
- 새 세이브는 `v = 2` 로 시작한다.
- 이전 함수는 순수 함수로 js/story/rules.js 에 두고 테스트한다(`migrateStory(story) → story`, 원본을 고치지 않는다).

### 7-3. 장 번호에 묶인 코드

| 위치 | 지금 | 바꿀 값 |
|---|---|---|
| js/world/unlocks.js 천문대·별지기 | `story.ch >= 6` | `>= 7` |
| js/world/unlocks.js 이웃 마을·거울 마을 | `story.ch >= 7` | `>= 8` |
| js/game.js syncStory "새 이야기" 토스트 | `st.ch === 4 \|\| st.ch === 7` | `st.ch === 4 \|\| st.ch === 8` (4 = 새 5장이 열린 기존 진행자) |
| js/world/tree-shot.js | `story.ch === 0` | 그대로 |

구현 때 `story.ch` / `story?.ch` 와 장 번호 숫자 문자열("6장", "7장")을 저장소 전체에서 다시 찾는다(가이드 문서·i18n 포함).

### 7-4. 분석 연속성

- GA4 `story_chapter_start` / `story_chapter_complete` 는 이미 `chapter`(id)를 보낸다. 분석은 id 기준이면 끊기지 않는다. `n`(장 번호)은 배포일부터 4 이후가 한 칸 밀린다. docs/analysis 지표 정의서에 배포일과 함께 적는다.
- 이전으로 `ch` 가 바뀌는 세이브는 `story_migrated` 이벤트를 1회 보낸다(`from`, `to`).

## 8. 썰매지기 대화 (새 파일 js/mountain/keeper-talk.js)

### 8-1. 판정 (순수 함수)

```js
export function keeperStage(s, storyIds) // → 'guide' | 'quest' | 'thanks'
```

- `thanks`: `branchHab(s, 'snow')`.
- `quest`: 지금 장이 `snowbranch`(story.ch === 그 인덱스).
- 그 밖은 `guide`.
- `keeperLines(stage, lang)` 이 대사 배열을 돌려준다. 한 번에 박스 한 장, 탭하면 다음 줄, 마지막 줄에서 닫힌다.

### 8-2. 대사 초안 (검수 필요)

- guide: "어서 와요. 산장에서 코코아로 몸부터 녹여요." / "몸이 풀리면 출발대에서 썰매를 타 봐요. 도토리를 주우면 더 빨라져요."
- quest: "세계수 소식 들었어요. 이 산에도 가지가 하나 있는데, 겨우내 얼어 있어요." / "세계수 판에서 ❄️ 눈의 가지 빈터를 따뜻하게 꾸며 줄래요?"
- thanks: "창에 불이 다시 켜졌어요. 고마워요." / (첫 1회만) "이 썰매는 세계수 가지로 만든 거예요. 타고 내려가 봐요." → ❄️ 세계수 썰매 지급

### 8-3. 연결

- js/spaces/doors.js 설산 분기에 `keeperReady()`(산장 밖, 썰매 중 아님, `CAMP.keeper` 반경 1.6) 를 문 판정 **뒤**에 둔다. 문·출발대가 겹치면 그쪽이 먼저다. `nd = 'keepertalk'`, prompt `💬 썰매지기에게 말 걸기`.
- js/spaces/mountain.js `mountainAction('keepertalk')` → `openKeeperTalk()`. 대화 박스는 js/mirror/talk-box.js 의 `showTalk / hideTalk / onTalkTap` 을 쓴다.
- 말풍선: `quest` 단계이고 아직 말을 안 걸었으면 ❕, 아니면 지금처럼 ☕ → 🛷 (js/mountain/keeper-bubble.js 에 `setMode`).
- 터치: 근접 알약(#near-pill)이 💬 로 뜬다. 문 프롬프트와 같은 경로라 추가 UI 가 없다.
- 영어: js/i18n-en.js 에 대사·프롬프트를 추가한다(통문장 키).

## 9. 보상·연출

- 완성 보상(첫 `thanks` 대화 때 1회): ❄️ 세계수 썰매. `cafe-catalog` 에 코인·현금 가격 없는 전용 스킨으로 추가하고 `gameState.mountain.hut` 의 보유 목록에 넣는다(기존 `grantFinishSled` 경로를 따른다). 이미 있으면 다시 주지 않는다. 조형은 기존 썰매 모델 하나에 색·장식만 바꾼 시안 3개를 비교받는다.
- 산장 창 불빛: `branchHab(s, 'snow')` 면 산장 유리창(camp-art.js `LAMP` 삼각형)의 밝기를 올리고 굴뚝 연기를 켠다. 병합 메시라 재빌드 대신 glow 메시의 색 하나만 바꾼다(드로우콜 0 추가).

## 10. 트래킹 (feature-tracking-checklist)

| 이벤트 | 파라미터 | 언제 |
|---|---|---|
| `keeper_talk_open` | `stage`(guide/quest/thanks) | 대화 박스 열림 |
| `keeper_talk_close` | `stage`, `via`(tap/action/leave), `lines_seen` | 박스 닫힘 |
| `keeper_gift` | `item_id` | 세계수 썰매 지급 |
| `story_migrated` | `from`, `to` | 이전 1회 |

- 가지 진행 이벤트(기존 tree 이벤트)는 branch 파라미터에 `snow` 가 들어갈 뿐이다. 새 키를 만들지 않는다.
- 파라미터는 이벤트당 5개 이하(GA4 25개 한도 규칙).

## 11. 테스트 (TDD)

- tree-board: snow 가지 존재·순서(forest 다음), 기존 장식만으로 빈터 조건 도달 가능, 꾸러미 재료가 허용 목록 안, restoreTree 가 snow 를 보존.
- tree-bloom: STAGES/CARE_NEEDS/GUESTS 에 snow 가 있고 형식이 같다, 손님 id 가 전 가지에서 유일.
- region-cine: `snow:habitat` 존재, fx 가 region-fx 에 있다.
- story: 5장 위치(인덱스 4)가 STORY·REWORLD 둘 다 같다, `migrateStory` 표(ch 0~9 × v 1/2), 해금 숫자 7/8.
- keeper-talk: `keeperStage` 세 단계, 대사 배열이 비지 않고 엠대시가 없다, 영어 키가 다 있다.
- doors 배선: 썰매지기 판정이 문·출발대보다 뒤(소스 테스트).
- 수동: 앱 브라우저 모바일 375×812 에서 대화 열기·닫기, 근접 알약, 말풍선 ❕, 5장 칩, 가지 완성 후 썰매 지급.

## 12. 배포

- 🚨 **웹·토스·Play·iOS·itch 동시 배포.** 옛 클라이언트의 `restoreTree` 는 모르는 가지(snow)를 버리고 저장한다. 같은 계정으로 옛 클라이언트에 들어가면 눈의 가지 진행이 지워진다(할로윈 가구 id 와 같은 함정). 토스 검수 기간에는 웹·Play 배포를 토스 승인에 맞춘다.
- 세이브 이전(7-2)은 되돌릴 수 없다. 배포 전 실제 세이브 샘플로 이전 결과를 확인한다(SQL 로 ch 분포만 조회).
- 공지는 토스 출시 후 notices_admin.html 로 쓴다.

## 13. 위험

- 장 번호 하드코딩이 더 있을 수 있다 → 7-3 전수 검색.
- 세계수 3D 가지 재배치(6-a)는 기존 꽃·잎 연출 좌표를 흔든다 → 시안 비교에서 b 를 우선 검토.
- region-cine 가 마을 NPC 를 전제로 할 수 있다 → 구현 첫 단계에서 확인.
- 옛 세이브(legacy, STORY 표)도 5장이 끼므로 세계수 판에 들어갈 수 있어야 한다 → 구현 첫 단계에서 legacy 세이브의 판 진입 경로를 확인하고, 막혀 있으면 legacy 의 5장은 `soon` 처럼 건너뛰는 규칙을 이 스펙에 추가한다.
