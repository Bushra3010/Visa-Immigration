import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";

/** Returns /Images/countries/<slug>.jpg when a photo has been added, else null (cards fall back to the flag). */
export function countryPhoto(slug: string) {
  return existsSync(path.join(process.cwd(), "public/Images/countries", `${slug}.jpg`)) ? `/Images/countries/${slug}.jpg` : null;
}

export const COUNTRY_SHORT_NAMES: Record<string, string> = { uk: "UK", usa: "USA", uae: "UAE", europe: "Schengen" };
