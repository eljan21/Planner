import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, lastWriteAt } from './api';
import { useLiveRefresh } from './liveRefresh';
import Login from './components/Login';
import TopBand from './components/TopBand';
import MenuDrawer from './components/MenuDrawer';
import Party from './characters/Party';
import { buddyBus } from './characters/bus';
import { PEOPLE, buddyFor, crewOf, pick } from './characters/people';
import Onboarding from './characters/Onboarding';
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
import ProfilePage from './components/ProfilePage';
import FriendsPage from './components/FriendsPage';
import AppBanner from './components/AppBanner';
import { clearInvite, pendingInvite } from './pwa';
import TaskModal from './components/TaskModal';
import Toast from './components/Toast';
import { getLang, langChosenHere, setLang, tr, useLang } from './i18n';
import {
  addDays, doneKey, formatDay, fromKey, setWeekStartsOn, startOfWeek, toKey, todayKey, weekKeys, weekdayIndex,
} from './dates';

const HINT_KEY = 'tp_hint_dismissed';
const readHint = () => { try { return localStorage.getItem(HINT_KEY) === '1'; } catch { return false; } };
const writeHint = () => { try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ } };

const VIEWS = ['week', 'notes', 'done', 'reports', 'settings', 'profile', 'friends'];
/** a notification can open a section directly: /?view=friends */
function initialView() {
  const params = new URLSearchParams(window.location.search);
  const v = params.get('view');
  if (!v) return 'week';
  params.delete('view');
  const rest = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
  return VIEWS.includes(v) ? v : 'week';
}

const BOARD_DAYS = 5;
/** first column of the board for a date: Monday of its week on weekdays, the day itself on weekends */
const boardStartFor = (key) => {
  const d = fromKey(key);
  const i = weekdayIndex(d);
  return i < 5 ? toKey(addDays(d, -i)) : key;
};

