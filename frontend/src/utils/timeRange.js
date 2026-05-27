const pad = (value) => String(value).padStart(2, '0');

export const QUICK_TIME_RANGES = [
  {
    key: 'last4h',
    label: 'Ultimas 4 horas',
    description: 'Desde hace cuatro horas hasta este momento.',
  },
  {
    key: 'todayFrom7',
    label: 'Hoy desde 07:00',
    description: 'Desde las 07:00 de hoy hasta ahora.',
  },
  {
    key: 'today',
    label: 'Hoy completo',
    description: 'Desde medianoche hasta ahora.',
  },
  {
    key: 'yesterday',
    label: 'Ayer',
    description: 'Dia anterior completo.',
  },
];

export function toDateInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toApiDateTime(date) {
  return `${toDateInputValue(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function buildLocalDateTime(dateText, timeText) {
  if (!dateText || !timeText) return null;

  const [year, month, day] = dateText.split('-').map(Number);
  const [hours, minutes] = timeText.split(':').map(Number);

  if (![year, month, day, hours, minutes].every(Number.isFinite)) return null;

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function createTimeRangeState(start, end, quickRange = 'custom') {
  return {
    quickRange,
    startDate: toDateInputValue(start),
    startTime: toTimeInputValue(start),
    endDate: toDateInputValue(end),
    endTime: toTimeInputValue(end),
  };
}

export function getQuickTimeRange(key, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);

  if (key === 'todayFrom7') {
    start.setHours(7, 0, 0, 0);
    return createTimeRangeState(start, end, key);
  }

  if (key === 'today') {
    start.setHours(0, 0, 0, 0);
    return createTimeRangeState(start, end, key);
  }

  if (key === 'yesterday') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);

    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 0, 0);

    return createTimeRangeState(start, end, key);
  }

  start.setHours(start.getHours() - 4);
  return createTimeRangeState(start, end, 'last4h');
}

export function getDefaultTimeRange() {
  return getQuickTimeRange('last4h');
}

export function getTimeRangeDates(range) {
  const start = buildLocalDateTime(range.startDate, range.startTime);
  const end = buildLocalDateTime(range.endDate, range.endTime);

  return { end, start };
}

export function validateTimeRange(range) {
  const { end, start } = getTimeRangeDates(range);

  if (!start || !end) {
    return {
      end,
      error: 'Selecciona fecha y hora de inicio y fin.',
      start,
      valid: false,
    };
  }

  if (start >= end) {
    return {
      end,
      error: 'La fecha y hora de inicio debe ser anterior a la fecha y hora final.',
      start,
      valid: false,
    };
  }

  return { end, error: '', start, valid: true };
}

export function toTimeRangeQuery(range) {
  const result = validateTimeRange(range);

  if (!result.valid) return { ...result, desde: '', hasta: '' };

  return {
    ...result,
    desde: toApiDateTime(result.start),
    hasta: toApiDateTime(result.end),
  };
}

export function chooseHistoryResolution(start, end) {
  const hours = Math.abs(end.getTime() - start.getTime()) / 36e5;

  if (hours <= 12) return 'minuto';
  if (hours <= 24 * 3) return 'hora';
  if (hours <= 24 * 90) return 'dia';
  if (hours <= 24 * 730) return 'mes';
  return 'anio';
}

export function formatAppliedRange(range) {
  const result = validateTimeRange(range);
  if (!result.valid) return 'Sin rango temporal aplicado';

  const formatter = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return `${formatter.format(result.start)} - ${formatter.format(result.end)}`;
}

export function getRangeDurationLabel(start, end) {
  const minutes = Math.round(Math.abs(end.getTime() - start.getTime()) / 60000);

  if (minutes < 60) return `${minutes} min`;

  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;

  const days = hours / 24;
  if (days < 365) return `${days.toFixed(days < 10 ? 1 : 0)} dias`;

  return `${(days / 365).toFixed(1)} anos`;
}
