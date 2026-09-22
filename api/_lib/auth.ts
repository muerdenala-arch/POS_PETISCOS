import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Role } from '../../src/types/index.js';

const COOKIE_NAME = 'pos_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12h — dura lo que un turno largo.

export interface SessionUser {
  id: string;
  name: string;
  role: Role;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Falta la variable de entorno SESSION_SECRET');
  return secret;
}

/** Token propio "payload.firma" (HMAC-SHA256, base64url) — no usamos la librería
 *  `jsonwebtoken` porque solo necesitamos firmar {id, name, role, exp}, nada del resto
 *  del estándar JWT (headers, algoritmos alternativos, etc.). */
function sign(payload: SessionUser & { exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token: string): SessionUser | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionUser & { exp: number };
    if (typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000) return null;
    return { id: payload.id, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key) out[key] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

/** Lee y valida la cookie de sesión de la request. Devuelve `null` si no hay sesión,
 *  está corrupta, mal firmada o expirada. */
export function getSession(req: VercelRequest): SessionUser | null {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  return token ? verify(token) : null;
}

export function setSessionCookie(res: VercelResponse, user: SessionUser): void {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = sign({ ...user, exp });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure}`,
  );
}

export function clearSessionCookie(res: VercelResponse): void {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

/** Compara un PIN contra su hash. Si `hash` no parece un hash de bcrypt (por ejemplo,
 *  un PIN antiguo sin migrar), rechaza directamente en vez de dejar que bcrypt tire un
 *  error por formato inválido. */
export async function comparePin(pin: string, hash: string): Promise<boolean> {
  if (!hash.startsWith('$2')) return false;
  return bcrypt.compare(pin, hash);
}

export type AuthedRequest = VercelRequest & { user: SessionUser };
type AuthedHandler = (req: AuthedRequest, res: VercelResponse) => Promise<void> | void;

/** Exige una sesión válida antes de ejecutar el handler; agrega `req.user` con los
 *  datos de la sesión. No filtra por rol acá — cada endpoint decide, método por
 *  método, qué acciones requieren rol 'admin' (ver comentarios en cada archivo). */
export function requireAuth(handler: AuthedHandler) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const session = getSession(req);
    if (!session) {
      res.status(401).json({ error: 'No autenticado. Inicia sesión nuevamente.' });
      return;
    }
    await handler(Object.assign(req, { user: session }), res);
  };
}
