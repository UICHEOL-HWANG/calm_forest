# SDD ledger — plan: docs/superpowers/plans/2026-10-16-sled-lineup.md

Spec: docs/superpowers/specs/2026-10-16-sled-lineup-design.md
Start HEAD: c88b951f
Order: 1 → 2 → 3 → 4 → 5 → 6+7 (batched, small)

## Pre-flight scan

| Tasks | Shared | Producer → consumer | Finding |
|---|---|---|---|
| 1 → 2 | sled.js PHYS | T1 lineup imports PHYS from sled.js; T2 must not import lineup into sled.js | plan states no cycle, OK |
| 1 → 3 | palette keys | T1 davos palette keys wood/dark/metal/accent(+stars); T3 builders read them | OK |
| 1 → 4 | SLED_IDS, STAT_NAMES | T4 re-exports SLED_IDS as SLED_SKIN_IDS | OK |
| 3 ↔ 4 | tests/mountain-sled-skins.test.mjs | T3 rewrites test vs SLED_IDS while save.js still has 4 ids until T4 | Ruling below |
| 2 → 4 | js/spaces/mountain.js | T2 createSled(physOf(sledSkin())); T4 finish grant | sequential edits, OK |
| 4 → 5 | cafe-ui.js, mountain.js | T4 rows; T5 adds cash button | sequential, OK |
| 1 → 5 | CASH_SLED_IDS, cashWon | T5 sledCash/priceIndex/seed | OK |
| 2 → 6 | PHYS_V | T6 tests phys_v 2 in row | OK |

| Task | Self-consistency |
|---|---|
| 1 | test numbers vs spec table: wind0 36.46<38.55-1.5 ✓, acorn0 39.50>38.55+0.5 ✓, 7-acorn spread 40ms ✓ |
| 2 | test uses createSled(0, phys) and s.phys — matches interface |
| 3 | vertex cap 6000 vs proto tubes (48 seg × 7 radial) — plausible; skiff longer than acorn ✓ (1.82 vs ~1.6) |
| 4 | toboggan backfill from best integer; rows text constants |
| 5 | test file names "기존 파일 기준" — implementer locates |
| 6 | SQL CHECK list = SLED_IDS |
| 7 | docs only |

Ruling: T3 test compares builders against lineup SLED_IDS only (not save.js SLED_SKIN_IDS), so T3 passes before T4 re-exports — keeps tasks independently green — cost if wrong: none.
Ruling: Tasks 6 and 7 batched into one dispatch — both small, 6 is a column+row field, 7 is docs — cost if wrong: one combined review.

