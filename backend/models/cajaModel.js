// models/cajaModel.js
// Caja model for POSHERIA

const { ObjectId } = require('mongodb');

class Caja {
  constructor({
    _id,
    date = new Date(),
    assignedTo, // ObjectId del usuario (cajero)
    initialAmount = 0,
    finalAmount = 0,
    movements = [], // [{ type: 'ingreso'|'egreso', amount, description, orderId, createdAt }]
    status = 'open', // open | closed
    createdAt = new Date(),
    closedAt = null
  }) {
    this._id = _id ? new ObjectId(_id) : undefined;
    this.date = date;
    this.assignedTo = assignedTo ? new ObjectId(assignedTo) : undefined;
    this.initialAmount = initialAmount;
    this.finalAmount = finalAmount;
    this.movements = movements;
    this.status = status;
    this.createdAt = createdAt;
    this.closedAt = closedAt;
  }
}

module.exports = Caja;
