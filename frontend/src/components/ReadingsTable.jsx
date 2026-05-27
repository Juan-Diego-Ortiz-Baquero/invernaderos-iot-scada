import { useEffect, useRef, useState } from 'react';
import { TimeRangeFilter } from './TimeRangeFilter.jsx';
import { getReadingsQuery } from '../services/invernaderosApi.js';
import { formatDateTime, formatValue } from '../utils/formatters.js';
import { getDefaultTimeRange, toTimeRangeQuery } from '../utils/timeRange.js';

const signalOptions = [
  { key: 'temperature', label: 'Temperatura' },
  { key: 'humidity', label: 'Humedad aire' },
  { key: 'soil', label: 'Humedad suelo' },
  { key: 'air', label: 'Gas' },
  { key: 'light', label: 'Luminosidad' },
];

export function ReadingsTable({ idInvernadero, readings }) {
  const variablesMenuRef = useRef(null);
  const [filters, setFilters] = useState({
    timeRange: getDefaultTimeRange(),
    signals: signalOptions.map((signal) => signal.key),
    estado: 'todos',
    tamanoPagina: 50,
  });
  const [appliedRange, setAppliedRange] = useState(null);
  const [queryResult, setQueryResult] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const activeReadings = queryResult?.lecturas || readings;
  const isFiltered = Boolean(queryResult);
  const selectedSignals = new Set(filters.signals);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!variablesMenuRef.current?.open) return;
      if (variablesMenuRef.current.contains(event.target)) return;
      variablesMenuRef.current.open = false;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape' && variablesMenuRef.current?.open) {
        variablesMenuRef.current.open = false;
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function toggleSignal(signalKey) {
    setFilters((current) => {
      if (signalKey === 'all') {
        return { ...current, signals: signalOptions.map((signal) => signal.key) };
      }

      const nextSignals = current.signals.includes(signalKey)
        ? current.signals.filter((selected) => selected !== signalKey)
        : [...current.signals, signalKey];

      return { ...current, signals: nextSignals.length ? nextSignals : [signalKey] };
    });
  }

  async function loadPage(page = 1, rangeOverride = null) {
    const rangeForQuery = rangeOverride || appliedRange || filters.timeRange;
    const timeQuery = toTimeRangeQuery(rangeForQuery);

    if (!timeQuery.valid) {
      setError(timeQuery.error);
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const response = await getReadingsQuery(idInvernadero, {
        desde: timeQuery.desde,
        hasta: timeQuery.hasta,
        soloAlertas: filters.estado === 'todos' ? '' : filters.estado === 'alertas',
        pagina: page,
        tamanoPagina: filters.tamanoPagina,
      });

      setAppliedRange(rangeForQuery);
      setQueryResult(response);
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.message);
      setStatus('error');
    }
  }

  function clearFilters() {
    setQueryResult(null);
    setAppliedRange(null);
    setError('');
    setStatus('idle');
    setFilters({
      timeRange: getDefaultTimeRange(),
      signals: signalOptions.map((signal) => signal.key),
      estado: 'todos',
      tamanoPagina: 50,
    });
  }

  return (
    <section className="panel readings-panel" id="lecturas" aria-labelledby="readings-title">
      <div className="panel-heading readings-heading">
        <div>
          <p className="overline">Telemetria</p>
          <h2 id="readings-title">{isFiltered ? 'Consulta de lecturas' : 'Ultimas lecturas'}</h2>
        </div>
      </div>

      <TimeRangeFilter
        appliedRange={appliedRange}
        busy={status === 'loading'}
        error={error && status === 'error' ? error : ''}
        idPrefix="readings"
        onApply={() => loadPage(1, filters.timeRange)}
        onChange={(timeRange) => updateFilter('timeRange', timeRange)}
        onClear={clearFilters}
        range={filters.timeRange}
      />

      <div className="telemetry-filters" aria-label="Filtros de telemetria">
        <div className="filter-field">
          <span>Variables</span>
          <details className="multi-select" ref={variablesMenuRef}>
            <summary>
              {filters.signals.length === signalOptions.length
                ? 'Todas'
                : `${filters.signals.length} seleccionadas`}
            </summary>
            <div className="multi-select__menu">
              <label>
                <input
                  checked={filters.signals.length === signalOptions.length}
                  onChange={() => toggleSignal('all')}
                  type="checkbox"
                />
                Todas
              </label>
              {signalOptions.map((signal) => (
                <label key={signal.key}>
                  <input
                    checked={filters.signals.includes(signal.key)}
                    onChange={() => toggleSignal(signal.key)}
                    type="checkbox"
                  />
                  {signal.label}
                </label>
              ))}
            </div>
          </details>
        </div>
        <label>
          Estado
          <select value={filters.estado} onChange={(event) => updateFilter('estado', event.target.value)}>
            <option value="todos">Todos</option>
            <option value="normal">Normal</option>
            <option value="alertas">Alertas</option>
          </select>
        </label>
        <label>
          Filas
          <select
            value={filters.tamanoPagina}
            onChange={(event) => updateFilter('tamanoPagina', Number(event.target.value))}
          >
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
          </select>
        </label>
        <div className="telemetry-filter-actions">
          <button className="secondary-button" disabled={status === 'loading'} onClick={() => loadPage(1)} type="button">
            {status === 'loading' ? 'Consultando' : 'Filtrar'}
          </button>
          <button className="small-button" onClick={clearFilters} type="button">
            Limpiar
          </button>
        </div>
      </div>

      {error && status !== 'error' ? <p className="empty-state">{error}</p> : null}

      {activeReadings.length ? (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  {selectedSignals.has('temperature') ? <th>Temp.</th> : null}
                  {selectedSignals.has('humidity') ? <th>Humedad</th> : null}
                  {selectedSignals.has('soil') ? <th>Suelo</th> : null}
                  {selectedSignals.has('air') ? <th>Gas</th> : null}
                  {selectedSignals.has('light') ? <th>Luz</th> : null}
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {activeReadings.map((reading) => (
                  <tr className={reading.esAlerta ? 'reading-row--alert' : undefined} key={reading.idLectura}>
                    <td>{formatDateTime(reading.fechaHora)}</td>
                    {selectedSignals.has('temperature') ? <td>{formatValue(reading.temperatura, '°C')}</td> : null}
                    {selectedSignals.has('humidity') ? <td>{formatValue(reading.humedad, '%')}</td> : null}
                    {selectedSignals.has('soil') ? <td>{formatValue(reading.humedadSuelo, '%')}</td> : null}
                    {selectedSignals.has('air') ? <td>{formatValue(reading.calidadAire, ' ppm')}</td> : null}
                    {selectedSignals.has('light') ? <td>{formatValue(reading.luminosidad, ' lx')}</td> : null}
                    <td>
                      <span className={`table-status ${reading.esAlerta ? 'table-status--alert' : ''}`}>
                        {reading.esAlerta ? 'Alerta' : 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isFiltered ? (
            <div className="pagination-row">
              <span>
                Pagina {queryResult.pagina} de {Math.max(queryResult.totalPaginas, 1)} · {queryResult.totalRegistros}{' '}
                registros
              </span>
              <div>
                <button
                  className="small-button"
                  disabled={queryResult.pagina <= 1 || status === 'loading'}
                  onClick={() => loadPage(queryResult.pagina - 1)}
                  type="button"
                >
                  Anterior
                </button>
                <button
                  className="small-button"
                  disabled={queryResult.pagina >= queryResult.totalPaginas || status === 'loading'}
                  onClick={() => loadPage(queryResult.pagina + 1)}
                  type="button"
                >
                  Siguiente
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <p className="empty-state">
          {filters.estado === 'alertas'
            ? 'No hay lecturas con estado de alerta para el rango consultado.'
            : 'No hay lecturas para mostrar.'}
        </p>
      )}
    </section>
  );
}
