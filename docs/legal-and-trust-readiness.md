# Legal and trust readiness — Kenya

## Current implementation status
This repository contains draft public-facing policy copy at `/legal/`. It is intentionally marked as a draft and requires the operator's verified legal identity, contact details and counsel review before being treated as final.

## Kenya reference framework
- Data Protection Act, 2019 and the Data Protection (General) Regulations, 2021; consult ODPC's official [regulatory framework](https://www.odpc.go.ke/data-protection-laws-kenya/index.html).
- Consumer Protection Act, 2012; consult the [official Parliament PDF](https://www.parliament.go.ke/sites/default/files/2017-05/ConsumerProtectionActNo46of2012.pdf).
- Competition Act, 2010 and CAK consumer-protection guidance; see [CAK](https://cak.go.ke/consumer-protection).
- Review the platform's exact activities with Kenyan counsel. Marketplace intermediation, payments, custody, investment/shareholding, advertising, tax, employment, import/export and sector-specific goods may create different obligations.

## Must complete before public launch
1. Confirm the legal operator's registered name, registration number, address, tax status and support contacts.
2. Obtain a written legal assessment of marketplace role, consumer terms, seller contracts, prohibited goods, product safety, returns/refunds, advertising and liability.
3. Determine whether the operator must register with ODPC as a data controller and/or processor, and complete registration where required. Document lawful bases, notices, data-subject request handling, retention, processor contracts, security controls and international transfer safeguards.
4. Map every personal-data flow: Supabase, Vercel, OpenAI image generation, Sumsub and any future payment/custody provider. Do not send identity documents, biometric data, payment credentials or private keys to the image model.
5. Complete privacy impact assessment where required, breach response, access controls, MFA, audit logging and deletion workflows.
6. Add seller verification and evidence review. Do not let editable browser metadata grant trusted status; roles and verification decisions must be controlled server-side.
7. Publish clear total pricing, delivery fees, seller identity, stock, product condition, warranty, cancellation, returns and complaint escalation before checkout.
8. Keep real-money M-Pesa, crypto custody, investment returns and payouts disabled until regulated providers, merchant onboarding, signed webhooks, reconciliation, KYC/KYB gates and legal review are complete.
9. Do not advertise buyer protection, escrow, licensed status, regulator approval or guaranteed refunds until they exist and are evidenced.
10. Run accessibility, security, abuse, seller/buyer permission and consumer-journey testing; maintain a public incident and complaint contact.

## AI product imagery
- Seller listing flow generates one AI image server-side with OpenAI `gpt-image-1`, stores it in the public Supabase `product-images` bucket under a seller-specific folder, and saves the resulting URL on the product row.
- Product cards apply cyan/violet neon glow and visibly label generated artwork as AI.
- Seller must confirm that the generated illustration accurately represents the real item. AI output is not proof of authenticity, condition or provenance.
- Configure `OPENAI_API_KEY` only in Vercel server-side environment variables. Never expose it to the browser or commit it.
- Apply migration `202611090005_ai_product_images.sql` to staging first. The storage bucket is public-read for listing images; uploads are restricted to authenticated seller/distributor/retailer profiles and their own folder.
- A database-backed quota currently limits each seller to five generations in a rolling 24-hour period. Add monitoring, abuse review and an operator-adjustable cost ceiling before public launch. AI image generation incurs provider charges.
- Do not upload private, personal, copyrighted or trademarked reference material without rights.

## Required Vercel environment
Existing: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, Sumsub sandbox values as applicable.
New: `OPENAI_API_KEY` (server-only; image generation cost applies).

## Release gate
This PR is not a legal certification and must not be merged/deployed as a declaration of compliance. Apply database migration to staging, test role/RLS boundaries and AI image storage, run security review, fill business identity fields, and obtain counsel approval before production publication.

## Blocking schema compatibility issue discovered during review
The repository currently contains two competing core migrations:
- `202611060001_marketplace_core.sql` defines `profiles.user_id` and a business-based catalogue (`products.business_id`, `unit_price_minor`, `available_quantity`, `image_urls`).
- `202611060002_marketplace_core.sql` attempts to define `profiles.id` and a seller-based catalogue (`products.seller_id`, `price`, `quantity`, `image_url`).

Because both migrations create the same table names with `create table if not exists`, applying them in sequence does not reconcile the columns. Later functions, policies and the new AI image route can reference columns that do not exist in the schema created by the earlier migration. This must be reconciled into one canonical schema before applying migrations or enabling seller publishing. Do not apply the AI image migration to a database with the unresolved schema. PR #9 remains draft and is not production-ready.
