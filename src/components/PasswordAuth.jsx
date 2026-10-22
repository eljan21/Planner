import { useEffect, useState } from 'react';
import { api } from '../api';
import { tr } from '../i18n';

const ERRORS = {
  invalid: ['Email və ya parol yanlışdır.', 'Wrong email or password.'],
  google_account: ['Bu email Google ilə qeydiyyatdadır — yuxarıdakı «Google ilə davam et» düyməsindən istifadə et.', 'This email is registered with Google — use the «Continue with Google» button above.'],
  exists: ['Bu email ilə hesab artıq var. «Daxil ol» bölməsinə keç.', 'An account with this email already exists. Switch to «Sign in».'],
  email: ['Email ünvanını düzgün yaz.', 'Enter a valid email address.'],
  password: ['Parol ən azı 8 simvol olmalıdır.', 'The password needs at least 8 characters.'],
  name: ['Adını yaz.', 'Enter your name.'],
  code: ['Kod yanlışdır. Tətbiqdəki ən son kodu yaz.', "That code isn't right. Enter the latest code from the app."],
  expired: ['Vaxt bitdi. Yenidən daxil ol.', 'This took too long. Please sign in again.'],
  too_many: ['Çox cəhd oldu. 15 dəqiqə sonra yenidən yoxla.', 'Too many attempts. Try again in 15 minutes.'],
  not_allowed: ['Bu email ilə qeydiyyata icazə yoxdur.', 'Sign-up with this email is not allowed.'],
};
const message = (e) => (ERRORS[e?.code] ? tr(...ERRORS[e.code]) : tr('Nəsə alınmadı. Bir daha cəhd et.', 'Something went wrong. Please try again.'));

/** the eight one-time recovery codes, shown once */
export function RecoveryCodes({ codes, onDone, doneLabel = tr('Saxladım, davam et', "I've saved them, continue") }) {
  const [copied, setCopied] = useState(false);
  const text = `${tr('Plan it! bərpa kodları (hər biri bir dəfə işləyir)', 'Plan it! recovery codes (each works once)')}\n\n${codes.join('\n')}\n`;
  const copy = async () => { try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* select manually */ } };
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = tr('plan-it-berpa-kodlari.txt', 'plan-it-recovery-codes.txt');
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="auth-step">
      <h2>{tr('Bərpa kodlarını saxla', 'Save your recovery codes')}</h2>
      <p className="muted">{tr('Telefonun itsə, autentifikator kodu əvəzinə bunlardan biri ilə girə bilərsən. Hər kod bir dəfə işləyir. Bu kodlar bir daha göstərilməyəcək.', "If you lose your phone, sign in with one of these instead of an authenticator code. Each works once. They won't be shown again.")}</p>
      <ul className="recovery">{codes.map((c) => <li key={c}><code>{c}</code></li>)}</ul>
      <div className="auth-row">
        <button type="button" className="btn sm" onClick={copy}>{copied ? tr('Kopyalandı ✓', 'Copied ✓') : tr('Kopyala', 'Copy')}</button>
        <button type="button" className="btn sm" onClick={download}>{tr('Fayl kimi yüklə', 'Download as file')}</button>
      </div>
      <button type="button" className="btn primary btn-block" onClick={onDone}>{doneLabel}</button>
    </div>
  );
}

function CodeInput({ value, onChange, allowRecovery }) {
  return (
    <input
      className="code-input"
      inputMode={allowRecovery ? 'text' : 'numeric'}
      autoComplete="one-time-code"
      autoFocus
      maxLength={allowRecovery ? 12 : 6}
      placeholder={allowRecovery ? 'XXXX-XXXX' : '123456'}
      value={value}
      onChange={(e) => onChange(allowRecovery ? e.target.value : e.target.value.replace(/\D/g, ''))}
      aria-label={tr('Kod', 'Code')}
    />
  );
}

/**
 * Email + password sign-in and sign-up, with the authenticator step.
 * `onActivity` tells the sign-in page what is going on, so the characters can react:
 * { type: 'focus' | 'type' | 'blur', field, input } · { type: 'reveal', on } · { type: 'error' }
 */
