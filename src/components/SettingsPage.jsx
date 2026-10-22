import { useEffect, useState } from 'react';
import { useCategories } from '../categories';
import { useSettings } from '../settings';
import { api } from '../api';
import { useTelegramLink } from '../telegramLink';
import { RecoveryCodes } from './PasswordAuth';
import { useInstallState, usePush } from '../pwa';
import { LangSwitch, tr } from '../i18n';
import { portrait } from '../characters/figure';
import { ORDER, PEOPLE, buddyFor, crewOf } from '../characters/people';
import Folder from './Folder';
import { IconEdit, IconLogout } from './Icons';

function Section({ title, hint, children }) {
  return (
    <section className="set-section">
      <div className="set-head">
        <h2>{title}</h2>
        {hint && <p className="muted small">{hint}</p>}
      </div>
      <div className="set-body">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="set-row">
      <div className="set-label">
        <b>{label}</b>
        {hint && <span className="muted small">{hint}</span>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg-small">
      {options.map((o) => (
        <button key={String(o.id)} type="button" className={value === o.id ? 'sel' : ''} onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

/** only for email + password accounts (Google handles its own security) */
function SecuritySection() {
  const [sec, setSec] = useState(null);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { api.security().then(setSec).catch(() => {}); }, []);
  if (!sec?.password) return null;

  const say = (text) => setMsg(text);
  const changePassword = async (e) => {
    e.preventDefault();
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      say(tr('Parol dəyişdi. Digər cihazlarda yenidən kod soruşulacaq.', 'Password changed. Other devices will be asked for a code again.'));
    } catch (err) {
      say(err.code === 'invalid' ? tr('Hazırkı parol yanlışdır.', 'The current password is wrong.')
        : err.code === 'password' ? tr('Yeni parol ən azı 8 simvol olmalıdır.', 'The new password needs at least 8 characters.')
          : err.code === 'too_many' ? tr('Çox cəhd oldu, bir az sonra yoxla.', 'Too many attempts, try again later.') : tr('Alınmadı.', "That didn't work."));
    }
  };
  const regenerate = async (e) => {
    e.preventDefault();
    try {
      const r = await api.newRecoveryCodes(code);
      setCode('');
      setCodes(r.recoveryCodes);
      setMsg('');
    } catch (err) {
      say(err.code === 'too_many' ? tr('Çox cəhd oldu, bir az sonra yoxla.', 'Too many attempts, try again later.') : tr('Kod yanlışdır.', "That code isn't right."));
    }
  };
  const forget = async () => {
    await api.forgetDevices();
    say(tr('Digər bütün cihazlar unuduldu — orada yenidən kod soruşulacaq.', 'All other devices forgotten — they will be asked for a code again.'));
  };

  return (
    <Section title={tr('Təhlükəsizlik', 'Security')} hint={tr('Email ilə hesab: yeni cihazdan girişdə autentifikator kodu soruşulur, sonra cihaz 30 gün yadda qalır.', 'Email account: a new device asks for an authenticator code, then it is remembered for 30 days.')}>
      {codes ? (
        <RecoveryCodes codes={codes} onDone={() => { setCodes(null); setSec((s) => ({ ...s, recoveryLeft: 8 })); }} doneLabel={tr('Saxladım', "I've saved them")} />
      ) : (
        <>
          <Row label={tr('Parolu dəyiş', 'Change password')}>
            <form className="sec-form" onSubmit={changePassword}>
              <input type="password" placeholder={tr('Hazırkı parol', 'Current password')} autoComplete="current-password" value={pw.current} onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))} required aria-label={tr('Hazırkı parol', 'Current password')} />
              <input type="password" placeholder={tr('Yeni parol (8+ simvol)', 'New password (8+ characters)')} autoComplete="new-password" minLength={8} value={pw.next} onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))} required aria-label={tr('Yeni parol', 'New password')} />
              <button className="btn">{tr('Dəyiş', 'Change')}</button>
            </form>
          </Row>
          <Row label={tr('Bərpa kodları', 'Recovery codes')} hint={tr(`${sec.recoveryLeft} istifadə olunmamış kod qalıb`, `${sec.recoveryLeft} unused code${sec.recoveryLeft === 1 ? '' : 's'} left`)}>
            <form className="sec-form" onSubmit={regenerate}>
              <input inputMode="numeric" placeholder={tr('Autentifikator kodu', 'Authenticator code')} maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} aria-label={tr('Autentifikator kodu', 'Authenticator code')} />
              <button className="btn" disabled={code.length !== 6}>{tr('Yeni kodlar al', 'Get new codes')}</button>
            </form>
          </Row>
          <Row label={tr('Yadda saxlanmış cihazlar', 'Remembered devices')} hint={tr('Telefonunu itirmisənsə və ya başqasının kompüterindən girmisənsə', "If you lost your phone or signed in on someone else's computer")}>
            <button className="btn" onClick={forget}>{tr('Digər cihazları unut', 'Forget other devices')}</button>
          </Row>
        </>
      )}
      {msg && <p className="small" role="status">{msg}</p>}
    </Section>
  );
}

