# Task 9 report — 👻 ghost skins (nightcap · cloud)

Status: DONE_WITH_CONCERNS (concerns are visual/in-game items for Task 13, listed below)
Commit: `76f4498 feat: 👻 ghost skins — nightcap and cloud`

## Implementation

### `js/cosmetics/skin-kit.js` (new leaf module, 121 lines, ruling R9)
The only import is `mergeGeos` from `./trail.js`. It does not import skin.js, so there is no import cycle.
- **Moved from skin.js (not duplicated):** `cache`/`cached`, `srgbSum`, `isDark`, `part`, `own`, `headOf`, `bakeInto`.
- **Kept in skin.js:** `skullOf`, `onEllipsoid`, `arcOn`, `stitches`. Only plush uses them, and ghost/witch don't need them. Keeping `skullOf` there also means the skin-art `=== 'skull'` assertion still holds without an edit.
- **New shared drape toolkit, ported from the sim** so that Task 10 witch can import it from the kit:
  - `silhouette(k, o)`: sim `silhouette`, line for line.
  - `drape(THREE, {...})`: sim `drape` plus a `cut(phi, y)` option. Quads where `cut` is true go to a second geometry, `geoCut`. Vertex normals are computed on the full grid before the split, so the seam has no shading step.
  - `tubeGeo` (sim `tube`), `grow`, `put` (sim `put` without the `skinPart` tagging), `onSurface`, `sstep`.
  - Every helper takes THREE as an argument.

### `js/cosmetics/skin.js`
- The local copies are gone. It now does `import { cached, isDark, part, own, headOf, bakeInto } from './skin-kit.js'`.
- Exports (`SKIN_IDS`, `applySkin`, `showSprout`, `showSkinParts`, `disposeSkin`) are unchanged.
- Spirit and plush behave the same; only the place the helpers come from changed.

### `js/cosmetics/skin-ghost.js` (153 lines)
It imports only from skin-kit.js.

**`applyGhostNightcap(THREE, built)`** is a port of sim `ghostNightcap` (around line 317).
- Uses the same silhouette (`body 1.16, flare 0, peak, peakH 2.75`), face window (`dy -0.06, hh 0.78, pw 0.72`), droop transform, drape parameters (`rows 56, hemFreq 11, hemAmp 0.05, fold 0.03`), trims and bow as the sim.
- **Sheet split:** quads above `yCut = peakY0 + 0.2·(peakTop − peakY0)` (about the head-top height, where the droop starts to show) go to `geoCut`. That mesh gets `userData.part = 'skinhead'`.
- **Pompom:** baked separately and also tagged `'skinhead'`.
- **Always visible:** the main sheet, the face-window trim, the hem trim and the neck bow.
- **Sheet meshes are not baked.** Each is a single geometry with one material, so it is added directly through `addSheet`, which sets `skinOwned`/`skin`. This keeps it indexed; baking would make it non-indexed and triple the vertices.
- **Materials** are module-cached:
  - `ghost-sheet`: 0xe6e3f0, emissive 0x4a4860 at 0.55, DoubleSide, roughness 0.96.
  - `ghost-nightcap-trim`: 0xcdbff0.
  - `ghost-nightcap-orange`: 0xf6a04d. The bow and pompom share it; the sim's 0.92 vs 0.95 roughness difference was dropped.
- **Draw calls:** +5 (sheet, hood tip, trim, bow, pompom) with 3 materials. The sim's "≈4" counted materials. The tip has to be its own mesh so it can be hidden, which accounts for the extra call.

**`applyGhostCloud(THREE, built)`** is a port of sim `ghostCloud` (around line 341).
- **Body recolour:** uses `userData.part` markers, not geometry guessing. Meshes with `'pupil'`, `'highlight'` or an `isDark` colour keep their material, the same rule as `applySpirit`. Every other character mesh, arms included, gets the cached translucent cloud material (0xf1ecff, emissive 0x8d7bd6 at 0.28, opacity 0.8, depthWrite false, castShadow false). Arms stay visible, so hands holding tools still show.
- **Rim shell:** the sim's `rimShell` picks "sphere radius ≥ 0.45". The port uses the `part === 'body' | 'skull'` markers instead (same result as the sim). The shells share the original geometry, so they get `skin = true` but not `skinOwned`.
- **Cloud skirt and curly tail:** two puff rings and the tapered tube tail, using the sim values. They are baked into one mesh with the cached `ghost-cloud-puff` material.
- **Draw calls:** +3 (puff 1 + rim shells 2); the sim reported ≈2 materials.

**Mapping from the sim's `a` to the real `built`:** `built.k` from `buildAnimalMesh` already has `{ id, R, HR, HY, bs, bodyY }`, the same fields as the sim's `g.userData.k`. I used them directly. The head is found with `headOf` / the `part === 'head'` marker. There are no geometric pupil checks.

