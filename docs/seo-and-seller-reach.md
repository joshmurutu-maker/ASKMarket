# Search visibility and seller reach

## Implemented foundation
- Descriptive page title, meta description, canonical URL, robots directives and social sharing metadata.
- Organization and website structured data.
- `robots.txt` and XML sitemap.
- A public product catalogue API that reads only published products.
- Authenticated product publishing through the signed-in user's Supabase JWT and existing database row-level security.
- Product listings are centrally stored and visible across browsers after the marketplace core migration is applied.
- Product name, category, price, stock quantity and description are validated server-side.

## Important SEO limitation
No implementation can guarantee the number-one Google position. Rankings depend on relevance, competition, authority, quality, technical accessibility, freshness and Google's systems. The current website is a single-page app, so the homepage metadata is crawlable but product-specific SEO landing pages and server-rendered product detail pages are still needed before every seller listing can reliably earn its own Google result.

## Owner launch checklist
1. Verify the canonical domain and HTTPS in Google Search Console.
2. Submit `https://askmarket.vercel.app/sitemap.xml` in Search Console.
3. Verify ownership using a Search Console DNS or HTML method and inspect the homepage URL.
4. Confirm the Supabase core marketplace migration is applied to staging and production only after review.
5. Set Vercel `SUPABASE_URL` and `SUPABASE_ANON_KEY`; never expose a service-role key.
6. Test publishing with buyer, seller, distributor and retailer accounts. Buyer accounts should be denied by database RLS.
7. Add product image storage with upload limits, MIME validation, malware scanning and public image URLs before accepting seller photos.
8. Build crawlable product detail routes with unique title, description, canonical URL, Product structured data, stock/price accuracy and sitemap entries.
9. Add seller storefront pages, category landing pages, pagination and structured internal links.
10. Monitor Search Console indexing, Core Web Vitals, mobile usability, broken links and duplicate content.

## Seller growth recommendations
- Make seller onboarding easy, but keep identity/business verification and prohibited-item controls.
- Provide bulk catalogue import (CSV) after validation and preview.
- Support multiple product photos, clear descriptions, units, minimum order quantities, location/coverage and shipping terms.
- Give sellers a shareable storefront and listing URL once product detail pages are implemented.
- Offer transparent listing analytics: impressions, search appearances, clicks, enquiries and conversion.
- Use fair organic ranking signals; label paid placements and never sell fake reviews or promise top ranking.
- Create referral links and supplier onboarding guides. Do not scrape competitors or spam prospective buyers.

## API
- `GET /api/products`: public list of published products.
- `POST /api/products`: requires Supabase bearer token; database RLS enforces seller/distributor/retailer permissions.
- Uses the public anon key and user JWT; no service-role credentials or wallet secrets are exposed.
