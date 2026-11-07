import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

import { initDatabase, dbClient } from './db.js';
import { signToken, authenticateToken, requireRole, logAudit } from './auth.js';
import { loginSchema, corteCreateSchema } from './validators.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Inicializar la base de datos y esquemas
let isDbReady = false;
initDatabase()
  .then(() => {
    isDbReady = true;
    console.log('✓ Base de datos relacional inicializada correctamente con esquemas e índices.');
  })
  .catch(err => {
    console.error('Error al inicializar la base de datos:', err);
  });

// Middleware de seguridad HTTP con Helmet
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS restringido
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5000', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Bloqueado por política CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiter general para la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes desde esta IP, por favor intenta más tarde.' }
});

// Rate limiter estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Por favor espera 15 minutos.' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.use(express.json({ limit: '25mb' }));

// Middleware para verificar que la base de datos esté lista
app.use('/api', async (req, res, next) => {
  if (!isDbReady) {
    try {
      await initDatabase();
      isDbReady = true;
    } catch (err) {
      return res.status(503).json({ error: 'La base de datos se está inicializando o no está disponible: ' + err.message });
    }
  }
  next();
});

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================

// Login con credenciales de usuario
app.post('/api/auth/login', async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Datos de login inválidos' });
    }

    const { username, password } = parsed.data;
    const userResult = await dbClient.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });

    const user = userResult.rows[0];
    if (!user) {
      await logAudit(username, 'LOGIN_FAILED', 'Usuario inexistente');
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const isValidPassword = await bcrypt.compare(password, String(user.password_hash));
    if (!isValidPassword) {
      await logAudit(username, 'LOGIN_FAILED', 'Contraseña incorrecta');
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name
    });

    await logAudit(username, 'LOGIN_SUCCESS', `Rol: ${user.role}`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name
      }
    });
  } catch (err) {
    console.error('Error en /api/auth/login:', err);
    res.status(500).json({ error: 'Error interno en autenticación: ' + err.message });
  }
});

// Obtener datos del usuario autenticado
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==========================================
// RUTAS DE CORTES E INCIDENCIAS
// ==========================================

// Guardar un nuevo corte y sus incidencias (Transacción atómica ACID)
app.post('/api/cortes', authenticateToken, requireRole(['admin', 'editor']), async (req, res) => {
  try {
    const parseResult = corteCreateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Error de validación en los datos del corte',
        details: parseResult.error.format()
      });
    }

    const { filename, year, month, quincena, feriados, incidencias } = parseResult.data;

    // Verificar si ya existe un corte para el mismo periodo y archivo
    const existingCheck = await dbClient.execute({
      sql: 'SELECT id, filename FROM cortes WHERE year = ? AND month = ? AND quincena = ? AND filename = ?',
      args: [year, month, quincena, filename]
    });

    const replaceExisting = req.query.replace === 'true';
    if (existingCheck.rows.length > 0 && !replaceExisting) {
      return res.status(409).json({
        error: 'Ya existe un corte registrado para este período y archivo.',
        existingId: existingCheck.rows[0].id,
        requiresConfirmation: true
      });
    }

    // Si el usuario confirmó reemplazar, eliminar el corte previo en transacción
    if (existingCheck.rows.length > 0 && replaceExisting) {
      const oldId = existingCheck.rows[0].id;
      await dbClient.batch([
        { sql: 'DELETE FROM incidencias WHERE corte_id = ?', args: [oldId] },
        { sql: 'DELETE FROM cortes WHERE id = ?', args: [oldId] }
      ], 'write');
    }

    // Insertar corte
    const createdAt = new Date().toISOString();
    const insertCorteSql = `
      INSERT INTO cortes (filename, year, month, quincena, feriados, created_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const insertCorteArgs = [
      filename,
      year,
      month,
      quincena,
      JSON.stringify(feriados),
      req.user.username,
      createdAt
    ];

    const corteResult = await dbClient.execute({
      sql: insertCorteSql,
      args: insertCorteArgs
    });

    const corteId = Number(corteResult.lastInsertRowid);

    // Preparar inserción de incidencias en lote atómico
    const batchIncidencias = [];
    let totalItems = 0;

    for (const [sucursal, list] of Object.entries(incidencias)) {
      if (Array.isArray(list)) {
        for (const item of list) {
          totalItems++;
          batchIncidencias.push({
            sql: `
              INSERT INTO incidencias (
                corte_id, employee_code, employee_name, cedula, cargo,
                original_sucursal, mapped_sucursal, incidence_type, value,
                date_string, original_status
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              corteId,
              item.employeeCode,
              item.employeeName || '',
              item.cedula || '',
              item.cargo || '',
              item.originalSucursal || '',
              sucursal,
              item.incidenceType,
              item.value,
              item.dateString,
              item.originalStatus || ''
            ]
          });
        }
      }
    }

    // Si hay incidencias, ejecutar transacción en lote
    if (batchIncidencias.length > 0) {
      await dbClient.batch(batchIncidencias, 'write');
    }

    await logAudit(
      req.user.username,
      'CREATE_CORTE',
      `Corte ID: ${corteId}, Archivo: ${filename}, Período: ${year}-${month + 1}-Q${quincena}, Total registros: ${totalItems}`
    );

    res.status(201).json({
      success: true,
      id: corteId,
      totalRegistros: totalItems,
      message: 'Corte e incidencias guardados exitosamente en la base de datos.'
    });
  } catch (err) {
    console.error('Error al guardar corte:', err);
    res.status(500).json({ error: 'Error interno al guardar los registros en la base de datos: ' + err.message });
  }
});

