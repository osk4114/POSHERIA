// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.post('/', authMiddleware, orderController.createOrder);
router.put('/:id', authMiddleware, orderController.updateOrder);
router.get('/', authMiddleware, orderController.listOrders);
router.post('/:id/pay', authMiddleware, orderController.payOrder);

module.exports = router;
