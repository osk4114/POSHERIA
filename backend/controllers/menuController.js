// controllers/menuController.js
const { ObjectId } = require('mongodb');
const Menu = require('../models/menuModel');
const { getDB } = require('../config/mongo');

// Crear producto
async function crearProducto(req, res) {
  try {
    const db = getDB();
    const { name, price, category, available, description } = req.body;
    const producto = new Menu({ name, price, category, available, description });
    const result = await db.collection('menu').insertOne(producto);
    res.json({ message: 'Producto creado', productoId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear producto', error: err.message });
  }
}

// Listar productos
async function listarProductos(req, res) {
  try {
    const db = getDB();
    const productos = await db.collection('menu').find().toArray();
    res.json(productos);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar productos', error: err.message });
  }
}

// Actualizar producto
async function actualizarProducto(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const update = req.body;
    const result = await db.collection('menu').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after' }
    );
    if (!result.value) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto actualizado', producto: result.value });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar producto', error: err.message });
  }
}

// Eliminar producto
async function eliminarProducto(req, res) {
  try {
    const db = getDB();
    const { id } = req.params;
    const result = await db.collection('menu').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Producto no encontrado' });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar producto', error: err.message });
  }
}

module.exports = {
  crearProducto,
  listarProductos,
  actualizarProducto,
  eliminarProducto
};

module.exports = {
  crearProducto,
  listarProductos,
  actualizarProducto,
  eliminarProducto
};
