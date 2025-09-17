// Limpiar cajas abiertas/pendientes de un usuario (solo para pruebas)

// routes/cajaRoutes.js
const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { authMiddleware } = require('../middlewares/auth');
// Limpiar cajas abiertas/pendientes de un usuario (solo para pruebas)
router.delete('/limpiar', authMiddleware, cajaController.limpiarCajasUsuario);

// Abrir caja
router.post('/abrir', authMiddleware, cajaController.abrirCaja);
// Confirmar monto inicial de caja (cajero)
router.post('/confirmar', authMiddleware, cajaController.confirmarCaja);
// Registrar movimiento
router.post('/movimiento', authMiddleware, cajaController.registrarMovimiento);
// Cerrar caja
router.post('/cerrar', authMiddleware, cajaController.cerrarCaja);
// Estado de caja abierta
router.get('/estado', authMiddleware, cajaController.estadoCaja);
// Historial de cajas
router.get('/historial', authMiddleware, cajaController.historialCajas);

module.exports = router;
