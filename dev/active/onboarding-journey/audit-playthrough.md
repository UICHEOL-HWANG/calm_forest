Report file NOT written: the Write tool refused with "Subagents should return findings as text, not write report files". The full report is below. About 175 screenshots plus bot scripts are in /Users/uicheol_hwang/calm_forest/.claude/worktrees/merge-main/sims/merge-qa/journey/ (prefixes r1, r2, r3). I deleted the temporary `_run.js` from that folder. All Playwright contexts are closed.

Method: own contexts, muted audio, a 200 ms DOM journal of guidance UI, touch viewport 360x740 (Run 3 at 740x360).
- The mock is complete. Supabase is mocked at the network layer, so production was never touched. The anonymous signup and game_saves GET/POST come from memory. A "returning boot" therefore goes through the real loadGame/applySave.
- No ?dbg, no credentials.
- The bot is not a human. It closed modals, tapped "다음", used `__tp` and `__space.farm[0]()` to reach the farm carrots, and walked south when it had no arrow. Run 2 and Run 3 saves were cloned from Run 1 state and edited.

## Run 1: brand-new guest (E1 arm harvest_start, rollout=true)
- 1.9 s: login card, guest.
- 5.9 s: character modal, with the story chip and nick hint behind it.
- 10-36 s: 26 s intro cutscene.
- 35.9 s: e1intro-modal "여기는 당신의 텃밭" and hint-banner "별빛 티타임 세트 텃밭에서 일정 확률로 나와요" at the same instant (r1-modal-027-e1intro-modal.png).
- 39.7 s: e1 modal page 2 with the "탭해서 도구 바꾸기" chip also showing (r1-03-t4.png).
- 47.5 s: toast "텃밭 한 그릇을 찾았어요 1/2".
- After the first harvest the tool is the water can. The toast says "낫으로 수확하세요", so the player must swap tools by hand.
- 94.5 s: nudge-modal "도감 5종 수집 중! 로그인하고 선물 받기" (r1-modal-086-nudge-modal.png). This is the first login ask, about 1.5 minutes in, mid-harvest.
- 185 s: banner "이어서 하나만 더 해볼까요" while still on the farm. There was no arrow or coach for 300+ s on the farm, only the "아직 흙이 촉촉해요" toast.
- The bot left the farm after about 5 min. In the village over about 25 s:
  - 299.5 s: banner "주말 장터" and toast "설산이 열렸어요" in the same frame.
  - 306.9 s: wandering-merchant npc-modal.
  - 307.9 s: banner swapped to "저녁 경매가 열렸어요".
  - 310 s: 주민 수첩 (affinity book) opened.
  - 317.9 s: merchant-modal.
  - 321.7 s: banner "상점 좌판".
  - The story chip flips on and off with each banner.
- After all 4 carrots were harvested (about +804 s):
  - A second login nudge, "FIRST HARVEST".
  - A 9-card HUD spotlight tour. Each card needs the action or a roughly 20 s wait for "다음" (r1f-spot-*.png).
  - story-modal "나의 이야기".
  - Coach "나무 베기 2/11" with an arrow to "나가는 문".
- Coach then jumped to 4/11 "집 바닥 깔기 / 목재 15개" at 3 wood. With wood below 15 the arrow vanished and the player stood 90 s with `arrow=-` (r1h-083s.png).
- Never seen: concert, pond, auction onboarding (clock-dependent), a real affinity intro (only the passive 주민 수첩).

## Run 2: established player (legacy save with no `unlocks`, houseStage 3, story ch3, tutStep done, no hintsSeen for weekly/concert/affinity/yard/promo)
Session 1, time from the guest click:
- 0.4-1.7 s: banner "주말 장터".
- 3.8 s: daily-modal (streak), plus toast "배지 획득 내 집 마련" and guide pill "1/12 포구 섬 가는 배가 생겼어요". All of it lands within 0.3 s, with the weekly banner still visible behind the modal (r2a-modal-005-daily-modal.png).
- 8.6 s: story chip "4장".
- 17.2 s: banner "오늘의 이웃이 기다려요".

First visits (teleported, 14 s idle each: weekly board, concert stage, farmer NPC, pond; r2b-*): no popup, arrow or intro appeared at any of the four. The action button only changes to a door icon. At the board (r2b-weekly-board-b.png) the screen carries five guidance layers:
- story chip "4장"
- pill "1/12 포구 섬"
- yellow edge arrow "19m"
- "탭해서 도구 바꾸기"
- the door action prompt

Session 2: the reload resumes the guest straight into the game, apparently the E2 skip-login arm.
- Pill "1/12 포구 섬" shows again at 8.5 s, and will every session until the boat step is done.
- Banner "저녁 경매가 열렸어요" at 34.8 s (clock-dependent).
- The weekly banner, daily modal and neighbor banner did not repeat.

