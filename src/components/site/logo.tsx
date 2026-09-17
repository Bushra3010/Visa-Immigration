import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/Images/logo-cropped.png";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Brand logo. `tile` places it on a white card for dark backgrounds. */
export function Logo({ className, height = 44, tile = false }: { className?: string; height?: number; tile?: boolean }) {
  return (
    <Link href="/" className={cn("flex shrink-0 items-center", tile && "rounded-lg bg-white px-2 py-1", className)} aria-label={`${site.name} home`}>
      <Image src={logo} alt={site.name} height={height} style={{ width: "auto", height }} priority />
    </Link>
  );
}
