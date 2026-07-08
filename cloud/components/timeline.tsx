"use client";

import type { FsUtterance } from "@/lib/types";
import { formatClock, speakerBg } from "@/lib/format";
import { scrollToUtterance } from "@/lib/scroll";
import { cn } from "@/lib/utils";

/**
 * Read-only diarization timeline: one lane per speaker, every utterance a
 * time-positioned segment. Clicking a segment centers that utterance in the
 * transcript while the graph stays pinned — audio playback lives on the Mac.
 */
export function Timeline({
  utterances,
  orderedLabels,
  names,
  durationSec,
}: {
  utterances: FsUtterance[];
  orderedLabels: string[];
  names: Record<string, string>;
  durationSec: number;
}) {
  if (durationSec <= 0 || utterances.length === 0) return null;

  const pct = (sec: number) => `${Math.min(100, Math.max(0, (sec / durationSec) * 100))}%`;

  return (
    <div className="space-y-1.5">
      <div className="rounded-lg border bg-card py-2">
        <div className="space-y-1.5">
          {orderedLabels.map((label, i) => (
            <div key={label} className="relative h-3">
              {utterances
                .filter((u) => u.speaker_label === label)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => scrollToUtterance(u.id)}
                    title={`${names[label]} · ${formatClock(u.start_sec)}`}
                    className={cn(
                      "absolute top-0 h-full rounded-[3px] opacity-80 transition-opacity hover:opacity-100",
                      speakerBg(i)
                    )}
                    style={{
                      left: pct(u.start_sec),
                      width: `max(3px, calc(${pct(u.end_sec)} - ${pct(u.start_sec)}))`,
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{formatClock(0)}</span>
        <span>{formatClock(durationSec)}</span>
      </div>
    </div>
  );
}
