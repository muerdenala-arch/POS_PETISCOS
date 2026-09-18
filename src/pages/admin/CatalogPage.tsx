import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, Sparkles } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { useCatalogStore } from '@/store/catalogStore';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { ToppingFormModal } from '@/components/admin/ToppingFormModal';
import { ProductRow } from '@/components/admin/ProductRow';
import { Button } from '@/components/ui/Button';
import type { Product, Topping } from '@/types';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { formatCurrency } from '@/lib/utils';

type Tab = 'productos' | 'toppings';

export default function CatalogPage() {
  const products = useCatalogStore((s) => s.products);
  const toppings = useCatalogStore((s) => s.toppings);
  const deleteTopping = useCatalogStore((s) => s.deleteTopping);

  const [tab, setTab] = useState<Tab>('productos');
  const [editingProduct, setEditingProduct] = useState<Product | null | 'new'>(null);
  const [editingTopping, setEditingTopping] = useState<Topping | null | 'new'>(null);

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Package size={24} className="text-primary-500" />
              Catálogo
            </h1>
            <p className="text-sm text-ink-muted">
              Gestiona productos, tamaños y agregados/toppings.
            </p>
          </div>
          {tab === 'productos' ? (
            <Button onClick={() => setEditingProduct('new')}>
              <Plus size={18} /> Nuevo producto
            </Button>
          ) : (
            <Button
              onClick={() => setEditingTopping('new')}
              className="!bg-secondary-500 hover:!bg-secondary-600"
            >
              <Plus size={18} /> Nuevo topping
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          {([
            { key: 'productos', label: 'Productos', Icon: Package },
            { key: 'toppings', label: 'Toppings / Agregados', Icon: Sparkles },
          ] as { key: Tab; label: string; Icon: typeof Package }[]).map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer',
                tab === key
                  ? 'bg-surface text-ink shadow-sm'
                  : 'text-ink-muted hover:text-ink',
              ].join(' ')}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Contenido: Productos ─────────────────────────────────────── */}
        {tab === 'productos' && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-2.5"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={staggerItem}>
                <ProductRow product={product} onEdit={() => setEditingProduct(product)} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── Contenido: Toppings ──────────────────────────────────────── */}
        {tab === 'toppings' && (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {toppings.map((t) => (
              <motion.div
                key={t.id}
                variants={staggerItem}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 shadow-soft"
              >
                <div>
                  <p className="font-semibold text-ink">{t.name}</p>
                  {t.priceExtra > 0 && (
                    <p className="text-sm text-secondary-600 font-medium dark:text-secondary-400">
                      +{formatCurrency(t.priceExtra)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingTopping(t)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-zinc-100 hover:text-ink transition-colors cursor-pointer dark:hover:bg-zinc-700"
                    title="Editar topping"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => deleteTopping(t.id)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer dark:hover:bg-red-900/20"
                    title="Eliminar topping"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </motion.div>
            ))}

            {toppings.length === 0 && (
              <p className="col-span-full py-12 text-center text-sm text-ink-muted">
                No hay toppings. Usa "Nuevo topping" para agregar.
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Modales */}
      <ProductFormModal
        product={editingProduct === 'new' ? null : editingProduct}
        open={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
      />
      <ToppingFormModal
        topping={editingTopping === 'new' ? null : editingTopping}
        open={editingTopping !== null}
        onClose={() => setEditingTopping(null)}
      />
    </AdminShell>
  );
}
