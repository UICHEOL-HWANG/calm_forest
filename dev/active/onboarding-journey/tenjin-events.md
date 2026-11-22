# Tenjin events: rewarded ad journey

Read in Tenjin: UA report, In-App Metrics funnel (per campaign). Ad revenue (ILRD from `eventAdImpressionAdMob`): Ad Monetization report.
Only the native app sends these (Tenjin is absent on web and Toss).

| Event | When | Value | Kind |
|---|---|---|---|
| signup / tutorial_complete / first_chop / first_harvest / house_complete / first_share / push_granted | existing onboarding firsts | none | once |
| bridge_fixed | `bridge_repaired` | none | once |
| tut_<key> (tut_move, tut_chop, ... tut_curator) | `tutorial_step` (key only, order-independent for beta A) | none | once each |
| tutorial_skip_welcome | `tutorial_skip` with at=welcome | none | once |
| tutorial_skip_step | `tutorial_skip` with numeric at (coach skip) | 1-based step | once |
| rv_arm_ad / rv_arm_control | first `prepass_eligible` (arm from rewarded.js) | none | once each |
| rv_first_offer | first `prepass_eligible` in the ad arm | none | once |
| rv_first_complete | first rewarded ad completed | none | once |
| rv_complete_3 / rv_complete_10 | lifetime completes reach 3 / 10 (counter `cf_tj_rv`) | none | threshold, once |
| rewarded_ad_complete | every completed rewarded ad | watch seconds | every |
| rv_house / rv_cafe / rv_rush / rv_sell / rv_daily / rv_pond / rv_limit / rv_reroll / rv_double / rv_other | every completed ad, by slot group (`rvGroup` in js/tenjin-events.js) | none | every |

Slot groups: house (house1-3, bridge, farm2/3, branch_*), cafe (cafe_order), rush (farm_rush, craft_rush, orchard_*, forge_*), sell (sell_bonus), daily (daily_double), pond (pond_feed_more), limit (affinity_heart, concert_play, weekly_ticket), reroll (quest_reroll, drop_reroll_*), double (restaurant_double, bait_box), anything else is other.

Established players are seeded only with the onboarding firsts and bridge_fixed, never with rv_* once events.
Threshold events retry on later completes if a send failed (sent when count >= threshold and not yet recorded).
