import { processIncidencias, DEFAULT_SUCURSALES_CONFIG } from './src/utils/calculator.js';

// Datos de prueba simulando el Excel con las 2 sucursales (Sambil y La Vela)
const mockRawRows = [
  // Fila 0: Encabezados de columnas
  ['COD. MELE', 'CÉDULA', 'APELLIDOS Y NOMBRES', 'SUCURSAL', 'CARGO', 'LUN', 'MAR', 'MIÉ', 'DOM', 'LUN', 'MAR'],
  // Fila 1: Fechas
  ['', '', '', '', '', '1 Jun', '2 Jun', '3 Jun', '7 Jun', '8 Jun', '9 Jun'],
  // Fila 2: Empleado Sambil
  ['1001', '11111111', 'COLABORADOR UNO', 'Sambil', 'ASESOR', 'Presente apertura a tiempo', 'Presente cierre a tiempo', 'Día libre', 'Presente apertura a tiempo', 'Reposo', 'Ausencia Injustificada'],
  // Fila 3: Empleado La Vela
  ['1002', '22222222', 'COLABORADOR DOS', 'La Vela', 'ASESOR', 'Presente a tiempo', 'Presente cierre a tiempo', 'Día libre', 'Presente a tiempo', 'Día libre', 'Falta Justificada'],
  // Fila 4: Empleado Sambil con variantes de ausencia y horas extras
  ['1003', '33333333', 'COLABORADOR TRES', 'Sambil', 'ASESOR', 'Presente cierre a tiempo', '1 Hora Extra', '2 Hora Extra', 'Día libre', 'Falta Injustificada', 'Ausencia Justificada'],
  // Fila 5: Empleado La Vela con asistencias especiales y códigos
  ['1004', '44444444', 'COLABORADOR CUATRO', 'La Vela', 'ASESOR', 'Asistió Especial', 'Presente a tiempo', 'Día libre', 'Reposo', 'Permiso', 'AI']
];

const feriados = ['2026-06-03']; // 3 Jun es Feriado
const year = 2026;

console.log('--- INICIANDO PRUEBAS DE CÁLCULO DE INCIDENCIAS CONFIGURABLES ---');

