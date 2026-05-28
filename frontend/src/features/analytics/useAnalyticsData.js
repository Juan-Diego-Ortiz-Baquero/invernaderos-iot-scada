import { useEffect, useMemo, useState } from 'react';
import { getHistory, getReadingsQuery } from '../../services/invernaderosApi.js';
import {
  compareHalves,
  findPeak,
  getMetric,
  summarizeHistory,
} from '../../utils/analytics.js';
import {
  chooseHistoryResolution,
  getDefaultTimeRange,
  toTimeRangeQuery,
  validateTimeRange,
} from '../../utils/timeRange.js';

export function useAnalyticsData(idInvernadero) {
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

  function updateEstado(nextEstado) {
    setDrilldownPage(1);
    setEstado(nextEstado);
  }

  function updateResolution(nextResolution) {
    setDrilldownPage(1);
    setResolution(nextResolution);
  }

  return {
    alertResult,
    appliedRange,
    applyTimeRange,
    clearTimeRange,
    comparison,
    drilldownPage,
    error,
    estado,
    highPeak,
    lowPeak,
    metric,
    metricKey,
    points,
    readingsResult,
    resolution,
    selectedResolution,
    setDrilldownPage,
    setMetricKey,
    setTimeRange,
    status,
    summary,
    timeRange,
    updateEstado,
    updateResolution,
  };
}
