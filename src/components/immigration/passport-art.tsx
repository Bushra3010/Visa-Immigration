/** Decorative passport + boarding pass illustration for the CTA banner. */
export function PassportArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 230 112" aria-hidden className={className}>
      <defs>
        <linearGradient id="pp" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2f7a4f" /><stop offset="1" stopColor="#174a30" /></linearGradient>
      </defs>
      <path d="M0 80 Q60 40 120 70 T230 40" fill="none" stroke="#ffffff" strokeOpacity=".25" strokeDasharray="3 5" />
      <g transform="translate(118 8) rotate(12)">
        <rect width="72" height="96" rx="6" fill="#f3f1ea" />
        <rect x="8" y="10" width="40" height="6" rx="3" fill="#d6d2c4" />
        <rect x="8" y="24" width="56" height="4" rx="2" fill="#e4e0d3" />
        <rect x="8" y="34" width="48" height="4" rx="2" fill="#e4e0d3" />
        <path d="M44 50 l14 -8 -2 22 -5 -6 -7 4z" fill="#1f6f3c" />
        <rect x="8" y="76" width="56" height="10" rx="2" fill="#e4e0d3" />
      </g>
      <g transform="translate(58 14) rotate(-10)">
        <rect width="76" height="100" rx="7" fill="url(#pp)" stroke="#8fc3a0" strokeOpacity=".35" />
        <text x="38" y="24" textAnchor="middle" fontSize="9" letterSpacing="1.5" fill="#d9c98f" fontFamily="inherit" fontWeight="700">PASSPORT</text>
        <circle cx="38" cy="58" r="16" fill="none" stroke="#d9c98f" strokeWidth="1.6" />
        <ellipse cx="38" cy="58" rx="7" ry="16" fill="none" stroke="#d9c98f" strokeWidth="1.2" />
        <path d="M22 58 H54 M25 50 H51 M25 66 H51" stroke="#d9c98f" strokeWidth="1.2" />
      </g>
      <path d="M200 26 l14 -4 -6 6 8 4 -3 2 -9 -3 -6 5 -2 -1 4 -6z" fill="#ffffff" fillOpacity=".8" />
    </svg>
  );
}
