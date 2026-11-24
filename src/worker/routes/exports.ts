import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { authMiddleware, financeMiddleware } from '../auth.js';
import { listInvoices, getInvoice, supplierReport, cashNetworkReport, fieldReport, FIELDS } from '../reports.js';

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function toCsv(headers: string[], rows: any[][]): string {
  return [headers.join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
}

function toCsvObjects(headers: string[], rows: any[], keyMap: string[]): string {
  return [headers.join(','), ...rows.map(r => keyMap.map(k => escapeCsv(r[k] ?? '')).join(','))].join('\n');
}

export const exportRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

exportRoutes.get('/exports/cash-network.csv', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const { rows, totals } = await cashNetworkReport(c.env.DB, filters, user);

  const headers = ['Ø±Ù‚Ù… Ø§Ù„ÙØ§ØªÙˆØ±Ø©', 'Ø§Ù„ÙØ±Ø¹', 'Ø§Ù„ÙƒØ§Ø´ÙŠØ±', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„ÙŠÙˆÙ…', 'Ø§Ù„Ø´ÙØª', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒØ§Ø´', 'Ø§Ù„Ø´Ø¨ÙƒØ©', 'Ø§Ù„ÙØ±Ø¹ (Ø§Ù„ØµØ±Ù)', 'ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„'];
  const data = rows.map((r: any) => [r.code, r.branch, r.cashier, r.date, r.day, r.shift, r.cash, r.network, r.expense, r.net, r.income]);
  data.push(['Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', '', '', '', '', '', totals.cash, totals.network, totals.expense, totals.net, totals.cash + totals.network]);

  const csv = toCsv(headers, data);
  return new Response("\uFEFF" + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`cash-network-${Date.now()}.csv`)}`,
    },
  });
});

exportRoutes.get('/exports/suppliers.csv', authMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const rows = await supplierReport(c.env.DB, filters, user);

  const headers = ['Ø§Ù„Ù…ÙˆØ±Ø¯', 'Ø§Ù„ÙØ±Ø¹', 'Ø¹Ø¯Ø¯ Ø§Ù„ÙÙˆØ§ØªÙŠØ±', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ±', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª', 'Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ', 'Ø¢Ø®Ø± ØªØ§Ø±ÙŠØ®', 'Ø£Ø±Ù‚Ø§Ù… Ø§Ù„ÙÙˆØ§ØªÙŠØ±'];
  const keyMap = ['supplier', 'branches', 'count', 'invoices', 'payments', 'remaining', 'lastDate', 'codes'];
  const data = rows.map((r: any) => [r.supplier, r.branches, r.count, r.invoices, r.payments, r.remaining, r.lastDate, r.codes.join('ØŒ ')]);

  const csv = toCsv(headers, data);
  return new Response("\uFEFF" + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`suppliers-${Date.now()}.csv`)}`,
    },
  });
});

