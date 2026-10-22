import { useEffect, useState } from 'react';

// Two languages: English (default) and Azerbaijani. Texts are written in place as tr('az', 'en'),
// so each string keeps both versions side by side.
export const LANGS = ['en', 'az'];
const KEY = 'tp_lang';

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
let current = LANGS.includes(read()) ? read() : 'en';
const listeners = new Set();
document.documentElement.lang = current;

export const getLang = () => current;
/** true once the visitor picked a language themselves (it then wins over the account's saved one) */
export const langChosenHere = () => LANGS.includes(read());

export function setLang(lang) {
  if (!LANGS.includes(lang) || lang === current) return;
  current = lang;
  try { localStorage.setItem(KEY, lang); } catch { /* ignore */ }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn(lang));
}

export const tr = (az, en) => (current === 'az' ? az : en);

/** re-renders the caller when the language changes */
export function useLang() {
  const [lang, set] = useState(current);
  useEffect(() => {
    listeners.add(set);
    return () => listeners.delete(set);
  }, []);
  return lang;
}

/** an array that reads as the current language's list: DAYS[0], DAYS.map(…), DAYS.length … */
export function bilingual(az, en) {
  return new Proxy([], {
    get: (_, prop) => {
      const list = current === 'az' ? az : en;
      const v = list[prop];
      return typeof v === 'function' ? v.bind(list) : v;
    },
    has: (_, prop) => prop in (current === 'az' ? az : en),
    ownKeys: () => Reflect.ownKeys(current === 'az' ? az : en),
    getOwnPropertyDescriptor: (_, prop) => Reflect.getOwnPropertyDescriptor(current === 'az' ? az : en, prop),
  });
}

/** the toggle: EN | AZ */
export function LangSwitch({ className = '' }) {
  const lang = useLang();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label="Language / Dil">
      {LANGS.map((l) => (
        <button key={l} type="button" className={lang === l ? 'on' : ''} aria-pressed={lang === l} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
