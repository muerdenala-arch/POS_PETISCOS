import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn, formatCurrency, formatDateTime } from '@/lib/utils';

export default function CashAuditPage() {
  const allSessions = useRegisterStore((s) => s.sessions);
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cashierId, setCashierId] = useState('ALL');

  const allStaff = useStaffStore((s) => s.users || []);

  const getCashierName = useCallback(
    (id: string, fallback: string) => {
      const s = allStaff.find(st => st.id === id);
      return s ? s.name : fallback;
    },
    [allStaff],
  );

  const cashiers = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of allSessions) {
      map.set(s.cashierId, getCashierName(s.cashierId, s.cashierName));
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allSessions, getCashierName]);

  const sessions = useMemo(() => {
    return allSessions.filter((s) => {
      if (adminFilterBranchId && s.branchId !== adminFilterBranchId) return false;
      if (cashierId !== 'ALL' && s.cashierId !== cashierId) return false;
      
      if (!s.openedAt) return false;
      const dt = new Date(s.openedAt);
      if (isNaN(dt.getTime())) return false;
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const day = String(dt.getDate()).padStart(2, '0');
      const localDay = `${year}-${month}-${day}`; // YYYY-MM-DD local
      
      if (startDate && localDay < startDate) return false;
      if (endDate && localDay > endDate) return false;
      
      return true;
    });
  }, [allSessions, adminFilterBranchId, cashierId, startDate, endDate]);

  const totals = useMemo(() => {
    let salesTotal = 0;
    let salesCount = 0;
    let difference = 0;
    for (const s of sessions) {
      salesTotal += Number(s.salesTotal) || 0;
      salesCount += Number(s.salesCount) || 0;
      difference += Number(s.difference) || 0;
    }
    return { salesTotal, salesCount, difference };
  }, [sessions]);
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

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Desde</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-col">
            <span className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">Cajero</span>
            <select
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              className="rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="ALL">Todos los cajeros</option>
              {cashiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-3">
            <Card className="p-4 bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">Total Vendido</p>
              <p className="font-display text-xl font-bold text-ink">{formatCurrency(totals.salesTotal)}</p>
            </Card>
            <Card className="p-4 bg-primary-50/50 dark:bg-primary-900/10 border-primary-200 dark:border-primary-900">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">Cant. Ventas</p>
              <p className="font-display text-xl font-bold text-ink">{totals.salesCount}</p>
            </Card>
            <Card className={cn("p-4 border", totals.difference < 0 ? 'bg-red-50/50 border-red-200' : 'bg-primary-50/50 border-primary-200 dark:bg-primary-900/10 dark:border-primary-900')}>
              <p className={cn("text-[11px] font-semibold uppercase tracking-wide", totals.difference < 0 ? 'text-red-600' : 'text-primary-600 dark:text-primary-400')}>Diferencia Total</p>
              <p className={cn("font-display text-xl font-bold text-ink", totals.difference < 0 && 'text-red-700')}>{formatCurrency(totals.difference)}</p>
            </Card>
          </div>
        )}

        {sessions.length === 0 ? (
          <Card className="p-8 text-center text-ink-soft">Aún no hay sesiones de caja registradas.</Card>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 50).map((session) => {
              const hasDifference = session.difference != null && Math.abs(session.difference) >= 0.01;
              return (
                <div key={session.id}>
                  <Card className="p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-display font-bold text-ink">{getCashierName(session.cashierId, session.cashierName)}</p>
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
                      <Stat label="Apertura" value={formatCurrency(Number(session.openingAmount) || 0)} />
                      <Stat label="Ventas" value={session.salesCount != null ? String(session.salesCount) : '—'} />
                      <Stat
                        label="Total vendido"
                        value={session.salesTotal != null ? formatCurrency(Number(session.salesTotal) || 0) : '—'}
                      />
                      {session.status === 'cerrada' && (
                        <Stat
                          label="Diferencia"
                          value={session.difference != null ? formatCurrency(Number(session.difference) || 0) : '—'}
                          tone={hasDifference ? (Number(session.difference) > 0 ? 'amber' : 'red') : 'green'}
                        />
                      )}
                    </div>
                  </Card>
                </div>
              );
            })}
            {sessions.length > 50 && (
              <p className="text-center text-xs text-ink-muted mt-4">
                Mostrando las últimas 50 sesiones. Hay {sessions.length} en total. Utiliza los filtros para refinar la búsqueda.
              </p>
            )}
          </div>
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
