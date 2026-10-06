# Task 11 report — 🦇 달밤 보라 · 🌽 수확제 tool sets + umbrellas

**Status:** DONE_WITH_CONCERNS (the concerns are about umbrella design approval, not correctness)
**Commit:** `7f80860 feat: 🌙🌽 batnight and harvest tool themes with umbrellas`

## What was ported, and from where
New file `js/cosmetics/tool-skins-halloween.js` (329 lines, one file, so no split was needed). It has three exports:
- `BT` and `HV` palettes, copied from the sim. I added `BT.stem` (0x6b8f3c), the pumpkin stem colour the sim passed inline every time.
- `halloweenKit(THREE, K)`: helpers that existed only in the sim, ported 1:1.
  - `batWingShape`, `batSilShape`, `pumpkin`, `carved`, `twine`, `strawKnob`, `patch`, `cob`, `strawHat`.
  - `pumpkinGeo` and `cobGeo` lost their caches, because `bake()` disposes the source geometries.
  - `FACE` became `faceShapes()`.
  - Three helpers already exist in kit with different signatures, so I gave the sim versions new names:
    - `handleWith`: the kit `handle` plus a `knobFn`.
    - `rodFrameWith`: the kit `rodFrame` plus a `knobFn`.
    - `leafCollar`: the kit `calyx` with a colour argument.
- `halloweenThemes(THREE, K)`: returns `{ batnight: {9 tools}, harvest: {9 tools} }`.
  - Each tool is ported from the sim's `BUILD.bat.*` / `BUILD.harvest.*`, with `batHandle`, `starGlow` and `hvHandle` kept as local closures.
  - These kit helpers are reused unchanged: `clay`, `M`, `V`, `starShape`, `petalShape`, `crescentShape`, `roundBlade`, `ext`, `pickArms`, `sickleBlade`, `netBag`.
  - The one visual difference: the net bag uses `K.netBag` (smooth shading), like the existing themes. The sim's `netBagC` was flat.

`tool-skins.js` changes:
- The import.
- `...halloweenThemes(THREE, K)` in `themeBuilders`.
- `UMBRELLAS.batnight` and `UMBRELLAS.harvest`, using exactly the parameters in the brief.
- A small `onCanopy()` placement helper inside `buildUmbrella`: local +z is the surface normal and +y points toward the apex, so flat decals sit upright along a gore.
- `batnight` and `harvest` entries in the `look` table.

`tool-skin-rules.js`: `TOOL_THEMES` now has 5 themes.

Grip, swing and hold were not touched. The new file doesn't mention the grip/motion constants or the swing, and has no `three` import. Grip contract: origin = grip point.

## Umbrella design (no prototype, per the brief)
- **batnight** (N8, R1.08, th0.86, tip −0.05, twist π/8):
  - Gores alternate vio and plum. Inner is lilac 0xd9cff4 (BackSide, lift 0.3).
  - The tip −0.05 gives pointed rib ends, which read as a bat-wing edge. An orange bead sits on every rib tip.
  - A large night-coloured bat silhouette on gores 1 and 5.
  - Glowing gold stars on gores 0, 2, 4 and 6, in different sizes, with glow k 0.9 on the stars only.
  - Finial is a small pumpkin. The shaft is plum with an orange band and a night-coloured J hook.
  - 4 draw calls.
- **harvest** (N6, R1.0, th1.0, overlap 1.2, layer):
  - Gores alternate straw and strawD. Inner is cream (lift 0.35).
  - Three patches (red, blue, red) with x stitches, only on the non-lifted gores to avoid z-fighting.
  - A rope band ring around the apex.
  - Finial is a corn cob. The wooden shaft has a 2-ring rope twine and a dark wood hook.
  - No glow. 2 draw calls.
- Screenshots (3 angles each, day) for the user to approve:
  - `dev/active/halloween-premium/look/umbrella-batnight.png`
  - `dev/active/halloween-premium/look/umbrella-harvest.png`
- I also checked the night render: only the stars glow, and the canopy stays dark.

