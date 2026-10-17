import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { IconMoon, IconSun } from './Icons';

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

export default function Login({ config, appName, onLogin, theme, onToggleTheme }) {
  const btnRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!config?.googleClientId) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled) return;
        window.google.accounts.id.initialize({
          client_id: config.googleClientId,
          callback: async ({ credential }) => {
            setBusy(true);
            setError('');
            try {
              onLogin(await api.googleLogin(credential));
            } catch (e) {
              setError(e.status === 403
                ? 'Bu Gmail hesabının girişə icazəsi yoxdur.'
                : 'Giriş alınmadı. Bir daha cəhd edin.');
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width: 300, locale: 'az',
        });
      })
      .catch(() => setError('Google xidmətinə qoşulmaq olmadı. İnterneti yoxlayın.'));
    return () => { cancelled = true; };
  }, [config, onLogin]);

  const devLogin = async () => {
    onLogin(await api.devLogin());
  };

  return (
    <div className="login">
      <button className="theme-toggle login-theme" onClick={onToggleTheme} aria-label="Gecə/gündüz rejimi" title="Gecə/gündüz rejimi">
        {theme === 'dark' ? <IconSun /> : <IconMoon />}
      </button>
      <div className="login-hero">
        <div className="brand brand-lg"><span className="logo">✓</span>{appName}</div>
        <h1>Həftəni planla.<br /><span>Günlərini rahat idarə et.</span></h1>
        <ul className="login-features">
          <li><span>🗓️</span> Tapşırıqlar günlər üzrə, həftəlik görünüşdə</li>
          <li><span>👆</span> Sürüşdür və burax — başqa günə, başqa həftəyə</li>
          <li><span>✅</span> Tamamlananlar ayrıca bölmədə</li>
          <li><span>📊</span> Həftəlik və ümumi hesabat — Excel-ə yüklə</li>
        </ul>
        <div className="mock" aria-hidden="true">
          {['B.e', 'Ç.a', 'Çər'].map((d, i) => (
            <div className="mock-col" key={d}>
              <div className="mock-head">{d}</div>
              <div className={`mock-card c-${['blue', 'green', 'pink'][i]}`} />
              {i !== 1 && <div className={`mock-card short c-${['orange', 'blue', 'purple'][i]}`} />}
              {i === 0 && <div className="mock-card c-green" />}
            </div>
          ))}
        </div>
      </div>

      <div className="login-card">
        <h2>Xoş gəldin 👋</h2>
        <p className="muted">Davam etmək üçün Gmail hesabınla daxil ol.</p>
        {config?.googleClientId
          ? <div className="google-btn" ref={btnRef} />
          : !config?.devLogin && <p className="error">GOOGLE_CLIENT_ID təyin edilməyib (.env faylına baxın).</p>}
        {config?.devLogin && (
          <button className="btn btn-block" onClick={devLogin}>Demo giriş (sınaq üçün)</button>
        )}
        {busy && <p className="muted">Daxil olunur…</p>}
        {error && <p className="error">{error}</p>}
        <p className="fine">Məlumatların yalnız sənin hesabına bağlıdır.</p>
      </div>
    </div>
  );
}
