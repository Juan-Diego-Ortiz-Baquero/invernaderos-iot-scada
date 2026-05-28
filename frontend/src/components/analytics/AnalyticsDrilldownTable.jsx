import { PaginationChips } from '../../shared/ui/PaginationChips.jsx';
import { EmptyState } from '../../shared/ui/EmptyState.jsx';
import { formatDateTime, formatValue } from '../../utils/formatters.js';

export function AnalyticsDrilldownTable({ currentPage, metric, onPageChange, pageSize, readings, total, totalPages }) {
  const safeTotalPages = Math.max(1, totalPages || 1);

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
          <PaginationChips currentPage={currentPage} onPageChange={onPageChange} totalPages={safeTotalPages} />

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
        <EmptyState title="Sin lecturas en el drill-down">Prueba con otro rango, estado o variable.</EmptyState>
      )}
    </section>
  );
}
