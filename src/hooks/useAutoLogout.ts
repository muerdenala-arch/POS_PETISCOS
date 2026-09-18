import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { useCouponStore } from '@/store/couponStore';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

export function useAutoLogout() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    // Solo activar auto-logout si hay un usuario logueado
    if (!currentUser) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const handleTimeout = () => {
      // Limpiar datos temporales antes de cerrar sesión
      useCartStore.getState().clear();
      useCouponStore.getState().removeCoupon();
      logout();
      window.location.href = '/login';
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleTimeout, INACTIVITY_TIMEOUT_MS);
    };

    // Inicializar el timer
    resetTimer();

    // Eventos que reinician el timer (pasivos para no bloquear el scroll)
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser, logout]);
}
