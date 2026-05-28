import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ChartTooltip } from '../../shared/charts/ChartTooltip.jsx';
import { EmptyState } from '../../shared/ui/EmptyState.jsx';
import { formatDateTime, formatValue } from '../../utils/formatters.js';
import { getPointValue } from '../../utils/analytics.js';

function buildPath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

export function AnalyticsTrendChart({ metric, points, resolution }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const chartRef = useRef(null);

  const chart = useMemo(() => {
    const width = 920;
    const height = 340;
    const padding = { top: 28, right: 28, bottom: 48, left: 68 };
    const values = points.map((point) => getPointValue(point, metric)).filter((value) => value !== null);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const paddingValue = Math.max((max - min) * 0.12, metric.unit === '%' ? 2 : 1);
    const domainMin = Math.max(metric.unit === '%' ? 0 : min - paddingValue, min - paddingValue);
    const domainMax = max + paddingValue;
    const span = Math.max(domainMax - domainMin, 1);
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const step = points.length > 1 ? chartWidth / (points.length - 1) : chartWidth;

    const coordinates = points
      .map((point, index) => {
        const value = getPointValue(point, metric);
        if (value === null) return null;

        return {
          alerts: point.tieneAlertas,
          date: point.fechaInicio,
          readings: point.totalLecturas,
          value,
          x: padding.left + index * step,
          y: padding.top + chartHeight - ((value - domainMin) / span) * chartHeight,
        };
      })
      .filter(Boolean);

    return {
      coordinates,
      height,
      padding,
      path: buildPath(coordinates),
      selected: selectedIndex === null ? null : coordinates[selectedIndex] || null,
      width,
      yTicks: [domainMax, (domainMax + domainMin) / 2, domainMin],
    };
  }, [metric, points, selectedIndex]);

  useLayoutEffect(() => {
    if (!chartRef.current) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const context = gsap.context(() => {
      chartRef.current.querySelectorAll('.chart-line').forEach((path) => {
        const length = path.getTotalLength?.() || 900;
        gsap.fromTo(
          path,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 0.72, ease: 'power3.out' },
        );
      });
      gsap.fromTo(
        chartRef.current.querySelectorAll('.chart-point'),
        { autoAlpha: 0, scale: 0.82, transformOrigin: 'center' },
        { autoAlpha: 1, scale: 1, duration: 0.28, ease: 'power2.out', stagger: 0.01 },
      );
    }, chartRef);

    return () => context.revert();
  }, [metric.key, points]);

  if (!chart.coordinates.length) {
    return <EmptyState title="Sin puntos para graficar">Ajusta el rango temporal o cambia la resolucion.</EmptyState>;
  }

  const maxAxisLabels = 6;
  const axisStep = Math.max(1, Math.ceil(chart.coordinates.length / maxAxisLabels));

  return (
    <section className="analytics-card analytics-main-chart" aria-labelledby="analytics-trend-title">
      <div className="analytics-section-heading">
        <div>
          <span>Tendencia principal</span>
          <h3 id="analytics-trend-title">{metric.label}</h3>
        </div>
        <small>Resolucion: {resolution}</small>
      </div>

      <div className="chart-wrap chart-wrap--interactive" ref={chartRef}>
        <ChartTooltip metric={metric} point={chart.selected} />
        <svg
          className="trend-svg analytics-svg"
          onMouseLeave={() => setSelectedIndex(null)}
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          role="img"
        >
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
                    {formatValue(tick, metric.unit)}
                  </text>
                </g>
              );
            })}
          </g>

          <g className="chart-axis">
            {chart.coordinates.map((point, index) => {
              const isVisible = index === 0 || index === chart.coordinates.length - 1 || index % axisStep === 0;
              return isVisible ? (
                <text key={`${point.date}-${index}`} x={point.x} y={chart.height - 12}>
                  {formatDateTime(point.date)}
                </text>
              ) : null;
            })}
          </g>

          <g className={`chart-series ${metric.className}`}>
            <path className="chart-line" d={chart.path} />
            {chart.coordinates.map((point, index) => (
              <g
                aria-label={`${metric.label}: ${formatValue(point.value, metric.unit)} en ${formatDateTime(point.date)}`}
                className="chart-point-hit"
                key={`${point.date}-${point.value}`}
                onClick={() => setSelectedIndex(index)}
                onFocus={() => setSelectedIndex(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelectedIndex(index);
                  }
                }}
                role="button"
                tabIndex="0"
              >
                <title>
                  {formatDateTime(point.date)} - {formatValue(point.value, metric.unit)} - {point.readings} lecturas
                </title>
                <circle className="chart-point-target" cx={point.x} cy={point.y} r="12" />
                <circle
                  className={point === chart.selected ? 'chart-point chart-point--active' : 'chart-point'}
                  cx={point.x}
                  cy={point.y}
                  r={point.alerts ? 5 : 3.5}
                />
              </g>
            ))}
            {chart.selected ? (
              <g className="chart-cursor">
                <line
                  x1={chart.selected.x}
                  x2={chart.selected.x}
                  y1={chart.padding.top}
                  y2={chart.height - chart.padding.bottom}
                />
                <circle cx={chart.selected.x} cy={chart.selected.y} r="7" />
                <text x={Math.min(chart.selected.x + 12, chart.width - 260)} y={Math.max(chart.selected.y - 12, 20)}>
                  {formatValue(chart.selected.value, metric.unit)} - {chart.selected.readings} lecturas
                </text>
              </g>
            ) : null}
          </g>
        </svg>
      </div>
    </section>
  );
}
