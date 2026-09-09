# Coupon system

Admin ? Coupons supports percentage/fixed discounts, minimum merchandise subtotal,
expiry, total/per-customer limits, activation, and product/category restrictions.
Blank limits mean unlimited; zero means no redemptions. Expiry is entered in the
admin browser's local timezone and stored as a Firestore timestamp.

Restricted promotions discount only eligible merchandise. Fixed discounts are
capped at that merchandise's value; shipping is never discounted. Only one code
is accepted per order. Minimum spend uses the entire merchandise subtotal.

Checkout prices, stock, eligibility and totals come from the Express server using
Firebase Admin. Quote validation is advisory; order creation validates everything
again inside the same Firestore transaction that increments coupon usage, reserves
stock, and saves the order. Per-user eligibility counts historical orders, including
cancelled orders; cancellation/returns do not restore coupon uses. Idempotent retries
never increment usage twice. Client-supplied discounts and prices are ignored.

Orders retain coupon ID/code, discount type/value, actual discount and an embedded
coupon snapshot. Later edits/deletion do not change order details or invoices.
Code reservations in couponCodes prevent concurrent duplicates and reuse after
rename/deletion. Existing codes acquire reservations when edited/deleted; existing
coupon IDs and historical orders remain supported. Legacy duplicate codes fail
checkout and require admin cleanup.

## Deployment

Deploy both the Express backend and Next.js frontend. Set BACKEND_API_URL on the
frontend to the HTTPS Express API base ending in /api, and configure the backend's
existing Firebase Admin credentials. The frontend includes same-origin coupon
proxy routes for deployments without NEXT_PUBLIC_API_URL.

Publish the root firestore.rules to the existing Firebase project using your normal
rules deployment process. Coupons and couponCodes are server-only; admin UI actions
use authenticated APIs with the existing admin-role middleware. No client may edit
usage counters or order snapshots. No new composite index is required.

## Verification

Run `node --test backend/test/*.test.js`, `node --test frontend/test/*.test.mjs`, and
`npm run build` in frontend. Transaction tests use an isolated in-memory adapter;
they do not write to a live Firebase project. Before release, exercise admin CRUD,
product offers, mixed carts, coupon expiry/limits and the printed invoice against
your staging Firebase project, including simultaneous final-use checkouts.
