// models/tableModel.js
// Table model for POSHERIA

const { ObjectId } = require('mongodb');

class Table {
  constructor({
    _id,
    number,
    status = 'free', // free | occupied
    orders = [], // Array of order ObjectIds
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this._id = _id ? new ObjectId(_id) : undefined;
    this.number = number;
    this.status = status;
    this.orders = orders.map(id => new ObjectId(id));
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Table;
