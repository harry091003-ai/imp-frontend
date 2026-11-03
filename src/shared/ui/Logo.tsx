/** The IMP pulse mark from the design. `inverted` is for the always-dark sign-in panel. */
export function Logo({ inverted = false, size = 32 }: { inverted?: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="9" fill={inverted ? '#ffffff' : 'var(--btn)'} />
      <path
        d="M6 17h5l3-8 4 14 3-6h5"
        fill="none"
        stroke={inverted ? '#0b1020' : 'var(--btnink)'}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
