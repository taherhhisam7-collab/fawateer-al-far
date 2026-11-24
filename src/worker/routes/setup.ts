import { Hono } from 'hono';
import { z } from 'zod';
import { D1Database } from '@cloudflare/workers-types';
import { sign } from 'hono/jwt';
import { hashPassword } from '../auth.js';

const setupSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  branch_name: z.string().min(1),
});

export const setupRoutes = new Hono<{ Bindings: { DB: D1Database; JWT_SECRET: string } }>();

setupRoutes.get('/setup/status', async (c) => {
  const count = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>();
  return c.json({ needed: (count?.n || 0) === 0 });
});

setupRoutes.post('/setup', async (c) => {
  const body = await c.req.json();
  const parse = setupSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'الاسم والبريد وكلمة المرور واسم الفرع مطلوبة' }, 400);
  }

  const { full_name, email, password, branch_name } = parse.data;

  const existing = await c.env.DB.prepare('SELECT COUNT(*) as n FROM users').first<{ n: number }>();
  if ((existing?.n || 0) > 0) {
    return c.json({ message: 'تم إنشاء الحساب الأول مسبقاً' }, 403);
  }

  const passwordHash = await hashPassword(password);

  // Check if a branch already exists, or create one
  let branchId: number;
  const existingBranch = await c.env.DB.prepare('SELECT id FROM branches LIMIT 1').first<{ id: number }>();
  if (existingBranch) {
    branchId = existingBranch.id;
  } else {
  const result = await c.env.DB.prepare('INSERT INTO branches (name, code, city) VALUES (?, ?, ?)')
      .bind(branch_name.trim(), 'MAIN', 'المدينة المنورة')
      .run();
    branchId = result.meta.last_row_id;
  }

  const userResult = await c.env.DB.prepare(`
    INSERT INTO users (email, full_name, password_hash, role, branch_id)
    VALUES (?, ?, ?, 'accountant', ?)
  `).bind(email.trim(), full_name.trim(), passwordHash, branchId).run();

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userResult.meta.last_row_id).first<{
    id: number;
    email: string;
    full_name: string;
    role: string;
    branch_id: number;
  }>();

  const jwtToken = await sign(
    { id: user!.id, email: user!.email, role: user!.role, branch_id: user!.branch_id,
      exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 },
    c.env.JWT_SECRET
  );

  let branch_name_res = branch_name.trim();
  if (existingBranch) {
    const branch = await c.env.DB.prepare('SELECT name FROM branches WHERE id = ?').bind(branchId).first<{ name: string }>();
    branch_name_res = branch?.name || branch_name_res;
  }

  return c.json({
    token: jwtToken,
    user: {
      id: user!.id,
      email: user!.email,
      full_name: user!.full_name,
      role: user!.role,
      branch_id: user!.branch_id,
      branch_name: branch_name_res,
      active: true,
    },
  }, 201);
});
