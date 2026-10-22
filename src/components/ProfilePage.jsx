import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import Avatar from './Avatar';
import InviteLink from './InviteLink';
import { tr } from '../i18n';

const SIZE = 256;

/** crop the middle square of a picture and shrink it to 256×256 JPEG */
function toSquareJpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function StreakTiles({ stats }) {
  return (
    <div className="stats streak-stats">
      <div className="stat accent"><span>{tr('Seriya', 'Streak')}</span><b>🔥 {stats.streak}</b><small>{stats.streak === 1 ? tr('gün', 'day') : tr('gün ardıcıl', 'days in a row')}</small></div>
      <div className="stat"><span>{tr('Rekord', 'Best')}</span><b>{stats.best}</b><small>{stats.best === 1 ? tr('gün', 'day') : tr('gün', 'days')}</small></div>
      <div className="stat"><span>{tr('Bu həftə', 'This week')}</span><b>{stats.week}</b><small>{tr('tapşırıq bitib', 'tasks done')}</small></div>
      <div className="stat"><span>{tr('Cəmi', 'Total')}</span><b>{stats.total}</b><small>{tr('tapşırıq bitib', 'tasks done')}</small></div>
    </div>
  );
}

export default function ProfilePage({ user, displayName, onAvatar, onFriends }) {
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const file = useRef(null);

  useEffect(() => { api.profile().then(setProfile).catch(() => setMsg(tr('Profil yüklənmədi.', "The profile didn't load."))); }, []);

  const upload = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg(tr('Şəkil faylı seç (JPG, PNG, WebP).', 'Choose an image file (JPG, PNG, WebP).')); return; }
    setBusy(true);
    setMsg('');
    try {
      const { avatar } = await api.uploadAvatar(await toSquareJpeg(f));
      onAvatar(avatar);
      setMsg(tr('Şəkil yeniləndi.', 'Picture updated.'));
    } catch {
      setMsg(tr('Şəkli yükləmək olmadı. Başqa şəkil yoxla.', "Couldn't upload the picture. Try another one."));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    const { avatar } = await api.deleteAvatar();
    onAvatar(avatar);
    setMsg(tr('Şəkil silindi.', 'Picture removed.'));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(profile.friendCode); setMsg(tr('Dost kodu kopyalandı.', 'Friend code copied.')); } catch { setMsg(tr(`Dost kodun: ${profile.friendCode}`, `Your friend code: ${profile.friendCode}`)); }
  };

  const uploaded = user.picture?.startsWith('/api/');
  return (
    <div className="page profile-page">
      <div className="profile-head">
        <button className="avatar-edit" onClick={() => file.current?.click()} disabled={busy} title={tr('Şəkli dəyiş', 'Change picture')}>
          <Avatar src={user.picture} name={displayName} size={104} />
          <span className="avatar-label">{busy ? tr('Yüklənir…', 'Uploading…') : tr('Dəyiş', 'Change')}</span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={upload} />
        <div className="profile-who">
          <h1>{displayName}</h1>
          <p className="muted">{user.email}</p>
          <div className="profile-actions">
            <button className="btn sm" onClick={() => file.current?.click()} disabled={busy}>{tr('Şəkil yüklə', 'Upload picture')}</button>
            {uploaded && <button className="btn sm ghost danger" onClick={remove}>{tr('Şəkli sil', 'Remove picture')}</button>}
          </div>
        </div>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}

      {profile && (
        <>
          <StreakTiles stats={profile.stats} />
          <InviteLink code={profile.friendCode} name={displayName} />
          <section className="set-section friend-code">
            <div>
              <h2>{tr('Dost kodun', 'Your friend code')}</h2>
              <p className="muted small">{tr('Bu kodu və ya Gmail ünvanını dostuna göndər — Dostlar bölməsində səni əlavə edə bilər.', 'Send this code or your Gmail address to a friend — they can add you in Friends.')}</p>
            </div>
            <div className="code-row">
              <code>{profile.friendCode}</code>
              <button className="btn sm" onClick={copy}>{tr('Kopyala', 'Copy')}</button>
              <button className="btn sm primary" onClick={onFriends}>{tr('Dostlarım', 'My friends')}</button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
