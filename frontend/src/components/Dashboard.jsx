import { LiveMetricsGrid } from '../features/monitoring/LiveMetricsGrid.jsx';
import { MonitoringCommand } from '../features/monitoring/MonitoringCommand.jsx';
import { OperationalStatus } from '../features/monitoring/OperationalStatus.jsx';
import { parseApiDate } from '../utils/formatters.js';
import { AlertsPanel } from './AlertsPanel.jsx';
import { HistorianPanel } from './HistorianPanel.jsx';
import { ReadingsTable } from './ReadingsTable.jsx';
import { SummaryStrip } from './SummaryStrip.jsx';

function formatAlertSummary(alerts) {
  const count = alerts.length;
  const label = count === 1 ? 'alerta actual' : 'alertas actuales';
  const types = [...new Set(alerts.map((alert) => alert.tipoAlerta).filter(Boolean))]
    .slice(0, 3)
    .map((type) => type.replaceAll('_', ' ').toLowerCase())
    .join(', ');

  return {
    label: `${count} ${label}`,
    detail: types ? `Reportadas por la ultima lectura: ${types}.` : 'Reportadas por la ultima lectura.',
  };
}

function getCurrentAlerts(alerts, latestReading) {
  if (!latestReading?.esAlerta || !latestReading?.fechaHora) return [];

  const latestTime = parseApiDate(latestReading.fechaHora)?.getTime();
  if (!Number.isFinite(latestTime)) return [];

  return alerts.filter((alert) => {
    if (alert.resuelta || !alert.fechaHora) return false;
    const alertTime = parseApiDate(alert.fechaHora)?.getTime();
    if (!Number.isFinite(alertTime)) return false;
    return Math.abs(alertTime - latestTime) <= 120000;
  });
}

export function Dashboard({
  alerts,
  dashboard,
  idInvernadero,
  latestReading,
  onRefresh,
  onResolveAlert,
  onResolvePendingAlerts,
  readings,
  statistics,
  status,
  systemActive,
  unresolvedAlerts,
}) {
  const currentAlerts = systemActive ? getCurrentAlerts(alerts, latestReading) : [];
  const alertSummary = formatAlertSummary(currentAlerts);

  if (status === 'loading') {
    return (
      <main className="dashboard-grid" id="dashboard">
        <section className="skeleton-metrics" aria-label="Cargando datos">
          {[0, 1, 2, 3, 4].map((item) => (
            <span key={item} />
          ))}
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-grid" id="dashboard">
      <MonitoringCommand onRefresh={onRefresh} status={status} systemActive={systemActive} />

      <OperationalStatus
        alertSummary={alertSummary}
        currentAlerts={currentAlerts}
        latestReading={latestReading}
        systemActive={systemActive}
      />

      <SummaryStrip dashboard={dashboard} unresolvedAlerts={unresolvedAlerts.length} />

      <LiveMetricsGrid
        currentAlerts={currentAlerts}
        dashboard={dashboard}
        latestReading={latestReading}
        systemActive={systemActive}
      />

      <div className="content-grid">
        <HistorianPanel idInvernadero={idInvernadero} />
        <AlertsPanel alerts={alerts} onResolve={onResolveAlert} onResolvePending={onResolvePendingAlerts} />
      </div>

      <ReadingsTable idInvernadero={idInvernadero} readings={readings} />
    </main>
  );
}
