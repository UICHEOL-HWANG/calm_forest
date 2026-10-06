# Task 3 report
Implemented per brief: import saleOpen, added `now` param, `if (!saleOpen(item, now)) return 'hidden'` after the platform check (order: owned -> non-web hidden -> out-of-window hidden -> existing rules). slotVisible untouched.
RED: `node --test tests/premium-row.test.mjs` -> fail 1 (not ok 9, BEFORE case returned 'buy').
GREEN: premium-row + halloween-sale-window tests -> pass 17 / fail 0. Full suite: 1800 pass / 0 fail.
Files: js/shop/premium-row.js, tests/premium-row.test.mjs. Commit 2961925.
Concerns: none.
