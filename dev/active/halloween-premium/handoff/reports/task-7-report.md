# Task 7 report — 걷는 자국 2종 (🎃 pumpkin_glow · 🦇 bat_swirl)

**Status:** DONE_WITH_CONCERNS · commit `bd6d056` feat: 🎃🦇 pumpkin_glow and bat_swirl trails (marks, embers, bat sprites)

## Implementation
- `js/cosmetics/trail-fx.js`
  - `FX_IDS` adds `pumpkin_glow`, `bat_swirl`; `EMBER_HEX 0xff9a3c`, `MOON_HEX 0xdcd2ff`.
  - New `spawnBat(pos, rnd)` (exact brief values). `particleStep` has a bat branch (helix: radius r0→r1, angle phase + k·turns·2π, rises vy). `alphaOf` bat = `min(1, age*4)*fade`.
  - `createTrailFx`: the old Points is renamed `dots`. `createBatSprites(THREE, {cap:16})` is added. `points = new THREE.Group()` holds dots + bat Points. `onStamp` handles both ids: pumpkin gives 2 embers; bat gives 1 bat + 2 moon-dust sparks. `update` splits the particles: dots go through the old path, bats go to `bats.setBats(list+alpha, nightLevel)`. `clear()` empties both.
  - **Addition beyond the brief:** a `dispose()` key on the return value (the other keys are unchanged). I needed it because `trail-walk.js` used to dispose `fx.points.geometry/material` directly, and that would throw now that `points` is a Group.
- `js/cosmetics/trail-fx-sprites.js` (new, 124 lines). It ports the sim's `drawBat` (verbatim), `makeAtlas` and `makePoints`. The sim's globals are now parameters (THREE is an argument, no `import 'three'`). The atlas holds the 4 flap frames (`FLAP`) drawn in style `ST_B`, the pastel bat from 시안 B. The fnStar frame is dropped because the brief renders moon dust as dot sparks.
  - The per-bat sprite params come from `helixCell`: flap frame `floor((age*9+phase)%4)`, tilt `-cos(ang)*0.25`, grow `outBack(age/0.25)`, depth `sin(ang)` scales size (0.88+0.12d) and alpha (0.85+0.15d).
  - **uScale:** the sim set it by hand from the canvas height. Here `points.onBeforeRender` computes `drawingBufferHeight / (2·tan(fov/2))` from whichever renderer and camera are drawing it (game, shop walk preview, purchase reveal). Orthographic cameras keep the default.
  - **Colour pipeline:** the atlas is `SRGBColorSpace` and the shader ends with `#include <colorspace_fragment>`. That keeps it correct both when drawing straight to screen and inside the game's EffectComposer → OutputPass (ACES).
  - **Bloom:** a vertex-colour multiplier `BAT_LUMA` (0.84 by day, 0.78 at night) keeps the white belly and eyes under the 0.85 threshold. Uses NormalBlending, `depthWrite=false`, `frustumCulled=false`. `dispose()` frees the geometry, material and atlas.
- `js/cosmetics/trail.js`
  - `pumpkin_glow: (g, s, o)` ports `pumpkinGeo`:
    - Body: the vertex-deform loop on `SphereGeometry(s*0.62, 14, 10)`, with `night=false`. Its lobe/underside shade is stored as a 3-channel color attribute.
    - Stem: a cylinder in 0x5f8f4a.
    - Face: the eye triangles and smile band, as in the sim. Each piece is a `ShapeGeometry` whose vertices are pushed onto the body surface with the sim's `ez`.
    - Warm ground disc: `film(0xffa347, o*0.25)`, radius s·1.1.
    - Sim sizes (R 0.07) are scaled by `u = R/0.07`. Colours follow the brief: body 0xe8863a, face 0xffd27a.
  - Note: the sim loop uses `cos(th*7)`, which gives **7 lobes**. The brief says "6결". I copied the loop as written.
  - `bat_swirl: (g, s, o)` is exactly as in the brief.
  - **`paintRGBA` (private, used by `bake`):** if a geometry already has a `color` attribute, it now multiplies the material colour by it. Without this, bake overwrote the pumpkin's lobe shading. No other mark carries a color attribute, so the other marks render the same as before.
  - Both entries sit at the end of the table, after `sprout`. Putting them between `firefly` and `rainbow` would break the regex in trail-marks.test.
- `js/cosmetics/trail-walk.js`: dispose now calls `fx.dispose()`.
- `js/shop/purchase-reveal.js` `disposeTree`: added a line `m.material.uniforms?.map?.value?.dispose()`, so the bat atlas is not leaked on every reveal.

