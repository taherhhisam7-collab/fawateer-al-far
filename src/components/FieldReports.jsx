import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, MessageCircle, BarChart3, RefreshCw } from 'lucide-react';
import { api, download, query, shareWhatsApp } from '../api';
import { FilterBar } from './ui.jsx';

export default function FieldReports({ branches, users, notify }) {
  const [fields, setFields] = useState([]);
  const [field, setField] = useState('branch_name');
  const [filters, setFilters] = useState({});
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api('/reports/fields').then(setFields).catch((e) => notify(e.message, 'error')); }, []);
  const run = () => {
    setLoading(true);
    api(`/reports/field${query({ ...filters, field })}`)
      .then(setReport).catch((e) => notify(e.message, 'error')).finally(() => setLoading(false));
  };
  useEffect(() => { if (fields.length) run(); }, [field, JSON.stringify(filters), fields.length]);

  const groups = useMemo(() => {
    const m = new Map();
    fields.forEach((f) => { if (!m.has(f.group)) m.set(f.group, []); m.get(f.group).push(f); });
    return [...m.entries()];
  }, [fields]);

  const share = () => shareWhatsApp([
    `*تقرير حقل: ${report?.field?.label || field}*`, 'القيمة | عدد الفواتير | عدد السجلات | المجاميع',
    ...(report?.rows || []).map((r) => `${r.value} | ${r.forms} | ${r.occurrences} | ${r.sum === null ? '-' : r.sum}`),
  ]);

  return <>
    <div className="card">
      <div className="card-header"><h3><BarChart3 size={18} /> تقرير مستقل لكل حقل</h3></div>
      <div className="card-body">
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="field"><label>اختر الحقل</label>
            <select value={field} onChange={(e) => setField(e.target.value)}>
              {groups.map(([g, list]) => <optgroup key={g} label={g}>
                {list.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </optgroup>)}
            </select></div>
          <div className="field"><label>&nbsp;</label><button className="btn btn-primary" onClick={run}><RefreshCw size={15} /> تحديث التقرير</button></div>
        </div>
        <FilterBar filters={filters} setFilters={setFilters} branches={branches} users={users} />
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn btn-light" onClick={() => download(`/exports/field.xlsx${query({ ...filters, field })}`, `field-report.xlsx`)
            .catch((e) => notify(e.message, 'error'))}><FileSpreadsheet size={15} /> تصدير Excel</button>
          <button className="btn btn-wa" onClick={share}><MessageCircle size={15} /> مشاركة واتساب</button>
          {loading && <span className="muted">جاري التحميل...</span>}
        </div>
      </div>
    </div>
    <div className="card">
      <div className="card-header"><h3>{report?.field ? `نتائج: ${report.field.label}` : 'النتائج'}</h3>
        <span className="muted">إجمالي القيم: {report?.rows?.length || 0}</span></div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>القيمة</th><th>عدد الفواتير</th><th>عدد السجلات</th><th>المجاميع</th><th>الفروع</th></tr></thead>
        <tbody>
          {!report?.rows?.length && <tr><td colSpan="5" className="center muted">لا توجد بيانات</td></tr>}
          {report?.rows?.map((r, i) => <tr key={i}>
            <td><b>{r.value}</b></td><td>{r.forms}</td><td>{r.occurrences}</td>
            <td>{r.sum === null ? '-' : r.sum}</td><td>{r.branches}</td>
          </tr>)}
        </tbody>
      </table></div>
    </div>
  </>;
}
