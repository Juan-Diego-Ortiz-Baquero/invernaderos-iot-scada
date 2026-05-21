import { parseApiDate } from '../utils/formatters.js';
import { AlertsPanel } from './AlertsPanel.jsx';
import { HistorianPanel } from './HistorianPanel.jsx';
import { MetricCard } from './MetricCard.jsx';
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
      <section className="dashboard-command">
        <div>
          <p className="overline">{systemActive ? 'Telemetria en vivo' : 'Telemetria retenida'}</p>
          <h2>Variables ambientales</h2>
        </div>

        <button
          aria-busy={status === 'refreshing'}
          className="secondary-button"
          disabled={status === 'refreshing'}
          onClick={onRefresh}
          type="button"
        >
          {status === 'refreshing' ? 'Sincronizando' : 'Actualizar'}
        </button>
      </section>

      {currentAlerts.length ? (
        <section className="critical-ribbon" role="status">
          <strong>{alertSummary.label}</strong>
          <span>{alertSummary.detail}</span>
        </section>
      ) : null}

      {!systemActive && latestReading ? (
        <section className="stale-ribbon" role="status">
          <strong>Sistema Apagado</strong>
          <span>Mostrando la ultima lectura guardada por la API.</span>
        </section>
      ) : null}

      <SummaryStrip dashboard={dashboard} unresolvedAlerts={unresolvedAlerts.length} />

      <section className="metrics-grid" aria-label="Metricas ambientales">
        <MetricCard
          currentAlerts={currentAlerts}
          label="Temperatura"
          metric="temperature"
          systemActive={systemActive}
          unit="°C"
          value={dashboard?.ultimaTemperatura ?? latestReading?.temperatura}
        />
        <MetricCard
          currentAlerts={currentAlerts}
          label="Humedad aire"
          metric="humidity"
          systemActive={systemActive}
          unit="%"
          value={dashboard?.ultimaHumedad ?? latestReading?.humedad}
        />
        <MetricCard
          currentAlerts={currentAlerts}
          label="Humedad suelo"
          metric="soil"
          systemActive={systemActive}
          unit="%"
          value={dashboard?.ultimaHumedadSuelo ?? latestReading?.humedadSuelo}
        />
        <MetricCard
          currentAlerts={currentAlerts}
          label="Calidad aire"
          metric="air"
          systemActive={systemActive}
          unit=" ppm"
          value={dashboard?.ultimaCalidadAire}
        />
        <MetricCard
          currentAlerts={currentAlerts}
          label="Luminosidad"
          metric="light"
          systemActive={systemActive}
          unit=" lx"
          value={dashboard?.ultimaLuminosidad}
        />
      </section>

      <div className="content-grid">
        <HistorianPanel idInvernadero={idInvernadero} />
        <AlertsPanel
          alerts={alerts}
          onResolve={onResolveAlert}
          onResolvePending={onResolvePendingAlerts}
        />
      </div>

      <ReadingsTable idInvernadero={idInvernadero} readings={readings} />
    </main>
  );
}
