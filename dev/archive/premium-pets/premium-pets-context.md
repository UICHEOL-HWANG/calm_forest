# Premium pets — context
Last Updated: 2026-10-20 (implementation)

## Rules carried from js/pet/rules.js (must hold)
- Pets must not undercut workers: command-only, player radius 4.5, no offline settlement
- No harvest or planting. Growth changes looks only
- Coin pets: water/weed/pest, chain 5, 2.5 s per cell, rest 20 s -> 9.2 cells/min

## Balance rule for paid pets: different, not stronger
- Chore throughput stays within 8-10 cells/min (coin pet 9.2)
- Any bonus outside chores is capped per day and small (<= ~32 coins/day; crop 5, fish 8 coins)
- A specialty trades breadth for depth, or trades one chain slot for a capped bonus

## Candidates (sims/premium-pets-sim.html)
| | pet | chores | rate | specialty |
|---|---|---|---|---|
| A | ☁️ 몽실 구름용 | water only, 5 at once (1 s), rest 30 | 9.7/min | rain cloud |
| B | 🦔 꽃송이 고슴도치 | weed+pest only, chain 6, rest 24 | 9.2/min | petal burst |
| C | 🦎 반짝 우파루파 | all, chain 4, rest 20 | 8.0/min | fishing +1 at 10%, max 4/day (<=32 coins) |
| D | 🦄 아기 유니콘 | all, chain 4, rest 20 | 8.0/min | daily gift 1-3 forage (<=21 coins) |
- Proposed price: KRW 6,900 each (tool sets 5,000, skins 9,000-10,000)
- Store copy must not say "no gameplay effect" for pets; say "same total work as coin pets, different style"

## References
- Disney Dreamlight Valley premium critters: gathering specialty near player + friendship bonus chance (dreamlightvalleywiki.com Corgi Puppy / Lucky)
- Palworld work suitability levels per job (palworld.wiki.gg/wiki/Work_suitability) -> stat pips
- Palia: pets cosmetic first, later "Courier" utility as an experiment (palia.com/news/broadening-store-with-care)
- Ooblets: farm-wide helpers were hard to balance, moved to area-limited oobcoops (devlog)
- MapleStory: paid pet auto-pickup = classic convenience monetization

## User choice
2026-10-20: all 4, KRW 6,900 each. Unicorn legs must connect naturally to the body (fixed: legs run into the body, round neck, smaller snout).

## Implementation (uncommitted, branch feat/premium-tool-sets)
- ids: cloud_dragon, hedgehog, axolotl, unicorn (js/pet/rules.js PET_KINDS, premium + won + ability)
- art: js/pet/art-premium.js (baked, 2-8 calls; coin spirit is 16), art.js buildPet fallback
- loop: js/spaces/farm-auto.js (tasks filter, burst, daily gift), js/spaces/fishing.js (fish bonus), game.js cleanPet fields
- shop: js/spaces/cafe.js pet tab, premium = cash only, hidden where cash checkout is unavailable (small edit; feat/meta-pixel also edits cafe.js -> expect a merge)
- server: sql/migrations/migrate_premium_pets.sql (trigger strips unpurchased premium pets incl. renamed keys) applied to prod 2026-10-20, rollback self-test passed
- Paddle: 4 live products seeded 2026-10-20 (price-ids.js)
- Deploy: not yet; 4 platforms together. Paid pets buyable on web only (cash checkout)
- In-game check: guest boot, __pet.give('unicorn') renders at coin-pet size, daily gift toast fired
