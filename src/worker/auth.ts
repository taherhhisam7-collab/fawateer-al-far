import { Context, Next } from 'hono';
import { verify, sign } from 'hono/jwt';
import { D1Database } from '@cloudflare/workers-types';
import bcrypt from 'bcryptjs';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  PUBLIC_URL: string;
  ASSETS: Fetcher;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'accountant' | 'cashier';
  branch_id: number | null;
  branch_name: string | null;
  active: boolean;
}

export interface JWTPayload {
  id: number;
  email: string;
  role: string;
  branch_id: number | null;
  exp: number;
  iat: number;
}

export const isAccountant = (role: string): boolean => role === 'accountant';

export const authMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ message: 'يرجى تسجيل الدخول' }, 401);
  }

  let payload: JWTPayload;
  try {
    payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JWTPayload;
  } catch {
    return c.json({ message: 'انتهت الجلسة، يرجى تسجيل الدخول مجدداً' }, 401);
  }

  const user = await getUserById(c.env.DB, payload.id);
  if (!user || !user.active) {
    return c.json({ message: 'حساب غير صالح' }, 401);
  }
  c.set('user', user);
  await next();
};

export const financeMiddleware = async (c: Context<{ Bindings: Env }>, next: Next) => {
  const user = c.get('user') as User;
  if (!isAccountant(user.role)) {
    return c.json({ message: 'هذا الإجراء للمحاسب فقط' }, 403);
  }
  await next();
};

export const getUserById = async (db: D1Database, id: number): Promise<User | null> => {
  const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<{
    id: number;
    email: string;
    full_name: string;
    password_hash: string;
    role: string;
    branch_id: number | null;
    active: number;
  }>();

  if (!user) return null;

  let branch_name: string | null = null;
  if (user.branch_id) {
    const branch = await db.prepare('SELECT name FROM branches WHERE id = ?').bind(user.branch_id).first<{ name: string }>();
    branch_name = branch?.name || null;
  }

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role === 'finance' ? 'accountant' : user.role,
    branch_id: user.branch_id,
    branch_name,
    active: !!user.active,
  };
};

export const withBranch = (user: User): User => user;

export const createToken = async (user: User, secret: string): Promise<string> => {
  return sign({
    id: user.id,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }, secret);
};

// Password hashing using Web Crypto API (PBKDF2) - compatible with Cloudflare Workers
export const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const saltArray = Array.from(salt);
  return 'pbkdf2$100000$' + saltArray.map(b => b.toString(16).padStart(2, '0')).join('') + '$' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  if (!hash.startsWith('pbkdf2$')) {
    try { return await bcrypt.compare(password, hash); } catch { return false; }
  }

  const parts = hash.split('$');
  if (parts.length !== 4) return false;

  const iterations = parseInt(parts[1], 10);
  const saltHex = parts[2];
  const expectedHashHex = parts[3];

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const computedHashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return computedHashHex === expectedHashHex;
};
