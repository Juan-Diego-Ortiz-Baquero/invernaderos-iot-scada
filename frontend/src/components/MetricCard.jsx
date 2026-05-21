import { formatValue } from '../utils/formatters.js';
import { getMetricState } from '../utils/thresholds.js';

export function MetricCard({ currentAlerts = [], label, metric, systemActive = true, unit, value }) {
  const state = getMetricState(metric, value, currentAlerts, unit, systemActive);

  return (
    <article
      className={`metric-card metric-card--${state.level}`}
      aria-label={`${label}: ${state.label}`}
      style={{ '--metric-progress': `${state.progress}%` }}
    >
      <div className="metric-card__header">
        <span>{label}</span>
        <span className="metric-card__state">{state.label}</span>
      </div>
      <strong>{formatValue(value, unit)}</strong>
      <span className="metric-card__caption">{state.caption}</span>
      {state.progress !== null ? (
        <div className="metric-card__rail" aria-hidden="true">
          <span />
        </div>
      ) : null}
    </article>
  );
}
