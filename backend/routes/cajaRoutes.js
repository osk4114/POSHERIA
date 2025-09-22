// Limpiar cajas abiertas/pendientes de un usuario (solo para pruebas)

// routes/cajaRoutes.js
const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { authMiddleware, cajaAccess } = require('../middlewares/auth');

// Limpiar cajas abiertas/pendientes de un usuario (solo para pruebas)
router.delete('/limpiar', authMiddleware, cajaAccess, cajaController.limpiarCajasUsuario);

// Abrir caja
router.post('/abrir', authMiddleware, cajaAccess, cajaController.abrirCaja);
// Confirmar monto inicial de caja (cajero)
router.post('/confirmar', authMiddleware, cajaAccess, cajaController.confirmarCaja);
// Declinar caja asignada (cajero)
router.post('/declinar', authMiddleware, cajaAccess, cajaController.declinarCaja);
// Registrar movimiento
router.post('/movimiento', authMiddleware, cajaAccess, cajaController.registrarMovimiento);
// Cerrar caja
router.post('/cerrar', authMiddleware, cajaAccess, cajaController.cerrarCaja);
// Estado de caja abierta
router.get('/estado', authMiddleware, cajaAccess, cajaController.estadoCaja);
// Todas las cajas abiertas (para admin)
router.get('/todas-abiertas', authMiddleware, cajaAccess, cajaController.todasLasCajasAbiertas);
// Historial de cajas
router.get('/historial', authMiddleware, cajaAccess, cajaController.historialCajas);
// Ventas del día para reportes
router.get('/ventas-hoy', authMiddleware, cajaAccess, cajaController.getVentasHoy);

module.exports = router;
