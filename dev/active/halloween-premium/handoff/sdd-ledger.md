# SDD ledger — plan: docs/superpowers/plans/2026-10-06-halloween-premium.md
Spec: docs/superpowers/specs/2026-10-06-halloween-premium-design.md (reachable)
Worktree: .claude/worktrees/halloween-premium · branch feat/halloween-premium · base main e6e5867
Baseline npm test: 1791 pass / 0 fail
Task 0: complete (docs commit d8495f7; worktree + files copied)
Task 1: complete (Korean copy approved by user as-is, 2026-10-06; table in plan Task 1)

## Pre-flight scan (task pairs sharing a file/interface)
| pair | produces vs consumes | finding |
|---|---|---|
| T2↔T3 | sale-window.saleOpen(item, now) ↔ premiumRowMode calls saleOpen(item, now) | consistent; `now` undefined → default param |
| T2↔T6 | T6 appends saleTagOf/saleEndLabel use into same file+test | consistent (saleEndLabel from T2) |
| T4↔T5 | catalog ids ↔ REVEAL_COPY keys | consistent; T5 test iterates all premium items |
| T4↔T11 | T4 raises tools slot to 5 → tool-skins.test (3-id/₩5000) fails until T11 | RULING R1 below |
| T4↔T7/9/10/11/12 | catalog ids ↔ art dispatch ids | consistent (id table in plan) |
| T5↔spec | plan says back→boxburst; spec §4-4a said spot | spec already corrected in worktree (T5 re-edits idempotently) |
| T7↔game.js/purchase-reveal | points becomes Group | callers only add()/.parent; suite catches the rest |
| T8↔T9/T10 | stubs then fill; skin.js exports opened in T9 | consistent |
| T8↔game.js | regex expects showSkinParts(charGroup, cos)/(built.group, cos) | matches current lines 3403/3597 (showSprout(..., sproutVisible(cos))) |
| T11↔T4 | TOOL_THEMES list test only in T11 | consistent after R1 |
| T6/T8 vs other session | cafe.js/game.js modified on feat/museum-redesign | future merge conflicts possible; small hunks |
Per-task self-consistency: each task's tests match its specified code (checked T2,T3,T4,T5,T6,T7,T8); art tasks (T9-T12) are prose+source-inspection tests by design.

