const express = require("express");
const { shipmentService } = require("../config/services");

const router = express.Router();

// Serverless functions have no persistent interval, so interrupted Shiprocket
// creations (`status: 'creating'`) are reclaimed by this sweep. Vercel Cron
// (or any external scheduler) hits it on a schedule; auth mirrors the webhook
// pattern by accepting the secret as a bearer token, a header, or a query arg.
function authorized(req) {
  const secret = (process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  const bearer = String(req.get("authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  return (
    Boolean(bearer && bearer === secret) ||
    String(req.get("x-cron-secret") || "") === secret ||
    String(req.query?.cron_secret || "") === secret
  );
}

router.post("/shipment-sweep", async (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: "Unauthorized" });
  try {
    const result = await shipmentService.sweepOnce();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Shipment sweep cron failed:", err.message);
    res.status(500).json({ error: "Sweep failed" });
  }
});

module.exports = router;