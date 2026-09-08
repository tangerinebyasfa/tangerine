# Returns, exchanges, size guides and filters

## Customer and store workflows

Customers open an order from their profile and use **Returns & exchanges**.
The default window follows the existing store copy: seven days from delivery.
Only the purchaser can submit; the order must be delivered and paid (a partial
refund does not prevent requesting a different eligible line).

Each purchased line can have one request covering all its units. A return and an
exchange cannot both claim that line. Retrying the same submission returns its
existing record. Rejected requests remain visible and cannot be resubmitted;
customers can contact the store for further help.

The **Returns & Exchanges** admin page at `/admin/returns` supports search and
status filtering. Admins share customer-visible approval instructions or a
rejection reason. Customers use **Refresh status** on the order page to see
updates and replacement tracking details.

- Return: requested → approved → received/inspected → completed.
- Exchange: requested → approved → received/inspected → exchange shipped → completed.
- Requested or approved requests can be rejected with a reason.

On receipt, staff confirm inspection and whether all units are sellable. Only
sellable returned units are added to stock. An exchange reserves replacement
stock in the same transaction, and requires existing replacement stock before
restocking the original units. Invalid or repeated updates cannot change stock
twice. The existing catalog uses aggregate stock per product, so staff must
verify the requested size/colour physically; this is not per-variant inventory.

Exchanges are for another available size or colour of the same product, without
a price change. Admins record a courier and tracking number before confirming
replacement delivery. An out-of-stock exchange stays approved until the store
can fulfil it or rejects it with an explanation.

Return refund amounts come from original order line totals, minus that line's
allocated coupon discount, with paise rounding across lines. Standard item
refunds exclude original shipping. Staff issue the refund through their usual
payment process, then enter its exact amount and reference and confirm it in
the admin form. **The application records refunds; it does not transfer funds.**
Recorded refunds reduce collected revenue and appear in order details.

## Product configuration

The admin product form has **Eligible for standard returns and exchanges**.
New orders snapshot this setting, so later catalog changes do not alter their
eligibility. Existing orders without that field retain default eligibility.
The product page displays exclusions. Backend product creation now saves size
guides and category metadata, matching the frontend handler.

The existing Size Guide field accepts ordinary notes or a pipe-separated table:

```text
Body measurements. Replace each placeholder with verified product measurements.
Size | Chest (cm) | Waist (cm)
S | actual value | actual value
M | actual value | actual value
```

Use actual measurements; no generic size chart is populated automatically.
Label centimetre columns with `(cm)` to enable inch conversion. Numeric ranges
are also converted. Shoe-size labels and nonnumeric cells are left unchanged.
The chart highlights the selected size and includes measuring instructions.
Admin preview uses the same renderer; malformed table columns are rejected by
the product form. Plain-text guides remain supported and guides can be cleared.

## Catalog filters

All-products, category and search-result listings support size, colour,
subcategory, minimum/maximum INR price, in-stock, on-sale, and sorting by newest,
price or name. Unavailable structured size options are excluded from size
filters. Results show a count and an empty-state reset.

Filters are applied to the already-loaded catalog and stored in URL query
parameters. Copy the URL to share the selected filters; clearing filters
preserves the current category and search term. Large catalogs may eventually
need server-side search and pagination.

## Deployment and verification

- Deploy the updated Express backend and Next.js frontend together. The new
  Next.js handlers proxy to Express using the existing API configuration.
- Deploy the updated Firestore rules. `returnRequests` permits owner/admin
  reads and denies every direct client write; mutations use server transactions.
  No additional composite index is required by these new queries.
- Set verified measurements in your products, check exclusion settings, and
  exercise a return/refund and exchange/tracking flow on staging.
- Run `npm test` in backend: 20 tests, including the existing 11 COD tests and
  nine return/exchange tests. Run it in frontend: five catalog/chart tests.
- Run `npm run build` in frontend. To avoid conflicting with a running dev
  server, set `NEXT_DIST_DIR=.next-check` for an isolated verification build and
  use the same variable when starting it. That output directory is ignored.

Tests use an isolated Firestore transaction adapter and local HTTP servers.
They do not issue refunds, create live orders, deploy rules, or write to the live
database. Authenticated browser flows and deployed rules still need staging
verification. The dependency issues from the earlier deployment review remain
outside this feature update.