## Rulings
Ruling R1: T4 implementer may update ONLY the tool-slot assertions in tests/tool-skins.test.mjs (ids→5, first 3 ₩5,000 / new 2 ₩4,500) so the suite stays green; T11 then limits its test edits to TOOL_THEMES — plan said T4 may leave failing; green-per-task is safer — cost if wrong: trivial duplicate edit.
Ruling R2: implementers must run `git commit` in a Bash call that contains no `-n` flag (ECC pre-bash hook false-positives on `git commit ... grep -n` in one command) — cost if wrong: one blocked call.
Ruling R3: model tiers — logic tasks (T2,T3,T4,T5,T6,T8) sonnet; art tasks (T7,T9,T10,T11,T12) opus; T13 sonnet; reviewers sonnet (logic) / opus (art); final review fable.
Ruling R4: "Chrome/preview" tools: subagents verify via `python3 scripts/serve.py <port>` inside the worktree — NOT preview_start (root-serving pitfall).
Task 2: complete (commits d8495f7..d6d7c78, review clean)
Task 2: minor (deferred): SALE_WINDOWS[key] reads inherited props (constructor/__proto__ → TypeError) — use Object.hasOwn + test; default now=Date.now() path untested; optional test that every window parses finite
Task 3: complete (commits d6d7c78..2961925, review clean; ⚠️ saleOpen default + trailer verified by controller)
Task 3: minor (deferred): add slotVisible test for slot with only out-of-window sale items; comment on `now` pass-through default
Task 4: complete (commits 2961925..fd56f43, review clean; suite 1804/1804; cash.test.mjs count edit 29→39 accepted)
Task 4: minor (deferred): redundant ₩4,000대 test; tool-skins amount rule by index not id; catalog.js header cites sale-window.js (exists)
Task 5: complete (commits fd56f43..bc93f1d, review clean; suite 1808/1808)
Task 5: to-verify at Task 13 smoke: back item is auto-equipped before boxburst reveal opens (cafe.js ~976-993 cash grant path)
Task 6: complete (commits bc93f1d..f7235b5, review clean; suite 1810/1810; i18n '🎃 할로윈 한정' already added in T5)
Task 6: to-verify at Task 13: sale-tag fits at 390px (nowrap/ellipsis may clip the date; fix = white-space:normal or smaller font); minor: gating (owned hides tag) only source-grep tested
Task 7: implementer report DONE_WITH_CONCERNS (bd6d056): pumpkin mark doesn't glow at night; spawnBat motion ~3x sim; 7 lobes vs 6; extras: createTrailFx.dispose(), purchase-reveal.js 1 line, trail.js paint helper keeps lobe shading, trail-fx.test.mjs Group shape edit
Ruling R5: Opus implementer used Opus Co-Authored-By trailer instead of plan's Sonnet one — accepted (truthful attribution of the authoring model) — cost if wrong: trailer text only
Ruling R6 (user instruction 2026-10-06, mid-run: "다 되면 paddle에도 가격 등록해라"): add Task 15 AFTER Task 12 and BEFORE Task 13/14 — run `PADDLE_ENV=production node scripts/paddle-seed.mjs` (key from macOS keychain item calmforest-paddle-live, never echoed/logged) for the 10 new items → writes live pri_ ids into js/shop/price-ids.js; update tests that assert the 10 ids are null (tests/halloween-catalog.test.mjs 'priceId 승인 전 null' + cash/paddle-seed counts if needed) to assert pri_ format; then commit. Dry-run first. Never touch the 7 existing products. Exposure note for final report: with live priceIds + token + storeOpen=true, rows show 'buy' to logged-in web users once SALE_WINDOWS opens (default 10/24); if Paddle domain approval is still pending checkout won't open — same exposure existing premium items already have; SALE_WINDOWS.from is the guard. Cost if wrong: live Paddle products can be archived in dashboard.
Task 7: review ❌ → fix round 1/5 dispatched (Important: pumpkin no night glow/halo; bat swirl ~5x sim scale — port helixCell numbers; Minor fixed in-round: setBats slice(-cap)); deferred minor: no pumpkin pop-in; source-regex tests
Ruling R7: halo approach approved — one stationary additive 'halo' particle in the existing dots Points (no new material kind/draw call); per-point size optional: if uniform PointsMaterial.size (0.22) forces it, accept 0.22 with higher alpha, document; must not change firefly/rainbow rendering — cost if wrong: night look slightly less haloed
Ruling R8: pumpkin lobes = 7 (sim is authority; brief's 6 was a typo)
Task 7: fix round 1/5 (3 addressed, 0 open; commits bd6d056..4eee506)
Task 7: complete (commits f7235b5..4eee506, review clean after 1 fix round; suite 1817/1817)
Task 7: to-verify at Task 13: pumpkin night look dimmer than sim (mark is lit; halo added), ember size (0.22 vs sim tiny), no pop-in on pumpkin, bloom/fog in real game, draw calls; deferred minor: halo+embers 3 particles/step may evict oldest under cap 64; renderOrder -1 sorting unverified in real render
Task 8: complete (commits 4eee506..fdfa49d, review clean; suite 1821/1821)
Task 8: minor (deferred): dispatch tested by source regex only (call applySkin with fake built once real); showSkinParts untested; part marker list duplicated in showSkinParts vs skinPartVisible (SKIN_PART_MARKS set); showSprout now dead in app (kept by plan)
Ruling R9: avoid skin.js ↔ skin-ghost/witch import cycle — Task 9 creates leaf module js/cosmetics/skin-kit.js (imports only trail.js mergeGeos) holding the shared helpers MOVED (not duplicated) out of skin.js (cached, own, bakeInto, headOf, skullOf, onEllipsoid/arcOn if needed…); skin.js imports them back; skin-ghost.js/skin-witch.js import ONLY skin-kit.js (and skin-rules.js). Overrides plan Task 9 'open skin.js exports'. Cost if wrong: refactor churn in skin.js, guarded by existing skin tests.
Task 9: complete (commits fdfa49d..76f4498, review clean; suite 1822/1822; helpers moved to skin-kit.js per R9)
Task 9: to-verify at Task 13: open hood ring under hats (fix if needed = closing cap disc in always-visible geo or tune NIGHTCAP.tipFrom), bloom of whites (raw 0.90-0.93; lower colour/emissive not threshold), cloud recolours dog collar white (accepted), nightcap +5 / cloud +3 draw calls (accepted)
Task 9: carried into Task 10 dispatch: (a) add `assert.doesNotMatch(src, /from '\.\/skin\.js'/)` cycle guard to halloween-skin-ghost.test.mjs and the new witch test; (b) one-line comment on skin-kit.js `put`: stage-only; never put directly into built.group
Task 10: complete (commits 76f4498..51ba7d4, review clean; suite 1823/1823; follow-ups (a)(b) done)
Task 10: minor (deferred): witch test lacks `.dispose()`/`from 'three'` guards (ghost has dispose guard); classic brooch uses trim material not shiny gold (check in T13, revert +1 call if flat); draw calls 6/10 vs ≈5/≈9 accepted (T14 gate)
Task 11: implementer DONE_WITH_CONCERNS (7f80860): plan defect found — sim DOES have B/C umbrellas (UMB.bat / UMB.harvest, look/umbrella-pc.png); plan text said none and gave invented UMBRELLAS params; implementer followed plan params. Ruling R10: sim is the authority for the look (user chose it) → umbrellas must match sim UMB.* — route through review/fix round.
Task 11: review ❌ → fix round 1/5 dispatched (Important: umbrellas must be re-ported from sim UMB.bat/UMB.harvest (R10); bat decals float off canopy (moot after port); Minor fixed in-round: strengthen tests, header comment 5 themes; potion disc k→ check/lower deferred to T13)
Task 11: fix round 1/5 (3 addressed, 0 open; commits 7f80860..8c8f6c5)
Task 11: complete (commits 51ba7d4..8c8f6c5, review clean after 1 fix round; suite 1826/1826); umbrellas re-ported from sim UMB.bat/UMB.harvest (R10); umbrella PNGs: look/umbrella-batnight.png, umbrella-harvest.png
Task 11: to-verify at Task 13: potion disc glow k0.6 vs bloom (lower to ~0.4 if bright), hold/swing/rain umbrella in real game; minor: test regex \w\(g\) brittle; possibly unused destructured names in buildUmbrella
Task 12: complete (commits 8c8f6c5..8d4d0d5, review clean; suite 1828/1828; draw calls A=2 C=3 in real mergeStatics)
Task 12: minor (deferred): tests don't cover tail-object case (add tailType assertion); BAT_EYE 0xffe27a luma≈0.88 (check in T13 or lower to 0xf2d36a); duplicated batWingShape/ext/pumpkinGeo in art-bats.js vs tool-skins-halloween.js; eyes no glow & flat-shaded brooch accepted (needed for draw-call budget) — show user as visual deviations
Task 12: OUT-OF-SCOPE finding (pre-existing, spawn as separate task): BACK.cape compares k.tail === 'bushy'|'long' but game passes tail as object → fox/cat use narrow 0.06 vent → tail pokes through the existing 🦸 cape
Task 15: complete (commits 7321fc0..cea3bbb; controller-verified read-only: Paddle live active products=17, no duplicates, 10 new present, prices 4000/4900/4500 KRW; price-ids.js diff = 10 new keys only; suite 1828/1828)
Out-of-scope chip spawned: task_ebd1dae4 (existing cape tail check bug)
Task 13: implementer DONE_WITH_CONCERNS (f977c49: sims/halloween-verify.html + 35 PNGs + .sale-tag white-space:normal fix for 390px). A FAIL (pumpkin_glow dark at night: lit film() materials vs sim unlit), B FAIL (nightcap hood open top under worn head items), C/D/E/F/G PASS. D: back-item reveal boxburst with item already worn (via playPurchaseReveal; real cash path not runnable offline). F: no tuning edits needed (whites/bat eyes/potion fine under real bloom).
Ruling R11: the two MEDIUM findings are defects against the user-chosen sim looks → route as fix rounds to the ORIGINAL implementers sequentially (T9 hood cap first, then T7 pumpkin unlit) — not parallel (shared worktree/commits). LOW findings accepted & reported to user: ears poke through nightcap sides (same in sim); rabbit ears pierce witch_classic brim (accepted in sim); batnight umbrella front panel droops over forehead (sim-faithful; user approval pending); '달밤 세트' vs '달밤 보라 세트' confusable (names user-approved).
Screenshots sent to user (9 PNGs) mid-run at user's request ("끝나면 바로 보여줘").
Task 9: fix round (post-T13) commit 2853200 (nightcap hood top closed by low rounded cap in always-visible sheet; real-game verified fox/rabbit/cat/bear/chick; suite 1829). Ruling R12: low head items now mostly hidden under the hood — ACCEPTED (a hood covers the head naturally; hiding/layering head items under a nightcap is a product call, reported to user); faint radial creases on cap from above accepted; nightcap 5 draw calls accepted.
Axe orientation check (user suspicion): CORRECT for both themes (edge·velocity +0.59 vs default +0.69); evidence look/axe-orientation-check.png; no code change.
Task 9: post-T13 fix re-review: addressed (cap in always-visible sheet idx, no new mesh/material; cloud unaffected). Out-of-scope minors: cap winding inverted vs sheet (works only because DoubleSide); cutRow rounding negligible.