export default function App() {
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out
  const [tasks, setTasks] = useState([]);
  const [done, setDone] = useState([]);
  const [notes, setNotes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingCat, setEditingCat] = useState(null);
  const [view, setView] = useState(initialView);
  const [mode, setMode] = useState('today'); // home opens on today's tasks; 'all' is the five-day board
  const [start, setStart] = useState(() => boardStartFor(todayKey()));
  const [menuOpen, setMenuOpen] = useState(false);
  const [requests, setRequests] = useState(0); // incoming friend requests
  const [party, setParty] = useState(null);
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

  // notes are kept per week; the board shows five days from `start`
  const weekStart = useMemo(() => startOfWeek(fromKey(start)), [start, settings?.weekStartsOn]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => Array.from({ length: BOARD_DAYS }, (_, i) => toKey(addDays(fromKey(start), i))), [start]);
  const anim = settings?.anim ?? 'full';

  const signIn = useCallback((r) => {
    // language: a choice made on this device wins (and is saved to the account); otherwise use the account's
    const saved = r.settings?.lang;
    if (langChosenHere() && saved !== getLang()) api.saveSettings({ lang: getLang() }).catch(() => {});
    else if (!langChosenHere() && saved) setLang(saved);
    setSettings({ ...DEFAULT_SETTINGS, ...r.settings, lang: langChosenHere() ? getLang() : saved || getLang() });
    setUser(r.user);
    // the Telegram bot formats times in the user's own time zone
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && r.settings?.tz !== tz) {
      setSettings((cur) => ({ ...cur, tz }));
      api.saveSettings({ tz }).catch(() => {});
    }
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

  // arrived through someone's invite link: become friends right after signing in
  useEffect(() => {
    const code = user && pendingInvite();
    if (!code) return;
    clearInvite();
    api.acceptInvite(code).then((r) => {
      if (r.status === 'accepted') setToast({ message: tr(`${r.user.name} ilə artıq dostsunuz 🤝`, `You and ${r.user.name} are now friends 🤝`) });
    }).catch(() => {});
  }, [user]);

  // friend requests: on sign-in, then kept fresh in the background
  const checkRequests = useCallback(() => api.friends().then((d) => setRequests(d.incoming.length)).catch(() => {}), []);
  useEffect(() => { if (user) checkRequests(); }, [user, checkRequests]);
  useLiveRefresh(checkRequests, 30e3, !!user);

  const fail = useCallback((e) => {
    if (e?.status === 401) { setUser(null); return; }
    setToast({ message: tr('Xəta baş verdi — məlumatlar yeniləndi.', 'Something went wrong — your data was refreshed.') });
    reload();
  }, [reload]);

  // ---------- task actions ----------
  const addTask = useCallback(async (data) => {
    try {
      const t = await api.create(data);
      setTasks((ts) => [...ts, t]);
      buddyBus.emit('add');
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
      if (task.id) {
        saved = await saveTask(task, data);
        if (data.date && data.date !== task.date) buddyBus.emit(data.date > task.date ? 'lazy' : 'early');
      } else {
        saved = await api.create(data);
        setTasks((ts) => [...ts, saved]);
        buddyBus.emit('add');
      }
      if (repeat) {
        await api.makeRecurring(saved.id, repeat);
        await reloadTasks();
        setToast({ message: tr('Təkrarlanan tapşırıq yaradıldı 🔁', 'Repeating task created 🔁') });
      } else if (applyFuture && task.recurId) {
        await api.applyRecurring(task.recurId, task.id);
        await reloadTasks();
        setToast({ message: tr('Gələcək təkrarlar da yeniləndi', 'Future repeats updated too') });
      }
    } catch (e) { fail(e); }
  }, [saveTask, reloadTasks, fail]);

  const stopRepeat = useCallback(async (task) => {
    try {
      const { removed } = await api.stopRecurring(task.recurId, task.date);
      await reloadTasks();
      setToast({ message: tr(`Təkrar dayandırıldı · ${removed} gələcək tapşırıq silindi`, `Repeat stopped · ${removed} future task${removed === 1 ? '' : 's'} removed`) });
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
    buddyBus.emit('restore');
    setDone((ds) => ds.filter((t) => t.id !== task.id));
    setTasks((ts) => [...ts, { ...task, done: false, doneAt: null, position: keepPosition ? task.position : 1e9 }]);
    const patch = keepPosition ? { done: false, position: task.position } : { done: false };
    api.update(task.id, patch).then((srv) => replace(setTasks, srv)).catch(fail);
  }, [fail]);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const doneRef = useRef(done);
  doneRef.current = done;

  const completeTask = useCallback((task) => {
    const finished = { ...task, done: true, doneAt: new Date().toISOString() };
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    setDone((ds) => [finished, ...ds]);
    api.update(task.id, { done: true }).then((srv) => replace(setDone, srv)).catch(fail);
    setToast({ message: tr('Tamamlandı', 'Done'), action: { label: tr('Geri al', 'Undo'), fn: () => restoreTask(task, true) } });

    // the last open task of today: everyone celebrates
    const today = todayKey();
    const leftToday = tasksRef.current.filter((t) => t.date === today && t.id !== task.id).length;
    if (task.date === today && leftToday === 0) {
      const star = buddyFor(new Date(), crewOf(settings));
      const line = pick(PEOPLE[star].done);
      // Friday (or later) closes the week: group photo with the week's count
      const week = weekdayIndex(new Date()) >= 4;
      const monday = toKey(addDays(new Date(), -weekdayIndex(new Date())));
      const weekCount = doneRef.current.filter((t) => doneKey(t) >= monday).length + 1;
      buddyBus.emit('party', { line });
      if (settings?.anim !== 'off' && settings?.anim !== 'calm') setParty({ week, weekCount, line, star });
    } else {
      buddyBus.emit('done');
    }
  }, [fail, restoreTask, settings]);

  const deleteTask = useCallback((task) => {
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    setDone((ds) => ds.filter((t) => t.id !== task.id));
    api.remove(task.id).catch(fail);
    setToast({
      message: tr('Tapşırıq silindi', 'Task deleted'),
      action: {
        label: tr('Geri al', 'Undo'),
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

  /** show the board from a date key (Monday of its week, or the weekend day itself) */
  const goToDay = useCallback((key, exact = false) => {
    const next = exact ? key : boardStartFor(key);
    setSlide(next < start ? 'prev' : 'next');
    setStart(next);
  }, [start]);
  const goToWeek = useCallback((target, dir) => {
    setSlide(dir);
    setStart(toKey(target));
  }, []);
  const shiftWeek = useCallback((n) => {
    setSlide(n > 0 ? 'next' : 'prev');
    setStart((k) => toKey(addDays(fromKey(k), 7 * n)));
  }, []);
  const goToday = useCallback(() => goToDay(todayKey()), [goToDay]);

  const moveWeek = useCallback((task, delta) => {
    const newDate = toKey(addDays(fromKey(task.date), delta));
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, date: newDate, position: 1e9 } : t)));
    api.update(task.id, { date: newDate }).then((srv) => replace(setTasks, srv)).catch(fail);
    buddyBus.emit(delta > 0 ? 'lazy' : 'early');
    const where = {
      1: tr('Sabaha köçürüldü', 'Moved to tomorrow'),
      '-1': tr('Dünənə köçürüldü', 'Moved to yesterday'),
      7: tr('Növbəti həftəyə köçürüldü', 'Moved to next week'),
      '-7': tr('Əvvəlki həftəyə köçürüldü', 'Moved to last week'),
    }[delta];
    setToast({
      message: where,
      action: { label: tr('Göstər', 'Show'), fn: () => { setMode('all'); goToDay(newDate); } },
    });
  }, [fail, goToDay]);

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
    setMode(task.date === todayKey() ? 'today' : 'all');
    goToDay(task.date);
  }, [goToDay]);

  const noteToTask = useCallback(async (note, data) => {
    try {
      const { task, note: updated } = await api.noteToTask(note.id, data);
      setTasks((ts) => [...ts, task]);
      replace(setNotes, updated);
      buddyBus.emit('add');
      setToast({ message: tr(`Tapşırıq əlavə edildi · ${formatDay(task.date)}`, `Task added · ${formatDay(task.date)}`), action: { label: tr('Göstər', 'Show'), fn: () => showTask(task) } });
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
        setToast({ message: tr(`«${c.name}» kateqoriyası yaradıldı`, `Category «${c.name}» created`) });
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
      setToast({ message: removedTasks ? tr(`«${cat.name}» və ${removedTasks} tapşırıq silindi`, `«${cat.name}» and ${removedTasks} task${removedTasks === 1 ? '' : 's'} deleted`) : tr(`«${cat.name}» silindi`, `«${cat.name}» deleted`) });
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
    setToast({ message: tr(`${overdue.length} tapşırıq bu günə köçürüldü`, `${overdue.length} task${overdue.length === 1 ? '' : 's'} moved to today`) });
    buddyBus.emit('early');
    goToDay(today);
  }, [today, overdue.length, reload, fail, goToDay]);

  const openNew = useCallback(() => {
    const date = mode === 'today' || days.includes(today) ? today : days[0];
    setEditing({ title: '', note: '', date, categoryId: filter ?? categories[0]?.id });
  }, [mode, days, today, filter, categories]);

  const pickSearch = useCallback((t) => {
    setSearchOpen(false);
    if (t.done) { setView('done'); return; }
    setView('week');
    setFilter(null);
    setMode(t.date === todayKey() ? 'today' : 'all');
    goToDay(t.date);
    setEditing(t);
  }, [goToDay]);

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
      if (editing || editingCat || searchOpen || menuOpen || party || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target.closest('input, textarea, select, [contenteditable]')) return;
      const weekly = (view === 'week' && mode === 'all') || view === 'notes';
      if (weekly && e.key === 'ArrowLeft') shiftWeek(-1);
      else if (weekly && e.key === 'ArrowRight') shiftWeek(1);
      else if (e.key === 't' || e.key === 'T') { setView('week'); setMode('today'); }
      else if (e.key === 'w' || e.key === 'W') { setView('week'); setMode('all'); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openNew(); }
      else if (e.key === '1') setView('week');
      else if (e.key === '2') setView('notes');
      else if (e.key === '3') setView('done');
      else if (e.key === '4') setView('reports');
      else if (e.key === '5') setView('settings');
      else if (e.key === '6') setView('friends');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [user, editing, editingCat, searchOpen, menuOpen, party, view, mode, shiftWeek, openNew]);

  const logout = async () => {
    await api.logout().catch(() => {});
    window.google?.accounts?.id?.disableAutoSelect?.();
    setTasks([]); setDone([]); setNotes([]); setCategories([]); setRules([]); setFilter(null);
    setLocalLook(localAppearance());
    setSettings(null); setUser(null); setView('week');
  };

  // tasks changed elsewhere (phone, Telegram «Bitdi») show up without a reload — but never under the user's hands
  const userBusy = useRef(false);
  userBusy.current = !!(editing || editingCat || searchOpen);
  const refreshTasks = useCallback(() => {
    if (userBusy.current || document.querySelector('.board.dragging') || Date.now() - lastWriteAt() < 4000) return;
    reload();
  }, [reload]);
  useLiveRefresh(refreshTasks, 30e3, !!user);

  const lang = useLang(); // re-renders everything on a language switch
  useEffect(() => {
    if (user && settings && settings.lang !== lang) updateSettings({ lang });
  }, [lang, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeParty = useCallback(() => setParty(null), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // ---------- render ----------
  if (user === undefined || config === null) {
    return <div className="splash"><span className="logo pulse">✓</span></div>;
  }
  if (!user) return <Login config={config} onLogin={signIn} theme={theme} onToggleTheme={toggleTheme} />;

  const keys = weekKeys(weekStart);
  const real = tasks.filter((t) => !isProjection(t, today));
  const counts = real.reduce((m, t) => { m[t.categoryId] = (m[t.categoryId] || 0) + 1; return m; }, {});
  const catTotal = (id) => real.filter((t) => t.categoryId === id).length + done.filter((t) => t.categoryId === id).length;
  const rulesById = new Map(rules.map((r) => [r.id, r]));
  const noteCount = notes.filter((n) => n.week === keys[0]).length;
  const todayOpen = tasks.filter((t) => t.date === today).length;
  const todayDone = done.filter((t) => t.date === today).length;
  const todayTotal = todayOpen + todayDone;
  const buddyStatus = !todayTotal ? tr('Bu gün üçün hələ tapşırıq yoxdur.', 'Nothing planned for today yet.')
    : todayOpen ? tr(`Bu gün ${todayOpen} iş qalıb.`, `${todayOpen} task${todayOpen === 1 ? '' : 's'} left today.`)
      : tr('Bu günün bütün işləri bitib.', 'Everything for today is done.');
  const busy = new Set(real.map((t) => t.date));

  return (
    <SettingsContext.Provider value={settings}>
    <CategoriesContext.Provider value={catCtx}>
    <div className="app">
      <TopBand
        appName={appName}
        name={settings.name}
        requests={requests}
        onProfile={() => setView('profile')}
        onHome={() => { setView('week'); setMode('today'); setFilter(null); }}
        atHome={view === 'week' && mode === 'today' && !filter}
        crew={crewOf(settings)}
        user={user}
        todayDone={todayDone}
        todayTotal={todayTotal}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSearch={() => setSearchOpen(true)}
        onMenu={() => setMenuOpen(true)}
        showBoard={view === 'week'}
        mode={mode}
        onMode={setMode}
        days={days}
        busy={busy}
        onShift={shiftWeek}
        onPick={(k) => goToDay(k, true)}
        onToday={goToday}
        filterName={filter ? catCtx.byId.get(filter)?.name : null}
        onClearFilter={() => setFilter(null)}
        buddyStatus={buddyStatus}
        overdue={overdue.length}
        anim={anim}
      />

      <main className="panel">
        {view === 'week' && (
          <>
            {overdue.length > 0 && (
              <div className="banner">
                <span>
                  {tr('Keçmiş günlərdə', overdue.length === 1 ? 'There is' : 'There are')} <b>{overdue.length}</b>{' '}
                  {tr('tamamlanmamış tapşırıq var.', overdue.length === 1 ? 'unfinished task from past days.' : 'unfinished tasks from past days.')}
                </span>
                <button className="btn sm dark" onClick={moveOverdue}>{tr('Hamısını bu günə köçür', 'Move them all to today')}</button>
              </div>
            )}

            <AppBanner />

            {!hintHidden && (
              <div className="hint">
                <span>{mode === 'today'
                  ? tr('Bu gün yalnız bugünkü işlər görünür. Tapşırığı sağ kənara sürüşdürsən sabaha keçər; bütün həftə üçün yuxarıda «Ümumi»yə bas.', "Only today's tasks are shown here. Drag a task to the right edge to move it to tomorrow; for the whole week press «Overview» above.")
                  : tr('Tapşırığı tutub başqa günə sürüşdür, ya da kənara aparıb başqa həftəyə köçür. Digər günlər üçün təqvimdən istifadə et.', 'Drag a task to another day, or to the edge to move it to another week. Use the calendar for other days.')}</span>
                <button className="icon-btn sm" aria-label={tr('Bağla', 'Close')} onClick={() => { writeHint(); setHintHidden(true); }}>×</button>
              </div>
            )}

            <Board
              tasks={tasks}
              setTasks={setTasks}
              done={done}
              filter={filter}
              defaultCategory={filter ?? categories[0]?.id}
              days={mode === 'today' ? [today] : days}
              single={mode === 'today'}
              slide={mode === 'today' ? null : slide}
              onSwipe={shiftWeek}
              onAdd={addTask}
              onOpen={setEditing}
              onComplete={completeTask}
              onRestore={(t) => restoreTask(t)}
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

        {view === 'profile' && (
          <ProfilePage
            user={user}
            displayName={settings.name || (user.name || '').split(' ')[0]}
            onAvatar={(picture) => setUser((u) => ({ ...u, picture }))}
            onFriends={() => setView('friends')}
          />
        )}

        {view === 'friends' && <FriendsPage onChanged={setRequests} />}

        {view === 'settings' && (
          <SettingsPage user={user} onChange={updateSettings} onEditCategory={setEditingCat} onLogout={logout} />
        )}
      </main>

      <button className="fab" onClick={openNew} aria-label={tr('Yeni tapşırıq', 'New task')}>+</button>

      {menuOpen && (
        <MenuDrawer
          user={user}
          view={view}
          setView={setView}
          doneCount={done.length}
          noteCount={noteCount}
          requests={requests}
          counts={counts}
          filter={filter}
          setFilter={setFilter}
          onSearch={() => setSearchOpen(true)}
          onEditCategory={setEditingCat}
          onReorderCategories={reorderCategories}
          onChange={updateSettings}
          onLogout={logout}
          onClose={closeMenu}
        />
      )}

      {party && <Party party={party} star={party.star} crew={crewOf(settings)} sound={settings.sound} onClose={closeParty} />}

      {!settings.onboarded && (
        <Onboarding
          user={user}
          onDone={({ name, crew }) => updateSettings({ name, crew, appName: `${name}'s Planner`, onboarded: true })}
        />
      )}

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
