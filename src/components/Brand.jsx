/**
 * The "plan it!" logo: heavy display type, a gold dot on the i, and the exclamation mark ending in a gold tick —
 * the moment a plan gets done.
 */
export default function Brand({ size = 40, className = '' }) {
  return (
    <span className={`brand-logo ${className}`} style={{ fontSize: size }} role="img" aria-label="Plan it!">
      <span aria-hidden="true">plan</span>
      <span className="bl-it" aria-hidden="true">ı<b className="bl-dot" />t</span>
      <span className="bl-bang" aria-hidden="true">
        <i className="bl-bar" />
        <b className="bl-check">
          <svg viewBox="0 0 24 24"><path d="M6 12.5l4 4L18 8.5" /></svg>
        </b>
      </span>
    </span>
  );
}
