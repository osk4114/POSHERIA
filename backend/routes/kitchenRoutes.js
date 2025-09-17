// routes/kitchenRoutes.js
const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');
const { authMiddleware } = require('../middlewares/auth');

// Listar pedidos pendientes/en cocina
router.get('/orders', authMiddleware, kitchenController.listarPedidosCocina);
// Actualizar estado de pedido (in_kitchen, ready, delivered)
router.put('/orders/:id/status', authMiddleware, kitchenController.actualizarEstadoPedido);

module.exports = router;
