import { useMemo, useState } from 'react';
import { AppShell } from './components/layout/AppShell.jsx';
import { LoginPanel } from './components/LoginPanel.jsx';
import { AssistantPanel } from './components/assistant/AssistantPanel.jsx';
import { DEFAULT_GREENHOUSE_ID, DEVICE_STALE_AFTER_MS } from './config.js';
import { useDashboardData } from './hooks/useDashboardData.js';
import { login } from './services/invernaderosApi.js';
import { clearSession, getSession, saveSession } from './services/tokenStorage.js';
import { parseApiDate } from './utils/formatters.js';
import { AnalyticsView } from './views/AnalyticsView.jsx';
import { MonitoringView } from './views/MonitoringView.jsx';

function DashboardScreen({ session, onLogout }) {
  const idInvernadero = session.idInvernadero || DEFAULT_GREENHOUSE_ID;
  const [activeSection, setActiveSection] = useState('monitoring');
  const dashboardData = useDashboardData(idInvernadero);

  const greenhouseName = useMemo(() => {
    return (
      dashboardData.latestReading?.nombreInvernadero ||
      dashboardData.alerts[0]?.nombreInvernadero ||
      `Invernadero ${idInvernadero}`
    );
  }, [dashboardData.alerts, dashboardData.latestReading, idInvernadero]);

  const systemActive = useMemo(() => {
    const telemetryTime =
      dashboardData.latestReading?.fechaHora || dashboardData.dashboard?.ultimaLectura;
    const parsedTime = parseApiDate(telemetryTime);
    const age = parsedTime ? Date.now() - parsedTime.getTime() : Number.POSITIVE_INFINITY;

    return age >= 0 && age <= DEVICE_STALE_AFTER_MS;
  }, [
    dashboardData.dashboard?.ultimaLectura,
    dashboardData.lastUpdated,
    dashboardData.latestReading?.fechaHora,
  ]);

  return (
    <AppShell
      activeSection={activeSection}
      greenhouseName={greenhouseName}
      lastUpdated={dashboardData.lastUpdated}
      onLogout={onLogout}
      onSectionChange={setActiveSection}
      systemActive={systemActive}
      user={session}
    >
      {activeSection === 'analytics' ? (
        <AnalyticsView greenhouseName={greenhouseName} idInvernadero={idInvernadero} />
      ) : (
        <MonitoringView
          dashboardData={dashboardData}
          idInvernadero={idInvernadero}
          systemActive={systemActive}
        />
      )}

      <AssistantPanel idInvernadero={idInvernadero} />
    </AppShell>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getSession());
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  async function handleLogin(credentials) {
    setLoginError('');
    setIsAuthenticating(true);

    try {
      const response = await login(credentials);
      const nextSession = {
        token: response.token,
        nombreCompleto: response.nombreCompleto,
        rol: response.rol,
        idInvernadero: response.idInvernadero,
      };

      saveSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  }

  function handleLogout() {
    clearSession();
    setSession(null);
  }

  if (!session) {
    return <LoginPanel error={loginError} isLoading={isAuthenticating} onSubmit={handleLogin} />;
  }

  return <DashboardScreen onLogout={handleLogout} session={session} />;
}
