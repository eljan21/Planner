import { useState } from 'react';
import { useCategories } from '../categories';
import { PRIORITIES } from '../settings';

const stop = (e) => e.stopPropagation();

export default function TaskCard({ task, onOpen, onComplete, overlay = false }) {
  const [leaving, setLeaving] = useState(false);
  const { byId } = useCategories();
  const cat = byId.get(task.categoryId);
  const color = cat?.color || 'gray';
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => s.done).length;
  const hasMeta = task.time || task.priority > 0 || subs.length > 0 || task.recurId;

  const complete = (e) => {
    e.stopPropagation();
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onComplete(task), 380);
  };

  return (
    <div
      className={`card${leaving ? ' leaving' : ''}${overlay ? ' overlay' : ''}${task.priority === 3 ? ' urgent' : ''}`}
      onClick={() => onOpen?.(task)}
    >
      <button
        className={`check k-${color}`}
        aria-label="Tamamlandı kimi qeyd et"
        title="Tamamla"
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
              <span className={`meta prio prio-${task.priority}`} title={`Prioritet: ${PRIORITIES[task.priority].name}`}>
                <i />{PRIORITIES[task.priority].name}
              </span>
            )}
            {subs.length > 0 && (
              <span className={`meta subs${subsDone === subs.length ? ' all' : ''}`} title="Alt-tapşırıqlar">
                ☑ {subsDone}/{subs.length}
              </span>
            )}
            {task.recurId && <span className="meta recur" title="Təkrarlanan tapşırıq">🔁</span>}
          </div>
        )}
      </div>
      <i className={`cat-dot c-${color}`} title={cat ? `${cat.emoji ? `${cat.emoji} ` : ''}${cat.name}` : ''} />
    </div>
  );
}
