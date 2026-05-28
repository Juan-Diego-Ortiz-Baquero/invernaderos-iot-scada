import { MetricCard } from '../../components/MetricCard.jsx';

export function LiveMetricsGrid({ currentAlerts, dashboard, latestReading, systemActive }) {
  const metrics = [
    {
      label: 'Temperatura',
      metric: 'temperature',
      unit: '°C',
      value: dashboard?.ultimaTemperatura ?? latestReading?.temperatura,
    },
    {
      label: 'Humedad aire',
      metric: 'humidity',
      unit: '%',
      value: dashboard?.ultimaHumedad ?? latestReading?.humedad,
    },
    {
      label: 'Humedad suelo',
      metric: 'soil',
      unit: '%',
      value: dashboard?.ultimaHumedadSuelo ?? latestReading?.humedadSuelo,
    },
    {
      label: 'Calidad aire',
      metric: 'air',
      unit: ' ppm',
      value: dashboard?.ultimaCalidadAire,
    },
    {
      label: 'Luminosidad',
      metric: 'light',
      unit: ' lx',
      value: dashboard?.ultimaLuminosidad,
    },
  ];

  return (
    <section className="metrics-grid live-metrics-grid" aria-label="Metricas ambientales">
      {metrics.map((item) => (
        <div data-reveal key={item.metric}>
          <MetricCard
            currentAlerts={currentAlerts}
            label={item.label}
            metric={item.metric}
            systemActive={systemActive}
            unit={item.unit}
            value={item.value}
          />
        </div>
      ))}
    </section>
  );
}
