import { useEffect, useRef, useState } from 'react';
import { figure } from './figure';
import { PEOPLE } from './people';
import { claps, confetti } from './bus';
import { tr } from '../i18n';

/**
 * Shown when the last task of today is done: the whole gang jumps and claps.
 * On the last working day of the week it turns into a group photo with the week's result.
 */
export default function Party({ party, star, crew, sound, onClose }) {
  const [swap, setSwap] = useState(false);
  const [hits, setHits] = useState(0);
  const card = useRef(null);
  const closeBtn = useRef(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const dance = setInterval(() => setSwap((s) => !s), 1600);
    const beats = [0, 320, 640, 960].map((t, i) => setTimeout(() => setHits(i + 1), 700 + t));
    if (sound) claps([0, 0.32, 0.64, 0.96], 0.7);
    const r = card.current?.getBoundingClientRect();
    const burst = setTimeout(() => r && confetti(r.left + r.width / 2, r.top + 40, 44), 300);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(dance);
      beats.forEach(clearTimeout);
      clearTimeout(burst);
      window.removeEventListener('keydown', onKey);
    };
  }, [sound, onClose]);

  const week = party.week;
  return (
    <div className="party" role="dialog" aria-modal="true" aria-labelledby="party-title" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`party-card${week ? ' photo' : ''}`} ref={card}>
        {week && <div className="flash" aria-hidden="true" />}
        <h2 id="party-title">{week ? tr('Həftə bitdi! Qrup şəkli', 'Week done! Group photo') : tr('Günün bütün işləri bitdi', 'Everything for today is done')}</h2>
        <p>
          {week ? tr(`Bu həftə ${party.weekCount} tapşırıq bitirdin. `, `You finished ${party.weekCount} tasks this week. `) : ''}
          {crew.length > 1
            ? tr('Dostların səninlə fəxr edir. Sabah da yanındayıq.', "Your friends are proud of you. We'll be there tomorrow too.")
            : tr(`${PEOPLE[crew[0]].name} səninlə fəxr edir. Sabah da yanındadır.`, `${PEOPLE[crew[0]].name} is proud of you. See you tomorrow.`)}
        </p>
        {party.line && <div className="quote">{PEOPLE[star].name}: “{party.line}”</div>}
        <div className="gang" style={{ '--n': crew.length }}>
          {crew.map((id, i) => {
            const jump = (i % 2 === 0) !== swap;
            return (
              <figure key={id} className={id === star ? 'star' : ''} style={{ animationDelay: `${i * 0.1}s`, '--d': `${(i % 4) * 0.12}s` }}>
                <div className="gang-fig" dangerouslySetInnerHTML={{ __html: figure(id, { mood: 'party', pose: week ? 'wave' : jump ? 'jump' : 'clap' }) }} />
                <figcaption>{PEOPLE[id].name}</figcaption>
              </figure>
            );
          })}
        </div>
        <div className="claps" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => <i key={n} className={hits >= n ? 'hit' : ''} />)}
        </div>
        <button ref={closeBtn} className="btn gold" onClick={onClose}>{tr('Davam et', 'Continue')}</button>
      </div>
    </div>
  );
}
