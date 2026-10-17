import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor,
  closestCenter, pointerWithin, useDroppable, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { IconChevron } from './Icons';
import { DAYS, MONTHS_SHORT, dayShort, fromKey, todayKey, weekKeys } from '../dates';
import { dayColorClass, sortTasks, useSettings } from '../settings';

const tid = (id) => `t${id}`;
const parseTid = (s) => Number(String(s).slice(1));
const byPos = (a, b) => a.position - b.position;

function SortableTask({ task, onOpen, onComplete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tid(task.id) });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`sortable${isDragging ? ' ghost' : ''}`}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} onOpen={onOpen} onComplete={onComplete} />
    </div>
  );
}

function QuickAdd({ date, category, onAdd }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');

  if (!open) {
    return (
      <button className="add-row" onClick={() => setOpen(true)} data-add={date}>
        <span>Tapşırıq əlavə et</span>
        <i className="lime-btn" aria-hidden="true">+</i>
      </button>
    );
  }
  return (
    <form
      className="quick-add"
      onSubmit={(e) => {
        e.preventDefault();
        const title = value.trim();
        if (title) { onAdd({ title, date, categoryId: category }); setValue(''); }
      }}
    >
      <input
        autoFocus
        value={value}
        maxLength={200}
        placeholder="Nə etmək lazımdır? (Enter)"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => { if (!value.trim()) setOpen(false); }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setValue(''); setOpen(false); } }}
      />
    </form>
  );
}

function DayColumn({ date, tasks, doneCount, highlight, category, onAdd, onOpen, onComplete }) {
  const { setNodeRef } = useDroppable({ id: `day:${date}` });
  const settings = useSettings();
  const d = fromKey(date);
  const today = todayKey();
  const isToday = date === today;
  const isPast = date < today;
  const idx = (d.getDay() + 6) % 7;

  return (
    <section
      ref={setNodeRef}
      id={`day-${date}`}
      className={`day${isToday ? ' today' : ''}${isPast ? ' past' : ''}${highlight ? ' over' : ''}`}
    >
      <div className="day-inner">
        <header className={`day-head ${dayColorClass(settings, idx)}`}>
          <span className="day-name">{DAYS[idx]}</span>
          <span className="day-date">
            {isToday && <em className="today-dot" title="Bu gün" />}
            {d.getDate()} {MONTHS_SHORT[d.getMonth()]}
          </span>
        </header>
        <div className="day-body">
          <SortableContext items={tasks.map((t) => tid(t.id))} strategy={verticalListSortingStrategy}>
            {tasks.map((t) => (
              <SortableTask key={t.id} task={t} onOpen={onOpen} onComplete={onComplete} />
            ))}
          </SortableContext>
          {tasks.length === 0 && <div className="empty-day">{isPast ? 'Boş gün' : 'Sərbəst gün ✨'}</div>}
        </div>
        <footer className="day-foot">
          {doneCount > 0 && <span className="done-count" title="Bu gün üçün tamamlanan">✓ {doneCount} tamamlanıb</span>}
          <QuickAdd date={date} category={category} onAdd={onAdd} />
        </footer>
      </div>
    </section>
  );
}

function WeekZone({ side, visible, over }) {
  return (
    <div data-zone={side} className={`week-zone ${side}${visible ? ' visible' : ''}${over ? ' over' : ''}`}>
      <span>{side === 'prev' ? '← Əvvəlki həftə' : 'Növbəti həftə →'}</span>
    </div>
  );
}

/** which week zone (if any) is under the given screen point */
function zoneAt(x, y) {
  for (const el of document.querySelectorAll('[data-zone]')) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.zone;
  }
  return null;
}

