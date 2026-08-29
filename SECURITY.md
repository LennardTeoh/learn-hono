# Security Notes

This repository is a secure-learning baseline, not a PCI-certified commerce platform.

## Implemented controls

| Risk | Control |
|---|---|
| Plaintext passwords | Better Auth password storage and verification |
| Session DB leak | Better Auth opaque session tokens stored in D1 |
| Session theft via JS | HttpOnly cookie |
| Cross-site request forgery | Better Auth origin validation + exact checkout origin |
| SQL injection | D1 prepared statements |
| Cart price tampering | totals recalculated from D1 |
| Duplicate checkout | idempotency key |
| Bot signup/login abuse | Cloudflare Turnstile |
| Brute force | per-IP D1 rate limits |
| Email token replay | Better Auth verification records expire and are single-use |
| Password reset session persistence | Better Auth revokes sessions on reset |
| Clickjacking | `frame-ancestors 'none'` + X-Frame-Options DENY |
| MIME sniffing | nosniff |
| Unnecessary browser APIs | Permissions-Policy |
| Secret leakage in repo | `.env` ignored; production secrets injected by GitHub Actions |

## Important limitations

### Workers Free + strong password hashing

Better Auth handles password hashing. Keep `BETTER_AUTH_SECRET` high entropy and use Workers Paid if authentication traffic exceeds the free-tier runtime budget.

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
- rotate `BETTER_AUTH_SECRET` with a planned session invalidation window
- rotate `RESEND_API_KEY`
- invalidate all active sessions if session integrity is in doubt