function AppSection() {
  const { state: install, install: runInstall } = useInstallState();
  const push = usePush();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    setMsg('');
    try {
      if (!(await push.enable())) setMsg(tr('İcazə verilmədi.', 'Permission was not given.'));
    } catch { setMsg(tr('Bildirişləri açmaq olmadı. Bir az sonra yenidən yoxla.', "Couldn't turn on notifications. Try again in a moment.")); }
    setBusy(false);
  };
  const test = async () => {
    try { await api.pushTest(); setMsg(tr('Test bildirişi göndərildi.', 'Test notification sent.')); } catch { setMsg(tr('Göndərilmədi — bildirişləri söndürüb yenidən aç.', "Not sent — turn notifications off and on again.")); }
  };

  return (
    <Section title={tr('Tətbiq və bildirişlər', 'App & notifications')} hint={tr('Plan it!-i telefona tətbiq kimi qur və deadline xatırlatmaları, dostluq xəbərləri telefonun öz bildirişləri ilə gəlsin.', 'Install Plan it! on your phone and get deadline reminders and friend news as real phone notifications.')}>
      <Row label={tr('Tətbiq', 'App')} hint={install === 'installed' ? tr('Ana ekrandan açılıb', 'Opened from the home screen') : install === 'ios' ? tr('Safari-də Paylaş → «Ana ekrana əlavə et»', 'In Safari: Share → «Add to Home Screen»') : ''}>
        {install === 'installed' ? <span className="tg-status on"><i />{tr('Quraşdırılıb', 'Installed')}</span>
          : install === 'prompt' ? <button className="btn primary" onClick={runInstall}>{tr('Quraşdır', 'Install')}</button>
            : install === 'ios' ? <span className="muted small">{tr('Paylaş ⬆︎ → Ana ekrana əlavə et', 'Share ⬆︎ → Add to Home Screen')}</span>
              : <span className="muted small">{tr('Brauzerin menyusundan «Quraşdır» / «Ana ekrana əlavə et»', 'Use «Install» / «Add to Home Screen» in the browser menu')}</span>}
      </Row>
      <Row
        label={tr('Bildirişlər', 'Notifications')}
        hint={push.state === 'unsupported'
          ? (install === 'ios' ? tr('iPhone-da əvvəlcə tətbiqi ana ekrana əlavə et, sonra oradan açıb burada aç', 'On iPhone, first add the app to the Home Screen, open it from there and turn them on here') : tr('Bu brauzer bildirişləri dəstəkləmir', "This browser doesn't support notifications"))
          : push.state === 'blocked' ? tr('Brauzerdə bloklanıb — telefonun/brauzerin ayarlarından Plan it! üçün icazə ver', 'Blocked — allow Plan it! in your phone or browser settings') : ''}
      >
        <div className="tg-actions">
          {push.state === 'on' ? (
            <>
              <span className="tg-status on"><i />{tr('Açıqdır', 'On')}</span>
              <button className="btn" onClick={test}>Test</button>
              <button className="btn ghost danger" onClick={() => { push.disable(); setMsg(tr('Bu cihazda bildirişlər söndürüldü.', 'Notifications turned off on this device.')); }}>{tr('Söndür', 'Turn off')}</button>
            </>
          ) : push.state === 'off' ? (
            <button className="btn primary" onClick={enable} disabled={busy}>{busy ? tr('Gözlə…', 'Please wait…') : tr('Bildirişləri aç', 'Turn on notifications')}</button>
          ) : <span className="tg-status"><i />{push.state === 'blocked' ? tr('Bloklanıb', 'Blocked') : tr('Mövcud deyil', 'Not available')}</span>}
        </div>
      </Row>
      {msg && <p className="small" role="status">{msg}</p>}
    </Section>
  );
}

