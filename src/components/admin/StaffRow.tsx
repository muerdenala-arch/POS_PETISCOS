import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, Lock, MapPin, Pencil, ShieldCheck, Trash2, Unlock, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import type { User } from '@/types';
import { cn, formatDateTime } from '@/lib/utils';

interface StaffRowProps {
  user: User;
  onEdit: () => void;
  onToggleBlocked: () => void;
  onResetPin: () => void;
  onDelete: () => void;
}

export function StaffRow({ user, onEdit, onToggleBlocked, onResetPin, onDelete }: StaffRowProps) {
  const [pinVisible, setPinVisible] = useState(false);
  const hasActiveSession = useRegisterStore((s) =>
    s.sessions.some((sess) => sess.cashierId === user.id && sess.status === 'abierta'),
  );
  const allBranches = useBranchStore((s) => s.branches);
  const blocked = user.status === 'bloqueado';
  const branchLabel =
    user.branchIds.length === allBranches.length && allBranches.length > 0
      ? 'Todas las sucursales'
      : allBranches
          .filter((b) => user.branchIds.includes(b.id))
          .map((b) => b.name.replace('Sucursal ', ''))
          .join(', ') || 'Sin sucursal asignada';

  return (
    <Card className={cn('flex flex-col gap-3 p-4 sm:flex-row sm:items-center', blocked && 'opacity-60')}>
      <div className="flex flex-1 items-center gap-3.5">
        <div className="relative flex-shrink-0">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white', user.color)}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          {hasActiveSession && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface bg-secondary-500">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-secondary-400" />
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-display font-bold text-ink">{user.name}</p>
            {user.protected && (
              <span title="Administrador principal">
                <ShieldCheck size={14} className="text-accent-600" />
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={user.role === 'admin' ? 'accent' : 'primary'}>
              {user.role === 'admin' ? 'Administrador' : 'Cajero'}
            </Badge>
            {blocked ? (
              <Badge tone="danger">Bloqueado</Badge>
            ) : hasActiveSession ? (
              <Badge tone="secondary">
                <Wallet size={11} /> Caja abierta
              </Badge>
            ) : (
              <Badge tone="neutral">Inactivo</Badge>
            )}
          </div>
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
            <MapPin size={11} className="flex-shrink-0" /> {branchLabel}
          </p>
          <p className="text-xs text-ink-soft">Registrado el {formatDateTime(user.createdAt)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <button
          onClick={() => setPinVisible((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-cream-200 px-2.5 py-1.5 font-mono text-sm font-bold text-ink-muted transition-colors hover:bg-cream-300 cursor-pointer"
          aria-label={pinVisible ? 'Ocultar PIN' : 'Mostrar PIN'}
        >
          {pinVisible ? user.pin : '••••'}
          {pinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>

        <div className="flex items-center gap-1.5">
          <ActionButton
            label={blocked ? 'Activar acceso' : 'Bloquear acceso'}
            onClick={onToggleBlocked}
            disabled={user.protected}
            tone={blocked ? 'secondary' : 'amber'}
          >
            {blocked ? <Unlock size={16} /> : <Lock size={16} />}
          </ActionButton>
          <ActionButton label="Restablecer PIN" onClick={onResetPin}>
            <KeyRound size={16} />
          </ActionButton>
          <ActionButton label="Editar" onClick={onEdit}>
            <Pencil size={16} />
          </ActionButton>
          <ActionButton label="Eliminar" onClick={onDelete} disabled={user.protected} tone="danger">
            <Trash2 size={16} />
          </ActionButton>
        </div>
      </div>
    </Card>
  );
}

function ActionButton({
  children,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger' | 'amber' | 'secondary';
}) {
  const toneClasses = {
    default: 'text-ink-muted hover:bg-primary-50 hover:text-primary-700',
    danger: 'text-ink-muted hover:bg-red-50 hover:text-red-600',
    amber: 'text-ink-muted hover:bg-amber-50 hover:text-amber-700',
    secondary: 'text-ink-muted hover:bg-secondary-50 hover:text-secondary-700',
  };
  return (
    <motion.button
      type="button"
      whileTap={disabled ? undefined : { scale: 0.9 }}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={disabled ? `${label} (protegido)` : label}
      className={cn(
        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent',
        toneClasses[tone],
      )}
    >
      {children}
    </motion.button>
  );
}
