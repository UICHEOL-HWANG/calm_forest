# Pond Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The yard pond can be expanded from stage 1 to 2 and 3; from stage 2 it lives at a roomier spot west of the house and the world, the map and the neighbour view follow.

**Architecture:** Stage is one number in the save (`hintsSeen.pondStage`, 1..3, missing = 1). Pure rules live in `js/pond/stage.js` (done, Task 1). `js/pond/build.js` builds a pond for a given radius and stage; `js/pond/index.js` owns placement, rebuild, collider and yard clearing; `js/pond/expand-ui.js` owns the expand window and purchase. `js/game.js` only wires.

**Tech Stack:** Vanilla JS ES modules, three.js, `node --test`, headless Chrome (CDP) for captures.

**Spec:** `docs/superpowers/specs/2026-11-12-space-link-v2-design.md` §2-3, §4, §6, §7, §10. Decision on 2026-11-17 (user): option B, the pond moves to a bigger spot when it reaches stage 2 (the spec's "do not move the centre" is superseded). Decor slots (§2-4), names (§2-5) and the table (§3) are out of scope.

## Global Constraints

- No code comments in new code, CSS or tests. Explanations go in commit messages.
- No logic in `js/game.js`; add wiring only. New code goes under `js/pond/`.
- Everything stays behind `spaceLinkOn(e3Decision())` like the existing pond.
- Save: only `gameState.hintsSeen.pondStage` (integer). No new top-level save field.
- Copy: no em dash, no "놀다", no arrow emoji. World speech bubbles are emoji only. Korean strings live in `js/pond/copy.js`; every new string gets an entry in `js/i18n-en.js` as a whole sentence (no concatenation glue).
- GA4: new event `pond_expand` with params `stage, wood, stone, coins` (same keys as `farm_expand`); it needs a row in `docs/analysis/event-taxonomy.csv`.
- Commits: conventional commits, English, no attribution lines, local only (never push).
- Tests: `npm test` must stay green (baseline 6082 on main plus Task 1).

## Done already (Task 1, commit d0489661)

`js/data/pond.js`: `POND_STAGE_R = [2.0, 2.9, 3.9]`, `POND_BIG_SPOT = { dx: -8.5, dz: -3 }` (offset from `HOUSE_POS`, world (-16.5, -11)), `POND_ACT_PAD = 1.4`, `POND_VIEW_PAD = 3`.

`js/pond/stage.js` exports: `POND_STAGES` (`{stage, name, ico, book, cost}`), `MAX_POND_STAGE`, `pondStageOf(hintsSeen)`, `pondRadius(stage)`, `pondSpotFor(stage, smallSpot)`, `pondActR(stage)`, `pondViewR(stage)`, `pondStageInfo(stage, inventory, bookGot)` → `{maxed, cur, next, book:{need,have,ok}, items:[{k,need,have}], affordable}`, `pondDecorInWay(outdoorRel, stage)` → count, `pondFishLimits(stage)` → `{seaMax, riverDup}`.

`js/pond/rules.js`: `pondView(state, ids, limits)` now also returns `seas` (up to `limits.seaMax`, heaviest first). `js/guide/prepass-rules.js`: `pondStageShort(stage, inv)` → `null | {slot:'pond2'|'pond3', ico, verb, list}` (stone and wood only).

---

### Task 2: Pond shape, move, collider, yard clearing, map

**Files:**
- Modify: `js/pond/build.js`, `js/pond/index.js`, `js/world/map-snapshot.js` (or its wiring at `js/game.js:2674-2677`), `js/game.js` (scatter exclusions at 3735, 3777, 5408 and the ground patches near 3692; wiring only)
- Create: `js/pond/yard-clear.js` (if a helper is needed for runtime clearing)
- Test: `tests/pond-wiring.test.mjs` (update), `tests/pond-build.test.mjs` (new, if geometry can be built in node), `tests/map-snapshot*.test.mjs` (update if the signature is tested)

**Interfaces:**
- Consumes: everything listed under "Done already".
- Produces (used by Task 3 and 4):
  - `buildPond({ fishMesh, mergeGeos, paintGeo, emojiSprite, r, stage })` — `r` and `stage` optional, default `POND_R` and 1. Still exactly two meshes (shore, water) plus fish.
  - `pond.setContents(view, seaColorOf, limits)` — shows `view.fish` repeated `limits.riverDup` times and every entry of `view.seas`.
  - `js/pond/index.js`: `pondStage()` → current stage number; `rebuildPond()` → disposes and rebuilds the pond for the stage in `gameState.hintsSeen`, moves it to `pondSpotFor(...)`, replaces the collider, clears the yard there, refreshes fish, and plays a 2 second grow-in; existing exports keep their names.

**Requirements:**
- [ ] Radius-driven shape: rock ring count `Math.round(r * 7)`; bed, water, lily pads, reeds, fish swim ellipses and the gather point scale with `r / 2.0`; stage 1 must look exactly as today (same counts and positions when `r === 2.0`).
- [ ] Stage 3 adds, merged into the shore mesh: a small island (flattened cylinder radius about 0.9 at local (1.6, -1.2), with a small cone tree) and four stepping stones at local `(-0.2 + 0.5 * i, 0.2 - 0.38 * i)`, both scaled to the stage 3 radius the way the approved mockup `/Users/uicheol_hwang/calm_forest/sims/pond-grow-sim.html` shows them (lines 119-149). No decor slot rings.
- [ ] Placement: stage 1 keeps `pickPondSpot(POND_SPOTS, ...)`. Stage 2 and 3 always use `POND_BIG_SPOT`, even if decor stands there (never return "no pond" for an expanded pond).
- [ ] Collider: radius `r + 0.1`, replaced on rebuild (use the existing `removeSolid` used by `clearTreesForKiln`, `js/game.js:722-736`). Add a matching `obstacles` entry so NPCs and the merchant keep out (`js/spaces/npc.js:600-611` reads `obstacles`); remove it on rebuild.
- [ ] `pondNear()` uses `pondActR(stage)`, the daily `pond_view` check uses `pondViewR(stage)`.
- [ ] Yard clearing at the big spot, radius `r + 0.6`, both right after an expansion and on load when the stage is 2 or 3: trees removed for good (the `clearTreesForKiln` pattern, so felled trees cannot regrow there), flowers hidden, instanced grass tufts hidden, and the flat ground patches must not show through the water. Players who never expand must keep their trees, grass and flowers at that spot. `pondScatterBlocks` keeps protecting the three small spots.
- [ ] Map: the pond's spot and stage become part of the map signature so the overhead snapshot is retaken after an expansion (`mapSignature`, `js/world/map-snapshot.js:77`).
- [ ] Grow-in: on `rebuildPond()` the new pond scales from 0.6 to 1 over 2 seconds; no camera cut is required.
- [ ] `updatePond`, `refreshPond('load')` and the yard guide keep working for stage 1 with no behaviour change (the P1 bot scenario: first fish → pond appears → feed).

**Verify:**
- [ ] `npm test` green.
- [ ] Headless Chrome captures of the village with a save at stage 1, 2 and 3 (desktop 1280x800 and mobile portrait 390x844), saved under `dev/active/space-link-v2/` as `p2-stage{1,2,3}-{pc,mobile}.png`. The save can be forced through the existing dev hooks; look at how P1 captured (`dev/active/space-link-v2/space-link-v2-context.md`, "검증 함정"). Do not create accounts on the production backend: run with the offline fallback or an existing local dev mode.
- [ ] Draw call count before and after at stage 3 (the repo's measuring method is in the memory note referenced by `tests/` names containing `draw`); report both numbers.
- [ ] Commit: `feat(pond): radius-driven pond that moves to the big spot from stage 2`.

### Task 3: Expand window, purchase, ad slot, tracking, copy

**Files:**
- Create: `js/pond/expand-ui.js`, `tests/pond-expand-wiring.test.mjs`, `tests/pond-expand-copy.test.mjs`
- Modify: `js/pond/feed.js` (entry row in the notebook), `js/hud/collection-book.js` (optional `foot` node next to the hint, if needed), `js/pond/copy.js`, `js/i18n-en.js`, `js/tenjin-events.js` (`GROUP_RULES`, add `pond\d+` to the house group), `tests/prepass-slots.test.mjs`, `tests/tenjin-events.test.mjs`, `docs/analysis/event-taxonomy.csv`, `js/game.js` (export a small `pondShortAdButton` wrapper next to `pondFeedAdButton` at about line 2114, built on `guideShortAd`)

**Interfaces:**
- Consumes: `pondStageInfo`, `pondStageShort`, `pondDecorInWay`, `pondStage()`, `rebuildPond()`, `fishBook(...)` count (`book.got`) from `js/pond/actions.js`, `guideShortAd(slot, list, onDone, caps)` (`js/game.js:2107`), `logEcon` (`js/metrics.js:27`), `RES_LABEL`.
- Produces: `openPondExpand()` (opens the window), `expandPond()` → boolean.

**Requirements:**
- [ ] Entry point: in the notebook window (`openPondBook`), under the grid, one row. Not maxed: button `🌊 연못 넓히기`. Maxed: text `🏝️ 다 넓힌 큰 연못이에요`.
- [ ] Expand window reuses the collection-book window (`openBook` with `sections: []` and the rows as `head`). Title `🌊 넓은 연못으로` (to stage 2) or `🏝️ 큰 연못으로` (to stage 3), count `1 → 2단계` / `2 → 3단계`.
- [ ] Rows, label left and `have / need` right, a check mark when met: `📒 물고기 수첩` (`5 / 4종`), `🪨 돌`, `🪵 목재`, `🪙 코인`.
- [ ] Under the rows: the ad button from `pondShortAdButton` when stone or wood is short (never for coins or the notebook), then one hint line for the first unmet row: notebook `📒 새 물고기를 낚으면 수첩이 채워져요`, stone `🪨 돌은 광산에서 캐면 나와요`, wood `🪵 목재는 숲에서 나무를 베면 나와요`, coins `🪙 상인에게 팔면 코인이 모여요`. After an ad grant the window re-renders.
- [ ] Button `넓히기`, disabled until `info.affordable`. If `pondDecorInWay(outdoorRel, next.stage) > 0` the button is disabled and the hint line reads `🪑 새 연못 자리에 꾸미기가 있어요. 옮긴 뒤 넓혀 주세요`.
- [ ] Purchase (`expandPond`): re-check `affordable` and decor, deduct each cost key from `gameState.inventory`, `logEcon('pond_expand', 'stage' + n, -coins, balance)`, refresh the inventory UI, set `gameState.hintsSeen.pondStage = n`, `rebuildPond()`, `trackEvent('pond_expand', { stage: n, wood, stone, coins })`, `requestSave()`, close the window, then show the result.
- [ ] Result: toast `🌊 연못이 넓어졌어요. 바다 대어가 4마리까지 살 수 있어요` (stage 2) / `🏝️ 큰 연못이 됐어요. 작은 섬과 징검다리가 생겼어요` (stage 3).
- [ ] One-time tip: the first time the notebook count reaches the next stage's `book` need while not maxed, toast `📒 수첩이 {0}종이에요. 연못을 넓힐 수 있어요` once per stage (`hintsSeen.pondGrowTip` holds the last stage tipped).
- [ ] English entries for every new Korean string; a copy test that no Korean remains after translation and that no new string contains an em dash, "놀" or an arrow emoji.
- [ ] Slot registration: `rvGroup('pond2')` and `rvGroup('pond3')` are not `'other'`; `prepass_eligible` description in the taxonomy lists them.

**Verify:**
- [ ] `npm test` green.
- [ ] Headless Chrome: open the notebook, open the expand window with one material short (capture `p2-expand-short-{pc,mobile}.png`), with everything met (`p2-expand-ready-*.png`), buy, and capture the grown pond. Mobile landscape 844x390 too: the window must fit without clipping.
- [ ] Commit: `feat(pond): expand window with material rows, rewarded shortfall slot and tracking`.

### Task 4: Neighbour view

**Files:**
- Create: `sql/migrations/migrate_neighbor_pond_stage.sql` (not applied to production in this task)
- Modify: `js/neighbors/sanitize.js`, `js/neighbors/scene.js`, `tests/neighbor-pond.test.mjs`

**Requirements:**
- [ ] `public._nb_pond(jsonb)` also returns `stage` (integer 1..3 read from `state->'hintsSeen'->>'pondStage'`, anything else → 1). Write the full `create or replace function` in the migration, starting from the current definition in `sql/migrations/migrate_neighbor_pond.sql`, `search_path = ''`.
- [ ] `sanitize.js` whitelists `pond.stage` (integer 1..3, default 1).
- [ ] `scene.js` builds the neighbour's pond with `r = pondRadius(stage)` at `pondSpotFor(stage, pickPondSpot(...))`. An older server that sends no stage shows stage 1 as today.
- [ ] Sea fish in the neighbour view stay at one (the payload is unchanged); note this in the commit message.

**Verify:**
- [ ] `npm test` green; the SQL file is syntactically valid (`psql` is not required; check against the existing migration's style).
- [ ] Commit: `feat(neighbors): show the visited pond at its expanded stage`.

### Task 5: Review and docs

- [ ] Code review of the whole branch diff, fix findings.
- [ ] Update `dev/active/space-link-v2/space-link-v2-tasks.md` and `-context.md` (Last Updated) with what shipped and what is left (decor slots, names, table, production SQL, 5-place deploy).
