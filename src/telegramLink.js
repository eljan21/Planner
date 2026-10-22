import { useEffect, useState } from 'react';
import { api } from './api';
import { tr } from './i18n';

/**
 * Connecting the Telegram bot: open t.me/<bot>?start=<code>, then wait for the user to press Start there.
 * Shared by the onboarding step and the settings page.
 */
export function useTelegramLink() {
  const [tg, setTg] = useState(null); // { enabled, bot, linked }
  const [waiting, setWaiting] = useState(false);
  const [justLinked, setJustLinked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.telegram().then(setTg).catch(() => setTg({ enabled: false })); }, []);

  useEffect(() => {
    if (!waiting) return undefined;
    const t = setInterval(async () => {
      const s = await api.telegram().catch(() => null);
      if (s?.linked) { setTg(s); setWaiting(false); setJustLinked(true); }
    }, 2500);
    const stop = setTimeout(() => setWaiting(false), 3 * 60e3);
    return () => { clearInterval(t); clearTimeout(stop); };
  }, [waiting]);

  const connect = async () => {
    setError('');
    const win = window.open('', '_blank'); // opened right away so the browser doesn't block it
    try {
      const { url } = await api.telegramLink();
      if (win) win.location.href = url; else window.location.href = url;
      setWaiting(true);
    } catch {
      win?.close();
      setError(tr('Bota qoşulmaq olmadı. Bir az sonra yenidən cəhd et.', "Couldn't reach the bot. Try again in a moment."));
    }
  };

  const disconnect = async () => {
    await api.telegramUnlink().catch(() => {});
    setTg((t) => ({ ...t, linked: false }));
    setJustLinked(false);
  };

  return { tg, waiting, justLinked, error, connect, disconnect };
}
