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
 * Si no hay coincidencia, retorna la primera sucursal de la lista (por defecto).
 *
 * @param {string} sucursalRaw - Valor crudo del campo sucursal en el Excel.
 * @param {Array<{name: string}>} sucursales - Lista de sucursales configuradas por el usuario.
 * @returns {string} El nombre de la sucursal configurada que mejor hace match.
 */
export function determineSucursal(sucursalRaw, sucursales) {
  if (!sucursalRaw || !sucursales || sucursales.length === 0) {
    return sucursales?.[0]?.name || 'SUCURSAL 1';
  }

  const normalized = normalizeText(sucursalRaw);

  // Buscar la sucursal configurada cuyo nombre tenga más solapamiento con el valor del Excel
  for (const suc of sucursales) {
    const sucNorm = normalizeText(suc.name);
    // Match directo o si el nombre de la sucursal está contenido en el valor crudo o viceversa
    if (
      normalized.includes(sucNorm) ||
      sucNorm.includes(normalized) ||
      // Comparar palabras clave (al menos una palabra coincide)
      sucNorm.split(' ').some(word => word.length > 2 && normalized.includes(word))
    ) {
      return suc.name;
    }
  }

  // Fallback: primera sucursal
  return sucursales[0].name;
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
 * @param {any} cell
 * @param {number} year
 * @param {number|null} defaultMonthIdx
 * @returns {Date|null}
 */
export function parseHeaderDate(cell, year, defaultMonthIdx = null) {
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
    if (cell <= 31) {
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

    // A. Día simple en número (ej: "16")
    const dayOnly = parseInt(trimmed, 10);
    if (!isNaN(dayOnly) && String(dayOnly) === trimmed && dayOnly <= 31) {
      if (defaultMonthIdx !== null) {
        return new Date(year, defaultMonthIdx, dayOnly);
      }
      return null;
    }

    // B. Formatos DD/MM/YYYY, DD-MM-YYYY, DD/MM, DD-MM
    const parts = trimmed.split(/[\/\-]/);
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

    // C. Formato texto: "16 de junio", "16 jun", "01-jun"
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

export const DEFAULT_SUCURSALES_CONFIG = [
  {
    name: 'Sambil',
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
    bonoDomingo: 2,
    valorDomingo: 1,
    valorFeriado: 1,
    valorAusenciaJ: 1,
    valorAusenciaI: 1,
    valorReposo: 1
  },
  {
    name: 'La Vela',
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
    bonoDomingo: 1,
    valorDomingo: 1,
    valorFeriado: 1,
    valorAusenciaJ: 1,
    valorAusenciaI: 1,
    valorReposo: 1
  }
];

/**
 * Evalúa el estatus diario para una sucursal dada y genera las incidencias correspondientes.
 * Cuenta de forma exhaustiva y precisa:
 * - AUSENCIAS JUSTIFICADAS
 * - AUSENCIAS INJUSTIFICADAS
 * - REPOSOS (si está habilitado)
 * - BONO NOCTURNO (con valor configurable por tipo de turno)
 * - DOMINGOS TRABAJADOS
 * - FERIADOS TRABAJADOS
 *
 * Cada incidencia se activa/desactiva y se valoriza según la configuración de la sucursal.
 *
 * @param {string} cellValue - Valor de la celda del Excel.
 * @param {Object} sucursalConfig - Configuración de la sucursal.
 * @param {boolean} isSunday
 * @param {boolean} isFeriado
 * @returns {Array<{ type: string, value: number }>}
 */
export function evaluateDailyStatus(cellValue, sucursalConfig, isSunday, isFeriado) {
  if (!cellValue) return [];

  const raw = String(cellValue).trim();
  if (!raw) return [];

  const norm = normalizeText(raw);
  const cleanAlpha = norm.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const cfg = sucursalConfig || {};
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
  const bonoDomingo  = Number(cfg.bonoDomingo  ?? 1);
  const valorAusenciaJ = Number(cfg.valorAusenciaJ ?? 1);
  const valorAusenciaI = Number(cfg.valorAusenciaI ?? 1);
  const valorFeriado   = Number(cfg.valorFeriado ?? 1);
  const valorDomingo   = Number(cfg.valorDomingo ?? 1);
  const valorReposo    = Number(cfg.valorReposo ?? 1);

  // Manejo de Reposo
  if (cleanAlpha.includes('reposo')) {
    if (enabled.reposo) {
      return [{ type: 'REPOSO', value: valorReposo }];
    }
    return [];
  }

  // 1. Conceptos a ignorar (no generan incidencias)
  const skipKeywords = ['dia libre', 'vacaciones', 'formaciones', 'formacion', 'permiso'];
  if (skipKeywords.includes(cleanAlpha)) {
    return [];
  }

  // 2. DETECCIÓN DE AUSENCIAS (JUSTIFICADAS E INJUSTIFICADAS)
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

  // Ausencia / Falta genérica → AUSENCIA INJUSTIFICADA
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
      return [{ type: 'AUSENCIA INJUSTIFICADA', value: valorAusenciaI }];
    }
    return [];
  }

  if (isJustificada) {
    if (enabled.ausenciaJustificada !== false) {
      return [{ type: 'AUSENCIA JUSTIFICADA', value: valorAusenciaJ }];
    }
    return [];
  }

  // 3. DETECCIÓN DE ASISTENCIA Y CÁLCULO DE BONOS
  const dailyIncidences = [];
  let isWorked = false;
  let bonoValue = 0;

  if (cleanAlpha.includes('cierre')) {
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
    if (enabled.redoble !== false) {
      bonoValue = bonoRedoble;
      isWorked = true;
    }
  } else if (cleanAlpha.includes('apertura')) {
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
    if (enabled.presente !== false) {
      bonoValue = (isSunday && bonoDomingo !== bonoPresente) ? bonoDomingo : bonoPresente;
      isWorked = true;
    }
  }

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

  return dailyIncidences;
}

/**
 * Procesa la matriz de datos crudos de Excel y calcula las incidencias de cada colaborador.
 * Soporta configuración dinámica de sucursales definidas por el usuario.
 *
 * @param {Array<Array<any>>} rawRows - Filas del Excel leídas como arreglo de arreglos.
 * @param {number} year - Año de procesamiento seleccionado por el usuario.
 * @param {number|null} monthIdx - Índice del mes (0-11).
 * @param {number|null} quincena - 1 para 1ra quincena (1-15), 2 para 2da (16-fin).
 * @param {Array<string>} feriadosList - Lista de fechas feriados en formato 'YYYY-MM-DD'.
 * @param {Array<Object>} sucursalesConfig
 *   - Lista de sucursales configuradas por el usuario. Si no se provee, usa DEFAULT_SUCURSALES_CONFIG.
 * @returns {Object} Un objeto con llave igual al nombre de cada sucursal configurada.
 */
export function processIncidencias(rawRows, year, monthIdx = null, quincena = null, feriadosList = [], sucursalesConfig = null) {
  // Compatibilidad hacia atrás: si monthIdx es un array, es feriadosList
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

  console.log('=== DEBUG PROCESAR INCIDENCIAS ===');
  console.log('Año UI:', year, 'Mes UI (0-11):', monthIdx, 'Quincena UI:', quincena);
  console.log('Feriados registrados:', feriadosList);
  console.log('Sucursales configuradas:', sucursales.map(s => s.name));

  // Inicializar resultado con las sucursales configuradas
  const result = {};
  sucursales.forEach(s => { result[s.name] = []; });

  if (!rawRows || rawRows.length === 0) {
    console.warn('El archivo de entrada está vacío.');
    return result;
  }

  // 1. Localizar la fila de cabecera
  let headerRowIdx = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    for (let c = 0; c < Math.min(row.length, 15); c++) {
      const cellStr = String(row[c] || '');
      const norm = normalizeText(cellStr).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      if (
        norm.includes('cod mel') ||
        norm.includes('codigo') ||
        norm === 'cod' ||
        norm.includes('cedula') ||
        norm.includes('documento')
      ) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx !== -1) break;
  }

  if (headerRowIdx === -1) {
    console.error('Cabecera "COD MELÉ" o similar no encontrada en ninguna fila.');
    throw new Error('No se encontró la cabecera "COD MELÉ" en el archivo.');
  }

  console.log('Fila cabecera encontrada en índice:', headerRowIdx);
  const headerRow = rawRows[headerRowIdx];

  // 2. Mapeo dinámico de columnas según los encabezados encontrados
  const colMap = { ...DEFAULT_COLS };
  for (let c = 0; c < headerRow.length; c++) {
    const cellVal = headerRow[c];
    if (cellVal === undefined || cellVal === null) continue;
    const norm = normalizeText(cellVal).replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    if (norm.includes('cod mel') || norm.includes('codigo') || norm === 'cod') {
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

  // 3 y 4. Determinar dinámicamente la fila de fechas y la columna de inicio de fechas
  let dateStartCol = -1;
  let dateRow = null;
  let dateRowIdx = -1;

  const candidateRowIndices = [headerRowIdx, headerRowIdx + 1, headerRowIdx - 1];
  for (const idx of candidateRowIndices) {
    if (idx >= 0 && idx < rawRows.length) {
      const row = rawRows[idx];
      for (let c = 3; c < row.length; c++) {
        const parsed = parseHeaderDate(row[c], year, monthIdx);
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
  console.log('Fila de fechas detectada en índice:', dateRowIdx, '| Columna de inicio de fechas:', dateStartCol);

  // 5. Extraer las fechas válidas filtradas por el corte quincenal
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
    const parsedDate = parseHeaderDate(dateCell, year, monthIdx);
    if (!parsedDate) continue;

    if (monthIdx !== null && quincena !== null) {
      const yearMatches = parsedDate.getFullYear() === year;
      const monthMatches = parsedDate.getMonth() === monthIdx;
      const dayMatches = parsedDate.getDate() >= startDay && parsedDate.getDate() <= endDay;
      if (!yearMatches || !monthMatches || !dayMatches) continue;
    }

    columnDates.push({ colIdx: col, date: parsedDate });
  }

  console.log('Total columnas de fecha válidas que pasaron filtros:', columnDates.length);

  const feriadosSet = new Set(feriadosList);

  // 6. Recorrer cada fila de colaborador y procesar las incidencias
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

    const rawSucursal = String(row[colMap.SUCURSAL] || '').trim();
    const mappedSucursal = determineSucursal(rawSucursal, sucursales);

    if (!result[mappedSucursal]) continue;

    // Obtener la configuración de bonos de esta sucursal
    const sucursalConfig = sucursales.find(s => s.name === mappedSucursal);

    const employeeName = String(row[colMap.NOMBRE] || '').trim();
    const cargo = String(row[colMap.CARGO] || '').trim();

    for (const colDate of columnDates) {
      const cellValue = String(row[colDate.colIdx] || '').trim();
      if (!cellValue) continue;

      const formattedDate = formatDateString(colDate.date);
      const isoDateString = getLocalISODate(colDate.date);
      const isSunday = colDate.date.getDay() === 0;
      const isFeriado = feriadosSet.has(isoDateString);

      const dailyIncidences = evaluateDailyStatus(cellValue, sucursalConfig, isSunday, isFeriado);

      for (const inc of dailyIncidences) {
        result[mappedSucursal].push({
          employeeCode,
          employeeName,
          cedula,
          cargo,
          originalSucursal: rawSucursal,
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