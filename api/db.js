import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL;
let dbClient;

if (dbUrl && (dbUrl.startsWith('libsql:') || dbUrl.startsWith('https:'))) {
  dbClient = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
} else {
  // Base de datos local SQLite persistente en carpeta data/
  const dataDir = path.join(__dirname, '../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const localDbPath = path.join(dataDir, 'incidencias.db').replace(/\\/g, '/');
  dbClient = createClient({
    url: `file:${localDbPath}`
  });
}

/**
 * Inicializa las tablas e índices relacionales de la base de datos.
 */
export async function initDatabase() {
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS cortes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL,
      quincena INTEGER NOT NULL,
      feriados TEXT NOT NULL DEFAULT '[]',
      created_by TEXT DEFAULT 'admin',
      created_at TEXT NOT NULL
    )
  `);

  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS incidencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      corte_id INTEGER NOT NULL,
      employee_code TEXT NOT NULL,
      employee_name TEXT,
      cedula TEXT,
      cargo TEXT,
      original_sucursal TEXT,
      mapped_sucursal TEXT NOT NULL,
      incidence_type TEXT NOT NULL,
      value REAL NOT NULL,
      date_string TEXT NOT NULL,
      original_status TEXT,
      FOREIGN KEY (corte_id) REFERENCES cortes(id) ON DELETE CASCADE
    )
  `);

  await dbClient.execute(`
    CREATE INDEX IF NOT EXISTS idx_incidencias_corte_id ON incidencias(corte_id)
  `);

  await dbClient.execute(`
    CREATE INDEX IF NOT EXISTS idx_cortes_period ON cortes(year, month, quincena)
  `);

  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Asegurar usuario administrador inicial si no existen usuarios
  const usersCount = await dbClient.execute('SELECT COUNT(*) as count FROM users');
  const count = Number(usersCount.rows[0]?.count || 0);

  if (count === 0) {
    const defaultAdminUser = process.env.ADMIN_USER || 'admin';
    const defaultAdminPass = process.env.ADMIN_PASSWORD || 'Admin1234!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(defaultAdminPass, salt);

    await dbClient.execute({
      sql: 'INSERT OR IGNORE INTO users (username, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?)',
      args: [defaultAdminUser, hash, 'admin', 'Administrador General', new Date().toISOString()]
    });

    // Crear también usuario operador/editor para roles restringidos
    const editorHash = await bcrypt.hash('Editor1234!', salt);
    await dbClient.execute({
      sql: 'INSERT OR IGNORE INTO users (username, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?)',
      args: ['editor', editorHash, 'editor', 'Operador de Nómina', new Date().toISOString()]
    });

    // Crear usuario consultor/viewer
    const viewerHash = await bcrypt.hash('Viewer1234!', salt);
    await dbClient.execute({
      sql: 'INSERT OR IGNORE INTO users (username, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?)',
      args: ['viewer', viewerHash, 'viewer', 'Consultor Auditor', new Date().toISOString()]
    });
  }
}

export { dbClient };
