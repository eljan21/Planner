import { useEffect, useMemo, useRef, useState } from 'react';
import { figure } from './figure';
import { ORDER, PEOPLE } from './people';

const clamp = (v) => Math.max(-1, Math.min(1, v));

/**
 * The gang on the sign-in page. They follow the pointer with their eyes, read along while you type your email,
 * cover their eyes for the password (Chandler peeks), gasp when it's shown, sulk on a wrong one and jump on success.
 *
 * mode:   idle | email | password | reveal | error | success
 * target: screen point to look at instead of the pointer (the caret in the field being typed), or null
 */
export default function LoginCrew({ mode = 'idle', target = null }) {
  const members = useRef({});
  const pointer = useRef(null);
  const [hover, setHover] = useState(null);
  const [waver, setWaver] = useState(null);

  // one of them waves every few seconds while nothing is happening
  useEffect(() => {
    if (mode !== 'idle') return undefined;
    const t = setInterval(() => {
      setWaver(ORDER[Math.floor(Math.random() * ORDER.length)]);
      setTimeout(() => setWaver(null), 1600);
    }, 5200);
    return () => clearInterval(t);
  }, [mode]);

  // eyes and head follow the target, or the pointer
  useEffect(() => {
    const aim = (p) => {
      if (!p) return;
      for (const el of Object.values(members.current)) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const dx = (p.x - (r.left + r.width / 2)) / 320;
        const dy = (p.y - (r.top + r.height * 0.2)) / 320;
        el.style.setProperty('--lx', `${clamp(dx) * 1.9}px`);
        el.style.setProperty('--ly', `${clamp(dy) * 1.4}px`);
        el.style.setProperty('--tilt', `${clamp(dx / 2) * 7}deg`);
      }
    };
    if (target) { aim(target); return undefined; }
    aim(pointer.current);
    const onMove = (e) => { pointer.current = { x: e.clientX, y: e.clientY }; aim(pointer.current); };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [target]);

  const poseOf = (id) => {
    if (mode === 'password') return id === 'chandler' ? ['peek', ''] : ['cover', ''];
    if (mode === 'reveal') return ['poke', 'surprised'];
    if (mode === 'error') return ['grumpy', 'grumpy'];
    if (mode === 'success') return ['jump', 'party'];
    if (hover === id || waver === id) return ['wave', 'happy'];
    return ['', mode === 'email' ? 'happy' : ''];
  };

  const figures = ORDER.map((id) => [id, ...poseOf(id)]);
  const key = figures.map((f) => f.join(':')).join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const html = useMemo(() => Object.fromEntries(figures.map(([id, pose, mood]) => [id, figure(id, { pose, mood })])), [key]);

  return (
    <div className={`login-crew mode-${mode}`}>
      {figures.map(([id], i) => (
        <div
          key={id}
          ref={(el) => { members.current[id] = el; }}
          className="crew-member"
          style={{ '--i': i, '--d': `${(i % 4) * 0.12}s` }}
          onPointerEnter={() => setHover(id)}
          onPointerLeave={() => setHover((h) => (h === id ? null : h))}
          title={PEOPLE[id].name}
          dangerouslySetInnerHTML={{ __html: html[id] }}
        />
      ))}
    </div>
  );
}
