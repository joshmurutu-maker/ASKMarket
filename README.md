# E-commerce wallet foundation

## Wallet interface
The application includes a wallet screen with mobile-money (Kenyan M-Pesa) and crypto deposit request flows, mobile-money/crypto withdrawal forms, and an activity area. The browser never stores private keys or wallet balances.

## Important activation status
The current implementation is a non-custodial UI/API scaffold only. Deposit and withdrawal API routes authenticate the Supabase session and validate request fields, then fail closed with HTTP 503. No payment is collected, no crypto address is issued, no withdrawal is sent, and no wallet balance is credited or reserved. Do not advertise the wallet as live.

## Database foundation
Review and apply `supabase/migrations/0002_wallet.sql` in the linked Supabase project's SQL editor. It creates per-user wallet accounts and transaction records with row-level security. Users can read only their own rows; client-side writes are denied. Do not apply to production without a backup and review.

## Required integrations before enabling real funds
1. Confirm the operating company, countries, currencies, licensing/partner model, custody model, limits and AML/fraud controls.
2. Select an approved Kenyan mobile-money payment provider and complete merchant onboarding, callback registration and sandbox/production testing. M-Pesa Daraja credentials alone are not a complete production payment flow.
3. Select a regulated crypto custody/payment provider and explicitly configure supported assets, networks, wallet generation, deposit confirmation thresholds, withdrawal signing and sanctions screening. Never expose custody API secrets or private keys to the browser.
4. Add signed provider webhooks, replay protection, idempotency, reconciliation and a server-only ledger posting service. Credit deposits only after verified provider settlement/on-chain confirmation. Reserve balances atomically before payout and release only on confirmed failure.
5. Enforce verified KYC/KYB status, beneficial-owner checks where relevant, MFA/step-up authentication, withdrawal allowlists, velocity/amount limits, audit logs, support/dispute process and independent security review.
6. Test in sandbox with test accounts and controlled values before any production activation.

The wallet must not be used to hold customer funds or offer crypto custody/transfers until legal and provider arrangements are approved. The current API deliberately does not execute transactions.
