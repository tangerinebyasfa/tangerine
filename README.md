# Tangerine

![Tangerine logo](frontend/public/Images/logo.png)

**Where fashion inspires learning.**

Tangerine is a women's fashion and lifestyle brand that brings together
contemporary style, individuality, and practical fashion education. Founded by
Sunil Rane, the brand connects a professional boutique experience with
Atharva University - School of Design.

This repository powers Tangerine's digital storefront and the administration
tools behind its products, content, and customer experience.

## Our Story

Tangerine began with the belief that fashion education becomes more meaningful
when students can experience the professional world while they are still
learning. The boutique brings classroom ideas into a real retail setting,
connecting creativity with merchandising, customer understanding, branding,
and entrepreneurship.

Students, faculty, and industry professionals contribute different perspectives
to a shared vision: helping people express their style while giving emerging
fashion professionals opportunities to learn through experience.

## The Collection

Tangerine's collection is centered on comfort, elegance, and personal expression:

- **Clothing:** contemporary pieces for everyday dressing and individual style.
- **Footwear:** choices that complement a modern wardrobe.
- **Jewellery and accessories:** bangles, necklaces, earrings, and finishing
  touches that add character to a look.

The brand welcomes students discovering their style, working professionals
building versatile wardrobes, and women looking for distinctive pieces.

## Our Locations

| Location | Brand Experience |
| --- | --- |
| Atharva University, Mumbai, Maharashtra | Fashion, education, and boutique practice within a creative university environment. |
| Blue Ocean Resort, Ratnagiri, Maharashtra | A boutique presence that connects fashion with lifestyle, travel, and discovery. |

The website's Contact page provides store details, contact channels, and a
message form with a preferred-location option.

## The Digital Experience

### For Customers

- Browse clothing, footwear, and accessories by category and subcategory.
- Search products and explore product details, images, and available options.
- Save favourites to a wishlist and manage a persistent shopping cart.
- Register or sign in with email/password or Google.
- Manage delivery addresses, apply coupons, and place orders.
- View order history and order details through the account area.
- Read and submit product reviews.
- Explore the brand story, fashion blog, and gallery.
- Contact the team or request product availability notifications.
- Use layouts adapted for desktop and mobile screens.

Prices are displayed in Indian rupees (INR). Checkout supports cash on delivery, with server-confirmed totals and inventory.
See [COD_FLOW.md](COD_FLOW.md) for cancellation, delivery, testing, and deployment requirements.

### For the Tangerine Team

The role-protected admin area includes:

- Dashboard summaries and revenue information.
- Product, category, and subcategory management.
- Order management, status updates, and printable invoices.
- Coupon and promotion management.
- Blog and gallery publishing.
- Customer enquiries, product availability requests, and review management.
- User management and administrator role controls.

## Built With

| Area | Technology |
| --- | --- |
| Storefront and admin interface | Next.js 14 App Router, React 18, JavaScript |
| Styling and interface elements | Tailwind CSS, Lucide icons, React Hot Toast |
| Server functionality | Next.js route handlers and Node.js/Express |
| Authentication | Firebase Authentication and Firebase Admin SDK |
| Data | Cloud Firestore |
| Brand typography | Fraunces and Inter |

The interface uses Tangerine orange, ink, white, and warm neutral accents.

## Project Structure

~~~text
fashion-ecommerce/
|-- frontend/
|   |-- app/                 Storefront, account, admin, and API routes
|   |-- components/          Shared interface components
|   |-- context/             Authentication, cart, and wishlist state
|   |-- lib/                 API, Firebase, and application helpers
|   |-- SEO/                 Structured data and metadata helpers
|   |-- pages/               Framework document entry point
|   |-- public/              Brand images, banners, and placeholders
|   |-- next.config.js
|   |-- tailwind.config.js
|   `-- package.json
|-- backend/
|   |-- config/              Firebase Admin initialization
|   |-- middleware/          Authentication and authorization
|   |-- controllers/         API request handling
|   |-- routes/              Express route definitions
|   |-- server.js
|   `-- package.json
|-- firestore.rules
|-- firestore.indexes.json
|-- storage.rules
`-- CLEANUP_REPORT.md
~~~

Both API layers are used. The frontend includes local Next.js handlers, calls to
the Express service, and direct Firebase operations. API selection and fallback
behaviour depend on the feature, environment, and available configuration.

## Local Development

You will need Node.js, npm, and access to a Firebase project.

### 1. Configure Firebase

Enable Email/Password and Google authentication and create a Firestore database.
Register a Firebase web app and obtain server-side service-account credentials.

Use [frontend/.env.local.example](frontend/.env.local.example) and
[backend/.env.example](backend/.env.example) as templates, replacing their sample
values with those for your Firebase project.

- Frontend: configure the `NEXT_PUBLIC_FIREBASE_*` web-app values.
- Backend: configure `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
  `FIREBASE_PRIVATE_KEY`, and `FIREBASE_STORAGE_BUCKET`.
- Local API: set `NEXT_PUBLIC_API_URL=http://localhost:5000/api`.
- Backend origin: set `CLIENT_URL=http://localhost:3000`;
  `CLIENT_URLS` supports additional comma-separated origins.

Keep service-account credentials server-side, outside version control, and
never in a `NEXT_PUBLIC_*` variable. Use the included Firestore rules,
indexes, and Storage rules when configuring access for your Firebase project.

### 2. Start the Backend

From the repository root, run these PowerShell commands. The environment
template is copied only if a local configuration does not already exist.

~~~powershell
cd backend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
~~~

Fill in the credentials, then run:

~~~powershell
npm ci
npm run dev
~~~

The default API address is `http://localhost:5000/api`.
The health endpoint is `GET /api/health`.

### 3. Start the Frontend

In a second terminal, starting from the repository root:

~~~powershell
cd frontend
if (-not (Test-Path .env.local)) { Copy-Item .env.local.example .env.local }
~~~

Fill in the web-app configuration, then run:

~~~powershell
npm ci
npm run dev
~~~

Open `http://localhost:3000`.

When running locally from the frontend directory, its Firebase Admin helper can
read credentials from the sibling `backend/.env`. A separately hosted frontend
needs its own server-side Firebase credentials for local API handlers, or a
configured backend for supported proxy fallbacks.

### 4. Set Up Administration

1. Register an account through `/signup`.
2. In Firestore, locate that account's `users/{uid}` document and set its
   `role` to `admin` using your authorized Firebase project access.
3. Sign in and open `/admin`.
4. Create categories, add products, and publish brand content.
5. Use the Users section to manage subsequent role changes.

## Build and Run

From `frontend/`:

~~~sh
npm run build
npm start
~~~

From `backend/`:

~~~sh
npm start
~~~

For deployment, configure the frontend origin and API URL for the hosted
services and provide server credentials in each runtime that needs them.
Keep the Express service available for features and fallbacks that use it.

Run `npm test` in `backend/` for the cash-on-delivery transaction and API tests.
There is no configured standalone ESLint/type-check setup; `npm run lint` starts
the Next.js ESLint setup prompt.
See [CLEANUP_REPORT.md](CLEANUP_REPORT.md) for the cleanup inventory, validation
results, and remaining verification limits.

---

Tangerine brings together fashion, learning, and the confidence to create.







