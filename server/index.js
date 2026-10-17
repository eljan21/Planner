import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE, db, ensureCategories, tx } from './db.js';
import { buildReport } from './report.js';
import { addDaysKey, keyOf, occurrences } from './recur.js';

const PROD = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const JWT_SECRET = process.env.JWT_SECRET || (PROD ? '' : 'dev-only-secret');
// Demo sign-in (no Google): always available locally with DEV_LOGIN=true; in production only when
// ALLOW_DEMO_LOGIN=true is set explicitly (e.g. a throw-away preview) — anyone can then sign in as "demo".
const DEV_LOGIN = (!PROD && process.env.DEV_LOGIN === 'true') || process.env.ALLOW_DEMO_LOGIN === 'true';
const APP_NAME = (process.env.APP_NAME || "Khaya's Planner").slice(0, 40);
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '')
  .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

if (!JWT_SECRET || (PROD && JWT_SECRET === 'change-me')) {
  console.error('JWT_SECRET must be set to a long random value in production.');
  process.exit(1);
}

const COOKIE = 'tp_session';
const COLORS = new Set(PALETTE);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const google = new OAuth2Client(GOOGLE_CLIENT_ID);

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-Frame-Options', 'DENY');
  next();
});

// Simple CSRF guard: state-changing API calls must come from our own fetch() wrapper.
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && req.get('x-requested-with') !== 'fetch') {
    return res.status(403).json({ error: 'forbidden' });
  }
  next();
});

// ---------- auth ----------
function setSession(res, userId) {
  const token = jwt.sign({ uid: userId }, JWT_SECRET, { expiresIn: '30d' });
  res.cookie(COOKIE, token, {
    httpOnly: true, secure: PROD, sameSite: 'lax', maxAge: 30 * 864e5, path: '/',
  });
}

function auth(req, res, next) {
  try {
    const { uid } = jwt.verify(req.cookies[COOKIE], JWT_SECRET);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(uid);
    if (!user) throw new Error('no user');
    req.user = user;
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
  ensureCategories(req.user.id);
  next();
}

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, picture: u.picture });

// ---------- per-user settings ----------
const ACCENTS = ['lime', 'violet', 'sky', 'peach', 'mint', 'rose', 'sun'];
const PASTELS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
const DEFAULT_SETTINGS = {
  appName: APP_NAME,
  accent: 'lime',
  theme: 'system',          // system | light | dark
  weekStartsOn: 1,          // 1 = Monday, 0 = Sunday
  hiddenDays: [],           // JS weekday numbers hidden when they have no tasks
  density: 'comfortable',   // comfortable | compact
  sort: 'manual',           // manual | time | priority
  dayColors: [...PASTELS],  // header colour per weekday, Monday first
};

function cleanSettings(input = {}) {
  const out = {};
  if (typeof input.appName === 'string' && input.appName.trim()) out.appName = input.appName.trim().slice(0, 40);
  if (ACCENTS.includes(input.accent)) out.accent = input.accent;
  if (['system', 'light', 'dark'].includes(input.theme)) out.theme = input.theme;
  if (input.weekStartsOn === 0 || input.weekStartsOn === 1) out.weekStartsOn = input.weekStartsOn;
  if (Array.isArray(input.hiddenDays)) {
    out.hiddenDays = [...new Set(input.hiddenDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  }
  if (['comfortable', 'compact'].includes(input.density)) out.density = input.density;
  if (['manual', 'time', 'priority'].includes(input.sort)) out.sort = input.sort;
  if (Array.isArray(input.dayColors) && input.dayColors.length === 7 && input.dayColors.every((c) => PASTELS.includes(c))) {
    out.dayColors = input.dayColors;
  }
  return out;
}

const settingsOf = (u) => {
  let saved = {};
  try { saved = JSON.parse(u.settings || '{}'); } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS, ...cleanSettings(saved) };
};

function upsertUser({ sub, email, name, picture }) {
  db.prepare(`
    INSERT INTO users (google_sub, email, name, picture) VALUES (?, ?, ?, ?)
    ON CONFLICT(google_sub) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture
  `).run(sub, email, name, picture);
  return db.prepare('SELECT * FROM users WHERE google_sub = ?').get(sub);
}

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID, devLogin: DEV_LOGIN, appName: APP_NAME });
});

