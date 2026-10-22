import { useState } from 'react';
import Buddy from '../characters/Buddy';
import CalendarPopover from './CalendarPopover';
import { DAYS, fromKey, monthInText, weekdayIndex } from '../dates';
import { IconCalendar, IconChevron, IconMoon, IconSearch, IconSun } from './Icons';
import Avatar from './Avatar';
import Brand from './Brand';
import { LangSwitch, tr } from '../i18n';

const DOTS = ['#e3b450', '#6aa2ff', '#8fb0f0', '#3d6fd8']; // readable on the white band and the navy one

/**
 * "Eljan's Planner" → E·L·J·A·N'S + small "Planner"; any other name ("Plan it!") is spelled out whole.
 * Dots go between letters only, never next to spaces or punctuation.
 */
function Wordmark({ name }) {
  if (name.trim() === 'Plan it!') return <Brand size={30} />;
  const own = /^(.+?)'s Planner$/i.exec(name.trim());
  const first = own ? `${own[1]}'s` : name.trim();
  const rest = own ? ['Planner'] : [];
  // people's names follow Azerbaijani casing (i → İ); the product name "Plan it!" doesn't
  const letters = [...(own ? first.toLocaleUpperCase('az') : first.toUpperCase())];
  const isLetter = (ch) => /\p{L}|\p{N}/u.test(ch || '');
  return (
    <span className="wordmark" aria-label={name}>
      <span className="wm-letters" aria-hidden="true">
        {letters.map((ch, i) => (
          <span key={i} className={ch === ' ' ? 'wm-gap' : undefined}>{ch === ' ' ? '' : ch}{isLetter(ch) && isLetter(letters[i + 1]) && <i style={{ background: DOTS[i % DOTS.length] }} />}</span>
        ))}
      </span>
      {rest.length > 0 && <small aria-hidden="true">{rest.join(' ')}</small>}
    </span>
  );
}

/** coffee cup that fills up with today's progress */
function Cup({ done, total }) {
  const h = total ? (done / total) * 33 : 0;
  const full = total > 0 && done === total;
  return (
    <div className={`cup${full ? ' full' : ''}`} title={tr('Bu günün irəliləyişi', "Today's progress")}>
      <svg viewBox="0 0 44 48" aria-hidden="true">
        <defs><clipPath id="cupclip"><path d="M6 12 H34 L31 41 Q30 45 26 45 H14 Q10 45 9 41 Z" /></clipPath></defs>
        <path className="steam" d="M15 8 q-3 -3 0 -6 M21 8 q-3 -3 0 -6 M27 8 q-3 -3 0 -6" />
        <rect className="liquid" x="0" y={45 - h} width="44" height={h} clipPath="url(#cupclip)" />
        <path className="cup-line" d="M6 12 H34 L31 41 Q30 45 26 45 H14 Q10 45 9 41 Z" />
        <path className="cup-line" d="M34 18 q8 0 8 7 q0 7 -9 7" />
      </svg>
      <div><b>{done}/{total}</b><span>{tr('bu gün', 'today')}</span></div>
    </div>
  );
}

