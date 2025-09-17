// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminOnly } = require('../middlewares/auth');


// Login público
router.post('/login', userController.login);
// Obtener datos del usuario autenticado
router.get('/me', authMiddleware, userController.getMe);

// Todas las rutas protegidas: solo admin puede acceder
router.post('/', authMiddleware, adminOnly, (req, res) => userController.crearUsuario(req, res));
router.get('/', authMiddleware, adminOnly, (req, res) => userController.listarUsuarios(req, res));
router.put('/:id', authMiddleware, adminOnly, (req, res) => userController.actualizarUsuario(req, res));
router.delete('/:id', authMiddleware, adminOnly, (req, res) => userController.eliminarUsuario(req, res));

module.exports = router;
