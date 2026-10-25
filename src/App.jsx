import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Calendar,
  Download,
  Search,
  Plus,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Sun,
  Moon,
  Settings,
  Building2,
  ChevronLeft,
  BookOpen,
  HelpCircle,
  X,
  Check
} from 'lucide-react';
import { processIncidencias, DEFAULT_SUCURSALES_CONFIG, SUGGESTED_INCIDENCIAS, normalizeConfig } from './utils/calculator';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DEFAULT_SUCURSAL_TEMPLATE = {
  name: '',
  incidencias: {
    cierre: true,
    redoble: true,
    presente: true,
    apertura: true,
    domingo: true,
    feriado: true,
    ausenciaJustificada: true,
    ausenciaInjustificada: true,
    reposo: false
  },
  bonoCierre: 3,
  bonoRedoble: 3,
  bonoPresente: 2,
  bonoApertura: 0,
  bonoDomingo: 1,
  valorDomingo: 1,
  valorFeriado: 1,
  valorAusenciaJ: 1,
  valorAusenciaI: 1,
  valorReposo: 1
};

const INCIDENCE_DEFINITIONS = [
  { key: 'presente', label: 'Presente / Turno Regular', valField: 'bonoPresente', valLabel: 'Bono Noct.' },
  { key: 'cierre', label: 'Turno Cierre', valField: 'bonoCierre', valLabel: 'Bono Noct.' },
  { key: 'redoble', label: 'Redoble / Especial / H. Extra', valField: 'bonoRedoble', valLabel: 'Bono Noct.' },
  { key: 'apertura', label: 'Turno Apertura', valField: 'bonoApertura', valLabel: 'Bono Noct.' },
  { key: 'domingo', label: 'Domingos Trabajados', valField: 'bonoDomingo', valLabel: 'Bono Dom.' },
  { key: 'feriado', label: 'Feriados Trabajados', valField: 'valorFeriado', valLabel: 'Valor', isFeriado: true },
  { key: 'ausenciaJustificada', label: 'Ausencias Justificadas', valField: 'valorAusenciaJ', valLabel: 'Valor' },
  { key: 'ausenciaInjustificada', label: 'Ausencias Injustificadas', valField: 'valorAusenciaI', valLabel: 'Valor' },
  { key: 'reposo', label: 'Reposos Médicos', valField: 'valorReposo', valLabel: 'Valor' }
];

// Paleta de colores para cada sucursal en Excel exportado
const SUCURSAL_COLORS = [
  { headerBg: 'B4C6E7', cellBg: 'DDEBF7' },
  { headerBg: 'C6E0B4', cellBg: 'E2EFDA' },
  { headerBg: 'FFE0B2', cellBg: 'FFF3E0' },
  { headerBg: 'E1BEE7', cellBg: 'F3E5F5' },
  { headerBg: 'B2EBF2', cellBg: 'E0F7FA' }
];

// ─── Custom Dropdown ────────────────────────────────────────────────────────
function CustomDropdown({ label, value, options, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="config-group" style={{ marginBottom: 0, position: 'relative' }} ref={dropdownRef}>
      <label style={{ fontSize: '14px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{label}</label>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: disabled ? 'var(--surface-muted)' : 'var(--bg-input)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          color: 'var(--text-primary)',
          fontFamily: 'inherit',
          fontSize: '0.9rem',
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'all 0.3s'
        }}
        className={!disabled ? 'custom-dropdown-trigger' : ''}
      >
        <span>{selectedOption ? selectedOption.label : ''}</span>
        <span style={{
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.65rem'
        }}>▼</span>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 5px)',
            left: 0,
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            boxShadow: 'var(--shadow-3)',
            zIndex: 1000,
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '0.35rem 0'
          }}
          className="custom-dropdown-menu"
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              style={{
                padding: '0.6rem 1rem',
                color: opt.value === value ? 'var(--primary-active)' : 'var(--text-primary)',
                background: opt.value === value ? 'var(--primary-soft)' : 'transparent',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                fontWeight: opt.value === value ? '600' : '400'
              }}
              className="custom-dropdown-item"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer>
      <div className="footer-meta">
        <span className="footer-brand">Desarrollado por DariDev &copy; 2026</span>
        <span className="footer-version">Control de Incidencias · V.2</span>
      </div>

      <div className="footer-contact">
        <span className="footer-label">Contacto</span>
        <a
          href="https://wa.me/584161978651"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'rgba(37, 211, 102, 0.12)',
            border: '1px solid rgba(37, 211, 102, 0.28)',
            color: '#1FA855',
            textDecoration: 'none'
          }}
          className="whatsapp-contact-link"
          title="Contactar por WhatsApp"
          aria-label="Contactar por WhatsApp"
        >
          <svg style={{ width: '18px', height: '18px', fill: 'currentColor' }} viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.63 1.97 14.152.946 11.517.946c-5.44 0-9.866 4.372-9.87 9.802 0 1.814.48 3.59 1.39 5.169l-.95 3.473 3.56-.934zM16.621 13.568c-.27-.135-1.597-.788-1.848-.88-.25-.091-.433-.135-.615.135-.183.27-.707.88-.867 1.062-.16.183-.32.203-.59.068-1.523-.762-2.482-1.282-3.44-2.933-.254-.438.254-.407.727-1.353.079-.162.04-.304-.02-.439-.06-.135-.513-1.233-.7-1.69-.183-.448-.37-.387-.514-.395-.133-.007-.285-.008-.438-.008-.153 0-.402.058-.613.286-.212.228-.809.79-.809 1.927 0 1.137.828 2.235.942 2.387.114.152 1.63 2.49 3.95 3.49.55.237 1.002.39 1.343.498.552.176 1.053.151 1.448.092.44-.066 1.353-.553 1.543-1.085.19-.53.19-.986.133-1.082-.057-.096-.212-.152-.482-.288z"/>
          </svg>
        </a>
      </div>
    </footer>
  );
}

