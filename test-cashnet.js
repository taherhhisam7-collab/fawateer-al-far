const base = 'http://localhost:3002/api';
async function req(p, o = {}, t) {
  const r = await fetch(base + p, { method: o.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) },
    body: o.body ? JSON.stringify(o.body) : undefined });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, data: ct.includes('json') ? await r.json() : await r.arrayBuffer() };
}
(async () => {
  let r = await req('/setup', { method: 'POST', body: { full_name: 'م', email: 'm@t.com', password: '123456', branch_name: 'الرئيسي' } });
  const t = r.data.token;
  const p = { invoice_date: '2026-11-24', day_name: 'الثلاثاء', listA: [],
    listB: [{ supplier: 'مورد', invoices: '1000', payments: '300', remaining: '700' }],
    shifts: [
      { shift_label: 'صباحي', total_cash: '500', network: '200', branch_expense: '300', net_cash: '200', total_amount: '700' },
      { shift_label: 'مسائي', total_cash: '400', network: '100', branch_expense: '200', net_cash: '200', total_amount: '500' },
    ],
    totals: { listB: { invoices: '1000', payments: '300', remaining: '700' }, shifts: { total_cash: '900', network: '300', branch_expense: '500', net_cash: '400', total_amount: '1200' } } };
  await req('/invoices', { method: 'POST', body: p }, t);
  r = await req('/reports/cash-network', {}, t);
  console.log('report:', r.status, 'rows', r.data.rows?.length, 'totals', JSON.stringify(r.data.totals));
  r = await req('/reports/cash-network?shift=صباحي', {}, t);
  console.log('shift filter rows:', r.data.rows?.length);
  r = await req('/reports/cash-network?income=network', {}, t);
  console.log('network filter rows:', r.data.rows?.length);
  r = await req('/exports/cash-network.xlsx', {}, t);
  console.log('excel:', r.status, r.data.byteLength);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
