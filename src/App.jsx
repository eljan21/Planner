import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import SearchModal from './components/SearchModal';
import { localAppearance, resolveTheme, useAppearance } from './theme';
import { DEFAULT_SETTINGS, SettingsContext, isProjection } from './settings';
import SettingsPage from './components/SettingsPage';
import { CategoriesContext } from './categories';
import CategoryModal from './components/CategoryModal';
import Board from './components/Board';
import DonePage from './components/DonePage';
import ReportsPage from './components/ReportsPage';
import NotesPage from './components/NotesPage';
import WeekSwitcher from './components/WeekSwitcher';
import TaskModal from './components/TaskModal';
import Toast from './components/Toast';
import {
  addDays, formatDay, formatRange, fromKey, setWeekStartsOn, startOfWeek, toKey, todayKey, weekKeys, weekLabel,
} from './dates';

const HINT_KEY = 'tp_hint_dismissed';
const readHint = () => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } };
const writeHint = () => { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ } };

export default function App() {
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [tasks, setTasks] = useState([]);
  const [done, setDone] = useState([]);
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingCat, setEditingCat] = useState(null);
  const [view, setView] = useState('week');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slide, setSlide] = useState(null);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState(null);
  const [hintHidden, setHintHidden] = useState(readHint);
  const [filter, setFilter] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [localLook, setLocalLook] = useState(localAppearance);
  const [rules, setRules] = useState([]);

  // ---------- settings & appearance ----------
  const look = settings ? { theme: settings.theme, accent: settings.accent, density: settings.density } : localLook;
  useAppearance(look);
  const theme = resolveTheme(look.theme);
  const [cachedName] = useState(() => { try { return localStorage.getItem('tp_app_name'); } catch { return null; } });
  const appName = settings?.appName || cachedName || config?.appName || DEFAULT_SETTINGS.appName;
  setWeekStartsOn(settings?.weekStartsOn ?? 1); // module-level, read by startOfWeek()

  useEffect(() => {
    document.title = appName;
    try { localStorage.setItem('tp_app_name', appName); } catch { /* ignore */ }
  }, [appName]);

  // re-align the visible week when the first day of the week changes
  useEffect(() => { setWeekStart((w) => startOfWeek(w)); }, [settings?.weekStartsOn]);

  const signIn = useCallback((r) => {
    setSettings({ ...DEFAULT_SETTINGS, ...r.settings });
    setUser(r.user);
  }, []);

  useEffect(() => {
    api.config().then(setConfig).catch(() => setConfig({}));
    api.me().then(signIn).catch(() => setUser(null));
  }, [signIn]);

  const reloadTasks = useCallback(() => Promise.all([
    api.tasks().then(setTasks),
    api.recurrences().then(setRules),
  ]), []);

  const reload = useCallback(() => {
    reloadTasks().catch(() => {});
    api.doneTasks().then(setDone).catch(() => {});
    api.notes().then(setNotes).catch(() => {});
    api.categories().then(setCategories).catch(() => {});
  }, [reloadTasks]);

  useEffect(() => { if (user) reload(); }, [user, reload]);

  const fail = useCallback((e) => {
    if (e?.status === 401) { setUser(null); return; }
    setToast({ message: 'Xəta baş verdi — məlumatlar yeniləndi.' });
    reload();
  }, [reload]);

  // ---------- task actions ----------
  const addTask = useCallback(async (data) => {
    try {
      const t = await api.create(data);
      setTasks((ts) => [...ts, t]);
    } catch (e) { fail(e); }
  }, [fail]);

  const replace = (setter, srv) => setter((list) => list.map((t) => (t.id === srv.id ? srv : t)));

  const saveTask = useCallback(async (task, patch) => {
    const moved = patch.date !== task.date;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...patch, position: moved ? 1e9 : t.position } : t)));
    const srv = await api.update(task.id, patch);
    replace(setTasks, srv);
    return srv;
  }, []);

  // Save from the task dialog: create / update, then optionally start or propagate repetition.
  const saveFromModal = useCallback(async (task, data, { repeat, applyFuture }) => {
    try {
      let saved;
      if (task.id) saved = await saveTask(task, data);
      else {
        saved = await api.create(data);
        setTasks((ts) => [...ts, saved]);
      }
      if (repeat) {
        await api.makeRecurring(saved.id, repeat);
        await reloadTasks();
        setToast({ message: 'Təkrarlanan tapşırıq yaradıldı 🔁' });
      } else if (applyFuture && task.recurId) {
        await api.applyRecurring(task.recurId, task.id);
        await reloadTasks();
        setToast({ message: 'Gələcək təkrarlar da yeniləndi' });
      }
    } catch (e) { fail(e); }
  }, [saveTask, reloadTasks, fail]);

  const stopRepeat = useCallback(async (task) => {
    try {
      const { removed } = await api.stopRecurring(task.recurId, task.date);
      await reloadTasks();
      setToast({ message: `Təkrar dayandırıldı · ${removed} gələcək tapşırıq silindi` });
    } catch (e) { fail(e); }
  }, [reloadTasks, fail]);

  const updateSettings = useCallback((patch) => {
    setSettings((cur) => ({ ...cur, ...patch }));
    api.saveSettings(patch).catch(fail);
  }, [fail]);

  const toggleTheme = useCallback(() => {
    const next = resolveTheme(look.theme) === 'dark' ? 'light' : 'dark';
    if (settings) updateSettings({ theme: next });
    else setLocalLook((l) => ({ ...l, theme: next }));
  }, [look.theme, settings, updateSettings]);

  const reorderCategories = useCallback((ids) => {
    setCategories((cs) => ids.map((id) => cs.find((c) => c.id === id)).filter(Boolean));
    api.reorderCategories(ids).catch(fail);
  }, [fail]);

  const restoreTask = useCallback((task, keepPosition = false) => {
    setDone((ds) => ds.filter((t) => t.id !== task.id));
    setTasks((ts) => [...ts, { ...task, done: false, doneAt: null, position: keepPosition ? task.position : 1e9 }]);
    const patch = keepPosition ? { done: false, position: task.position } : { done: false };
    api.update(task.id, patch).then((srv) => replace(setTasks, srv)).catch(fail);
  }, [fail]);

  const completeTask = useCallback((task) => {
    const finished = { ...task, done: true, doneAt: new Date().toISOString() };
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    setDone((ds) => [finished, ...ds]);
    api.update(task.id, { done: true }).then((srv) => replace(setDone, srv)).catch(fail);
    setToast({ message: 'Tamamlandı 🎉', action: { label: 'Geri al', fn: () => restoreTask(task, true) } });
  }, [fail, restoreTask]);

  const deleteTask = useCallback((task) => {
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    setDone((ds) => ds.filter((t) => t.id !== task.id));
    api.remove(task.id).catch(fail);
    setToast({
      message: 'Tapşırıq silindi',
      action: {
        label: 'Geri al',
        fn: async () => {
          try {
            const t = await api.create({
              title: task.title, note: task.note, date: task.date, categoryId: task.categoryId,
              time: task.time, priority: task.priority, subtasks: task.subtasks,
            });
            if (task.done) {
              const d = await api.update(t.id, { done: true });
              setDone((ds) => [d, ...ds]);
            } else {
              setTasks((ts) => [...ts, t]);
            }
          } catch (e) { fail(e); }
        },
      },
    });
  }, [fail]);

  const reorder = useCallback((date, ids) => {
    setTasks((ts) => ts.map((t) => {
      const i = ids.indexOf(t.id);
      return i === -1 ? t : { ...t, date, position: i };
    }));
    api.reorder(date, ids).catch(fail);
  }, [fail]);

  const goToWeek = useCallback((target, dir) => {
    setSlide(dir);
    setWeekStart(target);
  }, []);
  const shiftWeek = useCallback((n) => {
    setSlide(n > 0 ? 'next' : 'prev');
    setWeekStart((w) => addDays(w, 7 * n));
  }, []);
  const goToday = useCallback(() => {
    const target = startOfWeek(new Date());
    goToWeek(target, target < weekStart ? 'prev' : 'next');
  }, [goToWeek, weekStart]);

  const moveWeek = useCallback((task, delta) => {
    const newDate = toKey(addDays(fromKey(task.date), delta));
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, date: newDate, position: 1e9 } : t)));
    api.update(task.id, { date: newDate }).then((srv) => replace(setTasks, srv)).catch(fail);
    setToast({
      message: delta > 0 ? 'Növbəti həftəyə köçürüldü' : 'Əvvəlki həftəyə köçürüldü',
      action: { label: 'Göstər', fn: () => goToWeek(startOfWeek(fromKey(newDate)), delta > 0 ? 'next' : 'prev') },
    });
  }, [fail, goToWeek]);

  // ---------- note actions ----------
  const addNote = useCallback(async (data) => {
    try {
      const n = await api.createNote(data);
      setNotes((ns) => [n, ...ns]);
    } catch (e) { fail(e); }
  }, [fail]);

  const updateNote = useCallback((id, patch) => {
    setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    api.updateNote(id, patch).then((srv) => replace(setNotes, srv)).catch(fail);
  }, [fail]);

  const deleteNote = useCallback((note) => {
    setNotes((ns) => ns.filter((n) => n.id !== note.id));
    api.removeNote(note.id).catch(fail);
    setToast({
      message: 'Not silindi',
      action: {
        label: 'Geri al',
        fn: async () => {
          try {
            const n = await api.createNote({ week: note.week, title: note.title, body: note.body, color: note.color });
            setNotes((ns) => [n, ...ns]);
          } catch (e) { fail(e); }
        },
      },
    });
  }, [fail]);

  const showTask = useCallback((task) => {
    if (task.done) { setView('done'); return; }
    setView('week');
    setFilter(null);
    const target = startOfWeek(fromKey(task.date));
    goToWeek(target, target < weekStart ? 'prev' : 'next');
  }, [goToWeek, weekStart]);

  const noteToTask = useCallback(async (note, data) => {
    try {
      const { task, note: updated } = await api.noteToTask(note.id, data);
      setTasks((ts) => [...ts, task]);
      replace(setNotes, updated);
      setToast({ message: `Tapşırıq əlavə edildi · ${formatDay(task.date)}`, action: { label: 'Göstər', fn: () => showTask(task) } });
    } catch (e) { fail(e); }
  }, [fail, showTask]);

  // ---------- category actions ----------
  const saveCategory = useCallback(async (cat, data) => {
    try {
      if (cat.id) {
        setCategories((cs) => cs.map((c) => (c.id === cat.id ? { ...c, ...data } : c)));
        replace(setCategories, await api.updateCategory(cat.id, data));
      } else {
        const c = await api.createCategory(data);
        setCategories((cs) => [...cs, c]);
        setToast({ message: `«${c.name}» kateqoriyası yaradıldı` });
      }
    } catch (e) { fail(e); }
  }, [fail]);

  const deleteCategory = useCallback(async (cat) => {
    try {
      const { removedTasks } = await api.removeCategory(cat.id);
      setCategories((cs) => cs.filter((c) => c.id !== cat.id));
      setTasks((ts) => ts.filter((t) => t.categoryId !== cat.id));
      setDone((ds) => ds.filter((t) => t.categoryId !== cat.id));
      setFilter((f) => (f === cat.id ? null : f));
      setToast({ message: removedTasks ? `«${cat.name}» və ${removedTasks} tapşırıq silindi` : `«${cat.name}» silindi` });
    } catch (e) { fail(e); }
  }, [fail]);

  const catCtx = useMemo(
    () => ({ list: categories, byId: new Map(categories.map((c) => [c.id, c])) }),
    [categories],
  );

  const today = todayKey();
  // missed occurrences of recurring tasks aren't carried over
  const overdue = useMemo(() => tasks.filter((t) => t.date < today && !t.recurId), [tasks, today]);
  const moveOverdue = useCallback(() => {
    setTasks((ts) => ts.map((t, i) => (t.date < today && !t.recurId ? { ...t, date: today, position: 1e6 + i } : t)));
    api.moveOverdue(today).then(reload).catch(fail);
    setToast({ message: `${overdue.length} tapşırıq bu günə köçürüldü` });
    goToWeek(startOfWeek(new Date()), 'next');
  }, [today, overdue.length, reload, fail, goToWeek]);

  const openNew = useCallback(() => {
    const keys = weekKeys(weekStart);
    const date = keys.includes(today) ? today : keys[0];
    setEditing({ title: '', note: '', date, categoryId: filter ?? categories[0]?.id });
  }, [weekStart, today, filter, categories]);

  const pickSearch = useCallback((t) => {
    setSearchOpen(false);
    if (t.done) { setView('done'); return; }
    setView('week');
    setFilter(null);
    const target = startOfWeek(fromKey(t.date));
    goToWeek(target, target < weekStart ? 'prev' : 'next');
    setEditing(t);
  }, [goToWeek, weekStart]);

  const pickNote = useCallback((n) => {
    setSearchOpen(false);
    setView('notes');
    const target = startOfWeek(fromKey(n.week));
    goToWeek(target, target < weekStart ? 'prev' : 'next');
  }, [goToWeek, weekStart]);

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    if (!user) return undefined;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
        return;
      }
      if (editing || editingCat || searchOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      const weekly = view === 'week' || view === 'notes';
      if (weekly && e.key === 'ArrowLeft') shiftWeek(-1);
      else if (weekly && e.key === 'ArrowRight') shiftWeek(1);
      else if (e.key === 't' || e.key === 'T') { setView('week'); goToday(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openNew(); }
      else if (e.key === '1') setView('week');
      else if (e.key === '2') setView('notes');
      else if (e.key === '3') setView('done');
      else if (e.key === '4') setView('reports');
      else if (e.key === '5') setView('settings');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, editing, editingCat, searchOpen, view, shiftWeek, goToday, openNew]);

  const logout = async () => {
    await api.logout().catch(() => {});
    window.google?.accounts?.id?.disableAutoSelect?.();
    setTasks([]); setDone([]); setNotes([]); setCategories([]); setRules([]); setFilter(null);
    setLocalLook(localAppearance());
    setSettings(null); setUser(null); setView('week');
  };

  // ---------- render ----------
  if (user === undefined || config === null) {
    return <div className="splash"><span className="logo pulse">✓</span></div>;
  }
  if (!user) return <Login config={config} appName={appName} onLogin={signIn} theme={theme} onToggleTheme={toggleTheme} />;

  const keys = weekKeys(weekStart);
  const inFilter = (t) => !filter || t.categoryId === filter;
  const weekDone = done.filter((t) => inFilter(t) && t.date >= keys[0] && t.date <= keys[6]).length;
  const weekOpen = tasks.filter((t) => inFilter(t) && t.date >= keys[0] && t.date <= keys[6]).length;
  const weekTotal = weekDone + weekOpen;
  const real = tasks.filter((t) => !isProjection(t, today));
  const counts = real.reduce((m, t) => { m[t.categoryId] = (m[t.categoryId] || 0) + 1; return m; }, {});
  const catTotal = (id) => real.filter((t) => t.categoryId === id).length + done.filter((t) => t.categoryId === id).length;
  const rulesById = new Map(rules.map((r) => [r.id, r]));
  const noteCount = notes.filter((n) => n.week === keys[0]).length;

  return (
    <SettingsContext.Provider value={settings}>
    <CategoriesContext.Provider value={catCtx}>
    <div className="app">
      <Sidebar
        user={user}
        view={view}
        setView={setView}
        doneCount={done.length}
        noteCount={noteCount}
        counts={counts}
        filter={filter}
        setFilter={setFilter}
        onNew={openNew}
        onSearch={() => setSearchOpen(true)}
        onLogout={logout}
        theme={theme}
        onToggleTheme={toggleTheme}
        onEditCategory={setEditingCat}
        onReorderCategories={reorderCategories}
      />

      <main className="panel">
        {view === 'week' && (
          <>
            <div className="panel-head">
              <div className="week-title">
                <h1>
                  {filter ? catCtx.byId.get(filter)?.name : 'Həftəm'}
                  {filter && <button className="filter-chip" onClick={() => setFilter(null)} title="Filtri sil">× filtr</button>}
                </h1>
                <span className="muted">{weekLabel(weekStart)} · {formatRange(weekStart)}</span>
              </div>

              <div className="head-controls">
                <div className="week-progress" title={`${weekDone} / ${weekTotal} tamamlanıb`}>
                  <div className="wp-track"><div className="wp-fill" style={{ width: `${weekTotal ? (weekDone / weekTotal) * 100 : 0}%` }} /></div>
                  <span>{weekDone}/{weekTotal}</span>
                </div>
                <WeekSwitcher weekStart={weekStart} onShift={shiftWeek} onGo={goToWeek} onToday={goToday} />
              </div>
            </div>

            {overdue.length > 0 && (
              <div className="banner">
                <span>⏰ Keçmiş günlərdə <b>{overdue.length}</b> tamamlanmamış tapşırıq var.</span>
                <button className="btn sm dark" onClick={moveOverdue}>Hamısını bu günə köçür</button>
              </div>
            )}

            {!hintHidden && (
              <div className="hint">
                <span>💡 Tapşırığı tutub sürüşdür — başqa günə, ya da kənarlara aparıb başqa həftəyə köçür. Telefonda sağa/sola sürüşdürərək həftəni dəyiş.</span>
                <button className="icon-btn sm" aria-label="Bağla" onClick={() => { writeHint(); setHintHidden(true); }}>×</button>
              </div>
            )}

            <Board
              tasks={tasks}
              setTasks={setTasks}
              done={done}
              filter={filter}
              defaultCategory={categories[0]?.id}
              weekStart={weekStart}
              slide={slide}
              onSwipe={shiftWeek}
              onAdd={addTask}
              onOpen={setEditing}
              onComplete={completeTask}
              onReorder={reorder}
              onMoveWeek={moveWeek}
            />
          </>
        )}

        {view === 'notes' && (
          <NotesPage
            notes={notes}
            tasks={tasks}
            done={done}
            weekStart={weekStart}
            onShift={shiftWeek}
            onGo={goToWeek}
            onToday={goToday}
            onAdd={addNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onToTask={noteToTask}
            onShowTask={showTask}
          />
        )}

        {view === 'done' && (
          <DonePage done={done} onRestore={(t) => restoreTask(t)} onDelete={deleteTask} />
        )}

        {view === 'reports' && <ReportsPage tasks={tasks} done={done} />}

        {view === 'settings' && (
          <SettingsPage user={user} onChange={updateSettings} onEditCategory={setEditingCat} onLogout={logout} />
        )}
      </main>

      <button className="fab" onClick={openNew} aria-label="Yeni tapşırıq">+</button>

      {editing && (
        <TaskModal
          key={editing.id ?? 'new'}
          task={editing}
          rule={editing.recurId ? rulesById.get(editing.recurId) : null}
          onClose={() => setEditing(null)}
          onSave={(data, extra) => { saveFromModal(editing, data, extra); setEditing(null); }}
          onStopRepeat={() => { stopRepeat(editing); setEditing(null); }}
          onDelete={() => { deleteTask(editing); setEditing(null); }}
          onComplete={() => { completeTask(editing); setEditing(null); }}
        />
      )}

      {searchOpen && (
        <SearchModal tasks={tasks} done={done} notes={notes} onClose={() => setSearchOpen(false)} onPick={pickSearch} onPickNote={pickNote} />
      )}

      {editingCat && (
        <CategoryModal
          key={editingCat.id ?? 'new'}
          category={editingCat}
          taskCount={editingCat.id ? catTotal(editingCat.id) : 0}
          isLast={categories.length <= 1}
          onClose={() => setEditingCat(null)}
          onSave={(data) => { saveCategory(editingCat, data); setEditingCat(null); }}
          onDelete={() => { deleteCategory(editingCat); setEditingCat(null); }}
        />
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
    </CategoriesContext.Provider>
    </SettingsContext.Provider>
  );
}
