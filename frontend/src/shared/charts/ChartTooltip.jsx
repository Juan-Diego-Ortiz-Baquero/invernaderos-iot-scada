import { formatDateTime, formatValue } from '../../utils/formatters.js';

export function ChartTooltip({ metric, point }) {
  if (!point) return null;

  return (
    <div
      className="chart-tooltip"
      style={{
        '--tooltip-x': `${point.x}px`,
        '--tooltip-y': `${point.y}px`,
      }}
    >
      <span>{formatDateTime(point.date)}</span>
      <strong>{formatValue(point.value, metric.unit)}</strong>
      <small>{point.readings} lecturas agrupadas</small>
    </div>
  );
}
