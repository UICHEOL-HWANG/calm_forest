"""Execute shared metrics as one read-only BigQuery script with temporary tables.

Requires google-cloud-bigquery and application default credentials. No persistent
BQ tables or local result files are created. Printed rows are aggregates only.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
from pathlib import Path
from google.cloud import bigquery

ROOT = Path(__file__).resolve().parent
PROJECT, LOCATION = 'calm-forest', 'asia-northeast3'
METRICS = ['nsm_daily_hcc_users', 'l1_decomposition', 'l2_new_kept_back',
           'l2_habit_gap', 'l2_quality_detail', 'funnel_activation',
           'guardrails', 'revenue_lead', 'checks/shadow_ga4', 'checks/window_rollup']

def script(names, baseline=False, reference=False):
    parts = [(ROOT / '_filters.sql').read_text(), (ROOT / 'checks/invariants.sql').read_text()]
    if baseline:
        parts.append((ROOT / "checks/baseline_assertions.sql").read_text())
    if reference:
        return "\n".join(parts) + "\n" + (ROOT / "checks/reference_differences.sql").read_text()
    selects = []
    for i, name in enumerate(names):
        sql = (ROOT / (name + '.sql')).read_text().strip().rstrip(';')
        parts.append(f'CREATE TEMP TABLE result_{i} AS\n{sql};')
        # SQL filenames are controlled by the choices above, never user SQL.
        selects.append(f"SELECT '{name}' file,period,platform,variant,"
                       + ("metric," if name not in ['nsm_daily_hcc_users','revenue_lead']
                          else f"'{name}' metric,")
                       + f'CAST(value AS FLOAT64) value,CAST(numerator AS FLOAT64) numerator,'
                         f'CAST(denominator AS FLOAT64) denominator,'
                       + ('CAST(reconstructed_acquired_days AS FLOAT64)' if name=='l1_decomposition' else 'CAST(NULL AS FLOAT64)')
                       + ' reconstructed_acquired_days,'
                       + ('alert_two_weeks' if name=='checks/shadow_ga4' else 'CAST(NULL AS BOOL)')
                       + f' alert_two_weeks FROM result_{i}')
    return '\n'.join(parts) + '\n' + '\nUNION ALL\n'.join(selects) + '\nORDER BY file,period,platform,variant,metric;'

def parameters(args, personas):
    return [bigquery.ArrayQueryParameter('persona_user_ids','STRING',personas)] + [
        bigquery.ScalarQueryParameter(k,'DATE',dt.date.fromisoformat(getattr(args,k)))
        for k in ['start_date','end_date','cohort_start','cohort_end']]

def validate(rows):
    failures=[]
    official = {(str(r['period']),r['metric']):r for r in rows
                if r['platform']=='all' and r['variant']=='official'}
    expected = [
        ('2026-09-07',26,44,21,20,5,1,3),
        ('2026-09-14',25,38,20,20,4,1,2),
        ('2026-09-21',22,34,20,16,5,1,2),
        ('2026-09-28',15,24,13,8,5,2,1)]
    for week,w,days,acquired,new,kept,back,habit in expected:
        for metric,field,target in [
            ('W','value',w),('F','numerator',days),('Q','numerator',acquired),
            ('nsm_daily_hcc_users','value',acquired/7),('new','value',new),
            ('kept','value',kept),('back','value',back),('habit_share','numerator',habit)]:
            got=official[week,metric][field]
            if got is None or abs(got-target)>1e-9:
                raise AssertionError(f'{week} {metric} {field}: {got} != {target}')
        row=official[week,'Q']
        if abs(official[week,'W']['value']*official[week,'F']['value']*row['value']-acquired)>1e-9:
            raise AssertionError(f'{week}: decomposition identity failed')
    # Cohort sums: ratio denominators are the counts, never average weekly rates.
    for platform,target in [('all',(415,182,153,74)),('web',(333,109,94,49)),('toss',(82,73,59,25))]:
        metrics=['visits','entry_share','character_select_share','first_acquisition_share']
        actual=tuple(sum(r['numerator'] for r in rows if r['file']=='funnel_activation'
                         and r['variant']=='official' and r['platform']==platform and r['metric']==m) for m in metrics)
        if actual!=target:
            failures.append(f'funnel {platform}: {actual} != {target}')
    print('PASS: 4-week NSM/L1/new/kept/back/habit baseline')
    for metric,targets,rounded in [
        ('net_coins_per_device',[384,228,210,96],True),
        ('revenue_lead',[.26,.23,.13,.24],False),
        ('unrecovered_save_sessions',[0,0,0,0],False)]:
        actual=[official[week,metric]['value'] for week,*_ in expected]
        comparable=[None if v is None else (round(v) if rounded else round(v,2)) for v in actual]
        if comparable!=targets:
            failures.append(f'{metric}: {comparable} != {targets}')
    if failures:
        for failure in failures: print('MISMATCH: '+failure)
        raise AssertionError('Published baseline conflicts remain; see codex-questions.md')
    print('PASS: cohort funnel, economy and save-failure baseline')

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--start-date',default='2026-09-07')
    p.add_argument('--end-date',default='2026-10-04')
    p.add_argument('--cohort-start',default='2026-08-06')
    p.add_argument('--cohort-end',default='2026-09-27')
    p.add_argument('--persona-file',type=Path,help='Untracked JSON ARRAY<STRING> of persona user IDs')
    p.add_argument('--baseline',action='store_true',help='Explicitly use historical-only persona proxy and check the published baseline')
    p.add_argument('--metric',choices=METRICS)
    p.add_argument('--reference-differences',action='store_true',help='Return aggregate filter-stage diagnostics instead of published metrics')
    p.add_argument('--show-sql',action='store_true',help='Print exact SQL without submitting or reading persona IDs')
    p.add_argument('--max-bytes-billed',type=int,default=10_000_000_000)
    args=p.parse_args()
    if args.start_date>args.end_date: p.error('start-date must precede end-date')
    if args.cohort_start>args.cohort_end: p.error('cohort-start must precede cohort-end')
    if args.baseline and (args.start_date,args.end_date,args.cohort_start,args.cohort_end)!=('2026-09-07','2026-10-04','2026-08-06','2026-09-27'):
        p.error('--baseline supports only the documented historical verification dates')
    names=[args.metric] if args.metric else METRICS
    if args.metric and args.reference_differences: p.error('--metric and --reference-differences are mutually exclusive')
    sql=script(names,baseline=args.baseline,reference=args.reference_differences)
    if args.show_sql: print(sql); return
    if bool(args.persona_file)==bool(args.baseline): p.error('supply exactly one of --persona-file or --baseline')
    client=bigquery.Client(project=PROJECT,location=LOCATION)
    if args.baseline:
        proxy="""SELECT user_id FROM `calm-forest.calm_forest_raw.session_logs`
        WHERE user_id IS NOT NULL GROUP BY 1
        HAVING COUNT(DISTINCT client_id)>=4 AND MIN(DATE(started_at,'Asia/Seoul'))>=DATE '2026-09-28'"""
        personas=[r.user_id for r in client.query(proxy,job_config=bigquery.QueryJobConfig(maximum_bytes_billed=args.max_bytes_billed)).result()]
    else:
        personas=json.loads(args.persona_file.read_text())
        if not isinstance(personas,list) or not all(isinstance(x,str) for x in personas):
            p.error('persona-file must contain a JSON array of strings')
    cfg=bigquery.QueryJobConfig(query_parameters=parameters(args,personas),maximum_bytes_billed=args.max_bytes_billed)
    job=client.query(sql,job_config=cfg)
    rows=[dict(r) for r in job.result()]
    print(f'Calculated {dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).isoformat()} | job {job.job_id} | bytes {job.total_bytes_processed}')
    for row in rows: print(json.dumps(row,default=str,ensure_ascii=False))
    if args.baseline and not args.metric and not args.reference_differences: validate(rows)

if __name__=='__main__': main()
