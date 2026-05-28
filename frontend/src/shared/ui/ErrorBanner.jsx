export function ErrorBanner({ action, message, title = 'No se pudo completar la solicitud' }) {
  return (
    <section className="error-banner" role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
      {action}
    </section>
  );
}
