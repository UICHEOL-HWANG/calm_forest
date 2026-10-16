# Task 10e report: sled hits burst, collision matches visuals, acorn sparkle

Commits: `bf131dfd fix(mountain): sled collision matches visuals`, `898717e9 feat(mountain): sled hits burst obstacles` (the acorn sparkle is in the second commit), plus this report commit.

## Collision (js/mountain/sled.js, pure)
- `SLOPE_M_PER_UNIT = SLOPE_RUN / COURSE.length` (≈0.212 m per course unit), exported from terrain.js, the same constants `slopePoint` uses.
- `OBSTACLE_BODY = { rock: 0.8, snowball: 0.75 }` and `obstacleRadius(o) = o.r * OBSTACLE_BODY[kind]` (course.js). The art now uses the same factor, so the hit radius is the drawn body radius, including the difficulty r scaling from `courseFor`.
- `overlapsObstacle(s, o)`: the sled footprint `SLED_HALF = { w: 0.43, l: 0.75 }` m (rectangle) is tested against the obstacle circle in local metres. The old test was |dz| < r and |dx| < r in course units, so the z window was about 4.7x smaller than the rock you see.
- `hitReach(o)` gives the window in course units (z ≈ ±7.4–7.7, x ≈ 1.26–1.31). Sweep safety: at 24 u/s with the 50 ms clamp the sled moves 1.2 u per step, far below the window. This is tested for every obstacle at 10 phase offsets.
- COURSE_V and PHYS_V stay 1. minTimeMs (13.75 s) is unchanged and stays below every reachable time.
- Physics tests: two tests assumed the centre line was obstacle-free (it no longer is, because obstacles sit 0.6–1.0 m off centre). They now ride `perfectLine()`: "a clean run" lands at 38.56 s with 12 flags, and boosted runs are faster.

## Sim (tools/sim/sled-sim.mjs)
- The bot plans dodges with `hitReach`, aims at an absolute x so the bend in the centre line does not shift it, and keeps inside the gate when a flag comes before an obstacle.
- `perfectLine(course, acorns)` does a DFS over the left or right side of each obstacle. It finds a line with 12 flags and 0 hits at ease 0.85/1.0/1.15 × 0/3/6 acorns, in about 140 ms in total (tested). Perfect times are unchanged: 38.56 / 35.95 / 33.36 s.
- All six criteria pass with no change to obstacle offsets, radius or penalty. The full before→after table is in sim-report.md. Summary (p50 s, hits):
  - skill 0.3/3 acorns: 39.0→44.6, 2.84→7.44 hits
  - skill 0.6/3 acorns: 36.8→38.8, 0.66→1.93
  - skill 0.9/3 acorns: 36.0→37.9, 0.04→1.00
  - skill 0.9/6 acorns: p50 35.4 (≥30)
  - skill 0.3/0 acorns: p90 47.8 (≤60)
  - 6-acorn gain at skill 0.7: 3.2 s (window 3–9)
  - skill gap: 6.7 s

## Burst (interior-art.js, spaces/mountain.js, mountain/sled-fx.js, mountain/sled-view.js)
- The obstacle mesh stays one merged vertex-coloured Mesh. `geometry.userData` holds `ranges` (start and count per obstacle), `anchors` (ground point) and `base` (a copy of the positions). `poseObstacles(geo, scales)` rewrites each range as anchor + (base − anchor)·k, where k = 0 hides the obstacle as degenerate triangles. `obstacleScales(course, hitIds)` maps the run course r to k.
- startSled applies `showObstacles(run.course)`, which restores all obstacles and applies the difficulty scale, so the art matches the collision. closeRun applies `showObstacles(COURSE)`.
- On each new hit id, `burstObstacle(i)`:
  - hides the hit obstacle
  - calls `spawnSnowBurst` (14 white 0xf4f8fc non-additive drop particles from the shared fx pool, life 0.7 s)
  - plays `Sound.build()`
  - sets `run.shake = 1`
  - spawns `spawnFloatText(..., '💥')`, which is emoji only
- The hit penalty is unchanged (slow ×0.5, 1.5 s recover). No knockback.
- Camera shake: `decayShake` brings 1 down to 0 linearly over `SLED_SHAKE.ms = 350`. `shakeOffset` uses amplitude 0.3·v² on x/y and is added to the camera position after the follow lerp, so the follow state is not polluted.
- Draw calls: the interior is still ≤ INTERIOR_DRAW_BUDGET (9), and obstacles are still one draw (tested). Particles are transient meshes, as in every existing FX.

## Acorn sparkle
- `pickAcornFx(i)` runs at the acorn's world position: `spawnSparkle(..., 9)` plus `spawnFloatText(..., '🌰')`. Sound.harvest still plays. There is no scale-pop: the instance hides immediately, as before.

## Tests
- RED: `mountain-sled-collision.test.mjs` failed on the missing `OBSTACLE_BODY` export. `mountain-sled-burst.test.mjs` failed on the missing `SLED_SHAKE`, and then 5 wiring tests failed before mountain.js was wired.
- GREEN: collision 9/9 and burst 13/13 pass. All tests/mountain-*.test.mjs pass. `npm test`: 3006 pass, 0 fail.

## Concerns
- Novice hits rise from about 2.8 to about 7.4 per run, out of 11 obstacles, because the hitbox is now honest. All criteria still pass, but if it feels punishing, the first lever is the obstacle offsets or radius.
- The skill-0.9 bot hits 1 obstacle when boosted (the 113→138 swing under its far-side dodge rule), even though a perfect line exists.
- The 6-acorn gain (3.2 s) sits near the 3 s lower bound.
- Not checked in the browser (the in-app browser was off-limits): what the burst and shake look like, and whether the snow puff blooms.
