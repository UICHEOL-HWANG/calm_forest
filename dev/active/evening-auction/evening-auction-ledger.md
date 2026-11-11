# SDD ledger — plan: docs/superpowers/plans/2026-11-10-evening-auction.md
Spec: docs/superpowers/specs/2026-11-10-evening-auction-design.md
Branch: feat/evening-auction, base 01a1188e (docs commit on 23ca3833). Baseline node --test: 4585 pass / 0 fail.

## Preflight scan
| Pair / task | Produces vs consumes | Found |
|---|---|---|
| T1→T2 | data consts (COUNT_START/RESET, RUN_CAP, TICK, BIDDERS) → createRun/step | consistent (verified in scratch run before plan freeze) |
| T1→T3 | auctionDefault/lastDate → markJoined/addWin | consistent |
| T2→T7 | engine events {bid,sold}, outcome → scene.update | consistent |
| T3→T7 | settleWin/markJoined → scene.begin/end | consistent; begin saves lastDate before run (spec 2-1) |
| T4→T5 | auctionItemMesh → stage.setItem | consistent |
| T4 catalog test | needs catalog lines in T4 itself | expected fail only before T4 step adds lines |
| T6→T7 | paddlePose/hopHeight/faceStage → scene | consistent |
| T8→T7 | whoLine/feedLine/resultLine/barColor → scene | consistent |
| T9 | wires index.js, doors.js, kitchen-stage.js, game.js ≤12 lines | consistent with Global Constraints |
| T0 gate | copy strings in T7/T8/T9/T10 are drafts | Ruling: run T1–T3 (no UI copy) while T0 awaits the user — copy-free tasks cannot be affected — if wrong, nothing to redo |
| Each task self-consistency | tests vs code checked by extracting plan code blocks to scratch (40/41 pass, 1 = T4 catalog expected) | clean |

