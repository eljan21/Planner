import {
  DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCategories } from '../categories';
import { useSettings } from '../settings';
import Folder from './Folder';
import {
  IconCalendar, IconChart, IconDone, IconEdit, IconLogout, IconMoon, IconNote, IconPlus, IconSearch, IconSettings, IconSun,
} from './Icons';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const NAV = [
  { id: 'week', label: 'Həftəm', short: 'Həftəm', icon: IconCalendar, key: '1' },
  { id: 'notes', label: 'Notlarım', short: 'Notlar', icon: IconNote, key: '2' },
  { id: 'done', label: 'Tamamlananlar', short: 'Bitənlər', icon: IconDone, key: '3' },
  { id: 'reports', label: 'Hesabat', short: 'Hesabat', icon: IconChart, key: '4' },
];

function CategoryItem({ c, active, count, onPick, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: c.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`folder-item${active ? ' active' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button className="folder-main" onClick={onPick} {...attributes} {...listeners} title="Seç · sürüşdürərək sırala">
        <Folder color={c.color} size={22} label={false} />
        <span>{c.emoji && <b className="cat-emoji">{c.emoji}</b>}{c.name}</span>
        {count > 0 && <em>{count}</em>}
      </button>
      <button className="folder-edit" onClick={onEdit} aria-label={`${c.name} — redaktə et`} title="Redaktə et">
        <IconEdit />
      </button>
    </div>
  );
}

export default function Sidebar({
  user, view, setView, doneCount, noteCount, counts, filter, setFilter, onNew, onSearch, onLogout,
  theme, onToggleTheme, onEditCategory, onReorderCategories,
}) {
  const { list: categories } = useCategories();
  const settings = useSettings();
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = categories.map((c) => c.id);
    onReorderCategories(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  };

  return (
    <aside className="sidebar">
      <div className="profile">
        <div className="profile-logo">
          {user.picture ? <img src={user.picture} alt="" referrerPolicy="no-referrer" /> : <span>✓</span>}
        </div>
        <div className="profile-text">
          <b>{settings.appName}</b>
          <span>{user.name}</span>
        </div>
        <button
          className="theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Gündüz rejimi' : 'Gecə rejimi'}
          title={theme === 'dark' ? 'Gündüz rejimi' : 'Gecə rejimi'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
        <button
          className={`theme-toggle mobile-only${view === 'settings' ? ' on' : ''}`}
          onClick={() => setView('settings')}
          aria-label="Ayarlar"
          title="Ayarlar"
        >
          <IconSettings />
        </button>
      </div>

      <button className="create-btn" onClick={onNew}>
        <IconPlus /> <span>Yeni tapşırıq</span> <kbd>N</kbd>
      </button>

      <nav className="side-nav">
        <button className="side-item" onClick={onSearch}>
          <IconSearch /> <span>Axtar</span> <kbd>{mod} K</kbd>
        </button>
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`side-item${view === n.id ? ' active' : ''}`}
            onClick={() => setView(n.id)}
            title={`${n.label} (${n.key})`}
          >
            <n.icon /> <span>{n.label}</span>
            {n.id === 'done' && doneCount > 0 && <em className="side-count">{doneCount}</em>}
            {n.id === 'notes' && noteCount > 0 && <em className="side-count soft">{noteCount}</em>}
          </button>
        ))}
      </nav>

      <div className="side-sep" />

      <div className="folders">
        <div className="folders-head">
          <span>Kateqoriyalar</span>
          {filter && <button className="link-btn" onClick={() => setFilter(null)}>Hamısı</button>}
          <button className="head-add" onClick={() => onEditCategory({})} aria-label="Yeni kateqoriya" title="Yeni kateqoriya">+</button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={categories.map((c) => c.id)} strategy={rectSortingStrategy}>
            {categories.map((c) => (
              <CategoryItem
                key={c.id}
                c={c}
                active={filter === c.id}
                count={counts[c.id]}
                onPick={() => { setFilter(filter === c.id ? null : c.id); setView('week'); }}
                onEdit={() => onEditCategory(c)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button className="folder-add" onClick={() => onEditCategory({})}>+ Yeni</button>
      </div>

      <div className="side-bottom">
        <div className="side-sep" />
        <button className={`side-item${view === 'settings' ? ' active' : ''}`} onClick={() => setView('settings')} title="Ayarlar (5)">
          <IconSettings /> <span>Ayarlar</span>
        </button>
        <button className="side-item" onClick={onLogout} title={user.email}>
          <IconLogout /> <span>Çıxış</span>
        </button>
      </div>

      {/* mobile bottom bar */}
      <nav className="bottom-bar" aria-label="Bölmələr">
        {NAV.map((n) => (
          <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => setView(n.id)}>
            <n.icon />
            <span>{n.short}</span>
            {n.id === 'done' && doneCount > 0 && <em className="badge">{doneCount}</em>}
          </button>
        ))}
        <button onClick={onSearch}><IconSearch /><span>Axtar</span></button>
      </nav>
    </aside>
  );
}
