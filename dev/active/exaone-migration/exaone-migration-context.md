# EXAONE migration context

Last Updated: 2026-11-10

## Key files
- functions/aura-cron.js (cron logic), tests/aura-cron.test.mjs, worker/index.js:40,138 (scheduled wiring), wrangler.jsonc (cron triggers)
- managed-agents/ (step 2, untouched)

## Facts from docs.exaone.ai (2026-11-10)
- Free of charge at launch (changelog 2026-11-09); no credit/pricing page, no numeric rate limits.
- K-EXAONE 2.5: 512K context, tool calling and structured outputs listed as features but request params undocumented.
- Rate-limit headers: x-minute-rate-limit(-remaining), retry-after(-ms), x-request-id.

## Open items
- Live check with a real key: response_format support, latency per call at reasoning_effort=low, real rate limits.
- Cloudflare secret: EXAONE_API_KEY must be set (wrangler secret put). ANTHROPIC_API_KEY no longer read by the cron.
- @anthropic-ai/sdk is now unused in package.json (left in place, remove on request).
