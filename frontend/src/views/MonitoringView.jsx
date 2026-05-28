import { Dashboard } from '../components/Dashboard.jsx';
import { useGsapReveal } from '../hooks/useGsapReveal.js';
import { ErrorBanner } from '../shared/ui/ErrorBanner.jsx';

export function MonitoringView({
  dashboardData,
  idInvernadero,
  systemActive,
}) {
  const revealRef = useGsapReveal([dashboardData.status, systemActive]);

  return (
    <main className="view-stack view-stack--monitoring" ref={revealRef}>
      {dashboardData.error ? (
        <ErrorBanner
          action={
            <button className="small-button" onClick={dashboardData.refresh} type="button">
              Reintentar
            </button>
          }
          message={dashboardData.error}
          title="No se pudo sincronizar con la API."
        />
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
