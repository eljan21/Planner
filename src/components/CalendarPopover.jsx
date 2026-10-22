import { useEffect, useRef, useState } from 'react';
import { DAYS_SHORT, MONTHS, addDays, fromKey, toKey, todayKey } from '../dates';
import { tr } from '../i18n';

/** Month grid; picking a day makes the board start from that day. */
export default function CalendarPopover({ start, visible, busy, onPick, onClose }) {
  const [month, setMonth] = useState(() => { const d = fromKey(start); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.contains(e.target) && !e.target.closest('.range-btn')) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const today = todayKey();
  const first = addDays(month, -((month.getDay() + 6) % 7));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i));
  const shift = (n) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));

  return (
    <div className="cal" ref={ref} role="dialog" aria-label={tr('Təqvim', 'Calendar')}>
      <div className="cal-head">
        <button onClick={() => shift(-1)} aria-label={tr('Əvvəlki ay', 'Previous month')}>‹</button>
        <span>{MONTHS[month.getMonth()]} {month.getFullYear()}</span>
        <button onClick={() => shift(1)} aria-label={tr('Növbəti ay', 'Next month')}>›</button>
      </div>
      <div className="cal-grid">
        {DAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
        {cells.map((d) => {
          const k = toKey(d);
          const cls = [
            d.getMonth() !== month.getMonth() && 'out',
            visible.includes(k) && 'in',
            k === today && 'is-today',
            busy.has(k) && 'has',
          ].filter(Boolean).join(' ');
          return <button key={k} className={cls} onClick={() => onPick(k)} aria-label={`${d.getDate()} ${MONTHS[d.getMonth()]}`}>{d.getDate()}</button>;
        })}
      </div>
      <p className="cal-note">{tr('Günü seç — board o gündən başlayan 5 günü göstərəcək.', 'Pick a day — the board will show the 5 days starting from it.')}</p>
    </div>
  );
}
