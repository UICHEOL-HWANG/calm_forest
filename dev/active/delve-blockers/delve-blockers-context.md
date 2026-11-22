# delve-blockers context

Last Updated: 2026-11-20 lift built

Branch: fix/port-boat-choice (current checkout, uncommitted work from earlier sessions present; touch only delve files)

Files
- js/data/delve.js: MINER_STEPS desc copy
- js/spaces/delve.js: enterFloor, buildRoom, delvePrompt, handleDelveDoor (lift, bait)
- js/delve/pest-art.js: makeLift, makeRock
- js/i18n-en.js: English keys for changed desc
- tests/delve-wiring.test.mjs: regex wiring tests (lift test asserts old modal at line ~93)

Decisions
- Copy approved by user: recommended options A (see plan).
- Lift chooser is a new UI, so it goes through design comparison with the lift model and motion.

- 2·3·4 done, browser-checked. Lift sims: sims/mine-lift-compare.html (A wood pulley, B iron cage, C bucket; chooser 가 list, 나 panel, 다 chips). Waiting on user pick.
- Pre-existing failing tests on this branch (not ours): museum-view-case, port-wiring.

## 2026-11-20 lift
- Picked C bucket + 나 panel. Ride uses $w.sleeping lock + ui.sleepFade like mirror ride. tickLift runs at top of updateDelve.
- Gotcha: index.html has global `.lbl{display:none}`; panel label class is lp-lbl.
- Preview pane runs ~2fps when hidden, ride looks slow there; logic verified by sampling player.y.
- Old 2-button lift wiring test removed from delve-wiring.test.mjs (behaviour replaced), covered in delve-blockers.test.mjs.

## 2026-11-20 moved to main
- Branch fix/delve-lift (worktree .claude/worktrees/delve-lift), cherry-picked as 657ae468; old 6dd51820 stays on fix/port-boat-choice.
- Preview: root launch.json entry "delve-lift" port 8793 (root config serves root checkout otherwise).
- Delve floors had no colliders: rocks (ROCK_R 0.35, rock gap 1.4 needs it small) and chest now solid via roomSolids, cleared in clearRoom after clearRootShrine (mine-root test needs that first). Pests pushed off player by pushOffPlayer (skip gone/hide, skip carry within 1 of home, clamp to room).
- QA findings left open: chest10 gives sapling but miner says helmet; reward grants silent; floor 20 ladder toast says way down; grab needs 2 floors; 5..11 UI list.

## 2026-11-20 mine tool kit (A1)
- ZONE_KIT {mine:[hoe]} in tools.js; Input.toolKit/pickKitSlot; bar shows hoe(1)+bare(2) via #tool-bare, #tool-page hidden, #hint swapped; fan items/swipe limited, kitLayout above button; mining in mine always switches to hoe.
- Bare picked in mine keeps pageBeforeAuto so leaving restores the set.
- Gotcha: background preview tab pauses the loop, so zone changes made while hidden never redraw the bar (test artifact).
- Hint copy "이동 WASD/방향키 · 1 괭이 · 2 맨손 · 상호작용 Space/클릭" pending user OK.
