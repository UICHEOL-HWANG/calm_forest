-- Historical-only 2026-09-07..10-04 reference checks. Requires proxy IDs passed
-- explicitly as @persona_user_ids by run.py --baseline; never used in production.
ASSERT (SELECT COUNT(DISTINCT client_id) FROM metric_sessions
 WHERE population_variant='official' AND NOT COALESCE(is_guest=FALSE AND user_id IS NOT NULL,FALSE)
 AND STARTS_WITH(person,'u:'))=6 AS 'Expected 6 stitched guest devices';
ASSERT (SELECT COUNT(*) FROM metric_sessions
 WHERE population_variant='official' AND NOT COALESCE(is_guest=FALSE AND user_id IS NOT NULL,FALSE)
 AND STARTS_WITH(person,'u:'))=113 AS 'Expected 113 stitched guest sessions';
ASSERT (SELECT COUNT(*) FROM (
 SELECT client_id FROM metric_sessions WHERE population_variant='official'
 AND is_guest=FALSE AND user_id IS NOT NULL GROUP BY 1 HAVING COUNT(DISTINCT user_id)>=2))=2
 AS 'Expected 2 ambiguous devices';
ASSERT (SELECT COUNT(*) FROM (
 SELECT DATE_DIFF(d,LAG(d) OVER(PARTITION BY person ORDER BY d),DAY) gap
 FROM metric_days WHERE variant='official' AND platform='all' AND d BETWEEN @start_date AND @end_date)
 WHERE gap IS NOT NULL)=67 AS 'Expected 67 consecutive-day gaps';
-- Category and last-place fractions are compared by integer counts, not rounded percentages.
ASSERT (SELECT COUNT(*) FROM metric_days WHERE variant='official' AND platform='all'
 AND d BETWEEN @start_date AND @end_date AND NOT acquired)=66 AS 'Expected 66 empty-handed days';
ASSERT (SELECT COUNT(*) FROM metric_days WHERE variant='official' AND platform='all'
 AND d BETWEEN @start_date AND @end_date AND NOT acquired AND last_place='village')=57
 AS 'Expected 57 village empty-handed days';
