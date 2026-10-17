import { useEffect, useState } from 'react';
import { api } from '../api';
import { PALETTE } from '../categories';
import { todayKey } from '../dates';
import Folder from './Folder';

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
      <div className="modal cat-modal" role="dialog" aria-modal="true" aria-label={isNew ? 'Yeni kateqoriya' : 'Kateqoriyanı redaktə et'}>
        {confirming ? (
          <div className="danger-zone">
            <div className="danger-icon">!</div>
            <h2>«{category.name}» silinsin?</h2>
            <p>
              Bu kateqoriyanın içində artıq <b>{taskCount} tapşırıq</b> var. Kateqoriyanı silsəniz, bu
              tapşırıqlar da (tamamlananlar daxil) <b>birdəfəlik silinəcək</b>. Əminsiniz?
            </p>
            <div className="recommend">
              <span>💡 Silməzdən əvvəl məlumatları Excel-ə yükləməyiniz tövsiyə olunur.</span>
              <a className="btn sm" href={excelHref} download onClick={() => setDownloaded(true)}>
                ⬇ {downloaded ? 'Yükləndi ✓' : 'Excel-ə yüklə'}
              </a>
            </div>
            <footer className="modal-foot">
              <button className="btn" onClick={() => setConfirming(false)}>Ləğv et</button>
              <span className="spacer" />
              <button className="btn danger-solid" onClick={onDelete}>Bəli, hamısını sil</button>
            </footer>
          </div>
        ) : (
          <>
            <div className="cat-preview">
              <Folder color={color} name={name || '?'} emoji={emoji} size={72} />
              <div>
                <h2>{isNew ? 'Yeni kateqoriya' : 'Kateqoriya'}</h2>
                {!isNew && <span className="muted small">{taskCount} tapşırıq</span>}
              </div>
            </div>
            <div className="field">
              <label htmlFor="cat-name">Ad</label>
              <input
                id="cat-name"
                autoFocus
                maxLength={40}
                placeholder="məs. İdman, Ailə, Layihə…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') save(); }}
              />
            </div>
            <div className="field">
              <label>Rəng</label>
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
              <label>İkon (emoji)</label>
              <div className="emoji-grid">
                <button type="button" className={`emoji-opt none${!emoji ? ' sel' : ''}`} onClick={() => setEmoji('')} title="İkonsuz">Aa</button>
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
                  title={isLast ? 'Ən azı bir kateqoriya qalmalıdır' : 'Kateqoriyanı sil'}
                >
                  Sil
                </button>
              )}
              <span className="spacer" />
              <button className="btn" onClick={onClose}>Ləğv et</button>
              <button className="btn primary" onClick={save} disabled={!name.trim()}>
                {isNew ? 'Yarat' : 'Yadda saxla'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