export default function Board({
  tasks: allTasks, setTasks, done, filter, defaultCategory, weekStart, slide, onSwipe, onAdd, onOpen, onComplete, onReorder, onMoveWeek,
}) {
  const settings = useSettings();
  const allDays = useMemo(() => weekKeys(weekStart), [weekStart]);
  const [activeId, setActiveId] = useState(null);
  const snapshot = useRef(null);
  const tasks = useMemo(
    () => (filter ? allTasks.filter((t) => t.categoryId === filter) : allTasks),
    [allTasks, filter],
  );
  const tasksRef = useRef(tasks); // visible tasks — used for drop calculations
  tasksRef.current = tasks;
  const allRef = useRef(allTasks); // full list — used for snapshot / revert
  allRef.current = allTasks;

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const byDate = useMemo(() => {
    const m = Object.fromEntries(allDays.map((d) => [d, []]));
    for (const t of tasks) if (m[t.date]) m[t.date].push(t);
    for (const list of Object.values(m)) sortTasks(list, settings.sort);
    return m;
  }, [tasks, allDays, settings.sort]);

  // hidden weekdays (e.g. weekends) only disappear while they have nothing planned
  const hidden = settings.hiddenDays || [];
  const days = allDays.filter((d) => !hidden.includes(fromKey(d).getDay()) || byDate[d].length > 0);

  const doneByDate = useMemo(() => {
    const m = {};
    for (const t of done) if (!filter || t.categoryId === filter) m[t.date] = (m[t.date] || 0) + 1;
    return m;
  }, [done, filter]);

  // Week zones first, then the closest card inside the day under the pointer, else the day itself.
  const collision = useCallback((args) => {
    const hits = pointerWithin(args);
    const dayHit = hits.find((h) => String(h.id).startsWith('day:'));
    if (!dayHit) return [];
    const date = String(dayHit.id).slice(4);
    const ids = new Set(tasksRef.current.filter((t) => t.date === date).map((t) => tid(t.id)));
    const items = args.droppableContainers.filter((c) => ids.has(String(c.id)));
    if (items.length) {
      const near = closestCenter({ ...args, droppableContainers: items });
      if (near.length) return near;
    }
    return [dayHit];
  }, []);

  const activeTask = activeId ? tasks.find((t) => tid(t.id) === activeId) : null;

  // Track the real pointer while dragging so the fixed week zones work regardless of board scroll.
  const [zone, setZone] = useState(null);
  const zoneRef = useRef(null);
  useEffect(() => {
    if (!activeId) return undefined;
    const onMove = (e) => {
      const pt = e.touches?.[0] ?? e;
      const z = zoneAt(pt.clientX, pt.clientY);
      if (z !== zoneRef.current) { zoneRef.current = z; setZone(z); }
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      zoneRef.current = null;
      setZone(null);
    };
  }, [activeId]);

  const handleDragStart = ({ active }) => {
    snapshot.current = allRef.current;
    setActiveId(active.id);
    navigator.vibrate?.(10);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || zoneRef.current) return;
    const overId = String(over.id);
    const aid = parseTid(active.id);
    const cur = tasksRef.current;
    const at = cur.find((t) => t.id === aid);
    if (!at) return;

    let overDate;
    let overTask = null;
    if (overId.startsWith('day:')) overDate = overId.slice(4);
    else {
      overTask = cur.find((t) => t.id === parseTid(overId));
      overDate = overTask?.date;
    }
    if (!overDate || overDate === at.date) return;

    const col = cur.filter((t) => t.date === overDate && t.id !== aid).sort(byPos);
    let pos;
    if (overTask) {
      const idx = col.findIndex((t) => t.id === overTask.id);
      const rect = active.rect.current.translated;
      const below = rect && rect.top > over.rect.top + over.rect.height / 2;
      const i = idx + (below ? 1 : 0);
      const prev = col[i - 1];
      const next = col[i];
      pos = prev && next ? (prev.position + next.position) / 2 : prev ? prev.position + 1 : next ? next.position - 1 : 0;
    } else {
      pos = col.length ? col[col.length - 1].position + 1 : 0;
    }
    setTasks((ts) => ts.map((t) => (t.id === aid ? { ...t, date: overDate, position: pos } : t)));
  };

  const handleDragEnd = ({ active, over }) => {
    const droppedZone = zoneRef.current;
    setActiveId(null);
    const snap = snapshot.current;
    snapshot.current = null;
    if (!snap) return;

    const aid = parseTid(active.id);
    const original = snap.find((t) => t.id === aid);
    if (droppedZone) {
      setTasks(snap);
      onMoveWeek(original, droppedZone === 'next' ? 7 : -7);
      return;
    }
    if (!over) { setTasks(snap); return; }
    const overId = String(over.id);

    const cur = tasksRef.current;
    const at = cur.find((t) => t.id === aid);
    // with automatic sorting (time / priority) the order inside a day is not manual
    if (settings.sort !== 'manual' && original.date === at.date) { setTasks(snap); return; }
    let ids = cur.filter((t) => t.date === at.date).sort(byPos).map((t) => t.id);
    if (!overId.startsWith('day:')) {
      const from = ids.indexOf(aid);
      const to = ids.indexOf(parseTid(overId));
      if (from !== -1 && to !== -1 && from !== to) ids = arrayMove(ids, from, to);
    }
    const before = snap.filter((t) => t.date === at.date && (!filter || t.categoryId === filter)).sort(byPos).map((t) => t.id);
    if (original.date === at.date && before.join() === ids.join()) { setTasks(snap); return; }
    onReorder(at.date, ids);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    if (snapshot.current) setTasks(snapshot.current);
    snapshot.current = null;
  };

  // horizontal swipe (touch) changes week
  const touch = useRef(null);
  const onTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, time: Date.now() };
  };
  const onTouchEnd = (e) => {
    const start = touch.current;
    touch.current = null;
    if (!start || activeId) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && Date.now() - start.time < 600) {
      onSwipe(dx < 0 ? 1 : -1);
    }
  };

  const scroller = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const todayEl = el.querySelector('.day.today');
    const horizontal = el.scrollWidth > el.clientWidth + 4;
    if (horizontal) el.scrollLeft = todayEl ? Math.max(0, todayEl.offsetLeft - 8) : 0;
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [weekStart, updateEdges, days.length]);
  const scrollBy = (dir) => {
    const el = scroller.current;
    const col = el?.querySelector('.day');
    if (el && col) el.scrollBy({ left: dir * (col.offsetWidth + 16) * 2, behavior: 'smooth' });
  };

  const today = todayKey();
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <nav className="day-strip" aria-label="Günlər" style={{ gridTemplateColumns: `repeat(${days.length}, 1fr)` }}>
        {days.map((d) => (
          <button
            key={d}
            className={`strip-day${d === today ? ' today' : ''}`}
            onClick={() => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            <span>{dayShort(d)}</span>
            <b>{fromKey(d).getDate()}</b>
            <i className={byDate[d].length ? 'dot' : 'dot empty'} />
          </button>
        ))}
      </nav>

      <div className={`board-wrap${edges.left ? ' fade-l' : ''}${edges.right ? ' fade-r' : ''}`}>
      {edges.left && (
        <button className="scroll-arrow left" aria-label="Sola" onClick={() => scrollBy(-1)}><IconChevron dir="left" /></button>
      )}
      <div
        key={weekStart.getTime()}
        ref={scroller}
        onScroll={updateEdges}
        className={`board${slide ? ` slide-${slide}` : ''}${activeId ? ' dragging' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {days.map((d) => (
          <DayColumn
            key={d}
            date={d}
            tasks={byDate[d]}
            doneCount={doneByDate[d] || 0}
            highlight={activeTask?.date === d}
            category={filter ?? defaultCategory}
            onAdd={onAdd}
            onOpen={onOpen}
            onComplete={onComplete}
          />
        ))}
      </div>
      {edges.right && (
        <button className="scroll-arrow right" aria-label="Sağa" onClick={() => scrollBy(1)}><IconChevron /></button>
      )}
      </div>

      <WeekZone side="prev" visible={!!activeId} over={zone === 'prev'} />
      <WeekZone side="next" visible={!!activeId} over={zone === 'next'} />

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }}>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}
