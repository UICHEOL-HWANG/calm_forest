# Task 8 report
- Added skinPartVisible (skin-rules.js), showSkinParts + 4 SKIN_IDS + dispatch (skin.js), empty stubs skin-ghost.js / skin-witch.js, swapped 2 game.js call sites (import line + 2 calls; sproutVisible import removed, unused elsewhere in game.js). showSprout/sproutVisible still exported.
- RED: `node --test tests/halloween-skin-rules.test.mjs` -> SyntaxError: no export named 'skinPartVisible' (pass 0 / fail 1).
- GREEN: 5 related test files pass 30/0; full `npm test`: tests 1821, pass 1821, fail 0.
- Edited existing test: tests/skin-wiring.test.mjs, only the 2 regex assertions + title to the showSkinParts pattern.
- Files: js/cosmetics/{skin-rules,skin,skin-ghost,skin-witch}.js, js/game.js, tests/halloween-skin-rules.test.mjs, tests/skin-wiring.test.mjs.
- Concerns: none.
