# Night visit polish — plan (approved 2026-10-22)

1. Proximity button "🐾 흔적 살펴보기" near a trace (same slot/style as #talk-btn), mobile + PC prompt.
2. Guide to traces after the night-visit toast (minimap 🐾 marker + edge arrow).
3. Farmer note: no longer shown before the duel. Shown only after a LOST duel (not on quit, not on win).
   - night-note API prompt rewritten: lost-duel context + comfort + one defense tip (scarecrow / fence).
   - fallback copy when Gemini note is missing.
   - GA4: record note shown.
4. Note card redesign (3 mockups → user pick).
5. Duel entry transition "밤손님과 대결!" (3 mockups → user pick).

Order: mockups (4, 5, button) → user pick → implement 1–5 with tests → review → deploy (web, toss, itch, android, iOS).
