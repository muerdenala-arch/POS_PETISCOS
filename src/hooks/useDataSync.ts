import { useEffect } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import { usePromotionStore } from '@/store/promotionStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useCouponStore } from '@/store/couponStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWarehouseStore } from '@/store/warehouseStore';

const POLL_INTERVAL_MS = 60000;

/** `enabled` debe ser `false` hasta que haya una sesión iniciada: todos estos endpoints
 *  ahora requieren autenticación (ver api/_lib/auth.ts), así que sincronizar antes de
 *  loguearse solo generaría 401 en cadena y nunca marcaría `hydrated`. */
export function useDataSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let isInitial = true;
    const fetchAll = () => {
      if (isInitial) {
        useBranchStore.getState().fetchAll();
        useStaffStore.getState().fetchAll();
        useCatalogStore.getState().fetchAll();
        useQrCodeStore.getState().fetchAll();
        useRegisterStore.getState().fetchAll();
        useSalesStore.getState().fetchAll();
        usePromotionStore.getState().fetchAll();
        useExpenseStore.getState().fetchAll();
        useCouponStore.getState().fetchAll();
        useSettingsStore.getState().fetchAll();
        useWarehouseStore.getState().fetchAll();
        isInitial = false;
      } else {
        // Desfasar peticiones en background para evitar bloquear el hilo principal (tironazo en la UI)
        setTimeout(() => useBranchStore.getState().fetchAll(), 0);
        setTimeout(() => useStaffStore.getState().fetchAll(), 500);
        setTimeout(() => useCatalogStore.getState().fetchAll(), 1000);
        setTimeout(() => useQrCodeStore.getState().fetchAll(), 1500);
        setTimeout(() => useRegisterStore.getState().fetchAll(), 2000);
        setTimeout(() => useSalesStore.getState().fetchAll(), 2500);
        setTimeout(() => usePromotionStore.getState().fetchAll(), 3000);
        setTimeout(() => useExpenseStore.getState().fetchAll(), 3500);
        setTimeout(() => useCouponStore.getState().fetchAll(), 4000);
        setTimeout(() => useSettingsStore.getState().fetchAll(), 4500);
        setTimeout(() => useWarehouseStore.getState().fetchAll(), 5000);
      }
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (intervalId !== null) return;
      fetchAll();
      intervalId = setInterval(fetchAll, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);
}

export function useIsDataHydrated(): boolean {
  const branches = useBranchStore((s) => s.hydrated);
  const staff = useStaffStore((s) => s.hydrated);
  const catalog = useCatalogStore((s) => s.hydrated);
  const qrCodes = useQrCodeStore((s) => s.hydrated);
  const registerSessions = useRegisterStore((s) => s.hydrated);
  const sales = useSalesStore((s) => s.hydrated);
  const expenses = useExpenseStore((s) => s.hydrated);
  const promotions = usePromotionStore((s) => s.hydrated);
  const coupons = useCouponStore((s) => s.hydrated);
  const settings = useSettingsStore((s) => s.hydrated);
  const warehouse = useWarehouseStore((s) => s.hydrated);
  return (
    branches && staff && catalog && qrCodes && registerSessions && sales && expenses && promotions && coupons &&
    settings && warehouse
  );
}
