// Email + password accounts with authenticator-app (TOTP) two-step verification.
// A new device must pass the code once; it is then remembered for 30 days by a signed cookie.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { db } from './db.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const DEVICE_COOKIE = 'tp_device';
const DEVICE_DAYS = 30;
const ISSUER = 'Plan it!';

// ---------- passwords (scrypt) ----------
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));
async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('base64')}$${(await scrypt(pw, salt)).toString('base64')}`;
}
async function checkPassword(pw, stored) {
  const [kind, salt, hash] = String(stored || '').split('$');
  if (kind !== 'scrypt') return false;
  const key = await scrypt(pw, Buffer.from(salt, 'base64'));
  const want = Buffer.from(hash, 'base64');
  return key.length === want.length && crypto.timingSafeEqual(key, want);
}
// same work for unknown e-mails, so response time doesn't reveal who has an account
const DUMMY_HASH = await hashPassword(crypto.randomBytes(12).toString('hex'));

// ---------- TOTP (RFC 6238: SHA-1, 6 digits, 30 s) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const base32 = (buf) => {
  let bits = '';
  for (const b of buf) bits += b.toString(2).padStart(8, '0');
  return bits.match(/.{1,5}/g).map((c) => B32[parseInt(c.padEnd(5, '0'), 2)]).join('');
};
const unbase32 = (s) => {
  const bits = [...s.replace(/=+$/, '')].map((c) => B32.indexOf(c).toString(2).padStart(5, '0')).join('');
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
};
function totpAt(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac('sha1', unbase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0');
}
/** accepts the current code and one step either side (clock drift); returns the step used, or null */
function checkTotp(secret, code, lastStep) {
  if (!/^\d{6}$/.test(code)) return null;
  const now = Math.floor(Date.now() / 30000);
  for (const step of [now - 1, now, now + 1]) {
    if (step > (lastStep ?? -1) && crypto.timingSafeEqual(Buffer.from(totpAt(secret, step)), Buffer.from(code))) return step;
  }
  return null;
}

// ---------- the TOTP secret is stored encrypted with a key derived from JWT_SECRET ----------
let KEY;
const seal = (text) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const out = Buffer.concat([c.update(text, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), out].map((b) => b.toString('base64')).join('.');
};
const unseal = (sealed) => {
  const [iv, tag, data] = sealed.split('.').map((s) => Buffer.from(s, 'base64'));
  const d = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString('utf8');
};

// ---------- recovery codes: shown once, stored hashed ----------
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const normCode = (c) => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
function newRecoveryCodes() {
  const codes = Array.from({ length: 8 }, () => {
    const raw = [...crypto.randomBytes(8)].map((b) => B32[b % 32]).join('');
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
  return { codes, stored: JSON.stringify(codes.map((c) => sha(normCode(c)))) };
}

// ---------- brute-force guard: per key, N failures per 15 minutes ----------
const failures = new Map();
const WINDOW = 15 * 60e3;
function tooMany(key, limit) {
  const now = Date.now();
  const list = (failures.get(key) || []).filter((t) => now - t < WINDOW);
  failures.set(key, list);
  return list.length >= limit;
}
const fail = (key) => failures.set(key, [...(failures.get(key) || []), Date.now()]);
setInterval(() => { const now = Date.now(); for (const [k, v] of failures) if (!v.some((t) => now - t < WINDOW)) failures.delete(k); }, WINDOW).unref();

export function mountPasswordAuth(app, { auth, secret, prod, allowedEmails, setSession, publicUser, settingsOf }) {
  KEY = crypto.createHash('sha256').update(`totp:${secret}`).digest();
  const sign = (payload, expiresIn) => jwt.sign(payload, secret, { expiresIn });
  const read = (token, stage) => { try { const p = jwt.verify(token, secret); return p.stage === stage ? p : null; } catch { return null; } };
  const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const signedIn = (res, user) => { setSession(res, user.id); res.json({ user: publicUser(user), settings: settingsOf(user) }); };

  const rememberDevice = (res, user) => res.cookie(DEVICE_COOKIE, sign({ uid: user.id, e: user.device_epoch || 0, stage: 'device' }, `${DEVICE_DAYS}d`), {
    httpOnly: true, secure: prod, sameSite: 'lax', maxAge: DEVICE_DAYS * 864e5, path: '/api/auth',
  });
  const isTrusted = (req, user) => {
    const p = read(req.cookies[DEVICE_COOKIE], 'device');
    return !!p && p.uid === user.id && p.e === (user.device_epoch || 0);
  };

  /** a fresh secret and QR for setting up the authenticator app */
  async function setupFor(user) {
    const totpSecret = base32(crypto.randomBytes(20));
    db.prepare('UPDATE users SET totp_secret = ? WHERE id = ?').run(seal(totpSecret), user.id);
    const label = encodeURIComponent(`${ISSUER}:${user.email}`);
    const uri = `otpauth://totp/${label}?secret=${totpSecret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
    return {
      stage: 'setup',
      challenge: sign({ uid: user.id, stage: 'setup' }, '20m'),
      secret: totpSecret.match(/.{1,4}/g).join(' '),
      uri,
      qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }),
    };
  }

  // ---------- sign up ----------
  app.post('/api/auth/register', async (req, res) => {
    const name = String(req.body?.name || '').trim().slice(0, 60);
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!name) return res.status(400).json({ error: 'name' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'email' });
    if (password.length < 8 || password.length > 200) return res.status(400).json({ error: 'password' });
    if (allowedEmails.length && !allowedEmails.includes(email)) return res.status(403).json({ error: 'not_allowed' });
    if (tooMany(`reg:${req.ip}`, 10)) return res.status(429).json({ error: 'too_many' });
    fail(`reg:${req.ip}`); // counts attempts, not only failures

    const existing = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
    if (existing && (existing.totp_enabled || !existing.password_hash)) {
      // a finished account, or a Google account with this address
      return res.status(409).json({ error: existing.password_hash ? 'exists' : 'google_account' });
    }
    const hash = await hashPassword(password);
    let user;
    if (existing) { // an unfinished sign-up with this address: start over
      db.prepare('UPDATE users SET name = ?, password_hash = ? WHERE id = ?').run(name, hash, existing.id);
      user = userById(existing.id);
    } else {
      const r = db.prepare('INSERT INTO users (google_sub, email, name, picture, password_hash) VALUES (?, ?, ?, ?, ?)')
        .run(`local:${email}`, email, name, '', hash);
      user = userById(r.lastInsertRowid);
    }
    res.json(await setupFor(user));
  });

  // finish authenticator setup (after sign-up, or a first login of an unfinished account)
  app.post('/api/auth/totp/confirm', (req, res) => {
    const p = read(req.body?.challenge, 'setup');
    const user = p && userById(p.uid);
    if (!user?.totp_secret) return res.status(401).json({ error: 'expired' });
    if (tooMany(`totp:${user.id}`, 8)) return res.status(429).json({ error: 'too_many' });
    const step = checkTotp(unseal(user.totp_secret), String(req.body?.code || '').trim(), null);
    if (step === null) { fail(`totp:${user.id}`); return res.status(401).json({ error: 'code' }); }
    const { codes, stored } = newRecoveryCodes();
    db.prepare('UPDATE users SET totp_enabled = 1, totp_last_step = ?, recovery_codes = ? WHERE id = ?').run(step, stored, user.id);
    const fresh = userById(user.id);
    rememberDevice(res, fresh);
    setSession(res, fresh.id);
    res.json({ user: publicUser(fresh), settings: settingsOf(fresh), recoveryCodes: codes });
  });

  // ---------- sign in ----------
  app.post('/api/auth/login', async (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (tooMany(`login:${email}`, 10) || tooMany(`ip:${req.ip}`, 30)) return res.status(429).json({ error: 'too_many' });
    const user = email && db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(email);
    const ok = await checkPassword(password, user?.password_hash || DUMMY_HASH);
    if (!user?.password_hash || !ok) {
      fail(`login:${email}`);
      fail(`ip:${req.ip}`);
      return res.status(401).json({ error: user && !user.password_hash ? 'google_account' : 'invalid' });
    }
    if (!user.totp_enabled) return res.json(await setupFor(user));
    if (isTrusted(req, user)) return signedIn(res, user);
    res.json({ stage: '2fa', challenge: sign({ uid: user.id, stage: '2fa' }, '10m') });
  });

  app.post('/api/auth/login/verify', (req, res) => {
    const p = read(req.body?.challenge, '2fa');
    const user = p && userById(p.uid);
    if (!user?.totp_enabled) return res.status(401).json({ error: 'expired' });
    if (tooMany(`totp:${user.id}`, 8)) return res.status(429).json({ error: 'too_many' });
    const code = String(req.body?.code || '').trim();
    if (/^\d{6}$/.test(code)) {
      const step = checkTotp(unseal(user.totp_secret), code, user.totp_last_step);
      if (step === null) { fail(`totp:${user.id}`); return res.status(401).json({ error: 'code' }); }
      db.prepare('UPDATE users SET totp_last_step = ? WHERE id = ?').run(step, user.id); // a code works only once
    } else {
      // a recovery code: each one works once
      const list = JSON.parse(user.recovery_codes || '[]');
      const i = list.indexOf(sha(normCode(code)));
      if (i === -1) { fail(`totp:${user.id}`); return res.status(401).json({ error: 'code' }); }
      list.splice(i, 1);
      db.prepare('UPDATE users SET recovery_codes = ? WHERE id = ?').run(JSON.stringify(list), user.id);
    }
    rememberDevice(res, user);
    signedIn(res, user);
  });

  // ---------- settings: password, recovery codes, trusted devices ----------
  app.get('/api/auth/security', auth, (req, res) => {
    res.json({
      password: !!req.user.password_hash,
      totp: !!req.user.totp_enabled,
      recoveryLeft: JSON.parse(req.user.recovery_codes || '[]').length,
    });
  });

  app.post('/api/auth/password', auth, async (req, res) => {
    const { current = '', next = '' } = req.body || {};
    if (String(next).length < 8 || String(next).length > 200) return res.status(400).json({ error: 'password' });
    if (tooMany(`pw:${req.user.id}`, 8)) return res.status(429).json({ error: 'too_many' });
    if (!(await checkPassword(String(current), req.user.password_hash || DUMMY_HASH))) {
      fail(`pw:${req.user.id}`);
      return res.status(401).json({ error: 'invalid' });
    }
    // a new password also signs out every remembered device except this one
    const epoch = (req.user.device_epoch || 0) + 1;
    db.prepare('UPDATE users SET password_hash = ?, device_epoch = ? WHERE id = ?').run(await hashPassword(String(next)), epoch, req.user.id);
    rememberDevice(res, userById(req.user.id));
    res.json({ ok: true });
  });

  app.post('/api/auth/recovery', auth, (req, res) => {
    const user = req.user;
    if (!user.totp_enabled) return res.status(400).json({ error: 'no_totp' });
    if (tooMany(`totp:${user.id}`, 8)) return res.status(429).json({ error: 'too_many' });
    const step = checkTotp(unseal(user.totp_secret), String(req.body?.code || '').trim(), user.totp_last_step);
    if (step === null) { fail(`totp:${user.id}`); return res.status(401).json({ error: 'code' }); }
    const { codes, stored } = newRecoveryCodes();
    db.prepare('UPDATE users SET recovery_codes = ?, totp_last_step = ? WHERE id = ?').run(stored, step, user.id);
    res.json({ recoveryCodes: codes });
  });

  app.post('/api/auth/forget-devices', auth, (req, res) => {
    db.prepare('UPDATE users SET device_epoch = COALESCE(device_epoch, 0) + 1 WHERE id = ?').run(req.user.id);
    rememberDevice(res, userById(req.user.id)); // keep this one
    res.json({ ok: true });
  });
}
