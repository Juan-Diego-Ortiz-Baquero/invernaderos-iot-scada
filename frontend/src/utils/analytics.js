export const ANALYTICS_METRICS = [
  {
    key: 'temperature',
    label: 'Temperatura',
    field: 'temperaturaPromedio',
    readingField: 'temperatura',
    minField: 'temperaturaMinima',
    maxField: 'temperaturaMaxima',
    unit: '°C',
    className: 'chart-line--temp',
  },
  {
    key: 'humidity',
    label: 'Humedad aire',
    field: 'humedadPromedio',
    readingField: 'humedad',
    minField: 'humedadMinima',
    maxField: 'humedadMaxima',
    unit: '%',
    className: 'chart-line--humidity',
  },
  {
    key: 'soil',
    label: 'Humedad suelo',
    field: 'humedadSueloPromedio',
    readingField: 'humedadSuelo',
    minField: 'humedadSueloMinima',
    maxField: 'humedadSueloMaxima',
    unit: '%',
    className: 'chart-line--soil',
  },
  {
    key: 'light',
    label: 'Luminosidad',
    field: 'luminosidadPromedio',
    readingField: 'luminosidad',
    minField: 'luminosidadMinima',
    maxField: 'luminosidadMaxima',
    unit: ' lx',
    className: 'chart-line--light',
  },
  {
    key: 'air',
    label: 'Gas',
    field: 'calidadAirePromedio',
    readingField: 'calidadAire',
    minField: 'calidadAireMinima',
    maxField: 'calidadAireMaxima',
    unit: ' ppm',
    className: 'chart-line--air',
  },
];

export const ANALYTICS_RESOLUTIONS = [
  { key: 'auto', label: 'Automatica' },
  { key: 'minuto', label: 'Minuto' },
  { key: 'hora', label: 'Hora' },
  { key: 'dia', label: 'Dia' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mes' },
  { key: 'anio', label: 'Ano' },
];

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function getMetric(metricKey) {
  return ANALYTICS_METRICS.find((metric) => metric.key === metricKey) || ANALYTICS_METRICS[0];
}

export function getPointValue(point, metric) {
  return toNumber(point?.[metric.field]);
}

export function getReadingValue(reading, metric) {
  return toNumber(reading?.[metric.readingField]);
}

export function summarizeHistory(points, metric) {
  const values = points.map((point) => getPointValue(point, metric)).filter((value) => value !== null);
  const readings = points.reduce((total, point) => total + Number(point.totalLecturas || 0), 0);
  const alertBuckets = points.filter((point) => point.tieneAlertas).length;

  if (!values.length) {
    return {
      alertBuckets,
      average: null,
      max: null,
      min: null,
      readings,
      valueCount: 0,
    };
  }

  return {
    alertBuckets,
    average: values.reduce((total, value) => total + value, 0) / values.length,
    max: Math.max(...values),
    min: Math.min(...values),
    readings,
    valueCount: values.length,
  };
}

export function compareHalves(points, metric) {
  if (points.length < 2) return { change: null, firstAverage: null, secondAverage: null };

  const middle = Math.ceil(points.length / 2);
  const firstValues = points.slice(0, middle).map((point) => getPointValue(point, metric)).filter((value) => value !== null);
  const secondValues = points.slice(middle).map((point) => getPointValue(point, metric)).filter((value) => value !== null);

  if (!firstValues.length || !secondValues.length) {
    return { change: null, firstAverage: null, secondAverage: null };
  }

  const firstAverage = firstValues.reduce((total, value) => total + value, 0) / firstValues.length;
  const secondAverage = secondValues.reduce((total, value) => total + value, 0) / secondValues.length;

  return {
    change: secondAverage - firstAverage,
    firstAverage,
    secondAverage,
  };
}

export function findPeak(points, metric, direction = 'max') {
  const candidates = points
    .map((point) => ({ point, value: getPointValue(point, metric) }))
    .filter((item) => item.value !== null);

  if (!candidates.length) return null;

  return candidates.reduce((selected, item) => {
    if (!selected) return item;
    return direction === 'min'
      ? item.value < selected.value ? item : selected
      : item.value > selected.value ? item : selected;
  }, null);
}
