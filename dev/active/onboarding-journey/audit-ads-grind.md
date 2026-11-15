## 고요한 숲: new-player grind map and where ads could go (read-only audit of quest-chips worktree)

I only read code, notes and docs. I edited nothing and ran nothing in a browser or on a device. Line numbers are for this worktree. Anything marked *guess* I did not verify.

The main finding: **the ad system is already built and wired into 11 placements, but it is switched off** (`PREPASS_ON = false`, `js/tuning.js:8`). So "put ads in every gap" is mostly a matter of turning that on safely, plus a few new placements (Part 3). Two hard constraints apply:
- The published privacy policy says "배너·전면 광고는 없습니다" (`pages/privacy.html:71-72`), and the store declarations match it. **Interstitials are off the table** unless both the policy and the store declarations are changed first.
- Web has no ad provider at all. AdSense H5 approval is still pending, so web shows no ad buttons.

---

## Part 1: what already exists

**Modules**
- **`js/ads/rewarded.js`: shared button and gate.**
  - Line 31: `open()` requires all of: `PREPASS_ON` (or localhost `?prepass=1`), the device being in the **'ad' half of a 50:50 split** (`prepassArm`, salt `prepass-v1:{platform}:{clientId}`), fewer than 30 completed views today, and a provider that is available.
  - The reward is granted only when the result is `complete`. `fail`/`nofill` show the toast "지금은 광고를 볼 수 없어요". The button is a gold "AD" pill and is always opt-in.
- **`js/ads/rewarded-native.js`: AdMob through Capacitor (Android/iOS).**
  - Consent (UMP) runs first, then ATT on iOS (lines 105-126).
  - Live ad units (lines 1-5): Android `…/5636922678`, iOS `…/5078072368`.
  - Line 135 passes `ssv.customData = placement`, but **no server-side verification endpoint exists**: nothing in `functions/`, `workers/` or `worker/` mentions ssv/admob. The reward is granted client-side, and the daily count lives in localStorage (`cf_prepass_day`, `js/game.js:2974`), so clearing storage resets it.
- **`js/ads/toss-rewarded.js`:** the Toss IAA REWARDED group `ait.v2.live.c226252d0fcb4c9e`. `isSupported()` throws an error outside Toss, which is why it is wrapped in try/catch.
- **`js/ads/admob.js`:** wrapper. On every paid impression it calls `trackTenjinAdImpression` → `eventAdImpressionAdMob` (`js/tenjin-native.js:54-58`).
- **Provider selection:** `js/game.js:1650-1655`. Toss → Toss; otherwise AdMob, which is only available on native. **Web always gets `available:false`.**
- **Test build:** `ADS_TEST=1 npm run build:cap` adds `__ADS_TEST__`, test ad units and the AD TEST button (`js/ads/rewarded-debug.js`, `scripts/build-cap.mjs:43-77`).

**Caps and rules (`js/guide/prepass-rules.js`)**
- `PREPASS_CAPS` = wood 10, stone 6, coal 1, coins 40 (line 6).
- `CAFE_CAPS` = crop 3, forage 3, fish 2, egg 2, flour 2, juice 1 (line 7).
- `PREPASS_DAILY_CAP` = 30 views per device per day, across all placements (line 8). The design doc §2 calls this a safety cap; the first draft had 2.
- `REPEAT_SLOTS` (line 11) only appear once `houseStage >= 3` (`repeatOpen`, line 32).
- `sellBonus` = 50% of the sale, at most 40 coins (line 35).
- Pond ad feed: once a day (`js/pond/actions.js:4`).

**Placements already wired (all hidden while `PREPASS_ON = false`)**

