"use client";

import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatClock } from "@/lib/format";

/** Sticky bottom transport bar. The <audio> element itself lives in RecordingView. */
export function AudioPlayer({
  playing,
  currentTime,
  durationSec,
  onToggle,
  onSeek,
}: {
  playing: boolean;
  currentTime: number;
  durationSec: number;
  onToggle: () => void;
  onSeek: (sec: number) => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <Button size="icon" onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </Button>
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatClock(currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={durationSec || 0}
          step={0.1}
          value={Math.min(currentTime, durationSec || 0)}
          onChange={(e) => onSeek(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-secondary accent-[var(--flare)]"
          aria-label="Seek"
        />
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {formatClock(durationSec)}
        </span>
      </div>
    </div>
  );
}
