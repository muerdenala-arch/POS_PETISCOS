import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import { CashierShell } from '@/components/layout/CashierShell';
import { NumericKeypad } from '@/components/ui/NumericKeypad';
import { Button } from '@/components/ui/Button';
import { fieldClasses } from '@/components/ui/Input';
import { useAuthStore } from '@/store/authStore';
import { useRegisterStore } from '@/store/registerStore';
import { useBranchStore } from '@/store/branchStore';
import { cn, formatCurrency } from '@/lib/utils';

export default function CashOpenPage() {
  const currentUser = useAuthStore((s) => s.currentUser)!;
  const currentBranchId = useAuthStore((s) => s.currentBranchId);
  const activeSession = useRegisterStore((s) => s.activeSession());
  const openRegister = useRegisterStore((s) => s.openRegister);
  const branch = useBranchStore((s) => s.branches.find((b) => b.id === currentBranchId));
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  if (activeSession) {
    return <Navigate to="/pos" replace />;
  }
  if (!currentBranchId) {
    return <Navigate to="/login" replace />;
  }

  function handleOpen() {
    openRegister(currentUser, currentBranchId!, Number(amount || 0), notes || undefined);
    navigate('/pos', { replace: true });
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
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-500 text-white shadow-pop">
              <Wallet size={26} />
            </div>
            <h1 className="font-display text-xl font-bold text-ink">Apertura de caja</h1>
            <p className="text-sm text-ink-muted">
              {branch ? `${branch.name} · ` : ''}Ingresa el monto inicial en efectivo
            </p>
          </div>

          <div className="mb-4 rounded-xl2 bg-surface p-4 text-center shadow-soft">
            <p className="font-display text-3xl font-extrabold tabular-nums text-ink">
              {amount ? formatCurrency(Number(amount)) : formatCurrency(0)}
            </p>
          </div>

          <NumericKeypad
            extraKey="."
            onDigit={(d) => setAmount((prev) => (prev + d).slice(0, 8))}
            onBackspace={() => setAmount((p) => p.slice(0, -1))}
            onClear={() => setAmount('')}
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            rows={2}
            className={cn(fieldClasses, 'mt-4 text-sm')}
          />

          <Button size="lg" className="mt-4 w-full" onClick={handleOpen}>
            Abrir caja
          </Button>
        </motion.div>
      </div>
    </CashierShell>
  );
}
