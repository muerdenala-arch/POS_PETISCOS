import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { User } from '../src/types/index.js';

const SELECT_COLUMNS = `
  id, name, pin, role, color, status, protected,
  branch_ids as "branchIds", created_at as "createdAt"
`;

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const users = await query<User>(`select ${SELECT_COLUMNS} from staff order by created_at asc`);
    res.status(200).json(users);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<User>(req);
    try {
      const rows = await query<User>(
        `insert into staff (id, name, pin, role, color, branch_ids)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           name = excluded.name, pin = excluded.pin, role = excluded.role,
           color = excluded.color, branch_ids = excluded.branch_ids, updated_at = now()
         returning ${SELECT_COLUMNS}`,
        [body.id, body.name, body.pin, body.role, body.color, JSON.stringify(body.branchIds ?? [])],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (isUniquePinViolation(err)) {
        res.status(409).json({ error: 'Ese PIN ya está en uso por otro miembro del personal.' });
        return;
      }
      throw err;
    }
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<User>>(req);
    try {
      const user = await queryOne<User>(
        `update staff set
           name = coalesce($2, name),
           pin = coalesce($3, pin),
           role = coalesce($4, role),
           color = coalesce($5, color),
           status = coalesce($6, status),
           branch_ids = coalesce($7, branch_ids),
           updated_at = now()
         where id = $1
         returning ${SELECT_COLUMNS}`,
        [
          id,
          body.name ?? null,
          body.pin ?? null,
          body.role ?? null,
          body.color ?? null,
          body.status ?? null,
          body.branchIds ? JSON.stringify(body.branchIds) : null,
        ],
      );
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' });
        return;
      }
      res.status(200).json(user);
    } catch (err) {
      if (isUniquePinViolation(err)) {
        res.status(409).json({ error: 'Ese PIN ya está en uso por otro miembro del personal.' });
        return;
      }
      throw err;
    }
    return;
  }

  if (req.method === 'DELETE' && id) {
    // El administrador principal (protected = true) nunca se puede eliminar, ni aunque
    // el pedido venga con su id — esta regla se aplica también acá, no solo en la UI.
    await query('delete from staff where id = $1 and protected = false', [id]);
    res.status(204).end();
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'PATCH', 'DELETE']);
}

function isUniquePinViolation(err: unknown): boolean {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505';
}

export default withErrorHandling(handler);
