# Yard Table Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the player cooks a first regular recipe, a dining table appears in the yard with one plate per cooked recipe; at the table the player opens "📖 나의 요리책" and takes "🥄 오늘의 한 입" once a day.

**Architecture:** Everything shown is derived from `gameState.kitchen.best` on every refresh; the save only gains flags inside `gameState.hintsSeen`. Pure rules live in `js/table/rules.js` and `js/table/site.js`; `js/table/build.js` is a style-swappable model builder; `js/table/index.js` owns lifecycle, collider, NPC keep-out, yard clearing and the ground ring; `js/table/book-ui.js` owns the two windows. `js/game.js`, `js/spaces/doors.js` and `js/spaces/npc.js` only get wiring.

**Tech Stack:** Vanilla JS ES modules, three.js, `node --test`, headless Chrome (CDP) for captures.

**Spec:** `docs/superpowers/specs/2026-11-12-space-link-v2-design.md` §1, §3, §4 (table rows), §5, §6, §7, §10. Pattern to copy: `docs/superpowers/plans/2026-11-17-pond-expand.md` and `js/pond/`. Mockup reference for the model: `sims/yard-table-sim.html` (styles A checked cloth, B bare wood, C parasol; `buildTable(style, count)` at line 359). Site prototypes: `dev/active/space-link-v2/tablesite-a-long-pc.png` (front yard) and `tablesite-c-long-pc.png` (behind the house).

## Global Constraints

- No code comments in new code, CSS or tests. Explanations go in commit messages.
- No logic in `js/game.js`; add wiring only. New code goes under `js/table/` (data constants in `js/data/table.js`).
- Everything stays behind `spaceLinkOn(e3Decision())`, the same gate as the pond (`js/pond/index.js:84`).
- Save: only keys inside `gameState.hintsSeen` (`tableSeen`, `tableLong`, `tableBiteDay`, `tableBiteAd`, `tableRingSeen`, `tableGuide`, `tableGuideTries`, `cookbookSeen`). No new top-level save field, no stored dish list.
- Cost: none. The table is free.
- The pond is never moved for the table. The table yields.
- Copy: no em dash, no "놀", no arrow emoji. World speech bubbles are emoji only. Korean strings live in `js/table/copy.js`; every string gets an entry in `js/i18n-en.js` as a whole sentence (no concatenation glue). All Korean strings in this plan are DRAFTS for user review.
- GA4: new events `table_created`, `cookbook_open`, `table_bite`, each with existing parameter keys only and at most 5; each needs a row in `docs/analysis/event-taxonomy.csv` (`tests/event-taxonomy.test.mjs:18-21` fails otherwise).
- First-load bundle: new modules are imported only from `js/game.js`, `js/spaces/*.js` or other game-time modules, never from `index.html` or a boot module (`tests/lazy-game-boot.test.mjs:8-21`).
- Commits: conventional commits, English, no attribution lines, local only (never push). No SQL is run. No production accounts.
- Tests: `npm test` must stay green (baseline 6164 at HEAD 42193569).

## Research record (read before starting)

**Recipes, grades, buffs**
- `RECIPES` `js/data/catalog.js:154-175`: 11 regular recipes, each `{ id, name, ico, cost, buff, dur, desc, stages }`. Cost keys are only `crop, forage, fish, egg, flour, juice`. `BUFF_META` `js/data/catalog.js:182-187` (`speed, luck, chop, mine`).
- `COOK_TIERS` `js/spaces/cooking.js:26-31` (perfect 88 ×1.5, great 65 ×1.25, good 35 ×1.0, plain 0 ×0.7); `cookTier(score)` `js/game.js:5880`.
- `kitchenView()` `js/spaces/cooking.js:62-75` (per-recipe `cost` rows with `have/need`, `ready`, `best`). `buffDur` `:90` multiplies by `potMult`. `eatDish` `:110-121` OVERWRITES the buff end (`buffs[r.buff] = clock.elapsedTime + dur`), fires `cook_eat` and the first-buff modal; `emitBuffs` `:189`.
- `gameState.kitchen = { cooked, best: { [id]: score }, tiers }`, restored at `js/game.js:3356`. Free-pot dishes share `best` under ids for which `isFreeId(id)` is true (`js/free-pot/dish.js`).

**The hook for a finished dish**
- `kitchenFinish(id, res)` `js/game.js:5914-5978` is the single place a dish is completed. It writes `st.best[id]` at `:5924-5925`, then calls `syncStory('cook')` at `:5933` (chapter 3 progress; a chapter completion queues a story modal through `queueStoryModal`, `js/game.js:1304-1327`). Callers: the kitchen course `js/game-ui/cook-course.js:356` and cafe cooking `js/spaces/cafe.js:1604`.
- The kitchen is a village facility with a modal UI, so the player is already in the village when the course closes; cafe cooking finishes inside the cafe space. The pond's equivalent hooks are `refreshPond('fishing')` `js/spaces/fishing.js:103`, `refreshPond('sea')` `js/spaces/sea.js:501`, `refreshPond('load')` `js/game.js:3453`, and the per-frame `updatePond(dt, inVillage2())` `js/game.js:6769`.

