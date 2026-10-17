import { useEffect, useRef, useState } from 'react';
import { DAYS_SHORT, addDays, fromKey, getWeekStartsOn, toKey } from '../dates';
import { useCategories } from '../categories';
import { PRIORITIES } from '../settings';
import Folder from './Folder';

const REPEATS = [
  { id: 'none', name: 'Yox' },
  { id: 'daily', name: 'Hər gün' },
  { id: 'weekly', name: 'Həftənin günləri' },
  { id: 'monthly', name: 'Hər ay' },
];

// JS weekday numbers in display order (respects the week-start setting)
const weekdayOrder = () => (getWeekStartsOn() === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0]);
const shortOf = (jsDay) => DAYS_SHORT[(jsDay + 6) % 7];

export function describeRule(rule, date) {
  if (!rule) return 'Təkrarlanır';
  if (rule.freq === 'daily') return 'Hər gün təkrarlanır';
  if (rule.freq === 'monthly') return `Hər ayın ${fromKey(rule.startDate || date).getDate()}-i təkrarlanır`;
  return `Hər ${weekdayOrder().filter((d) => rule.days.includes(d)).map(shortOf).join(', ')} təkrarlanır`;
}

let uid = 0;
const newId = () => `s${Date.now().toString(36)}${(uid++).toString(36)}`;

