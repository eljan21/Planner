import { useEffect, useState } from 'react';
import { figure } from './figure';
import { ORDER, PEOPLE } from './people';
import { useTelegramLink } from '../telegramLink';
import { tr } from '../i18n';

/** "Eljan" → E·L·J·A·N'S — the same wordmark the top band will show */
function Preview({ name }) {
  const letters = [...(name.trim() || '…').toLocaleUpperCase('az')];
  return (
    <div className="ob-preview" aria-hidden="true">
      <span className="wm-letters">
        {letters.map((ch, i) => <span key={i}>{ch}{i < letters.length - 1 && <i style={{ background: ['#e3b450', '#6aa2ff', '#8fb0f0', '#3d6fd8'][i % 4] }} />}</span>)}
        <span>'S</span>
      </span>
      <small>Planner</small>
    </div>
  );
}

/** what a reminder from the bot looks like, signed by the user's first pick */
function TelegramPreview({ who }) {
  return (
    <div className="tg-preview" aria-hidden="true">
      <div className="tg-bubble">
        <b>⏰ {tr('Xatırlatma', 'Reminder')}</b>
        <span>«{tr('Hesabatı göndər', 'Send the report')}»</span>
        <span>Deadline: <b>{tr('Sabah, 18:00', 'Tomorrow, 18:00')}</b> · {tr('2 saat qalıb', '2 hours left')}</span>
        <i>{PEOPLE[who].name}: {tr('Deadline yaxınlaşır! Haydı, bitirək.', "The deadline is close! Let's get it done.")}</i>
      </div>
      <div className="tg-button">✅ {tr('Bitdi', 'Done')}</div>
    </div>
  );
}

/**
 * First sign-in: ask the name (it becomes "<Name>'s Planner"), which characters should keep the user company,
 * and offer to connect the Telegram bot for deadline reminders.
 */
