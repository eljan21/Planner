// Telegram bot: links a planner account to a chat; deadline reminders go out here and as phone notifications.
// Uses long polling (getUpdates), so no public webhook URL is needed — the server just has to stay awake.
import crypto from 'node:crypto';
import { db } from './db.js';
import { tr } from './lang.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const API = `${process.env.TELEGRAM_API_URL || 'https://api.telegram.org'}/bot${TOKEN}`; // URL override is for local tests
export const telegramEnabled = !!TOKEN;
let botUsername = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const parseJson = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function call(method, body = {}) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

export const sendMessage = (chatId, text, extra = {}) =>
  call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true, ...extra });

export async function getBotUsername() {
  if (!botUsername && TOKEN) botUsername = (await call('getMe')).username;
  return botUsername;
}

// ---------- account linking: the app hands out a one-time code, the user opens t.me/<bot>?start=<code> ----------
export async function linkUrl(uid) {
  const code = crypto.randomBytes(9).toString('base64url');
  db.prepare('UPDATE users SET telegram_code = ? WHERE id = ?').run(code, uid);
  return `https://t.me/${await getBotUsername()}?start=${code}`;
}

export function unlink(uid) {
  db.prepare('UPDATE users SET telegram_chat_id = NULL, telegram_code = NULL WHERE id = ?').run(uid);
}

// ---------- the character of the day, as in the app (src/characters/people.js) ----------
export const CHARACTERS = ['rachel', 'hermione', 'widow', 'monica', 'harry', 'phoebe', 'wanda', 'chandler'];
const BUDDIES = {
  rachel: ['Rachel', 'Deadline yaxınlaşır! Qəhvəni götür və bunu bitir.', 'The deadline is coming! Grab your coffee and finish this.'],
  hermione: ['Hermione', 'Plan qurmuşduq, xatırlayırsan? İndi icra vaxtıdır!', 'We made a plan, remember? Now we follow it!'],
  widow: ['Natasha', 'Vaxt azalır. Missiyanı tamamla.', 'Time is running out. Complete the mission.'],
  monica: ['Monica', 'Siyahıda bitməmiş iş qalmamalıdır! Haydı!', 'No unfinished items on my list! Go, go, go!'],
  harry: ['Harry', 'Hermione bunu çoxdan bitirərdi. Sən də bacararsan!', "Hermione would've finished this ages ago. You can do it too!"],
  phoebe: ['Phoebe', 'Kainat deyir ki, bu işin vaxtı gəldi.', "The universe says it's time for this one."],
  wanda: ['Wanda', 'Zamanı dayandıra bilmərəm... yəqin. Ona görə bitir bunu.', "I can't stop time... probably. So finish this."],
  chandler: ['Chandler', 'Deadline gəlir. Bundan da yaxın ola bilərdimi?', 'The deadline is coming. Could it BE any closer?'],
};
const MONTHS = {
  az: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
const langIn = (settings) => (settings.lang === 'az' ? 'az' : 'en');

/** calendar parts of an instant in the user's time zone */
function partsIn(date, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, time: `${p.hour}:${p.minute}` };
}

/** same rotation as the app: through the user's own crew, by day number in their time zone */
function buddyOfDay(settings) {
  const crew = CHARACTERS.filter((id) => settings.crew?.includes(id));
  const list = crew.length ? crew : CHARACTERS;
  const { y, m, d } = partsIn(new Date(), tzOf(settings));
  const [name, az, en] = BUDDIES[list[Math.floor(Date.UTC(y, m - 1, d) / 864e5) % list.length]];
  return [name, tr(langIn(settings), az, en)];
}

const formatWhen = (iso, tz, lang) => {
  const p = partsIn(new Date(iso), tz);
  return `${p.d} ${MONTHS[lang][p.m - 1]}, ${p.time}`;
};

function timeLeft(iso, lang) {
  const min = Math.round((Date.parse(iso) - Date.now()) / 60000);
  if (min < 0) return tr(lang, 'deadline keçib', 'deadline passed');
  if (min < 60) return tr(lang, `${min} dəqiqə qalıb`, `${min} min left`);
  const h = Math.floor(min / 60);
  if (h < 24) return tr(lang, `${h} saat${min % 60 ? ` ${min % 60} dəqiqə` : ''} qalıb`, `${h} h${min % 60 ? ` ${min % 60} min` : ''} left`);
  const days = Math.round(h / 24);
  return tr(lang, `${days} gün qalıb`, `${days} day${days === 1 ? '' : 's'} left`);
}

