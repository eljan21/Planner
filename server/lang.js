/** The user's interface language — server messages (Telegram, push, Excel) follow it. English by default. */
export const LANGS = ['en', 'az'];

export function langOf(user) {
  try { return JSON.parse(user?.settings || '{}').lang === 'az' ? 'az' : 'en'; } catch { return 'en'; }
}

/** pick the text for a language: tr('az', 'Salam', 'Hello') */
export const tr = (lang, az, en) => (lang === 'az' ? az : en);

/** language of an API request: what the browser is showing right now, else the saved setting */
export const requestLang = (req) => (LANGS.includes(req.get('x-lang')) ? req.get('x-lang') : langOf(req.user));
