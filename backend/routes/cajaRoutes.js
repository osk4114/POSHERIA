// routes/cajaRoutes.js
const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { authMiddleware } = require('../middlewares/auth');

// Abrir caja
router.post('/abrir', authMiddleware, cajaController.abrirCaja);
// Registrar movimiento
router.post('/movimiento', authMiddleware, cajaController.registrarMovimiento);
// Cerrar caja
router.post('/cerrar', authMiddleware, cajaController.cerrarCaja);
// Estado de caja abierta
router.get('/estado', authMiddleware, cajaController.estadoCaja);
// Historial de cajas
router.get('/historial', authMiddleware, cajaController.historialCajas);

module.exports = router;
