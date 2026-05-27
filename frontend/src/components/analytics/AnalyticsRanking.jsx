import { formatValue } from '../../utils/formatters.js';

export function AnalyticsRanking({ alertCount, greenhouseName, totalReadings }) {
  const percentage = totalReadings ? Math.min(100, (alertCount / totalReadings) * 100) : 0;

  return (
    <section className="analytics-card analytics-ranking" aria-labelledby="analytics-ranking-title">
      <div className="analytics-section-heading">
        <div>
          <span>Ranking operativo</span>
          <h3 id="analytics-ranking-title">Zonas con mas alertas</h3>
        </div>
      </div>
      <div className="ranking-row">
        <div>
          <strong>{greenhouseName}</strong>
          <small>Invernadero activo</small>
        </div>
        <span>{formatValue(alertCount)} alertas</span>
      </div>
      <div className="ranking-meter" aria-hidden="true">
        <span style={{ width: `${percentage}%` }} />
      </div>
      <small>
        {totalReadings
          ? `${formatValue(percentage)}% de las lecturas filtradas estan en alerta.`
          : 'Sin lecturas para calcular participacion.'}
      </small>
    </section>
  );
}
