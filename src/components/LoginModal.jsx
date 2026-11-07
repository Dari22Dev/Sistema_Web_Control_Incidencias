import React, { useState, useEffect, useRef } from 'react';
import { Lock, User, Key, X, AlertCircle } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin1234!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const usernameInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setTimeout(() => usernameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciales incorrectas');
      }

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container modal-container--sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} color="var(--primary)" />
            <h3 id="login-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>Iniciar Sesión</h3>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Cerrar modal">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '1.25rem 0' }}>
          {error && (
            <div className="toast toast-error" role="alert" style={{ margin: 0 }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="config-group">
            <label htmlFor="login-username" className="field-label">Usuario</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-username"
                ref={usernameInputRef}
                type="text"
                className="input-text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ paddingLeft: '34px' }}
                placeholder="admin / editor / viewer"
              />
              <User size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-tertiary)' }} />
            </div>
          </div>

          <div className="config-group">
            <label htmlFor="login-password" className="field-label">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type="password"
                className="input-text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '34px' }}
                placeholder="Ingresa tu contraseña"
              />
              <Key size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: 'var(--text-tertiary)' }} />
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '6px' }}>
            <strong>Cuentas por defecto del sistema:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
              <li><strong>admin</strong> / Admin1234! (Acceso total)</li>
              <li><strong>editor</strong> / Editor1234! (Cálculo y guardado)</li>
              <li><strong>viewer</strong> / Viewer1234! (Consulta de reportes)</li>
            </ul>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Accediendo...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
