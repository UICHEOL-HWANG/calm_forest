# 세계수 엔딩 설계 (tree-finale)

Date: 2026-11-20
Branch: feat/tree-finale
Mockups: `dev/active/tree-finale/compare.html` (연출 A/B/C), `dev/active/tree-finale/title-compare.html` (칭호 자리 A/B/C)
Related: `2026-10-16-world-tree-board-design.md`, `2026-10-16-world-tree-reworld-design.md`

## 1. 목적

9장까지 이야기를 끝낸 사람에게 끝맺음을 주고, 아직 가는 사람에게는 보이는 목표를 준다.
도달자는 11명(활동 6명)이라 엔딩은 "보상"이면서 동시에 "남에게 보이는 목표" 역할을 해야 한다.

## 2. 이야기: 끊긴 뿌리

숲과 숲을 잇던 뿌리가 끊겨 있었다. 이웃이 돌아오고 다른 숲을 오가면서 뿌리가 다시 이어졌다.
광산 20층 뿌리 터가 남긴 "뿌리는 어디로 이어지나"에 대한 답이 된다.

## 3. 언제 열리나

- 조건: `gameState.story.ch >= 9` (9장 완료).
- 실시간: 9장 완료 모달이 닫힌 뒤 엔딩 연출을 조망샷 줄에 세운다 (`via: 'live'`).
- 소급: 이미 9장을 끝냈고 `hintsSeen.treeFinale` 이 없으면, 다음에 마을에 들어올 때 한 번 튼다 (`via: 'boot'`).
- 다시 보기: 세계수 판 칭호 띠의 "🎬 엔딩 다시 보기" 버튼 (`via: 'replay'`).
- 저장: `hintsSeen.treeFinale = 'YYYY-MM-DD'` (KST). 연출을 시작할 때 기록한다. 새 최상위 필드는 없다.
- 건너뛰어도 꽃·뿌리 길·칭호는 모두 그대로 받는다. 보상은 `story.ch` 로 판정하고, 연출을 봤는지와는 무관하다.

## 4. 엔딩 연출: 뿌리 길 따라가기 (약 13초)

| 구간 | 카메라 / 장면 | 글 |
|---|---|---|
| 0~1초 | 현재 카메라에서 이웃 마을 입구(NEIGHBOR_GATE)로 이동, 위아래 검은 띠 | |
| 1~7초 | 입구에서 뿌리 곡선을 따라 세계수 쪽으로 이동. 뿌리 빛은 카메라보다 조금 앞서 번진다. 길가 양쪽에 주민이 서 있다 | 자막 |
| 7~10초 | 세계수 앞에서 올려다봄. 꽃이 아래 가지부터 차례로 피고 꽃잎이 흩날린다 | |
| 10~13초 | 카메라가 멈추고 끝 카드. 카드를 누르면 원래 시점으로 돌아온다 | 끝 카드 |

- 건너뛰기: 화면을 누르거나 아무 키 → 끝 카드로 바로 간다 (기존 조망샷 skip 과 같은 방식).
- 주민: 연출 동안 주민 그룹을 뿌리 곡선 위 미리 정한 자리에 세운다. 끝나면 원래 자리로 돌려놓는다.
  카메라에서 건물이나 무대에 가리는 자리는 뺀다. 상인은 제외한다.
- 연출 중에는 주민 이름표와 "!" 표시를 숨기고(`setNpcGlyphsHidden`), 끝나면 되돌린다.
  HUD 는 기존과 같이 `body.cine-open` 으로 숨긴다.
- 안개: 기존 `treeShotFogPush` 경로로 카메라가 물러난 만큼 민다.
- 소리: 기존 `Sound.cineWhoosh`, `Sound.complete` 만 쓴다.

## 5. 계속 남는 변화

- 꽃: 세계수 우듬지에 분홍 꽃 무리와 빛 스프라이트, 천천히 떨어지는 꽃잎. 꽃 무리는 메시 하나로 합친다.
- 뿌리 길: 세계수에서 이웃 마을 입구까지 이어지는 금빛 뿌리(튜브 + 은은한 겉빛).
  - 밤에는 더 밝고 낮에는 은은하다.
  - 걸을 수 있고, 충돌체는 없다.
- 둘 다 `story.ch >= 9` 인 세이브에서만 보인다. 연출 중과 평소에 같은 메시를 쓴다.
- 아직 진행 중인 사람: 세계수 판에 예고 한 줄을 보여 준다.

## 6. 칭호 「세계수지기」 (A안: 내 화면 + 이웃 목록)

