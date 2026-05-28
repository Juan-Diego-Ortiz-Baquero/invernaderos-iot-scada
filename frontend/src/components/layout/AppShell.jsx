import { formatTime } from '../../utils/formatters.js';
import { SidebarNav } from './SidebarNav.jsx';
import { StatusPill } from '../StatusPill.jsx';

export function AppShell({
  activeSection,
  children,
  greenhouseName,
  lastUpdated,
  onLogout,
  onSectionChange,
  systemActive,
  user,
}) {
  function handleNavigation(item) {
    onSectionChange(item.key);

    if (item.targetId) {
      window.setTimeout(() => {
        document.getElementById(item.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 0);
    }
  }

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

        <SidebarNav activeSection={activeSection} onNavigate={handleNavigation} />

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