function TelegramSection() {
  const { tg, waiting, justLinked, error, connect, disconnect } = useTelegramLink();
  const [msg, setMsg] = useState('');

  const test = async () => {
    setMsg('');
    try { await api.telegramTest(); setMsg(tr('Test mesajı göndərildi — Telegram-a bax.', 'Test message sent — check Telegram.')); } catch { setMsg(tr('Mesaj getmədi. Botu yenidən qoşmağa çalış.', "The message didn't go through. Try reconnecting the bot.")); }
  };
  const unlink = async () => { await disconnect(); setMsg(tr('Telegram ayrıldı.', 'Telegram disconnected.')); };
  const note = msg || error || (justLinked ? tr('Qoşuldu! Bot sənə salam yazdı.', 'Connected! The bot just said hi.') : '');

  return (
    <Section title="Telegram" hint={tr('Tapşırığa deadline və xatırlatma vaxtı qoyanda bot həmin saatda sənə yazır. Mesajdakı «Bitdi» düyməsi tapşırığı birbaşa bitirir.', 'When a task has a deadline and a reminder time, the bot messages you right then. The «Done» button in the message finishes the task.')}>
      {!tg ? <p className="muted small">{tr('Yoxlanılır…', 'Checking…')}</p> : !tg.enabled ? (
        <p className="muted small">{tr('Bot serverdə hələ qurulmayıb.', "The bot isn't set up on the server yet.")}</p>
      ) : (
        <Row label={<span className={`tg-status${tg.linked ? ' on' : ''}`}><i />{tg.linked ? tr('Qoşulub', 'Connected') : tr('Qoşulmayıb', 'Not connected')}</span>} hint={tg.bot ? `@${tg.bot}` : ''}>
          <div className="tg-actions">
            {tg.linked ? (
              <>
                <button className="btn" onClick={test}>{tr('Test mesajı', 'Test message')}</button>
                <button className="btn ghost danger" onClick={unlink}>{tr('Ayır', 'Disconnect')}</button>
              </>
            ) : (
              <button className="btn primary" onClick={connect} disabled={waiting}>{waiting ? tr('Telegram-da «Start»a bas…', 'Press «Start» in Telegram…') : tr('Telegram-ı qoş', 'Connect Telegram')}</button>
            )}
          </div>
        </Row>
      )}
      {note && <p className="small" role="status">{note}</p>}
    </Section>
  );
}

