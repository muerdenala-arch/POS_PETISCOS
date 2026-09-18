import { useEffect } from 'react';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { useCatalogStore } from '@/store/catalogStore';
import { useQrCodeStore } from '@/store/qrCodeStore';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import { usePromotionStore } from '@/store/promotionStore';
import { useExpenseStore } from '@/store/expenseStore';

const POLL_INTERVAL_MS = 60000;

export function useDataSync() {
  useEffect(() => {
    const fetchAll = () => {
      useBranchStore.getState().fetchAll();
      useStaffStore.getState().fetchAll();
      useCatalogStore.getState().fetchAll();
      useQrCodeStore.getState().fetchAll();
      useRegisterStore.getState().fetchAll();
      useSalesStore.getState().fetchAll();
      usePromotionStore.getState().fetchAll();
      useExpenseStore.getState().fetchAll();
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
  }, []);
}

export function useIsDataHydrated(): boolean {
  const branches = useBranchStore((s) => s.hydrated);
  const staff = useStaffStore((s) => s.hydrated);
  const catalog = useCatalogStore((s) => s.hydrated);
  const qrCodes = useQrCodeStore((s) => s.hydrated);
  const registerSessions = useRegisterStore((s) => s.hydrated);
  const sales = useSalesStore((s) => s.hydrated);
  const expenses = useExpenseStore((s) => s.hydrated);
  return branches && staff && catalog && qrCodes && registerSessions && sales && expenses;
}
