
const { verifyToken } = require('../services/jwtService');
const { isTokenValid } = require('../services/tokenStore');

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
  if (!isTokenValid(token)) {
    return res.status(401).json({ message: 'Token no autorizado (no está en la whitelist)'});
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

function cajaAccess(req, res, next) {
  if (!req.user || (req.user.role !== 'caja' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de caja o administrador.' });
  }
  next();
}

function cocinaAccess(req, res, next) {
  if (!req.user || (req.user.role !== 'cocina' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de cocina o administrador.' });
  }
  next();
}

function mozoAccess(req, res, next) {
  if (!req.user || (req.user.role !== 'mozo' && req.user.role !== 'admin')) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de mozo o administrador.' });
  }
  next();
}

module.exports = {
  authMiddleware,
  adminOnly,
  cajaAccess,
  cocinaAccess,
  mozoAccess
};
