import { addDays, startOfWeek, weekDiff } from '../dates';
import { IconChevron } from './Icons';

/** Pill control: ‹ Keçən | Bu həftə | Gələn › */
export default function WeekSwitcher({ weekStart, onShift, onGo, onToday }) {
  const diff = weekDiff(weekStart);
  const thisWeek = startOfWeek(new Date());
  return (
    <div className="segmented">
      <button className="seg-arrow" aria-label="Əvvəlki həftə" title="Əvvəlki həftə (←)" onClick={() => onShift(-1)}><IconChevron dir="left" /></button>
      <button className={diff === -1 ? 'on' : ''} onClick={() => onGo(addDays(thisWeek, -7), 'prev')}>Keçən</button>
      <button className={diff === 0 ? 'on' : ''} onClick={onToday}>Bu həftə</button>
      <button className={diff === 1 ? 'on' : ''} onClick={() => onGo(addDays(thisWeek, 7), 'next')}>Gələn</button>
      <button className="seg-arrow" aria-label="Növbəti həftə" title="Növbəti həftə (→)" onClick={() => onShift(1)}><IconChevron /></button>
    </div>
  );
}
