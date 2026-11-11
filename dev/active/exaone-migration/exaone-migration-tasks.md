# EXAONE migration tasks

- [x] Read EXAONE docs, map current Anthropic usage
- [x] Step 1 tests first (tests/aura-cron.test.mjs, 15 tests)
- [x] Step 1 implementation (functions/aura-cron.js), full suite 4571 pass
- [x] Code review finding 1 applied (unusable JSON -> retry); 2-4 left as-is; spacing 1.1s added after live 429
- [x] EXAONE_API_KEY in Keychain, Cloudflare secret, local .env
- [x] Live smoke test: 4 of 5 done, 1 retry
- [ ] Deploy to main (prod still runs old Anthropic code)

- [ ] Step 2: analytics agents decision
