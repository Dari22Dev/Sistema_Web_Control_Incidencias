import React, { useState } from 'react';
import { FileSpreadsheet, Trash2, ShieldAlert, Sparkles, Eye } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function HistoryView({
  historyList,
  loadingHistory,
  onLoadHistoryItem,
  onDeleteHistoryItem,
  userRole
}) {
  const [selectedToDelete, setSelectedToDelete] = useState(null);

  const handleDeleteClick = (item, e) => {
    e.stopPropagation();
    setSelectedToDelete(item);
  };

  const confirmDelete = () => {
    if (selectedToDelete) {
      onDeleteHistoryItem(selectedToDelete.id);
      setSelectedToDelete(null);
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="card-title" style={{ margin: 0 }}>
          <FileSpreadsheet size={18} /> Historial de Salidas Guardadas en Base de Datos
        </h2>
      </div>

      {loadingHistory ? (
        <div className="empty-state">
          <Sparkles size={64} style={{ animation: 'spin 2s linear infinite', color: 'var(--primary)' }} />
          <h3>Consultando base de datos persistente...</h3>
          <p>Recuperando cortes quincenales y relaciones de incidencias...</p>
        </div>
      ) : historyList.length === 0 ? (
        <div className="empty-state">
          <ShieldAlert size={64} style={{ color: 'var(--text-tertiary)' }} />
          <h3>Historial vacío</h3>
          <p>No se han registrado cortes en la base de datos relacional todavía.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha de Registro</th>
                <th>Archivo de Origen</th>
                <th>Período</th>
                <th>Feriados</th>
                <th>Operador</th>
                <th style={{ textAlign: 'center' }}>Registros</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historyList.map((item) => {
                const savedDate = new Date(item.created_at).toLocaleString('es-ES', {
                  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
                const monthName = MONTH_NAMES[item.month];

                return (
                  <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => onLoadHistoryItem(item.id)}>
                    <td style={{ fontWeight: '500', color: 'var(--primary)' }}>{savedDate}</td>
                    <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.filename}
                    </td>
                    <td><strong>{monthName} {item.year}</strong> - Q{item.quincena}</td>
                    <td>
                      <span className="feriado-text" style={{ fontSize: '0.8rem', color: 'var(--warning, #eab308)' }}>
                        {item.feriados && item.feriados.length > 0
                          ? item.feriados.map(d => String(d).split('-')[2]).join(', ')
                          : 'Ninguno'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.created_by || 'admin'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '700' }}>
                      {item.total_registros}
                    </td>
                    <td>
                      <div className="row-actions" style={{ justifyContent: 'center' }}>
                        <button
                          className="btn-table"
                          onClick={(e) => { e.stopPropagation(); onLoadHistoryItem(item.id); }}
                          title="Cargar y consultar este corte"
                        >
                          <Eye size={13} style={{ marginRight: '3px' }} /> Ver
                        </button>
                        {userRole === 'admin' && (
                          <button
                            className="btn-table-danger"
                            onClick={(e) => handleDeleteClick(item, e)}
                            title="Eliminar permanentemente de la base de datos"
                            aria-label={`Eliminar corte del archivo ${item.filename}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de confirmación para eliminar */}
      <ConfirmModal
        isOpen={selectedToDelete !== null}
        title="¿Eliminar corte del historial?"
        message={
          selectedToDelete
            ? `¿Estás seguro de que deseas eliminar permanentemente el corte "${selectedToDelete.filename}" del período ${MONTH_NAMES[selectedToDelete.month]} ${selectedToDelete.year} (Q${selectedToDelete.quincena}) con sus ${selectedToDelete.total_registros} incidencias asociadas? Esta acción no se puede deshacer.`
            : ''
        }
        confirmText="Sí, eliminar corte"
        cancelText="Cancelar"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setSelectedToDelete(null)}
      />
    </div>
  );
}
