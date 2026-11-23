// كل التواريخ في التطبيق: يوم / شهر / سنة
export const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(String(iso))) return String(iso || '-');
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};
export const parseDate = (text) => {
  const m = String(text || '').trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
