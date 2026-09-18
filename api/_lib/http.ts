import type { VercelRequest, VercelResponse } from '@vercel/node';

export type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

/** Atrapa cualquier error no manejado del handler y responde 500 con un mensaje legible,
 *  en vez de dejar que Vercel devuelva un 500 genérico sin cuerpo. */
export function withErrorHandling(handler: Handler): Handler {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error interno del servidor';
      res.status(500).json({ error: message });
    }
  };
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]) {
  res.setHeader('Allow', allowed.join(', '));
  res.status(405).json({ error: 'Método no permitido' });
}

/** Vercel ya parsea el body como JSON cuando Content-Type es application/json; esto solo
 *  centraliza el cast + un mensaje de error claro si llega vacío en un POST/PATCH. */
export function requireBody<T = Record<string, unknown>>(req: VercelRequest): T {
  if (!req.body || typeof req.body !== 'object') {
    throw new Error('Falta el cuerpo de la solicitud (JSON).');
  }
  return req.body as T;
}
