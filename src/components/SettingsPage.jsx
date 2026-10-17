import { useEffect, useState } from 'react';
import { useCategories } from '../categories';
import { DAYS, DAYS_SHORT } from '../dates';
import { ACCENTS, DEFAULT_SETTINGS, useSettings } from '../settings';
import Folder from './Folder';
import { IconEdit, IconLogout } from './Icons';

const PASTELS = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
// Monday-first display with the JS weekday number used by `hiddenDays`
const WEEK = [1, 2, 3, 4, 5, 6, 0].map((js, i) => ({ js, name: DAYS[i], mondayIndex: i }));

function Section({ title, hint, children }) {
  return (
    <section className="set-section">
      <div className="set-head">
        <h2>{title}</h2>
        {hint && <p className="muted small">{hint}</p>}
      </div>
      <div className="set-body">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="set-row">
      <div className="set-label">
        <b>{label}</b>
        {hint && <span className="muted small">{hint}</span>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function Seg({ value, options, onChange }) {
  return (
    <div className="seg-small">
      {options.map((o) => (
        <button key={String(o.id)} type="button" className={value === o.id ? 'sel' : ''} onClick={() => onChange(o.id)}>
          {o.name}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage({ user, onChange, onEditCategory, onLogout }) {
  const settings = useSettings();
  const { list: categories } = useCategories();
  const [name, setName] = useState(settings.appName);
  useEffect(() => setName(settings.appName), [settings.appName]);

  const commitName = () => {
    const v = name.trim();
    if (!v) { setName(settings.appName); return; }
    if (v !== settings.appName) onChange({ appName: v });
  };

  const toggleHidden = (js) => {
    const list = settings.hiddenDays || [];
    onChange({ hiddenDays: list.includes(js) ? list.filter((d) => d !== js) : [...list, js] });
  };

  const setDayColor = (i, c) => {
    const next = [...settings.dayColors];
    next[i] = c;
    onChange({ dayColors: next });
  };

  return (
    <div className="page settings-page">
      <div className="page-head">
        <div>
          <h1>Ayarlar</h1>
          <p className="muted">Planlayıcını öz zövqünə uyğunlaşdır. Dəyişikliklər dərhal yadda saxlanılır.</p>
        </div>
      </div>

      <Section title="Ümumi">
        <Row label="Planlayıcının adı" hint="Sol paneldə və brauzer tabında görünür">
          <input
            className="set-input"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          />
        </Row>
      </Section>

      <Section title="Görünüş">
        <Row label="Rejim">
          <Seg
            value={settings.theme}
            onChange={(theme) => onChange({ theme })}
            options={[{ id: 'system', name: 'Sistemə uyğun' }, { id: 'light', name: '☀️ Gündüz' }, { id: 'dark', name: '🌙 Gecə' }]}
          />
        </Row>
        <Row label="Əsas rəng" hint="Düymələr, bu günün haşiyəsi, irəliləyiş zolağı">
          <div className="accent-pick">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.name}
                aria-label={a.name}
                className={`accent-dot a-${a.id}${settings.accent === a.id ? ' sel' : ''}`}
                onClick={() => onChange({ accent: a.id })}
              />
            ))}
          </div>
        </Row>
        <Row label="Sıxlıq" hint="Kompakt rejimdə ekrana daha çox tapşırıq sığır">
          <Seg
            value={settings.density}
            onChange={(density) => onChange({ density })}
            options={[{ id: 'comfortable', name: 'Rahat' }, { id: 'compact', name: 'Kompakt' }]}
          />
        </Row>
      </Section>

      <Section title="Həftə">
        <Row label="Həftənin ilk günü">
          <Seg
            value={settings.weekStartsOn}
            onChange={(weekStartsOn) => onChange({ weekStartsOn })}
            options={[{ id: 1, name: 'Bazar ertəsi' }, { id: 0, name: 'Bazar' }]}
          />
        </Row>
        <Row label="Gizlədilən günlər" hint="Seçilmiş günlər yalnız boş olanda gizlənir">
          <div className="weekday-pick">
            {WEEK.map((d) => (
              <button
                key={d.js}
                type="button"
                className={(settings.hiddenDays || []).includes(d.js) ? 'sel' : ''}
                onClick={() => toggleHidden(d.js)}
                title={d.name}
              >
                {DAYS_SHORT[d.mondayIndex]}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Günlərin rəngi">
          <div className="day-colors">
            {WEEK.map((d) => (
              <div key={d.js} className="day-color-row">
                <span className={`day-color-name p-day${settings.dayColors[d.mondayIndex].slice(1)}`}>{d.name}</span>
                <div className="pastel-dots">
                  {PASTELS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-label={`${d.name} — rəng ${p.slice(1)}`}
                      className={`color-dot p-day${p.slice(1)}${settings.dayColors[d.mondayIndex] === p ? ' sel' : ''}`}
                      onClick={() => setDayColor(d.mondayIndex, p)}
                    />
                  ))}
                </div>
              </div>
            ))}
            <button className="link-btn" onClick={() => onChange({ dayColors: DEFAULT_SETTINGS.dayColors })}>Standart rənglərə qaytar</button>
          </div>
        </Row>
      </Section>

      <Section title="Tapşırıqlar">
        <Row label="Gün daxilində sıralama" hint="«Əl ilə» seçiləndə tapşırıqları sürüşdürərək düzürsən">
          <Seg
            value={settings.sort}
            onChange={(sort) => onChange({ sort })}
            options={[{ id: 'manual', name: 'Əl ilə' }, { id: 'time', name: 'Vaxta görə' }, { id: 'priority', name: 'Prioritetə görə' }]}
          />
        </Row>
      </Section>

      <Section title="Kateqoriyalar" hint="Sol paneldə kateqoriyanı tutub sürüşdürərək sırasını dəyişə bilərsən">
        <div className="set-cats">
          {categories.map((c) => (
            <button key={c.id} className="set-cat" onClick={() => onEditCategory(c)}>
              <Folder color={c.color} name={c.name} emoji={c.emoji} size={36} />
              <span>{c.name}</span>
              <IconEdit />
            </button>
          ))}
          <button className="set-cat add" onClick={() => onEditCategory({})}>+ Yeni kateqoriya</button>
        </div>
      </Section>

      <Section title="Hesab">
        <Row label={user.name} hint={user.email}>
          <button className="btn" onClick={onLogout}><IconLogout /> Çıxış</button>
        </Row>
      </Section>
    </div>
  );
}
