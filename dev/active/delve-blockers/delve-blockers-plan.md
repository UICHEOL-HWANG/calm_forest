# delve-blockers plan

Playtest (2026-11-20) found 4 progression blockers in the mine delve, plus the lift has no design or ride motion.

1. Lift picker: only "1층" or deepest stop. Offer every open stop (1, 5, 10, 15, 20). New chooser UI, design compared with the lift.
2. Revisited floor same day: veins drop nothing silently. Draw veins as plain rock when ore is off, toast once on entry.
   Copy: "⛏️ 이 층 광맥은 오늘 다 캤어요. 내일 다시 차올라요"
3. Bait with 0 mushrooms: prompt hidden. Show prompt anyway, toast on press.
   Copy: "🍄 미끼로 줄 버섯이 없어요. 채집 숲에서 주워 와요"
4. Step desc lacks floor range. Append "· 지하 1~10층" / "· 지하 11~20층" to tap, bait, grab, reclaim (bait desc becomes "버섯 미끼 던지기").
5. Lift: redesign model, add collider, ride motion. 3 candidates rendered PC + mobile before shipping.

Order: tests first (RED) → 2·3·4 → lift sims → pick → lift build → browser check.
