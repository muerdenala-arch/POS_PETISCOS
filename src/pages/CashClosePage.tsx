import { useMemo, useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { CashierShell } from '@/components/layout/CashierShell';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { Button } from '@/components/ui/Button';
import { useRegisterStore } from '@/store/registerStore';
import { useSalesStore } from '@/store/salesStore';
import { useExpenseStore } from '@/store/expenseStore';
import { cn, formatCurrency } from '@/lib/utils';

export default function CashClosePage() {
  const activeSession = useRegisterStore((s) => s.activeSession());
  const closeRegister = useRegisterStore((s) => s.closeRegister);
  const salesForSession = useSalesStore((s) => s.salesForSession);
  const fetchSales = useSalesStore((s) => s.fetchAll);
  const expenses = useExpenseStore((s) => s.expenses);
  const [counted, setCounted] = useState('');
  const navigate = useNavigate();

  // Re-sync sales from the server whenever the close page mounts, so
  // the totals are correct even if the cashier sold from another device.
  useEffect(() => {
    fetchSales();
    useExpenseStore.getState().fetchAll();
  }, [fetchSales]);

  const sessionSales = useMemo(
    () => (activeSession ? salesForSession(activeSession.id) : []),
    [activeSession, salesForSession],
  );

  const sessionExpenses = useMemo(
    () => activeSession ? expenses.filter(e => e.cashRegisterId === activeSession.id) : [],
    [activeSession, expenses]
  );

  if (!activeSession) {
    return <Navigate to="/caja/apertura" replace />;
  }

  const cashSalesTotal = sessionSales.reduce((sum, s) => {
    if (s.payment.method === 'efectivo') return sum + s.total;
    if (s.payment.method === 'mixto') return sum + (s.payment.amountEfectivo || 0);
    return sum;
  }, 0);
  
  const qrSalesTotal = sessionSales.reduce((sum, s) => {
    if (s.payment.method === 'qr') return sum + s.total;
    if (s.payment.method === 'mixto') return sum + (s.payment.amountQr || 0);
    return sum;
  }, 0);
  
  const expensesTotal = sessionExpenses.reduce((sum, e) => sum + e.amount, 0);

  const salesTotal = cashSalesTotal + qrSalesTotal;
  const expectedAmount = activeSession.openingAmount + cashSalesTotal - expensesTotal;
  const countedAmount = Number(counted || 0);
  const difference = countedAmount - expectedAmount;

  function handleClose() {
    const diff = countedAmount - expectedAmount;
    const diffText = Math.abs(diff) < 0.01
      ? 'La caja está cuadrada ✓'
      : diff > 0
        ? `Sobrante de Bs ${Math.abs(diff).toFixed(2)}`
        : `Faltante de Bs ${Math.abs(diff).toFixed(2)}`;
    
    const confirmed = window.confirm(
      `¿Cerrar la caja?\n\n` +
      `• Ventas: Bs ${salesTotal.toFixed(2)} (${sessionSales.length} ventas)\n` +
      `• Gastos: -Bs ${expensesTotal.toFixed(2)}\n` +
      `• Efectivo esperado: Bs ${expectedAmount.toFixed(2)}\n` +
      `• Efectivo contado: Bs ${countedAmount.toFixed(2)}\n` +
      `• ${diffText}\n\n` +
      `Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    closeRegister(activeSession!.id, {
      closingAmountCounted: countedAmount,
      expectedAmount,
      salesTotal,
      salesCount: sessionSales.length,
      cashSalesTotal,
      qrSalesTotal,
    });
    navigate('/caja/apertura', { replace: true });
  }

  return (
    <CashierShell>
      <div className="flex h-full items-center justify-center overflow-y-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm"
        >
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-white shadow-pop">
              <Wallet size={26} />
            </div>
            <h1 className="font-display text-xl font-bold text-ink">Cierre de caja</h1>
            <p className="text-sm text-ink-muted">{sessionSales.length} ventas registradas</p>
          </div>

          <div className="mb-4 space-y-1.5 rounded-xl2 bg-surface p-4 shadow-soft text-sm">
            <Row label="Monto de apertura" value={formatCurrency(activeSession.openingAmount)} />
            <Row label="Ventas en efectivo" value={formatCurrency(cashSalesTotal)} />
            <Row label="Ventas por QR" value={formatCurrency(qrSalesTotal)} />
            <Row label="Total vendido" value={formatCurrency(salesTotal)} bold />
            <Row label="Gastos registrados" value={`-${formatCurrency(expensesTotal)}`} bold />
            <div className="my-1 border-t border-dashed border-border" />
            <Row label="Efectivo esperado en caja" value={formatCurrency(expectedAmount)} bold />
          </div>

          <p className="mb-2 text-sm font-semibold text-ink-muted">Efectivo contado físicamente</p>
          <div className="mb-4 rounded-xl2 bg-surface p-4 text-center shadow-soft">
            <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
              {counted ? formatCurrency(countedAmount) : formatCurrency(0)}
            </p>
          </div>

          <NumericKeypad
            extraKey="."
            onDigit={(d) => setCounted((prev) => (prev + d).slice(0, 8))}
            onBackspace={() => setCounted((p) => p.slice(0, -1))}
            onClear={() => setCounted('')}
          />

          {counted && (
            <div
              className={cn(
                'mt-4 flex items-center gap-2 rounded-xl2 px-4 py-3 font-display font-bold',
                Math.abs(difference) < 0.01
                  ? 'bg-secondary-50 text-secondary-700'
                  : 'bg-amber-50 text-amber-700',
              )}
            >
              {Math.abs(difference) < 0.01 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
              <span className="flex-1">
                {Math.abs(difference) < 0.01
                  ? 'Caja cuadrada'
                  : difference > 0
                    ? 'Sobrante'
                    : 'Faltante'}
              </span>
              <span className="tabular-nums">{formatCurrency(Math.abs(difference))}</span>
            </div>
          )}

          <Button size="lg" variant="danger" className="mt-4 w-full" disabled={!counted} onClick={handleClose}>
            Cerrar caja
          </Button>
        </motion.div>
      </div>
    </CashierShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={cn('tabular-nums text-ink', bold && 'font-bold')}>{value}</span>
    </div>
  );
}
