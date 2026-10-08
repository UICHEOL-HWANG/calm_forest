# Metrics SQL (M5)

Definition: `docs/analysis/METRICS_FRAMEWORK.md` (unchanged).

## Execution

Each metric SQL uses the temporary tables defined once in `_filters.sql`.
Execute the common script and the requested metric in the same BigQuery script.
`run.py` composes them, runs aggregate assertions and returns only aggregate rows.
It creates no permanent tables, performs no DML, and writes no results to disk.
Authentication uses existing Google application default credentials. Project:
`calm-forest`, location: `asia-northeast3`.

```sh
# From the analytics/codex worktree, use an environment with google-cloud-bigquery.
python sql/analytics/metrics/run.py --show-sql --metric l1_decomposition
python sql/analytics/metrics/run.py --persona-file /private/tmp/persona-user-ids.json
python sql/analytics/metrics/run.py --baseline
python sql/analytics/metrics/run.py --baseline --reference-differences
```

Production must supply an untracked JSON array of persona user IDs collected by
email outside this repository. An empty list is permitted only when the caller
has verified that no persona accounts exist. Never commit that file or results.
The runner does not discover emails or persist IDs. `--baseline` explicitly uses
the historical proxy permitted in CODEX_BRIEF; it is locked to the verification
dates and must not be used for current metrics.

Parameters:

| Parameter | Type | Default in runner |
|---|---|---|
| `persona_user_ids` | ARRAY<STRING> | required production input |
| `start_date`, `end_date` | DATE | 2026-09-07, 2026-10-04 |
| `cohort_start`, `cohort_end` | DATE | 2026-08-06, 2026-09-27 |

Use complete Monday–Sunday weeks for weekly reports. The shared script rejects
partial weeks so decomposition and new/kept/back use exactly the same window.
Historical SL, CE and GA4 data are read in full so key stitching, developer
exclusions, first visits and previous-week retention are not truncated by report
dates. Standard GA4 daily tables are used; intraday tables are excluded to avoid
double counting. The runner caps each statement at 10 GB billed by default.

## Output and interpretation

All metric results contain `period, platform, variant, value, numerator,
denominator`. Multi-measure files add `metric`. L1 adds its reconstructed
acquired-day total. The GA4 check adds a two-consecutive-week alarm flag.
`official` applies the common exclusions. `raw` applies no population exclusions,
including no platform exclusion, while still deduplicating sessions and applying
the person-key rules. `all` is recomputed at person/day grain and must not be
obtained by adding platform rows. NULL ratio values mean an absent denominator.

SL identity stitching is done separately for each population over its entire
history, matching `person_key.py`. Per-platform new/kept/back is calculated from
that platform's history; `all` uses the combined history. Platform rows may
overlap when one account uses more than one platform. Days take the last session's
`last_place` ordered by start time, update time and session ID (including NULL).

GA4 platform reads `user_properties.platform`; an empty value means web. For
cohort attribution, the first nonempty property within the first seven days is
used, falling back to web when none exists. This deterministic replacement for
the reference's `ANY_VALUE` is provisional; see `codex-questions.md`.
Beta exclusion uses `user_properties.ab_variant`, falling back to event parameter
`variant`. Known GA4 beta tags propagate within the same device/session/day,
because earlier events may lack that property. EC has its own `variant` field. Developer IDs are found from all CE
history and mapped to GA4 using all associated SL user IDs. GA4 devices that ever
carry a persona/developer user ID are excluded from all their events.

The GA4 shadow follows the reference's observable identity: known logged-in
accounts use user_id, other visits use user_pseudo_id. GA4 cannot faithfully
restore SL guest-to-account stitching. The agreement denominator is acquired
GA4 account-days; the numerator is those also acquired in a logged-in SL session.
A rate below 95% in two consecutive calendar weeks raises the alarm. Empty
weeks interrupt the alarm rather than count as a failure.

Save failures are grouped across their entire GA4 session (`user_pseudo_id`,
`ga_session_id`) before report dates are selected, so recovery across midnight
or a week boundary is not lost. Recovery context comes from all events in that
session, including events excluded by population filters. The session is assigned its first observed day
and platform. Missing session IDs cannot be attributed. Before 2026-09-14,
`value` is NULL because this event was not instrumented; the deployment week is
only partially observed. Count values after instrumentation describe observed
failures and cannot prove that no save was lost.

`checks/window_rollup.sql` computes full-window median gaps and ratios rather
than averaging weekly medians or percentages. Median metrics carry their median
in `numerator` and the number of observed gaps in `denominator`; they are not
ratio metrics. Gap calculations use consecutive days inside the requested
window, as the Python baseline does; single-visit people have no gap.

## Validation

- `checks/invariants.sql`: key presence, official exclusions and W×F×Q identity.
- `checks/person_key_fixture.sql`: standalone nine-case BigQuery contract test.
- `checks/baseline_assertions.sql`: historical stitching, gap and last-place checks.
- `run.py --baseline`: published weekly and platform cohort count comparisons.
- `checks/window_rollup.sql`: full-window category shares and gap distribution.
- `checks/shadow_ga4.sql`: shadow values and login-account instrumentation check.

The baseline check deliberately fails on a mismatch. Do not weaken expected
counts to make it pass. Known definition/reference conflicts and review status
are recorded in `dev/active/metrics-framework/codex-questions.md` and
`m5-validation.md`. M5 is not accepted until those are resolved and Claude review
has happened. M6 reporting and M7 analysis are outside this implementation.
