/** Faint city skyline used as card decoration. */
export function SkylineArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 120" aria-hidden className={className} fill="currentColor">
      <path d="M0 120 V92 h18 V78 h14 v14 h10 V60 h22 v32 h8 V70 h16 v22 h10 V48 h18 v44 h6 V36 l6 -30 6 30 v56 h8 V74 h20 v18 h10 V58 h16 v34 h12 V82 h24 v10 h18 V66 h20 v26 h14 V120 Z" opacity=".55" />
      <path d="M0 120 V104 c40 -10 80 -14 150 -8 s110 4 150 -4 V120 Z" opacity=".35" />
      <path d="M210 30 l6 -3 -2 4 5 1 -5 2 1 4 -5 -3z M236 20 l5 -2 -1 3 4 1 -4 2 1 3 -4 -3z" opacity=".5" />
    </svg>
  );
}
