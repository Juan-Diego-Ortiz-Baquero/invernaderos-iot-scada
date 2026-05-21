import { apiClient } from './apiClient.js';

export function login(credentials) {
  return apiClient.post('/api/auth/login', credentials);
}

export function getDashboard(idInvernadero) {
  return apiClient.get(`/api/dashboard/${idInvernadero}`);
}

export function getLatestReading(idInvernadero) {
  return apiClient.get(`/api/lecturas/${idInvernadero}/ultima`);
}

export function getReadings(idInvernadero) {
  return apiClient.get(`/api/lecturas/${idInvernadero}`);
}

export function getReadingsQuery(idInvernadero, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

  return apiClient.get(`/api/lecturas/${idInvernadero}/consulta?${query.toString()}`);
}

export function getAlerts(idInvernadero) {
  return apiClient.get(`/api/dashboard/${idInvernadero}/alertas?soloPendientes=true&limite=100`);
}

export function getStatistics(idInvernadero) {
  return apiClient.get(`/api/dashboard/${idInvernadero}/estadisticas`);
}

export function getHistory(idInvernadero, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  );

  return apiClient.get(`/api/lecturas/${idInvernadero}/historial?${query.toString()}`);
}

export function resolveAlert(idAlerta) {
  return apiClient.put(`/api/dashboard/alertas/${idAlerta}/resolver`);
}

export function resolvePendingAlerts(idInvernadero) {
  return apiClient.put(`/api/dashboard/${idInvernadero}/alertas/resolver-pendientes`);
}
