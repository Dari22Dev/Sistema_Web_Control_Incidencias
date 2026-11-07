import React from 'react';
import { Calendar, Plus } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function HolidayList({
  feriados,
  newFeriadoDate,
  setNewFeriadoDate,
  onAddFeriado,
  onRemoveFeriado,
  year,
  month,
  quincena,
  disabled
}) {
  const activeFeriadosInCorte = feriados.filter(dateStr => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    let startDay = 1, endDay = 15;
    if (quincena === 2) {
      startDay = 16;
      endDay = new Date(year, month + 1, 0).getDate();
    }
    return y === year && m === month && d >= startDay && d <= endDay;
  });

  return (
    <div className="glass-card">
      <h2 className="card-title">
        <Calendar size={18} /> Días Feriados
      </h2>
      <div className="feriados-container">
        <div className="feriados-input-row">
          <label htmlFor="holiday-date-picker" className="visually-hidden">Fecha del día feriado</label>
          <input
            id="holiday-date-picker"
            type="date"
            className="input-text"
            value={newFeriadoDate}
            onChange={(e) => setNewFeriadoDate(e.target.value)}
            style={{ flexGrow: 1 }}
            disabled={disabled}
            aria-label="Seleccionar fecha de feriado"
          />
          <button
            className="btn-icon"
            onClick={onAddFeriado}
            disabled={disabled}
            title="Agregar día feriado"
            aria-label="Agregar día feriado a la lista"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="feriados-tags" role="region" aria-label="Lista de feriados configurados">
          {feriados.length === 0 ? (
            <div className="feriados-empty">No hay días feriados registrados para este período.</div>
          ) : (
            feriados.map(date => {
              const [y, m, d] = date.split('-');
              return (
                <span key={date} className="feriado-tag">
                  {`${d}/${m}/${y}`}
                  {!disabled && (
                    <button
                      onClick={() => onRemoveFeriado(date)}
                      title={`Quitar feriado ${d}/${m}/${y}`}
                      aria-label={`Quitar feriado ${d}/${m}/${y}`}
                    >
                      &times;
                    </button>
                  )}
                </span>
              );
            })
          )}
        </div>

        <p className="section-note">
          Si un colaborador trabaja en estas fechas, se le computará la incidencia "FERIADO".
        </p>

        {activeFeriadosInCorte.length > 0 && (
          <div className="feriado-summary-box">
            <strong>Feriados activos en este corte:</strong> {activeFeriadosInCorte.map(d => d.split('-')[2]).join(', ')} de {MONTH_NAMES[month]}
          </div>
        )}
      </div>
    </div>
  );
}
