import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/router/RequireAuth';
import { useAuthStore } from '@/store/authStore';
import { useThemeEffect } from '@/hooks/useThemeEffect';
import { useDataSync, useIsDataHydrated } from '@/hooks/useDataSync';
import { useAutoLogout } from '@/hooks/useAutoLogout';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CashOpenPage from '@/pages/CashOpenPage';
import CashClosePage from '@/pages/CashClosePage';

// El panel de admin no lo usa un cajero en su turno normal — separarlo del bundle
// principal evita que su peso (gráficos, formularios, etc.) retrase la carga inicial
// del flujo de venta, que es el que se usa todo el día.
const CatalogPage = lazy(() => import('@/pages/admin/CatalogPage'));
const InventoryPage = lazy(() => import('@/pages/admin/InventoryPage'));
const CashAuditPage = lazy(() => import('@/pages/admin/CashAuditPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const StaffPage = lazy(() => import('@/pages/admin/StaffPage'));
const QrConfigPage = lazy(() => import('@/pages/admin/QrConfigPage'));
const BranchesPage = lazy(() => import('@/pages/admin/BranchesPage'));
const PromotionsPage = lazy(() => import('@/pages/admin/PromotionsPage'));
const ExpensesPage = lazy(() => import('@/pages/admin/ExpensesPage'));
const BodegaPage = lazy(() => import('@/pages/admin/BodegaPage'));

// Si a los 10s la primera sincronización con Neon todavía no terminó (DB caída, env var
// faltante, función colgada), dejamos de mostrar el spinner infinito y ofrecemos
// reintentar — antes de esto la app se quedaba en "Sincronizando…" para siempre sin
// ningún mensaje de error (ver useDataSync: cada store atrapa su propio error pero nunca
// marca `hydrated`, así que un solo endpoint caído bloqueaba TODA la carga).
const SYNC_TIMEOUT_MS = 10000;

export default function App() {
  const currentUser = useAuthStore((s) => s.currentUser);
  useThemeEffect();
  // Todos los recursos de /api ahora requieren sesión (ver api/_lib/auth.ts) — recién
  // se sincronizan una vez logueado, para no disparar 401 en cadena antes del login
  // y para que /login pueda renderizar sin esperar ningún dato.
  useDataSync(!!currentUser);
  useAutoLogout();
  const dataReady = useIsDataHydrated();
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  useEffect(() => {
    if (!currentUser || dataReady) {
      setSyncTimedOut(false);
      return;
    }
    const id = setTimeout(() => setSyncTimedOut(true), SYNC_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [currentUser, dataReady]);

  // Solo bloquea el primer render con el spinner cuando YA hay sesión y falta
  // sincronizar; /login no depende de ningún dato del servidor.
  if (currentUser && !dataReady) {
    return <LoadingScreen timedOut={syncTimedOut} onRetry={() => window.location.reload()} />;
  }

  return (
    <Suspense fallback={<LoadingScreen timedOut={false} onRetry={() => window.location.reload()} />}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/pos"
        element={
          <RequireAuth roles={['cajero', 'admin']}>
            <POSPage />
          </RequireAuth>
        }
      />
      <Route
        path="/caja/apertura"
        element={
          <RequireAuth roles={['cajero', 'admin']}>
            <CashOpenPage />
          </RequireAuth>
        }
      />
      <Route
        path="/caja/cierre"
        element={
          <RequireAuth roles={['cajero', 'admin']}>
            <CashClosePage />
          </RequireAuth>
        }
      />

      <Route
        path="/admin/catalogo"
        element={
          <RequireAuth roles={['admin']}>
            <CatalogPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/inventario"
        element={
          <RequireAuth roles={['admin']}>
            <InventoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/personal"
        element={
          <RequireAuth roles={['admin']}>
            <StaffPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/configuracion-qr"
        element={
          <RequireAuth roles={['admin']}>
            <QrConfigPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/sucursales"
        element={
          <RequireAuth roles={['admin']}>
            <BranchesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/bodega"
        element={
          <RequireAuth roles={['admin']}>
            <BodegaPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/promociones"
        element={
          <RequireAuth roles={['admin']}>
            <PromotionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/auditoria"
        element={
          <RequireAuth roles={['admin']}>
            <CashAuditPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/gastos"
        element={
          <RequireAuth roles={['admin']}>
            <ExpensesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/reportes"
        element={
          <RequireAuth roles={['admin']}>
            <ReportsPage />
          </RequireAuth>
        }
      />

      <Route
        path="/"
        element={
          <Navigate to={currentUser ? (currentUser.role === 'admin' ? '/admin/reportes' : '/pos') : '/login'} replace />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
