import { useEffect, useMemo, useRef, useState } from 'react';
import { useCategories } from '../categories';
import {
  MONTHS_SHORT, dayShort, formatDay, formatRange, fromKey, startOfWeek, toKey, todayKey, weekKeys, weekLabel,
} from '../dates';
import Folder from './Folder';
import WeekSwitcher from './WeekSwitcher';
import { IconBell, IconTrash } from './Icons';

const NOTE_COLORS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];

/** "#ailə", "#iş_planı" → tags (lower-case, unique) */
export function tagsOf(note) {
  const found = `${note.title} ${note.body}`.matchAll(/#([\p{L}\p{N}_-]+)/gu);
  return [...new Set([...found].map((m) => m[1].toLocaleLowerCase('az')))];
}

// SQLite CURRENT_TIMESTAMP is UTC without a zone marker
const parseDb = (s) => new Date(`${s.replace(' ', 'T')}Z`);
function stamp(s) {
  const d = parseDb(s);
  const hm = d.toLocaleTimeString('az', { hour: '2-digit', minute: '2-digit' });
  return toKey(d) === todayKey() ? hm : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${hm}`;
}

/** textarea that grows with its content */
function AutoText({ value, onChange, ...rest }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

function Composer({ onAdd, nextColor }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [color, setColor] = useState(nextColor);
  useEffect(() => setColor(nextColor), [nextColor]);

  const submit = () => {
    if (!title.trim() && !body.trim()) return;
    onAdd({ title: title.trim(), body, color });
    setTitle('');
    setBody('');
  };

  return (
    <div className="composer">
      <input
        className="composer-title"
        placeholder="Başlıq (istəyə bağlı)"
        value={title}
        maxLength={200}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
      />
      <AutoText
        className="composer-body"
        placeholder="Bu həftə üçün qeydini yaz…"
        value={body}
        onChange={setBody}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
      />
      <div className="composer-foot">
        <div className="color-dots" role="radiogroup" aria-label="Rəng">
          {NOTE_COLORS.map((c, i) => (
            <button
              key={c}
              role="radio"
              aria-checked={c === color}
              aria-label={`Rəng ${i + 1}`}
              className={`color-dot p-day${i}${c === color ? ' sel' : ''}`}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
        <span className="muted small hide-sm">⌘ + Enter</span>
        <button className="btn primary" onClick={submit} disabled={!title.trim() && !body.trim()}>Not əlavə et</button>
      </div>
    </div>
  );
}

function ToTaskForm({ weekStart, onCancel, onSubmit }) {
  const keys = weekKeys(weekStart);
  const today = todayKey();
  const [date, setDate] = useState(keys.includes(today) ? today : keys[0]);
  const { list } = useCategories();
  const [categoryId, setCategoryId] = useState(list[0]?.id);

  return (
    <div className="to-task">
      <div className="to-task-label">Hansı günə?</div>
      <div className="day-chips">
        {keys.map((k) => (
          <button
            key={k}
            className={`day-chip${k === date ? ' sel' : ''}${k === today ? ' is-today' : ''}`}
            onClick={() => setDate(k)}
          >
            <span>{dayShort(k)}</span>
            <b>{fromKey(k).getDate()}</b>
          </button>
        ))}
      </div>
      <div className="to-task-label">Kateqoriya</div>
      <div className="mini-cats">
        {list.map((c) => (
          <button key={c.id} className={`mini-cat${c.id === categoryId ? ' sel' : ''}`} onClick={() => setCategoryId(c.id)} title={c.name}>
            <Folder color={c.color} size={16} label={false} />
            {c.name}
          </button>
        ))}
      </div>
      <div className="to-task-foot">
        <button className="btn sm ghost" onClick={onCancel}>Ləğv et</button>
        <button className="btn sm primary" onClick={() => onSubmit({ date, categoryId })}>
          <IconBell /> {formatDay(date)} — əlavə et
        </button>
      </div>
    </div>
  );
}

function NoteCard({ note, task, weekStart, showWeek, onTag, onUpdate, onDelete, onToTask, onShowTask }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [converting, setConverting] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  // keep local edits in sync if the note changes from outside (e.g. undo)
  useEffect(() => { setTitle(note.title); setBody(note.body); }, [note.title, note.body]);

  const commit = () => {
    if (title.trim() !== note.title || body !== note.body) onUpdate(note.id, { title: title.trim(), body });
  };
  const canConvert = !!(title.trim() || body.trim());
  const tags = tagsOf({ title, body });

  return (
    <article className="note">
      <header className={`note-head p-day${note.color.slice(1)}`}>
        <input
          className="note-title"
          value={title}
          placeholder="Başlıqsız"
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        />
        <span className="note-time">{stamp(note.createdAt)}</span>
      </header>

      <AutoText
        className="note-body"
        value={body}
        placeholder="Qeyd yaz…"
        onChange={setBody}
        onBlur={commit}
      />

      {(tags.length > 0 || showWeek) && (
        <div className="note-tags">
          {showWeek && <span className="note-week">{formatRange(startOfWeek(fromKey(note.week)))}</span>}
          {tags.map((t) => <button key={t} className="tag-chip" onClick={() => onTag(t)}>#{t}</button>)}
        </div>
      )}

      {converting ? (
        <ToTaskForm
          weekStart={weekStart}
          onCancel={() => setConverting(false)}
          onSubmit={(data) => { commit(); onToTask(note, data); setConverting(false); }}
        />
      ) : (
        <footer className="note-foot">
          {task ? (
            <button className="linked-chip" onClick={() => onShowTask(task)} title="Tapşırığa bax">
              {task.done ? '✓ Tamamlanıb' : '⏰ Tapşırıq'} · {formatDay(task.date)}
            </button>
          ) : (
            <button className="remind-btn" onClick={() => setConverting(true)} disabled={!canConvert}>
              <IconBell /> Tapşırıq kimi əlavə et
            </button>
          )}
          <div className="note-tools">
            <div className="color-pop">
              <button className={`color-dot p-day${note.color.slice(1)}`} aria-label="Rəngi dəyiş" onClick={() => setColorOpen((o) => !o)} />
              {colorOpen && (
                <div className="color-pop-menu">
                  {NOTE_COLORS.map((c, i) => (
                    <button
                      key={c}
                      aria-label={`Rəng ${i + 1}`}
                      className={`color-dot p-day${i}${c === note.color ? ' sel' : ''}`}
                      onClick={() => { onUpdate(note.id, { color: c }); setColorOpen(false); }}
                    />
                  ))}
                </div>
              )}
            </div>
            <button className="icon-btn sm ghost-icon" aria-label="Notu sil" title="Sil" onClick={() => onDelete(note)}>
              <IconTrash />
            </button>
          </div>
        </footer>
      )}
    </article>
  );
}

export default function NotesPage({
  notes, tasks, done, weekStart, onShift, onGo, onToday, onAdd, onUpdate, onDelete, onToTask, onShowTask,
}) {
  const keys = weekKeys(weekStart);
  const week = keys[0];
  const [tag, setTag] = useState(null);

  // notes store the first day of their week; match by range so a week-start change keeps them visible
  const weekNotes = useMemo(() => notes.filter((n) => n.week >= keys[0] && n.week <= keys[6]), [notes, keys[0], keys[6]]);
  const list = useMemo(() => (tag ? notes.filter((n) => tagsOf(n).includes(tag)) : weekNotes), [tag, notes, weekNotes]);
  const allTags = useMemo(() => {
    const count = new Map();
    for (const n of notes) for (const t of tagsOf(n)) count.set(t, (count.get(t) || 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [notes]);
  const taskById = useMemo(() => {
    const m = new Map();
    for (const t of tasks) m.set(t.id, t);
    for (const t of done) m.set(t.id, t);
    return m;
  }, [tasks, done]);
  const nextColor = NOTE_COLORS[weekNotes.length % NOTE_COLORS.length];

  return (
    <div className="notes-page">
      <div className="panel-head">
        <div className="week-title">
          <h1>
            {tag ? `#${tag}` : 'Notlarım'}
            {tag && <button className="filter-chip" onClick={() => setTag(null)} title="Filtri sil">× filtr</button>}
          </h1>
          <span className="muted">{tag ? `Bütün həftələr · ${list.length} not` : `${weekLabel(weekStart)} · ${formatRange(weekStart)}`}</span>
        </div>
        {!tag && <WeekSwitcher weekStart={weekStart} onShift={onShift} onGo={onGo} onToday={onToday} />}
      </div>

      {allTags.length > 0 && (
        <div className="tag-bar">
          <span className="muted small">Etiketlər:</span>
          {allTags.map(([t, n]) => (
            <button key={t} className={`tag-chip${tag === t ? ' sel' : ''}`} onClick={() => setTag(tag === t ? null : t)}>
              #{t} <em>{n}</em>
            </button>
          ))}
        </div>
      )}

      {!tag && <Composer nextColor={nextColor} onAdd={(data) => onAdd({ ...data, week })} />}

      {list.length === 0 ? (
        <div className="empty-state compact">
          <div className="empty-icon">✎</div>
          <h3>Bu həftə üçün not yoxdur</h3>
          <p className="muted">Fikirlərini, planlarını yuxarıda yaz. <b>#etiket</b> yazsan, notlar etiketə görə qruplaşar. İstəsən notu bir düymə ilə tapşırığa çevirə bilərsən.</p>
        </div>
      ) : (
        <div className="notes-grid">
          {list.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              task={n.taskId ? taskById.get(n.taskId) : null}
              weekStart={tag ? startOfWeek(fromKey(n.week)) : weekStart}
              showWeek={!!tag}
              onTag={setTag}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onToTask={onToTask}
              onShowTask={onShowTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