- 판정: `story.ch >= 9`.
- PC 이야기 칩: 9장 이후에는 「🌸 세계수지기 · 모든 이야기를 마쳤어요」로 바뀐다. 폰은 지금처럼 칩이 없다.
- 세계수 판: 탭 위에 칭호 띠를 두고, 같은 띠에 "🎬 엔딩 다시 보기" 버튼을 둔다.
- 오늘의 이웃 목록: 칭호가 있는 이웃의 이름 옆에 `.nb-badge` "🌸 세계수지기" 를 붙인다.
- 서버: `neighbors_today` 의 각 행에 `'title'` 값을 추가한다. `gs.state->'story'->>'ch'` 가 9 이상이면 `'keeper'`, 아니면 `null` 이다.
  - 운영 DB의 현재 함수 본문을 먼저 읽고, 거기서 이 값 하나만 더한다. 옛 마이그레이션은 다시 돌리지 않는다.
  - 숫자가 아닌 `ch` 값은 null 로 처리한다.
  - 옛 앱은 모르는 키를 무시한다. 그래서 SQL 을 먼저 적용해도 안전하다. 앱은 업데이트되는 곳부터 배지를 보인다.
- 하지 않는 것: 이웃 구경 화면 머리 위 칭호, 칭호 고르기.

## 7. 문구 (확정)

| 자리 | 한국어 | 영어 (초안) |
|---|---|---|
| 자막 | 이웃들이 오간 길마다 뿌리가 이어졌어요 | Roots grew along every path your neighbors walked |
| 끝 카드 제목 | 세계수가 다시 숨을 쉬어요 | The World Tree breathes again |
| 끝 카드 본문 1 | 칭호 「세계수지기」를 받았어요 | You earned the title "Tree Keeper" |
| 끝 카드 본문 2 | 빛나는 뿌리 길이 이웃 마을까지 이어져요 | A glowing root path now leads to the neighbor village |
| 칭호 | 세계수지기 | Tree Keeper |
| 칩 부제 | 모든 이야기를 마쳤어요 | You finished every chapter |
| 다시 보기 버튼 | 🎬 엔딩 다시 보기 | 🎬 Watch the ending again |
| 세계수 판 예고 | 모든 이야기를 마치면 세계수에 꽃이 피어요 | Finish every chapter and the World Tree will bloom |

영어 문구는 i18n 작업 때 다시 다듬는다. 모바일 폭 실측은 구현 단계에서 한다.

## 8. 구조

| 파일 | 역할 |
|---|---|
| `js/world/finale-rules.js` (새) | `finaleDue(state)`, `hasKeeperTitle(state)`, `showTeaser(state)`. 순수 함수 |
| `js/world/finale-rig.js` (새) | 13초 카메라 경로, 꽃 진행도, 뿌리 번짐 진행도, skip. 순수 계산이고 THREE 를 쓰지 않는다 (`tree-shot.js` 와 같은 결) |
| `js/world/finale-art.js` (새) | 꽃 무리, 꽃잎, 뿌리 곡선과 메시. `setReveal(k)` 와 `setBloom(k)` 로 진행도를 받는다 |
| `js/spaces/world-tree.js` | 조망샷 줄에 `finale` 종류 추가, 꽃과 뿌리 길 상시 표시 |
| `js/game.js` | 9장 완료 모달이 닫힐 때 엔딩 줄 세우기, 이야기 칩 칭호 |
| `js/world/tree-board-ui.js` | 칭호 띠, 다시 보기 버튼, 예고 |
| `js/neighbors/ui.js` | 🌸 배지 |
| `js/i18n-en.js` | 영어 |
| `sql/migrations/migrate_tree_finale_title.sql` | `neighbors_today` 에 title 추가 |
| `sql/tests/neighbors_selftest.sql` | title 검사 추가 |

## 9. 측정

- GA4 `tree_finale` 이벤트: `{ skipped: 0|1, sec, via: live|boot|replay }`. 파라미터는 3개다.
- 엔딩 뒤 이웃 목록 배지 노출과 9장 도달률 변화는 출시 뒤 BQ 로 본다. 판정 기준은 미리 정하지 않는다.

## 10. 테스트

- 단위 테스트(먼저 작성):
  - finale-rules: ch 8/9, 옛 세이브, hintsSeen 유무
  - finale-rig: 구간 경계, skip 뒤 끝 카드, 진행도 단조 증가
  - i18n: 새 문구 영어 대응
- SQL selftest: 9장 이웃은 `title = 'keeper'`, 8장 이웃은 null, ch 가 없거나 숫자로 읽을 수 없는 값(`"abc"`, 객체)이면 null.
- CDP 하네스 (PC와 폰 세로):
  - 연출 처음·중간·끝 캡처, 건너뛰기, 다시 보기
  - 상시 꽃과 뿌리 길(낮·밤), 세계수 판 띠와 예고, 이웃 목록 배지
  - 콘솔 오류 0
- 성능: 마을 드로우콜이 엔딩 전보다 몇 개 늘었는지 측정한다 (꽃·꽃잎·뿌리 메시 합쳐 4개 이하가 목표).

## 11. 배포

1. 운영 SQL(`neighbors_today` title)을 먼저 적용한다. 사용자 지시가 있을 때만 한다.
2. 앱은 웹, 토스, Play, iOS 순서대로 올려도 된다. 꽃, 뿌리 길, 연출은 클라이언트에서만 판정하고, 서버 값은 배지에만 쓴다.
