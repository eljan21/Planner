export const DAYS = ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar'];
export const DAYS_SHORT = ['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz'];
export const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
export const MONTHS_SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'];

const pad = (n) => String(n).padStart(2, '0');

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
let weekStartsOn = 1; // 1 = Monday, 0 = Sunday (user setting)
export const setWeekStartsOn = (n) => { weekStartsOn = n === 0 ? 0 : 1; };
export const getWeekStartsOn = () => weekStartsOn;

export const startOfWeek = (d) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() - weekStartsOn + 7) % 7));
  return x;
};
export const todayKey = () => toKey(new Date());
export const weekdayIndex = (d) => (d.getDay() + 6) % 7; // Monday = 0
export const dayShort = (key) => DAYS_SHORT[weekdayIndex(fromKey(key))];

export const weekKeys = (weekStart) => Array.from({ length: 7 }, (_, i) => toKey(addDays(weekStart, i)));

export function weekDiff(weekStart) {
  return Math.round((weekStart - startOfWeek(new Date())) / (7 * 864e5));
}

export function weekLabel(weekStart) {
  const n = weekDiff(weekStart);
  if (n === 0) return 'Bu həftə';
  if (n === 1) return 'Gələn həftə';
  if (n === -1) return 'Keçən həftə';
  return n > 0 ? `${n} həftə sonra` : `${-n} həftə əvvəl`;
}

export function formatRange(weekStart) {
  const a = weekStart;
  const b = addDays(weekStart, 6);
  if (a.getMonth() === b.getMonth()) return `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  if (a.getFullYear() === b.getFullYear()) return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
  return `${a.getDate()} ${MONTHS[a.getMonth()]} ${a.getFullYear()} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}

export function formatDay(key) {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function relativeDayLabel(key) {
  const t = todayKey();
  if (key === t) return 'Bu gün';
  if (key === toKey(addDays(new Date(), -1))) return 'Dünən';
  if (key === toKey(addDays(new Date(), 1))) return 'Sabah';
  const d = fromKey(key);
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${DAYS[weekdayIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}

/** local calendar day on which a task was completed */
export const doneKey = (t) => (t.doneAt ? toKey(new Date(t.doneAt)) : t.date);
