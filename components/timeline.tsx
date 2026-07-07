"use client";

import { useRef } from "react";
import type { Utterance } from "@/db/schema";
import { formatClock, speakerBg } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The diarization timeline: one lane per speaker, every utterance a
 * time-positioned segment. Shows the shape of the conversation and
 * doubles as a seek control.
 */
export function Timeline({
  utterances,
  orderedLabels,
  names,
  durationSec,
  currentTime,
  onSeek,
}: {
  utterances: Utterance[];
  orderedLabels: string[];
  names: Record<string, string>;
  durationSec: number;
  currentTime: number;
  onSeek: (sec: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  if (durationSec <= 0 || utterances.length === 0) return null;

  const pct = (sec: number) => `${Math.min(100, Math.max(0, (sec / durationSec) * 100))}%`;

  function seekFromPointer(e: React.MouseEvent) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    onSeek(((e.clientX - rect.left) / rect.width) * durationSec);
  }

  return (
    <div className="space-y-1.5">
      <div
        ref={trackRef}
        onClick={seekFromPointer}
        className="relative cursor-pointer select-none rounded-lg border bg-card px-0 py-2"
        role="slider"
        aria-label="Recording timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(durationSec)}
        aria-valuenow={Math.round(currentTime)}
      >
        <div className="space-y-1.5">
          {orderedLabels.map((label, i) => (
            <div key={label} className="relative h-3">
              {utterances
                .filter((u) => u.speakerLabel === label)
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(u.startSec);
                    }}
                    title={`${names[label]} · ${formatClock(u.startSec)}`}
                    className={cn(
                      "absolute top-0 h-full rounded-[3px] opacity-80 transition-opacity hover:opacity-100",
                      speakerBg(i)
                    )}
                    style={{
                      left: pct(u.startSec),
                      width: `max(3px, calc(${pct(u.endSec)} - ${pct(u.startSec)}))`,
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
        {/* playhead */}
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-foreground/70"
          style={{ left: pct(currentTime) }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
        <span>{formatClock(0)}</span>
        <span>{formatClock(durationSec)}</span>
      </div>
    </div>
  );
}