app.post('/api/auth/google', async (req, res) => {
  const { credential } = req.body || {};
  if (!GOOGLE_CLIENT_ID || typeof credential !== 'string') {
    return res.status(400).json({ error: 'bad_request' });
  }
  let payload;
  try {
    const ticket = await google.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
  if (!payload?.email || !payload.email_verified) {
    return res.status(401).json({ error: 'email_not_verified' });
  }
  const email = payload.email.toLowerCase();
  if (ALLOWED_EMAILS.length && !ALLOWED_EMAILS.includes(email)) {
    return res.status(403).json({ error: 'not_allowed' });
  }
  const user = upsertUser({ sub: payload.sub, email, name: payload.name || email, picture: payload.picture || '' });
  setSession(res, user.id);
  res.json({ user: publicUser(user), settings: settingsOf(user) });
});

if (DEV_LOGIN) {
  app.post('/api/auth/dev', (req, res) => {
    const user = upsertUser({ sub: 'dev-user', email: 'demo@example.com', name: 'Demo İstifadəçi', picture: '' });
    setSession(res, user.id);
    res.json({ user: publicUser(user), settings: settingsOf(user) });
  });
}

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: publicUser(req.user), settings: settingsOf(req.user) }));

app.put('/api/settings', auth, (req, res) => {
  const next = { ...settingsOf(req.user), ...cleanSettings(req.body) };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(next), req.user.id);
  res.json(next);
});

// ---------- tasks ----------
const parseJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

function cleanSubtasks(list) {
  if (!Array.isArray(list)) throw new Error('subtasks');
  return JSON.stringify(list.slice(0, 50).map((x, i) => ({
    id: String(x?.id ?? i).slice(0, 40),
    text: String(x?.text ?? '').trim().slice(0, 200),
    done: !!x?.done,
  })).filter((x) => x.text));
}
const cleanTime = (t) => {
  if (t === null || t === '') return null;
  if (!TIME_RE.test(t)) throw new Error('time');
  return t;
};
const cleanPriority = (p) => {
  const n = Number(p);
  if (!Number.isInteger(n) || n < 0 || n > 3) throw new Error('priority');
  return n;
};
const toTask = (r) => ({
  id: Number(r.id),
  title: r.title,
  note: r.note,
  date: r.date,
  position: r.position,
  categoryId: r.category_id == null ? null : Number(r.category_id),
  time: r.time || null,
  priority: Number(r.priority) || 0,
  subtasks: parseJson(r.subtasks, []),
  recurId: r.recur_id == null ? null : Number(r.recur_id),
  done: !!r.done,
  doneAt: r.done_at,
  createdAt: r.created_at,
});

const ownCategory = (id, uid) =>
  db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(Number(id), uid)?.id;
const firstCategory = (uid) =>
  db.prepare('SELECT id FROM categories WHERE user_id = ? ORDER BY position, id LIMIT 1').get(uid)?.id;

function clean(body = {}, partial, uid) {
  const out = {};
  if (!partial || 'title' in body) {
    const title = String(body.title ?? '').trim().slice(0, 200);
    if (!title) throw new Error('title');
    out.title = title;
  }
  if ('note' in body) out.note = String(body.note ?? '').slice(0, 4000);
  if (!partial || 'date' in body) {
    if (!DATE_RE.test(body.date)) throw new Error('date');
    out.date = body.date;
  }
  if ('categoryId' in body) {
    const cid = ownCategory(body.categoryId, uid);
    if (!cid) throw new Error('category');
    out.category_id = cid;
  }
  if ('time' in body) out.time = cleanTime(body.time);
  if ('priority' in body) out.priority = cleanPriority(body.priority);
  if ('subtasks' in body) out.subtasks = cleanSubtasks(body.subtasks);
  if ('done' in body) out.done = body.done ? 1 : 0;
  if ('position' in body && Number.isFinite(body.position)) out.position = body.position;
  return out;
}

