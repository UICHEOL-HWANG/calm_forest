# 마을 음악회 · 맥락

Last Updated: 2026-11-14 (설계와 구현 계획 작성 완료, 구현 시작 전)

## 상태

- 워크트리 `.claude/worktrees/concert`, 브랜치 `feat/concert`, main `92c2c833`에서 갈라짐.
- 스펙 `docs/superpowers/specs/2026-11-14-concert-design.md`, 계획 `docs/superpowers/plans/2026-11-14-concert.md`(이 폴더의 `concert-plan.md`는 사본).
- 게임 코드는 아직 한 줄도 없다. 푸시, 병합, 배포 안 함.

## 사용자가 정한 것

- 항상 열려 있다. 하루 이용자가 적어 기간을 정하면 의미가 없다.
- 박자 방식은 두 줄 리듬 레인.
- 장소는 마을 무대 + 공연 화면, 자리는 호수 옆 공원.
- 곡 3개, 곡마다 난이도 1개.
- 보상은 음표. 악기 4종 + 꾸미기 6종과 교환. 음표는 모두, 교환은 로그인.
- 악기는 기본 악기 + 음표로 해금. 기타는 시안 ② 큰 통기타.
- DDA를 넣는다.
- 악기 디자인은 처음 시안을 버리고 다시 했다. 사용자가 "기타가 너무 부자연스럽다"고 지적했다.

## 내가 정하고 알린 것

- 기본 악기를 손북에서 작은북 + 북채로 바꿈, 탬버린을 마라카스로 바꿈. 사용자에게 알렸고 반대가 없었다.
- 만드는 방식은 악보 데이터 + 코드로 내는 소리 + 소리 시계 판정.
- 설계 1~3(흐름과 규칙, 무대·연출·소리, 저장·구조·측정·배포)을 사용자가 승인했다.

## 내가 정했고 따로 확인받지 않은 숫자

판정 창 70/140ms, 별 기준 30/60/85%(어려운 곡 80%), 음표 1 + 별 수, 하루 3번, 값 합계 250, 곡 빠르기 92/112/132, DDA 표 `arms [0.85, 1.0, 1.2]`·목표 75%. 스펙에 적었고, DDA를 뺀 나머지는 사용자에게 표로 보여 줬다.

## 악기 설계의 핵심 제약

캐릭터의 배가 앞발이 닿는 거리보다 앞으로 나와 있다(팔 길이 약 0.53R, 어깨 z 0.2R, 배 앞면 z 약 1.0R). 배 앞의 물건을 앞발로 직접 만지는 자세는 성립하지 않는다. 그래서 채를 쥐거나(북), 멜빵으로 가슴 높이에 메거나(기타), 양옆에서 흔든다(종, 마라카스). 시안 `sims/concert-instrument-v2.html`.

## 게임 연결에서 알아낸 것

- `mgView`를 켜면 game.js가 `updateCamera`를 건너뛴다. 카메라는 `setCameraRig(fn)`으로 잡는다.
- `ui.anyModalOpen()`은 id가 `-modal`로 끝나는 열린 요소를 본다. 공연 화면 루트를 이 규칙에 맞추면 이동과 상호작용이 막힌다(선택자는 구현 때 다시 확인).
- HUD는 `body.mg-open`으로 숨는다.
- `updatePlayer`가 매 프레임 팔을 쉬는 자세로 되돌린다. `updateConcert`는 그 뒤에 불리므로 같은 프레임에 덮어쓰면 된다.
- `playerArms`는 `pivot`과 `hand`만 준다. 팔 방향은 `pivot.quaternion`으로 잡는다.
- DDA 진입점: `rollDifficulty(game)`, `settleDifficulty(game, outcome)`, `diffParams(r)`, `trackDiffAbandon(game, r, stage, extra)`(game.js 8567~8605).
- 장터 브리지의 `wb.owns`, `wb.grant`, `wb.guideEnv`를 그대로 쓴다.

## 확정 문구

Task 5 게이트에서 채운다.

## 고른 시안

Task 4, 6, 8, 9, 10 게이트에서 채운다.

## 배포 때

- 5곳 동시 배포. 구버전 앱이 저장하면 `concert` 칸과 새 꾸미기 id가 지워진다.
- 서버와 DB 변경 없음.
- 배포 다음 날 BigQuery에서 `concert_*` 5종과 `minigame_abandon{game:'concert'}` 적재 확인.
