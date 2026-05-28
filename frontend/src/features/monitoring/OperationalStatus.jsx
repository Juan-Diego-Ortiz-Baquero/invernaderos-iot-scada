export function OperationalStatus({ alertSummary, currentAlerts, latestReading, systemActive }) {
  return (
    <>
      {currentAlerts.length ? (
        <section className="critical-ribbon" data-reveal role="status">
          <strong>{alertSummary.label}</strong>
          <span>{alertSummary.detail}</span>
        </section>
      ) : null}

      {!systemActive && latestReading ? (
        <section className="stale-ribbon" data-reveal role="status">
          <strong>Sistema Apagado</strong>
          <span>Mostrando la ultima lectura guardada por la API.</span>
        </section>
      ) : null}
    </>
  );
}
