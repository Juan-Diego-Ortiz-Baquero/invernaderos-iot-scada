import { useState } from 'react';

export function LoginPanel({ onSubmit, error, isLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ email, password });
  }

  return (
    <main className="login-page">
      <section className="login-shell" aria-labelledby="login-title">
        <div className="login-copy">
          <p className="overline">Invernaderos IoT</p>
          <h1 id="login-title">Centro de monitoreo ambiental</h1>
          <p>
            Acceso operativo para revisar lecturas del ESP32, alertas y estado del
            invernadero en tiempo real.
          </p>
        </div>

        <form className="login-panel" onSubmit={handleSubmit}>
          <label>
            Correo
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operador@empresa.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Contraseña
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Clave de acceso"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <button aria-busy={isLoading} className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? 'Validando acceso' : 'Entrar al panel'}
          </button>
        </form>
      </section>
    </main>
  );
}
