const { db } = require('./firebaseAdmin');
const { validateCouponForOrder } = require('../controllers/couponsController');
const { createOrderService } = require('../services/orderService');

const orderService = createOrderService({ db, validateCouponForOrder });

module.exports = { db, orderService };
