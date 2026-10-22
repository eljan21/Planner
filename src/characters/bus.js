// Tiny event bus so any part of the app can tell the buddy what just happened
// ('done', 'lazy', 'early', 'add', 'restore', 'overdue') without threading callbacks through every component.
const listeners = new Set();

export const buddyBus = {
  emit(type, data = {}) { listeners.forEach((fn) => fn({ type, ...data })); },
  on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const COLORS = ['#e3b450', '#6aa2ff', '#c9dbff', '#3d6fd8', '#f1d58e', '#ff8fb8'];

/** a burst of confetti from a screen point */
export function confetti(x, y, n = 16) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.className = 'confetti';
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.background = COLORS[i % COLORS.length];
    document.body.appendChild(s);
    const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
    const d = 40 + Math.random() * 90;
    s.animate([
      { transform: 'translate(-50%,-50%) rotate(0)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d + 70}px)) rotate(${Math.random() * 600}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
  }
}

let audio;
/** four claps — "I'll be there for you" — synthesized, so no audio files are needed */
export function claps(times = [0, 0.32, 0.64, 0.96], offset = 0) {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    times.forEach((t) => {
      const len = audio.sampleRate * 0.12;
      const buf = audio.createBuffer(1, len, audio.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
      const src = audio.createBufferSource();
      src.buffer = buf;
      const bp = audio.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1400;
      bp.Q.value = 0.9;
      const g = audio.createGain();
      g.gain.value = 0.9;
      src.connect(bp).connect(g).connect(audio.destination);
      src.start(audio.currentTime + offset + t);
    });
  } catch { /* no audio available */ }
}
