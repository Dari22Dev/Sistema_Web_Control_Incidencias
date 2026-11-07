import React, { useState } from 'react';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { SUGGESTED_INCIDENCIAS } from '../utils/calculator';

export default function SucursalConfigForm({ config, onChange }) {
  const [activeTab, setActiveTab] = useState(0);

  const handleAddSucursal = () => {
    const nextIdx = config.length + 1;
    const newSuc = {
      name: `Sede ${nextIdx}`,
      incidenciasList: [
        { id: '1', name: 'Turno Cierre', type: 'cierre', value: 3 },
        { id: '2', name: 'Presente Regular', type: 'presente', value: 2 },
        { id: '3', name: 'Domingos Trabajados', type: 'domingo', value: 1 },
        { id: '4', name: 'Feriados Trabajados', type: 'feriado', value: 1 },
        { id: '5', name: 'Ausencias Justificadas', type: 'ausenciaJustificada', value: 1 },
        { id: '6', name: 'Ausencias Injustificadas', type: 'ausenciaInjustificada', value: 1 }
      ]
    };
    const updated = [...config, newSuc];
    onChange(updated);
    setActiveTab(updated.length - 1);
  };

  const handleRemoveSucursal = (idx) => {
    if (config.length <= 1) return;
    const updated = config.filter((_, i) => i !== idx);
    onChange(updated);
    setActiveTab(prev => Math.min(prev, updated.length - 1));
  };

  const handleUpdateSucursalName = (idx, name) => {
    const updated = [...config];
    updated[idx] = { ...updated[idx], name };
    onChange(updated);
  };

  const currentSucursal = config[activeTab] || config[0];

  const handleAddIncidenceFromSuggestion = (sug) => {
    if (!currentSucursal) return;
    const exists = currentSucursal.incidenciasList.some(i => i.type === sug.type && i.type !== 'custom');
    if (exists) return;

    const newItem = {
      id: String(Date.now()),
      name: sug.name,
      type: sug.type,
      value: sug.value
    };

    const updatedSuc = {
      ...currentSucursal,
      incidenciasList: [...currentSucursal.incidenciasList, newItem]
    };

    const updated = [...config];
    updated[activeTab] = updatedSuc;
    onChange(updated);
  };

  const handleRemoveIncidence = (incId) => {
    if (!currentSucursal) return;
    const updatedSuc = {
      ...currentSucursal,
      incidenciasList: currentSucursal.incidenciasList.filter(i => i.id !== incId)
    };
    const updated = [...config];
    updated[activeTab] = updatedSuc;
    onChange(updated);
  };

  const handleUpdateIncidenceValue = (incId, val) => {
    if (!currentSucursal) return;
    const num = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    const updatedSuc = {
      ...currentSucursal,
      incidenciasList: currentSucursal.incidenciasList.map(i => i.id === incId ? { ...i, value: num } : i)
    };
    const updated = [...config];
    updated[activeTab] = updatedSuc;
    onChange(updated);
  };

  return (
    <div className="sucursal-config-form">
      {/* Pestañas de Sucursales */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', flexWrap: 'wrap' }}>
          {config.map((suc, idx) => (
            <button
              key={idx}
              type="button"
              className={`sucursal-tab ${activeTab === idx ? 'active' : ''}`}
              onClick={() => setActiveTab(idx)}
            >
              <Building2 size={14} style={{ marginRight: '4px' }} />
              {suc.name || `Sede ${idx + 1}`}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleAddSucursal}
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
        >
          <Plus size={14} /> Nueva Sede
        </button>
      </div>

      {currentSucursal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Nombre de la Sede */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ flexGrow: 1 }}>
              <label htmlFor={`suc-name-${activeTab}`} className="field-label">Nombre de la Sede / Sucursal</label>
              <input
                id={`suc-name-${activeTab}`}
                type="text"
                className="input-text"
                value={currentSucursal.name}
                onChange={(e) => handleUpdateSucursalName(activeTab, e.target.value)}
                placeholder="Ej. Sambil, La Vela, Central..."
                required
              />
            </div>
            {config.length > 1 && (
              <button
                type="button"
                className="btn-danger"
                onClick={() => handleRemoveSucursal(activeTab)}
                style={{ alignSelf: 'flex-end', height: '40px' }}
                title="Eliminar esta sucursal"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Sugerencias Rápidas para Añadir */}
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Incidencias Disponibles para Agregar:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SUGGESTED_INCIDENCIAS.map(sug => {
                const isAdded = currentSucursal.incidenciasList.some(i => i.type === sug.type && i.type !== 'custom');
                return (
                  <button
                    key={sug.id}
                    type="button"
                    className={`btn-tag ${isAdded ? 'btn-tag--added' : ''}`}
                    onClick={() => !isAdded && handleAddIncidenceFromSuggestion(sug)}
                    disabled={isAdded}
                    style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', cursor: isAdded ? 'default' : 'pointer' }}
                  >
                    {isAdded ? '✓ ' : '+ '}
                    {sug.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Incidencias Activas en esta Sede */}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Concepto / Incidencia</th>
                  <th>Tipo Interno</th>
                  <th style={{ width: '130px' }}>Valor / Bono</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Quitar</th>
                </tr>
              </thead>
              <tbody>
                {currentSucursal.incidenciasList.map(item => (
                  <tr key={item.id}>
                    <td><strong>{item.name}</strong></td>
                    <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>{item.type}</td>
                    <td>
                      <input
                        type="number"
                        className="input-text"
                        value={item.value}
                        onChange={(e) => handleUpdateIncidenceValue(item.id, e.target.value)}
                        min="0"
                        step="0.5"
                        style={{ width: '90px', padding: '4px 8px', textAlign: 'center' }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        className="btn-action-delete"
                        onClick={() => handleRemoveIncidence(item.id)}
                        title={`Quitar ${item.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
