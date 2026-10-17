import { initials } from '../categories';

/** Folder icon tinted by colour, optionally with the category's initials on it. */
export default function Folder({ color = 'gray', name, emoji, size = 56, label = true }) {
  return (
    <svg className={`folder f-${color}`} width={size} height={size * 0.86} viewBox="0 0 100 86" aria-hidden="true">
      <path className="folder-back" d="M10 6h26c3 0 5 1 7 3l6 6h41c5 0 9 4 9 9v50c0 5-4 9-9 9H10c-5 0-9-4-9-9V15c0-5 4-9 9-9z" />
      <rect className="folder-paper" x="12" y="18" width="76" height="30" rx="5" />
      <path className="folder-front" d="M1 32c0-5 4-9 9-9h80c5 0 9 4 9 9v42c0 5-4 9-9 9H10c-5 0-9-4-9-9z" />
      {label && (emoji
        ? <text x="50" y="68" textAnchor="middle" className="folder-emoji">{emoji}</text>
        : <text x="50" y="64" textAnchor="middle">{initials(name)}</text>)}
    </svg>
  );
}
