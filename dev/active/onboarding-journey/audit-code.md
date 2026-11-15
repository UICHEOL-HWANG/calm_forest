## 고요한 숲: inventory of guidance, interruption and announcement mechanisms, with conflicts (read-only audit of merge-main @ fd676198)

I traced this by reading the code. I ran nothing in a browser. Line numbers point at `js/game.js` unless another file is named. Where something is a guess I say so.

### How "existing player" is detected (shared background)
- **Unlocks:** a save with no `unlocks` field is treated as `legacy` and every place counts as open (`js/world/unlocks.js:9,99-114`). `CONFIG.UNLOCKS='on'` (`js/config.js:131`).
- **Experiments:** E3 and E6 only enrol new devices. A returning device gets `enrolled:false`, which puts it in treatment by default:
  - `spaceLinkOn` is true, so the yard guide is on (`js/exp-e3.js:20,36`).
  - `guideRevampOn` is true, so the goal guide and house-short are on (`js/exp-e6.js:36`).
- **E1:** E1 is rolled out (`E1_ROLLOUT=true`, `js/exp-e1.js:14`). It applies to new web/Toss devices only.
- **Other flags:** `tutorialSeen`, `character`, the `hintsSeen.*` keys, `affinity`, `concert.seen/notes`, `weekly.seenBoard/seenMarket` (compared per week), `port.guideDone`, `restaurant.guideDone/services`, `auction.introSeen/bannerDate`, `story.ch`.
- **Port for old saves:** a save with no `port` field gets `defaultPort()` with `guideDone:false` (`js/port/rules.js:16`).

### Inventory (compact)

Column key: **Who** = N (new player) / E (existing player) / B (both). **Persisted** = how "already shown" is remembered. **Checks** = what it waits for before running.