## Progress
Task 1: dispatched (haiku, base 01a1188e)
Task 0: complete (user approved copy: 후보2 + 4 edits; table in dev/active/evening-auction/evening-auction-context.md). Ruling: '구경만하기' spaced to '구경만 하기', item names keep 후보1 since 후보2 had none, English column adapted to 후보2 meaning — cost if wrong: string swap in T7/T8/T10
Task 1: fix round 1/5 dispatched — controller-found regression: 'id: builder' literal in js/data/auction.js hijacks gameSource anchors (quests.test:402, i18n-prompt.test:101). Ruling: build AUCTION_BIDDERS from tuples, keep {id,style,inc} shape — tests helper forbids changing assertions — cost if wrong: one-file revert
Task 1: fix round 1/5 (1 addressed by implementer, commits 9a73ca34..285b5ca6; full suite 4593/0). Task review dispatched (sonnet) on 01a1188e..285b5ca6
Task 1: minor (deferred): hashStr unsigned test near-vacuous (plan-mandated); no OPEN_TO/OPEN_FROM boundary case for secondsUntilOpen; joinMode undefined/NaN coins → watch untested
Task 1: complete (commits 01a1188e..285b5ca6, review clean)
Task 2: dispatched (haiku, base 285b5ca6)
Task 2: implementer DONE (40c33f13, 4601/0). Ruling: keep its 'Co-Authored-By: Claude Haiku 5.5' trailer — the commit was in fact written by the Haiku subagent, honest attribution — cost if wrong: cosmetic trailer only
Task 2: minor (deferred): bid() itself does not enforce wallet/leader — scene/UI (T7/T8) must gate every player bid via canBid (carry to T7 dispatch); NPC may bid on tick t crosses 0 (one-tick grace, plan-mandated); thin state-machine edge tests (NPC reset, sold once, step/bid after over, extended clears); JSON no-mutation check
Task 2: complete (commits 285b5ca6..40c33f13, review clean)
Task 3: dispatched (haiku, base 40c33f13)
Task 3: implementer DONE (03d8ac7d, 4604/0)
Task 3: ⚠️ resolved by controller: auctionDefault/restoreAuction always set numeric wins (rules.js) so addWin safe
Task 3: minor (deferred): no coins===price boundary test; settleWin doesn't validate price (caller supplies engine price)
Task 3: complete (commits 40c33f13..03d8ac7d, review clean)
Task 4: dispatched (sonnet, base 03d8ac7d). Ruling: catalog desc uses approved copy '경매에서 산 {name}' over brief draft — Task 0 approval binds — cost if wrong: 3 strings. Visual gate capture done by controller after commit
Task 4: implementer DONE (dfbaa696, 4610/0)
Task 4: minor (deferred): star hanger ropes dropped vs mockup (stars float) — check in capture; glow() materials not shared (plan-mandated); spin axis untested; sim imports three from unpkg
Task 4: Ruling: plan gap — no task wires auctionItemMesh into the yard decor mesh lookup (game.js:5610-5611 chain: plazaDecorMesh, souvenirOutdoorMesh). Spec §2-4 needs won items placeable. Add to Task 9: one line `{ const m = auctionItemMesh(THREE, id); if (m) return m; }` after souvenirOutdoorMesh + import (counts toward the ≤12 game.js line cap; raise cap by 2 if needed), and spin starvane's userData.spin in yard if a per-frame decor hook exists — cost if wrong: won items render as fallback box
Task 4: review approved (spec ✅, no Critical/Important). Visual gate fix round 1/5 dispatched by controller after capture: sim framing (models ~20% panel height), restore star ropes, starvane star dominant
Task 4: fix round 1/5 (3 addressed: framing, ropes, star vane; commit cada2baf; 4610/0). Controller re-captured PC+mobile → awaiting user visual gate (shots in dev/active/evening-auction/shots/)
Task 4: user visual gate → '조잡한데 조금만 더 디벨롭 해줘 자연스럽게'. Design round dispatched (opus): sims/auction-items-compare.html with 3 directions A 형태 승격 / B 자연물 / C 무대 세트, self-captured via headless Chrome; items.js untouched until user picks
Exterior redesign (user request, out of plan): '경매장이랑 작업대 외부 디자인도 좀 바꾸자'. Ruling: 경매장 = 📊 시세판 (MARKET board, js/spaces/shop.js spawnMarketBoard) as interpreted at session start; the lantern stage is already approved — cost if wrong: one sim round redirected to the stage. Design round dispatched (opus): sims/exterior-compare.html, 현재+A/B/C per prop
Task 4 design round done (d3c3bb93): A 형태 승격 / B 자연물 / C 무대 세트 (agent recommends C). Shots in dev/active/evening-auction/shots/items-v2-*. Awaiting user pick
Exterior design round done (cfc000e9). Agent recs: 작업대 C 장인 수레, 시세판 B 저울 간판. Shots dev/active/evening-auction/shots/exterior-*. Awaiting user pick
User picks (2026-11-10): auction items C 무대 세트, workbench C 장인 수레, market board B 저울 간판 — but '시세장 이름 적는건 좀 밤티' → redesign only the board face (no 시세판 title text). Board-face round dispatched to the exterior designer (resume)
Task 4: port of items variant C dispatched (sonnet, base cfc000e9); includes fixing C arch's floating bluish lantern bar
Workbench C: user asked to remove the 'tail'. Ruling: tail = cart pull handle (shaft + crossbar sticking out to +x) — only protruding part — cost if wrong: one more edit. Forwarded to exterior designer
Task 4: items C port done (868770eb, 4610/0). Re-review dispatched on cada2baf..868770eb (items.js only)
Task 4: minor (deferred): no dispose helper / no geometry-material sharing across auctionItemMesh calls — decide in T9 yard wiring (consumer must traverse+dispose, existing outdoorMesh path handles removal?); STAGE.cream unused + BUILDERS duplicates id list; tiny gold finials cast shadows; no test for bar embedding / spin axis
Task 4: complete (commits 03d8ac7d..868770eb incl. design rounds d3c3bb93; items = user-picked C; review clean)
Task 5: dispatched (sonnet, base 868770eb); Step 5 placement gate deferred to after T9 (controller+user)
Task 5: implementer DONE (d7d9ac7c, 4615/0); captures stage-check-0/1.png
Task 5: review Needs fixes — 3 Important (cone/pool not night-scaled + setTension overwrites; setItem leaks GPU; shadow flag per colour batch kills big-part shadows). Ruling: fix all now though partly plan-mandated (brief code shared the gaps) — T7/T9 depend on these — cost if wrong: small extra diff. Also restore dropped mockup details if merge-only
Task 5: minor (deferred): 29 lanterns each own material (could share 4); setNight mid-values/setTension/focus cone untested; bunting z 1.7 vs 1.66
Task 5: fix round 1/5 dispatched (resume implementer)
Board-face round done (3f560496): B1 아이콘 가격표 / B2 저울이 말해요 / B3 칠판 그림, agent recommends B1; workbench C handle removed (width 1.72). Awaiting user pick
Task 5: fix round 1/5 implementer done (f365e31a, 4618/0); scoped re-review dispatched
Task 5: fix round 1/5 (3 addressed, 0 open; commits d7d9ac7c..f365e31a)
Task 5: minor (deferred): setNight during tension resets flicker until next setTension; shadow test asserts some (not all) large batches; T7/T9 must call stage.setNight(level) every frame before setTension or beam stays hidden
Task 5: complete except Step 5 placement gate (after T9) (commits 868770eb..f365e31a, review clean)
Task 6: dispatched (sonnet, base f365e31a)
Task 6: implementer DONE (9bb11d1b, 4623/0); capture actors-check.png OK
Task 6: review Needs fixes — (1) figure geometries/materials leak on dispose; Ruling: brief premise "clayMat shared" is false (game.js:3211 new material per call, npc.js:287 fresh geos) → dispose figures too — cost if wrong: none (puppets share nothing with real NPCs). (2) detachPlayer doesn't reset arm; fix + destructure-safe methods + dispose detached paddle
Task 6: carry to T9 dispatch: actors.update must run AFTER game.js idle arm reset (game.js:~6672) or arm never raises; stow/hide held tool during auction (poseHeldTool game.js:~4811 follows playerArms.R.hand); call stage.setNight(level) every frame before setTension
Task 6: minor (deferred): lift.scale breathing scales paddle; confetti from merchant falls through stage top; lead(null)/raise(unknown)/confetti expiry untested
Task 6: fix round 1/5 dispatched
Task 6: fix round 1 implementer done (ef2cc832, 4625/0); scoped re-review dispatched
Task 6: fix round 1/5 (2 addressed, 0 open; commits 9bb11d1b..ef2cc832)
Task 6: minor (deferred): freeTree doesn't dispose textures
Task 6: complete (commits f365e31a..ef2cc832, review clean)
Task 7: dispatched (sonnet, base ef2cc832) with approved copy mapping (3…/2…/1…, ⏱️ 연장!) and carried rulings (canBid gate, setNight before setTension). Committed copy table + shots (docs)
Task 7: implementer DONE_WITH_CONCERNS (680aa8ed, 4633/0): added getNight dep; canBid(run,inc) + wallet check; added auction_join/auction_result taxonomy rows early. Ruling: accept taxonomy rows now (test required them); T10 adds auction_open + ordering — cost if wrong: csv reorder
Task 7: review Needs fixes — (Important) settle failure (wallet < price at sold) still reported/tracked as win. Ruling: outcome 'none' (unsold, '유찰됐어요'), no econ/addWin, tracked price 0 — mid-run wallet drop is rare (player frozen in mgView), unsold is the honest result — cost if wrong: copy/outcome label swap. Also fixing: dt clamp, drop ignored canBid arg
Task 7: minor (deferred): end() mid-run emits no auction_result (funnel gap; consider 'abandon'); run_id = day:rng — unique per player only if rng unseeded (check T9 injection); coverage: lose/none outcomes, setTension <3s, wallet increase mid-run
Task 7: fix round 1/5 dispatched
Task 7: fix round 1 implementer done (c9449744, 4635/0); scoped re-review dispatched
Task 7: fix round 1/5 (3 addressed, 0 open; commits 680aa8ed..c9449744)
Task 7: minor (deferred): gavel/bell still fire on unpayable 'none'; T8 must render 'none' with leader null as '유찰됐어요'
Task 7: complete (commits 40de9938..c9449744, review clean)
Task 8: dispatched (sonnet, base c9449744) with approved copy + PC/375 capture requirement
Task 8: implementer DONE_WITH_CONCERNS (dcb3a9b0, 4642/0). Ruling: no appraisal/time-to-open/description/wallet line in window — not in approved copy; buttons disabled state carries wallet limit — cost if wrong: add lines after a copy round. Controller saw placeholder orange dot as item image → should be item icon
Task 8: minor (deferred → carried to T9): state.call bypasses t() (English mode); item image only via caller itemThumb <img>, no ico fallback (orange dot placeholder in sim); unknown actor id → "undefined 1등"; close() clobbers body classes, wiring must call ui.close() on dispose; render not gated on isOpen; no DOM test for createAuctionUi
Task 8: complete (commits c9449744..dcb3a9b0, review clean)
Task 9: dispatched (opus, base dcb3a9b0) with carry-forwards 1-9 (arm order, tool stow, setNight per frame, ico in window, call via t(), full teardown, yard outdoorMesh chain, run_id rng, no npc id literals). Step 6 + placement gate = controller
User pick: market board B1 아이콘 가격표 (2026-11-10). Exterior port (workbench C no handle + board B1) queued AFTER Task 9 — T9 edits kitchen-stage.js, avoid parallel writers. Ruling: keep existing '🔧 작업대' signpost next to the new cart (village-wide signpost pattern; user's 'tacky name' remark was about the board face) — cost if wrong: one line removal
Task 9: implementer DONE_WITH_CONCERNS (cb0ac720, 4654/0). Accepted rulings: auction_open fires only during auction hours (spec §3); added 닫기 to waiting view (approved copy, prevents input trap) — check 375px in T10; heldGroup.visible used for tool stow; NPCs re-hidden per frame (applyUnlocks unhides each second); villager names = existing NPCS names (e.g. 큐레이터 할아버지) — check mobile width in T10; icon instead of WebGL thumb
Exterior port dispatched (sonnet, base cb0ac720) in parallel with T9 review (read-only)
Exterior port: implementer DONE (7e432202, 4658/0); capture matches C + B1; removed i18n keys verified unused (first-loop/index banner use different strings). Review dispatched
Exterior port: minor (deferred): tag CanvasTexture no SRGBColorSpace; cart lantern lamps not wired to night; missing SELL_ICO_G key → 'undefined' on tag (guard with 📦); tagData up even if hiPct ≤ 0; stale comment farm-field.js:173 (farm workbench still old shape — consider porting too); in-game look unverified (controller to capture)
Exterior port: complete (commits cb0ac720..7e432202, review clean)
Task 9: review Approved (no Critical/Important). minor (deferred): join mode not re-checked at click (run can start after 0.96); pedestal shows today's item all day vs spec "무대가 비어 있고" (Ruling: keep as teaser — plan-mandated, shows what's on offer — cost if wrong: hide item outside hours, 1 line); join mid-swing may leave y/z arm/body pose; stale NPC visibility restore ~1s; setNight runs when outside village; grass/flower skip radius 7.7 may look bare; no behavioural teardown test; save-retry window could allow 2nd entry
Task 9: complete (commits dcb3a9b0..cb0ac720, review clean)
Controller in-game check (PC, guest, time 0.8): full flow OK — join → bid +30 → win 🪙180 → coins 500→320, outdoorStored starvane 1, lastDate set, teardown restores body classes/prompt; prompt switches to '오늘 경매 끝' after moving. Problems: (1) PC panel full-height with empty top/bottom (user: "창이 너무 큰거 아냐?"); (2) PC auction camera too close — stage right side + bidders cut, panel covers right third. Fix round dispatched
Panel/camera fix (eb216a02, 4658/0): controller verified live PC — compact panel top-right, whole stage + 4 people visible, gold ring + raised paddle on player. Mobile verified via sim capture only
Panel spacing (user: '글자 위아래 간격 좀 조정해주고'): au-body flex gap 10, price line-height 1.15, who +4px, call -4px, feed gap 5 / row padding 5x10 lh 1.4 — controller edit (CSS only)
Spacing verified live (2186d034). Note: on PC the door-prompt click doesn't always open the window; Space does — check in T10
Task 5 Step 5: user confirmed placement A (32.5,-3.5) '지금 자리 그대로' — AUCTION_STAGE unchanged. Task 5: complete
Task 10: steps 1-3 + prompt-click bug dispatched (sonnet, base 2186d034); step 4 (live measure) + step 5 (final review) = controller
Task 10: steps 1-3 DONE (fabeac72, 4660/0). Prompt click: general door-prompt behaviour (pointer-events:none; click falls to canvas → tryPickOutdoor then requestAction) — Ruling: unchanged, not auction-specific — cost if wrong: a separate UX fix for all doors
Task 10 step 4 (controller, live mobile 375): touch on #action-btn opens window; join/bid/lose flow OK; whole stage + 4 people above the sheet; long names ('큐레이터 할아버지 +50 → 210', '별 보는 아이에게 낙찰') fit; spotlight moves to winner; lanterns not blown out at t 0.8. Not checked: applyQualityStep(2) bloom-off, landscape phone. minor (deferred): mobile action button shows 🚪 (door class) at the stage instead of a hammer
FINAL REVIEW (opus): With fixes. I1 locked villagers (merchant/builder/curator/stargazer behind UNLOCKS) appear as bidders/names; I2 landscape phone/tablet: panel max-height ~290 hides bid buttons, camera pos (IS_MOBILE) vs shift (width) mismatch; I3 deploy condition: all 5 targets simultaneously (old clients drop new OUTDOOR ids + auction state). Minors chosen to fix now: M2 taxonomy line refs, M3 skip auction_open in 'done' mode, M5 yard items no solid collider.
Ruling (I1): auction available only once the auctioneer (merchant) is unlocked — before that the stage stands but no prompt/window; bidders = only unlocked villagers among curator/stargazer/builder (engine already iterates the array); with 0 unlocked bidders the lot can still be won at start price by the player (watch mode shows an unsold run) — avoids new copy and keeps unlock pacing — cost if wrong: switch to "all cast unlocked" gate, 1 condition
Ruling (I2): one device-class decision for both panel and camera; add a short-landscape layout so bid buttons never scroll — verify at 844x390 and 768x1024
Final fix wave dispatched (opus)
Final fix wave done (9050fdd7, 4675/0). Accepted: watch with no leader → 'none'; iPad landscape uses PC camera; single 0.5 collider for lanternarch; side-short below 560px tall. Scoped re-review dispatched
Controller live check (?unlocks=on, fresh guest, merchant locked): no stage prompt, Space does not open the window (falls to the hoe → existing '여기엔 밭을 만들 수 없어요' toast) — gate OK
Final fix re-review: all findings addressed (9050fdd7)
