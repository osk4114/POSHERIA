// routes/kitchenRoutes.js
const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { authMiddleware } = require('../middlewares/auth');

// Listar pedidos pendientes/en cocina con información detallada
router.get('/orders', authMiddleware, kitchenController.listarPedidosCocina);

// Actualizar estado de pedido (in_kitchen, ready, delivered) con WebSocket
router.put('/orders/:id/status', authMiddleware, kitchenController.actualizarEstadoPedido);

// Obtener estadísticas de cocina del día
router.get('/stats', authMiddleware, kitchenController.obtenerEstadisticasCocina);

// Obtener historial de tiempos de preparación
router.get('/tiempos', authMiddleware, kitchenController.obtenerTiemposPreparacion);

module.exports = router;
