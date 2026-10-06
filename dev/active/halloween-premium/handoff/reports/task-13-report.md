# Task 13 report — real-module verify page + in-game smoke (2026-10-06)

Status: DONE_WITH_CONCERNS

## What was done
- `sims/halloween-verify.html` — imports the real modules (buildTrailMark + createTrailFx with a fixed-step clock, buildToolSkin ×9 + buildUmbrella + setToolSkinNight, buildCosmetic bat_wing/bat_cape with a cosmetic-sim style `anchorsOf` k). Game tone mapping (ACES 1.05) + game bloom (threshold 0.85, radius 0.9, strength 0.5 day / 1.0 night). Query `?scene=trail|tools|cape&mode=day|night&t=3.1&bloom=0`. Console: 0 errors in all 12 captures (only swiftshader "GPU stall due to ReadPixels" perf notices).
- Captures `look/verify-{trail,tools,cape}-{pc,mo}-{day,night}.png` (12) + `verify-trail-close-{pumpkin,bat}-night.png`.
- In-game smoke on `http://localhost:8170/?dbg&weather=…&time=…` (served from this worktree, headless Chromium via Playwright, Supabase/GA/Paddle requests blocked → offline guest, dev session). `window.__state()` does not exist in this build; used `await import('/js/game.js')` (same module instance) → `gameState` live binding + `applyCosmetics`, `setHeldTool`, `doPlayerAction`, `buildCharacterMesh`. Granting by replacing `gameState.cosmetics` (owned list) **did** show the items in ☰→🐾→옷장 and equipping via the wardrobe rows worked (`game-wardrobe-nightcap.png`). No game code edited for the smoke; `Date.now` overridden only in the browser console.
- Many-animal skin/item checks use the game's own `buildCharacterMesh(id, cos)` rendered in an overlay with the game's tone mapping + bloom (real builder, real skin/cosmetic code).
- 35 PNGs in `dev/active/halloween-premium/look/` (verify-* 14, game-* 21; several are 2×2 contact sheets).

## A–G checklist