| # | Mechanism | Start trigger | Who | Conditions | Shows | Ends | Persisted | Checks |
|---|---|---|---|---|---|---|---|---|
| 1 | Character select, then prologue cutscene | 3097; index 5024-5029 | N | no `character` | modal, cutscene | user | `character` | – |
| 2 | E1 intro sheet (3 cards) + 🌾 bubble on ripe plot | `js/spaces/e1-start.js:103-143` | N (web/Toss) | fresh device | bottom sheet, 3D bubble | first harvest | `e1.intro/harvested` | – |
| 3 | Spotlight tour (spot steps) | index 6122-6133 `startOnboarding` | N | `!spot_*` keys | spotlight overlay (`spot-on`) | steps done | `spot_*`, `spotV2` | `spotBlocked` |
| 4 | Tutorial coach, 11 steps (move…bridge, curator) | index 6166 `startCoach`, 6007 | N | after the spotlight tour | `#coach` card in the context slot; sets `body.coaching` | curator met or skip | `tutStep` | – (it is the top of the chain) |
| 5 | Story map, shown once | index 6881 | N | after coach start | `#story-modal` | close | memory only (`storyMapShown`) | – |
| 6 | Story chip | index 5158 | B | not `allDone` | `#story-chip` (hidden during coach, banner, sea, menu) | – | – | CSS only |
| 7 | Story chapter-complete modal | 1284 `queueStoryModal` 1414 | B | `syncStory` | `#hint-modal` (story) + confetti | OK | `story.ch` | coach (it becomes a toast), `treeShotBusy`, `anyModalOpen`, 20 retries |
| 8 | NPC return modal / owl bridge modal | 1437-1448 | N | unlock event | story modal | OK | `owlBridge` | via `queueStoryModal` |
| 9 | Goal guide (E6 new arm): tutorial, farmBranch cine, mine, story steps (branchWater/tasteGated) | `js/guide/goal-guide.js:122-136,281`; created at 2995 | N mostly (story steps also E) | `coaching` + `tutStep`, `farmBranchDue`, `atMine`, story rule | `#goal-arrow` pin/edge chip with distance, ground ring, letterbox cine, step card | arrive / rule changes | `guideCine_*`, `guideFarmTab` | hides arrow on `modalOpen`, `!cameraFree`, `otherGuide=guideBusy`. **The cine does not check `otherGuide`** (goal-guide:291-294) |
| 10 | House-site experiment (50% `guide` arm) | `js/spaces/house-guide.js:110-192`; 2958 | N | wood≥15 && houseStage 0 | cinematic + green compass at feet + ring + reminder sound every 2.8 s after 8 s idle | houseStage>0 | `houseGuide.shown/arrived` | `cameraFree`, `modalOpen`, `inVillage`. **Not** coach, guideBusy or the goal guide |
| 11 | house-short shortage card (house/bridge/farm desk) | `js/guide/house-short.js:61-82`; 2975 | B (E6 new) | near spot, resources short | card (z 23); ad button off (`PREPASS_ON=false`, `js/tuning.js:8`) | leave | – | `modalOpen`, cinematics |
| 12 | Merchant welcome visit | `js/spaces/npc.js:678` (`rearmMerchant` 3317) | N | 5 wood / 1 fish / 4 crops | NPC walks up, then `#merchant-modal` | buttons | `merchantVisit/Met` | `anyModalOpen` only |
| 13 | firstHint modal (~16 keys: sea, mine, mountain, observatory, museum, night…) | 1589 | B | first entry into a space | `#hint-modal` card | OK | `hintsSeen[key]` | `coachActive`, `anyModalOpen`, mgView, duel, intro (20 retries) |
| 14 | firstHintBanner (~40 gate/station keys) | 1608; `js/spaces/doors.js:277-540` | B | approaching a gate | `#hint-banner` 1.4-3 s | timeout | `hintsSeen[key]`, burned when shown | `coachActive` only |
| 15 | Hint-banner queue (shared by all banners) | index 4358 `nextHintBanner`, 4700 | – | FIFO | `#hint-banner`; attention banners stay 8 s | – | – | **only** `slotQuest` waits for `cine-open`; no priority, no dedupe, no modal check |
| 16 | Guide-book nudge banner | `js/game-ui/guide-panel.js:94` | N | coach ends or is skipped | banner, tappable | – | `guideNudgeSeen` | – |
| 17 | Orchard quest offer / owl next-step | `js/spaces/orchard-actions.js:153,178`; endCoach index 6191 | N | first harvest, farmer open | attention banner, seed grant, quest-panel card | – | `progress.orchardQuest`, `owlAfterHarvest` | `coachActive` |
| 18 | Cos (sprout shop) quest | `js/spaces/cos-quest.js:16` | N | after tutorial / skip, owns no cosmetic | banner, 🎀 bubble over shop, quest-panel card | buy | `progress.cosQuest` | `coachActive` (banner only) |
| 19 | Quest panel (NPC, orchard, cos, miner, job, port card) + `#aff-track` | `js/spaces/npc.js:874`; index 3214-3217, 6580 | B | – | panel at left top (shell) | – | – | hidden while coaching (≤640) and while the yard guide runs |
| 20 | NPC `!` glyph | `updateNPCGlyph` (npc.js) | B | quest state | 3D glyph + minimap badge | – | – | hidden by yard guide / concert |
| 21 | Daily card, then notices | 1539-1561, 1570 | E (needs `tutorialSeen`) | first login of the day | `#daily-modal`; on OK `#notice-modal` (only if prefetch finished) | OK | `daily.lastDate`, `noticeSeenId` | – (shown immediately) |
| 22 | Weather / severe-weather / nickname / story / retro toasts | 3072, 3091-3093, 3083, 1304, 1309 | B | boot | toast (`afterDialog`) | timeout | per session | toast queue |
| 23 | Worker catch-up summary, night-visitor result | `js/spaces/farm-auto.js:369,390`; `night-visit.js:255` | E | offline time passed | `#hint-modal` after 1.4 s; toasts | OK | – | none for the 1.4 s modal |
| 24 | Neighbour visitors modal (6 s) and daily neighbour banner (14 s) | `js/spaces/neighbor.js:338-375` | E (`tutorialSeen`, online) | daily | modal; attention banner, tappable | – | localStorage day key | `whenNoModal` (20 tries). **No `isOpen('neighbor')` check** |
| 25 | Port guide, 12 steps | game 6643 `maybeStartPortGuide`; `js/port/index.js:596,722`; `guide-steps.js` | **E and N** | `isOpen('port')` (kitchen habitat, **or a legacy save**) && !atSea && !restaurant guide && !yard | `#guide-card` "n/12" + gold ring + chevron + edge arrow + action-button pointer | all steps done | `port.guideDone` only, so it **restarts every session**; no stall, no "later" | only restaurant and yard, at start. **No modal, coach or pastOnboarding check** |
| 26 | Port island quest guide | `js/port/index.js:686` | B | on the island | same `#guide-card` | – | – | – |
| 27 | Restaurant guide | `js/spaces/restaurant.js:224` | B | `isOpen('restaurant')`, `!guideDone`, services 0, port guide inactive, yard inactive | `#guide-card` steps | done | `restaurant.guideDone` | port, yard |
| 28 | Auction: daily evening banner, then arrow, then 3 intro cards | `js/auction/index.js:120-161,212`, `onboard.js:27` | B (merchant open) | evening, not joined today | attention banner (`slotQuest`); tap starts a compass + ▼ + distance + ring | arrive | `auction.bannerDate` (**daily**), `introSeen` | `uiBusy` (modal, coach, spot), cine, `mgView`. **Not guideBusy, not the goal guide** |
| 29 | Weekly board / market guide + Friday-Sunday banner | `js/weekly/index.js:128-154`, `guide.js`; `bridge.js:32-55` | B | `pastOnboarding = isOpen('merchant')`, `!coaching`, `seenBoard !== week` | auction-style compass + ▼ + ring; label "화살표를 따라가요!"; 🛒 attention banner only when the target is the market | arrive or open the board | `weekly.seenBoard/seenMarket` per **week**; banner week in localStorage | uiBusy, cameraFree, `otherGuide=guideBusy` + coaching. The banner ignores otherGuide on purpose. `track: () => {}` (no `guide_step`) |
| 30 | Concert guide | `js/concert/index.js:93-110`, `guide.js` | B | `!tutorial && !seen && notes===0`, merchant open | same compass style, generic label, **no banner or explanation** | arrive / open | `concert.seen` (set when opened); `guideOff` lasts one session | guideBusy + coaching + yields to the weekly guide via body class |
| 31 | Yard / pond guide (E3 on; returning devices are on) | `js/pond/yard-guide.js:99-110`, `yard-steps.js:23` | **E and N** | bridge fixed, 5 s idle with `free()`, `yardTries<2` | 🦉 attention banner + `#guide-card` 5 steps; hides story chip, quest panel, app banner and NPC glyphs | done, or 600 s stall | `yardFill`, `yardTries`, `pondD1` | `free()`: modal, coach, port, restaurant, auction, cinematics. **Not affinity, not weekly or concert** |
| 32 | Affinity intro card, then affinity guide | index 5767-5771, 6545-6560; `js/affinity/index.js:257`, `guide.js:41` | B (house stage ≥3, all affinity 0) | closing **any** NPC modal | `#affintro-modal`; "go" starts `#guide-card` 2 steps (crop refill toast) | gift given | `affIntro`, `affGuideDone` | **none**: no coach, guideBusy or yard check |
| 33 | Affinity retro letters toast + menu dot; stage-up toasts | `js/affinity/index.js:109-116,73-91`; 2657 | E | boot | toast + `#hud-menu` dot + 📮 letters tab | read | `affRead/affClaim` | `afterDialog` |
| 34 | Signup nudge (harvest / house) | `js/signup-gift/index.js:10-31`; game 8286; `farm-auto.js:152`; `e1-start.js:191` | N guest | first harvest, house stage 1 | `#nudge-modal` + gift card | button | `signupNudge.{harvest,house}` | busy = coach / modal, **but fires anyway after 120 s** |
| 35 | Signup gift box | `js/signup-gift/index.js:52-71`; index 6333 | N (new account) | server | `#gift-box-modal` | OK | server | `whenIdle` (120 s cap) |
| 36 | Promo gift letter | `js/promo-gift/index.js:18-90`; index 6330 | N mostly (promo link) | stored code | envelope modal | close | server | `whenIdle` (**120 s cap**) |
| 37 | Push permission card | `js/push-ui.js:77-101`; `farm-auto.js:144`; endCoach 6193 | N (Android/iOS app) | first harvest zoom | `#hint-modal` with preview | buttons | `pushAsk` | mgView, duel, `spotActive`, anyModal. **Not the coach** |
| 38 | App banner (web → store) | `js/app-banner.js:130-175`; `app-banner-ui.js:32` | B (web) | first `harvest_crop`, or 300 s fallback; once a day | `#app-banner` (bottom 282 px; top 162 px on short phones); hides chip + panel | 10 s / ✕ | localStorage day, dismissN | body classes including `coaching`, any `-modal`. **Not the hint banner or guide card** |
| 39 | Churn-predictor banner (50% of sessions are "treat") | 2440-2484 | B | 15 s; server threshold decides | `#hint-banner` attention | – | ≤2 per session | `intro`, `retentionGuidanceSuppressed` |
| 40 | Retention guidance banner | 2538-2571; `js/tuning.js:28-38` | B (mostly new) | 180 s / 600 s, rule-based | `#hint-banner.slot-bottom` | – | 1 per session | `retentionGuidanceSuppressed` (coach, modals, CSS-hidden states) |
| 41 | Beta map-open banner | 2398 | beta only | `/^beta_/` | banner | – | `mapOpen_*` | coach, modal |
| 42 | Decor-drop banner | `js/decor-drops/index.js:54`; 7846 | B | opening kitchen etc. | banner with image, tappable | – | `drops.banner[set]` per day | none (it fires right as the kitchen menu opens) |
| 43 | Decor placement guide / mist guide | index 6029-6053; mist | B | first indoor placement | `#decor-guide` in the slot | – | `decorGuide` | coach-aware |
| 44 | Owl special delivery | `js/spaces/npc.js:554` | B | 3 dailies done | NPC flies to the player, then modal | – | – | anyModalOpen |
| 45 | Install survey | `js/install-survey-ui.js` | N (app first run) | loading screen | `#survey-card` | – | stored | pre-game, no conflict |

