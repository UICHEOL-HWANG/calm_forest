# 카드뉴스 파이프라인

인스타 캐러셀 7장(1080×1350)을 만들어 발행한다.

```
decks/deck-01.json      카피 + 이미지 슬롯 + 생성 프롬프트  ← 단일 소스
   │
   ├─ node generate.mjs decks/deck-01.json   gen/*.png  (gti — 회사·일상 일러스트)
   ├─ node shoot.mjs <포트> <샷이름>          shots/*.png (게임 렌더, HUD 없음)
   │
   └─ node deck.mjs decks/deck-01.json  →  out/deck-01/01..07.png
```

## 왜 이렇게 하나

- **게임 컷은 AI 생성이 아니라 실제 렌더다.** `shoot.mjs` 가 게임을 1080×1350 세로로
  띄우고 HUD 를 숨긴 뒤 찍는다. 생성 이미지 특유의 뭉개짐이 없다.
- **표지에 게임을 쓰지 않는다.** 인스타에서 "게임 광고"로 분류되면 스크롤에서 걸러진다.
  1~4장은 회사·일상(생성), 5~7장에서 게임이 해답으로 등장한다.
- **생성 이미지에 얼굴을 넣지 않는다.** AI 티가 가장 잘 나는 게 사람 얼굴이다.
  프롬프트는 전부 `no people, no faces` + 평면 벡터 + 사물 중심이다.

## 게임 촬영

게임 코드에 촬영 전용 훅은 없다. `js/game.js:124~` 의 기존 개발 파라미터를 쓴다.

| 파라미터 | 용도 |
|---|---|
| `?lang=ko` | 헤드리스 크롬 로케일이 en 이라 반드시 필요 |
| `?time=0~1` | 0.30 아침 · 0.46 정오 · 0.72 노을 · 0.90 밤 |
| `?weather=clear\|rain\|snow\|fog` | |
| `?spawn=x,z` | 시작 위치 |
| `?river=1` `?mist=1` `?sea=1` | 공간 진입 |

인트로(도시 컷)는 콘솔 훅 `__introTest()` → `__introJump(초)`. 타임라인은
`js/game.js:6607 INTRO_CAPTIONS` 참고.

## 카드 한 장 스키마

| 필드 | 값 |
|---|---|
| `kind` | cover · body · turn · game · cta |
| `theme` | `dark`(어두운 씬) · `light`(밝은 씬) |
| `img` | `gen/*` 또는 `shots/*` |
| `focus` | object-position. 구도가 잘리면 조정 |
| `eyebrow` `headline` `body` | 줄바꿈은 `\n` 으로 직접 지정 |
| `imgPrompt` | gen/ 이미지가 없을 때 gti 에 넘길 프롬프트 |

**theme 을 씬 밝기에 맞춰야 한다.** 밝은 잔디에 어두운 스크림을 씌우면 흙탕물처럼 탁해진다.

## 선행 조건

- `node shoot.mjs` — 로컬 서버가 떠 있어야 한다 (`python3 scripts/serve.py`)
- `node generate.mjs` — `codex login` 으로 `~/.codex/auth.json` 이 있어야 한다
