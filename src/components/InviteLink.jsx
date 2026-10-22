import { useState } from 'react';
import { inviteLink } from '../pwa';
import { tr } from '../i18n';

/** The personal invite link: whoever opens it and signs in becomes a friend right away. */
export default function InviteLink({ code, name }) {
  const [note, setNote] = useState('');
  if (!code) return null;
  const url = inviteLink(code);
  const text = tr(
    `${name ? `${name} səni` : 'Səni'} Plan it!-ə dəvət edir — gününü birgə planlayaq: ${url}`,
    `${name || 'A friend'} invited you to Plan it! — let's plan our days together: ${url}`,
  );

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNote(tr('Link kopyalandı.', 'Link copied.')); } catch { setNote(url); }
  };
  const share = async () => {
    try { await navigator.share({ title: 'Plan it!', text, url }); } catch { /* closed the share sheet */ }
  };

  return (
    <section className="set-section invite-card">
      <div>
        <h2>{tr('Dostlarını dəvət et', 'Invite your friends')}</h2>
        <p className="muted small">{tr('Bu linki açıb qeydiyyatdan keçən avtomatik dostun olur — istək atmağa ehtiyac yoxdur.', 'Whoever opens this link and signs up becomes your friend right away — no request needed.')}</p>
      </div>
      <div className="code-row">
        <code className="invite-url">{url.replace(/^https?:\/\//, '')}</code>
        <button className="btn sm" onClick={copy}>{tr('Kopyala', 'Copy')}</button>
        {typeof navigator.share === 'function' && <button className="btn sm primary" onClick={share}>{tr('Paylaş', 'Share')}</button>}
      </div>
      {note && <p className="small" role="status">{note}</p>}
    </section>
  );
}
