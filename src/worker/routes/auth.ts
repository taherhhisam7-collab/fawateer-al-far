import { Hono } from 'hono';
import { z } from 'zod';
import { D1Database } from '@cloudflare/workers-types';
import { sign } from 'hono/jwt';
import { authMiddleware, getUserById, hashPassword, verifyPassword } from '../auth.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  current: z.string().min(1),
  next: z.string().min(6),
});

export const authRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

authRoutes.post('/auth/login', async (c) => {
  const body = await c.req.json();
  const parse = loginSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'أدخل البريد الإلكتروني وكلمة المرور' }, 400);
  }

  const { email, password } = parse.data;

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE')
    .bind(email.trim())
    .first<{
      id: number;
      email: string;
      full_name: string;
      password_hash: string;
      role: string;
      branch_id: number | null;
      active: number;
    }>();

  if (!user) {
    return c.json({ message: 'هذا البريد غير مسجّل في النظام — تواصل مع المحاسب' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ message: 'كلمة المرور غير صحيحة — تأكد من الحروف والأرقام' }, 401);
  }

  if (!user.active) {
    return c.json({ message: 'تم تعطيل هذا الحساب — تواصل مع المحاسب' }, 403);
  }

  const token = await sign(
    { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 },
    c.env.JWT_SECRET
  );

  let branch_name: string | null = null;
  if (user.branch_id) {
    const branch = await c.env.DB.prepare('SELECT name FROM branches WHERE id = ?').bind(user.branch_id).first<{ name: string }>();
    branch_name = branch?.name || null;
  }

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role === 'finance' ? 'accountant' : user.role,
      branch_id: user.branch_id,
      branch_name,
      active: !!user.active,
    },
  });
});

authRoutes.get('/auth/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ user });
});

authRoutes.post('/auth/change-password', authMiddleware, async (c) => {
  const body = await c.req.json();
  const parse = changePasswordSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'كلمة المرور الحالية غير صحيحة' }, 400);
  }

  const user = c.get('user') as { id: number };
  const dbUser = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first<{ password_hash: string }>();

  if (!dbUser || !(await verifyPassword(parse.data.current, dbUser.password_hash))) {
    return c.json({ message: 'كلمة المرور الحالية غير صحيحة' }, 400);
  }

  const newHash = await hashPassword(parse.data.next);
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run();

  return c.json({ message: 'تم تغيير كلمة المرور' });
});
