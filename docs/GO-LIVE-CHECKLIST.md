# ASKMarket launch and trust checklist

## Before inviting the public
- [ ] Confirm registered operating company name, company number, directors and official contact details.
- [ ] Publish reviewed Terms, Privacy Notice, Cookies/consent notice, returns/refunds, shipping, prohibited/restricted goods, seller standards and complaint/escalation process.
- [ ] Confirm Data Protection Act obligations in Kenya, controller/processor roles, retention periods, data-subject request handling and ODPC registration applicability.
- [ ] Configure Supabase Auth email verification, recovery, MFA policy, database backups and RLS; apply migrations in staging first.
- [ ] Configure Sumsub sandbox KYC and KYB levels, beneficial-owner/representative flows, webhook signing secret and event handling; verify approval only from trusted server events.
- [ ] Verify sellers/businesses before publication; manually review regulated categories and restricted goods.
- [ ] Replace sample product records with server-backed listings and real seller consent.
- [ ] Select a payment provider after written confirmation of Kenya availability, marketplace capabilities, split settlements, refunds, disputes and seller onboarding.
- [ ] Implement payment webhooks, idempotency, immutable double-entry ledger, reconciliation, refund/chargeback handling and payout controls.
- [ ] Test order races, stock depletion, duplicate webhooks, failed payments, partial refunds, disputes and account takeover scenarios.
- [ ] Add admin roles, audit logs, support tooling, fraud/risk rules, rate limits, monitoring, backups and incident response.
- [ ] Run accessibility review (keyboard, labels, contrast, screen readers), mobile testing and performance/security testing.
- [ ] Add CI tests and dependency/security scanning; require review before production deploy.
- [ ] Pilot with a small set of verified sellers and low transaction limits; reconcile every transaction before scaling.

## Money and advertising controls
- [ ] Disclose all prices, shipping, taxes, fees and refund conditions before checkout.
- [ ] Never promise guaranteed creator, referral or investor returns.
- [ ] Calculate creator revenue shares only from settled, net platform fees after refunds/disputes and publish the calculation.
- [ ] Label paid placements as Sponsored; do not sell fake reviews or paid ranking without disclosure.
- [ ] Apply to ad networks using genuine publisher content and comply with invalid-traffic rules. Do not incentivize ad clicks.
- [ ] Do not accept investor funds or issue shares through the marketplace until counsel confirms the entity, offering structure and required approvals.

## Release gates
A green Vercel deployment only proves that the website built and deployed. It does not prove legal approval, provider onboarding, security readiness, payment capability or production suitability. Keep payment/payout controls disabled until all relevant gates above are evidenced.