| # | Check | Result | Evidence |
|---|---|---|---|
| A1 | pumpkin_glow night — halo visible, readable as a lantern (vs look/trail-pc-night.png A) | **FAIL** | game-trails.png (bottom-left), verify-trail-close-pumpkin-night.png vs trail-pc-night.png |
| A2 | pumpkin_glow day | PASS | game-trails.png (top-left), verify-trail-pc-day.png |
| A3 | bat_swirl night/day — bats readable, stay in frame | PASS | game-trails.png, verify-trail-close-bat-night.png, verify-trail-{pc,mo}-{day,night}.png |
| A4 | shop try-on preview (✨ tab) both trails | PASS (pumpkin preview dim, same cause as A1) | game-shop-pc.png (bottom row) |
| A5 | purchase reveal spot mode both trails | PASS (pumpkins bright, faces glow under the reveal's own light) | game-reveals.png (top row) |
| B1 | 4 skins × 7 animals, no clipping/floating | PASS with LOW notes (ears through nightcap hood; rabbit ears through classic brim — both also in the confirmed prototype) | game-skins-pitch-day.png, game-skins-back.png, game-witch-front.png, game-nightcap-side.png |
| B2 | head item worn → hat / hood tip hidden | PASS | game-combo-head.png |
| B3 | hood top when tip hides — covered by worn hat? | **FAIL** (open hole; low head items do not cover it) | game-nightcap-headhole.png |
| B4 | back item worn → starry cape+broom hidden, classic cape hidden | PASS | game-combo-back.png |
| B5 | cloud ghost keeps arms / tool hand visible | PASS | game-night-skins.png (cloud holding pickaxe), game-skins-pitch-day.png |
| B6 | dog collar under ghosts | PASS (cloud: white = known/accepted; nightcap: collar stays red) | game-capes-side-dogcollar.png |
| C1 | 9 tools held, batnight + harvest | PASS | game-held-batnight.png, game-held-harvest.png, verify-tools-*.png |
| C2 | swing: motion unchanged, no clipping | PASS (same frame = identical pose base/batnight/harvest; axe + shovel f5/f12) | game-swing-compare.png |
| C3 | rain umbrella of each theme (`?weather=rain`) | PASS with LOW note (batnight front gore droops over the forehead at game pitch) | game-swing-wings-umbrellas.png (bottom row) |
| C4 | batnight potion disc at night vs bloom | PASS (green, readable, no blow-out) — no tuning | game-night-back-potion.png (bottom-right) |
| D1 | bat_wing / bat_cape on fox, rabbit, cat, bear (+dog, chick) | PASS — matches confirmed cape-pc.png A/C | verify-cape-*.png, game-capes-back-pitch.png |
| D2 | tail between wings (fox/cat) | PASS | game-capes-back-pitch.png (top row), verify-cape-pc-day.png |
| D3 | wings vs arms during swing wind-up | PASS (no contact at f4/f10) | game-swing-wings-umbrellas.png (top row) |
| D4 | bat eyes | PASS (no bloom blow-out; small/dim at game distance) — no BAT_EYE tuning | game-night-back-potion.png, verify-cape-pc-night.png |
| D5 | back-item reveal = boxburst and character already wearing the item | PASS via direct call (see note) | game-reveals.png (bottom row) |
| E1 | in window: 10 rows in 자국/스킨/도구/가방 tabs with "🎃 할로윈 한정 ~11/2" | PASS (all 10 listed with tag) | game-shop-pc.png |
| E2 | owned item → no tag | PASS (owned ghost_cloud row had no tag) | report data; game-shop-pc.png |
| E3 | outside window (11/3): unowned hidden, owned still listed | PASS | game-shop-pc.png (top-right) |
| E4 | mobile 390: tag not clipped | FAIL → **fixed** (`white-space: normal`), re-verified PASS | game-shop-mo-skin-before.png → game-shop-mo-skin-after.png |
| F1 | ghost whites under real night bloom | PASS — no tuning. Body reads lavender/navy; the bright ear-tip/snout spots are the game's own player light (same spots on a fox with no skin) | game-night-skins.png |
| F2 | bat-cape eye 0xffe27a | PASS — no tuning | game-night-back-potion.png |
| F3 | potion disc glow | PASS — no tuning | game-night-back-potion.png |
| F4 | pumpkin halo at night | **FAIL** (too weak, see finding 1) | game-trails.png |
| G | console errors/warnings from new items | PASS — none. Only the blocked-network errors I caused (Supabase/GA routes aborted → "익명 로그인 실패", ERR_FAILED) and swiftshader perf notices. "Too many active WebGL contexts" seen once came from my own test overlay, not the game (fixed in the harness) | — |

D5 note: the real cash path (`onGranted` in js/spaces/cafe.js) needs a Paddle checkout + ledger grant, so it can't run offline. I followed the same order in the console: `equip` → `applyCosmetics` → `playPurchaseReveal({mode: revealModeOf(item) /* 'boxburst' */, card: revealCardOf(item), buildShowcase: () => buildCharacterMesh(character, gameState.cosmetics)})`. The hero wears bat_wing/bat_cape. Reading the code confirms the order: `onGranted` equips before calling `playPurchaseReveal`, and `startBox` calls `buildShowcase()` when the reveal opens. So the answer to the Task-5 question is yes.

## Tuning edits made
- `index.html` `.sh-row .sale-tag`: added `white-space: normal`. The tag sits inside the nowrap + ellipsis name span, so at 390 px the date "~11/2" was cut off (scrollWidth 100 > clientWidth 96). With the fix the date goes to its own line and nothing is clipped in any of the 4 tabs. Before/after: game-shop-mo-skin-before.png / game-shop-mo-skin-after.png.
- No F tunings: the ghost colours/emissive, BAT_EYE and the potion k are unchanged because the screenshots showed no problem. I also tried console-only changes (emissive 0.28→0.1, colour lowered, roughness 0.9) and none of them changed the bright spots. They come from the player light, not the skin.

## Findings that need real work (not fixed)
1. **MEDIUM — pumpkin_glow doesn't read as a lantern at night (porting difference).** The prototype `lanternCell` (sims/halloween-trail-sim.html:230) uses an unlit `MeshBasicMaterial`. The real mark uses the shared lit `film()` MeshStandardMaterial (js/cosmetics/trail.js:38, pumpkin at :147-176). At night the pumpkin body and carved face go dark brown, the halo is faint and the face doesn't glow. Compare game-trails.png (bottom-left) and verify-trail-close-pumpkin-night.png with trail-pc-night.png. The shop try-on preview is dim for the same reason. The spot reveal looks right only because it has its own spotlight. Suggested fix: give pumpkin_glow its own unlit (MeshBasic) or emissive bake, at least for the face pieces and body, keeping the colours below the 0.85 bloom threshold, and raise `HALO_ALPHA.night` if it is still weak.
2. **MEDIUM — nightcap hood is open on top when a head item hides the tip.** With flower_crown, star_pin or leaf_band ('low' items), the animal's head (fur colour, chick comb) shows through the hood opening from the game's 41° camera. Straw hat and beanie mostly cover it. Evidence: game-nightcap-headhole.png. Suggested fix: when the tip hides, keep a closed crown cap on the hood (hide only the part above the crown), or don't hide the tip for `earSafe: 'low'` items.
3. **LOW — ears clip through the nightcap hood sides** on fox, dog, cat, bear and panda (bumps or patches on the hood): game-skins-pitch-day.png, game-nightcap-side.png. The prototype skin-animals-pc.png B row shows the same thing, so this is "as confirmed". Optional fix: hide or shrink ear meshes under the hood, as is done for the rabbit.
4. **LOW — rabbit + witch_classic: ears pass through the hat brim** (game-witch-front.png). It may be the intended rabbit correction, but the brim is visibly pierced. Design call.
5. **LOW — batnight umbrella front gore droops over the forehead / left eye** at game pitch (game-swing-wings-umbrellas.png). Same shape as the approved umbrella-batnight.png. The brief's Step 4 user approval of the umbrellas is still pending.
6. **LOW — cloud ghost wisp tail passes over the regular 🦸 cape and bat_cape** (game-combo-back.png, ghost_cloud panel). The cape vent is sized for normal tails.
7. **LOW — at 390 px long item names are cut with an ellipsis** ("나이트캡 …", "별밤 견습 …"). This is the existing name-span behaviour, not new. Headless Chromium on macOS was used, so real-device widths may differ slightly.
8. **LOW — naming:** "🌙 달밤 세트" (moon) and "🦇 달밤 보라 세트" (batnight) sit next to each other in the 도구 tab and are easy to confuse.

## Harness notes (not committed)
Scratch scripts (Playwright driver, gallery overlay, tilers) are in the session scratchpad. The game was driven with `?dbg&weather=clear|rain&time=0.02|0.32` and network blocked, so the guest was an offline dev session and nothing was written to production.
