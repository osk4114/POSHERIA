// routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authMiddleware, adminOnly } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// Obtener todos los productos del menú (público para el sistema)
router.get('/', menuController.listarProductos);

// Subir imagen (solo admin)
router.post('/upload-image', authMiddleware, adminOnly, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se subió ninguna imagen' });
    }
    
    // Construir la URL de la imagen
    const imagePath = `/public/images/menu/${req.file.filename}`;
    
    res.json({ 
      message: 'Imagen subida exitosamente',
      imagePath: imagePath
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ message: 'Error al subir la imagen' });
  }
});

// Crear producto (solo admin)
router.post('/', authMiddleware, adminOnly, menuController.crearProducto);

// Actualizar producto (solo admin)
router.put('/:id', authMiddleware, adminOnly, menuController.actualizarProducto);

// Eliminar producto (solo admin)
router.delete('/:id', authMiddleware, adminOnly, menuController.eliminarProducto);

module.exports = router;