# Architecture

```text
┌────────────────────────────────────────────────────────────┐
│ Cloudflare Pages                                           │
│ HTML + CSS + JS + Tailwind Browser CDN                     │
│                                                            │
│ / /products/ /product/?id=… /cart/ /checkout/              │
│ /login/ /register/ /account/ and verification folders     │
└───────────────────────┬────────────────────────────────────┘
                        │ HTTPS fetch + credentials
                        │ X-Captcha-Response on auth writes
                        v
┌────────────────────────────────────────────────────────────┐
│ Cloudflare Worker — Hono                                   │
│                                                            │
│ Security headers -> CORS -> Route handlers                 │
│                                                            │
│ Auth                Catalog              Orders             │
│ register            list/search          server totals      │
│ verify email        detail               idempotency        │
│ login/session                            dummy checkout     │
│ password reset                                           │
└───────────────┬────────────────────┬───────────────────────┘
                │                    │
                v                    v
      ┌─────────────────┐   ┌────────────────────┐
      │ Cloudflare D1   │   │ External email     │
      │ users           │   │ Resend Free        │
      │ sessions        │   │ verify/reset links │
      │ products        │   └────────────────────┘
      │ orders          │
      │ auth tokens     │
      │ rate limits     │
      └─────────────────┘

Cloudflare Turnstile:
browser widget -> token -> Worker -> Siteverify API
```

## Data trust boundaries

### Browser is untrusted

The browser may control:

- cart contents
- product IDs
- quantities
- shipping text
- request headers other than Cloudflare-controlled headers

The backend therefore validates/bounds all values and reloads current prices from D1.

### GitHub Actions is deployment authority

`.github/workflows/cloudflare.yml` separates delivery into three jobs:

- `test` runs the project checks and backend type-check before any deploy.
- `deploy-backend` validates runtime secrets, applies remote D1 migrations and deploys the Hono Worker.
- `deploy-frontend` uploads only `frontend/` to the Cloudflare Pages project.

Both deploy jobs require `test`; pull requests stop after validation.

Only GitHub Secrets contain:

- Cloudflare API token
- Cloudflare account ID
- password pepper
- Resend API key
- Turnstile secret

Public deployment configuration uses GitHub repository variables.

## Recommended domain layout

Best:

```text
shop.example.com -> Pages
api.example.com  -> Worker
```

This makes origin allowlisting and CSP much cleaner than broad `pages.dev` / `workers.dev` hostnames.