## Progress
Task 1: controller verified ⚠️ balance numerics: node --test tests/sled-balance.test.mjs 4/4 pass.
Task 1: minor (deferred): sled-lineup.js:3 dense entry helper with double phys default; balance test doesn't pin exact phys/stat values.
Task 1: complete (commits c88b951..271195a, review clean)
Task 2: Ruling: implementer's concern — migrate_sled_runs.sql CHECK phys_v=1 and migrate_leaderboard_sled.sql filter phys_v=1 would drop v2 runs — carry into Task 6: relax both to phys_v in (1,2) (memory: sled DB not yet applied to production, so edit consistently and pin with existing tests) — cost if wrong: leaderboard mixes v1/v2 runs, acceptable since ideal times are equal.
Task 2: controller verified ⚠️ finalTimeMs uses PHYS.flagPenaltyMs (common); sled-run.js unchanged is correct (PHYS_V import auto-updates phys_v). DB phys_v item covered by Task 2 Ruling → Task 6.
Task 2: minor (deferred): hit-recovery test only checks stored phys, no collision scenario; duplicate PHYS_V assert.
Task 2: complete (commits 271195a..8ff5327, review clean)
Task 3: controller browser check (mobile, day, acorn): rider sits on acorn top, cap rings/nozzle read from behind, calls 62 (same budget as before), no JS errors (one network ERR_EMPTY_RESPONSE, pre-existing guest fetch). Full 5-sled visual in Task 7.
Task 3: Ruling: vertex cap forced lower segment counts than the approved proto (tube 6→5 sides, halved segments) — keep, spec §7 cap binds — cost if wrong: slightly more faceting vs the approved proto images.
Task 3: minor (deferred): stripe/eye colour asserts partly vacuous (acorn); SLED_SEAT now test-only; star studs float ~6mm; modelParts davos fallback unreachable; camp deco sled now 4356 verts (was ~500).
Task 3: complete (commits 8ff5327..d05964f, review clean)
Task 4: review Approved; controller confirmed ⚠️ layout gap: in the sled tab a locked row (starry '🏁 깃발 12개 모두 지나 완주하면 열려요') widens the button and squashes the 2-col stat grid so '속도'/'●●●○○' wrap onto separate lines (mobile 375). → fix round 1.
Task 4: minor (deferred): toboggan grant not saved immediately (requestSave snapshot before grant; reload backfill covers); backfill uses raw Number.isInteger(best) not validated best; no tests for finishSled wiring / sled-row rendering.
Task 4: fix round 1/5 (1 addressed, 0 open — locked-row stat wrap; commits 792d037..2cc5b25); controller browser 360px confirmed; npm test 3102/0.
Task 4: minor (deferred): locked rows have no greyed button (gold note instead); fix test is source-regex only.
Task 4: complete (commits d05964f..2cc5b25, review clean after 1 round)
Task 5: Ruling: implementer added sql/migrations/migrate_purchases_sled_kind.sql (purchases kind CHECK += 'sled') — required, otherwise webhook inserts fail; deploy order: apply it BEFORE seeding Paddle prices — cost if wrong: none (additive CHECK).
Task 5: review Needs fixes — Important: hut cafe coin button stays enabled while a sled cash grant is pending (double pay ₩3,900 + 1,500 coins); cosmetics shop already guards this (cafe.js:1101). → fix round 1.
Task 5: minor (deferred): mountain.js imports cashButton from spaces/cafe.js (space coupling); sled-cash wiring tests source-regex only; cash grant doesn't auto-ride (coin buy does).
Task 5: fix round 1/5 (1 addressed, 0 open — coin buy locked while cash pending; commits 144585b..8d8e358); npm test 3118/0.
Task 5: ⚠️ browser cash-button-hidden check: covered by unit test (sledCash null while PRICE_IDS null → no cash button); real-browser cash check deferred to after sandbox/production seed (deploy step).
Task 5: minor (deferred): wiring regex pins exact whitespace in buyFromCafe.
Task 5: complete (commits 2cc5b25..8d8e358, review clean after 1 round)
Task 7: controller browser check — game sled-art builds all lineup models matching approved F proto (verts basic 4356, starry 4536, toboggan 3492, wind 5172, acorn 5580, skiff 4464); shot proto/shots-sled/game-models.jpg; acorn run calls 62, no JS errors (Task 3 check).
Task 6+7: ⚠️ prod leaderboard body vs migrate_leaderboard_sled.sql — deferred to deploy: diff pg_get_functiondef('leaderboard') against the file before applying migrate_sled_lineup.sql.
Task 6+7: minor (deferred): add constraint full-table scan (fine at current size).
Task 6: complete (commits 8d8e358..bb99214, review clean)
Task 7: complete (commits bb99214..2f3fd99, review clean; controller browser check done)
Final review: not mergeable yet — C1 fairness pinned to unreachable 7 acorns (ACORNS.length = 6): wind always faster, acorn always slower; I1 cash-bought sled lost permanently if an old client drops mountain from the save (fresh-only grant); Minor: sled id read at start vs settle; tasks.md says ideal times differ.
Final: Ruling: retune at ACORNS.length=6 — wind boostMult 1.34→1.31, acorn 1.58→1.60 (controller verified Δ vs basic at 6 acorns: −20ms / −16ms; at 0: −2.10s / +0.94s) — the user decided the principle "max-acorn ideal times equal", the 7-acorn numbers were my simulation error, so keeping the principle is binding over the numbers — cost if wrong: user wanted the old numbers; one-line revert.
Final: Ruling: fix I1 now (re-grant live sled ids missing from hut.sleds) and gate Paddle production seed until all 5 platforms ship — paid items must not vanish — cost if wrong: none.
Final: fix wave dispatched: C1, I1, Minor 1 (run.sledId), Minor 2 (tasks.md wording), spec §3/plan numbers + balance test pins.
Final: fix wave re-review — all 4 findings ADDRESSED, no new breakage; note: re-grant re-toasts once and logs cash_grant via boot (analytics note).
