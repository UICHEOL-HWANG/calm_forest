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
