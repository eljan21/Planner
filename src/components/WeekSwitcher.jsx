import { addDays, startOfWeek, weekDiff } from '../dates';
import { IconChevron } from './Icons';
import { tr } from '../i18n';

/** Pill control: ‹ Last | This week | Next › */
export default function WeekSwitcher({ weekStart, onShift, onGo, onToday }) {
  const diff = weekDiff(weekStart);
  const thisWeek = startOfWeek(new Date());
  return (
    <div className="segmented">
      <button className="seg-arrow" aria-label={tr('Əvvəlki həftə', 'Previous week')} title={tr('Əvvəlki həftə (←)', 'Previous week (←)')} onClick={() => onShift(-1)}><IconChevron dir="left" /></button>
      <button className={diff === -1 ? 'on' : ''} onClick={() => onGo(addDays(thisWeek, -7), 'prev')}>{tr('Keçən', 'Last')}</button>
      <button className={diff === 0 ? 'on' : ''} onClick={onToday}>{tr('Bu həftə', 'This week')}</button>
      <button className={diff === 1 ? 'on' : ''} onClick={() => onGo(addDays(thisWeek, 7), 'next')}>{tr('Gələn', 'Next')}</button>
      <button className="seg-arrow" aria-label={tr('Növbəti həftə', 'Next week')} title={tr('Növbəti həftə (→)', 'Next week (→)')} onClick={() => onShift(1)}><IconChevron /></button>
    </div>
  );
}