## TDD evidence
- RED: `node --test tests/halloween-tool-skins.test.mjs tests/tool-skins.test.mjs` gave `# tests 21 / # pass 17 / # fail 4`. The failures were the 3 new tests and the updated TOOL_THEMES test.
- GREEN: `node --test tests/halloween-tool-skins.test.mjs tests/tool-skins.test.mjs tests/tool-grip.test.mjs tests/tool-tiers.test.mjs tests/tool-blueprints.test.mjs` gave `# tests 70 / # pass 70 / # fail 0`. The grip and swing tests are unchanged and pass.
- Full suite: `npm test` gave `# tests 1826 / # pass 1826 / # fail 0` (baseline 1823 + 3 new).

## Draw calls measured (real module, `buildToolSkin` → baked `children.length`)
| tool | batnight | harvest |
|---|---|---|
| axe | 3 | 1 |
| hoe | 3 | 1 |
| seed | 4 | 3 |
| water | 5 | 1 |
| sickle | 3 | 1 |
| shovel | 3 | 2 |
| hammer | 3 | 1 |
| rod | 3 | 1 |
| net | 4 | 2 |
| **avg / max** | **3.4 / 5** | **1.4 / 3** |
| umbrella | 4 | 2 |

These match the sim's own stats (3.4 / 5 and 1.4 / 3), and every tool is within the ≤ 5 cap. batnight water is at the cap because the potion surface (DoubleSide glow) and the bubbles (FrontSide glow) land in separate buckets.

## Existing tests edited
`tests/tool-skins.test.mjs`: only the `TOOL_THEMES` expectation changed (now 5 themes; test title updated). Nothing else failed. The price-ids, REVEAL_COPY and i18n tests still enumerate only the 3 original ids, and I left them alone because they are outside this task.

## Visual self-check
I served the worktree with `scripts/serve.py 8150` and rendered a throwaway page (`sims/_t11-check.html`, deleted, not committed) in headless Chrome using the real modules. I compared it with `tools-all-pc-day.png` and `tools-all-pc-night.png`. The silhouettes, colours and decorations of all 18 tools match the B and C rows, and the night glow is limited to the stars, the hoe's pumpkin face and the potion. I killed the server afterwards. I also checked that the existing moon umbrella still renders as before.

## Self-review
- The new file is under 800 lines and has no leftover placeholder comments.
- I did not change the pre-existing `shroom`, `moon` or `bloom` builders or `bake()`.
- `halloweenKit` is built for every `buildUmbrella` call, including old themes. It only creates closures, so the cost is negligible.

## Concerns and what I could not verify
1. **The sim has umbrella prototypes for B and C, which the brief says don't exist.** `sims/halloween-tools-sim.html` contains `UMB.bat` and `UMB.harvest`, captured in `look/umbrella-pc.png`, and they differ from the brief:
   - bat: N6 layered petal shape, tip 0.12, pumpkin finial.
   - harvest: N10, R1.35, th0.62 flat straw hat shape, red ties, cob finial.
   
   I followed the brief's explicit parameters and borrowed the sim's finial and decoration ideas (pumpkin finial, orange tip beads, cob finial, rope). The user should compare the new PNGs with `umbrella-pc.png` before approving.
2. Because the brief's batnight parameters are close to the moon umbrella's (N8, twist, negative tip), the two share a silhouette. The difference comes from colour, the bats and the pumpkin finial.
3. batnight potion glow (k 0.6 on an 8.8 cm disc) comes straight from the confirmed sim. Whether it stays under the in-game bloom threshold of 0.85 needs a real-game night check.
4. Not verified in the real game (Task 13): holding and swinging, the umbrella in rain (hold, fade, tilt), and in-game draw-call totals (Task 14).
5. The header comment in `tool-skins.js` still says "도구 9종 × 3테마". I left it unchanged to keep the diff minimal.

---

# Fix round 1 (review findings, ruling R10: the sim is the authority for the umbrellas)
**Commit:** `8c8f6c5 fix: 🎃 port batnight/harvest umbrellas from the confirmed sim and tighten theme tests`