export default function PasswordAuth({ onLogin, onStage, onActivity, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // login | register
  const [stage, setStage] = useState('form'); // form | setup | 2fa | recovery
  const [form, setForm] = useState({ name: '', email: '', password: '', password2: '' });
  const [setup, setSetup] = useState(null);
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [codes, setCodes] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reveal, setReveal] = useState(false);
  const tell = (a) => onActivity?.(a);

  useEffect(() => { onStage?.(stage); }, [stage, onStage]);

  const field = (k) => ({
    value: form[k],
    onChange: (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); tell({ type: 'type', field: k, input: e.target }); },
    onFocus: (e) => tell({ type: 'focus', field: k, input: e.target }),
    onBlur: () => tell({ type: 'blur', field: k }),
  });
  const run = async (fn) => {
    setBusy(true);
    setError('');
    try { await fn(); } catch (e) { setError(message(e)); tell({ type: 'error' }); } finally { setBusy(false); }
  };
  const afterPassword = (r) => {
    if (r.stage === 'setup') { setSetup(r); setChallenge(r.challenge); setCode(''); setStage('setup'); return; }
    if (r.stage === '2fa') { setChallenge(r.challenge); setCode(''); setStage('2fa'); return; }
    onLogin(r);
  };

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'register' && form.password !== form.password2) { setError(tr('Parollar eyni deyil.', "The passwords don't match.")); tell({ type: 'error' }); return; }
    run(async () => afterPassword(mode === 'register'
      ? await api.register({ name: form.name, email: form.email, password: form.password })
      : await api.login(form.email, form.password)));
  };
  const confirmSetup = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api.confirmTotp(challenge, code);
      setResult(r);
      setCodes(r.recoveryCodes);
      setStage('recovery');
    });
  };
  const verify = (e) => {
    e.preventDefault();
    run(async () => onLogin(await api.verifyLogin(challenge, code)));
  };
  const back = () => { setStage('form'); setError(''); setCode(''); };

  if (stage === 'recovery') return <RecoveryCodes codes={codes} onDone={() => onLogin(result)} />;

  if (stage === 'setup') {
    return (
      <form className="auth-step" onSubmit={confirmSetup}>
        <h2>{tr('İki addımlı doğrulama', 'Two-step verification')}</h2>
        <ol className="auth-steps">
          <li>{tr('Telefonunda', 'On your phone, open')} <b>Google Authenticator</b> {tr('və ya', 'or')} <b>Authy</b>{tr(' aç.', '.')}</li>
          <li>{tr('Bu QR kodu skan et (və ya kodu əl ilə yaz).', 'Scan this QR code (or type the key in by hand).')}</li>
          <li>{tr('Tətbiqdə görünən 6 rəqəmli kodu aşağıya yaz.', 'Enter the 6-digit code the app shows.')}</li>
        </ol>
        <img className="qr" src={setup.qr} alt={tr('Autentifikator üçün QR kod', 'QR code for the authenticator')} width="180" height="180" />
        <a className="link-btn" href={setup.uri}>{tr('Telefondasan? Bura bas — tətbiqdə açılsın', 'On your phone? Tap here to open it in the app')}</a>
        <code className="secret" aria-label={tr('Gizli açar', 'Secret key')}>{setup.secret}</code>
        <CodeInput value={code} onChange={setCode} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary btn-block" disabled={busy || code.length !== 6}>{busy ? tr('Yoxlanılır…', 'Checking…') : tr('Təsdiqlə', 'Confirm')}</button>
        <button type="button" className="link-btn" onClick={back}>{tr('Geri', 'Back')}</button>
      </form>
    );
  }

  if (stage === '2fa') {
    return (
      <form className="auth-step" onSubmit={verify}>
        <h2>{tr('Yeni cihaz — kodu yaz', 'New device — enter the code')}</h2>
        <p className="muted">
          {useRecovery ? tr('Bərpa kodlarından birini yaz.', 'Enter one of your recovery codes.') : tr('Autentifikator tətbiqindəki 6 rəqəmli kodu yaz. Bu cihaz 30 gün yadda saxlanacaq.', "Enter the 6-digit code from your authenticator app. This device will be remembered for 30 days.")}
        </p>
        <CodeInput value={code} onChange={setCode} allowRecovery={useRecovery} />
        {error && <p className="error">{error}</p>}
        <button className="btn primary btn-block" disabled={busy || (useRecovery ? code.length < 8 : code.length !== 6)}>{busy ? tr('Yoxlanılır…', 'Checking…') : tr('Daxil ol', 'Sign in')}</button>
        <button type="button" className="link-btn" onClick={() => { setUseRecovery((u) => !u); setCode(''); setError(''); }}>
          {useRecovery ? tr('Autentifikator kodu ilə gir', 'Use an authenticator code') : tr('Telefon yanımda deyil — bərpa kodu ilə gir', "No phone with me — use a recovery code")}
        </button>
        <button type="button" className="link-btn" onClick={back}>{tr('Geri', 'Back')}</button>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <div className="auth-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'on' : ''} onClick={() => { setMode('login'); setError(''); }}>{tr('Daxil ol', 'Sign in')}</button>
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'on' : ''} onClick={() => { setMode('register'); setError(''); }}>{tr('Qeydiyyat', 'Sign up')}</button>
      </div>
      {mode === 'register' && <input {...field('name')} placeholder={tr('Adın', 'Your name')} autoComplete="name" maxLength={60} required aria-label={tr('Adın', 'Your name')} />}
      <input {...field('email')} type="email" placeholder="Email" autoComplete="email" required aria-label="Email" />
      <div className="pw-wrap">
        <input
          {...field('password')}
          type={reveal ? 'text' : 'password'}
          placeholder={mode === 'register' ? tr('Parol (ən azı 8 simvol)', 'Password (8+ characters)') : tr('Parol', 'Password')}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          minLength={mode === 'register' ? 8 : undefined}
          required
          aria-label={tr('Parol', 'Password')}
        />
        <button
          type="button"
          className="pw-eye"
          aria-label={reveal ? tr('Parolu gizlət', 'Hide password') : tr('Parolu göstər', 'Show password')}
          aria-pressed={reveal}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { setReveal((r) => !r); tell({ type: 'reveal', on: !reveal }); }}
        >
          {reveal ? (
            <svg viewBox="0 0 24 24"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M4 4l16 16M9.9 5.7A9.6 9.6 0 0 1 12 5.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-3.2 4M6.1 7.6C3.8 9.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
          )}
        </button>
      </div>
      {mode === 'register' && <input {...field('password2')} type={reveal ? 'text' : 'password'} placeholder={tr('Parolu təkrar yaz', 'Repeat the password')} autoComplete="new-password" required aria-label={tr('Parolu təkrar yaz', 'Repeat the password')} />}
      {error && <p className="error">{error}</p>}
      <button className="btn primary btn-block" disabled={busy}>{busy ? tr('Gözlə…', 'Please wait…') : mode === 'register' ? tr('Qeydiyyatdan keç', 'Create account') : tr('Daxil ol', 'Sign in')}</button>
      {mode === 'register' && <p className="fine">{tr('Növbəti addımda telefonundakı autentifikator tətbiqini qoşacaqsan.', "Next, you'll connect the authenticator app on your phone.")}</p>}
    </form>
  );
}