## TDD evidence
- RED: `node --test tests/halloween-trail.test.mjs` → `SyntaxError: ... does not provide an export named 'spawnBat'`, `# pass 0 / # fail 1`.
- After the implementation, the brief's step-4 set (`halloween-trail, trail-fx, trail-marks, trail-fx-wiring, trail-walk`) gave `# pass 27 / # fail 1`. The failure was trail-fx.test "onStamp — step…": its fake THREE had no `Group` or `ShaderMaterial`.
- GREEN: the same set → `# pass 28 / # fail 0`.
- Full suite: `npm test 2>&1 | grep -E "^# (tests|pass|fail)"` → `# tests 1814 / # pass 1814 / # fail 0` (baseline 1810, plus the 4 new tests).

## Existing tests edited
- `tests/trail-fx.test.mjs` (one test), to match the Group contract only:
  - Its fake THREE gains `Group`, `ShaderMaterial`, `Vector2`, `SRGBColorSpace` and `LinearFilter`.
  - The fake 2D context became a no-op Proxy, because drawBat calls many path methods.
  - The RGBA assertion now reads `fx.points.children[0]` (the dots). One assertion was added: the bat Points has `aFrame`.

## Visual check (what was and wasn't verified)
- I made a throwaway page that imports the real modules: buildTrailMark plus createTrailFx, run on a fixed-step clock with sim-like lights and ACES. I captured it with headless Chrome (SwiftShader) over `scripts/serve.py 8120` in this worktree. Afterwards I deleted the page and killed the server; nothing was committed.
  - Pumpkins: the lobed body, green stem, triangle eyes and smile all render and read like 시안 A by day. Embers rise.
  - Bats: the pastel flapping bat sprites render with the right atlas frames and orientation. They are not clipped or mis-scaled, and the moon dust shows.
- **Not verified:**
  - The real game scene: game camera distance, bloom/grade passes, fog, and real night lighting.
  - The shop walk preview and the purchase reveal.
  - Mobile.
  - Draw-call counts measured in the game.
  - These are left for Task 13 (`sims/halloween-verify.html`).

## Concerns
1. **Pumpkins don't glow at night.** The baked mark uses the shared lit `MeshStandardMaterial`, and the brief says not to add material kinds. At night the pumpkin and its face therefore go dark and dull. In the sim they glowed, because it used a MeshBasic material plus a halo sprite (`trail-pc-night.png`). The only glow left is the additive ember sparks. If the night look must match, someone needs to decide on it, for example a small emissive halo dot per stamp in trail-fx, or an emissive term on the pumpkin's material. Check this in Task 13.
2. **Bats may fly out of frame.** Their motion uses the brief's `spawnBat` values (rise ≈1–1.6 world units, radius up to 0.54, size 0.3), which are about 3× larger than the sim's helix (rise 0.42, r ≤0.13, size 0.19). In my test framing they flew out of view quickly. That is probably fine at game camera distance, but in the close shop preview they may leave the frame. Tune in Task 13 if needed.
3. **Lobe count:** the code has 7 lobes, as in the sim; the brief says 6.
4. `createTrailFx` has a new `dispose()` return key, and two callers outside the brief's file list changed for it: `trail-walk.js` (needed, otherwise it throws) and `purchase-reveal.js` (one line, to free the atlas).
5. The brief's commit template carried a "Claude Sonnet 5.5" trailer. I used the session's required "Claude Opus 5.5" Co-Authored-By trailer.

## Files changed
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/js/cosmetics/trail-fx-sprites.js (new)
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/js/cosmetics/trail-fx.js
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/js/cosmetics/trail.js
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/js/cosmetics/trail-walk.js
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/js/shop/purchase-reveal.js
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/tests/halloween-trail.test.mjs (new)
- /Users/uicheol_hwang/calm_forest/.claude/worktrees/halloween-premium/tests/trail-fx.test.mjs

## Self-review
- No placeholder comments are left. The files are 253, 152 and 124 lines, and the comments are in Korean in the codebase's style.
- Firefly, rainbow and the coin trails take the same code paths as before. The only shared change is `paintRGBA` multiplying by a color attribute that none of those geometries carry.
- `game.js` callers still work: `scene.add(trailFx.points)` and `.parent` operate on the Group. three skips a Points with drawRange 0, so with no bats there is no extra draw call.

---

# Fix round 1 — commit `4eee506` fix: 🎃 pumpkin night halo, 🦇 bat swirl at sim scale, keep newest bats

## IMPORTANT 1 — pumpkin night glow (ruling R7)
- `trail-fx.js`: new pure function `spawnHalo(pos, rnd)`.
  - It is a stationary particle (`kind: 'halo'`, vy 0, no sway) at y +0.03, colour `HALO_HEX 0xff9628`.
  - `life = TRAIL_FADE` (1.2 s), imported from trail.js, so it fades together with the mark.
  - `onStamp('pumpkin_glow')` pushes one halo plus the 2 embers through the existing `push`, so the dots `cap` still applies.
