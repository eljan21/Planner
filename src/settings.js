import { createContext, useContext } from 'react';

export const DEFAULT_SETTINGS = {
  appName: "Khaya's Planner",
  accent: 'lime',
  theme: 'system',
  weekStartsOn: 1,
  hiddenDays: [],
  density: 'comfortable',
  sort: 'manual',
  dayColors: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
};

export const ACCENTS = [
  { id: 'lime', name: 'Laym' },
  { id: 'violet', name: 'Bənövşəyi' },
  { id: 'sky', name: 'Səma' },
  { id: 'peach', name: 'Şaftalı' },
  { id: 'mint', name: 'Nanə' },
  { id: 'rose', name: 'Qızılgül' },
  { id: 'sun', name: 'Günəş' },
];

export const SettingsContext = createContext(DEFAULT_SETTINGS);
export const useSettings = () => useContext(SettingsContext);

/** class name for the pastel header colour of a weekday (Monday = 0) */
export const dayColorClass = (settings, mondayIndex) => `p-day${(settings.dayColors?.[mondayIndex] || `p${mondayIndex}`).slice(1)}`;

/** Upcoming occurrences of a recurring task are projections, not real work yet. */
export const isProjection = (t, today) => !!t.recurId && !t.done && t.date > today;

export const PRIORITIES = [
  { id: 0, name: 'Yox' },
  { id: 1, name: 'Aşağı' },
  { id: 2, name: 'Orta' },
  { id: 3, name: 'Yüksək' },
];

/** order of tasks inside a day according to the user's preference */
export function sortTasks(list, sort) {
  const byPos = (a, b) => a.position - b.position;
  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99');
  if (sort === 'time') return list.sort((a, b) => byTime(a, b) || byPos(a, b));
  if (sort === 'priority') return list.sort((a, b) => (b.priority || 0) - (a.priority || 0) || byTime(a, b) || byPos(a, b));
  return list.sort(byPos);
}
