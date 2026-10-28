# Deploy checklist: premium tool sets, decorations, pets (planned 2026-10-21)

Branch `feat/premium-tool-sets` (worktree .claude/worktrees/premium-tool-sets) already contains origin/main
up to 83c68c36 (merge commit 36f44b12), so `main` can fast-forward.

## Already live outside the game (done 2026-10-19/20)
- Paddle live: 11 cosmetics (tool sets, decorations) + 4 pets, price IDs in js/shop/price-ids.js
- Production DB: _premium_cosmetic_ids() list 31 items, trg_game_saves_guard_pets (rollback self-test passed)

## Before merging
- [ ] git fetch; if main moved, merge origin/main into the branch again and run `npm test`
- [ ] Key scan before push (public repo): `git grep -nE "AIza|GOCSPX-|sk-ant|pdl_live|apikey_"`
- [ ] Decide: add the 5 new tool sets to the welcome box `choose` list (js/shop/bundles.js, owned by the meta-pixel work)
- [ ] User copy review: REVEAL_COPY / SHOP_COPY entries for the 11 items, pet names and blurbs

## Merge and push
- [ ] main: fast-forward to feat/premium-tool-sets
- [ ] push main and feat/capacitor-app (after the Android merge below)

## Deploy all platforms together (old clients strip unknown ids from saves)
- [ ] Web: `npx wrangler deploy` (check js/config.js is not the local test token)
- [ ] Toss: `npm run build` -> bundle_upload(memo with main hash) -> PUT -> bundle_upload_complete -> test push -> review submit; user presses release
- [ ] itch: `npm run build:itch` -> user uploads dist-itch.zip
- [ ] Android: ../calm_forest-capacitor merge main -> npm test -> versionCode+1 -> build:cap -> bundleRelease -> upload internal, then alpha+production in one edit
- [ ] iOS: build and submit as usual
- [ ] Notice (notices_admin.html) only after the Toss release

## After deploy
- [ ] Web: buy one item with a real account, check ledger row and that it equips (tool set, pet)
- [ ] GA4 next day: pet_gift, pet_fish_bonus, cash_checkout_open for new ids