// Obtener todos los cortes históricos con conteo agregado
app.get('/api/cortes', authenticateToken, async (req, res) => {
  try {
    const result = await dbClient.execute(`
      SELECT
        c.id,
        c.filename,
        c.year,
        c.month,
        c.quincena,
        c.feriados,
        c.created_by,
        c.created_at,
        COUNT(i.id) AS total_registros
      FROM cortes c
      LEFT JOIN incidencias i ON c.id = i.corte_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    const formattedRows = result.rows.map(row => {
      let parsedFeriados = [];
      try {
        parsedFeriados = JSON.parse(String(row.feriados || '[]'));
      } catch {
        parsedFeriados = [];
      }
      return {
        id: Number(row.id),
        filename: String(row.filename),
        year: Number(row.year),
        month: Number(row.month),
        quincena: Number(row.quincena),
        feriados: parsedFeriados,
        created_by: String(row.created_by || 'admin'),
        created_at: String(row.created_at),
        total_registros: Number(row.total_registros || 0)
      };
    });

    res.json(formattedRows);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error al consultar historial: ' + err.message });
  }
});

// Obtener detalles completos de un corte por ID
app.get('/api/cortes/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const corteId = parseInt(id, 10);
    if (isNaN(corteId)) {
      return res.status(400).json({ error: 'ID de corte inválido.' });
    }

    const corteResult = await dbClient.execute({
      sql: 'SELECT * FROM cortes WHERE id = ?',
      args: [corteId]
    });

    if (corteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de corte no encontrado en la base de datos.' });
    }

    const corte = corteResult.rows[0];
    let feriados = [];
    try {
      feriados = JSON.parse(String(corte.feriados || '[]'));
    } catch {
      feriados = [];
    }

    const incidenciasResult = await dbClient.execute({
      sql: `
        SELECT
          id,
          corte_id,
          employee_code as employeeCode,
          employee_name as employeeName,
          cedula,
          cargo,
          original_sucursal as originalSucursal,
          mapped_sucursal as mappedSucursal,
          incidence_type as incidenceType,
          value,
          date_string as dateString,
          original_status as originalStatus
        FROM incidencias
        WHERE corte_id = ?
        ORDER BY mapped_sucursal, employee_code, date_string
      `,
      args: [corteId]
    });

    res.json({
      id: Number(corte.id),
      filename: String(corte.filename),
      year: Number(corte.year),
      month: Number(corte.month),
      quincena: Number(corte.quincena),
      feriados,
      created_by: String(corte.created_by || 'admin'),
      created_at: String(corte.created_at),
      incidencias: incidenciasResult.rows
    });
  } catch (err) {
    console.error('Error al obtener detalles del corte:', err);
    res.status(500).json({ error: 'Error al obtener los detalles del corte: ' + err.message });
  }
});

// Eliminar un corte histórico (Solo rol administrador)
app.delete('/api/cortes/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const corteId = parseInt(id, 10);
    if (isNaN(corteId)) {
      return res.status(400).json({ error: 'ID de corte inválido.' });
    }

    const corteCheck = await dbClient.execute({
      sql: 'SELECT filename, year, month, quincena FROM cortes WHERE id = ?',
      args: [corteId]
    });

    if (corteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'El corte especificado no existe.' });
    }

    const corteInfo = corteCheck.rows[0];

    await dbClient.batch([
      { sql: 'DELETE FROM incidencias WHERE corte_id = ?', args: [corteId] },
      { sql: 'DELETE FROM cortes WHERE id = ?', args: [corteId] }
    ], 'write');

    await logAudit(
      req.user.username,
      'DELETE_CORTE',
      `Eliminado Corte ID ${corteId}: ${corteInfo.filename} (${corteInfo.year}-${Number(corteInfo.month) + 1}-Q${corteInfo.quincena})`
    );

    res.json({ success: true, message: 'Corte eliminado permanentemente de la base de datos.' });
  } catch (err) {
    console.error('Error al eliminar corte:', err);
    res.status(500).json({ error: 'Error al eliminar el registro: ' + err.message });
  }
});

// Logs de auditoría (Solo rol administrador)
app.get('/api/audit-logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const logs = await dbClient.execute(`
      SELECT id, username, action, details, created_at
      FROM audit_logs
      ORDER BY id DESC
      LIMIT 100
    `);
    res.json(logs.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar logs de auditoría: ' + err.message });
  }
});

// Servir frontend compilado
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`✓ Servidor seguro ejecutándose en http://localhost:${PORT}`);
  });
}

export default app;
