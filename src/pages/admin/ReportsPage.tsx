import { useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Banknote, Building2, Eye, QrCode, Receipt, TrendingUp, Calendar as CalendarIcon, DollarSign, CalendarRange, CalendarDays, Tag } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ReceiptViewerModal } from '@/components/admin/ReceiptViewerModal';
import { useBranchStore } from '@/store/branchStore';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn, formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import type { Sale, CashRegisterSession } from '@/types';

type RangeFilter = 'hoy' | 'custom';

export default function ReportsPage() {
  const branches = useBranchStore((s) => s.branches);
  const adminFilterBranchId = useBranchStore((s) => s.adminFilterBranchId);
  const setAdminFilterBranchId = useBranchStore((s) => s.setAdminFilterBranchId);

  const dateInputRef = useRef<HTMLInputElement>(null);

  const [range, setRange] = useState<RangeFilter>('hoy');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState<number>(0);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [yearlyTotal, setYearlyTotal] = useState<number>(0);
  const [dailyExpenses, setDailyExpenses] = useState<number>(0);
  const [weeklyExpenses, setWeeklyExpenses] = useState<number>(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number>(0);
  const [yearlyExpenses, setYearlyExpenses] = useState<number>(0);
  const [totalDiscounts, setTotalDiscounts] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (isMounted && sales.length === 0) { // Solo mostrar loading la primera vez o si está vacío
        setIsLoading(true);
        setFetchError(null);
      }
      try {
        let startDate = new Date();
        let endDate = new Date();
        
        if (range === 'hoy') {
          // Ya están en hoy, ajustar solo horas
        } else if (range === 'custom') {
          startDate = new Date(customDate);
          endDate = new Date(customDate);
          startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
          endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
        }

        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        const data = await api.adminReports.get(
          startDate.toISOString(),
          endDate.toISOString(),
          adminFilterBranchId || 'all'
        );
        
        setSales(data.sales);
        setSessions(data.sessions);
        setMonthlyTotal(data.monthlyTotal);
        setWeeklyTotal(data.weeklyTotal);
        setYearlyTotal(data.yearlyTotal);
        setDailyExpenses(data.dailyExpenses || 0);
        setWeeklyExpenses(data.weeklyExpenses || 0);
        setMonthlyExpenses(data.monthlyExpenses || 0);
        setYearlyExpenses(data.yearlyExpenses || 0);
        setTotalDiscounts(data.totalDiscounts ?? 0);
      } catch (err) {
        console.error('Error fetching reports:', err);
        setFetchError('No se pudo cargar el reporte. Verifica la conexión y vuelve a intentarlo.');
        setSales([]);
        setSessions([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    
    fetchData();
    const interval = setInterval(() => {
      // Polling sin mostrar loading spinner para que sea silencioso
      if (isMounted) fetchData();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [range, customDate, adminFilterBranchId, retryCount]);

  const salesByBranch = useMemo(() => {
    return branches.map((b) => {
      const branchSales = sales.filter((s) => s.branchId === b.id);
      return {
        branch: b,
        total: branchSales.reduce((sum, s) => sum + s.total, 0),
        count: branchSales.length,
      };
    });
  }, [sales, branches]);
  const maxBranchTotal = Math.max(1, ...salesByBranch.map((b) => b.total));

  const branchFilteredSales = useMemo(() => 
    adminFilterBranchId ? sales.filter(s => s.branchId === adminFilterBranchId) : sales
  , [sales, adminFilterBranchId]);

  const branchFilteredSessions = useMemo(() => 
    adminFilterBranchId ? sessions.filter(s => s.branchId === adminFilterBranchId) : sessions
  , [sessions, adminFilterBranchId]);

  const totalSales = branchFilteredSales.reduce((sum, s) => sum + s.total, 0);
  const cashTotal = branchFilteredSales.reduce((sum, s) => {
    if (s.payment.method === 'efectivo') return sum + s.total;
    if (s.payment.method === 'mixto') return sum + (s.payment.amountEfectivo || 0);
    return sum;
  }, 0);
  const qrTotal = branchFilteredSales.reduce((sum, s) => {
    if (s.payment.method === 'qr') return sum + s.total;
    if (s.payment.method === 'mixto') return sum + (s.payment.amountQr || 0);
    return sum;
  }, 0);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    branchFilteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const entry = map.get(item.product.id) ?? { name: item.product.name, qty: 0, total: 0 };
        entry.qty += item.quantity;
        entry.total += item.lineTotal;
        map.set(item.product.id, entry);
      });
    });
    return Array.from(map.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [branchFilteredSales]);

  const maxQty = Math.max(1, ...topProducts.map((p) => p.qty));

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomDate(e.target.value);
    setRange('custom');
  };

  const activeDateDisplay = range === 'custom' 
    ? new Date(customDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) 
    : 'Elegir fecha';

  const enrichedSessions = useMemo(() => {
    return branchFilteredSessions.map(session => {
      if (session.status !== 'cerrada' || !session.closedAt) {
        // Compute partials from the day's sales
        const sessionSales = sales.filter(s => s.registerSessionId === session.id);
        const cashPartial = sessionSales.reduce((sum, s) => {
          if (s.payment.method === 'efectivo') return sum + s.total;
          if (s.payment.method === 'mixto') return sum + (s.payment.amountEfectivo || 0);
          return sum;
        }, 0);
        const qrPartial = sessionSales.reduce((sum, s) => {
          if (s.payment.method === 'qr') return sum + s.total;
          if (s.payment.method === 'mixto') return sum + (s.payment.amountQr || 0);
          return sum;
        }, 0);
        const totalPartial = sessionSales.reduce((sum, s) => sum + s.total, 0);
        return {
          ...session,
          cashSalesTotal: cashPartial,
          qrSalesTotal: qrPartial,
          salesTotal: totalPartial
        };
      }
      return session;
    });
  }, [branchFilteredSessions, sales]);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <BarChart3 size={24} className="text-primary-500" /> Reportes Financieros
            </h1>
            <p className="text-sm text-ink-muted">
              {adminFilterBranchId
                ? branches.find((b) => b.id === adminFilterBranchId)?.name
                : 'Todas las sucursales'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full bg-cream-300 p-1">
              <button
                onClick={() => setRange('hoy')}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-colors',
                  range === 'hoy' ? 'bg-surface shadow-soft text-ink' : 'text-ink-muted',
                )}
              >
                Hoy
              </button>
            </div>
            
            <div className="relative flex items-center">
              <input
                type="date"
                ref={dateInputRef}
                value={customDate}
                onChange={handleCustomDateChange}
                className="absolute w-0 h-0 opacity-0 pointer-events-none"
                title="Elegir fecha"
              />
              <button
                onClick={() => {
                  try {
                    dateInputRef.current?.showPicker();
                  } catch (e) {
                    // Fallback for older browsers
                    dateInputRef.current?.focus();
                  }
                }}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors cursor-pointer',
                  range === 'custom' ? 'bg-primary-500 text-white shadow-soft' : 'bg-surface border border-border text-ink-muted hover:bg-zinc-50'
                )}
              >
                <CalendarIcon size={16} />
                {range === 'custom' ? activeDateDisplay : '📅 Elegir fecha'}
              </button>
            </div>
          </div>
        </div>

        {fetchError && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-4 dark:bg-red-500/10 dark:border-red-500/20">
            <span className="text-red-500 text-xl">⚠️</span>
            <p className="flex-1 text-sm font-semibold text-red-700 dark:text-red-400">{fetchError}</p>
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className={cn("mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-5 transition-opacity", isLoading && "opacity-50")}
        >
          <StatCard icon={<TrendingUp size={18} />} label="Venta del Día (Neta)" value={formatCurrency(totalSales - dailyExpenses)} tone="primary" subtext={`Ingresos: ${formatCurrency(totalSales)} / Gastos: -${formatCurrency(dailyExpenses)}`} />
          <StatCard icon={<CalendarRange size={18} />} label="Semana (Neta)" value={formatCurrency(weeklyTotal - weeklyExpenses)} tone="secondary" subtext={`Gastos: -${formatCurrency(weeklyExpenses)}`} />
          <StatCard icon={<CalendarDays size={18} />} label="Mes (Neta)" value={formatCurrency(monthlyTotal - monthlyExpenses)} tone="secondary" subtext={`Gastos: -${formatCurrency(monthlyExpenses)}`} />
          <StatCard icon={<DollarSign size={18} />} label="Año (Neta)" value={formatCurrency(yearlyTotal - yearlyExpenses)} tone="accent" subtext={`Gastos: -${formatCurrency(yearlyExpenses)}`} />
          <StatCard icon={<Receipt size={18} />} label="Cantidad Ventas" value={String(branchFilteredSales.length)} tone="neutral" />
          <StatCard icon={<Tag size={18} />} label="Descuentos (Bs)" value={formatCurrency(totalDiscounts)} tone="neutral" />
        </motion.div>

        <div className={cn("transition-opacity", isLoading && "opacity-50")}>
          <Card className="mb-5 p-5">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Building2 size={18} className="text-primary-500" /> Ventas por sucursal del día seleccionado
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {salesByBranch.map(({ branch, total, count }) => (
                <div
                  key={branch.id}
                  onClick={() => setAdminFilterBranchId(adminFilterBranchId === branch.id ? null : branch.id)}
                  className={cn(
                    'rounded-xl2 border-2 p-3.5 transition-colors cursor-pointer',
                    adminFilterBranchId === branch.id
                      ? 'border-orange-500 ring-2 ring-orange-500 bg-orange-50 dark:bg-neutral-800'
                      : 'border-border bg-field hover:border-primary-200',
                  )}
                >
                  <p className="truncate text-sm font-semibold text-ink">{branch.name}</p>
                  <p className="font-display text-xl font-extrabold tabular-nums text-ink">{formatCurrency(total)}</p>
                  <p className="mb-2 text-xs text-ink-muted">{count} venta{count === 1 ? '' : 's'}</p>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-cream-300">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(total / maxBranchTotal) * 100}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full rounded-full bg-gradient-to-r from-secondary-400 to-secondary-600"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-bold text-ink">Productos más vendidos</h2>
              {topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-soft">Sin datos para este período.</p>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((p) => (
                    <div key={p.name}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-semibold text-ink">{p.name}</span>
                        <span className="text-ink-muted tabular-nums">
                          {p.qty} u. · {formatCurrency(p.total)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-300">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(p.qty / maxQty) * 100}%` }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg font-bold text-ink">Métodos de pago del día</h2>
              <PaymentBar label="Efectivo" amount={cashTotal} total={totalSales} color="bg-secondary-500" />
              <PaymentBar label="QR Dinámico" amount={qrTotal} total={totalSales} color="bg-accent-500" />

              <h2 className="mb-3 mt-6 font-display text-lg font-bold text-ink">Últimas ventas</h2>
              <div className="max-h-60 space-y-2 overflow-y-auto no-scrollbar">
                {branchFilteredSales.slice(0, 8).map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between gap-2 rounded-lg bg-cream-100 px-3 py-2 text-sm">
                    <span className="truncate font-semibold text-ink">#{sale.ticketNumber} · {sale.cashierName}</span>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      {sale.couponCode && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          🏷️ {sale.couponCode}
                        </span>
                      )}
                      {sale.payment.method === 'qr' && sale.payment.receiptImage && (
                        <button
                          onClick={() => setViewingReceipt(sale)}
                          className="cursor-pointer"
                          aria-label={`Ver comprobante del ticket #${sale.ticketNumber}`}
                        >
                          <Badge tone="secondary" className="cursor-pointer hover:bg-secondary-200">
                            <Eye size={11} /> Ver comprobante
                          </Badge>
                        </button>
                      )}
                      <span className="tabular-nums text-ink-muted">{formatCurrency(sale.total)}</span>
                    </div>
                  </div>
                ))}
                {branchFilteredSales.length === 0 && <p className="py-4 text-center text-sm text-ink-soft">Sin ventas aún.</p>}
              </div>
            </Card>
          </div>
          <Card className="mt-5 p-5">
            <h2 className="mb-4 font-display text-lg font-bold text-ink">Desglose de Cajas / Turnos</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-ink-muted">
                    <th className="pb-3 font-semibold">Cajero</th>
                    <th className="pb-3 font-semibold">Apertura</th>
                    <th className="pb-3 font-semibold">Cierre</th>
                    <th className="pb-3 font-semibold text-right">Inicial</th>
                    <th className="pb-3 font-semibold text-right">Efectivo</th>
                    <th className="pb-3 font-semibold text-right">QR</th>
                    <th className="pb-3 font-semibold text-right">Total Turno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {enrichedSessions.map((session) => {
                    const isOpen = session.status !== 'cerrada' || !session.closedAt;
                    const branchName = branches.find(b => b.id === session.branchId)?.name || session.branchId;
                    return (
                    <tr key={session.id} className="text-ink">
                      <td className="py-3 font-semibold">
                        {session.cashierName}
                        <span className="ml-2 inline-block rounded bg-cream-300 px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                          {branchName}
                        </span>
                      </td>
                      <td className="py-3">{new Date(session.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="py-3">
                        {!isOpen ? (
                          new Date(session.closedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-500">
                            Abierta
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right tabular-nums text-ink-muted">{formatCurrency(session.openingAmount)}</td>
                      <td className="py-3 text-right tabular-nums">{formatCurrency(session.cashSalesTotal || 0)}</td>
                      <td className="py-3 text-right tabular-nums">{formatCurrency(session.qrSalesTotal || 0)}</td>
                      <td className="py-3 text-right font-semibold tabular-nums text-primary-700">{formatCurrency(session.salesTotal || 0)}</td>
                    </tr>
                    );
                  })}
                  {enrichedSessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-ink-soft">Sin sesiones de caja en este período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ReceiptViewerModal sale={viewingReceipt} onClose={() => setViewingReceipt(null)} />
    </AdminShell>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  subtext
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'accent' | 'neutral';
  subtext?: string;
}) {
  const toneClasses = {
    primary: 'bg-primary-50 text-primary-700',
    secondary: 'bg-secondary-50 text-secondary-700',
    accent: 'bg-accent-50 text-accent-700',
    neutral: 'bg-cream-300 text-ink-muted',
  };
  return (
    <motion.div variants={staggerItem}>
      <Card className="p-4 h-full flex flex-col justify-between">
        <div>
          <div className={cn('mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl', toneClasses[tone])}>
            {icon}
          </div>
          <p className="font-display text-xl font-extrabold tabular-nums text-ink">{value}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-ink-muted mt-1">{label}</p>
          {subtext && <p className="text-[10px] font-medium text-ink-soft mt-0.5">{subtext}</p>}
        </div>
      </Card>
    </motion.div>
  );
}

function PaymentBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="tabular-nums text-ink-muted">{formatCurrency(amount)}</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-cream-300">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className={cn('h-full rounded-full', color)}
        />
      </div>
    </div>
  );
}
