import { shareWhatsApp } from '../api';

const L = ['المورد أو بيان الصرف', 'الفواتير', 'المدفوعات', 'الباقي', 'ملاحظات'];
const LK = ['supplier', 'invoices', 'payments', 'remaining', 'notes'];
const S = ['الشفت', 'إجمالي الكاش', 'الشبكة', 'الفرع (الصرف)', 'صافي الكاش', 'إجمالي الدخل'];
const SK = ['shift_label', 'total_cash', 'network', 'branch_expense', 'net_cash', 'total_amount'];

export function fullShareText(invoice) {
  const lines = [
    `*تفاصيل فواتير الفرع - ${invoice.code}*`,
    `الفرع: ${invoice.branch_name || '-'}`,
    `الكاشير: ${invoice.user_name || '-'}`,
    `التاريخ: ${invoice.invoice_date || '-'} | اليوم: ${invoice.day_name || '-'}`,
  ];
  lines.push('', '*الشفت*');
  lines.push(S.join(' | '));
  (invoice.shifts || []).forEach((r) => lines.push(SK.map((k) => r[k] || '-').join(' | ')));
  lines.push('', '*تفاصيل الفواتير*');
  lines.push(L.join(' | '));
  (invoice.listB || []).filter((r) => String(r.supplier || '').trim()).forEach((r) =>
    lines.push(LK.map((k) => r[k] || '-').join(' | ')));
  const t = invoice.totals || {};
  lines.push('', `*إجمالي الكاش: ${t.shifts?.total_cash || '0'}*`,
    `*إجمالي الشبكة: ${t.shifts?.network || '0'}*`,
    `*إجمالي الدخل: ${t.shifts?.total_amount || '0'}*`);
  if (t.difference?.text) lines.push(t.difference.text);
  return lines.join('\n');
}

export async function shareInvoiceText(invoice) {
  const text = fullShareText(invoice);
  if (navigator.share) {
    try { await navigator.share({ title: `فاتورة ${invoice.code}`, text }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  shareWhatsApp(text);
}

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function buildInvoiceCanvas(invoice) {
  const W = 900;
  const pad = 34;
  const rowH = 34;
  const headH = 38;
  const shifts = invoice.shifts || [];
  const rows = (invoice.listB || []).filter((r) => String(r.supplier || '').trim());
  const section = (count) => 56 + headH + Math.max(count, 1) * rowH + 34;
  const H = 196 + section(shifts.length) + section(rows.length) + 70;

  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  rounded(ctx, 0, 0, W, 112, 14);
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(0, 0, W, 112);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Tajawal, Tahoma, sans-serif';
  ctx.fillText('تفاصيل فواتير الفرع', W - pad, 42);
  ctx.font = '18px Tajawal, Tahoma, sans-serif';
  ctx.fillText(`الفاتورة ${invoice.code || ''} — ${invoice.invoice_date || ''}`, W - pad, 82);

  ctx.fillStyle = '#1e293b';
  ctx.font = '17px Tajawal, Tahoma, sans-serif';
  const meta = [
    `الفرع: ${invoice.branch_name || '-'}`,
    `الكاشير: ${invoice.user_name || '-'}`,
    `اليوم: ${invoice.day_name || '-'}`,
  ];
  meta.forEach((m, i) => ctx.fillText(m, W - pad, 140 + i * 26));

  let y = 224;
  const table = (title, headers, keys, data, totals) => {
    ctx.fillStyle = '#0b3b36';
    ctx.font = 'bold 18px Tajawal, Tahoma, sans-serif';
    ctx.fillText(title, W - pad, y);
    y += 22;
    const colW = (W - pad * 2) / headers.length;
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(pad, y, W - pad * 2, headH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Tajawal, Tahoma, sans-serif';
    headers.forEach((h, i) => ctx.fillText(h, W - pad - i * colW - 6, y + headH / 2, colW - 12));
    y += headH;
    const body = data.length ? data : [{}];
    body.forEach((r, ri) => {
      ctx.fillStyle = ri % 2 ? '#f0fdfa' : '#ffffff';
      ctx.fillRect(pad, y, W - pad * 2, rowH);
      ctx.fillStyle = '#1e293b';
      ctx.font = '15px Tajawal, Tahoma, sans-serif';
      keys.forEach((k, i) => ctx.fillText(String(r[k] || '-'), W - pad - i * colW - 6, y + rowH / 2, colW - 12));
      ctx.strokeStyle = '#dbe3ea';
      ctx.beginPath(); ctx.moveTo(pad, y + rowH); ctx.lineTo(W - pad, y + rowH); ctx.stroke();
      y += rowH;
    });
    if (totals) {
      ctx.fillStyle = '#ccfbf1';
      ctx.fillRect(pad, y, W - pad * 2, rowH);
      ctx.fillStyle = '#0b3b36';
      ctx.font = 'bold 15px Tajawal, Tahoma, sans-serif';
      keys.forEach((k, i) => ctx.fillText(i === 0 ? 'الإجمالي' : String(totals[k] || '-'), W - pad - i * colW - 6, y + rowH / 2, colW - 12));
      y += rowH;
    }
    y += 34;
  };

  table('الشفت', S, SK, shifts, invoice.totals?.shifts);
  table('تفاصيل فواتير الفرع', L, LK, rows, invoice.totals?.listB);

  const t = invoice.totals || {};
  ctx.fillStyle = '#0b3b36';
  ctx.font = 'bold 17px Tajawal, Tahoma, sans-serif';
  ctx.fillText(`إجمالي الكاش: ${t.shifts?.total_cash || '0'}   |   إجمالي الشبكة: ${t.shifts?.network || '0'}   |   إجمالي الدخل: ${t.shifts?.total_amount || '0'}`, W - pad, y);
  if (t.difference?.text) {
    ctx.fillStyle = t.difference.state === 'minus' ? '#dc2626' : '#15803d';
    ctx.font = '16px Tajawal, Tahoma, sans-serif';
    ctx.fillText(t.difference.text, W - pad, y + 26);
  }
  ctx.fillStyle = '#64748b';
  ctx.font = '13px Tajawal, Tahoma, sans-serif';
  ctx.fillText('تطبيق فواتير الفرع', W - pad, H - 22);
  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadInvoiceImage(invoice) {
  const canvas = buildInvoiceCanvas(invoice);
  const blob = await canvasToBlob(canvas);
  saveBlob(blob, `fatura-${invoice.code}.png`);
}

export async function shareInvoiceImage(invoice, notify) {
  const canvas = buildInvoiceCanvas(invoice);
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], `fatura-${invoice.code}.png`, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `فاتورة ${invoice.code}`, text: `تفاصيل فواتير الفرع ${invoice.code}` });
      return;
    } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  saveBlob(blob, `fatura-${invoice.code}.png`);
  notify?.('تم تنزيل الصورة — شاركها من المعرض');
}

export async function downloadInvoicePdf(invoice) {
  const canvas = buildInvoiceCanvas(invoice);
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [canvas.width / 2, canvas.height / 2], compress: true });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.94), 'JPEG', 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save(`fatura-${invoice.code}.pdf`);
}
