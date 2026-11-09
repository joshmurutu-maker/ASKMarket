# ASKMarket trust and transparency release

## Public disclosures added
- A central Trust & Safety page explains prototype status, demo listings, account/KYC/KYB boundaries, disabled payments, privacy limitations, shipping/refund expectations, and investment/earnings restrictions.
- The main marketplace footer links to the Trust & Safety page.
- The page explicitly states that a READY deployment is not legal approval, provider authorization, security certification, or proof of seller/product authenticity.

## Verified current boundaries
- Wallet deposit and withdrawal API routes fail closed with HTTP 503 until integrations and controls exist.
- The current sample product catalogue is demonstration content.
- Legal documents remain marked as drafts and call out missing operator/contact/provider details.
- No real-money payment or payout capability is asserted by this release.

## Mandatory launch blockers (owner/legal/provider action)
1. Confirm the registered operating entity, company number, registered address, directors/authorized representatives, and official support, privacy, complaints and security contacts.
2. Obtain Kenyan legal review for marketplace terms, consumer protection, data protection, tax, product/category restrictions, payments, advertising and any proposed investment/shareholding activity.
3. Confirm Data Protection Act obligations and ODPC registration applicability; document controller/processor roles, purposes, lawful bases, retention, data-subject requests and cross-border safeguards.
4. Complete and test Supabase Auth, MFA/recovery policy, database row-level security, backups and audit access.
5. Complete Sumsub KYC/KYB configuration, signed webhook verification and server-side status reconciliation; do not trust browser-only status.
6. Implement real seller/listing moderation, reporting queues, order lifecycle, shipping quotes/tracking, returns/disputes and support escalation.
7. Select and contract authorized payment providers for Kenya; implement signed callbacks, idempotency, a double-entry ledger, reconciliation, refunds, chargebacks, limits and payout approvals.
8. Add independent security review, dependency scanning, rate limits, monitoring, incident response, restore tests and access reviews.
9. Publish final reviewed policies and a verified security disclosure contact before public launch.

## Release rule
Keep deposits, withdrawals, checkout, escrow, payouts and investment collection disabled until the applicable technical, provider, legal and compliance gates are evidenced. Never label a user, seller, product, payment or business as verified based only on form submission.
