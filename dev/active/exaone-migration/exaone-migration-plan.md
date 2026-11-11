# EXAONE migration plan

Goal: move Anthropic API usage to EXAONE credits. Step 1 = light workshop cron (functions/aura-cron.js). Step 2 = analytics (managed-agents/), not started.

## Step 1 decisions (light workshop)
- Endpoint: POST https://api.exaone.ai/v1/chat/completions (OpenAI compatible), model k-exaone_v2.5, Bearer EXAONE_API_KEY.
- No batch API: one call per order, CONCURRENCY=6, TICK_MAX=40 per tick (Workers free plan 50 subrequests).
- response_format is undocumented: JSON schema embedded in system prompt, lenient JSON extraction, sanitizeRecipe stays the safety net.
- Reasoning cannot be disabled: reasoning_effort=low, max_tokens=8192, 90s timeout per call.
- 429 and 401/403 stop the tick and leave orders untouched; 401/403 also sends a mail.
- Legacy status=submitted rows (old batch flow) are re-read together with pending.

## Step 2 (analytics, open)
Managed Agents (kpi-daily, tracking-qa, analyst) have no EXAONE equivalent: needs a self-built agent loop (Airflow on calmforest-main, MCP clients, ledger file). analyst is paused; keep Anthropic until 2026-11-30 credit ends.