// ─── Inicializador de Sucursal e Incidencias ────────────────────────────────
function initSucursal(s, idx = 0) {
  const base = {
    ...DEFAULT_SUCURSAL_TEMPLATE,
    ...s,
    incidencias: {
      ...DEFAULT_SUCURSAL_TEMPLATE.incidencias,
      ...(s.incidencias || {})
    }
  };

  let list = [];
  if (Array.isArray(s.incidenciasList) && s.incidenciasList.length > 0) {
    list = s.incidenciasList.map(item => ({ ...item }));
  } else {
    if (base.incidencias?.cierre !== false) list.push({ id: `cier_${idx}_1`, name: 'Turno Cierre', type: 'cierre', value: base.bonoCierre ?? 3 });
    if (base.incidencias?.redoble !== false) list.push({ id: `redo_${idx}_2`, name: 'Redoble / Especial', type: 'redoble', value: base.bonoRedoble ?? 3 });
    if (base.incidencias?.presente !== false) list.push({ id: `pres_${idx}_3`, name: 'Presente Regular', type: 'presente', value: base.bonoPresente ?? 2 });
    if (base.incidencias?.apertura !== false) list.push({ id: `aper_${idx}_4`, name: 'Turno Apertura', type: 'apertura', value: base.bonoApertura ?? 0 });
    if (base.incidencias?.domingo !== false) list.push({ id: `dom_${idx}_5`, name: 'Domingos Trabajados', type: 'domingo', value: base.bonoDomingo ?? 1 });
    if (base.incidencias?.feriado !== false) list.push({ id: `fer_${idx}_6`, name: 'Feriados Trabajados', type: 'feriado', value: base.valorFeriado ?? 1 });
    if (base.incidencias?.ausenciaJustificada !== false) list.push({ id: `aj_${idx}_7`, name: 'Ausencias Justificadas', type: 'ausenciaJustificada', value: base.valorAusenciaJ ?? 1 });
    if (base.incidencias?.ausenciaInjustificada !== false) list.push({ id: `ai_${idx}_8`, name: 'Ausencias Injustificadas', type: 'ausenciaInjustificada', value: base.valorAusenciaI ?? 1 });
    if (base.incidencias?.reposo === true) list.push({ id: `rep_${idx}_9`, name: 'Reposos Médicos', type: 'reposo', value: base.valorReposo ?? 1 });
  }

  return {
    ...base,
    incidenciasList: list
  };
}

