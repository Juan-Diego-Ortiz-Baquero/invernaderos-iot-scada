import { formatDateTime } from '../utils/formatters.js';

export function SummaryStrip({ dashboard, unresolvedAlerts }) {
  return (
    <section className="summary-strip" aria-label="Resumen del sistema">
      <div>
        <span>Alertas sin resolver</span>
        <strong>{unresolvedAlerts}</strong>
      </div>
      <div>
        <span>Lecturas hoy</span>
        <strong>{dashboard?.totalLecturasHoy ?? 0}</strong>
      </div>
      <div>
        <span>Última lectura</span>
        <strong>{formatDateTime(dashboard?.ultimaLectura)}</strong>
      </div>
    </section>
  );
}