const getTask = (id, uid) => db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, uid);
const nextPos = (uid, date) =>
  (db.prepare('SELECT MAX(position) AS m FROM tasks WHERE user_id = ? AND date = ? AND done = 0').get(uid, date).m ?? -1) + 1;

// Create concrete task rows for every recurring rule up to ~6 months ahead.
function materialize(uid) {
  const horizon = addDaysKey(keyOf(new Date()), 180);
  const rules = db.prepare('SELECT * FROM recurrences WHERE user_id = ? AND (generated_until IS NULL OR generated_until < ?)').all(uid, horizon);
  if (!rules.length) return;
  const ins = db.prepare(`INSERT INTO tasks (user_id, title, note, date, position, category_id, time, priority, subtasks, recur_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const fresh = (json) => JSON.stringify(parseJson(json, []).map((x) => ({ ...x, done: false })));
  tx(() => {
    for (const r of rules) {
      const from = r.generated_until ? addDaysKey(r.generated_until, 1) : r.start_date;
      for (const date of occurrences(r, from, horizon)) {
        ins.run(uid, r.title, r.note, date, nextPos(uid, date), r.category_id, r.time, r.priority, fresh(r.subtasks), r.id);
      }
      db.prepare('UPDATE recurrences SET generated_until = ? WHERE id = ?').run(horizon, r.id);
    }
  });
}

app.get('/api/tasks', auth, (req, res) => {
  materialize(req.user.id);
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND done = 0 ORDER BY date, position').all(req.user.id);
  res.json(rows.map(toTask));
});

app.get('/api/tasks/done', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? AND done = 1 ORDER BY done_at DESC').all(req.user.id);
  res.json(rows.map(toTask));
});

app.post('/api/tasks', auth, (req, res) => {
  let d;
  const uid = req.user.id;
  try { d = clean(req.body, false, uid); } catch { return res.status(400).json({ error: 'invalid' }); }
  const r = db.prepare(`INSERT INTO tasks (user_id, title, note, date, position, category_id, time, priority, subtasks)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid, d.title, d.note ?? '', d.date, nextPos(uid, d.date), d.category_id ?? firstCategory(uid),
      d.time ?? null, d.priority ?? 0, d.subtasks ?? '[]');
  res.status(201).json(toTask(getTask(r.lastInsertRowid, uid)));
});

app.put('/api/tasks/reorder', auth, (req, res) => {
  const { date, ids } = req.body || {};
  if (!DATE_RE.test(date) || !Array.isArray(ids) || ids.length > 1000) {
    return res.status(400).json({ error: 'invalid' });
  }
  const st = db.prepare('UPDATE tasks SET date = ?, position = ? WHERE id = ? AND user_id = ?');
  tx(() => ids.forEach((id, i) => st.run(date, i, Number(id), req.user.id)));
  res.json({ ok: true });
});

app.post('/api/tasks/move-overdue', auth, (req, res) => {
  const { today } = req.body || {};
  if (!DATE_RE.test(today)) return res.status(400).json({ error: 'invalid' });
  const uid = req.user.id;
  // missed occurrences of recurring tasks are not carried over
  const rows = db.prepare('SELECT id FROM tasks WHERE user_id = ? AND done = 0 AND date < ? AND recur_id IS NULL ORDER BY date, position').all(uid, today);
  let pos = nextPos(uid, today);
  const st = db.prepare('UPDATE tasks SET date = ?, position = ? WHERE id = ? AND user_id = ?');
  tx(() => rows.forEach((r) => st.run(today, pos++, r.id, uid)));
  res.json({ moved: rows.length });
});