try {
  // Pruebas específicas de quincenas (Q1 de Junio) con la configuración por defecto
  const result = processIncidencias(mockRawRows, year, 5, 1, feriados, DEFAULT_SUCURSALES_CONFIG);

  console.log('\n--- SUCURSALES DETECTADAS EN RESULTADOS ---');
  console.log(Object.keys(result));

  // Imprimir resumen
  Object.keys(result).forEach(sucursal => {
    console.log(`\nSucursal: ${sucursal} (Total registros: ${result[sucursal].length})`);
    result[sucursal].forEach(item => {
      console.log(` - Empleado: ${item.employeeCode} (${item.employeeName}) | Incidencia: ${item.incidenceType} | Valor: ${item.value} | Fecha: ${item.dateString} | Estatus: [${item.originalStatus}]`);
    });
  });

  console.log('\n--- VERIFICANDO ASERTOS ---');

  // 1. SAMBIL - Empleado 1001
  const sambilList = result['Sambil'];
  if (!sambilList) throw new Error('No existe la sucursal Sambil en los resultados');

  // Cierre a tiempo el 2 Jun -> bono nocturno = 3
  const smBono = sambilList.find(i => i.employeeCode === '1001' && i.dateString === '02 06 2026' && i.incidenceType === 'BONO NOCTURNO');
  if (smBono && smBono.value === 3) {
    console.log('✅ OK: Sambil - Presente cierre a tiempo calculó Bono Nocturno 3');
  } else {
    console.error('❌ FAIL: Sambil - Bono Nocturno para 1001 el 02 06 2026 no es 3', smBono);
  }

  // Domingo 7 Jun trabajado -> domingo = 1
  const smDomingo = sambilList.find(i => i.employeeCode === '1001' && i.dateString === '07 06 2026' && i.incidenceType === 'DOMINGO');
  if (smDomingo && smDomingo.value === 1) {
    console.log('✅ OK: Sambil - Domingo trabajado el 07 06 2026 calculó Domingo 1');
  } else {
    console.error('❌ FAIL: Sambil - Domingo para 1001 no se calculó', smDomingo);
  }

  // Ausencia Injustificada 9 Jun -> 1
  const smAusenciaI = sambilList.find(i => i.employeeCode === '1001' && i.dateString === '09 06 2026' && i.incidenceType === 'AUSENCIA INJUSTIFICADA');
  if (smAusenciaI && smAusenciaI.value === 1) {
    console.log('✅ OK: Sambil - Ausencia Injustificada para 1001 calculó correctamente (1)');
  } else {
    console.error('❌ FAIL: Sambil - Ausencia Injustificada para 1001 no se calculó', smAusenciaI);
  }

  // 2. LA VELA - Empleado 1002
  const velaList = result['La Vela'];
  if (!velaList) throw new Error('No existe la sucursal La Vela en los resultados');

  // Presente a tiempo 1 Jun (Lunes) -> bono nocturno = 2
  const velaBono1 = velaList.find(i => i.employeeCode === '1002' && i.dateString === '01 06 2026' && i.incidenceType === 'BONO NOCTURNO');
  // Presente cierre a tiempo 2 Jun (Martes) -> bono nocturno = 2 (según config La Vela)
  const velaBono2 = velaList.find(i => i.employeeCode === '1002' && i.dateString === '02 06 2026' && i.incidenceType === 'BONO NOCTURNO');
  if (velaBono1?.value === 2 && velaBono2?.value === 2) {
    console.log('✅ OK: La Vela - Presente a tiempo y cierre calcularon Bono Nocturno según configuración (2)');
  } else {
    console.error('❌ FAIL: La Vela - Bono Nocturno incorrecto', { velaBono1, velaBono2 });
  }

  // Presente a tiempo 7 Jun (Domingo) -> bono nocturno = 1, Domingo = 1
  const velaBonoDom = velaList.find(i => i.employeeCode === '1002' && i.dateString === '07 06 2026' && i.incidenceType === 'BONO NOCTURNO');
  const velaDom = velaList.find(i => i.employeeCode === '1002' && i.dateString === '07 06 2026' && i.incidenceType === 'DOMINGO');
  if (velaBonoDom?.value === 1 && velaDom?.value === 1) {
    console.log('✅ OK: La Vela - Turno en domingo calculó Bono Nocturno 1 y Domingo 1');
  } else {
    console.error('❌ FAIL: La Vela - Turno en domingo incorrecto', { velaBonoDom, velaDom });
  }

  // Falta Justificada 9 Jun -> AUSENCIA JUSTIFICADA = 1
  const velaAusenciaJ = velaList.find(i => i.employeeCode === '1002' && i.dateString === '09 06 2026' && i.incidenceType === 'AUSENCIA JUSTIFICADA');
  if (velaAusenciaJ && velaAusenciaJ.value === 1) {
    console.log('✅ OK: La Vela - Falta Justificada calculó AUSENCIA JUSTIFICADA 1');
  } else {
    console.error('❌ FAIL: La Vela - Falta Justificada no se calculó', velaAusenciaJ);
  }

  // 3. SAMBIL - Empleado 1003 (Falta Injustificada y Ausencia Justificada)
  const sm3FaltaI = sambilList.find(i => i.employeeCode === '1003' && i.dateString === '08 06 2026' && i.incidenceType === 'AUSENCIA INJUSTIFICADA');
  const sm3AusenciaJ = sambilList.find(i => i.employeeCode === '1003' && i.dateString === '09 06 2026' && i.incidenceType === 'AUSENCIA JUSTIFICADA');
  if (sm3FaltaI && sm3AusenciaJ) {
    console.log('✅ OK: Sambil - Falta Injustificada y Ausencia Justificada calculadas correctamente');
  } else {
    console.error('❌ FAIL: Sambil - Variantes de ausencias para 1003 incorrectas', { sm3FaltaI, sm3AusenciaJ });
  }

  // Feriado el 3 Jun para 1003
  const sm3Feriado = sambilList.find(i => i.employeeCode === '1003' && i.dateString === '03 06 2026' && i.incidenceType === 'FERIADO');
  if (sm3Feriado && sm3Feriado.value === 1) {
    console.log('✅ OK: Sambil - Feriado trabajado el 03 06 2026 calculó FERIADO 1');
  } else {
    console.error('❌ FAIL: Sambil - Feriado no calculado', sm3Feriado);
  }

  // 4. LA VELA - Empleado 1004 (Asistió Especial -> 3, AI -> Injustificada 1)
  const vela4Bono1 = velaList.find(i => i.employeeCode === '1004' && i.dateString === '01 06 2026' && i.incidenceType === 'BONO NOCTURNO');
  const vela4AI = velaList.find(i => i.employeeCode === '1004' && i.dateString === '09 06 2026' && i.incidenceType === 'AUSENCIA INJUSTIFICADA');
  if (vela4Bono1?.value === 3 && vela4AI?.value === 1) {
    console.log('✅ OK: La Vela - Asistió Especial (3) y código AI como Ausencia Injustificada (1)');
  } else {
    console.error('❌ FAIL: La Vela - Asistencia especial o AI falló', { vela4Bono1, vela4AI });
  }

  console.log('\n🎉 TODAS LAS PRUEBAS DE CÁLCULO PASARON EXITOSAMENTE.');
} catch (err) {
  console.error('❌ ERROR EN PRUEBAS:', err);
  process.exit(1);
}
