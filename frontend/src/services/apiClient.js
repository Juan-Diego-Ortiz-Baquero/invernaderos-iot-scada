import { API_BASE_URL } from '../config.js';
import { getToken } from './tokenStorage.js';

async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Verifica que el backend esté activo.');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    const message = payload?.mensaje || payload?.message || 'No se pudo completar la solicitud';
    throw new Error(message);
  }

  return payload;
}

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
};