app.patch('/api/tasks/:id', auth, (req, res) => {
  const uid = req.user.id;
  const task = getTask(Number(req.params.id), uid);
  if (!task) return res.status(404).json({ error: 'not_found' });
  let d;
  try { d = clean(req.body, true, uid); } catch { return res.status(400).json({ error: 'invalid' }); }

  if (d.date && d.date !== task.date && !('position' in d)) d.position = nextPos(uid, d.date);
  if ('done' in d) {
    d.done_at = d.done ? new Date().toISOString() : null;
    if (!d.done && !('position' in d)) d.position = nextPos(uid, d.date ?? task.date);
  }
  const keys = Object.keys(d);
  if (keys.length) {
    db.prepare(`UPDATE tasks SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...keys.map((k) => d[k]), task.id, uid);
  }
  res.json(toTask(getTask(task.id, uid)));
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

// ---------- recurring tasks ----------
const toRecur = (r) => ({
  id: Number(r.id), freq: r.freq, days: parseJson(r.days, []), startDate: r.start_date,
});

function cleanRule(body = {}, uid) {
  const freq = body.freq;
  if (!['daily', 'weekly', 'monthly'].includes(freq)) throw new Error('freq');
  const days = freq === 'weekly'
    ? [...new Set((body.days || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
    : [];
  if (freq === 'weekly' && !days.length) throw new Error('days');
  return { freq, days: JSON.stringify(days) };
}

app.get('/api/recurrences', auth, (req, res) => {
  res.json(db.prepare('SELECT * FROM recurrences WHERE user_id = ?').all(req.user.id).map(toRecur));
});

// Make an existing task repeat: it becomes the first occurrence; later ones are generated.
app.post('/api/recurrences', auth, (req, res) => {
  const uid = req.user.id;
  const task = getTask(Number(req.body?.taskId), uid);
  if (!task) return res.status(404).json({ error: 'not_found' });
  if (task.recur_id) return res.status(400).json({ error: 'already_recurring' });
  let rule;
  try { rule = cleanRule(req.body, uid); } catch { return res.status(400).json({ error: 'invalid' }); }
  tx(() => {
    const r = db.prepare(`INSERT INTO recurrences (user_id, title, note, category_id, time, priority, subtasks, freq, days, start_date, generated_until)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(uid, task.title, task.note, task.category_id, task.time, task.priority, task.subtasks, rule.freq, rule.days, task.date, task.date);
    db.prepare('UPDATE tasks SET recur_id = ? WHERE id = ?').run(r.lastInsertRowid, task.id);
  });
  materialize(uid);
  res.status(201).json({ ok: true });
});

// Apply a task's current fields to the rule and to all of its upcoming, unfinished occurrences.
app.post('/api/recurrences/:id/apply', auth, (req, res) => {
  const uid = req.user.id;
  const rule = db.prepare('SELECT * FROM recurrences WHERE id = ? AND user_id = ?').get(Number(req.params.id), uid);
  const task = getTask(Number(req.body?.taskId), uid);
  if (!rule || !task || task.recur_id !== rule.id) return res.status(404).json({ error: 'not_found' });
  const fresh = JSON.stringify(parseJson(task.subtasks, []).map((x) => ({ ...x, done: false })));
  tx(() => {
    db.prepare('UPDATE recurrences SET title = ?, note = ?, category_id = ?, time = ?, priority = ?, subtasks = ? WHERE id = ?')
      .run(task.title, task.note, task.category_id, task.time, task.priority, fresh, rule.id);
    db.prepare(`UPDATE tasks SET title = ?, note = ?, category_id = ?, time = ?, priority = ?, subtasks = ?
      WHERE recur_id = ? AND user_id = ? AND done = 0 AND date > ?`)
      .run(task.title, task.note, task.category_id, task.time, task.priority, fresh, rule.id, uid, task.date);
  });
  res.json({ ok: true });
});

