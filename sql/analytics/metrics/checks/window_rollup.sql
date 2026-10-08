-- Aggregate checks for the full requested window (median cannot average weeks).
-- Run after _filters.sql; avoids exposing user-level rows.
WITH gaps AS (
 SELECT variant,platform,DATE_DIFF(d,LAG(d) OVER(PARTITION BY variant,platform,person ORDER BY d),DAY) gap
 FROM metric_days WHERE d BETWEEN @start_date AND @end_date
), medians AS (
 SELECT *,PERCENTILE_CONT(gap,0.5) OVER(PARTITION BY variant,platform) median FROM gaps
), gap_summary AS (
 SELECT variant,platform,COUNT(gap) n,COUNTIF(gap=1) next_day,ANY_VALUE(median) median
 FROM medians GROUP BY 1,2
), quality AS (
 SELECT variant,platform,COUNTIF(acquired) acquired,
 COUNTIF(acquired AND farm) farm,COUNTIF(acquired AND catch) catch,
 COUNTIF(acquired AND make) make,COUNTIF(acquired AND village) village,
 COUNTIF(NOT acquired) empty_days,COUNTIF(NOT acquired AND last_place='village') empty_village
 FROM metric_days WHERE d BETWEEN @start_date AND @end_date GROUP BY 1,2
)
SELECT @start_date period,platform,variant,m.metric,m.value,m.numerator,m.denominator
FROM quality JOIN gap_summary USING(variant,platform)
CROSS JOIN UNNEST([
 STRUCT('gap_median' AS metric,median AS value,median AS numerator,CAST(n AS FLOAT64) AS denominator),
 STRUCT('next_day_share',SAFE_DIVIDE(next_day,n),CAST(next_day AS FLOAT64),CAST(n AS FLOAT64)),
 STRUCT('farm',SAFE_DIVIDE(farm,acquired),CAST(farm AS FLOAT64),CAST(acquired AS FLOAT64)),
 STRUCT('catch',SAFE_DIVIDE(catch,acquired),CAST(catch AS FLOAT64),CAST(acquired AS FLOAT64)),
 STRUCT('make',SAFE_DIVIDE(make,acquired),CAST(make AS FLOAT64),CAST(acquired AS FLOAT64)),
 STRUCT('village',SAFE_DIVIDE(village,acquired),CAST(village AS FLOAT64),CAST(acquired AS FLOAT64)),
 STRUCT('empty_village',SAFE_DIVIDE(empty_village,empty_days),CAST(empty_village AS FLOAT64),CAST(empty_days AS FLOAT64))]) m
ORDER BY 1,2,3,4;