export default function SettingsPage({ user, onChange, onEditCategory, onLogout }) {
  const settings = useSettings();
  const { list: categories } = useCategories();
  const [name, setName] = useState(settings.appName);
  useEffect(() => setName(settings.appName), [settings.appName]);

  const [person, setPerson] = useState(settings.name || '');
  useEffect(() => setPerson(settings.name || ''), [settings.name]);
  /** renaming yourself also renames "<Name>'s Planner", unless the planner got a custom name */
  const commitPerson = () => {
    const v = person.trim();
    if (!v) { setPerson(settings.name || ''); return; }
    if (v === settings.name) return;
    const patch = { name: v };
    if (!settings.name || settings.appName === `${settings.name}'s Planner`) patch.appName = `${v}'s Planner`;
    onChange(patch);
  };

  const crew = crewOf(settings);
  const today = buddyFor(new Date(), crew);
  const toggleCrew = (id) => {
    const next = crew.includes(id) ? crew.filter((x) => x !== id) : [...crew, id];
    if (next.length) onChange({ crew: ORDER.filter((x) => next.includes(x)) });
  };

  const commitName = () => {
    const v = name.trim();
    if (!v) { setName(settings.appName); return; }
    if (v !== settings.appName) onChange({ appName: v });
  };

  return (
    <div className="page settings-page">
      <div className="page-head">
        <div>
          <h1>{tr('Ayarlar', 'Settings')}</h1>
          <p className="muted">{tr('Planlayıcını öz zövqünə uyğunlaşdır. Dəyişikliklər dərhal yadda saxlanılır.', 'Make the planner yours. Changes are saved right away.')}</p>
        </div>
      </div>

      <Section title={tr('Ümumi', 'General')}>
        <Row label={tr('Dil', 'Language')} hint={tr('Telegram, bildirişlər və Excel hesabatı da bu dildə olur', 'Telegram, notifications and Excel reports use it too')}>
          <LangSwitch className="on-panel" />
        </Row>
        <Row label={tr('Adın', 'Your name')} hint={tr('Salamlaşmada və personajların müraciətində', 'Used in greetings and by the characters')}>
          <input
            className="set-input"
            value={person}
            maxLength={24}
            onChange={(e) => setPerson(e.target.value)}
            onBlur={commitPerson}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </Row>
        <Row label={tr('Planlayıcının adı', 'Planner name')} hint={tr('Yuxarıdakı loqoda və brauzer tabında görünür', 'Shown in the logo and the browser tab')}>
          <input
            className="set-input"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </Row>
      </Section>

      <Section title={tr('Görünüş', 'Appearance')}>
        <Row label={tr('Rejim', 'Theme')}>
          <Seg
            value={settings.theme}
            onChange={(theme) => onChange({ theme })}
            options={[{ id: 'system', name: tr('Sistemə uyğun', 'System') }, { id: 'light', name: tr('☀️ Gündüz', '☀️ Light') }, { id: 'dark', name: tr('🌙 Gecə', '🌙 Dark') }]}
          />
        </Row>
        <Row label={tr('Sıxlıq', 'Density')} hint={tr('Kompakt rejimdə ekrana daha çox tapşırıq sığır', 'Compact fits more tasks on the screen')}>
          <Seg
            value={settings.density}
            onChange={(density) => onChange({ density })}
            options={[{ id: 'comfortable', name: tr('Rahat', 'Comfortable') }, { id: 'compact', name: tr('Kompakt', 'Compact') }]}
          />
        </Row>
      </Section>

      <Section title={tr('Dostların', 'Your buddies')} hint={tr('Kimlərin sənə eşlik etməsini seç — seçdiklərin gündən-günə növbə ilə gəlir. Bir nəfər seçsən, hər gün o olacaq.', "Choose who keeps you company — they take turns day by day. Pick just one and they'll be there every day.")}>
        <div className="lineup set-lineup">
          {ORDER.map((id) => {
            const on = crew.includes(id);
            return (
              <button key={id} type="button" className={`crew-pick${on ? ' on' : ''}${id === today ? ' now' : ''}`} aria-pressed={on} onClick={() => toggleCrew(id)} title={on && crew.length === 1 ? tr('Ən azı bir dost qalmalıdır', 'Keep at least one buddy') : ''}>
                <span className="ring" dangerouslySetInnerHTML={{ __html: portrait(id) }} />
                <span>{PEOPLE[id].name}</span>
                {id === today && <em>{tr('bu gün', 'today')}</em>}
              </button>
            );
          })}
        </div>
        <Row label={tr('Animasiyalar', 'Animations')} hint={tr('«Sakit» rejimdə personaj reaksiya verir, amma konfetti və şənlik pəncərəsi olmur', '«Calm» keeps the reactions but skips the confetti and the party screen')}>
          <Seg
            value={settings.anim}
            onChange={(anim) => onChange({ anim })}
            options={[{ id: 'full', name: tr('Hamısı', 'All') }, { id: 'calm', name: tr('Sakit', 'Calm') }, { id: 'off', name: tr('Söndür', 'Off') }]}
          />
        </Row>
        <Row label={tr('Alqış səsi', 'Applause sound')} hint={tr('Günün bütün işləri bitəndə dörd alqış', 'Four claps when the whole day is done')}>
          <Seg value={settings.sound} onChange={(sound) => onChange({ sound })} options={[{ id: true, name: tr('Açıq', 'On') }, { id: false, name: tr('Bağlı', 'Off') }]} />
        </Row>
      </Section>

      <AppSection />

      <TelegramSection />

      <SecuritySection />

      <Section title={tr('Tapşırıqlar', 'Tasks')}>
        <Row label={tr('Gün daxilində sıralama', 'Order within a day')} hint={tr('«Əl ilə» seçiləndə tapşırıqları sürüşdürərək düzürsən', 'With «Manual» you order tasks by dragging')}>
          <Seg
            value={settings.sort}
            onChange={(sort) => onChange({ sort })}
            options={[{ id: 'manual', name: tr('Əl ilə', 'Manual') }, { id: 'time', name: tr('Vaxta görə', 'By time') }, { id: 'priority', name: tr('Prioritetə görə', 'By priority') }]}
          />
        </Row>
      </Section>

      <Section title={tr('Kateqoriyalar', 'Categories')} hint={tr('Menyuda kateqoriyanı tutub sürüşdürərək sırasını dəyişə bilərsən', 'Drag categories in the menu to reorder them')}>
        <div className="set-cats">
          {categories.map((c) => (
            <button key={c.id} className="set-cat" onClick={() => onEditCategory(c)}>
              <Folder color={c.color} name={c.name} emoji={c.emoji} size={36} />
              <span>{c.name}</span>
              <IconEdit />
            </button>
          ))}
          <button className="set-cat add" onClick={() => onEditCategory({})}>{tr('+ Yeni kateqoriya', '+ New category')}</button>
        </div>
      </Section>

      <Section title={tr('Hesab', 'Account')}>
        <Row label={user.name} hint={user.email}>
          <button className="btn" onClick={onLogout}><IconLogout /> {tr('Çıxış', 'Sign out')}</button>
        </Row>
      </Section>
    </div>
  );
}
