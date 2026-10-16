# Fish → my space link (fish-tank-link) — plan

## Why
- PT feedback (2026-10-16): "no clear churn point · why play this game?"
- Data (space_vs_minigame.py, 139 real players, 7/27~10/8): among heavy day-0 players, built house -> 38% D1-7 return vs 11%; minigame 22% vs 21% (no difference). Returners spend 74% of week-1 actions on farming, 1.4% on decorating.
- Positioning: "a small village of my own" — minigames must feed the space, not stand alone.

## Scope (first slice only)
Fishing -> caught species visibly living in/around my house. Other minigames later.

## Steps
1. Mockups: 3+ concepts rendered side by side (PC + mobile) -> user picks  <- NOW
2. Korean copy candidates reviewed
3. Spec + E3 pre-registration (7-day return, guardrails)
4. Implementation (TDD, js/spaces/<new>.js, not game.js) + tracking
5. 4-platform deploy

## Concepts (step 1)
- A. Indoor aquarium shows the species you actually caught (upgrade existing 'aquarium'/'bigaquarium')
- B. Yard pond next to the house, caught fish swim there automatically
- C. Window fishbowl given at first catch, visible from outside the house

## Roadmap — every minigame leaves something in my village (user, 2026-10-16)
Principle: the reward of a minigame is visible in my house/yard, not only coins.
| Order | Minigame | What stays in my space | Note |
|---|---|---|---|
| 1 | 🎣 river/sea fishing | yard pond: species + biggest sea fish | THIS slice (E3) |
| 2 | 🍲 cooking | best dishes displayed on my table / kitchen shelf | reuse cook-ingredient-art |
| 3 | 🗿 carving | carved pieces auto-placed as yard statues | carve_result already gives an item? check |
| 4 | 🔭 observatory | unlocked constellations glow on ceiling / roof at night | star_unlock exists |
| 5 | 🐗 night duel | win trophy / scarecrow upgrade by the field | |
| 6 | 🌫️ mist · 🦋 firefly | lanterns / jars hung on the porch | bugJarMesh exists |
Experiment: E3 arm = "space link ON/OFF" bundle. Each new link joins the ON arm; read results per deploy period.
