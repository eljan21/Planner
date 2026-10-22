// Web Push: the phone's own notifications for the installed app (iPhone from iOS 16.4, Android, desktop).
// VAPID keys come from the environment, or are generated once and kept next to the database.
import fs from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import { db } from './db.js';

const dir = process.env.DATA_DIR || path.resolve('data');
const keyFile = path.join(dir, 'vapid.json');

function loadKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  try { return JSON.parse(fs.readFileSync(keyFile, 'utf8')); } catch { /* first start */ }
  const keys = webpush.generateVAPIDKeys();
  fs.writeFileSync(keyFile, JSON.stringify(keys), { mode: 0o600 });
  return keys;
}

const keys = loadKeys();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:noreply@juststoa.xyz', keys.publicKey, keys.privateKey);
export const vapidPublicKey = keys.publicKey;

db.exec(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT NOT NULL UNIQUE,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
`);

export function saveSubscription(uid, sub) {
  const endpoint = String(sub?.endpoint || '');
  const { p256dh, auth } = sub?.keys || {};
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) throw new Error('invalid');
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  `).run(uid, endpoint, String(p256dh).slice(0, 200), String(auth).slice(0, 100));
}

export function removeSubscription(uid, endpoint) {
  db.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').run(uid, String(endpoint || ''));
}

export const hasPush = (uid) => !!db.prepare('SELECT 1 FROM push_subscriptions WHERE user_id = ? LIMIT 1').get(uid);

/** sends to every device the user enabled; devices that unsubscribed are forgotten */
export async function sendPush(uid, { title, body, url = '/', tag, actions } = {}) {
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(uid);
  const payload = JSON.stringify({ title, body, url, tag, actions });
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 6 * 3600 });
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(s.id);
      else console.error('push failed:', e.statusCode || e.message);
    }
  }));
}
