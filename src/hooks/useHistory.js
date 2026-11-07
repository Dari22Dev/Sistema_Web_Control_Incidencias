import { useState, useCallback } from 'react';

export function useHistory(token, showToast) {
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!token) {
      setHistoryList([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/cortes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        if (res.status === 401) return;
        throw new Error('Error al consultar historial de la base de datos');
      }
      const data = await res.json();
      setHistoryList(data);
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  }, [token, showToast]);

  const saveCorte = async (corteData, replace = false) => {
    if (!token) {
      showToast('Debes iniciar sesión para guardar en la base de datos.', 'error');
      return { success: false, requireAuth: true };
    }

    setSaving(true);
    try {
      const url = `/api/cortes${replace ? '?replace=true' : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(corteData)
      });

      const data = await res.json();

      if (res.status === 409) {
        return { success: false, conflict: true, existingId: data.existingId };
      }

      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar en la base de datos');
      }

      showToast('Corte e incidencias guardados exitosamente en la base de datos.', 'success');
      fetchHistory();
      return { success: true, id: data.id };
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
      return { success: false, error: err.message };
    } finally {
      setSaving(false);
    }
  };

  const deleteCorte = async (id) => {
    if (!token) {
      showToast('Debes iniciar sesión con rol Administrador para eliminar registros.', 'error');
      return false;
    }

    try {
      const res = await fetch(`/api/cortes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al eliminar el corte');
      }

      showToast('Corte eliminado permanentemente de la base de datos.', 'success');
      fetchHistory();
      return true;
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
      return false;
    }
  };

  const getCorteDetails = async (id) => {
    if (!token) {
      showToast('Inicia sesión para cargar cortes históricos.', 'error');
      return null;
    }

    try {
      const res = await fetch(`/api/cortes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Error al obtener el detalle del corte');
      }

      return await res.json();
    } catch (err) {
      console.error(err);
      showToast(err.message, 'error');
      return null;
    }
  };

  return {
    historyList,
    loadingHistory,
    saving,
    fetchHistory,
    saveCorte,
    deleteCorte,
    getCorteDetails
  };
}
