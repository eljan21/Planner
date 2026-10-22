import { useEffect } from 'react';
import {
  DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCategories } from '../categories';
import { useSettings } from '../settings';
import { portrait } from '../characters/figure';
import { PEOPLE, buddyFor, crewOf } from '../characters/people';
import {
  IconCalendar, IconChart, IconDone, IconEdit, IconLogout, IconNote, IconSearch, IconSettings,
} from './Icons';
import Avatar from './Avatar';
import { LangSwitch, tr } from '../i18n';

const IconFriends = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6" />
  </svg>
);

const NAV = [
  { id: 'week', az: 'Həftəm', en: 'My week', icon: IconCalendar, key: '1' },
  { id: 'notes', az: 'Notlar', en: 'Notes', icon: IconNote, key: '2' },
  { id: 'done', az: 'Bitənlər', en: 'Done', icon: IconDone, key: '3' },
  { id: 'reports', az: 'Hesabat', en: 'Reports', icon: IconChart, key: '4' },
  { id: 'friends', az: 'Dostlar', en: 'Friends', icon: IconFriends, key: '6' },
  { id: 'settings', az: 'Ayarlar', en: 'Settings', icon: IconSettings, key: '5' },
];

function CategoryItem({ c, active, count, onPick, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`menu-cat${active ? ' active' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button className="menu-cat-main" onClick={onPick} {...attributes} {...listeners} title={tr('Seç · sürüşdürərək sırala', 'Select · drag to reorder')}>
        <i className={`dot-c c-${c.color}`} />
        <span>{c.emoji && <b className="cat-emoji">{c.emoji}</b>}{c.name}</span>
        {count > 0 && <em>{count}</em>}
      </button>
      <button className="menu-cat-edit" onClick={onEdit} aria-label={tr(`${c.name} — redaktə et`, `Edit ${c.name}`)} title={tr('Redaktə et', 'Edit')}><IconEdit /></button>
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg-small">
      {options.map((o) => (
        <button key={String(o.id)} type="button" className={value === o.id ? 'sel' : ''} onClick={() => onChange(o.id)}>{o.name}</button>
      ))}
    </div>
  );
}

/** Slide-in menu: sections, category filter, character settings, sign out. */
export default function MenuDrawer({
  user, view, setView, doneCount, noteCount, requests, counts, filter, setFilter, onSearch,
  onEditCategory, onReorderCategories, onChange, onLogout, onClose,
}) {
  const { list: categories } = useCategories();
  const settings = useSettings();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (v) => { setView(v); onClose(); };
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = categories.map((c) => c.id);
    onReorderCategories(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };
  const crew = crewOf(settings);
  const today = buddyFor(new Date(), crew);

  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={tr('Menyu', 'Menu')}>
        <div className="drawer-user">
          <button className="drawer-profile" onClick={() => go('profile')} title="Profil">
            <Avatar src={user.picture} name={settings.name || user.name || ''} size={40} />
            <div><b>{settings.name || user.name}</b><small>{tr('Profilə bax', 'View profile')}</small></div>
          </button>
          <button className="icon-btn sm" onClick={onClose} aria-label={tr('Bağla', 'Close')}>×</button>
        </div>

        <nav className="drawer-nav">
          <button className="drawer-item" onClick={() => { onClose(); onSearch(); }}><IconSearch /><span>{tr('Axtar', 'Search')}</span><kbd>⌘K</kbd></button>
          {NAV.map((n) => (
            <button key={n.id} className={`drawer-item${view === n.id ? ' active' : ''}`} onClick={() => go(n.id)} title={`${tr(n.az, n.en)} (${n.key})`}>
              <n.icon /><span>{tr(n.az, n.en)}</span>
              {n.id === 'done' && doneCount > 0 && <em>{doneCount}</em>}
              {n.id === 'notes' && noteCount > 0 && <em>{noteCount}</em>}
              {n.id === 'friends' && requests > 0 && <em>{requests}</em>}
            </button>
          ))}
        </nav>

        <div className="drawer-head">
          <h3>{tr('Kateqoriyalar', 'Categories')}</h3>
          {filter && <button className="link-btn" onClick={() => setFilter(null)}>{tr('Hamısı', 'All')}</button>}
          <button className="head-add" onClick={() => onEditCategory({})} aria-label={tr('Yeni kateqoriya', 'New category')} title={tr('Yeni kateqoriya', 'New category')}>+</button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            {categories.map((c) => (
              <CategoryItem
                key={c.id}
                c={c}
                active={filter === c.id}
                count={counts[c.id]}
                onPick={() => { setFilter(filter === c.id ? null : c.id); go('week'); }}
                onEdit={() => onEditCategory(c)}
              />
            ))}
          </SortableContext>
        </DndContext>

        <div className="drawer-head">
          <h3>{crew.length > 1 ? tr('Dostların · hər gün biri', 'Your buddies · one a day') : tr('Dostun', 'Your buddy')}</h3>
          <button className="link-btn" onClick={() => go('settings')}>{tr('Dəyiş', 'Change')}</button>
        </div>
        <div className="lineup">
          {crew.map((id) => (
            <figure key={id} className={id === today ? 'now' : ''}>
              <div className="ring" dangerouslySetInnerHTML={{ __html: portrait(id) }} />
              <figcaption>{PEOPLE[id].name}</figcaption>
            </figure>
          ))}
        </div>
        <div className="drawer-row">
          <span>{tr('Animasiyalar', 'Animations')}</span>
          <Seg value={settings.anim} onChange={(anim) => onChange({ anim })} options={[{ id: 'full', name: tr('Hamısı', 'All') }, { id: 'calm', name: tr('Sakit', 'Calm') }, { id: 'off', name: tr('Söndür', 'Off') }]} />
        </div>
        <div className="drawer-row">
          <span>{tr('Alqış səsi', 'Applause sound')}</span>
          <Seg value={settings.sound} onChange={(sound) => onChange({ sound })} options={[{ id: true, name: tr('Açıq', 'On') }, { id: false, name: tr('Bağlı', 'Off') }]} />
        </div>
        <div className="drawer-row">
          <span>{tr('Dil', 'Language')}</span>
          <LangSwitch className="on-panel" />
        </div>

        <button className="drawer-item logout" onClick={onLogout}><IconLogout /><span>{tr('Çıxış', 'Sign out')}</span></button>
      </aside>
    </>
  );
}
