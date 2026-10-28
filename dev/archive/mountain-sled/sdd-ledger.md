# SDD ledger — plan: docs/superpowers/plans/2026-10-15-mountain-sled-stage1.md
Spec: docs/superpowers/specs/2026-10-15-mountain-sled-design.md
Start HEAD: 8124bd22

## Preflight scan
| Rows | Produces / consumes | Finding |
|---|---|---|
| T1×T9×T10 game.js | different regions (save/boot vs flags/dispatch vs updatePlayer) | ok |
| T2→T3 | PHYS/createSled/stepSled | T3 may retune PHYS; T6 min-time uses literal 24 m/s, stays conservative while baseSpeed*boostMult < 24 | ok |
| T2→T10 | stepSled(s,dt,steer,course) with run.course | ok |
| T4→T5 | ddaOutcome('sled') | ok |
| T5→T6 | sled-run.js imports sendSledRun added in T6 | browser import breaks between T5 and T6 commits → reorder |
| T7→T8/T9 | setCameraRig export, passed into createReveal | ok |
| T8→T9 | mountainMesh export used by terrain.js | ok |
| T9→T10 | updateMountain(dt), exitMountain, clampToMountain | T10 sled phase: player avatar not moved along slope and village clamp/climb clamp would fight sled → gap |
| T9/T10/T11 copy | new Korean UI strings | user rule: copy reviewed before building |
| T6/T11 Step 4 | production DB apply | shared side effect outside worktree; RPC used by live clients |
| T1 self | tests regex match the code it adds | ok |
| T2 self | 35-45 s and boost>2 s tests vs PHYS(accel 6.0) | ok on hand calc (~39 s, ~2.4 s gain) |
| T5 self | GA payload ≤25 incl. stub auto keys | ok (sled_result 15) |
| T9 self | test expects `!atMountain` in doors and `updateMountain(dt);` | ok |
| T10 self | test expects exitMountain starts with abandonRun() | ok |

## Rulings
- Ruling: execute T6 before T5 — sled-run.js imports sendSledRun; keeps every commit importable — cost if wrong: none (T6 has no dependency on T5).
- Ruling: T10 also moves the player avatar along the slope each sled frame and skips clampToMountain while sledActive() — plan omitted it, sled would be invisible/clamped — cost if wrong: small extra diff in T10.
- Ruling: production DB application (T6/T11 Step 4) deferred to deploy time, recorded in deploy checklist — RPC replacement affects live clients before the client ships — cost if wrong: one extra step at deploy.
- Ruling: stop before T9 to get the user's copy review (durable user rule: copy reviewed before building) — cost if wrong: one round-trip pause.

