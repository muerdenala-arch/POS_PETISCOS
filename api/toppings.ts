import type { VercelResponse } from '@vercel/node';
import { queryOne, query, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { requireAuth, type AuthedRequest } from './_lib/auth.js';
import type { Topping, WarehouseItem, WarehouseMovement } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, name, price_extra as "priceExtra", branch_ids as "branchIds", stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold"
`;

const WAREHOUSE_ITEM_COLUMNS = `
  id, name, unit, stock_by_branch as "stockByBranch", low_stock_threshold as "lowStockThreshold",
  branch_ids as "branchIds", created_at as "createdAt"
`;

const WAREHOUSE_MOVEMENT_COLUMNS = `
  id, item_id as "itemId", item_name as "itemName", branch_id as "branchId", type,
  quantity, user_id as "userId", user_name as "userName", note,
  sale_id as "saleId", created_at as "createdAt"
`;

/** Bodega vive en este mismo archivo (no en uno propio) por el límite de 12
 *  funciones serverless de Vercel — ver el comentario en branches.ts. */
async function handleWarehouse(req: AuthedRequest, res: VercelResponse): Promise<boolean> {
  const resource = req.query.resource;
  if (resource !== 'warehouse-items' && resource !== 'warehouse-movements') return false;

  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (resource === 'warehouse-items') {
    // Cualquier rol logueado puede LEER la lista (el cajero la necesita para elegir
    // qué entregar), pero crear/editar/borrar insumos es exclusivo de un administrador.
    if (req.method === 'GET' && !id) {
      const items = await query<WarehouseItem>(`select ${WAREHOUSE_ITEM_COLUMNS} from warehouse_items order by name asc`);
      res.status(200).json(items);
      return true;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Solo un administrador puede gestionar la bodega.' });
      return true;
    }

    if (req.method === 'POST' && !id) {
      const body = requireBody<WarehouseItem>(req);
      const rows = await query<WarehouseItem>(
        `insert into warehouse_items (id, name, unit, branch_ids, stock_by_branch, low_stock_threshold)
         values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
         on conflict (id) do update set
           name = excluded.name, unit = excluded.unit, branch_ids = excluded.branch_ids,
           stock_by_branch = excluded.stock_by_branch, low_stock_threshold = excluded.low_stock_threshold,
           updated_at = now()
         returning ${WAREHOUSE_ITEM_COLUMNS}`,
        [
          body.id,
          body.name,
          body.unit ?? 'unidades',
          JSON.stringify(body.branchIds ?? []),
          JSON.stringify(body.stockByBranch ?? {}),
          body.lowStockThreshold ?? 0,
        ],
      );
      res.status(201).json(rows[0]);
      return true;
    }

    if (req.method === 'PATCH' && id) {
      const body = requireBody<Partial<WarehouseItem>>(req);
      const item = await queryOne<WarehouseItem>(
        `update warehouse_items set
           name = coalesce($2, name),
           unit = coalesce($3, unit),
           branch_ids = coalesce($4::jsonb, branch_ids),
           low_stock_threshold = coalesce($5, low_stock_threshold),
           updated_at = now()
         where id = $1
         returning ${WAREHOUSE_ITEM_COLUMNS}`,
        [id, body.name ?? null, body.unit ?? null, body.branchIds ? JSON.stringify(body.branchIds) : null, body.lowStockThreshold ?? null],
      );
      if (!item) {
        res.status(404).json({ error: 'Insumo de bodega no encontrado' });
        return true;
      }
      res.status(200).json(item);
      return true;
    }

    if (req.method === 'DELETE' && id) {
      await query('delete from warehouse_items where id = $1', [id]);
      res.status(204).end();
      return true;
    }

    methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
    return true;
  }

  // resource === 'warehouse-movements' — historial, exclusivo de administrador.
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Solo un administrador puede ver el historial de bodega.' });
    return true;
  }

  if (req.method === 'GET') {
    const itemId = typeof req.query.itemId === 'string' ? req.query.itemId : undefined;
    const movements = itemId
      ? await query<WarehouseMovement>(
          `select ${WAREHOUSE_MOVEMENT_COLUMNS} from warehouse_movements
           where item_id = $1 order by created_at desc limit 200`,
          [itemId],
        )
      : await query<WarehouseMovement>(
          `select ${WAREHOUSE_MOVEMENT_COLUMNS} from warehouse_movements
           order by created_at desc limit 200`,
        );
    res.status(200).json(movements);
    return true;
  }

  // Ajuste manual de stock (entrada o salida) hecho por el administrador — la
  // entrega del cajero durante una venta se registra aparte, en api/sales.ts,
  // dentro de la misma transacción que la venta.
  if (req.method === 'POST') {
    const body = requireBody<{ itemId: string; branchId: string; type: 'entrada' | 'salida'; quantity: number; note?: string }>(req);
    if (!body.itemId || !body.branchId || !body.type || !Number.isInteger(body.quantity) || body.quantity <= 0) {
      res.status(400).json({ error: 'Faltan datos válidos para el movimiento (insumo, sucursal, tipo y cantidad).' });
      return true;
    }
    try {
      const result = await withTransaction(async (tx) => {
        const items = await tx<{ name: string; stock_by_branch: Record<string, number> }>(
          'select name, stock_by_branch from warehouse_items where id = $1 for update',
          [body.itemId],
        );
        const item = items[0];
        if (!item) throw new Error('Insumo de bodega no encontrado.');
        const current = Number(item.stock_by_branch[body.branchId] ?? 0);
        const delta = body.type === 'entrada' ? body.quantity : -body.quantity;
        const next = current + delta;
        if (next < 0) {
          throw new Error(`No hay suficiente stock: quedan ${current}, se intentó descontar ${body.quantity}.`);
        }
        await tx(
          `update warehouse_items set stock_by_branch = jsonb_set(stock_by_branch, $2, to_jsonb($3::int), true), updated_at = now() where id = $1`,
          [body.itemId, `{${body.branchId}}`, next],
        );
        const movementId = `whm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        await tx(
          `insert into warehouse_movements (id, item_id, item_name, branch_id, type, quantity, user_id, user_name, note)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [movementId, body.itemId, item.name, body.branchId, body.type, body.quantity, req.user.id, req.user.name, body.note ?? null],
        );
        return { movementId };
      });
      res.status(201).json({ ok: true, id: result.movementId });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'No se pudo registrar el movimiento.' });
    }
    return true;
  }

  methodNotAllowed(res, ['GET', 'POST']);
  return true;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (await handleWarehouse(req, res)) return;

  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  // ── GET /api/toppings ───────────────────────────────────────────────────────
  if (req.method === 'GET' && !id) {
    const toppings = await query<Topping>(`select ${SELECT_COLUMNS} from toppings order by name asc`);
    res.status(200).json(toppings);
    return;
  }

  // Crear, editar o eliminar toppings es exclusivo de un administrador.
  if (req.method !== 'GET' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Solo un administrador puede gestionar toppings.' });
    return;
  }

  // ── POST /api/toppings — crear nuevo topping ────────────────────────────────
  if (req.method === 'POST' && !id) {
    const body = requireBody<Topping>(req);
    const rows = await query<Topping>(
      `insert into toppings (id, name, price_extra, branch_ids, stock_by_branch, low_stock_threshold)
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       on conflict (id) do update set
         name = excluded.name,
         price_extra = excluded.price_extra,
         branch_ids = excluded.branch_ids,
         stock_by_branch = excluded.stock_by_branch,
         low_stock_threshold = excluded.low_stock_threshold
       returning ${SELECT_COLUMNS}`,
      [
        body.id,
        body.name,
        body.priceExtra ?? 0,
        JSON.stringify(body.branchIds ?? []),
        JSON.stringify(body.stockByBranch ?? {}),
        body.lowStockThreshold ?? 0,
      ],
    );
    res.status(201).json(rows[0]);
    return;
  }

  // ── PATCH /api/toppings?id=xxx — actualizar topping ─────────────────────────
  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Topping>>(req);
    const topping = await queryOne<Topping>(
      `update toppings set
         name = coalesce($2, name),
         price_extra = coalesce($3, price_extra),
         branch_ids = coalesce($4::jsonb, branch_ids),
         stock_by_branch = coalesce($5::jsonb, stock_by_branch),
         low_stock_threshold = coalesce($6, low_stock_threshold),
         updated_at = now()
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [
        id,
        body.name ?? null,
        body.priceExtra ?? null,
        body.branchIds ? JSON.stringify(body.branchIds) : null,
        body.stockByBranch ? JSON.stringify(body.stockByBranch) : null,
        body.lowStockThreshold ?? null,
      ],
    );
    if (!topping) {
      res.status(404).json({ error: 'Topping no encontrado' });
      return;
    }
    res.status(200).json(topping);
    return;
  }

  if (req.method === 'DELETE' && id) {
    await withTransaction(async (tx) => {
      await tx(`update products set topping_ids = topping_ids - $1`, [id]);
      await tx(`delete from toppings where id = $1`, [id]);
    });
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(requireAuth(handler));
