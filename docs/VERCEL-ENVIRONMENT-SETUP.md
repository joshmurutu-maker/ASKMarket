# ASKMarket Vercel environment setup

Add values directly in **Vercel → ASKMarket → Settings → Environment Variables**. Never paste credentials into GitHub, source files, chat, or browser code.

## Supabase account service

Configure these for the **Preview** environment first:

| Variable | Value source | Exposure |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL (HTTPS) | Used by server and public config |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key | Public client key; restricted by Supabase RLS |

The browser account flow uses Supabase Auth directly. The anon/publishable key is not a secret, but all database access must be protected by correctly tested RLS policies. Never put the Supabase service-role key in `index.html`, a public API response, or a browser-exposed variable.

Before enabling accounts:
1. Apply repository migrations to a disposable Supabase staging project first.
2. Verify email confirmation, password recovery, redirect URLs, MFA policy, backups and RLS with separate buyer and business test accounts.
3. Confirm account roles used for authorization are assigned by trusted server/admin workflows. User-editable metadata must not grant seller, distributor, retailer or administrator privileges.
4. After staging checks pass, add the same two variables to Production and verify `/api/config` reports `accountServiceConfigured: true`.

## Sumsub KYC/KYB

After Sumsub issues sandbox credentials and configures levels, set these as server-only Vercel variables:
- `SUMSUB_APP_TOKEN`
- `SUMSUB_SECRET_KEY`
- `SUMSUB_KYC_LEVEL`
- `SUMSUB_KYB_LEVEL`

Keep all four server-side. Configure signed callback/webhook verification and persist trusted decisions before treating a person or business as verified. A completed browser SDK step is not an approval.

## Deployment sequence

1. Add Preview values and redeploy the feature branch.
2. Test signup, email confirmation, sign-in, expired sessions and verification token issuance using sandbox accounts only.
3. Test KYC and KYB separately, including a buyer attempting KYB and an unapproved account attempting seller actions.
4. Review migrations and legal drafts with qualified Kenyan counsel and privacy specialists.
5. Add Production values only after provider onboarding, security review and operational support are ready.
6. Promote only after release gates are signed off.

## Current limitations

An empty `/api/config` value means Supabase has not been configured for that Vercel environment; frontend code cannot manufacture these credentials. A GET to `/api/verification/access-token` should return **405** because that endpoint intentionally accepts POST only.

ASKMarket currently does not process real payments, escrow, seller payouts, advertising revenue or share issuance. Do not accept customer or investor funds through this prototype.
