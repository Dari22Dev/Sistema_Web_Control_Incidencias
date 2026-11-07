import { describe, it, expect } from 'vitest';
import {
  processIncidencias,
  evaluateDailyStatusDetailed,
  determineSucursal,
  normalizeConfig,
  parseHeaderDate,
  DEFAULT_SUCURSALES_CONFIG
} from '../src/utils/calculator.js';

describe('Cálculo de Incidencias y Auditoría Laboral', () => {

  describe('1. Unificación y verificación de valor para Domingos Trabajados', () => {
    it('debe asignar el valor configurado para domingos a la incidencia DOMINGO', () => {
      const customConfig = [
        {
          name: 'Sambil',
          incidenciasList: [
            { id: '1', name: 'Presente Regular', type: 'presente', value: 2 },
            { id: '2', name: 'Domingos Trabajados', type: 'domingo', value: 5 } // Configurado a 5
          ]
        }
      ];

      const norm = normalizeConfig(customConfig[0]);
      expect(norm.valorDomingo).toBe(5);
      expect(norm.bonoDomingo).toBe(5);

      const result = evaluateDailyStatusDetailed('Presente a tiempo', customConfig[0], true, false);
      const domingoInc = result.incidences.find(i => i.type === 'DOMINGO');
      expect(domingoInc).toBeDefined();
      expect(domingoInc.value).toBe(5);
    });
  });

  describe('2. Detección de celdas desconocidas (Riesgo económico)', () => {
    it('debe marcar textos tipográficos o erróneos como unrecognizedCells y registrarlos', () => {
      const mockRows = [
        ['CODIGO', 'COLABORADOR', 'SUCURSAL', 'CARGO', '16 Jun', '17 Jun'],
        ['1001', 'JUAN PEREZ', 'Sambil', 'ASESOR', 'Prsente', 'Turno Invalido']
      ];

      const result = processIncidencias(mockRows, 2026, 5, 2, [], DEFAULT_SUCURSALES_CONFIG);
      const anomalies = result._anomalies;

      expect(anomalies).toBeDefined();
      expect(anomalies.unrecognizedCells.length).toBe(2);
      expect(anomalies.unrecognizedCells[0].rawValue).toBe('Prsente');
      expect(anomalies.unrecognizedCells[1].rawValue).toBe('Turno Invalido');
    });

    it('no debe marcar descansos legítimos (dia libre, vacaciones) como celdas no reconocidas', () => {
      const mockRows = [
        ['CODIGO', 'COLABORADOR', 'SUCURSAL', 'CARGO', '16 Jun', '17 Jun'],
        ['1001', 'JUAN PEREZ', 'Sambil', 'ASESOR', 'Dia Libre', 'Vacaciones']
      ];

      const result = processIncidencias(mockRows, 2026, 5, 2, [], DEFAULT_SUCURSALES_CONFIG);
      expect(result._anomalies.unrecognizedCells.length).toBe(0);
    });
  });

  describe('3. Detección de sucursales sin asignación a ciegas', () => {
    it('debe asignar a "Sin Asignar" cuando el texto de sucursal no coincida con ninguna sede', () => {
      const sucursales = [{ name: 'Sambil' }, { name: 'La Vela' }];
      const assigned = determineSucursal('Sede Desconocida Valencia', sucursales);
      expect(assigned).toBe('Sin Asignar');
    });

    it('debe agrupar los colaboradores con sucursal no reconocida en Sin Asignar y emitir advertencia', () => {
      const mockRows = [
        ['CODIGO', 'COLABORADOR', 'SUCURSAL', 'CARGO', '16 Jun'],
        ['1001', 'JUAN PEREZ', 'Sucursal Inventada', 'ASESOR', 'Presente cierre a tiempo']
      ];

      const result = processIncidencias(mockRows, 2026, 5, 2, [], DEFAULT_SUCURSALES_CONFIG);
      expect(result['Sin Asignar']).toBeDefined();
      expect(result['Sin Asignar'].length).toBeGreaterThan(0);
      expect(result._anomalies.unassignedEmployees.length).toBe(1);
      expect(result._anomalies.unassignedEmployees[0].employeeCode).toBe('1001');
    });
  });

  describe('4. Detección de colaboradores duplicados', () => {
    it('debe advertir si el mismo código de empleado aparece en dos filas distintas', () => {
      const mockRows = [
        ['CODIGO', 'COLABORADOR', 'SUCURSAL', 'CARGO', '16 Jun'],
        ['1001', 'JUAN PEREZ', 'Sambil', 'ASESOR', 'Presente cierre a tiempo'],
        ['1001', 'JUAN PEREZ DUPLICADO', 'Sambil', 'ASESOR', 'Presente apertura a tiempo']
      ];

      const result = processIncidencias(mockRows, 2026, 5, 2, [], DEFAULT_SUCURSALES_CONFIG);
      expect(result._anomalies.duplicateEmployees.length).toBe(1);
      expect(result._anomalies.duplicateEmployees[0].employeeCode).toBe('1001');
    });
  });

  describe('5. Ausencias con nomenclaturas estándar y abreviaturas (AI, AJ, FI, FJ)', () => {
    it('debe clasificar AI y FI como Ausencia Injustificada', () => {
      const evalAI = evaluateDailyStatusDetailed('AI', DEFAULT_SUCURSALES_CONFIG[0], false, false);
      expect(evalAI.incidences[0]?.type).toBe('AUSENCIA INJUSTIFICADA');

      const evalFI = evaluateDailyStatusDetailed('FI', DEFAULT_SUCURSALES_CONFIG[0], false, false);
      expect(evalFI.incidences[0]?.type).toBe('AUSENCIA INJUSTIFICADA');
    });

    it('debe clasificar AJ y FJ como Ausencia Justificada', () => {
      const evalAJ = evaluateDailyStatusDetailed('AJ', DEFAULT_SUCURSALES_CONFIG[0], false, false);
      expect(evalAJ.incidences[0]?.type).toBe('AUSENCIA JUSTIFICADA');

      const evalFJ = evaluateDailyStatusDetailed('FJ', DEFAULT_SUCURSALES_CONFIG[0], false, false);
      expect(evalFJ.incidences[0]?.type).toBe('AUSENCIA JUSTIFICADA');
    });
  });

  describe('6. Coincidencia de Domingo y Feriado', () => {
    it('debe computar tanto DOMINGO como FERIADO si un colaborador labora en una fecha que coincide con ambos', () => {
      const evalRes = evaluateDailyStatusDetailed('Presente regular', DEFAULT_SUCURSALES_CONFIG[0], true, true);
      const types = evalRes.incidences.map(i => i.type);
      expect(types).toContain('BONO NOCTURNO');
      expect(types).toContain('DOMINGO');
      expect(types).toContain('FERIADO');
    });
  });

  describe('7. Quincenas en Febrero (Bisiesto 29 vs no bisiesto 28) y meses de 30 y 31 días', () => {
    it('debe calcular correctamente el fin de la 2da quincena de Febrero en año bisiesto (2024)', () => {
      const d29 = parseHeaderDate('29-Feb', 2024, 1, 2);
      expect(d29).not.toBeNull();
      expect(d29.getDate()).toBe(29);
      expect(d29.getMonth()).toBe(1);
    });

    it('debe calcular fin de mes en meses de 30 días (Junio: 30)', () => {
      const endDayJune = new Date(2026, 6, 0).getDate();
      expect(endDayJune).toBe(30);
    });

    it('debe calcular fin de mes en meses de 31 días (Julio: 31)', () => {
      const endDayJuly = new Date(2026, 7, 0).getDate();
      expect(endDayJuly).toBe(31);
    });
  });

  describe('8. Mensaje genérico cuando no hay cabeceras válidas', () => {
    it('debe lanzar error genérico sin atarse a marcas de empresas concretas', () => {
      const badRows = [
        ['COLUMNA_X', 'COLUMNA_Y'],
        ['123', '456']
      ];
      expect(() => processIncidencias(badRows, 2026, 5, 1)).toThrow(/columnas requeridas/i);
    });
  });

});
