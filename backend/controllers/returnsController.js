const { db } = require('../config/firebaseAdmin');
const { createReturnService } = require('../services/returnService');
const service = createReturnService({ db });
const handle = fn => async (req, res) => {
  try { res.json(await fn(req)); }
  catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Return service unavailable. Please retry.' }); }
};
exports.listForOrder = handle(req => service.listForOrder(req.params.id, req.user));
exports.create = handle(req => service.create(req.params.id, req.body || {}, req.user));
exports.listAll = handle(req => service.listAll(req.user));
exports.update = handle(req => service.update(req.params.id, req.body || {}, req.user));
