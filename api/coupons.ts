import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Coupon } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, code, discount_type as "discountType", discount_value as "discountValue",
  max_uses as "maxUses", used_count as "usedCount",
  expires_at as "expiresAt", is_active as "isActive",
  applies_to as "appliesTo", branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  const validateCode = typeof req.query.validate === 'string' ? req.query.validate : undefined;
  const branchIdQ = typeof req.query.branchId === 'string' ? req.query.branchId : null;

  // GET /api/coupons?validate=CODE&branchId=X — valida si un cupón es canjeado, sin quemarlo
  if (req.method === 'GET' && validateCode) {
    const coupon = await queryOne<Coupon>(
      `SELECT ${SELECT_COLUMNS} FROM coupons WHERE UPPER(code) = UPPER($1)`,
      [validateCode]
    );

    if (!coupon) {
      res.status(404).json({ error: 'Cupón no encontrado o inválido.' });
      return;
    }
    if (!coupon.isActive) {
      res.status(400).json({ error: 'Este cupón está desactivado.' });
      return;
    }
    if (coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ error: 'Este cupón ya fue usado al máximo de veces.' });
      return;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      res.status(400).json({ error: 'Este cupón está vencido.' });
      return;
    }
    if (coupon.branchId && branchIdQ && coupon.branchId !== branchIdQ) {
      res.status(400).json({ error: 'Este cupón no aplica a esta sucursal.' });
      return;
    }

    res.status(200).json(coupon);
    return;
  }

  // GET /api/coupons — lista para admin
  if (req.method === 'GET' && !id) {
    const coupons = await query<Coupon>(
      `SELECT ${SELECT_COLUMNS} FROM coupons ORDER BY created_at DESC`
    );
    res.status(200).json(coupons);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<Coupon>(req);
    try {
      const rows = await query<Coupon>(
        `INSERT INTO coupons (id, code, discount_type, discount_value, max_uses, expires_at, is_active, applies_to, branch_id)
         VALUES ($1, UPPER($2), $3, $4, $5, $6, $7, $8, $9)
         RETURNING ${SELECT_COLUMNS}`,
        [
          body.id,
          body.code,
          body.discountType,
          body.discountValue,
          body.maxUses ?? 1,
          body.expiresAt ?? null,
          body.isActive ?? true,
          body.appliesTo ?? 'ALL',
          body.branchId ?? null,
        ]
      );
      res.status(201).json(rows[0]);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
        res.status(409).json({ error: 'Ya existe un cupón con ese código.' });
        return;
      }
      throw err;
    }
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Coupon>>(req);
    const coupon = await queryOne<Coupon>(
      `UPDATE coupons SET
         discount_value = COALESCE($2, discount_value),
         max_uses = COALESCE($3, max_uses),
         expires_at = COALESCE($4, expires_at),
         is_active = COALESCE($5, is_active),
         applies_to = COALESCE($6, applies_to),
         branch_id = COALESCE($7, branch_id),
         updated_at = NOW()
       WHERE id = $1
       RETURNING ${SELECT_COLUMNS}`,
      [
        id,
        body.discountValue ?? null,
        body.maxUses ?? null,
        body.expiresAt ?? null,
        body.isActive ?? null,
        body.appliesTo ?? null,
        body.branchId ?? null,
      ]
    );
    if (!coupon) {
      res.status(404).json({ error: 'Cupón no encontrado' });
      return;
    }
    res.status(200).json(coupon);
    return;
  }

  if (req.method === 'DELETE' && id) {
    await query('DELETE FROM coupons WHERE id = $1', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(handler);
