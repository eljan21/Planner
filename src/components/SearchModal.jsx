import { useEffect, useMemo, useState } from 'react';
import { useCategories } from '../categories';
import { addDays, formatDay, formatRange, fromKey, startOfWeek, toKey, todayKey } from '../dates';
import { IconSearch } from './Icons';

export default function SearchModal({ tasks, done, notes, onClose, onPick, onPickNote }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const { byId } = useCategories();

  const results = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('az');
    if (!needle) return [];
    const has = (s) => s.toLocaleLowerCase('az').includes(needle);
    // far-future copies of recurring tasks would just repeat the same title
    const horizon = toKey(addDays(new Date(), 14));
    const today = todayKey();
    const seenRecur = new Set();
    const taskHits = [...tasks, ...done]
      .filter((t) => has(`${t.title} ${t.note} ${(t.subtasks || []).map((s) => s.text).join(' ')}`))
      .filter((t) => {
        if (!t.recurId || t.done || t.date < today) return true;
        if (t.date > horizon || seenRecur.has(t.recurId)) return false;
        seenRecur.add(t.recurId);
        return true;
      })
      .map((t) => ({ kind: 'task', key: `t${t.id}`, item: t }));
    const noteHits = notes
      .filter((n) => has(`${n.title} ${n.body}`))
      .map((n) => ({ kind: 'note', key: `n${n.id}`, item: n }));
    return [...taskHits, ...noteHits].slice(0, 40);
  }, [q, tasks, done, notes]);

  useEffect(() => setSel(0), [q]);

  const pick = (r) => (r.kind === 'task' ? onPick(r.item) : onPickNote(r.item));
  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter' && results[sel]) pick(results[sel]);
  };

  return (
    <div className="backdrop top" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="search-modal" role="dialog" aria-label="Axtar">
        <div className="search-input">
          <IconSearch />
          <input autoFocus placeholder="Tapşırıq və ya not axtar…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} />
          <kbd>Esc</kbd>
        </div>
        {q && (
          <ul className="search-results">
            {results.length === 0 && <li className="muted empty-res">Heç nə tapılmadı</li>}
            {results.map((r, i) => {
              if (r.kind === 'note') {
                const n = r.item;
                const firstLine = n.title || n.body.trim().split('\n')[0] || 'Not';
                return (
                  <li key={r.key}>
                    <button className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => pick(r)}>
                      <span className="sr-icon">📝</span>
                      <span className="sr-title">{firstLine}</span>
                      <span className="sr-meta">Not · {formatRange(startOfWeek(fromKey(n.week)))}</span>
                    </button>
                  </li>
                );
              }
              const t = r.item;
              const cat = byId.get(t.categoryId);
              return (
                <li key={r.key}>
                  <button className={i === sel ? 'sel' : ''} onMouseEnter={() => setSel(i)} onClick={() => pick(r)}>
                    <i className={`dot-c c-${cat?.color || 'gray'}`} />
                    <span className={`sr-title${t.done ? ' is-done' : ''}`}>{t.recurId ? '🔁 ' : ''}{t.title}</span>
                    <span className="sr-meta">{cat?.name ?? '—'} · {formatDay(t.date)}{t.done ? ' · ✓' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
