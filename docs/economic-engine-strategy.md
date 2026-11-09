# E-commerce Economic Engine Strategy

## Purpose
Support three selectable marketplace operating profiles—Open Free Market, Mixed Market, and Social Market—while preserving one common, auditable commerce, identity, and payments foundation.

This is a product strategy and implementation specification. It does not claim that the platform has changed production behavior until the application code, migrations, tests, and deployment are completed.

## Important economic distinctions
- **Perfect competition** is an economic benchmark: many buyers and sellers, informed participants, low barriers to entry, comparable products, and price-taking behavior. It is not the same as a “perfect market economy” guarantee.
- **Monopoly** is a market structure in which one seller has substantial market power. The platform may measure, disclose, and simulate monopoly conditions for education or analytics, but must not secretly create or reward anticompetitive exclusion, collusion, predatory conduct, or artificial scarcity.
- **Free-market profile** means sellers independently set prices and buyers choose freely. “Zero government intervention” cannot be promised by a real platform: applicable law, tax, consumer protection, sanctions, privacy, payments, and safety obligations still apply.
- **Mixed-market profile** combines private pricing and competition with transparent platform rules and safeguards.
- **Social-market profile** combines private enterprise with opt-in, transparent worker protections, small-business access, and social-impact programmes.

## Product profiles
### 1. Open Free Market
- Sellers set listing prices and quantities independently.
- Buyers compare offers and choose suppliers.
- Platform fees are disclosed before checkout.
- No platform-imposed price fixing or seller coordination.
- Search ranking is based on disclosed, consistently applied criteria; paid placement is labelled.
- Compliance and fraud controls remain active.

### 2. Mixed Market (recommended default)
- Retain seller price autonomy and open entry.
- Provide transparent dispute handling, refunds, fraud prevention, verified seller indicators, and product standards.
- Detect suspicious collusion, fake reviews, market manipulation, and abusive concentration.
- Apply neutral, published marketplace rules consistently.
- Keep fees, taxes, shipping, and other charges visible before payment.

### 3. Social Market
- All mixed-market safeguards.
- Optional, clearly itemized contributions to a community/social-impact pool; never deduct undisclosed amounts.
- Small-business discovery and onboarding support using transparent eligibility criteria.
- Optional worker/seller benefit programmes with published funding, eligibility, and governance.
- Report impact and distributions with audit trails; do not promise guaranteed returns.

## Competition and monopoly safeguards
- Do not provide a “monopoly mode” that enables sellers to coordinate prices, divide territories, exclude competitors, or manipulate supply.
- Provide an admin-only market concentration dashboard (for example, seller share and concentration indicators) for monitoring and research.
- Flag concentration for human review; metrics are signals, not legal findings.
- Do not automatically penalize a successful seller solely for being large. Use fair, evidence-based review and applicable competition law.
- Keep any monopoly economics simulator isolated from live listings, ranking, checkout, and payment execution.

## Shared marketplace rules
- Independent seller accounts and seller-controlled listing prices.
- Buyer-visible total cost, availability, shipping, returns, and seller identity/verification status.
- No fake scarcity, deceptive discounts, undisclosed sponsored ranking, or hidden fees.
- Seller and buyer data access limited by role and least privilege.
- Record administrative changes, pricing events, refunds, disputes, and payouts in immutable/auditable event history.
- Wallet balances must be ledger-derived; clients cannot write balances or mark payments settled.
- Payment provider webhooks must be signature-verified, idempotent, replay-resistant, and reconciled before settlement.
- KYC/KYB, tax, consumer, privacy, employment, and financial obligations must be reviewed for each launch jurisdiction.

## Suggested data model (migration required before use)
- `marketplace_settings`: active profile, jurisdiction, effective date, version, and approver.
- `seller_listings`: seller-controlled price, currency, inventory, status, and timestamps.
- `price_events`: listing, previous/new price, actor, reason, timestamp.
- `market_metrics`: category, period, seller concentration metrics, methodology version.
- `social_programmes`: programme terms, opt-in state, funding source, eligibility, and governance.
- `social_contributions`: explicit consent, amount, currency, recipient programme, and ledger reference.
- `policy_audit_log`: actor, action, policy version, before/after references, and timestamp.

Use row-level security, server-side authorization, append-only financial records, and database constraints. Never store payment secrets in client-visible tables or ship Supabase service-role credentials to the browser.

## Rollout plan
1. Product and legal review; confirm launch jurisdictions and default profile.
2. Implement profile configuration and seller pricing controls behind a feature flag.
3. Add transparent fees, price history, sponsored placement disclosure, and buyer protections.
4. Add concentration analytics and human review workflows; keep monopoly simulation separate.
5. Add opt-in social programmes with accounting, consent, governance, and reporting.
6. Test authorization, RLS, pricing edge cases, concurrency, payment idempotency, refunds, and auditability.
7. Deploy to preview/staging, obtain acceptance, then promote to production.

## Acceptance criteria
- A user can understand the selected economic profile and its rules.
- Sellers retain independent control of their prices.
- Buyers see the complete payable total before checkout.
- No profile bypasses applicable legal or safety controls.
- Monopoly analysis cannot alter live seller pricing or exclude competitors.
- Social contributions are optional, consented, itemized, and traceable.
- No client can directly credit, debit, or settle a wallet.
- All profile changes and financial events are auditable.
