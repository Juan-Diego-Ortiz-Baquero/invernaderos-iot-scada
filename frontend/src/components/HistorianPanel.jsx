import { useEffect, useMemo, useState } from 'react';
import { TimeRangeFilter } from './filters/TimeRangeFilter.jsx';
import { getHistory } from '../services/invernaderosApi.js';
import { formatDateTime, formatLocalDateTime, formatValue } from '../utils/formatters.js';
import {
  chooseHistoryResolution,
  getDefaultTimeRange,
  getRangeDurationLabel,
  toTimeRangeQuery,
  validateTimeRange,
} from '../utils/timeRange.js';

const metrics = [
  { key: 'temperature', label: 'Temperatura', field: 'temperaturaPromedio', unit: '°C', className: 'chart-line--temp' },
  { key: 'humidity', label: 'Humedad aire', field: 'humedadPromedio', unit: '%', className: 'chart-line--humidity' },
  { key: 'soil', label: 'Humedad suelo', field: 'humedadSueloPromedio', unit: '%', className: 'chart-line--soil' },
  { key: 'light', label: 'Luminosidad', field: 'luminosidadPromedio', unit: ' lx', className: 'chart-line--light' },
  { key: 'air', label: 'Gas', field: 'calidadAirePromedio', unit: ' ppm', className: 'chart-line--air' },
];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildPath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function formatAxisPointDate(value, resolution) {
  if (!value) return 'Sin fecha';
  const options =
    resolution === 'minuto' || resolution === 'hora'
      ? { hour: '2-digit' }
      : resolution === 'dia' || resolution === 'semana'
        ? { day: '2-digit', month: '2-digit' }
        : { month: '2-digit', year: '2-digit' };

  return new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'America/Bogota' }).format(new Date(value));
}

function formatTooltipPointDate(value) {
  return value ? formatDateTime(value) : 'Sin fecha';
}

function shouldShowAxisLabel(index, total) {
  if (total <= 8) return true;
  return index === 0 || index === total - 1 || index % Math.max(1, Math.ceil(total / 6)) === 0;
}

function getVisibleMetrics(selectedKeys) {
  return metrics.filter((metric) => selectedKeys.includes(metric.key));
}

