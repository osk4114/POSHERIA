const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/tables - List all tables
router.get('/', tableController.listarMesas);

// POST /api/tables - Crear mesa (solo admin/caja)
function adminOrCaja(req, res, next) {
	if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'caja')) {
		return res.status(403).json({ message: 'Solo admin o caja pueden crear mesas' });
	}
	next();
}
router.post('/', authMiddleware, adminOrCaja, tableController.crearMesa);

// POST /api/tables/:id/asignar - Mozo toma la mesa
router.post('/:id/asignar', authMiddleware, tableController.asignarMesa);

// POST /api/tables/:id/liberar - Mozo libera la mesa
// PUT /api/tables/:id - Actualizar mesa (solo para uso interno/test)
router.put('/:id', authMiddleware, tableController.actualizarMesa);
router.post('/:id/liberar', authMiddleware, tableController.liberarMesa);

module.exports = router;
