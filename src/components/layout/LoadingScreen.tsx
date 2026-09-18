import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { LoginLogo } from '@/components/layout/LoginLogo';
import { Button } from '@/components/ui/Button';

interface LoadingScreenProps {
  /** true cuando pasaron 10s (ver App.tsx) sin que la sincronización inicial terminara —
   *  reemplaza el spinner infinito por un mensaje de error y la opción de reintentar. */
  timedOut?: boolean;
  onRetry?: () => void;
}

/** Pantalla de arranque mientras llega la primera respuesta de Neon (sucursales, personal,
 *  catálogo, etc.). Sin esto se alcanza a ver un parpadeo con la semilla local — un login
 *  vacío o un catálogo desactualizado — antes de que el primer fetch reemplace los datos. */
export function LoadingScreen({ timedOut = false, onRetry }: LoadingScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary-50 via-cream to-secondary-50 px-4 text-center dark:from-primary-900/20 dark:to-secondary-900/20">
      <LoginLogo />

      {!timedOut ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm font-semibold text-ink-muted"
        >
          Sincronizando…
        </motion.p>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex max-w-sm flex-col items-center gap-3"
        >
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden />
          <p className="text-sm font-semibold text-ink">
            No pudimos conectar con el servidor.
          </p>
          <p className="text-xs text-ink-muted">
            Revisá tu conexión a internet. Si el problema sigue, puede ser un corte temporal del
            servicio — intentá de nuevo en unos segundos.
          </p>
          <Button variant="primary" size="sm" onClick={onRetry} className="mt-1">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reintentar
          </Button>
        </motion.div>
      )}
    </div>
  );
}
