import { formatValue } from '../../utils/formatters.js';

export function AnalyticsKpiGrid({ alertCount, comparison, metric, summary }) {
  const trendLabel =
    comparison.change === null
      ? 'Sin comparativo'
      : comparison.change > 0
        ? 'Subio frente al tramo inicial'
        : comparison.change < 0
          ? 'Bajo frente al tramo inicial'
          : 'Sin variacion';

  return (
    <section className="analytics-kpis" aria-label="Indicadores principales">
      <article className="analytics-kpi">
        <span>Promedio</span>
        <strong>{formatValue(summary.average, metric.unit)}</strong>
        <small>{metric.label} en el rango aplicado</small>
      </article>
      <article className="analytics-kpi">
        <span>Pico maximo</span>
        <strong>{formatValue(summary.max, metric.unit)}</strong>
        <small>Mayor valor agrupado</small>
      </article>
      <article className="analytics-kpi">
        <span>Pico minimo</span>
        <strong>{formatValue(summary.min, metric.unit)}</strong>
        <small>Menor valor agrupado</small>
      </article>
      <article className="analytics-kpi analytics-kpi--alert">
        <span>Alertas</span>
        <strong>{formatValue(alertCount)}</strong>
        <small>Lecturas marcadas como alerta</small>
      </article>
      <article className="analytics-kpi">
        <span>Variacion</span>
        <strong>{formatValue(comparison.change, metric.unit)}</strong>
        <small>{trendLabel}</small>
      </article>
    </section>
  );
}
