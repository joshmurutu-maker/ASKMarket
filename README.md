# E-commerce

A responsive wholesale, distribution and retail marketplace prototype with an account onboarding and verification integration scaffold.

## Deploy

This is a static front end with Vercel serverless API routes. Connect the repository to Vercel with the project root set to `/`. No framework build command is required.

## Included

- Home, Discover, Cart, Dashboard and Profile views
- Buyer, Seller, Distributor and Retailer account choices
- Supabase Auth sign-up and sign-in flow (requires project configuration)
- Account metadata for name, role, business name, phone and address
- Sumsub WebSDK launch for individual KYC and business KYB
- Server-side HMAC signing for Sumsub access-token requests
- Short-lived verification tokens; Sumsub secret stays server-side
- Basic PWA manifest and service worker

## Required Vercel environment variables

Add these in Vercel Project → Settings → Environment Variables, for Production, Preview and Development as appropriate:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `SUMSUB_APP_TOKEN` | Sumsub app token for the selected environment |
| `SUMSUB_SECRET_KEY` | Sumsub API secret (keep private; never expose in browser) |
| `SUMSUB_KYC_LEVEL` | Exact Sumsub individual verification level name |
| `SUMSUB_KYB_LEVEL` | Exact Sumsub company verification level name |\n| `OPENAI_API_KEY` | Server-only key for AI product-image generation; usage incurs provider charges |

Use Sumsub Sandbox credentials and Sandbox verification levels for testing first. Create/configure one individual KYC level and one company KYB level in Sumsub. The level names are case-sensitive. Switch to production credentials only after business onboarding, privacy/compliance review, webhook configuration and end-to-end testing.

## Account onboarding

Users create accounts with email and password through Supabase Auth. Enable email confirmation in Supabase Auth settings. The app stores the signed-in session in the browser session storage for the current tab/session. The profile fields and account role are stored as Supabase user metadata; for a production marketplace, add a database-backed profile table with row-level security and server-side role policies.

## KYC/KYB

After sign-in, users can launch the Sumsub-hosted WebSDK:
- Buyer: individual KYC.
- Seller, Distributor and Retailer: individual KYC and business KYB, as applicable.
- KYB is configured as a company verification level in Sumsub; configure beneficial-owner/representative checks in the provider workflow.

The API route `POST /api/verification/access-token` validates the Supabase access token before issuing a short-lived Sumsub SDK token. Sumsub's app token and secret are used only server-side.

## Required production work before accepting real users or payments

This repository is not yet a complete production commerce platform. Before live onboarding, add and test:
- A database-backed profile and verification-status table with row-level security.
- A signed Sumsub webhook endpoint that validates provider signatures and records final `applicantReviewed` outcomes idempotently. The current UI can launch verification but does not yet synchronize final approval/rejection status.
- Email verification, password recovery, MFA, session refresh and abuse/rate limiting.
- Admin review and audit trails, privacy/retention/deletion workflows, and documented lawful basis/consent for processing.
- Seller KYB and beneficial-owner checks configured for the applicable jurisdictions.
- Order, inventory, payments, refunds, disputes and payout backends with access controls and reconciliation.

Do not accept real payments, enable payouts, or treat an account as verified based only on opening or completing the SDK screen. Verification must be confirmed from a trusted provider webhook/status result. Do not collect or store identity-document images, biometric data, passwords, bank credentials or private keys in the front end.

## Local development

Use Vercel CLI to run the project locally so that the `/api` functions are available. Add the environment variables above to your local Vercel environment.

## Supabase database setup

The repository now includes a Supabase CLI project configuration at `supabase/config.toml` and a core marketplace migration at `supabase/migrations/202611060002_marketplace_core.sql`. Apply the core migration first, followed by `supabase/migrations/202611060003_wallet.sql`, to create profiles, seller listings, verification records and the restricted wallet foundation. Review and apply both migrations to a staging Supabase project before production. The SQL files are versioned in GitHub; they do not create a hosted Supabase project or run automatically from a Vercel frontend deployment.

For the current browser/API integration, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel. Use the Supabase Project URL and publishable/anon key from the project's Connect/API settings. Never use a service-role key in browser code or commit credentials to GitHub.

## Wallet foundation (not activated)
The application includes an authenticated wallet interface for Kenyan M-Pesa and selected crypto deposit/withdrawal requests. Wallet API routes validate the Supabase session and request data, then deliberately return HTTP 503 until approved payment/custody providers, signed webhooks, a server-side ledger and payout controls are implemented. No deposits are collected, crypto addresses are issued, balances are credited, or withdrawals are sent.

The wallet schema is provided in `supabase/migrations/202611060003_wallet.sql`. Review and apply it to a staging Supabase project first; it enables row-level security and denies client-side balance/transaction writes. Do not apply directly to production without backup and review.

Before enabling funds, complete Kenyan mobile-money merchant onboarding and sandbox testing; choose an appropriately regulated crypto custody/payment partner; implement signed webhooks, idempotency, reconciliation, verified KYC/KYB gates, MFA, withdrawal controls, audit trails and independent security review. Never place provider secrets or private keys in the browser or GitHub.

\n## AI product images\n\nSeller listings generate a product illustration through the server-side OpenAI Images API and save it to the Supabase `product-images` bucket. Product cards label AI-generated artwork and use a restrained cyan/violet neon glow. Configure `OPENAI_API_KEY` in Vercel only; do not add it to browser code or Git. Apply `supabase/migrations/202611090005_ai_product_images.sql` to staging before testing. The migration adds `products.image_url`, creates a public-read image bucket, and restricts uploads to each authenticated seller's folder. AI imagery is illustrative; sellers must ensure it accurately represents the real item. Add durable rate limits, per-user quotas and cost alerts before public launch.\n\n## Legal and trust information\n\nA draft policy hub is available at `/legal/`. It is not a legal certification. Replace all bracketed business-identity/contact fields and obtain Kenyan legal review before production publication. See `docs/legal-and-trust-readiness.md` for the launch gate, including Data Protection Act/ODPC, consumer-protection, seller, privacy, security and payment requirements. Keep real-money payments and payouts disabled until the required providers, controls and legal approvals are complete.\n