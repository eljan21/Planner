// How the characters look: flat vector with shaded planes, drawn as an SVG string.
// Canvas is 120 wide; the head (16–94) is scaled up 14% around the neck for the caricature look,
// shoulders sit at y≈112, waist 176, feet 263. Arms hinge at the shoulder (y 114) and elbow (y 150),
// so poses are plain CSS rotations — see characters.css.
const LOOK = {
  rachel: {
    g: 'f', skin: '#efc3a2', shade: '#d39a78', lip: '#c4705f', iris: '#8aa39a', brow: '#6e4c30', mouth: 'soft',
    hair: '#a77b52', hairHi: '#e6c693', hairDark: '#6e4c30',
    back: 'M38 50 Q36 18 60 17 Q84 18 82 50 Q84 100 90 160 Q60 170 30 160 Q36 100 38 50Z',
    front: 'M60 18 Q42 19 38 44 Q36 80 33 124 Q40 114 42 98 Q44 70 46 52 Q50 32 60 24Z M60 18 Q78 19 82 44 Q84 80 87 124 Q80 114 78 98 Q76 70 74 52 Q70 32 60 24Z',
    strands: 'M53 21 Q42 34 41 60 Q40 90 36 118 M67 21 Q78 34 79 60 Q80 90 84 118 M56 22 Q47 40 45 72 M64 22 Q73 40 75 72 M38 104 Q28 114 16 116',
    part: 'M60 17 L60 27',
    top: '#1f1c22', sleeve: null, bottom: 'pants', bcol: '#3c5a86', shoes: '#1a1719',
    detail: '<path d="M49 106 L60 122 L71 106" fill="none" stroke="#2c282f" stroke-width="2"/>',
  },
  monica: {
    g: 'f', skin: '#f3d0b4', shade: '#d9a888', lip: '#b8262f', iris: '#5aa0d8', brow: '#17110f', mouth: 'smile', bigEyes: true,
    hair: '#17110f', hairHi: '#3f3436', hairDark: '#0b0807',
    back: 'M38 50 Q34 16 62 16 Q88 18 84 52 Q88 74 86 92 Q90 104 82 112 Q76 106 76 98 L44 98 Q42 108 36 112 Q30 104 34 92 Q32 74 38 50Z',
    front: 'M66 18 Q44 16 38 40 Q36 56 40 68 Q42 50 50 40 Q58 32 70 30 Q78 36 80 48 Q84 30 66 18Z',
    strands: 'M48 26 Q40 38 39 56 M74 24 Q82 34 82 50 M35 94 q4 6 0 13 M85 92 q-4 6 0 13',
    top: '#b9b1d8', sleeve: 'short', bottom: 'pants', bcol: '#4a6aa0', shoes: '#eeeeea',
    detail: '<path d="M50 106 L60 121 L70 106Z" fill="SKIN"/><path d="M51 108 Q60 122 69 108" fill="none" stroke="#f3efe6" stroke-width=".9"/>',
  },
  phoebe: {
    g: 'f', skin: '#f0c8a6', shade: '#d29f7f', lip: '#b8585c', iris: '#7a5a3a', brow: '#8a6a3e', mouth: 'smile',
    hair: '#d9b46c', hairHi: '#f5e0aa', hairDark: '#8a6a3e',
    back: 'M38 50 Q36 16 60 16 Q84 16 82 50 Q86 120 88 192 Q60 200 32 192 Q34 120 38 50Z',
    front: 'M60 17 Q40 18 39 48 Q38 60 41 66 Q44 40 60 24Z M60 17 Q80 18 81 48 Q82 60 79 66 Q76 40 60 24Z M41 64 Q35 120 37 186 Q44 150 46 110 Q47 84 45 66Z M79 64 Q85 120 83 186 Q76 150 74 110 Q73 84 75 66Z',
    roots: 'M43 32 Q50 18 60 17 Q70 18 77 32 Q68 24 60 26 Q52 24 43 32Z',
    strands: 'M44 70 Q40 120 40 176 M76 70 Q80 120 80 176 M52 21 Q44 30 42 46 M68 21 Q76 30 78 46',
    top: '#1d1b20', sleeve: null, bottom: 'long', bcol: '#7a68b8', shoes: '#9a6a44',
    detail: '<path d="M46 108 L46 118 M74 108 L74 118" stroke="#1d1b20" stroke-width="2"/><g fill="#f1d58e"><circle cx="44" cy="186" r="2.2"/><circle cx="70" cy="192" r="2.2"/><circle cx="54" cy="204" r="2.2"/><circle cx="80" cy="212" r="2.2"/><circle cx="40" cy="224" r="2.2"/><circle cx="62" cy="228" r="2.2"/><circle cx="84" cy="238" r="2.2"/><circle cx="48" cy="242" r="2.2"/></g>',
  },
  chandler: {
    g: 'm', skin: '#eebd9a', shade: '#c98f6c', lip: '#a65a50', iris: '#4b6f8f', brow: '#2a1a14', mouth: 'smirk', laughs: true,
    hair: '#2a1a14', hairHi: '#4e3527', hairDark: '#150c08',
    back: 'M33 58 Q30 16 60 14 Q90 16 87 58Z',
    front: 'M34 56 Q31 30 42 20 L44 10 L50 17 L55 6 L60 15 L66 5 L70 15 L77 9 L77 19 Q87 28 86 56 Q84 46 80 41 Q70 37 60 38 Q48 37 40 41 Q36 46 34 56Z M37.5 46 L38.5 57 L40 57 L40.5 45Z M82.5 46 L81.5 57 L80 57 L79.5 45Z',
    strands: 'M47 18 L50 30 M60 12 L60 28 M70 13 L67 29 M40 30 Q38 38 37 46 M80 30 Q82 38 83 46',
    top: '#4d72b8', sleeve: 'long', bottom: 'pants', bcol: '#b9a27a', shoes: '#5a3d29',
    detail: '<path d="M50 106 Q60 113 70 106" fill="none" stroke="#3f5f9c" stroke-width="2.4"/><path d="M48 150 Q52 160 50 172" fill="none" stroke="#3f5f9c" stroke-width="1.6"/>',
  },
  hermione: {
    g: 'f', skin: '#f2c6a4', shade: '#d39c7a', lip: '#c06a62', iris: '#4a2e1a', brow: '#5a3a22', mouth: 'smile', bigEyes: true,
    hair: '#8a5a34', hairHi: '#c99863', hairDark: '#5e3a1f',
    back: 'M36 50 Q30 16 60 15 Q90 16 84 50 Q94 76 90 104 Q96 126 88 150 Q78 156 74 144 L46 144 Q42 156 32 150 Q24 126 30 104 Q26 76 36 50Z',
    front: 'M64 17 Q40 16 37 44 Q35 58 39 66 Q42 46 52 38 Q62 30 72 34 Q80 42 82 58 Q86 30 64 17Z',
    strands: 'M33 70 q-4 10 0 20 q4 10 -1 22 q-3 10 2 20 M87 70 q4 10 0 20 q-4 10 1 22 q3 10 -2 20 M50 24 Q42 30 40 46 M70 24 Q80 32 81 46',
    top: '#1b1b21', sleeve: 'long', bottom: 'skirt', bcol: '#5d5e66', legs: '#8a8b93', shoes: '#141418',
    detail: '<path d="M44 108 L60 140 L76 108" fill="#2c2c33"/><path d="M50 106 L60 128 L70 106Z" fill="#f4f2ee"/><path d="M49 104 L56 112 L60 107Z M71 104 L64 112 L60 107Z" fill="#fff"/><path d="M57.5 110 L62.5 110 L64 134 L60 139 L56 134Z" fill="#a51f2c"/><path d="M57 116 L63 113.5 M56.6 123 L63.6 120.5 M56.4 130 L63.6 127.5" stroke="#e0b440" stroke-width="2.2"/><path d="M44 108 L56 176 M76 108 L64 176" fill="none" stroke="#33333c" stroke-width="2"/><circle cx="75" cy="134" r="4.2" fill="#a51f2c" stroke="#e0b440" stroke-width="1"/>',
  },
  harry: {
    g: 'm', skin: '#f0c8a6', shade: '#cc9a77', lip: '#a96a5c', iris: '#3f8a4a', brow: '#3a2618', mouth: 'smile',
    hair: '#4a2f1c', hairHi: '#6e4a2e', hairDark: '#2a190e',
    back: 'M32 60 Q28 14 60 12 Q92 14 88 60Z',
    front: 'M33 58 Q28 26 52 16 Q70 10 84 22 L90 18 L87 30 Q90 44 87 58 Q84 48 80 42 L76 48 L72 38 L66 46 L62 36 L56 46 L52 36 L46 44 L42 38 Q36 46 33 58Z M37.5 48 L38.5 57 L40 57 L40.5 47Z M82.5 48 L81.5 57 L80 57 L79.5 47Z',
    strands: 'M56 18 Q68 18 80 26 M44 24 Q50 28 54 34 M38 32 Q36 40 35 50 M84 32 Q86 40 86 50',
    extra: '<path d="M61.5 38 l3 3.5 l-3 1 l3 4.5" fill="none" stroke="#b5452e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><g fill="none" stroke="#1e1915" stroke-width="1.9"><circle cx="51" cy="58" r="6.8"/><circle cx="69" cy="58" r="6.8"/><path d="M57.8 58 Q60 56 62.2 58 M44.2 57 L40 55.5 M75.8 57 L80 55.5"/></g><g fill="#fff" opacity=".25"><circle cx="48.5" cy="55.5" r="1.6"/><circle cx="66.5" cy="55.5" r="1.6"/></g>',
    top: '#8e9296', sleeve: 'robe', robe: '#3b3d44', bottom: 'pants', bcol: '#39507a', shoes: '#141418', wand: true,
    detail: '<path d="M50 106 L60 118 L70 106Z" fill="#f4f2ee"/><path d="M58 112 L62 112 L62.6 124 L60 127 L57.4 124Z" fill="#a51f2c"/><path d="M36 112 Q34 150 37 178 L48 178 L50 112Z M84 112 Q86 150 83 178 L72 178 L70 112Z" fill="#3b3d44"/><path d="M43 103 Q60 115 77 103 L79 112 Q60 124 41 112Z" fill="#7a1f26"/><path d="M48 107 L50 116 M56 109 L57 119 M64 109 L63 119 M72 107 L70 116" stroke="#e0b440" stroke-width="3"/><path d="M64 114 L72 114 L74 156 L64 156Z" fill="#7a1f26"/><path d="M64.4 122 L73 122 M64.6 132 L73.4 132 M64.8 142 L73.8 142" stroke="#e0b440" stroke-width="3"/><path d="M64 156 L65 162 M67 156 L68 162 M70 156 L71 162 M73 156 L74 162" stroke="#e0b440" stroke-width="1.2"/>',
  },
  widow: {
    g: 'f', skin: '#f1cbb0', shade: '#d2a385', lip: '#a8484f', iris: '#3f9a5a', brow: '#8e2a18', mouth: 'firm',
    hair: '#b83a24', hairHi: '#e86a40', hairDark: '#7e2414',
    back: 'M38 50 Q34 16 60 15 Q86 16 82 50 Q88 110 92 170 Q84 178 78 168 L42 168 Q36 178 28 170 Q32 110 38 50Z',
    front: 'M54 17 Q38 20 38 50 Q38 72 35 100 Q42 84 43 62 Q46 38 58 28 Q70 34 78 46 Q82 58 82 72 Q86 34 70 20Z',
    strands: 'M46 26 Q40 40 40 62 Q39 80 37 96 M70 24 Q80 34 82 52 M84 80 Q87 120 88 160 M34 86 Q31 120 31 160',
    top: '#2a2546', sleeve: 'long', bottom: 'pants', bcol: '#2a2546', shoes: '#141218', boots: true, bootTop: 226, bracer: '#d9b23a',
    detail: '<path d="M44 112 Q50 132 46 150 M76 112 Q70 132 74 150 M50 186 Q48 220 50 228" fill="none" stroke="#4a4280" stroke-width="3" stroke-linecap="round"/><path d="M60 118 L60 176" stroke="#1b1730" stroke-width="1.4"/><circle cx="60" cy="114" r="4.2" fill="none" stroke="#d9b23a" stroke-width="2.2"/><rect x="36" y="174" width="48" height="7" rx="3" fill="#1b1730"/><g fill="#d9b23a"><circle cx="40" cy="177.5" r="3.2"/><circle cx="47" cy="178.5" r="3.2"/><circle cx="53" cy="179" r="3.2"/><circle cx="67" cy="179" r="3.2"/><circle cx="73" cy="178.5" r="3.2"/><circle cx="80" cy="177.5" r="3.2"/></g><circle cx="60" cy="179.5" r="4.6" fill="#141218" stroke="#d9b23a" stroke-width="1.2"/><path d="M57.6 177 L62.4 177 L60 179.5Z M57.6 182 L62.4 182 L60 179.5Z" fill="#d1322a"/>',
  },
  wanda: {
    g: 'f', skin: '#eec3a6', shade: '#cf9a7e', lip: '#a3343e', iris: '#5d6a4a', brow: '#3a1412', mouth: 'firm', magic: true,
    hair: '#5a1e1c', hairHi: '#8c3a30', hairDark: '#350f0d',
    back: 'M38 50 Q34 14 62 14 Q90 16 84 50 Q92 100 98 150 Q106 162 98 170 Q88 162 82 152 L40 152 Q34 162 24 168 Q28 120 38 50Z',
    front: 'M60 16 Q40 18 38 48 Q36 72 38 94 Q42 62 46 46 Q52 30 60 24Z M60 16 Q80 18 82 48 Q84 72 82 94 Q78 62 74 46 Q68 30 60 24Z',
    strands: 'M84 40 Q98 28 104 12 M86 60 Q100 54 110 40 M46 24 Q40 40 40 70 M74 24 Q80 40 80 70',
    top: '#6e6a70', sleeve: 'long', sleeveCol: '#b5243a', bottom: 'flare', bcol: '#77727a', legs: '#33333a', shoes: '#7a5a3a', boots: true, bootTop: 238, gloves: '#3a2a2e',
    detail: '<path d="M38 110 Q36 150 38 172 L50 172 L54 124 L46 106Z M82 110 Q84 150 82 172 L70 172 L66 124 L74 106Z" fill="#b5243a"/><path d="M46 106 L42 96 L52 112Z M74 106 L78 96 L68 112Z" fill="#8e1a2e"/><path d="M54 120 Q60 128 66 120" fill="none" stroke="#56525a" stroke-width="1.5"/><path d="M43 226 L56 226 M64 228 L77 228 M43 232 L56 232 M64 234 L77 234" stroke="#55555e" stroke-width="1.8"/>',
  },
};