## TDD evidence
- **RED:** `node --test tests/halloween-skin-ghost.test.mjs` gave `not ok 1 - 👻 유령 2종 — export · 표식 · 소유 표시`, `# pass 0`, `# fail 1`. The stub had no `skinhead`.
- **GREEN:** `node --test tests/halloween-skin-ghost.test.mjs tests/skin-art.test.mjs tests/skin-parts.test.mjs tests/halloween-skin-rules.test.mjs tests/skin-rules.test.mjs tests/skin-wiring.test.mjs` gave `# pass 31`, `# fail 0`.
- **Full suite:** `npm test 2>&1 | grep -E "^# (tests|pass|fail)"` gave `# tests 1822`, `# pass 1822`, `# fail 0`. That is the 1821 baseline plus the new test.

## Existing test edited
`tests/skin-art.test.mjs` had an assertion that skin.js imports `mergeGeos` from trail.js. `bakeInto` (and with it `mergeGeos`) moved to skin-kit.js. The assertion now checks two things: skin-kit.js imports `mergeGeos` from `./trail.js`, and skin.js imports `bakeInto` from `./skin-kit.js`. No other test was touched.

## Visual self-check (throwaway, deleted, not committed)
- **Setup:** I served the worktree with `scripts/serve.py 8130` and loaded a throwaway page. It built the sim-style approximate body with real `part` markers (`body`, `belly`) and the real `buildAnimalHead`, added a green stick on the right paw as a stand-in tool, then called the real `applySkin` and `showSkinParts`. I screenshotted it with headless Chrome (swiftshader) for all 7 animals × 2 skins, in day, night, back view, and with a head item equipped.
- **Runtime:** no errors. Nightcap: 5 skin meshes, all owned, 3 materials. Cloud: 3 skin meshes (1 owned), 2 materials.
- **Look:** matches the sim's B and C rows in `skin-animals-pc.png`. Hood droops back with the pompom, face window, orange bow and wavy hem. The cloud has the puff skirt, S-tail, lavender rim, and dark panda patches and eyes are kept. Ears poke through the hood as in the sim.
- **Head-item check:** with `equipped.head = 'cap'`, the hood tip and pompom hide. The sheet, bow and trims stay.

## Concerns / not verifiable without the real game (Task 13)
1. **Open hood top under a hat.** With the tip hidden, the remaining hood ends in an open ring about 0.8·HR wide at head-top height. Most hats should cover it, but I couldn't check real hat meshes. If a narrow hat leaves the ring visible, raise or lower `NIGHTCAP.tipFrom` (0.2).
2. **Bloom.** The sheet hex 0xe6e3f0 and cloud 0xf1ecff have a raw sRGB luma of about 0.90–0.93. I kept the sim values as the brief asked; the sim judged the rendered result to be under the 0.85 threshold. Please check in-game at night with bloom on.
3. **Real arm pose.** The game's arms use the `ARM_AIM` quaternions and swing; my check used the sim's static `rotation.z` pose. During swings, nightcap arms will pass through the static sheet. That is expected, since the sim has the same overlap.
4. **Order of applying the cloud.** The cloud recolours every character mesh that exists when `applySkin` runs. In `applyCharacter` and the preview, `applySkin` runs right after `buildAnimalMesh`, before tools or cosmetics are attached, so tools keep their own materials. If anything ever calls `applySkin` after a tool is attached to the hand, the tool would turn to cloud too. `applySpirit` has the same behaviour.
5. **Draw calls** are +5 for the nightcap, not ≈4, because the tip must be hideable. The cloud is +3.
6. **Dog collar.** The cloud turns the collar to cloud white because it isn't dark. The sim had no collar. This is the same behaviour as spirit.

## Files changed
- js/cosmetics/skin-kit.js (new)
- js/cosmetics/skin-ghost.js
- js/cosmetics/skin.js
- tests/halloween-skin-ghost.test.mjs (new)
- tests/skin-art.test.mjs (one assertion moved to the new location)

All files are well under 800 lines (skin-ghost 153, skin-kit 121, skin 208).

---

# Fix round — closing the hood top under a head item (Task 13 finding)

Status: DONE_WITH_CONCERNS
Commit: `2853200 fix: 👻 close the nightcap hood top when the tip hides under a head item`

## Defect
With a low head item worn (flower_crown, star_pin, leaf_band), the hood tip hid, as `part='skinhead'` requires. That left the drape's cut edge open, and the bare head showed through it from the game camera (`game-nightcap-headhole.png`).

## Fix
Changes are in `js/cosmetics/skin-kit.js` (`drape`) and `js/cosmetics/skin-ghost.js`.

