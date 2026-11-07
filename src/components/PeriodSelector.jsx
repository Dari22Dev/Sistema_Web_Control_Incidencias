import React from 'react';
import { Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PeriodSelector({ year, setYear, month, setMonth, quincena, setQuincena, disabled }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="glass-card">
      <h2 className="card-title">
        <Calendar size={18} /> Período de Corte
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="config-group">
          <label htmlFor="period-year" className="field-label">Año Fiscal</label>
          <input
            id="period-year"
            type="number"
            className="input-text"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10) || currentYear)}
            min="2000"
            max="2100"
            disabled={disabled}
            aria-describedby="period-year-help"
          />
        </div>

        <div className="config-group">
          <label htmlFor="period-month" className="field-label">Mes</label>
          <select
            id="period-month"
            className="input-text"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value, 10))}
            disabled={disabled}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>{name}</option>
            ))}
          </select>
        </div>

        <div className="config-group">
          <label htmlFor="period-quincena" className="field-label">Quincena a Calcular</label>
          <select
            id="period-quincena"
            className="input-text"
            value={quincena}
            onChange={(e) => setQuincena(parseInt(e.target.value, 10))}
            disabled={disabled}
          >
            <option value={1}>1ra Quincena (01 al 15)</option>
            <option value={2}>2da Quincena (16 al fin de mes)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
