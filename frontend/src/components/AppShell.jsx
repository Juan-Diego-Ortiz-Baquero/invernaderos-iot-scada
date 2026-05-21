import { formatTime } from '../utils/formatters.js';
import { StatusPill } from './StatusPill.jsx';

export function AppShell({ children, greenhouseName, lastUpdated, onLogout, systemActive, user }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand-mark">
          <span className="brand-icon" aria-hidden="true" />
          <div>
            <strong>AgroControl</strong>
            <small>SCADA IoT</small>
          </div>
        </div>

        <nav className="nav-list" aria-label="Secciones del panel">
          <a className="nav-link nav-link--active" href="#dashboard">
            Monitoreo
          </a>
          <a className="nav-link" href="#alertas">
            Alertas
          </a>
          <a className="nav-link" href="#lecturas">
            Lecturas
          </a>
        </nav>

        <div className="operator-card">
          <span>Operador</span>
          <strong>{user?.nombreCompleto || 'Sesión activa'}</strong>
          <button className="ghost-button" onClick={onLogout} type="button">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="overline">Panel industrial</p>
            <h1>{greenhouseName || 'Invernadero principal'}</h1>
          </div>

          <div className="topbar-status">
            <StatusPill tone={systemActive ? 'normal' : 'critical'}>
              {systemActive ? 'Sistema Activo' : 'Sistema Apagado'}
            </StatusPill>
            <span className="last-update">Ultima sincronizacion {formatTime(lastUpdated)}</span>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}

