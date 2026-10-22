import { useEffect, useRef } from 'react';

/**
 * Keeps data fresh without a page reload: runs `refresh` every `ms` while the page is visible,
 * and right away when the user comes back to it (another tab, phone unlocked).
 * Nothing is fetched while the page is hidden.
 */
export function useLiveRefresh(refresh, ms, enabled = true) {
  const fn = useRef(refresh);
  fn.current = refresh;

  useEffect(() => {
    if (!enabled) return undefined;
    let last = Date.now();
    const run = () => {
      if (document.visibilityState !== 'visible') return;
      last = Date.now();
      fn.current();
    };
    const t = setInterval(run, ms);
    // coming back after a while: refresh at once (but not on every quick alt-tab)
    const onBack = () => { if (Date.now() - last > 3000) run(); };
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
    };
  }, [ms, enabled]);
}
