import jwt from 'jsonwebtoken';
import { dbClient } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_sistema_control_incidencias_2026_dev_fallback';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado: Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Acceso denegado: Token inválido o expirado.' });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Middleware para restringir rutas según rol (admin, editor, viewer)
 * @param {string[]} allowedRoles
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Permiso insuficiente: Se requiere uno de los siguientes roles [${allowedRoles.join(', ')}] para realizar esta acción.`
      });
    }
    next();
  };
}

/**
 * Registra una acción de auditoría en la base de datos
 */
export async function logAudit(username, action, details = '') {
  try {
    await dbClient.execute({
      sql: 'INSERT INTO audit_logs (username, action, details, created_at) VALUES (?, ?, ?, ?)',
      args: [username || 'anon', action, typeof details === 'object' ? JSON.stringify(details) : String(details), new Date().toISOString()]
    });
  } catch (err) {
    console.error('Error registrando auditoría:', err.message);
  }
}