- **Split by grid row instead of by quad centre.** `drape` now cuts by grid row (`cutRow`) rather than by a per-quad `cut(phi, y)` test. The old test could leave a jagged edge because hem waviness shifts each column's y slightly. The seam is now exactly one ring of grid vertices, `grid[cutRow]`.
  - Nightcap: `cutRow = round((yTop − yCut)/(yTop − hemY)·rows)`, using the same `yCut` as before (`tipFrom` 0.2).
- **New `cap` option.** When `cutRow` is set, `capIdx()` closes that ring with a low rounded dome. Its triangles go into the always-visible `idx`, never `idxCut`.
  - It is the same geometry and material as the main sheet, so there is no extra mesh, draw call or material.
  - The edge vertices are duplicated, so the cap's normals don't mix with the sheet's. Seam shading on the sheet and tip is unchanged.
- **Dome shape.**
  - Rings at radius ratio 1 → 0.9 → 0.7 → 0.42 → 0.18 → apex, lifted 0 → 0.36 → 0.68 → 0.90 → 0.98 → 1 × `capH`.
  - Steep at the edge and flat on top, so it reads as a soft round hood top.
  - Nightcap `capH = 0.28·HR`.
  - The dome rises only inward and upward from the cut ring, and stays inside the tip's narrowing, back-drooping cone. When the tip is shown the dome is hidden inside it.
  - The cap's edge only shares the seam line with the tip's base and is not coplanar with it, so there is no z-fighting.
- **Ears unchanged.** The sheet geometry below the cut is untouched, so ears still poke through the hood sides as in the sim.

## TDD
- **New test:** `tests/halloween-skin-ghost.test.mjs` test 2. It checks four things:
  - `drape` uses `cutRow`.
  - The cap triangles are pushed into `idx` (`idx.push(...capIdx(`), not `idxCut`.
  - The nightcap passes `cutRow` to `drape`.
  - `cap: HR * …` scales with head size.
- **RED:** `node --test tests/halloween-skin-ghost.test.mjs` gave `not ok 2`, `# pass 1`, `# fail 1`.
- **Test regex fixes:** two of my own new assertions were too strict for the implementation, so I loosened them without weakening the intent:
  - The `capIdx(` regex required a `)`.
  - The `cutRow:` check didn't allow shorthand `cutRow,`.
- **GREEN:** `# pass 2`, `# fail 0`.
- **Full suite:** `npm test` gave `# tests 1829`, `# pass 1829`, `# fail 0`. The baseline was 1828; one new test was added.

## Visual verification
- **Throwaway page** (served by `scripts/serve.py 8180`, headless Chrome, deleted afterwards). Fox, rabbit, cat, bear and chick, each with the tip shown and with it hidden, at camera pitch 41°, 70° (top-down), 15° and 8° and several yaws.
  - Tip hidden: the top is closed and rounded at every angle.
  - Tip shown: no cap pokes through the cone.
  - The first try was `capH` 0.2 with 3 rings. Its side profile looked like a flat chef's-hat crease, so I raised it to 0.28 with 4 rings.
- **Real game** at `http://localhost:8180/?dbg` (Playwright). I started as a guest, pushed the owned ids into `__state().cosmetics`, and set skin and items through the real ☰ → 캐릭터·꾸미기 → 캐릭터/옷장 UI. Combinations: fox + 화관, rabbit + 별 머리핀, cat + 나뭇잎 머리띠, bear + 화관, chick + 별 머리핀.
  - In all five the hood top is closed and no bare head shows.
  - Before/after composite: `dev/active/halloween-premium/look/game-nightcap-headhole-fixed.png` (committed).
- **Cleanup:** all temporary files and the server were removed or stopped.
  - Playwright MCP wrote its console/snapshot logs to `/Users/uicheol_hwang/calm_forest/.playwright-mcp/`. That is outside this worktree and gitignored in the main checkout; I didn't touch it.

## Concerns
1. **Low head items are now mostly covered by the hood.** Before, items like the flower crown were only visible *through* the hole; the sheet is wider than the head, so these items sit inside it. Now that the top is closed:
   - Fox and bear crowns are mostly hidden.
   - The cat's leaf band still shows across the face window.
   - The chick's star pin glow shows through on top.

   This is a product choice for the coordinator/user, not something I changed. Options: accept it, or treat the nightcap as occupying the head slot (e.g. hide or disallow head items while it's worn), or let low items sit on top of the cap.
2. **Small ridges on the cap top.** The 3 % fold wrinkle of the cut ring carries inward, so faint radial ridges show from straight above. It reads like gathered fabric, but please confirm.
3. **Draw calls unchanged** at +5 for the nightcap.
