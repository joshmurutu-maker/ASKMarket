# Seller listings and product-image rollout

This change adds durable seller submissions and product-photo storage. It is intentionally moderation-first: a seller's submission is saved to their account with `pending_review` status and is not visible to other buyers until an authorized reviewer publishes it.

## Required Supabase step

The migration is **not** applied automatically by a Vercel deployment.

1. Open the Supabase project linked to ASKMarket.
2. Open SQL Editor and review `supabase/migrations/202611090001_product_image_storage.sql`.
3. Apply it to the intended project (test/staging first, then production after backup/review).
4. Confirm the `seller_listings` table exists, RLS is enabled, and the public `product-images` storage bucket exists.
5. Confirm seller accounts have a `profiles` row with role `seller`, `distributor`, or `retailer`. Role changes are intentionally protected from self-service edits.

## Required Vercel environment

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` for AI background editing (server-side only)
- Optional: `OPENAI_IMAGE_MODEL` (defaults to `gpt-image-2.5-sunburst`)

Do not add service-role keys, OpenAI keys, or other secrets to public HTML or variables prefixed with `NEXT_PUBLIC_`.

## Seller workflow

1. Seller signs in with a seller/distributor/retailer account.
2. Seller selects a JPG, PNG, or WebP photo using the Android/browser system picker.
3. ASKMarket asks for confirmation before opening the picker and before uploading the photo.
4. AI background editing requires a separate explicit confirmation and a valid signed-in session.
5. On submission, the API verifies the Supabase session, uploads the photo into the seller's own Storage folder, and inserts a row in `seller_listings`.
6. The seller sees their own pending submission when signed in. Public users see only rows with `status = 'published'`.

The moderation trigger prevents seller clients from changing the review status. Publishing requires a trusted administrative process; this repository change does not silently auto-approve sellers or listings.

## Validation checklist

- Apply the migration in a non-production Supabase project first.
- Test with a buyer account (submission must be rejected).
- Test with a seller account (listing should save as pending review).
- Confirm another signed-in account and anonymous visitor cannot see pending listings.
- Publish a test listing through a trusted admin process and confirm the public catalogue displays its image.
- Test the AI edit with a real signed-in seller and a configured OpenAI key; confirm the original product remains recognizable.
- Verify the Android picker, consent prompts, file size/type checks, and mobile layout.