// props are always drawn and only shown by the pose that uses them (characters.css)
const HAND_PROPS = `<g class="prop p-cup"><rect x="77" y="186" width="12" height="13" rx="2" fill="#f4f1ea"/><rect x="77" y="190" width="12" height="3.5" fill="#2f5d50"/><path d="M89 189 q4 0 4 3.5 q0 3.5 -4 3.5" fill="none" stroke="#f4f1ea" stroke-width="1.8"/></g>
  <g class="prop p-cloth"><path d="M75 190 L92 188 L94 204 L79 206Z" fill="#7fb3e6"/><path d="M79 196 L92 194.5 M80 200 L93 198.5" stroke="#5a8fc4" stroke-width="1"/></g>`;
const SPARKS = '<g class="prop p-spark" fill="#fff3b0"><path d="M100 202 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6Z"/><path d="M110 214 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2Z"/><path d="M92 222 l1 2.6 2.6 1 -2.6 1 -1 2.6 -1 -2.6 -2.6 -1 2.6 -1Z"/><circle cx="106" cy="226" r="1.6"/><circle cx="96" cy="208" r="1.2"/></g>';
const GUITAR = '<g class="prop p-guitar"><g transform="rotate(-32 60 162)"><rect x="57.5" y="100" width="5" height="48" rx="2" fill="#5a3a22"/><rect x="56" y="96" width="8" height="8" rx="2" fill="#3a2418"/><ellipse cx="60" cy="160" rx="16" ry="13" fill="#c47a3a"/><ellipse cx="60" cy="170" rx="18" ry="12" fill="#b06a2e"/><circle cx="60" cy="160" r="4.2" fill="#3a2418"/><path d="M59 104 L59 176 M61 104 L61 176" stroke="#f1e2c4" stroke-width=".5"/></g></g>';

