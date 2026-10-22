import { useEffect, useState } from 'react';
import { api } from './api';

// ---------- installing the app ----------
export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Chrome / Android / desktop offer their own install dialog; keep the event so a button can open it later
let deferredInstall = null;
const installListeners = new Set();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  installListeners.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  deferredInstall = null;
  installListeners.forEach((fn) => fn(false));
});

/** 'installed' | 'prompt' (a button can install it) | 'ios' (needs the Share → Add to Home Screen steps) | 'none' */
export function useInstallState() {
  const get = () => (isStandalone() ? 'installed' : deferredInstall ? 'prompt' : isIOS() ? 'ios' : 'none');
  const [state, setState] = useState(get);
  useEffect(() => {
    const fn = () => setState(get());
    installListeners.add(fn);
    return () => installListeners.delete(fn);
  }, []);
  const install = async () => {
    if (!deferredInstall) return;
    try {
      await deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null; // the event can be used only once
    } catch { /* the browser refused (e.g. not from a tap) — keep the button */ }
    setState(get());
  };
  return { state, install };
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ---------- phone notifications ----------
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function urlBase64ToUint8Array(base64) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * 'unsupported' — this browser can't (on iPhone: until the app is added to the Home Screen)
 * 'off' — not asked yet · 'on' — subscribed · 'blocked' — the user said no in the browser
 */
export function usePush() {
  const [state, setState] = useState('off');

  const check = async () => {
    if (!pushSupported()) { setState('unsupported'); return; }
    if (Notification.permission === 'denied') { setState('blocked'); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) api.pushSubscribe(sub.toJSON()).catch(() => {}); // keep the server in sync (new login on this device)
    setState(sub ? 'on' : 'off');
  };
  useEffect(() => { check().catch(() => setState('unsupported')); }, []);

  /** must run from a tap — iPhone only asks for permission then */
  const enable = async () => {
    if (!pushSupported()) return false;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { setState(permission === 'denied' ? 'blocked' : 'off'); return false; }
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api.pushKey();
    const sub = (await reg.pushManager.getSubscription())
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    await api.pushSubscribe(sub.toJSON());
    setState('on');
    return true;
  };

  const disable = async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api.pushUnsubscribe(sub.endpoint).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
    setState('off');
  };

  return { state, enable, disable };
}

// ---------- invite links: /?dost=CODE ----------
const INVITE_KEY = 'tp_invite';

/** remembers an invite code from the address bar (until the visitor has signed in) and cleans the URL */
export function captureInvite() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('dost');
  if (code) {
    try { localStorage.setItem(INVITE_KEY, code); } catch { /* ignore */ }
    params.delete('dost');
    const rest = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${rest ? `?${rest}` : ''}${window.location.hash}`);
  }
}
export const pendingInvite = () => { try { return localStorage.getItem(INVITE_KEY); } catch { return null; } };
export const clearInvite = () => { try { localStorage.removeItem(INVITE_KEY); } catch { /* ignore */ } };
export const inviteLink = (code) => `${window.location.origin}/?dost=${code}`;
