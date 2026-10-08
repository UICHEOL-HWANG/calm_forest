# Managed Agents (Claude API credit, through 2026-11-30)

Version-controlled Claude Managed Agents resources, synced with `ant apply` (ant >= 1.34).
Run every `ant` command from this directory: `claude-lock.json` lives here and must be committed.

| Agent | What | Schedule | Cap |
|---|---|---|---|
| `agents/kpi-daily` | Daily KPI report from Supabase (read-only MCP) | 09:00 KST daily | $0.80 / run |

No secrets in this repo (public). Credentials live only in the Anthropic vault `calm-forest-analytics`.

## Status
- Deployment `depl_01HBxqhczrELj4SQUqzhNqDD` is **paused** until Slack is wired.
- Slack later: run `scripts/vault-add.sh slack` (Keychain `calmforest-slack-bot-kpi`), put the channel ID in the kickoff text of `deployment-daily.yaml` (e.g. "슬랙 채널: C0..."), `ant apply agents/kpi-daily/deployment-daily.yaml`, then unpause.

## Read the latest report
Console -> Sessions -> latest `calm-forest-kpi-daily` run -> outputs (`ant beta:files list --scope-id` currently returns 400).
```sh
ant beta:deployment-runs list --deployment-id depl_01HBxqhczrELj4SQUqzhNqDD --max-items 1 --transform session_id -r
```
