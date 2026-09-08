# Deployment check — 2026-09-08

Status: **not ready for a public launch** until the remaining dependency issues
and deployment checks are resolved. The COD follow-up fixes checkout, order
writes, card selection, and production CORS; see [COD_FLOW.md](COD_FLOW.md).
The remaining-launch-blockers list below records the original review findings;
items 1, 2, 3 and the CORS portion of 5 have now been addressed locally.

## Environment files

- Added repository-wide ignore rules for `.env`, `.env.*`, dependencies, build
  output, common service-account filenames, and private-key files. Updated both
  application ignore files too. Only `.env.example` and `.env.*.example` templates
  are exceptions; these now contain placeholders.
- Removed `frontend/.env` from the Git index, preserving the local file.
  Commit the staged removal together with the ignore changes. The file remains
  in earlier Git history; its current contents contain public Firebase web
  configuration, not a private key. Backend `.env` and frontend `.env.local`
  have no history under those paths in the local Git repository.
- Verified all three existing local environment files are ignored, along with
  production variants. No private-key markers were found in tracked non-template
  files. This is a targeted check, not an exhaustive historical secret scan.
- Git ignore rules protect Git-based uploads. They do not prevent a manually
  uploaded folder/ZIP or a deployment tool from copying local files. Deploy from
  a clean checkout, excluding local credentials and generated output.
- Configure variables through each hosting service's environment settings.
  The frontend needs `NEXT_PUBLIC_FIREBASE_*` and an HTTPS
  `NEXT_PUBLIC_API_URL` ending in `/api`, plus server-only Firebase Admin
  credentials for its Next.js routes. The backend needs its Firebase Admin
  credentials, storage bucket, `NODE_ENV=production`, and hosted frontend origins
  in `CLIENT_URL`/`CLIENT_URLS`. Use the examples as the variable inventory.
- `NEXT_PUBLIC_*` values are included in browser JavaScript. Firebase web config
  is intended for that use; private keys, service accounts, and other secrets
  must never use this prefix. Real environment files need not be committed for
  hosting environment variables to work.

## Changes made

- Firestore user creation now requires `role: "customer"`. Previously, a new
  account could create its own profile with `role: "admin"`. The rule change is
  local and must be deployed to Firebase before it protects the live project.
- Backend mock authentication now fails startup under `NODE_ENV=production`.
  Previously mock mode accepted arbitrary tokens as a demo user.

## Remaining launch blockers

1. **Order integrity:** `frontend/app/api/orders/route.js` accepts customer-supplied
   discount, shipping, payment status and order status. The backend recalculates
   coupons, but also accepts shipping, payment status and order status. Set these
   server-side, validate quantities and coupon eligibility, and verify payment
   through a provider before marking an order paid. Test both API paths.
2. **Direct Firestore order creation:** `firestore.rules` allows customers to
   create arbitrary order documents for their own UID. Require validated server
   order creation so direct writes cannot bypass pricing and inventory logic.
3. **Card checkout is a placeholder:** the UI offers card payments without a
   payment gateway. Disable that option or complete the provider integration
   before accepting real customer orders.
4. **Dependency vulnerabilities:** `npm audit --omit=dev` reported 20 frontend
   findings (1 critical, 2 high, 17 moderate) and 11 backend findings (moderate).
   Upgrade affected dependencies and rerun the build and functional tests.
   Dependency versions were not changed during this check.
5. **Backend routing and origins:** coupon routes exist only in Express, so
   production needs a real backend URL; falling back to frontend `/api` is
   insufficient. Backend CORS currently accepts any Vercel subdomain and accepts
   all origins when the allowlist is empty. Restrict production to intended
   frontend origins.
6. **Review ownership:** public product-review update rules check only the new
   document's user ID. Check the existing owner too, so another signed-in user
   cannot replace a review while changing its owner.

## Validation completed

- `frontend`: `npm run build` passed, including generation of 39 static pages.
- Every tracked backend JavaScript file passed `node --check`.
- Production HTTP smoke checks returned 200 for frontend `/`, `/products`,
  `/cart`, `/checkout`, `/contact`, `/api/products`, and `/api/categories`.
- Backend `/api/health`, `/api/products`, and `/api/categories` returned 200
  with real Firebase initialization.
- Both API layers returned 401 for unauthenticated `/api/orders` and `/api/users`.
- Verified production startup rejects `SKIP_FIREBASE=true`.
- No browser automation tool or configured automated test suite was available.
  Sign-in, Google login, cart interactions, authenticated checkout, coupon use,
  admin operations, mobile layouts, and deployed Firebase rules were not tested
  end to end. No test orders or other live database writes were made.

Before launch, resolve the blockers, test using a staging Firebase project,
deploy the rules/indexes, and add the real frontend domain to Firebase Auth's
authorized domains. No hosting deployment or Firebase rules deployment was made
as part of this review.
