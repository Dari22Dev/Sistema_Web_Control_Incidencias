import { describe, it, expect, beforeAll } from 'vitest';
import { initDatabase } from '../api/db.js';
import { signToken } from '../api/auth.js';

describe('Seguridad, Autenticación y API de Cortes', () => {
  let adminToken;

  beforeAll(async () => {
    await initDatabase();
    adminToken = signToken({ id: 1, username: 'admin', role: 'admin', name: 'Admin Test' });
  });

  it('debe rechazar acceso a /api/cortes sin token de autenticación', async () => {
    // Simulamos handler con objeto req/res mock
    let statusCode = 0;
    let jsonBody = {};
    const req = { headers: {} };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };

    const { authenticateToken } = await import('../api/auth.js');
    authenticateToken(req, res, () => {});

    expect(statusCode).toBe(401);
    expect(jsonBody.error).toMatch(/no autorizado/i);
  });

  it('debe permitir acceso y decodificar usuario con token JWT válido', async () => {
    let nextCalled = false;
    const req = { headers: { authorization: `Bearer ${adminToken}` } };
    const res = {};

    const { authenticateToken } = await import('../api/auth.js');
    authenticateToken(req, res, () => { nextCalled = true; });

    expect(nextCalled).toBe(true);
    expect(req.user.username).toBe('admin');
    expect(req.user.role).toBe('admin');
  });

  it('debe impedir a un usuario con rol "viewer" crear o eliminar cortes', async () => {
    let statusCode = 0;
    let jsonBody = {};
    const req = { user: { id: 3, username: 'viewer', role: 'viewer' } };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { jsonBody = data; return res; }
    };

    const { requireRole } = await import('../api/auth.js');
    const roleMiddleware = requireRole(['admin', 'editor']);
    roleMiddleware(req, res, () => {});

    expect(statusCode).toBe(403);
    expect(jsonBody.error).toMatch(/Permiso insuficiente/i);
  });

  it('debe validar el esquema de Zod y rechazar cortes con meses fuera de rango (0-11)', async () => {
    const { corteCreateSchema } = await import('../api/validators.js');

    const invalidPayload = {
      filename: 'reporte.xlsx',
      year: 2026,
      month: 13, // Inválido: debe ser 0-11
      quincena: 1,
      feriados: [],
      incidencias: {}
    };

    const result = corteCreateSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('debe validar el esquema de Zod y rechazar cortes con quincenas distintas de 1 o 2', async () => {
    const { corteCreateSchema } = await import('../api/validators.js');

    const invalidPayload = {
      filename: 'reporte.xlsx',
      year: 2026,
      month: 5,
      quincena: 3, // Inválido: debe ser 1 o 2
      feriados: [],
      incidencias: {}
    };

    const result = corteCreateSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});
