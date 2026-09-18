import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

export default function CashAuditPage() {
  const allSessions = useRegisterStore((s) => s.sessions);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);

  const sessions = useMemo(
    () => (adminFilterBranchId ? allSessions.filter((s) => s.branchId === adminFilterBranchId) : allSessions),
    [allSessions, adminFilterBranchId],
  );
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
            <ShieldCheck size={24} className="text-primary-500" /> Auditoría de cajas
          </h1>
          <p className="text-sm text-ink-muted">
            {adminFilterBranchId
              ? `Historial de ${branchName(adminFilterBranchId)}`
              : 'Historial de todas las sucursales'}
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">Aún no hay sesiones de caja registradas.</Card>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {sessions.map((session) => {
              const hasDifference = session.difference != null && Math.abs(session.difference) >= 0.01;
              return (
                <motion.div key={session.id} variants={staggerItem}>
                  <Card className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-display font-bold text-ink">{session.cashierName}</p>
                          <Badge tone="primary">{branchName(session.branchId)}</Badge>
                        </div>
                        <p className="text-xs text-ink-muted">
                          Abrió {formatDateTime(session.openedAt)}
                          {session.closedAt && ` · Cerró ${formatDateTime(session.closedAt)}`}
                        </p>
                      </div>
                      <Badge tone={session.status === 'abierta' ? 'secondary' : 'neutral'}>
                        {session.status === 'abierta' ? 'Abierta' : 'Cerrada'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <Stat label="Apertura" value={formatCurrency(session.openingAmount)} />
                      <Stat label="Ventas" value={session.salesCount != null ? String(session.salesCount) : '—'} />
                      <Stat
                        label="Total vendido"
                        value={session.salesTotal != null ? formatCurrency(session.salesTotal) : '—'}
                      />
                      {session.status === 'cerrada' && (
                        <Stat
                          label="Diferencia"
                          value={session.difference != null ? formatCurrency(session.difference) : '—'}
                          tone={hasDifference ? (session.difference! > 0 ? 'amber' : 'red') : 'green'}
                        />
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'green' | 'amber' | 'red';
}) {
  return (
    <div className="rounded-xl bg-cream-100 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">{label}</p>
      <p
        className={cn(
          'font-display font-bold tabular-nums',
          tone === 'green' && 'text-secondary-700',
          tone === 'amber' && 'text-amber-700',
          tone === 'red' && 'text-red-700',
          !tone && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}
