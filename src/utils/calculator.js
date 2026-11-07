export function initSucursal(s, idx = 0) {
  if (Array.isArray(s.incidenciasList) && s.incidenciasList.length > 0) {
    return {
      name: s.name || `Sucursal ${idx + 1}`,
      incidenciasList: s.incidenciasList.map(item => ({
        id: item.id || String(Math.random()),
        name: item.name || '',
        type: item.type || 'custom',
        value: item.value ?? 1
      }))
    };
  }

  const list = [];
  let idGen = 1;
  const cfgInc = s.incidencias || {};

  if (cfgInc.cierre !== false) list.push({ id: String(idGen++), name: 'Turno Cierre', type: 'cierre', value: s.bonoCierre ?? 3 });
  if (cfgInc.redoble !== false) list.push({ id: String(idGen++), name: 'Redoble / Asist. Especial', type: 'redoble', value: s.bonoRedoble ?? 3 });
  if (cfgInc.presente !== false) list.push({ id: String(idGen++), name: 'Presente Regular', type: 'presente', value: s.bonoPresente ?? 2 });
  if (cfgInc.apertura !== false) list.push({ id: String(idGen++), name: 'Turno Apertura', type: 'apertura', value: s.bonoApertura ?? 0 });
  if (cfgInc.domingo !== false) list.push({ id: String(idGen++), name: 'Domingos Trabajados', type: 'domingo', value: s.valorDomingo ?? s.bonoDomingo ?? 1 });
  if (cfgInc.feriado !== false) list.push({ id: String(idGen++), name: 'Feriados Trabajados', type: 'feriado', value: s.valorFeriado ?? 1 });
  if (cfgInc.ausenciaJustificada !== false) list.push({ id: String(idGen++), name: 'Ausencias Justificadas', type: 'ausenciaJustificada', value: s.valorAusenciaJ ?? 1 });
  if (cfgInc.ausenciaInjustificada !== false) list.push({ id: String(idGen++), name: 'Ausencias Injustificadas', type: 'ausenciaInjustificada', value: s.valorAusenciaI ?? 1 });
  if (cfgInc.reposo) list.push({ id: String(idGen++), name: 'Reposos Médicos', type: 'reposo', value: s.valorReposo ?? 1 });

  return {
    name: s.name || `Sucursal ${idx + 1}`,
    incidenciasList: list.length > 0 ? list : DEFAULT_SUCURSALES_CONFIG[0].incidenciasList
  };
}

/**
 * Normaliza texto (minúsculas, sin tildes, sin espacios repetidos)
 * para comparar de forma estable nombres de columna y conceptos de asistencia.
 * @param {any} v
 * @returns {string}
 */
export function normalizeText(v) {
  if (v === undefined || v === null) return '';
  return String(v)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '');
}

/**
 * Normaliza y mapea la sucursal del Excel a la clave de configuración correcta.
 * Recibe una lista de sucursales configuradas y compara por similitud de texto.
 * Si no hay coincidencia concluyente, retorna 'Sin Asignar' para que el usuario
 * pueda revisarlo y confirmarlo explícitamente sin mezclar sedes silenciosamente.
 *
 * @param {string} sucursalRaw - Valor crudo del campo sucursal en el Excel.
 * @param {Array<{name: string}>} sucursales - Lista de sucursales configuradas por el usuario.
 * @returns {string} El nombre de la sucursal configurada que mejor hace match, o 'Sin Asignar'.
 */
export function determineSucursal(sucursalRaw, sucursales) {
  if (!sucursales || sucursales.length === 0) {
    return 'Sin Asignar';
  }

  if (!sucursalRaw || typeof sucursalRaw !== 'string') {
    return 'Sin Asignar';
  }

  const normalized = normalizeText(sucursalRaw);
  if (!normalized) return 'Sin Asignar';

  // 1. Coincidencia exacta o inclusión directa de nombre completo
  for (const suc of sucursales) {
    const sucNorm = normalizeText(suc.name);
    if (normalized === sucNorm) {
      return suc.name;
    }
    if (normalized.includes(sucNorm) || sucNorm.includes(normalized)) {
      return suc.name;
    }
  }

  // 2. Coincidencia por palabras clave representativas (palabras con más de 3 caracteres)
  // Ignorar palabras genéricas comunes como "sede", "tienda", "sucursal", "centro"
  const stopWords = new Set(['sede', 'tienda', 'sucursal', 'centro', 'local', 'punto', 'express']);

  for (const suc of sucursales) {
    const sucNorm = normalizeText(suc.name);
    const sucWords = sucNorm.split(' ').filter(w => w.length > 3 && !stopWords.has(w));

    if (sucWords.length > 0) {
      const matchesWord = sucWords.some(word => normalized.includes(word));
      if (matchesWord) {
        return suc.name;
      }
    }
  }

  // No hubo match seguro -> Marcar como 'Sin Asignar' para auditoría
  return 'Sin Asignar';
}

