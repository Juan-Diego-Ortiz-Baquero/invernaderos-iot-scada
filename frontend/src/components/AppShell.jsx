import { formatTime } from '../utils/formatters.js';
import { StatusPill } from './StatusPill.jsx';

const navItems = [
  { key: 'monitoring', label: 'Monitoreo' },
  { key: 'analytics', label: 'Analitica' },
  { key: 'alerts', label: 'Alertas', targetId: 'alertas' },
  { key: 'readings', label: 'Lecturas', targetId: 'lecturas' },
];

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

        <nav className="nav-list" aria-label="Secciones del panel">
          {navItems.map((item) => (
            <button
              className={`nav-link ${activeSection === item.key ? 'nav-link--active' : ''}`}
              key={item.key}
              onClick={() => handleNavigation(item)}
              type="button"
            >
              {item.label}
            </button>
          ))}
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

