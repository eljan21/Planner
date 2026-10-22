import { useState } from 'react';

const TONES = ['#e3b450', '#6aa2ff', '#ec7fb0', '#5fcf95', '#b07cf0', '#f0a05a'];

/** Profile picture, or the first letter on a coloured circle when there is none (or it fails to load). */
export default function Avatar({ src, name = '', size = 40, className = '' }) {
  const [broken, setBroken] = useState(false);
  const letter = (name.trim()[0] || '?').toLocaleUpperCase('az');
  const tone = TONES[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length];
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (src && !broken) {
    return <img className={`avatar ${className}`} src={src} alt="" style={style} referrerPolicy="no-referrer" onError={() => setBroken(true)} />;
  }
  return <span className={`avatar ${className}`} style={{ ...style, background: tone }} aria-hidden="true">{letter}</span>;
}
