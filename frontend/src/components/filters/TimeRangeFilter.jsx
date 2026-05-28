import { QUICK_TIME_RANGES, formatAppliedRange, getQuickTimeRange } from '../../utils/timeRange.js';

export function TimeRangeFilter({
  appliedRange,
  busy = false,
  error = '',
  idPrefix,
  onApply,
  onChange,
  onClear,
  range,
}) {
  function handleQuickRange(quickRange) {
    onChange(getQuickTimeRange(quickRange));
  }

  function handleFieldChange(field, value) {
    onChange({ ...range, [field]: value, quickRange: 'custom' });
  }

  return (
    <div className="time-filter" aria-label="Filtro temporal">
      <div className="time-filter__header">
        <div>
          <span>Ventana temporal</span>
          <strong>Consulta por fecha y hora exacta</strong>
        </div>
      </div>

      <div className="time-filter__quick" aria-label="Rangos rapidos">
        {QUICK_TIME_RANGES.map((option) => (
          <button
            aria-pressed={range.quickRange === option.key}
            className="time-chip"
            key={option.key}
            onClick={() => handleQuickRange(option.key)}
            title={option.description}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="time-filter__grid">
        <label htmlFor={`${idPrefix}-start-date`}>
          Fecha inicio
          <input
            id={`${idPrefix}-start-date`}
            onChange={(event) => handleFieldChange('startDate', event.target.value)}
            type="date"
            value={range.startDate}
          />
        </label>
        <label htmlFor={`${idPrefix}-start-time`}>
          Hora inicio
          <input
            id={`${idPrefix}-start-time`}
            onChange={(event) => handleFieldChange('startTime', event.target.value)}
            type="time"
            value={range.startTime}
          />
        </label>
        <label htmlFor={`${idPrefix}-end-date`}>
          Fecha fin
          <input
            id={`${idPrefix}-end-date`}
            onChange={(event) => handleFieldChange('endDate', event.target.value)}
            type="date"
            value={range.endDate}
          />
        </label>
        <label htmlFor={`${idPrefix}-end-time`}>
          Hora fin
          <input
            id={`${idPrefix}-end-time`}
            onChange={(event) => handleFieldChange('endTime', event.target.value)}
            type="time"
            value={range.endTime}
          />
        </label>
      </div>

      <div className="time-filter__footer">
        <div className="time-filter__summary">
          <span>Rango aplicado</span>
          <strong>{appliedRange ? formatAppliedRange(appliedRange) : 'Sin consulta personalizada'}</strong>
          {error ? <small className="time-filter__error">{error}</small> : null}
        </div>
        <div className="time-filter__actions">
          <button className="secondary-button" disabled={busy} onClick={onApply} type="button">
            {busy ? 'Consultando' : 'Aplicar'}
          </button>
          <button className="small-button" onClick={onClear} type="button">
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
