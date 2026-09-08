# Cash-on-delivery flow

## Customer flow

Select an available size and colour on the product page, add items to the bag,
then sign in and open checkout. Products with options open their detail page
from quick-add. Quantities must be whole numbers from 1 to 99 per product.

Checkout obtains current product prices, coupon discounts and stock availability
from the backend. The shipping charge remains **₹8 per order**, currency is INR,
and delivery addresses require an Indian PIN code and mobile number. Card
payments are unavailable. Customers review the confirmed total before ordering.

If a price or discount changes before submission, the order is rejected without
reserving stock. Refresh the total, review it and submit again. Errors retain the
bag. A checkout request ID prevents retries from creating duplicate orders or
deducting stock twice; the browser retains it in session storage after a timeout.
Checkout can recover the completed order after a reload, even if the last unit
was purchased. Session storage contains the request ID and payload hash, not the
delivery address. Clearing browser session storage ends automatic recovery;
customers can still find their orders in their account.

Open `/orders/{id}` from the account order list to cancel an order while it is
pending or processing. Cancellation is final, restores stock once, and leaves
no COD payment due. After shipment, the customer must contact the store.

## Store flow

Use `/admin/orders` and open an order to move it through:

`pending → processing → shipped → delivered`

Admins may also cancel pending or processing orders. The API rejects skipped,
backward and terminal-state transitions. On delivery, enter the exact order total
collected and confirm receipt of cash. Only then is the order marked paid; the
actor, amount, timestamp and status history are recorded. Duplicate delivery
updates do not append duplicate history. Collected revenue excludes unpaid COD
orders. Orders cannot be deleted or reopened through these routes.

After-shipment returns and exchanges now have a separate request workflow; see
[RETURNS_AND_SHOPPING.md](RETURNS_AND_SHOPPING.md). Failed-delivery reconciliation
remains a store workflow, separate from pre-shipment cancellation. Existing non-COD or already-paid
legacy orders require manual payment review before using this status flow.

## Server guarantees and boundaries

- Express owns all order mutations. Next.js create, quote, cancel and status
  handlers proxy to it, removing the divergent local mutation implementation.
- The backend reads `product.price` (the selling price), never `compareAtPrice`
  or customer-supplied prices, line totals, discounts, shipping, currency,
  payment status, order status or customer identity.
- Creation reserves aggregate product stock and increments coupon usage in a
  single Firestore transaction. Transaction retries preserve the same order ID.
  Product size/colour choices are validated against the current catalog. This
  project still uses **one stock count per product**, not per variant.
- Current coupon scope, expiry, minimum spend, global usage and per-user usage
  are checked during checkout. Coupon usage remains consumed after cancellation;
  cancelling cannot repeatedly recycle a limited promotion.
- Firestore client rules deny every direct order create/update/delete, including
  client admin writes. Firebase Admin SDK server transactions bypass these rules.
  Owners and admins retain read access. New profiles cannot self-assign admin.
- API authentication checks revoked/disabled Firebase credentials. Admin roles
  come from server-read user profiles, not request bodies. Customer cancellation
  and recovery are scoped to the authenticated user.
- Production CORS accepts only explicitly configured frontend origins. Mock
  authentication remains prohibited in production. Missing backend configuration
  fails closed; production proxies require HTTPS and cannot proxy to themselves.

## Deployment

1. Deploy the Express backend with real Firebase Admin credentials,
   `NODE_ENV=production`, and `CLIENT_URL`/`CLIENT_URLS` set to the exact frontend
   origin(s), without paths or trailing slashes.
2. Set frontend `NEXT_PUBLIC_API_URL` to the hosted Express URL ending in `/api`.
   `BACKEND_API_URL` is an optional server-only override for Next.js proxies and
   must also point to Express, not the frontend. Rebuild after changing public
   environment variables. The frontend's existing local read/account routes
   still need their server-side Firebase Admin configuration.
3. Deploy `firestore.rules` and `firestore.indexes.json` to the intended Firebase
   project. The order-by-user/created-at index is already included. These local
   rule changes do not protect the live database until deployed.
4. Confirm catalog prices are numeric, stock is a nonnegative integer, and
   sizes/colours are correctly configured. Missing stock fails closed.
5. Resolve the previously reported dependency vulnerabilities before public
   launch, and exercise login, checkout, delivery and cancellation on staging.

Real `.env` files remain ignored. Use hosting environment settings rather than
committing/uploading local credentials. No Firebase rules, hosting configuration,
or live order data were changed during implementation.

## Validation

- `cd backend && npm test`: 11 passing tests covering server-authoritative
  totals, malformed quantities/options/addresses, aggregate stock, idempotency,
  concurrent purchases, changed quotes, real coupon validation, cancellation,
  delivery cash confirmation, concurrent status changes and HTTP permissions.
- Tests use an isolated transaction adapter that stages/rolls back writes,
  serializes competing transactions and rejects reads after writes. They do not
  write to the live Firebase project and are not Firestore emulator tests.
- `cd frontend && npm run build`: production build passed.
- Production HTTP checks covered checkout/cart/admin page responses, unauthenticated
  mutation/recovery rejection, deletion rejection, and failure with missing
  production backend configuration.
- Authenticated browser flows and Firebase rules were not exercised against a
  staging deployment; those remain deployment verification steps.