## Progress
Task 1: minor (deferred): game.js integration checked only by source regex (plan-style, gameSource convention)
Task 1: complete (commits 8124bd2..660e55c, review clean)
Task 2: minor (deferred): COURSE only shallow-frozen (plan-mandated); T10 courseFor already builds a new course
Task 2: minor (deferred): collision checks end-of-step only; T10 clamps dt to 50 ms (0.65 m/step < 2.2 m window) — safe
Task 2: minor (deferred): no tests for multi-flag step / large-dt collision
Task 2: Ruling: carry "PHYS.maxSpeed*boostMult <= 24 (minTimeMs basis)" invariant test into T3 — retune in T3 could silently break the SQL min-time guard — cost if wrong: one extra assertion
Task 2: complete (commits 660e55c..d581ff1, review clean)
Task 3: Ruling: allow course.js geometry changes (obstacle offsets, flag half-width) in addition to PHYS; course_v stays 1 (unreleased) — plan said geometry fixed, but spec §1/§3.2 needs a skill-driven leaderboard and offsets are why skill is invisible — cost if wrong: T2 tests may need value updates (not weakening)
Task 3: Ruling: add skill-spread criterion: p50(skill 0.3) − p50(skill 0.9) ≥ 1.5 s at 3 acorns, and 6-acorn gain stays 3–9 s — keeps acorns meaningful but not dominant — cost if wrong: retune later with real data (course_v bump)
Task 3: fix round 1/5 (4 addressed, 0 open — skill invisible in time; report missing hits; CLI guard; weak gap test; commits 2a0564f..f37b79e)
Task 3: Ruling: accept implementer retune — obstacle offset 2.6–3.6→0.6–1.0, flag half 3→2.2, hitSlowMult 0.55→0.5, hitRecoverMs 900→1500 — gives 3.1 s skill gap, oracle line still 12 flags/0 hits — cost if wrong: game feels tight; retune with real data (course_v bump)
Task 3: minor (deferred): sim-report.md overstates "skill 0.9 = 0 hits" (mean 0.04–0.41); oracle run is the zero-hit evidence
Task 3: complete (commits d581ff1..f37b79e, review clean after 1 round)
Task 4: minor (deferred): no test for old-save merge / nextDda staying 1 for sled; loose `|| r.ease === 1`
Task 4: complete (commits f37b79e..988cf5d, review clean)
Task 6: Ruling: also fix minors in the same round — octet_length size cap (repo convention), non-negative ms/coins checks, server-set run_date (KST) trigger — cheap defence for a leaderboard table — cost if wrong: diverges from star_runs pattern
Task 6: carry to T11: leaderboard sled query must also filter course_v = 1 (current) and phys_v
Task 6: fix round 1/5 (5 addressed, 0 open — course_v-only min-time guard; octet_length cap; nonneg; server run_date; tests; commits 06e9295..30ca1f8)
Task 6: minor (deferred): SQL tests are regex-only; create table if not exists won't add constraints to a pre-existing table (nothing applied yet)
Task 6: complete (commits 988cf5d..30ca1f8, review clean after 1 round)
Task 5: minor (deferred): attempt_n read from sledState().plays — correct only if sledBegin ran first; T10 runtime always calls sledBegin at sled start (climb abandons record attempt_n = previous plays)
Task 5: fix round 1/5 (3 addressed, 0 open — unrounded time_ms; hard-coded flag count; 4th-run best test; commits 356f9c2..ec25716)
Task 5: carry to T10: ctx.daysSinceUnlock / acorn counts must be integers (integer columns)
Task 5: complete (commits 30ca1f8..ec25716, review clean after 1 round)
Task 7: carry to T10: rig owns camera only inside updateCamera (skipped while mgView/duelActive); release rig before snapCamera; reveal must not start during mgView
Task 7: minor (deferred): tree exclusion for MOUNTAIN_GATE — already in T9 plan (game.js tree/scatter avoid list)
Task 7: minor (deferred): rig freezes photo/survey/moment timers while active (reveal must not overlap those)
Task 7: complete (commits ec25716..4e25443, review clean)
Task 8: minor (deferred): reveal never disposes backdrop geometry/materials; build lazily in start() and dispose on finish (bounded: once per player)
Task 8: minor (deferred): gate-art temp geometries not disposed (never uploaded); redundant computeVertexNormals under flatShading
Task 8: complete (commits 4e25443..139d7d9, review clean)
PAUSED before Task 9: awaiting user copy review (durable user rule). HEAD 139d7d9d.
RESUMED: user approved copy candidates as written (2026-10-15).
Task 9: Ruling: fold T8 deferred minor (reveal builds backdrop lazily in start() and disposes geometry/materials on finish) into T9 since T9 wires the caller — cost if wrong: small extra diff
Task 9: Ruling: browser verification (plan Step 8) done by controller after T10, not by the implementer — subagents lack the preview pane — cost if wrong: visual issues found later
Task 9: Ruling: accept extra guards (outdoor-decor outdoorZone !atMountain, farm-auto pet off in mountain, ZONE_PAGE.mountain='none') — mirrors observatory; without them decor/pet misbehave inside the space — cost if wrong: pet absent in mountain
Task 9: Ruling: fix minors 3–5 (exit blip, end reveal when leaving village, cheap flag check first) in the same round; minor 6 (circular import spaces/mountain ↔ doors) deferred — call-time only — cost if wrong: none
Task 9: minor (deferred): circular import spaces/mountain.js ↔ doors.js (safe at call time)
Task 9: fix round 1/5 (5 addressed, 0 open — reveal under modal; plaza rim teleport; exit blip; reveal finish on leaving; check order; commits bb9db76..0b73c48)
Task 9: minor (deferred): 0.75 m y pop where path leaves the plaza (pre-existing; check in browser)
Task 9: complete (commits 139d7d9..0b73c48, review clean after 1 round)
Task 10: minor (deferred): no blur reset of held keys/pointers; HUD taps (☰, minimap) steer the sled; no pagehide abandon row; input defaults 'keys' until first input; EN "1 rewarded runs" plural (new copy needs user approval); finish-frame Space may swing a tool; climbMs includes plaza idle
Task 10: complete (commits 0b73c48..dada163, review clean)
Browser check (controller, after T10): reveal OK (mountain+cloud band centred, toast); gate prompt OK; modal guard OK (reveal waited for character modal); space draw calls 59 (≤60).
Browser check FAIL: player/camera buried inside the mountain body mesh (body cone R70 H34 at (0,-2,-10) covers plaza y=0 and path) — plan defect in terrain.js
Browser check note: gate landmark reads as a dark green tent from the top-down camera (snow model hidden under arch) — design, ask user with visual options
Ruling: T9 terrain fix — replace the generic cone body with a heightfield built from gameplay features (plaza, climb path ramp, sled slope) so walkable/ride surfaces are always on top; dispatch a fresh implementer on opus — cost if wrong: another visual pass
Browser check FAIL 2: layout conflict — sled slope (world z -4→66, y 30→0) passes over the plaza (4,28) at ~16 m; plaza/path/slope footprints overlap
Ruling: Task 9b (layout + heightfield) — move plaza to the slope's foot, reroute climb path around the slope corridor to the summit, rebuild acorns/exit/minimap marks, and build terrain as a heightfield from features; fresh opus implementer; full task review + controller browser re-check — cost if wrong: one more layout iteration
Browser re-check after 9b: plaza/path/terrain OK (on top), path acorns visible, space calls 58–59, full run works (start→HUD→finish→result 🪙+27, daily 1/3, best saved).
Browser check FAIL 3: avatar faces uphill during sled; sled camera too close (course unreadable); no cloud band inside the space (spec §2.1-3 miss); no sled object under avatar
Ruling: Task 10b — fix facing, retune sled camera for readability, add in-space mid-slope cloud band (front gap over the slope), add a low-poly sled under the avatar; keep space ≤ 60 calls by merging obstacle meshes (instanceColor) if needed — cost if wrong: another visual pass
Task 10b: implemented (commit 839b9a15) — NOT YET REVIEWED. Concerns: (1) HIGH steering mirrored on screen (camera looks +z → screen-right is −x, right press moves +x) — needs ruling (flip steer sign in runtime input mapping, not physics); (2) facing: old code may already have faced +z; re-check in real game
PAUSED 2026-10-15 by user ("내일 나머지"). Resume: review 10b → fix steering mirror → browser re-check (facing, camera, clouds, sled, mobile portrait/landscape) → gate landmark design options to user → T11 → T12 final review.
RESUMED 2026-10-16. Reviewing 9b+10b together (9b had only a controller browser check). Known Important from implementer: steering mirrored on screen.
Task 9b+10b review: spec met; Important 1 confirmed — steering mirrored on screen (pre-existing since T10 camera)
Task 9b+10b: Ruling: fix in runtime (negate steer from input) and keep steer_left_ms/steer_right_ms meaning "screen side the player pressed" by swapping in the row builder — physics/COURSE_V/PHYS_V untouched — cost if wrong: telemetry side naming confusion (documented in test)
Task 9b+10b: minor (deferred): path-corner y jump 0.22 m; obstacle visual radius ignores difficulty scaling; undisposed temp geometries; draw-call total has no headroom (59–60) — check total in browser; grid lift/stripes cosmetic
Task 10b: fix round 1/5 (1 addressed, 0 open — steering mirrored; commits 839b9a1..2e9a4b4)
Task 9b+10b: complete (commits dada163..2e9a4b4, review clean after 1 round)
USER FEEDBACK 2026-10-16: gate arch reads as a shrine gate (torii) — remove; the approved mockup-A mountain itself must be the landmark and bigger. → controller renders 3 size/placement options in the real village for user choice.
USER DECISIONS 2026-10-16: village landmark = irregular-base mountain (proto "wild", k=1.2, R7, H6.5, ground-blend foot) + clouds ×1.6, at (-15,0,-36); no arch; entrance at the south foot; no tilling/decor placement around it (user tilled a field at the foot in the preview).
Task 10c: Ruling: implement landmark per user decisions from dev/archive/mountain-sled/proto/landmark.js; move MOUNTAIN_GATE to the south foot; add body collider + no-till/no-decor zone + tree exclusion; fresh opus implementer — cost if wrong: another visual pass
Task 10c: implemented bb3eb75c (landmark 2 meshes at (-15,0,-36), gate (-15,0,-27), body collider r7, no-till via obstacles, tree exclusion). Open: no-decor needs new copy (user); collider circle vs star-shaped base (radius 4.4–9.6) — fix with angle-following collider after copy decision. NOT YET REVIEWED.
USER 2026-10-16: approved decor-block copy '🏔️ 산자락엔 놓을 수 없어요'; remove em dashes/awkward sentences; clouds bigger.
Task 10c: Ruling: copy edits — first hint → '🏔️ 뒤쪽 능선길로 올라가 정상에서 썰매를 타요' (drop fragment), rewards-done → '오늘 보상은 다 받았어요. 기록 도전은 계속할 수 있어요', add EN exact key for '오늘 보상 1판 남음'; clouds ×2.2; collider follows star base — cost if wrong: one more copy pass
USER 2026-10-16: remove comments from lines added/edited by this feature (incl. pre-existing trailing comments on edited lines) — do after 10c round 2 lands
Comment cleanup: 33e83554 (9 trailing comments removed; 0 comments in added lines)
Task 10c review: Important — collider ring tunnels (single-pass resolveColliders); Ruling: replace ring with exact polar clamp hook (like the lake clamp) + sweep regression test; minor: comment removal dropped some context (user-requested, accepted)
Task 10c: fix round 1/5 (1 addressed — collider tunnelling → polar clamp; 4b9adda5)
Task 10c: complete (commits 2e9a4b4..4b9adda, review clean after 1 round)
Browser check 2026-10-16: village landmark OK (clouds 2.2×, prompt at south foot, centre teleport pushed out to z -31.48); sled camera OK; right press → screen x +0.174 (correct); space calls 60 while sledding (at limit)
Task 11: implemented 35af1d1b; controller verified live public.leaderboard == migration minus sled branch (normalized md5 0c31d1ee… both) — safe to apply at deploy
USER 2026-10-16: interior looks shabby ("밤티") — redesign interior art direction from researched references; design compare (3 options, PC+mobile) before implementing
Task 11: fix round 1/5 (1 addressed — weekly subtitle on daily board; '초' EN; 6e21433c) — tiny UI condition fix, covered by test; final review will see it
Task 11: complete (commits 4b9adda..6e21433, review clean after 1 round)
Interior redesign: proto/interior.html (themes A day / B dusk / C snowfall; pines, slalom gates red/blue, snow-capped rocks, sky gradient, distant ranges, snow plain, blue/lavender shadows); comparison sent to user; awaiting choice
USER 2026-10-16: interior themes by game time — day A, dusk B, snowy weather C.
Task 10d: Ruling: night (not specified) uses a moonlit variant of A (darker blue sky/light, same palette) — cost if wrong: one palette tweak; theme switch via material tints/lights/fog/sky (no geometry rebuild); fresh opus implementer
Task 10d: implemented 190bc36b (themes day/dusk 0.66–0.80/snow/night; restore via guarded hook; no interior shadows; calls 56/57/58). Reviewing + browser check.
Task 10d review: Approved (minors). Controller browser: dusk looks muddy (night grade uNight applied over palette B) — Ruling: fix minor 2 (mountain-only grade/uNight override with village reset) and minor 1 (snowfall wrap jump) now; minors 3–4 deferred
Note: Browser pane throttled to ~2 fps (countdown slow) — environment, not a bug
Task 10d: fix round 1/5 (2 addressed — dusk muddied by night grade; snowfall jump; 6132fdb3)
Task 10d: complete (commits 6e21433..6132fdb, review clean after 1 round)
FINAL REVIEW (1228f1c..6132fdb): With fixes. Critical: gameState.mountain never restored (daily cap reset on reload → coin exploit). Important: steer stuck after blur; trigger missing search_path. Minors: '설산' EN key; triple 🏔️ on gate banner (user-approved copy — ask user, not changed); reload inside mountain returns to village edge; legacy days_since_unlock ~9400; HUD per-frame DOM writes; landmark clouds fog:false in fog weather; abandon penalty_ms; input default; leaderboard 7 tabs at phone width.
Ruling: ONE fix dispatch for Critical/Important + minors 4,6,7,8(HUD only),9,10,11,12 — cheap and pre-release; minor 5 left to user (approved copy)
Final fix wave: 6132fdb..f24f120 (11 commits, 2984 pass)
Final fix wave: re-review APPROVE (11/11 addressed)
Final: parked — daily.rewarded out-of-range resets to fresh day — Ruling: only hand-edited saves can produce it; clamp later — cost if wrong: a cheater gets 3 extra rewards once
Final: parked — minTimeMs hard-codes 16*1.5 not PHYS — Ruling: test already pins PHYS ≤ 24 m/s; SQL floor moves together — cost if wrong: retune needs a course_v bump
Final: parked — saved playerPos is never applied on load (pre-existing for all spaces) — Ruling: out of scope; reload always spawns at origin
