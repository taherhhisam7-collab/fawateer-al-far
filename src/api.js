const KEY = 'fawateer_token';

export const token = () => localStorage.getItem(KEY);
export const setToken = (t) => t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY);

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const res = await fetch(`/api${path}`, {
    ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setToken(null);
    window.location.reload();
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'حدث خطأ في الاتصال');
  return data;
}

export async function download(path, filename) {
  const res = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    throw new Error(d.message || 'تعذر تنزيل الملف');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename || 'report.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export function shareWhatsApp(lines) {
  const text = Array.isArray(lines) ? lines.join('\n') : String(lines);
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
}

export const query = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) p.append(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};
