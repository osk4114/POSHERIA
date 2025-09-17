// scripts/generateAdminToken.js
// Genera un token JWT para el usuario admin

const { generateToken } = require('../services/jwtService');

// Reemplaza por el _id real de tu usuario admin (cópialo desde la base de datos)
const adminId = '68cad1450eb6c7f85c0519c2';

const token = generateToken({
  _id: adminId,
  username: 'admin',
  role: 'admin'
});

console.log('Token JWT para admin:', token);
