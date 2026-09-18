import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Promotion } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, name, discount_type as "discountType", discount_value as "discountValue",
  applies_to as "appliesTo", branch_ids as "branchIds", is_active as "isActive",
  created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const { active } = req.query;
    const where = active === 'true' ? 'WHERE is_active = true' : '';
    const promotions = await query<Promotion>(
      `SELECT ${SELECT_COLUMNS} FROM promotions ${where} ORDER BY created_at DESC`
    );
    res.status(200).json(promotions);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<Promotion>(req);
    const rows = await query<Promotion>(
      `INSERT INTO promotions (id, name, discount_type, discount_value, applies_to, branch_ids, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${SELECT_COLUMNS}`,
      [
        body.id,
        body.name,
        body.discountType,
        body.discountValue,
        body.appliesTo ?? 'ALL',
        JSON.stringify(body.branchIds ?? []),
        body.isActive ?? true,
      ]
    );
    res.status(201).json(rows[0]);
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Promotion>>(req);
    const promotion = await queryOne<Promotion>(
      `UPDATE promotions SET
         name = COALESCE($2, name),
         discount_type = COALESCE($3, discount_type),
         discount_value = COALESCE($4, discount_value),
         applies_to = COALESCE($5, applies_to),
         branch_ids = COALESCE($6, branch_ids),
         is_active = COALESCE($7, is_active),
         updated_at = NOW()
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        body.name ?? null,
        body.discountType ?? null,
        body.discountValue ?? null,
        body.appliesTo ?? null,
        body.branchIds ? JSON.stringify(body.branchIds) : null,
        body.isActive ?? null,
      ]
    );
    if (!promotion) {
      res.status(404).json({ error: 'Promoción no encontrada' });
      return;
    }
    res.status(200).json(promotion);
    return;
  }

  if (req.method === 'DELETE' && id) {
    await query('DELETE FROM promotions WHERE id = $1', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(handler);