exportRoutes.get('/exports/invoices.csv', authMiddleware, financeMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const invoices = await listInvoices(c.env.DB, filters, user);

  const headers = ['Ø±Ù‚Ù… Ø§Ù„Ù†Ù…ÙˆØ°Ø¬', 'Ø§Ù„ÙØ±Ø¹', 'Ø§Ù„ÙƒØ§Ø´ÙŠØ±', 'Ø§Ù„ØªØ§Ø±ÙŠØ®', 'Ø§Ù„ÙŠÙˆÙ…', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ± (1)', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙÙˆØ§ØªÙŠØ± (2)', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„'];
  const data = invoices.map((i: any) => {
    let t = {}; try { t = JSON.parse(i.totals || '{}'); } catch { t = {}; }
    return [i.code, i.branch_name, i.user_name, i.invoice_date, i.day_name, t.listA?.invoices || '', t.listB?.invoices || '', t.shifts?.total_amount || ''];
  });

  const csv = toCsv(headers, data);
  return new Response("\uFEFF" + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`fawateer-${Date.now()}.csv`)}`,
    },
  });
});

exportRoutes.get('/exports/invoice/:id.csv', authMiddleware, financeMiddleware, async (c) => {
  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const id = c.req.param('id');
  const inv = await getInvoice(c.env.DB, id, user);
  if (!inv) return c.json({ message: 'Ø§Ù„ÙØ§ØªÙˆØ±Ø© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©' }, 404);

  let csv = 'ØªÙØ§ØµÙŠÙ„ ÙÙˆØ§ØªÙŠØ± Ø§Ù„ÙØ±Ø¹\n\n';
  csv += 'Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹,' + inv.branch_name + '\n';
  csv += 'Ø§Ù„ØªØ§Ø±ÙŠØ®,' + inv.invoice_date + '\n';
  csv += 'Ø§Ù„ÙŠÙˆÙ…,' + inv.day_name + '\n';
  csv += 'Ø§Ù„ÙƒØ§Ø´ÙŠØ±,' + inv.user_name + '\n\n';

  const LIST_HEADERS = ['Ø§Ù„Ù…ÙˆØ±Ø¯ Ø£Ùˆ Ø¨ÙŠØ§Ù† Ø§Ù„ØµØ±Ù', 'Ø§Ù„ÙÙˆØ§ØªÙŠØ±', 'Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª', 'Ø§Ù„Ø¨Ø§Ù‚ÙŠ', 'Ù…Ù„Ø§Ø­Ø¸Ø§Øª'];
  csv += LIST_HEADERS.join(',') + '\n';
  for (const r of inv.listA || []) {
    csv += [r.supplier, r.invoices, r.payments, r.remaining, r.notes].map(escapeCsv).join(',') + '\n';
  }
  if (inv.totals?.listA) {
    const t = inv.totals.listA;
    csv += ['Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', t.invoices || '', t.payments || '', t.remaining || '', ''].map(escapeCsv).join(',') + '\n';
  }

  csv += '\n';
  const SHIFT_HEADERS = ['Ø§Ù„Ø´ÙØª', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙƒØ§Ø´', 'Ø§Ù„Ø´Ø¨ÙƒØ©', 'Ø§Ù„ÙØ±Ø¹ (Ø§Ù„ØµØ±Ù)', 'ØµØ§ÙÙŠ Ø§Ù„ÙƒØ§Ø´', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¯Ø®Ù„'];
  csv += SHIFT_HEADERS.join(',') + '\n';
  for (const r of inv.shifts || []) {
    csv += [r.shift_label, r.total_cash, r.network, r.branch_expense, r.net_cash, r.total_amount].map(escapeCsv).join(',') + '\n';
  }
  if (inv.totals?.shifts) {
    const st = inv.totals.shifts;
    csv += ['Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', st.total_cash || '', st.network || '', st.branch_expense || '', st.net_cash || '', st.total_amount || ''].map(escapeCsv).join(',') + '\n';
  }

  csv += '\n';
  csv += LIST_HEADERS.join(',') + '\n';
  for (const r of inv.listB || []) {
    csv += [r.supplier, r.invoices, r.payments, r.remaining, r.notes].map(escapeCsv).join(',') + '\n';
  }
  if (inv.totals?.listB) {
    const t = inv.totals.listB;
    csv += ['Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ', t.invoices || '', t.payments || '', t.remaining || '', ''].map(escapeCsv).join(',') + '\n';
  }

  if (inv.totals?.difference) {
    csv += ['Ø§Ù„ÙØ±Ù‚ Ø¨ÙŠÙ† Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…ØµØ±ÙˆÙØ§Øª ÙˆØ§Ù„ÙØ±Ø¹ (Ø§Ù„ØµØ±Ù)', inv.totals.difference.text].map(escapeCsv).join(',') + '\n';
  }

  return new Response("\uFEFF" + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`fatura-${inv.code}.csv`)}`,
    },
  });
});

exportRoutes.get('/exports/field.csv', authMiddleware, financeMiddleware, async (c) => {
  const fieldKey = c.req.query('field');
  if (!fieldKey) return c.json({ message: 'Ø­Ù‚Ù„ ØºÙŠØ± ØµØ§Ù„Ø­' }, 400);

  const user = c.get('user') as { id: number; role: string; branch_id: number | null };
  const filters = c.req.query();
  const { field, rows } = await fieldReport(c.env.DB, fieldKey, filters, user);
  if (!field) return c.json({ message: 'Ø­Ù‚Ù„ ØºÙŠØ± ØµØ§Ù„Ø­' }, 400);

  const headers = ['Ø§Ù„Ù‚ÙŠÙ…Ø©', 'Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù…Ø§Ø°Ø¬', 'Ø¹Ø¯Ø¯ Ø§Ù„Ø³Ø¬Ù„Ø§Øª', 'Ø§Ù„Ù…Ø¬Ø§Ù…ÙŠØ¹', 'Ø§Ù„ÙØ±ÙˆØ¹'];
  const data = rows.map((r: any) => [r.value, r.forms, r.occurrences, r.sum === null ? '' : r.sum, r.branches]);

  const csv = toCsv(headers, data);
  return new Response("\uFEFF" + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`field-${field.key.replace('.', '-')}.csv`)}`,
    },
  });
});


