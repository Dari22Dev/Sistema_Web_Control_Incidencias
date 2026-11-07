import React, { useState, useEffect } from 'react';
import { X, Building2, BookOpen, ChevronRight, Check } from 'lucide-react';
import SucursalConfigForm from './SucursalConfigForm';
import { initSucursal } from '../utils/calculator';

export default function WelcomeTutorialModal({ isOpen, onClose, initialTab = 'tutorial', existingConfig, onSaveConfig }) {
  const [tab, setTab] = useState(initialTab);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [tempConfig, setTempConfig] = useState(() => (existingConfig || []).map(initSucursal));

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setTempConfig((existingConfig || []).map(initSucursal));
    }
  }, [isOpen, initialTab, existingConfig]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveAndClose = () => {
    localStorage.setItem('tutorial_viewed', 'true');
    onSaveConfig(tempConfig);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container modal-container--lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="header-logo" style={{ width: '32px', height: '32px' }}>
              <BookOpen size={18} />
            </div>
            <div>
              <h2 id="welcome-modal-title" style={{ margin: 0, fontSize: '1.2rem' }}>
                Guía de Uso y Configuración de Sedes
              </h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Sistema Corporativo de Auditoría y Control de Incidencias Laborales
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar ventana emergente">
            <X size={18} />
          </button>
        </div>

        {/* Pestañas Tutorial / Configuración */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', padding: '0 1.5rem', marginTop: '10px' }}>
          <button
            type="button"
            className={`tab-btn ${tab === 'tutorial' ? 'active' : ''}`}
            onClick={() => setTab('tutorial')}
          >
            <BookOpen size={14} /> Guía Paso a Paso
          </button>
          <button
            type="button"
            className={`tab-btn ${tab === 'config' ? 'active' : ''}`}
            onClick={() => setTab('config')}
          >
            <Building2 size={14} /> Configurar Sedes e Incidencias
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
          {tab === 'tutorial' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[1, 2, 3, 4].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTutorialStep(s)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      background: tutorialStep === s ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: tutorialStep === s ? '#000' : 'var(--text-primary)',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Paso {s}
                  </button>
                ))}
              </div>

              {tutorialStep === 1 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Paso 1: Configurar Sedes y Valores de Incidencia</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Personaliza las sedes u oficinas operativas de tu empresa y los valores asignados a cada turno
                    (cierre, presente, aperturas, redobles, domingos y feriados). El sistema respeta los lineamientos
                    específicos de cada sede.
                  </p>
                </div>
              )}

              {tutorialStep === 2 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Paso 2: Seleccionar el Período y Cargar Excel</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Indica el año, mes y quincena (1ra o 2da) a auditar. Luego arrastra tu archivo consolidado (.xlsx o .xls).
                    El sistema detectará automáticamente cédulas, códigos de colaborador, sucursales y columnas de fechas.
                  </p>
                </div>
              )}

              {tutorialStep === 3 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Paso 3: Auditoría y Detección Preventiva de Errores</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Al procesar las incidencias, la plataforma analiza cada celda:
                  </p>
                  <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8' }}>
                    <li><strong>Celdas no reconocidas:</strong> Te avisa si hay errores de tipografía (ej. "Prsente") para no perder bonos.</li>
                    <li><strong>Sedes no asignadas:</strong> Separa empleados cuyo texto de sede no coincida con la configuración.</li>
                    <li><strong>Colaboradores duplicados:</strong> Detecta registros duplicados en distintas filas.</li>
                  </ul>
                </div>
              )}

              {tutorialStep === 4 && (
                <div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Paso 4: Exportación a Excel y Persistencia en Base de Datos</h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    Descarga el reporte oficial en Excel con hojas formateadas por sede y una hoja consolidada de <strong>Resumen General</strong> para liquidación.
                    Si estás conectado, puedes guardar el corte en la base de datos relacional con registro de auditoría.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <SucursalConfigForm config={tempConfig} onChange={setTempConfig} />
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)' }}>
          {tab === 'tutorial' ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setTab('config')}
              >
                Ir a Configuración
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (tutorialStep < 4) setTutorialStep(s => s + 1);
                  else setTab('config');
                }}
              >
                {tutorialStep < 4 ? 'Siguiente Paso' : 'Configurar Sedes'} <ChevronRight size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveAndClose}
              >
                <Check size={16} /> Guardar Configuración
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
