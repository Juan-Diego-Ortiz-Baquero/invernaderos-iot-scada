import { useMemo, useState } from 'react';
import { formatValue } from '../utils/formatters.js';

const metricOptions = [
  {
    key: 'temperature',
    label: 'Temperatura',
    field: 'tempPromedio',
    unit: '°C',
    className: 'chart-line--temp',
    precision: 1,
  },
  {
    key: 'humidity',
    label: 'Humedad aire',
    field: 'humedadPromedio',
    unit: '%',
    className: 'chart-line--humidity',
    precision: 1,
  },
  {
    key: 'soil',
    label: 'Humedad suelo',
    field: 'humedadSueloProm',
    unit: '%',
    className: 'chart-line--soil',
    precision: 1,
  },
  {
    key: 'light',
    label: 'Luminosidad',
    field: 'luminosidadProm',
    unit: ' lx',
    className: 'chart-line--light',
    precision: 0,
  },
];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getMetricValue(point, metric) {
  return toNumber(point?.[metric.field]);
}

function getDomain(points, metric) {
  const values = points.map((point) => getMetricValue(point, metric)).filter((value) => value !== null);
  if (!values.length) return { min: 0, max: 1, values };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, metric.unit === '%' ? 2 : 1);

  return {
    min: Math.max(metric.unit === '%' ? 0 : min - padding, min - padding),
    max: max + padding,
    values,
  };
}

function getCoordinates(points, metric, width, height, padding, min, max) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const span = Math.max(max - min, 1);
  const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

  return points
    .map((point, index) => {
      const value = getMetricValue(point, metric);
      if (value === null) return null;

      return {
        hour: point.hora,
        readings: point.totalLecturas,
        value,
        x: padding.left + index * step,
        y: padding.top + chartHeight - ((value - min) / span) * chartHeight,
      };
    })
    .filter(Boolean);
}

function buildPath(coordinates) {
  return coordinates
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function buildArea(path, coordinates, height, padding) {
  if (!path || !coordinates.length) return '';
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];
  return `${path} L ${last.x.toFixed(2)} ${height - padding.bottom} L ${first.x.toFixed(2)} ${
    height - padding.bottom
  } Z`;
}

function toBogotaHour(hour) {
  return (Number(hour) + 19) % 24;
}

function formatHour(hour) {
  return `${String(toBogotaHour(hour)).padStart(2, '0')}:00`;
}