// mouths are drawn around (60, 80); grumpy/laugh override the character's default
const MOUTHS = {
  soft: (l) => `<path d="M53 80 Q56.5 78 60 79 Q63.5 78 67 80 Q60 81.4 53 80Z" fill="${l.lip}"/><path d="M53.4 80.2 Q60 85 66.6 80.2 Q60 81.6 53.4 80.2Z" fill="${l.lip}" opacity=".75"/><path d="M53 80 Q60 82.6 67 80" fill="none" stroke="#6e3a34" stroke-width=".9"/>`,
  firm: (l) => `<path d="M54 80.5 Q57 79 60 79.8 Q63 79 66 80.5 Q60 81.6 54 80.5Z" fill="${l.lip}"/><path d="M54.4 80.7 Q60 84 65.6 80.7 Q60 81.8 54.4 80.7Z" fill="${l.lip}" opacity=".7"/>`,
  smile: (l) => `<path d="M51.5 78.6 Q60 88.5 68.5 78.6 Q60 81 51.5 78.6Z" fill="#5a1f22"/><path d="M53 79.3 Q60 82.2 67 79.3 L66.2 81.4 Q60 83.4 53.8 81.4Z" fill="#fff"/><path d="M51.5 78.6 Q60 81 68.5 78.6 M51.5 78.6 Q60 88.5 68.5 78.6" fill="none" stroke="${l.lip}" stroke-width="1.5" stroke-linejoin="round"/>`,
  smirk: () => '<path d="M53 81 Q61 84 68 78" fill="none" stroke="#7a3a34" stroke-width="2" stroke-linecap="round"/><path d="M68.5 77.5 q1.8 1 1.2 3" fill="none" stroke="#7a3a34" stroke-width="1.2" stroke-linecap="round"/>',
  laugh: (l) => `<path d="M50 76.5 Q60 94 70 76.5 Q60 79.5 50 76.5Z" fill="#3a1416"/><path d="M51.6 77.3 Q60 80.4 68.4 77.3 L67.6 79.6 Q60 82 52.4 79.6Z" fill="#fff"/><path d="M55 88.5 Q60 90.6 65 88.5 Q60 86.5 55 88.5Z" fill="#c55a63"/>`,
  flat: () => '<path d="M54 81.5 Q60 80 66 81.5" fill="none" stroke="#7a3a34" stroke-width="2" stroke-linecap="round"/>',
};

