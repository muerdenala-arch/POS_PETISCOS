import { useMemo, useState, useEffect } from 'react';
import { AdminShell } from '@/components/layout/AdminShell';
import { useExpenseStore } from '@/store/expenseStore';
import { useBranchStore } from '@/store/branchStore';
import { useStaffStore } from '@/store/staffStore';
import { formatCurrency } from '@/lib/utils';
import { Receipt, Search, PlusCircle, Building2 } from 'lucide-react';
import { fieldClasses } from '@/components/ui/Input';
import { AdminExpenseModal } from '@/components/admin/AdminExpenseModal';

export default function ExpensesPage() {
  const expenses = useExpenseStore(s => s.expenses);
  const fetchExpenses = useExpenseStore(s => s.fetchAll);
  const branches = useBranchStore(s => s.branches);
  const adminFilterBranchId = useBranchStore(s => s.adminFilterBranchId);
  const users = useStaffStore(s => s.users);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Carga inicial y auto-refresco cada 15s (polling)
  useEffect(() => {
    fetchExpenses();
    const interval = setInterval(() => {
      fetchExpenses();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchExpenses]);

  const filteredExpenses = useMemo(() => {
    let result = expenses;
    
    if (adminFilterBranchId) {
      result = result.filter(e => e.branchId === adminFilterBranchId);
    }
    
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.concept.toLowerCase().includes(q) || 
        e.category.toLowerCase().includes(q) ||
        (users.find(u => u.id === e.userId)?.name.toLowerCase().includes(q))
      );
    }
    
    return result;
  }, [expenses, adminFilterBranchId, searchTerm, users]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <AdminShell>
      <div className="flex h-full flex-col">
        <header className="flex-shrink-0 border-b border-border bg-surface px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                <Receipt size={24} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-ink">Gastos Diarios</h1>
                <p className="text-sm text-ink-muted">Control de egresos de caja por sucursal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 active:scale-95 shadow-md shadow-red-500/20"
              >
                <PlusCircle size={18} />
                Registrar Gasto (Admin)
              </button>
              <div className="rounded-xl bg-red-50 px-4 py-2 text-right hidden sm:block">
                <p className="text-xs font-bold uppercase text-red-600/70">Total Filtrado</p>
                <p className="font-display text-xl font-bold text-red-700">
                  {formatCurrency(totalFiltered)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={18} />
              <input
                type="text"
                placeholder="Buscar por motivo, categoría o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${fieldClasses} pl-10`}
              />
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-x-auto bg-surface p-6">
          {filteredExpenses.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-ink-muted">
              <Receipt size={48} className="mb-4 text-border" />
              <p className="text-lg font-semibold">No se encontraron gastos</p>
              <p className="text-sm">Prueba ajustando los filtros o seleccionando otra sucursal.</p>
            </div>
          ) : (
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-border text-left">
                  <th className="pb-3 pr-4 font-bold text-ink-muted">Fecha y Hora</th>
                  <th className="pb-3 pr-4 font-bold text-ink-muted">Concepto</th>
                  <th className="pb-3 pr-4 font-bold text-ink-muted">Categoría</th>
                  <th className="pb-3 pr-4 font-bold text-ink-muted">Sucursal</th>
                  <th className="pb-3 pr-4 font-bold text-ink-muted">Registrado por</th>
                  <th className="pb-3 text-right font-bold text-ink-muted">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredExpenses.map(expense => (
                  <tr key={expense.id} className="transition-colors hover:bg-cream-50/50">
                    <td className="py-4 pr-4 text-ink">
                      {new Date(expense.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 pr-4 font-medium text-ink">
                      {expense.concept}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-block rounded-full bg-cream-300 px-2 py-0.5 text-xs font-semibold text-ink-muted">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-ink-muted">
                      {expense.branchId 
                        ? (branches.find(b => b.id === expense.branchId)?.name || 'Sucursal Desconocida')
                        : <span className="flex items-center gap-1.5 font-bold text-primary-600"><Building2 size={14} /> Gasto de Empresa</span>
                      }
                    </td>
                    <td className="py-4 pr-4 text-ink-muted">
                      {users.find(u => u.id === expense.userId)?.name || 'Usuario Desconocido'}
                    </td>
                    <td className="py-4 text-right font-display font-bold text-red-600">
                      -{formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {isModalOpen && <AdminExpenseModal onClose={() => setIsModalOpen(false)} />}
    </AdminShell>
  );
}