**The errand owl**
- Definition `js/data/npcs.js:169`: `id: 'courier'`, `pos: [-3, 0, -3]`, no `roam` (default 1.6 in `wanderNPC`, `js/spaces/npc.js:628`).
- On the ground it wanders within 1.6 of `o.home` and refuses steps into `npcBlocked` cells (`js/spaces/npc.js:619-643`).
- It flies (`js/spaces/npc.js:405-498`): after 30 to 50 s perched, when the player is farther than `OWL_STAY_R = 6`, it takes a patrol of 1 or 2 legs and lands on `owlLandingSpot(o, home.x, home.z, 2.5, 5.5)` (`:454`, `:476`); cruise height `OWL_CRUISE = 2.7`. A patrol does not change `o.home`, so it walks back afterwards. Delivery flights land 1.6 to 2.4 from the player (`sendOwlToPlayer` `:546-553`, `updateOwlVisit` `:561-571`) and DO move `o.home` to the landing spot (`:492`).
- Every landing spot, wander target, merchant placement and `placeNearPlayer` (`:672-683`) goes through `npcBlocked(x, z, self)` (`:600-611`), which rejects anything within `ob.r + 0.35` of an entry in `obstacles`. NPCs do not look at `colliders`.
- Consequence: the table at world (-3.5, 0.5) is 3.5 from the owl's home, inside the 2.5 to 5.5 landing ring and 0.15 inside its walking reach. Without a fix the owl will land on and walk into the table.
- Smallest safe fix (chosen): do not move the owl and do not remove its flight. Push the table's footprint into `obstacles` as keep-out circles (what the pond does, `js/pond/index.js:73-74`). That alone stops perching, walking, delivery landings and the merchant inside the table area, and it also blocks hoeing and decor placement there (`isBlocked`, `js/game.js:8813`). Add one optional predicate so a patrol leg is not chosen when its straight flight line crosses the table (the owl would otherwise pass 2.7 above the plates). Players without a table see no change at all.

