import { bilingual, tr } from './i18n';

// Monday first. These read as the current language's list.
export const DAYS = bilingual(
  ['Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə', 'Bazar'],
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
);
export const DAYS_SHORT = bilingual(['B.e', 'Ç.a', 'Çər', 'C.a', 'Cüm', 'Şən', 'Baz'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
export const MONTHS = bilingual(
  ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'],
  ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
);
export const MONTHS_SHORT = bilingual(
  ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyn', 'İyl', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'],
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
);
/** month names in running text: lower-case in Azerbaijani ("22 oktyabr"), capitalised in English ("22 October") */
export const monthInText = (i) => tr(MONTHS[i].toLowerCase(), MONTHS[i]);

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
  if (n === 0) return tr('Bu həftə', 'This week');
  if (n === 1) return tr('Gələn həftə', 'Next week');
  if (n === -1) return tr('Keçən həftə', 'Last week');
  return n > 0 ? tr(`${n} həftə sonra`, `In ${n} weeks`) : tr(`${-n} həftə əvvəl`, `${-n} weeks ago`);
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
  if (key === t) return tr('Bu gün', 'Today');
  if (key === toKey(addDays(new Date(), -1))) return tr('Dünən', 'Yesterday');
  if (key === toKey(addDays(new Date(), 1))) return tr('Sabah', 'Tomorrow');
  const d = fromKey(key);
  const year = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${DAYS[weekdayIndex(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]}${year}`;
}

// ---------- deadlines & reminders: stored as ISO instants, edited as local "YYYY-MM-DDTHH:mm" ----------
export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${toKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);

/** "23 Oct, 18:00" — with Today / Tomorrow for the nearest days */
export function formatInstant(iso) {
  const d = new Date(iso);
  const k = toKey(d);
  const day = k === todayKey() ? tr('Bu gün', 'Today') : k === toKey(addDays(new Date(), 1)) ? tr('Sabah', 'Tomorrow') : `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  return `${day}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** local calendar day on which a task was completed */
export const doneKey = (t) => (t.doneAt ? toKey(new Date(t.doneAt)) : t.date);
