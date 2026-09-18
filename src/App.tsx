import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/router/RequireAuth';
import { useAuthStore } from '@/store/authStore';
import { useThemeEffect } from '@/hooks/useThemeEffect';
import { useDataSync, useIsDataHydrated } from '@/hooks/useDataSync';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import LoginPage from '@/pages/LoginPage';
import POSPage from '@/pages/POSPage';
import CashOpenPage from '@/pages/CashOpenPage';
import CashClosePage from '@/pages/CashClosePage';
import CatalogPage from '@/pages/admin/CatalogPage';
import InventoryPage from '@/pages/admin/InventoryPage';
import CashAuditPage from '@/pages/admin/CashAuditPage';
import ReportsPage from '@/pages/admin/ReportsPage';
import StaffPage from '@/pages/admin/StaffPage';
import QrConfigPage from '@/pages/admin/QrConfigPage';
import BranchesPage from '@/pages/admin/BranchesPage';
import PromotionsPage from '@/pages/admin/PromotionsPage';
import ExpensesPage from '@/pages/admin/ExpensesPage';

// Si a los 10s la primera sincronización con Neon todavía no terminó (DB caída, env var
// faltante, función colgada), dejamos de mostrar el spinner infinito y ofrecemos
// reintentar — antes de esto la app se quedaba en "Sincronizando…" para siempre sin
// ningún mensaje de error (ver useDataSync: cada store atrapa su propio error pero nunca
// marca `hydrated`, así que un solo endpoint caído bloqueaba TODA la carga).
const SYNC_TIMEOUT_MS = 10000;

export default function App() {
  const currentUser = useAuthStore((s) => s.currentUser);
  useThemeEffect();
  useDataSync();
  const dataReady = useIsDataHydrated();
  const [syncTimedOut, setSyncTimedOut] = useState(false);

  useEffect(() => {
    if (dataReady) {
      setSyncTimedOut(false);
      return;
    }
    const id = setTimeout(() => setSyncTimedOut(true), SYNC_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [dataReady]);

  // Después del primer fetch exitoso, el polling en segundo plano se sigue actualizando
  // sin volver a mostrar esta pantalla — solo bloquea el primer render.
  if (!dataReady) {
    return <LoadingScreen timedOut={syncTimedOut} onRetry={() => window.location.reload()} />;
  }

  return (
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
  );
}
