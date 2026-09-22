import type { VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { requireAuth, type AuthedRequest } from './_lib/auth.js';
import type { Product } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, name, category, description, base_price as "basePrice", gradient, emoji, image_url as "imageUrl", sizes,
  topping_ids as "toppingIds", branch_ids as "branchIds", active, stock_by_branch as "stockByBranch",
  low_stock_threshold as "lowStockThreshold", unit
`;

async function handler(req: AuthedRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const products = await query<Product>(`select ${SELECT_COLUMNS} from products order by name asc`);
    res.status(200).json(products);
    return;
  }

  // Crear, editar o eliminar productos es exclusivo de un administrador.
  if (req.method !== 'GET' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Solo un administrador puede gestionar el catálogo.' });
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<Product>(req);
    const rows = await query<Product>(
      `insert into products (
         id, name, category, description, base_price, gradient, emoji, image_url, sizes,
         topping_ids, branch_ids, active, stock_by_branch,
         low_stock_threshold, unit
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       on conflict (id) do update set
         name = excluded.name, category = excluded.category, description = excluded.description,
         base_price = excluded.base_price, gradient = excluded.gradient, emoji = excluded.emoji, image_url = excluded.image_url,
         sizes = excluded.sizes, topping_ids = excluded.topping_ids, branch_ids = excluded.branch_ids,
         active = excluded.active, stock_by_branch = excluded.stock_by_branch,
         low_stock_threshold = excluded.low_stock_threshold, unit = excluded.unit, updated_at = now()
       returning ${SELECT_COLUMNS}`,
      [
        body.id,
        body.name,
        body.category,
        body.description ?? '',
        body.basePrice ?? 0,
        body.gradient ?? '',
        body.emoji ?? '',
        body.imageUrl ?? '',
        JSON.stringify(body.sizes ?? []),
        JSON.stringify(body.toppingIds ?? []),
        JSON.stringify(body.branchIds ?? []),
        body.active ?? true,
        JSON.stringify(body.stockByBranch ?? {}),
        body.lowStockThreshold ?? 0,
        body.unit ?? 'unidades',
      ],
    );
    res.status(201).json(rows[0]);
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Product>>(req);
    const product = await queryOne<Product>(
      `update products set
         name = coalesce($2, name),
         category = coalesce($3, category),
         description = coalesce($4, description),
         base_price = coalesce($5, base_price),
         gradient = coalesce($6, gradient),
         emoji = coalesce($7, emoji),
         image_url = coalesce($8, image_url),
         sizes = coalesce($9, sizes),
         topping_ids = coalesce($10, topping_ids),
         branch_ids = coalesce($11, branch_ids),
         active = coalesce($12, active),
         stock_by_branch = coalesce($13, stock_by_branch),
         low_stock_threshold = coalesce($14, low_stock_threshold),
         unit = coalesce($15, unit),
         updated_at = now()
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [
        id,
        body.name ?? null,
        body.category ?? null,
        body.description ?? null,
        body.basePrice ?? null,
        body.gradient ?? null,
        body.emoji ?? null,
        body.imageUrl ?? null,
        body.sizes ? JSON.stringify(body.sizes) : null,
        body.toppingIds ? JSON.stringify(body.toppingIds) : null,
        body.branchIds ? JSON.stringify(body.branchIds) : null,
        body.active ?? null,
        body.stockByBranch ? JSON.stringify(body.stockByBranch) : null,
        body.lowStockThreshold ?? null,
        body.unit ?? null,
      ],
    );
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.status(200).json(product);
    return;
  }

  if (req.method === 'DELETE' && id) {
    await query('delete from products where id = $1', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(requireAuth(handler));
