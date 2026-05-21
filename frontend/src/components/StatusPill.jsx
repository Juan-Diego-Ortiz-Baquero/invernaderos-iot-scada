export function StatusPill({ tone = 'normal', children }) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
