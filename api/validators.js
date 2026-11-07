import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').max(50),
  password: z.string().min(4, 'La contraseña debe tener al menos 4 caracteres')
});

const incidenciaItemSchema = z.object({
  employeeCode: z.union([z.string(), z.number()]).transform(v => String(v).trim()),
  employeeName: z.string().optional().default(''),
  cedula: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined && v !== null ? String(v).trim() : ''),
  cargo: z.string().optional().default(''),
  originalSucursal: z.string().optional().default(''),
  mappedSucursal: z.string().optional().default(''),
  incidenceType: z.string().min(1, 'El tipo de incidencia es requerido'),
  value: z.number().nonnegative('El valor debe ser mayor o igual a 0'),
  dateString: z.string().min(4, 'La fecha es requerida'),
  originalStatus: z.string().optional().default('')
});

export const corteCreateSchema = z.object({
  filename: z.string().min(1, 'El nombre del archivo es requerido').max(255).default('Cálculo Manual'),
  year: z.number().int().min(2000, 'Año inválido').max(2100, 'Año inválido'),
  month: z.number().int().min(0, 'El mes debe estar entre 0 (Enero) y 11 (Diciembre)').max(11, 'El mes debe estar entre 0 y 11'),
  quincena: z.number().int().min(1, 'La quincena debe ser 1 o 2').max(2, 'La quincena debe ser 1 o 2'),
  feriados: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha feriado inválido (debe ser YYYY-MM-DD)')).optional().default([]),
  incidencias: z.record(z.string(), z.array(incidenciaItemSchema))
});
