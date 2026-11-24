import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, financeMiddleware } from '../auth.js';
import { supplierReport, cashNetworkReport, fieldReport, FIELDS } from '../reports.js';

export const reportRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

reportRoutes.get('/reports/suppliers', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const report = await supplierReport(c.env.DB, filters, user);
  return c.json(report);
});

reportRoutes.get('/reports/cash-network', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const report = await cashNetworkReport(c.env.DB, filters, user);
  return c.json(report);
});

reportRoutes.get('/reports/fields', authMiddleware, financeMiddleware, async (c) => {
  return c.json(FIELDS);
});

reportRoutes.get('/reports/field', authMiddleware, financeMiddleware, async (c) => {
  const fieldKey = c.req.query('field');
  if (!fieldKey) return c.json({ message: 'حقل غير صالح' }, 400);
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const report = await fieldReport(c.env.DB, fieldKey, filters, user);
  return c.json(report);
});