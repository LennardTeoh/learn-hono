# PetitBakery — Cloudflare Pages + Hono Workers

PetitBakery is a beginner-friendly bakery storefront you can run and study.

## Start the reference app

```bash
npm run check
npm run start
```

Then open `http://localhost:8788`. The command runs the Hono Worker at
`http://localhost:8787` and serves `frontend/` at `http://localhost:8788`.
Create `backend/.dev.vars` from `backend/.dev.vars.example` for the local auth
lessons. Stop both servers with `Ctrl-C`.

## Rebuild in four milestones

Run the check after each milestone. The checks are intentionally small and
dependency-free so students can read them.

```bash
npm run check:stage1  # HTML, CSS, responsive storefront
npm run check:stage2  # D1 bakery seed, catalogue and cart
npm run check:stage3  # Hono API, auth and trusted checkout
npm run check:stage4  # Pages, Worker, D1 and security configuration
```

Use the “Learn” link in the PetitBakery header for the four-step in-app map.

A beginner-friendly full e-commerce starter using:

- **Frontend:** plain HTML, CSS, JavaScript and Tailwind CSS Browser/Play CDN
- **Frontend hosting:** Cloudflare Pages
- **Backend:** Hono on Cloudflare Workers
- **Database:** Cloudflare D1
- **Bot protection:** Cloudflare Turnstile
- **Email verification/password reset:** Resend Free adapter
- **CI/CD:** GitHub Actions runs Wrangler directly for D1, Workers, and Pages
- **Payment:** intentionally omitted; checkout creates a dummy confirmed order

## Features

- Responsive product listing with search/category filtering
- Product detail page
- Local browser cart with quantity management
- Registration
- Email verification
- Login/logout
- Forgot/reset password
- Account page and order history
- Dummy checkout with shipping address
- Server-side price/tax/shipping calculation
- D1-backed users, sessions, products and orders
- Turnstile on abuse-prone auth forms
- Rate limiting for registration/login/reset flows
- GitHub Actions validation + D1 migrations + Worker + Pages deployments

## Architecture

```text
Browser
  |
  | HTTPS
  v
Cloudflare Pages
  |  HTML + JS + Tailwind Browser CDN
  |
  | fetch(credentials: include)
  v
Hono API on Cloudflare Worker
  |-- Turnstile verification
  |-- Auth/session/CSRF middleware logic
  |-- Product + checkout business rules
  |
  +--> Cloudflare D1
  |
  +--> Resend API (verification/reset email only)
```

## Security model

### Passwords

Passwords are **never encrypted or stored in plaintext**.

The Worker:

1. validates a 12–128 character password,
2. generates a unique random 16-byte salt,
3. combines the password with a server-side `PASSWORD_PEPPER`,
4. derives a 256-bit PBKDF2-HMAC-SHA-256 hash,
5. stores only the hash, salt and iteration count in D1.

The default is **600,000 PBKDF2-HMAC-SHA-256 iterations**, matching the current OWASP PBKDF2 recommendation.

### Important Workers Free CPU caveat

Cloudflare Workers Free currently allows **10 ms CPU time per HTTP request**. A strong adaptive password hash can exceed that budget. Do **not** silently reduce the work factor just to fit the free CPU limit.

For a classroom/hobby project you can test the supplied implementation, but for reliable production password authentication choose one of:

1. **Workers Paid** for sufficient CPU headroom; or
2. a managed authentication service on its own free tier; or
3. redesign to passwordless/passkey authentication.

Everything else in this starter is designed to stay small enough for the normal Workers/D1 free-tier envelope.

### Sessions

- 256-bit random opaque session token
- browser receives only the token in an **HttpOnly** cookie
- D1 stores only `SHA-256(session_token)`, not the raw token
- `Secure` in production
- `SameSite=None; Secure; Partitioned` in production so the hobby `pages.dev` → `workers.dev` setup can use CHIPS where supported
- for production, custom subdomains such as `shop.example.com` and `api.example.com` are strongly preferred
- 7-day default expiry
- logout deletes the D1 session
- password reset deletes all existing sessions