function reminderText(task, settings) {
  const tz = tzOf(settings);
  const lang = langIn(settings);
  const [name, line] = buddyOfDay(settings);
  const lines = [`⏰ <b>${tr(lang, 'Xatırlatma', 'Reminder')}</b>`, tr(lang, `«${esc(task.title)}»`, `“${esc(task.title)}”`)];
  if (task.deadline) lines.push(`Deadline: <b>${formatWhen(task.deadline, tz, lang)}</b> · ${timeLeft(task.deadline, lang)}`);
  lines.push('', `<i>${name}: ${line}</i>`);
  return lines.join('\n');
}

const tzOf = (settings) => (typeof settings.tz === 'string' && settings.tz ? settings.tz : 'Asia/Baku');
const settingsOf = (json) => parseJson(json || '{}', {});

/** fire-and-forget message to a user, if they linked Telegram */
export function notify(uid, text) {
  if (!TOKEN) return;
  const u = db.prepare('SELECT telegram_chat_id FROM users WHERE id = ?').get(uid);
  if (u?.telegram_chat_id) sendMessage(u.telegram_chat_id, esc(text)).catch((e) => console.error('telegram notify:', e.message));
}

export async function sendTest(uid) {
  const u = db.prepare('SELECT telegram_chat_id, settings FROM users WHERE id = ?').get(uid);
  if (!u?.telegram_chat_id) throw new Error('not_linked');
  const settings = settingsOf(u.settings);
  const [name, line] = buddyOfDay(settings);
  const ok = tr(langIn(settings), '✅ Hər şey işləyir! Deadline xatırlatmaları bura gələcək.', '✅ All set! Deadline reminders will arrive here.');
  await sendMessage(u.telegram_chat_id, `${ok}\n\n<i>${name}: ${line}</i>`);
}

// ---------- reminder loop ----------
const STALE = 6 * 3600e3; // a reminder missed by more than this (server was asleep) is dropped, not sent late

/** the same reminder as a phone notification: short title, details in the body */
function reminderPush(task, settings) {
  const tz = tzOf(settings);
  const lang = langIn(settings);
  const [name, line] = buddyOfDay(settings);
  const when = task.deadline ? `Deadline: ${formatWhen(task.deadline, tz, lang)} · ${timeLeft(task.deadline, lang)}. ` : '';
  return {
    title: `⏰ ${task.title}`,
    body: `${when}${name}: ${line}`,
    url: '/',
    tag: `remind-${task.id}`,
    actions: [{ action: `done:${task.id}`, title: tr(lang, '✅ Bitdi', '✅ Done') }],
  };
}

async function deliverDue({ sendPush, hasPush }) {
  const rows = db.prepare(`
    SELECT t.id, t.user_id, t.title, t.deadline, t.reminders, u.telegram_chat_id AS chat, u.settings AS usettings
    FROM tasks t JOIN users u ON u.id = t.user_id
    WHERE t.done = 0 AND t.reminders != '[]'
  `).all();
  const now = Date.now();
  for (const row of rows) {
    const list = parseJson(row.reminders, []);
    let changed = false;
    for (const r of list) {
      if (r.sent || Date.parse(r.at) > now) continue;
      r.sent = true;
      changed = true;
      if (now - Date.parse(r.at) > STALE) continue;
      const settings = settingsOf(row.usettings);
      if (TOKEN && row.chat) {
        try {
          await sendMessage(row.chat, reminderText(row, settings), {
            reply_markup: { inline_keyboard: [[{ text: tr(langIn(settings), '✅ Bitdi', '✅ Done'), callback_data: `done:${row.id}` }]] },
          });
        } catch (e) {
          console.error('telegram reminder failed:', e.message);
        }
      }
      if (hasPush(row.user_id)) await sendPush(row.user_id, reminderPush(row, settings));
    }
    if (changed) db.prepare('UPDATE tasks SET reminders = ? WHERE id = ?').run(JSON.stringify(list), row.id);
  }
}