E2 has ended (arm "control", login screen first), so it shows nothing in game. E5 changes only login-screen copy.

---

## Ranked findings

### HIGH

**H1. There is no single guide arbiter. `guideBusy()` leaves out half the arrows, so two or three arrows can show at once.**
- `guideBusy` (1644) covers port, restaurant, auction, affinity and yard only.
- It does **not** cover:
  - the goal guide (`#goal-arrow`)
  - the house compass (`houseGuidance`)
  - the weekly guide or the concert guide
- The goal guide hides only for `guideBusy` (goal-guide:297). The weekly and concert guides yield to `guideBusy || coaching` (`js/weekly/bridge.js:43`), not to the goal guide.
- **Result:** after the tutorial, chapter 2 (`branchWater`) shows the goal arrow to the world tree. At the same time the weekly guide draws its own compass, ▼ and ring to the board. If the player then taps the evening auction banner, a third arrow starts. The auction path never checks guideBusy or the goal guide (`js/auction/index.js:134`).
- The house compass also runs alongside the tutorial goal arrow and the coach. It does not check coach or guideBusy (house-guide:155-176), though house1 has no goal-guide key, so in practice it adds a third pointer only during that step.
- **Fix:** make a single `guideArbiter` with a priority list: tutorial/coach > house > goal-story > port/restaurant > yard > affinity > weekly > concert > auction. Every guide registers with it and asks `mayShow(name)`. `guideBusy` already exists as the obvious seed; extend it to include `goalGuide`, `houseGuidance`, weekly and concert (each module would expose `active()`).

