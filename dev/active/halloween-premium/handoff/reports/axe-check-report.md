# Halloween axe orientation check (read-only, 2026-10-06)

## Verdict
- batnight: CORRECT. The cutting edge points the same way as the default axe (tool-local +x).
- harvest: CORRECT. The cutting edge points the same way as the default axe (tool-local +x).
- Evidence: dev/active/halloween-premium/look/axe-orientation-check.png
- No fix is needed.

## Default axe (js/game.js toolMesh, `id === 'axe'`, ~L3808-3819)
- Head box is centred at x=+0.075. The bright EDGE blade is at x=**+0.175**. The poll is at x=-0.035.
- So the cutting edge is at tool-local **+x**. The origin is the grip and +y runs up the haft.
- Held pose: `TOOL_GRIP.axe = GRIP_LONG` (js/data/character.js:56). The rest pose is `TOOL_QREST_HOLD`. During the chop (game.js ~L5833, 옆베기) the grip blends to `TOOL_QREST` and the wrist blends to `TOOL_QSWING` by `armWristK`. The arm pivot uses `rotation.set(SLASH.lift*s, slashPhase(...), 0)` with order YXZ.
- At the contact frame (p=0.489, where arm yaw crosses 0 and the arm points straight ahead), the blade's world direction is (0.76,-0.15,0.63). The head's velocity is about (0.05,-0.16,0.99), i.e. forward into the tree. Their dot product is +0.69, so the +x edge leads into the tree.

## Themed axes (js/cosmetics/tool-skins-halloween.js)
- batnight `axe(g)` (L158-165): the wing is `batWingShape(1.12)` with its shoulder at x=0 and the tip at x=+0.27*1.12, placed at x=+0.025. The measured head x-extent is [-0.038, +0.399], so the edge is at **+x**.
- harvest `axe(g)` (L248-259): the straw blade spans x 0..0.215 and the cream edge spans x 0.17..0.255, both offset to +0.03. The straw tufts are at x=-0.065, on the poll side. The measured head x-extent is [-0.129, +0.304], so the edge is at **+x**.
- In the same chop pose and contact frame, edge·velocity is +0.59 for both. The blade leads into the tree, the same as the default.
- Existing themes follow the same convention. shroom (tool-skins.js:169) has a half-cap arc at +x. moon (L272) has a crescent at x=+0.135 rotated by π. bloom (L350) has a petal rotated -π/2, pointing +x.
- The prototype sims/halloween-tools-sim.html has the same axe builders: bat at L370 and harvest at L511. Their geometry is identical to the module, and the base axe at L252 has its blade at +0.175. The module matches the approved prototype.
- The earlier capture look/game-swing-compare.png (axe-f12) also shows all three heads on the same side of the haft.

## Possible source of the "backwards" impression (not an orientation bug)
- batnight: the wing's smooth leading edge curves upward toward the tip (+y). The pointed "fingers" hang toward -y, toward the hand. From some angles the scalloped fingers can look like a trailing edge. The blade's mass and its outermost point are still on +x.
- harvest: straw tufts stick out of the poll on the -x side (the back of the head). They are short (to about -0.13) compared with the blade (+0.30).

## Method
- Throwaway page: .superpowers/sdd/2026-10-06-halloween-premium/axe-check.html (gitignored).
- It imports the real modules. The default axe is copied verbatim from game.js.
- It reproduces game.js's chop pose and posing logic at the contact frame.
- The edge side was measured from the vertex x-extent of the head region (y>0.42). Velocity was found by finite difference.
- Rendered with headless Chrome and scripts/serve.py 8190. The server was killed afterwards. Nothing was committed or edited.
