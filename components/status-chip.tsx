import type { RecordingStatus } from "@/db/schema";
import { STATUS_LABEL, isActive } from "@/lib/status";
import { cn } from "@/lib/utils";

export function StatusChip({ status }: { status: RecordingStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "done" && "bg-ok",
          status === "failed" && "bg-danger",
          status === "queued" && "bg-muted-foreground",
          isActive(status) && status !== "queued" && "bg-flare animate-pulse"
        )}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
