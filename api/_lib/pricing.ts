import { query, type TxQuery } from './db.js';
import type { CartItem, Promotion, WarehouseDelivery } from '../../src/types/index.js';

/** Tolerancia para comparar montos recalculados contra los que manda el cliente —
 *  cubre redondeos de punto flotante, no una brecha real de precio. */
export const AMOUNT_EPSILON = 0.01;

interface DbProductRow {
  id: string;
  category: string;
  base_price: number;
  sizes: { id: string; price: number }[];
  topping_ids: string[];
  active: boolean;
  branch_ids: string[];
}

interface DbToppingRow {
  id: string;
  price_extra: number;
  branch_ids: string[];
}

/** Misma fórmula que `applyPromoDiscount` en src/store/cartStore.ts — se duplica acá
 *  a propósito (el servidor no puede importar código de src/ pensado para el bundle
 *  del navegador) pero debe mantenerse idéntica. */
function applyPromoDiscount(price: number, promo: Promotion | null): number {
  if (!promo) return price;
  if (promo.discountType === 'PERCENTAGE') {
    return Math.max(0, price - (price * promo.discountValue) / 100);
  }
  return Math.max(0, price - promo.discountValue);
}

/** Fecha de hoy en Bolivia como "YYYY-MM-DD" — misma función que en
 *  src/store/promotionStore.ts, comparable directo contra starts_at/ends_at. */
function todayInBolivia(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' });
}

function isWithinDateRange(promo: Pick<Promotion, 'startDate' | 'endDate'>): boolean {
  const today = todayInBolivia();
  if (promo.startDate && today < promo.startDate) return false;
  if (promo.endDate && today > promo.endDate) return false;
  return true;
}

