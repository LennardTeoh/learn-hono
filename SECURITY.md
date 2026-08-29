# Security Notes

This repository is a secure-learning baseline, not a PCI-certified commerce platform.

## Implemented controls

| Risk | Control |
|---|---|
| Plaintext passwords | PBKDF2-HMAC-SHA-256, unique salt, server-side pepper |
| Weak password work factor | 600,000 PBKDF2 iterations by default |
| Session DB leak | only session-token hashes stored |
| Session theft via JS | HttpOnly cookie |
| Cross-site request forgery | per-session CSRF token + exact CORS origin |
| SQL injection | D1 prepared statements |
| Cart price tampering | totals recalculated from D1 |
| Duplicate checkout | idempotency key |
| Bot signup/login abuse | Cloudflare Turnstile |
| Brute force | per-IP D1 rate limits |
| Email token leak from DB | only SHA-256 token hashes stored |
| Token replay | verification/reset token has `used_at` |
| Reset token longevity | 30-minute expiry |
| Verification token longevity | 60-minute expiry |
| Password reset session persistence | all sessions deleted on reset |
| Clickjacking | `frame-ancestors 'none'` + X-Frame-Options DENY |
| MIME sniffing | nosniff |
| Unnecessary browser APIs | Permissions-Policy |
| Secret leakage in repo | `.dev.vars` ignored; production secrets injected by GitHub Actions |

## Important limitations

### Workers Free + strong password hashing

The code intentionally uses a modern expensive work factor. The Workers Free 10 ms CPU limit can be too small for reliable password hashing. Do not reduce hashing below your security baseline just to fit free compute.

### Tailwind Browser CDN

The Browser/Play CDN is explicitly a development/prototyping path. It requires third-party JavaScript on every page and a less strict CSP than compiled static CSS. Compile Tailwind before a serious production launch.

### Rate limiting

The included D1 limiter is intentionally simple. Under very high concurrency, counters can race. For a higher-risk production service, use a dedicated rate-limiting capability/edge rule and layered account/IP/device controls.

### Inventory

Checkout reads stock and then issues stock updates in a D1 batch. It is good enough for a demo but is not a complete high-concurrency inventory reservation system.

### Email

The free Cloudflare plan cannot send transactional mail to arbitrary new users. The included Resend adapter is an external free-tier dependency.

## Secret rotation

If a secret leaks:

- rotate `CLOUDFLARE_API_TOKEN`
- rotate `PASSWORD_PEPPER` carefully; changing the pepper invalidates password verification unless you implement versioned pepper migration
- rotate `RESEND_API_KEY`
- rotate `TURNSTILE_SECRET_KEY`
- invalidate all active sessions if session integrity is in doubt

For password pepper rotation in a real system, store a non-secret `pepper_version` with each user and keep old peppers only during a controlled migration window.
