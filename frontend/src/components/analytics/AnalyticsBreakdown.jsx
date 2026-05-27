import { formatDateTime, formatValue } from '../../utils/formatters.js';

export function AnalyticsBreakdown({ alertCount, comparison, greenhouseName, highPeak, lowPeak, metric, summary }) {
  const changeTone = comparison.change === null ? 'Sin datos' : comparison.change >= 0 ? 'Aumento' : 'Descenso';

  return (
    <section className="analytics-side-grid" aria-label="Comparativos y contexto">
      <article className="analytics-card">
        <div className="analytics-section-heading">
          <div>
            <span>Comparativo temporal</span>
            <h3>Tramos del periodo</h3>
          </div>
        </div>
        <div className="comparison-stack">
          <div>
            <span>Primer tramo</span>
            <strong>{formatValue(comparison.firstAverage, metric.unit)}</strong>
          </div>
          <div>
            <span>Segundo tramo</span>
            <strong>{formatValue(comparison.secondAverage, metric.unit)}</strong>
          </div>
          <div>
            <span>{changeTone}</span>
            <strong>{formatValue(comparison.change, metric.unit)}</strong>
          </div>
        </div>
      </article>

      <article className="analytics-card">
        <div className="analytics-section-heading">
          <div>
            <span>Picos del rango</span>
            <h3>Momentos criticos</h3>
          </div>
        </div>
        <div className="peak-list">
          <div>
            <span>Mayor {metric.label.toLowerCase()}</span>
            <strong>{formatValue(highPeak?.value, metric.unit)}</strong>
            <small>{highPeak ? formatDateTime(highPeak.point.fechaInicio) : 'Sin registro'}</small>
          </div>
          <div>
            <span>Menor {metric.label.toLowerCase()}</span>
            <strong>{formatValue(lowPeak?.value, metric.unit)}</strong>
            <small>{lowPeak ? formatDateTime(lowPeak.point.fechaInicio) : 'Sin registro'}</small>
          </div>
        </div>
      </article>

      <article className="analytics-card">
        <div className="analytics-section-heading">
          <div>
            <span>Lectura ejecutiva</span>
            <h3>Que requiere atencion</h3>
          </div>
        </div>
        <p className="analytics-story">
          {alertCount
            ? `${greenhouseName} concentra ${alertCount} lecturas en alerta durante el rango. Revise los picos y el detalle antes de ajustar actuadores.`
            : `${greenhouseName} no registra lecturas en alerta para el rango filtrado. Mantenga seguimiento sobre ${metric.label.toLowerCase()} y variacion temporal.`}
        </p>
        <small>{summary.readings} lecturas agregadas en el historial.</small>
      </article>

      <article className="analytics-card map-card">
        <div className="analytics-section-heading">
          <div>
            <span>Georreferenciacion</span>
            <h3>Base para mapa</h3>
          </div>
        </div>
        <div className="map-placeholder" role="img" aria-label="Mapa pendiente de coordenadas">
          <span />
          <strong>{greenhouseName}</strong>
          <small>Sin latitud/longitud disponible en la API actual.</small>
        </div>
      </article>
    </section>
  );
}
