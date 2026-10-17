// Date math for recurring tasks. Keys are "YYYY-MM-DD"; everything is done in UTC to avoid DST issues.
const pad = (n) => String(n).padStart(2, '0');
export const keyOf = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
export const parseKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
export const addDaysKey = (k, n) => {
  const d = parseKey(k);
  d.setUTCDate(d.getUTCDate() + n);
  return keyOf(d);
};
const daysInMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();

/** All dates in [from, to] on which the rule fires. */
export function occurrences(rule, from, to) {
  const out = [];
  const days = JSON.parse(rule.days || '[]');
  const startDom = parseKey(rule.start_date).getUTCDate();
  const end = parseKey(to);
  for (const d = parseKey(from < rule.start_date ? rule.start_date : from); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const fires = rule.freq === 'daily'
      || (rule.freq === 'weekly' && days.includes(d.getUTCDay()))
      || (rule.freq === 'monthly' && d.getUTCDate() === Math.min(startDom, daysInMonth(d)));
    if (fires) out.push(keyOf(d));
  }
  return out;
}