export function HistorianPanel({ idInvernadero }) {
  const [timeRange, setTimeRange] = useState(() => getDefaultTimeRange());
  const [appliedRange, setAppliedRange] = useState(() => getDefaultTimeRange());
  const [selectedMetricKeys, setSelectedMetricKeys] = useState(() => metrics.map((metric) => metric.key));
  const [history, setHistory] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const visibleMetrics = getVisibleMetrics(selectedMetricKeys);
  const appliedDates = validateTimeRange(appliedRange);
  const currentResolution = appliedDates.valid ? chooseHistoryResolution(appliedDates.start, appliedDates.end) : 'hora';

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
    const timeQuery = toTimeRangeQuery(appliedRange);

    if (!timeQuery.valid) {
      setError(timeQuery.error);
      setStatus('error');
      return undefined;
    }

    const resolucion = chooseHistoryResolution(timeQuery.start, timeQuery.end);

    setStatus('loading');
    setError('');

    getHistory(idInvernadero, {
      desde: timeQuery.desde,
      hasta: timeQuery.hasta,
      resolucion,
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
  }, [idInvernadero, appliedRange]);

  function applyTimeRange() {
    const result = validateTimeRange(timeRange);

    if (!result.valid) {
      setError(result.error);
      setStatus('error');
      return;
    }

    setAppliedRange(timeRange);
  }

  function clearTimeRange() {
    const nextRange = getDefaultTimeRange();
    setTimeRange(nextRange);
    setAppliedRange(nextRange);
    setError('');
  }

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

    const firstSeries = series[0];
    const selectedPoint =
      hoveredPoint ||
      (firstSeries?.coordinates.length
        ? {
            ...firstSeries.coordinates[firstSeries.coordinates.length - 1],
            metricLabel: firstSeries.label,
            unit: firstSeries.unit,
          }
        : null);

    return {
      average: values.length ? values.reduce((total, value) => total + value, 0) / values.length : null,
      height,
      max: values.length ? max : null,
      min: values.length ? min : null,
      padding,
      points,
      selectedPoint,
      series,
      width,
      yTicks: [domainMax, (domainMax + domainMin) / 2, domainMin],
    };
  }, [history, hoveredPoint, selectedMetricKeys, visibleMetrics]);

  const lastPoint = chart.points[chart.points.length - 1];
  const activePoint = hoveredPoint || chart.selectedPoint || null;

  return (
    <section className="panel trend-panel historian-panel" aria-labelledby="historian-title">
      <div className="panel-heading historian-heading">
        <div>
          <p className="overline">Historiador</p>
          <h2 id="historian-title">Tendencias historicas</h2>
        </div>
        <div className="historian-controls" aria-label="Filtros de historiador">
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

      <TimeRangeFilter
        appliedRange={appliedRange}
        busy={status === 'loading'}
        error={error && status === 'error' ? error : ''}
        idPrefix="historian"
        onApply={applyTimeRange}
        onChange={setTimeRange}
        onClear={clearTimeRange}
        range={timeRange}
      />

      <div className="chart-insights" aria-label="Resumen del historiador">
        <div>
          <span>Resolucion</span>
          <strong>{history?.resolucion || currentResolution}</strong>
          <small>{chart.points.length} puntos</small>
        </div>
        <div>
          <span>Promedio visible</span>
          <strong>{formatValue(chart.average, selectedMetricKeys.length === 1 ? visibleMetrics[0]?.unit : '')}</strong>
          <small>{selectedMetricKeys.length === 1 ? visibleMetrics[0]?.label : 'Variables seleccionadas'}</small>
        </div>
        <div>
          <span>Periodo</span>
          <strong>
            {appliedDates.valid ? getRangeDurationLabel(appliedDates.start, appliedDates.end) : 'Sin rango'}
          </strong>
            <small>
              {lastPoint ? `Ultimo punto: ${formatAxisPointDate(lastPoint.fechaInicio, history?.resolucion)}` : 'Esperando historial'}
            </small>
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
                  const x =
                    chart.padding.left +
                    index *
                      ((chart.width - chart.padding.left - chart.padding.right) / Math.max(chart.points.length - 1, 1));
                  const isVisible = shouldShowAxisLabel(index, chart.points.length);

                  return isVisible ? (
                    <text key={`${point.fechaInicio}-${index}`} x={x} y={chart.height - 12}>
                      {formatAxisPointDate(point.fechaInicio, history?.resolucion)}
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
                      aria-label={`${serie.label} ${formatValue(point.value, serie.unit)} en ${formatTooltipPointDate(point.date)}`}
                      onBlur={() => setHoveredPoint(null)}
                      onFocus={() => setHoveredPoint({ ...point, metricLabel: serie.label, unit: serie.unit })}
                      onMouseEnter={() => setHoveredPoint({ ...point, metricLabel: serie.label, unit: serie.unit })}
                      onMouseLeave={() => setHoveredPoint(null)}
                      role="button"
                      tabIndex="0"
                      key={`${serie.key}-${point.date}`}
                      r="3"
                    />
                  ))}
                </g>
              ))}
              {activePoint && activePoint.value !== null ? (
                <g className="chart-cursor">
                  <line
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={chart.padding.top}
                    y2={chart.height - chart.padding.bottom}
                  />
                  <circle cx={activePoint.x} cy={activePoint.y} r="7" />
                  <text x={Math.min(activePoint.x + 12, chart.width - 178)} y={Math.max(activePoint.y - 12, 20)}>
                    {formatTooltipPointDate(activePoint.date)} · {activePoint.metricLabel} ·{' '}
                    {formatValue(activePoint.value, activePoint.unit || '')}
                  </text>
                </g>
              ) : null}
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
