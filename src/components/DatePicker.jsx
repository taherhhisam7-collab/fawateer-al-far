import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { fmtDate, parseDate, todayISO } from '../utils';

const DAYS = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export default function DatePicker({ value, onChange, placeholder = 'يوم/شهر/سنة' }) {
  const [text, setText] = useState(fmtDate(value));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => {
    const base = value ? new Date(value) : new Date();
    return { y: base.getFullYear(), m: base.getMonth() };
  });
  const wrap = useRef(null);

  useEffect(() => { setText(fmtDate(value)); }, [value]);
  useEffect(() => {
    const close = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const emit = (iso) => {
    if (!iso) return;
    onChange?.(iso);
    setText(fmtDate(iso));
    setOpen(false);
  };
  const commitText = () => {
    const iso = parseDate(text);
    if (iso) emit(iso);
    else setText(fmtDate(value));
  };
  const shift = (delta) => setView((v) => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const first = new Date(view.y, view.m, 1);
  const offset = (first.getDay() + 1) % 7; // السبت أولاً
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const selected = value ? String(value).slice(0, 10) : '';
  const today = todayISO();

  return <div className="date-picker" ref={wrap}>
    <div className="date-input-wrap">
      <input value={text} onChange={(e) => setText(e.target.value)} onBlur={commitText}
        onKeyDown={(e) => { if (e.key === 'Enter') commitText(); }} placeholder={placeholder} dir="ltr" />
      <button type="button" className="date-icon" title="افتح التقويم" onClick={() => setOpen((o) => !o)}>
        <CalendarDays size={17} />
      </button>
    </div>
    {open && <div className="cal-pop">
      <div className="cal-head">
        <button type="button" onClick={() => shift(-1)}><ChevronRight size={16} /></button>
        <b>{MONTHS[view.m]} {view.y}</b>
        <button type="button" onClick={() => shift(1)}><ChevronLeft size={16} /></button>
      </div>
      <div className="cal-grid cal-dow">{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} />;
          const iso = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          return <button type="button" key={iso}
            className={`${iso === selected ? 'sel' : ''} ${iso === today ? 'today' : ''}`}
            onClick={() => emit(iso)}>{d}</button>;
        })}
      </div>
      <div className="cal-selects">
        <select value={selected.slice(8, 10) || ''} onChange={(e) => {
          const mo = selected.slice(5, 7) || String(view.m + 1).padStart(2, '0');
          emit(`${selected.slice(0, 4) || view.y}-${mo}-${String(e.target.value).padStart(2, '0')}`);
        }}><option value="">يوم</option>{Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}</select>
        <select value={String(view.m + 1).padStart(2, '0')} onChange={(e) => {
          setView((v) => ({ ...v, m: Number(e.target.value) - 1 }));
        }}>{MONTHS.map((mo, i) => <option key={mo} value={String(i + 1).padStart(2, '0')}>{mo}</option>)}</select>
        <select value={view.y} onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))}>
          {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <button type="button" className="cal-today" onClick={() => emit(todayISO())}>اليوم</button>
    </div>}
  </div>;
}