- Brightness: `alphaOf` for a halo is `fade × (0.88 + 0.12·sin(13t))`, times 0.75 at night or 0.55 by day. The flicker comes from the sim.
- Per-point size in the **existing** dots Points (no new material kind, no extra draw call):
  - The dots now carry an `aSizeK` attribute.
  - `mat.onBeforeCompile` replaces `gl_PointSize = size;` with `gl_PointSize = size * aSizeK;`. I checked that this line exists in the three r160 points vertex shader.
  - Only halos get k ≠ 1: `(0.36/0.22) · outBack(age/0.32)`, i.e. the sim's 0.36·pop. Every firefly, rainbow and ember point keeps k = 1, so they render at the same size as before.
- **Draw order (needed for the glow to read):** headless night captures showed the halo hidden behind the pumpkin about half the time. Transparent objects are sorted by distance, and the dots' Group sits at the world origin. The sim draws its halo at renderOrder 5, on top of the pumpkin.
  - So `buildTrailMark` now sets the baked mesh's renderOrder from a table, `MARK_ORDER = { pumpkin_glow: -1 }`. Pumpkin marks are always drawn before the particles.
  - Only pumpkin marks change. Firefly, rainbow and the dots keep renderOrder 0.

## IMPORTANT 2 — bat helix at sim scale
- `spawnBat(pos, rnd, dir = 1)` → life 2.4, size 0.19, base y +0.06, with a `by` field.
- `particleStep` (bat) now derives position from age instead of integrating vy·dt:
  - θ = phase + dir·age·5.2
  - r = 0.05 + 0.08k
  - x = bx + cos θ·r
  - z = bz + sin θ·r·0.7
  - y = by + 0.06 + 0.42·k^0.75
- The bat fade is the sim's `fadeOut(b, 0.7)`; the entrance is the outBack grow in the sprite.
- Spin direction alternates on each stamp (`batDir`), like the sim's `dir: side`. The sprite tilt uses `-cos θ·dir·0.25`, and the angle comes from the exported `batAngle(p)`, so motion and sprite share one formula.
- **Second bug found while checking at night:** bat sprite size used the drawing-buffer height. It now uses `renderer.getCurrentViewport().w`, the height of the viewport actually being drawn. Before, bats came out ×2 when a canvas is split into several views. The game and the shop preview each draw full-canvas, so they look the same either way, but the viewport is the correct value.

## MINOR — keep the newest bats
- `setBats` now draws `list.slice(-cap)` when the list overflows, so the oldest bats are dropped instead of the newest.

## Tests (RED → GREEN)
- RED: three new tests in `tests/halloween-trail.test.mjs` → `SyntaxError: ... no export named 'spawnHalo'` (`# pass 0 / # fail 1`). They cover:
  - Bats stay at sim scale: radius ≤ 0.14, height ≤ 0.5, size ≤ 0.2, and `dir` can be passed.
  - The halo stays in place, its life equals `TRAIL_FADE`, and it ends with null.
  - `aSizeK` and `gl_PointSize = size * aSizeK` are present, and `list.slice(-cap)` is used.
- The original four brief tests are unchanged and still pass with the new bat motion: y rises, the offset from base is non-zero, and particleStep returns null at end of life.
- GREEN: the covering set (`halloween-trail, trail-fx, trail-marks, trail-fx-wiring, trail-walk`) → 31 pass / 0 fail after the code fix. After the viewport change, the trail-fx fake THREE needed `Vector4` in place of `Vector2`.
- Full suite: `# tests 1817 / # pass 1817 / # fail 0`.

## Visual check (headless Chrome, real modules, throwaway page deleted, server stopped)
- Grid of four views, all with the shop camera (`WALK_CAM`, fov 32, aspect 1):
  - Top row: the real shop ✨ walk preview, using `makeTrailWalk` and the shop lights.
  - Bottom row: game-like **night**, with additive fx and the sim's night lights.
- **Bats:** now about the sim's size. They spiral close to the footprints, and in the shop preview they stay inside the frame. Moon dust shows.
- **Pumpkins at night:**
  - The warm halo now sits over each pumpkin, and the pumpkins read as lit orange lanterns, which is much closer to `trail-pc-night.png`.
  - They are still dimmer than the sim, because the sim's pumpkin is unlit (MeshBasic) while the game mark is lit. The face is less legible at night than in the sim.
  - The night halo alpha is still the ruling's 0.75.
- Remaining differences and limits:
  - Embers render at the shared dot size 0.22, which is larger and softer than the sim's 0.04–0.06 embers. I left them unchanged, since only the halo was in scope. They could use `aSizeK` (about 0.25) if wanted.
  - Not verified in the full game (bloom, grade, fog, real night lights) or on mobile. Left for Task 13.

## Files (fix round)
- js/cosmetics/trail-fx.js
- js/cosmetics/trail-fx-sprites.js
- js/cosmetics/trail.js (MARK_ORDER)
- tests/halloween-trail.test.mjs
- tests/trail-fx.test.mjs (fake THREE: Vector4)