/** Misma regla de selección que `activePromotionFor` en src/store/promotionStore.ts. */
function findActivePromotion(
  promotions: Promotion[],
  product: { id: string; category: string },
  sizeId: string | undefined,
  branchId: string,
): Promotion | null {
  return (
    promotions.find(
      (p) =>
        p.isActive &&
        p.branchIds.includes(branchId) &&
        isWithinDateRange(p) &&
        (p.appliesTo === 'ALL' ||
          p.appliesTo === product.category ||
          p.appliesTo === `PRODUCT:${product.id}` ||
          (!!sizeId && p.appliesTo === `SIZE:${product.id}:${sizeId}`)),
    ) ?? null
  );
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface RecomputedPricing {
  items: CartItem[];
  subtotal: number;
  subtotalBeforeDiscount: number;
  categoryOf: (productId: string) => string;
}

/**
 * Recalcula el precio de cada ítem de una venta a partir del catálogo REAL en la
 * base de datos (producto, tamaño, toppings, promoción vigente) — nunca confía en
 * los precios que vengan en el `body` de la request, que un cliente modificado (o
 * una llamada directa a la API) podría alterar libremente.
 *
 * Tira un Error (mensaje pensado para mostrarse tal cual al cajero) si algún ítem
 * referencia un producto/topping/tamaño que no existe, no está activo, o no
 * pertenece a la sucursal de la venta.
 */
export async function recomputeItemPricing(items: CartItem[], branchId: string): Promise<RecomputedPricing> {
  if (!Array.isArray(items)) {
    throw new Error('La venta no tiene ítems.');
  }
  // Un carrito vacío es válido cuando la "venta" es solo una entrega de bodega sin
  // costo (ver api/sales.ts) — en ese caso no hay nada que recalcular.
  if (items.length === 0) {
    return { items: [], subtotal: 0, subtotalBeforeDiscount: 0, categoryOf: () => '' };
  }

  const productIds = [...new Set(items.map((i) => i.product?.id))];
  const toppingIds = [...new Set(items.flatMap((i) => i.modifiers?.toppings?.map((t) => t.id) ?? []))];

  const [products, toppings, promotions] = await Promise.all([
    query<DbProductRow>(
      `select id, category, base_price, sizes, topping_ids, active, branch_ids from products where id = any($1::text[])`,
      [productIds],
    ),
    toppingIds.length
      ? query<DbToppingRow>(`select id, price_extra, branch_ids from toppings where id = any($1::text[])`, [toppingIds])
      : Promise.resolve([] as DbToppingRow[]),
    query<Promotion>(
      `select id, name, discount_type as "discountType", discount_value as "discountValue",
         applies_to as "appliesTo", branch_ids as "branchIds", is_active as "isActive",
         starts_at::text as "startDate", ends_at::text as "endDate", created_at as "createdAt"
       from promotions order by created_at desc`,
    ),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const toppingMap = new Map(toppings.map((t) => [t.id, t]));

  let subtotal = 0;
  let subtotalBeforeDiscount = 0;
  const recomputedItems: CartItem[] = [];

  for (const item of items) {
    const dbProduct = productMap.get(item.product?.id);
    if (!dbProduct) throw new Error(`Producto no encontrado o ya no existe: ${item.product?.name ?? item.product?.id}.`);
    if (!dbProduct.active) throw new Error(`"${item.product.name}" ya no está disponible.`);
    if (!dbProduct.branch_ids.includes(branchId)) {
      throw new Error(`"${item.product.name}" no está disponible en esta sucursal.`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Cantidad inválida para "${item.product.name}".`);
    }

    const sizes = dbProduct.sizes ?? [];
    let sizePrice = Number(dbProduct.base_price);
    let sizeId: string | undefined;
    if (sizes.length > 0) {
      const dbSize = sizes.find((s) => s.id === item.modifiers?.size?.id);
      if (!dbSize) throw new Error(`Tamaño inválido para "${item.product.name}".`);
      sizePrice = Number(dbSize.price);
      sizeId = dbSize.id;
    }

    let toppingsTotal = 0;
    for (const t of item.modifiers?.toppings ?? []) {
      const dbTopping = toppingMap.get(t.id);
      if (!dbTopping) throw new Error(`Topping no encontrado: ${t.name ?? t.id}.`);
      if (!dbTopping.branch_ids.includes(branchId)) throw new Error(`"${t.name}" no está disponible en esta sucursal.`);
      if (!(dbProduct.topping_ids ?? []).includes(t.id)) throw new Error(`"${t.name}" no es un topping válido para "${item.product.name}".`);
      toppingsTotal += Number(dbTopping.price_extra);
    }

    const originalUnitPrice = sizePrice + toppingsTotal;
    const promo = findActivePromotion(promotions, { id: dbProduct.id, category: dbProduct.category }, sizeId, branchId);
    const unitPrice = applyPromoDiscount(originalUnitPrice, promo);
    const lineTotal = unitPrice * item.quantity;

    subtotal += lineTotal;
    subtotalBeforeDiscount += originalUnitPrice * item.quantity;

    recomputedItems.push({
      ...item,
      unitPrice,
      originalUnitPrice,
      lineTotal,
      appliedPromotionId: promo?.id,
    });
  }

  return {
    items: recomputedItems,
    subtotal: round2(subtotal),
    subtotalBeforeDiscount: round2(subtotalBeforeDiscount),
    categoryOf: (productId: string) => productMap.get(productId)?.category ?? '',
  };
}

interface CouponForDiscount {
  discountType: string;
  discountValue: number;
  appliesTo: string;
}

/** Misma fórmula que `discountAmount` en src/store/couponStore.ts, pero usando la
 *  categoría REAL del producto (`categoryOf`, de la base) en vez de la que venga en
 *  el ítem del cliente — evita que alguien declare una categoría falsa para colar un
 *  producto en un cupón que no le corresponde. */
export function computeCouponDiscount(
  coupon: CouponForDiscount | null,
  items: CartItem[],
  categoryOf: (productId: string) => string,
): number {
  if (!coupon) return 0;

  const eligibleItems = items.filter((item) => {
    if (coupon.appliesTo === 'ALL') return true;
    if (coupon.appliesTo.startsWith('PRODUCT:')) return coupon.appliesTo === `PRODUCT:${item.product.id}`;
    if (coupon.appliesTo.startsWith('SIZE:')) return coupon.appliesTo === `SIZE:${item.product.id}:${item.modifiers.size?.id}`;
    return coupon.appliesTo === categoryOf(item.product.id);
  });

  if (eligibleItems.length === 0) return 0;

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.lineTotal, 0);

  if (coupon.discountType === 'FREE_ITEM') {
    const maxPriceItem = eligibleItems.reduce((max, item) => (item.unitPrice > max.unitPrice ? item : max), eligibleItems[0]);
    return round2(maxPriceItem.unitPrice);
  }
  if (coupon.discountType === 'PERCENTAGE') {
    return round2((eligibleSubtotal * coupon.discountValue) / 100);
  }
  // FIXED_AMOUNT
  return round2(Math.min(eligibleSubtotal, coupon.discountValue));
}

export function amountsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= AMOUNT_EPSILON;
}

/**
 * Valida y descuenta (dentro de la MISMA transacción que la venta) los insumos de
 * bodega entregados junto con esta venta, sin costo. Tira un Error (mensaje para el
 * cajero) si un insumo no existe, no pertenece a la sucursal, o no hay stock
 * suficiente. Devuelve el snapshot para guardar en sales.warehouse_deliveries.
 */
export async function applyWarehouseDeliveries(
  tx: TxQuery,
  deliveries: WarehouseDelivery[] | undefined,
  branchId: string,
  saleId: string,
  user: { id: string; name: string },
): Promise<WarehouseDelivery[]> {
  if (!deliveries || deliveries.length === 0) return [];

  const snapshot: WarehouseDelivery[] = [];
  for (const delivery of deliveries) {
    if (!delivery.itemId || !Number.isInteger(delivery.quantity) || delivery.quantity <= 0) {
      throw new Error('Cantidad inválida en una entrega de bodega.');
    }

    const rows = await tx<{ name: string; stock_by_branch: Record<string, number>; branch_ids: string[] }>(
      'select name, stock_by_branch, branch_ids from warehouse_items where id = $1 for update',
      [delivery.itemId],
    );
    const item = rows[0];
    if (!item) throw new Error(`Insumo de bodega no encontrado: ${delivery.itemName ?? delivery.itemId}.`);
    if (!item.branch_ids.includes(branchId)) {
      throw new Error(`"${item.name}" no está disponible en esta sucursal.`);
    }
    const current = Number(item.stock_by_branch[branchId] ?? 0);
    const next = current - delivery.quantity;
    if (next < 0) {
      throw new Error(`No hay suficiente stock de "${item.name}" en bodega (quedan ${current}).`);
    }

    await tx(
      `update warehouse_items set stock_by_branch = jsonb_set(stock_by_branch, $2, to_jsonb($3::int), true), updated_at = now() where id = $1`,
      [delivery.itemId, `{${branchId}}`, next],
    );
    const movementId = `whm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await tx(
      `insert into warehouse_movements (id, item_id, item_name, branch_id, type, quantity, user_id, user_name, sale_id)
       values ($1, $2, $3, $4, 'salida', $5, $6, $7, $8)`,
      [movementId, delivery.itemId, item.name, branchId, delivery.quantity, user.id, user.name, saleId],
    );

    snapshot.push({ itemId: delivery.itemId, itemName: item.name, quantity: delivery.quantity });
  }
  return snapshot;
}
