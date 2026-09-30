# Email login — context
Last Updated: 2026-09-30 (impl + reviews done, uncommitted)

## Key files
- js/supabase-client.js — signInWithGoogle (188), isAnon (49), applySession (55), onAuthStateChange (158)
- index.html:2191 — #login-screen / #login-card markup; styles 446–475, mobile 1633
- index.html:3988 — google-btn click wiring

## Decisions
- 6-digit code over magic link: no cross-browser session loss (PWA / itch iframe)
- Resend SMTP (free 3k/mo, 100/day)
- New UI code goes in js/auth/email-login.js (not game.js)
- Platform CSS: body.platform-toss / body.platform-android hide the email button

## User actions pending
- Resend signup + calmforest.cloud DNS
- Supabase Auth SMTP settings, "Magic Link" template → show {{ .Token }}, raise email rate limit

## Findings (2026-09-30)
- auth.identities provider='email' already holds 55 Worker-minted users (54 toss.calmforest.local, 1 pgs.calmforest.local).
  Real email-OTP users will share provider='email' → separate by email domain in SQL/BQ. Client state.provider distinguishes via user_metadata.toss/pgs.
- Admin checks (sql/analytics/admin_analytics.sql, migrate_notices_admin.sql cf_is_admin) key on JWT email claim — safe with OTP (inbox proof), defense-in-depth follow-up: compare admin uuid.
- user_metadata.toss/pgs is user-writable → display/analytics only, not authz (pre-existing, follow-up).
- Supabase captcha would require captchaToken on signInAnonymously too → deferred; rely on rate limits.
- New copy not in reviewed set: MESSAGES.network, MESSAGES.retry (flagged to user).
