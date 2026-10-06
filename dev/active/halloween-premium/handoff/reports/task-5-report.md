# Task 5 report
Status: DONE. Commit bc93f1d.
- reveal-pose.js: 10 REVEAL_COPY entries (verbatim), revealModeOf back->boxburst, BACK_CARD + revealCardOf.
- i18n-en.js: 10 catalog names, 2 trail reveal names, 10 descriptions, 'PREMIUM · 등 꾸미기', '🎃 할로윈 한정'. '바로 입어보기' reused (existing). No duplicate keys (grepped first).
- Spec doc: back-slot sentence already corrected in worktree (line 103); no edit (idempotent).
- TDD: RED `node --test tests/halloween-reveal.test.mjs` -> pass 1 / fail 3 ('pumpkin_glow: REVEAL_COPY 없음'); GREEN -> targeted 22 pass 0 fail; full npm test 1808 pass 0 fail.
- No existing test edited (reveal-pose.test.mjs had no back-slot assertions).
- Concern: '🎃 할로윈 한정' tag not yet referenced in code (dictionary entry only, per brief).
