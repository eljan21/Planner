// Friends, streaks and profile pictures.
// Friends see each other's numbers only (streak, today's progress, week) — never task titles.
import crypto from 'node:crypto';
import { db } from './db.js';

const parseJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const settingsOf = (u) => parseJson(u.settings || '{}', {});
const tzOf = (u) => settingsOf(u).tz || 'Asia/Baku';
export const displayName = (u) => settingsOf(u).name || (u.name || u.email || '').split(' ')[0] || 'Dost';

/** "YYYY-MM-DD" of an instant in a time zone */
const dayIn = (date, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
const shiftKey = (k, n) => {
  const d = new Date(`${k}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const mondayOf = (k) => shiftKey(k, -((new Date(`${k}T12:00:00Z`).getUTCDay() + 6) % 7));

/**
 * Streak = consecutive days with at least one completed task, counted in the user's own time zone.
 * Today without a finished task yet doesn't break it — the streak still counts up to yesterday.
 */
export function statsFor(u) {
  const tz = tzOf(u);
  const today = dayIn(new Date(), tz);
  const doneDays = new Set();
  let total = 0;
  let week = 0;
  const monday = mondayOf(today);
  for (const r of db.prepare('SELECT done_at FROM tasks WHERE user_id = ? AND done = 1 AND done_at IS NOT NULL').all(u.id)) {
    const k = dayIn(new Date(r.done_at), tz);
    doneDays.add(k);
    total++;
    if (k >= monday) week++;
  }
  let streak = 0;
  for (let k = doneDays.has(today) ? today : shiftKey(today, -1); doneDays.has(k); k = shiftKey(k, -1)) streak++;
  let best = 0;
  let run = 0;
  let prev = null;
  for (const k of [...doneDays].sort()) {
    run = prev && shiftKey(prev, 1) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = k;
  }
  const todayDone = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND done = 1 AND date = ?').get(u.id, today).n;
  const todayOpen = db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND done = 0 AND date = ?').get(u.id, today).n;
  return { streak, best, total, week, todayDone, todayTotal: todayDone + todayOpen, doneToday: doneDays.has(today) };
}

// ---------- friend codes & avatars ----------
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function friendCodeOf(u) {
  if (u.friend_code) return u.friend_code;
  for (;;) {
    const bytes = crypto.randomBytes(6);
    const code = [...bytes].map((b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
    try {
      db.prepare('UPDATE users SET friend_code = ? WHERE id = ? AND friend_code IS NULL').run(code, u.id);
      return db.prepare('SELECT friend_code FROM users WHERE id = ?').get(u.id).friend_code;
    } catch { /* collision with another user's code — try again */ }
  }
}

/** the picture to show: an uploaded one wins over the Google photo */
export const avatarOf = (u) => (u.avatar_v ? `/api/users/${u.id}/avatar?v=${u.avatar_v}` : u.picture || '');

const friendship = (a, b) => db.prepare(`
  SELECT * FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
`).get(a, b, b, a);
const areFriends = (a, b) => friendship(a, b)?.status === 'accepted';

const card = (u, withStats) => ({
  id: Number(u.id),
  name: displayName(u),
  avatar: avatarOf(u),
  ...(withStats ? { stats: statsFor(u) } : {}),
});

const MAX_AVATAR = 400 * 1024;
const IMAGE_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

export function mountSocial(app, auth, { notify }) {
  app.get('/api/me/profile', auth, (req, res) => {
    const u = req.user;
    res.json({ ...card(u, true), email: u.email, friendCode: friendCodeOf(u) });
  });

  app.put('/api/me/avatar', auth, (req, res) => {
    const m = IMAGE_RE.exec(String(req.body?.dataUrl || ''));
    const buf = m && Buffer.from(m[2], 'base64');
    if (!buf || !buf.length || buf.length > MAX_AVATAR) return res.status(400).json({ error: 'invalid_image' });
    db.prepare('UPDATE users SET avatar = ?, avatar_type = ?, avatar_v = ? WHERE id = ?').run(buf, m[1], Date.now(), req.user.id);
    res.json({ avatar: avatarOf(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
  });

  app.delete('/api/me/avatar', auth, (req, res) => {
    db.prepare('UPDATE users SET avatar = NULL, avatar_type = NULL, avatar_v = NULL WHERE id = ?').run(req.user.id);
    res.json({ avatar: req.user.picture || '' });
  });

  // only you, your friends and people with a pending request between you can see your picture
  app.get('/api/users/:id/avatar', auth, (req, res) => {
    const id = Number(req.params.id);
    const f = id === req.user.id ? true : friendship(req.user.id, id);
    const u = f && db.prepare('SELECT avatar, avatar_type FROM users WHERE id = ?').get(id);
    if (!u?.avatar) return res.status(404).end();
    res.set('Content-Type', u.avatar_type);
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.send(Buffer.from(u.avatar));
  });

  app.get('/api/friends', auth, (req, res) => {
    const uid = req.user.id;
    const rows = db.prepare('SELECT * FROM friendships WHERE requester_id = ? OR addressee_id = ?').all(uid, uid);
    const other = (r) => db.prepare('SELECT * FROM users WHERE id = ?').get(r.requester_id === uid ? r.addressee_id : r.requester_id);
    const friends = [];
    const incoming = [];
    const outgoing = [];
    for (const r of rows) {
      const u = other(r);
      if (!u) continue;
      if (r.status === 'accepted') friends.push(card(u, true));
      else if (r.addressee_id === uid) incoming.push({ requestId: Number(r.id), user: card(u, false) });
      else outgoing.push({ requestId: Number(r.id), user: card(u, false) });
    }
    friends.sort((a, b) => b.stats.streak - a.stats.streak || b.stats.week - a.stats.week);
    res.json({ friends, incoming, outgoing });
  });

  // add by Gmail address or friend code
  app.post('/api/friends', auth, async (req, res) => {
    const q = String(req.body?.query || '').trim();
    if (!q || q.length > 120) return res.status(400).json({ error: 'empty' });
    const target = q.includes('@')
      ? db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(q)
      : db.prepare('SELECT * FROM users WHERE friend_code = ?').get(q.toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (!target) return res.status(404).json({ error: 'not_found' });
    const me = req.user;
    if (target.id === me.id) return res.status(400).json({ error: 'self' });
    const existing = friendship(me.id, target.id);
    if (existing?.status === 'accepted') return res.status(409).json({ error: 'already_friends' });
    if (existing && existing.requester_id === me.id) return res.status(409).json({ error: 'already_sent' });
    if (existing) {
      // they had already asked me — adding them back simply accepts
      db.prepare("UPDATE friendships SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
      notify(target.id, {
        title: [`🤝 ${displayName(me)} artıq dostundur`, `🤝 You and ${displayName(me)} are now friends`],
        body: ['İndi bir-birinizin seriyasını görə bilərsiniz.', "Now you can see each other's streaks."],
        url: '/?view=friends',
      });
      return res.json({ status: 'accepted', user: card(target, true) });
    }
    db.prepare("INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')").run(me.id, target.id);
    notify(target.id, {
      title: [`👋 ${displayName(me)} sənə dostluq istəyi göndərdi`, `👋 ${displayName(me)} sent you a friend request`],
      body: ['Dostlar bölməsində qəbul edə bilərsən.', 'You can accept it in Friends.'],
      url: '/?view=friends',
    });
    res.status(201).json({ status: 'pending', user: card(target, false) });
  });

  // ---------- invite links: juststoa.xyz/?dost=CODE ----------
  const byCode = (code) => db.prepare('SELECT * FROM users WHERE friend_code = ?').get(String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

  // shown on the sign-in page before the visitor has an account: only the first name
  app.get('/api/invite/:code', (req, res) => {
    const u = byCode(req.params.code);
    if (!u) return res.status(404).json({ error: 'not_found' });
    res.json({ name: displayName(u) });
  });

  // following someone's invite link is consent on both sides: you become friends at once
  app.post('/api/friends/invite', auth, (req, res) => {
    const inviter = byCode(req.body?.code);
    if (!inviter) return res.status(404).json({ error: 'not_found' });
    const me = req.user;
    if (inviter.id === me.id) return res.json({ status: 'self' });
    const existing = friendship(me.id, inviter.id);
    if (existing?.status === 'accepted') return res.json({ status: 'already', user: card(inviter, false) });
    if (existing) db.prepare("UPDATE friendships SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
    else db.prepare("INSERT INTO friendships (requester_id, addressee_id, status, accepted_at) VALUES (?, ?, 'accepted', CURRENT_TIMESTAMP)").run(inviter.id, me.id);
    notify(inviter.id, {
      title: [`🎉 ${displayName(me)} dəvətinlə qoşuldu`, `🎉 ${displayName(me)} joined from your invite`],
      body: ['Artıq dostsunuz — seriyalarınızı müqayisə edin.', "You're friends now — compare your streaks."],
      url: '/?view=friends',
    });
    res.json({ status: 'accepted', user: card(inviter, false) });
  });

  app.post('/api/friends/requests/:id/accept', auth, (req, res) => {
    const r = db.prepare("SELECT * FROM friendships WHERE id = ? AND addressee_id = ? AND status = 'pending'").get(Number(req.params.id), req.user.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    db.prepare("UPDATE friendships SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE id = ?").run(r.id);
    notify(r.requester_id, {
      title: [`🤝 ${displayName(req.user)} dostluq istəyini qəbul etdi`, `🤝 ${displayName(req.user)} accepted your friend request`],
      body: ['İndi bir-birinizin seriyasını görə bilərsiniz.', "Now you can see each other's streaks."],
      url: '/?view=friends',
    });
    res.json({ ok: true });
  });

  // decline an incoming request or cancel an outgoing one
  app.delete('/api/friends/requests/:id', auth, (req, res) => {
    db.prepare("DELETE FROM friendships WHERE id = ? AND status = 'pending' AND (requester_id = ? OR addressee_id = ?)")
      .run(Number(req.params.id), req.user.id, req.user.id);
    res.json({ ok: true });
  });

  app.delete('/api/friends/:userId', auth, (req, res) => {
    const other = Number(req.params.userId);
    if (areFriends(req.user.id, other)) {
      db.prepare('DELETE FROM friendships WHERE id = ?').run(friendship(req.user.id, other).id);
    }
    res.json({ ok: true });
  });
}
