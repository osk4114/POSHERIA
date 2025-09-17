const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'posheria_secret_key';

function generateToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, SECRET, { expiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = {
  generateToken,
  verifyToken
};
