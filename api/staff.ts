import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { isUniqueViolation, methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import { clearSessionCookie, comparePin, hashPin, requireAuth, setSessionCookie, type AuthedRequest } from './_lib/auth.js';
import type { Role, User } from '../src/types/index.js';

// El PIN nunca se incluye acá: no vuelve a salir del servidor en ninguna respuesta,
// ni siquiera hasheado. Ver /api/staff?action=login para la única comparación de PIN.
const SELECT_COLUMNS = `
  id, name, role, color, status, protected,
  branch_ids as "branchIds", created_at as "createdAt"
`;

/** Rutas públicas (sin sesión): iniciar y cerrar sesión. Devuelve `true` si ya
 *  respondió la request, `false` para que el resto del handler (autenticado) siga. */
async function handlePublicActions(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const action = typeof req.query.action === 'string' ? req.query.action : undefined;

  if (req.method === 'POST' && action === 'login') {
    const body = requireBody<{ pin?: string }>(req);
    if (!body.pin) {
      res.status(400).json({ error: 'Falta el PIN.' });
      return true;
    }

    // La comparación de PIN se hace en el servidor, uno por uno contra su hash —
    // nunca se manda la lista de PINs (ni sus hashes) al navegador.
    const candidates = await query<{ id: string; pin: string }>(
      `select id, pin from staff where status = 'activo'`,
    );
    let matchedId: string | null = null;
    for (const candidate of candidates) {
      if (await comparePin(body.pin, candidate.pin)) {
        matchedId = candidate.id;
        break;
      }
    }

    if (!matchedId) {
      res.status(401).json({ error: 'PIN incorrecto. Intenta nuevamente.' });
      return true;
    }

    const user = await queryOne<User & { role: Role }>(
      `select ${SELECT_COLUMNS} from staff where id = $1`,
      [matchedId],
    );
    if (!user) {
      res.status(401).json({ error: 'PIN incorrecto. Intenta nuevamente.' });
      return true;
    }

    setSessionCookie(res, { id: user.id, name: user.name, role: user.role });
    res.status(200).json(user);
    return true;
  }

  if (req.method === 'POST' && action === 'logout') {
    clearSessionCookie(res);
    res.status(204).end();
    return true;
  }

  return false;
}

async function handler(req: AuthedRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const users = await query<User>(`select ${SELECT_COLUMNS} from staff order by created_at asc`);
    res.status(200).json(users);
    return;
  }

  // Crear, editar o eliminar personal son acciones exclusivas de un administrador.
  if (req.method !== 'GET' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Solo un administrador puede gestionar al personal.' });
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<User & { pin: string }>(req);
    if (!body.pin || body.pin.length !== 4) {
      res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos.' });
      return;
    }
    try {
      const pinHash = await hashPin(body.pin);
      const rows = await query<User>(
        `insert into staff (id, name, pin, role, color, branch_ids)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (id) do update set
           name = excluded.name, pin = excluded.pin, role = excluded.role,
           color = excluded.color, branch_ids = excluded.branch_ids, updated_at = now()
         returning ${SELECT_COLUMNS}`,
        [body.id, body.name, pinHash, body.role, body.color, JSON.stringify(body.branchIds ?? [])],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      if (isUniqueViolation(err)) {
        res.status(409).json({ error: 'Ese PIN ya está en uso por otro miembro del personal.' });
        return;
      }
      throw err;
    }
    return;
  }

  if (req.method === 'PATCH' && id) {
    const body = requireBody<Partial<User> & { pin?: string }>(req);
    if (body.pin && body.pin.length !== 4) {
      res.status(400).json({ error: 'El PIN debe tener exactamente 4 dígitos.' });
      return;
    }
    try {
      const pinHash = body.pin ? await hashPin(body.pin) : null;
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
          pinHash,
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
      if (isUniqueViolation(err)) {
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

export default withErrorHandling(async (req, res) => {
  if (await handlePublicActions(req, res)) return;
  await requireAuth(handler)(req, res);
});