## IMPORTANT 1: umbrellas re-ported from `UMB.bat` / `UMB.harvest` (sims/halloween-tools-sim.html ~1014–1022)
I checked every value against the sim source myself, and they match the reviewer's list.
- **batnight**
  - Params: `{ N: 6, R: 1.0, th: 0.92, overlap: 1.28, layer: true, shape: { w: v => 0.42 + 0.58*sin(π*min(1, 0.12 + v*0.88)), tip: 0.12 } }`, no twist.
  - Gores: outer `k%2 ? BT.plum : BT.vio`; inner `0xd9cff4` BackSide (game `lift: 0.3` kept).
  - Shaft: `Cylinder(0.022, 0.028, L, 7)` in plum, plus `jHook(BT.night, 0.07)`. The orange band is gone.
  - Deco: one orange `Sphere(0.022, 6, 5)` per gore at `surf(R, th*1.1, 0)`.
  - Finial: `pumpkin(c, 0.05, 0, 0.04, 0)`, whose defaults are BT.orange and stem 0x6b8f3c (the sim's values).
- **harvest**
  - Params: `{ N: 10, R: 1.35, th: 0.62, overlap: 1, shape: { w: () => 1, tip: 0 } }`, not layered.
  - Gores: outer straw/strawD; inner HV.cream BackSide (lift 0.35).
  - Shaft: unchanged (wood cylinder, 2-ring twine at L−0.5, woodD hook).
  - Deco: a red `Box(0.03, 0.03, 0.2)` tie on even gores at `surf(R*1.003, 0.31, 0)`.
  - Finial: `cob(c, 0, 0.1, 0, 0.16, 0.04, 0.028, 3)`. The patches and rope ring are gone.
- I replaced the stale "시안 없이 … 설계" comment with a pointer to `UMB.bat` / `UMB.harvest` and `look/umbrella-pc.png`.
- I re-rendered both umbrellas with a throwaway page (deleted), using headless Chrome and `scripts/serve.py 8151` (killed afterwards). The new files overwrite `look/umbrella-batnight.png` and `look/umbrella-harvest.png`, and they match the B/C umbrellas in `umbrella-pc.png`: purple petal canopy with orange tip beads and a pumpkin finial; flat straw hat canopy with red ties, rope on the shaft and a corn finial.
- New draw calls: **batnight umbrella 3** (was 4), **harvest umbrella 2**.

## IMPORTANT 2: floating bat decals
They are gone, along with `onCanopy`, the canopy stars and the orange band. `grep onCanopy|batSilShape|patch js/cosmetics/tool-skins.js` now returns nothing. `batSilShape` and `patch` are still used by the tool builders (batnight seed/shovel embossing, harvest patches) in `tool-skins-halloween.js`, so they are live code there, not dead code.

## Minors
- `tests/halloween-tool-skins.test.mjs` changes:
  - The source is sliced into a `batnight: {` block and a `harvest: {` block, and each block must contain all 9 `tool(g)` builders.
  - The `UMBRELLAS` assertions are anchored on `const UMBRELLAS = {` … `\n};`, for both themes.
  - Mutation check: renaming harvest `net(g)` to `nett(g)` made the test fail with `'harvest.net'`. I restored the file with `git checkout` (it had no other changes).
- The header comment in `tool-skins.js` now says "도구 9종 × 5테마(🎃 할로윈 2종 포함)".
- I left the potion glow (k 0.6) as instructed; Task 13 decides it.

## Test evidence
- `node --test tests/halloween-tool-skins.test.mjs tests/tool-skins.test.mjs tests/tool-grip.test.mjs tests/tool-tiers.test.mjs tests/tool-blueprints.test.mjs` gave `# tests 70 / # pass 70 / # fail 0`.
- `npm test` gave `# tests 1826 / # pass 1826 / # fail 0`.

## Remaining concerns
- In the top-down view of the batnight umbrella, small light streaks show where the layered petal gores overlap (the inner surface peeks through). The sim capture has similar light specks, so this is inherited from the confirmed design.
- Not checked in the real game yet (Task 13): holding, swinging, and the umbrella in rain.
