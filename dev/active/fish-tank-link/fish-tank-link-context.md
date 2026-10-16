# fish-tank-link — context
Last Updated: 2026-10-16 (spec + prereg written)

## Key files
- js/data/catalog.js:30,46 — DECOR 'aquarium'(2 fish), 'bigaquarium'(5 fish); FISH_KINDS (7 river species, col)
- js/spaces/indoor.js:378,474 — aquarium models; fish = generic orange cone (not the caught species)
- js/game.js:6044 fishMesh(rarity) — shared low-poly fish, species color, 1 draw call
- js/data/dex.js DEX.fish — 7 ids; sea species separate (js/spaces/sea.js, sea.best)
- INT_HALF = 7 (room 14x14), wall height 3 (ceiling rule tests/decor-ceiling.test.mjs)
- dev/active/metrics-framework/validation/space_vs_minigame*.py — evidence

## Decisions
- No text boards (museum biggest-fish board rejected: unreadable at game camera distance)
- Mockups first, 3+ concepts, PC + mobile (design-compare rule)
- Must be experienced on day 0 (signal came from day-0 behavior)

## Open
- ✅ Concept = B yard pond (2026-10-16) · how many fish shown · sea species included? · E3 arm design

## Decisions (2026-10-16, user)
- Pond appears automatically at first fish catch (river or sea); fish = 1 per caught river species (≤7) + biggest sea fish ×1.5
- No new save field — derived from dex.fish + sea.best; toast once via hintsSeen.pond
- Copy #3 approved
- E3 = 'space link bundle' ON/OFF, new devices only, salt e3:, user prop exp_space; roadmap links join ON arm
- E3 needs ad traffic: baseline 32% (n=38), +20%p → 95/arm, organic 1.8 triggers/week (~106 weeks) → Meta ads as sample source, max 12 weeks
- Neighbor view: needs neighbor_showcase SQL change (pond field)
## Open (implementation)
- Pond coordinates: candidate (-3.0,-3.8), confirm with in-game capture · fallback spots for existing outdoor decor
- Branch: analytics/metrics-framework is behind main — implement in a fresh worktree from main
- Plan deviation: js/pond/ folder (plaza pattern) instead of js/spaces/pond.js — pure rules must be Node-testable
- Spec §4 'skip swim update off-screen' deferred — ≤8 fish, add only if Task 7 perf shows a problem
