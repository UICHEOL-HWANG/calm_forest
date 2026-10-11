# Apple 회신 — Guideline 2.1 Information Needed (제출 30be8612, 2026-10-11)

> 🍎 재제출 빌드: **1.0.0 (5)** — 녹화도 빌드 5(TestFlight)로 찍는다.

> App Store Connect › 앱 심사 › 메시지에 회신 + 같은 내용을 버전의 "앱 심사 정보 › 메모"에도 붙인다(Apple 요청).
> 영어로 보낸다(심사팀 공용어). 녹화 파일은 회신에 첨부.

## 📹 녹화 장면 순서 (아이폰, 최신 iOS, 설정 › 제어 센터 › 화면 기록)
1. 홈 화면에서 **고요한 숲 아이콘을 눌러 실행**(녹화는 실행부터 시작)
2. 게임 센터 자동 연결 → 바로 게임 진입(또는 로그인 화면이면 "Apple로 계속하기" → Face ID → 진입)
3. 마을 돌아다니기: 나무 베기 한 번, 밭 갈기·씨 뿌리기 한 번(10~20초)
4. 화면 위 **🏡 오늘의 이웃이 기다려요** 배너 탭(하루 1회 · 이미 봤으면 마을 남쪽 🎈 열기구 바구니 앞으로 걸어가 행동 버튼) → **오늘의 이웃** 목록
5. 한 줄의 **⋯ → 🚩 신고하기** → 사유 고르기 → **신고 보내기** → "신고했어요" 토스트
6. 다른 줄 **놀러 가기** → 이웃 마을 구경 → 상단 줄 **⋯ → 🚫 차단하기 → 차단** → 내 마을로 돌아옴·토스트
7. 다시 오늘의 이웃을 열어 **차단한 이웃이 없는 것** 보여 주기
8. ☰ → ⚙️ 설정 → **계정 삭제** → `삭제` 입력 → 완료 알림 → 로그인 화면
   ⚠️ 이 단계는 **테스트용 계정(게임센터 새 계정)**으로 찍는다. Apple·구글로 연결된 본 계정을 지우면 웹 마을까지 사라진다.

## ✉️ 회신 본문 (영문)

Hello App Review team,

Thank you for reviewing calm forest. Please find the screen recording attached (captured on an iPhone 12 Pro running the latest iOS). It starts from launching the app and shows sign-in, the core gameplay, the neighbor village feature with reporting and blocking, and in-app account deletion.

**1. Screen recording** — attached.

**2. Purpose and audience**
calm forest is a cozy, low-pressure 3D village life game. Players chop wood, farm, fish, cook, build and decorate their own house, and meet villagers at their own pace — there are no timers, stamina bars or failure states. It is for players of all ages who want a calm, relaxing game in short sessions. The value is a peaceful place to unwind with a sense of steady progress.

**3. How to access the main features**
No login credentials are needed. On launch the app signs in automatically with Game Center. If Game Center is not available, tap "Continue with Apple"; if you close the Apple sheet, the game starts right away as a guest with full access to all features.
- Move with the on-screen joystick and tap the action button to interact.
- Neighbor villages: tap the "Your neighbors are waiting" banner shown once a day, or walk to the hot-air balloon labeled "Neighbors" at the south of the village and tap the action button, to open "Today's neighbors".
- Report / block: tap ⋯ on any neighbor in the list, or ⋯ in the top bar while visiting a neighbor's village.
- Account deletion: ☰ → ⚙️ Settings → Delete account (type "delete" to confirm). Deletion happens inside the app immediately.

**4. External services**
- Apple Game Center and Sign in with Apple — authentication
- Supabase — account authentication and game save database
- Cloudflare Workers — web hosting and API (including Game Center signature verification)
- Google Analytics 4 and Google BigQuery — anonymous usage analytics (no advertising, no tracking)
- Oracle Cloud Object Storage — storing in-game photos the player chooses to take
- Google Gemini — generates some in-game flavor text (villager lines); no personal data is sent

**5. Regional differences**
The app works the same in all regions. It is available in Korean and English; content and features do not differ by region.

**6. Regulated industries / third-party material**
Not applicable. The app is not in a regulated industry and does not contain third-party protected material — all art and sound are created by us (sound is synthesized in code).

**User-generated content (Guideline 1.2)**
The only content visible to other players is a player's nickname and the exterior of their village (house and yard decorations); there is no free-text chat. Players can report a neighbor (inappropriate name / decorations / other) and block a neighbor from the ⋯ menu. Blocking removes them from each other's neighbor lists and visit logs immediately. Nicknames are filtered with a blocklist, reports are reviewed by the developer who can hide a village or a name, and players can make their own village private in Settings. Contact: cheorish.hw@gmail.com.

Thank you,
Uicheol Hwang
