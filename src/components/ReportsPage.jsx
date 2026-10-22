import { useMemo, useState } from 'react';
import { api } from '../api';
import {
  MONTHS_SHORT, addDays, dayShort, doneKey, formatRange, startOfWeek, todayKey, toKey, weekKeys, weekLabel,
} from '../dates';
import { isProjection } from '../settings';
import { useCategories } from '../categories';
import Folder from './Folder';
import { streak } from './stats';
import { tr } from '../i18n';

function Bars({ data, max }) {
  return (
    <div className="bars">
      {data.map((d) => (
        <div className="bar-col" key={d.key} title={d.title}>
          <div className="bar-track">
            {d.planned != null && (
              <div className="bar planned" style={{ height: `${max ? (d.planned / max) * 100 : 0}%` }} />
            )}
            <div className="bar done" style={{ height: `${max ? (d.value / max) * 100 : 0}%` }} />
          </div>
          <span className="bar-val">{d.value}</span>
          <span className="bar-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function Download({ href, children }) {
  return (
    <a className="btn primary download" href={href} download>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 20h14" /></svg>
      {children}
    </a>
  );
}

export default function ReportsPage({ tasks, done }) {
  const { list: categories } = useCategories();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const today = todayKey();
  // everything that really happened or is planned; future copies of recurring tasks are left out
  const all = useMemo(() => [...tasks.filter((t) => !isProjection(t, today)), ...done], [tasks, done, today]);
  const everything = useMemo(() => [...tasks, ...done], [tasks, done]);

  // ---- weekly (by planned date) ----
  const week = useMemo(() => {
    const keys = weekKeys(weekStart);
    const inWeek = everything.filter((t) => t.date >= keys[0] && t.date <= keys[6]);
    const doneN = inWeek.filter((t) => t.done).length;
    const overdue = inWeek.filter((t) => !t.done && t.date < today).length;
    const perDay = keys.map((k) => {
      const dayTasks = inWeek.filter((t) => t.date === k);
      const v = dayTasks.filter((t) => t.done).length;
      return { key: k, label: dayShort(k), value: v, planned: dayTasks.length, title: `${v} / ${dayTasks.length}` };
    });
    return {
      keys, total: inWeek.length, done: doneN, pending: inWeek.length - doneN, overdue, perDay,
      rate: inWeek.length ? Math.round((doneN / inWeek.length) * 100) : 0,
      max: Math.max(1, ...perDay.map((d) => d.planned)),
    };
  }, [everything, weekStart, today]);

  // ---- all time ----
  const allTime = useMemo(() => {
    const doneN = done.length;
    const byDay = new Map();
    for (const t of done) byDay.set(doneKey(t), (byDay.get(doneKey(t)) || 0) + 1);
    let best = null;
    for (const [k, v] of byDay) if (!best || v > best.v) best = { k, v };

    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const prefix = toKey(d).slice(0, 7);
      const v = done.filter((t) => doneKey(t).startsWith(prefix)).length;
      return { key: prefix, label: MONTHS_SHORT[d.getMonth()], value: v, title: tr(`${v} tamamlanıb`, `${v} done`) };
    });

    const first = all.length ? all.reduce((m, t) => (t.date < m ? t.date : m), all[0].date) : null;
    const weeks = first ? Math.max(1, Math.ceil((startOfWeek(new Date()) - startOfWeek(new Date(`${first}T12:00`))) / (7 * 864e5)) + 1) : 1;

    const colors = categories.map((c) => {
      const list = all.filter((t) => t.categoryId === c.id);
      return { ...c, total: list.length, done: list.filter((t) => t.done).length };
    }).filter((c) => c.total > 0);

    return {
      total: all.length, done: doneN, pending: all.length - doneN,
      rate: all.length ? Math.round((doneN / all.length) * 100) : 0,
      perWeek: (doneN / weeks).toFixed(1),
      best, streak: streak(done), months,
      maxMonth: Math.max(1, ...months.map((m) => m.value)),
      colors,
    };
  }, [all, done, categories]);

  // ---- custom range ----
  const [from, setFrom] = useState(() => toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [to, setTo] = useState(today);
  const [cats, setCats] = useState([]);
  const custom = useMemo(() => {
    const list = all.filter((t) => (!from || t.date >= from) && (!to || t.date <= to)
      && (!cats.length || cats.includes(t.categoryId)));
    const d = list.filter((t) => t.done).length;
    return { total: list.length, done: d, rate: list.length ? Math.round((d / list.length) * 100) : 0 };
  }, [all, from, to, cats]);
  const presets = [
    [tr('Bu ay', 'This month'), toKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), today],
    [tr('Son 30 gün', 'Last 30 days'), toKey(addDays(new Date(), -29)), today],
    [tr('Son 3 ay', 'Last 3 months'), toKey(addDays(new Date(), -90)), today],
    [tr('Bu il', 'This year'), `${new Date().getFullYear()}-01-01`, today],
  ];
  const customHref = api.reportUrl({ scope: 'custom', from, to, categories: cats.join(','), today });

  const weekHref = api.reportUrl({ scope: 'week', from: week.keys[0], to: week.keys[6], today });
  const allHref = api.reportUrl({ scope: 'all', today });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{tr('Hesabat', 'Reports')}</h1>
          <p className="muted">{tr('Həftəlik və ümumi nəticələr. Excel faylı kimi yüklə.', 'Weekly and all-time results. Download them as Excel.')}</p>
        </div>
      </div>

      {/* ---------- weekly ---------- */}
      <section className="report-card">
        <div className="report-head">
          <div>
            <h2>{tr('Həftəlik hesabat', 'Weekly report')}</h2>
            <div className="week-picker">
              <button className="icon-btn sm" aria-label={tr('Əvvəlki həftə', 'Previous week')} onClick={() => setWeekStart((w) => addDays(w, -7))}>‹</button>
              <span><b>{weekLabel(weekStart)}</b> · {formatRange(weekStart)}</span>
              <button className="icon-btn sm" aria-label={tr('Növbəti həftə', 'Next week')} onClick={() => setWeekStart((w) => addDays(w, 7))}>›</button>
            </div>
          </div>
          <Download href={weekHref}>{tr('Həftəlik Excel', 'Weekly Excel')}</Download>
        </div>

        <div className="stats">
          <div className="stat"><span>{tr('Planlanan', 'Planned')}</span><b>{week.total}</b></div>
          <div className="stat"><span>{tr('Tamamlanan', 'Done')}</span><b className="ok">{week.done}</b></div>
          <div className="stat"><span>{tr('Qalan', 'Left')}</span><b>{week.pending}</b>{week.overdue > 0 && <small className="warn">{week.overdue} {tr('gecikib', 'overdue')}</small>}</div>
          <div className="stat accent"><span>{tr('Nəticə', 'Score')}</span><b>{week.rate}%</b></div>
        </div>

        <div className="chart-card">
          <div className="chart-legend">
            <span><i className="lg planned" /> {tr('Planlanan', 'Planned')}</span>
            <span><i className="lg done" /> {tr('Tamamlanan', 'Done')}</span>
          </div>
          <Bars data={week.perDay} max={week.max} />
        </div>
      </section>

      {/* ---------- all time ---------- */}
      <section className="report-card">
        <div className="report-head">
          <div>
            <h2>{tr('Ümumi hesabat', 'All-time report')} <span className="muted">{tr('(bütün dövr)', '(all time)')}</span></h2>
            <p className="muted small">{tr('Başlanğıcdan bu günə qədər bütün tapşırıqlar', 'Every task from the start until today')}</p>
          </div>
          <Download href={allHref}>{tr('Ümumi Excel', 'All-time Excel')}</Download>
        </div>

        <div className="stats">
          <div className="stat"><span>{tr('Ümumi tapşırıq', 'Total tasks')}</span><b>{allTime.total}</b></div>
          <div className="stat"><span>{tr('Tamamlanan', 'Done')}</span><b className="ok">{allTime.done}</b></div>
          <div className="stat"><span>{tr('Həftədə orta', 'Weekly average')}</span><b>{allTime.perWeek}</b></div>
          <div className="stat accent"><span>{tr('Tamamlanma', 'Completion')}</span><b>{allTime.rate}%</b></div>
        </div>

        <div className="report-grid">
          <div className="chart-card">
            <h3>{tr('Son 6 ay — tamamlanan', 'Last 6 months — done')}</h3>
            <Bars data={allTime.months} max={allTime.maxMonth} />
          </div>
          <div className="chart-card">
            <h3>{tr('Qısa faktlar', 'Quick facts')}</h3>
            <div className="mini-facts">
              <div><span>{tr('Ən məhsuldar gün', 'Most productive day')}</span><b>{allTime.best ? `${allTime.best.k.split('-').reverse().join('.')} · ${allTime.best.v} ${tr('tapşırıq', allTime.best.v === 1 ? 'task' : 'tasks')}` : '—'}</b></div>
              <div><span>{tr('Ardıcıl gün', 'Day streak')}</span><b>{allTime.streak} 🔥</b></div>
              <div><span>{tr('Gözləyən tapşırıq', 'Pending tasks')}</span><b>{allTime.pending}</b></div>
            </div>
          </div>
        </div>

        <div className="folders-section">
          <h3>{tr('Kateqoriyalar üzrə', 'By category')}</h3>
          {allTime.colors.length === 0 && <p className="muted small">{tr('Hələ məlumat yoxdur.', 'No data yet.')}</p>}
          <div className="folder-grid">
            {allTime.colors.map((c) => (
              <div className="folder-tile" key={c.id}>
                <Folder color={c.color} name={c.name} emoji={c.emoji} size={64} />
                <b>{c.name}</b>
                <span className="muted small">{c.done}/{c.total} {tr('tamamlanıb', 'done')}</span>
                <div className="cl-track"><div className={`cl-fill c-${c.color}`} style={{ width: `${(c.done / c.total) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- custom ---------- */}
      <section className="report-card">
        <div className="report-head">
          <div>
            <h2>{tr('Fərdi hesabat', 'Custom report')}</h2>
            <p className="muted small">{tr('İstədiyin tarix aralığını və kateqoriyaları seç', 'Pick any date range and categories')}</p>
          </div>
          <Download href={customHref}>{tr('Fərdi Excel', 'Custom Excel')}</Download>
        </div>

        <div className="custom-grid">
          <div className="field">
            <label>{tr('Tarix aralığı', 'Date range')}</label>
            <div className="range-row">
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} aria-label={tr('Başlanğıc', 'From')} />
              <span className="muted">—</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-label={tr('Son', 'To')} />
            </div>
            <div className="date-row">
              {presets.map(([label, a, b]) => (
                <button key={label} type="button" className={`chip${from === a && to === b ? ' sel' : ''}`} onClick={() => { setFrom(a); setTo(b); }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>{tr('Kateqoriyalar', 'Categories')} {cats.length === 0 && <span className="muted">· {tr('hamısı', 'all')}</span>}</label>
            <div className="filter-cats">
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`mini-cat${cats.includes(c.id) ? ' sel' : ''}`}
                  onClick={() => setCats((l) => (l.includes(c.id) ? l.filter((x) => x !== c.id) : [...l, c.id]))}
                >
                  <i className={`dot-c c-${c.color}`} />{c.emoji && `${c.emoji} `}{c.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stats three">
          <div className="stat"><span>{tr('Tapşırıq', 'Tasks')}</span><b>{custom.total}</b></div>
          <div className="stat"><span>{tr('Tamamlanan', 'Done')}</span><b className="ok">{custom.done}</b></div>
          <div className="stat accent"><span>{tr('Nəticə', 'Score')}</span><b>{custom.rate}%</b></div>
        </div>
      </section>
    </div>
  );
}
