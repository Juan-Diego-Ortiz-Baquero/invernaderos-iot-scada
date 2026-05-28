import { TimeRangeFilter } from '../components/filters/TimeRangeFilter.jsx';
import { AnalyticsBreakdown } from '../components/analytics/AnalyticsBreakdown.jsx';
import { AnalyticsDrilldownTable } from '../components/analytics/AnalyticsDrilldownTable.jsx';
import { AnalyticsKpiGrid } from '../components/analytics/AnalyticsKpiGrid.jsx';
import { AnalyticsRanking } from '../components/analytics/AnalyticsRanking.jsx';
import { AnalyticsTrendChart } from '../components/analytics/AnalyticsTrendChart.jsx';
import { useAnalyticsData } from '../features/analytics/useAnalyticsData.js';
import { ANALYTICS_METRICS, ANALYTICS_RESOLUTIONS } from '../utils/analytics.js';
import { formatAppliedRange } from '../utils/timeRange.js';
import { useGsapReveal } from '../hooks/useGsapReveal.js';

export function AnalyticsView({ greenhouseName, idInvernadero }) {
  const analytics = useAnalyticsData(idInvernadero);
  const revealRef = useGsapReveal([
    analytics.appliedRange,
    analytics.estado,
    analytics.metricKey,
    analytics.resolution,
  ]);

  return (
    <main className="analytics-page" id="analitica" ref={revealRef}>
      <section className="analytics-hero" data-reveal>
        <div>
          <p className="overline">Analitica</p>
          <h2>Centro historico y comparativo</h2>
          <p>
            Lectura ejecutiva del comportamiento ambiental: que cambia, cuando ocurre y donde se concentra la atencion.
          </p>
        </div>
        <div className="analytics-range-card">
          <span>Rango activo</span>
          <strong>{formatAppliedRange(analytics.appliedRange)}</strong>
          <small>{greenhouseName}</small>
        </div>
      </section>

      <section className="analytics-filter-panel" data-reveal aria-label="Filtros globales de analitica">
        <TimeRangeFilter
          appliedRange={analytics.appliedRange}
          busy={analytics.status === 'loading' || analytics.status === 'refreshing'}
          error={analytics.error && analytics.status === 'error' ? analytics.error : ''}
          idPrefix="analytics"
          onApply={analytics.applyTimeRange}
          onChange={analytics.setTimeRange}
          onClear={analytics.clearTimeRange}
          range={analytics.timeRange}
        />

        <div className="analytics-global-filters">
          <label>
            Variable
            <select value={analytics.metricKey} onChange={(event) => analytics.setMetricKey(event.target.value)}>
              {ANALYTICS_METRICS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Estado
            <select value={analytics.estado} onChange={(event) => analytics.updateEstado(event.target.value)}>
              <option value="todos">Todos</option>
              <option value="normal">Normal</option>
              <option value="alertas">Alertas</option>
            </select>
          </label>
          <label>
            Resolucion
            <select value={analytics.resolution} onChange={(event) => analytics.updateResolution(event.target.value)}>
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

      {analytics.error && analytics.status !== 'error' ? <p className="empty-state">{analytics.error}</p> : null}

      <AnalyticsKpiGrid
        alertCount={analytics.alertResult?.totalRegistros || 0}
        comparison={analytics.comparison}
        metric={analytics.metric}
        summary={analytics.summary}
      />

      <section className="analytics-layout" data-reveal>
        <AnalyticsTrendChart metric={analytics.metric} points={analytics.points} resolution={analytics.selectedResolution} />
        <AnalyticsBreakdown
          alertCount={analytics.alertResult?.totalRegistros || 0}
          comparison={analytics.comparison}
          greenhouseName={greenhouseName}
          highPeak={analytics.highPeak}
          lowPeak={analytics.lowPeak}
          metric={analytics.metric}
          summary={analytics.summary}
        />
      </section>

      <section className="analytics-lower-grid" data-reveal>
        <AnalyticsRanking
          alertCount={analytics.alertResult?.totalRegistros || 0}
          greenhouseName={greenhouseName}
          totalReadings={analytics.readingsResult?.totalRegistros || 0}
        />
        <AnalyticsDrilldownTable
          metric={analytics.metric}
          currentPage={analytics.readingsResult?.pagina || analytics.drilldownPage}
          onPageChange={analytics.setDrilldownPage}
          pageSize={25}
          readings={analytics.readingsResult?.lecturas || []}
          total={analytics.readingsResult?.totalRegistros || 0}
          totalPages={analytics.readingsResult?.totalPaginas || 1}
        />
      </section>

      {analytics.status === 'loading' ? <p className="empty-state">Cargando analitica historica desde la API.</p> : null}
      {analytics.status === 'error' ? <p className="empty-state">{analytics.error}</p> : null}
    </main>
  );
}
