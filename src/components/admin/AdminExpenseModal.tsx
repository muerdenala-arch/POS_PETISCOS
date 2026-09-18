import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, DollarSign, Receipt, MapPin } from 'lucide-react';
import { useExpenseStore } from '@/store/expenseStore';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { fieldClasses } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import { submitExpense } from '@/lib/syncManager';

const CATEGORIES = [
  'Insumos y Mercadería',
  'Alimentación Personal',
  'Transporte y Pasajes',
  'Limpieza',
  'Servicios Básicos',
  'Mantenimiento',
  'Otros'
];

interface AdminExpenseModalProps {
  onClose: () => void;
}

export function AdminExpenseModal({ onClose }: AdminExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [concept, setConcept] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [branchId, setBranchId] = useState<string>('all'); // 'all' means Gasto de Empresa
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const currentUser = useAuthStore(s => s.currentUser);
  const branches = useBranchStore(s => s.branches);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || !concept.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const newExpense = {
        id: crypto.randomUUID(),
        amount: numAmount,
        concept: concept.trim(),
        category,
        cashRegisterId: null,
        branchId: branchId === 'all' ? null : branchId,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
      };
      
      // Submit directly via syncManager (offline support) or API
      await submitExpense(newExpense);
      useExpenseStore.getState().fetchAll(); // refresh state
      
      onClose();
    } catch (err) {
      console.error('Error al guardar gasto de admin:', err);
      setErrorMsg('No se pudo guardar el gasto. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-surface shadow-2xl"
      >
        <div className="bg-red-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-white">Registrar Gasto (Admin)</h2>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            >
              <X size={20} />
            </button>
          </div>
          <p className="mt-1 text-sm text-red-100">Gasto libre no asociado a caja registradora</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
                <MapPin size={16} className="text-primary-500" /> Sucursal o Empresa
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className={fieldClasses}
              >
                <option value="all">🏢 Gasto General de la Empresa (Libre)</option>
                <optgroup label="Asignar a Sucursal Específica">
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
                <DollarSign size={16} className="text-red-500" /> Monto (Bs)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 150.50"
                className={fieldClasses}
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink">
                <Receipt size={16} className="text-red-500" /> Motivo / Concepto
              </label>
              <input
                type="text"
                required
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej. Compra de 3 cajas de frutillas"
                className={fieldClasses}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-ink">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-sm font-semibold transition-colors",
                      category === cat
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-border bg-surface text-ink-muted hover:border-red-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
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
  );
}
