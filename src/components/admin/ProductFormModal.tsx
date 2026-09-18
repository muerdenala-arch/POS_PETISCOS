import { useEffect, useState, useRef } from 'react';
import { Plus, Trash2, Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input, fieldClasses, fieldLabelClasses } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { optionActiveClasses, optionInactiveClasses } from '@/lib/optionStyles';
import { useCatalogStore } from '@/store/catalogStore';
import { useBranchStore } from '@/store/branchStore';
import { SIZES, CATEGORIES } from '@/data/seed';
import type { Product, SizeOption } from '@/types';
import { cn, uid } from '@/lib/utils';
import { fileToCompressedDataUrl } from '@/lib/image';
import { api } from '@/lib/api';

interface ProductFormModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🍓', '🍑', '🍉', '🍫', '🥤', '🥛', '🍋', '☕', '🫐', '🍍', '🥭', '🍏'];
const GRADIENT_OPTIONS = [
  'from-pink-400 to-rose-500',
  'from-rose-300 to-pink-500',
  'from-amber-700 to-rose-600',
  'from-amber-600 to-red-500',
  'from-orange-300 to-amber-400',
  'from-fuchsia-400 to-pink-500',
  'from-amber-800 to-red-600',
  'from-pink-400 to-fuchsia-500',
  'from-rose-300 to-pink-500',
  'from-amber-600 to-orange-500',
  'from-yellow-300 to-pink-400',
  'from-emerald-400 to-teal-500',
];

const emptyForm = {
  name: '',
  category: CATEGORIES[0] ?? 'General',
  description: '',
  basePrice: '15',
  stock: '30',
  lowStockThreshold: '8',
  emoji: EMOJI_OPTIONS[0],
  imageUrl: '',
  gradient: GRADIENT_OPTIONS[0],
  toppingIds: [] as string[],
  branchIds: [] as string[],
  unit: 'unidades',
  sizes: SIZES.map((s) => ({ ...s })) as SizeOption[],
};

const UNITS = ['unidades', 'porciones', 'botellas', 'latas', 'cajas'];

