# Community, Shipping and On-chain Engagement — Implementation Foundation

## Product objective
Make E-commerce a trusted, active marketplace where buyers, sellers, distributors and retailers can discover one another, transact with predictable delivery costs, build reputation, and inspect verifiable on-chain records.

This branch adds a database foundation and implementation contract. It does not claim that the browser UI, carrier integrations, smart contracts, wallet transfers or production database have been activated.

## 1. Market engagement
- Seller-controlled prices and inventory; buyers can compare published listings.
- Surface price history, stock availability, seller response/service metrics and transparent platform fees.
- Search and ranking criteria must be published and consistently applied. Clearly label sponsored placement.
- Track funnel metrics (search, product view, add-to-cart, checkout, completed order) without collecting unnecessary personal data.
- Build market concentration indicators for admin review only; do not use a monopoly mode to coordinate prices or exclude competitors.

## 2. Community engagement
- Product-linked discussion posts and comments.
- Verified-purchase reviews only: a trusted order service must check that the buyer completed the relevant order before creating a review.
- Moderation states, report/appeal workflow, spam/rate limits and audit trail are required before public launch.
- Do not sell reviews, suppress legitimate negative feedback, or expose private buyer/seller contact details.
- Add seller response tools and community announcements with opt-in notification preferences.

## 3. Shipping and service engagement
- Sellers publish delivery services, service levels, coverage and handling-time estimates.
- At checkout, a server-side quote calculates item subtotal, shipping fee and tax; save a quote snapshot with expiry so fees cannot silently change after buyer confirmation.
- Show the complete payable total before payment: items + shipping + applicable taxes/fees, plus estimated delivery window.
- Track shipment status and carrier events (label created, picked up, in transit, out for delivery, delivered, failed, returned).
- Support pickup/collection as a distinct service option where seller operations allow it.
- Carrier integrations must verify webhook signatures, deduplicate event IDs, validate tracking links, and reconcile exceptions.
- Do not claim a carrier booking, tracking number, delivery guarantee or shipping price is live until a carrier/fulfilment provider is contracted and tested.
- Shipping fee allocation (buyer-paid, seller-subsidized, free-shipping threshold) must be explicit before checkout and stored in the order snapshot.

## 4. On-chain activity
- Start with a read-only chain activity indexer and transaction explorer links. Do not move customer funds on-chain in the first rollout.
- Recommended first chain use cases: anchor completed order/shipment event hashes, and optionally publish review attestations without exposing names, addresses, order contents or personal data.
- Keep full order and identity data off-chain. Put only a salted/hashed commitment or opaque reference on-chain; ensure the commitment cannot be reversed to reveal personal data.
- Use a supported chain, audited contract, role-separated signer, multisig/admin controls, rate limits, nonce/replay protection, chain reorg handling and confirmation thresholds.
- Never request or store seed phrases/private keys in the browser. Use an approved custody/signing provider or managed key service; keys remain server-side and access is tightly scoped.
- Do not treat a submitted transaction as confirmed. Verify chain ID, contract address, transaction receipt, event signature, block hash and configured confirmations.
- Financial transfers remain disabled until licensed provider/custody arrangements, KYC/KYB, sanctions controls, reconciliation, incident response and independent smart-contract/security review are complete.

## 5. Data and security foundation
Migration: `supabase/migrations/202611090004_engagement_shipping_chain.sql`.

Tables:
- `seller_shipping_options`: seller-published service/fee rules.
- `delivery_quotes`: immutable buyer-visible quote snapshot, server-issued.
- `shipments` and `shipment_events`: shipment status and tracking timeline.
- `community_posts` and `community_comments`: product-linked community conversation.
- `product_reviews`: verified-purchase review records; server writes only.
- `onchain_activity`: public transaction metadata indexed to the authenticated user; no secrets.
- `marketplace_engagement_events`: privacy-conscious analytics, server write only.

RLS protects participant visibility. Client writes are intentionally denied for delivery quotes, shipment records/events, reviews, on-chain activity and analytics. Use authenticated server endpoints with least-privilege service-role access, strict validation, idempotency and audit logs. Do not put service-role keys, carrier credentials, RPC secrets or signer keys in browser code or Git.

## 6. Delivery sequence
1. Review and apply migration in staging; verify RLS with buyer, seller and anonymous test accounts.
2. Build UI for shipping options, quote display, shipment timeline, community feed, comments and review display.
3. Add server endpoints for quote creation, order-bound verified reviews, shipment creation and signed carrier webhooks.
4. Add analytics dashboards for conversion, repeat purchases, seller response, delivery SLA, shipping cost and dispute rates.
5. Integrate a read-only blockchain indexer and explorer links; test reorgs, duplicate events and wrong-chain transactions.
6. Deploy preview and run end-to-end tests. Only then consider production rollout with owner approval.

## Acceptance criteria
- Buyers see shipping fees, taxes, delivery estimates and total cost before payment.
- Quote totals are calculated server-side and cannot be edited by clients.
- Shipment visibility is restricted to the buyer and seller on that shipment.
- Public reviews are tied to completed orders and cannot be self-attested by a client.
- Community posts/comments have moderation, abuse controls and author ownership.
- On-chain activity is verified against the correct network and confirmations; private data and keys stay off-chain.
- No live money movement or carrier fulfilment is represented as enabled without verified provider integration.