export function TrendChart({ statistics }) {
  const points = statistics.length ? [...statistics].sort((a, b) => a.hora - b.hora) : [];
  const [selectedMetricKey, setSelectedMetricKey] = useState('temperature');
  const [selectedIndex, setSelectedIndex] = useState(null);

  const selectedMetric = metricOptions.find((metric) => metric.key === selectedMetricKey) || metricOptions[0];
  const width = 720;
  const height = 300;
  const padding = { top: 26, right: 24, bottom: 42, left: 62 };

  const chart = useMemo(() => {
    const domain = getDomain(points, selectedMetric);
    const coordinates = getCoordinates(points, selectedMetric, width, height, padding, domain.min, domain.max);
    const path = buildPath(coordinates);
    const selectedPoint =
      coordinates[selectedIndex] || coordinates[coordinates.length - 1] || {
        hour: null,
        readings: 0,
        value: null,
        x: 0,
        y: 0,
      };
    const average = domain.values.length
      ? domain.values.reduce((total, value) => total + value, 0) / domain.values.length
      : null;

    return {
      average,
      coordinates,
      max: domain.values.length ? Math.max(...domain.values) : null,
      min: domain.values.length ? Math.min(...domain.values) : null,
      path,
      area: buildArea(path, coordinates, height, padding),
      selectedPoint,
      yTicks: [domain.max, (domain.max + domain.min) / 2, domain.min],
    };
  }, [points, selectedIndex, selectedMetric]);

  function handleMetricChange(metricKey) {
    setSelectedMetricKey(metricKey);
    setSelectedIndex(null);
  }

  return (
    <section className="panel trend-panel" aria-labelledby="trend-title">
      <div className="panel-heading trend-heading">
        <div>
          <p className="overline">Tendencia diaria</p>
          <h2 id="trend-title">Promedios por hora</h2>
        </div>
        <div className="chart-tabs" role="tablist" aria-label="Variable de tendencia">
          {metricOptions.map((metric) => (
            <button
              aria-selected={metric.key === selectedMetric.key}
              className="chart-tab"
              key={metric.key}
              onClick={() => handleMetricChange(metric.key)}
              role="tab"
              type="button"
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      {points.length && chart.coordinates.length ? (
        <>
          <div className="chart-insights" aria-label={`Resumen de ${selectedMetric.label}`}>
            <div>
              <span>Actual</span>
              <strong>{formatValue(chart.selectedPoint.value, selectedMetric.unit)}</strong>
              <small>{chart.selectedPoint.hour !== null ? formatHour(chart.selectedPoint.hour) : 'Sin hora'}</small>
            </div>
            <div>
              <span>Promedio</span>
              <strong>{formatValue(chart.average, selectedMetric.unit)}</strong>
              <small>{points.length} horas agrupadas</small>
            </div>
            <div>
              <span>Rango</span>
              <strong>
                {formatValue(chart.min, selectedMetric.unit)} - {formatValue(chart.max, selectedMetric.unit)}
              </strong>
              <small>{chart.selectedPoint.readings || 0} lecturas en el punto</small>
            </div>
          </div>

          <div className="chart-wrap">
            <svg
              className="trend-svg"
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label={`${selectedMetric.label} promedio por hora en ${selectedMetric.unit.trim() || 'unidad'}`}
            >
              <defs>
                <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
              </defs>

              <g className="chart-grid">
                {chart.yTicks.map((tick) => {
                  const y =
                    padding.top +
                    (height - padding.top - padding.bottom) *
                      (1 - (tick - chart.yTicks[2]) / Math.max(chart.yTicks[0] - chart.yTicks[2], 1));

                  return (
                    <g key={tick.toFixed(3)}>
                      <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                      <text x={padding.left - 12} y={y + 4}>
                        {formatValue(tick, selectedMetric.unit)}
                      </text>
                    </g>
                  );
                })}
              </g>

              <g className="chart-axis">
                {chart.coordinates.map((point, index) => {
                  const isVisible = index === 0 || index === chart.coordinates.length - 1 || index % 3 === 0;
                  return isVisible ? (
                    <text key={point.hour} x={point.x} y={height - 12}>
                      {formatHour(point.hour)}
                    </text>
                  ) : null;
                })}
              </g>

              <g className={`chart-series ${selectedMetric.className}`}>
                <path className="chart-area" d={chart.area} />
                <path className="chart-line" d={chart.path} />
                {chart.coordinates.map((point, index) => (
                  <g
                    aria-label={`${selectedMetric.label} ${formatValue(point.value, selectedMetric.unit)} a las ${formatHour(
                      point.hour,
                    )}`}
                    className="chart-point-hit"
                    key={`${point.hour}-${point.value}`}
                    onClick={() => setSelectedIndex(index)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedIndex(index);
                      }
                    }}
                    role="button"
                    tabIndex="0"
                  >
                    <circle className="chart-point-target" cx={point.x} cy={point.y} r="12" />
                    <circle
                      className={point === chart.selectedPoint ? 'chart-point chart-point--active' : 'chart-point'}
                      cx={point.x}
                      cy={point.y}
                      r={point === chart.selectedPoint ? 5 : 3.5}
                    />
                  </g>
                ))}
                {chart.selectedPoint.value !== null ? (
                  <g className="chart-cursor">
                    <line
                      x1={chart.selectedPoint.x}
                      x2={chart.selectedPoint.x}
                      y1={padding.top}
                      y2={height - padding.bottom}
                    />
                    <circle cx={chart.selectedPoint.x} cy={chart.selectedPoint.y} r="7" />
                    <text x={Math.min(chart.selectedPoint.x + 12, width - 178)} y={Math.max(chart.selectedPoint.y - 12, 20)}>
                      {formatHour(chart.selectedPoint.hour)} · {formatValue(chart.selectedPoint.value, selectedMetric.unit)}
                    </text>
                  </g>
                ) : null}
              </g>
            </svg>
          </div>
        </>
      ) : (
        <p className="empty-state">La API todavia no tiene promedios suficientes para graficar hoy.</p>
      )}
    </section>
  );
}