function rangeLabel(days) {
  const a = fromKey(days[0]);
  const b = fromKey(days[days.length - 1]);
  const m = (d) => monthInText(d.getMonth());
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${m(a)}`
    : `${a.getDate()} ${m(a).slice(0, 3)} – ${b.getDate()} ${m(b).slice(0, 3)}`;
}

export default function TopBand({
  appName, name, crew, user, requests, onProfile, onHome, atHome, todayDone, todayTotal, theme, onToggleTheme, onSearch, onMenu,
  showBoard, mode, onMode, days, busy, onShift, onPick, onToday, filterName, onClearFilter,
  buddyStatus, overdue, anim,
}) {
  const [calOpen, setCalOpen] = useState(false);
  const now = new Date();
  const firstName = name || (user.name || '').split(' ')[0];

  return (
    <header className="band">
      <div className="band-inner">
        <div className="band-top">
          <div className="band-brand">
            <button className="brand-home" onClick={onHome} title={tr('Bu gün', 'Today')} aria-label={tr('Ana səhifə — bu gün', 'Home — today')}><Wordmark name={appName} /></button>
            <span className="greet">{tr('Salam', 'Hi')}{firstName ? `, ${firstName}` : ''} · {DAYS[weekdayIndex(now)]}, {now.getDate()} {monthInText(now.getMonth())}</span>
          </div>
          <Cup done={todayDone} total={todayTotal} />
          <button className="band-btn hide-xs" onClick={onSearch} aria-label={tr('Axtar', 'Search')} title={tr('Axtar (⌘K)', 'Search (⌘K)')}><IconSearch /></button>
          <button className={`band-btn${atHome ? ' on' : ''}`} onClick={onHome} aria-label={tr('Ana səhifə — bu gün', 'Home — today')} title={tr('Bu gün (T)', 'Today (T)')} aria-current={atHome ? 'page' : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3.5 11 12 4l8.5 7" /><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5" />
            </svg>
          </button>
          <button className="band-btn hide-xs" onClick={onToggleTheme} aria-label={theme === 'dark' ? tr('Gündüz rejimi', 'Light mode') : tr('Gecə rejimi', 'Dark mode')}>
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
          <button className="band-avatar" onClick={onProfile} aria-label={tr('Profil', 'Profile')} title={requests ? tr(`${requests} dostluq istəyi`, `${requests} friend request${requests === 1 ? '' : 's'}`) : tr('Profil', 'Profile')}>
            <Avatar src={user.picture} name={firstName} size={40} />
            {requests > 0 && <em>{requests}</em>}
          </button>
          <LangSwitch className="hide-xs" />
          <button className="band-btn" onClick={onMenu} aria-label={tr('Menyu', 'Menu')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </div>

        <div className="band-mid">
          {/* a new crew means a new character on duty: remount so it walks in and greets */}
          <Buddy key={crew.join()} status={buddyStatus} overdue={overdue} anim={anim} crew={crew} />
          {showBoard && (
            <div className="weekbar">
              <div className="mode-toggle" role="tablist" aria-label={tr('Görünüş', 'View')}>
                <button role="tab" aria-selected={mode === 'today'} className={mode === 'today' ? 'on' : ''} onClick={() => onMode('today')} title={tr('Bu gün (T)', 'Today (T)')}>{tr('Bu gün', 'Today')}</button>
                <button role="tab" aria-selected={mode === 'all'} className={mode === 'all' ? 'on' : ''} onClick={() => onMode('all')} title={tr('Ümumi (W)', 'Overview (W)')}>{tr('Ümumi', 'Overview')}</button>
              </div>
              {mode === 'all' && (<>
              <button className="band-btn" onClick={() => onShift(-1)} aria-label={tr('Əvvəlki həftə', 'Previous week')} title={tr('Əvvəlki həftə (←)', 'Previous week (←)')}><IconChevron dir="left" /></button>
              <div className="cal-anchor">
                <button className="range-btn" onClick={() => setCalOpen((o) => !o)} aria-expanded={calOpen} aria-haspopup="dialog">
                  <IconCalendar /><span>{rangeLabel(days)}</span>
                </button>
                {calOpen && (
                  <CalendarPopover
                    start={days[0]}
                    visible={days}
                    busy={busy}
                    onPick={(k) => { onPick(k); setCalOpen(false); }}
                    onClose={() => setCalOpen(false)}
                  />
                )}
              </div>
              <button className="band-btn" onClick={() => onShift(1)} aria-label={tr('Növbəti həftə', 'Next week')} title={tr('Növbəti həftə (→)', 'Next week (→)')}><IconChevron /></button>
              <button className="today-btn" onClick={onToday}>{tr('Bu həftə', 'This week')}</button>
              </>)}
              {filterName && <button className="filter-pill" onClick={onClearFilter} title="Filtri sil">{filterName} ×</button>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