// Stop repeating: remove unfinished occurrences after `after` and the rule itself (finished ones stay).
app.delete('/api/recurrences/:id', auth, (req, res) => {
  const uid = req.user.id;
  const rule = db.prepare('SELECT * FROM recurrences WHERE id = ? AND user_id = ?').get(Number(req.params.id), uid);
  if (!rule) return res.status(404).json({ error: 'not_found' });
  const after = DATE_RE.test(req.query.after || '') ? req.query.after : '0000-00-00';
  const removed = tx(() => {
    const n = db.prepare('DELETE FROM tasks WHERE recur_id = ? AND user_id = ? AND done = 0 AND date > ?').run(rule.id, uid, after).changes;
    db.prepare('DELETE FROM recurrences WHERE id = ?').run(rule.id);
    return n;
  });
  res.json({ ok: true, removed: Number(removed) });
});

// ---------- categories ----------
const toCategory = (r) => ({ id: Number(r.id), name: r.name, color: r.color, emoji: r.emoji || '', position: r.position });
const getCategory = (id, uid) => db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(id, uid);

function cleanCategory(body = {}, partial) {
  const out = {};
  if (!partial || 'name' in body) {
    const name = String(body.name ?? '').trim().slice(0, 40);
    if (!name) throw new Error('name');
    out.name = name;
  }
  if (!partial || 'color' in body) out.color = COLORS.has(body.color) ? body.color : 'blue';
  if ('emoji' in body) out.emoji = [...String(body.emoji ?? '')].slice(0, 4).join('');
  if ('position' in body && Number.isFinite(body.position)) out.position = body.position;
  return out;
}

app.get('/api/categories', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY position, id').all(req.user.id);
  res.json(rows.map(toCategory));
});

app.post('/api/categories', auth, (req, res) => {
  let d;
  try { d = cleanCategory(req.body, false); } catch { return res.status(400).json({ error: 'invalid' }); }
  const uid = req.user.id;
  const pos = (db.prepare('SELECT MAX(position) AS m FROM categories WHERE user_id = ?').get(uid).m ?? -1) + 1;
  const r = db.prepare('INSERT INTO categories (user_id, name, color, emoji, position) VALUES (?, ?, ?, ?, ?)')
    .run(uid, d.name, d.color, d.emoji ?? '', pos);
  res.status(201).json(toCategory(getCategory(r.lastInsertRowid, uid)));
});

app.put('/api/categories/reorder', auth, (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length > 200) return res.status(400).json({ error: 'invalid' });
  const st = db.prepare('UPDATE categories SET position = ? WHERE id = ? AND user_id = ?');
  tx(() => ids.forEach((id, i) => st.run(i, Number(id), req.user.id)));
  res.json({ ok: true });
});

app.patch('/api/categories/:id', auth, (req, res) => {
  const uid = req.user.id;
  const cat = getCategory(Number(req.params.id), uid);
  if (!cat) return res.status(404).json({ error: 'not_found' });
  let d;
  try { d = cleanCategory(req.body, true); } catch { return res.status(400).json({ error: 'invalid' }); }
  const keys = Object.keys(d);
  if (keys.length) {
    db.prepare(`UPDATE categories SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ? AND user_id = ?`)
      .run(...keys.map((k) => d[k]), cat.id, uid);
  }
  res.json(toCategory(getCategory(cat.id, uid)));
});

// Deletes the category together with all of its tasks (the UI warns and offers an Excel export first).
app.delete('/api/categories/:id', auth, (req, res) => {
  const uid = req.user.id;
  const cat = getCategory(Number(req.params.id), uid);
  if (!cat) return res.status(404).json({ error: 'not_found' });
  const total = db.prepare('SELECT COUNT(*) AS n FROM categories WHERE user_id = ?').get(uid).n;
  if (total <= 1) return res.status(400).json({ error: 'last_category' });
  const removed = tx(() => {
    const n = db.prepare('DELETE FROM tasks WHERE category_id = ? AND user_id = ?').run(cat.id, uid).changes;
    db.prepare('DELETE FROM categories WHERE id = ? AND user_id = ?').run(cat.id, uid);
    return n;
  });
  res.json({ ok: true, removedTasks: Number(removed) });
});

