import * as XLSX from 'xlsx-js-style';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const SUCURSAL_COLORS = [
  { headerBg: 'B4C6E7', cellBg: 'DDEBF7' },
  { headerBg: 'C6E0B4', cellBg: 'E2EFDA' },
  { headerBg: 'FFE0B2', cellBg: 'FFF3E0' },
  { headerBg: 'E1BEE7', cellBg: 'F3E5F5' },
  { headerBg: 'B2EBF2', cellBg: 'E0F7FA' }
];

export function exportIncidenciasExcel({ incidencias, year, month, quincena, feriados }) {
  const wb = XLSX.utils.book_new();
  const monthName = MONTH_NAMES[month]?.toUpperCase() || 'CORTE';

  // 1. Hoja "Resumen General"
  const summaryRows = [];
  summaryRows.push(['REPORTE CONSOLIDADO DE INCIDENCIAS LABORALES']);
  summaryRows.push([`Período: ${MONTH_NAMES[month]} ${year} - Quincena ${quincena}`]);
  summaryRows.push([`Fecha de Generación: ${new Date().toLocaleString('es-ES')}`]);
  summaryRows.push([`Feriados Computados: ${feriados.length > 0 ? feriados.join(', ') : 'Ninguno'}`]);
  summaryRows.push([]); // fila vacía

  summaryRows.push([
    'Código',
    'Cédula',
    'Colaborador',
    'Cargo',
    'Sede',
    'Puntos Bono Nocturno',
    'Domingos Trabajados',
    'Feriados Trabajados',
    'Ausencias Justificadas',
    'Ausencias Injustificadas',
    'Total Registros'
  ]);

  // Agrupar por empleado
  const employeeMap = new Map();

  Object.keys(incidencias).forEach(sucursal => {
    const list = incidencias[sucursal] || [];
    list.forEach(item => {
      const code = item.employeeCode;
      if (!employeeMap.has(code)) {
        employeeMap.set(code, {
          code,
          cedula: item.cedula || '',
          name: item.employeeName || '',
          cargo: item.cargo || '',
          sucursal,
          bonoNocturno: 0,
          domingo: 0,
          feriado: 0,
          ausenciaJustificada: 0,
          ausenciaInjustificada: 0,
          total: 0
        });
      }

      const emp = employeeMap.get(code);
      emp.total += 1;
      if (item.incidenceType === 'BONO NOCTURNO') emp.bonoNocturno += item.value;
      else if (item.incidenceType === 'DOMINGO') emp.domingo += 1;
      else if (item.incidenceType === 'FERIADO') emp.feriado += 1;
      else if (item.incidenceType === 'AUSENCIA JUSTIFICADA') emp.ausenciaJustificada += 1;
      else if (item.incidenceType === 'AUSENCIA INJUSTIFICADA') emp.ausenciaInjustificada += 1;
    });
  });

  Array.from(employeeMap.values()).forEach(emp => {
    summaryRows.push([
      parseInt(emp.code, 10) || emp.code,
      emp.cedula,
      emp.name,
      emp.cargo,
      emp.sucursal,
      emp.bonoNocturno,
      emp.domingo,
      emp.feriado,
      emp.ausenciaJustificada,
      emp.ausenciaInjustificada,
      emp.total
    ]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 24 },
    { wch: 16 }
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

  // 2. Hojas por cada Sucursal
  Object.keys(incidencias).forEach((sucursal, idx) => {
    const colorSet = SUCURSAL_COLORS[idx % SUCURSAL_COLORS.length];
    const dataForSheet = (incidencias[sucursal] || []).map(item => ({
      'Codigo de Empleado': parseInt(item.employeeCode, 10) || item.employeeCode,
      'Cédula': item.cedula || '',
      'Colaborador': item.employeeName || '',
      'Cargo': item.cargo || '',
      'Incidencias': item.incidenceType,
      'Valor': item.value,
      'Fecha': item.dateString,
      'Turno Original': item.originalStatus || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataForSheet);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 26 },
      { wch: 20 },
      { wch: 26 },
      { wch: 10 },
      { wch: 16 },
      { wch: 24 }
    ];

    Object.keys(ws).forEach(cellRef => {
      if (cellRef.startsWith('!')) return;
      const cell = ws[cellRef];
      if (!cell) return;
      const rowNum = parseInt(cellRef.replace(/^[A-Z]+/, ''), 10);
      const isHeader = rowNum === 1;

      cell.s = {
        fill: { patternType: 'solid', fgColor: { rgb: isHeader ? colorSet.headerBg : colorSet.cellBg } },
        font: { name: 'Calibri', sz: 11, bold: isHeader, color: { rgb: '000000' } },
        alignment: { horizontal: isHeader ? 'center' : 'left', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'D9D9D9' } },
          bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
          left: { style: 'thin', color: { rgb: 'D9D9D9' } },
          right: { style: 'thin', color: { rgb: 'D9D9D9' } }
        }
      };
    });

    const sheetName = sucursal.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  const fileName = `INCIDENCIAS_CORTE_${year}_${monthName}_Q${quincena}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
