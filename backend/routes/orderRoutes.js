// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const orderController = require('../controllers/orderController');

// All routes require authentication
router.post('/', authMiddleware, orderController.createOrder);
// Endpoint para crear ticket de añadido (add-on) (solo mozo)
router.post('/addon', authMiddleware, orderController.createAddOnOrder);
router.put('/:id', authMiddleware, orderController.updateOrder);
router.get('/', authMiddleware, orderController.listOrders);
// Endpoint para consultar historial de añadidos (add-on) por mesa o pedido principal
router.get('/addon', authMiddleware, orderController.listAddOns);
router.post('/:id/pay', authMiddleware, orderController.payOrder);

// Nuevos endpoints para reportes y estadísticas
router.get('/estadisticas-hoy', authMiddleware, orderController.getStatsToday);
router.get('/historial', authMiddleware, orderController.getOrderHistory);

module.exports = router;