export default function Onboarding({ user, onDone }) {
  const { tg, waiting, justLinked, error, connect } = useTelegramLink();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(() => (user.name || '').split(' ')[0].slice(0, 24));
  const [crew, setCrew] = useState([]);
  const clean = name.trim();

  const toggle = (id) => setCrew((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const finish = () => onDone({ name: clean, crew: ORDER.filter((id) => crew.includes(id)) });
  const offerTelegram = tg?.enabled && !tg.linked;

  // linked in Telegram → show the tick for a moment, then go to the planner
  useEffect(() => {
    if (!justLinked) return undefined;
    const t = setTimeout(finish, 1400);
    return () => clearTimeout(t);
  }, [justLinked]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="onboarding" role="dialog" aria-modal="true" aria-labelledby="ob-title">
      <div className="ob-card">
        <div className="ob-steps" aria-hidden="true">
          {[0, 1, ...(offerTelegram || step === 2 ? [2] : [])].map((n) => <i key={n} className={step === n ? 'on' : ''} />)}
        </div>

        {step === 0 ? (
          <form className="ob-step" onSubmit={(e) => { e.preventDefault(); if (clean) setStep(1); }}>
            <h2 id="ob-title">{tr('Xoş gəldin! Adın nədir?', "Welcome! What's your name?")}</h2>
            <p>{tr('Planlayıcı sənin adınla adlanacaq.', 'Your planner will carry your name.')}</p>
            <Preview name={clean} />
            <input
              autoFocus
              value={name}
              maxLength={24}
              placeholder={tr('Məsələn: Eljan', 'e.g. Eljan')}
              aria-label={tr('Adın', 'Your name')}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="btn gold" disabled={!clean}>{tr('Davam et', 'Continue')}</button>
          </form>
        ) : step === 1 ? (
          <div className="ob-step">
            <h2 id="ob-title">{tr(`Sənə kimlər eşlik etsin, ${clean}?`, `Who should keep you company, ${clean}?`)}</h2>
            <p>
              {tr(
                'Seçdiklərin gündən-günə növbə ilə yanında olacaq: tapşırıq bitəndə alqışlayacaq, təxirə salanda sataşacaq. Bir nəfər seçsən, hər gün o olacaq.',
                "The ones you pick take turns day by day: they cheer when you finish a task and tease you when you put one off. Pick just one and they'll be there every day.",
              )}
            </p>
            <div className="ob-crew">
              {ORDER.map((id) => {
                const on = crew.includes(id);
                return (
                  <button key={id} type="button" className={`ob-pick${on ? ' on' : ''}`} aria-pressed={on} onClick={() => toggle(id)}>
                    <span className="ob-fig" dangerouslySetInnerHTML={{ __html: figure(id, { mood: on ? 'happy' : '', pose: on ? 'wave' : '' }) }} />
                    <b>{PEOPLE[id].name}</b>
                    <small>{PEOPLE[id].from.split(' · ')[0]}</small>
                  </button>
                );
              })}
            </div>
            <div className="ob-foot">
              <button type="button" className="btn ghost" onClick={() => setStep(0)}>{tr('Geri', 'Back')}</button>
              <button type="button" className="link-btn" onClick={() => setCrew(crew.length === ORDER.length ? [] : [...ORDER])}>
                {crew.length === ORDER.length ? tr('Heç birini', 'None') : tr('Hamısını seç', 'Select all')}
              </button>
              <span className="spacer" />
              <button type="button" className="btn gold" disabled={!crew.length} onClick={offerTelegram ? () => setStep(2) : finish}>
                {!crew.length ? tr('Ən azı birini seç', 'Pick at least one')
                  : offerTelegram ? tr(`Davam et · ${crew.length} dost`, `Continue · ${crew.length} ${crew.length === 1 ? 'friend' : 'friends'}`)
                    : tr(`Başla · ${crew.length} dost`, `Start · ${crew.length} ${crew.length === 1 ? 'friend' : 'friends'}`)}
              </button>
            </div>
          </div>
        ) : (
          <div className="ob-step">
            <h2 id="ob-title">{tr('Deadline-ları unutmayaq?', 'Never miss a deadline?')}</h2>
            <p>
              {tr(
                'Telegram botunu qoş: tapşırığa deadline və xatırlatma vaxtı qoyanda həmin saatda sənə yazacaq. Mesajdakı «Bitdi» düyməsi ilə işi elə oradan bitirə bilərsən.',
                'Connect the Telegram bot: when you give a task a deadline and a reminder time, it messages you right then. The «Done» button in the message finishes the task from there.',
              )}
            </p>
            <TelegramPreview who={ORDER.find((id) => crew.includes(id)) || 'harry'} />
            {justLinked ? (
              <p className="ob-linked" role="status">{tr('Qoşuldu ✓ Bot sənə salam yazdı.', 'Connected ✓ The bot just said hi.')}</p>
            ) : (
              <>
                {waiting && <p className="ob-wait" role="status">{tr(`Telegram-da @${tg.bot} açıldı — orada «Start»a bas, burada gözləyirik…`, `@${tg.bot} opened in Telegram — press «Start» there, we're waiting here…`)}</p>}
                <button type="button" className={`btn ${waiting ? 'ghost' : 'gold'} tg-connect`} onClick={connect}>
                  {waiting ? tr('Telegram açılmadı? Yenidən aç', "Telegram didn't open? Try again") : tr('Telegram-ı qoş', 'Connect Telegram')}
                </button>
                {error && <p className="ob-hint warn">{error}</p>}
              </>
            )}
            <div className="ob-foot">
              <button type="button" className="btn ghost" onClick={() => setStep(1)}>{tr('Geri', 'Back')}</button>
              <span className="spacer" />
              {!justLinked && <button type="button" className="link-btn" onClick={finish}>{tr('İndi yox — sonra Ayarlardan qoşaram', "Not now — I'll connect it later in Settings")}</button>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
