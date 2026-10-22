import { useState } from 'react';
import { useInstallState, usePush } from '../pwa';
import { tr } from '../i18n';

const KEY = 'tp_app_banner_hidden';
const WEEK = 7 * 864e5;
const hiddenRecently = () => { try { return Date.now() - Number(localStorage.getItem(KEY) || 0) < WEEK; } catch { return false; } };
const hide = () => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } };

const ShareIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={tr('Paylaş', 'Share')}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" /><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
  </svg>
);

/**
 * On the home screen: get the app onto the phone, then switch on notifications.
 * Hidden for a week when dismissed; gone for good once both are done.
 */
export default function AppBanner() {
  const { state: install, install: runInstall } = useInstallState();
  const push = usePush();
  const [closed, setClosed] = useState(hiddenRecently);
  const [busy, setBusy] = useState(false);
  if (closed) return null;

  const close = () => { hide(); setClosed(true); };
  let body = null;
  if (install === 'ios') {
    body = (
      <span>
        📲 <b>{tr('Plan it!-i telefonuna qur:', 'Put Plan it! on your phone:')}</b> {tr('Safari-də aşağıdakı', 'in Safari tap')} <ShareIcon /> {tr('düyməsinə bas →', '→')} <b>{tr('«Ana ekrana əlavə et»', '«Add to Home Screen»')}</b>.{' '}
        {tr('Bildirişlər iPhone-da yalnız belə işləyir.', 'On iPhone, notifications only work this way.')}
      </span>
    );
  } else if (install === 'prompt') {
    body = (
      <>
        <span>📲 <b>{tr('Plan it!-i tətbiq kimi quraşdır', 'Install Plan it! as an app')}</b> — {tr('ana ekrandan bir toxunuşla açılsın.', 'open it with one tap from your home screen.')}</span>
        <button className="btn sm dark" onClick={runInstall}>{tr('Quraşdır', 'Install')}</button>
      </>
    );
  } else if (push.state === 'off') {
    body = (
      <>
        <span>🔔 <b>{tr('Bildirişləri aç', 'Turn on notifications')}</b> — {tr('deadline xatırlatmaları və dostluq xəbərləri telefonuna gəlsin.', 'get deadline reminders and friend news on your phone.')}</span>
        <button className="btn sm dark" disabled={busy} onClick={async () => { setBusy(true); await push.enable().catch(() => {}); setBusy(false); }}>{tr('Aç', 'Turn on')}</button>
      </>
    );
  }
  if (!body) return null;
  return (
    <div className="hint app-banner">
      {body}
      <button className="icon-btn sm" aria-label={tr('Bağla', 'Close')} onClick={close}>×</button>
    </div>
  );
}
