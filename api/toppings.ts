import type { VercelRequest, VercelResponse } from '@vercel/node';
import { queryOne, query, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Topping } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, name, price_extra as "priceExtra", branch_ids as "branchIds", stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  // ── GET /api/toppings ───────────────────────────────────────────────────────
  if (req.method === 'GET' && !id) {
    const toppings = await query<Topping>(`select ${SELECT_COLUMNS} from toppings order by name asc`);
    res.status(200).json(toppings);
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
    try {
      await withTransaction(async (tx) => {
        await tx(`update products set topping_ids = topping_ids - $1`, [id]);
        await tx(`delete from toppings where id = $1`, [id]);
      });
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: 'Database error', details: err });
    }
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(handler);
