import { Hono } from 'hono';
import { z } from 'zod';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, financeMiddleware } from '../auth.js';

const branchSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
  city: z.string().optional(),
  active: z.boolean().optional(),
});

export const branchRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

branchRoutes.get('/branches', authMiddleware, financeMiddleware, async (c) => {
  const branches = await c.env.DB.prepare('SELECT * FROM branches ORDER BY id').all();
  return c.json(branches.results);
});

branchRoutes.post('/branches', authMiddleware, financeMiddleware, async (c) => {
  const body = await c.req.json();
  const parse = branchSchema.safeParse(body);
  if (!parse.success || !parse.data.name?.trim()) {
    return c.json({ message: 'اسم الفرع مطلوب' }, 400);
  }

  const { name, code, city } = parse.data;

  try {
    const result = await c.env.DB.prepare('INSERT INTO branches (name, code, city) VALUES (?, ?, ?)')
      .bind(name.trim(), code?.trim() || null, city?.trim() || null)
      .run();
    const branch = await c.env.DB.prepare('SELECT * FROM branches WHERE id = ?').bind(result.meta.last_row_id).first();
    return c.json(branch, 201);
  } catch {
    return c.json({ message: 'اسم الفرع أو الرمز مستخدم مسبقاً' }, 400);
  }
});

branchRoutes.put('/branches/:id', authMiddleware, financeMiddleware, async (c) => {
  const body = await c.req.json();
  const parse = branchSchema.safeParse(body);
  if (!parse.success || !parse.data.name?.trim()) {
    return c.json({ message: 'اسم الفرع مطلوب' }, 400);
  }

  const { name, code, city, active } = parse.data;
  const id = c.req.param('id');

  try {
    await c.env.DB.prepare('UPDATE branches SET name = ?, code = ?, city = ?, active = ? WHERE id = ?')
      .bind(name.trim(), code?.trim() || null, city?.trim() || null, active === false ? 0 : 1, id)
      .run();
    const branch = await c.env.DB.prepare('SELECT * FROM branches WHERE id = ?').bind(id).first();
    return c.json(branch);
  } catch {
    return c.json({ message: 'اسم الفرع أو الرمز مستخدم مسبقاً' }, 400);
  }
});

branchRoutes.delete('/branches/:id', authMiddleware, financeMiddleware, async (c) => {
  const id = c.req.param('id');

  const users = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users WHERE branch_id = ?').bind(id).first<{ n: number }>();
  const invoices = await c.env.DB.prepare('SELECT COUNT(*) as n FROM invoices WHERE branch_id = ?').bind(id).first<{ n: number }>();

  if ((users?.n || 0) > 0 || (invoices?.n || 0) > 0) {
    return c.json({ message: `لا يمكن الحذف: الفرع مرتبط بـ ${users?.n || 0} مستخدم و ${invoices?.n || 0} فاتورة` }, 400);
  }

  await c.env.DB.prepare('DELETE FROM branches WHERE id = ?').bind(id).run();
  return c.json({ message: 'تم حذف الفرع' });
});