export function MonitoringCommand({ onRefresh, status, systemActive }) {
  return (
    <section className="dashboard-command command-panel" data-reveal>
      <div>
        <p className="overline">{systemActive ? 'Telemetria en vivo' : 'Telemetria retenida'}</p>
        <h2>Variables ambientales</h2>
        <span>Estado general del microclima y senales recientes del dispositivo.</span>
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
  );
}
