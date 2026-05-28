import { useEffect, useMemo, useState } from 'react';
import { TimeRangeFilter } from '../components/filters/TimeRangeFilter.jsx';
import { AnalyticsBreakdown } from '../components/analytics/AnalyticsBreakdown.jsx';
import { AnalyticsDrilldownTable } from '../components/analytics/AnalyticsDrilldownTable.jsx';
import { AnalyticsKpiGrid } from '../components/analytics/AnalyticsKpiGrid.jsx';
import { AnalyticsRanking } from '../components/analytics/AnalyticsRanking.jsx';
import { AnalyticsTrendChart } from '../components/analytics/AnalyticsTrendChart.jsx';
import { getHistory, getReadingsQuery } from '../services/invernaderosApi.js';
import {
  ANALYTICS_METRICS,
  ANALYTICS_RESOLUTIONS,
  compareHalves,
  findPeak,
  getMetric,
  summarizeHistory,
} from '../utils/analytics.js';
import {
  chooseHistoryResolution,
  formatAppliedRange,
  getDefaultTimeRange,
  toTimeRangeQuery,
  validateTimeRange,
} from '../utils/timeRange.js';

export function AnalyticsView({ greenhouseName, idInvernadero }) {
  const [timeRange, setTimeRange] = useState(() => getDefaultTimeRange());
  const [appliedRange, setAppliedRange] = useState(() => getDefaultTimeRange());
  const [metricKey, setMetricKey] = useState('temperature');
  const [estado, setEstado] = useState('todos');
  const [resolution, setResolution] = useState('auto');
  const [drilldownPage, setDrilldownPage] = useState(1);
  const [history, setHistory] = useState(null);
  const [readingsResult, setReadingsResult] = useState(null);
  const [alertResult, setAlertResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const metric = getMetric(metricKey);
  const points = history?.puntos || [];
  const summary = useMemo(() => summarizeHistory(points, metric), [metric, points]);
  const comparison = useMemo(() => compareHalves(points, metric), [metric, points]);
  const highPeak = useMemo(() => findPeak(points, metric, 'max'), [metric, points]);
  const lowPeak = useMemo(() => findPeak(points, metric, 'min'), [metric, points]);
  const selectedResolution = history?.resolucion || resolution;

  useEffect(() => {
    let isMounted = true;
    const timeQuery = toTimeRangeQuery(appliedRange);

    if (!timeQuery.valid) {
      setError(timeQuery.error);
      setStatus('error');
      return undefined;
    }

    const resolvedResolution =
      resolution === 'auto' ? chooseHistoryResolution(timeQuery.start, timeQuery.end) : resolution;
    const soloAlertas = estado === 'todos' ? '' : estado === 'alertas';

    setStatus((current) => (current === 'idle' ? 'loading' : 'refreshing'));
    setError('');

    Promise.all([
      getHistory(idInvernadero, {
        desde: timeQuery.desde,
        hasta: timeQuery.hasta,
        resolucion: resolvedResolution,
        soloAlertas,
      }),
      getReadingsQuery(idInvernadero, {
        desde: timeQuery.desde,
        hasta: timeQuery.hasta,
        soloAlertas,
        pagina: drilldownPage,
        tamanoPagina: 25,
      }),
      getReadingsQuery(idInvernadero, {
        desde: timeQuery.desde,
        hasta: timeQuery.hasta,
        soloAlertas: true,
        pagina: 1,
        tamanoPagina: 10,
      }),
    ])
      .then(([historyResponse, readingsResponse, alertResponse]) => {
        if (!isMounted) return;
        setHistory(historyResponse);
        setReadingsResult(readingsResponse);
        setAlertResult(alertResponse);
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
  }, [appliedRange, drilldownPage, estado, idInvernadero, resolution]);

  function applyTimeRange() {
    const result = validateTimeRange(timeRange);

    if (!result.valid) {
      setError(result.error);
      setStatus('error');
      return;
    }

    setDrilldownPage(1);
    setAppliedRange(timeRange);
  }

  function clearTimeRange() {
    const nextRange = getDefaultTimeRange();
    setTimeRange(nextRange);
    setAppliedRange(nextRange);
    setDrilldownPage(1);
    setError('');
  }

  function handleEstadoChange(nextEstado) {
    setDrilldownPage(1);
    setEstado(nextEstado);
  }

  function handleResolutionChange(nextResolution) {
    setDrilldownPage(1);
    setResolution(nextResolution);
  }

  return (
    <main className="analytics-page" id="analitica">
      <section className="analytics-hero">
        <div>
          <p className="overline">Analitica</p>
          <h2>Centro historico y comparativo</h2>
          <p>
            Lectura ejecutiva del comportamiento ambiental: que cambia, cuando ocurre y donde se concentra la atencion.
          </p>
        </div>
        <div className="analytics-range-card">
          <span>Rango activo</span>
          <strong>{formatAppliedRange(appliedRange)}</strong>
          <small>{greenhouseName}</small>
        </div>
      </section>

      <section className="analytics-filter-panel" aria-label="Filtros globales de analitica">
        <TimeRangeFilter
          appliedRange={appliedRange}
          busy={status === 'loading' || status === 'refreshing'}
          error={error && status === 'error' ? error : ''}
          idPrefix="analytics"
          onApply={applyTimeRange}
          onChange={setTimeRange}
          onClear={clearTimeRange}
          range={timeRange}
        />

        <div className="analytics-global-filters">
          <label>
            Variable
            <select value={metricKey} onChange={(event) => setMetricKey(event.target.value)}>
              {ANALYTICS_METRICS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select value={estado} onChange={(event) => handleEstadoChange(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="normal">Normal</option>
              <option value="alertas">Alertas</option>
            </select>
          </label>
          <label>
            Resolucion
            <select value={resolution} onChange={(event) => handleResolutionChange(event.target.value)}>
              {ANALYTICS_RESOLUTIONS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Invernadero
            <select value={idInvernadero} disabled>
              <option value={idInvernadero}>{greenhouseName}</option>
            </select>
          </label>
        </div>
      </section>

      {error && status !== 'error' ? <p className="empty-state">{error}</p> : null}

      <AnalyticsKpiGrid
        alertCount={alertResult?.totalRegistros || 0}
        comparison={comparison}
        metric={metric}
        summary={summary}
      />

      <section className="analytics-layout">
        <AnalyticsTrendChart metric={metric} points={points} resolution={selectedResolution} />
        <AnalyticsBreakdown
          alertCount={alertResult?.totalRegistros || 0}
          comparison={comparison}
          greenhouseName={greenhouseName}
          highPeak={highPeak}
          lowPeak={lowPeak}
          metric={metric}
          summary={summary}
        />
      </section>

      <section className="analytics-lower-grid">
        <AnalyticsRanking
          alertCount={alertResult?.totalRegistros || 0}
          greenhouseName={greenhouseName}
          totalReadings={readingsResult?.totalRegistros || 0}
        />
        <AnalyticsDrilldownTable
          metric={metric}
          currentPage={readingsResult?.pagina || drilldownPage}
          onPageChange={setDrilldownPage}
          pageSize={25}
          readings={readingsResult?.lecturas || []}
          total={readingsResult?.totalRegistros || 0}
          totalPages={readingsResult?.totalPaginas || 1}
        />
      </section>

      {status === 'loading' ? <p className="empty-state">Cargando analitica historica desde la API.</p> : null}
      {status === 'error' ? <p className="empty-state">{error}</p> : null}
    </main>
  );
}