export default function TaskModal({ task, rule, onClose, onSave, onDelete, onComplete, onStopRepeat }) {
  const isNew = !task.id;
  const isRecurring = !!task.recurId;
  const { list, byId } = useCategories();
  const [title, setTitle] = useState(task.title || '');
  const [note, setNote] = useState(task.note || '');
  const [date, setDate] = useState(task.date);
  const [categoryId, setCategoryId] = useState(task.categoryId ?? list[0]?.id);
  const [time, setTime] = useState(task.time || '');
  const [priority, setPriority] = useState(task.priority || 0);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSub, setNewSub] = useState('');
  const [repeat, setRepeat] = useState('none');
  const [repeatDays, setRepeatDays] = useState(() => [fromKey(task.date).getDay()]);
  const [applyFuture, setApplyFuture] = useState(true);
  const subInput = useRef(null);
  const color = byId.get(categoryId)?.color || 'gray';

  const save = () => {
    if (!title.trim() || !date) return;
    if (repeat === 'weekly' && !repeatDays.length) return;
    const pending = newSub.trim() ? [...subtasks, { id: newId(), text: newSub.trim(), done: false }] : subtasks;
    onSave(
      { title: title.trim(), note, date, categoryId, time: time || null, priority, subtasks: pending },
      {
        repeat: !isRecurring && repeat !== 'none' ? { freq: repeat, days: repeat === 'weekly' ? repeatDays : [] } : null,
        applyFuture: isRecurring && applyFuture,
      },
    );
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const addSub = () => {
    const text = newSub.trim();
    if (!text) return;
    setSubtasks((s) => [...s, { id: newId(), text, done: false }]);
    setNewSub('');
    subInput.current?.focus();
  };

  const now = new Date();
  const quick = [
    { label: 'Bu gün', key: toKey(now) },
    { label: 'Sabah', key: toKey(addDays(now, 1)) },
    { label: '+1 həftə', key: toKey(addDays(new Date(`${date}T12:00`), 7)) },
  ];
  const subsDone = subtasks.filter((s) => s.done).length;

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal task-modal" role="dialog" aria-modal="true" aria-label={isNew ? 'Yeni tapşırıq' : 'Tapşırığı redaktə et'}>
        <div className={`modal-stripe p-${color}`} />
        <input
          className="modal-title"
          autoFocus={isNew}
          maxLength={200}
          placeholder="Tapşırığın adı"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
        <textarea
          className="modal-note"
          placeholder="Qeyd əlavə et (istəyə bağlı)"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="field-grid">
          <div className="field">
            <label htmlFor="task-date">Tarix</label>
            <div className="date-row">
              <input id="task-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              {quick.map((q) => (
                <button key={q.label} type="button" className={`chip${q.key === date ? ' sel' : ''}`} onClick={() => setDate(q.key)}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="task-time">Vaxt</label>
            <div className="date-row">
              <input id="task-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              {time && <button type="button" className="chip" onClick={() => setTime('')}>Sil</button>}
            </div>
          </div>
        </div>

        <div className="field">
          <label>Prioritet</label>
          <div className="seg-small">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`prio-opt prio-${p.id}${priority === p.id ? ' sel' : ''}`}
                onClick={() => setPriority(p.id)}
              >
                {p.id > 0 && <i />}{p.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Kateqoriya</label>
          <div className="cat-picker">
            {list.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`cat-chip${c.id === categoryId ? ' sel' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                <Folder color={c.color} size={20} label={false} />
                {c.emoji && <span>{c.emoji}</span>}
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Alt-tapşırıqlar {subtasks.length > 0 && <span className="muted">· {subsDone}/{subtasks.length}</span>}</label>
          {subtasks.length > 0 && (
            <ul className="subtasks">
              {subtasks.map((s) => (
                <li key={s.id} className={s.done ? 'done' : ''}>
                  <button
                    type="button"
                    className={`check sm${s.done ? ' checked' : ''}`}
                    aria-label={s.done ? 'Geri al' : 'Tamamla'}
                    onClick={() => setSubtasks((list) => list.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </button>
                  <input
                    value={s.text}
                    maxLength={200}
                    onChange={(e) => setSubtasks((list) => list.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                  />
                  <button type="button" className="sub-del" aria-label="Sil" onClick={() => setSubtasks((list) => list.filter((x) => x.id !== s.id))}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="sub-add">
            <span>+</span>
            <input
              ref={subInput}
              placeholder="Alt-tapşırıq əlavə et (Enter)"
              value={newSub}
              maxLength={200}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
            />
          </div>
        </div>

        <div className="field">
          <label>Təkrarla</label>
          {isRecurring ? (
            <div className="recur-box">
              <div className="recur-info">
                <span>🔁 {describeRule(rule, task.date)}</span>
                <button type="button" className="btn sm ghost danger" onClick={onStopRepeat}>Təkrarı dayandır</button>
              </div>
              <label className="check-line">
                <input type="checkbox" checked={applyFuture} onChange={(e) => setApplyFuture(e.target.checked)} />
                Dəyişiklikləri gələcək təkrarlara da tətbiq et
              </label>
            </div>
          ) : (
            <>
              <div className="seg-small">
                {REPEATS.map((r) => (
                  <button key={r.id} type="button" className={repeat === r.id ? 'sel' : ''} onClick={() => setRepeat(r.id)}>
                    {r.name}
                  </button>
                ))}
              </div>
              {repeat === 'weekly' && (
                <div className="weekday-pick">
                  {weekdayOrder().map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={repeatDays.includes(d) ? 'sel' : ''}
                      onClick={() => setRepeatDays((list) => (list.includes(d) ? list.filter((x) => x !== d) : [...list, d]))}
                    >
                      {shortOf(d)}
                    </button>
                  ))}
                </div>
              )}
              {repeat === 'monthly' && <p className="muted small">Hər ayın {fromKey(date).getDate()}-i</p>}
              {repeat !== 'none' && <p className="muted small">Növbəti 6 ay üçün avtomatik əlavə olunacaq.</p>}
            </>
          )}
        </div>

        <footer className="modal-foot">
          {!isNew && <button className="btn ghost danger" onClick={onDelete}>Sil</button>}
          <span className="spacer" />
          {!isNew && <button className="btn" onClick={onComplete}>✓ Tamamlandı</button>}
          <button className="btn primary" onClick={save} disabled={!title.trim() || (repeat === 'weekly' && !repeatDays.length)}>
            {isNew ? 'Əlavə et' : 'Yadda saxla'}
          </button>
        </footer>
      </div>
    </div>
  );
}
