import type { VercelResponse } from '@vercel/node';
import { query, queryOne, withTransaction } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { requireAuth, type AuthedRequest } from './_lib/auth.js';
import type { AppSettings, Branch } from '../src/types/index.js';

// Un solo archivo maneja la colección (/api/branches) y un ítem puntual
// (/api/branches?id=xxx) — el plan Hobby de Vercel limita a 12 funciones
// serverless por deployment, así que se fusiona index+[id] de cada recurso
// en vez de un archivo por ruta. También se aprovecha para la configuración
// general (/api/branches?resource=settings), que no amerita su propio archivo.
const SELECT_COLUMNS = 'id, name, address, phone, active';

async function handleSettings(req: AuthedRequest, res: VercelResponse): Promise<boolean> {
  if (req.query.resource !== 'settings') return false;

  if (req.method === 'GET') {
    const settings = await queryOne<AppSettings>(
      `select require_qr_receipt as "requireQrReceipt" from app_settings where id = 'global'`,
    );
    res.status(200).json(settings ?? { requireQrReceipt: true });
    return true;
  }

  if (req.method === 'PATCH') {
    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Solo un administrador puede cambiar la configuración.' });
      return true;
    }
    const body = requireBody<Partial<AppSettings>>(req);
    const settings = await queryOne<AppSettings>(
      `update app_settings set
         require_qr_receipt = coalesce($1, require_qr_receipt),
         updated_at = now()
       where id = 'global'
       returning require_qr_receipt as "requireQrReceipt"`,
      [body.requireQrReceipt ?? null],
    );
    res.status(200).json(settings);
    return true;
  }

  methodNotAllowed(res, ['GET', 'PATCH']);
  return true;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  if (await handleSettings(req, res)) return;

  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const branches = await query<Branch>(`select ${SELECT_COLUMNS} from branches order by name asc`);
    res.status(200).json(branches);
    return;
  }

  // Crear, editar o eliminar sucursales es exclusivo de un administrador.
  if (req.method !== 'GET' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Solo un administrador puede gestionar sucursales.' });
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<Branch>(req);
    const rows = await query<Branch>(
      `insert into branches (id, name, address, phone, active)
       values ($1, $2, $3, $4, true)
       on conflict (id) do update set name = excluded.name, address = excluded.address, phone = excluded.phone
       returning ${SELECT_COLUMNS}`,
      [body.id, body.name, body.address ?? '', body.phone ?? ''],
    );
    res.status(201).json(rows[0]);
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<Branch>>(req);
    const branch = await queryOne<Branch>(
      `update branches set
         name = coalesce($2, name),
         address = coalesce($3, address),
         phone = coalesce($4, phone),
         active = coalesce($5, active),
         updated_at = now()
       where id = $1
       returning ${SELECT_COLUMNS}`,
      [id, body.name ?? null, body.address ?? null, body.phone ?? null, body.active ?? null],
    );
    if (!branch) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }
    res.status(200).json(branch);
    return;
  }

  if (req.method === 'DELETE' && id) {
    await withTransaction(async (tx) => {
      // 1. Delete historical financial records (User explicitly requested hard delete)
      await tx('DELETE FROM sales WHERE branch_id = $1', [id]);
      await tx('DELETE FROM register_sessions WHERE branch_id = $1', [id]);

      // 2. Delete QR codes linked to the branch
      await tx('DELETE FROM qr_codes WHERE branch_id = $1', [id]);

      // 3. Remove branch from products and delete if it was the only branch
      await tx(`
        UPDATE products
        SET branch_ids = branch_ids - $1,
            stock_by_branch = stock_by_branch - $1
      `, [id]);
      await tx(`DELETE FROM products WHERE jsonb_array_length(branch_ids) = 0`);

      // 4. Remove branch from toppings and delete if it was the only branch
      await tx(`
        UPDATE toppings
        SET branch_ids = branch_ids - $1,
            stock_by_branch = stock_by_branch - $1
      `, [id]);
      await tx(`DELETE FROM toppings WHERE jsonb_array_length(branch_ids) = 0`);

      // 4.5. Remove branch from warehouse items and delete if it was the only branch
      // (warehouse_movements de esta sucursal se borran solos: ON DELETE CASCADE)
      await tx(`
        UPDATE warehouse_items
        SET branch_ids = branch_ids - $1,
            stock_by_branch = stock_by_branch - $1
      `, [id]);
      await tx(`DELETE FROM warehouse_items WHERE jsonb_array_length(branch_ids) = 0`);

      // 5. Remove branch from staff
      await tx(`
        UPDATE staff
        SET branch_ids = branch_ids - $1
      `, [id]);

      // 6. Finally, delete the branch itself
      await tx('DELETE FROM branches WHERE id = $1', [id]);
    });

    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

export default withErrorHandling(requireAuth(handler));
