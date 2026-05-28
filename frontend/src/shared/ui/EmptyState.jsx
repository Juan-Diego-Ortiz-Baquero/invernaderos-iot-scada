export function EmptyState({ children, title = 'Sin datos para mostrar' }) {
  return (
    <div className="empty-state empty-state--composed">
      <span className="empty-state__mark" aria-hidden="true" />
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
