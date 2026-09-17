import { Badge } from "@/components/ui/primitives";
import { statusTone } from "@/lib/immigration/status";
import { humanize } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{humanize(status)}</Badge>;
}
