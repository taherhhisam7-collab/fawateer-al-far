import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Users as UsersIcon, Store, KeyRound } from 'lucide-react';
import { api } from '../api';
import { Modal } from './ui.jsx';

const empty = { email: '', full_name: '', password: '', role: 'cashier', branch_id: '', active: true };

export default function Users({ users, branches, reload, notify }) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [passUser, setPassUser] = useState(null);
  const [passValue, setPassValue] = useState('');
  const open = (u) => { setEditing(u || {}); setForm(u ? { ...u, password: '' } : empty); };
  const close = () => setEditing(null);
  const save = async () => {
    if (!form.branch_id) { notify('لازم تختار الفرع وتربط المستخدم به قبل الحفظ', 'error'); return; }
    try {
      const body = { ...form, branch_id: Number(form.branch_id) };
      const d = editing.id
        ? await api(`/users/${editing.id}`, { method: 'PUT', body })
        : await api('/users', { method: 'POST', body });
      notify(d.message || 'تم حفظ المستخدم'); close(); reload();
    } catch (e) { notify(e.message, 'error'); }
  };
  const remove = async (u) => {
    if (!window.confirm(`حذف المستخدم «${u.full_name}»؟`)) return;
    try { notify((await api(`/users/${u.id}`, { method: 'DELETE' })).message); reload(); }
    catch (e) { notify(e.message, 'error'); }
  };

  return <>
    <div className="card">
      <div className="card-header"><h3><UsersIcon size={18} /> المستخدمون — الكاشيرات وربطهم بالفروع</h3>
        <button className="btn btn-primary btn-sm" onClick={() => open(null)}><Plus size={15} /> إضافة مستخدم</button></div>
      <div className="section-note" style={{ padding: '0 18px 12px' }}>
        كل مستخدم (كاشير أو محاسب) يُربط بفرع إجبارياً قبل الحفظ. الكاشير لا يرى إلا شاشة الإدخال ولا يستطيع تعديل أو حذف أي فاتورة.
      </div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>#</th><th>الاسم</th><th>البريد</th><th>الدور</th><th>الفرع</th><th>الحالة</th><th>الإجراءات</th></tr></thead>
        <tbody>
          {users.length === 0 && <tr><td colSpan="7" className="center muted">لا يوجد مستخدمون — ابدأ بإضافة كاشير لكل فرع</td></tr>}
          {users.map((u, i) => <tr key={u.id}>
            <td>{i + 1}</td><td><b>{u.full_name}</b></td><td dir="ltr" style={{ textAlign: 'right' }}>{u.email}</td>
            <td>{u.role === 'cashier' ? 'كاشير' : 'محاسب'}</td>
            <td>{u.branch_name || <span className="muted">—</span>}</td>
            <td><span className={`badge ${u.active ? 'badge-submitted' : 'badge-draft'}`}>{u.active ? 'نشط' : 'معطل'}</span></td>
            <td><div className="btn-row">
              <button className="btn btn-light btn-sm" onClick={() => open(u)}><Pencil size={14} /> تعديل</button>
              <button className="btn btn-light btn-sm" title="تغيير كلمة المرور" onClick={() => { setPassUser(u); setPassValue(''); }}>
                <KeyRound size={14} /> كلمة المرور
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(u)}><Trash2 size={14} /></button>
            </div></td>
          </tr>)}
        </tbody>
      </table></div>
    </div>
    {editing && <Modal title={editing.id ? 'تعديل مستخدم' : 'إضافة مستخدم'} onClose={close}
      footer={<><button className="btn btn-primary" onClick={save}>حفظ</button>
        <button className="btn btn-ghost" onClick={close}>إلغاء</button></>}>
      <div className="form-grid">
        <div className="field"><label>الاسم الكامل *</label><input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="field"><label>البريد الإلكتروني *</label><input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field"><label>كلمة المرور {editing.id && '(اتركها فارغة للإبقاء)'}</label>
          <input type="password" value={form.password || ''} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <div className="field"><label>الدور</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="cashier">كاشير</option><option value="accountant">محاسب</option>
          </select></div>
        <div className="field"><label>الفرع * (إجباري لكل المستخدمين)</label>
          <select value={form.branch_id || ''} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">-- اختر الفرع --</option>
            {branches.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select></div>
        <div className="field"><label>الحالة</label>
          <select value={form.active ? '1' : '0'} onChange={(e) => setForm({ ...form, active: e.target.value === '1' })}>
            <option value="1">نشط</option><option value="0">معطل</option>
          </select></div>
      </div>
    </Modal>}
    {passUser && <Modal title={`تغيير كلمة مرور: ${passUser.full_name}`}
      onClose={() => setPassUser(null)}
      footer={<>
        <button className="btn btn-primary" onClick={async () => {
          try {
            const d = await api(`/users/${passUser.id}/reset-password`, { method: 'POST', body: { password: passValue } });
            notify(d.message); setPassUser(null); setPassValue('');
          } catch (e) { notify(e.message, 'error'); }
        }}>حفظ كلمة المرور</button>
        <button className="btn btn-ghost" onClick={() => setPassUser(null)}>إلغاء</button>
      </>}>
      <div className="field"><label>كلمة المرور الجديدة (6 أحرف فأكثر)</label>
        <input type="password" value={passValue} onChange={(e) => setPassValue(e.target.value)} /></div>
    </Modal>}
  </>;
}
