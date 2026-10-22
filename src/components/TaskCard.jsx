import { useState } from 'react';
import { useCategories } from '../categories';
import { PRIORITIES, useSettings } from '../settings';
import { confetti } from '../characters/bus';
import { formatInstant } from '../dates';
import { tr } from '../i18n';

const stop = (e) => e.stopPropagation();

export default function TaskCard({ task, onOpen, onComplete, overlay = false }) {
  const [leaving, setLeaving] = useState(false);
  const { byId } = useCategories();
  const { anim } = useSettings();
  const cat = byId.get(task.categoryId);
  const color = cat?.color || 'gray';
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => s.done).length;
  const pendingReminders = (task.reminders || []).filter((r) => !r.sent).length;
  const hasMeta = !!(task.time || task.priority > 0 || subs.length > 0 || task.recurId || task.deadline || pendingReminders);
  const hoursLeft = task.deadline ? (new Date(task.deadline) - Date.now()) / 3600e3 : null;
  const deadlineState = hoursLeft === null ? '' : hoursLeft < 0 ? ' late' : hoursLeft < 24 ? ' soon' : '';

  const complete = (e) => {
    e.stopPropagation();
    if (leaving) return;
    setLeaving(true);
    if (anim === 'full') {
      const r = e.currentTarget.getBoundingClientRect();
      confetti(r.left + r.width / 2, r.top + r.height / 2);
    }
    setTimeout(() => onComplete(task), 520);
  };

  return (
    <div
      className={`card c-${color}${leaving ? ' leaving' : ''}${overlay ? ' overlay' : ''}${task.priority === 3 ? ' urgent' : ''}`}
      onClick={() => onOpen?.(task)}
    >
      <button
        className={`check k-${color}`}
        aria-label={tr('Tamamlandı kimi qeyd et', 'Mark as done')}
        title={tr('Tamamla', 'Complete')}
        onMouseDown={stop}
        onTouchStart={stop}
        onPointerDown={stop}
        onKeyDown={stop}
        onClick={complete}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
      <div className="card-main">
        <div className="card-title">{task.title}</div>
        {task.note && <div className="card-note">{task.note}</div>}
        {hasMeta && (
          <div className="card-meta">
            {task.time && <span className="meta time">{task.time}</span>}
            {task.priority > 0 && (
              <span className={`meta prio prio-${task.priority}`} title={`${tr('Prioritet', 'Priority')}: ${PRIORITIES[task.priority].name}`}>
                <i />{PRIORITIES[task.priority].name}
              </span>
            )}
            {subs.length > 0 && (
              <span className={`meta subs${subsDone === subs.length ? ' all' : ''}`} title={tr('Alt-tapşırıqlar', 'Subtasks')}>
                ☑ {subsDone}/{subs.length}
              </span>
            )}
            {task.recurId && <span className="meta recur" title={tr('Təkrarlanan tapşırıq', 'Repeating task')}>🔁</span>}
            {task.deadline && (
              <span className={`meta deadline${deadlineState}`} title={hoursLeft < 0 ? tr('Deadline keçib', 'Deadline passed') : 'Deadline'}>⏳ {formatInstant(task.deadline)}</span>
            )}
            {pendingReminders > 0 && <span className="meta" title={tr('Xatırlatma', 'Reminder')}>🔔{pendingReminders > 1 ? ` ${pendingReminders}` : ''}</span>}
          </div>
        )}
      </div>
      <i className={`cat-dot c-${color}`} title={cat ? `${cat.emoji ? `${cat.emoji} ` : ''}${cat.name}` : ''} />
    </div>
  );
}
