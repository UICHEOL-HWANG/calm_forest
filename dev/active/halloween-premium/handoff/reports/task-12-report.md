# Task 12 report — 🦇 bat wing (A) · 🧛 bat cape (C)

**Status: DONE_WITH_CONCERNS**
Commit: `8d4d0d5 feat: 🦇 bat wing and bat cape back items`

## What was ported (sims/halloween-tools-sim.html → js/cosmetics/art-bats.js)
| sim | port |
|---|---|
| `CAPE_C.wing`, `CAPE_C.bats` (B `spike` palette dropped) | `CAPE_C` constants in art-bats.js (`PALETTE` untouched) |
| `shellColors` (`out: lining, inn: face`, the sim's fix for the lining color showing outside) | same |
| `capeKit(k)` | `capeKit(k)`, with tail normalised by `tailType()` (see concern 1) |
| `collar` (band, cord, little pumpkin brooch) + `pumpkinGeo`/`pumpkin` | `collar()` + `pumpkinGeo()`. The pumpkin is **flat** clay here (smooth in the sim) so it joins the collar bucket |
| `wingCape` (A) | `buildBatWing(THREE, g, k, h)`: same lead/base/trail curves, rx 0.42 / 0.06 (stub), P1 ±1.95R, gap 0.05R, bones |
| `roundCape` (without the `spikes` branch) + `bat` + `batsCape` (C) | `roundCape()` + `bat()` + `buildBatCape(THREE, g, k, h)` |
| `batWingShape`, `ext` | local copies (same points as tool-skins-halloween.js) |
| `spikeCape` (B) | not ported |

New helpers in art-bats.js:
- `flatten(g)` bakes nested-group meshes (pumpkin group, pinned bat groups, bat wing groups) into geometry and lifts them to direct children of `g`. `mergeStatics` only looks at `g.children`, so without this the bats and pumpkin would never merge.
- `mergeShells` joins the two wing `clothShell` geometries into one vertex-colour mesh, so both wings cost one draw call.

art.js changes: imports `buildBatWing`/`buildBatCape`, adds `const h = { clay, put, P, clothShell }` before `BACK`, and adds `bat_wing:` / `bat_cape:` after `cape:`. Nothing else changed. art-bats.js does not import art.js or `three`.

## How k was mapped
The real `k = { id, R, HR, HY, bs, bodyY, tail, side, neckR }` (game.js:3353) is a superset of the sim's `k = { R, HR, HY, bs, bodyY, tail }`. The local frame is the same back anchor (`anchorY = bodyY + 0.30R`, `zc = 0.98·R·bs[2]`, same as `anchors.backAnchor` and `BACK.cape`), so every sim formula carries over unchanged. The one difference is `tail`: the game passes the object `{ type: 'bushy', … }`, while the sims pass a string. `tailType()` accepts both.

## TDD
- RED: `node --test tests/halloween-capes.test.mjs` gave `# tests 2  # pass 0  # fail 2` (ENOENT art-bats.js).
- GREEN: `node --test tests/halloween-capes.test.mjs tests/cosmetics-catalog.test.mjs tests/tool-skins.test.mjs` gave `# tests 30  # pass 30  # fail 0`.
- Full suite: `npm test` gave `# tests 1828  # pass 1828  # fail 0` (baseline 1826 plus the 2 new tests).
- I edited no existing tests. `tool-skins.test.mjs` has no cape–arm assertions, only `themeOf('cape') === null`, and it still passes.

## Numeric check against the confirmed sim
For this check I made a throwaway copy of the sim with A and C swapped for `buildCosmetic(THREE, 'bat_wing'|'bat_cape', k)`, ran it in headless Chrome, and deleted it afterwards. For each of fox, rabbit, cat and bear:
- **Cloth vertices are identical to the sim**: 1276 (A) and 1148 (C), max abs diff **0**. With an object-tail `k`, the diff is also 0.
- Bounding box of the non-cloth parts (collar, bones, pumpkin, bats) differs from the sim's by ≤3e-8.
- After `mergeStatics`: **A = 2 meshes / 2 draw calls** (cloth + flat clay); **C = 3 meshes / 3 draw calls** (cloth + flat clay + smooth clay bats). The sim reports 2 and 3. No nested groups are left.
- Because the wing geometry matches the sim vertex for vertex, the sim's wing–arm clearance (109–184% of arm thickness) carries over unchanged.

## Visual check
Headless Chrome screenshots of the copy at 1280×800 in back34, front34, side and back (rabbit+fox), compared with `look/cape-pc.png`, `cape-pc-front.png` and `cape-pc-back-rabbit.png`. A and C look the same as the confirmed captures, including the fox tail passing between the wings and up through the cape slit.

**Not checked:** the real game scene (game.js lighting, mobile layout, the character-select / shop try-on), the arm-swing wind-up pose itself (not reproducible outside the game), and night lighting.

## Self-review
- art-bats.js has 208 lines and art.js 587, both under 800. No placeholder comments, and no 톱니/jagged/serrated text.
- No tool swing or hold code was touched. `PALETTE` is unchanged.
- I kept the existing `clothShell` behaviour where the lining colour shows on the outside, using the sim's `out: lining, inn: face` compensation.

## Concerns
1. **Possible existing bug in `BACK.cape` (not fixed, art.js cape left unchanged):** in the game, `k.tail` is an object (`ANIMALS[].tail = { type, color, … }`, game.js:1303–1329 and 3353). `BACK.cape` tests `k.tail === 'bushy' || k.tail === 'long'`, which is never true in the game. The 🦸 cape probably uses the narrow vent (0.06) for 🦊 and 🐱 in game, so the tail may push through the cloth. cosmetic-sim passes strings, so the sim looks correct. The new items use `tailType()` and are not affected. Fixing `BACK.cape` needs a separate decision from the user.
2. **The bat eyes no longer glow:** in the sim they were emissive (night glow k 0.7). Cosmetics have no day/night glow path, and a constant emissive would add a draw call and glow by day. They are now plain yellow smooth clay.
3. **The brooch pumpkin is flat-shaded** (smooth in the sim), which saves one draw call on A (3 → 2). It is about 0.1 across and the difference is barely visible.
4. `batWingShape`, `ext` and `pumpkinGeo` are small local duplicates of the helpers in `tool-skins-halloween.js`'s `halloweenKit`. That kit needs the tool-skins `clay` signature, so I did not reuse it.
