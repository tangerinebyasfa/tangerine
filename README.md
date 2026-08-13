# Maison Atelier — Fashion E-Commerce Platform

A full-stack fashion e-commerce app:

- **`/frontend`** — Next.js 14 (App Router) + Tailwind CSS. Public storefront + a
  role-gated admin panel, both in the same app.
- **`/backend`** — Node/Express API secured with Firebase Admin SDK auth, used for
  all writes (products, categories, orders, user roles).
- **Firebase** — Authentication (Email/Password + Google), Firestore (database),
  used directly by the frontend for reads and by the backend for writes.

## Project structure

```
fashion-ecommerce/
├── backend/
│   ├── config/firebaseAdmin.js     # Firebase Admin SDK init
│   ├── middleware/auth.js          # verifyToken + requireAdmin
│   ├── controllers/                # products, categories, orders, users
│   ├── routes/                     # Express routers
│   └── server.js
├── frontend/
│   ├── app/                        # Next.js App Router pages
│   │   ├── page.js                 # Home
│   │   ├── about/  contact/  brand/
│   │   ├── products/[category]/    # Category listing (use "all" for everything)
│   │   ├── product/[id]/           # Product detail
│   │   ├── signin/  signup/  profile/
│   │   ├── cart/  checkout/  orders/
│   │   └── admin/                  # Admin panel (dashboard, products, categories, orders, users)
│   ├── components/
│   │   ├── layout/                 # Navbar, Footer
│   │   ├── ui/                     # Button, Input, Spinner, PageHeader
│   │   ├── product/                # ProductCard, CategoryCard
│   │   ├── cart/                   # CartDrawer
│   │   ├── auth/                   # AuthGuard
│   │   └── admin/                  # AdminGuard, AdminSidebar, ProductForm
│   ├── context/                    # AuthContext, CartContext
│   └── lib/                        # firebase.js (client SDK), api.js (backend calls)
└── firestore.rules
```

## 1. Create a Firebase project

1. Go to the [Firebase Console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Sign-in method** → enable **Email/Password** and **Google**.
3. **Build → Firestore Database** → Create database (start in production mode).
4. Deploy the security rules in `firestore.rules` (Firestore → Rules tab → paste and publish,
   or `firebase deploy --only firestore:rules` if you use the Firebase CLI).
5. **Project settings → General → Your apps → Add app → Web** — copy the config values into
   `frontend/.env.local` (see below).
6. **Project settings → Service accounts → Generate new private key** — this JSON gives you
   the values for `backend/.env` (see below).

## 2. Backend setup

```bash
cd backend
cp .env.example .env
# Fill in FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
# from the service account JSON you downloaded above.
npm install
npm run dev   # starts on http://localhost:5000
```

## 3. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local
# Fill in the NEXT_PUBLIC_FIREBASE_* values from your Firebase web app config,
# and NEXT_PUBLIC_API_URL (defaults to http://localhost:5000/api).
npm install
npm run dev   # starts on http://localhost:3000
```

## 4. Add your first products

1. Sign up for an account at `/signup` in the running app.
2. In the **Firebase Console → Firestore → `users` collection**, find your user document
   (it's keyed by your Firebase Auth UID) and change its `role` field from `customer` to `admin`.
3. Reload the app — an **Admin Panel** link now appears in the navbar (it's hidden for
   any user whose role is `customer`).
4. Go to **Admin Panel → Categories** and add a few categories first (e.g. "Dresses", "Outerwear").
5. Go to **Admin Panel → Products** and add products, assigning each to a category.
   Products immediately appear on the storefront's home page (if marked "featured"),
   category pages, and product detail pages.

You can also promote further users to admin from **Admin Panel → Users** once you have
at least one admin account.

## How the pieces connect

- **Auth**: The frontend uses the Firebase client SDK directly for sign-up/sign-in
  (email/password and Google). On first sign-in, a `/users/{uid}` Firestore document is
  created with `role: "customer"`.
- **Role-gated UI**: `AuthContext` loads that Firestore user document and exposes
  `isAdmin`. The Navbar only renders the "Admin Panel" link when `isAdmin` is true, and
  the `/admin` routes are wrapped in `AdminGuard`, which redirects non-admins away.
- **Writes go through the backend**: Creating/editing/deleting products, categories, and
  updating order status or user roles all call the Express API. Each request carries the
  user's Firebase ID token; the backend verifies it and checks the caller's role in
  Firestore via `requireAdmin` before allowing the write. This keeps admin-only writes out
  of reach of the Firestore client rules entirely.
- **Reads are direct from Firestore or via the backend's public GET routes** (both are
  fine since products/categories are public data).
- **Cart**: Client-side only (`CartContext`), persisted to `localStorage`, surfaced both
  as a slide-out `CartDrawer` and a full `/cart` page.
- **Checkout → Orders**: Placing an order calls `POST /api/orders`, which stores the order
  in the `orders` Firestore collection tagged with the user's UID. Customers see their own
  orders at `/orders`; admins see every order (with status controls) at `/admin/orders`.

## Notes

- Product images are entered as comma-separated URLs in the admin form for simplicity —
  swap in Firebase Storage uploads later if you want in-app image uploads.
- Shipping is a flat $8 rate in `checkout/page.js` — adjust as needed.
- Payment method on checkout is a placeholder (Cash on Delivery / Card selector) with no
  live payment gateway wired in — plug in Stripe/Razorpay/etc. where `handlePlaceOrder`
  calls `api.createOrder`.
