# Context
Last Updated: 2026-10-19 (implementation)

- Worktree: .claude/worktrees/premium-tool-sets, branch feat/premium-tool-sets (from origin/main 437398c4)
- Template: sims/referral-reward-sim.html (tool tab + character + bloom 0.85 + statsOf bake-bucket count)
- Game rules: js/cosmetics/tool-skins.js header (shape not attachments, silhouettes kept, glow small only)
- Existing tool themes: shroom, moon, bloom (inline), batnight, harvest (halloween file), star (crystal, referral reward)
- Bundle: feat/meta-pixel js/shop/bundles.js (other session owns it)

## Candidate themes (round 1)
- maple 🍁 단풍 숲 · frost ❄️ 눈꽃 겨울 · honey 🐝 꿀벌 꿀단지 · kitty 🐱 냥냥 · shell 🐚 바닷가 조개
## Candidate decorations
- head: acorn_cap 🌰 도토리 모자, bee_band 🐝 꿀벌 더듬이 머리띠
- back: kitty_pack 🐱 고양이 배낭, nest_pack 🪺 아기새 둥지 배낭
- trail: maple_trail 🍁 단풍잎, bubble_trail 🫧 비눗방울

## User choice
2026-10-19: user said "다 넣어줘 시안들" = all 5 tool sets + all 6 decorations.

## Implementation (uncommitted, branch feat/premium-tool-sets)
- Tools: js/cosmetics/tool-skins-{maple,frost,honey,kitty,shell}.js + tool-skins-extra-kit.js, wired in tool-skins.js (extraThemes / extraUmbrellaLook), TOOL_THEMES
- Decos: js/cosmetics/art-forest-set.js (flattened so mergeStatics merges; 1-2 calls), trail.js marks, trail-fx.js bubble particles (FX_IDS)
- Prices: tools 5,000 · head 3,500 · back 4,500 · trail 4,000 (KRW)
- SQL: guard list in migrate_referrals.sql + migrate_security_hardening.sql + new migrate_premium_sets_2.sql (not yet run on prod)
- price-ids: null until `PADDLE_ENV=production node scripts/paddle-seed.mjs` (not yet run); seo JSON-LD test fails until then
- Sim now imports game modules (no duplicate builders)
- Deploy: 4 platforms together (old clients strip unknown cosmetic ids)
