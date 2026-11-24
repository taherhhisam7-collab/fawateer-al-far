import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, financeMiddleware, isAccountant } from '../auth.js';
import { listInvoices } from '../reports.js';

export const statsRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

statsRoutes.get('/stats', authMiddleware, financeMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const total = (await c.env.DB.prepare('SELECT COUNT(*) as n FROM invoices').first<{ n: number }>())?.n || 0;

  const perBranch = (await c.env.DB.prepare(`
    SELECT b.name, COUNT(i.id) as n FROM branches b
    LEFT JOIN invoices i ON i.branch_id = b.id GROUP BY b.id ORDER BY n DESC
  `).all()).results;

  const perCashier = (await c.env.DB.prepare(`
    SELECT u.full_name, COUNT(i.id) as n, b.name as branch
    FROM users u LEFT JOIN invoices i ON i.user_id = u.id LEFT JOIN branches b ON b.id = u.branch_id
    WHERE u.role = 'cashier' GROUP BY u.id ORDER BY n DESC
  `).all()).results;

  const recentInvoices = await listInvoices(c.env.DB, {}, user);
  const recent = recentInvoices.slice(0, 6).map((i: any) => ({
    id: i.id, code: i.code, branch: i.branch_name, user: i.user_name,
    date: i.invoice_date, day: i.day_name,
  }));

  const branchesCount = (await c.env.DB.prepare('SELECT COUNT(*) as n FROM branches').first<{ n: number }>())?.n || 0;
  const cashiersCount = (await c.env.DB.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'cashier'").first<{ n: number }>())?.n || 0;

  return c.json({ total, branches: branchesCount, users: cashiersCount, perBranch, perCashier, recent });
});