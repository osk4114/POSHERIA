const { MongoClient } = require('mongodb');
const { mongoUri } = require('../config/config');

let client;
let db;

async function connectDB() {
  if (db) return db;
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db('posherialujancarrion'); // Usa la base de datos correcta
  console.log('Conectado a MongoDB (posherialujancarrion)');
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('La base de datos no está conectada. Llama a connectDB primero.');
  }
  return db;
}

module.exports = { connectDB, getDB };
