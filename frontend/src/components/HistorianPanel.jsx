import { useEffect, useMemo, useState } from 'react';
import { getHistory } from '../services/invernaderosApi.js';
import { formatLocalDateTime, formatValue } from '../utils/formatters.js';

const ranges = [
  { key: '24h', label: '24 horas', amount: 24, unit: 'hours', resolution: 'hora' },
  { key: '7d', label: '7 dias', amount: 7, unit: 'days', resolution: 'dia' },
  { key: '15d', label: '15 dias', amount: 15, unit: 'days', resolution: 'dia' },
  { key: '30d', label: '30 dias', amount: 30, unit: 'days', resolution: 'dia' },
  { key: '12m', label: '12 meses', amount: 12, unit: 'months', resolution: 'mes' },
  { key: '5y', label: '5 anos', amount: 5, unit: 'years', resolution: 'anio' },
];

const metrics = [
  { key: 'temperature', label: 'Temperatura', field: 'temperaturaPromedio', unit: '°C', className: 'chart-line--temp' },
  { key: 'humidity', label: 'Humedad aire', field: 'humedadPromedio', unit: '%', className: 'chart-line--humidity' },
  { key: 'soil', label: 'Humedad suelo', field: 'humedadSueloPromedio', unit: '%', className: 'chart-line--soil' },
  { key: 'light', label: 'Luminosidad', field: 'luminosidadPromedio', unit: ' lx', className: 'chart-line--light' },
  { key: 'air', label: 'Gas', field: 'calidadAirePromedio', unit: ' ppm', className: 'chart-line--air' },
];

function addRange(date, range, direction = -1) {
  const next = new Date(date);
  const amount = range.amount * direction;

  if (range.unit === 'hours') next.setHours(next.getHours() + amount);
  if (range.unit === 'days') next.setDate(next.getDate() + amount);
  if (range.unit === 'months') next.setMonth(next.getMonth() + amount);
  if (range.unit === 'years') next.setFullYear(next.getFullYear() + amount);

  return next;
}

function toApiDate(date) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildPath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function formatPointDate(value, resolution) {
  if (!value) return 'Sin fecha';
  const options =
    resolution === 'hora'
      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: '2-digit', year: '2-digit' };

  return new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'America/Bogota' }).format(new Date(value));
}

function getVisibleMetrics(selectedKeys) {
  return metrics.filter((metric) => selectedKeys.includes(metric.key));
}

