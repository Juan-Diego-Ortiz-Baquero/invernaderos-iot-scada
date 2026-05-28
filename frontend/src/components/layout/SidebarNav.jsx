const navItems = [
  { key: 'monitoring', label: 'Monitoreo' },
  { key: 'analytics', label: 'Analitica' },
  { key: 'alerts', label: 'Alertas', targetId: 'alertas' },
  { key: 'readings', label: 'Lecturas', targetId: 'lecturas' },
];

export function SidebarNav({ activeSection, onNavigate }) {
  return (
    <nav className="nav-list" aria-label="Secciones del panel">
      {navItems.map((item) => (
        <button
          className={`nav-link ${activeSection === item.key ? 'nav-link--active' : ''}`}
          key={item.key}
          onClick={() => onNavigate(item)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
