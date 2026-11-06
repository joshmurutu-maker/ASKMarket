# ASKMarket

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
| `SUMSUB_KYB_LEVEL` | Exact Sumsub company verification level name |

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