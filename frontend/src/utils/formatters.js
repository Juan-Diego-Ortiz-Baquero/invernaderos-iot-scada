export const numberFormatter = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export function formatValue(value, unit = '') {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
  return `${numberFormatter.format(Number(value))}${unit}`;
}

export function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  const text = String(value);
  const hasTimeZone = /z$|[+-]\d{2}:\d{2}$/i.test(text);
  return new Date(hasTimeZone ? text : `${text}Z`);
}

export function formatDateTime(value) {
  if (!value) return 'Sin registro';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Bogota',
  }).format(parseApiDate(value));
}

export function formatLocalDateTime(value) {
  if (!value) return 'Sin registro';

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

export function formatTime(value) {
  if (!value) return '--:--';

  return new Intl.DateTimeFormat('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(parseApiDate(value));
}
