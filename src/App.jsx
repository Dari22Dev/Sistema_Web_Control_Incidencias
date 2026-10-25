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
  ChevronLeft
} from 'lucide-react';
import { processIncidencias, DEFAULT_SUCURSALES_CONFIG } from './utils/calculator';

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
          background: disabled ? 'rgba(0,0,0,0.08)' : 'var(--bg-input)',
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
                color: opt.value === value ? 'var(--secondary)' : 'var(--text-dropdown, #ffffff)',
                background: opt.value === value ? 'rgba(6, 182, 212, 0.1)' : 'transparent',
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
    <footer style={{
      marginTop: 'auto',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--border-glass)',
      borderRadius: '20px',
      padding: '1.25rem 2rem',
      boxShadow: 'var(--glass-shadow)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '1rem',
      width: '100%',
      animation: 'fadeIn 0.5s ease',
      position: 'relative',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
          Desarrollado por DariDev &copy; 2026
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          Control de Incidencias • V.2
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Contacto:</span>
        <a
          href="https://wa.me/584161978651"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'rgba(37, 211, 102, 0.1)',
            border: '1px solid rgba(37, 211, 102, 0.2)',
            color: '#25D366',
            textDecoration: 'none',
            transition: 'all 0.3s ease'
          }}
          className="whatsapp-contact-link"
          title="Contactar por WhatsApp"
        >
          <svg style={{ width: '18px', height: '18px', fill: 'currentColor' }} viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.63 1.97 14.152.946 11.517.946c-5.44 0-9.866 4.372-9.87 9.802 0 1.814.48 3.59 1.39 5.169l-.95 3.473 3.56-.934zM16.621 13.568c-.27-.135-1.597-.788-1.848-.88-.25-.091-.433-.135-.615.135-.183.27-.707.88-.867 1.062-.16.183-.32.203-.59.068-1.523-.762-2.482-1.282-3.44-2.933-.254-.438.254-.407.727-1.353.079-.162.04-.304-.02-.439-.06-.135-.513-1.233-.7-1.69-.183-.448-.37-.387-.514-.395-.133-.007-.285-.008-.438-.008-.153 0-.402.058-.613.286-.212.228-.809.79-.809 1.927 0 1.137.828 2.235.942 2.387.114.152 1.63 2.49 3.95 3.49.55.237 1.002.39 1.343.498.552.176 1.053.151 1.448.092.44-.066 1.353-.553 1.543-1.085.19-.53.19-.986.133-1.082-.057-.096-.212-.152-.482-.288z"/>
          </svg>
        </a>
      </div>
    </footer>
  );
}

