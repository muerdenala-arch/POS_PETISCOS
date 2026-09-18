import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { useStaffStore } from '@/store/staffStore';
import { useBranchStore } from '@/store/branchStore';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LoginLogo } from '@/components/layout/LoginLogo';
import { BranchPicker } from '@/components/layout/BranchPicker';
import { APP_CONFIG } from '@/config/app';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const loginWithPin = useAuthStore((s) => s.loginWithPin);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const currentUser = useAuthStore((s) => s.currentUser);
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const setCurrentBranch = useAuthStore((s) => s.setCurrentBranch);
  const allBranches = useBranchStore((s) => s.branches);
  const allUsers = useStaffStore((s) => s.users);
  const navigate = useNavigate();
  const location = useLocation();

  // Selector de sucursal: cajero con varias sucursales asignadas lo elige antes de entrar.
  const needsBranchPick = !!currentUser && currentUser.role === 'cajero' && !currentBranchId;
  const branchOptions = allBranches.filter(
    (b) => b.active && currentUser?.branchIds.includes(b.id),
  );

  useEffect(() => {
    if (currentUser && !needsBranchPick) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      navigate(from ?? (currentUser.role === 'admin' ? '/admin/reportes' : '/pos'), {
        replace: true,
      });
    }
  }, [currentUser, needsBranchPick, navigate, location.state]);

  function handleDigit(d: string) {
    if (pin.length >= 4) return;
    clearError();
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      // Pequeña pausa para que el último punto se vea antes de autenticar.
      setTimeout(() => {
        const ok = loginWithPin(next);
        if (!ok) setPin('');
      }, 140);
    }
  }

  // Previene que el login quede inaccesible si no hay usuarios en la DB todavía.
  const hasUsers = allUsers.some((u) => u.status === 'activo');

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-cream to-secondary-50 px-4 py-8 dark:from-primary-900/20 dark:to-secondary-900/20">
      {/* Manchas de color ambientales */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary-400/30 blur-3xl dark:bg-primary-500/25"
        animate={{ x: [0, 20, 0], y: [0, 14, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-secondary-400/30 blur-3xl dark:bg-secondary-500/25"
        animate={{ x: [0, -20, 0], y: [0, -14, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-accent-300/20 blur-3xl dark:bg-accent-500/10"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm rounded-xl3 bg-surface p-7 shadow-card"
      >
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center text-center">
          <LoginLogo />
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink">EL MERENGÓN</h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-ink-muted">Sistema POS & Gestión</p>
        </div>

        {/* Selector de sucursal (sólo cuando aplica) */}
        {needsBranchPick && currentUser ? (
          <BranchPicker
            userName={currentUser.name}
            branches={branchOptions}
            onSelect={setCurrentBranch}
          />
        ) : (
          <>
            {!hasUsers && (
              <p className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600 dark:bg-red-900/20">
                No hay usuarios activos. Contacta al administrador.
              </p>
            )}

            {/* Título + indicadores de PIN */}
            <div className="mb-5 flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-ink-muted tracking-wide">
                Ingresa tu PIN
              </p>
              <div className="flex gap-4">
                {[0, 1, 2, 3].map((i) => {
                  const isActive = i < pin.length;
                  return (
                    <motion.div
                      key={i}
                      initial={false}
                      animate={isActive ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={cn(
                        'h-4 w-4 rounded-full border-2 transition-all duration-75',
                        isActive
                          ? 'border-primary-500 bg-primary-500 shadow-[0_0_8px_theme(colors.primary.400)]'
                          : 'border-primary-300 bg-transparent',
                      )}
                    />
                  );
                })}
              </div>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="error"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="text-sm font-semibold text-red-600"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Teclado numérico */}
            <NumericKeypad
              onDigit={handleDigit}
              onBackspace={() => {
                clearError();
                setPin((p) => p.slice(0, -1));
              }}
              onClear={() => {
                clearError();
                setPin('');
              }}
            />
          </>
        )}
      </motion.div>
    </div>
  );
}
