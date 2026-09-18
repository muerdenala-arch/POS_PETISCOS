import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query, queryOne } from './_lib/db.js';
import { methodNotAllowed, requireBody, withErrorHandling } from './_lib/http.js';
import type { Category } from '../src/types/index.js';

const SELECT_COLUMNS = 'id, name, active';

async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;

  if (req.method === 'GET' && !id) {
    const categories = await query<Category>(`select ${SELECT_COLUMNS} from categories order by name asc`);
    res.status(200).json(categories);
    return;
  }

  if (req.method === 'POST' && !id) {
    const body = requireBody<Partial<Category>>(req);
    if (!body.name) {
      res.status(400).json({ error: 'El nombre es obligatorio' });
      return;
    }
    const newId = body.id || 'cat_' + Date.now().toString(36);
    
    try {
      const rows = await query<Category>(
        `insert into categories (id, name, active)
         values ($1, $2, $3)
         returning ${SELECT_COLUMNS}`,
        [newId, body.name, body.active ?? true],
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      const dbError = err as { code?: string };
      if (dbError.code === '23505') { // unique violation
        res.status(409).json({ error: 'La categoría ya existe' });
      } else {
        throw err;
      }
    }
    return;
  }

  if (req.method === 'DELETE' && id) {
    try {
      const cat = await queryOne<Category>('select name from categories where id = $1', [id]);
      if (cat) {
        await query('delete from products where category = $1', [cat.name]);
      }
      await query('delete from categories where id = $1', [id]);
      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: 'Error deleting category', details: err });
    }
    return;
  }

  methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
}

export default withErrorHandling(handler);