// ─── Pantalla de Configuración de Sucursales ────────────────────────────────
function ConfigScreen({ onSave, existingConfig, onCancel, toggleTheme, theme }) {
  const [sucursales, setSucursales] = useState(() => {
    if (existingConfig && existingConfig.length > 0) {
      return existingConfig.map(s => ({
        ...DEFAULT_SUCURSAL_TEMPLATE,
        ...s,
        incidencias: {
          ...DEFAULT_SUCURSAL_TEMPLATE.incidencias,
          ...(s.incidencias || {})
        }
      }));
    }
    return DEFAULT_SUCURSALES_CONFIG.map(s => ({
      ...DEFAULT_SUCURSAL_TEMPLATE,
      ...s,
      incidencias: {
        ...DEFAULT_SUCURSAL_TEMPLATE.incidencias,
        ...(s.incidencias || {})
      }
    }));
  });

  const handleNameChange = (idx, value) => {
    setSucursales(prev => prev.map((s, i) => i === idx ? { ...s, name: value } : s));
  };

  const handleToggleIncidencia = (idx, key) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const current = s.incidencias?.[key] !== false;
      return {
        ...s,
        incidencias: {
          ...s.incidencias,
          [key]: !current
        }
      };
    }));
  };

  const handleValueChange = (idx, field, value) => {
    setSucursales(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const num = Number(value);
      return { ...s, [field]: isNaN(num) ? 0 : num };
    }));
  };

  const handleAdd = () => {
    setSucursales(prev => [
      ...prev,
      {
        ...DEFAULT_SUCURSAL_TEMPLATE,
        name: `Sucursal ${prev.length + 1}`
      }
    ]);
  };

  const handleRemove = (idx) => {
    if (sucursales.length <= 1) return;
    setSucursales(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    const valid = sucursales.filter(s => s.name.trim() !== '');
    if (valid.length === 0) return;
    onSave(valid);
  };

  const isValid = sucursales.some(s => s.name.trim() !== '');

  return (
    <div className="container" style={{ minHeight: '100vh', justifyContent: 'flex-start', paddingTop: '2rem' }}>
      <button onClick={toggleTheme} className="theme-switch-btn" aria-label="Cambiar tema">
        {theme === 'dark' ? <Sun className="sun-icon" size={20} /> : <Moon className="moon-icon" size={20} />}
      </button>

      <div style={{ width: '100%', maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
        {/* Header */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--primary)', borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={26} color="#000" />
            </div>
            <div>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', margin: 0 }}>
                Configuración de Sucursales e Incidencias
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Personaliza el nombre de cada sucursal, activa qué incidencias computar y define su valor.
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 500
              }}
            >
              <ChevronLeft size={16} /> Volver
            </button>
          )}
        </div>

        {/* Sucursales Cards */}
        {sucursales.map((suc, idx) => {
          const hasFeriadoActive = suc.incidencias?.feriado !== false;

          return (
            <div key={idx} className="config-sucursal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} style={{ color: 'var(--primary-active)' }} />
                  <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'var(--font-heading)' }}>
                    Sucursal #{idx + 1}
                  </span>
                </div>
                {sucursales.length > 1 && (
                  <button
                    onClick={() => handleRemove(idx)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      borderRadius: '8px',
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: 600
                    }}
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                )}
              </div>

              {/* Nombre de la sucursal */}
              <div className="config-group" style={{ marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem', fontWeight: 600 }}>
                  Nombre de la Sucursal *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Ej: Sambil, La Vela, Tienda Central..."
                  value={suc.name}
                  onChange={e => handleNameChange(idx, e.target.value)}
                />
              </div>

              {/* Selección de incidencias y valores */}
              <div>
                <label style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                  Incidencias y Valores a Computar:
                </label>
                <div className="incidence-config-grid">
                  {INCIDENCE_DEFINITIONS.map(def => {
                    const isChecked = suc.incidencias?.[def.key] !== false;
                    return (
                      <div key={def.key} className="incidence-config-item" style={{ opacity: isChecked ? 1 : 0.65 }}>
                        <label className="incidence-checkbox-label">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleIncidencia(idx, def.key)}
                          />
                          <span>{def.label}</span>
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {def.valLabel}:
                          </span>
                          <input
                            type="number"
                            className="incidence-value-input"
                            min="0"
                            max="20"
                            step="1"
                            value={suc[def.valField] ?? 0}
                            disabled={!isChecked}
                            onChange={(e) => handleValueChange(idx, def.valField, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasFeriadoActive && (
                  <div className="feriado-notice-box">
                    <Calendar size={15} style={{ flexShrink: 0 }} />
                    <span>
                      <strong>Feriados activados:</strong> El sistema validará los días feriados registrados para computar los turnos correspondientes con valor <strong>{suc.valorFeriado ?? 1}</strong>.
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Botón Agregar Sucursal */}
        <button
          onClick={handleAdd}
          className="btn-primary"
          style={{
            background: 'var(--bg-surface)',
            border: '1.5px dashed var(--border)',
            color: 'var(--text-primary)',
            boxShadow: 'none',
            width: '100%',
            fontWeight: 600
          }}
        >
          <Plus size={18} /> Agregar otra sucursal
        </button>

        {/* Botón Guardar */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={!isValid}
            style={{
              flex: 2,
              background: isValid ? 'var(--primary)' : undefined,
              boxShadow: 'none',
              fontWeight: 600
            }}
          >
            <CheckCircle2 size={18} /> Guardar Configuración e Iniciar
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}

// ─── App Principal ──────────────────────────────────────────────────────────
function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
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

  const handleSaveConfig = (config) => {
    setSucursalesConfig(config);
    localStorage.setItem('sucursales_config', JSON.stringify(config));
    // Resetear incidencias al cambiar config
    resetIncidencias(config);
    setShowConfig(false);
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
      <button onClick={toggleTheme} className="theme-switch-btn" aria-label="Cambiar tema">
        {theme === 'dark' ? <Sun className="sun-icon" size={20} /> : <Moon className="moon-icon" size={20} />}
      </button>
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Header */}
      <header>
        <div className="header-title-container">
          <div className="header-logo">
            <FileSpreadsheet size={28} color="#ffffff" />
          </div>
          <div className="header-title">
            <h1>Cálculo Automático de Incidencias</h1>
            <p>Procesamiento automatizado de bonos nocturnos, feriados, domingos y ausencias</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="tabs-container" style={{ margin: 0, padding: '0.25rem' }}>
            <button
              className={`tab-btn ${currentView === 'live' ? 'active' : ''}`}
              onClick={() => setCurrentView('live')}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <Upload size={14} /> Cálculo
            </button>
            <button
              className={`tab-btn ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => { setCurrentView('history'); fetchHistory(); }}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              <FileSpreadsheet size={14} /> Historial
            </button>
          </div>

          {/* Botón Configuración */}
          <button
            onClick={() => setShowConfig(true)}
            style={{
              background: 'rgba(63, 207, 142, 0.1)',
              border: '1px solid rgba(63, 207, 142, 0.25)',
              color: 'var(--primary)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              transition: 'all 0.2s'
            }}
            title="Editar configuración de sucursales"
          >
            <Settings size={15} /> Configurar
          </button>
        </div>
      </header>

      {/* Banner historial */}
      {viewingHistoryId && (
        <div className="glass-card history-banner" style={{
          padding: '1rem 1.5rem',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          background: 'rgba(245, 158, 11, 0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          animation: 'fadeIn 0.3s ease', borderRadius: '16px'
        }}>
          <div className="history-banner-content" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fbbf24' }}>
            <Info size={20} />
            <div>
              <strong style={{ display: 'block', fontSize: '0.9rem' }}>Visualizando Historial Guardado</strong>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Archivo: <strong>{historyFilename}</strong> | Período: {MONTH_NAMES[month]} {year} - Quincena {quincena} (Modo Lectura)
              </span>
            </div>
          </div>
          <button className="btn-primary" onClick={handleExitHistoryMode} style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-glass)', color: '#ffffff', boxShadow: 'none' }}>
            Volver a Cálculo en Vivo
          </button>
        </div>
      )}

      {/* Vistas */}
      {currentView === 'history' ? (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '500px' }}>
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
                        <td style={{ fontWeight: '500', color: 'var(--secondary)' }}>{savedDate}</td>
                        <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename}</td>
                        <td><strong>{monthName} {item.year}</strong> - Q{item.quincena}</td>
                        <td>
                          <span className="feriado-text" style={{ fontSize: '0.8rem', color: '#fbbf24' }}>
                            {item.feriados && item.feriados.length > 0 ? item.feriados.map(d => d.split('-')[2]).join(', ') : 'Ninguno'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>{item.total_registros}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleLoadHistoryItem(item.id); }} style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'var(--primary)', boxShadow: 'none', borderRadius: '6px' }}>Ver</button>
                            <button className="btn-remove-file" onClick={(e) => handleDeleteHistoryItem(item.id, e)} style={{ padding: '0.4rem', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)', color: '#ef4444' }} title="Eliminar de la base de datos"><Trash2 size={14} /></button>
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
        <div className="dashboard-grid">

          {/* Left Sidebar */}
          <div className="sidebar-column" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto', paddingRight: '0.25rem' }}>

            {/* Corte */}
            <div className="glass-card">
              <h2 className="card-title"><Calendar size={18} /> Corte a Calcular</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="config-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Año</label>
                  <input
                    type="number" className="input-text" value={year}
                    onChange={(e) => setYear(parseInt(e.target.value, 10) || today.getFullYear())}
                    min="2000" max="2100"
                    disabled={viewingHistoryId !== null}
                    style={{ background: viewingHistoryId !== null ? 'var(--bg-input, rgba(15,23,42,0.4))' : 'var(--bg-input, rgba(15,23,42,0.8))', cursor: viewingHistoryId !== null ? 'not-allowed' : 'text' }}
                  />
                </div>
                <CustomDropdown label="Mes" value={month} onChange={setMonth} disabled={viewingHistoryId !== null} options={MONTH_NAMES.map((name, idx) => ({ value: idx, label: name }))} />
                <CustomDropdown label="Quincena" value={quincena} onChange={setQuincena} disabled={viewingHistoryId !== null} options={[{ value: 1, label: '1ra Quincena (01 al 15)' }, { value: 2, label: '2da Quincena (16 al 30/31)' }]} />
              </div>
            </div>

            {/* File Upload */}
            <div className="glass-card">
              <h2 className="card-title"><Upload size={18} /> Carga de Archivo</h2>
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
                      {file.size > 0 ? <p>{(file.size / 1024).toFixed(1)} KB</p> : <p className="feriado-text" style={{ color: '#fbbf24', fontWeight: '500' }}>Registro Histórico</p>}
                    </div>
                  </div>
                  {viewingHistoryId ? (
                    <button className="btn-remove-file" onClick={handleExitHistoryMode} title="Cerrar Historial">&times;</button>
                  ) : (
                    <button className="btn-remove-file" onClick={handleRemoveFile} title="Remover archivo"><Trash2 size={16} /></button>
                  )}
                </div>
              )}

              {file && (
                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {!viewingHistoryId && (
                    <button className="btn-primary" onClick={handleProcess} disabled={loading || rawData.length === 0} style={{ background: 'var(--primary)', boxShadow: 'none' }}>
                      <Sparkles size={18} style={{ marginRight: '0.25rem' }} />
                      {loading ? 'Procesando...' : calculatedRawData.length > 0 ? 'Reprocesar Incidencias' : 'Procesar Incidencias'}
                    </button>
                  )}
                  {(calculatedRawData.length > 0 || viewingHistoryId) && !viewingHistoryId && (
                    <button className="btn-primary" onClick={handleSaveToDatabase} disabled={saving} style={{ background: 'var(--primary-active)', boxShadow: 'none', color: '#FFFFFF' }}>
                      <Plus size={18} /> {saving ? 'Guardando...' : 'Guardar en Base de Datos'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Feriados */}
            <div className="glass-card">
              <h2 className="card-title"><Calendar size={18} /> Días Feriados</h2>
              <div className="feriados-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="feriados-input-row" style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="date" className="input-text" value={newFeriadoDate} onChange={(e) => setNewFeriadoDate(e.target.value)} style={{ flexGrow: 1 }} disabled={viewingHistoryId !== null} />
                  <button className="btn-icon" onClick={handleAddFeriado} style={{ padding: '0.75rem' }} disabled={viewingHistoryId !== null}><Plus size={18} /></button>
                </div>
                <div className="feriados-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-feriados-box, rgba(0,0,0,0.2))', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                  {feriados.length === 0 ? (
                    <div style={{ color: '#64748b', fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: '100%', textAlign: 'center' }}>No hay días feriados registrados.</div>
                  ) : (
                    feriados.map(date => {
                      const [y, m, d] = date.split('-');
                      return (
                        <span key={date} className="feriado-tag" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {`${d}/${m}/${y}`}
                          {!viewingHistoryId && (
                            <button onClick={() => handleRemoveFeriado(date)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&times;</button>
                          )}
                        </span>
                      );
                    })
                  )}
                </div>
                <p style={{ fontSize: '0.72rem', color: '#64748b' }}>Si un colaborador trabaja en estas fechas, computará "FERIADO".</p>
                {activeFeriadosInCorte.length > 0 && (
                  <div className="feriado-summary-box" style={{ fontSize: '0.75rem', color: '#fbbf24', background: 'rgba(245,158,11,0.05)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.15)' }}>
                    <strong>Feriados en este corte:</strong> {activeFeriadosInCorte.map(d => d.split('-')[2]).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="glass-card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
            <div className="preview-container">
              <h2 className="card-title"><FileSpreadsheet size={18} /> Tabla de Previsualización y Control</h2>

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
                      <h3 style={{ color: 'var(--secondary)' }}>Archivo cargado con éxito</h3>
                      <p>Haz clic en el botón <strong>"Procesar Incidencias"</strong> en el panel izquierdo para calcular los reportes.</p>
                    </>
                  )}
                </div>
              ) : stats.totalRows === 0 && !filteredIncidencias.length ? (
                <div className="empty-state" style={{ borderColor: '#ef4444', background: 'rgba(239,68,68,0.05)', padding: '2rem 1.5rem' }}>
                  <ShieldAlert size={80} style={{ color: '#ef4444' }} />
                  <h3 style={{ color: '#ef4444' }}>Advertencia: 0 incidencias calculadas</h3>
                  <p style={{ maxWidth: '500px', margin: '0.5rem auto 1.5rem auto', fontSize: '0.95rem' }}>
                    No se encontraron columnas de fecha en el archivo Excel que coincidan con el periodo filtrado:
                    <strong> {MONTH_NAMES[month]} {year} - {quincena === 1 ? '1ra Quincena' : '2da Quincena'}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="stats-row">
                    <div className="stat-box">
                      <span className="stat-label">Bono Nocturno</span>
                      <span className="stat-val stat-val-bono">{stats.bonoNocturno}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Domingos</span>
                      <span className="stat-val stat-val-domingo">{stats.domingo}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Feriados</span>
                      <span className="stat-val stat-val-feriado">{stats.feriado}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Ausencias Just.</span>
                      <span className="stat-val stat-val-ausencia-j">{stats.ausenciasJustificadas}</span>
                    </div>
                    <div className="stat-box">
                      <span className="stat-label">Ausencias Injust.</span>
                      <span className="stat-val stat-val-ausencia-i">{stats.ausenciasInjustificadas}</span>
                    </div>
                  </div>

                  {/* Search */}
                  <div className="preview-header-actions" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div className="search-container" style={{ maxWidth: '400px', width: '100%' }}>
                      <Search size={16} />
                      <input type="text" placeholder="Buscar por colaborador, código o cargo..." className="search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                  </div>

                  {/* Download Button */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <button className="btn-primary" onClick={handleDownloadExcel} disabled={rawData.length === 0} style={{ background: 'var(--primary)', boxShadow: 'none', padding: '0.6rem 2rem', fontSize: '0.9rem', width: 'auto', minWidth: '220px', maxWidth: '300px', height: '42px', borderRadius: '32px', marginTop: 0 }}>
                      <Download size={18} /> Descargar Resultados (Excel)
                    </button>
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
                          <th>Cod. Empleado</th>
                          <th>Cédula</th>
                          <th>Colaborador</th>
                          <th>Cargo</th>
                          <th>Incidencia</th>
                          <th>Valor</th>
                          <th>Fecha</th>
                          <th>Turno Original</th>
                          <th style={{ width: '60px' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredIncidencias.length === 0 ? (
                          <tr>
                            <td colSpan="9" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
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
                                <td style={{ fontWeight: '600', color: 'var(--secondary)' }}>{item.employeeCode}</td>
                                <td>{item.cedula}</td>
                                <td style={{ fontWeight: '500' }}>{item.employeeName}</td>
                                <td style={{ color: '#94a3b8' }}>{item.cargo}</td>
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
                                <td style={{ fontWeight: '700' }}>{item.value}</td>
                                <td>{item.dateString}</td>
                                <td style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>{item.originalStatus}</td>
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
      )}

      <Footer />

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