### CSRF

Authenticated state-changing requests require:

- the HttpOnly session cookie, **and**
- a separate random `X-CSRF-Token` header associated with the session.

CORS is restricted to one configured `APP_ORIGIN`.

### XSS / browser controls

`frontend/_headers` adds:

- CSP
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- strict referrer policy
- permissions policy
- HSTS

The UI avoids inline event handlers and escapes user/API text before inserting it into generated HTML.

### SQL injection

All D1 values use prepared statements and `.bind(...)`. User input is never concatenated into values. The only dynamic SQL fragment is the number of `?` placeholders created from a server-bounded product-ID list.

### Checkout tampering

The cart is stored in localStorage for simple UX, but the API **does not trust client prices**. Checkout sends only product IDs and quantities; the Worker reloads current products from D1 and recalculates subtotal, shipping, tax and total.

### Email tokens

Verification and reset links use 256-bit random tokens. D1 stores only a SHA-256 hash of each token. Verification expires after 60 minutes; password reset after 30 minutes.

### Abuse controls

- Turnstile on register/login/forgot-password
- D1-backed per-IP rate limits
- generic forgot-password response to reduce account enumeration
- request-body limits
- bounded string lengths and cart quantities
- idempotency key on checkout

## Why Resend for email?

As of August 2026, **Cloudflare Email Sending to arbitrary recipients requires Workers Paid**. Free accounts can send only to verified destination addresses, which is not sufficient for normal customer signups.

This project therefore keeps **Pages + Workers + D1 + Turnstile on Cloudflare Free**, while using the **Resend Free plan** for verification/reset mail. The email adapter is isolated in `backend/src/lib/email.ts`, so you can replace it later with Cloudflare Email Service if you upgrade.

## Tailwind CDN note

You asked specifically for Tailwind CDN, so this project uses the current Tailwind Browser/Play CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

Tailwind documents this CDN as **development-only, not intended for production**. It is excellent for learning and a no-build prototype. Before a serious public launch, compile Tailwind to a static CSS file and tighten the CSP further.

---

# Local setup

## 1. Prerequisites

- Node.js 22+ (CI uses Node 22)
- Cloudflare account
- Wrangler authenticated locally
- Resend account for real email
- Turnstile widget for production bot protection

## 2. Install backend dependencies

```bash
cd backend
npm install
```

## 3. Create D1 database

```bash
npx wrangler d1 create petitbakery-db
```

Copy the returned database ID into:

```text
backend/wrangler.jsonc
```

## 4. Apply migrations locally

```bash
cd backend
npm run db:migrate:local
```

Migration `0002_seed_products.sql` is applied automatically by Wrangler migrations.

## 5. Configure local secrets

```bash
cp .dev.vars.example .dev.vars
```

Generate a pepper, for example:

```bash
openssl rand -base64 48
```

Put it in `PASSWORD_PEPPER`.

For local development, if `RESEND_API_KEY` and `TURNSTILE_SECRET_KEY` are empty, the Worker:
- logs email content to the Worker console instead of sending it,
- skips Turnstile only when `ENVIRONMENT=development`.

Never use those development fallbacks in production.

## 6. Start Worker

```bash
cd backend
npm run dev
```

Default API:

```text
http://localhost:8787
```

## 7. Serve frontend

Use any static server from the repository root, for example:

```bash
npx serve frontend -l 8788
```

Local frontend:

```text
http://localhost:8788
```

`frontend/js/config.js` already points to `http://localhost:8787`.

---

# Cloudflare deployment

## 1. Create Pages project once

This repository uses **Direct Upload** from GitHub Actions.

```bash
npx wrangler pages project create petitbakery --production-branch main
```

Choose `main` as production branch.

## 2. Create D1 database

```bash
cd backend
npx wrangler d1 create petitbakery-db
```

Put the ID in `backend/wrangler.jsonc` and commit the file.

## 3. Create Turnstile widget

In Cloudflare:

```text
Turnstile -> Add widget
```

