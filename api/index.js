import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json({ limit: '50mb' }));

// --- ALMACENAMIENTO TEMPORAL EN MEMORIA (RAM) ---
let ID_CORTE_COUNTER = 1;
let ID_INCIDENCIA_COUNTER = 1;

let tablaCortes = [];
let tablaIncidencias = [];

// --- RUTAS DE LA API ---

// Guardar un nuevo corte y sus registros
app.post('/api/cortes', async (req, res) => {
  const { filename, year, month, quincena, feriados, incidencias } = req.body;

  if (!year || month === undefined || !quincena || !incidencias) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
  }

  try {
    const corteId = ID_CORTE_COUNTER++;

    const nuevoCorte = {
      id: corteId,
      filename: filename || 'Cálculo Manual',
      year: parseInt(year),
      month: parseInt(month),
      quincena: parseInt(quincena),
      feriados: JSON.stringify(feriados || []),
      created_at: new Date().toISOString()
    };
    tablaCortes.push(nuevoCorte);

    // Aplanar e insertar las incidencias en el arreglo global
    Object.keys(incidencias).forEach((sucursal) => {
      if (Array.isArray(incidencias[sucursal])) {
        incidencias[sucursal].forEach((item) => {
          tablaIncidencias.push({
            id: ID_INCIDENCIA_COUNTER++,
            corte_id: corteId,
            employeeCode: item.employeeCode,
            employeeName: item.employeeName,
            cedula: item.cedula,
            cargo: item.cargo,
            originalSucursal: item.originalSucursal,
            mappedSucursal: sucursal,
            incidenceType: item.incidenceType,
            value: item.value,
            dateString: item.dateString,
            originalStatus: item.originalStatus
          });
        });
      }
    });

    res.status(201).json({ success: true, id: corteId });
  } catch (err) {
    console.error('Error al guardar corte:', err);
    res.status(500).json({ error: 'Error interno al guardar los registros: ' + err.message });
  }
});

// Obtener todos los cortes históricos (resumen)
app.get('/api/cortes', async (req, res) => {
  try {
    const formattedRows = tablaCortes.map(corte => {
      const totalRegistros = tablaIncidencias.filter(inc => inc.corte_id === corte.id).length;
      return {
        ...corte,
        total_registros: totalRegistros,
        feriados: JSON.parse(corte.feriados || '[]')
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(formattedRows);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error al obtener el historial: ' + err.message });
  }
});

// Obtener detalles de un corte por ID
app.get('/api/cortes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const corte = tablaCortes.find(c => c.id === parseInt(id));
    if (!corte) {
      return res.status(404).json({ error: 'Registro de corte no encontrado.' });
    }

    const copiaCorte = { ...corte };
    copiaCorte.feriados = JSON.parse(copiaCorte.feriados || '[]');

    const incidenciasFiltradas = tablaIncidencias.filter(inc => inc.corte_id === parseInt(id));

    res.json({ ...copiaCorte, incidencias: incidenciasFiltradas });
  } catch (err) {
    console.error('Error al obtener detalles del corte:', err);
    res.status(500).json({ error: 'Error al obtener los detalles del corte: ' + err.message });
  }
});

// Eliminar un corte histórico
app.delete('/api/cortes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const corteIdInt = parseInt(id);
    tablaCortes = tablaCortes.filter(c => c.id !== corteIdInt);
    tablaIncidencias = tablaIncidencias.filter(inc => inc.corte_id !== corteIdInt);

    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar corte:', err);
    res.status(500).json({ error: 'Error al eliminar el registro: ' + err.message });
  }
});

// Servir el frontend compilado
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

export default app;