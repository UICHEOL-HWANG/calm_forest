# Premium tool sets + decorations (design round)

## Goal
3-4 new premium TOOL SET themes (9 tools + rain umbrella) and 3+ new premium decorations (head/back/trail),
so the 숲 환영 상자 bundle (feat/meta-pixel, js/shop/bundles.js `choose`) and the shop have more to pick from.

## This round (design only)
1. Propose 5 theme concepts distinct from shroom/moon/bloom/batnight/harvest/star.
2. sims/premium-tool-sets-sim.html: 9 tools + umbrella per theme, three.js, existing silhouettes,
   theme = blade/body shape itself, bloom threshold 0.85 (glow only on tiny details), <=5 calls per tool after bake.
3. Same sim: 6 decoration ideas (head 2, back 2, trail 2) on fox/cat.
4. PC + mobile screenshots side by side -> user picks.

## After approval (not in this round)
- js/cosmetics/tool-skins-<theme>.js per chosen theme (+ UMBRELLAS entry), wired via themeBuilders spread
- catalog.js entry with won price, price-ids.js slot, _premium_cosmetic_ids() SQL list
  (tests/security-hardening.test.mjs), Paddle product seeding
- Do not touch js/shop/bundles.js, js/spaces/cafe.js, functions/api/_paddle.js (other session)
