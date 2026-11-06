# ASKMarket: production architecture and operating model

## Product promise
ASKMarket is a wholesale, distribution and retail marketplace connecting buyers, sellers, distributors and retailers. The first launch market is Kenya (KES display and country-aware onboarding), with a design that can expand to additional supported countries after tax, payments, shipping and compliance reviews.

## Product areas
- Discovery: searchable and filterable catalogues, product detail, supplier storefronts, minimum order quantities, stock and delivery terms.
- Accounts: email verification, secure sign-in, recovery, MFA, buyer/seller/distributor/retailer roles and business team memberships.
- Trust: hosted KYC/KYB, beneficial-owner checks where applicable, provider-signed webhooks, manual review, seller approval, product moderation, reports and audit history.
- Commerce: cart, multi-seller order splitting, checkout, payment authorization/capture, order lifecycle, delivery evidence, cancellations, refunds and disputes.
- Money movement: provider-held marketplace funds where the provider and local law permit; double-entry internal ledger; reconciliation; seller payout eligibility and statements. Do not implement a home-grown escrow or pooled wallet.
- Growth: seller subscriptions, clearly labelled sponsored listings, direct ad inventory, referrals with anti-fraud rules and creator/marketplace fees disclosed before checkout.
- Investor relations: company information and non-binding enquiries only until legal entity, securities counsel, offering documents and required approvals exist.

## Amazon-inspired fund cycle (not a clone)
1. Buyer places an order and receives a clear itemized price, shipping, taxes and marketplace fee disclosure.
2. A licensed payment/marketplace provider authorizes or collects funds under its supported marketplace model.
3. Order and payment events are recorded idempotently; inventory is reserved using a concurrency-safe server transaction.
4. Seller fulfils; buyer receives tracking and delivery updates.
5. Funds are released to the seller according to provider rules, delivery evidence, dispute windows and applicable law.
6. Refunds, chargebacks, reversals and fees are represented as linked ledger entries, never by editing old entries.
7. Daily reconciliation compares provider balances/events, order records and the double-entry ledger.

ASKMarket must not advertise deposits, escrow, payouts or stored-value accounts as live until the selected provider contract, country support, compliance review, webhook verification and end-to-end tests are complete.

## Creator and platform earnings
Use explicit, auditable business revenue rather than promising users passive returns:
- a disclosed marketplace service fee on successfully completed eligible orders;
- optional seller subscriptions and paid tools;
- labelled sponsored listings and direct advertising, subject to ad network policies;
- optional referral rewards funded from a defined marketing budget, with anti-self-referral and fraud controls.

Any seller/creator share of platform fees must be a documented contractual revenue-share, calculated on settled net fees after refunds, disputes and chargebacks. Show the calculation and payout status. Do not describe order float, customer deposits, referral deposits or pooled money as an investment or yield product. No guaranteed earnings.

## Shareholding and investors
Separate investor relations from customer wallets and marketplace balances. The app may collect non-binding expressions of interest only after a real registered entity, official contact, privacy notice and reviewed investor material are supplied. Do not accept investment money, issue shares, display invented valuations or promise returns from this app. Share issuance, crowdfunding, securities marketing and investor onboarding require qualified Kenyan legal advice and any applicable CMA/company-law approvals.

## Data and security boundaries
- Supabase Auth for identity; database row-level security for every user-owned record.
- Supabase service-role key, payment keys and Sumsub secrets are server-only Vercel environment variables. Never expose them through a public config route or browser bundle.
- KYC/KYB decisions are provider-webhook driven; the browser SDK's completion callback is not an approval.
- Provider webhooks require signature verification, timestamp/replay checks, event-id deduplication and durable event logging.
- Payment and ledger writes are server-only, idempotent and auditable. No client-side balance mutation.
- Use least privilege, MFA for administrators, rate limiting, CSRF/origin controls where relevant, secure cookies, dependency scanning, backups and incident response.
- Minimize personal data; do not store identity document images or biometric data unless a reviewed provider/legal basis requires it.

## Current repository status
The existing site is a static prototype with Vercel serverless scaffolding for Supabase authentication and Sumsub access-token issuance. Sample products, local-storage cart/listings, balances, order counts, ad placements and investor data are not production records. No real checkout, inventory reservation, order processing, provider payment, seller payout, ad monetization or share issuance is activated by this architecture document.

## Delivery sequence
1. Foundation: schema/RLS, environments, privacy/terms, error handling, accessibility and CI checks.
2. Trust: KYC/KYB webhook processing, business approval and product moderation.
3. Commerce: server-backed catalogue, inventory, cart, order creation, shipping and refunds.
4. Payments: select a provider that supports Kenya marketplace split payments and seller payouts; sandbox first; reconcile; then gated production pilot.
5. Growth: ads, seller plans, referral program, analytics and seller tools.
6. Investor relations: only after corporate/legal readiness and counsel sign-off.
