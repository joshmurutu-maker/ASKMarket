# Payment sandbox implementation plan

This branch records the provider choices and prerequisites for the E-commerce wallet. It does not enable payments or move funds.

## Provider split

- **M-Pesa:** Safaricom Daraja. Use the official Daraja sandbox for STK Push deposits and callback/query verification. Treat B2C withdrawals as a separate capability requiring Safaricom business onboarding and B2C product approval; do not assume STK Push credentials authorize payouts.
- **Crypto custody:** Yellow Card (not BitGo). Use its sandbox API and custody vault/address workflow for supported stablecoins and networks. Yellow Card's published Kenya coverage currently lists bank transfer (not mobile money) for fiat receive/send; therefore M-Pesa must remain a separate Daraja rail. Confirm the exact Kenya corridors, asset/network availability, limits and legal eligibility with Yellow Card during onboarding.

## Sandbox-only configuration

Configure secrets in Vercel Project Settings → Environment Variables, initially for Preview/Development only. Never commit values to GitHub or send them in chat.

### Daraja
- `DARAJA_ENV=sandbox`
- `DARAJA_CONSUMER_KEY`
- `DARAJA_CONSUMER_SECRET`
- `DARAJA_SHORTCODE`
- `DARAJA_PASSKEY`
- `DARAJA_CALLBACK_URL` (HTTPS callback route on the deployed preview)
- `DARAJA_ACCOUNT_REFERENCE` (short, non-sensitive reference)

Use OAuth client credentials, then STK Push. Persist the merchant request and checkout request IDs before returning success to the browser. The callback must match the stored checkout request, expected amount and payer; duplicate receipts must be idempotent. A callback alone must never credit an account until all checks pass. Add status-query reconciliation for missing callbacks.

### Yellow Card
- `YELLOWCARD_ENV=sandbox`
- `YELLOWCARD_API_KEY`
- `YELLOWCARD_SECRET_KEY`

Use the sandbox base URL and the documented YcHmacV1 request signature. Store a unique vault per end user (Yellow Card warns that account-based token addresses in one vault share an owner). Generate addresses only for assets/networks returned as supported by the provider. Verify every webhook with the raw request body and X-YC-Signature before looking up the authoritative provider transaction and reconciling it. Do not assume webhooks are retried; run scheduled reconciliation against provider transaction history.

## Required Vercel/Supabase configuration

- Keep `SUPABASE_URL` and `SUPABASE_ANON_KEY` for browser authentication.
- Add `SUPABASE_SERVICE_ROLE_KEY` only as a Vercel encrypted/sensitive server-side secret after confirming the project and database policies. Never expose it from `/api/config` or browser code.
- Apply the marketplace and wallet migrations to a staging Supabase project first.
- Add a server-only payment ledger/RPC that performs balance reservation, settlement and reversal atomically. Client roles must have no direct balance or transaction write access.
- Add verified KYC/KYB gates based on trusted Sumsub webhook status, MFA, withdrawal allowlists, limits, velocity/fraud checks, dual approval for higher-risk payouts, immutable audit records and daily reconciliation.

## Go-live gates

Do not set either provider to production and do not enable real-money deposits/withdrawals until:
1. Safaricom merchant onboarding, callback registration and any B2C payout approval are complete.
2. Yellow Card partner onboarding, Kenya corridor and supported asset/network confirmation, custody/travel-rule configuration and production IP allowlisting are complete.
3. Staging end-to-end tests pass for success, cancellation, timeout, duplicate/out-of-order webhook, wrong amount, invalid signature, reversal, insufficient balance and provider outage.
4. Supabase RLS, ledger atomicity, KYC/KYB enforcement, MFA, withdrawal approval and reconciliation have been independently reviewed.
5. Production secrets are installed only in Vercel Production and a controlled low-value activation is approved by the project owner and providers.

## Current status

The existing wallet endpoints deliberately return HTTP 503 and do not credit balances or send payouts. Keep that fail-closed behavior until the ledger and provider callbacks are implemented and verified. The existing wallet schema is a foundation, not a complete double-entry ledger. No production payment activation is performed by this document.
