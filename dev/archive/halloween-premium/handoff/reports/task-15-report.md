# Task 15 report - live Paddle prices (10 halloween items)
Command per item (key from keychain inline, never printed):
`PADDLE_ENV=production PADDLE_API_KEY="$(security find-generic-password -s calmforest-paddle-live -w)" node scripts/paddle-seed.mjs --only <id>`
All 10 CREATED (0 reused), one invocation each (a --dry-run on pumpkin_glow ran first, no key).
| id | price id | amount KRW |
|---|---|---|
| pumpkin_glow | pri_01m4807j5j6khycksbzbmdnwkj | 4000 |
| bat_swirl | pri_01m480837szjr9ww3dstdfxjc9 | 4000 |
| ghost_nightcap | pri_01m4809jq5tmmvq053cvzs02k5 | 4900 |
| ghost_cloud | pri_01m4809kqxdvecnhv3p1zhmvvw | 4900 |
| witch_classic | pri_01m4808g6tec957hrz23713efg | 4900 |
| witch_starry | pri_01m4809nv8rkt0143xtqpqhddn | 4900 |
| tools_batnight | pri_01m4809qsv0w8brw987qtez6ms | 4500 |
| tools_harvest | pri_01m480aknmys2r48mde2w5vqyh | 4500 |
| bat_wing | pri_01m480aq6xna9gesjz68aeydf1 | 4500 |
| bat_cape | pri_01m480as9abr8k1xdbmet9y3n7 | 4500 |
Diff: js/shop/price-ids.js only the 10 keys null -> pri_*; 7 existing untouched.
Tests: halloween-catalog assertion changed (regex, uniqueness, not equal to existing, cash {priceId,label}); npm test 1828 pass / 0 fail.
Commit: cea3bbb. No blocks. Note: a first loop attempt aborted early on a zsh PIPESTATUS quirk after items that had succeeded; no duplicates (idempotent, each item created once).
