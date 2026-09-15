# 카드뉴스 이미지 프롬프트 규칙

`deck-NN.json` 의 `imgPrompt` 는 이 골격을 따른다. deck-01·02 에서 실제로
쓰인 형식을 고정한 것이다 — 매번 기존 파일을 흉내내면 톤이 조금씩 어긋난다.

## 골격

```
Flat vector illustration. No people, no faces, no readable text.
<장면>.
<색 지정>.
Muted desaturated palette only. Flat shapes with hard edges,
no gradients, no texture, no lens flare, no bokeh, no glow effects.
Vertical composition. Leave the lower third dark and empty — text will be placed there.
```

앞뒤 문장은 **그대로 쓴다.** 바꾸는 건 `<장면>` 과 `<색 지정>` 둘뿐이다.

## 장면 쓰는 법

**사람을 그리지 않는다.** 사람의 흔적만 남긴다 — AI 티가 가장 잘 나는 게
사람 얼굴이고, 얼굴 하나가 카드 전체를 싸구려로 만든다.

| 쓰지 말 것 | 대신 |
|---|---|
| 지친 직장인이 책상에 앉아 | 빈 책상, 식은 커피, 덮인 노트북 |
| 사람들이 회의하는 | 빈 회의실 탁자, 닫힌 노트북 두 대, 뚜껑 없는 마커 |
| 퇴근하는 사람 | 텅 빈 지하철 좌석 한 줄, 기대어 놓인 우산 |

구체적인 사물을 **3~5개** 센다. "어질러진 방" 이 아니라 "얼굴을 위로 둔 채
화면이 켜진 폰, 그 옆의 물컵, 한쪽만 젖혀진 이불" 이다. 세지 않으면
생성기가 화면을 물건으로 가득 채운다.

## 색 지정

게임 팔레트에서 뽑는다(`templates/_base.css` 의 토큰과 같은 계열).

| 용도 | 값 |
|---|---|
| 어두운 실내 | `#1a1f1b` `#202621` `#1c211d` `#232a25` |
| 따뜻한 빛(화면·전등) | `#e8ded0` |
| 차가운 빛(새벽·형광등) | `#33404a` `#cfd8d0` |
| 액센트 — **한 장에 하나만** | `#d4703c` (노을 오렌지) |

액센트를 둘 이상 넣으면 시선이 흩어진다. 작은 점 하나로 충분하다
(알림 점, 컵 테두리, 잎사귀 한 장).

## 하단 1/3 비우기

카드 아래쪽에 헤드라인이 얹힌다. 거기에 물건이 있으면 글자가 묻힌다.
`Leave the lower third dark and empty` 를 빼먹지 않는다.

## theme 는 씬 밝기에 맞춘다

`theme: "dark"` 는 어두운 씬, `"light"` 는 밝은 씬이다. 밝은 잔디에
어두운 스크림을 씌우면 흙탕물처럼 탁해진다. 판단이 서지 않으면
`node theme.mjs <묶음이름>` 이 실측으로 검사해 준다(임계 85).

## 게임 컷은 생성하지 않는다

5~7장의 게임 화면은 `shoot.mjs` 로 **실제 렌더**를 찍는다. 생성 이미지
특유의 뭉개짐이 없고, 무엇보다 광고가 거짓이 되지 않는다.

표지(1장)에도 게임을 쓰지 않는다 — 인스타에서 "게임 광고" 로 분류되면
스크롤에서 걸러진다. 1~4장은 회사·일상, 5~7장에서 게임이 해답으로 나온다.

## 예시 (deck-02 실제 사용분)

```
Flat vector illustration. No people, no faces, no readable text. A dark bedroom
just before dawn: a nightstand holding a phone lying face-up with its screen
still lit, a glass of water beside it, the corner of a bed with the duvet thrown
back on one side, and a window where thin cold dawn light leaks between
nearly-closed curtains. Charcoal #1a1f1b and #202621 for the room, warm cream
#e8ded0 for the lit phone screen, cool slate #33404a for the dawn light, a single
terracotta #d4703c accent as one small notification dot on the screen. Muted
desaturated palette only. Flat shapes with hard edges, no gradients, no texture,
no lens flare, no bokeh, no glow effects. Vertical composition. Leave the lower
third dark and empty — text will be placed there.
```
