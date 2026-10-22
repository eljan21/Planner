import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import {
  DAYS_SHORT, addDays, formatInstant, fromKey, fromLocalInput, getWeekStartsOn, toKey, toLocalInput,
} from '../dates';
import { useCategories } from '../categories';
import { PRIORITIES } from '../settings';
import { tr } from '../i18n';
import Folder from './Folder';

const repeats = () => [
  { id: 'none', name: tr('Yox', 'Never') },
  { id: 'daily', name: tr('Hər gün', 'Every day') },
  { id: 'weekly', name: tr('Həftənin günləri', 'Weekdays I pick') },
  { id: 'monthly', name: tr('Hər ay', 'Every month') },
];

// JS weekday numbers in display order (respects the week-start setting)
const weekdayOrder = () => (getWeekStartsOn() === 0 ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0]);
const shortOf = (jsDay) => DAYS_SHORT[(jsDay + 6) % 7];

export function describeRule(rule, date) {
  if (!rule) return tr('Təkrarlanır', 'Repeats');
  if (rule.freq === 'daily') return tr('Hər gün təkrarlanır', 'Repeats every day');
  const dom = fromKey(rule.startDate || date).getDate();
  if (rule.freq === 'monthly') return tr(`Hər ayın ${dom}-i təkrarlanır`, `Repeats on day ${dom} of every month`);
  const days = weekdayOrder().filter((d) => rule.days.includes(d)).map(shortOf).join(', ');
  return tr(`Hər ${days} təkrarlanır`, `Repeats every ${days}`);
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
  const [deadline, setDeadline] = useState(toLocalInput(task.deadline));
  const [reminders, setReminders] = useState(task.reminders || []);
  const [newReminder, setNewReminder] = useState('');
  const [tg, setTg] = useState(null);
  const subInput = useRef(null);

  useEffect(() => { api.telegram().then(setTg).catch(() => {}); }, []);

  // suggest a reminder an hour before a freshly set deadline
  const changeDeadline = (v) => {
    setDeadline(v);
    if (v && !newReminder && !reminders.length) {
      const hourBefore = new Date(new Date(v).getTime() - 3600e3);
      if (hourBefore > new Date()) setNewReminder(toLocalInput(hourBefore.toISOString()));
    }
  };
  const addReminder = () => {
    const at = fromLocalInput(newReminder);
    if (!at || reminders.some((r) => r.at === at)) return;
    setReminders((list) => [...list, { at, sent: false }].sort((a, b) => a.at.localeCompare(b.at)));
    setNewReminder('');
  };
  const reminderWarning = (() => {
    if (!newReminder) return '';
    const at = new Date(newReminder);
    if (at < new Date()) return tr('Bu vaxt artıq keçib.', 'That time has already passed.');
    if (deadline && at > new Date(deadline)) return tr('Bu vaxt deadline-dan sonradır.', 'That time is after the deadline.');
    return '';
  })();
  const color = byId.get(categoryId)?.color || 'gray';

  const save = () => {
    if (!title.trim() || !date) return;
    if (repeat === 'weekly' && !repeatDays.length) return;
    const pending = newSub.trim() ? [...subtasks, { id: newId(), text: newSub.trim(), done: false }] : subtasks;
    const remind = [...reminders.map((r) => r.at), ...(newReminder ? [fromLocalInput(newReminder)] : [])];
    onSave(
      {
        title: title.trim(), note, date, categoryId, time: time || null, priority, subtasks: pending,
        deadline: fromLocalInput(deadline), reminders: remind,
      },
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
    { label: tr('Bu gün', 'Today'), key: toKey(now) },
    { label: tr('Sabah', 'Tomorrow'), key: toKey(addDays(now, 1)) },
    { label: tr('+1 həftə', '+1 week'), key: toKey(addDays(new Date(`${date}T12:00`), 7)) },
  ];
  const subsDone = subtasks.filter((s) => s.done).length;

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal task-modal" role="dialog" aria-modal="true" aria-label={isNew ? tr('Yeni tapşırıq', 'New task') : tr('Tapşırığı redaktə et', 'Edit task')}>
        <div className={`modal-stripe p-${color}`} />
        <input
          className="modal-title"
          autoFocus={isNew}
          maxLength={200}
          placeholder={tr('Tapşırığın adı', 'Task name')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
        />
        <textarea
          className="modal-note"
          placeholder={tr('Qeyd əlavə et (istəyə bağlı)', 'Add a note (optional)')}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="field-grid">
          <div className="field">
            <label htmlFor="task-date">{tr('Tarix', 'Date')}</label>
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
            <label htmlFor="task-time">{tr('Vaxt', 'Time')}</label>
            <div className="date-row">
              <input id="task-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              {time && <button type="button" className="chip" onClick={() => setTime('')}>{tr('Sil', 'Clear')}</button>}
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-deadline">Deadline</label>
          <div className="date-row">
            <input id="task-deadline" type="datetime-local" value={deadline} onChange={(e) => changeDeadline(e.target.value)} />
            {deadline && <button type="button" className="chip" onClick={() => setDeadline('')}>{tr('Sil', 'Clear')}</button>}
          </div>
        </div>

        <div className="field">
          <label htmlFor="task-remind">{tr('Xatırlatma (Telegram və telefon)', 'Reminder (Telegram & phone)')}</label>
          {reminders.length > 0 && (
            <div className="reminder-list">
              {reminders.map((r) => (
                <span key={r.at} className={`reminder-chip${r.sent ? ' sent' : ''}`}>
                  🔔 {formatInstant(r.at)}{r.sent && tr(' · göndərildi', ' · sent')}
                  <button type="button" aria-label={tr('Xatırlatmanı sil', 'Remove reminder')} onClick={() => setReminders((list) => list.filter((x) => x.at !== r.at))}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="date-row">
            <input
              id="task-remind"
              type="datetime-local"
              value={newReminder}
              onChange={(e) => setNewReminder(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addReminder(); } }}
            />
            <button type="button" className="btn sm" onClick={addReminder} disabled={!newReminder}>{tr('+ Əlavə et', '+ Add')}</button>
          </div>
          {reminderWarning && <p className="warn-text small">{reminderWarning}</p>}
          {tg?.enabled && !tg.linked && <p className="muted small">{tr('Telefon bildirişləri və ya Telegram üçün Ayarlar → «Tətbiq və bildirişlər» / «Telegram» bölməsinə bax.', 'For phone notifications or Telegram, see Settings → «App & notifications» / «Telegram».')}</p>}
        </div>

        <div className="field">
          <label>{tr('Prioritet', 'Priority')}</label>
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
          <label>{tr('Kateqoriya', 'Category')}</label>
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
          <label>{tr('Alt-tapşırıqlar', 'Subtasks')} {subtasks.length > 0 && <span className="muted">· {subsDone}/{subtasks.length}</span>}</label>
          {subtasks.length > 0 && (
            <ul className="subtasks">
              {subtasks.map((s) => (
                <li key={s.id} className={s.done ? 'done' : ''}>
                  <button
                    type="button"
                    className={`check sm${s.done ? ' checked' : ''}`}
                    aria-label={s.done ? tr('Geri al', 'Undo') : tr('Tamamla', 'Complete')}
                    onClick={() => setSubtasks((list) => list.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                  </button>
                  <input
                    value={s.text}
                    maxLength={200}
                    onChange={(e) => setSubtasks((list) => list.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x)))}
                  />
                  <button type="button" className="sub-del" aria-label={tr('Sil', 'Remove')} onClick={() => setSubtasks((list) => list.filter((x) => x.id !== s.id))}>×</button>
                </li>
              ))}
            </ul>
          )}
          <div className="sub-add">
            <span>+</span>
            <input
              ref={subInput}
              placeholder={tr('Alt-tapşırıq əlavə et (Enter)', 'Add a subtask (Enter)')}
              value={newSub}
              maxLength={200}
              onChange={(e) => setNewSub(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }}
            />
          </div>
        </div>

        <div className="field">
          <label>{tr('Təkrarla', 'Repeat')}</label>
          {isRecurring ? (
            <div className="recur-box">
              <div className="recur-info">
                <span>🔁 {describeRule(rule, task.date)}</span>
                <button type="button" className="btn sm ghost danger" onClick={onStopRepeat}>{tr('Təkrarı dayandır', 'Stop repeating')}</button>
              </div>
              <label className="check-line">
                <input type="checkbox" checked={applyFuture} onChange={(e) => setApplyFuture(e.target.checked)} />
                {tr('Dəyişiklikləri gələcək təkrarlara da tətbiq et', 'Apply the changes to future repeats too')}
              </label>
            </div>
          ) : (
            <>
              <div className="seg-small">
                {repeats().map((r) => (
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
              {repeat === 'monthly' && <p className="muted small">{tr(`Hər ayın ${fromKey(date).getDate()}-i`, `On day ${fromKey(date).getDate()} of every month`)}</p>}
              {repeat !== 'none' && <p className="muted small">{tr('Növbəti 6 ay üçün avtomatik əlavə olunacaq.', 'Added automatically for the next 6 months.')}</p>}
            </>
          )}
        </div>

        <footer className="modal-foot">
          {!isNew && <button className="btn ghost danger" onClick={onDelete}>{tr('Sil', 'Delete')}</button>}
          <span className="spacer" />
          {!isNew && <button className="btn" onClick={onComplete}>✓ {tr('Tamamlandı', 'Done')}</button>}
          <button className="btn primary" onClick={save} disabled={!title.trim() || (repeat === 'weekly' && !repeatDays.length)}>
            {isNew ? tr('Əlavə et', 'Add') : tr('Yadda saxla', 'Save')}
          </button>
        </footer>
      </div>
    </div>
  );
}
