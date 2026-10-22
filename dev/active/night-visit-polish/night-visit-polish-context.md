# Context — Last Updated: 2026-10-22 (impl done, review pending)

Worktree: .claude/worktrees/night-visit-polish (branch feat/night-visit-polish from origin/main e563f72c)

Key files
- js/spaces/night-visit.js — resolveNightVisit (toast + note fetch), investigateTrace, maybeDuel (note before duel), showNote via ui.showHintModal
- js/duel/note-queue.js + tests/night-note-queue.test.mjs — note ordering rules (to change: lose-only)
- js/duel/index.js — duel source: enterDuelStage → ui.openDuel → banner; result → endMatch
- js/duel/ui.js — COPY strings, duel card
- js/spaces/shovel.js:161 traceTarget (1.7m)
- js/game.js:6664 action dispatch; #talk-btn (index.html:1581) is mobile proximity button pattern
- functions/api/night-note.js — Gemini prompt (author 농부 삼촌), cache per date/animal/crop/lang

Decisions
- Note only after a lost duel (user, 2026-10-22): losing is the only real loss, so comfort + defense tip belongs there.
- Mockups: sims/night-visit-polish/compare.html
