# Codebase Cleanup Report

Date: September 7, 2026

## Scope and Method

Reviewed both applications, routing conventions, source imports, dependency manifests,
public assets, CSS, configuration, and Firebase integration. The working tree was clean
before cleanup. Parsed all 138 original JavaScript/JSX files and traced imports and
CommonJS dependencies from framework entry points and the Express server. Cross-checked
deletion candidates with repository-wide text searches and their active replacements.

No routes, UI features, database collections, security rules, environment files, payment
flows, invoice rendering, or authentication behavior were intentionally changed.

## Deleted Files

| File | Evidence |
| --- | --- |
| `frontend/components/product/CategoryCard.jsx` | No imports or render sites; category displays are implemented in the active storefront pages. Removed its obsolete README listing too. |
| `frontend/SEO/faqSchema.js` | No imports or calls to `createFaqSchema`; not a framework entry point. Other active structured-data modules remain. |
| `frontend/lib/reviewFirestore.js` | No imports or calls into this module. Product, profile, and admin reviews use the active API implementation. Review API routes and collections remain. |

These three tracked files can be recovered from Git history. No backup/demo files were
found that required deletion.

## Assets

Deleted: none. All 14 public assets have active references. Checked source strings,
asset mappings, configuration, CSS, SVGs, and invoice HTML. No missing local asset paths
or identical asset files were found. All 14 assets also returned HTTP 200 when served
by the production frontend. Database-provided and remote asset URLs remain untouched.

## Dependencies

Removed the unused `firebase` client SDK from the backend. Backend code imports
`firebase-admin`, which remains installed. Updated `backend/package-lock.json` with npm
and synchronized installed dependencies. This removed 114 package entries in total,
including the client SDK and its now-unused dependency entries. No retained package
versions changed and no packages were added. Frontend dependencies remain unchanged.

## Unused Code Removed

- Commented-out About team section and its sample `teamMembers` data.
- Commented-out Gallery tabs and alternate layout, `socialTabs`, and unused icons.
- Unused navbar `mobileQuickLinks` mapping and empty cart JSX comment.
- Unused imports in cart, category listing, blog detail, and API handlers.
- Unused admin-order `firstItem`, backend order subtotal calculation, and unused
  destructured user-role/coupon-subtotal bindings. Active totals and validation remain.
- Uncalled address/wishlist listeners, wishlist writers, and their private sorter in
  `accountFirestore.js`. Active address operations, order listener, product loading,
  and the wishlist implementation used by `WishlistContext` remain.
- Uncalled blog/gallery read helpers and their serializers in `firestoreServer.js`.
  Active product/category reads, public blog/gallery API handlers, and fallbacks remain.
- Unused `toBlogDate`, `mapOrderDoc`, private `toMillis`, `formatProduct`, and
  `formatSubcategory` helpers.
- Unused `.section-heading` CSS class. Other shared classes and the Tailwind safelist remain.

## Duplicate Code

Reused the identical `normalizeText` helper instead of a second `normalizeId` function
in notifications. Preserved the sign-in check while removing its unused result binding.
Merged duplicate imports from `./firebase` in `api.js`. Removed obsolete review/wishlist
implementations after tracing the active replacements; did not merge separate API stacks.

## Modified Files

In addition to the three deleted files, these 24 existing files changed:

- `README.md`
- `backend/controllers/couponsController.js`
- `backend/controllers/ordersController.js`
- `backend/controllers/usersController.js`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/app/about/page.js`
- `frontend/app/admin/orders/page.js`
- `frontend/app/api/orders/route.js`
- `frontend/app/api/products/route.js`
- `frontend/app/api/subcategories/route.js`
- `frontend/app/blog/[slug]/page.js`
- `frontend/app/cart/page.js`
- `frontend/app/gallery/page.js`
- `frontend/app/globals.css`
- `frontend/app/products/[category]/page.js`
- `frontend/components/cart/CartDrawer.jsx`
- `frontend/components/layout/Navbar.jsx`
- `frontend/lib/accountFirestore.js`
- `frontend/lib/api.js`
- `frontend/lib/blog.js`
- `frontend/lib/firestoreServer.js`
- `frontend/lib/notifications.js`
- `frontend/lib/order.js`

Added this report, `CLEANUP_REPORT.md`.

## Validation

| Check | Result |
| --- | --- |
| Frontend production build before and after cleanup | Passed; generated 39 static pages during each build |
| Built route-manifest comparison | All 71 route entries preserved; no additions or removals |
| Syntax and dependency graph | All 135 remaining JS/JSX files parsed; no unresolved local imports or unreachable source modules |
| Backend `node --check` | Passed for all 20 backend JavaScript files |
| `npm ls --depth=0`, both applications | Passed; no missing direct dependencies |
| Dependency-lock comparison | No retained versions changed; no new package entries |
| Frontend HTTP checks | 34 page/redirect checks passed, including the existing `/orders` to `/profile` redirect |
| Asset HTTP checks | All 14 public assets returned 200 |
| Backend HTTP checks | Health returned 200; missing route returned 404; six protected GET endpoints returned 401 without credentials |
| JSX comparison against Git baseline | Tags, attributes, and visible text unchanged across all eight modified UI files |
| `git diff --check` | Passed |

There is no configured standalone ESLint/type-check setup or automated test suite.
The `lint` script invokes the interactive Next.js ESLint setup, so no lint configuration
or extra tooling dependencies were introduced. Syntax/scope checks and production
compilation were used for this cleanup.

HTTP checks confirm server rendering and responses, not browser interaction or complete
business-flow coverage. Authenticated checkout, payments, invoice printing, admin writes,
live database mutations, and database-dependent blog/product detail rendering were not
exercised. No smoke test submitted data. Temporary validation servers were stopped.

## Intentionally Retained

- Both Express and Next.js API implementations: active proxies, environment selection,
  and fallbacks require both. Similar code across them is not sufficient proof of redundancy.
- `frontend/pages/_document.js`: a framework-discovered entry point, including potential
  Pages Router error rendering; lack of an explicit import does not prove it is unused.
- Firebase Storage initialization/export, credential loading, local mock mode,
  environment handling, security rules, and deployment/build configuration.
- Exported helpers used inside their own modules, even without external imports.
- The unused-looking `isDefault` destructuring binding in the address update route:
  it deliberately excludes that field from the update payload.
- Express callback parameters, including the fourth error-handler argument, and
  operational startup/error/fallback logs. Their signatures or diagnostics are meaningful.
- Tailwind dynamic classes, safelist entries, all public assets, and database-managed URLs.
- The empty `backend/utils` directory: automatic approval review rejected its removal
  command with "blocked by policy". It remains; no code depends on it.
