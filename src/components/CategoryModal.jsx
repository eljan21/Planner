import { useEffect, useState } from 'react';
import { api } from '../api';
import { PALETTE } from '../categories';
import { todayKey } from '../dates';
import Folder from './Folder';
import { tr } from '../i18n';

const EMOJIS = [
  '🏠', '💼', '💪', '🏋️', '🧘', '🍎', '🛒', '💰', '📚', '🎓', '✍️', '💻',
  '🎨', '🎵', '✈️', '🚗', '❤️', '👨‍👩‍👧', '🐾', '🌱', '🧹', '🍳', '🎉', '⭐',
];

/**
 * Create / edit a category. Deleting a category that still has tasks asks for confirmation
 * and recommends downloading that category's Excel first.
 */
export default function CategoryModal({ category, taskCount, isLast, onClose, onSave, onDelete }) {
  const isNew = !category.id;
  const [name, setName] = useState(category.name || '');
  const [color, setColor] = useState(category.color || 'blue');
  const [emoji, setEmoji] = useState(category.emoji || '');
  const [confirming, setConfirming] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, emoji });
  };

  const askDelete = () => {
    if (taskCount > 0) setConfirming(true);
    else onDelete();
  };

  const excelHref = category.id ? api.reportUrl({ scope: 'category', category: category.id, today: todayKey() }) : '#';

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal cat-modal" role="dialog" aria-modal="true" aria-label={isNew ? tr('Yeni kateqoriya', 'New category') : tr('Kateqoriyanı redaktə et', 'Edit category')}>
        {confirming ? (
          <div className="danger-zone">
            <div className="danger-icon">!</div>
            <h2>{tr(`«${category.name}» silinsin?`, `Delete “${category.name}”?`)}</h2>
            <p>
              {tr('Bu kateqoriyanın içində artıq', 'This category still has')} <b>{taskCount} {tr('tapşırıq', taskCount === 1 ? 'task' : 'tasks')}</b>{tr(' var. Kateqoriyanı silsəniz, bu tapşırıqlar da (tamamlananlar daxil) ', '. If you delete it, those tasks (done ones included) ')}
              <b>{tr('birdəfəlik silinəcək', 'will be deleted for good')}</b>. {tr('Əminsiniz?', 'Are you sure?')}
            </p>
            <div className="recommend">
              <span>💡 {tr('Silməzdən əvvəl məlumatları Excel-ə yükləməyiniz tövsiyə olunur.', 'We recommend downloading the data to Excel before deleting.')}</span>
              <a className="btn sm" href={excelHref} download onClick={() => setDownloaded(true)}>
                ⬇ {downloaded ? tr('Yükləndi ✓', 'Downloaded ✓') : tr('Excel-ə yüklə', 'Download Excel')}
              </a>
            </div>
            <footer className="modal-foot">
              <button className="btn" onClick={() => setConfirming(false)}>{tr('Ləğv et', 'Cancel')}</button>
              <span className="spacer" />
              <button className="btn danger-solid" onClick={onDelete}>{tr('Bəli, hamısını sil', 'Yes, delete everything')}</button>
            </footer>
          </div>
        ) : (
          <>
            <div className="cat-preview">
              <Folder color={color} name={name || '?'} emoji={emoji} size={72} />
              <div>
                <h2>{isNew ? tr('Yeni kateqoriya', 'New category') : tr('Kateqoriya', 'Category')}</h2>
                {!isNew && <span className="muted small">{taskCount} {tr('tapşırıq', taskCount === 1 ? 'task' : 'tasks')}</span>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="cat-name">{tr('Ad', 'Name')}</label>
              <input
                id="cat-name"
                autoFocus
                maxLength={40}
                placeholder={tr('məs. İdman, Ailə, Layihə…', 'e.g. Sport, Family, Project…')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              />
            </div>
            <div className="field">
              <label>{tr('Rəng', 'Colour')}</label>
              <div className="palette">
                {PALETTE.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    title={p.name}
                    aria-label={p.name}
                    className={`swatch c-${p.id}${p.id === color ? ' sel' : ''}`}
                    onClick={() => setColor(p.id)}
                  />
                ))}
              </div>
            </div>
            <div className="field">
              <label>{tr('İkon (emoji)', 'Icon (emoji)')}</label>
              <div className="emoji-grid">
                <button type="button" className={`emoji-opt none${!emoji ? ' sel' : ''}`} onClick={() => setEmoji('')} title={tr('İkonsuz', 'No icon')}>Aa</button>
                {EMOJIS.map((e) => (
                  <button key={e} type="button" className={`emoji-opt${emoji === e ? ' sel' : ''}`} onClick={() => setEmoji(e)}>{e}</button>
                ))}
              </div>
            </div>
            <footer className="modal-foot">
              {!isNew && (
                <button
                  className="btn ghost danger"
                  onClick={askDelete}
                  disabled={isLast}
                  title={isLast ? tr('Ən azı bir kateqoriya qalmalıdır', 'At least one category has to stay') : tr('Kateqoriyanı sil', 'Delete category')}
                >
                  {tr('Sil', 'Delete')}
                </button>
              )}
              <span className="spacer" />
              <button className="btn" onClick={onClose}>{tr('Ləğv et', 'Cancel')}</button>
              <button className="btn primary" onClick={save} disabled={!name.trim()}>
                {isNew ? tr('Yarat', 'Create') : tr('Yadda saxla', 'Save')}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
