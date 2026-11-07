import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  Settings,
  HelpCircle,
  Sun,
  Moon,
  Info,
  CheckCircle2,
  AlertCircle,
  User,
  LogOut,
  LogIn
} from 'lucide-react';

import { processIncidencias, DEFAULT_SUCURSALES_CONFIG } from './utils/calculator';
import { exportIncidenciasExcel } from './utils/excelExport';

import { useAuth } from './hooks/useAuth';
import { useHistory } from './hooks/useHistory';

import Stepper from './components/Stepper';
import PeriodSelector from './components/PeriodSelector';
import UploadCard from './components/UploadCard';
import HolidayList from './components/HolidayList';
import AuditSummaryPanel from './components/AuditSummaryPanel';
import IncidenceTable from './components/IncidenceTable';
import HistoryView from './components/HistoryView';
import ConfigScreen from './components/ConfigScreen';
import WelcomeTutorialModal from './components/WelcomeTutorialModal';
import LoginModal from './components/LoginModal';
import ConfirmModal from './components/ConfirmModal';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function App() {
  // ── Tema Claro / Oscuro ──
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

  // ── Toasts de Notificación ──
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // ── Autenticación y Permisos ──
  const { user, token, isAuthenticated, role, login, logout } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // ── Historial y Persistencia en Base de Datos ──
  const {
    historyList,
    loadingHistory,
    saving,
    fetchHistory,
    saveCorte,
    deleteCorte,
    getCorteDetails
  } = useHistory(token, showToast);

  // ── Configuración de Sucursales ──
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => !localStorage.getItem('tutorial_viewed'));
  const [welcomeModalTab, setWelcomeModalTab] = useState('tutorial');

  const handleSaveConfig = (config) => {
    setSucursalesConfig(config);
    localStorage.setItem('sucursales_config', JSON.stringify(config));
    resetData(config);
    setShowConfig(false);
    setShowWelcomeModal(false);
    showToast('Configuración guardada exitosamente.', 'success');
  };

  // ── Estado de Datos de Cálculo ──
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [quincena, setQuincena] = useState(today.getDate() <= 15 ? 1 : 2);
  const [feriados, setFeriados] = useState([]);
  const [newFeriadoDate, setNewFeriadoDate] = useState('');

  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estado explícito del modo: 'live' (cálculo en vivo) | 'history' (visualizando corte guardado)
  const [mode, setMode] = useState('live');
  const [currentView, setCurrentView] = useState('live'); // 'live' | 'history'
  const [viewingHistoryId, setViewingHistoryId] = useState(null);
  const [historyFilename, setHistoryFilename] = useState('');

  const buildEmptyIncidencias = (config) => {
    const obj = {};
    (config || sucursalesConfig || []).forEach(s => { obj[s.name] = []; });
    return obj;
  };

  const [incidencias, setIncidencias] = useState(() => buildEmptyIncidencias(loadSucursalesConfig()));
  const [anomalies, setAnomalies] = useState({ unrecognizedCells: [], unassignedEmployees: [], duplicateEmployees: [] });
  const [activeSucursal, setActiveSucursal] = useState(() => loadSucursalesConfig()?.[0]?.name || '');

  // Modal para confirmar sobrescritura de corte duplicado
  const [conflictData, setConflictData] = useState(null);

  const resetData = (config) => {
    setIncidencias(buildEmptyIncidencias(config));
    setAnomalies({ unrecognizedCells: [], unassignedEmployees: [], duplicateEmployees: [] });
    setActiveSucursal((config || [])[0]?.name || '');
    setFile(null);
    setRawData([]);
    setMode('live');
    setViewingHistoryId(null);
    setHistoryFilename('');
  };

  // Cargar historial al autenticarse
  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    }
  }, [isAuthenticated, fetchHistory]);

  // Paso actual en el flujo guiado
  const currentStep = useMemo(() => {
    const totalInc = Object.values(incidencias).reduce((acc, l) => acc + (l?.length || 0), 0);
    if (totalInc > 0) return 3;
    if (rawData.length > 0) return 2;
    return 1;
  }, [rawData, incidencias]);

  // ── Gestión de Feriados ──
  const handleAddFeriado = () => {
    if (!newFeriadoDate) return;
    const parts = newFeriadoDate.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      let startDay = 1, endDay = 15;
      if (quincena === 2) {
        startDay = 16;
        endDay = new Date(year, month + 1, 0).getDate();
      }
      if (y !== year || m !== month || d < startDay || d > endDay) {
        const periodStr = `${quincena === 1 ? '1ra Quincena' : '2da Quincena'} de ${MONTH_NAMES[month]} de ${year}`;
        showToast(`La fecha no corresponde al período seleccionado (${periodStr}).`, 'error');
        return;
      }
    }
    if (feriados.includes(newFeriadoDate)) {
      showToast('Esta fecha ya está agregada.', 'error');
      return;
    }
    setFeriados(prev => [...prev, newFeriadoDate].sort());
    setNewFeriadoDate('');
    showToast('Día feriado agregado.', 'success');
  };

  const handleRemoveFeriado = (dateToRemove) => {
    setFeriados(prev => prev.filter(d => d !== dateToRemove));
    showToast('Feriado removido de la lista.', 'success');
  };

  // ── Procesamiento de Incidencias ──
  const handleProcess = () => {
    if (rawData.length === 0) {
      showToast('Carga un archivo Excel primero.', 'error');
      return;
    }
    if (!sucursalesConfig || sucursalesConfig.length === 0) {
      showToast('Configura al menos una sucursal.', 'error');
      return;
    }

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
          throw new Error(`No se detectaron asistencias o columnas de fecha coincidentes con el corte (${periodStr}).`);
        }

        setIncidencias(calculated);
        setAnomalies(calculated._anomalies || { unrecognizedCells: [], unassignedEmployees: [], duplicateEmployees: [] });

        const firstKey = Object.keys(calculated)[0];
        if (!calculated[activeSucursal]) setActiveSucursal(firstKey);

        const anomaliesCount = (calculated._anomalies?.unrecognizedCells?.length || 0) +
                               (calculated._anomalies?.unassignedEmployees?.length || 0) +
                               (calculated._anomalies?.duplicateEmployees?.length || 0);

        if (anomaliesCount > 0) {
          showToast(`Incidencias calculadas. Advertencia: Se detectaron ${anomaliesCount} observaciones para auditar.`, 'error');
        } else {
          showToast('Incidencias calculadas exitosamente sin inconsistencias.', 'success');
        }
      } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    }, 150);
  };

  // ── Guardado en Base de Datos Persistente ──
  const handleSaveToDatabase = async (replace = false) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const totalInc = Object.values(incidencias).reduce((acc, l) => acc + (l?.length || 0), 0);
    if (totalInc === 0) {
      showToast('No hay incidencias calculadas para guardar.', 'error');
      return;
    }

    const payload = {
      filename: file ? file.name : 'Cálculo Manual',
      year,
      month,
      quincena,
      feriados,
      incidencias
    };

    const res = await saveCorte(payload, replace);
    if (res?.conflict) {
      setConflictData(payload);
    }
  };

  // ── Cargar Corte del Historial ──
  const handleLoadHistoryItem = async (id) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    const data = await getCorteDetails(id);
    if (!data) return;

    const grouped = buildEmptyIncidencias();
    if (Array.isArray(data.incidencias)) {
      data.incidencias.forEach(item => {
        let key = item.mappedSucursal;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(item);
      });
    }

    setIncidencias(grouped);
    setAnomalies({ unrecognizedCells: [], unassignedEmployees: [], duplicateEmployees: [] });
    setYear(data.year);
    setMonth(data.month);
    setQuincena(data.quincena);
    setFeriados(data.feriados || []);
    setViewingHistoryId(id);
    setHistoryFilename(data.filename);
    setFile({ name: data.filename, size: 0 });
    setMode('history');
    setCurrentView('live');

    showToast(`Cargado corte: ${MONTH_NAMES[data.month]} ${data.year} - Q${data.quincena} (${data.filename})`, 'success');
  };

  const handleExitHistoryMode = () => {
    resetData(sucursalesConfig);
    showToast('Regresado a modo de cálculo en vivo.', 'success');
  };

  const handleDeleteIncidence = (sucursal, index) => {
    setIncidencias(prev => {
      const updatedList = [...(prev[sucursal] || [])];
      updatedList.splice(index, 1);
      return { ...prev, [sucursal]: updatedList };
    });
    showToast('Registro de incidencia eliminado.', 'success');
  };

  // ── Exportación a Excel con Hoja Resumen ──
  const handleDownloadExcel = () => {
    try {
      const fileName = exportIncidenciasExcel({
        incidencias,
        year,
        month,
        quincena,
        feriados
      });
      showToast(`Reporte consolidado descargado: ${fileName}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al exportar archivo Excel: ' + err.message, 'error');
    }
  };

  // Conteo total de incidencias calculadas
  const totalCalculated = useMemo(() => {
    return Object.values(incidencias).reduce((acc, l) => acc + (l?.length || 0), 0);
  }, [incidencias]);

  // Pantalla de Configuración si está abierta
  if (showConfig) {
    return (
      <ConfigScreen
        onSave={handleSaveConfig}
        existingConfig={sucursalesConfig}
        onCancel={() => setShowConfig(false)}
        toggleTheme={toggleTheme}
        theme={theme}
      />
    );
  }

  return (
    <div className="container">
      {/* ── HEADER CORPORATIVO ── */}
      <header className="app-header">
        <div className="header-title-container">
          <div className="header-logo">
            <FileSpreadsheet size={22} />
          </div>
          <div className="header-title">
            <h1>Control Central de Incidencias</h1>
            <p>Auditoría de bonos nocturnos, feriados, domingos y ausencias</p>
          </div>
        </div>

        <nav className="app-nav" aria-label="Navegación principal">
          <div className="tabs-container">
            <button
              className={`tab-btn ${currentView === 'live' ? 'active' : ''}`}
              onClick={() => setCurrentView('live')}
              aria-current={currentView === 'live' ? 'page' : undefined}
            >
              <Upload size={14} /> Cálculo y Auditoría
            </button>
            <button
              className={`tab-btn ${currentView === 'history' ? 'active' : ''}`}
              onClick={() => {
                setCurrentView('history');
                if (isAuthenticated) fetchHistory();
              }}
              aria-current={currentView === 'history' ? 'page' : undefined}
            >
              <FileSpreadsheet size={14} /> Historial Persistente
            </button>
          </div>
        </nav>

        <div className="app-header-actions">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '6px' }}>
              <User size={14} color="var(--primary)" />
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.username} ({role})</span>
              <button
                className="btn-icon"
                onClick={logout}
                title="Cerrar sesión"
                aria-label="Cerrar sesión de usuario"
                style={{ marginLeft: '4px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="btn-header"
              title="Iniciar sesión en la API"
            >
              <LogIn size={14} /> <span>Ingresar</span>
            </button>
          )}

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
            title="Editar configuración de sedes e incidencias"
          >
            <Settings size={15} /> <span>Configurar</span>
          </button>
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

      {/* Banner de Modo Historial Explícito */}
      {mode === 'history' && (
        <div className="glass-card history-banner" role="region" aria-label="Aviso de modo histórico">
          <div className="history-banner-content">
            <Info size={18} color="var(--primary)" />
            <div>
              <strong style={{ display: 'block', fontSize: '13px' }}>Modo Historial Activo</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {historyFilename} · {MONTH_NAMES[month]} {year} (Q{quincena}) — Registro de sólo lectura.
              </span>
            </div>
          </div>
          <button className="btn-primary" onClick={handleExitHistoryMode}>
            Volver a cálculo en vivo
          </button>
        </div>
      )}

      {/* ── VISTAS DEL SISTEMA ── */}
      {currentView === 'history' ? (
        <HistoryView
          historyList={historyList}
          loadingHistory={loadingHistory}
          onLoadHistoryItem={handleLoadHistoryItem}
          onDeleteHistoryItem={deleteCorte}
          userRole={role}
        />
      ) : (
        <>
          {/* Stepper de 4 Pasos */}
          <Stepper currentStep={currentStep} onStepClick={(step) => {
            if (step === 1) setShowConfig(true);
          }} />

          {/* Grid Principal */}
          <div className="dashboard-grid">
            {/* Columna Izquierda: Parámetros, Carga y Feriados */}
            <div className="sidebar-column">
              <PeriodSelector
                year={year}
                setYear={setYear}
                month={month}
                setMonth={setMonth}
                quincena={quincena}
                setQuincena={setQuincena}
                disabled={mode === 'history'}
              />

              <UploadCard
                file={file}
                setFile={setFile}
                rawData={rawData}
                setRawData={setRawData}
                loading={loading}
                setLoading={setLoading}
                onProcess={handleProcess}
                onSaveToDatabase={() => handleSaveToDatabase(false)}
                saving={saving}
                calculatedCount={totalCalculated}
                viewingHistoryId={viewingHistoryId}
                onExitHistoryMode={handleExitHistoryMode}
                showToast={showToast}
              />

              <HolidayList
                feriados={feriados}
                newFeriadoDate={newFeriadoDate}
                setNewFeriadoDate={setNewFeriadoDate}
                onAddFeriado={handleAddFeriado}
                onRemoveFeriado={handleRemoveFeriado}
                year={year}
                month={month}
                quincena={quincena}
                disabled={mode === 'history'}
              />
            </div>

            {/* Columna Derecha: Resumen de Auditoría y Tabla de Incidencias */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="preview-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h2 className="card-title" style={{ margin: 0 }}>
                    <FileSpreadsheet size={18} /> Auditoría y Previsualización de Incidencias
                  </h2>

                  {totalCalculated > 0 && (
                    <button className="btn-primary" onClick={handleDownloadExcel}>
                      <Download size={16} /> Descargar Excel (con Resumen)
                    </button>
                  )}
                </div>

                {totalCalculated === 0 ? (
                  <div className="empty-state">
                    <FileSpreadsheet size={64} style={{ color: 'var(--text-tertiary)' }} />
                    {rawData.length === 0 ? (
                      <>
                        <h3>Carga un archivo Excel para comenzar</h3>
                        <p>Selecciona tu archivo consolidado quincenal en el panel lateral.</p>
                      </>
                    ) : (
                      <>
                        <h3 style={{ color: 'var(--primary)' }}>Archivo cargado en memoria</h3>
                        <p>Haz clic en <strong>"Procesar incidencias"</strong> para computar los turnos y ausencias.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Panel de Auditoría Previa a Liquidación */}
                    <AuditSummaryPanel
                      incidencias={incidencias}
                      anomalies={anomalies}
                      activeSucursal={activeSucursal}
                    />

                    {/* Pestañas de Sedes */}
                    <div className="sucursales-tabs" role="tablist" aria-label="Sedes calculadas">
                      {Object.keys(incidencias).map(suc => (
                        <button
                          key={suc}
                          role="tab"
                          aria-selected={activeSucursal === suc}
                          className={`sucursal-tab ${activeSucursal === suc ? 'active' : ''}`}
                          onClick={() => setActiveSucursal(suc)}
                        >
                          {suc} ({incidencias[suc]?.length || 0})
                        </button>
                      ))}
                    </div>

                    {/* Tabla Paginada y Ordenable */}
                    <IncidenceTable
                      incidenciasList={incidencias[activeSucursal] || []}
                      activeSucursal={activeSucursal}
                      onDeleteIncidence={handleDeleteIncidence}
                      viewingHistoryId={viewingHistoryId}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal Tutorial y Configuración Rápida */}
      <WelcomeTutorialModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        initialTab={welcomeModalTab}
        existingConfig={sucursalesConfig}
        onSaveConfig={handleSaveConfig}
      />

      {/* Modal de Inicio de Sesión */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={(userData, jwtToken) => {
          login(userData, jwtToken);
          showToast(`Sesión iniciada como ${userData.username} (${userData.role})`, 'success');
        }}
      />

      {/* Modal de Confirmación para Conflicto al Guardar */}
      <ConfirmModal
        isOpen={conflictData !== null}
        title="¿Sobrescribir corte existente?"
        message={`Ya existe un corte guardado para el archivo "${conflictData?.filename}" en el período ${MONTH_NAMES[conflictData?.month]} ${conflictData?.year} (Q${conflictData?.quincena}). ¿Deseas reemplazarlo con los nuevos datos calculados?`}
        confirmText="Sí, sobrescribir corte"
        cancelText="Cancelar"
        isDanger={false}
        onConfirm={() => {
          setConflictData(null);
          handleSaveToDatabase(true);
        }}
        onCancel={() => setConflictData(null)}
      />

      {/* Toasts Accesibles */}
      <div className="toast-container" role="status" aria-live="polite">
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