Add your Pages/custom hostname.

You will get:

- public **site key** -> GitHub repository variable `TURNSTILE_SITE_KEY`
- secret key -> GitHub secret `TURNSTILE_SECRET_KEY`

## 4. Configure Resend

Create/verify your sending domain in Resend.

Recommended:

```text
EMAIL_FROM = PetitBakery <noreply@mail.yourdomain.com>
```

Store the Resend API key only as GitHub secret `RESEND_API_KEY`.

## 5. Create a least-privilege Cloudflare API token

GitHub CI needs a Cloudflare API token and Account ID.

Use a **custom token** limited to your account with the minimum permissions needed for your deployment, including:

- Workers Scripts: Edit
- Cloudflare Pages: Edit
- D1: Edit

Avoid using your Global API Key.

## 6. GitHub Actions secrets

Repository:

```text
Settings -> Secrets and variables -> Actions -> Secrets
```

This repository uses:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
DOTENV
```

`DOTENV` stores the complete local `.env` as a GitHub-only backup; GitHub secret names cannot contain a period. The workflow does not read it. It passes only the Cloudflare deployment token and account ID to Wrangler. No application secrets are set on the Worker.

## 7. GitHub Actions variables

The production origins are committed in `backend/wrangler.jsonc` and `frontend/js/config.js`:

```text
APP_ORIGIN=https://petitbakery.pages.dev
PUBLIC_API_BASE=https://petitbakery-api.velozz.workers.dev
```

For stronger cookie/CSP ergonomics, use a custom domain:

```text
APP_ORIGIN=https://shop.example.com
PUBLIC_API_BASE=https://api.example.com
```

Then replace the broad `https://*.workers.dev` entry in `frontend/_headers` with your exact API origin.

## 8. Push to `main`

The workflow:

1. type-checks Hono/TypeScript,
2. syntax-checks frontend JavaScript,
3. applies D1 migrations,
4. deploys the Worker,
5. deploys `frontend/` to Cloudflare Pages.

Cloudflare credentials remain in GitHub secrets. The hosted storefront and catalogue require no Worker runtime secrets; enabling account registration or transactional email later requires an explicit secret policy.

---

# API overview

```text
GET    /health

POST   /api/auth/register
POST   /api/auth/resend-verification
POST   /api/auth/verify-email
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

GET    /api/products
GET    /api/products/:id

POST   /api/orders
GET    /api/orders
GET    /api/orders/:id
```

# Project structure

```text
nimble-commerce/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── backend/
│   ├── migrations/
│   │   ├── 0001_init.sql
│   │   └── 0002_seed_products.sql
│   ├── src/
│   │   ├── lib/
│   │   │   ├── crypto.ts
│   │   │   ├── email.ts
│   │   │   ├── http.ts
│   │   │   ├── rate-limit.ts
│   │   │   ├── session.ts
│   │   │   └── turnstile.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── orders.ts
│   │   │   └── products.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── .dev.vars.example
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.jsonc
├── frontend/
│   ├── js/
│   ├── _headers
│   ├── index.html
│   ├── product.html
│   ├── cart.html
│   ├── checkout.html
│   ├── register.html
│   ├── login.html
│   ├── forgot-password.html
│   ├── reset-password.html
│   ├── verify.html
│   ├── resend-verification.html
│   └── account.html
├── ARCHITECTURE.md
├── PRODUCT_DESIGN.md
├── SECURITY.md
└── README.md
```

## Production hardening before real money

This starter intentionally has **no payment gateway**. Before handling real payments/orders, add:

- compiled Tailwind instead of Browser CDN
- managed inventory reservation/transaction strategy for concurrency
- shipping/tax service or explicit rules
- admin authorization and audit logs
- order lifecycle/state machine
- observability/alerts
- database cleanup for expired auth tokens/rate-limit buckets
- privacy policy/data retention process
- backup/restore drill
- real payment provider using hosted payment fields/checkout; never store card numbers yourself
- dependency pinning/lockfile and automated dependency scanning
