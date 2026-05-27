import { formatDateTime, formatValue } from '../../utils/formatters.js';

function buildPageWindow(currentPage, totalPages) {
  const windowSize = totalPages <= 7 ? totalPages : 5;
  const halfWindow = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = Math.min(totalPages, start + windowSize - 1);

  start = Math.max(1, end - windowSize + 1);

  const pages = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  return pages;
}

export function AnalyticsDrilldownTable({ currentPage, metric, onPageChange, pageSize, readings, total, totalPages }) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const visiblePages = buildPageWindow(currentPage, safeTotalPages);
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < safeTotalPages;

  return (
    <section className="analytics-card analytics-drilldown" aria-labelledby="analytics-detail-title">
      <div className="analytics-section-heading">
        <div>
          <span>Drill-down</span>
          <h3 id="analytics-detail-title">Detalle de lecturas</h3>
        </div>
        <small>{total} registros en el filtro · {pageSize} por página</small>
      </div>

      {readings.length ? (
        <>
          <div className="analytics-pagination" aria-label="Paginacion del drill-down">
            <button className="small-button" disabled={!hasPrevious} onClick={() => onPageChange(currentPage - 1)} type="button">
              Anterior
            </button>

            {visiblePages[0] > 1 ? (
              <>
                <button className="page-chip" onClick={() => onPageChange(1)} type="button">
                  1
                </button>
                {visiblePages[0] > 2 ? <span className="page-ellipsis">...</span> : null}
              </>
            ) : null}

            {visiblePages.map((page) => (
              <button
                aria-current={page === currentPage ? 'page' : undefined}
                className={page === currentPage ? 'page-chip page-chip--active' : 'page-chip'}
                key={page}
                onClick={() => onPageChange(page)}
                type="button"
              >
                {page}
              </button>
            ))}

            {visiblePages[visiblePages.length - 1] < safeTotalPages ? (
              <>
                {visiblePages[visiblePages.length - 1] < safeTotalPages - 1 ? <span className="page-ellipsis">...</span> : null}
                <button className="page-chip" onClick={() => onPageChange(safeTotalPages)} type="button">
                  {safeTotalPages}
                </button>
              </>
            ) : null}

            <button className="small-button" disabled={!hasNext} onClick={() => onPageChange(currentPage + 1)} type="button">
              Siguiente
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>{metric.label}</th>
                  <th>Temp.</th>
                  <th>Hum.</th>
                  <th>Suelo</th>
                  <th>Gas</th>
                  <th>Luz</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => (
                  <tr className={reading.esAlerta ? 'reading-row--alert' : undefined} key={reading.idLectura}>
                    <td>{formatDateTime(reading.fechaHora)}</td>
                    <td>{formatValue(reading[metric.readingField], metric.unit)}</td>
                    <td>{formatValue(reading.temperatura, '°C')}</td>
                    <td>{formatValue(reading.humedad, '%')}</td>
                    <td>{formatValue(reading.humedadSuelo, '%')}</td>
                    <td>{formatValue(reading.calidadAire, ' ppm')}</td>
                    <td>{formatValue(reading.luminosidad, ' lx')}</td>
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
        </>
      ) : (
        <p className="empty-state">No hay lecturas para el filtro aplicado.</p>
      )}
    </section>
  );
}
