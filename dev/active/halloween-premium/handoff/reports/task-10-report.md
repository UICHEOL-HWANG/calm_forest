# Task 10 report — 🧙 witch skins (classic hat · starry apprentice)

Status: DONE_WITH_CONCERNS (minor: draw-call counts 6/10 vs brief's ≈5/≈9; real-game check pending Task 13)
Commit: 51ba7d4 feat: 🧙 witch skins — classic hat and starry apprentice

## Implementation
`js/cosmetics/skin-witch.js` (194 lines) fills `applyWitchClassic(THREE, built)` / `applyWitchStarry(THREE, built)`.
It imports only from `./skin-kit.js` (`cached, headOf, bakeInto, put, onSurface, tubeGeo, grow, silhouette, drape`). There is no import from skin.js or skin-rules.js, and none was needed.

What was ported from the sim, and how:
- `HAT_FIT` / `fitOf`: ported verbatim (default y .50; rabbit y .70, z .30, tilt .38, s .70). Classic uses them.
- `witchStarry` set the rabbit perch inline (`rabbit ? 0.78 : 1.02`, …). I moved those values into a `PERCH_FIT` table (default elev 1.02, az .2, s .5; rabbit .78/.22/.46). The numbers are the sim's.
- `witchCone`: same lathe points, same bend and 32 segments. The felt material is created DoubleSide up front. The sim instead mutated `hat.material.side` on a shared material.
- `perch`: same math. The lift .97 and roll 0 that the sim passed are now defaults.
- `witchClassic`: cone, band (torus, z stretch 1.2), gold buckle, felt buckle hole, back cape (`drape` phi π±1.75, rows 36, cols 56), gold edge tube, collar torus and star brooch. All values match the sim.
- `witchStarry`: small cone (brimR 1.35, bendBack .5, h 2.1), pink band, glowing hat star, short cape (rows 28), trim, collar, crescent moon brooch, 8 cape stars (`CAPE_STARS` table, same phi/v pairs) and a back broom (A/B endpoints, stick, straw, tie). All values match the sim.
- `starGeo`, `lathe` and `bend` were copied locally, since only the witch module uses them.
- `witchPumpkin` was not ported.

How it was adapted to the real `built`:
- Animal id: `built.k.id`. game.js `buildAnimalMesh` returns `k: { id: a.id, R, HR, HY, bs, bodyY, … }`, and `applySpirit` in skin.js already reads `id` from `built.k`.
- Head: `headOf(g)` (part='head'). The game and the sim build it with the same `buildAnimalHead`, so the unit-head space (HR=1) matches. The hat is built in a parentless `wrap` and `bakeInto(head, wrap)`, the same pattern as the spirit sprout. If `head` is missing, the hat is skipped.
- Markers: every baked hat mesh gets `userData.part = 'skinhead'` (cone, band, buckle and hat star; the whole hat). The cape sheet, plus the baked collar, trim, brooch, moon, stars and broom, get `userData.part = 'skinback'`.
  - The brief's "body-hugging → no marker" case has no witch equivalent: the scarf belonged to the rejected pumpkin variant. The hat band sits on the hat, so it hides with the hat.
- Ownership: `bakeInto` → `own()` sets `skinOwned` and `skin`. The unbaked cape sheet uses a local `addSheet` that sets `skinOwned = true; skin = true`, the same as skin-ghost.js. The sheet keeps its index to avoid inflating the vertex count about 6x.
- Materials are module-cached through `cached('witch-…')`, one set per skin and colour. Nothing calls dispose.
- Bloom: the star emissive is 0xffc233 × 0.55, a linear luminance of about 0.33, which is below the 0.85 threshold (game.js:5304). Only the small star and moon faces use it.

## Draw calls (measured)
- Classic: **6**. Hat 3 (felt, band, gold) + cape sheet 1 + baked back 2 (cape-colour collar, trim plus brooch).
- Starry: **10**. Hat 3 + sheet 1 + baked back 6 (collar, trim, star, stick, straw, tie).

The brief says ≈5 and ≈9. Those figures are the sim's unique-material counts. Two things split the real build into extra meshes:
1. The hat (on head, skinhead) and the back pieces (on group, skinback) must be separate meshes.
2. The indexed cape sheet stays separate from its same-material collar.

To save one call in classic, I put the brooch on the trim material (same colour, roughness .5, no metalness) instead of the shiny gold. If you want exactly 5/9, there are two ways:
- Bake the cape sheet together with the collar. This costs about 12k non-indexed vertices.
- Give the broom tie the stick material.

## TDD evidence
- RED: `node --test tests/halloween-skin-witch.test.mjs` → `not ok 1 … # pass 0 # fail 1` (stub file).
- GREEN: `node --test tests/halloween-skin-witch.test.mjs tests/halloween-skin-ghost.test.mjs tests/halloween-skin-rules.test.mjs tests/skin-art.test.mjs` → `# tests 13 # pass 13 # fail 0`.
- Full suite: `npm test 2>&1 | grep -E "^# (tests|pass|fail)"` → `# tests 1823 # pass 1823 # fail 0`. The baseline was 1822; the +1 is the new witch test.

The witch test is the brief's exact test plus one extra assertion: `assert.doesNotMatch(src, /from '\.\/skin\.js'/)`, the cycle guard the controller asked for.

## Existing files edited and why
- `tests/halloween-skin-ghost.test.mjs`: added the same cycle-guard assertion (review follow-up a).
- `js/cosmetics/skin-kit.js`: added a one-line comment above `put` saying it is stage-only and should never `put` directly into `built.group`, only into a parentless stage consumed by `bakeInto` (follow-up b).

## Files changed
- js/cosmetics/skin-witch.js
- js/cosmetics/skin-kit.js (comment only)
- tests/halloween-skin-witch.test.mjs (new)
- tests/halloween-skin-ghost.test.mjs (+1 assertion)

## Visual self-check (throwaway, not committed, deleted)
I served the worktree with `scripts/serve.py 8140` and loaded a temporary page, `sims/_tmp-witch-check.html`. It built all 7 animals with the real `buildAnimalHead` plus a body sphere, using the game's ANIMALS dimensions, and applied both skins. I captured it with headless Chrome (swiftshader) from front, back and at night.

Findings:
- Silhouettes match the sim captures:
  - Classic: the rabbit's hat is small and tipped forward in front of the ears. Bear and panda ears poke through the brim, as accepted.
  - Starry: the small hat sits on the forehead, the cape shows 8 stars, and the broom shows behind the right hip and over the left shoulder.
- Logged counts for every animal: classic meshes=6, owned=6, skinhead=3, skinback=3; starry meshes=10, owned=10, skinhead=3, skinback=7.
- The server was killed after the check (curl afterwards returns 000) and the page was deleted.

## Concerns / not verifiable without the real game (Task 13)
- Draw-call counts are 6 and 10 against ≈5 and ≈9 (see above).
- The check used a body sphere, not the real `buildAnimalMesh` body. Not yet checked:
  - arms or held tools clipping through the cape;
  - the tail versus the cape and broom (fox bushy and cat long tails sit at the back, and the cape has no rear slit — the sim also had none);
  - the broom versus back anchors.
- `showSkinParts` hiding with head/back cosmetics equipped is not verified live. The markers are in place, and the rule is already tested in skin-rules.
- Bloom/glow at night in the real post-processing chain is not verified. The luminance numbers suggest it is below threshold.
