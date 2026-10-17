import { useMemo, useState } from 'react';
import { addDays, doneKey, formatDay, relativeDayLabel, startOfWeek, toKey, todayKey } from '../dates';
import { streak } from './stats';
import { useCategories } from '../categories';

export default function DonePage({ done, onRestore, onDelete }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [period, setPeriod] = useState('all');
  const [from, setFrom] = useState(() => toKey(addDays(new Date(), -30)));
  const [to, setTo] = useState(() => todayKey());
  const { list: categories, byId } = useCategories();
  const today = todayKey();
  const weekStartKey = toKey(startOfWeek(new Date()));

  const stats = useMemo(() => ({
    total: done.length,
    today: done.filter((t) => doneKey(t) === today).length,
    week: done.filter((t) => doneKey(t) >= weekStartKey).length,
    streak: streak(done),
  }), [done, today, weekStartKey]);

  const groups = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    const now = new Date();
    const range = {
      all: ['0000-00-00', '9999-99-99'],
      week: [weekStartKey, '9999-99-99'],
      month: [toKey(new Date(now.getFullYear(), now.getMonth(), 1)), '9999-99-99'],
      range: [from || '0000-00-00', to || '9999-99-99'],
    }[period];
    const list = done.filter((t) => {
      if (needle && !`${t.title} ${t.note}`.toLocaleLowerCase('az').includes(needle)) return false;
      if (cat && t.categoryId !== cat) return false;
      const k = doneKey(t);
      return k >= range[0] && k <= range[1];
    });
    const map = new Map();
    for (const t of list) {
      const k = doneKey(t);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(t);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [done, q, cat, period, from, to, weekStartKey]);
  const shown = groups.reduce((n, [, items]) => n + items.length, 0);
  const filtered = q || cat || period !== 'all';

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Tamamlananlar</h1>
          <p className="muted">Gördüyün işlər burada toplanır 💪</p>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><span>Bu gün</span><b>{stats.today}</b></div>
        <div className="stat"><span>Bu həftə</span><b>{stats.week}</b></div>
        <div className="stat"><span>Ümumi</span><b>{stats.total}</b></div>
        <div className="stat accent"><span>Ardıcıl gün</span><b>{stats.streak} 🔥</b></div>
      </div>

      {done.length > 0 && (
        <div className="done-filters">
          <input className="search" placeholder="Axtar…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="seg-small">
            {[['all', 'Hamısı'], ['week', 'Bu həftə'], ['month', 'Bu ay'], ['range', 'Aralıq']].map(([id, name]) => (
              <button key={id} type="button" className={period === id ? 'sel' : ''} onClick={() => setPeriod(id)}>{name}</button>
            ))}
          </div>
          {period === 'range' && (
            <div className="range-row">
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="Başlanğıc" />
              <span className="muted">—</span>
              <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="Son" />
            </div>
          )}
          <div className="filter-cats">
            <button className={`mini-cat${!cat ? ' sel' : ''}`} onClick={() => setCat(null)}>Bütün kateqoriyalar</button>
            {categories.map((c) => (
              <button key={c.id} className={`mini-cat${cat === c.id ? ' sel' : ''}`} onClick={() => setCat(cat === c.id ? null : c.id)}>
                <i className={`dot-c c-${c.color}`} />{c.emoji && `${c.emoji} `}{c.name}
              </button>
            ))}
          </div>
          {filtered && (
            <p className="muted small">
              {shown} nəticə · <button className="link-btn" onClick={() => { setQ(''); setCat(null); setPeriod('all'); }}>Filtrləri sıfırla</button>
            </p>
          )}
        </div>
      )}

      {done.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">✓</div>
          <h3>Hələ tamamlanan tapşırıq yoxdur</h3>
          <p className="muted">Həftə görünüşündə tapşırığın yanındakı dairəyə toxun — o buraya düşəcək.</p>
        </div>
      )}

      {groups.map(([key, items]) => (
        <section className="done-group" key={key}>
          <h3>{relativeDayLabel(key)} <span className="muted">· {items.length}</span></h3>
          <ul>
            {items.map((t) => (
              <li key={t.id} className="done-item">
                <button className="check checked" title="Geri qaytar" aria-label="Geri qaytar" onClick={() => onRestore(t)}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </button>
                <div className="done-main">
                  <div className="done-title">{t.title}</div>
                  <div className="done-sub">
                    {byId.get(t.categoryId) && <span className="done-cat"><i className={`dot-c c-${byId.get(t.categoryId).color}`} />{byId.get(t.categoryId).name}</span>}
                    Planlanmışdı: {formatDay(t.date)}
                    {t.date < doneKey(t) && <span className="tag late">gecikmə ilə</span>}
                    {t.date > doneKey(t) && <span className="tag early">vaxtından əvvəl</span>}
                  </div>
                </div>
                <div className="done-actions">
                  <button className="icon-btn sm" title="Geri qaytar" onClick={() => onRestore(t)}>↩</button>
                  <button className="icon-btn sm danger" title="Sil" onClick={() => onDelete(t)}>🗑</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {filtered && done.length > 0 && groups.length === 0 && <p className="muted center">Heç nə tapılmadı.</p>}
    </div>
  );
}