// ─── Modal Emergente de Bienvenida, Tutorial y Configuración Inicial ─────────
function WelcomeTutorialModal({ isOpen, onClose, initialTab = 'tutorial', existingConfig, onSaveConfig }) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [sucursales, setSucursales] = useState(() => {
    const list = existingConfig && existingConfig.length > 0 ? existingConfig : DEFAULT_SUCURSALES_CONFIG;
    return list.map((s, idx) => initSucursal(s, idx));
  });

  const handleNameChange = (sucIdx, value) => {
    setSucursales(prev => prev.map((s, i) => i === sucIdx ? { ...s, name: value } : s));
  };

  const handleIncidenceNameChange = (sucIdx, itemIdx, value) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      const newList = [...s.incidenciasList];
      newList[itemIdx] = { ...newList[itemIdx], name: value };
      return { ...s, incidenciasList: newList };
    }));
  };

  const handleIncidenceValueChange = (sucIdx, itemIdx, value) => {
    const num = Number(value);
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      const newList = [...s.incidenciasList];
      newList[itemIdx] = { ...newList[itemIdx], value: isNaN(num) ? 0 : num };
      return { ...s, incidenciasList: newList };
    }));
  };

  const handleRemoveIncidence = (sucIdx, itemIdx) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      return { ...s, incidenciasList: s.incidenciasList.filter((_, idx) => idx !== itemIdx) };
    }));
  };

  const handleAddCustomIncidence = (sucIdx) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      return {
        ...s,
        incidenciasList: [
          ...s.incidenciasList,
          { id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: 'Nueva Incidencia', type: 'custom', value: 1 }
        ]
      };
    }));
  };

  const handleAddSuggestedIncidence = (sucIdx, sugg) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      return {
        ...s,
        incidenciasList: [
          ...s.incidenciasList,
          { id: `${sugg.type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: sugg.name, type: sugg.type, value: sugg.value }
        ]
      };
    }));
  };

  const handleAddBranch = () => {
    setSucursales(prev => [
      ...prev,
      initSucursal({ name: `Sucursal ${prev.length + 1}` }, prev.length)
    ]);
  };

  const handleRemoveBranch = (sucIdx) => {
    if (sucursales.length <= 1) return;
    setSucursales(prev => prev.filter((_, i) => i !== sucIdx));
  };

  const handleSaveAndStart = () => {
    const valid = sucursales
      .filter(s => s.name.trim() !== '')
      .map(s => normalizeConfig(s));
    
    if (valid.length === 0) return;
    localStorage.setItem('tutorial_viewed', 'true');
    onSaveConfig(valid);
    onClose();
  };

  return (
    <div className="welcome-modal-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="welcome-modal-header">
          <div className="welcome-modal-title">
            <div className="welcome-modal-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Bienvenido al Control de Incidencias Laborales
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Sistema corporativo de cómputo y auditoría de asistencias
              </p>
            </div>
          </div>
          <button className="btn-action-delete" onClick={onClose} aria-label="Cerrar modal">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="welcome-modal-tabs">
          <button
            className={`welcome-modal-tab ${activeTab === 'tutorial' ? 'active' : ''}`}
            onClick={() => setActiveTab('tutorial')}
          >
            <BookOpen size={16} /> Guía y Tutorial de Uso
          </button>
          <button
            className={`welcome-modal-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Building2 size={16} /> Sedes e Incidencias ({sucursales.length})
          </button>
        </div>

        {/* Body */}
        <div className="welcome-modal-body">
          {activeTab === 'tutorial' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ padding: '14px 18px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Bienvenido al sistema corporativo de <strong>Control de Incidencias</strong>. Este software audita automáticamente planillas quincenales, calculando bonos nocturnos, turnos especiales, feriados, domingos y ausencias de forma segura, rápida y con soporte multi-sede sin credenciales maestras.
                </p>
              </div>

              <div className="tutorial-grid">
                <div className="tutorial-step-card">
                  <div className="tutorial-step-header">
                    <span className="tutorial-step-number">1</span>
                    <span className="tutorial-step-title">Carga de Planilla Excel</span>
                  </div>
                  <p className="tutorial-step-desc">
                    Arrastra o selecciona el archivo <code>.xlsx</code> o <code>.xls</code> quincenal. El sistema reconocerá automáticamente colaboradores, cédulas, códigos y columnas de asistencia diaria.
                  </p>
                </div>

                <div className="tutorial-step-card">
                  <div className="tutorial-step-header">
                    <span className="tutorial-step-number">2</span>
                    <span className="tutorial-step-title">Período y Días Feriados</span>
                  </div>
                  <p className="tutorial-step-desc">
                    Selecciona el año, mes y la quincena (1ra o 2da). Anexa las fechas de días feriados oficiales aplicables para que los turnos laborados se computen como feriados.
                  </p>
                </div>

                <div className="tutorial-step-card">
                  <div className="tutorial-step-header">
                    <span className="tutorial-step-number">3</span>
                    <span className="tutorial-step-title">Sedes e Incidencias</span>
                  </div>
                  <p className="tutorial-step-desc">
                    Define las sucursales a trabajar (ej. Sambil, La Vela) y asigna tus propias incidencias y valores usando el botón <strong>+</strong> o las sugerencias rápidas.
                  </p>
                </div>

                <div className="tutorial-step-card">
                  <div className="tutorial-step-header">
                    <span className="tutorial-step-number">4</span>
                    <span className="tutorial-step-title">Auditoría y Exportación</span>
                  </div>
                  <p className="tutorial-step-desc">
                    Revisa las métricas y tablas interactivas, audita o elimina registros individuales y genera el libro oficial de Excel con pestañas por sucursal o guárdalo en la base de datos.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Configuración de Sucursales y Reglas de Incidencias
                  </h3>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ingresa las sucursales con las que vas a operar y define los nombres y valores de las incidencias.
                  </p>
                </div>
                <button className="btn-add-branch" onClick={handleAddBranch} style={{ padding: '8px 14px', fontSize: '12.5px' }}>
                  <Plus size={15} /> Agregar Sucursal
                </button>
              </div>

              {sucursales.map((suc, sucIdx) => {
                const hasFeriado = suc.incidenciasList.some(i => i.type === 'feriado' || i.name.toLowerCase().includes('feriado'));

                return (
                  <div key={sucIdx} className="config-sucursal-card" style={{ padding: '18px' }}>
                    <div className="config-card-head" style={{ marginBottom: '14px' }}>
                      <div className="config-card-title">
                        <Building2 size={18} />
                        <span>Sucursal #{sucIdx + 1}</span>
                        <span className="config-count">{suc.name.trim() || 'Sin nombre'}</span>
                      </div>
                      {sucursales.length > 1 && (
                        <button className="btn-danger-soft" onClick={() => handleRemoveBranch(sucIdx)}>
                          <Trash2 size={13} /> Eliminar
                        </button>
                      )}
                    </div>

                    <div className="config-group" style={{ marginBottom: '14px' }}>
                      <label className="field-label">Nombre de la Sede / Sucursal *</label>
                      <input
                        type="text"
                        className="input-text"
                        placeholder="Ej: Sambil, La Vela, Tienda Centro..."
                        value={suc.name}
                        onChange={e => handleNameChange(sucIdx, e.target.value)}
                      />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <label className="field-label" style={{ marginBottom: 0 }}>
                          Incidencias y Valores ({suc.incidenciasList.length})
                        </label>
                        <button
                          type="button"
                          className="btn-header"
                          onClick={() => handleAddCustomIncidence(sucIdx)}
                          style={{ fontSize: '12px', padding: '4px 10px' }}
                        >
                          <Plus size={14} /> Anexar Incidencia
                        </button>
                      </div>

                      {suc.incidenciasList.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                          No hay incidencias para esta sucursal. Haz clic en "Anexar Incidencia" o utiliza las sugerencias.
                        </div>
                      ) : (
                        <div>
                          {suc.incidenciasList.map((item, itemIdx) => (
                            <div key={item.id || itemIdx} className="custom-incidence-row">
                              <input
                                type="text"
                                className="input-text"
                                style={{ height: '34px', fontSize: '13px' }}
                                placeholder="Nombre de la incidencia (ej: Turno Cierre)"
                                value={item.name}
                                onChange={e => handleIncidenceNameChange(sucIdx, itemIdx, e.target.value)}
                              />
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>VAL:</span>
                                <input
                                  type="number"
                                  className="incidence-value-input"
                                  style={{ height: '34px', width: '60px' }}
                                  min="0"
                                  max="20"
                                  step="1"
                                  value={item.value ?? 0}
                                  onChange={e => handleIncidenceValueChange(sucIdx, itemIdx, e.target.value)}
                                />
                              </div>
                              <button
                                type="button"
                                className="btn-action-delete"
                                onClick={() => handleRemoveIncidence(sucIdx, itemIdx)}
                                title="Eliminar incidencia"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sugerencias Rápidas */}
                      <div className="suggestions-container">
                        <span className="suggestions-title">Sugerencias habituales (haz clic para anexar a esta sucursal):</span>
                        <div className="suggestions-chips">
                          {SUGGESTED_INCIDENCIAS.map(sugg => (
                            <button
                              key={sugg.id}
                              type="button"
                              className="suggestion-chip"
                              onClick={() => handleAddSuggestedIncidence(sucIdx, sugg)}
                            >
                              <Plus size={12} /> {sugg.name} <span style={{ opacity: 0.75, fontSize: '11px' }}>({sugg.value})</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {hasFeriado && (
                        <div className="feriado-notice-box" style={{ marginTop: '10px' }}>
                          <Calendar size={15} style={{ flexShrink: 0 }} />
                          <span>
                            <strong>Feriados activos:</strong> Los turnos laborados en días feriados registrados se calcularán con este concepto automáticamente.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="welcome-modal-footer">
          {activeTab === 'tutorial' ? (
            <>
              <button className="btn-ghost" onClick={onClose}>
                Entendido, ir al Dashboard
              </button>
              <button className="btn-primary" onClick={() => setActiveTab('config')}>
                Configurar Sedes e Incidencias ➔
              </button>
            </>
          ) : (
            <>
              <button className="btn-ghost" onClick={() => setActiveTab('tutorial')}>
                ← Volver a la Guía
              </button>
              <button className="btn-primary" onClick={handleSaveAndStart} disabled={!sucursales.some(s => s.name.trim() !== '')}>
                <Check size={16} /> Guardar Sedes y Comenzar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pantalla de Configuración de Sucursales ────────────────────────────────
function ConfigScreen({ onSave, existingConfig, onCancel, toggleTheme, theme }) {
  const [sucursales, setSucursales] = useState(() => {
    const list = existingConfig && existingConfig.length > 0 ? existingConfig : DEFAULT_SUCURSALES_CONFIG;
    return list.map((s, idx) => initSucursal(s, idx));
  });

  const handleNameChange = (sucIdx, value) => {
    setSucursales(prev => prev.map((s, i) => i === sucIdx ? { ...s, name: value } : s));
  };

  const handleIncidenceNameChange = (sucIdx, itemIdx, value) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      const newList = [...s.incidenciasList];
      newList[itemIdx] = { ...newList[itemIdx], name: value };
      return { ...s, incidenciasList: newList };
    }));
  };

  const handleIncidenceValueChange = (sucIdx, itemIdx, value) => {
    const num = Number(value);
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      const newList = [...s.incidenciasList];
      newList[itemIdx] = { ...newList[itemIdx], value: isNaN(num) ? 0 : num };
      return { ...s, incidenciasList: newList };
    }));
  };

  const handleRemoveIncidence = (sucIdx, itemIdx) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      return { ...s, incidenciasList: s.incidenciasList.filter((_, idx) => idx !== itemIdx) };
    }));
  };

  const handleAddCustomIncidence = (sucIdx) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      return {
        ...s,
        incidenciasList: [
          ...s.incidenciasList,
          { id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: 'Nueva Incidencia', type: 'custom', value: 1 }
        ]
      };
    }));
  };

  const handleAddSuggestedIncidence = (sucIdx, sugg) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== sucIdx) return s;
      return {
        ...s,
        incidenciasList: [
          ...s.incidenciasList,
          { id: `${sugg.type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, name: sugg.name, type: sugg.type, value: sugg.value }
        ]
      };
    }));
  };

  const handleAdd = () => {
    setSucursales(prev => [
      ...prev,
      initSucursal({ name: `Sucursal ${prev.length + 1}` }, prev.length)
    ]);
  };

  const handleRemove = (idx) => {
    if (sucursales.length <= 1) return;
    setSucursales(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const valid = sucursales
      .filter(s => s.name.trim() !== '')
      .map(s => normalizeConfig(s));
    if (valid.length === 0) return;
    onSave(valid);
  };

  const isValid = sucursales.some(s => s.name.trim() !== '');

  return (
    <div className="container" style={{ justifyContent: 'flex-start', paddingTop: '1.25rem' }}>
      <header className="app-header">
        <div className="header-title-container">
          <div className="header-logo"><Building2 size={24} /></div>
          <div className="header-title">
            <h1>Configuración de Sucursales</h1>
            <p>Define sucursales, incidencias personalizadas a computar y sus valores</p>
          </div>
        </div>
        <div className="app-header-actions">
          {onCancel && (
            <button className="btn-header" onClick={onCancel}>
              <ChevronLeft size={15} /> Volver
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <Sun className="sun-icon" size={18} /> : <Moon className="moon-icon" size={18} />}
          </button>
        </div>
      </header>

      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '24px' }}>
        {sucursales.map((suc, sucIdx) => {
          const hasFeriadoActive = suc.incidenciasList.some(i => i.type === 'feriado' || i.name.toLowerCase().includes('feriado'));

          return (
            <div key={sucIdx} className="config-sucursal-card">
              <div className="config-card-head">
                <div className="config-card-title">
                  <Building2 size={18} />
                  <span>Sucursal #{sucIdx + 1}</span>
                  <span className="config-count">{suc.name.trim() ? 'Configurada' : 'Sin nombre'}</span>
                </div>
                {sucursales.length > 1 && (
                  <button className="btn-danger-soft" onClick={() => handleRemove(sucIdx)}>
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
              </div>

              <div className="config-group" style={{ marginBottom: '14px' }}>
                <label className="field-label">Nombre de la sucursal *</label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Ej: Sambil, La Vela, Tienda Central..."
                  value={suc.name}
                  onChange={e => handleNameChange(sucIdx, e.target.value)}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="field-label" style={{ marginBottom: 0 }}>
                    Incidencias y valores a computar ({suc.incidenciasList.length})
                  </label>
                  <button
                    type="button"
                    className="btn-header"
                    onClick={() => handleAddCustomIncidence(sucIdx)}
                    style={{ fontSize: '12px', padding: '4px 10px' }}
                  >
                    <Plus size={14} /> Anexar Incidencia
                  </button>
                </div>

                {suc.incidenciasList.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)' }}>
                    No hay incidencias para esta sucursal. Haz clic en "Anexar Incidencia" o utiliza las sugerencias.
                  </div>
                ) : (
                  <div>
                    {suc.incidenciasList.map((item, itemIdx) => (
                      <div key={item.id || itemIdx} className="custom-incidence-row">
                        <input
                          type="text"
                          className="input-text"
                          style={{ height: '34px', fontSize: '13px' }}
                          placeholder="Nombre de la incidencia (ej: Turno Cierre)"
                          value={item.name}
                          onChange={e => handleIncidenceNameChange(sucIdx, itemIdx, e.target.value)}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>VAL:</span>
                          <input
                            type="number"
                            className="incidence-value-input"
                            style={{ height: '34px', width: '60px' }}
                            min="0"
                            max="20"
                            step="1"
                            value={item.value ?? 0}
                            onChange={e => handleIncidenceValueChange(sucIdx, itemIdx, e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-action-delete"
                          onClick={() => handleRemoveIncidence(sucIdx, itemIdx)}
                          title="Eliminar incidencia"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="suggestions-container">
                  <span className="suggestions-title">Sugerencias habituales (haz clic para anexar a esta sucursal):</span>
                  <div className="suggestions-chips">
                    {SUGGESTED_INCIDENCIAS.map(sugg => (
                      <button
                        key={sugg.id}
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleAddSuggestedIncidence(sucIdx, sugg)}
                      >
                        <Plus size={12} /> {sugg.name} <span style={{ opacity: 0.75, fontSize: '11px' }}>({sugg.value})</span>
                      </button>
                    ))}
                  </div>
                </div>

                {hasFeriadoActive && (
                  <div className="feriado-notice-box" style={{ marginTop: '12px' }}>
                    <Calendar size={15} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Feriados activados:</strong> El sistema validará los días feriados registrados para computar los turnos correspondientes.
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button onClick={handleAdd} className="btn-add-branch">
          <Plus size={18} /> Agregar otra sucursal
        </button>

        <div className="config-actions">
          {onCancel && (
            <button onClick={onCancel} className="btn-ghost">
              Cancelar
            </button>
          )}
          <button onClick={handleSave} className="btn-primary" disabled={!isValid}>
            <CheckCircle2 size={18} /> Guardar configuración e iniciar
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ─── App Principal ──────────────────────────────────────────────────────────
function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  });

  const toggleTheme = () => setTheme(prev => {
    const next = prev === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    return next;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Configuración de sucursales (persistida en localStorage) ──
  const loadSucursalesConfig = () => {
    try {
      const saved = localStorage.getItem('sucursales_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { /* ignorar */ }
    return DEFAULT_SUCURSALES_CONFIG;
  };

  const [sucursalesConfig, setSucursalesConfig] = useState(loadSucursalesConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => {
    return !localStorage.getItem('tutorial_viewed');
  });
  const [welcomeModalTab, setWelcomeModalTab] = useState('tutorial');

  const handleSaveConfig = (config) => {
    setSucursalesConfig(config);
    localStorage.setItem('sucursales_config', JSON.stringify(config));
    // Resetear incidencias al cambiar config
    resetIncidencias(config);
    setShowConfig(false);
    setShowWelcomeModal(false);
  };

  // ── Estado de datos ──
  const today = new Date();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [rawData, setRawData] = useState([]);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [quincena, setQuincena] = useState(today.getDate() <= 15 ? 1 : 2);
  const [feriados, setFeriados] = useState([]);
  const [newFeriadoDate, setNewFeriadoDate] = useState('');

  const buildEmptyIncidencias = (config) => {
    const obj = {};
    (config || sucursalesConfig || []).forEach(s => { obj[s.name] = []; });
    return obj;
  };

  const [incidencias, setIncidencias] = useState(() => buildEmptyIncidencias(loadSucursalesConfig()));

  const resetIncidencias = (config) => {
    setIncidencias(buildEmptyIncidencias(config));
    setActiveSucursal((config || [])[0]?.name || '');
    setCalculatedRawData([]);
    setFile(null);
    setRawData([]);
  };

  const [activeSucursal, setActiveSucursal] = useState(() => loadSucursalesConfig()?.[0]?.name || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [toasts, setToasts] = useState([]);

  // Estados para historial
  const [currentView, setCurrentView] = useState('live');
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewingHistoryId, setViewingHistoryId] = useState(null);
  const [historyFilename, setHistoryFilename] = useState('');
  const [saving, setSaving] = useState(false);
  const [calculatedRawData, setCalculatedRawData] = useState([]);

  // ── Helpers ──
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ── File handling ──
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (fileObj) => {
    if (!fileObj.name.endsWith('.xlsx') && !fileObj.name.endsWith('.xls')) {
      showToast('Por favor, selecciona un archivo Excel (.xlsx o .xls)', 'error');
      return;
    }
    setLoading(true);
    setFile({ name: fileObj.name, size: fileObj.size });
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (jsonData.length < 2) throw new Error('El archivo Excel no parece contener suficientes datos o filas.');
        setRawData(jsonData);
        setCalculatedRawData([]);
        setIncidencias(buildEmptyIncidencias());
        showToast('Archivo Excel cargado exitosamente. Presiona "Procesar Incidencias" para calcular.', 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al leer el archivo Excel: ' + err.message, 'error');
        setFile(null);
        setRawData([]);
        setCalculatedRawData([]);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { showToast('Error de lectura del archivo.', 'error'); setLoading(false); };
    reader.readAsArrayBuffer(fileObj);
  };

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setRawData([]);
    setCalculatedRawData([]);
    setIncidencias(buildEmptyIncidencias());
    showToast('Archivo removido.', 'success');
  };

  // ── Feriados ──
  const handleAddFeriado = () => {
    if (!newFeriadoDate) return;
    const parts = newFeriadoDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      let startDay = 1, endDay = 15;
      if (quincena === 2) { startDay = 16; endDay = new Date(year, month + 1, 0).getDate(); }
      if (y !== year || m !== month || d < startDay || d > endDay) {
        const periodStr = `${quincena === 1 ? '1ra Quincena' : '2da Quincena'} de ${MONTH_NAMES[month]} de ${year}`;
        showToast(`La fecha del feriado no corresponde al corte seleccionado (${periodStr}).`, 'error');
        return;
      }
    }
    if (feriados.includes(newFeriadoDate)) { showToast('Esta fecha ya está en la lista de feriados.', 'error'); return; }
    setFeriados(prev => [...prev, newFeriadoDate].sort());
    setNewFeriadoDate('');
    showToast('Fecha feriado agregada.', 'success');
  };

  const handleRemoveFeriado = (dateToRemove) => {
    setFeriados(prev => prev.filter(d => d !== dateToRemove));
    showToast('Feriado eliminado de la lista.', 'success');
  };

  // ── Procesamiento ──
  const handleProcess = () => {
    if (rawData.length === 0) { showToast('Por favor, carga un archivo Excel primero.', 'error'); return; }
    if (!sucursalesConfig || sucursalesConfig.length === 0) { showToast('Configura al menos una sucursal primero.', 'error'); return; }
    setLoading(true);
    setTimeout(() => {
      try {
        const calculated = processIncidencias(
          rawData,
          parseInt(year, 10),
          month,
          quincena,
          feriados,
          sucursalesConfig
        );
        let totalIncidencias = 0;
        Object.values(calculated).forEach(list => { totalIncidencias += list.length; });
        if (totalIncidencias === 0) {
          const periodStr = `${quincena === 1 ? '1ra Quincena' : '2da Quincena'} de ${MONTH_NAMES[month]} de ${year}`;
          throw new Error(`Las fechas en el archivo Excel no coinciden con el corte seleccionado (${periodStr}) o la información es errada.`);
        }
        setIncidencias(calculated);
        setCalculatedRawData(rawData);
        // Asegurarse de que activeSucursal sea una clave válida
        const firstKey = Object.keys(calculated)[0];
        if (!calculated[activeSucursal]) setActiveSucursal(firstKey);
        showToast('Incidencias calculadas exitosamente.', 'success');
      } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  // ── Historial / API ──
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/cortes');
      if (!res.ok) throw new Error('Error al obtener el historial de la base de datos');
      const data = await res.json();
      setHistoryList(data);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (rawData.length === 0) { showToast('No hay datos calculados para guardar.', 'error'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/cortes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file ? file.name : 'Cálculo Manual', year, month, quincena, feriados, incidencias })
      });
      if (!res.ok) { const errData = await res.json(); throw new Error(errData.error || 'Error al guardar en la base de datos'); }
      showToast('Cálculo e incidencias guardadas exitosamente en la base de datos.', 'success');
      fetchHistory();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadHistoryItem = async (id) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/cortes/${id}`);
      if (!res.ok) throw new Error('Error al cargar el detalle del historial');
      const data = await res.json();

      // Agrupar incidencias por sucursal (usando config actual o la del historial)
      const grouped = buildEmptyIncidencias();

      if (Array.isArray(data.incidencias)) {
        data.incidencias.forEach(item => {
          let key = item.mappedSucursal;
          // Si la clave no existe en la config actual, poner en la primera
          if (!grouped[key]) {
            key = Object.keys(grouped)[0];
          }
          grouped[key].push({
            employeeCode: item.employeeCode,
            employeeName: item.employeeName,
            cedula: item.cedula,
            cargo: item.cargo,
            originalSucursal: item.originalSucursal,
            incidenceType: item.incidenceType,
            value: item.value,
            dateString: item.dateString,
            originalStatus: item.originalStatus
          });
        });
      }

      setIncidencias(grouped);
      setYear(data.year);
      setMonth(data.month);
      setQuincena(data.quincena);
      setFeriados(data.feriados || []);
      setViewingHistoryId(id);
      setHistoryFilename(data.filename);
      setFile({ name: data.filename, size: 0 });
      setRawData([['MOCK_HEADER']]);
      setCalculatedRawData([['MOCK_HEADER']]);
      setCurrentView('live');
      showToast(`Cargado corte del historial: ${MONTH_NAMES[data.month]} ${data.year} - Q${data.quincena}`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleDeleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar este registro del historial permanentemente?')) return;
    try {
      const res = await fetch(`/api/cortes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar el registro');
      showToast('Registro de historial eliminado con éxito.', 'success');
      fetchHistory();
      if (viewingHistoryId === id) handleExitHistoryMode();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    }
  };

  const handleExitHistoryMode = () => {
    setViewingHistoryId(null);
    setHistoryFilename('');
    setFile(null);
    setRawData([]);
    setCalculatedRawData([]);
    setIncidencias(buildEmptyIncidencias());
    showToast('Regresado al cálculo en vivo.', 'success');
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDeleteIncidence = (sucursal, index) => {
    setIncidencias(prev => {
      const updatedList = [...prev[sucursal]];
      updatedList.splice(index, 1);
      return { ...prev, [sucursal]: updatedList };
    });
    showToast('Registro de incidencia eliminado.', 'success');
  };

  // ── Exportación Excel ──
  const handleDownloadExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const keys = Object.keys(incidencias);
      keys.forEach((sucursal, idx) => {
        const colorSet = SUCURSAL_COLORS[idx % SUCURSAL_COLORS.length];
        const dataForSheet = incidencias[sucursal].map(item => ({
          'Codigo de Empleado': parseInt(item.employeeCode, 10) || item.employeeCode,
          'Incidencias': item.incidenceType,
          'Valor': item.value,
          'Fecha': item.dateString
        }));
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        ws['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 10 }, { wch: 18 }];
        Object.keys(ws).forEach(cellRef => {
          if (cellRef.startsWith('!')) return;
          const cell = ws[cellRef];
          if (!cell) return;
          const rowNum = parseInt(cellRef.replace(/^[A-Z]+/, ''), 10);
          const isHeader = rowNum === 1;
          cell.s = {
            fill: { patternType: 'solid', fgColor: { rgb: isHeader ? colorSet.headerBg : colorSet.cellBg } },
            font: { name: 'Calibri', sz: 11, bold: isHeader, color: { rgb: '000000' } },
            alignment: { horizontal: isHeader ? 'center' : (cellRef.startsWith('C') || cellRef.startsWith('D') ? 'center' : 'left'), vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: 'D9D9D9' } },
              bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
              left: { style: 'thin', color: { rgb: 'D9D9D9' } },
              right: { style: 'thin', color: { rgb: 'D9D9D9' } }
            }
          };
        });
        // Nombre de hoja truncado a 31 chars (límite Excel)
        const sheetName = sucursal.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });
      const monthName = MONTH_NAMES[month].toUpperCase();
      XLSX.writeFile(wb, `INCIDENCIAS_CORTE_${year}_${monthName}_Q${quincena}.xlsx`);
      showToast('Reporte de incidencias descargado con éxito.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al descargar el archivo: ' + err.message, 'error');
    }
  };

  // ── Métricas ──
  const currentIncidenciasList = incidencias[activeSucursal] || [];
  const filteredIncidencias = currentIncidenciasList.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.employeeCode.toLowerCase().includes(q) ||
      item.employeeName.toLowerCase().includes(q) ||
      item.cargo.toLowerCase().includes(q) ||
      item.incidenceType.toLowerCase().includes(q)
    );
  });

  const stats = filteredIncidencias.reduce(
    (acc, curr) => {
      acc.totalRows += 1;
      if (curr.incidenceType === 'BONO NOCTURNO') acc.bonoNocturno += curr.value;
      if (curr.incidenceType === 'DOMINGO') acc.domingo += 1;
      if (curr.incidenceType === 'FERIADO') acc.feriado += 1;
      if (curr.incidenceType === 'AUSENCIA JUSTIFICADA') acc.ausenciasJustificadas += 1;
      if (curr.incidenceType === 'AUSENCIA INJUSTIFICADA') acc.ausenciasInjustificadas += 1;
      return acc;
    },
    { totalRows: 0, bonoNocturno: 0, domingo: 0, feriado: 0, ausenciasJustificadas: 0, ausenciasInjustificadas: 0 }
  );

  const activeFeriadosInCorte = feriados.filter(dateStr => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    let startDay = 1, endDay = 15;
    if (quincena === 2) { startDay = 16; endDay = new Date(year, month + 1, 0).getDate(); }
    return y === year && m === month && d >= startDay && d <= endDay;
  });

  // ── Pantalla Config ──
  if (!sucursalesConfig || sucursalesConfig.length === 0 || showConfig) {
    return (
      <>
        <ConfigScreen
          onSave={handleSaveConfig}
          existingConfig={sucursalesConfig}
          onCancel={sucursalesConfig && sucursalesConfig.length > 0 ? () => setShowConfig(false) : null}
          toggleTheme={toggleTheme}
          theme={theme}
        />
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span>{t.message}</span>
            </div>
          ))}
        </div>
      </>
    );
  }

  // ── Dashboard Principal ──
  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="header-title-container">
          <div className="header-logo">
            <FileSpreadsheet size={22} />
          </div>
          <div className="header-title">
            <h1>Control de Incidencias</h1>
            <p>Cálculo automático de bonos, feriados, domingos y ausencias</p>
          </div>
        </div>

        <nav className="app-nav" aria-label="Vistas del sistema">
          <div className="tabs-container">
            <button
              className={`tab-btn ${currentView === 'live' ? 'active' : ''}`}
              onClick={() => setCurrentView('live')}
              aria-current={currentView === 'live' ? 'page' : undefined}
            >
              <Upload size={14} /> Cálculo
            </button>
            <button
              className={`tab-btn ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => { setCurrentView('history'); fetchHistory(); }}
              aria-current={currentView === 'history' ? 'page' : undefined}
            >
              <FileSpreadsheet size={14} /> Historial
            </button>
          </div>
        </nav>

        <div className="app-header-actions">
          <button
            onClick={() => { setWelcomeModalTab('tutorial'); setShowWelcomeModal(true); }}
            className="btn-header"
            title="Ver Guía de Uso del Sistema"
          >
            <HelpCircle size={15} /> <span>Guía</span>
          </button>
          <button
            onClick={() => setShowConfig(true)}
            className="btn-header"
            title="Editar configuración de sucursales"
          >
            <Settings size={15} /> <span>Configurar</span>
          </button>
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            title={theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
          >
            {theme === 'dark' ? <Sun className="sun-icon" size={18} /> : <Moon className="moon-icon" size={18} />}
          </button>
        </div>
      </header>

      {/* Banner historial */}
      {viewingHistoryId && (
        <div className="glass-card history-banner">
          <div className="history-banner-content">
            <Info size={18} />
            <div>
              <strong style={{ display: 'block', fontSize: '13px' }}>Visualizando historial guardado</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {historyFilename} · {MONTH_NAMES[month]} {year} · Quincena {quincena} (solo lectura)
              </span>
            </div>
          </div>
          <button className="btn-primary" onClick={handleExitHistoryMode}>
            Volver a cálculo en vivo
          </button>
        </div>
      )}

      {/* Vistas */}
      {currentView === 'history' ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 className="card-title"><FileSpreadsheet size={18} /> Historial de Salidas Guardadas</h2>
          {loadingHistory ? (
            <div className="empty-state">
              <Sparkles size={80} style={{ animation: 'spin 2s linear infinite' }} />
              <h3>Cargando historial...</h3>
            </div>
          ) : historyList.length === 0 ? (
            <div className="empty-state">
              <ShieldAlert size={80} />
              <h3>Historial vacío</h3>
              <p>No se han guardado cálculos en la base de datos todavía.</p>
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
                    <th style={{ textAlign: 'center' }}>Total Registros</th>
                    <th style={{ width: '150px', textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item) => {
                    const savedDate = new Date(item.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const monthName = MONTH_NAMES[item.month];
                    return (
                      <tr key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleLoadHistoryItem(item.id)}>
                        <td style={{ fontWeight: '500', color: 'var(--primary-active)' }}>{savedDate}</td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</td>
                        <td><strong>{monthName} {item.year}</strong> - Q{item.quincena}</td>
                        <td>
                          <span className="feriado-text" style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>
                            {item.feriados && item.feriados.length > 0 ? item.feriados.map(d => d.split('-')[2]).join(', ') : 'Ninguno'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>{item.total_registros}</td>
                        <td>
                          <div className="row-actions">
                            <button className="btn-table" onClick={(e) => { e.stopPropagation(); handleLoadHistoryItem(item.id); }}>Ver</button>
                            <button className="btn-table-danger" onClick={(e) => handleDeleteHistoryItem(item.id, e)} title="Eliminar de la base de datos" aria-label="Eliminar registro"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* VISTA DE CÁLCULO EN VIVO */
        <>
          {/* Corporate Solid Hero Card */}
          {!viewingHistoryId && (
            <div className="hero-card">
              <div className="hero-badge-pill">
                <span className="hero-badge-pill__dot"></span>
                <span>SISTEMA CORPORATIVO ACTIVO · {sucursalesConfig.length} SEDES ({sucursalesConfig.map(s => s.name).join(' · ')})</span>
              </div>

              <h2 className="hero-title">
                Control Central de Incidencias Laborales
              </h2>

              <p className="hero-description">
                Plataforma corporativa de auditoría y cómputo automatizado de bonos nocturnos, turnos especiales, feriados, domingos y ausencias conforme a los lineamientos operativos vigentes.
              </p>

              <div className="hero-actions-row">
                <button
                  className="btn-hero-action btn-hero-action--primary"
                  onClick={() => { setWelcomeModalTab('tutorial'); setShowWelcomeModal(true); }}
                >
                  <BookOpen size={16} /> Guía y Tutorial de Uso
                </button>
                <button
                  className="btn-hero-action btn-hero-action--outline"
                  onClick={() => { setWelcomeModalTab('config'); setShowWelcomeModal(true); }}
                >
                  <Building2 size={16} /> Configurar Sedes e Incidencias
                </button>
              </div>
            </div>
          )}

          <div className="dashboard-grid">

          {/* Left Sidebar */}
          <div className="sidebar-column">

            {/* Corte */}
            <div className="glass-card">
              <h2 className="card-title"><Calendar size={18} /> Corte a calcular</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="config-group">
                  <label className="field-label">Año</label>
                  <input
                    type="number" className="input-text" value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10) || today.getFullYear())}
                    min="2000" max="2100"
                    disabled={viewingHistoryId !== null}
                  />
                </div>
                <CustomDropdown label="Mes" value={month} onChange={setMonth} disabled={viewingHistoryId !== null} options={MONTH_NAMES.map((name, idx) => ({ value: idx, label: name }))} />
                <CustomDropdown label="Quincena" value={quincena} onChange={setQuincena} disabled={viewingHistoryId !== null} options={[{ value: 1, label: '1ra Quincena (01 al 15)' }, { value: 2, label: '2da Quincena (16 al 30/31)' }]} />
              </div>
            </div>

            {/* File Upload */}
            <div className="glass-card">
              <h2 className="card-title"><Upload size={18} /> Carga de archivo</h2>
              {!file ? (
                <div className="dropzone" onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => document.getElementById('fileInput').click()}>
                  <div className="dropzone-icon"><Upload size={24} /></div>
                  <div className="dropzone-text">
                    <h3>Cargar reporte quincenal</h3>
                    <p>Arrastra tu archivo aquí o haz clic para buscar</p>
                  </div>
                  <input id="fileInput" type="file" accept=".xlsx, .xls" onChange={handleFileChange} style={{ display: 'none' }} />
                </div>
              ) : (
                <div className="file-loaded-panel">
                  <div className="file-info">
                    <CheckCircle2 className="file-info-icon" size={24} />
                    <div className="file-details">
                      <h4>{file.name}</h4>
                      {file.size > 0 ? <p>{(file.size / 1024).toFixed(1)} KB</p> : <p className="feriado-text" style={{ color: 'var(--warning)', fontWeight: '500' }}>Registro Histórico</p>}
                    </div>
                  </div>
                  {viewingHistoryId ? (
                    <button className="btn-remove-file" onClick={handleExitHistoryMode} title="Cerrar Historial">&times;</button>
                  ) : (
                    <button className="btn-remove-file" onClick={handleRemoveFile} title="Remover archivo"><Trash2 size={16} /></button>
                  )}
                </div>
              )}

                <div className="upload-actions">
                  {!viewingHistoryId && (
                    <button className="btn-primary" onClick={handleProcess} disabled={loading || rawData.length === 0}>
                      <Sparkles size={17} />
                      {loading ? 'Procesando...' : calculatedRawData.length > 0 ? 'Reprocesar incidencias' : 'Procesar incidencias'}
                    </button>
                  )}
                  {(calculatedRawData.length > 0 || viewingHistoryId) && !viewingHistoryId && (
                    <button className="btn-secondary" onClick={handleSaveToDatabase} disabled={saving}>
                      <Plus size={17} /> {saving ? 'Guardando...' : 'Guardar en base de datos'}
                    </button>
                  )}
                </div>
            </div>

            {/* Feriados */}
            <div className="glass-card">
              <h2 className="card-title"><Calendar size={18} /> Días feriados</h2>
              <div className="feriados-container">
                <div className="feriados-input-row">
                  <input type="date" className="input-text" value={newFeriadoDate} onChange={(e) => setNewFeriadoDate(e.target.value)} style={{ flexGrow: 1 }} disabled={viewingHistoryId !== null} />
                  <button className="btn-icon" onClick={handleAddFeriado} disabled={viewingHistoryId !== null} title="Agregar feriado" aria-label="Agregar feriado"><Plus size={18} /></button>
                </div>
                <div className="feriados-tags">
                  {feriados.length === 0 ? (
                    <div className="feriados-empty">No hay días feriados registrados.</div>
                  ) : (
                    feriados.map(date => {
                      const [y, m, d] = date.split('-');
                      return (
                        <span key={date} className="feriado-tag">
                          {`${d}/${m}/${y}`}
                          {!viewingHistoryId && (
                            <button onClick={() => handleRemoveFeriado(date)} title="Quitar feriado" aria-label={`Quitar feriado ${d}/${m}/${y}`}>&times;</button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
                <p className="section-note">Si un colaborador trabaja en estas fechas, computará "FERIADO".</p>
                {activeFeriadosInCorte.length > 0 && (
                  <div className="feriado-summary-box">
                    <strong>Feriados en este corte:</strong> {activeFeriadosInCorte.map(d => d.split('-')[2]).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="preview-container">
              <h2 className="card-title"><FileSpreadsheet size={18} /> Previsualización de incidencias</h2>

              {calculatedRawData.length === 0 ? (
                <div className="empty-state">
                  <ShieldAlert size={80} />
                  {rawData.length === 0 ? (
                    <>
                      <h3>No hay datos cargados</h3>
                      <p>Por favor, carga un archivo Excel en el panel lateral para iniciar.</p>
                    </>
                  ) : (
                    <>
                      <h3 style={{ color: 'var(--primary-active)' }}>Archivo cargado con éxito</h3>
                      <p>Haz clic en el botón <strong>"Procesar Incidencias"</strong> en el panel izquierdo para calcular los reportes.</p>
                    </>
                  )}
                </div>
              ) : stats.totalRows === 0 && !filteredIncidencias.length ? (
                <div className="empty-state empty-state--danger">
                  <ShieldAlert size={80} />
                  <h3>Advertencia: 0 incidencias calculadas</h3>
                  <p>
                    No se encontraron columnas de fecha en el archivo Excel que coincidan con el periodo filtrado:
                    <strong> {MONTH_NAMES[month]} {year} · {quincena === 1 ? '1ra quincena' : '2da quincena'}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="stats-row">
                    <div className="stat-box stat-box--bono">
                      <span className="stat-label">Bono nocturno</span>
                      <span className="stat-val">{stats.bonoNocturno}</span>
                    </div>
                    <div className="stat-box stat-box--domingo">
                      <span className="stat-label">Domingos</span>
                      <span className="stat-val">{stats.domingo}</span>
                    </div>
                    <div className="stat-box stat-box--feriado">
                      <span className="stat-label">Feriados</span>
                      <span className="stat-val">{stats.feriado}</span>
                    </div>
                    <div className="stat-box stat-box--ausencia-j">
                      <span className="stat-label">Ausencias just.</span>
                      <span className="stat-val">{stats.ausenciasJustificadas}</span>
                    </div>
                    <div className="stat-box stat-box--ausencia-i">
                      <span className="stat-label">Ausencias injust.</span>
                      <span className="stat-val">{stats.ausenciasInjustificadas}</span>
                    </div>
                  </div>

                  {/* Búsqueda + descarga */}
                  <div className="table-toolbar">
                    <div className="search-container">
                      <Search size={16} />
                      <input
                        type="text"
                        placeholder="Buscar colaborador, código o cargo..."
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Buscar incidencias"
                      />
                    </div>
                    <div className="toolbar-actions">
                      <button className="btn-primary" onClick={handleDownloadExcel} disabled={rawData.length === 0}>
                        <Download size={16} /> Descargar Excel
                      </button>
                    </div>
                  </div>

                  {/* Sucursales Tabs — generadas dinámicamente desde config */}
                  <div className="sucursales-tabs">
                    {Object.keys(incidencias).map(suc => (
                      <button
                        key={suc}
                        className={`sucursal-tab ${activeSucursal === suc ? 'active' : ''}`}
                        onClick={() => { setActiveSucursal(suc); setSearchQuery(''); }}
                      >
                        {suc} ({incidencias[suc]?.length || 0})
                      </button>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Cod.</th>
                          <th>C.I.</th>
                          <th>Colaborador</th>
                          <th>Cargo</th>
                          <th>Incidencia</th>
                          <th>Valor</th>
                          <th>Fecha</th>
                          <th>Turno</th>
                          <th style={{ width: '56px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncidencias.length === 0 ? (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-tertiary)' }}>
                              No se encontraron registros de incidencias para esta selección.
                            </td>
                          </tr>
                        ) : (
                          filteredIncidencias.map((item, index) => {
                            const originalIdx = incidencias[activeSucursal].findIndex(
                              i => i.employeeCode === item.employeeCode &&
                                   i.dateString === item.dateString &&
                                   i.incidenceType === item.incidenceType
                            );
                            return (
                              <tr key={`${item.employeeCode}-${item.dateString}-${item.incidenceType}-${index}`}>
                                <td className="cell-code">{item.employeeCode}</td>
                                <td className="mono-num">{item.cedula}</td>
                                <td className="cell-name">{item.employeeName}</td>
                                <td className="text-muted cell-cargo">{item.cargo}</td>
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
                                <td className="cell-value">{item.value}</td>
                                <td className="mono-num">{item.dateString}</td>
                                <td className="cell-status">{item.originalStatus}</td>
                                <td>
                                  {!viewingHistoryId && (
                                    <div className="row-actions">
                                      <button className="btn-action-delete" title="Eliminar Incidencia" onClick={() => handleDeleteIncidence(activeSucursal, originalIdx)}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        </>
      )}

      <Footer />

      {/* Modal Emergente de Bienvenida y Tutorial */}
      <WelcomeTutorialModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        initialTab={welcomeModalTab}
        existingConfig={sucursalesConfig}
        onSaveConfig={handleSaveConfig}
      />

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type === 'success' ? 'toast-success' : 'toast-error'}`}>
            {t.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
