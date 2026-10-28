# 🌙 꿈의 숲 — 출시 런북 (A안: 4곳 동시)

Last Updated: 2026-10-08 02:40 KST

## 준비 완료 (2026-10-08)
| 대상 | 상태 | 위치 |
|---|---|---|
| main | `a068a7f` 병합(+런북 커밋) · **미푸시** — 출시 순간에 푸시 | 테스트 2146 · QA 27/27 |
| 앱인토스 | 번들 `20261008-121` (deploymentId `01a11768-a13e-7d83-b6eb-8deb3a06f2bb`) · 메모·출시 노트 등록 · 테스트푸시 완료 | |
| Play | AAB v49 (1.3.42) — `../calm_forest-capacitor/android/app/build/outputs/bundle/release/app-release.aab` · feat/capacitor-app `efeb9ba` **미푸시** | 업로드 전 |
| itch | `dist-itch.zip` 1.27MB | 업로드 전 |
| 웹 | 배포 전 | |

⚠️ 토스는 승인되면 **수 초~수십 분 안에 자동 라이브**(15·17·18차 전례) → "검수 제출 = 출시 시작".
⚠️ 옛 클라이언트가 `dream` 세이브 필드·꿈 장식 id 를 지운다 → 4곳 간 간격을 최소로.

## 출시 순서
1. 비밀값 스캔(main·feat/capacitor-app) → **토스 `bundle_submit_review`**
2. 승인·라이브 확인(`review_list` / `bundle_get_live_version`) — 자동 라이브 안 되면 콘솔 웹 '출시하기'
3. **웹** `npx wrangler deploy`(루트 `js/config.js` 깨끗한지 먼저)
4. **Play** `npm run upload:play -- --track internal --notes "…"` → `--track alpha --version-code 49 --notes "…"` (둘 다)
5. **itch** 사용자가 `cheorish.itch.io/calmforest` 에 `dist-itch.zip` 업로드
6. **푸시** main + feat/capacitor-app 둘 다
7. **공지** `notices_admin.html` (토스 라이브 확인 뒤)
8. 다음 날 BigQuery 퍼널 재검증(dream_* 8종)

## 문구 초안
- 토스 출시 노트(등록됨): 🌙 꿈의 숲이 열렸어요 / 밤에 침대에서 '꿈꾸기'를 고르면 초승달 마차를 타고 떠 있는 섬으로 가요 / ✨ 하루 7개 꿈 조각을 모아 달 램프·구름 침대 같은 꿈 장식으로 바꿔요
- Play 출시 노트: 🌙 꿈의 숲이 열렸어요! 밤에 침대에서 '꿈꾸기'를 고르면 초승달 마차를 타고 떠 있는 섬에 가요. ✨ 하루 7개 꿈 조각을 모아 달 램프·별 모빌·구름 침대 같은 꿈 장식으로 바꿔 보세요.
- 공지 제목: 🌙 꿈의 숲이 열렸어요
- 공지 본문:
  밤이 되면 침대에서 💤 푹 자기 대신 🌙 꿈꾸기를 골라 보세요.
  초승달 마차가 떠 있는 섬, 꿈의 숲으로 데려다줘요.
  | 할 일 | 내용 |
  | ✨ 꿈 조각 | 하루 7개, 날마다 자리가 바뀌어요 |
  | 🪨 징검다리 | 떠 있는 돌을 밟고 다른 섬으로 |
  | 🛏️ 구름 침대 | 누우면 아침에 깨어나요 |
  | 🛋️ 꿈 장식 | 꾸미기에서 조각으로 달 램프·수정 화분·별 모빌·구름 침대 |
  구름 침대를 집에 놓으면 그 침대로도 꿈을 꿀 수 있어요.
