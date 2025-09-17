// models/orderModel.js
// Order model for POSHERIA

const { ObjectId } = require('mongodb');

class Order {
  constructor({
    _id,
    products = [], // [{ productId, name, quantity, price }]
    table = null, // ObjectId or null if take away
    status = 'pending', // pending | paid | in_kitchen | ready | delivered | cancelled
    type = 'dine-in', // dine-in | take-away
    createdBy, // userId
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    this._id = _id ? new ObjectId(_id) : undefined;
    this.products = products;
    this.table = table ? new ObjectId(table) : null;
    this.status = status;
    this.type = type;
    this.createdBy = createdBy ? new ObjectId(createdBy) : undefined;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

module.exports = Order;
