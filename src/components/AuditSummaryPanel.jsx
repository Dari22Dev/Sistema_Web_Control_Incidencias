import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

export default function AuditSummaryPanel({ incidencias, anomalies, activeSucursal }) {
  const [showUnrecognizedDetails, setShowUnrecognizedDetails] = useState(false);
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false);
  const [showUnassignedDetails, setShowUnassignedDetails] = useState(false);

  const unrecognized = anomalies?.unrecognizedCells || [];
  const duplicates = anomalies?.duplicateEmployees || [];
  const unassigned = anomalies?.unassignedEmployees || [];

  const hasAnomalies = unrecognized.length > 0 || duplicates.length > 0 || unassigned.length > 0;

  // Totales agregados por sucursal
  const sucursalesTotals = Object.keys(incidencias).map(suc => {
    const list = incidencias[suc] || [];
    const uniqueEmployees = new Set(list.map(i => i.employeeCode)).size;
    const totalBonos = list.filter(i => i.incidenceType === 'BONO NOCTURNO').reduce((acc, c) => acc + c.value, 0);
    const totalDomingos = list.filter(i => i.incidenceType === 'DOMINGO').length;
    const totalFeriados = list.filter(i => i.incidenceType === 'FERIADO').length;
    const totalAusencias = list.filter(i => i.incidenceType.includes('AUSENCIA')).length;

    return {
      name: suc,
      registros: list.length,
      colaboradores: uniqueEmployees,
      bonos: totalBonos,
      domingos: totalDomingos,
      feriados: totalFeriados,
      ausencias: totalAusencias
    };
  });

  return (
    <div className="audit-summary-panel" style={{ marginBottom: '1.25rem' }}>
      {/* Alertas de Anomalías / Riesgo Económico */}
      {hasAnomalies && (
        <div className="glass-card" style={{ borderLeft: '4px solid var(--warning, #eab308)', marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={20} color="var(--warning, #eab308)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
              Auditoría Preventiva: Se detectaron {unrecognized.length + duplicates.length + unassigned.length} advertencias en el archivo
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 1. Celdas no reconocidas */}
            {unrecognized.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    ⚠️ <strong>{unrecognized.length} celda(s) no se pudieron interpretar</strong> (posible texto mal escrito o variación de turno no configurada).
                  </span>
                  <button
                    className="btn-table"
                    onClick={() => setShowUnrecognizedDetails(!showUnrecognizedDetails)}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    {showUnrecognizedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Detalle
                  </button>
                </div>

                {showUnrecognizedDetails && (
                  <div style={{ marginTop: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                    <table style={{ fontSize: '0.8rem', width: '100%' }}>
                      <thead>
                        <tr>
                          <th>Fila</th>
                          <th>Columna</th>
                          <th>Colaborador</th>
                          <th>Texto no reconocido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unrecognized.map((item, idx) => (
                          <tr key={idx}>
                            <td>Fila {item.row}</td>
                            <td>{item.colName || `Col ${item.col}`}</td>
                            <td>{item.employeeName} ({item.employeeCode})</td>
                            <td><code style={{ color: 'var(--danger)', fontWeight: 600 }}>{item.rawValue}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. Empleados duplicados */}
            {duplicates.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    👥 <strong>{duplicates.length} colaborador(es) duplicados</strong> (mismo código en múltiples filas del Excel).
                  </span>
                  <button
                    className="btn-table"
                    onClick={() => setShowDuplicateDetails(!showDuplicateDetails)}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    {showDuplicateDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Detalle
                  </button>
                </div>

                {showDuplicateDetails && (
                  <ul style={{ margin: '8px 0 0 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {duplicates.map((dup, idx) => (
                      <li key={idx}>
                        Código: <strong>{dup.employeeCode}</strong> ({dup.employeeName}) - Fila {dup.currentRow} (duplicada de fila {dup.previousRow})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* 3. Sedes no asignadas */}
            {unassigned.length > 0 && (
              <div style={{ background: 'var(--bg-secondary)', borderRadius: '6px', padding: '8px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    🏢 <strong>{unassigned.length} colaborador(es) con sucursal "Sin Asignar"</strong> (el texto del Excel no coincidió con ninguna sede configurada).
                  </span>
                  <button
                    className="btn-table"
                    onClick={() => setShowUnassignedDetails(!showUnassignedDetails)}
                    style={{ fontSize: '0.8rem', padding: '2px 8px' }}
                  >
                    {showUnassignedDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Detalle
                  </button>
                </div>

                {showUnassignedDetails && (
                  <ul style={{ margin: '8px 0 0 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {unassigned.map((un, idx) => (
                      <li key={idx}>
                        Código {un.employeeCode}: texto original del Excel: <em>"{un.originalSucursal || '(Vacío)'}"</em>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumen de totales por sede */}
      <div className="glass-card" style={{ padding: '1rem' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          Resumen Consolidado por Sede (Previo a Liquidación)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {sucursalesTotals.map(suc => (
            <div
              key={suc.name}
              style={{
                background: suc.name === activeSucursal ? 'var(--primary-subtle, rgba(63, 207, 142, 0.1))' : 'var(--bg-secondary)',
                border: suc.name === activeSucursal ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '10px'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {suc.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>👥 Colaboradores: <strong>{suc.colaboradores}</strong></div>
                <div>🌙 Puntos Bono Noct.: <strong>{suc.bonos}</strong></div>
                <div>☀️ Domingos: <strong>{suc.domingos}</strong></div>
                <div>🚩 Feriados: <strong>{suc.feriados}</strong></div>
                <div>⚠️ Ausencias: <strong>{suc.ausencias}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