// ---------- incoming messages ----------
async function handle(update) {
  const msg = update.message;
  if (msg?.text) {
    const chat = String(msg.chat.id);
    const [cmd, code] = msg.text.trim().split(/\s+/);
    // the linked account's language; before linking, the Telegram app's language
    const linked = db.prepare('SELECT settings FROM users WHERE telegram_chat_id = ?').get(chat);
    let lang = linked ? langIn(settingsOf(linked.settings)) : (msg.from?.language_code === 'az' ? 'az' : 'en');
    if (cmd === '/start' && code) {
      const user = db.prepare('SELECT id, name, settings FROM users WHERE telegram_code = ?').get(code);
      if (user) {
        db.prepare('UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ?').run(chat);
        db.prepare('UPDATE users SET telegram_chat_id = ?, telegram_code = NULL WHERE id = ?').run(chat, user.id);
        const settings = settingsOf(user.settings);
        lang = langIn(settings);
        const called = settings.name || (user.name || tr(lang, 'dost', 'friend')).split(' ')[0];
        await sendMessage(chat, tr(lang,
          `Salam, ${esc(called)}! 👋\nPlan it!-ə qoşuldun. Tapşırığa deadline və xatırlatma qoyanda mesaj bura gələcək.`,
          `Hi, ${esc(called)}! 👋\nYou're connected to Plan it!. When you set a deadline and reminder on a task, the message will arrive here.`));
        return;
      }
      await sendMessage(chat, tr(lang,
        'Bu kodun vaxtı keçib. Plan it!-də Ayarlar → Telegram → «Qoş» düyməsinə yenidən bas.',
        'This code has expired. In Plan it!, tap Settings → Telegram → «Connect» again.'));
      return;
    }
    if (cmd === '/stop') {
      db.prepare('UPDATE users SET telegram_chat_id = NULL WHERE telegram_chat_id = ?').run(chat);
      await sendMessage(chat, tr(lang,
        'Xatırlatmalar dayandırıldı. Yenidən qoşulmaq üçün Plan it! ayarlarından istifadə et.',
        'Reminders stopped. To reconnect, use the Plan it! settings.'));
      return;
    }
    await sendMessage(chat, tr(lang,
      'Mən Plan it! botuyam. Qoşulmaq üçün Plan it!-də Ayarlar → Telegram → «Qoş» düyməsinə bas.\n/stop — xatırlatmaları dayandır',
      "I'm the Plan it! bot. To connect, tap Settings → Telegram → «Connect» in Plan it!.\n/stop — stop reminders"));
    return;
  }

  const cb = update.callback_query;
  if (cb?.data?.startsWith('done:')) {
    const chat = String(cb.message.chat.id);
    const id = Number(cb.data.slice(5));
    const owner = db.prepare('SELECT id, settings FROM users WHERE telegram_chat_id = ?').get(chat);
    const lang = owner ? langIn(settingsOf(owner.settings)) : 'en';
    const task = owner && db.prepare('SELECT id, done FROM tasks WHERE id = ? AND user_id = ?').get(id, owner.id);
    if (task && !task.done) {
      db.prepare('UPDATE tasks SET done = 1, done_at = ? WHERE id = ?').run(new Date().toISOString(), id);
    }
    await call('answerCallbackQuery', { callback_query_id: cb.id, text: task ? tr(lang, 'Bitdi! 👏', 'Done! 👏') : tr(lang, 'Tapşırıq tapılmadı', 'Task not found') });
    if (task) {
      await call('editMessageText', {
        chat_id: chat, message_id: cb.message.message_id, parse_mode: 'HTML',
        text: `${esc(cb.message.text)}\n\n${tr(lang, '✅ <b>Bitdi!</b> Əla iş! 👏', '✅ <b>Done!</b> Great job! 👏')}`,
      }).catch(() => {});
    }
  }
}

async function poll() {
  let offset = 0;
  for (;;) {
    try {
      const updates = await call('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] });
      for (const u of updates) {
        offset = u.update_id + 1;
        await handle(u).catch((e) => console.error('telegram update failed:', e.message));
      }
    } catch (e) {
      console.error('telegram polling:', e.message);
      await sleep(5000);
    }
  }
}

export function startTelegram() {
  if (!TOKEN) {
    console.log('Telegram: TELEGRAM_BOT_TOKEN is not set — reminders go out as phone notifications only.');
    return;
  }
  getBotUsername().then((u) => console.log(`Telegram: @${u} is polling for messages.`)).catch((e) => console.error('Telegram:', e.message));
  poll();
}

/** checks every 30 s for reminders that are due — sent to Telegram and/or the phone, whichever the user set up */
export function startReminders(push) {
  setInterval(() => { deliverDue(push).catch((e) => console.error('reminders:', e.message)); }, 30e3);
}