**Trees**
- Trees are scattered at world build with `Math.random` and are not saved (`js/game.js:3716-3741`; the pond's exclusion is `pondScatterBlocks(x, z, 1.2)` at `:3738`). World build runs before the save is applied, so the scatter cannot know whether a table exists.
- A felled tree regrows in place because it stays in `trees` with `fallen`/`respawnAt` (`spawnTree` `js/game.js:3803-3827`, regrow at `:7823`). Removing the tree from `trees` (plus its `obstacles` entry, collider and canopy swayable) is what stops regrowth for good: `clearYard` `js/pond/yard-clear.js:46`, same as `clearTreesForKiln` `js/game.js:724-739`.
- So the table clears at build time on every load and every rebuild, exactly like the expanded pond (`js/pond/index.js:64`). No scatter exclusion is added, which is what keeps trees for players without a table. Site A already sits inside the pond's scatter exclusion (3.8 around each spare spot), site C does not.
- Grass tufts `js/game.js:3771-3780` and flowers `:5411` are handled by the same `clearYard` call.

**Proximity prompt**
- `js/spaces/doors.js:487-488` sets `$w.nearDoor = 'pondsign' | 'pond'` and the prompt text; `js/game.js:7896-7897` dispatches the action. The dashed ring that turns gold is built privately in `js/pond/sign-build.js:17-29` and driven by `signRingEase` / `signRingLook` (`js/pond/sign.js:19-35`); the once-only pulse is `signPulseDue` (`js/pond/sign.js:63`, used at `js/pond/index.js:144-150`).

**Daily action with an ad**
- Rules `js/pond/actions.js:9-21` (`feedStatus`, `afterFeed`, `afterFeedAd` on `dayCount` / `bumpDay`), action `js/pond/feed.js:29-43`, row UI `:45-63`, button factory `pondFeedAdButton` `js/game.js:2115-2118` (gated by `repeatOpen(gameState.houseStage)` and `rewarded.offer(slot)`).
- Slot tables: `REPEAT_SLOTS` `js/guide/prepass-rules.js:44`, `SLOT_CAPS` `:10-17`, `AD_PARTS` `:19-32`; Tenjin grouping `GROUP_RULES` `js/tenjin-events.js:19-29`; tests `tests/prepass-slots.test.mjs:8-24`, `tests/tenjin-events.test.mjs:80-81`, `tests/pond-feed-wiring.test.mjs`.

**Ingredient shortfall ad**
- `CAFE_CAPS` `js/guide/prepass-rules.js:8` covers every recipe cost key. The cafe uses `shortAdButton(slot, list, null, CAFE_CAPS)` (`js/game.js:3104`, called from `js/guide/goal-guide.js:280` with slot `cafe_order`). The exported wrapper is `guideShortAd(slot, list, onDone, caps)` `js/game.js:2108`; `list` is `shortfall(cost, inv)` rows `{ k, need, have, more }` (`js/guide/story-steps.js:10`).

**Tracking**
- Pond rows to imitate: `docs/analysis/event-taxonomy.csv:338-344`; the slot list lives in the `prepass_eligible` description at `:467`. Keys already registered and reused here: `trigger`, `count`, `recipe`, `quality`, `kind`.

**Guides**
- `GUIDE_PRIORITY` `js/guide/arbiter.js:1-3` (`yard: 50`); registrations `js/game.js:1660-1680`; `guideMay` `:1659`; `sceneFree` `:1685`. The pond's guide is `createYardGuide` `js/pond/yard-guide.js:25-135`, installed at `js/game.js:3152-3163`, steps in `js/pond/yard-steps.js`. It already has `pointTo(kind)` for "go there" arrows (`:92-101`).

**Map**
- `mapSignature({ season, houseStage, unlocks, outdoor, pond })` `js/world/map-snapshot.js:77-81`, wired at `js/game.js:2677` with `pondMapKey()` and `settling: pondSettling`. The map is a live overhead render, so a table that is not in the signature would be missing from the map until something else changes.

**Neighbour view**
- Server: `_nb_pond(jsonb)` in `sql/migrations/migrate_neighbor_pond_stage.sql`, attached in `neighbor_showcase` (`sql/migrations/migrate_neighbor_pond.sql:25-60`, `'pond', _nb_pond(s)` at `:60`). `sql/migrations/migrate_neighbors_room.sql:5` warns that re-running an older file reverts the showcase body.
- Client: whitelist `js/neighbors/sanitize.js:68-81`, placement `js/neighbors/rules.js:52-64`, scene `js/neighbors/scene.js:73-91` (fixed trees and fence skip `pondCovers`) and `:128-155`. The neighbour view is not gated by the viewer's experiment arm.

**Verification method**
- `dev/active/space-link-v2/space-link-v2-context.md:67` and `:90-91`: offline guest, Supabase blocked, headless Chrome over CDP (the in-app browser pane stops `requestAnimationFrame` when hidden); `window.__ui.coachActive = () => false` on a fresh save; ad buttons need `?prepass=1`; dev sessions drop events, so `trackEvent` is checked with an instrumented stub. Draw calls: `window.__perf()` (`js/game.js:3010`, needs `?dbg`).

---

### Task 1: Pure rules and placement tests

**Files:**
- Create: `js/data/table.js`, `js/table/rules.js`, `js/table/site.js`, `tests/table-rules.test.mjs`, `tests/table-site.test.mjs`

**Interfaces (produced):**
- `js/data/table.js`: `TABLE_SITES = [{ id: 'front', dx: 4.5, dz: 8.5 }, { id: 'back', dx: -3, dz: -11 }]` (offsets from `HOUSE_POS`, world (-3.5, 0.5) and (-11, -19)); `TABLE_LONG_FROM = 7`; `TABLE_SHAPES = { round: { hx: 1.5, hz: 1.5, reach: 2.2 }, long: { hx: 2.1, hz: 1.3, reach: 2.9 } }` (half extents including seats; the long top is 4.2 × 1.5); `TABLE_TREE_CLEAR = 2`; `TABLE_SOUTH_CLEAR = 3`; `TABLE_DECOR_PAD = 0.6`; `BITE_BASE_SEC = 30`; `BITE_AD_PER_DAY = 1`.
- `js/table/rules.js`:
  - `tableDishes(best, recipes, tiers)` → `[{ id, ico, name, buff, tier }]` in `recipes` order; only ids present in `recipes` with a finite score above 0; `tier` is the tier id.
  - `tableShape(count)` → `'round' | 'long'`; `tableView(best, recipes, tiers)` → `{ dishes, shape, has }`.
  - `tableChanges(prev, next)` → `[{ type: 'created' | 'dish' | 'tier' | 'long', id? }]`.
  - `biteStatus(hints, day)` → `{ bit, adLeft }`; `afterBite(hints, day)`; `afterBiteAd(hints, day)` (same shapes as `feedStatus` / `afterFeed` / `afterFeedAd`).
  - `biteSeconds(tierId, tiers)` → `Math.round(BITE_BASE_SEC * mult)` (21, 30, 38, 45).
  - `biteBuffEnd(curEnd, now, sec)` → `Math.max(curEnd || 0, now) + sec` (never shortens a running buff).
  - `cookbook(best, inventory, recipes, tiers)` → `{ slots: [{ id, ico, name, got, tier, cost: [{ k, need, have }], short: [{ k, need, have, more }], station: 'kiln' | 'vat' | null }], got, total }` (`station` from a `flour` or `juice` cost).
- `js/table/site.js`:
  - `tableFootprint(site, shape, house)` → `{ x, z, hx, hz }`.
  - `tableKeepOut(site, shape, house)` → `[{ x, z, r }]` circles covering the footprint (one for round, three along x for long).
  - `tableSiteFor({ pond, outdoorRel, plotsRel, shape })` → the first of `TABLE_SITES` that is free, else `null`. `pond` is `{ dx, dz, r } | null`. Free means: the pond circle plus its sign ring does not touch the long footprint, and no decor or tilled plot is within `TABLE_DECOR_PAD` of the footprint. The check always uses the long footprint so the table does not jump sites at dish 7.
  - `tableBlockedBy({ pond, outdoorRel, plotsRel })` → `null | 'decor' | 'plots'` for the case where every site is taken.
  - `tableCovers(table, dx, dz, pad)` → boolean (for the neighbour yard).
  - `segmentHitsKeepOut(a, b, circles, pad)` → boolean.
  - `tableMapKey(siteId, shape)` → string.

**Requirements:**
- [ ] Dishes: free-pot ids excluded, unknown ids ignored, one per recipe, score 0 or non-number ignored, 6 → round, 7 → long, 11 max.
- [ ] Bite: twice on the same day is refused, a new day allows it, the ad bite is available only after the free one and at most `BITE_AD_PER_DAY`.
- [ ] Cookbook: 11 slots, `short` lists only missing keys, `station` set for bread and grape juice.
- [ ] Site choice: stage-1 pond on spare spot (3, 9) or (6, 9) (world (-5, 1), (-2, 1)) → `back`; pond on the first small spot or on `POND_BIG_SPOT` or no pond → `front`; decor or a plot on `front` → `back`; both taken → `null`.
- [ ] Placement tests for BOTH sites with the long footprint, following `tests/pond-spots.test.mjs` and `tests/shop-place.test.mjs`: clear of the stage-7 house (half width 3.95 plus 1.2), lake and dock pond, every `Vector3` place in `js/data/places.js` by 2.5, `PARK_BENCHES` and `RESTAURANT_SIGN` by 2.5 from the footprint edge, `MIST_GATE` by 10, inside `walkLimit`, museum stream, and the south sightline rule (no house or facility within `hz + 7` to the south and `hx + r` sideways).
- [ ] Owl clearance test: parse the courier `pos` from `js/data/npcs.js`; the owl's home must be outside every keep-out circle by at least `0.35 + NPC_R`; every point of the footprint must be inside some keep-out circle; a point 0.1 inside the footprint must fail the `npcBlocked` distance rule (`r + 0.35`).
- [ ] No-tree radius test: `TABLE_TREE_CLEAR` and `TABLE_SOUTH_CLEAR` are used by the site maths so that the cleared circle contains the footprint plus 2 on every side and the south band reaches 3 past the seats.

**What can go wrong / how it is caught:**
- Site `back` is exactly 10.0 from `MIST_GATE` and was only measured in a prototype; the placement test fails if any rule is broken. If it does, move the site by at most 1 and record the new numbers in the commit message (do not relax the rule).
- A 7th dish changing the site: locked by the "always long footprint" test.

**Verify:**
- [ ] `npm test` green; new tests fail first (write them before the code).
- [ ] Commit: `feat(table): pure rules for dishes, bite, cookbook and site choice`.

### Task 2: World: builder interface, lifecycle, keep-out, yard clearing, owl, ring, map

**Files:**
- Create: `js/table/build.js`, `js/table/index.js`, `js/table/copy.js` (prompt and toasts only in this task), `tests/table-wiring.test.mjs`, `tests/table-build.test.mjs`
- Modify: `js/pond/sign-build.js` (export the ring), `js/spaces/npc.js` (one predicate), `js/spaces/doors.js`, `js/world/map-snapshot.js`, `js/game.js` (wiring only), `js/i18n-en.js`, `docs/analysis/event-taxonomy.csv`, `tests/pond-sign.test.mjs` (only if the ring export changes an assertion)

**Interfaces:**
- `js/pond/sign-build.js`: `buildDashRing({ mergeGeos, reach })` → `{ mesh, update(dt, active, pulseT), dispose() }`; `buildPondSign` uses it with `SIGN_REACH` and looks exactly as today.
- `js/table/build.js`: `TABLE_STYLES` (registry object), `buildTable({ style, shape, dishes, mergeGeos, paintGeo })` → `{ group, setDishes(dishes), grow(sec), growing(), update(dt), dispose() }`. Contract for any style: origin at ground centre, long axis along x, footprint inside `TABLE_SHAPES[shape]`, plate slots exposed by the style as `slots(shape)` → `[{ x, y, z }]` (6 for round, 11 for long), plate rim colour by tier (gold, silver, white, white), at most 3 meshes, no text, no shadows cast by plates. This task ships one style `'plain'` (flat top, legs, simple seats) as a placeholder.
- `js/table/index.js`: `refreshTable(trigger)`, `updateTable(dt, inVillage)`, `tableExists()`, `tablePos()`, `tableNear()`, `tableDishCount()`, `tableMapKey()`, `tableSettling()`, `markTableRingSeen()`.
- `js/spaces/npc.js`: `setOwlNoFly(fn)` where `fn(ax, az, bx, bz)` returns true when a flight line must not be used; `owlLandingSpot` takes one more optional argument `avoidLine` and patrol calls (`:454`, `:476`) pass true, delivery calls (`:483`, `:550`, `:570`) do not.

**Requirements:**
- [ ] `refreshTable(trigger)` returns immediately when `spaceLinkOn(e3Decision())` is false. It computes `tableView`, picks the site with `tableSiteFor` (pond from `pondPos()` and `pondStage()`, decor from `outdoorRel()` in `js/pond/index.js:35`, plots from the village `plots`), and builds or rebuilds when site, shape or style changed; otherwise it only calls `setDishes`.
- [ ] Wiring calls: `refreshTable('cook')` in `kitchenFinish` right after `syncStory('cook')` (`js/game.js:5933`), `refreshTable('load')` right after `refreshPond('load')` (`js/game.js:3453`), `updateTable(dt, inVillage2())` next to `updatePond` (`js/game.js:6769`). `updateTable` re-runs the site choice when `pondMapKey()` changes, so a pond that takes or leaves a spare spot moves the table.
- [ ] Collider: `solidBox` over the table top and seats (`js/game.js:1820`), removed with `removeSolid` on teardown and switched `off` outside the village.
- [ ] Keep-out: push `tableKeepOut(...)` circles into `obstacles`, remove them on teardown. `setOwlNoFly((ax, az, bx, bz) => segmentHitsKeepOut(...))` while a table exists, `setOwlNoFly(null)` on teardown.
- [ ] Yard clearing on every build (load included): `clearYard(deps, x, z, r, treeR, TABLE_SOUTH_CLEAR)` from `js/pond/yard-clear.js` with `r = footprint radius + 0.6` and `treeR = footprint radius + TABLE_TREE_CLEAR`. No change to the scatter code in `js/game.js`.
- [ ] If a build throws, the table and its obstacles are fully removed and the game continues (the pond's rule from commit e96f7c60).
- [ ] Ground ring: `buildDashRing({ reach: TABLE_SHAPES[shape].reach })` centred on the table; `tableNear()` uses the same `reach`; gold while in range; one pulse the first time the table is in view and no guide, coach or modal is up (`signPulseDue`, flag `hintsSeen.tableRingSeen`). No signpost.
- [ ] Prompt: in `js/spaces/doors.js` before the pond lines, `if (!prompt && tableNear()) { $w.nearDoor = 'table'; prompt = TABLE_COPY.prompt; }`. The action line in `js/game.js` (`nearDoor === 'table'`) is wired in Task 3 with the window; this task tests only that `tableNear()` flips and the prompt shows.
- [ ] Created: the first time `has` becomes true, `trackEvent('table_created', { trigger, count })` using `shouldTrackCreated` (`js/pond/rules.js:68`; `trigger` is `'cook'`, or `'existing'` on load) and one toast after 4 s in the village (`pondToastDue`), then `hintsSeen.tableSeen = true`. Round to long: rebuild with a 2 s grow-in and one toast (`hintsSeen.tableLong`). No camera cut.
- [ ] No site free: no table, and one toast per session from `tableBlockedBy` when the player is in the village.
- [ ] Map: `mapSignature` gains `table`, wired with `tableMapKey()`; `settling` becomes `() => pondSettling() || tableSettling()`.
- [ ] Draft copy (`js/table/copy.js`): `prompt: '🍽️ 식탁'`, `created: '🍽️ 마당에 식탁이 생겼어요. 만든 요리가 올라가요'`, `long: '🍽️ 요리가 7가지가 됐어요. 긴 식탁으로 바뀌었어요'`, `blocked: { decor: '🪑 식탁 놓을 자리에 꾸미기가 있어요. 옮기면 식탁이 생겨요', plots: '🌱 식탁 놓을 자리에 밭이 있어요. 비우면 식탁이 생겨요' }`.

**What can go wrong / how it is caught:**
- Owl still reaches the table: headless run with the clock sped up; sample the owl's position every frame for 10 simulated minutes with the player parked far away, assert it is never perched or walking inside the footprint and never flying across it on a patrol; then stand next to the table with all daily quests done and confirm the delivery still arrives (it may cross the table in the air; record whether it did).
- Owl stuck with no landing spot: the same run asserts at least 5 completed patrols.
- Trees come back: fell every tree within 8 of the table before the save, reload, wait past the respawn time, count trees inside the cleared circle (must be 0). Repeat with the experiment off and assert the tree count there is unchanged.
- Invisible wall after teardown: walk a circle through the old site after forcing a move to the other site.
- Draw calls: `window.__perf()` with and without the table at 11 dishes; report both (target: at most +4).

**Verify:**
- [ ] `npm test` green.
- [ ] Captures under `dev/active/space-link-v2/`: `t2-front-{round,long}-{pc,mobile,land}.png`, `t2-back-long-{pc,mobile}.png`, `t2-front-long-house7-pc.png`, `t2-ring-{idle,active}-pc.png`, `t2-map-{front,back}-pc.png`, `t2-owl-path.png` (owl positions plotted over the footprint). Sizes 1280x800, 390x844, 844x390.
- [ ] Commit: `feat(table): yard table with keep-out, cleared yard and a ground ring`.

### Task 3: Windows, ads, tracking, copy, first-dish guide

**Files:**
- Create: `js/table/book-ui.js`, `js/table/guide-steps.js`, `tests/table-book-wiring.test.mjs`, `tests/table-copy.test.mjs`, `tests/table-guide.test.mjs`
- Modify: `js/table/copy.js`, `js/i18n-en.js`, `js/pond/yard-guide.js` (one more flow and one more `pointTo` kind), `js/guide/prepass-rules.js` (`REPEAT_SLOTS`), `js/tenjin-events.js` (`GROUP_RULES`), `tests/prepass-slots.test.mjs`, `tests/tenjin-events.test.mjs`, `docs/analysis/event-taxonomy.csv`, `js/game.js` (wiring: `tableBiteAdButton`, the `nearDoor === 'table'` line, guide deps)

**Interfaces:**
- `js/table/book-ui.js`: `openCookbook()`, `openBitePick()`, `takeBite(id, kind = 'free')` → boolean.
- `js/game.js`: `export function tableBiteAdButton(onDone)` next to `pondFeedAdButton` (`:2115`), same shape, slot `table_bite_more`; `if (nearDoor === 'table') return openCookbook();` next to `:7896`.
- `js/table/guide-steps.js`: `tableGuideReady({ on, has, done, tries, idleSec })`, `tableSteps(copy)` → three steps `table`, `bite`, `book`.

**Requirements:**
- [ ] Cookbook window = `openBook` from `js/hud/collection-book.js` with one section of 11 slots, count `got / 11`, `head` = the bite row, hint line under the grid. Opening calls `markTableRingSeen()`, sets `hintsSeen.cookbookSeen`, and fires `trackEvent('cookbook_open', { count })`.
- [ ] Slot tap, cooked: `{ico} {name}` with the grade name. Slot tap, empty: the ingredient line (`🥕 2/3` style pieces from `RES_LABEL` and the item icons, no sentence glue), plus the station hint when `station` is set, plus a go button "주방으로" that closes the window and points an arrow at `KITCHEN` (`js/data/places.js:21`) through `yardGuidePointTo('kitchen')`. No go button while `isOpen('kitchen')` is false; show the locked line instead.
- [ ] Shortfall ad in the hint area for an empty slot with missing ingredients: `guideShortAd('cook_ingredient', slot.short, rerender, CAFE_CAPS)` (`js/game.js:2108`). Not gated by `repeatOpen` (progress slot). After a grant the window re-renders with the same slot selected.
- [ ] Bite row: not bitten today → button "🥄 오늘의 한 입" opening the pick window; bitten → the "tomorrow" line plus `tableBiteAdButton` when `adLeft`.
- [ ] Pick window = `openBook` with the dishes on the table as slots; tapping one shows the buff name and seconds and a button "먹기".
- [ ] `takeBite`: re-check `biteStatus`; set `hintsSeen` with `afterBite` / `afterBiteAd`; `buffs[buff] = biteBuffEnd(buffs[buff], clock.elapsedTime, biteSeconds(tier))`; `emitBuffs()`; toast; `trackEvent('table_bite', { recipe, quality, kind })`; `requestSave()`. It must not touch `gameState.pantry`, must not call `eatDish`, and must not fire `cook_eat`.
- [ ] Slots: `table_bite_more` added to `REPEAT_SLOTS` and to the Tenjin `pond` group (`/^(pond_feed_more|table_bite_more)$/`); `cook_ingredient` added to the `cafe` group. Neither may map to `'other'`. The `prepass_eligible` description in the taxonomy lists both.
- [ ] Taxonomy rows: `table_created` (`trigger|count`), `cookbook_open` (`count`), `table_bite` (`recipe|quality|kind`), category `crafting`, feature `table`, tier 2, status `not_fired`.
- [ ] One-time guide on the first dish, run inside the existing yard guide (arbiter name `yard`, same HUD hiding and stall rule): flow `table_first`, steps `table` (arrow to the table, done when near or bitten), `bite` (done when bitten today), `book` (done when `cookbookSeen` was set after the bite). Starts only when the table exists, `hintsSeen.tableGuide` is unset, tries below 2, no modal (so it waits for the chapter 3 completion modal), 5 s idle in the village, and no other yard flow is running. `guide_step` fires through the existing `onStep`. Ends by setting `hintsSeen.tableGuide`. Players who already had dishes before the feature get the same guide once.
- [ ] Draft copy to add (all DRAFTS): `bookTitle: '📖 나의 요리책'`, `bookHint: '빈 칸을 누르면 필요한 재료가 보여요'`, `secDish: '요리'`, `goKitchen: '주방으로'`, `kitchenLocked: '🍳 주방이 열리면 만들 수 있어요'`, `station: { kiln: '🔥 밀가루는 화덕에 밀을 넣어 두면 다음 날 나와요', vat: '🫙 포도즙은 발효통에 포도를 넣어 두면 다음 날 나와요' }`, `biteBtn: '🥄 오늘의 한 입'`, `biteTitle: '🥄 오늘의 한 입'`, `biteHint: '먹을 요리를 하나 골라 주세요'`, `biteEat: '먹기'`, `biteLine: '{0}초 동안 힘이 나요'`, `biteDone: '🥄 한 입 먹었어요. 잠깐 힘이 나요'`, `bitToday: '오늘은 한 입 먹었어요. 내일 또 먹을 수 있어요'`, `adMore: '한 입 더'`, `stepTable: '🍽️ 마당에 식탁이 생겼어요. 가 보세요'`, `stepBite: '🥄 오늘의 한 입을 먹어 보세요'`, `stepBook: '📖 요리책에서 빈 칸을 눌러 보세요'`, `goStepKitchen: '🍳 주방으로 가 보세요'`.
- [ ] Copy test like `tests/pond-expand-copy.test.mjs`: exact strings, no em dash, no "놀", no arrow emoji, every string (with numbers filled in) has an English entry with no Korean left.

**What can go wrong / how it is caught:**
- A 30 s bite cutting a 150 s buff short: unit test on `biteBuffEnd` plus a headless check (eat a pantry dish, then bite the same buff, the chip must show more time, not less).
- The pantry losing a dish: wiring test asserts `book-ui.js` contains neither `pantry` nor `eatDish`; headless check compares `gameState.pantry` before and after.
- Double bite by double tap: headless double click, `table_bite` must be recorded once.
- Ad shown before the house is done or on the web: wiring test on `repeatOpen` and `rewarded?.offer('table_bite_more')`; headless check with and without `?prepass=1`.
- The guide colliding with the chapter modal or the pond guide: `tests/table-guide.test.mjs` on `tableGuideReady`; bot run that only follows the arrow from the kitchen to the table.
- Windows clipped on a landscape phone (11 slots plus two rows): capture at 844x390.

**Verify:**
- [ ] `npm test` green.
- [ ] Captures: `t3-book-{pc,mobile,land}.png`, `t3-book-empty-slot-mobile.png`, `t3-book-short-ad-mobile.png`, `t3-bite-pick-{pc,mobile,land}.png`, `t3-bite-done-pc.png`, `t3-bite-ad-mobile.png`, `t3-guide-{1,2,3}-pc.png`, `t3-book-en-mobile.png`.
- [ ] Recorded events from the instrumented stub: `table_created`, `cookbook_open`, `table_bite` (free and ad), `guide_step` ×3, `prepass_eligible` for both slots.
- [ ] Commit: `feat(table): cookbook and daily bite windows with rewarded slots and a first-dish guide`.

### Task 4: Neighbour view and SQL (not applied)

**Files:**
- Create: `sql/migrations/migrate_neighbor_table.sql`, `tests/neighbor-table.test.mjs`
- Modify: `js/neighbors/sanitize.js`, `js/neighbors/rules.js`, `js/neighbors/scene.js`

**Interfaces:**
- SQL: `public._nb_table(p_state jsonb) returns jsonb` → `{ "dishes": [{ "id": text, "tier": text }] }`; `neighbor_showcase` returns it under `'table'`.
- `js/neighbors/rules.js`: `neighborTable(table, pond, outdoor)` → `null | { dx, dz, shape, site }`.

**Requirements:**
- [ ] `_nb_table`: reads `p_state #> '{kitchen,best}'` only when it is an object; keeps the 11 recipe ids, numeric values above 0; tier by the same cuts (88, 65, 35); ordered by the recipe list; at most 11; `immutable`, `search_path` as in `_nb_pond`, `revoke all ... from public, anon, authenticated`.
- [ ] The file re-creates `neighbor_showcase` in full, starting from whichever definition is live. Before writing, diff the bodies in `migrate_neighbor_pond.sql`, `migrate_neighbors_room.sql` and the other `migrate_neighbors_*.sql` files and state in the file header which one it was based on and that older files must not be re-run afterwards.
- [ ] `sanitize.js`: `table.dishes` whitelisted (known recipe id, tier one of the four ids, de-duplicated, max 11); anything else → `{ dishes: [], has: false }`. An old server that sends no `table` shows no table.
- [ ] `scene.js`: builds the table with the same builder and `tableSiteFor` using the neighbour's pond and decor (no plots), no ring, no collider, no interaction; fixed trees and fence posts skip `tableCovers`.
- [ ] Tests: wrong types, unknown ids, a free-pot id, 12 entries, a missing field; site `back` stays inside the neighbour fence radius (17.2).

**What can go wrong / how it is caught:**
- Reverting the showcase body (room or pond fields lost): the test compares the key list of the new `jsonb_build_object` with the latest existing one and requires every old key plus `table`.
- Trees through the table in the neighbour yard: capture `t4-neighbor-{front,back}-pc.png` with a hand-made showcase payload.

**Verify:**
- [ ] `npm test` green. SQL is not executed anywhere.
- [ ] Commit: `feat(neighbors): show the visited yard table`.

### Task 5: The real table model (after the style is chosen)

**Files:**
- Modify: `js/table/build.js` (add the chosen style to `TABLE_STYLES`, make it the default), `tests/table-build.test.mjs`

**Requirements:**
- [ ] Blocked until the user picks from `sims/yard-table-sim.html` (A checked cloth, B bare wood, C parasol). If the mockup has to change, re-capture PC and mobile side by side first.
- [ ] The style follows the Task 2 contract unchanged (footprint, slots, at most 3 meshes, no text); a parasol must not hide the plates from the default camera or put bright white above the bloom threshold 0.85.
- [ ] Round and long variants; plates and rim colours come from the shared plate code, not from the style.
- [ ] The placeholder style stays in the registry for tests only.

**What can go wrong / how it is caught:**
- A bigger silhouette than the footprint (parasol, lantern): `tests/table-build.test.mjs` measures the built group's bounding box against `TABLE_SHAPES` for x and z; height is checked by capture from the south camera at both sites.
- Draw calls and night glow: `window.__perf()` and `t5-night-pc.png`.

**Verify:**
- [ ] Captures `t5-{round,long}-{day,night}-{pc,mobile}.png`, `t5-house7-pc.png`, `t5-neighbor-pc.png`.
- [ ] Commit: `feat(table): final table model`.

### Task 6: Review and docs

- [ ] Code review of the whole table diff; fix findings. Check specifically: experiment off leaves no mesh, no obstacle, no prompt, no event; teardown symmetry; nothing imported into the first-load bundle.
- [ ] Update `dev/active/space-link-v2/space-link-v2-tasks.md` and `-context.md` (Last Updated) with what shipped and what is left (style, copy review, production SQL, pre-registration note, 5-place deploy).

## Open questions for the user

1. Table style: A checked cloth, B bare wood or C parasol (`sims/yard-table-sim.html`).
2. All Korean strings above are drafts; please review them (including the action-button label "🍽️ 식탁").
3. Owl: the plan keeps the owl where it is and keeps its flight, and only forbids landing, walking and patrol lines over the table. A delivery to a player standing at the table may still pass over it in the air. Is that acceptable, or should deliveries also wait?
4. If decor or a tilled plot stands on both sites the plan shows no table and a one-line toast. Acceptable, or should the table push placement aside?
5. If the pond later takes or leaves a front-yard spare spot (decor moved, pond expanded), the table moves between the two sites on the next refresh. Acceptable?
6. Bite length is 30 s × grade only (21 to 45 s) and ignores the workbench pot bonus that pantry dishes get. Keep it that way?
7. The swap to the long table at dish 7 is a 2 s grow-in with a toast, not a camera cut (the spec says "컷"). Acceptable?
8. Neighbours see the table of anyone who has cooked, even if that neighbour's own device is in the experiment's control group (the pond already behaves this way). Keep?
9. `cook_ingredient` has no per-slot daily cap (only the global 30 a day, like `cafe_order`), and `table_bite_more` is counted in Tenjin's existing `pond` group. Confirm both.