export function HistorianPanel({ idInvernadero }) {
  const [selectedRangeKey, setSelectedRangeKey] = useState('24h');
  const [selectedMetricKeys, setSelectedMetricKeys] = useState(() => metrics.map((metric) => metric.key));
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const selectedRange = ranges.find((range) => range.key === selectedRangeKey) || ranges[0];
  const visibleMetrics = getVisibleMetrics(selectedMetricKeys);

  function toggleMetric(metricKey) {
    setSelectedMetricKeys((current) => {
      if (metricKey === 'all') return metrics.map((metric) => metric.key);

      const nextMetrics = current.includes(metricKey)
        ? current.filter((selected) => selected !== metricKey)
        : [...current, metricKey];

      return nextMetrics.length ? nextMetrics : [metricKey];
    });
  }

  useEffect(() => {
    let isMounted = true;
    const hasta = new Date();
    const desde = addRange(hasta, selectedRange);

    setStatus('loading');
    setError('');

    getHistory(idInvernadero, {
      desde: toApiDate(desde),
      hasta: toApiDate(hasta),
      resolucion: selectedRange.resolution,
    })
      .then((response) => {
        if (!isMounted) return;
        setHistory(response);
        setStatus('ready');
      })
      .catch((requestError) => {
        if (!isMounted) return;
        setError(requestError.message);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [idInvernadero, selectedRange]);

  const chart = useMemo(() => {
    const points = history?.puntos || [];
    const width = 720;
    const height = 320;
    const padding = { top: 24, right: 24, bottom: 46, left: 62 };
    const values = [];

    visibleMetrics.forEach((metric) => {
      points.forEach((point) => {
        const value = toNumber(point[metric.field]);
        if (value !== null) values.push(value);
      });
    });

    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const paddingValue = Math.max((max - min) * 0.12, 1);
    const domainMin = Math.max(0, min - paddingValue);
    const domainMax = max + paddingValue;
    const span = Math.max(domainMax - domainMin, 1);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

    const series = visibleMetrics.map((metric) => {
      const coordinates = points
        .map((point, index) => {
          const value = toNumber(point[metric.field]);
          if (value === null) return null;

          return {
            date: point.fechaInicio,
            readings: point.totalLecturas,
            value,
            x: padding.left + index * step,
            y: padding.top + chartHeight - ((value - domainMin) / span) * chartHeight,
          };
        })
        .filter(Boolean);

      return { ...metric, coordinates, path: buildPath(coordinates) };
    });

    return {
      average: values.length ? values.reduce((total, value) => total + value, 0) / values.length : null,
      height,
      max: values.length ? max : null,
      min: values.length ? min : null,
      padding,
      points,
      series,
      width,
      yTicks: [domainMax, (domainMax + domainMin) / 2, domainMin],
    };
  }, [history, visibleMetrics]);

  const lastPoint = chart.points[chart.points.length - 1];

  return (
    <section className="panel trend-panel historian-panel" aria-labelledby="historian-title">
      <div className="panel-heading historian-heading">
        <div>
          <p className="overline">Historiador</p>
          <h2 id="historian-title">Tendencias historicas</h2>
        </div>
        <div className="historian-controls" aria-label="Filtros de historiador">
          <div className="chart-tabs" role="tablist" aria-label="Rango historico">
            {ranges.map((range) => (
              <button
                aria-selected={range.key === selectedRange.key}
                className="chart-tab"
                key={range.key}
                onClick={() => setSelectedRangeKey(range.key)}
                role="tab"
                type="button"
              >
                {range.label}
              </button>
            ))}
          </div>
          <details className="multi-select multi-select--wide">
            <summary>
              {selectedMetricKeys.length === metrics.length
                ? 'Todas las variables'
                : `${selectedMetricKeys.length} variables`}
            </summary>
            <div className="multi-select__menu">
              <label>
                <input
                  checked={selectedMetricKeys.length === metrics.length}
                  onChange={() => toggleMetric('all')}
                  type="checkbox"
                />
                Todas
              </label>
              {metrics.map((metric) => (
                <label key={metric.key}>
                  <input
                    checked={selectedMetricKeys.includes(metric.key)}
                    onChange={() => toggleMetric(metric.key)}
                    type="checkbox"
                  />
                  {metric.label}
                </label>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className="chart-insights" aria-label="Resumen del historiador">
        <div>
          <span>Resolucion</span>
          <strong>{history?.resolucion || selectedRange.resolution}</strong>
          <small>{chart.points.length} puntos</small>
        </div>
        <div>
          <span>Promedio visible</span>
          <strong>{formatValue(chart.average, selectedMetricKeys.length === 1 ? visibleMetrics[0]?.unit : '')}</strong>
          <small>{selectedMetricKeys.length === 1 ? visibleMetrics[0]?.label : 'Variables seleccionadas'}</small>
        </div>
        <div>
          <span>Ultimo punto</span>
          <strong>{lastPoint ? formatPointDate(lastPoint.fechaInicio, selectedRange.resolution) : 'Sin datos'}</strong>
          <small>{lastPoint ? `${lastPoint.totalLecturas} lecturas` : 'Esperando historial'}</small>
        </div>
      </div>

      {status === 'error' ? <p className="empty-state">{error}</p> : null}

      {status !== 'error' && chart.points.length ? (
        <>
          <div className="chart-wrap">
            <svg className="trend-svg historian-svg" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img">
              <g className="chart-grid">
                {chart.yTicks.map((tick) => {
                  const y =
                    chart.padding.top +
                    (chart.height - chart.padding.top - chart.padding.bottom) *
                      (1 - (tick - chart.yTicks[2]) / Math.max(chart.yTicks[0] - chart.yTicks[2], 1));

                  return (
                    <g key={tick.toFixed(3)}>
                      <line x1={chart.padding.left} x2={chart.width - chart.padding.right} y1={y} y2={y} />
                      <text x={chart.padding.left - 12} y={y + 4}>
                        {formatValue(tick)}
                      </text>
                    </g>
                  );
                })}
              </g>

              <g className="chart-axis">
                {chart.points.map((point, index) => {
                  const isVisible = index === 0 || index === chart.points.length - 1 || index % 3 === 0;
                  const x =
                    chart.padding.left +
                    index *
                      ((chart.width - chart.padding.left - chart.padding.right) / Math.max(chart.points.length - 1, 1));

                  return isVisible ? (
                    <text key={`${point.fechaInicio}-${index}`} x={x} y={chart.height - 12}>
                      {formatPointDate(point.fechaInicio, selectedRange.resolution)}
                    </text>
                  ) : null;
                })}
              </g>

              {chart.series.map((serie) => (
                <g className={`chart-series ${serie.className}`} key={serie.key}>
                  <path className="chart-line" d={serie.path} />
                  {serie.coordinates.map((point) => (
                    <circle
                      className="chart-point"
                      cx={point.x}
                      cy={point.y}
                      key={`${serie.key}-${point.date}`}
                      r="3"
                    />
                  ))}
                </g>
              ))}
            </svg>
          </div>

          <div className="chart-footer">
            {visibleMetrics.map((metric) => (
              <span className={`legend legend--${metric.key}`} key={metric.key}>
                {metric.label}
              </span>
            ))}
            {history?.desde && history?.hasta ? (
              <span>
                {formatLocalDateTime(history.desde)} - {formatLocalDateTime(history.hasta)}
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {status !== 'error' && !chart.points.length ? (
        <p className="empty-state">
          {status === 'loading' ? 'Consultando historial real de la API.' : 'No hay datos para el rango seleccionado.'}
        </p>
      ) : null}
    </section>
  );
}
