import { formatDateTime, formatValue } from '../utils/formatters.js';
import { getAlertTone } from '../utils/thresholds.js';

function cleanAlertMessage(message) {
  return message.replace(/(\d+),(\d{4})|(\d+)\.(\d{4})/g, (match, commaInt, commaDec, dotInt, dotDec) => {
    const integer = commaInt || dotInt;
    const decimal = commaDec || dotDec;
    const normalized = Number(`${integer}.${decimal}`);
    return Number.isFinite(normalized) ? normalized.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : match;
  });
}

function parseAlertMessage(message = '') {
  const normalizedMessage = cleanAlertMessage(message);
  const rangeMatch = normalizedMessage.match(/\s*\(rango:\s*([^)]+)\)/i);

  return {
    description: normalizedMessage.replace(/\s*\(rango:\s*([^)]+)\)/i, '').trim(),
    range: rangeMatch?.[1] ?? null,
  };
}

export function AlertsPanel({ alerts, onResolve, onResolvePending }) {
  const pendingAlerts = alerts.filter((alert) => !alert.resuelta);
  const pendingCount = pendingAlerts.length;

  return (
    <section className="panel alerts-panel" id="alertas" aria-labelledby="alerts-title">
      <div className="panel-heading">
        <div>
          <p className="overline">Alertas operativas</p>
          <h2 id="alerts-title">Pendientes por resolver</h2>
        </div>
        <div className="panel-actions">
          <span className="panel-count" aria-label={`${pendingCount} alertas sin resolver`}>
            {pendingCount}
          </span>
          {pendingCount ? (
            <button className="small-button" onClick={onResolvePending} type="button">
              Resolver pendientes
            </button>
          ) : null}
        </div>
      </div>

      <div className="alerts-list">
        {pendingAlerts.length ? (
          pendingAlerts.map((alert) => {
            const tone = getAlertTone(alert);
            const message = parseAlertMessage(alert.mensaje);

            return (
              <article className={`alert-row alert-row--${tone}`} key={alert.idAlerta}>
                <div className="alert-indicator" aria-hidden="true" />
                <div>
                  <strong>{alert.tipoAlerta.replaceAll('_', ' ')}</strong>
                  <p>{message.description}</p>
                  <small>
                    {formatDateTime(alert.fechaHora)} · Valor {formatValue(alert.valorDetectado)}
                  </small>
                  {message.range ? (
                    <span className="alert-range">Umbral registrado: {message.range}</span>
                  ) : null}
                </div>
                <button className="small-button" onClick={() => onResolve(alert.idAlerta)} type="button">
                  Resolver
                </button>
              </article>
            );
          })
        ) : (
          <p className="empty-state">No hay alertas pendientes para este invernadero.</p>
        )}
      </div>
    </section>
  );
}
