import { Hono } from 'hono';
import { z } from 'zod';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, financeMiddleware, isAccountant } from '../auth.js';
import { listInvoices, getInvoice, saveLines, nextCode, invoiceFields } from '../reports.js';

const invoiceRowSchema = z.object({
  supplier: z.string().default(''),
  invoices: z.string().default(''),
  payments: z.string().default(''),
  remaining: z.string().default(''),
  notes: z.string().default(''),
});

const shiftRowSchema = z.object({
  shift_label: z.string().default(''),
  total_cash: z.string().default(''),
  network: z.string().default(''),
  branch_expense: z.string().default(''),
  net_cash: z.string().default(''),
  total_amount: z.string().default(''),
});

const invoiceSchema = z.object({
  invoice_date: z.string().default(''),
  day_name: z.string().default(''),
  notes: z.string().default(''),
  totals: z.record(z.any()).default({}),
  listA: z.array(invoiceRowSchema).default([]),
  listB: z.array(invoiceRowSchema).default([]),
  shifts: z.array(shiftRowSchema).default([]),
  branch_id: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
});

export const invoiceRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

invoiceRoutes.get('/invoices', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const invoices = await listInvoices(c.env.DB, filters, user);
  return c.json(invoices);
});

invoiceRoutes.get('/invoices/:id', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const id = c.req.param('id');
  const invoice = await getInvoice(c.env.DB, id, user);
  if (!invoice) {
    return c.json({ message: 'الفاتورة غير موجودة' }, 404);
  }
  return c.json(invoice);
});

// Cashier/Accountant: Create invoice
invoiceRoutes.post('/invoices', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const body = await c.req.json();
  const parse = invoiceSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'بيانات الفاتورة غير صالحة' }, 400);
  }

  const b = parse.data;
  const branchId = isAccountant(user.role) ? (b.branch_id || user.branch_id) : user.branch_id;

  if (!branchId) {
    return c.json({ message: 'اختر الفرع أو راجع المحاسب' }, 400);
  }

  const branch = await c.env.DB.prepare('SELECT id FROM branches WHERE id = ? AND active = 1').bind(branchId).first();
  if (!branch) {
    return c.json({ message: 'الفرع غير نشط — راجع المحاسب' }, 400);
  }

  const code = await nextCode(c.env.DB);

  try {
    const info = await c.env.DB.prepare(`
      INSERT INTO invoices (code, user_id, branch_id, invoice_date, day_name, notes, totals)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(code, user.id, branchId, ...invoiceFields(b)).run();
    const invoiceId = Number(info.meta.last_row_id);
    await saveLines(c.env.DB, invoiceId, b);

    return c.json({
      id: invoiceId,
      code,
      message: 'تم إدخال الفاتورة بنجاح',
    }, 201);
  } catch (e) {
    return c.json({ message: 'خطأ في حفظ الفاتورة' }, 500);
  }
});

// Accountant only: Update invoice
invoiceRoutes.put('/invoices/:id', authMiddleware, financeMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const id = c.req.param('id');
  const body = await c.req.json();
  const parse = invoiceSchema.safeParse(body);
  if (!parse.success) {
    return c.json({ message: 'بيانات الفاتورة غير صالحة' }, 400);
  }

  const b = parse.data;

  const existing = await getInvoice(c.env.DB, id, user);
  if (!existing) {
    return c.json({ message: 'الفاتورة غير موجودة' }, 404);
  }

  const branchId = b.branch_id || existing.branch_id;

  try {
    await c.env.DB.prepare(`
      UPDATE invoices SET branch_id = ?, invoice_date = ?, day_name = ?, notes = ?, totals = ? WHERE id = ?
    `).bind(branchId, ...invoiceFields(b), id).run();
    await saveLines(c.env.DB, Number(id), b);

    return c.json({ message: 'تم حفظ التعديلات' });
  } catch (e) {
    return c.json({ message: 'خطأ في حفظ التعديلات' }, 500);
  }
});

// Accountant only: Delete invoice
invoiceRoutes.delete('/invoices/:id', authMiddleware, financeMiddleware, async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM invoices WHERE id = ?').bind(id).run();
  return c.json({ message: 'تم حذف الفاتورة' });
});
