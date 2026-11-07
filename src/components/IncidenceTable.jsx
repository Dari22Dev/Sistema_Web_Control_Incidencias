import React, { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function IncidenceTable({
  incidenciasList,
  activeSucursal,
  onDeleteIncidence,
  viewingHistoryId
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortField, setSortField] = useState('employeeCode');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Filtrado
  const filtered = useMemo(() => {
    return (incidenciasList || []).filter(item => {
      // Filtro de tipo
      if (typeFilter !== 'ALL' && item.incidenceType !== typeFilter) {
        return false;
      }
      // Filtro de texto
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        String(item.employeeCode).toLowerCase().includes(q) ||
        String(item.employeeName || '').toLowerCase().includes(q) ||
        String(item.cedula || '').toLowerCase().includes(q) ||
        String(item.cargo || '').toLowerCase().includes(q) ||
        String(item.incidenceType).toLowerCase().includes(q)
      );
    });
  }, [incidenciasList, typeFilter, searchQuery]);

  // Ordenamiento
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'value') {
        valA = Number(valA);
        valB = Number(valB);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filtered, sortField, sortAsc]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const uniqueTypes = useMemo(() => {
    const set = new Set((incidenciasList || []).map(i => i.incidenceType));
    return Array.from(set);
  }, [incidenciasList]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Barra de herramientas: Búsqueda + Filtro por Tipo */}
      <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
        <div className="search-container" style={{ flex: '1 1 250px' }}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar colaborador, cédula o cargo..."
            className="search-input"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            aria-label="Buscar colaborador en la tabla"
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} color="var(--text-secondary)" />
          <select
            className="input-text"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ width: 'auto', minWidth: '180px', padding: '6px 12px' }}
            aria-label="Filtrar por tipo de incidencia"
          >
            <option value="ALL">Todas las Incidencias ({incidenciasList?.length || 0})</option>
            {uniqueTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla con scroll y headers ordenables */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('employeeCode')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Cod. <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('cedula')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  C.I. <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('employeeName')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Colaborador <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Cargo</th>
              <th onClick={() => handleSort('incidenceType')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Incidencia <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('value')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Valor <ArrowUpDown size={12} />
                </div>
              </th>
              <th onClick={() => handleSort('dateString')} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Fecha <ArrowUpDown size={12} />
                </div>
              </th>
              <th>Turno Crudo</th>
              {!viewingHistoryId && <th style={{ width: '56px', textAlign: 'center' }}>Acción</th>}
            </tr>
          </thead>
          <tbody>
            {paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={viewingHistoryId ? 8 : 9} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-tertiary)' }}>
                  No se encontraron incidencias que coincidan con los filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => {
                const originalIndex = incidenciasList.findIndex(
                  i => i.employeeCode === item.employeeCode &&
                       i.dateString === item.dateString &&
                       i.incidenceType === item.incidenceType
                );

                return (
                  <tr key={`${item.employeeCode}-${item.dateString}-${item.incidenceType}-${idx}`}>
                    <td className="cell-code">{item.employeeCode}</td>
                    <td className="mono-num">{item.cedula || '—'}</td>
                    <td className="cell-name">{item.employeeName || '—'}</td>
                    <td className="text-muted cell-cargo">{item.cargo || '—'}</td>
                    <td>
                      <span className={`badge ${
                        item.incidenceType === 'BONO NOCTURNO' ? 'badge-bono' :
                        item.incidenceType === 'DOMINGO' ? 'badge-domingo' :
                        item.incidenceType === 'FERIADO' ? 'badge-feriado' :
                        item.incidenceType === 'AUSENCIA JUSTIFICADA' ? 'badge-ausencia-j' :
                        'badge-ausencia-i'
                      }`}>
                        {item.incidenceType}
                      </span>
                    </td>
                    <td className="cell-value" style={{ fontWeight: '700' }}>{item.value}</td>
                    <td className="mono-num">{item.dateString}</td>
                    <td className="cell-status">{item.originalStatus}</td>
                    {!viewingHistoryId && (
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-action-delete"
                          title="Eliminar este registro"
                          aria-label={`Eliminar incidencia de ${item.employeeName}`}
                          onClick={() => onDeleteIncidence(activeSucursal, originalIndex)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span>
            Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sorted.length)} de {sorted.length} registros
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="btn-icon"
              disabled={currentPage === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <span>Página <strong>{currentPage}</strong> de {totalPages}</span>
            <button
              className="btn-icon"
              disabled={currentPage === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
