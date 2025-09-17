// models/userModel.js
// Modelo de usuario para POSHERIA

/**
 * Roles posibles: 'admin', 'caja', 'mozo', 'cocina'
 */

const { ObjectId } = require('mongodb');

class User {
  constructor({ _id, username, password, name, role, active = true, createdAt = new Date() }) {
    this._id = _id ? new ObjectId(_id) : undefined;
    this.username = username;
    this.password = password; // Debe estar hasheada
    this.name = name;
    this.role = role; // admin, caja, mozo, cocina
    this.active = active;
    this.createdAt = createdAt;
  }
}

module.exports = User;
