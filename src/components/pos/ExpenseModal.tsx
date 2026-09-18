import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt } from 'lucide-react';
import { useExpenseStore } from '@/store/expenseStore';
import { useAuthStore } from '@/store/authStore';
import { useRegisterStore } from '@/store/registerStore';
import { cn } from '@/lib/utils';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = ['Alimentación', 'Insumos', 'Limpieza', 'Transporte', 'Otros'];

export function ExpenseModal({ isOpen, onClose }: ExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState(CATEGORIES[1]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addExpense = useExpenseStore(s => s.addExpense);
  const currentUser = useAuthStore(s => s.currentUser);
  const currentBranchId = useAuthStore(s => s.currentBranchId);
  const activeSession = useRegisterStore(s => s.activeSession());

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession || !currentUser || !currentBranchId) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !concept.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await addExpense({
        amount: numAmount,
        concept: concept.trim(),
        category,
        cashRegisterId: activeSession.id,
        branchId: currentBranchId,
        userId: currentUser.id,
      });
      setAmount('');
      setConcept('');
      setCategory(CATEGORIES[1]);
      onClose();
    } catch (err) {
      console.error('Error al guardar gasto:', err);
      setErrorMsg('No se pudo guardar. Revisa la conexión e inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface shadow-2xl"
        >
          <div className="bg-red-500 p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt size={24} />
                <h2 className="font-display text-xl font-bold">Registrar Gasto</h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mt-1 text-sm text-red-100">
              El monto saldrá del efectivo de la caja actual.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink-muted">
                  Monto (Bs)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0.10"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-cream-50 px-4 py-3 text-lg font-bold text-ink outline-none transition-colors focus:border-red-500"
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="mb-1 block text-sm font-semibold text-ink-muted">
                  Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-cream-50 px-4 py-3 text-base font-medium text-ink outline-none transition-colors focus:border-red-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-ink-muted">
                  Motivo o Descripción
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-cream-50 px-4 py-3 text-base text-ink outline-none transition-colors focus:border-red-500"
                  placeholder="Ej. Compra de hielo"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3">
              {errorMsg && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
                  ⚠️ {errorMsg}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-cream-300 py-3.5 font-bold text-ink transition-colors hover:bg-cream-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "flex-1 rounded-xl bg-red-500 py-3.5 font-bold text-white transition-transform active:scale-[0.98]",
                    isSubmitting ? "opacity-70 cursor-wait" : "hover:bg-red-600 shadow-md shadow-red-500/20"
                  )}
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Egreso'}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
