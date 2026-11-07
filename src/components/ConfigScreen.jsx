import React, { useState } from 'react';
import { Settings, Check, ArrowLeft, Sun, Moon } from 'lucide-react';
import SucursalConfigForm from './SucursalConfigForm';
import { initSucursal } from '../utils/calculator';

export default function ConfigScreen({ onSave, existingConfig, onCancel, toggleTheme, theme }) {
  const [config, setConfig] = useState(() => (existingConfig || []).map(initSucursal));

  return (
    <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
      <header className="app-header" style={{ marginBottom: '1.5rem' }}>
        <div className="header-title-container">
          <div className="header-logo">
            <Settings size={22} />
          </div>
          <div className="header-title">
            <h1>Configuración de Sedes e Incidencias</h1>
            <p>Personaliza nombres de sucursales, conceptos y valores de bonos</p>
          </div>
        </div>

        <div className="app-header-actions">
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <SucursalConfigForm config={config} onChange={setConfig} />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          {onCancel && (
            <button type="button" className="btn-secondary" onClick={onCancel}>
              <ArrowLeft size={16} /> Volver
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => onSave(config)}>
            <Check size={16} /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
}
