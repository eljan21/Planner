import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.env.DATA_DIR || path.resolve('data');
fs.mkdirSync(dir, { recursive: true });

export const db = new DatabaseSync(path.join(dir, 'tasks.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub  TEXT UNIQUE NOT NULL,
    email       TEXT,
    name        TEXT,
    picture     TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    color       TEXT NOT NULL DEFAULT 'blue',
    position    REAL NOT NULL DEFAULT 0,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS recurrences (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    note            TEXT NOT NULL DEFAULT '',
    category_id     INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    time            TEXT,
    priority        INTEGER NOT NULL DEFAULT 0,
    subtasks        TEXT NOT NULL DEFAULT '[]',
    freq            TEXT NOT NULL,              -- daily | weekly | monthly
    days            TEXT NOT NULL DEFAULT '[]', -- weekly: JS weekday numbers (0 = Sunday)
    start_date      TEXT NOT NULL,
    generated_until TEXT,                       -- instances exist up to this date
    created_at      TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    note        TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL,
    position    REAL NOT NULL DEFAULT 0,
    color       TEXT NOT NULL DEFAULT 'blue',
    done        INTEGER NOT NULL DEFAULT 0,
    done_at     TEXT,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, done, date);

  CREATE TABLE IF NOT EXISTS notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week        TEXT NOT NULL,              -- Monday of the week, YYYY-MM-DD
    title       TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT 'p0',
    task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_notes_user ON notes(user_id, week);
`);

// Columns added after the first release
function addColumn(table, column, definition) {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}
addColumn('tasks', 'category_id', 'INTEGER REFERENCES categories(id) ON DELETE CASCADE');
addColumn('tasks', 'time', 'TEXT');
addColumn('tasks', 'priority', 'INTEGER NOT NULL DEFAULT 0');
addColumn('tasks', 'subtasks', "TEXT NOT NULL DEFAULT '[]'");
addColumn('tasks', 'recur_id', 'INTEGER REFERENCES recurrences(id) ON DELETE SET NULL');
addColumn('categories', 'emoji', "TEXT NOT NULL DEFAULT ''");
addColumn('users', 'settings', "TEXT NOT NULL DEFAULT '{}'");
addColumn('tasks', 'deadline', 'TEXT');                          // ISO instant (UTC)
addColumn('tasks', 'reminders', "TEXT NOT NULL DEFAULT '[]'");   // [{ at: ISO instant, sent: bool }] — sent by the Telegram bot
addColumn('users', 'telegram_chat_id', 'TEXT');
addColumn('users', 'telegram_code', 'TEXT');
addColumn('users', 'friend_code', 'TEXT');
addColumn('users', 'password_hash', 'TEXT');      // email + password accounts (scrypt)
addColumn('users', 'totp_secret', 'TEXT');        // authenticator secret, encrypted
addColumn('users', 'totp_enabled', 'INTEGER NOT NULL DEFAULT 0');
addColumn('users', 'totp_last_step', 'INTEGER');  // last accepted 30-second step — a code works once
addColumn('users', 'recovery_codes', "TEXT NOT NULL DEFAULT '[]'"); // sha-256 of the unused codes
addColumn('users', 'device_epoch', 'INTEGER NOT NULL DEFAULT 0');   // bump to forget remembered devices
addColumn('users', 'avatar', 'BLOB');           // uploaded profile picture (resized in the browser)
addColumn('users', 'avatar_type', 'TEXT');
addColumn('users', 'avatar_v', 'INTEGER');      // changes on every upload, busts the browser cache
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_friend_code ON users(friend_code)');
db.exec(`
  CREATE TABLE IF NOT EXISTS friendships (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       TEXT NOT NULL DEFAULT 'pending',   -- pending | accepted
    created_at   TEXT DEFAULT CURRENT_TIMESTAMP,
    accepted_at  TEXT,
    UNIQUE (requester_id, addressee_id)
  );
  CREATE INDEX IF NOT EXISTS idx_friend_addressee ON friendships(addressee_id, status);
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_recur ON tasks(recur_id)');

export const PALETTE = ['blue', 'orange', 'green', 'pink', 'purple', 'gray', 'red', 'teal', 'yellow', 'indigo'];

const DEFAULT_CATEGORIES = {
  az: [['Şəxsi', 'blue'], ['İş', 'orange'], ['Sağlamlıq', 'green'], ['Alış-veriş', 'pink'], ['Təhsil', 'purple'], ['Digər', 'gray']],
  en: [['Personal', 'blue'], ['Work', 'orange'], ['Health', 'green'], ['Shopping', 'pink'], ['Learning', 'purple'], ['Other', 'gray']],
};

const ensured = new Set();
/** First visit: create the default categories and attach any legacy tasks (which only had a colour). */
export function ensureCategories(uid, lang = 'en') {
  if (ensured.has(uid)) return;
  const has = db.prepare('SELECT COUNT(*) AS n FROM categories WHERE user_id = ?').get(uid).n;
  if (!has) {
    const ins = db.prepare('INSERT INTO categories (user_id, name, color, position) VALUES (?, ?, ?, ?)');
    tx(() => (DEFAULT_CATEGORIES[lang] || DEFAULT_CATEGORIES.en).forEach(([name, color], i) => ins.run(uid, name, color, i)));
  }
  const orphans = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND category_id IS NULL').get(uid).n;
  if (orphans) {
    const first = db.prepare('SELECT id FROM categories WHERE user_id = ? ORDER BY position, id LIMIT 1').get(uid).id;
    tx(() => {
      db.prepare(`
        UPDATE tasks SET category_id = COALESCE(
          (SELECT c.id FROM categories c WHERE c.user_id = tasks.user_id AND c.color = tasks.color ORDER BY c.position LIMIT 1), ?)
        WHERE user_id = ? AND category_id IS NULL
      `).run(first, uid);
    });
  }
  ensured.add(uid);
}

export function tx(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
