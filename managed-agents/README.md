# Managed Agents (Claude API credit, through 2026-11-30)

Version-controlled Claude Managed Agents resources, synced with `ant apply` (ant >= 1.34).
Run every `ant` command from this directory: `claude-lock.json` lives here and must be committed.

| Agent | What | Schedule | Cap |
|---|---|---|---|
| `agents/kpi-daily` | KPI report from Supabase (read-only MCP) -> #cf-data | Mon/Wed/Fri 09:00 KST | $0.80 / run |
| `agents/analyst` | Deep analysis over BigQuery (`execute_sql_readonly` only) + Supabase -> #cf-analysis. Reads/appends the ledger memory store so no analysis repeats | weekly Tue 10:00 KST autonomous (paused) + on demand | $8 / run |

No secrets in this repo (public). Keychain: `calmforest-supabase-pat-cma`, `calmforest-bq-oauth-client`, `calmforest-bq-refresh-cma`, `calmforest-slack-bot-kpi`; register with `scripts/vault-add.sh` / `scripts/bq-oauth.py`. Credentials live only in the Anthropic vault `calm-forest-analytics`.

## Status
- KPI deployment `depl_01HBxqhczrELj4SQUqzhNqDD` active (Mon/Wed/Fri). Analyst weekly `depl_01BPLzRD7F7Xxhh7UwKkiTbx` paused until the first run is reviewed.
- Ledger store `memstore_01Homr26TYEpR5cPDpARSubp` (`/ledger.md`, seeded from `agents/analyst/data/ledger-seed.md`). Note: `memories create --content @file` stores the literal string; pipe `jq -n --rawfile c FILE '{content:$c}'` instead.

## Read the latest report
Console -> Sessions -> latest `calm-forest-kpi-daily` run -> outputs (`ant beta:files list --scope-id` currently returns 400).
```sh
ant beta:deployment-runs list --deployment-id depl_01HBxqhczrELj4SQUqzhNqDD --max-items 1 --transform session_id -r
```
