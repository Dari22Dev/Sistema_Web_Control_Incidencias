import React, { useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import { Upload, CheckCircle2, Trash2, Sparkles, Plus, Layers } from 'lucide-react';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function UploadCard({
  file,
  setFile,
  rawData,
  setRawData,
  loading,
  setLoading,
  onProcess,
  onSaveToDatabase,
  saving,
  calculatedCount,
  viewingHistoryId,
  onExitHistoryMode,
  showToast
}) {
  const [workbookInstance, setWorkbookInstance] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) processSelectedFile(selectedFile);
  };

  const processSelectedFile = (fileObj) => {
    const fileNameLower = fileObj.name.toLowerCase();
    if (!fileNameLower.endsWith('.xlsx') && !fileNameLower.endsWith('.xls')) {
      showToast('Por favor, selecciona un archivo Excel válido (.xlsx o .xls)', 'error');
      return;
    }

    if (fileObj.size > MAX_FILE_SIZE_BYTES) {
      showToast(`El archivo supera el tamaño máximo permitido (${MAX_FILE_SIZE_MB} MB).`, 'error');
      return;
    }

    setLoading(true);
    setFile({ name: fileObj.name, size: fileObj.size });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        setWorkbookInstance(wb);
        setSheetNames(wb.SheetNames);

        const initialSheet = wb.SheetNames[0];
        setSelectedSheet(initialSheet);
        loadSheetData(wb, initialSheet);

        showToast(`Archivo "${fileObj.name}" cargado. ${wb.SheetNames.length > 1 ? `Contiene ${wb.SheetNames.length} hojas.` : ''}`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Error al procesar el archivo Excel: ' + err.message, 'error');
        handleRemoveFile();
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      showToast('Error al leer el archivo desde el disco.', 'error');
      setLoading(false);
    };

    reader.readAsArrayBuffer(fileObj);
  };

  const loadSheetData = (wb, sheetName) => {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;
    const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (jsonData.length < 2) {
      showToast(`La hoja "${sheetName}" no contiene suficientes filas.`, 'error');
      setRawData([]);
      return;
    }
    setRawData(jsonData);
  };

  const handleSheetChange = (e) => {
    const newSheet = e.target.value;
    setSelectedSheet(newSheet);
    if (workbookInstance) {
      loadSheetData(workbookInstance, newSheet);
      showToast(`Cargada hoja: ${newSheet}`, 'success');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setRawData([]);
    setWorkbookInstance(null);
    setSheetNames([]);
    setSelectedSheet('');
    showToast('Archivo removido.', 'success');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processSelectedFile(droppedFile);
  };

  return (
    <div className="glass-card">
      <h2 className="card-title">
        <Upload size={18} /> Carga de Archivo Excel
      </h2>

      {!file ? (
        <div
          className="dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => document.getElementById('excelFileInput').click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('excelFileInput').click(); }}
          aria-label="Arrastra o selecciona un archivo Excel"
        >
          <div className="dropzone-icon">
            <Upload size={28} />
          </div>
          <div className="dropzone-text">
            <h3>Cargar reporte quincenal</h3>
            <p>Arrastra tu archivo Excel aquí o haz clic para examinar</p>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px', display: 'block' }}>
              Formatos soportados: .xlsx, .xls (Máx: {MAX_FILE_SIZE_MB} MB)
            </span>
          </div>
          <input
            id="excelFileInput"
            type="file"
            accept=".xlsx, .xls, .XLSX, .XLS"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="file-loaded-panel">
          <div className="file-info">
            <CheckCircle2 className="file-info-icon" size={24} />
            <div className="file-details">
              <h4>{file.name}</h4>
              {file.size > 0 ? (
                <p>{(file.size / 1024).toFixed(1)} KB</p>
              ) : (
                <p className="feriado-text" style={{ color: 'var(--warning)', fontWeight: '500' }}>Registro Histórico</p>
              )}
            </div>
          </div>
          {viewingHistoryId ? (
            <button className="btn-remove-file" onClick={onExitHistoryMode} title="Cerrar vista histórica">&times;</button>
          ) : (
            <button className="btn-remove-file" onClick={handleRemoveFile} title="Remover archivo"><Trash2 size={16} /></button>
          )}
        </div>
      )}

      {/* Selector de hoja si el libro contiene múltiples hojas */}
      {sheetNames.length > 1 && (
        <div className="config-group" style={{ marginTop: '14px' }}>
          <label htmlFor="sheet-selector" className="field-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} /> Seleccionar Hoja del Libro
          </label>
          <select
            id="sheet-selector"
            className="input-text"
            value={selectedSheet}
            onChange={handleSheetChange}
            disabled={viewingHistoryId !== null}
          >
            {sheetNames.map(sheet => (
              <option key={sheet} value={sheet}>{sheet}</option>
            ))}
          </select>
        </div>
      )}

      <div className="upload-actions" style={{ marginTop: '16px' }}>
        {!viewingHistoryId && (
          <button
            className="btn-primary"
            onClick={onProcess}
            disabled={loading || rawData.length === 0}
            style={{ width: '100%' }}
          >
            <Sparkles size={17} />
            {loading ? 'Calculando incidencias...' : calculatedCount > 0 ? 'Reprocesar incidencias' : 'Procesar incidencias'}
          </button>
        )}

        {calculatedCount > 0 && !viewingHistoryId && (
          <button
            className="btn-secondary"
            onClick={onSaveToDatabase}
            disabled={saving}
            style={{ width: '100%', marginTop: '8px' }}
          >
            <Plus size={17} />
            {saving ? 'Guardando en base de datos...' : 'Guardar en base de datos'}
          </button>
        )}
      </div>
    </div>
  );
}
