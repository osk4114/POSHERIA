// controllers/userController.js
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const { getDB } = require('../config/mongo');

// Crear usuario
async function crearUsuario(req, res) {
  try {
    const db = getDB();
    const { name, username, password, role } = req.body;
    const existe = await db.collection('users').findOne({ username });
    if (existe) return res.status(400).json({ message: 'El username ya está registrado' });
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ name, username, password: hash, role });
    const result = await db.collection('users').insertOne(user);
    res.json({ message: 'Usuario creado', userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ message: 'Error al crear usuario', error: err.message });
  }
}

// Listar usuarios
async function listarUsuarios(req, res) {
  try {
  const db = getDB();
    const usuarios = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ message: 'Error al listar usuarios', error: err.message });
  }
}

// Actualizar usuario
async function actualizarUsuario(req, res) {
  try {
  const db = getDB();
    const { id } = req.params;
    const update = { ...req.body };
    if (update.password) {
      update.password = await bcrypt.hash(update.password, 10);
    }
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: update },
      { returnDocument: 'after', projection: { password: 0 } }
    );
    if (!result.value) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario actualizado', usuario: result.value });
  } catch (err) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: err.message });
  }
}

// Eliminar usuario
async function eliminarUsuario(req, res) {
  try {
  const db = getDB();
    const { id } = req.params;
    const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ message: 'Usuario eliminado' });
  } catch (err) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: err.message });
  }
}

const { generateToken } = require('../services/jwtService');

// Login de usuario
async function login(req, res) {
  try {
  const db = getDB();
  const { username, password } = req.body;
  const user = await db.collection('users').findOne({ username });
  if (!user) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
  const token = generateToken({ _id: user._id, username: user.username, role: user.role });
  res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Error en login', error: err.message });
  }
}

// Obtener datos del usuario autenticado
async function getMe(req, res) {
  try {
  const db = getDB();
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.user._id) }, { projection: { password: 0 } });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener usuario', error: err.message });
  }
}

module.exports = {
  crearUsuario,
  listarUsuarios,
  actualizarUsuario,
  eliminarUsuario,
  login,
  getMe
};