## Run 3: mid-progress (non-legacy unlocks, bridge flag, house 3, ch1, no affinity), 740x360, local time 00:38
- 0.4 s: banner "주말 장터".
- 0.6 s: goal arrow "세계수 35m".
- 0.8 s: toast "설산이 열렸어요".
- 2.6 s: tree cine (treeshot-modal "탭하면 넘어가요").
- 3.8 s: toast "저 나무가 세계수예요".
- 11.4 s: banner "의뢰 올빼미…연못" and pill "1/5 호수 부두로 가 보세요", and the goal arrow is hidden.
- 19.6 s: the owl banner is replaced by "오늘의 이웃".
- r3a-011s.png shows all of this on screen together:
  - green arrow "세계수 35m"
  - speech chip "화살표를 따라가요!"
  - yellow edge arrow "18m" (#guide-edge, the pond pill)
  - "탭해서 도구 바꾸기"
  - four NPC "!" bubbles
  - stall tag "오늘 비싸요 +30%"
- The auction banner did not fire (clock), and affinity was not introduced in 150 s.

## Problems

**High**
1. **Feature announcements stack on first village arrival.**
   - What the player sees: weekly-market banner, mountain-open toast, auction banner and merchant/NPC modals within 25 s, before any house or quest. Each banner hides the story chip.
   - When: Run 1 at 299-325 s; Runs 2 and 3 at 0.4-4 s.
   - Screenshots: r2a-modal-005-daily-modal.png, r3a-011s.png.
   - Suspected cause: js/spaces/mountain.js:389, js/auction/onboard.js:5, js/spaces/neighbor.js:356, the js/weekly banner and the merchant arrival in js/game.js. There is no shared queue or cooldown.
2. **The E1 welcome tutorial waits for all 4 carrots.**
   - What the player sees: leave the farm early and no tutorial or coach ever starts. The story chip says "할아버지 만나기" with no arrow. Re-entering the farm re-pops the "별빛 티타임 세트" banner.
   - When: Run 1, about 5 min of farm with only toasts.
   - Screenshots: r1-060s area (r1-063s.png, r1-078s.png).
   - Suspected cause: js/spaces/e1-start.js:185-201 (`e1OnHarvest` returns while any carrot is ripe).
3. **Competing guides point at different targets.**
   - What the player sees: 2-3 arrows or pills at once. The pond guide silently hides the goal arrow and the story chip.
   - When: Run 3 at 11 s; Run 2 at the weekly board.
   - Screenshots: r3a-011s.png, r2b-weekly-board-b.png.
   - Suspected cause: js/pond/yard-guide.js:9 (`body.yard-guiding` hides #story-chip) versus js/guide/goal-guide.js; js/auction/onboard.js:7 ("화살표를 따라가요!"); the "1/12 포구 섬" pill, which repeats every session. I did not trace the source of that pill.
   - Caveat: the "화살표를 따라가요!" chip is attributed to the auction onboarding by its string, not traced at runtime.

**Medium**
4. **Two login asks inside the first 14 min.**
   - What the player sees: nudge-modal at about 95 s ("도감 5종"), then again after the 4th carrot.
   - Screenshot: r1-modal-086-nudge-modal.png.
   - Suspected cause: js/game.js:1205 (`loginNudge('dex'+total)`) and js/spaces/e1-start.js:191. I did not check whether the guest fires one nudge per session.
5. **Coach step "집 바닥 깔기" has no arrow.**
   - What the player sees: the arrow vanishes while wood is below 15; 90 s idle.
   - Screenshot: r1h-083s.png.
   - Suspected cause: js/guide/guide-rules.js:20 (TUT_KEYS lacks house1).
6. **HUD spotlight tour is long.**
   - What the player sees: 9 cards, each needs the action or a roughly 20 s wait. It hides the coach and arrow while shown.
   - Screenshots: r1f-spot-*.png.
   - Suspected cause: the spot.run steps started in index.html startOnboarding (about line 6112).
7. **No first-visit intro for weekly board, concert, pond or affinity.**
   - What the player sees: only an action-button swap. Affinity appears incidentally through the NPC modal "선물로 시작".
   - When: Run 2.
8. **Tool does not auto-switch to the sickle after the first harvest.**
   - What the player sees: the water can stays selected and the toast says use the sickle.
   - When: Run 1 at about 57 s.
   - Screenshot: r1-04-061s.png.
   - Suspected cause: tool swap is manual in the E1 start; I did not trace it.

**Low**
9. Character select shows the story chip and nick hint behind the modal (r1-01-after-guest.png).
10. The owl pond banner lives about 8 s before the neighbor banner replaces it.
11. The 26 s intro cutscene comes before the first input; skip is available.
12. Retention banner "이어서 하나만 더 해볼까요" shows on a farm with nothing nearby to do (js/retention-guidance.js:248).

## Not checked
- Auction onboarding and stage flow: the clock was outside the window in Run 3.
- Concert first-open modal.
- Affinity stage-ups and letters on a fresh save.
- Promo-gift and the yard/pond bridge flow after the guide.
- Run 1 and Run 2 at 740x360 (only Run 3 ran landscape).
- The control E1 arm.
- Tutorial steps 5-11 after "집 바닥 깔기".
- Real Supabase and E2 behavior, since both were mocked.
- Concert, auction and affinity were not walked on a fresh Run 1 save.
- One Run 1 attempt aborted because the bot's modal-dismiss clicked a Google sign-in nudge. The mock blocked it, no credentials were used, and I restarted with a blocklist.

Risk: some findings depend on bot behavior and cloned or edited saves. #2's farm stall partly depends on the bot's Space presses re-planting plots. #3's auction chip is attributed by string only.