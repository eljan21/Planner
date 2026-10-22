import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { IconMoon, IconSun } from './Icons';
import PasswordAuth from './PasswordAuth';
import Brand from './Brand';
import LoginCrew from '../characters/LoginCrew';
import { pendingInvite } from '../pwa';
import { LangSwitch, tr, useLang } from '../i18n';

let measure;
/** screen point of the caret at the end of the text in an input — where the characters should look */
function caretPoint(input) {
  const r = input.getBoundingClientRect();
  const cs = getComputedStyle(input);
  measure ||= document.createElement('canvas').getContext('2d');
  measure.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const text = input.type === 'password' ? '•'.repeat(input.value.length) : input.value;
  const w = Math.min(measure.measureText(text).width, r.width - 30);
  return { x: r.left + parseFloat(cs.paddingLeft) + w, y: r.top + r.height / 2 };
}

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

export default function Login({ config, onLogin: enter, theme, onToggleTheme }) {
  const btnRef = useRef(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('form'); // the password flow's step; Google is offered only on the first one
  const lang = useLang();
  // came through a friend's invite link: say who invited, and open on sign-up
  const [inviteCode] = useState(pendingInvite);
  const [inviter, setInviter] = useState(null);
  useEffect(() => {
    if (inviteCode) api.invite(inviteCode).then((r) => setInviter(r.name)).catch(() => {});
  }, [inviteCode]);

  // ---------- what the characters do ----------
  const [base, setBase] = useState('idle'); // idle | email | password | reveal — follows the focused field
  const [flash, setFlash] = useState(null); // error | success — a short reaction on top
  const [target, setTarget] = useState(null);
  const revealed = useRef(false);
  const field = useRef(null);
  const blurTimer = useRef(null);
  const flashTimer = useRef(null);

  const react = useCallback((a) => {
    if (a.type === 'error') {
      clearTimeout(flashTimer.current);
      setFlash('error');
      flashTimer.current = setTimeout(() => setFlash(null), 1700);
      return;
    }
    if (a.type === 'reveal') {
      revealed.current = a.on;
      if (field.current?.startsWith('password')) setBase(a.on ? 'reveal' : 'password');
      return;
    }
    if (a.type === 'blur') {
      // a moment's grace: moving from one field to the next shouldn't flicker back to idle
      blurTimer.current = setTimeout(() => { field.current = null; setBase('idle'); setTarget(null); }, 150);
      return;
    }
    clearTimeout(blurTimer.current);
    field.current = a.field;
    const secret = a.field.startsWith('password');
    setBase(secret ? (revealed.current ? 'reveal' : 'password') : 'email');
    setTarget(caretPoint(a.input));
  }, []);

  // a happy jump before the planner opens
  const onLogin = useCallback((r) => {
    clearTimeout(flashTimer.current);
    setFlash('success');
    setTimeout(() => enter(r), 950);
  }, [enter]);

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
                ? tr('Bu Gmail hesabının girişə icazəsi yoxdur.', 'This Gmail account is not allowed to sign in.')
                : tr('Giriş alınmadı. Bir daha cəhd edin.', "Couldn't sign in. Please try again."));
            } finally {
              setBusy(false);
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'filled_blue', size: 'large', shape: 'pill', text: 'continue_with', width: 340, locale: lang,
        });
      })
      .catch(() => setError(tr('Google xidmətinə qoşulmaq olmadı. İnterneti yoxlayın.', "Couldn't reach Google. Check your connection.")));
    return () => { cancelled = true; };
  }, [config, onLogin, lang]); // re-drawn in the chosen language

  const devLogin = async (n) => {
    onLogin(await api.devLogin(n));
  };

  return (
    <div className="login">
      <div className="login-tools">
        <LangSwitch />
        <button className="theme-toggle" onClick={onToggleTheme} aria-label={tr('Gecə/gündüz rejimi', 'Dark / light mode')} title={tr('Gecə/gündüz rejimi', 'Dark / light mode')}>
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>
      <div className="login-hero">
        <Brand size={46} className="login-logo" />
        <h1>{tr('Gününü dostlarınla', 'Plan your day')}<br /><span>{tr('birgə planla.', 'with your friends.')}</span></h1>
        <ul className="login-features">
          <li>{tr('Bu günün işləri bir baxışda, həftə isə bir kliklə', "Today's tasks at a glance, the whole week one click away")}</li>
          <li>{tr('Friends, Harry Potter və Avengers-dən seçdiyin dostlar hər gün yanında', 'Your pick of Friends, Harry Potter and Avengers characters by your side every day')}</li>
          <li>{tr('Dostlarını əlavə et, seriyalarınızı müqayisə edin', 'Add your friends and compare your streaks')}</li>
          <li>{tr('Deadline-lar üçün Telegram xatırlatmaları', 'Deadline reminders on Telegram and your phone')}</li>
        </ul>
        <LoginCrew mode={flash || base} target={target} />
      </div>

      <div className="login-card">
        {stage === 'form' && (
          <>
            {inviter && (
              <p className="invite-note" role="status">
                👋 <b>{inviter}</b> {tr('səni Plan it!-ə dəvət edir. Daxil ol və ya qeydiyyatdan keç — avtomatik dost olacaqsınız.', "invited you to Plan it! Sign in or sign up and you'll be friends right away.")}
              </p>
            )}
            <h2>{tr('Xoş gəldin', 'Welcome')} 👋</h2>
            <p className="muted">{tr('Google hesabınla və ya email ilə daxil ol.', 'Sign in with Google or with your email.')}</p>
            {config?.googleClientId && <div className="google-btn" ref={btnRef} />}
            {busy && <p className="muted">{tr('Daxil olunur…', 'Signing in…')}</p>}
            {error && <p className="error">{error}</p>}
            <div className="or"><span>{tr('və ya email ilə', 'or with email')}</span></div>
          </>
        )}
        <PasswordAuth onLogin={onLogin} onStage={setStage} onActivity={react} initialMode={inviteCode ? 'register' : 'login'} />
        {config?.devLogin && stage === 'form' && (
          <div className="dev-logins">
            <button className="link-btn" onClick={() => devLogin(1)}>{tr('Demo giriş (sınaq üçün)', 'Demo sign-in (for testing)')}</button>
            <button className="link-btn" onClick={() => devLogin(2)}>{tr('İkinci demo hesab', 'Second demo account')}</button>
          </div>
        )}
        <p className="fine">{tr('Məlumatların yalnız sənin hesabına bağlıdır.', 'Your data belongs to your account only.')}</p>
      </div>
    </div>
  );
}
