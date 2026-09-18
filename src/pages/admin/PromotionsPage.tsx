import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Ticket, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { usePromotionStore } from '@/store/promotionStore';
import { useCouponStore } from '@/store/couponStore';
import { useBranchStore } from '@/store/branchStore';
import { useCatalogStore } from '@/store/catalogStore';
import { uid, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Promotion, Coupon, DiscountType, CouponDiscountType } from '@/types';

type PromoForm = {
  name: string;
  discountType: DiscountType;
  discountValue: string;
  appliesTo: string;
  branchIds: string[];
};

type CouponForm = {
  code: string;
  discountType: CouponDiscountType;
  discountValue: string;
  maxUses: string;
  expiresAt: string;
  appliesTo: string;
  branchId: string;
};

const defaultPromoForm: PromoForm = {
  name: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  appliesTo: 'ALL',
  branchIds: [],
};

const defaultCouponForm: CouponForm = {
  code: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  maxUses: '1',
  expiresAt: '',
  appliesTo: 'ALL',
  branchId: '',
};

export default function PromotionsPage() {
  const { promotions, createPromotion, deletePromotion, toggleActive: togglePromo } = usePromotionStore();
  const { coupons, createCoupon, deleteCoupon, toggleActive: toggleCoupon } = useCouponStore();
  const branches = useBranchStore((s) => s.branches);
  const categories = useCatalogStore((s) => s.categories);
  const products = useCatalogStore((s) => s.products);

  const [tab, setTab] = useState<'promos' | 'coupons'>('promos');
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [promoForm, setPromoForm] = useState<PromoForm>(defaultPromoForm);
  const [couponForm, setCouponForm] = useState<CouponForm>(defaultCouponForm);
  const [savingPromo, setSavingPromo] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  async function handleCreatePromo() {
    if (!promoForm.name || !promoForm.discountValue || promoForm.branchIds.length === 0) return;
    setSavingPromo(true);
    await createPromotion({
      name: promoForm.name,
      discountType: promoForm.discountType,
      discountValue: parseFloat(promoForm.discountValue),
      appliesTo: promoForm.appliesTo,
      branchIds: promoForm.branchIds,
      isActive: true,
    });
    setPromoForm(defaultPromoForm);
    setPromoModalOpen(false);
    setSavingPromo(false);
  }

  async function handleCreateCoupon() {
    if (!couponForm.code || !couponForm.discountValue || !couponForm.maxUses) return;
    setSavingCoupon(true);
    setCouponError(null);
    try {
      await createCoupon({
        code: couponForm.code.toUpperCase(),
        discountType: couponForm.discountType,
        discountValue: parseFloat(couponForm.discountValue),
        maxUses: parseInt(couponForm.maxUses, 10),
        expiresAt: couponForm.expiresAt || undefined,
        isActive: true,
        appliesTo: couponForm.appliesTo,
        branchId: couponForm.branchId || null,
      });
      setCouponForm(defaultCouponForm);
      setCouponModalOpen(false);
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Error al crear el cupón.');
    }
    setSavingCoupon(false);
  }

  function toggleBranchInPromo(branchId: string) {
    setPromoForm((f) => ({
      ...f,
      branchIds: f.branchIds.includes(branchId)
        ? f.branchIds.filter((b) => b !== branchId)
        : [...f.branchIds, branchId],
    }));
  }

  function couponStatus(coupon: Coupon): { label: string; tone: 'primary' | 'danger' | 'warning' | 'neutral' } {
    if (!coupon.isActive) return { label: 'Desactivado', tone: 'neutral' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return { label: 'Vencido', tone: 'danger' };
    if (coupon.usedCount >= coupon.maxUses) return { label: 'Agotado', tone: 'danger' };
    return { label: 'Activo', tone: 'primary' };
  }

  return (
    <AdminShell>
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ink">
              <Tag size={24} className="text-primary-500" /> Promociones y Cupones
            </h1>
            <p className="text-sm text-ink-muted">Gestiona descuentos, promos del día y vales para clientes VIP</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-full bg-cream-300 p-1 w-fit">
          <button
            onClick={() => setTab('promos')}
            className={cn('rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer', tab === 'promos' ? 'bg-surface shadow-soft text-ink' : 'text-ink-muted')}
          >
            🏷️ Promociones del día
          </button>
          <button
            onClick={() => setTab('coupons')}
            className={cn('rounded-full px-5 py-2 text-sm font-semibold transition-colors cursor-pointer', tab === 'coupons' ? 'bg-surface shadow-soft text-ink' : 'text-ink-muted')}
          >
            🎟️ Cupones / Vales
          </button>
        </div>

        {/* ============ PROMOS TAB ============ */}
        {tab === 'promos' && (
          <div>
            <div className="mb-4 flex justify-end">
              <Button onClick={() => setPromoModalOpen(true)} className="gap-2">
                <Plus size={16} /> Nueva Promoción
              </Button>
            </div>

            {promotions.length === 0 ? (
              <Card className="py-16 text-center">
                <Tag size={36} className="mx-auto mb-3 text-ink-soft opacity-40" />
                <p className="text-sm text-ink-soft">No hay promociones creadas todavía.</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {promotions.map((promo) => (
                  <Card key={promo.id} className="flex items-center gap-4 p-4">
                    <div className={cn('flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl', promo.isActive ? 'bg-green-100' : 'bg-cream-300')}>
                      🏷️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-ink">{promo.name}</p>
                      <p className="text-sm text-ink-muted">
                        {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `−${formatCurrency(promo.discountValue)}`}
                        {' · '}
                        {promo.appliesTo === 'ALL' ? 'Todos los productos' : promo.appliesTo}
                        {' · '}
                        {branches.filter((b) => promo.branchIds.includes(b.id)).map((b) => b.name).join(', ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={promo.isActive ? 'primary' : 'neutral'}>
                        {promo.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                      <button
                        onClick={() => togglePromo(promo.id)}
                        className="text-primary-500 hover:text-primary-700 cursor-pointer"
                        title={promo.isActive ? 'Desactivar' : 'Activar'}
                      >
                        {promo.isActive ? <ToggleRight size={26} /> : <ToggleLeft size={26} className="text-ink-soft" />}
                      </button>
                      <button
                        onClick={() => deletePromotion(promo.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-soft hover:bg-red-50 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============ COUPONS TAB ============ */}
        {tab === 'coupons' && (
          <div>
            <div className="mb-4 flex justify-end">
              <Button onClick={() => { setCouponModalOpen(true); setCouponError(null); }} className="gap-2">
                <Plus size={16} /> Nuevo Cupón / Vale
              </Button>
            </div>

            {coupons.length === 0 ? (
              <Card className="py-16 text-center">
                <Ticket size={36} className="mx-auto mb-3 text-ink-soft opacity-40" />
                <p className="text-sm text-ink-soft">No hay cupones creados todavía.</p>
              </Card>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-ink-muted">
                      <th className="pb-3 font-semibold">Código</th>
                      <th className="pb-3 font-semibold">Descuento</th>
                      <th className="pb-3 font-semibold text-center">Usos</th>
                      <th className="pb-3 font-semibold">Vence</th>
                      <th className="pb-3 font-semibold">Estado</th>
                      <th className="pb-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {coupons.map((coupon) => {
                      const status = couponStatus(coupon);
                      return (
                        <tr key={coupon.id} className="text-ink">
                          <td className="py-3 font-bold font-mono text-primary-700">{coupon.code}</td>
                          <td className="py-3">
                            {coupon.discountType === 'PERCENTAGE' && `${coupon.discountValue}% OFF`}
                            {coupon.discountType === 'FIXED_AMOUNT' && `−${formatCurrency(coupon.discountValue)}`}
                            {coupon.discountType === 'FREE_ITEM' && '100% Cortesía'}
                          </td>
                          <td className="py-3 text-center">
                            <span className={cn('font-bold', coupon.usedCount >= coupon.maxUses ? 'text-red-600' : 'text-ink')}>
                              {coupon.usedCount}
                            </span>
                            <span className="text-ink-muted">/{coupon.maxUses}</span>
                          </td>
                          <td className="py-3 text-ink-muted">
                            {coupon.expiresAt
                              ? new Date(coupon.expiresAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                              : 'Sin límite'}
                          </td>
                          <td className="py-3">
                            <Badge tone={status.tone}>{status.label}</Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => toggleCoupon(coupon.id)}
                                className="text-primary-500 hover:text-primary-700 cursor-pointer"
                                title={coupon.isActive ? 'Desactivar' : 'Activar'}
                              >
                                {coupon.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} className="text-ink-soft" />}
                              </button>
                              <button
                                onClick={() => deleteCoupon(coupon.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-red-50 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======= MODAL: Nueva Promoción ======= */}
      <Modal open={promoModalOpen} onClose={() => setPromoModalOpen(false)} title="Nueva Promoción" size="md">
        <div className="space-y-4 px-5 pb-5 pt-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Nombre</label>
            <input
              value={promoForm.name}
              onChange={(e) => setPromoForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Miércoles 50% OFF, Viernes Dulce..."
              className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Tipo</label>
              <select
                value={promoForm.discountType}
                onChange={(e) => setPromoForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))}
                className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
              >
                <option value="PERCENTAGE">% Porcentaje</option>
                <option value="FIXED_AMOUNT">Bs Monto fijo</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">
                {promoForm.discountType === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto (Bs)'}
              </label>
              <input
                type="number"
                min="0"
                max={promoForm.discountType === 'PERCENTAGE' ? '100' : undefined}
                value={promoForm.discountValue}
                onChange={(e) => setPromoForm((f) => ({ ...f, discountValue: e.target.value }))}
                placeholder={promoForm.discountType === 'PERCENTAGE' ? '50' : '10'}
                className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Aplica a</label>
            <select
              value={promoForm.appliesTo}
              onChange={(e) => setPromoForm((f) => ({ ...f, appliesTo: e.target.value }))}
              className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
            >
              <option value="ALL">Todos los productos</option>
              <optgroup label="Categorías Completas">
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Productos Específicos">
                {products.map((p) => (
                  <option key={`p_${p.id}`} value={`PRODUCT:${p.id}`}>{p.name} ({p.category})</option>
                ))}
              </optgroup>
              <optgroup label="Tamaños Específicos">
                {products.filter((p) => p.sizes.length > 0).map((p) => (
                  p.sizes.map((s) => (
                    <option key={`p_${p.id}_s_${s.id}`} value={`SIZE:${p.id}:${s.id}`}>
                      {p.name} - {s.label}
                    </option>
                  ))
                ))}
              </optgroup>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold text-ink-muted uppercase tracking-wide">Sucursales</label>
            <div className="flex flex-wrap gap-2">
              {branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBranchInPromo(b.id)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer border-2',
                    promoForm.branchIds.includes(b.id)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-border bg-surface text-ink-muted hover:border-primary-300',
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setPromoModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleCreatePromo}
              disabled={savingPromo || !promoForm.name || !promoForm.discountValue || promoForm.branchIds.length === 0}
              className="flex-1"
            >
              {savingPromo ? 'Guardando...' : 'Crear Promoción'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ======= MODAL: Nuevo Cupón ======= */}
      <Modal open={couponModalOpen} onClose={() => setCouponModalOpen(false)} title="Nuevo Cupón / Vale" size="md">
        <div className="space-y-4 px-5 pb-5 pt-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Código / PIN</label>
            <input
              value={couponForm.code}
              onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Ej: INFLUENCER50, VALE100, 7744"
              className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm font-mono font-bold uppercase text-ink focus:border-primary-400 focus:outline-none tracking-wider"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Tipo</label>
              <select
                value={couponForm.discountType}
                onChange={(e) => setCouponForm((f) => ({ ...f, discountType: e.target.value as CouponDiscountType }))}
                className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
              >
                <option value="PERCENTAGE">% Porcentaje</option>
                <option value="FIXED_AMOUNT">Bs Monto fijo</option>
                <option value="FREE_ITEM">100% Cortesía</option>
              </select>
            </div>
            {couponForm.discountType !== 'FREE_ITEM' && (
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">
                  {couponForm.discountType === 'PERCENTAGE' ? 'Porcentaje (%)' : 'Monto (Bs)'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm((f) => ({ ...f, discountValue: e.target.value }))}
                  placeholder={couponForm.discountType === 'PERCENTAGE' ? '20' : '15'}
                  className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Máx. de usos</label>
              <div className="flex gap-1.5">
                {['1', '5', '10', '∞'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCouponForm((f) => ({ ...f, maxUses: v === '∞' ? '999999' : v }))}
                    className={cn(
                      'flex-1 rounded-lg py-2 text-xs font-bold transition-colors cursor-pointer border',
                      (couponForm.maxUses === v || (v === '∞' && couponForm.maxUses === '999999'))
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-border bg-surface text-ink-muted hover:border-primary-300',
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="1"
                value={couponForm.maxUses}
                onChange={(e) => setCouponForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="o número personalizado"
                className="mt-1.5 w-full rounded-xl border border-border bg-field px-3 py-2 text-sm text-ink focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Fecha límite</label>
              <input
                type="datetime-local"
                value={couponForm.expiresAt}
                onChange={(e) => setCouponForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-ink-soft">Dejar vacío = sin vencimiento</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Aplica a</label>
              <select
                value={couponForm.appliesTo}
                onChange={(e) => setCouponForm((f) => ({ ...f, appliesTo: e.target.value }))}
                className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
              >
                <option value="ALL">Todos los productos</option>
                <optgroup label="Categorías Completas">
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Productos Específicos">
                  {products.map((p) => (
                    <option key={`p_${p.id}`} value={`PRODUCT:${p.id}`}>{p.name} ({p.category})</option>
                  ))}
                </optgroup>
                <optgroup label="Tamaños Específicos">
                  {products.filter((p) => p.sizes.length > 0).map((p) => (
                    p.sizes.map((s) => (
                      <option key={`p_${p.id}_s_${s.id}`} value={`SIZE:${p.id}:${s.id}`}>
                        {p.name} - {s.label}
                      </option>
                    ))
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted uppercase tracking-wide">Sucursal (opcional)</label>
              <select
                value={couponForm.branchId}
                onChange={(e) => setCouponForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full rounded-xl border border-border bg-field px-3 py-2.5 text-sm text-ink focus:border-primary-400 focus:outline-none"
              >
                <option value="">Todas las sucursales</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {couponError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-red-700">{couponError}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setCouponModalOpen(false)} className="flex-1">Cancelar</Button>
            <Button
              onClick={handleCreateCoupon}
              disabled={savingCoupon || !couponForm.code || (!couponForm.discountValue && couponForm.discountType !== 'FREE_ITEM') || !couponForm.maxUses}
              className="flex-1"
            >
              {savingCoupon ? 'Guardando...' : 'Crear Cupón'}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
}
