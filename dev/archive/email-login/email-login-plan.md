# Email login (6-digit OTP) — plan

Approved 2026-09-30 (bounded path, in-chat design).

## Scope
- Web + itch only. Hidden on Toss (IS_TOSS) and Play app (IS_ANDROID).
- Method: Supabase `signInWithOtp({ email })` → 6-digit code → `verifyOtp({ email, token, type: 'email' })`.
- SMTP: Resend (user sets up account, DNS SPF/DKIM, Supabase SMTP + email template with `{{ .Token }}`).

## Flow
Login card → "✉️ 이메일로 시작하기" → email step → code step → session.
onAuthStateChange applies non-anon session (same path as Google). provider becomes 'email'.
Web guests are volatile → no save migration needed.

## Steps
1. UI copy candidates → user review
2. Login card mockups ×3 (PC + mobile) → user pick
3. Implement (TDD): requestEmailCode / verifyEmailCode in js/supabase-client.js, UI in js/auth/email-login.js, i18n, GA4 `email_login` (stage: request/sent/verify, result, reason)
4. Verify with default SMTP (real code received) → code review
5. After Resend hookup: re-verify → deploy web + itch

## Deferred
- Email exit in guest nudge modal
- Turnstile captcha (decide after watching send volume)