/**
 * Mapea las abreviaturas de meses en español/inglés a su índice (0-11).
 */
const MONTH_MAP = {
  ene: 0, jan: 0,
  feb: 1,
  mar: 2,
  abr: 3, apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7, aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11, dec: 11
};

/**
 * Parsea una celda de fecha del encabezado del Excel.
 * Soporta objetos Date nativos, números seriales de Excel y cadenas de texto como "1 Jun", "16-Jun".
 *
 * @param {any} cell
 * @param {number} year
 * @param {number|null} defaultMonthIdx
 * @param {number|null} quincenaContext
 * @returns {Date|null}
 */
export function parseHeaderDate(cell, year, defaultMonthIdx = null, quincenaContext = null) {
  if (cell === undefined || cell === null || cell === '') return null;

  // 1. Si ya es un objeto Date
  if (cell instanceof Date) {
    const d = new Date(cell.getTime());
    if (d.getHours() < 6) {
      d.setHours(12);
    } else if (d.getHours() > 18) {
      d.setHours(12);
      d.setDate(d.getDate() + 1);
    }
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // 2. Si es un número
  if (typeof cell === 'number') {
    if (cell >= 1 && cell <= 31) {
      if (defaultMonthIdx !== null) {
        return new Date(year, defaultMonthIdx, cell);
      }
      return null;
    }

    // Número serial de Excel
    const date = new Date((cell - 25569) * 86400 * 1000);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() + tzOffset);
  }

  // 3. Si es un String
  if (typeof cell === 'string') {
    const trimmed = cell.trim();
    if (trimmed === '') return null;

    const cleanLower = normalizeText(trimmed);
    const weekDays = [
      'lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom',
      'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo',
      'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
      'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
    ];
    if (weekDays.includes(cleanLower)) {
      return null;
    }

    // A. Día simple en número (ej: "16", "05")
    const dayOnly = parseInt(trimmed, 10);
    if (!isNaN(dayOnly) && String(dayOnly) === trimmed && dayOnly >= 1 && dayOnly <= 31) {
      if (defaultMonthIdx !== null) {
        let targetMonth = defaultMonthIdx;
        // Ajuste en caso de periodos que cruzan fin de mes
        if (quincenaContext === 1 && dayOnly > 15 && defaultMonthIdx > 0) {
          // Día pertenece al mes anterior si quincena 1 empieza con días residuales
        }
        return new Date(year, targetMonth, dayOnly);
      }
      return null;
    }

    // B. Formatos DD/MM/YYYY, DD-MM-YYYY, DD/MM, DD-MM
    const parts = trimmed.split(/[/-]/);
    if (parts.length >= 2) {
      const day = parseInt(parts[0], 10);
      const mPart = parts[1].trim();
      const monthVal = parseInt(mPart, 10);
      let monthIdx = -1;

      if (!isNaN(monthVal)) {
        monthIdx = monthVal - 1;
      } else {
        const monthStr = mPart.toLowerCase().slice(0, 3);
        monthIdx = MONTH_MAP[monthStr];
      }

      if (!isNaN(day) && monthIdx !== undefined && monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
        let parsedYear = year;
        if (parts.length === 3) {
          let yr = parts[2].trim();
          if (yr.length === 2) {
            parsedYear = 2000 + parseInt(yr, 10);
          } else if (yr.length === 4) {
            parsedYear = parseInt(yr, 10);
          }
        }
        return new Date(parsedYear, monthIdx, day);
      }
    }

    // C. Formato texto: "16 de junio", "16 jun", "01-jun", "16-Jun"
    const clean = trimmed.toLowerCase().replace(/-/g, ' ');
    const match = clean.match(/^(\d+)\s*(?:de\s+)?([a-zñ]{3,4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const monthStr = match[2].slice(0, 3);
      const monthIdx = MONTH_MAP[monthStr];
      if (monthIdx !== undefined) {
        return new Date(year, monthIdx, day);
      }
    }
  }

  return null;
}

/**
 * Formatea una fecha como "DD MM YYYY" en texto.
 * @param {Date} date
 * @returns {string}
 */
export function formatDateString(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Retorna la fecha local formateada como YYYY-MM-DD para evitar desfases de zona horaria.
 * @param {Date} date
 * @returns {string}
 */
export function getLocalISODate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Posiciones por defecto de columnas fijas
const DEFAULT_COLS = {
  CEDULA: 0,
  CODIGO: 1,
  NOMBRE: 2,
  CARGO: 3,
  DEPARTAMENTO: 4,
  SUCURSAL: 5,
  TURNO: 6,
  DIAS_LIBRES: 7
};

export const SUGGESTED_INCIDENCIAS = [
  { id: 'pres', name: 'Presente Regular', type: 'presente', value: 2, label: 'Presente / Regular (Bono 2)' },
  { id: 'cier', name: 'Presente Cierre', type: 'cierre', value: 3, label: 'Turno Cierre (Bono 3)' },
  { id: 'redo', name: 'Redoble / Asist. Especial', type: 'redoble', value: 3, label: 'Redoble / H. Extra (Bono 3)' },
  { id: 'aper', name: 'Turno Apertura', type: 'apertura', value: 0, label: 'Turno Apertura (Bono 0)' },
  { id: 'dom',  name: 'Domingo Trabajado', type: 'domingo', value: 1, label: 'Domingo Trabajado (Bono 1)' },
  { id: 'fer',  name: 'Feriado Trabajado', type: 'feriado', value: 1, label: 'Día Feriado (Valor 1)' },
  { id: 'aj',   name: 'Ausencia Justificada', type: 'ausenciaJustificada', value: 1, label: 'Ausencia Justificada (Valor 1)' },
  { id: 'ai',   name: 'Ausencia Injustificada', type: 'ausenciaInjustificada', value: 1, label: 'Ausencia Injustificada (Valor 1)' },
  { id: 'rep',  name: 'Reposo Médico', type: 'reposo', value: 1, label: 'Reposo Médico (Valor 1)' }
];

export const DEFAULT_SUCURSALES_CONFIG = [
  {
    name: 'Sambil',
    incidenciasList: [
      { id: '1', name: 'Turno Cierre', type: 'cierre', value: 3 },
      { id: '2', name: 'Redoble / Asist. Especial', type: 'redoble', value: 3 },
      { id: '3', name: 'Presente Regular', type: 'presente', value: 2 },
      { id: '4', name: 'Turno Apertura', type: 'apertura', value: 0 },
      { id: '5', name: 'Domingos Trabajados', type: 'domingo', value: 2 },
      { id: '6', name: 'Feriados Trabajados', type: 'feriado', value: 1 },
      { id: '7', name: 'Ausencias Justificadas', type: 'ausenciaJustificada', value: 1 },
      { id: '8', name: 'Ausencias Injustificadas', type: 'ausenciaInjustificada', value: 1 }
    ],
    incidencias: {
      cierre: true,
      redoble: true,
      presente: true,
      apertura: true,
      domingo: true,
      feriado: true,
      ausenciaJustificada: true,
      ausenciaInjustificada: true,
      reposo: false
    },
    bonoCierre: 3,
    bonoRedoble: 3,
    bonoPresente: 2,
    bonoApertura: 0,
    valorDomingo: 2,
    bonoDomingo: 2,
    valorFeriado: 1,
    valorAusenciaJ: 1,
    valorAusenciaI: 1,
    valorReposo: 1
  },
  {
    name: 'La Vela',
    incidenciasList: [
      { id: '1', name: 'Turno Cierre', type: 'cierre', value: 2 },
      { id: '2', name: 'Redoble / Asist. Especial', type: 'redoble', value: 3 },
      { id: '3', name: 'Presente Regular', type: 'presente', value: 2 },
      { id: '4', name: 'Turno Apertura', type: 'apertura', value: 0 },
      { id: '5', name: 'Domingos Trabajados', type: 'domingo', value: 1 },
      { id: '6', name: 'Feriados Trabajados', type: 'feriado', value: 1 },
      { id: '7', name: 'Ausencias Justificadas', type: 'ausenciaJustificada', value: 1 },
      { id: '8', name: 'Ausencias Injustificadas', type: 'ausenciaInjustificada', value: 1 }
    ],
    incidencias: {
      cierre: true,
      redoble: true,
      presente: true,
      apertura: true,
      domingo: true,
      feriado: true,
      ausenciaJustificada: true,
      ausenciaInjustificada: true,
      reposo: false
    },
    bonoCierre: 2,
    bonoRedoble: 3,
    bonoPresente: 2,
    bonoApertura: 0,
    valorDomingo: 1,
    bonoDomingo: 1,
    valorFeriado: 1,
    valorAusenciaJ: 1,
    valorAusenciaI: 1,
    valorReposo: 1
  }
];

/**
 * Normaliza la configuración de sucursal unificando los conceptos
 * de domingos (bonoDomingo y valorDomingo a un único valor consistente).
 */
export function normalizeConfig(sucursalConfig) {
  if (!sucursalConfig) return {};
  const cfg = { ...sucursalConfig };

  if (Array.isArray(cfg.incidenciasList) && cfg.incidenciasList.length > 0) {
    const list = cfg.incidenciasList;
    cfg.incidencias = {
      cierre: list.some(i => i.type === 'cierre'),
      redoble: list.some(i => i.type === 'redoble'),
      presente: list.some(i => i.type === 'presente'),
      apertura: list.some(i => i.type === 'apertura'),
      domingo: list.some(i => i.type === 'domingo'),
      feriado: list.some(i => i.type === 'feriado'),
      ausenciaJustificada: list.some(i => i.type === 'ausenciaJustificada'),
      ausenciaInjustificada: list.some(i => i.type === 'ausenciaInjustificada'),
      reposo: list.some(i => i.type === 'reposo')
    };

    const getItemVal = (type, fallback) => {
      const found = list.find(i => i.type === type);
      return found !== undefined && found.value !== '' ? Number(found.value) : fallback;
    };

    cfg.bonoCierre = getItemVal('cierre', cfg.bonoCierre ?? 3);
    cfg.bonoRedoble = getItemVal('redoble', cfg.bonoRedoble ?? 3);
    cfg.bonoPresente = getItemVal('presente', cfg.bonoPresente ?? 2);
    cfg.bonoApertura = getItemVal('apertura', cfg.bonoApertura ?? 0);

    // Unificación de domingo: un solo valor consistente
    const domingoVal = getItemVal('domingo', cfg.valorDomingo ?? cfg.bonoDomingo ?? 1);
    cfg.valorDomingo = domingoVal;
    cfg.bonoDomingo = domingoVal;

    cfg.valorFeriado = getItemVal('feriado', cfg.valorFeriado ?? 1);
    cfg.valorAusenciaJ = getItemVal('ausenciaJustificada', cfg.valorAusenciaJ ?? 1);
    cfg.valorAusenciaI = getItemVal('ausenciaInjustificada', cfg.valorAusenciaI ?? 1);
    cfg.valorReposo = getItemVal('reposo', cfg.valorReposo ?? 1);
  } else {
    // Si viene sin lista, unificar los valores existentes
    const domVal = cfg.valorDomingo ?? cfg.bonoDomingo ?? 1;
    cfg.valorDomingo = domVal;
    cfg.bonoDomingo = domVal;
  }

  return cfg;
}

/**
 * Evalúa detalladamente una celda de asistencia.
 * Detecta:
 * - Incidencias generadas
 * - Si fue ignorada intencionalmente (ej. 'dia libre', 'vacaciones')
 * - Si es una celda NO reconocida (posible error tipográfico que pone en riesgo bonos)
 *
 * @param {string} cellValue
 * @param {Object} sucursalConfig
 * @param {boolean} isSunday
 * @param {boolean} isFeriado
 * @returns {{ incidences: Array<{ type: string, value: number }>, isUnrecognized: boolean, isIgnored: boolean }}
 */
export function evaluateDailyStatusDetailed(cellValue, sucursalConfig, isSunday, isFeriado) {
  if (!cellValue) return { incidences: [], isUnrecognized: false, isIgnored: true };

  const raw = String(cellValue).trim();
  if (!raw) return { incidences: [], isUnrecognized: false, isIgnored: true };

  const norm = normalizeText(raw);
  const cleanAlpha = norm.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  // Conceptos intencionalmente ignorados (descansos normales y permisos sin incidencia de bono/falta)
  const skipKeywords = [
    'dia libre', 'dias libres', 'libre', 'dl',
    'vacaciones', 'vacacion',
    'formaciones', 'formacion',
    'permiso', 'licencia',
    'suspension'
  ];

  if (skipKeywords.includes(cleanAlpha) || skipKeywords.some(k => cleanAlpha === k)) {
    return { incidences: [], isUnrecognized: false, isIgnored: true };
  }

  const cfg = normalizeConfig(sucursalConfig);
  const enabled = cfg.incidencias || {
    cierre: true,
    redoble: true,
    presente: true,
    apertura: true,
    domingo: true,
    feriado: true,
    ausenciaJustificada: true,
    ausenciaInjustificada: true,
    reposo: false
  };

  const bonoCierre   = Number(cfg.bonoCierre   ?? 3);
  const bonoRedoble  = Number(cfg.bonoRedoble  ?? 3);
  const bonoPresente = Number(cfg.bonoPresente ?? 2);
  const bonoApertura = Number(cfg.bonoApertura ?? 0);
  const valorDomingo = Number(cfg.valorDomingo  ?? 1);
  const valorAusenciaJ = Number(cfg.valorAusenciaJ ?? 1);
  const valorAusenciaI = Number(cfg.valorAusenciaI ?? 1);
  const valorFeriado   = Number(cfg.valorFeriado ?? 1);
  const valorReposo    = Number(cfg.valorReposo ?? 1);

  // 0. Coincidencia con incidencias personalizadas
  if (Array.isArray(cfg.incidenciasList)) {
    const customMatch = cfg.incidenciasList.find(i =>
      i.type === 'custom' &&
      i.name &&
      cleanAlpha.includes(normalizeText(i.name))
    );
    if (customMatch) {
      return {
        incidences: [{ type: customMatch.name.toUpperCase(), value: Number(customMatch.value || 1) }],
        isUnrecognized: false,
        isIgnored: false
      };
    }
  }

  // 1. Reposo Médico
  if (cleanAlpha.includes('reposo')) {
    if (enabled.reposo) {
      return { incidences: [{ type: 'REPOSO', value: valorReposo }], isUnrecognized: false, isIgnored: false };
    }
    return { incidences: [], isUnrecognized: false, isIgnored: true };
  }

  // 2. Detección de Ausencias
  const isInjustificada =
    cleanAlpha.includes('injustificad') ||
    cleanAlpha.includes('no justificad') ||
    cleanAlpha === 'ai' ||
    cleanAlpha === 'fi' ||
    cleanAlpha === 'a i' ||
    cleanAlpha === 'f i';

  const isJustificada =
    (cleanAlpha.includes('justificad') && !isInjustificada) ||
    cleanAlpha === 'aj' ||
    cleanAlpha === 'fj' ||
    cleanAlpha === 'a j' ||
    cleanAlpha === 'f j';

  const isAusenciaGenerica =
    cleanAlpha === 'ausencia' ||
    cleanAlpha === 'falta' ||
    cleanAlpha === 'inasistencia' ||
    cleanAlpha === 'ausente' ||
    cleanAlpha.startsWith('ausencia ') ||
    cleanAlpha.startsWith('falta ') ||
    cleanAlpha.startsWith('inasistencia ');

  if (isInjustificada || (isAusenciaGenerica && !isJustificada)) {
    if (enabled.ausenciaInjustificada !== false) {
      return { incidences: [{ type: 'AUSENCIA INJUSTIFICADA', value: valorAusenciaI }], isUnrecognized: false, isIgnored: false };
    }
    return { incidences: [], isUnrecognized: false, isIgnored: true };
  }

  if (isJustificada) {
    if (enabled.ausenciaJustificada !== false) {
      return { incidences: [{ type: 'AUSENCIA JUSTIFICADA', value: valorAusenciaJ }], isUnrecognized: false, isIgnored: false };
    }
    return { incidences: [], isUnrecognized: false, isIgnored: true };
  }

  // 3. Detección de Asistencia y Turnos
  const dailyIncidences = [];
  let isWorked = false;
  let bonoValue = 0;
  let matchedTurno = false;

  if (cleanAlpha.includes('cierre')) {
    matchedTurno = true;
    if (enabled.cierre !== false) {
      bonoValue = bonoCierre;
      isWorked = true;
    }
  } else if (
    cleanAlpha.includes('redoble') ||
    cleanAlpha.includes('asistio especial') ||
    cleanAlpha.includes('2 hora extra') ||
    cleanAlpha.includes('2 horas extras')
  ) {
    matchedTurno = true;
    if (enabled.redoble !== false) {
      bonoValue = bonoRedoble;
      isWorked = true;
    }
  } else if (cleanAlpha.includes('apertura')) {
    matchedTurno = true;
    if (enabled.apertura !== false) {
      bonoValue = bonoApertura;
      isWorked = true;
    }
  } else if (
    cleanAlpha.includes('presente') ||
    cleanAlpha === 'asistio' ||
    cleanAlpha.includes('1 hora extra') ||
    cleanAlpha.includes('1 horas extras')
  ) {
    matchedTurno = true;
    if (enabled.presente !== false) {
      bonoValue = bonoPresente;
      isWorked = true;
    }
  }

  if (matchedTurno) {
    if (isWorked) {
      if (bonoValue > 0) {
        dailyIncidences.push({ type: 'BONO NOCTURNO', value: bonoValue });
      }
      if (isSunday && enabled.domingo !== false) {
        dailyIncidences.push({ type: 'DOMINGO', value: valorDomingo });
      }
      if (isFeriado && enabled.feriado !== false) {
        dailyIncidences.push({ type: 'FERIADO', value: valorFeriado });
      }
    }
    return { incidences: dailyIncidences, isUnrecognized: false, isIgnored: false };
  }

  // Si llegamos aquí y no coincidió con nada conocido: Celda no reconocida (posible error tipográfico)
  return {
    incidences: [],
    isUnrecognized: true,
    isIgnored: false
  };
}

/**
 * Función estándar de compatibilidad hacia atrás para evaluar estatus diario.
 */
export function evaluateDailyStatus(cellValue, sucursalConfig, isSunday, isFeriado) {
  return evaluateDailyStatusDetailed(cellValue, sucursalConfig, isSunday, isFeriado).incidences;
}

/**
 * Procesa la matriz de datos crudos de Excel y calcula las incidencias de cada colaborador.
 * Incluye auditoría rigurosa:
 * - Detecta celdas no interpretadas (posibles errores de tipografía).
 * - Identifica colaboradores con sucursal no asignada ('Sin Asignar').
 * - Detecta colaboradores duplicados en el archivo.
 * - Mensaje genérico de cabecera si faltan columnas.
 * - Sin console.log residuales de depuración.
 *
 * @param {Array<Array<any>>} rawRows - Filas del Excel leídas como arreglo de arreglos.
 * @param {number} year - Año de procesamiento seleccionado por el usuario.
 * @param {number|null} monthIdx - Índice del mes (0-11).
 * @param {number|null} quincena - 1 para 1ra quincena (1-15), 2 para 2da (16-fin).
 * @param {Array<string>} feriadosList - Lista de fechas feriados en formato 'YYYY-MM-DD'.
 * @param {Array<Object>} sucursalesConfig - Lista de sucursales configuradas por el usuario.
 * @returns {Object} Diccionario con sucursales y sus incidencias, más metadatos de advertencias en `_anomalies`.
 */
export function processIncidencias(rawRows, year, monthIdx = null, quincena = null, feriadosList = [], sucursalesConfig = null) {
  // Compatibilidad hacia atrás si los argumentos se pasan en orden histórico
  if (Array.isArray(monthIdx)) {
    feriadosList = monthIdx;
    monthIdx = null;
    quincena = null;
  } else if (Array.isArray(quincena)) {
    feriadosList = quincena;
    quincena = null;
  }

  const sucursales = (sucursalesConfig && sucursalesConfig.length > 0)
    ? sucursalesConfig
    : DEFAULT_SUCURSALES_CONFIG;

  const result = {};
  sucursales.forEach(s => { result[s.name] = []; });

  const anomalies = {
    unrecognizedCells: [],
    unassignedEmployees: [],
    duplicateEmployees: []
  };

  Object.defineProperty(result, '_anomalies', {
    value: anomalies,
    enumerable: false,
    writable: true,
    configurable: true
  });

  if (!rawRows || rawRows.length === 0) {
    return result;
  }

  // 1. Localizar la fila de cabecera con términos genéricos
  let headerRowIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 15); c++) {
      const cellStr = String(row[c] || '');
      const norm = normalizeText(cellStr).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (
        norm.includes('codigo') ||
        norm === 'cod' ||
        norm.includes('cedula') ||
        norm.includes('documento') ||
        norm.includes('empleado') ||
        norm.includes('colaborador')
      ) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }

  if (headerRowIdx === -1) {
    throw new Error('No se detectaron las columnas requeridas (Código o Cédula de empleado) en el archivo Excel. Asegúrate de que el archivo contenga encabezados válidos.');
  }

  const headerRow = rawRows[headerRowIdx];

  // 2. Mapeo de columnas dinámico
  const colMap = { ...DEFAULT_COLS };
  for (let c = 0; c < headerRow.length; c++) {
    const cellVal = headerRow[c];
    if (cellVal === undefined || cellVal === null) continue;
    const norm = normalizeText(cellVal).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (norm.includes('codigo') || norm === 'cod' || norm.includes('cod mele')) {
      colMap.CODIGO = c;
    } else if (norm.includes('cedula') || norm === 'ci' || norm.includes('documento')) {
      colMap.CEDULA = c;
    } else if (
      norm.includes('nombre') ||
      norm.includes('apellido') ||
      norm.includes('colaborador') ||
      norm.includes('trabajador')
    ) {
      colMap.NOMBRE = c;
    } else if (norm.includes('cargo') || norm.includes('puesto') || norm.includes('rol')) {
      colMap.CARGO = c;
    } else if (norm.includes('departamento') || norm.includes('depto') || norm.includes('area')) {
      colMap.DEPARTAMENTO = c;
    } else if (
      norm.includes('sucursal') ||
      norm.includes('tienda') ||
      norm.includes('sede') ||
      norm.includes('ubicacion')
    ) {
      colMap.SUCURSAL = c;
    } else if (norm.includes('turno')) {
      colMap.TURNO = c;
    } else if (
      norm.includes('dias libres') ||
      norm.includes('dia libre') ||
      norm === 'libres'
    ) {
      colMap.DIAS_LIBRES = c;
    }
  }

  // 3 y 4. Determinar la fila y columna de inicio de fechas
  let dateStartCol = -1;
  let dateRow = null;
  let dateRowIdx = -1;

  const candidateRowIndices = [headerRowIdx, headerRowIdx + 1, headerRowIdx - 1];
  for (const idx of candidateRowIndices) {
    if (idx >= 0 && idx < rawRows.length) {
      const row = rawRows[idx];
      for (let c = 3; c < row.length; c++) {
        const parsed = parseHeaderDate(row[c], year, monthIdx, quincena);
        if (parsed) {
          if (dateStartCol === -1 || c < dateStartCol) {
            dateStartCol = c;
            dateRow = row;
            dateRowIdx = idx;
            break;
          }
        }
      }
    }
  }

  if (dateStartCol === -1) {
    for (let c = 0; c < headerRow.length; c++) {
      const norm = normalizeText(headerRow[c]);
      if (norm.includes('dias libres') || norm.includes('dia libre')) {
        dateStartCol = c + 1;
        break;
      }
    }
    if (dateStartCol === -1) {
      dateStartCol = colMap.DIAS_LIBRES + 1;
    }
    dateRow = headerRow;
    dateRowIdx = headerRowIdx;
  }

  // 5. Extraer columnas de fechas según el corte quincenal seleccionado
  const columnDates = [];
  let startDay = null;
  let endDay = null;
  if (monthIdx !== null && quincena !== null) {
    if (quincena === 1) {
      startDay = 1;
      endDay = 15;
    } else if (quincena === 2) {
      startDay = 16;
      endDay = new Date(year, monthIdx + 1, 0).getDate();
    }
  }

  for (let col = dateStartCol; col < dateRow.length; col++) {
    const dateCell = dateRow[col];
    if (dateCell === undefined || dateCell === '') continue;
    const parsedDate = parseHeaderDate(dateCell, year, monthIdx, quincena);
    if (!parsedDate) continue;

    if (monthIdx !== null && quincena !== null) {
      const yearMatches = parsedDate.getFullYear() === year;
      const monthMatches = parsedDate.getMonth() === monthIdx;
      const dayMatches = parsedDate.getDate() >= startDay && parsedDate.getDate() <= endDay;
      if (!yearMatches || !monthMatches || !dayMatches) continue;
    }

    columnDates.push({
      colIdx: col,
      date: parsedDate,
      headerTitle: String(dateCell).trim()
    });
  }

  const feriadosSet = new Set(feriadosList);

  // Registro de empleados para detectar duplicados
  const seenEmployees = new Map();

  // 6. Recorrer cada fila de colaborador
  for (let r = Math.max(headerRowIdx, dateRowIdx) + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row) continue;

    let employeeCode = String(row[colMap.CODIGO] || '').trim();
    if (!employeeCode && colMap.CODIGO !== DEFAULT_COLS.CODIGO) {
      employeeCode = String(row[DEFAULT_COLS.CODIGO] || '').trim();
    }
    const cedula = String(row[colMap.CEDULA] || '').trim();
    if (!employeeCode && !cedula) continue;

    if (!employeeCode) employeeCode = cedula;

    const employeeName = String(row[colMap.NOMBRE] || '').trim();
    const cargo = String(row[colMap.CARGO] || '').trim();

    // Detección de duplicados
    if (seenEmployees.has(employeeCode)) {
      const prevData = seenEmployees.get(employeeCode);
      anomalies.duplicateEmployees.push({
        employeeCode,
        employeeName: employeeName || prevData.employeeName,
        previousRow: prevData.row,
        currentRow: r + 1
      });
    } else {
      seenEmployees.set(employeeCode, { row: r + 1, employeeName });
    }

    const rawSucursal = String(row[colMap.SUCURSAL] || '').trim();
    const mappedSucursal = determineSucursal(rawSucursal, sucursales);

    // Si la sucursal no coincide con ninguna configurada, se asigna a 'Sin Asignar'
    if (mappedSucursal === 'Sin Asignar') {
      if (!result['Sin Asignar']) {
        result['Sin Asignar'] = [];
      }
      anomalies.unassignedEmployees.push({
        row: r + 1,
        employeeCode,
        employeeName,
        originalSucursal: rawSucursal
      });
    }

    const targetBranchKey = mappedSucursal;
    if (!result[targetBranchKey]) {
      result[targetBranchKey] = [];
    }

    // Configuración para evaluar esta sucursal (o defaults si no está asignada)
    const sucursalConfig = sucursales.find(s => s.name === mappedSucursal) || sucursales[0];

    for (const colDate of columnDates) {
      const cellValue = String(row[colDate.colIdx] || '').trim();
      if (!cellValue) continue;

      const formattedDate = formatDateString(colDate.date);
      const isoDateString = getLocalISODate(colDate.date);
      const isSunday = colDate.date.getDay() === 0;
      const isFeriado = feriadosSet.has(isoDateString);

      const evalResult = evaluateDailyStatusDetailed(cellValue, sucursalConfig, isSunday, isFeriado);

      // Si la celda contenía texto pero no se reconoció ni como descanso ni como turno válido:
      if (evalResult.isUnrecognized) {
        anomalies.unrecognizedCells.push({
          row: r + 1,
          col: colDate.colIdx + 1,
          colName: colDate.headerTitle,
          employeeCode,
          employeeName,
          dateString: formattedDate,
          rawValue: cellValue
        });
      }

      for (const inc of evalResult.incidences) {
        result[targetBranchKey].push({
          employeeCode,
          employeeName,
          cedula,
          cargo,
          originalSucursal: rawSucursal,
          mappedSucursal: targetBranchKey,
          incidenceType: inc.type,
          value: inc.value,
          dateString: formattedDate,
          originalStatus: cellValue
        });
      }
    }
  }

  return result;
}
