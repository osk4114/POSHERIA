
const { verifyToken } = require('../services/jwtService');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  const user = verifyToken(token);
  if (!user) {
    return res.status(403).json({ message: 'Token inválido o expirado' });
  }
  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Solo el administrador puede realizar esta acción' });
  }
  next();
}

module.exports = {
  authMiddleware,
  adminOnly
};
