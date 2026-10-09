const { db } = require('./firebaseAdmin');
const { validateCouponForOrder } = require('../controllers/couponsController');
const { createOrderService } = require('../services/orderService');
const { createShipmentService } = require('../services/shipmentService');
const shiprocket = require('../lib/shiprocket');
const razorpay = require('../lib/razorpay');

// Share one Shiprocket login across every serverless instance (each has its own
// memory): a Firestore-persisted session avoids a login round-trip per order.
shiprocket.setTokenStore(shiprocket.createTokenStore(db));

// Shared singletons so the order service used by controllers, webhooks, and
// shipment sync is exactly one instance (one shipment trigger per payment).
const shipmentService = createShipmentService({ db, shiprocket });
const orderService = createOrderService({ db, validateCouponForOrder, razorpay, shipment: shipmentService });

// Applies a tracking-suggested status through the normal transition rules.
// Conflicts (409) are expected when staff already moved the order; they are
// ignored so a stale tracking event can never regress or flip an order.
async function applyTrackingStatus(orderId, suggestedStatus) {
  if (!suggestedStatus) return null;
  try {
    return await orderService.update(orderId, { status: suggestedStatus }, { uid: 'shiprocket-sync', role: 'admin' });
  } catch (err) {
    if (err.status !== 409) console.error(`Shiprocket status sync failed for ${orderId}: ${err.message}`);
    return null;
  }
}

module.exports = { db, shiprocket, razorpay, shipmentService, orderService, applyTrackingStatus };
