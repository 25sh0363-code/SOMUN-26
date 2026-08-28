export function Seal({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* outer ring */}
      <circle cx="32" cy="32" r="30" stroke="#c8102e" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="24.5" stroke="#ece1cb" strokeWidth="0.9" strokeDasharray="2.4 3" opacity="0.7" />
      {/* laurel left */}
      <path d="M22 44c-4-3.6-6-8.8-5-14" stroke="#b3a487" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M19.4 33.5c-1.9-.7-3.2-2.3-3.4-4.3 2-.2 3.9.7 5 2.4M20.8 38.6c-2-.3-3.6-1.6-4.3-3.5 1.8-.8 3.9-.4 5.4 1M23.2 42.4c-2-.1-3.8-1.2-4.8-3 1.7-.9 3.8-.7 5.4.5" fill="#b3a487" opacity=".85" />
      {/* laurel right */}
      <path d="M42 44c4-3.6 6-8.8 5-14" stroke="#b3a487" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M44.6 33.5c1.9-.7 3.2-2.3 3.4-4.3-2-.2-3.9.7-5 2.4M43.2 38.6c2-.3 3.6-1.6 4.3-3.5-1.8-.8-3.9-.4-5.4 1M40.8 42.4c2-.1 3.8-1.2 4.8-3-1.7-.9-3.8-.7-5.4.5" fill="#b3a487" opacity=".85" />
      {/* globe */}
      <circle cx="32" cy="29" r="8.5" stroke="#ece1cb" strokeWidth="1.2" />
      <ellipse cx="32" cy="29" rx="3.8" ry="8.5" stroke="#c8102e" strokeWidth="1" opacity="0.9" />
      <line x1="24" y1="26.5" x2="40" y2="26.5" stroke="#c8102e" strokeWidth="1" opacity="0.9" />
      <line x1="24" y1="31.5" x2="40" y2="31.5" stroke="#c8102e" strokeWidth="1" opacity="0.9" />
      {/* star */}
      <path d="M32 41.5l1.1 2.3 2.5.3-1.85 1.75.5 2.45L32 47l-2.25 1.3.5-2.45L28.4 44.1l2.5-.3z" fill="#c8102e" />
    </svg>
  );
}
