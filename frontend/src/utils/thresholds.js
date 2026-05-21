const alertTypesByMetric = {
  temperature: ['TEMP_ALTA', 'TEMP_BAJA'],
  humidity: ['HUM_ALTA', 'HUM_BAJA'],
};

export function getMetricState(metric, rawValue, currentAlerts = [], unit = '', systemActive = true) {
  if (rawValue === null || rawValue === undefined || Number.isNaN(Number(rawValue))) {
    return { level: 'muted', label: 'Sin datos', caption: 'Esperando lectura del sensor', progress: 0 };
  }

  const value = Number(rawValue);
  const matchingAlert = currentAlerts.find((alert) => alertTypesByMetric[metric]?.includes(alert.tipoAlerta));
  const progress = unit === '%' ? Math.max(0, Math.min(100, value)) : null;

  if (matchingAlert) {
    return {
      level: 'critical',
      label: matchingAlert.tipoAlerta.replaceAll('_', ' '),
      caption: 'Alerta reportada por la API',
      progress,
    };
  }

  if (!systemActive) {
    return { level: 'muted', label: 'Retenido', caption: 'Ultima lectura recibida', progress };
  }

  return { level: 'normal', label: 'En vivo', caption: 'Lectura actual del sensor', progress };
}

export function getAlertTone(alert) {
  if (alert.resuelta) return 'resolved';
  if (alert.tipoAlerta?.includes('ALTA') || alert.tipoAlerta?.includes('BAJA')) return 'critical';
  return 'warning';
}