export function ProductFormModal({ product, open, onClose }: ProductFormModalProps) {
  const toppings = useCatalogStore((s) => s.toppings);
  const categories = useCatalogStore((s) => s.categories);
  const upsertProduct = useCatalogStore((s) => s.upsertProduct);
  const createProduct = useCatalogStore((s) => s.createProduct);
  const createCategory = useCatalogStore((s) => s.createCategory);
  const branches = useBranchStore((s) => s.branches);
  
  const [form, setForm] = useState(emptyForm);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [useCalculator, setUseCalculator] = useState(false);
  const [boxes, setBoxes] = useState('');
  const [unitsPerBox, setUnitsPerBox] = useState('');

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        description: product.description,
        basePrice: String(product.basePrice),
        stock: '0',
        lowStockThreshold: String(product.lowStockThreshold),
        emoji: product.emoji,
        imageUrl: product.imageUrl || '',
        gradient: product.gradient,
        toppingIds: product.toppingIds,
        branchIds: product.branchIds || [],
        unit: product.unit || 'unidades',
        sizes: product.sizes.map((s) => ({ ...s })),
      });
      setUseCalculator(false);
    } else {
      setForm({ ...emptyForm, branchIds: branches.map((b) => b.id) });
      setUseCalculator(false);
      setBoxes('');
      setUnitsPerBox('');
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
  }, [product, open, branches]);

  async function handleAddCategory() {
    if (!newCategoryName.trim()) {
      setIsAddingCategory(false);
      return;
    }
    const cat = await createCategory(newCategoryName.trim());
    if (cat) {
      setForm((f) => ({ ...f, category: cat.name }));
    }
    setIsAddingCategory(false);
    setNewCategoryName('');
  }

  // Actualizar stock cuando cambia la calculadora
  useEffect(() => {
    if (useCalculator && boxes && unitsPerBox) {
      const b = parseInt(boxes, 10) || 0;
      const u = parseInt(unitsPerBox, 10) || 0;
      setForm((f) => ({ ...f, stock: String(b * u) }));
    }
  }, [useCalculator, boxes, unitsPerBox]);

  // ── Toppings ────────────────────────────────────────────────────────────────
  function toggleTopping(id: string) {
    setForm((f) => ({
      ...f,
      toppingIds: f.toppingIds.includes(id)
        ? f.toppingIds.filter((t) => t !== id)
        : [...f.toppingIds, id],
    }));
  }

  function toggleBranch(id: string) {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(id)
        ? f.branchIds.filter((b) => b !== id)
        : [...f.branchIds, id],
    }));
  }

  function toggleAllBranches() {
    setForm((f) => ({
      ...f,
      branchIds: f.branchIds.length === branches.length ? [] : branches.map((b) => b.id),
    }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, { maxWidth: 640, quality: 0.85 });
      const { url } = await api.upload.image(dataUrl, 'products');
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (error) {
      console.error('Error al subir imagen:', error);
      alert('Error al subir imagen. Intenta nuevamente.');
    } finally {
      setUploading(false);
    }
  }

  // ── Precios / Tamaños ─────────────────────────────────────────────────────────────────
  function addSize() {
    setForm((f) => ({
      ...f,
      sizes: [
        ...f.sizes,
        { id: uid('sz'), label: 'Nuevo tamaño', ounces: 0, price: 0 },
      ],
    }));
  }

  function updateSize(idx: number, field: keyof SizeOption, value: string | number) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  }

  function removeSize(idx: number) {
    setForm((f) => ({ ...f, sizes: f.sizes.filter((_, i) => i !== idx) }));
  }

  // ── Guardar ─────────────────────────────────────────────────────────────────
  function handleSave() {
    if (!form.name.trim()) return;
    const stockByBranch = product
      ? product.stockByBranch
      : Object.fromEntries(branches.map((b) => [b.id, Number(form.stock) || 0]));
    const base = {
      name: form.name.trim(),
      category: form.category,
      description: form.description,
      basePrice: Number(form.basePrice) || 0,
      gradient: form.gradient,
      emoji: form.emoji,
      imageUrl: form.imageUrl,
      sizes: form.sizes.map((s) => ({
        ...s,
        ounces: Number(s.ounces) || 0,
        price: Number(s.price) || 0,
      })),
      // Mantenemos en el modelo pero no se muestran en la UI principal:

      toppingIds: form.toppingIds,
      branchIds: form.branchIds,
      active: product?.active ?? true,
      stockByBranch,
      lowStockThreshold: Number(form.lowStockThreshold) || 0,
      unit: form.unit,
    };
    if (product) {
      upsertProduct({ ...base, id: product.id });
    } else {
      createProduct(base);
    }
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Editar producto' : 'Nuevo producto'} size="lg">
      <div className="grid grid-cols-1 gap-5 px-6 pb-6 pt-2 sm:grid-cols-2">
        {/* Nombre */}
        <Input
          label="Nombre del producto"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />

        {/* Categoría */}
        <div className="flex flex-col">
          <span className={fieldLabelClasses}>Categoría</span>
          {isAddingCategory ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCategory();
                  } else if (e.key === 'Escape') {
                    setIsAddingCategory(false);
                  }
                }}
                placeholder="Nombre de la categoría..."
                className={cn(fieldClasses, 'min-h-touch flex-1')}
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="flex items-center justify-center rounded-xl bg-primary-500 px-4 text-sm font-semibold text-white hover:bg-primary-600 cursor-pointer"
              >
                Crear
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className={cn(fieldClasses, 'min-h-touch flex-1')}
              >
                {categories.length === 0 && <option value={form.category}>{form.category}</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsAddingCategory(true)}
                title="Nueva categoría"
                className="flex items-center justify-center rounded-xl bg-surface border border-border px-3 text-ink-muted hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <Plus size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Descripción */}
        <div className="sm:col-span-2">
          <label className="flex flex-col">
            <span className={fieldLabelClasses}>Descripción</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className={cn(fieldClasses, 'text-sm')}
            />
          </label>
        </div>

        {/* Precio base */}
        <Input
          label="Precio base (tamaño menor, Bs)"
          type="number"
          min={0}
          step={0.5}
          value={form.basePrice}
          onChange={(e) => setForm((f) => {
            const val = e.target.value;
            const nextSizes = f.sizes.length > 0 
              ? f.sizes.map((s, i) => (i === 0 ? { ...s, price: Number(val) || 0 } : s)) 
              : f.sizes;
            return { ...f, basePrice: val, sizes: nextSizes };
          })}
        />

        {/* Stock y Calculadora */}
        {product ? (
          <div>
            <p className={fieldLabelClasses}>Stock</p>
            <p className="flex min-h-touch items-center rounded-xl border border-border-strong bg-field px-4 text-sm text-ink-muted">
              Se ajusta por sucursal desde Inventario.
            </p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <p className={fieldLabelClasses}>Stock inicial (todas las sucursales)</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCalculator}
                  onChange={(e) => setUseCalculator(e.target.checked)}
                  className="rounded border-zinc-300 text-primary-500 focus:ring-primary-500 w-3.5 h-3.5"
                />
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 select-none">Calculadora de Cajas</span>
              </label>
            </div>
            
            {useCalculator ? (
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-900 dark:bg-primary-900/10">
                <Input
                  label="Cant. de Cajas"
                  type="number"
                  min={0}
                  value={boxes}
                  onChange={(e) => setBoxes(e.target.value)}
                />
                <Input
                  label="Unidades × Caja"
                  type="number"
                  min={0}
                  value={unitsPerBox}
                  onChange={(e) => setUnitsPerBox(e.target.value)}
                />
                <div className="flex flex-col">
                  <span className={fieldLabelClasses}>Stock Total</span>
                  <span className="flex min-h-[42px] items-center px-2 font-display text-lg font-bold text-ink">
                    {form.stock || 0}
                  </span>
                </div>
              </div>
            ) : (
              <Input
                label=""
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                placeholder="Ej. 30"
              />
            )}
          </div>
        )}

        {/* Unidad y Umbral */}
        <div className="grid grid-cols-2 gap-5 sm:col-span-2">
          <label className="flex flex-col">
            <span className={fieldLabelClasses}>Unidad de medida</span>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className={cn(fieldClasses, 'min-h-touch')}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Umbral de stock bajo"
            type="number"
            min={0}
            value={form.lowStockThreshold}
            onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
          />
        </div>

        {/* ── Variantes / Tamaños ──────────────────────────────────────────────── */}
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className={fieldLabelClasses}>Variantes / Tamaños</p>
            <button
              type="button"
              onClick={addSize}
              className="flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer dark:bg-primary-900/30 dark:text-primary-400"
            >
              <Plus size={13} /> Agregar variante
            </button>
          </div>
          <div className="space-y-2">
            {form.sizes.map((s, idx) => (
              <div
                key={s.id}
                className="grid grid-cols-[1fr_80px_90px_36px] items-center gap-2 rounded-xl border border-border bg-field px-3 py-2"
              >
                <input
                  value={s.label}
                  onChange={(e) => updateSize(idx, 'label', e.target.value)}
                  placeholder="Nombre (ej. Personal)"
                  className="min-w-0 rounded-lg border-0 bg-transparent text-sm text-ink placeholder:text-ink-soft focus:outline-none"
                />
                <input
                  type="number"
                  min={0}
                  value={s.ounces}
                  onChange={(e) => updateSize(idx, 'ounces', e.target.value)}
                  placeholder="ml"
                  className="w-full rounded-lg border border-border-strong bg-surface px-2 py-1 text-center text-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary-400"
                />
                <div className="relative">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-soft">
                    +Bs
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={s.price}
                    onChange={(e) => updateSize(idx, 'price', e.target.value)}
                    className="w-full rounded-lg border border-border-strong bg-surface py-1 pl-7 pr-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-primary-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSize(idx)}
                  disabled={form.sizes.length <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed dark:hover:bg-red-900/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-soft">
            
          </p>
        </div>

        {/* ── Ícono / Imagen ───────────────────────────────────────────────────────── */}
        <div className="sm:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
            <p className={fieldLabelClasses}>Ícono o Foto</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer dark:bg-primary-900/30 dark:text-primary-400"
              >
                <ImageIcon size={13} /> Subir de la galería
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-600 hover:bg-primary-100 transition-colors cursor-pointer dark:bg-primary-900/30 dark:text-primary-400"
              >
                <Camera size={13} /> Tomar foto
              </button>
            </div>
            
            <input 
              ref={cameraInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
            <input 
              ref={galleryInputRef} 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleImageUpload} 
            />
          </div>
          
          {uploading ? (
            <div className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-300 bg-primary-50 text-sm font-bold text-ink dark:bg-primary-500/10 mb-4">
              <Upload size={18} className="animate-pulse text-primary-500" />
              Subiendo imagen...
            </div>
          ) : form.imageUrl ? (
            <div className="mb-4 flex items-center gap-4 rounded-xl border border-border bg-field p-3">
              <img src={form.imageUrl} alt="Producto" className="h-16 w-16 rounded-lg object-cover bg-white shadow-sm" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-ink">Foto subida</span>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, imageUrl: '' }))}
                  className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer text-left"
                >
                  Quitar foto (volver a emoji)
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setForm((f) => ({ ...f, emoji: e }))}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl border text-xl cursor-pointer transition-colors',
                  form.emoji === e
                    ? 'border-transparent bg-primary-100 ring-2 ring-primary-500 dark:bg-primary-900/30'
                    : 'border-zinc-300 bg-zinc-50 hover:border-primary-300 dark:border-zinc-700 dark:bg-zinc-800',
                )}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* ── Color de tarjeta ─────────────────────────────────────────────── */}
        <div className="sm:col-span-2">
          <p className={fieldLabelClasses}>Color de tarjeta</p>
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {GRADIENT_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setForm((f) => ({ ...f, gradient: g }))}
                aria-label={g}
                className={cn(
                  'h-11 rounded-xl bg-gradient-to-br cursor-pointer border-2 transition-all',
                  g,
                  form.gradient === g
                    ? 'border-white ring-2 ring-primary-500 scale-105 dark:border-zinc-900'
                    : 'border-transparent',
                )}
              />
            ))}
          </div>
        </div>

        {/* ── Toppings disponibles ─────────────────────────────────────────── */}
        <div className="sm:col-span-2">
          <p className={fieldLabelClasses}>Agregados / Toppings disponibles</p>
          <div className="flex flex-wrap gap-2">
            {toppings.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTopping(t.id)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-sm transition-colors cursor-pointer',
                  form.toppingIds.includes(t.id) ? optionActiveClasses : optionInactiveClasses,
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* ── Disponibilidad por Sucursal ──────────────────────────────────── */}
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <p className={fieldLabelClasses}>Disponibilidad por Sucursal</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.branchIds.length === branches.length && branches.length > 0}
                onChange={toggleAllBranches}
                className="rounded border-zinc-300 text-primary-500 focus:ring-primary-500 w-4 h-4"
              />
              <span className="text-sm text-ink-muted select-none">En todas</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBranch(b.id)}
                className={cn(
                  'rounded-full border px-3.5 py-2 text-sm transition-colors cursor-pointer',
                  form.branchIds.includes(b.id) ? optionActiveClasses : optionInactiveClasses,
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-border bg-surface px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 border-transparent bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          className="flex-[2] !bg-primary-500 py-3 !text-white !shadow-lg hover:!bg-primary-600"
          size="lg"
          disabled={!form.name.trim()}
        >
          Guardar producto
        </Button>
      </div>
    </Modal>
  );
}