// ---------- weekly notes ----------
const NOTE_COLORS = new Set(['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);

const toNote = (r) => ({
  id: Number(r.id),
  week: r.week,
  title: r.title,
  body: r.body,
  color: r.color,
  taskId: r.task_id == null ? null : Number(r.task_id),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function cleanNote(body = {}, partial) {
  const out = {};
  if (!partial || 'week' in body) {
    if (!DATE_RE.test(body.week)) throw new Error('week');
    out.week = body.week;
  }
  if (!partial || 'title' in body) out.title = String(body.title ?? '').trim().slice(0, 200);
  if (!partial || 'body' in body) out.body = String(body.body ?? '').slice(0, 10000);
  if ('color' in body) out.color = NOTE_COLORS.has(body.color) ? body.color : 'p0';
  return out;
}

const getNote = (id, uid) => db.prepare('SELECT * FROM notes WHERE id = ? AND user_id = ?').get(id, uid);

app.get('/api/notes', auth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(req.user.id);
  res.json(rows.map(toNote));
});

app.post('/api/notes', auth, (req, res) => {
  let d;
  try { d = cleanNote(req.body, false); } catch { return res.status(400).json({ error: 'invalid' }); }
  if (!d.title && !d.body.trim()) return res.status(400).json({ error: 'empty' });
  const uid = req.user.id;
  const r = db.prepare('INSERT INTO notes (user_id, week, title, body, color) VALUES (?, ?, ?, ?, ?)')
    .run(uid, d.week, d.title, d.body, d.color ?? 'p0');
  res.status(201).json(toNote(getNote(r.lastInsertRowid, uid)));
});

app.patch('/api/notes/:id', auth, (req, res) => {
  const uid = req.user.id;
  const note = getNote(Number(req.params.id), uid);
  if (!note) return res.status(404).json({ error: 'not_found' });
  let d;
  try { d = cleanNote(req.body, true); } catch { return res.status(400).json({ error: 'invalid' }); }
  const keys = Object.keys(d);
  if (keys.length) {
    db.prepare(`UPDATE notes SET ${keys.map((k) => `${k} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`)
      .run(...keys.map((k) => d[k]), note.id, uid);
  }
  res.json(toNote(getNote(note.id, uid)));
});

app.delete('/api/notes/:id', auth, (req, res) => {
  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(Number(req.params.id), req.user.id);
  res.json({ ok: true });
});

// Turn a note into a task (reminder) on the chosen day and link the two.
app.post('/api/notes/:id/task', auth, (req, res) => {
  const uid = req.user.id;
  const note = getNote(Number(req.params.id), uid);
  if (!note) return res.status(404).json({ error: 'not_found' });
  const { date } = req.body || {};
  if (!DATE_RE.test(date)) return res.status(400).json({ error: 'invalid' });
  const categoryId = ownCategory(req.body.categoryId, uid) ?? firstCategory(uid);

  const lines = note.body.trim().split('\n');
  const title = (note.title || lines[0] || '').trim().slice(0, 200);
  if (!title) return res.status(400).json({ error: 'empty' });
  const text = (note.title ? note.body : lines.slice(1).join('\n')).trim().slice(0, 4000);

  const task = tx(() => {
    const r = db.prepare('INSERT INTO tasks (user_id, title, note, date, position, category_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uid, title, text, date, nextPos(uid, date), categoryId);
    db.prepare('UPDATE notes SET task_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?')
      .run(r.lastInsertRowid, note.id, uid);
    return getTask(r.lastInsertRowid, uid);
  });
  res.status(201).json({ task: toTask(task), note: toNote(getNote(note.id, uid)) });
});

// ---------- reports (Excel) ----------
const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const human = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

const REPORT_SELECT = `
  SELECT t.*, c.name AS category_name, c.color AS category_color, c.emoji AS category_emoji
  FROM tasks t LEFT JOIN categories c ON c.id = t.category_id
  WHERE t.user_id = ?`;
// upcoming occurrences of recurring tasks are projections, not real work yet
const NOT_PROJECTED = ' AND NOT (t.recur_id IS NOT NULL AND t.done = 0 AND t.date > ?)';

const AZ = { ə: 'e', Ə: 'e', ı: 'i', İ: 'i', ş: 's', Ş: 's', ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ö: 'o', Ö: 'o', ü: 'u', Ü: 'u' };
const slugify = (s) => s.replace(/[əƏıİşŞçÇğĞöÖüÜ]/g, (ch) => AZ[ch]).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

app.get('/api/reports/export', auth, async (req, res) => {
  const { scope, from, to, today } = req.query;
  const tz = Number.isFinite(Number(req.query.tz)) ? Number(req.query.tz) : 0;
  if (!DATE_RE.test(today || '')) return res.status(400).json({ error: 'invalid' });

  const uid = req.user.id;
  const spanOf = (rows, empty) => (rows.length ? `${human(rows[0].date)} – ${human(rows[rows.length - 1].date)}` : empty);
  const ORDER = ' ORDER BY t.date, t.done, t.position';
  let rows, title, period, filename;
  if (scope === 'week') {
    if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) return res.status(400).json({ error: 'invalid' });
    rows = db.prepare(`${REPORT_SELECT} AND t.date BETWEEN ? AND ?${ORDER}`).all(uid, from, to);
    title = 'Həftəlik hesabat';
    period = `${human(from)} – ${human(to)}`;
    filename = `heftelik-hesabat-${from}.xlsx`;
  } else if (scope === 'category') {
    const cat = getCategory(Number(req.query.category), uid);
    if (!cat) return res.status(404).json({ error: 'not_found' });
    rows = db.prepare(`${REPORT_SELECT} AND t.category_id = ?${NOT_PROJECTED}${ORDER}`).all(uid, cat.id, today);
    title = `Kateqoriya hesabatı: ${cat.name}`;
    period = spanOf(rows, 'Tapşırıq yoxdur');
    filename = `kateqoriya-${slugify(cat.name) || 'kateqoriya'}-${today}.xlsx`;
  } else if (scope === 'custom') {
    const hasFrom = DATE_RE.test(from || '');
    const hasTo = DATE_RE.test(to || '');
    const cats = String(req.query.categories || '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 100);
    let sql = REPORT_SELECT + NOT_PROJECTED;
    const args = [uid, today];
    if (hasFrom) { sql += ' AND t.date >= ?'; args.push(from); }
    if (hasTo) { sql += ' AND t.date <= ?'; args.push(to); }
    if (cats.length) { sql += ` AND t.category_id IN (${cats.map(() => '?').join(',')})`; args.push(...cats); }
    rows = db.prepare(sql + ORDER).all(...args);
    title = 'Fərdi hesabat';
    period = hasFrom || hasTo
      ? `${hasFrom ? human(from) : 'başlanğıc'} – ${hasTo ? human(to) : 'bu gün'}`
      : spanOf(rows, 'Tapşırıq yoxdur');
    if (cats.length) {
      const names = db.prepare(`SELECT name FROM categories WHERE user_id = ? AND id IN (${cats.map(() => '?').join(',')})`).all(uid, ...cats);
      period += `  ·  ${names.map((n) => n.name).join(', ')}`;
    }
    filename = `ferdi-hesabat-${hasFrom ? from : 'baslangic'}-${hasTo ? to : today}.xlsx`;
  } else {
    rows = db.prepare(`${REPORT_SELECT}${NOT_PROJECTED}${ORDER}`).all(uid, today);
    title = 'Ümumi hesabat (bütün dövr)';
    period = spanOf(rows, 'Hələ tapşırıq yoxdur');
    filename = `umumi-hesabat-${today}.xlsx`;
  }

  try {
    const buf = await buildReport({ tasks: rows, title, period, user: req.user, tz, today });
    res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buf));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'report_failed' });
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

// ---------- static frontend ----------
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, file) => {
      res.set('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Khaya's Planner listening on http://localhost:${PORT}`));
