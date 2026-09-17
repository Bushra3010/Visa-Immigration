import * as Round from "country-flag-icons/react/1x1";
import { AE, AU, CA, DE, EU, GB, NZ, US } from "country-flag-icons/react/3x2";

// Flags from country-flag-icons (MIT). Add an entry when a new destination is added.
const FLAGS = { AE, AU, CA, DE, EU, GB, NZ, US } as const;
const ROUND = { AE: Round.AE, AU: Round.AU, CA: Round.CA, DE: Round.DE, EU: Round.EU, GB: Round.GB, NZ: Round.NZ, US: Round.US } as const;

export function CountryFlag({ isoCode, name, className, round = false }: { isoCode: string; name: string; className?: string; round?: boolean }) {
  const Flag = (round ? ROUND : FLAGS)[isoCode as keyof typeof FLAGS];
  if (!Flag) return null;
  return <Flag title={`Flag of ${name}`} className={className} preserveAspectRatio="xMidYMid slice" />;
}
