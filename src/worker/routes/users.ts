import { Hono } from 'hono';
import { z } from 'zod';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, financeMiddleware, getUserById, hashPassword } from '../auth.js';

const userCreateSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  password: z.string().min(6),
  role: z.enum(['accountant', 'cashier']),
  branch_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive(),
  ),
});

const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  full_name: z.string().min(1).optional(),
  role: z.enum(['accountant', 'cashier']).optional(),
  branch_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  active: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

export const userRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

userRoutes.get('/users', authMiddleware, financeMiddleware, async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT u.*, b.name AS branch_name FROM users u
    LEFT JOIN branches b ON b.id = u.branch_id ORDER BY u.id
  `).all();

  const users = rows.results.map((u: any) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role === 'finance' ? 'accountant' : u.role,
    branch_id: u.branch_id,
    branch_name: u.branch_name,
    active: !!u.active,
  }));

  return c.json(users);
});

userRoutes.post('/users', authMiddleware, financeMiddleware, async (c) => {
  const body = await c.req.json();
  const parse = userCreateSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'البريد والاسم وكلمة المرور مطلوبة' }, 400);
  }

  const { email, full_name, password, role, branch_id } = parse.data;

  if (!branch_id) {
    return c.json({ message: 'لازم تختار الفرع وتربط المستخدم به قبل الحفظ' }, 400);
  }

  const branch = await c.env.DB.prepare('SELECT id FROM branches WHERE id = ? AND active = 1').bind(branch_id).first();
  if (!branch) {
    return c.json({ message: 'الفرع غير موجود أو غير نشط' }, 400);
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await c.env.DB.prepare(`
      INSERT INTO users (email, full_name, password_hash, role, branch_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(email.trim(), full_name.trim(), passwordHash, role, branch_id).run();

    const user = await getUserById(c.env.DB, result.meta.last_row_id);
    return c.json(user, 201);
  } catch {
    return c.json({ message: 'البريد مستخدم مسبقاً' }, 400);
  }
});

userRoutes.put('/users/:id', authMiddleware, financeMiddleware, async (c) => {
  const body = await c.req.json();
  const parse = userUpdateSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'بيانات غير صالحة' }, 400);
  }

  const id = c.req.param('id');
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

  if (!user) {
    return c.json({ message: 'المستخدم غير موجود' }, 404);
  }

  const { email, full_name, role, branch_id, active, password } = parse.data;

  if (branch_id !== undefined && !branch_id) {
    return c.json({ message: 'لازم تختار الفرع وتربط المستخدم به قبل الحفظ' }, 400);
  }

  if (branch_id !== undefined) {
    const branch = await c.env.DB.prepare('SELECT id FROM branches WHERE id = ?').bind(branch_id).first();
    if (!branch) {
      return c.json({ message: 'الفرع غير موجود' }, 400);
    }
  }

  try {
    await c.env.DB.prepare(`
      UPDATE users SET email = ?, full_name = ?, role = ?, branch_id = ?, active = ? WHERE id = ?
    `).bind(
      (email || user.email).trim(),
      (full_name || user.full_name).trim(),
      role || user.role,
      branch_id ?? user.branch_id,
      active === false ? 0 : 1,
      id
    ).run();

    if (password) {
      const passwordHash = await hashPassword(password);
      await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, id).run();
    }

    const updated = await getUserById(c.env.DB, Number(id));
    return c.json(updated);
  } catch {
    return c.json({ message: 'البريد مستخدم مسبقاً' }, 400);
  }
});

userRoutes.post('/users/:id/reset-password', authMiddleware, financeMiddleware, async (c) => {
  const body = await c.req.json();
  const parse = resetPasswordSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'كلمة المرور 6 أحرف على الأقل' }, 400);
  }

  const id = c.req.param('id');
  const user = await c.env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();

  if (!user) {
    return c.json({ message: 'المستخدم غير موجود' }, 404);
  }

  const passwordHash = await hashPassword(parse.data.password);
  await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(passwordHash, id).run();

  return c.json({ message: 'تم تغيير كلمة المرور' });
});

userRoutes.delete('/users/:id', authMiddleware, financeMiddleware, async (c) => {
  const id = c.req.param('id');
  const currentUser = c.get('user') as { id: number };

  if (Number(id) === currentUser.id) {
    return c.json({ message: 'لا يمكن حذف حسابك' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
  return c.json({ message: 'تم حذف المستخدم' });
});