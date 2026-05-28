import { Dashboard } from '../components/Dashboard.jsx';

export function MonitoringView({
  dashboardData,
  idInvernadero,
  systemActive,
}) {
  return (
    <main className="view-stack view-stack--monitoring">
      {dashboardData.error ? (
        <section className="error-banner" role="alert">
          <strong>No se pudo sincronizar con la API.</strong>
          <span>{dashboardData.error}</span>
          <button className="small-button" onClick={dashboardData.refresh} type="button">
            Reintentar
          </button>
        </section>
      ) : null}

      <Dashboard
        alerts={dashboardData.alerts}
        dashboard={dashboardData.dashboard}
        idInvernadero={idInvernadero}
        latestReading={dashboardData.latestReading}
        onRefresh={dashboardData.refresh}
        onResolveAlert={dashboardData.resolveAlert}
        onResolvePendingAlerts={dashboardData.resolvePendingAlerts}
        readings={dashboardData.readings}
        statistics={dashboardData.statistics}
        status={dashboardData.status}
        systemActive={systemActive}
        unresolvedAlerts={dashboardData.unresolvedAlerts}
      />
    </main>
  );
}
