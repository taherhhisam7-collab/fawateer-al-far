import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { api } from '../api';
import { Modal } from './ui.jsx';

const empty = { name: '', code: '', city: 'المدينة المنورة', active: true };

export default function Branches({ branches, reload, notify }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const open = (b) => { setEditing(b || {}); setForm(b ? { ...b } : empty); };
  const close = () => setEditing(null);
  const save = async () => {
    try {
      const d = editing.id
        ? await api(`/branches/${editing.id}`, { method: 'PUT', body: form })
        : await api('/branches', { method: 'POST', body: form });
      notify(d.message || 'تم حفظ الفرع'); close(); reload();
    } catch (e) { notify(e.message, 'error'); }
  };
  const remove = async (b) => {
    if (!window.confirm(`حذف الفرع «${b.name}»؟`)) return;
    try { notify((await api(`/branches/${b.id}`, { method: 'DELETE' })).message); reload(); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <>
    <div className="card">
      <div className="card-header"><h3><Building2 size={18} /> الفروع</h3>
        <button className="btn btn-primary btn-sm" onClick={() => open(null)}><Plus size={15} /> إضافة فرع</button></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>#</th><th>اسم الفرع</th><th>الرمز</th><th>المدينة</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
        <tbody>
          {branches.length === 0 && <tr><td colSpan="6" className="center muted">لا توجد فروع</td></tr>}
          {branches.map((b, i) => <tr key={b.id}>
            <td>{i + 1}</td><td><b>{b.name}</b></td><td>{b.code || '-'}</td><td>{b.city || '-'}</td>
            <td><span className={`badge ${b.active ? 'badge-submitted' : 'badge-draft'}`}>{b.active ? 'نشط' : 'معطل'}</span></td>
            <td><div className="btn-row">
              <button className="btn btn-light btn-sm" onClick={() => open(b)}><Pencil size={14} /> تعديل</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(b)}><Trash2 size={14} /></button>
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
    </div>
    {editing && <Modal title={editing.id ? 'تعديل الفرع' : 'إضافة فرع'} onClose={close}
      footer={<><button className="btn btn-primary" onClick={save}>حفظ</button>
        <button className="btn btn-ghost" onClick={close}>إلغاء</button></>}>
      <div className="form-grid">
        <div className="field"><label>اسم الفرع *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>رمز الفرع</label><input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
        <div className="field"><label>المدينة</label><input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div className="field"><label>الحالة</label>
          <select value={form.active ? '1' : '0'} onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
            <option value="1">نشط</option><option value="0">معطل</option>
          </select></div>
      </div>
    </Modal>}
  </>;
}
