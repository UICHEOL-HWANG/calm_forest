# Managed Agents (Claude API credit, through 2026-11-30)

Version-controlled Claude Managed Agents resources, synced with `ant apply` (ant >= 1.34).
Run every `ant` command from this directory: `claude-lock.json` lives here and must be committed.

| Agent | What | Schedule | Cap |
|---|---|---|---|
| `agents/kpi-daily` | Daily KPI report from Supabase (read-only MCP) | 09:00 KST daily | $0.80 / run |

No secrets in this repo (public). Credentials live only in the Anthropic vault `calm-forest-analytics`.

## Read the latest report
```sh
DEP=$(jq -r '.resources["./agents/kpi-daily/deployment-daily.yaml"].id' claude-lock.json)
SID=$(ant beta:deployment-runs list --deployment-id "$DEP" --max-items 1 --transform session_id -r)
ant beta:files list --scope-id "$SID"
```
