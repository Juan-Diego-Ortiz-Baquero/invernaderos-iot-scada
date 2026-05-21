import { useCallback, useEffect, useMemo, useState } from 'react';
import { POLLING_INTERVAL_MS } from '../config.js';
import {
  getAlerts,
  getDashboard,
  getLatestReading,
  getReadings,
  getStatistics,
  resolveAlert,
  resolvePendingAlerts,
} from '../services/invernaderosApi.js';

const initialState = {
  dashboard: null,
  latestReading: null,
  readings: [],
  alerts: [],
  statistics: [],
};

export function useDashboardData(idInvernadero) {
  const [data, setData] = useState(initialState);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    if (!idInvernadero) return;

    setStatus((current) => (current === 'idle' ? 'loading' : 'refreshing'));
    setError('');

    try {
      const [dashboard, latestReading, readings, alerts, statistics] = await Promise.all([
        getDashboard(idInvernadero),
        getLatestReading(idInvernadero),
        getReadings(idInvernadero),
        getAlerts(idInvernadero),
        getStatistics(idInvernadero),
      ]);

      setData({ dashboard, latestReading, readings, alerts, statistics });
      setLastUpdated(new Date());
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.message);
      setStatus('error');
    }
  }, [idInvernadero]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, POLLING_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const handleResolveAlert = useCallback(
    async (idAlerta) => {
      await resolveAlert(idAlerta);
      await refresh();
    },
    [refresh],
  );

  const handleResolvePendingAlerts = useCallback(async () => {
    await resolvePendingAlerts(idInvernadero);
    await refresh();
  }, [idInvernadero, refresh]);

  const unresolvedAlerts = useMemo(
    () => data.alerts.filter((alert) => !alert.resuelta),
    [data.alerts],
  );

  return {
    ...data,
    error,
    status,
    lastUpdated,
    refresh,
    resolveAlert: handleResolveAlert,
    resolvePendingAlerts: handleResolvePendingAlerts,
    unresolvedAlerts,
  };
}
