import { addDays, doneKey, toKey } from '../dates';

/** consecutive days (ending today, or yesterday if nothing yet today) with ≥1 completed task */
export function streak(done) {
  const days = new Set(done.map(doneKey));
  let d = new Date();
  if (!days.has(toKey(d))) d = addDays(d, -1);
  let n = 0;
  while (days.has(toKey(d))) { n += 1; d = addDays(d, -1); }
  return n;
}