let gid = 0;

/**
 * @param {string} id   character id from people.js
 * @param {object} opts mood: happy | party | grumpy | sleepy | yawn | worried | surprised
 *                      pose: CSS pose class (clap, jump, grumpy, wave, sip, ...); bust: head-and-shoulders crop
 */
export function figure(id, { mood, bust = false, pose = '' } = {}) {
  const L = LOOK[id];
  const g = `sk${gid++}`;
  const skin = L.skin;
  const grumpy = mood === 'grumpy';
  const cheerful = mood === 'happy' || mood === 'party';
  const laughing = cheerful && L.laughs;
  const closed = mood === 'sleepy' || mood === 'yawn';
  const worried = mood === 'worried';
  const surprised = mood === 'surprised';

  // eyes: almond whites, iris, lid line; laughing turns them into closed arcs
  const eye = (cx) => {
    if (closed) return `<path d="M${cx - 5.5} 58 Q${cx} 61 ${cx + 5.5} 58" fill="none" stroke="#2a1d17" stroke-width="1.8" stroke-linecap="round"/>`;
    if (laughing) return `<path d="M${cx - 5.5} 58.5 Q${cx} 54 ${cx + 5.5} 58.5" fill="none" stroke="#2a1d17" stroke-width="1.8" stroke-linecap="round"/>`;
    const w = L.bigEyes ? 6.4 : 5.8;
    const h = (L.bigEyes ? 4.6 : 3.8) * (surprised ? 1.3 : 1);
    const flick = L.g === 'f' ? `<path d="M${cx + (cx < 60 ? -w : w)} 57.4 l${cx < 60 ? -2.6 : 2.6} -2" stroke="#1e1512" stroke-width="1.4" stroke-linecap="round"/>` : '';
    return `<path d="M${cx - w} 58 Q${cx} ${58 - h * 1.25} ${cx + w} 58 Q${cx} ${58 + h * .75} ${cx - w} 58Z" fill="#fbf7f2"/>
      <g class="look"><circle cx="${cx}" cy="58" r="${h * .78}" fill="${L.iris}"/><circle cx="${cx}" cy="58" r="${h * .36}" fill="#120c0a"/><circle cx="${cx + 1.1}" cy="56.9" r=".9" fill="#fff"/></g>
      <path d="M${cx - w - .4} 58 Q${cx} ${58 - h * 1.3} ${cx + w + .4} 57.6" fill="none" stroke="#1e1512" stroke-width="${L.g === 'f' ? 1.8 : 1.4}" stroke-linecap="round"/>
      <path d="M${cx - w + 1.2} ${55.4 - h * .5} Q${cx} ${53.6 - h * .6} ${cx + w - 1.2} ${55.4 - h * .5}" fill="none" stroke="${L.shade}" stroke-width=".9"/>${flick}`;
  };
  const browY = grumpy ? [52, 49, 50.5] : surprised ? [47, 44.5, 46.5] : [50.5, 48, 50];
  const brows = worried
    ? 'M44 50.5 Q50 49 57 46.5 M63 46.5 Q70 49 76 50.5'
    : grumpy
    ? `M44 ${browY[1]} Q50 ${browY[0]} 57 ${browY[0] + 1.5} M63 ${browY[0] + 1.5} Q70 ${browY[0]} 76 ${browY[1]}`
    : `M44 ${browY[0]} Q50 ${browY[1] - 1} 57 ${browY[2]} M63 ${browY[2]} Q70 ${browY[1] - 1} 76 ${browY[0]}`;
  const mouth = grumpy ? MOUTHS.flat(L)
    : mood === 'yawn' ? '<ellipse cx="60" cy="81" rx="4.2" ry="5.6" fill="#3a1416"/><ellipse cx="60" cy="84" rx="2.6" ry="1.8" fill="#c55a63"/>'
    : surprised ? '<ellipse cx="60" cy="81" rx="2.6" ry="3.2" fill="#3a1416"/>'
    : worried ? '<path d="M54 82 Q57 80.5 60 82 Q63 83.5 66 82" fill="none" stroke="#7a3a34" stroke-width="2" stroke-linecap="round"/>'
    : laughing ? MOUTHS.laugh(L) : cheerful && L.mouth !== 'smile' ? MOUTHS.smile(L) : MOUTHS[L.mouth](L);

  // ---- body: shaped torso, tapered limbs, real trouser legs; head is drawn 14% larger for the caricature look ----
  const upper = L.sleeve ? (L.sleeve === 'robe' ? L.robe : L.sleeveCol || L.top) : skin;
  const fore = L.sleeve === 'long' || L.sleeve === 'robe' ? upper : skin;
  const SHADE = 'fill="#000" opacity=".13"';
  const arm = (side) => {
    const sx = side === 'l' ? 37 : 83;
    const inward = side === 'l' ? 1 : -1;
    const hand = L.gloves || skin;
    const upperSkin = L.sleeve === 'short' || !L.sleeve ? skin : upper;
    const wand = L.wand && side === 'r'
      ? `<g class="wand"><path d="M83 190 L99 214" stroke="#5a3a22" stroke-width="2.6" stroke-linecap="round"/><circle class="glow" cx="100" cy="216" r="3.5" fill="#fff8d6"/>${SPARKS}</g>` : '';
    const magic = L.magic ? `<circle class="magic" cx="${sx}" cy="191" r="13" fill="none" stroke="#ff6fb5" stroke-width="2.4"/><circle class="magic m2" cx="${sx}" cy="191" r="18" fill="none" stroke="#ff9fd0" stroke-width="1.2"/>` : '';
    return `<g class="arm arm-${side}" style="transform-origin:${sx}px 114px">
      <path d="M${sx - 7.5} 112 Q${sx - 9} 130 ${sx - 6.2} 150 L${sx + 6.2} 150 Q${sx + 9} 130 ${sx + 7.5} 112 Q${sx} 104 ${sx - 7.5} 112Z" fill="${upperSkin}"/>
      ${L.sleeve === 'short' ? `<path d="M${sx - 8.2} 112 Q${sx - 9.4} 122 ${sx - 9} 130 L${sx + 9} 130 Q${sx + 9.4} 122 ${sx + 8.2} 112 Q${sx} 103 ${sx - 8.2} 112Z" fill="${L.top}"/>` : ''}
      <path d="M${sx + 2} 108 Q${sx + 8.6} 120 ${sx + 8} 132 Q${sx + 7} 142 ${sx + 6.2} 150 L${sx + 2.6} 150 Q${sx + 4.2} 130 ${sx + 2} 108Z" ${SHADE}/>
      <g class="fore" style="transform-origin:${sx}px 150px">
        <circle cx="${sx}" cy="149" r="6.2" fill="${fore}"/>
        <path d="M${sx - 6.2} 148 Q${sx - 6.8} 166 ${sx - 4.4} 184 L${sx + 4.4} 184 Q${sx + 6.8} 166 ${sx + 6.2} 148Z" fill="${fore}"/>
        <path d="M${sx + 1.6} 150 Q${sx + 6.4} 166 ${sx + 4.4} 184 L${sx + 1.4} 184 Q${sx + 3} 166 ${sx + 1.6} 150Z" ${SHADE}/>
        ${L.bracer ? `<path d="M${sx - 7} 166 L${sx + 7} 166 L${sx + 6} 182 L${sx - 6} 182Z" fill="${L.bracer}"/><path d="M${sx - 6.6} 171 L${sx + 6.6} 171 M${sx - 6.3} 176 L${sx + 6.3} 176" stroke="#a8862a" stroke-width="1"/>` : ''}
        ${L.sleeve === 'robe' ? `<path d="M${sx - 7} 168 L${sx + 7} 168 L${sx + 10.5} 186 L${sx - 10.5} 186Z" fill="${L.robe}"/>` : ''}
        <path d="M${sx - 5.2} 182 Q${sx - 6.6} 193 ${sx - 3.4} 198 Q${sx} 200.5 ${sx + 3.4} 198 Q${sx + 6.6} 193 ${sx + 5.2} 182Z" fill="${hand}"/>
        <ellipse cx="${sx + inward * 5.4}" cy="188" rx="2.2" ry="4.2" fill="${hand}" transform="rotate(${inward * -20} ${sx + inward * 5.4} 188)"/>
        <path d="M${sx - 3} 194 L${sx - 3} 197 M${sx} 195 L${sx} 198.5 M${sx + 3} 194 L${sx + 3} 197" stroke="#000" stroke-opacity=".15" stroke-width=".8"/>
        ${wand}${magic}
        ${side === 'r' ? HAND_PROPS : ''}
      </g>
    </g>`;
  };

  const legCol = L.legs || skin;
  const bootTop = L.bootTop || 222;
  let lower = '';
  if (L.bottom !== 'pants') {
    lower += `<path d="M42 200 Q40 228 44 254 L54 254 Q57 228 58 200Z" fill="${legCol}"/><path d="M62 200 Q63 228 66 254 L76 254 Q80 228 78 200Z" fill="${legCol}"/>`;
    lower += `<path d="M71 204 Q79 228 75 254 L72 254 Q75 228 70 206Z" ${SHADE}/>`;
  }
  if (L.bottom === 'pants') {
    lower += `<path d="M36 176 L84 176 Q87 200 84 224 L80 254 L66 254 L63.5 214 Q62 202 60 198 Q58 202 56.5 214 L54 254 L40 254 L36 224 Q33 200 36 176Z" fill="${L.bcol}"/>
      <path d="M74 182 Q86 200 83 224 L79.5 254 L73.5 254 Q78 226 76 204Z" ${SHADE}/>
      <path d="M42 224 Q46 227 50 225 M70 225 Q74 227 78 224 M47 240 L46 252 M73 240 L74 252" stroke="#000" stroke-opacity=".16" stroke-width="1.1" fill="none"/>
      <path d="M60 180 L60 197" stroke="#000" stroke-opacity=".2" stroke-width="1.2"/>`;
  }
  if (L.boots) {
    lower += `<path d="M42 ${bootTop} L56 ${bootTop} L55 256 L42 256Z" fill="${L.shoes}"/><path d="M64 ${bootTop} L78 ${bootTop} L78 256 L65 256Z" fill="${L.shoes}"/>
      <path d="M42 ${bootTop + 3} L56 ${bootTop + 3} M64 ${bootTop + 3} L78 ${bootTop + 3}" stroke="#000" stroke-opacity=".25" stroke-width="1.2"/>`;
  }
  lower += `<path d="M41 252 L55 252 Q57 258 56 263 L34 263 Q32 257 41 252Z" fill="${L.shoes}"/>
    <g class="shoe-r" style="transform-origin:64px 263px"><path d="M65 252 L79 252 Q88 257 86 263 L64 263 Q63 258 65 252Z" fill="${L.shoes}"/></g>
    <path d="M34 263 L56 263 M64 263 L86 263" stroke="#000" stroke-opacity=".35" stroke-width="1.6"/>`;
  if (L.bottom === 'skirt') lower += `<path d="M37 174 L83 174 L91 222 Q60 228 29 222Z" fill="${L.bcol}"/><path d="M46 178 L41 223 M54 178 L52 226 M66 178 L68 226 M74 178 L79 223" stroke="#000" stroke-opacity=".18" stroke-width="1.2"/><path d="M72 178 L83 174 L91 222 Q84 224 78 224Z" ${SHADE}/>`;
  if (L.bottom === 'flare') lower += `<path d="M37 172 L83 172 Q95 206 98 218 Q89 224 80 220 Q70 228 60 222 Q50 228 40 220 Q31 224 22 218 Q25 206 37 172Z" fill="${L.bcol}"/><path d="M48 178 Q44 200 40 220 M60 178 L60 222 M72 178 Q76 200 80 220" stroke="#000" stroke-opacity=".15" stroke-width="1.2" fill="none"/>`;
  if (L.bottom === 'long') lower += `<path d="M37 172 L83 172 L93 250 Q60 257 27 250Z" fill="${L.bcol}"/><path d="M50 178 L44 252 M70 178 L76 252" stroke="#000" stroke-opacity=".15" stroke-width="1.2"/><path d="M72 176 L83 172 L93 250 Q86 252 80 253Z" ${SHADE}/>`;

  const torso = L.g === 'f'
    ? 'M36 112 Q40 104 60 104 Q80 104 84 112 Q88 124 84 138 Q80 152 80 166 Q84 174 84 182 L36 182 Q36 174 40 166 Q40 152 36 138 Q32 124 36 112Z'
    : 'M33 113 Q37 103 60 103 Q83 103 87 113 Q90 126 86 142 L84 182 L36 182 L34 142 Q30 126 33 113Z';
  const torsoShade = 'M72 106 Q84 108 86 118 Q86 150 83 182 L75 182 Q79 150 77 120Z';
  const face = L.g === 'f'
    ? 'M37 52 Q37 28 60 27 Q83 28 83 52 L83 60 Q82 72 75 80 Q67 89 60 90 Q53 89 45 80 Q38 72 37 60Z'
    : 'M36 50 Q36 25 60 24 Q84 25 84 50 L84 62 Q83 76 76 84 Q68 92 60 92 Q52 92 44 84 Q37 76 36 62Z';
  const faceShade = L.g === 'f'
    ? 'M62 28 Q83 29 83 52 L83 60 Q82 72 75 80 Q67 89 61 90 Q70 78 73 62 Q75 42 62 28Z'
    : 'M62 25 Q84 26 84 50 L84 62 Q83 76 76 84 Q68 92 61 92 Q71 80 74 64 Q76 42 62 25Z';
  const ex = L.g === 'f' ? 37.5 : 36.5;

  return `<svg class="fig${pose ? ` ${pose}` : ''}" viewBox="${bust ? '6 -6 108 108' : '-16 -10 152 276'}" aria-hidden="true">
    <defs><linearGradient id="${g}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${skin}"/><stop offset="1" stop-color="${L.shade}"/></linearGradient></defs>
    <g class="all">
      <g transform="translate(60 100) scale(1.14) translate(-60 -100)"><g class="head">${L.back ? `<path d="${L.back}" fill="${L.hairDark}"/><path d="${L.back}" fill="${L.hair}" transform="translate(60 0) scale(.94 1) translate(-60 0)"/>` : ''}</g></g>
      ${lower}
      <path d="M52 86 L52 106 Q60 111 68 106 L68 86Z" fill="${L.shade}"/>
      <path d="M52 90 Q60 101 68 90 L68 99 Q60 106 52 99Z" fill="#000" opacity=".1"/>
      <path d="${torso}" fill="${L.top}"/>
      <path d="${torsoShade}" ${SHADE}/>
      ${L.detail.replace('SKIN', skin)}
      ${id === 'phoebe' ? GUITAR : ''}
      ${arm('l')}${arm('r')}
      <g transform="translate(60 100) scale(1.14) translate(-60 -100)"><g class="head">
        <ellipse cx="${ex}" cy="61" rx="3.6" ry="6.4" fill="${L.shade}"/><ellipse cx="${120 - ex}" cy="61" rx="3.6" ry="6.4" fill="${L.shade}"/>
        <path d="${face}" fill="url(#${g})"/>
        <path d="${faceShade}" fill="${L.shade}" opacity=".55"/>
        <ellipse cx="48" cy="70" rx="5.5" ry="3" fill="#e0837a" opacity=".22"/><ellipse cx="72" cy="70" rx="5.5" ry="3" fill="#e0837a" opacity=".22"/>
        <g class="eyes">${eye(51)}${eye(69)}</g>
        <path d="${brows}" fill="none" stroke="${L.brow}" stroke-width="${L.g === 'm' ? 2.6 : 2}" stroke-linecap="round"/>
        <path d="M61 59 L59.5 71 Q61 73.2 63.6 72.2" fill="none" stroke="${L.shade}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M57 73 Q59.5 74.6 62.5 73.4" fill="none" stroke="#9c6a54" stroke-width="1" stroke-linecap="round"/>
        <path d="M60.2 60 L59.4 69" stroke="#fff" stroke-width="1" opacity=".35" stroke-linecap="round"/>
        ${mouth}
        ${L.roots ? `<path d="${L.roots}" fill="${L.hairDark}"/>` : ''}
        <path d="${L.front}" fill="${L.hair}"/>
        ${L.roots ? `<path d="${L.roots}" fill="${L.hairDark}" opacity=".85"/>` : ''}
        ${L.strands ? `<path d="${L.strands}" fill="none" stroke="${L.hairHi}" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>` : ''}
        ${L.part ? `<path d="${L.part}" stroke="${L.hairDark}" stroke-width="1.6"/>` : ''}
        ${L.extra || ''}
        <path class="prop p-sweat" d="M84 38 Q88 45 84 49 Q80 45 84 38Z" fill="#9fd3ff"/>
      </g></g>
      ${arm('l').replace('class="arm arm-l"', 'class="arm arm-l front"')}
      ${arm('r').replace('class="arm arm-r"', 'class="arm arm-r front"')}
    </g>
  </svg>`;
}
export const portrait = (id, mood) => figure(id, { mood, bust: true });
