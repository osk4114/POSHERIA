// models/menuModel.js
// Menu model for POSHERIA

const { ObjectId } = require('mongodb');

class MenuItem {
  constructor({
    _id,
    name,
    price,
    category = '',
    available = true,
    description = '',
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this._id = _id ? new ObjectId(_id) : undefined;
    this.name = name;
    this.price = price;
    this.category = category;
    this.available = available;
    this.description = description;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = MenuItem;