| slot | where | reward |
|---|---|---|
| house1/2/3, bridge, farm2/3 | floating shortage card near the house site, bridge foot or survey desk (`js/guide/house-short.js:31-82`, spots at `js/game.js:2977-2981`) | the missing materials, capped by PREPASS_CAPS |
| branch_<x> | world-tree board guide card (`js/spaces/world-tree.js:206`) | missing decor materials |
| cafe_order | goal-guide step card in story ch3 (`js/guide/goal-guide.js:270-274`) | missing ingredients, capped by CAFE_CAPS |
| farm_rush | floating pill above the tool bar at the farm (`js/ads/farm-rush.js`) | every growing plot ripens |
| craft_rush | kiln/vat panel (`js/game.js:2030-2035`, `js/game-ui/kitchen-menu.js:171`) | finish all waiting slots now (skips overnight) |
| sell_bonus | shop sell row (`js/game.js:2037-2041`, `js/game-ui/shop-menu.js:60`) | +50% of the sale, ≤40 coins |
| daily_double | daily attendance card (`js/game.js:2050-2053`, 1560) | another copy of the day's coins (5-30) |
| pond_feed_more | pond feed book (`js/game.js:2055-2058`, `js/pond/feed.js:58`) | a second feeding, 1 per day |

**Tracking**
- `prepass_eligible{slot,arm}`: once per slot per session, sent for both arms (`rewarded.js:34`).
- `prepass_ad_result{slot,result,value_micros,sec}` (`rewarded.js:46`).
- Tenjin `rewarded_ad_complete` with value = seconds watched (`js/tenjin-events.js:18`). Per memory, this needs a new app build.
- Rewards are written to the ledger through `giveReward(…, slot)`, so the slot is the source.
- Per-slot analysis: `ml/sql/prepass_by_slot.sql` (design doc §3).

**Platforms**
- Android and iOS (AdMob): ad units "준비됨". The Android build 130 includes AdMob and AD_ID. Per memory, the iOS App Store privacy label is still on hold, and the iOS build with AdMob has not been uploaded yet.
- Toss: IAA group ENABLED since 11/12.
- Web: only the AdSense site meta tag exists (`index.html:14`). There is no `adsbygoogle` or `adBreak` code, and the H5 games ads programme needs its own approval.
- itch: none.

**Policy constraints in code and notes**
- Owner decision (memory quest-dropout-kit-admob, 10/29): rewarded ads only. **No banners or interstitials, on web too.**
- The design doc (`docs/superpowers/specs/2026-11-09-progress-prepass-rewarded-design.md` §1) says:
  - don't put ads on wayfinding problems
  - never skip the progression condition itself
  - judge success by drop-off and D1, not revenue
- Guardrails in the same doc:
  - D1 must not drop more than 3 points.
  - Treated devices' wood/stone on day 3 must stay ≤1.5× control.
  - If more than 1% of devices hit 30 views a day, investigate.
- Play: if the target age includes under-13s, the Families policy applies (`dev/active/admob-rewarded/store-privacy-changes.md`).
- iOS: ATT wording is fixed; App Store guidelines 5.1.1 and 5.1.2 come up in the notes.
- Toss: AdMob is not allowed on Toss; only Toss's own ads. I found no notes on Toss ad review rules (unverified).

---

## Part 2: grind map for days 1-7

Key numbers:
- Village: 14 trees (`game.js:3594`), 3 hits each, 3 wood per tree (`data/tools.js:44`), regrow 30 s (line 46).
- Mine: 15 ore rocks (`spaces/mine.js:101`), 3 HP each, regrow 14 s (line 194). Stone yields 1-2 (average 1.5); in clear weather 61% of rocks are stone.
- Sell prices (`data/catalog.js:194`): wood 2, stone 3, crop 5, fish 8.
- A day/night cycle is about 8 minutes (`daynight.js:4`).

Stall data (`ml/reports/story_stall_20261110/result.csv`):
- ch1: 258 players stopped, a median of **4 min** after starting, so wayfinding rather than grind.
- ch3: 22 stopped after a median of **537 min** played; players who moved on took a median of 115 min.
- ch2: 22 stopped.

