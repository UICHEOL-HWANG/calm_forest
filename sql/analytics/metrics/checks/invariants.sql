-- Shared input and algebra checks; aggregate assertions, no user rows emitted.
ASSERT (SELECT COUNTIF(client_id IS NULL OR started_at IS NULL OR session_id IS NULL) FROM latest_sessions)=0
 AS 'SL key/start/session cannot be NULL; revise key policy before accepting new data';
ASSERT (SELECT COUNT(*) FROM metric_sessions s WHERE population_variant='official'
 AND (platform NOT IN ('web','toss') OR user_id IN UNNEST(@persona_user_ids)
 OR client_id IN (SELECT client_id FROM developer_devices)
 OR (COALESCE(variant,'') IN ('beta_A','beta_B') AND d BETWEEN '2026-09-09' AND '2026-09-15')))=0
 AS 'Official SL exclusions must hold';
ASSERT (SELECT COUNT(*) FROM metric_days WHERE person IS NULL)=0 AS 'Person keys must be non-NULL';
ASSERT (SELECT COUNT(*) FROM metric_weekly WHERE acquired_days>visit_days OR visitors>visit_days)=0
 AS 'Acquired days <= visit days; visitors <= visit days';
ASSERT (SELECT COUNT(*) FROM metric_weekly WHERE visitors>0 AND
 ABS(visitors*SAFE_DIVIDE(visit_days,visitors)*SAFE_DIVIDE(acquired_days,visit_days)-acquired_days)>1e-9)=0
 AS 'W*F*Q must reconstruct acquired person-days';
ASSERT (SELECT COUNT(*) FROM metric_economy e WHERE population_variant='official' AND
 (platform NOT IN ('web','toss') OR user_id IN UNNEST(@persona_user_ids)
 OR client_id IN (SELECT client_id FROM developer_devices)
 OR (COALESCE(variant,'') IN ('beta_A','beta_B') AND d BETWEEN '2026-09-09' AND '2026-09-15')))=0
 AS 'Official EC exclusions must hold';
