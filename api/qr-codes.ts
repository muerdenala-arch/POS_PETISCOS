import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { QrCode } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, alias, bank_or_holder as "bankOrHolder", image_url as "image", active,
  branch_id as "branchId", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const qrCodes = await query<QrCode>(`select ${SELECT_COLUMNS} from qr_codes order by created_at desc`);
    res.status(200).json(qrCodes);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<QrCode>(req);
    // El primer QR que se sube a una sucursal queda activo automáticamente ahí — se
    // decide acá mismo en la base para que sea correcto sin importar desde qué
    // dispositivo se suba.
    const [{ count }] = await query<{ count: string }>(
      'select count(*)::text as count from qr_codes where branch_id = $1 and active = true',
      [body.branchId],
    );
    const active = Number(count) === 0;

    const rows = await query<QrCode>(
      `insert into qr_codes (id, alias, bank_or_holder, image_url, active, branch_id)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (id) do update set
         alias = excluded.alias, bank_or_holder = excluded.bank_or_holder,
         image_url = excluded.image_url, branch_id = excluded.branch_id
       returning ${SELECT_COLUMNS}`,
      [body.id, body.alias, body.bankOrHolder ?? '', body.image, active, body.branchId],
    );
    res.status(201).json(rows[0]);
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<QrCode> & { setActive?: boolean }>(req);

    if (body.setActive) {
      // Solo un QR activo a la vez por sucursal: apaga todos los de esa sucursal y
      // prende únicamente este, en una sola transacción para no dejar un estado a medias.
      const qr = await withTransaction(async (tx) => {
        const current = await tx<QrCode>('select branch_id as "branchId" from qr_codes where id = $1', [id]);
        if (!current[0]) return null;
        await tx('update qr_codes set active = false where branch_id = $1', [current[0].branchId]);
        const updated = await tx<QrCode>(
          `update qr_codes set active = true where id = $1 returning ${SELECT_COLUMNS}`,
          [id],
        );
        return updated[0] ?? null;
      });
      if (!qr) {
        res.status(404).json({ error: 'QR no encontrado' });
        return;
      }
      res.status(200).json(qr);
      return;
    }

    const qr = await queryOne<QrCode>(
      `update qr_codes set
         alias = coalesce($2, alias),
         bank_or_holder = coalesce($3, bank_or_holder),
         image_url = coalesce($4, image_url),
         branch_id = coalesce($5, branch_id)
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [id, body.alias ?? null, body.bankOrHolder ?? null, body.image ?? null, body.branchId ?? null],
    );
    if (!qr) {
      res.status(404).json({ error: 'QR no encontrado' });
      return;
    }
    res.status(200).json(qr);
    return;
  }

  if (req.method === 'DELETE' && id) {
    await query('delete from qr_codes where id = $1', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(handler);
