import { useEffect } from 'react';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

/** Appearance remembered in the browser — used before sign-in (login page) and to avoid a flash on load. */
export function localAppearance() {
  const theme = read('tp_theme');
  return {
    theme: ['light', 'dark', 'system'].includes(theme) ? theme : 'system',
    accent: read('tp_accent') || 'lime',
    density: read('tp_density') || 'comfortable',
  };
}

const systemDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
export const resolveTheme = (pref) => (pref === 'system' ? (systemDark() ? 'dark' : 'light') : pref);

function apply({ theme, accent, density }) {
  const el = document.documentElement;
  const resolved = resolveTheme(theme);
  el.dataset.theme = resolved;
  el.dataset.accent = accent;
  el.dataset.density = density;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#0d1834' : '#ffffff');
  write('tp_theme', theme);
  write('tp_accent', accent);
  write('tp_density', density);
}

export function useAppearance({ theme, accent, density }) {
  useEffect(() => {
    apply({ theme, accent, density });
    if (theme !== 'system' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply({ theme, accent, density });
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, accent, density]);
}