**H2. Port and restaurant guides start for every existing player on update, never time out, and block everything else.**
- `maybeStartPortGuide(isOpen('port')...)` runs every second (6643).
- For a legacy save `isOpen` is always true (`unlocks.js:114`), and old saves get `guideDone:false` (`port/rules.js:16`).
- So every pre-unlocks player gets the 12-step port card ("1/12 포구 섬 가는 배가 생겼어요…") the moment they enter, whatever their progress. Players with the kitchen habitat done get it too.
- It does not check modals, coach or onboarding. It has no stall timeout and no "later" option (unlike the yard guide's `YARD_STALL_SEC` and `YARD_MAX_TRIES`). It restarts every session until finished.
- Because the port guide sits in `guideBusy`, while it is pending:
  - the yard guide cannot start (`free()` excludes the port guide)
  - the weekly and concert guides cannot start
  - the goal arrow stays hidden
- After the port guide comes the restaurant guide, which behaves the same way.
- **Fix:** give port and restaurant the yard guide's `tries` + stall + idle-start rules. Gate them on "first unlock seen live" rather than `isOpen` for legacy saves, or open with a banner the player taps.

**H3. Login nudge and promo letter appear in the middle of the tutorial; the push card ignores the coach.**
- `whenIdle(..., maxMs=120000)` fires after 2 minutes **even while busy** (`signup-gift/index.js:15`, `promo-gift/index.js:20`).
- The `house` nudge trigger (8286) fires at tutorial step ⑤ (house1). The coach is still active for several more minutes, so the guest `#nudge-modal` lands on top of the coach.
- Promo-link players are new by definition. Their envelope reaches the 120 s cap during the spotlight tour or coach.
- The push card (`push-ui.js:87`) checks `spotActive` but not `coachActive`. On Android/iOS it pops 2.6 s after the first harvest, at coach step ⑦. The second `offerPush()` call in `endCoach` (index 6193) was meant as the fallback for this, but the first call is never deferred.
- **Fix:** route these through one modal queue that treats `coachActive` as a hard block with no time cap, and flush it from `endCoach`. `afterModals` and `queueStoryModal` (1414-1436) already exist and could be generalised.

**H4. Players who skip the tutorial are pointed away from the core loop.**
- If the coach is skipped, `coaching` is off, so `tutGoal` never runs. The goal guide gives no direction for chapter 1 (`homeBridge`; `STORY_GUIDE_RULES` is only branchWater and tasteGated).
- The weekly guide only needs `isOpen('merchant')`, which unlocks at 5 wood. So within the first few minutes these players get a gold arrow to the weekly board, then the concert arrow (concert `guideNeed`). Neither says what the destination is: the label is the auction copy "화살표를 따라가요!" (`bridge.js:46`).
- In the evening the auction banner and arrow follow too.
- **Fix:** set `pastOnboarding` for weekly, concert and auction to "tutorial done or skipped **and** houseStage ≥ 3 (or story ch ≥ 2)". Skipped players should get the house goal from the goal guide.

**H5. An existing player who updates sees a burst of announcements in the first 60 seconds.**
Scenario: a legacy save, Friday evening, first login of the day. In order:
- daily card modal (t≈0), then the notices modal on OK
- worker summary modal (1.4 s) or night-visit modal, if relevant
- the port guide card behind those modals from about t=1 s (H2)
- severe-weather toast (3 s), affinity retro-letters toast (boot), story "new chapter" toast if relevant
- neighbour visitors modal (6 s)
- three 8-second attention banners queued one after another: 🏡 neighbour (14 s), 🛒 weekly market (Friday; it ignores guides on purpose), 🔨 auction (every 0.5 s check once `uiBusy` clears)
- the churn banner at 15 s in 50% of sessions, if the server threshold passes
- the affinity intro modal on the first NPC conversation (if all affinity is 0)
- the retention banner at 3 minutes

That is about 3-4 modals, 3-4 banners and one persistent multi-step guide. Of the newly shipped features, only the weekly market gets a banner that says what it is. The concert never explains itself (H6).

A non-legacy player with the bridge fixed and no kitchen habitat gets the yard guide instead of the port guide: owl banner plus 5 steps, starting after 5 s idle.

- **Fix:** one "what's new" card per release, listing the features unlocked for this save, followed by at most one guide per session, picked by the arbiter in H1.

**H6. Shared `#guide-card` DOM: port, restaurant, affinity and yard guides draw over each other.**
- All four use `createGuideView`, which grabs the same `#guide-card`, `#guide-mark` and `#guide-edge` (`js/guide/view.js:14`). Each draws its own 3D ring and chevron.
- The affinity guide is started by the player and checks nothing.
- `yardGuide.free()` (3045) does not exclude `affinityGuideActive`.
- The port guide checks only restaurant and yard at start. Once running it never yields.
- When two run together, text and position flicker every frame (whoever updates later in the loop at 6606-6655 wins) and two gold rings show.
- **Fix:** have `startAffinityGuide` refuse or queue while `guideBusy()`, and add the affinity guide to `yard.free()`. Better still, the arbiter from H1.

### MEDIUM

**M1. Weekly and concert guides repeat and explain nothing.**
- `seenBoard !== week` means every player gets a new board arrow every week, forever, until they open the board (`weekly/guide.js:5`). No banner for the board, no opt-out, no stall timeout.
- The concert arrow has no copy at all and comes back every session until the player opens the stage.
- Both pass `track: () => {}`, so there is no `guide_step` funnel. That goes against the onboarding-arrow rule.
- **Fix:** add a one-line banner or card, a tries/stall limit like the yard guide, and the real `trackEvent`.

**M2. The auction banner returns every evening.**
- `bannerDate` is per day (`onboard.js:27`). Anyone who hasn't joined today gets an 8-second attention banner each evening.
- It checks `uiBusy` but not active guides or the goal arrow.
- **Fix:** stop the daily banner after N dismissals or after the first join; respect the arbiter.

**M3. Gaps in what reaches the player.**
- The neighbour daily banner and picker skip the story-chapter-8 unlock (`neighbor.js:342,351`; the unlock is at `unlocks.js:79`). A chapter-1 player is invited into a place the map still shows as locked. This is the inverse of "told before usable": the place is usable but the story gate is bypassed.
- The concert, weekly board and auction stage have no first-visit `firstHintBanner` like other places do (doors.js only has prompts).
- Affinity is only discovered by closing an NPC conversation with all affinity at 0, or through `#aff-track` in the quest panel. Existing players with any hearts never see the intro card.
- Notices pop up only after the first daily card of the day (1560). Later sessions show only the menu dot.

**M4. The affinity intro card probably appears at tutorial graduation.**
- `closeNpc` (index 5767) shows the intro with no coach check, as soon as house stage ≥3 and every NPC's affinity is still 0.
- The curator conversation at coach step ⑪ is likely an NPC modal (my guess; I did not run it). If so, the intro card stacks with:
  - the chapter-1 story modal (`afterModals`)
  - the chapter shot
  - the graduation toast
  - the guide-book nudge and the orchard banner
  - then the yard guide 5 s later (H6 conflict if "go" was tapped)
- **Fix:** defer the intro until after the coach and the story queue.

**M5. Duplicate announcements.**
- **Port:** quest-panel `portCard` + `#guide-card` steps + NPC `!` glyph all describe the fisher quest.
- **Chapter 2:** the story chip goal, the goal-arrow card and the tree board hint all say the same thing.
- **Cos quest:** banner + 🎀 bubble + panel card + `firstHintBanner('cosShop')`. During the tutorial the coach ⑨ "dress" step + goal arrow to cosShop also cover it.
- **Affinity:** `#aff-track` "start" line + intro card + stage-up toast + letter toast + menu dot.
- **Weekly market:** 🛒 banner + arrow on the same frame.
- **Fix:** when an arrow guide is active, hide the matching quest-panel card and glyph. The yard guide already does this via `yard-guiding` CSS; generalise that class.

**M6. Hint-banner queue problems (it is the closest thing to a central mechanism).**
- It is FIFO with no priority or dedupe, and it does not wait for modals.
- Banners shown while CSS hides them (menu, sea, decor-guide, habitat meter) are burned. Weekly, auction, neighbour, yard and cos banners don't check this; only retention and app banner do.
- **Fix:** add priority, dedupe by key, and a `visibleNow()` check inside `nextHintBanner`.

### LOW

**L1. Mobile layout clashes.** All derived from CSS; none measured.
- **Portrait phones:**
  - `#guide-card` sits at bottom 280 px (index 1595).
  - That is the same row as `#app-banner` (bottom 282, index 1331), `#hint-banner.slot-bottom` (1883) and the coaching hint banner (1879).
  - The yard guide hides `#app-banner`, but port, restaurant and affinity guides don't.
- **360×740:**
  - The app banner moves to top 162 at full width (1353). The hint banner sits at top `max(162, rcol-bottom)`, right-aligned, 58vw (2911). The two can overlap.
  - The hud-shell's `!important` `--qp-top: 10px` (`js/hud/hud-shell.js:28-30`) cancels the old "push the quest panel to 255 px while a banner shows" fix (index 2908). A quest panel taller than ~150 px (2 cards + `#aff-track`) can therefore overlap the right-side banner by up to ~10vw again (the 52vw + 58vw issue).
- **740×360:** `#guide-card` is at top 8 px in the centre. I don't expect overlap with the 200 px quest panel, but did not verify.
- **Fix:** one bottom-row stack manager, like `layoutPrompts()`, that stacks guide card, app banner and slot-bottom banners.

**L2. The goal-guide `farmBranch` cinematic ignores `otherGuide`.** It can steal the camera while the yard or port guide is running (goal-guide:291-294).

**L3. House-site compass reminder sound.** It loops every 2.8 s with no cap until house stage >0, across sessions. This applies to the `guide` arm of the house experiment.

### Intended new-player sequence (web/Toss, E1 rollout), as the code would actually fire it
1. Character + nickname, then prologue.
2. E1 three-card sheet, then 🌾 bubble, then first harvest.
3. **Guest login nudge modal** (it comes before the tutorial: `otherModalOpen` waits on `nudgeWaiting`). The app banner is held back until modals close, for up to 2 minutes.
4. Spotlight tour, story map, then coach ①-⑪, with the goal arrow on each step and the house compass during house1 (50%).
5. Interruptions during the coach: the house-trigger login nudge (≤120 s later, H3), the promo letter (≤120 s), and the push card on apps.
6. At ⑪ curator: possibly the affinity intro (M4), then chapter-1 modal, chapter shot, graduation toast, guide-book banner, orchard banner, push card (app).
7. Then the yard guide (5 s idle, about 5-10 min), then goal arrow ch2 **plus** weekly arrow together (H1), then concert arrow, plus the evening auction banner.
8. The port and restaurant guides arrive later, once the kitchen habitat is done, and then persist.

### Central mechanisms that already exist and could be extended
- `guideBusy()` for arrows (incomplete).
- `queueStoryModal` / `afterModals` / `storyModalsWaiting` for modals (used by story items only).
- The `hintBQ` banner queue (FIFO).
- `retentionGuidanceSuppressed()` / app-banner `suppressed()` as visibility predicates.

The smallest complete fix is to (a) put every arrow guide behind `guideBusy` plus a priority, (b) send every modal through `afterModals` with `coachActive` as a hard block, and (c) give `nextHintBanner` priority and dedupe.

Not checked: real-device layout (all mobile findings come from reading CSS), the server churn threshold, restaurant step copy, tool-tier, mountain and dream internals beyond their `firstHint` calls, and whether the curator conversation actually goes through `#npc-modal` (M4 is a guess). Biggest risk: H2 hits every legacy existing player on their first session after this deploy.
