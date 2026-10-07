# 쇼츠 시안 — 곰 · 밤손님 편

Last Updated: 2026-10-07

> ⚠️ 이 파일은 `tools/cardnews/decks/` 가 아니라 `dev/` 에 둔다.
> `reel-make.mjs --next` 가 발행 안 된 deck 을 자동으로 집어 Flow 크레딧(편당 10)을 태운다.
> 시안이 확정된 뒤에만 `decks/reel-04.json` 으로 옮긴다.

## 공통 틀

- 길이 12초 안팎 · 9:16 · **Flow 1컷(3초) + 게임 녹화 N컷**
- Flow 컷은 **감정 한 박자만** 담당한다. 기능을 주장하지 않는다
  (STYLE.md "게임 컷은 생성하지 않는다" — 광고가 거짓이 되지 않게). 기능 증거는 전부 녹화.
- 캐릭터 레퍼런스: `shots/_ref_bear.png` ← **아직 없음**. 캐릭터 선택창의 곰 3D 프리뷰를
  `_ref_fox.png` 와 같은 구도(밝은 배경, 3/4 측면, 전신)로 캡처해서 만든다.
- 마지막 프레임 = 첫 프레임 (루프)

## 시안 A — 「범인을 찾아라」 (미스터리 · 추천)

| 컷 | 방식 | 내용 | 자막 |
|---|---|---|---|
| 1 · 0~3초 | **Flow** (곰) | 새벽, 텅 빈 밭 앞에 선 곰이 굳어 있다. 발자국만 남음 | 자고 일어났더니 밭이 털렸다 |
| 2 · 3~6초 | 녹화 | 🐾 흔적 조사 | 범인은 누구? |
| 3 · 6~9초 | 녹화 | 도둑이 나타나 마주 선다 (일대일 구도) | 🐗 or 🦝 |
| 4 · 9~12초 | 녹화 | 승부 → 작물 회수 | 이기면 되찾아요 · 설치 없이 무료 |

- **댓글 유도**: "오늘 밤 범인, 멧돼지 vs 너구리 — 어느 쪽에 걸래요?"
- 강점: 서사가 있고 첫 3초에 "무슨 일이지?"가 생긴다. 시리즈화 가능(다음 편 = 너구리 편).

## 시안 B — 「일기토」 (타격감)

| 컷 | 방식 | 내용 | 자막 |
|---|---|---|---|
| 1 · 0~3초 | **Flow** (곰) | 곰과 멧돼지가 털린 밭을 사이에 두고 눈싸움 | 한 판 붙자 |
| 2 · 3~9초 | 녹화 | 가위바위보 2선승, 대결 연출(줌·흔들림) | 2선승제 |
| 3 · 9~12초 | 녹화 | 승리, 멧돼지가 물러남 | 진 쪽이 도망가요 |

- 강점: 연출 C안(줌·흔들림)이 이미 있어 녹화 퀄리티가 높다.
- 약점: 서사가 없고 게임 소개에 가깝다. 훅이 시안 A보다 약하다.

## 시안 C — 「이거 맞힐 수 있어?」 (챌린지)

| 컷 | 방식 | 내용 | 자막 |
|---|---|---|---|
| 1 · 0~3초 | **Flow** (곰) | 너구리가 그릇 세 개를 내려놓고 능청스럽게 곰을 본다 | 너구리가 내기를 걸어왔다 |
| 2 · 3~10초 | 녹화 | 3D 그릇 맞추기, 카메라가 훅 들어갔다 빠짐 | 어느 그릇일까? |
| 3 · 10~12초 | 녹화 | 정답 공개 | 3판 전승해야 이겨요 |

- 강점: 시청자가 직접 참여하고(정답 맞히기) 댓글이 자연스럽다.
- 약점: 그릇 위치를 놓치면 허무하고, 3D 조형이 작아 보일 수 있다.

## 추천 — A (+ C 를 2편으로)

A 로 "범인 궁금증"을 열고, 반응이 오면 C 를 후속편으로 낸다.

## 캡션 시안 (A)

```
자고 일어났더니 밭이 털렸다 🌙
범인은 멧돼지일까, 너구리일까?

설치 없이 브라우저에서 바로 하는 힐링 마을 키우기, calm forest.
밤사이 털린 흔적을 조사하고, 도둑과 승부해서 작물을 되찾아요.

👇 오늘 밤 범인은 누구일 것 같아요?
🐗 멧돼지 / 🦝 너구리
하나만 댓글로 남겨주세요. 전부 읽고 답글 달게요!

🔗 게임 링크는 프로필에 있어요!
무료 · 웹 / 토스 / Google Play

#캄포레스트 #힐링게임 #농장게임 #웹게임 #무료게임 #게임추천 #인디게임
```

(Threads 는 `#인디게임` 한 개만 — 기존 규칙)

## Flow 프롬프트 초안 (A 컷 1)

```
A chubby plush bear character (same as reference) standing frozen in a moonlit
farm field at dawn, staring down at an empty dug-up soil plot with muddy paw
prints around it. Low-poly soft 3D toy look matching the reference.
Camera slowly pushes in from behind. Calm, slightly comic tension. No text.
Single bear only, no other animals.
```

- `Single bear only` 를 넣은 이유: 과거 여우 대신 다람쥐가 나온 사고 방지.

## 결과 (2026-10-07) — ✅ 발행 완료

- 인스타 릴스 https://www.instagram.com/reel/DeLZ01PlI2q/
- Threads https://www.threads.com/@calm.forest.official/post/DeLZ42sDIRp (`#인디게임` 1개)
- 최종 영상: 30.9초, 멧돼지(가위바위보) + 너구리(그릇 섞기 3판 전승), 전용 BGM, 곰 주인공
- 시안은 A안(범인을 찾아라)에서 출발해 B안(너구리 포함)으로 확장했다

### 만든 도구
- `record.mjs --scenario night-duel [--animal raccoon] [--char 곰] [--require-win]`
  - 너구리는 `ctx.route` 로 `js/duel/index.js` 를 가로채 정답(`window.__duelPeek`)을 읽는다. **게임 코드는 안 고쳤다.**
- `flow.mjs` — Flow '변경 로그' 팝업 자동 닫기
- `music.mjs --style night --secs 31` — 컷 박자(54박)에 맞춘 전용 BGM. 컷 길이를 바꾸면 곡 구간도 같이 바꾼다.
- `tools/reel-motion` — Remotion `NightReel`(`nightTimeline.ts` 가 컷·문구·소스)

### 재렌더 소스 (gitignore, 로컬에만 있다)
`tools/reel-motion/public/` — `clips/night_hook.mp4`(Flow, 곰 레퍼런스) · `clips/night_duel.mp4` · `clips/night_raccoon.mp4` · `night.wav`
훅은 Flow 크레딧 10 을 쓴 것이라 지우지 말 것. 나머지는 위 도구로 다시 만들 수 있다.

### 교훈
1. Flow 프롬프트에 cinematic·film grain 을 쓰면 게임 캐릭터가 아닌 사실적 캐릭터가 나온다 → 털·클로·사실 질감 금지와 게임 환경(로우폴리 침엽수·큐브 작물)을 명시.
2. 대기 중 Aside 탭이 사라져도 생성은 끝난다 — 재실행 말고 세션 기록의 가장 최근 항목에서 받는다(옛 세션을 열면 옛 영상이 받아진다).
3. 캔버스만 녹화되므로 DOM 오버레이는 영상에 안 담긴다.
4. 이긴 판만 쓰려면 `--require-win`. 너구리는 정답 훅이 필요해 무작위로는 1/27.
