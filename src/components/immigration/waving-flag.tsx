import { CountryFlag } from "@/components/site/country-flag";

/** Country flag on a pole with a cloth-wave distortion and shading. */
export function WavingFlag({ isoCode, name, className }: { isoCode: string; name: string; className?: string }) {
  const filterId = `wave-${isoCode.toLowerCase()}`;
  return (
    <div className={className} aria-hidden>
      <svg width="0" height="0" className="absolute">
        <filter id={filterId} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.009 0.022" numOctaves="1" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="22" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="relative h-full">
        {/* Pole */}
        <span className="absolute left-0 top-0 h-full w-[7px] rounded-full bg-gradient-to-r from-[#6b6f72] via-[#e4e6e8] to-[#55595c] shadow-lg" />
        <span className="absolute -left-[3px] -top-2 size-[13px] rounded-full bg-gradient-to-br from-[#f1f2f3] to-[#7b7f82] shadow" />
        {/* Cloth */}
        <div className="absolute left-[6px] top-[14px] aspect-[3/2] w-[88%] origin-left animate-[flag-sway_6s_ease-in-out_infinite]" style={{ filter: `url(#${filterId})` }}>
          <div className="relative size-full overflow-hidden [clip-path:polygon(0_0,100%_6%,100%_94%,0_100%)]">
            <CountryFlag isoCode={isoCode} name={name} className="size-full" />
            <span className="absolute inset-0 bg-[repeating-linear-gradient(100deg,rgba(0,0,0,0.18)_0%,rgba(255,255,255,0.12)_12%,rgba(0,0,0,0.16)_24%)] mix-blend-multiply" />
            <span className="absolute inset-0 bg-[repeating-linear-gradient(100deg,transparent_0%,rgba(255,255,255,0.22)_8%,transparent_16%)] mix-blend-screen" />
          </div>
        </div>
      </div>
    </div>
  );
}
