const router = require('express').Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const ctrl = require('../controllers/returnsController');
router.get('/', verifyToken, requireAdmin, ctrl.listAll);
router.put('/:id', verifyToken, requireAdmin, ctrl.update);
module.exports = router;
