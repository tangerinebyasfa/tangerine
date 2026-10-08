const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const productsRoutes = require("./routes/products");
const categoriesRoutes = require("./routes/categories");
const subcategoriesRoutes = require("./routes/subcategories");
const ordersRoutes = require("./routes/orders");
const usersRoutes = require("./routes/users");
const galleryRoutes = require("./routes/gallery");
const blogsRoutes = require("./routes/blogs");
const wishlistRoutes = require("./routes/wishlist");
const couponsRoutes = require("./routes/coupons");

const app = express();

const allowedOrigins = [
  ...(process.env.CLIENT_URLS || "").split(","),
  process.env.CLIENT_URL,
]
  .map((origin) => origin && origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
      const isAllowed = allowedOrigins.includes(origin);

      if ((process.env.NODE_ENV !== "production" && isLocalhost) || isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin ${origin}`));
    },
  })
);
// Webhooks verify an HMAC over the exact raw body, so this must be registered
// before express.json() consumes and re-serializes the payload.
app.use("/api/webhooks", express.raw({ type: "application/json" }), require("./routes/webhooks"));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/products", productsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/subcategories", subcategoriesRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/returns", require("./routes/returns"));
app.use("/api/users", usersRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/blogs", blogsRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/coupons", couponsRoutes);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Central error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));

// Shiprocket: automatic order creation with a periodic retry sweep, so a
// failed creation self-heals without anyone touching the Shiprocket panel.
const { shipmentService, shiprocket } = require("./config/services");
shipmentService.startSweep();
if (shiprocket.isConfigured()) {
  console.log("Shiprocket: configured; orders sync automatically");
} else {
  console.log("Shiprocket: not configured (set SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD to enable order sync)");
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the existing process or set PORT to another value.`);
    process.exit(1);
  }

  throw err;
});
