import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { figure, portrait } from './figure';
import { COMMON, PEOPLE, buddyFor, pick } from './people';
import { buddyBus, confetti } from './bus';
import { fromKey, todayKey } from '../dates';
import { tr, useLang } from '../i18n';

const SEEN_KEY = 'kp_buddy_day';
const YAWN_AFTER = 90e3;
const SLEEP_AFTER = 4 * 60e3;
const STREAK_GAP = 10 * 60e3;
const LAZY_POSES = ['grumpy', 'facepalm', 'shrug'];

const readSeen = () => { try { return localStorage.getItem(SEEN_KEY); } catch { return null; } };
const writeSeen = (k) => { try { localStorage.setItem(SEEN_KEY, k); } catch { /* ignore */ } };
const clamp = (v) => Math.max(-1, Math.min(1, v));

/**
 * The character of the day. Stands in the top band, follows the pointer with its eyes,
 * and reacts to whatever the rest of the app reports through `buddyBus`.
 */
export default function Buddy({ status, overdue, anim, crew }) {
  const [id, setId] = useState(() => buddyFor(new Date(), crew));
  const [act, setAct] = useState({ pose: '', mood: '', line: '' });
  const [walk, setWalk] = useState('');
  const [corner, setCorner] = useState(null);
  const box = useRef(null);
  const actTimer = useRef(null);
  const cornerTimer = useRef(null);
  const idle = useRef({ yawn: null, sleep: null, asleep: false, last: 0 });
  const streak = useRef({ n: 0, at: 0 });
  const lastLine = useRef('');
  const idRef = useRef(id);
  idRef.current = id;

  const fresh = (list) => {
    let line = pick(list);
    if (list.length > 1) while (line === lastLine.current) line = pick(list);
    lastLine.current = line;
    return line;
  };

  /** play a pose for a while; the line stays on screen after the pose ends */
  const perform = useCallback((pose, mood, line, ms = 2800) => {
    clearTimeout(actTimer.current);
    setAct({ pose: anim === 'off' ? '' : pose, mood, line });
    if (ms) actTimer.current = setTimeout(() => setAct((a) => ({ ...a, pose: '', mood: '' })), ms);
    // scrolled out of view: repeat the reaction in a small corner card
    const r = box.current?.getBoundingClientRect();
    if (r && line && anim === 'full' && (r.bottom < 0 || r.top > window.innerHeight)) {
      clearTimeout(cornerTimer.current);
      setCorner({ line, mood });
      cornerTimer.current = setTimeout(() => setCorner(null), 3200);
    }
  }, [anim]);

  // ---------- idle: yawn, then fall asleep until something happens ----------
  const armIdle = useCallback(() => {
    const st = idle.current;
    clearTimeout(st.yawn);
    clearTimeout(st.sleep);
    st.yawn = setTimeout(() => perform('yawn', 'yawn', pick(COMMON.yawn), 3200), YAWN_AFTER);
    st.sleep = setTimeout(() => {
      st.asleep = true;
      clearTimeout(actTimer.current);
      setAct({ pose: 'sleep', mood: 'sleepy', line: 'Zzz...' });
    }, SLEEP_AFTER);
  }, [perform]);

  const wakeIfAsleep = useCallback(() => {
    const st = idle.current;
    if (!st.asleep) return false;
    st.asleep = false;
    perform('poke', 'surprised', pick(COMMON.wake), 1800);
    return true;
  }, [perform]);

  useEffect(() => {
    const onActivity = (e) => {
      const st = idle.current;
      if (e.type === 'pointermove') {
        // follow the pointer with the eyes
        const el = box.current;
        if (el) {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height * 0.22;
          el.style.setProperty('--lx', `${clamp((e.clientX - cx) / 260) * 1.8}px`);
          el.style.setProperty('--ly', `${clamp((e.clientY - cy) / 260) * 1.3}px`);
        }
        if (Date.now() - st.last < 5000) return; // don't re-arm timers on every move
      }
      st.last = Date.now();
      if (!wakeIfAsleep()) armIdle();
    };
    window.addEventListener('pointermove', onActivity, { passive: true });
    window.addEventListener('pointerdown', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    armIdle();
    return () => {
      window.removeEventListener('pointermove', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      window.removeEventListener('keydown', onActivity);
      clearTimeout(idle.current.yawn);
      clearTimeout(idle.current.sleep);
    };
  }, [armIdle, wakeIfAsleep]);

  // ---------- greeting, and the hand-over when the day changes ----------
  const overdueRef = useRef(overdue);
  overdueRef.current = overdue;
  const greet = useCallback((who) => {
    const h = new Date().getHours();
    if (h >= 5 && h < 11) perform('stretch', 'happy', COMMON.morning, 3000);
    else if (h >= 22 || h < 5) perform('yawn', 'yawn', COMMON.night, 3000);
    else if (h >= 18) perform('wave', 'happy', COMMON.evening, 2600);
    else perform('wave', 'happy', PEOPLE[who].hello, 2600);
    if (overdueRef.current > 0) {
      setTimeout(() => perform('worry', 'worried', COMMON.overdue(overdueRef.current), 3600), 3800);
    }
  }, [perform]);

  // switching the language: say hello again, in the new language
  const lang = useLang();
  const shownLang = useRef(lang);
  useEffect(() => {
    if (shownLang.current === lang) return;
    shownLang.current = lang;
    lastLine.current = '';
    greet(idRef.current);
  }, [lang, greet]);

  const handover = useCallback((fromDay) => {
    const today = todayKey();
    writeSeen(today);
    const next = buddyFor(new Date(), crew);
    const prev = fromDay ? buddyFor(fromKey(fromDay), crew) : next;
    if (prev === next || anim === 'off') { setId(next); greet(next); return; }
    setId(prev);
    perform('wave', 'happy', COMMON.handover(PEOPLE[next].name), 0);
    setTimeout(() => setWalk('out'), 2600);
    setTimeout(() => { setId(next); setWalk('in'); }, 3800);
    setTimeout(() => { setWalk(''); greet(next); }, 5000);
  }, [anim, crew, greet, perform]);

  useEffect(() => {
    const seen = readSeen();
    const today = todayKey();
    if (seen && seen !== today) handover(seen);
    else { writeSeen(today); greet(buddyFor(new Date(), crew)); }
    // the app may stay open past midnight
    let day = today;
    const t = setInterval(() => {
      const now = todayKey();
      if (now !== day) { handover(day); day = now; }
    }, 60e3);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- reactions to what happens in the app ----------
  useEffect(() => buddyBus.on((e) => {
    idle.current.asleep = false;
    armIdle();
    const p = PEOPLE[idRef.current];
    if (e.type === 'done') {
      const now = Date.now();
      const s = streak.current;
      s.n = now - s.at < STREAK_GAP ? s.n + 1 : 1;
      s.at = now;
      if (s.n >= 5 && s.n % 5 === 0) {
        perform('spin', 'party', fresh(COMMON.streak5), 2600);
        const r = box.current?.getBoundingClientRect();
        if (r && anim === 'full') confetti(r.left + r.width / 2, r.top + 30, 30);
      } else if (s.n === 3) perform('dance', 'party', fresh(COMMON.streak3), 3000);
      else perform(Math.random() < 0.5 ? 'clap' : p.signature, 'happy', fresh(p.done), 3000);
    } else if (e.type === 'party') perform('jump', 'party', e.line, 6000);
    else if (e.type === 'lazy') perform(pick(LAZY_POSES), 'grumpy', fresh(p.lazy), 3200);
    else if (e.type === 'early') perform('thumb', 'happy', fresh(COMMON.early), 2400);
    else if (e.type === 'add') perform('thumb', 'happy', fresh(COMMON.add), 2000);
    else if (e.type === 'restore') perform('shrug', '', pick(COMMON.restore), 2400);
    else if (e.type === 'overdue') perform('worry', 'worried', COMMON.overdue(e.count), 3600);
  }), [anim, armIdle, perform]);

  const poke = () => {
    if (wakeIfAsleep()) return;
    perform('poke', 'surprised', fresh(PEOPLE[id].poke), 1800);
  };

  const p = PEOPLE[id];
  const pose = walk ? 'walk' : act.pose;
  const html = useMemo(() => figure(id, { mood: act.mood, pose }), [id, act.mood, pose]);

  return (
    <section className={`buddy${anim === 'off' ? ' anim-off' : ''}`} aria-live="polite">
      <div className={`stand${walk ? ` walk-${walk}` : ''}`}>
        <button ref={box} className="stand-fig" onClick={poke} aria-label={tr(`${p.name} — toxun`, `${p.name} — poke`)} dangerouslySetInnerHTML={{ __html: html }} />
        {act.pose === 'sleep' && <span className="zzz" aria-hidden="true">z<i>z</i><b>Z</b></span>}
        {act.pose === 'guitar' && <span className="notes" aria-hidden="true"><i>♪</i><i>♫</i><i>♪</i></span>}
      </div>
      <div className="buddy-text">
        <div className="buddy-name"><b>{p.name}</b><span>{p.from} · {tr('günün dostu', "today's buddy")}</span></div>
        {act.line && (
          <p className="say" key={act.line}>
            {act.line}
            {status && <small>{status}</small>}
          </p>
        )}
      </div>
      {corner && (
        <div className="buddy-corner" role="status">
          <div className="ring" dangerouslySetInnerHTML={{ __html: portrait(id, corner.mood) }} />
          <div><b>{p.name}</b><p>{corner.line}</p></div>
        </div>
      )}
    </section>
  );
}