| Grind point | Numbers (file:line) | When a new player meets it | Pain |
|---|---|---|---|
| First harvest / crop growth | Basic crop: 2 waterings ×0.4 with 9 s wet time, so ~10-20 s (`data/tools.js:51`, `farm-crops.js:36`); wilts after 60 s dry. E1 starts players on a ripe 2×2 plot. Advanced crops need 2-3 waterings, and without fertiliser growth is halved (`farm-crops.js:24-26,40-45`) | min 0-5; advanced crops ~day 1-2 | Low (advanced crops Med) |
| House stages 1-3 wood | 15 + 20 + 25 = 60 wood = 20 trees = 60 hits; once the first 14 trees fall the player waits 30 s for regrowth (`house-cost.js:22-26`) | min 2-30 (tutorial house1/house2/build) | Med |
| House stages 2-3 stone + 80 coins | 25 stone ≈ 17 rocks ≈ 50 hits (plus coal rocks); 80 coins ≈ welcome trade 30 + daily quests 10-20 + crops 5 | min 15-60 | Med (ch1 data: 5 devices stuck short on wood for 5+ min, design doc §1) |
| Bridge (end of ch1) | 10 wood + 5 stone (`world/bridge.js:13`) | ~min 30-60 | Low-Med |
| Field expansion 2 / 3 | 40w/20s/150c, then 90w/60s/450c (`farm-stage.js:14-15`) | ch6, about day 2-4 (*guess*) | High |
| World-tree branch decor (ch2/3/4) | small costs: wood 1-6, stone 1-4, coal 1 (`world/tree-board.js:16-30`). The hard part is the tag combination (habitat needs) | ch2-4, day 1-2 | Low for materials; wayfinding is the real wall |
| Cafe serve, ch3 (`tasteGated`) | cook 1 + serve 1, after the farm and kitchen branches (`story/rules.js:17,28`); ingredients include crop/forage/fish/egg/flour/juice | day 1-2 | **High** (ch3 stoppers spent 537 min) |
| Merchant: fertiliser / bait | fertiliser 20 coins, bait 25 coins for 5 casts (`data/catalog.js:198-199`); welcome trade 30/25 coins, once (`first-loop.js:9-15`) | min 5-15 | Low |
| Coins for tools / cosmetics / pets | forge stars 120 / 240 / 400 coins plus material (`workbench/rules.js:17-21`); pet 3000 (`pet/rules.js:43`); cosmetics up to 2600 | day 2-7 | High (long tail) |
| Fishing rarity | rainbow fish ~14 casts on average, 4.5 in rain, rain-only at p 0.22 (`dex-gates.js:7,24`); seasonal fish only in their 14-day season, p 0.12 | day 1+ | Med (it's weather, not effort) |
| Orchard | saplings 40-130 coins, grow 3-5 days, 2 fruit/day, piles up at most 3 days (`orchard.js:14-25`) | ch6, day 2+ | Med (waiting) |
| Kiln/vat (charcoal, flour, brick, juice…) | ready the next calendar day, 2 slots per station (`craft/recipes.js:23-34`, `craft/slots.js:6`) | day 1-2 | Med |
| Forge star upgrade | overnight plus coins/material above | day 2+ | Med |
| Daily quests | 5 per day paying 10/10/15/15/20 coins, lucky box on the first 3 (`data/npcs.js:175-180`), targets 3-5 actions (`npcs.js:197-207`); **no reroll exists** (grep) | day 1+ | Low-Med |
| Affinity | +2 hearts per day per NPC cap (`affinity/stages.js:16`). Stages: 3 neighbour, 6 friend (hidden tool quest unlocks, `tool-blueprints.js:13`), 10 best, 15 family → **at least 3 / 5 / 8 days per NPC**; gifts cost gem/honey/bug etc. (`npcs.js:13-17`) | day 1+ (after house 3) | High (hard daily cap) |
| Concert notes | 3 paid plays per day (`data/concert.js:22`), 1-4 notes each (`concert/rules.js:39`) → ≤12/day; instruments 20-40, decor 10-30 → ~2-4 days for a guitar | after the merchant opens, day 1 | Med (hard cap) |
| Weekly market tickets | 5 quests × 2 tickets = 10 per week, cap 15; hero item 6 + props 2 each = 10 per theme (`data/weekly.js:32-40`); targets like harvest 25 / water 40 / sell 30 | first Fri-Sun | Med |
| Mine / delve | 20 floors, ladder pity 5; the miner chain asks for coal 3, floor 5, chest 10, floor 20 (`data/delve.js:1-60`); gems only in fog (p 0.28) | day 2+ | Med |
| Decor drops | per-source odds 1/n with pity at 2n: **mine 1/64 (pity 128)**, firefly 1/28, dream 1/14 (`data/decor-sets.js:10-24`) | day 1+ | High for mine/firefly |
| Night-only content | firefly, herbs, night fish need night (~1/3 of the 8-min cycle *guess*); the bed skips to morning only | min 10+ | Low |
| Auction | open at day fraction 0.72-0.96 (`data/auction.js:23-24`), so up to ~6 min wait | evening, day 1 | Low |
| Restaurant | 100 s service, 5 coins per star (`restaurant/data.js:17-24`) | after the kitchen habitat, day 2+ | Low |
| Pond feeding | 1 per day, plus 1 ad feed per day (`pond/actions.js:4`) | after the bridge | Low |
| Boat runs / plaza | 3 runs per day (`boat/consts.js:3`); plaza capped at 30 per day (`data/plaza.js:15`) | day 2+ | Low |
| Mountain sled | opens on day 2 (`mountain/unlock.js:14`) | day 2 | Low |
| Seasonal (Halloween) | 3 ghosts per day, bundle exchange 2 per day (`halloween/layout.js:4`, `exchange.js:1`) | event days | Low-Med |
| Walking | island restaurant at z 620, dream island z −550 (`data/places.js:164`); travel is by gate or boat, not on foot (*guess*) | – | Low |

---

## Part 3: proposed placements, ranked by expected value (frequency × pain × fit)

"Exists" means already wired and only needs `PREPASS_ON`. Platforms: **A** = Android, **i** = iOS, **T** = Toss. Web (**W**) only after AdSense H5 approval.

1. **cafe_order (ch3)**, exists. (d) Missing ingredients up to `CAFE_CAPS`, inline in the goal-guide card. Unlimited within the 30/day cap. First shown: ch3. A/i/T. Conflict: overlaps the planned web paid kit (quest dropout kit).
2. **house2/house3 shortage card**, exists. (d) Up to wood 10 / stone 6 / coins 40. Shown at the house site. **Hide it while `body.coaching` is set.** `house-short` checks modal/cinematic only (`house-short.js` deps, `game.js:2982`), so today it **would fire during the tutorial**. First shown: after the tutorial, or when house2 is reached. A/i/T. Conflict: the paid kit on web.
3. **farm2/farm3 survey desk**, exists. (d) 40-coin cap against a 150/450 need, so roughly 1/4 to 1/10 of the cost: it helps without breaking the economy. Day 2+. A/i/T.
4. **sell_bonus**, exists. (b) +50%, ≤40 coins, in the shop sell row. Main coin source for forge, pet and cosmetics. Suggest a **separate 5/day cap**: the 30/day shared cap is too loose (up to 1200 coins/day). After house3. A/i/T.
5. **craft_rush (kiln/vat/forge)**, exists for kiln/vat. (a) Finish now, in the craft panel. Suggest **1-2 per day**. Not yet extended to the forge (`forge.js`); that would be new. Day 1-2. A/i/T.
6. **Affinity extra gift (new)**. (c) +1 gift heart today for one NPC (cap 2→3), button next to "오늘 선물 하트 n/2" (`affinity/book-ui.js:26`). 1/day across all NPCs. Turns 8 days to family into about 6. After the affinity guide is done. A/i/T.
7. **Concert extra play (new)**. (c) +1 paid play (`PAID_PLAYS` 3→4), 1/day, on the result screen once plays are used up. Day 1+. A/i/T.
8. **daily_double**, exists. (b) The day's coins again (5-30), inside the daily card. That card is itself a modal stacked with notices (onboarding audit #21), but the ad is an inline button, not a new modal. 1/day. Day 2+. A/i/T.
9. **farm_rush**, exists. (a) Mainly useful for advanced crops without fertiliser. Suggest 3/day. **Conflict:** it competes with fertiliser (a 20-coin coin sink), so keep the cap low. After house3. A/i/T.
10. **Bridge**, exists. (d) Small materials gap. ch1 drop-off is wayfinding (4 min median), so expect little lift. A/i/T.
11. **branch_<x>**, exists. (d) Tiny materials; the real block is the habitat tag combination, which the design doc §1 says not to sell. Low value.
12. **Weekly ticket +1 (new)**. (b) After finishing a weekly quest, "광고 보고 🎟️+1". Suggest 3/week, under `TICKET_CAP` 15 (`data/weekly.js:32`). First weekend. A/i/T.
13. **Orchard "water and ripen today" (new)**. (a) Advance one tree by one day. 1/day. ch6+. A/i/T.
14. **Bait or rain-luck chest (new)**. (d) Bait ×2 (worth 25 coins / 5 casts). 1/day. **Conflict:** replaces a coin sink.
15. **Mine / firefly decor drop "one more roll" (new)**. (c) One extra roll on a miss, 1/day per source. The pity timer stays as the guarantee. Day 2+.
16. **Daily quest reroll (new; no reroll exists)**. (c) 1/day for a quest the player can't finish. Day 1+ but after the tutorial.
17. **pond_feed_more**, exists. (b) 1/day. Low pain.
18. **Restaurant "double coins" after a service (new)**. (b) 1/day. Low.

No proposal touches **premium cosmetics** (cash only) or the **₩4,900 welcome box** (tool skins + firefly): ads give materials and coins, not cosmetics. A daily "free item" chest must never hand out premium or tool-skin items.

The real conflict is the planned web paid **quest dropout kit**: it targets the same house, bridge and cafe gaps. Keep ads on A/i/T and the kit on web, or make the kit clearly bigger and with no ad.

## Must not do
- **No interstitials or banners.** They contradict `pages/privacy.html:71-72`, the Play ads declaration and the owner's 10/29 decision.
- No ads during the spotlight tour, coach, E1 intro or story or chapter modals. Add a `coaching` check to `house-short` and `farm-rush` before turning `PREPASS_ON` on. Today house1 would show an ad during tutorial step ⑤.
- No new modal ad offers. Use only inline buttons on cards the player is already looking at. The audit's H3 and H5 already flag too many stacked pop-ups.
- No ads on wayfinding problems: ch1 drop-off, branch combinations, ch3 "can't find the branch" (design doc §1).
- Never skip a progress condition itself, only top up materials.
- Don't leave sell/farm-rush covered only by the shared 30/day cap. Give the repeatable coin placements their own small caps, or the coin economy inflates (the guardrail is 1.5× day-3 inventory).
- Before rewards get bigger, add server-side verification. AdMob is already sending the placement for verification, but no endpoint receives it. Today's counter sits in localStorage and is reset by clearing it.
- Don't show ad buttons on web until an ad provider exists (code already hides them). Never use AdMob inside Toss.

Not checked: real-device behaviour; affinity from talking or quests besides gifts; the exact night share of the cycle; forge timer details; Toss IAA review rules; the Play target age setting (Families policy). Biggest risk: switching `PREPASS_ON` on as-is shows ads inside the tutorial and leaves coin placements capped only at 30 a day.