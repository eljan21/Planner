import { createContext, useContext } from 'react';
import { tr } from './i18n';

export const DEFAULT_SETTINGS = {
  appName: 'Plan it!',
  accent: 'lime',
  theme: 'system',
  weekStartsOn: 1,
  hiddenDays: [],
  density: 'comfortable',
  sort: 'manual',
  dayColors: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
  anim: 'full',
  sound: false,
  name: '',          // what the user asked to be called (onboarding)
  crew: null,        // characters that keep the user company; null = everyone
  onboarded: false,
  lang: 'en',        // en | az — also used for Telegram, phone notifications and Excel reports
};

export const SettingsContext = createContext(DEFAULT_SETTINGS);
export const useSettings = () => useContext(SettingsContext);

/** class name for the pastel header colour of a weekday (Monday = 0) */
export const dayColorClass = (settings, mondayIndex) => `p-day${(settings.dayColors?.[mondayIndex] || `p${mondayIndex}`).slice(1)}`;

/** Upcoming occurrences of a recurring task are projections, not real work yet. */
export const isProjection = (t, today) => !!t.recurId && !t.done && t.date > today;

const level = (id, az, en) => ({ id, get name() { return tr(az, en); } });
export const PRIORITIES = [
  level(0, 'Yox', 'None'),
  level(1, 'Aşağı', 'Low'),
  level(2, 'Orta', 'Medium'),
  level(3, 'Yüksək', 'High'),
];

/** order of tasks inside a day according to the user's preference */
export function sortTasks(list, sort) {
  const byPos = (a, b) => a.position - b.position;
  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99');
  if (sort === 'time') return list.sort((a, b) => byTime(a, b) || byPos(a, b));
  if (sort === 'priority') return list.sort((a, b) => (b.priority || 0) - (a.priority || 0) || byTime(a, b) || byPos(a, b));
  return list.sort(byPos);
}
