import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useLiveRefresh } from '../liveRefresh';
import Avatar from './Avatar';
import InviteLink from './InviteLink';
import { tr } from '../i18n';

const ERRORS = {
  not_found: ['Bu kod və ya Gmail ilə istifadəçi tapılmadı. Dostun əvvəlcə Plan it!-ə daxil olmalıdır.', 'No one found with that code or Gmail. Your friend needs to sign in to Plan it! first.'],
  self: ['Bu sənin öz kodundur 🙂', "That's your own code 🙂"],
  already_friends: ['Siz artıq dostsunuz.', "You're already friends."],
  already_sent: ['İstək artıq göndərilib, cavab gözlənilir.', 'Request already sent, waiting for an answer.'],
  empty: ['Gmail ünvanı və ya dost kodu yaz.', 'Enter a Gmail address or friend code.'],
};

function FriendCard({ f, onRemove }) {
  const [confirm, setConfirm] = useState(false);
  const s = f.stats;
  const pct = s.todayTotal ? Math.round((s.todayDone / s.todayTotal) * 100) : 0;
  return (
    <li className="friend">
      <Avatar src={f.avatar} name={f.name} size={52} />
      <div className="friend-main">
        <div className="friend-top">
          <b>{f.name}</b>
          <span className={`streak-pill${s.doneToday ? ' lit' : ''}`} title={s.doneToday ? tr('Bu gün də tapşırıq bitirib', 'Finished a task today too') : tr('Bu gün hələ tapşırıq bitirməyib', 'No task finished today yet')}>🔥 {s.streak}</span>
        </div>
        <div className="friend-today">
          <div className="ft-track"><div className="ft-fill" style={{ width: `${pct}%` }} /></div>
          <span>{tr('Bu gün', 'Today')} {s.todayDone}/{s.todayTotal}</span>
        </div>
        <div className="friend-meta">{tr(`Bu həftə ${s.week} · Rekord ${s.best} gün`, `This week ${s.week} · Best ${s.best} day${s.best === 1 ? '' : 's'}`)}</div>
      </div>
      {confirm ? (
        <div className="friend-confirm">
          <button className="btn sm danger-solid" onClick={() => onRemove(f.id)}>{tr('Sil', 'Remove')}</button>
          <button className="btn sm ghost" onClick={() => setConfirm(false)}>{tr('Yox', 'No')}</button>
        </div>
      ) : (
        <button className="icon-btn sm" aria-label={tr(`${f.name} — dostluqdan çıxar`, `Unfriend ${f.name}`)} title={tr('Dostluqdan çıxar', 'Unfriend')} onClick={() => setConfirm(true)}>×</button>
      )}
    </li>
  );
}

export default function FriendsPage({ onChanged }) {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [msg, setMsg] = useState(null);
  const [me, setMe] = useState(null);
  useEffect(() => { api.profile().then(setMe).catch(() => {}); }, []);

  const load = useCallback(() => api.friends().then((d) => { setData(d); onChanged?.(d.incoming.length); }).catch(() => {}), [onChanged]);
  useEffect(() => { load(); }, [load]);
  useLiveRefresh(load, 15e3); // friends' streaks and today's progress move while you watch

  const add = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const r = await api.addFriend(query.trim());
      setQuery('');
      setMsg({ ok: true, text: r.status === 'accepted' ? tr(`${r.user.name} ilə artıq dostsunuz! 🤝`, `You and ${r.user.name} are now friends! 🤝`) : tr(`${r.user.name} istifadəçisinə istək göndərildi.`, `Request sent to ${r.user.name}.`) });
      load();
    } catch (err) {
      setMsg({ ok: false, text: ERRORS[err.code] ? tr(...ERRORS[err.code]) : tr('İstək göndərilmədi. Bir daha cəhd et.', "The request wasn't sent. Please try again.") });
    }
  };

  const act = async (fn) => { await fn().catch(() => {}); load(); };

  return (
    <div className="page friends-page">
      <div className="page-head">
        <div>
          <h1>{tr('Dostlar', 'Friends')}</h1>
          <p className="muted">{tr('Dostlarının seriyasını və bu günkü irəliləyişini gör. Tapşırıqların adları heç kimə görünmür — yalnız rəqəmlər.', "See your friends' streaks and today's progress. Task names are never shared — only numbers.")}</p>
        </div>
      </div>

      <form className="friend-add" onSubmit={add}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr('Dostun Gmail ünvanı və ya dost kodu', "Your friend's Gmail or friend code")} aria-label={tr('Gmail və ya dost kodu', 'Gmail or friend code')} maxLength={120} />
        <button className="btn primary" disabled={!query.trim()}>{tr('Dostluq at', 'Add friend')}</button>
      </form>
      {msg && <p className={`small ${msg.ok ? 'ok-text' : 'warn-text'}`} role="status">{msg.text}</p>}

      <div className="friend-invite"><InviteLink code={me?.friendCode} name={me?.name} /></div>

      {data?.incoming.length > 0 && (
        <section className="friend-section">
          <h3>{tr('Gələn istəklər', 'Requests for you')}</h3>
          <ul className="requests">
            {data.incoming.map((r) => (
              <li key={r.requestId}>
                <Avatar src={r.user.avatar} name={r.user.name} size={40} />
                <span><b>{r.user.name}</b> {tr('sənə dostluq istəyi göndərib', 'sent you a friend request')}</span>
                <button className="btn sm primary" onClick={() => act(() => api.acceptFriend(r.requestId))}>{tr('Qəbul et', 'Accept')}</button>
                <button className="btn sm ghost" onClick={() => act(() => api.dropRequest(r.requestId))}>{tr('Rədd et', 'Decline')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="friend-section">
        <h3>{tr('Dostlarım', 'My friends')} {data?.friends.length ? `· ${data.friends.length}` : ''}</h3>
        {!data ? <p className="muted small">{tr('Yüklənir…', 'Loading…')}</p> : data.friends.length ? (
          <ul className="friends">
            {data.friends.map((f) => <FriendCard key={f.id} f={f} onRemove={(id) => act(() => api.removeFriend(id))} />)}
          </ul>
        ) : (
          <div className="empty-state compact">
            <p className="muted">{tr('Hələ dostun yoxdur. Yuxarıda dostunun Gmail ünvanını və ya dost kodunu yaz — o qəbul edəndə burada görünəcək.', "No friends yet. Enter a friend's Gmail or friend code above, or share your invite link — they'll show up here.")}</p>
          </div>
        )}
      </section>

      {data?.outgoing.length > 0 && (
        <section className="friend-section">
          <h3>{tr('Göndərilən istəklər', 'Sent requests')}</h3>
          <ul className="requests">
            {data.outgoing.map((r) => (
              <li key={r.requestId}>
                <Avatar src={r.user.avatar} name={r.user.name} size={40} />
                <span><b>{r.user.name}</b> — {tr('cavab gözlənilir', 'waiting for an answer')}</span>
                <button className="btn sm ghost" onClick={() => act(() => api.dropRequest(r.requestId))}>{tr('Ləğv et', 'Cancel')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
